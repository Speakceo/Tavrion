import type { UserRole } from '../types';

export const MASTER_SUPER_ADMIN_UNIQUE_ID = 'arpitadmin';

export const ORG_ASSIGNABLE_ROLES: UserRole[] = ['employee', 'trainer', 'admin'];

export function isMasterSuperAdmin(uniqueId?: string | null) {
  return uniqueId?.trim().toLowerCase() === MASTER_SUPER_ADMIN_UNIQUE_ID;
}

/** Only arpitadmin may hold super_admin; everyone else is downgraded to admin. */
export function sanitizeUserRole(role: string, uniqueId: string): UserRole {
  if (isMasterSuperAdmin(uniqueId)) return 'super_admin';
  if (role === 'super_admin') return 'admin';
  return role as UserRole;
}

export function canAssignRole(role: string, actor?: { is_platform_owner?: boolean; unique_id?: string | null }) {
  if (role === 'super_admin') return isMasterSuperAdmin(actor?.unique_id);
  return ORG_ASSIGNABLE_ROLES.includes(role as UserRole);
}
