import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchReusableLinks, createReusableLink, buildPublicUrl } from '../services/linkService';
import { fetchAssessments } from '../services/assessmentService';
import type { Assessment, AssessmentReusableLink } from '../types';
import { Plus, Copy, Link2, ExternalLink } from 'lucide-react';

export function TestLinks() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [links, setLinks] = useState<(AssessmentReusableLink & { public_url?: string })[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ assessment_id: '', title: '', max_uses: '' });
  const [copied, setCopied] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const [l, a] = await Promise.all([
        fetchReusableLinks(viewer),
        fetchAssessments(viewer, { status: 'published' }),
      ]);
      setLinks(l.map((link) => ({ ...link, public_url: buildPublicUrl(link.link_code) })));
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

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Public Links</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Share assessment links with external candidates — no login required.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="lt-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
          <Plus size={14} /> Create link
        </button>
      </div>

      {showForm && (
        <div className="lt-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>New public link</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
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

      {copied && (
        <div className="lt-card" style={{ padding: 12, marginBottom: 16, fontSize: 12, color: '#16a34a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Copy size={14} /> Link copied to clipboard
        </div>
      )}

      {loading ? <p style={{ color: '#808080' }}>Loading...</p> : links.length === 0 ? (
        <div className="lt-card" style={{ padding: 40, textAlign: 'center' }}>
          <Link2 size={32} color="#ccc" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#666' }}>No public links yet. Create one to invite external candidates.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {links.map((l) => (
            <div key={l.id} className="lt-card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{l.title}</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>{l.assessment?.title} · {l.uses_count} uses{l.max_uses ? ` / ${l.max_uses}` : ''}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 6, fontFamily: 'monospace' }}>{l.public_url}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => copyUrl(l.public_url!)} className="lt-btn-secondary" style={{ padding: '6px 12px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Copy size={12} /> Copy
                  </button>
                  <a href={l.public_url} target="_blank" rel="noreferrer" className="lt-btn-secondary" style={{ padding: '6px 12px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', textDecoration: 'none' }}>
                    <ExternalLink size={12} /> Preview
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </TestLayout>
  );
}
