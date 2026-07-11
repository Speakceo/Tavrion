export interface OrgViewer {
  organization_id?: string | null;
  is_platform_owner?: boolean;
}

const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

/**
 * Filter rows to the viewer's organisation.
 * Platform owner sees all. Non-owners without an org get an empty result (fail closed).
 */
export function applyOrgScope<T extends { eq: (column: string, value: unknown) => T }>(
  query: T,
  viewer?: OrgViewer | null,
  column = 'organization_id',
): T {
  if (viewer?.is_platform_owner) return query;
  if (viewer?.organization_id) return query.eq(column, viewer.organization_id);
  return query.eq(column, EMPTY_UUID);
}

export function orgIdForInsert(viewer?: OrgViewer | null): string | null {
  return viewer?.organization_id || null;
}

export function requireOrgId(viewer?: OrgViewer | null): string {
  if (viewer?.organization_id) return viewer.organization_id;
  throw new Error('Organisation context is required for this action.');
}
