import { useEffect, useState, useMemo } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import {
  fetchSessions, updateSelectionStatus, deleteSession, fetchSessionDetail,
  bulkUpdateSelectionStatus, bulkDeleteSessions, updateSessionTranscript,
} from '../services/sessionService';
import { fetchAssessments } from '../services/assessmentService';
import { scoreAiAudioResponsesForAttempt, wantsAiAudioEval } from '../services/attemptService';
import type { Assessment } from '../types';
import { exportSelectedSessionsCsv } from '../services/exportService';
import { summarizeCandidate } from '../services/aiService';
import { confirmDelete } from '../utils/confirm';
import type { SelectionStatus } from '../types';
import {
  Search, Eye, Trash2, CheckCircle, Clock, AlertTriangle,
  Users, Monitor, GitCompare, Download, Sparkles, Video,
} from 'lucide-react';
import { formatAnswerForDisplay } from '../utils/answerDisplay';
import { scoreResponse } from '../utils/scoring';

const SELECTION_OPTIONS: SelectionStatus[] = ['pending', 'shortlisted', 'selected', 'rejected', 'on_hold'];

const SELECTION_COLORS: Record<SelectionStatus, string> = {
  pending: '#808080',
  shortlisted: '#2563eb',
  selected: '#16a34a',
  rejected: '#c0392b',
  on_hold: '#d97706',
};

type Tab = 'sessions' | 'proctor' | 'compare';

type SessionDetail = NonNullable<Awaited<ReturnType<typeof fetchSessionDetail>>>;

function sessionPrimaryScore(session: {
  auto_score?: number | null;
  final_score?: number | null;
}) {
  return session.auto_score ?? session.final_score ?? null;
}

function scoreColor(score: number | null | undefined) {
  if (score == null) return '#808080';
  if (score >= 70) return '#16a34a';
  if (score >= 40) return '#d97706';
  return '#c0392b';
}

function scoreBackground(score: number | null | undefined) {
  if (score == null) return '#f5f5f5';
  if (score >= 70) return '#ecfdf5';
  if (score >= 40) return '#fff7ed';
  return '#fef2f2';
}

function responseScore(response: SessionDetail['responses'][number]) {
  const persisted = response.final_score ?? response.auto_score ?? null;
  if (persisted != null) return persisted;
  if (!response.question) return null;
  const calculated = scoreResponse(response.question, response.answer as Record<string, unknown>);
  return calculated.details.includes('manual') || calculated.details.includes('Requires')
    ? null
    : calculated.percentage;
}

function derivedObjectiveScore(detail: SessionDetail | null) {
  if (!detail?.responses?.length) return null;
  const scored = detail.responses
    .filter((response) => response.question)
    .map((response) => scoreResponse(response.question!, response.answer as Record<string, unknown>))
    .filter((result) => !result.details.includes('manual') && !result.details.includes('Requires'));

  if (!scored.length) return null;

  const total = scored.reduce((sum, result) => sum + result.autoScore, 0);
  const max = scored.reduce((sum, result) => sum + result.maxScore, 0);
  return max > 0 ? Math.round((total / max) * 100) : null;
}

const LIVE_SESSION_WINDOW_MS = 5 * 60 * 1000;

function sessionLastActiveAt(session: { started_at: string; progress?: Record<string, unknown> | null }) {
  const progress = session.progress || {};
  const lastActive = progress.last_active_at;
  if (typeof lastActive === 'string') return new Date(lastActive).getTime();
  return new Date(session.started_at).getTime();
}

function isLiveSession(session: { status: string; submitted_at?: string | null; started_at: string; progress?: Record<string, unknown> | null }) {
  if (session.status !== 'in_progress' || session.submitted_at) return false;
  return Date.now() - sessionLastActiveAt(session) <= LIVE_SESSION_WINDOW_MS;
}

function sessionStatusLabel(
  status: string,
  session?: { submitted_at?: string | null; started_at: string; progress?: Record<string, unknown> | null },
) {
  if (status === 'in_progress' && session) {
    if (session.submitted_at) return 'Submitted';
    if (!isLiveSession({ status, ...session })) return 'Abandoned';
    return 'In progress';
  }

  switch (status) {
    case 'graded':
      return 'Completed';
    case 'submitted':
      return 'Submitted';
    case 'in_progress':
      return 'In progress';
    case 'void':
      return 'Void';
    case 'expired':
      return 'Expired';
    default:
      return status.replace('_', ' ');
  }
}

