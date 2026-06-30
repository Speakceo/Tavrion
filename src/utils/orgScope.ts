export interface OrgViewer {
  organization_id?: string | null;
  is_platform_owner?: boolean;
}

/** Filter rows to the viewer's organisation (platform owner sees all). */
export function applyOrgScope<T extends { eq: (column: string, value: unknown) => T }>(
  query: T,
  viewer?: OrgViewer | null,
  column = 'organization_id',
): T {
  if (viewer?.is_platform_owner) return query;
  if (viewer?.organization_id) return query.eq(column, viewer.organization_id);
  return query;
}

export function orgIdForInsert(viewer?: OrgViewer | null): string | null {
  return viewer?.organization_id || null;
}
