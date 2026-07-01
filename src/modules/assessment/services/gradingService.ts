import { supabase } from '../../../lib/supabase';
import { applyOrgScope, orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import type { AssessmentResponse } from '../types';
import { normalizeQuestion } from './questionService';

const MANUAL_GRADE_TYPES = ['long_answer', 'video_response', 'audio_response'];

export interface GradingQueueItem {
  attempt_id: string;
  response_id: string;
  question_id: string;
  question_title?: string;
  question_prompt?: string;
  question_type?: string;
  assignment_title?: string;
  candidate_name?: string | null;
  candidate_email?: string | null;
  answer: Record<string, unknown>;
  auto_score?: number | null;
  manual_score?: number | null;
  is_flagged: boolean;
  grader_notes?: string;
}

export interface Scorecard {
  id: string;
  organization_id: string;
  attempt_id: string;
  reviewer_id?: string | null;
  rubric: Record<string, unknown>;
  scores: Record<string, unknown>;
  notes: string;
  created_at: string;
}

export async function fetchGradingQueue(viewer: OrgViewer | null | undefined) {
  let attemptQuery = supabase
    .from('assessment_attempts')
    .select(`
      id, candidate_name, candidate_email, organization_id,
      assignment:assessment_assignments(title)
    `)
    .in('status', ['submitted', 'graded', 'in_progress'])
    .order('submitted_at', { ascending: false })
    .limit(100);

  if (!viewer?.is_platform_owner && viewer?.organization_id) {
    attemptQuery = attemptQuery.eq('organization_id', viewer.organization_id);
  }

  const { data: attempts, error: attemptErr } = await attemptQuery;
  if (attemptErr) throw attemptErr;
  if (!attempts?.length) return [] as GradingQueueItem[];

  const attemptIds = attempts.map((a) => a.id);
  const attemptMap = new Map(attempts.map((a) => [a.id, a]));

  const { data: responses, error: respErr } = await supabase
    .from('assessment_responses')
    .select(`
      *,
      question:assessment_questions (
        id, title, question_type, prompt,
        assessment_question_options (id, option_text, is_correct)
      )
    `)
    .in('attempt_id', attemptIds)
    .is('final_score', null);

  if (respErr) throw respErr;

  return (responses || [])
    .filter((r: AssessmentResponse & { question?: { question_type?: string } }) =>
      MANUAL_GRADE_TYPES.includes(r.question?.question_type || ''),
    )
    .map((r: AssessmentResponse & {
      question?: Parameters<typeof normalizeQuestion>[0];
    }) => {
      const attempt = attemptMap.get(r.attempt_id);
      const question = r.question ? normalizeQuestion(r.question) : undefined;
      return {
        attempt_id: r.attempt_id,
        response_id: r.id,
        question_id: r.question_id,
        question_title: question?.title,
        question_prompt: question?.prompt,
        question_type: question?.question_type,
        assignment_title: (attempt?.assignment as { title?: string } | undefined)?.title,
        candidate_name: attempt?.candidate_name,
        candidate_email: attempt?.candidate_email,
        answer: r.answer,
        auto_score: r.auto_score,
        manual_score: r.manual_score,
        is_flagged: r.is_flagged,
        grader_notes: r.grader_notes,
      } as GradingQueueItem;
    });
}

export async function gradeResponse(
  attemptId: string,
  responseId: string,
  score: number,
  notes?: string,
  options?: { partialCredit?: boolean; rubric?: string },
) {
  const { data: existing } = await supabase
    .from('assessment_responses')
    .select('answer')
    .eq('id', responseId)
    .maybeSingle();

  const answer = {
    ...((existing?.answer || {}) as Record<string, unknown>),
    ...(options?.partialCredit ? { partial_credit: true } : {}),
    ...(options?.rubric?.trim() ? { rubric: options.rubric } : {}),
  };

  const { error } = await supabase
    .from('assessment_responses')
    .update({
      manual_score: score,
      final_score: score,
      grader_notes: notes || '',
      answer,
      updated_at: new Date().toISOString(),
    })
    .eq('id', responseId)
    .eq('attempt_id', attemptId);

  if (error) throw error;

  const { data: responses } = await supabase
    .from('assessment_responses')
    .select('final_score, manual_score, auto_score')
    .eq('attempt_id', attemptId);

  const scores = (responses || [])
    .map((r) => r.final_score ?? r.manual_score ?? r.auto_score)
    .filter((s): s is number => s !== null && s !== undefined);

  if (scores.length) {
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    await supabase.from('assessment_attempts').update({
      manual_score: avg,
      final_score: avg,
      status: 'graded',
    }).eq('id', attemptId);
  }
}

export async function fetchScorecards(
  viewer: OrgViewer | null | undefined,
  filters?: { attemptId?: string },
) {
  let query = supabase
    .from('assessment_scorecards')
    .select('*')
    .order('created_at', { ascending: false });

  query = applyOrgScope(query, viewer);
  if (filters?.attemptId) query = query.eq('attempt_id', filters.attemptId);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Scorecard[];
}

export async function saveScorecard(
  viewer: OrgViewer & { id: string },
  payload: {
    attempt_id: string;
    rubric?: Record<string, unknown>;
    scores?: Record<string, unknown>;
    notes?: string;
  },
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const { data, error } = await supabase
    .from('assessment_scorecards')
    .insert({
      organization_id: orgId,
      attempt_id: payload.attempt_id,
      reviewer_id: viewer.id,
      rubric: payload.rubric || {},
      scores: payload.scores || {},
      notes: payload.notes || '',
    })
    .select()
    .single();

  if (error) throw error;
  return data as Scorecard;
}

export async function runAiScoring(payload: {
  attemptId: string;
  responseId: string;
  questionType: string;
  text?: string;
  mediaUrl?: string;
  rubric?: string;
}) {
  const { data, error } = await supabase.functions.invoke('assessment-score-response', {
    body: payload,
  });
  if (error) throw error;
  return data as { score?: number; feedback?: Record<string, unknown>; summary?: string };
}
