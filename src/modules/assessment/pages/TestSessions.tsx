import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchSessions, updateSelectionStatus, deleteSession, fetchSessionDetail } from '../services/sessionService';
import type { SelectionStatus } from '../types';
import { Search, Eye, Trash2, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

const SELECTION_OPTIONS: SelectionStatus[] = ['pending', 'shortlisted', 'selected', 'rejected', 'on_hold'];

const SELECTION_COLORS: Record<SelectionStatus, string> = {
  pending: '#808080',
  shortlisted: '#2563eb',
  selected: '#16a34a',
  rejected: '#c0392b',
  on_hold: '#d97706',
};

export function TestSessions() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchSessions>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectionFilter, setSelectionFilter] = useState<SelectionStatus | ''>('');
  const [detail, setDetail] = useState<Awaited<ReturnType<typeof fetchSessionDetail>> | null>(null);

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

  const stats = {
    total: sessions.length,
    completed: sessions.filter((s) => s.status === 'graded').length,
    shortlisted: sessions.filter((s) => s.selection_status === 'shortlisted' || s.selection_status === 'selected').length,
    avgScore: (() => {
      const graded = sessions.filter((s) => s.final_score != null);
      return graded.length ? Math.round(graded.reduce((a, s) => a + (s.final_score || 0), 0) / graded.length) : 0;
    })(),
  };

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

      {loading ? <p style={{ color: '#808080' }}>Loading...</p> : (
        <div className="lt-card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
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
                      <button onClick={async () => setDetail(await fetchSessionDetail(s.id, viewer))} className="lt-btn-secondary" style={{ padding: '4px 8px' }}>
                        <Eye size={12} />
                      </button>
                      <button onClick={() => deleteSession(s.id, viewer).then(load)} className="lt-btn-secondary" style={{ padding: '4px 8px', color: '#c0392b' }}>
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

      {detail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }} onClick={() => setDetail(null)}>
          <div className="lt-card" style={{ maxWidth: 640, width: '100%', maxHeight: '80vh', overflow: 'auto', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Session details</h2>
            <p style={{ fontSize: 13, marginBottom: 8 }}><strong>{detail.candidate_name}</strong> · {detail.candidate_email}</p>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>Score: {detail.final_score}% · {detail.passed ? 'Passed' : 'Failed'}</p>
            {(detail as { responses?: { question?: { prompt?: string }; answer?: Record<string, unknown>; final_score?: number }[] }).responses?.map((r, i) => (
              <div key={i} style={{ padding: '10px 0', borderTop: '1px solid #f5f5f5', fontSize: 12 }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>{r.question?.prompt?.slice(0, 100)}</div>
                <div style={{ color: '#666' }}>{JSON.stringify(r.answer).slice(0, 120)}...</div>
              </div>
            ))}
            <button onClick={() => setDetail(null)} className="lt-btn-secondary" style={{ marginTop: 16, padding: '8px 16px' }}>Close</button>
          </div>
        </div>
      )}
    </TestLayout>
  );
}
