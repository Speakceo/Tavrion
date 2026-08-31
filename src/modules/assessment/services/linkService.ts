import { supabase } from '../../../lib/supabase';
import { applyOrgScope, orgIdForInsert } from '../../../utils/orgScope';
import type { OrgViewer } from '../../../utils/orgScope';
import type { AssessmentReusableLink, CandidateInfo } from '../types';

function randomLinkCode() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 12).toUpperCase();
}

export type ResolvedPublicLink = {
  type: 'reusable' | 'assignment_token';
  organization_id: string;
  assessment_id: string;
  assignment_id?: string;
  link_id?: string;
  title: string;
  require_camera: boolean;
  require_microphone: boolean;
  post_form_enabled: boolean;
  assessment_title?: string;
};

export const DUPLICATE_EMAIL_SUBMITTED_MSG =
  'This email and submission already exist for this assessment. Each candidate may only submit once.';

export const DUPLICATE_EMAIL_IN_PROGRESS_MSG =
  'This email already has an active session. Enter your resume token below to continue.';

function normalizeCandidateEmail(email: string) {
  return email.trim().toLowerCase();
}

export function extractCandidateEmail(row: {
  candidate_email?: string | null;
  candidate_info?: unknown;
}): string {
  const info = (row.candidate_info || {}) as { email?: string };
  return normalizeCandidateEmail(row.candidate_email || info.email || '');
}

type ExistingAttemptRow = {
  id: string;
  status: string;
  candidate_email: string | null;
  candidate_info?: unknown;
  submitted_at: string | null;
  progress: Record<string, unknown> | null;
};

function isPracticeAttempt(row: ExistingAttemptRow) {
  return Boolean(row.progress?.practice_mode);
}

function isSubmittedAttempt(row: ExistingAttemptRow) {
  return ['submitted', 'graded', 'expired'].includes(row.status) || Boolean(row.submitted_at);
}

/** All attempts for this assessment + org whose email matches (any public link). */
export async function listAssessmentAttemptsForEmail(
  organizationId: string,
  assessmentId: string,
  email: string,
): Promise<ExistingAttemptRow[]> {
  const normalized = normalizeCandidateEmail(email);
  if (!normalized) return [];

  const { data: assignments, error: assignErr } = await supabase
    .from('assessment_assignments')
    .select('id')
    .eq('assessment_id', assessmentId)
    .eq('organization_id', organizationId);
  if (assignErr) throw assignErr;

  const assignmentIds = (assignments || []).map((a) => a.id);
  if (!assignmentIds.length) return [];

  const { data: existing, error } = await supabase
    .from('assessment_attempts')
    .select('id, status, candidate_email, candidate_info, submitted_at, progress')
    .in('assignment_id', assignmentIds);

  if (error) throw error;

  return ((existing || []) as ExistingAttemptRow[]).filter(
    (row) => extractCandidateEmail(row) === normalized,
  );
}

function assertNoDuplicateFromMatches(
  matches: ExistingAttemptRow[],
  opts?: { allowAttemptId?: string; practiceMode?: boolean },
) {
  if (opts?.practiceMode) return;

  const relevant = matches.filter((row) => {
    if (opts?.allowAttemptId && row.id === opts.allowAttemptId) return false;
    if (isPracticeAttempt(row)) return false;
    return true;
  });

  const submitted = relevant.find(isSubmittedAttempt);
  if (submitted) throw new Error(DUPLICATE_EMAIL_SUBMITTED_MSG);

  const inProgress = relevant.find((row) => row.status === 'in_progress' && !row.submitted_at);
  if (inProgress) throw new Error(DUPLICATE_EMAIL_IN_PROGRESS_MSG);
}

/** Block duplicate candidate emails per assessment (non-practice). */
export async function assertCandidateEmailAvailable(
  resolved: ResolvedPublicLink,
  email: string,
  opts?: { allowAttemptId?: string; practiceMode?: boolean },
) {
  if (opts?.practiceMode) return;

  const matches = await listAssessmentAttemptsForEmail(
    resolved.organization_id,
    resolved.assessment_id,
    email,
  );
  assertNoDuplicateFromMatches(matches, opts);
}

