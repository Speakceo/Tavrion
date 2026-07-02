import { ORG_ASSIGNABLE_ROLES, sanitizeUserRole } from './platformAccess';
import type { UserRole } from '../types';

export type ParsedUserCsvRow = {
  line: number;
  full_name: string;
  email: string;
  department: string;
  role: UserRole;
};

export type ParsedUserCsvResult = {
  rows: ParsedUserCsvRow[];
  errors: string[];
};

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += ch;
  }
  result.push(current.trim());
  return result;
}

function normalizeRole(value: string): UserRole | null {
  const role = value.trim().toLowerCase().replace(/\s+/g, '_');
  if (role === 'super_admin' || role === 'superadmin') return null;
  if (ORG_ASSIGNABLE_ROLES.includes(role as UserRole)) return role as UserRole;
  return null;
}

function isHeaderRow(cols: string[]): boolean {
  const joined = cols.join(' ').toLowerCase();
  return joined.includes('name') && joined.includes('email');
}

export function uniqueIdFromEmail(email: string, taken: Set<string>): string {
  const local = (email.split('@')[0] || 'user')
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 24) || 'user';

  let candidate = local;
  let suffix = 1;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${local}${suffix}`;
    suffix += 1;
  }
  taken.add(candidate.toLowerCase());
  return candidate;
}

export function parseUserCsv(text: string): ParsedUserCsvResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const rows: ParsedUserCsvRow[] = [];
  const errors: string[] = [];

  if (!lines.length) {
    return { rows, errors: ['CSV file is empty.'] };
  }

  const firstCols = parseCsvRow(lines[0]);
  const hasHeader = isHeaderRow(firstCols);
  const startIndex = hasHeader ? 1 : 0;

  let nameIdx = 0;
  let emailIdx = 1;
  let departmentIdx = 2;
  let roleIdx = 3;

  if (hasHeader) {
    const header = firstCols.map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const find = (...keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
    nameIdx = find('name', 'full_name');
    emailIdx = find('email');
    departmentIdx = find('department', 'dept');
    roleIdx = find('role');
    if ([nameIdx, emailIdx, departmentIdx, roleIdx].some((i) => i < 0)) {
      return { rows, errors: ['Header row must include name, email, department, and role columns.'] };
    }
  }

  for (let i = startIndex; i < lines.length; i++) {
    const lineNo = i + 1;
    const cols = parseCsvRow(lines[i]);
    if (cols.length < 4) {
      errors.push(`Line ${lineNo}: expected name, email, department, role.`);
      continue;
    }

    const full_name = cols[nameIdx]?.trim() || '';
    const email = cols[emailIdx]?.trim().toLowerCase() || '';
    const department = cols[departmentIdx]?.trim() || '';
    const roleRaw = cols[roleIdx]?.trim() || '';

    if (!full_name) {
      errors.push(`Line ${lineNo}: name is required.`);
      continue;
    }
    if (!email || !email.includes('@')) {
      errors.push(`Line ${lineNo}: valid email is required.`);
      continue;
    }
    const role = normalizeRole(roleRaw);
    if (!role) {
      errors.push(`Line ${lineNo}: role must be employee, trainer, or admin.`);
      continue;
    }

    rows.push({ line: lineNo, full_name, email, department, role });
  }

  return { rows, errors };
}

export function buildUserInsert(
  row: ParsedUserCsvRow,
  orgId: string | null | undefined,
  takenUniqueIds: Set<string>,
) {
  const unique_id = uniqueIdFromEmail(row.email, takenUniqueIds);
  return {
    unique_id,
    full_name: row.full_name,
    email: row.email,
    role: sanitizeUserRole(row.role, unique_id),
    department: row.department || null,
    country: null,
    is_active: true,
    organization_id: orgId || null,
  };
}

export const USER_CSV_TEMPLATE = `name,email,department,role
Jane Doe,jane@company.com,Sales,employee
John Smith,john@company.com,Engineering,trainer
Alex Lee,alex@company.com,Operations,admin`;
