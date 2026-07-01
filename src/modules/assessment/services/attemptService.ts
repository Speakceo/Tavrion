import { supabase } from '../../../lib/supabase';
import { orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import type { AssessmentAttempt, AssessmentQuestion, AssessmentResponse } from '../types';
import { fetchAssessmentWithSections } from './assessmentService';
import { scoreResponse, calculateAttemptScore } from '../utils/scoring';

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
) {
  const { error } = await supabase.from('assessment_responses').upsert(
    {
      attempt_id: attemptId,
      question_id: questionId,
      answer,
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

import { scoreResponse, calculateAttemptScore } from '../utils/scoring';
import { invokeCalculateOverallScore } from './mediaService';

export async function submitAttempt(
  attemptId: string,
  assignmentId: string,
  passingScore = 70,
) {
  try {
    const aiResult = await invokeCalculateOverallScore(attemptId);
    return {
      percentage: aiResult.overall_score ?? 0,
      passed: aiResult.passed ?? false,
      results: [] as ReturnType<typeof scoreResponse>[],
      ai_summary: aiResult.ai_summary,
    };
  } catch {
    // Fall through to client-side scoring
  }

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

  const results = questions.map((q) => {
    const resp = responseMap.get(q.id);
    const scored = scoreResponse(q, resp?.answer || {});
    return scored;
  });

  const passThreshold = assignment.passing_score ?? assessment.passing_score ?? passingScore;
  const { percentage, passed } = calculateAttemptScore(results, passThreshold);

  await supabase.from('assessment_attempts').update({
    status: 'graded',
    submitted_at: new Date().toISOString(),
    auto_score: percentage,
    final_score: percentage,
    passed,
  }).eq('id', attemptId);

  return { percentage, passed, results };
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
