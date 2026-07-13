import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchReusableLinks, createReusableLink, buildPublicUrl, deleteReusableLink, deactivateReusableLink } from '../services/linkService';
import { fetchAssessments, fetchAssessmentQuestionCounts } from '../services/assessmentService';
import type { Assessment, AssessmentReusableLink } from '../types';
import type { OrgViewer } from '../../../utils/orgScope';
import { Plus, Copy, Link2, ExternalLink, Trash2, Ban, HelpCircle, Clock, Users, Check } from 'lucide-react';
import { confirmDelete } from '../utils/confirm';

type LinkCard = AssessmentReusableLink & {
  public_url?: string;
  question_count?: number;
};

const GRID_CSS = `
.test-links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}
@media (max-width: 640px) {
  .test-links-grid { grid-template-columns: 1fr; }
}
.test-link-card {
  display: flex;
  flex-direction: column;
  min-height: 220px;
  transition: box-shadow 0.15s, transform 0.15s;
}
.test-link-card:hover {
  box-shadow: rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 8px 24px -8px;
}
`;

export function TestLinks() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [links, setLinks] = useState<LinkCard[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ assessment_id: '', title: '', max_uses: '' });
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const [l, a] = await Promise.all([
        fetchReusableLinks(viewer),
        fetchAssessments(viewer, { status: 'published' }),
      ]);
      const counts = await fetchAssessmentQuestionCounts(l.map((x) => x.assessment_id));
      setLinks(
        l.map((link) => ({
          ...link,
          public_url: buildPublicUrl(link.link_code),
          question_count: counts[link.assessment_id] || 0,
        })),
      );
      setAssessments(a);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.id]);

  const handleCreate = async () => {
    if (!viewer?.id || !form.assessment_id) return;
    const result = await createReusableLink(
      { ...viewer, id: viewer.id },
      {
        assessment_id: form.assessment_id,
        title: form.title || 'Open assessment',
        max_uses: form.max_uses ? Number(form.max_uses) : undefined,
      },
    );
    setShowForm(false);
    setForm({ assessment_id: '', title: '', max_uses: '' });
    setCopied(result.public_url);
    await load();
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleDeactivate = async (link: AssessmentReusableLink) => {
    if (!viewer?.id || !confirm('Deactivate this link? Candidates will no longer be able to use it.')) return;
    setBusy(link.id);
    try {
      await deactivateReusableLink(viewer as OrgViewer & { id: string }, link.id);
      setMessage('Link deactivated.');
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to deactivate');
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async (link: AssessmentReusableLink) => {
    if (!viewer?.id || !confirmDelete(link.title)) return;
    setBusy(link.id);
    try {
      await deleteReusableLink(viewer as OrgViewer & { id: string }, link.id);
      setMessage('Link deleted.');
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <TestLayout>
      <style>{GRID_CSS}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Public Links</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Share assessment links with candidates — no login required.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="lt-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
          <Plus size={14} /> Create link
        </button>
      </div>

      {showForm && (
        <div className="lt-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>New public link</h3>
          <div className="test-form-grid">
            <label style={{ fontSize: 12 }}>
              Published assessment
              <select className="lt-input" value={form.assessment_id} onChange={(e) => setForm({ ...form, assessment_id: e.target.value })} style={{ marginTop: 4 }}>
                <option value="">Select...</option>
                {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12 }}>
              Link title
              <input className="lt-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Sales hiring Q2" style={{ marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Max uses (optional)
              <input type="number" className="lt-input" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} style={{ marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={handleCreate} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Create & copy link</button>
            <button onClick={() => setShowForm(false)} className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {message && (
        <div className="lt-card" style={{ padding: 12, marginBottom: 16, fontSize: 12, color: message.toLowerCase().includes('fail') ? '#c0392b' : '#16a34a' }}>
          {message}
        </div>
      )}

      {copied && (
        <div className="lt-card" style={{ padding: 12, marginBottom: 16, fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Check size={14} /> Link copied to clipboard
        </div>
      )}

      {loading ? (
        <p style={{ color: '#808080' }}>Loading...</p>
      ) : links.length === 0 ? (
        <div className="lt-card" style={{ padding: 48, textAlign: 'center' }}>
          <Link2 size={36} color="#ccc" style={{ margin: '0 auto 14px' }} />
          <p style={{ fontSize: 15, fontWeight: 600, color: '#171717', marginBottom: 6 }}>No public links yet</p>
          <p style={{ color: '#666', fontSize: 13, marginBottom: 16 }}>Create a link to invite external candidates to take an assessment.</p>
          <button onClick={() => setShowForm(true)} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
            Create your first link
          </button>
        </div>
      ) : (
        <div className="test-links-grid">
          {links.map((l) => {
            const qCount = l.question_count ?? 0;
            const minutes = l.assessment?.time_limit_minutes;
            return (
              <div key={l.id} className="lt-card test-link-card" style={{ padding: 0, overflow: 'hidden', opacity: l.is_active ? 1 : 0.72 }}>
                <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid #f0f0f0', flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.35, margin: 0 }}>
                      {l.title}
                    </h3>
                    {!l.is_active && (
                      <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 999, background: '#fef2f2', color: '#c0392b', fontWeight: 600, flexShrink: 0 }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <p style={{ fontSize: 12, color: '#666', margin: '0 0 14px', lineHeight: 1.4 }}>
                    {l.assessment?.title || 'Assessment'}
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div style={{ background: '#fafafa', borderRadius: 10, padding: '10px 12px', border: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                        <HelpCircle size={11} /> Questions
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717' }}>
                        {qCount}
                      </div>
                    </div>
                    <div style={{ background: '#fafafa', borderRadius: 10, padding: '10px 12px', border: '1px solid #f0f0f0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#999', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 4 }}>
                        <Clock size={11} /> Duration
                      </div>
                      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717' }}>
                        {minutes ? `${minutes}m` : '—'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 12, color: '#808080' }}>
                    <Users size={12} />
                    {l.uses_count} use{l.uses_count === 1 ? '' : 's'}
                    {l.max_uses ? ` · max ${l.max_uses}` : ''}
                  </div>
                </div>

                <div style={{ padding: '10px 12px', display: 'flex', flexWrap: 'wrap', gap: 6, background: '#fcfcfc' }}>
                  <button
                    type="button"
                    onClick={() => copyUrl(l.public_url!)}
                    className="lt-btn-primary"
                    style={{ padding: '7px 12px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', flex: 1, justifyContent: 'center' }}
                  >
                    {copied === l.public_url ? <Check size={12} /> : <Copy size={12} />}
                    {copied === l.public_url ? 'Copied' : 'Copy link'}
                  </button>
                  <a
                    href={l.public_url}
                    target="_blank"
                    rel="noreferrer"
                    className="lt-btn-secondary"
                    style={{ padding: '7px 12px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', textDecoration: 'none' }}
                  >
                    <ExternalLink size={12} /> Open
                  </a>
                  {l.is_active && (
                    <button type="button" onClick={() => handleDeactivate(l)} disabled={busy === l.id} className="lt-btn-secondary" style={{ padding: '7px 10px', fontSize: 11 }}>
                      <Ban size={12} />
                    </button>
                  )}
                  <button type="button" onClick={() => handleDelete(l)} disabled={busy === l.id} className="lt-btn-secondary test-delete-btn" style={{ padding: '7px 10px', fontSize: 11 }}>
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </TestLayout>
  );
}