export function TestSessions() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchSessions>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectionFilter, setSelectionFilter] = useState<SelectionStatus | ''>('');
  const [assessmentFilter, setAssessmentFilter] = useState('');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 20;
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('sessions');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [videoAiBusy, setVideoAiBusy] = useState(false);
  const [videoAiMessage, setVideoAiMessage] = useState('');
  const [transcriptEdits, setTranscriptEdits] = useState<Record<string, string>>({});

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const data = await fetchSessions(viewer, {
        search: search || undefined,
        status: statusFilter || undefined,
        selection: selectionFilter || undefined,
        assessmentId: assessmentFilter || undefined,
      });
      setSessions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.id, search, statusFilter, selectionFilter, assessmentFilter]);

  useEffect(() => {
    setPage(1);
    setSelected(new Set());
  }, [search, statusFilter, selectionFilter, assessmentFilter]);

  useEffect(() => {
    if (!viewer) return;
    fetchAssessments(viewer)
      .then((rows) => setAssessments([...rows].sort((a, b) => a.title.localeCompare(b.title))))
      .catch(() => setAssessments([]));
  }, [profile?.id]);

  useEffect(() => {
    if (tab !== 'proctor') return undefined;
    const timer = window.setInterval(() => {
      load();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [tab, profile?.id, search, statusFilter, selectionFilter, assessmentFilter]);

  const liveSessions = useMemo(() => sessions.filter(isLiveSession), [sessions]);
  const staleInProgress = useMemo(
    () => sessions.filter((s) => s.status === 'in_progress' && !s.submitted_at && !isLiveSession(s)),
    [sessions],
  );
  const compareSessions = useMemo(
    () => sessions.filter((s) => compareIds.includes(s.id)),
    [sessions, compareIds],
  );

  const totalPages = Math.max(1, Math.ceil(sessions.length / PAGE_SIZE));
  const pagedSessions = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return sessions.slice(start, start + PAGE_SIZE);
  }, [sessions, page, PAGE_SIZE]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const stats = {
    total: sessions.length,
    completed: sessions.filter((s) => s.status === 'graded' || s.status === 'submitted').length,
    shortlisted: sessions.filter((s) => s.selection_status === 'shortlisted' || s.selection_status === 'selected').length,
    avgScore: (() => {
      const graded = sessions
        .map((s) => sessionPrimaryScore(s))
        .filter((score): score is number => score != null);
      return graded.length ? Math.round(graded.reduce((a, s) => a + s, 0) / graded.length) : 0;
    })(),
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
  };

  const toggleAll = () => {
    if (selected.size === pagedSessions.length && pagedSessions.length > 0) setSelected(new Set());
    else setSelected(new Set(pagedSessions.map((s) => s.id)));
  };

  const runBulk = async (action: 'shortlist' | 'reject' | 'delete' | 'export') => {
    const ids = [...selected];
    if (!ids.length) return;
    if (action === 'delete' && !confirm(`Delete ${ids.length} session(s)? This cannot be undone.`)) return;
    setBulkBusy(true);
    try {
      if (action === 'shortlist') await bulkUpdateSelectionStatus(ids, 'shortlisted', viewer);
      else if (action === 'reject') await bulkUpdateSelectionStatus(ids, 'rejected', viewer);
      else if (action === 'delete') await bulkDeleteSessions(ids, viewer);
      else if (action === 'export') await exportSelectedSessionsCsv(viewer, ids);
      if (action !== 'export') {
        setSelected(new Set());
        await load();
      }
    } finally {
      setBulkBusy(false);
    }
  };

  const openDetail = async (id: string) => {
    const d = await fetchSessionDetail(id, viewer);
    setDetail(d);
    setAiSummary(d?.analytics?.ai_summary || '');
    setVideoAiMessage('');
    const edits: Record<string, string> = {};
    for (const r of d?.responses || []) {
      const transcript = typeof (r.answer as { transcript?: string })?.transcript === 'string'
        ? (r.answer as { transcript: string }).transcript
        : '';
      if (transcript) edits[r.id] = transcript;
    }
    setTranscriptEdits(edits);

    // Auto-run OpenAI Whisper+rubric for unscored AI-audio video responses
    const needsAi = (d?.responses || []).some((r) => {
      if (!r.question || !wantsAiAudioEval(r.question)) return false;
      const mediaUrl = typeof (r.answer as { media_url?: string })?.media_url === 'string';
      if (!mediaUrl) return false;
      const hasEval = Boolean((r.answer as { ai_evaluation?: unknown })?.ai_evaluation);
      return !hasEval || r.final_score == null;
    });

    if (needsAi && d) {
      setVideoAiBusy(true);
      setVideoAiMessage('Scoring video with OpenAI…');
      try {
        const result = await scoreAiAudioResponsesForAttempt(d.id, d.organization_id);
        if (result.scoredCount > 0) {
          const refreshed = await fetchSessionDetail(id, viewer);
          setDetail(refreshed);
          const nextEdits: Record<string, string> = {};
          for (const r of refreshed?.responses || []) {
            const transcript = typeof (r.answer as { transcript?: string })?.transcript === 'string'
              ? (r.answer as { transcript: string }).transcript
              : '';
            if (transcript) nextEdits[r.id] = transcript;
          }
          setTranscriptEdits(nextEdits);
          setVideoAiMessage(`AI scored ${result.scoredCount} video response${result.scoredCount === 1 ? '' : 's'}.`);
        } else if (result.errors.length) {
          setVideoAiMessage(result.errors[0]);
        } else {
          setVideoAiMessage('');
        }
      } catch (e) {
        setVideoAiMessage(e instanceof Error ? e.message : 'AI video scoring failed');
      } finally {
        setVideoAiBusy(false);
      }
    }
  };

  const handleScoreVideos = async () => {
    if (!detail) return;
    setVideoAiBusy(true);
    setVideoAiMessage('Scoring video with OpenAI…');
    try {
      const result = await scoreAiAudioResponsesForAttempt(detail.id, detail.organization_id, { force: true });
      const refreshed = await fetchSessionDetail(detail.id, viewer);
      setDetail(refreshed);
      if (result.errors.length && !result.scoredCount) {
        setVideoAiMessage(result.errors[0]);
      } else {
        setVideoAiMessage(`AI scored ${result.scoredCount} video response${result.scoredCount === 1 ? '' : 's'}.`);
      }
    } catch (e) {
      setVideoAiMessage(e instanceof Error ? e.message : 'AI video scoring failed');
    } finally {
      setVideoAiBusy(false);
    }
  };

  const handleAiSummary = async () => {
    if (!detail) return;
    setAiLoading(true);
    try {
      const result = await summarizeCandidate(detail.id);
      setAiSummary(String(result.summary || ''));
    } finally {
      setAiLoading(false);
    }
  };

  const detailedScores = (detail?.analytics?.detailed_scores || {}) as Record<string, unknown>;
  const objectiveScore = useMemo(
    () => sessionPrimaryScore(detail ?? {}) ?? derivedObjectiveScore(detail),
    [detail],
  );
  const responseSummary = useMemo(() => {
    if (!detail?.responses?.length) return { correct: 0, incorrect: 0, pending: 0 };
    return detail.responses.reduce((acc, r) => {
      const score = responseScore(r);
      if (score == null) acc.pending += 1;
      else if (score >= 70) acc.correct += 1;
      else acc.incorrect += 1;
      return acc;
    }, { correct: 0, incorrect: 0, pending: 0 });
  }, [detail]);

  return (
    <TestLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Candidate Sessions</h1>
        <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Review attempts, proctoring alerts, and hiring decisions.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total sessions', value: stats.total },
          { label: 'Completed', value: stats.completed },
          { label: 'Shortlisted+', value: stats.shortlisted },
          { label: 'Avg score', value: `${stats.avgScore}%` },
        ].map((c) => (
          <div key={c.label} className="lt-card" style={{ padding: 14 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          { id: 'sessions' as Tab, label: 'All sessions', icon: Users },
          { id: 'proctor' as Tab, label: `Live proctor (${liveSessions.length})`, icon: Monitor },
          { id: 'compare' as Tab, label: `Compare (${compareIds.length}/5)`, icon: GitCompare },
        ]).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'lt-btn-primary' : 'lt-btn-secondary'}
            style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'sessions' && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#aaa' }} />
              <input className="lt-input" placeholder="Search candidate..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
            </div>
            <select className="lt-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 130 }}>
              <option value="">All status</option>
              <option value="in_progress">In progress</option>
              <option value="submitted">Submitted</option>
              <option value="graded">Completed</option>
            </select>
            <select className="lt-input" value={assessmentFilter} onChange={(e) => setAssessmentFilter(e.target.value)} style={{ width: 180, maxWidth: '100%' }}>
              <option value="">All assessments</option>
              {assessments.map((a) => (
                <option key={a.id} value={a.id}>{a.title}</option>
              ))}
            </select>
            <select className="lt-input" value={selectionFilter} onChange={(e) => setSelectionFilter(e.target.value as SelectionStatus | '')} style={{ width: 140 }}>
              <option value="">All selection</option>
              {SELECTION_OPTIONS.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>

          {selected.size > 0 && (
            <div className="lt-card" style={{ padding: '10px 14px', marginBottom: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{selected.size} selected</span>
              <button type="button" disabled={bulkBusy} onClick={() => runBulk('shortlist')} className="lt-btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>Shortlist</button>
              <button type="button" disabled={bulkBusy} onClick={() => runBulk('reject')} className="lt-btn-secondary" style={{ padding: '4px 10px', fontSize: 11, color: '#c0392b' }}>Reject</button>
              <button type="button" disabled={bulkBusy} onClick={() => runBulk('delete')} className="lt-btn-secondary" style={{ padding: '4px 10px', fontSize: 11, color: '#c0392b' }}>Delete</button>
              <button type="button" disabled={bulkBusy} onClick={() => runBulk('export')} className="lt-btn-secondary" style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Download size={11} /> Export CSV
              </button>
            </div>
          )}

          {loading ? <p style={{ color: '#808080' }}>Loading...</p> : (
            <div className="lt-card test-table-wrap">
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', minWidth: 760 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', width: 36 }}>
                      <input type="checkbox" checked={selected.size === pagedSessions.length && pagedSessions.length > 0} onChange={toggleAll} />
                    </th>
                    <th style={{ padding: '10px 14px', color: '#999', fontWeight: 600 }}>Candidate</th>
                    <th style={{ padding: '10px 14px', color: '#999', fontWeight: 600 }}>Assessment</th>
                    <th style={{ padding: '10px 14px', color: '#999', fontWeight: 600 }}>Score</th>
                    <th style={{ padding: '10px 14px', color: '#999', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '10px 14px', color: '#999', fontWeight: 600 }}>Selection</th>
                    <th style={{ padding: '10px 14px', color: '#999', fontWeight: 600 }}>Alerts</th>
                    <th style={{ padding: '10px 14px', color: '#999', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSessions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{s.candidate_name || s.candidate_email || '—'}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>{s.candidate_email}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>{s.assignment?.title || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '5px 10px',
                          borderRadius: 999,
                          fontSize: 12,
                          fontWeight: 700,
                          color: scoreColor(sessionPrimaryScore(s)),
                          background: scoreBackground(sessionPrimaryScore(s)),
                        }}>
                          {sessionPrimaryScore(s) != null ? `${sessionPrimaryScore(s)}%` : 'Pending'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{
                          fontSize: 11,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '5px 9px',
                          borderRadius: 999,
                          background: s.status === 'graded' || s.status === 'submitted' ? '#ecfdf5' : '#f5f5f5',
                          color: s.status === 'graded' || s.status === 'submitted' ? '#166534' : '#666',
                        }}>
                          {s.status === 'graded' || s.status === 'submitted'
                            ? <CheckCircle size={12} color="#16a34a" />
                            : <Clock size={12} color="#808080" />}
                          {sessionStatusLabel(s.status, s)}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <select
                          value={s.selection_status || 'pending'}
                          onChange={(e) => updateSelectionStatus(s.id, e.target.value as SelectionStatus, viewer).then(load)}
                          style={{
                            fontSize: 11,
                            padding: '6px 8px',
                            borderRadius: 999,
                            border: '1px solid #e5e5e5',
                            color: SELECTION_COLORS[(s.selection_status || 'pending') as SelectionStatus],
                            background: `${SELECTION_COLORS[(s.selection_status || 'pending') as SelectionStatus]}12`,
                            fontWeight: 700,
                          }}
                        >
                          {SELECTION_OPTIONS.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {(s.violation_count || 0) > 0 ? (
                          <span style={{ color: '#c0392b', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                            <AlertTriangle size={12} /> {s.violation_count}
                          </span>
                        ) : '—'}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" onClick={() => openDetail(s.id)} className="lt-btn-secondary" style={{ padding: '4px 8px' }}>
                            <Eye size={12} />
                          </button>
                          <button
                            type="button"
                            title="Add to compare"
                            onClick={() => { toggleCompare(s.id); setTab('compare'); }}
                            className="lt-btn-secondary"
                            style={{ padding: '4px 8px', color: compareIds.includes(s.id) ? '#2563eb' : undefined }}
                          >
                            <GitCompare size={12} />
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              const name = s.candidate_name || s.candidate_email || 'this session';
                              if (!confirmDelete(name)) return;
                              await deleteSession(s.id, viewer);
                              await load();
                            }}
                            className="lt-btn-secondary test-delete-btn"
                            style={{ padding: '4px 8px' }}
                            title="Delete session"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {sessions.length > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                  padding: '12px 14px', borderTop: '1px solid #f0f0f0', flexWrap: 'wrap',
                }}>
                  <span style={{ fontSize: 12, color: '#666' }}>
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sessions.length)} of {sessions.length}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      className="lt-btn-secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      Previous
                    </button>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#444' }}>
                      Page {page} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="lt-btn-secondary"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      style={{ padding: '6px 12px', fontSize: 12 }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'proctor' && (
        <div className="lt-card" style={{ overflow: 'auto' }}>
          {liveSessions.length === 0 ? (
            <p style={{ padding: 24, fontSize: 13, color: '#999' }}>
              No candidates are actively taking a test right now.
              {staleInProgress.length > 0 && (
                <> {staleInProgress.length} older unfinished session{staleInProgress.length === 1 ? '' : 's'} remain in All sessions.</>
              )}
            </p>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Candidate</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Assessment</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Last active</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Violations</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {liveSessions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{s.candidate_name || s.candidate_email}</td>
                    <td style={{ padding: '12px 14px' }}>{s.assignment?.title}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#666' }}>
                      {new Date(sessionLastActiveAt(s)).toLocaleString()}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ color: (s.violation_count || 0) > 0 ? '#c0392b' : '#16a34a', fontWeight: 600 }}>
                        {s.violation_count || 0}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <button type="button" onClick={() => openDetail(s.id)} className="lt-btn-secondary" style={{ padding: '4px 10px', fontSize: 11 }}>View</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === 'compare' && (
        <div className="lt-card" style={{ padding: 20, overflow: 'auto' }}>
          {compareSessions.length < 2 ? (
            <p style={{ fontSize: 13, color: '#999' }}>Select 2–5 candidates from the sessions table to compare side-by-side.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <th style={{ padding: 8, textAlign: 'left', color: '#999' }}>Metric</th>
                  {compareSessions.map((s) => (
                    <th key={s.id} style={{ padding: 8, textAlign: 'left' }}>
                      <div style={{ fontWeight: 600 }}>{s.candidate_name || '—'}</div>
                      <div style={{ color: '#999', fontSize: 10 }}>{s.candidate_email}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Objective score', get: (s: typeof compareSessions[0]) => sessionPrimaryScore(s) != null ? `${sessionPrimaryScore(s)}%` : '—' },
                  { label: 'Overall', get: (s: typeof compareSessions[0]) => s.analytics?.overall_score ?? '—' },
                  { label: 'Communication', get: (s: typeof compareSessions[0]) => s.analytics?.communication_score ?? '—' },
                  { label: 'Aptitude', get: (s: typeof compareSessions[0]) => s.analytics?.aptitude_score ?? '—' },
                  { label: 'Integrity', get: (s: typeof compareSessions[0]) => s.integrity_score ?? s.analytics?.integrity_score ?? '—' },
                  { label: 'Violations', get: (s: typeof compareSessions[0]) => s.violation_count ?? 0 },
                  { label: 'Recommendation', get: (s: typeof compareSessions[0]) => s.analytics?.recommendation || '—' },
                  { label: 'Strengths', get: (s: typeof compareSessions[0]) => (s.analytics?.strengths || []).join(', ') || '—' },
                ].map((row) => (
                  <tr key={row.label} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: 8, fontWeight: 600, color: '#666' }}>{row.label}</td>
                    {compareSessions.map((s) => (
                      <td key={s.id} style={{ padding: 8 }}>{row.get(s)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {compareIds.length > 0 && (
            <button type="button" onClick={() => setCompareIds([])} className="lt-btn-secondary" style={{ marginTop: 12, padding: '6px 12px', fontSize: 12 }}>Clear selection</button>
          )}
        </div>
      )}

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDetail(null)}>
          <div className="lt-card" style={{ maxWidth: 720, width: '100%', maxHeight: '85vh', overflow: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Session details</h2>
            <p style={{ fontSize: 13, marginBottom: 8 }}><strong>{detail.candidate_name}</strong> · {detail.candidate_email}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: 999,
                background: scoreBackground(objectiveScore), color: scoreColor(objectiveScore), fontSize: 12, fontWeight: 700,
              }}>
                Objective score {objectiveScore ?? '—'}%
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: 999,
                background: detail.passed ? '#ecfdf5' : detail.passed === false ? '#fef2f2' : '#f5f5f5',
                color: detail.passed ? '#166534' : detail.passed === false ? '#b91c1c' : '#666',
                fontSize: 12, fontWeight: 700,
              }}>
                {detail.passed ? 'Qualified' : detail.passed === false ? 'Not qualified' : 'Pending review'}
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', padding: '6px 10px', borderRadius: 999,
                background: `${SELECTION_COLORS[(detail.selection_status || 'pending') as SelectionStatus]}12`,
                color: SELECTION_COLORS[(detail.selection_status || 'pending') as SelectionStatus],
                fontSize: 12, fontWeight: 700,
              }}>
                {(detail.selection_status || 'pending').replace('_', ' ')}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Correct', value: responseSummary.correct, fg: '#166534', bg: '#ecfdf5' },
                { label: 'Incorrect', value: responseSummary.incorrect, fg: '#b91c1c', bg: '#fef2f2' },
                { label: 'Pending', value: responseSummary.pending, fg: '#a16207', bg: '#fefce8' },
              ].map((m) => (
                <div key={m.label} style={{ background: m.bg, borderRadius: 10, padding: 12 }}>
                  <div style={{ fontSize: 11, color: m.fg }}>{m.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: m.fg, letterSpacing: '-0.04em' }}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Role-fit', value: detailedScores.role_fit_score },
                { label: 'Resume match', value: detailedScores.resume_match_score },
                { label: 'Integrity', value: detail.integrity_score ?? detail.analytics?.integrity_score },
              ].map((m) => (
                <div key={m.label} style={{ background: '#f8f8f8', borderRadius: 8, padding: 10 }}>
                  <div style={{ fontSize: 10, color: '#999' }}>{m.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{m.value != null ? `${m.value}%` : '—'}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h3 style={{ fontSize: 13, fontWeight: 700 }}>AI summary</h3>
                <button type="button" onClick={handleAiSummary} disabled={aiLoading} className="lt-btn-secondary" style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Sparkles size={12} /> {aiLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, background: '#f8f8f8', padding: 12, borderRadius: 8 }}>
                {aiSummary || 'No summary yet. Click Generate to create one.'}
              </p>
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Integrity report</h3>
            <div style={{ fontSize: 12, color: '#666', marginBottom: 12, background: '#f8f8f8', padding: 12, borderRadius: 8 }}>
              <div>IP: {(detail as { ip_address?: string }).ip_address || '—'}</div>
              <div>Device: {(detail as { device_fingerprint?: string }).device_fingerprint?.slice(0, 48) || '—'}</div>
              <div>User agent: {(detail as { user_agent?: string }).user_agent?.slice(0, 80) || '—'}</div>
              <div style={{ marginTop: 6, fontWeight: 600 }}>Violations ({detail.violations?.length || 0})</div>
              {(detail.violations || []).map((v) => (
                <div key={v.id} style={{ marginTop: 4 }}>· {v.violation_type} ({v.severity}) — {new Date(v.created_at).toLocaleString()}</div>
              ))}
            </div>

            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Responses</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: '#808080', margin: 0 }}>
                {videoAiBusy ? 'Running OpenAI transcription + scoring…' : (videoAiMessage || 'Language/speaking videos are scored via org OpenAI.')}
              </p>
              <button
                type="button"
                onClick={() => void handleScoreVideos()}
                disabled={videoAiBusy}
                className="lt-btn-secondary"
                style={{ padding: '4px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
              >
                <Sparkles size={12} /> {videoAiBusy ? 'Scoring…' : 'Score videos with AI'}
              </button>
            </div>
            {(detail.responses || []).map((r) => {
              const mediaUrl = String((r.answer as { media_url?: string })?.media_url ?? '');
              const isVideo = (r.answer as { media_type?: string })?.media_type === 'video' || r.question?.question_type === 'video_response';
              const computedScore = responseScore(r);
              const aiEval = (r.answer as { ai_evaluation?: Record<string, unknown> })?.ai_evaluation;
              const aiTranscript = typeof (r.answer as { transcript?: string })?.transcript === 'string'
                ? (r.answer as { transcript: string }).transcript
                : typeof aiEval?.transcript === 'string'
                  ? String(aiEval.transcript)
                  : '';
              return (
                <div key={r.id} style={{ padding: '12px 0', borderTop: '1px solid #f5f5f5', fontSize: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 6 }}>
                    <div style={{ fontWeight: 600 }}>{r.question?.prompt?.slice(0, 100)}</div>
                    {computedScore != null && (
                      <span style={{
                        flexShrink: 0,
                        display: 'inline-flex',
                        alignItems: 'center',
                        padding: '4px 8px',
                        borderRadius: 999,
                        fontSize: 11,
                        fontWeight: 700,
                        color: scoreColor(computedScore),
                        background: scoreBackground(computedScore),
                      }}>
                        {isVideo || r.question?.question_type === 'audio_response'
                          ? `AI ${computedScore}%`
                          : computedScore >= 70 ? 'Correct' : 'Incorrect'}
                      </span>
                    )}
                  </div>
                  {mediaUrl && isVideo && (
                    <div style={{ marginBottom: 8 }}>
                      <a href={mediaUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2563eb', marginBottom: 6 }}>
                        <Video size={12} /> Open video playback
                      </a>
                      <video src={mediaUrl} controls style={{ width: '100%', maxHeight: 200, borderRadius: 8 }} />
                    </div>
                  )}
                  {aiEval && (
                    <div style={{ marginBottom: 8, background: '#f8f8f8', borderRadius: 8, padding: 10, fontSize: 11, color: '#555', lineHeight: 1.5 }}>
                      <div style={{ fontWeight: 700, marginBottom: 4, color: '#171717' }}>OpenAI evaluation</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
                        {(['grammar_score', 'fluency_score', 'vocabulary_score', 'pronunciation_score', 'clarity_score'] as const).map((key) => (
                          aiEval[key] != null ? (
                            <span key={key} style={{ background: '#fff', border: '1px solid #eee', borderRadius: 6, padding: '2px 8px' }}>
                              {key.replace('_score', '')}: {String(aiEval[key])}
                            </span>
                          ) : null
                        ))}
                      </div>
                      {Array.isArray(aiEval.feedback) && (aiEval.feedback as string[]).length > 0 && (
                        <div>{(aiEval.feedback as string[]).join(' ')}</div>
                      )}
                    </div>
                  )}
                  {isVideo && (
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Transcript</label>
                      <textarea
                        className="lt-input"
                        rows={3}
                        value={transcriptEdits[r.id] ?? aiTranscript}
                        onChange={(e) => setTranscriptEdits((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="AI transcript appears here after scoring…"
                        style={{ width: '100%', fontSize: 12 }}
                      />
                      <button
                        type="button"
                        className="lt-btn-secondary"
                        style={{ marginTop: 4, padding: '4px 10px', fontSize: 11 }}
                        onClick={() => updateSessionTranscript(detail.id, r.id, transcriptEdits[r.id] || '', viewer)}
                      >
                        Save transcript
                      </button>
                    </div>
                  )}
                  {!mediaUrl && (
                    <div style={{ color: '#333', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fafafa', borderRadius: 8, padding: 12 }}>
                      {formatAnswerForDisplay(r.question, r.answer as Record<string, unknown>)}
                    </div>
                  )}
                  {computedScore != null && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#666' }}>
                      Score: {computedScore}%
                      {r.grader_notes && !r.grader_notes.startsWith('{') ? ` · ${r.grader_notes}` : ''}
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" onClick={() => setDetail(null)} className="lt-btn-secondary" style={{ marginTop: 16, padding: '8px 16px' }}>Close</button>
          </div>
        </div>
      )}
    </TestLayout>
  );
}
