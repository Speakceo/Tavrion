import { supabase } from '../../../lib/supabase';
import { applyOrgScope, orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import type { AssessmentAssignment, AssigneeType } from '../types';

function randomToken() {
  return `tst_${crypto.randomUUID().replace(/-/g, '')}`;
}

export async function fetchAssignments(viewer: OrgViewer | null | undefined) {
  let query = supabase
    .from('assessment_assignments')
    .select('*, assessment:assessments(id, title, status)')
    .order('created_at', { ascending: false });

  query = applyOrgScope(query, viewer);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AssessmentAssignment[];
}

export async function createAssignment(
  viewer: OrgViewer & { id: string },
  payload: {
    assessment_id: string;
    title: string;
    assignee_type: AssigneeType;
    due_at?: string;
    expires_at?: string;
    max_attempts?: number;
    time_limit_minutes?: number;
    passing_score?: number;
    reminder_enabled?: boolean;
    targets?: { user_id?: string; external_email?: string; external_name?: string; cohort_label?: string }[];
  },
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const accessToken = payload.assignee_type === 'external' ? randomToken() : null;

  const { data, error } = await supabase
    .from('assessment_assignments')
    .insert({
      organization_id: orgId,
      assessment_id: payload.assessment_id,
      title: payload.title,
      assignee_type: payload.assignee_type,
      due_at: payload.due_at || null,
      expires_at: payload.expires_at || null,
      max_attempts: payload.max_attempts ?? 1,
      time_limit_minutes: payload.time_limit_minutes,
      passing_score: payload.passing_score,
      reminder_enabled: payload.reminder_enabled ?? true,
      access_token: accessToken,
      created_by: viewer.id,
    })
    .select()
    .single();

  if (error) throw error;

  if (payload.targets?.length) {
    await supabase.from('assessment_assignment_targets').insert(
      payload.targets.map((t) => ({
        assignment_id: data.id,
        user_id: t.user_id || null,
        external_email: t.external_email || null,
        external_name: t.external_name || null,
        cohort_label: t.cohort_label || null,
      })),
    );
  }

  return data as AssessmentAssignment;
}

export async function fetchAssignmentById(id: string, viewer?: OrgViewer | null) {
  let query = supabase
    .from('assessment_assignments')
    .select('*, assessment:assessments(*)')
    .eq('id', id);
  query = applyOrgScope(query, viewer);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as AssessmentAssignment | null;
}
