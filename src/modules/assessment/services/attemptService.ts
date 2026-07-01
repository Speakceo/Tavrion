import { supabase } from '../../../lib/supabase';
import { orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import type { AssessmentAttempt, AssessmentQuestion, AssessmentResponse } from '../types';
import { fetchAssessmentWithSections } from './assessmentService';
import { scoreResponse, calculateAttemptScore } from '../utils/scoring';
import { sanitizeAnswerForStorage, enrichAnswerWithLabels } from '../utils/answerDisplay';
import { invokeCalculateOverallScore } from './mediaService';

const MANUAL_GRADE_TYPES = new Set(['long_answer', 'video_response', 'audio_response']);

export async function startAttempt(
  viewer: OrgViewer & { id: string },
  assignmentId: string,
  meta?: { candidate_email?: string; candidate_name?: string },
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

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

    const questionPct = scored.maxScore > 0
      ? Math.round((scored.autoScore / scored.maxScore) * 100)
      : 0;

    await supabase.from('assessment_responses').upsert(
      {
        attempt_id: attemptId,
        question_id: q.id,
        answer: enrichAnswerWithLabels(q, sanitizeAnswerForStorage(answer)),
        auto_score: questionPct,
        final_score: needsManual ? null : questionPct,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'attempt_id,question_id' },
    );
  }

  return results;
}

export async function submitAttempt(
  attemptId: string,
  assignmentId: string,
  passingScore = 70,
) {
  const { data: assignment } = await supabase
    .from('assessment_assignments')
    .select('assessment_id, passing_score')
    .eq('id', assignmentId)
    .single();

  if (!assignment) throw new Error('Assignment not found');

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

  await supabase.from('assessment_attempts').update({
    status: 'graded',
    submitted_at: new Date().toISOString(),
    auto_score: percentage,
    final_score: percentage,
    passed,
  }).eq('id', attemptId);

  let ai_summary: string | undefined;
  try {
    const aiResult = await invokeCalculateOverallScore(attemptId);
    return {
      percentage: aiResult.overall_score ?? percentage,
      passed: aiResult.passed ?? passed,
      results,
      ai_summary: aiResult.ai_summary,
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