/** Final guard at submit — blocks a second completed submission for the same email. */
export async function assertCandidateCanSubmitAttempt(
  attemptId: string,
  assignmentId: string,
) {
  const [{ data: assignment }, { data: attempt }] = await Promise.all([
    supabase
      .from('assessment_assignments')
      .select('assessment_id, organization_id')
      .eq('id', assignmentId)
      .maybeSingle(),
    supabase
      .from('assessment_attempts')
      .select('id, status, candidate_email, candidate_info, submitted_at, progress')
      .eq('id', attemptId)
      .maybeSingle(),
  ]);

  if (!assignment?.assessment_id || !attempt) return;
  if (isPracticeAttempt(attempt as ExistingAttemptRow)) return;

  const email = extractCandidateEmail(attempt);
  if (!email) return;

  const matches = await listAssessmentAttemptsForEmail(
    assignment.organization_id,
    assignment.assessment_id,
    email,
  );

  const otherSubmitted = matches.find(
    (row) => row.id !== attemptId && isSubmittedAttempt(row) && !isPracticeAttempt(row),
  );
  if (otherSubmitted) throw new Error(DUPLICATE_EMAIL_SUBMITTED_MSG);
}

export async function resolvePublicLink(code: string): Promise<ResolvedPublicLink | null> {
  const normalized = code.trim();

  const { data: reusable } = await supabase
    .from('assessment_reusable_links')
    .select('*, assessment:assessments(id, title, status)')
    .eq('link_code', normalized.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  if (reusable) {
    if (reusable.expires_at && new Date(reusable.expires_at) < new Date()) return null;
    if (reusable.max_uses && reusable.uses_count >= reusable.max_uses) return null;
    if (reusable.assessment?.status && reusable.assessment.status !== 'published') return null;
    return {
      type: 'reusable',
      organization_id: reusable.organization_id,
      assessment_id: reusable.assessment_id,
      assignment_id: reusable.assignment_id || undefined,
      link_id: reusable.id,
      title: reusable.title,
      require_camera: reusable.require_camera,
      require_microphone: reusable.require_microphone,
      post_form_enabled: reusable.post_form_enabled,
      assessment_title: reusable.assessment?.title,
    };
  }

  const { data: assignment } = await supabase
    .from('assessment_assignments')
    .select('*, assessment:assessments(id, title, status)')
    .eq('access_token', normalized)
    .maybeSingle();

  if (assignment?.access_token) {
    if (assignment.expires_at && new Date(assignment.expires_at) < new Date()) return null;
    if (assignment.assessment?.status && assignment.assessment.status !== 'published') return null;
    return {
      type: 'assignment_token',
      organization_id: assignment.organization_id,
      assessment_id: assignment.assessment_id,
      assignment_id: assignment.id,
      title: assignment.title,
      require_camera: true,
      require_microphone: true,
      post_form_enabled: true,
      assessment_title: assignment.assessment?.title,
    };
  }

  return null;
}

export async function fetchReusableLinks(viewer: OrgViewer | null | undefined) {
  let query = supabase
    .from('assessment_reusable_links')
    .select('*, assessment:assessments(id, title, time_limit_minutes, instructions, passing_score)')
    .order('created_at', { ascending: false });
  query = applyOrgScope(query, viewer);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as AssessmentReusableLink[];
}

export async function createReusableLink(
  viewer: OrgViewer & { id: string },
  payload: {
    assessment_id: string;
    title: string;
    max_uses?: number;
    expires_at?: string;
    require_camera?: boolean;
    require_microphone?: boolean;
  },
) {
  const orgId = orgIdForInsert(viewer);
  if (!orgId) throw new Error('Organization required');

  const { data: assignment } = await supabase
    .from('assessment_assignments')
    .insert({
      organization_id: orgId,
      assessment_id: payload.assessment_id,
      title: payload.title,
      assignee_type: 'external',
      public_link_enabled: true,
      max_attempts: 999,
      created_by: viewer.id,
    })
    .select()
    .single();

  const linkCode = randomLinkCode();
  const { data, error } = await supabase
    .from('assessment_reusable_links')
    .insert({
      organization_id: orgId,
      assessment_id: payload.assessment_id,
      assignment_id: assignment?.id,
      link_code: linkCode,
      title: payload.title,
      max_uses: payload.max_uses,
      expires_at: payload.expires_at || null,
      require_camera: payload.require_camera ?? true,
      require_microphone: payload.require_microphone ?? true,
      post_form_enabled: true,
      created_by: viewer.id,
    })
    .select()
    .single();

  if (error) throw error;

  await supabase
    .from('assessment_assignments')
    .update({ access_token: linkCode })
    .eq('id', assignment.id);

  return { ...data, public_url: buildPublicUrl(linkCode) } as AssessmentReusableLink & { public_url: string };
}

export function buildPublicUrl(linkCode: string) {
  const base = typeof window !== 'undefined' ? window.location.origin : 'https://jointavrion.com';
  return `${base}/assess/${linkCode}`;
}

export async function incrementLinkUsage(linkId: string) {
  const { data } = await supabase
    .from('assessment_reusable_links')
    .select('uses_count')
    .eq('id', linkId)
    .single();
  if (!data) return;
  await supabase
    .from('assessment_reusable_links')
    .update({
      uses_count: (data.uses_count || 0) + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq('id', linkId);
}

export async function deactivateReusableLink(viewer: OrgViewer & { id: string }, linkId: string) {
  let query = supabase
    .from('assessment_reusable_links')
    .update({ is_active: false })
    .eq('id', linkId);
  query = applyOrgScope(query, viewer);
  const { error } = await query;
  if (error) throw error;
}

export async function deleteReusableLink(viewer: OrgViewer & { id: string }, linkId: string) {
  const { data: link } = await supabase
    .from('assessment_reusable_links')
    .select('id, assignment_id')
    .eq('id', linkId)
    .maybeSingle();

  if (!link) throw new Error('Link not found');

  let deleteQuery = supabase.from('assessment_reusable_links').delete().eq('id', linkId);
  deleteQuery = applyOrgScope(deleteQuery, viewer);
  const { error } = await deleteQuery;
  if (error) throw error;

  if (link.assignment_id) {
    await supabase.from('assessment_assignments').delete().eq('id', link.assignment_id);
  }
}

export async function startPublicAttempt(
  resolved: ResolvedPublicLink,
  candidate: CandidateInfo,
  opts?: { practiceMode?: boolean },
) {
  await assertCandidateEmailAvailable(resolved, candidate.email, { practiceMode: opts?.practiceMode });

  let assignmentId = resolved.assignment_id;

  if (!assignmentId) {
    const { data: assignment } = await supabase
      .from('assessment_assignments')
      .insert({
        organization_id: resolved.organization_id,
        assessment_id: resolved.assessment_id,
        title: resolved.title,
        assignee_type: 'external',
        max_attempts: 1,
      })
      .select()
      .single();
    assignmentId = assignment?.id;
  }

  if (!assignmentId) throw new Error('Could not create session');

  const normalizedEmail = candidate.email.trim().toLowerCase();

  const { data, error } = await supabase
    .from('assessment_attempts')
    .insert({
      organization_id: resolved.organization_id,
      assignment_id: assignmentId,
      candidate_name: candidate.name,
      candidate_email: normalizedEmail,
      candidate_info: { ...candidate, email: normalizedEmail },
      reusable_link_id: resolved.link_id || null,
      status: 'in_progress',
      device_fingerprint: navigator.userAgent.slice(0, 200),
      user_agent: navigator.userAgent,
      progress: {
        last_active_at: new Date().toISOString(),
      },
    })
    .select()
    .single();

  if (error) throw error;

  if (resolved.link_id) await incrementLinkUsage(resolved.link_id);

  return data;
}
