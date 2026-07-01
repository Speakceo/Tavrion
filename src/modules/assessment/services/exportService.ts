import type { OrgViewer } from '../../../utils/orgScope';
import type { AssessmentQuestion } from '../types';
import { fetchQuestions } from './questionService';
import { fetchSessions } from './sessionService';

type CsvRow = Record<string, string | number | boolean | null | undefined>;

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function rowsToCsv(rows: CsvRow[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((h) => escapeCsvCell(row[h])).join(',')),
  ];
  return lines.join('\n');
}

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const csv = rowsToCsv(rows);
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadExcel(filename: string, rows: CsvRow[]) {
  const csv = rowsToCsv(rows);
  const blob = new Blob(['\uFEFF', csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  link.click();
  URL.revokeObjectURL(url);
}

function sessionToRow(s: Awaited<ReturnType<typeof fetchSessions>>[number]): CsvRow {
  return {
    attempt_id: s.id,
    candidate_name: s.candidate_name || (s.candidate_info as { name?: string })?.name,
    candidate_email: s.candidate_email || (s.candidate_info as { email?: string })?.email,
    assignment_title: s.assignment?.title,
    status: s.status,
    selection_status: s.selection_status,
    started_at: s.started_at,
    submitted_at: s.submitted_at,
    final_score: s.final_score,
    passed: s.passed,
    violation_count: s.violation_count ?? 0,
    overall_score: s.analytics?.overall_score,
    recommendation: s.analytics?.recommendation,
  };
}

export async function exportSessionsCsv(
  viewer: OrgViewer | null | undefined,
  filename = 'assessment-sessions',
  attemptIds?: string[],
) {
  const sessions = await fetchSessions(viewer);
  const filtered = attemptIds?.length
    ? sessions.filter((s) => attemptIds.includes(s.id))
    : sessions;
  const rows: CsvRow[] = filtered.map(sessionToRow);
  downloadCsv(filename, rows);
  return rows.length;
}

export async function exportSelectedSessionsCsv(
  viewer: OrgViewer | null | undefined,
  attemptIds: string[],
  filename = 'selected-sessions',
) {
  return exportSessionsCsv(viewer, filename, attemptIds);
}

export async function exportReportByType(
  viewer: OrgViewer | null | undefined,
  reportType: 'assessment' | 'candidate' | 'integrity' | 'skill',
  format: 'csv' | 'excel' = 'csv',
) {
  const filename = `${reportType}-report`;
  let rows: CsvRow[] = [];

  if (reportType === 'integrity') {
    const sessions = await fetchSessions(viewer);
    rows = sessions
      .filter((s) => (s.violation_count ?? 0) > 0)
      .map((s) => ({
        attempt_id: s.id,
        candidate_name: s.candidate_name,
        candidate_email: s.candidate_email,
        assignment_title: s.assignment?.title,
        violation_count: s.violation_count ?? 0,
        integrity_score: s.integrity_score ?? s.analytics?.integrity_score,
        status: s.status,
        started_at: s.started_at,
        submitted_at: s.submitted_at,
      }));
  } else if (reportType === 'skill') {
    const sessions = await fetchSessions(viewer);
    rows = sessions
      .filter((s) => s.analytics)
      .map((s) => ({
        attempt_id: s.id,
        candidate_name: s.candidate_name,
        candidate_email: s.candidate_email,
        assignment_title: s.assignment?.title,
        overall_score: s.analytics?.overall_score,
        communication_score: s.analytics?.communication_score,
        aptitude_score: s.analytics?.aptitude_score,
        strengths: (s.analytics?.strengths || []).join(';'),
        weaknesses: (s.analytics?.weaknesses || []).join(';'),
        submitted_at: s.submitted_at,
      }));
  } else if (reportType === 'candidate') {
    const sessions = await fetchSessions(viewer);
    rows = sessions.map((s) => ({
      ...sessionToRow(s),
      role_fit_score: (s.analytics?.detailed_scores as Record<string, unknown>)?.role_fit_score,
      resume_match_score: (s.analytics?.detailed_scores as Record<string, unknown>)?.resume_match_score,
    }));
  } else {
    const sessions = await fetchSessions(viewer);
    const graded = sessions.filter((s) => s.status === 'graded');
    rows = graded.map((s) => ({
      assignment_title: s.assignment?.title,
      attempt_id: s.id,
      final_score: s.final_score,
      passed: s.passed,
      submitted_at: s.submitted_at,
    }));
  }

  if (format === 'excel') downloadExcel(filename, rows);
  else downloadCsv(filename, rows);
  return rows.length;
}

export async function exportQuestionsCsv(
  viewer: OrgViewer | null | undefined,
  filename = 'assessment-questions',
) {
  const questions = await fetchQuestions(viewer, { includeArchived: true });

  const rows: CsvRow[] = questions.map((q: AssessmentQuestion) => ({
    question_id: q.id,
    title: q.title,
    question_type: q.question_type,
    difficulty: q.difficulty,
    weight: q.weight,
    tags: q.tags.join(';'),
    skill_id: q.skill_id,
    is_archived: q.is_archived,
    created_at: q.created_at,
  }));

  downloadCsv(filename, rows);
  return rows.length;
}

export async function exportIntegrityReport(
  viewer: OrgViewer | null | undefined,
  filename = 'assessment-integrity-report',
) {
  const sessions = await fetchSessions(viewer);
  const flagged = sessions.filter((s) => (s.violation_count ?? 0) > 0);

  const rows: CsvRow[] = flagged.map((s) => ({
    attempt_id: s.id,
    candidate_name: s.candidate_name,
    candidate_email: s.candidate_email,
    assignment_title: s.assignment?.title,
    violation_count: s.violation_count ?? 0,
    integrity_score: s.integrity_score ?? s.analytics?.integrity_score,
    status: s.status,
    started_at: s.started_at,
    submitted_at: s.submitted_at,
  }));

  downloadCsv(filename, rows);
  return rows.length;
}

export async function exportAnalyticsCsv(
  viewer: OrgViewer | null | undefined,
  filename = 'assessment-analytics',
) {
  const sessions = await fetchSessions(viewer);
  const withAnalytics = sessions.filter((s) => s.analytics);

  const rows: CsvRow[] = withAnalytics.map((s) => ({
    attempt_id: s.id,
    candidate_name: s.candidate_name,
    candidate_email: s.candidate_email,
    assignment_title: s.assignment?.title,
    overall_score: s.analytics?.overall_score,
    communication_score: s.analytics?.communication_score,
    aptitude_score: s.analytics?.aptitude_score,
    integrity_score: s.analytics?.integrity_score,
    recommendation: s.analytics?.recommendation,
    strengths: (s.analytics?.strengths || []).join(';'),
    weaknesses: (s.analytics?.weaknesses || []).join(';'),
    submitted_at: s.submitted_at,
  }));

  downloadCsv(filename, rows);
  return rows.length;
}
