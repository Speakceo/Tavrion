export interface OrgViewer {
  organization_id?: string | null;
  is_platform_owner?: boolean;
}

/** Restrict user_profiles queries to the viewer's org and hide platform owners. */
export function applyOrgUserScope<T extends { eq: (column: string, value: unknown) => T }>(
  query: T,
  viewer?: OrgViewer | null,
): T {
  let scoped = query.eq('is_platform_owner', false);
  if (viewer?.organization_id && !viewer?.is_platform_owner) {
    scoped = scoped.eq('organization_id', viewer.organization_id);
  }
  return scoped;
}

export function uniqueSortedStrings(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));
}

export function filterByDepartment<T extends { department?: string | null }>(
  users: T[],
  department: string,
): T[] {
  if (!department) return users;
  return users.filter((u) => u.department === department);
}
