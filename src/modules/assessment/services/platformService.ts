import { supabase } from '../../../lib/supabase';
import { applyOrgScope, orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import type { Assessment, AssessmentStatus } from '../types';
import { ROLE_ASSESSMENT_TEMPLATES } from '../data/roleAssessmentTemplates';
import { fetchAssessmentWithSections, logAssessmentAudit } from './assessmentService';
import { importRoleTemplate } from './templateService';

export interface AssessmentSkill {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  created_at: string;
}

export interface AssessmentFolder {
  id: string;
  organization_id: string;
  name: string;
  parent_id?: string | null;
  sort_order: number;
  created_at: string;
}

export interface AssessmentAuditLog {
  id: string;
  organization_id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface OrgAssessmentTemplate {
  id: string;
  organization_id: string;
  source_assessment_id?: string | null;
  title: string;
  description: string;
  payload: Record<string, unknown>;
  tags: string[];
  is_shared: boolean;
  created_by?: string | null;
  created_at: string;
}

export interface VersionSnapshot {
  id: string;
  assessment_id: string;
  version: number;
  snapshot: Record<string, unknown>;
  created_by?: string | null;
  created_at: string;
}

export interface DepartmentTemplatePack {
  department: string;
  templateIds: string[];
  defaultPassingScore: number;
  postFormFields: string[];
}

// ── Skills ──

export async function fetchSkills(viewer: OrgViewer | null | undefined) {
  let query = supabase.from('assessment_skills').select('*').order('name');
  query = applyOrgScope(query, viewer);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AssessmentSkill[];
}

export async function createSkill(
  viewer: OrgViewer & { id: string },
  payload: { name: string; description?: string },
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const { data, error } = await supabase
    .from('assessment_skills')
    .insert({
      organization_id: orgId,
      name: payload.name.trim(),
      description: payload.description || '',
    })
    .select()
    .single();

  if (error) throw error;
  return data as AssessmentSkill;
}

export async function updateSkill(
  id: string,
  payload: { name?: string; description?: string },
  viewer?: OrgViewer | null,
) {
  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.description !== undefined) updates.description = payload.description;

  let query = supabase.from('assessment_skills').update(updates).eq('id', id);
  query = applyOrgScope(query, viewer);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteSkill(id: string, viewer?: OrgViewer | null) {
  let query = supabase.from('assessment_skills').delete().eq('id', id);
  query = applyOrgScope(query, viewer);
  const { error } = await query;
  if (error) throw error;
}

// ── Folders ──

export async function fetchFolders(viewer: OrgViewer | null | undefined) {
  let query = supabase
    .from('assessment_folders')
    .select('*')
    .order('sort_order')
    .order('name');
  query = applyOrgScope(query, viewer);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AssessmentFolder[];
}

export async function createFolder(
  viewer: OrgViewer & { id: string },
  payload: { name: string; parent_id?: string | null; sort_order?: number },
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const { data, error } = await supabase
    .from('assessment_folders')
    .insert({
      organization_id: orgId,
      name: payload.name.trim(),
      parent_id: payload.parent_id || null,
      sort_order: payload.sort_order ?? 0,
    })
    .select()
    .single();

  if (error) throw error;
  return data as AssessmentFolder;
}

export async function updateFolder(
  id: string,
  payload: { name?: string; parent_id?: string | null; sort_order?: number },
  viewer?: OrgViewer | null,
) {
  const updates: Record<string, unknown> = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.parent_id !== undefined) updates.parent_id = payload.parent_id;
  if (payload.sort_order !== undefined) updates.sort_order = payload.sort_order;

  let query = supabase.from('assessment_folders').update(updates).eq('id', id);
  query = applyOrgScope(query, viewer);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteFolder(id: string, viewer?: OrgViewer | null) {
  let query = supabase.from('assessment_folders').delete().eq('id', id);
  query = applyOrgScope(query, viewer);
  const { error } = await query;
  if (error) throw error;
}

// ── Audit logs ──

export async function fetchAuditLogs(
  viewer: OrgViewer | null | undefined,
  filters?: { entityType?: string; limit?: number },
) {
  let query = supabase
    .from('assessment_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(filters?.limit ?? 100);

  query = applyOrgScope(query, viewer);
  if (filters?.entityType) query = query.eq('entity_type', filters.entityType);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AssessmentAuditLog[];
}

// ── Org templates ──

export async function saveAssessmentAsTemplate(
  viewer: OrgViewer & { id: string },
  assessmentId: string,
  options?: { title?: string; description?: string; is_shared?: boolean },
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const assessment = await fetchAssessmentWithSections(assessmentId, viewer);
  if (!assessment) throw new Error('Assessment not found');

  const { data, error } = await supabase
    .from('assessment_org_templates')
    .insert({
      organization_id: orgId,
      source_assessment_id: assessmentId,
      title: options?.title || assessment.title,
      description: options?.description ?? assessment.description,
      payload: assessment as unknown as Record<string, unknown>,
      tags: assessment.tags || [],
      is_shared: options?.is_shared ?? false,
      created_by: viewer.id,
    })
    .select()
    .single();

  if (error) throw error;
  await logAssessmentAudit(orgId, viewer.id, 'save_template', 'assessment', assessmentId, {
    template_id: data.id,
  });
  return data as OrgAssessmentTemplate;
}

export async function listOrgTemplates(viewer: OrgViewer | null | undefined) {
  let query = supabase
    .from('assessment_org_templates')
    .select('*')
    .order('created_at', { ascending: false });

  query = applyOrgScope(query, viewer);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as OrgAssessmentTemplate[];
}

// ── Version snapshots ──

export async function createVersionSnapshot(
  viewer: OrgViewer & { id: string },
  assessmentId: string,
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const assessment = await fetchAssessmentWithSections(assessmentId, viewer);
  if (!assessment) throw new Error('Assessment not found');

  const { data, error } = await supabase
    .from('assessment_version_snapshots')
    .insert({
      assessment_id: assessmentId,
      version: assessment.version,
      snapshot: assessment as unknown as Record<string, unknown>,
      created_by: viewer.id,
    })
    .select()
    .single();

  if (error) throw error;
  await logAssessmentAudit(orgId, viewer.id, 'version_snapshot', 'assessment', assessmentId, {
    version: assessment.version,
    snapshot_id: data.id,
  });
  return data as VersionSnapshot;
}

export async function listVersionSnapshots(assessmentId: string) {
  const { data, error } = await supabase
    .from('assessment_version_snapshots')
    .select('*')
    .eq('assessment_id', assessmentId)
    .order('version', { ascending: false });

  if (error) throw error;
  return (data || []) as VersionSnapshot[];
}

export async function restoreVersionSnapshot(
  viewer: OrgViewer & { id: string },
  snapshotId: string,
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const { data: snapshot, error: snapErr } = await supabase
    .from('assessment_version_snapshots')
    .select('*')
    .eq('id', snapshotId)
    .maybeSingle();

  if (snapErr) throw snapErr;
  if (!snapshot) throw new Error('Snapshot not found');

  const payload = snapshot.snapshot as Assessment & {
    sections?: {
      id: string;
      title: string;
      instructions?: string;
      sort_order: number;
      time_limit_minutes?: number | null;
      weight: number;
      shuffle_questions?: boolean;
      assessment_section_questions?: { question_id: string; sort_order: number; weight_override?: number }[];
    }[];
  };

  const { error: updateErr } = await supabase
    .from('assessments')
    .update({
      title: payload.title,
      description: payload.description,
      tags: payload.tags,
      instructions: payload.instructions,
      passing_score: payload.passing_score,
      time_limit_minutes: payload.time_limit_minutes,
      shuffle_questions: payload.shuffle_questions,
      shuffle_answers: payload.shuffle_answers,
      branding: payload.branding,
      settings: payload.settings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', snapshot.assessment_id);

  if (updateErr) throw updateErr;

  await supabase.from('assessment_sections').delete().eq('assessment_id', snapshot.assessment_id);

  for (const section of payload.sections || []) {
    const { data: newSection } = await supabase
      .from('assessment_sections')
      .insert({
        assessment_id: snapshot.assessment_id,
        title: section.title,
        instructions: section.instructions || '',
        sort_order: section.sort_order,
        time_limit_minutes: section.time_limit_minutes,
        weight: section.weight,
        shuffle_questions: section.shuffle_questions ?? false,
      })
      .select()
      .single();

    if (newSection && section.assessment_section_questions?.length) {
      await supabase.from('assessment_section_questions').insert(
        section.assessment_section_questions.map((sq) => ({
          section_id: newSection.id,
          question_id: sq.question_id,
          sort_order: sq.sort_order,
          weight_override: sq.weight_override,
        })),
      );
    }
  }

  await logAssessmentAudit(orgId, viewer.id, 'restore_version', 'assessment', snapshot.assessment_id, {
    snapshot_id: snapshotId,
    version: snapshot.version,
  });

  return snapshot.assessment_id;
}

export async function publishAssessmentWithSnapshot(
  viewer: OrgViewer & { id: string },
  assessmentId: string,
) {
  await createVersionSnapshot(viewer, assessmentId);

  const { error } = await supabase
    .from('assessments')
    .update({
      status: 'published' as AssessmentStatus,
      published_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', assessmentId);

  if (error) throw error;
  await logAssessmentAudit(orgIdForInsert(viewer)!, viewer.id, 'publish', 'assessment', assessmentId);
}

// ── Branding ──

export interface OrgAssessmentBranding {
  logo_url: string;
  primary_color: string;
  white_label: boolean;
}

const ORG_BRANDING_KEY = 'assessment_branding';

export async function fetchOrgAssessmentBranding(orgId: string | null | undefined): Promise<OrgAssessmentBranding> {
  if (!orgId) return { logo_url: '', primary_color: '#171717', white_label: false };

  const { data, error } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .maybeSingle();

  if (error) throw error;
  const settings = (data?.settings || {}) as Record<string, unknown>;
  const branding = (settings[ORG_BRANDING_KEY] || {}) as Partial<OrgAssessmentBranding>;

  return {
    logo_url: branding.logo_url || (settings.logo_url as string) || '',
    primary_color: branding.primary_color || (settings.primary_color as string) || '#171717',
    white_label: branding.white_label ?? false,
  };
}

export async function saveOrgAssessmentBranding(
  viewer: OrgViewer & { id: string },
  branding: OrgAssessmentBranding,
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const { data: org, error: fetchErr } = await supabase
    .from('organizations')
    .select('settings')
    .eq('id', orgId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;

  const settings = { ...(org?.settings || {}) } as Record<string, unknown>;
  settings[ORG_BRANDING_KEY] = branding;
  settings.logo_url = branding.logo_url;
  settings.primary_color = branding.primary_color;

  const { error } = await supabase
    .from('organizations')
    .update({ settings, updated_at: new Date().toISOString() })
    .eq('id', orgId);

  if (error) throw error;
  await logAssessmentAudit(orgId, viewer.id, 'update', 'branding', orgId, branding as unknown as Record<string, unknown>);
  return branding;
}

export async function updateAssessmentBranding(
  assessmentId: string,
  branding: Record<string, unknown>,
  viewer?: OrgViewer | null,
) {
  let query = supabase
    .from('assessments')
    .update({ branding, updated_at: new Date().toISOString() })
    .eq('id', assessmentId);

  query = applyOrgScope(query, viewer);
  const { error } = await query;
  if (error) throw error;
}

// ── Department template packs ──

const DEFAULT_POST_FORM_FIELDS = ['years_experience', 'current_role', 'availability', 'referral_source'];

export function listDepartmentTemplatePacks(): DepartmentTemplatePack[] {
  const byDepartment = new Map<string, DepartmentTemplatePack>();

  for (const template of ROLE_ASSESSMENT_TEMPLATES) {
    const department = template.role;
    const existing = byDepartment.get(department);
    if (existing) {
      existing.templateIds.push(template.id);
      existing.defaultPassingScore = Math.round(
        (existing.defaultPassingScore + template.passing_score) / 2,
      );
    } else {
      byDepartment.set(department, {
        department,
        templateIds: [template.id],
        defaultPassingScore: template.passing_score,
        postFormFields: DEFAULT_POST_FORM_FIELDS,
      });
    }
  }

  return Array.from(byDepartment.values()).sort((a, b) => a.department.localeCompare(b.department));
}

export async function importDepartmentTemplatePack(
  viewer: OrgViewer & { id: string },
  department: string,
  options?: { publish?: boolean },
) {
  const pack = listDepartmentTemplatePacks().find(
    (p) => p.department.toLowerCase() === department.toLowerCase(),
  );
  if (!pack) throw new Error(`Department pack not found: ${department}`);

  const results = [];
  for (const templateId of pack.templateIds) {
    const result = await importRoleTemplate(viewer, templateId, options);
    results.push({ templateId, ...result });
  }

  return { department: pack.department, defaultPassingScore: pack.defaultPassingScore, results };
}
