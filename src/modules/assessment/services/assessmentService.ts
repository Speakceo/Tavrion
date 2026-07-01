import { supabase } from '../../../lib/supabase';
import { applyOrgScope, orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import type { Assessment, AssessmentStatus } from '../types';

export async function logAssessmentAudit(
  orgId: string,
  actorId: string | undefined,
  action: string,
  entityType: string,
  entityId?: string,
  metadata: Record<string, unknown> = {},
) {
  await supabase.from('assessment_audit_logs').insert({
    organization_id: orgId,
    actor_id: actorId,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

export async function fetchAssessments(
  viewer: OrgViewer | null | undefined,
  filters?: { status?: AssessmentStatus; search?: string },
) {
  let query = supabase
    .from('assessments')
    .select('*')
    .order('updated_at', { ascending: false });

  query = applyOrgScope(query, viewer);

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.search?.trim()) {
    query = query.ilike('title', `%${filters.search.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as Assessment[];
}

export async function fetchAssessmentById(id: string, viewer?: OrgViewer | null) {
  let query = supabase.from('assessments').select('*').eq('id', id);
  query = applyOrgScope(query, viewer);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data as Assessment | null;
}

export async function createAssessment(
  viewer: OrgViewer & { id: string },
  payload: Partial<Assessment>,
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const { data, error } = await supabase
    .from('assessments')
    .insert({
      organization_id: orgId,
      title: payload.title || 'Untitled Assessment',
      description: payload.description || '',
      status: 'draft',
      tags: payload.tags || [],
      instructions: payload.instructions || '',
      passing_score: payload.passing_score ?? 70,
      time_limit_minutes: payload.time_limit_minutes,
      shuffle_questions: payload.shuffle_questions ?? false,
      shuffle_answers: payload.shuffle_answers ?? true,
      branding: payload.branding || {},
      settings: payload.settings || {},
      created_by: viewer.id,
    })
    .select()
    .single();

  if (error) throw error;
  await logAssessmentAudit(orgId, viewer.id, 'create', 'assessment', data.id);
  return data as Assessment;
}

export async function duplicateAssessment(viewer: OrgViewer & { id: string }, id: string) {
  const source = await fetchAssessmentById(id, viewer);
  if (!source) throw new Error('Assessment not found');

  const copy = await createAssessment(viewer, {
    ...source,
    title: `${source.title} (Copy)`,
    status: 'draft',
  });

  await supabase.from('assessments').update({
    parent_assessment_id: source.id,
    version: source.version + 1,
  }).eq('id', copy.id);

  const { data: sections } = await supabase
    .from('assessment_sections')
    .select('*, assessment_section_questions(*)')
    .eq('assessment_id', id)
    .order('sort_order');

  for (const section of sections || []) {
    const { data: newSection } = await supabase
      .from('assessment_sections')
      .insert({
        assessment_id: copy.id,
        title: section.title,
        instructions: section.instructions,
        sort_order: section.sort_order,
        time_limit_minutes: section.time_limit_minutes,
        weight: section.weight,
        shuffle_questions: section.shuffle_questions,
      })
      .select()
      .single();

    if (newSection && section.assessment_section_questions?.length) {
      await supabase.from('assessment_section_questions').insert(
        section.assessment_section_questions.map((sq: { question_id: string; sort_order: number; weight_override?: number }) => ({
          section_id: newSection.id,
          question_id: sq.question_id,
          sort_order: sq.sort_order,
          weight_override: sq.weight_override,
        })),
      );
    }
  }

  return copy;
}

export async function updateAssessmentStatus(
  viewer: OrgViewer & { id: string },
  id: string,
  status: AssessmentStatus,
) {
  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'published') updates.published_at = new Date().toISOString();
  if (status === 'archived') updates.archived_at = new Date().toISOString();

  const { error } = await supabase.from('assessments').update(updates).eq('id', id);
  if (error) throw error;
  await logAssessmentAudit(orgIdForInsert(viewer)!, viewer.id, 'status_change', 'assessment', id, { status });
}

export async function fetchAssessmentWithSections(id: string, viewer?: OrgViewer | null) {
  const assessment = await fetchAssessmentById(id, viewer);
  if (!assessment) return null;

  const { data: sections } = await supabase
    .from('assessment_sections')
    .select(`
      *,
      assessment_section_questions (
        *,
        question:assessment_questions (
          *,
          assessment_question_options (*),
          assessment_coding_test_cases (*)
        )
      )
    `)
    .eq('assessment_id', id)
    .order('sort_order');

  return { ...assessment, sections: sections || [] };
}
