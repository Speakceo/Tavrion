import { supabase } from '../../../lib/supabase';
import { orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import type { AssessmentAttempt, AssessmentQuestion, AssessmentResponse } from '../types';
import { fetchAssessmentWithSections } from './assessmentService';
import { scoreResponse, calculateAttemptScore } from '../utils/scoring';
import { sanitizeAnswerForStorage, enrichAnswerWithLabels } from '../utils/answerDisplay';
import { invokeCalculateOverallScore, invokeScoreResponse } from './mediaService';

const MANUAL_GRADE_TYPES = new Set(['long_answer', 'video_response', 'audio_response']);

export function wantsAiAudioEval(q: Pick<AssessmentQuestion, 'question_type' | 'tags' | 'metadata'>): boolean {
  if (!['video_response', 'audio_response'].includes(q.question_type)) return false;
  if (q.metadata?.ai_score_audio === true || q.metadata?.ai_score_media === true) return true;
  const tags = (q.tags || []).map((t) => String(t).toLowerCase());
  return (
    tags.includes('ai-audio-eval')
    || tags.includes('german')
    || (tags.includes('speaking') && tags.includes('language'))
  );
}

export async function touchAttemptActivity(
  attemptId: string,
  extra?: Record<string, unknown>,
) {
  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('progress, status')
    .eq('id', attemptId)
    .maybeSingle();

  if (!attempt || attempt.status !== 'in_progress') return;

  const progress = {
    ...((attempt.progress || {}) as Record<string, unknown>),
    last_active_at: new Date().toISOString(),
    ...extra,
  };

  const { error } = await supabase
    .from('assessment_attempts')
    .update({ progress })
    .eq('id', attemptId)
    .eq('status', 'in_progress');

  if (error) throw error;
}

export async function markAttemptVoid(attemptId: string) {
  const { error } = await supabase
    .from('assessment_attempts')
    .update({
      status: 'void',
      submitted_at: new Date().toISOString(),
    })
    .eq('id', attemptId)
    .eq('status', 'in_progress');

  if (error) throw error;
}

export async function startAttempt(
  viewer: OrgViewer & { id: string },
  assignmentId: string,
  meta?: { candidate_email?: string; candidate_name?: string; is_preview?: boolean },
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const { data: existing } = await supabase
    .from('assessment_attempts')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('user_id', viewer.id)
    .eq('status', 'in_progress')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    await touchAttemptActivity(existing.id, meta?.is_preview ? { is_preview: true } : undefined);
    return existing as AssessmentAttempt;
  }

  const { count } = await supabase
    .from('assessment_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('assignment_id', assignmentId)
    .eq('user_id', viewer.id);

  const { data, error } = await supabase
    .from('assessment_attempts')
    .insert({
      organization_id: orgId,
      assignment_id: assignmentId,
      user_id: viewer.id,
      candidate_email: meta?.candidate_email,
      candidate_name: meta?.candidate_name,
      status: 'in_progress',
      attempt_number: (count || 0) + 1,
      device_fingerprint: navigator.userAgent.slice(0, 200),
      user_agent: navigator.userAgent,
      progress: {
        last_active_at: new Date().toISOString(),
        ...(meta?.is_preview ? { is_preview: true } : {}),
      },
    })
    .select()
    .single();

  if (error) throw error;
  return data as AssessmentAttempt;
}

export async function saveResponse(
  attemptId: string,
  questionId: string,
  answer: Record<string, unknown>,
  isFlagged = false,
  question?: AssessmentQuestion,
) {
  let payload = sanitizeAnswerForStorage(answer);
  if (question) {
    payload = enrichAnswerWithLabels(question, payload);
  }

  const { error } = await supabase.from('assessment_responses').upsert(
    {
      attempt_id: attemptId,
      question_id: questionId,
      answer: payload,
      is_flagged: isFlagged,
      answered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'attempt_id,question_id' },
  );
  if (error) throw error;
}

export async function fetchAttemptResponses(attemptId: string) {
  const { data, error } = await supabase
    .from('assessment_responses')
    .select('*')
    .eq('attempt_id', attemptId);
  if (error) throw error;
  return (data || []) as AssessmentResponse[];
}

async function scoreAndPersistResponses(
  attemptId: string,
  questions: AssessmentQuestion[],
  responseMap: Map<string, AssessmentResponse>,
  negativeMarking: boolean,
) {
  const results = [];

  for (const q of questions) {
    const resp = responseMap.get(q.id);
    const answer = resp?.answer || {};
    const scored = scoreResponse(q, answer, { negativeMarking });
    results.push(scored);

    const needsManual = MANUAL_GRADE_TYPES.has(q.question_type)
      || scored.details === 'Requires manual grading'
      || scored.details === 'Manual grading required';

    // AI-audio videos stay unscored until Whisper+LLM finishes
    const deferForAi = needsManual && wantsAiAudioEval(q);

    const questionPct = scored.maxScore > 0
      ? Math.round((scored.autoScore / scored.maxScore) * 100)
      : 0;

    const { error } = await supabase.from('assessment_responses').upsert(
      {
        attempt_id: attemptId,
        question_id: q.id,
        answer: enrichAnswerWithLabels(q, sanitizeAnswerForStorage(answer)),
        auto_score: questionPct,
        final_score: (needsManual || deferForAi) ? null : questionPct,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'attempt_id,question_id' },
    );
    if (error) throw error;
  }

  return results;
}

async function recalculateAttemptFromResponses(attemptId: string, passingScore: number) {
  const responses = await fetchAttemptResponses(attemptId);
  const scored = responses
    .map((r) => r.final_score ?? r.auto_score)
    .filter((s): s is number => typeof s === 'number');
  if (!scored.length) return null;
  const percentage = Math.round(scored.reduce((a, b) => a + b, 0) / scored.length);
  const passed = percentage >= passingScore;
  await supabase
    .from('assessment_attempts')
    .update({
      auto_score: percentage,
      final_score: percentage,
      passed,
      status: 'graded',
    })
    .eq('id', attemptId);
  return { percentage, passed };
}

/** Score AI-audio video/audio responses for an attempt (org OpenAI key). */
export async function scoreAiAudioResponsesForAttempt(
  attemptId: string,
  organizationId?: string | null,
  opts?: { force?: boolean; passingScore?: number },
) {
  const { data: attempt } = await supabase
    .from('assessment_attempts')
    .select('id, organization_id, assignment_id')
    .eq('id', attemptId)
    .maybeSingle();
  if (!attempt) throw new Error('Attempt not found');

  const orgId = organizationId || attempt.organization_id || null;
  const responses = await fetchAttemptResponses(attemptId);

  const questionIds = responses.map((r) => r.question_id);
  const { data: questions } = questionIds.length
    ? await supabase
      .from('assessment_questions')
      .select('id, question_type, tags, metadata, prompt')
      .in('id', questionIds)
    : { data: [] as AssessmentQuestion[] };

  const byId = new Map((questions || []).map((q) => [q.id, q as AssessmentQuestion]));
  const scored: string[] = [];
  const errors: string[] = [];

  for (const resp of responses) {
    const q = byId.get(resp.question_id);
    if (!q || !wantsAiAudioEval(q)) continue;
    const mediaUrl = typeof resp.answer?.media_url === 'string' ? resp.answer.media_url : '';
    if (!mediaUrl) continue;
    // Skip if already AI-scored unless forced
    if (!opts?.force && resp.answer?.ai_evaluation && typeof resp.final_score === 'number') continue;

    try {
      await invokeScoreResponse({
        attemptId,
        responseId: resp.id,
        questionType: q.question_type,
        mediaUrl,
        rubric: typeof q.metadata?.rubric === 'string' ? q.metadata.rubric : undefined,
        organizationId: orgId,
        language: typeof q.metadata?.language === 'string' ? q.metadata.language : 'de',
        prompt: q.prompt,
      });
      scored.push(resp.id);
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  if (scored.length > 0) {
    await recalculateAttemptFromResponses(attemptId, opts?.passingScore ?? 70);
  }

  return { scoredCount: scored.length, errors };
}

export async function submitAttempt(
  attemptId: string,
  assignmentId: string,
  passingScore = 70,
) {
  const [{ data: assignment }, { data: attemptRow }] = await Promise.all([
    supabase
      .from('assessment_assignments')
      .select('assessment_id, passing_score, organization_id')
      .eq('id', assignmentId)
      .maybeSingle(),
    supabase
      .from('assessment_attempts')
      .select('organization_id, status')
      .eq('id', attemptId)
      .maybeSingle(),
  ]);

  if (!assignment?.assessment_id) throw new Error('Assignment not found');
  if (!attemptRow) throw new Error('Attempt not found');

  // Bare id fetch — do not apply empty-org scope (breaks public + submit scoring)
  const assessment = await fetchAssessmentWithSections(assignment.assessment_id);
  if (!assessment) throw new Error('Assessment not found');

  const responses = await fetchAttemptResponses(attemptId);
  const responseMap = new Map(responses.map((r) => [r.question_id, r]));

  const questions: AssessmentQuestion[] = [];
  for (const section of assessment.sections || []) {
    for (const sq of section.assessment_section_questions || []) {
      if (sq.question) questions.push(sq.question);
    }
  }

  const negativeMarking = Boolean((assessment.settings as Record<string, unknown>)?.negative_marking);
  const results = await scoreAndPersistResponses(attemptId, questions, responseMap, negativeMarking);

  const passThreshold = assignment.passing_score ?? assessment.passing_score ?? passingScore;
  const { percentage, passed } = calculateAttemptScore(results, passThreshold);
  const submittedAt = new Date().toISOString();

  if (attemptRow.status === 'in_progress') {
    const { error: submitError } = await supabase
      .from('assessment_attempts')
      .update({
        status: 'submitted',
        submitted_at: submittedAt,
      })
      .eq('id', attemptId)
      .eq('status', 'in_progress');
    if (submitError) throw submitError;
  }

  const { data: finalized, error: finalizeError } = await supabase
    .from('assessment_attempts')
    .update({
      status: 'graded',
      submitted_at: submittedAt,
      auto_score: percentage,
      final_score: percentage,
      passed,
    })
    .eq('id', attemptId)
    .in('status', ['in_progress', 'submitted', 'graded'])
    .select('id')
    .maybeSingle();

  if (finalizeError) throw finalizeError;
  if (!finalized) throw new Error('Could not finalize your submission. Please try again.');

  // Video AI scoring is admin-side only (Candidate Sessions). Candidates just submit.

  let ai_summary: string | undefined;
  try {
    const aiOverall = await invokeCalculateOverallScore(attemptId);
    return {
      percentage: aiOverall.overall_score ?? percentage,
      passed: aiOverall.passed ?? passed,
      results,
      ai_summary: aiOverall.ai_summary,
    };
  } catch {
    // AI summary optional — client scores already persisted
  }

  return { percentage, passed, results, ai_summary };
}

export async function fetchAttemptsForOrg(viewer: OrgViewer | null | undefined) {
  let query = supabase
    .from('assessment_attempts')
    .select('*, assignment:assessment_assignments(title, assessment_id)')
    .order('started_at', { ascending: false })
    .limit(100);

  if (!viewer?.is_platform_owner && viewer?.organization_id) {
    query = query.eq('organization_id', viewer.organization_id);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}
