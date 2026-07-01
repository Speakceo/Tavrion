import { useEffect, useState, useMemo } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import {
  fetchSessions, updateSelectionStatus, deleteSession, fetchSessionDetail,
  bulkUpdateSelectionStatus, bulkDeleteSessions, updateSessionTranscript,
} from '../services/sessionService';
import { exportSelectedSessionsCsv } from '../services/exportService';
import { summarizeCandidate } from '../services/aiService';
import { confirmDelete } from '../utils/confirm';
import type { SelectionStatus } from '../types';
import {
  Search, Eye, Trash2, CheckCircle, Clock, AlertTriangle,
  Users, Monitor, GitCompare, Download, Sparkles, Video,
} from 'lucide-react';

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

export function TestSessions() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchSessions>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectionFilter, setSelectionFilter] = useState<SelectionStatus | ''>('');
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>('sessions');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [transcriptEdits, setTranscriptEdits] = useState<Record<string, string>>({});

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const data = await fetchSessions(viewer, {
        search: search || undefined,
        status: statusFilter || undefined,
        selection: selectionFilter || undefined,
      });
      setSessions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.id, search, statusFilter, selectionFilter]);

  const inProgress = useMemo(() => sessions.filter((s) => s.status === 'in_progress'), [sessions]);
  const compareSessions = useMemo(
    () => sessions.filter((s) => compareIds.includes(s.id)),
    [sessions, compareIds],
  );

  const stats = {
    total: sessions.length,
    completed: sessions.filter((s) => s.status === 'graded').length,
    shortlisted: sessions.filter((s) => s.selection_status === 'shortlisted' || s.selection_status === 'selected').length,
    avgScore: (() => {
      const graded = sessions.filter((s) => s.final_score != null);
      return graded.length ? Math.round(graded.reduce((a, s) => a + (s.final_score || 0), 0) / graded.length) : 0;
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
    if (selected.size === sessions.length) setSelected(new Set());
    else setSelected(new Set(sessions.map((s) => s.id)));
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
    setTranscriptEdits({});
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
          { id: 'proctor' as Tab, label: `Live proctor (${inProgress.length})`, icon: Monitor },
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
              <option value="graded">Graded</option>
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
                      <input type="checkbox" checked={selected.size === sessions.length && sessions.length > 0} onChange={toggleAll} />
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
                  {sessions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '12px 14px' }}>
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)} />
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{s.candidate_name || s.candidate_email || '—'}</div>
                        <div style={{ fontSize: 11, color: '#999' }}>{s.candidate_email}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>{s.assignment?.title || '—'}</td>
                      <td style={{ padding: '12px 14px', fontWeight: 600 }}>{s.final_score != null ? `${s.final_score}%` : '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                          {s.status === 'graded' ? <CheckCircle size={12} color="#16a34a" /> : <Clock size={12} color="#808080" />}
                          {s.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <select
                          value={s.selection_status || 'pending'}
                          onChange={(e) => updateSelectionStatus(s.id, e.target.value as SelectionStatus, viewer).then(load)}
                          style={{ fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e5e5', color: SELECTION_COLORS[(s.selection_status || 'pending') as SelectionStatus] }}
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
            </div>
          )}
        </>
      )}

      {tab === 'proctor' && (
        <div className="lt-card" style={{ overflow: 'auto' }}>
          {inProgress.length === 0 ? (
            <p style={{ padding: 24, fontSize: 13, color: '#999' }}>No in-progress sessions right now.</p>
          ) : (
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Candidate</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Assessment</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Started</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Violations</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {inProgress.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{s.candidate_name || s.candidate_email}</td>
                    <td style={{ padding: '12px 14px' }}>{s.assignment?.title}</td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: '#666' }}>{new Date(s.started_at).toLocaleString()}</td>
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
                  { label: 'Score', get: (s: typeof compareSessions[0]) => s.final_score != null ? `${s.final_score}%` : '—' },
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
            <p style={{ fontSize: 13, color: '#666', marginBottom: 12 }}>
              Score: {detail.final_score ?? '—'}% · {detail.passed ? 'Passed' : detail.passed === false ? 'Failed' : 'Pending'}
            </p>

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
            {(detail.responses || []).map((r) => {
              const mediaUrl = String((r.answer as { media_url?: string })?.media_url ?? '');
              const isVideo = (r.answer as { media_type?: string })?.media_type === 'video' || r.question?.question_type === 'video_response';
              return (
                <div key={r.id} style={{ padding: '12px 0', borderTop: '1px solid #f5f5f5', fontSize: 12 }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.question?.prompt?.slice(0, 100)}</div>
                  {mediaUrl && isVideo && (
                    <div style={{ marginBottom: 8 }}>
                      <a href={mediaUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#2563eb', marginBottom: 6 }}>
                        <Video size={12} /> Open video playback
                      </a>
                      <video src={mediaUrl} controls style={{ width: '100%', maxHeight: 200, borderRadius: 8 }} />
                    </div>
                  )}
                  {isVideo && (
                    <div style={{ marginBottom: 8 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>Transcript</label>
                      <textarea
                        className="lt-input"
                        rows={3}
                        value={transcriptEdits[r.id] ?? ''}
                        onChange={(e) => setTranscriptEdits((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        placeholder="Enter or paste transcript..."
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
                    <div style={{ color: '#666' }}>{JSON.stringify(r.answer).slice(0, 160)}{JSON.stringify(r.answer).length > 160 ? '...' : ''}</div>
                  )}
                  {r.final_score != null && <div style={{ marginTop: 4, color: '#16a34a' }}>Score: {r.final_score}</div>}
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
