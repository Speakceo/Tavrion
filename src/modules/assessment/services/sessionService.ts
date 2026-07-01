import { supabase } from '../../../lib/supabase';
import { applyOrgScope } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import type { AssessmentAttempt, SelectionStatus, SessionAnalytics } from '../types';
import { normalizeQuestion } from './questionService';

export type SessionRow = AssessmentAttempt & {
  violation_count?: number;
  assignment?: { title?: string; assessment_id?: string };
  analytics?: SessionAnalytics | null;
};

export async function fetchSessions(
  viewer: OrgViewer | null | undefined,
  filters?: {
    status?: string;
    selection?: SelectionStatus;
    search?: string;
    limit?: number;
  },
) {
  let query = supabase
    .from('assessment_attempts')
    .select(`
      *,
      assignment:assessment_assignments(id, title, assessment_id),
      analytics:assessment_session_analytics(*)
    `)
    .order('started_at', { ascending: false })
    .limit(filters?.limit ?? 200);

  if (!viewer?.is_platform_owner && viewer?.organization_id) {
    query = query.eq('organization_id', viewer.organization_id);
  }

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.selection) query = query.eq('selection_status', filters.selection);

  const { data, error } = await query;
  if (error) throw error;

  let rows = (data || []) as SessionRow[];

  if (filters?.search?.trim()) {
    const q = filters.search.toLowerCase();
    rows = rows.filter((r) =>
      r.candidate_name?.toLowerCase().includes(q)
      || r.candidate_email?.toLowerCase().includes(q)
      || r.assignment?.title?.toLowerCase().includes(q),
    );
  }

  const attemptIds = rows.map((r) => r.id);
  if (attemptIds.length) {
    const { data: violations } = await supabase
      .from('assessment_violations')
      .select('attempt_id')
      .in('attempt_id', attemptIds);

    const counts = new Map<string, number>();
    (violations || []).forEach((v: { attempt_id: string }) => {
      counts.set(v.attempt_id, (counts.get(v.attempt_id) || 0) + 1);
    });
    rows = rows.map((r) => ({ ...r, violation_count: counts.get(r.id) || 0 }));
  }

  return rows;
}

export async function fetchSessionDetail(attemptId: string, viewer?: OrgViewer | null) {
  let query = supabase
    .from('assessment_attempts')
    .select(`
      *,
      assignment:assessment_assignments(*, assessment:assessments(*)),
      analytics:assessment_session_analytics(*)
    `)
    .eq('id', attemptId);

  if (!viewer?.is_platform_owner && viewer?.organization_id) {
    query = query.eq('organization_id', viewer.organization_id);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const [{ data: responses }, { data: violations }] = await Promise.all([
    supabase.from('assessment_responses').select(`
      *,
      question:assessment_questions (
        *,
        assessment_question_options (*)
      )
    `).eq('attempt_id', attemptId),
    supabase.from('assessment_violations').select('*').eq('attempt_id', attemptId).order('created_at'),
  ]);

  const normalizedResponses = (responses || []).map((r: {
    question?: Parameters<typeof normalizeQuestion>[0];
  }) => ({
    ...r,
    question: r.question ? normalizeQuestion(r.question) : r.question,
  }));

  return { ...data, responses: normalizedResponses, violations: violations || [] };
}

export async function updateSelectionStatus(
  attemptId: string,
  status: SelectionStatus,
  viewer?: OrgViewer | null,
) {
  let query = supabase
    .from('assessment_attempts')
    .update({ selection_status: status })
    .eq('id', attemptId);
  if (!viewer?.is_platform_owner && viewer?.organization_id) {
    query = query.eq('organization_id', viewer.organization_id);
  }
  const { error } = await query;
  if (error) throw error;
}

export async function deleteSession(attemptId: string, viewer?: OrgViewer | null) {
  let query = supabase.from('assessment_attempts').delete().eq('id', attemptId);
  if (!viewer?.is_platform_owner && viewer?.organization_id) {
    query = query.eq('organization_id', viewer.organization_id);
  }
  const { error } = await query;
  if (error) throw error;
}

export async function bulkUpdateSelectionStatus(
  attemptIds: string[],
  status: SelectionStatus,
  viewer?: OrgViewer | null,
) {
  if (!attemptIds.length) return;
  let query = supabase
    .from('assessment_attempts')
    .update({ selection_status: status })
    .in('id', attemptIds);
  if (!viewer?.is_platform_owner && viewer?.organization_id) {
    query = query.eq('organization_id', viewer.organization_id);
  }
  const { error } = await query;
  if (error) throw error;
}

export async function bulkDeleteSessions(attemptIds: string[], viewer?: OrgViewer | null) {
  if (!attemptIds.length) return;
  let query = supabase.from('assessment_attempts').delete().in('id', attemptIds);
  if (!viewer?.is_platform_owner && viewer?.organization_id) {
    query = query.eq('organization_id', viewer.organization_id);
  }
  const { error } = await query;
  if (error) throw error;
}

export async function updateSessionTranscript(
  attemptId: string,
  responseId: string,
  transcript: string,
  viewer?: OrgViewer | null,
) {
  let attemptQuery = supabase.from('assessment_attempts').select('id').eq('id', attemptId);
  if (!viewer?.is_platform_owner && viewer?.organization_id) {
    attemptQuery = attemptQuery.eq('organization_id', viewer.organization_id);
  }
  const { data: attempt } = await attemptQuery.maybeSingle();
  if (!attempt) throw new Error('Session not found');

  const { data: existing } = await supabase
    .from('assessment_video_responses')
    .select('id')
    .eq('response_id', responseId)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase
      .from('assessment_video_responses')
      .update({ transcript })
      .eq('id', existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('assessment_video_responses')
      .insert({ response_id: responseId, transcript });
    if (error) throw error;
  }
}

export async function savePostFormData(attemptId: string, formData: Record<string, unknown>) {
  const { error } = await supabase
    .from('assessment_attempts')
    .update({ post_form_data: formData })
    .eq('id', attemptId);
  if (error) throw error;
}

export async function saveSessionAnalytics(attemptId: string, analytics: Partial<SessionAnalytics>) {
  const { error } = await supabase.from('assessment_session_analytics').upsert(
    {
      attempt_id: attemptId,
      overall_score: analytics.overall_score,
      communication_score: analytics.communication_score,
      aptitude_score: analytics.aptitude_score,
      integrity_score: analytics.integrity_score,
      strengths: analytics.strengths || [],
      weaknesses: analytics.weaknesses || [],
      recommendation: analytics.recommendation,
      ai_summary: analytics.ai_summary,
      detailed_scores: analytics.detailed_scores || {},
    },
    { onConflict: 'attempt_id' },
  );
  if (error) throw error;
}
