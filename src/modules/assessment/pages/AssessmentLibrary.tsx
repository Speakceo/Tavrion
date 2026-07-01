import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import type { OrgViewer } from '../../../utils/orgScope';
import {
  fetchAssessments, createAssessment, duplicateAssessment, updateAssessmentStatus,
} from '../services/assessmentService';
import type { Assessment, AssessmentStatus } from '../types';
import { Plus, Copy, Archive, Globe, Search, FolderOpen, Briefcase } from 'lucide-react';

const STATUS_COLORS: Record<AssessmentStatus, string> = {
  draft: '#808080',
  published: '#16a34a',
  archived: '#c0392b',
};

export function AssessmentLibrary() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [items, setItems] = useState<Assessment[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | ''>('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const data = await fetchAssessments(viewer, {
        search: search || undefined,
        status: statusFilter || undefined,
      });
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.id, search, statusFilter]);

  const handleCreate = async () => {
    if (!viewer?.id) return;
    setBusy('create');
    try {
      const a = await createAssessment(viewer as OrgViewer & { id: string }, { title: 'New Assessment' });
      await load();
      window.location.href = `/test/library/${a.id}/builder`;
    } finally {
      setBusy(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!viewer?.id) return;
    setBusy(id);
    try {
      await duplicateAssessment(viewer as OrgViewer & { id: string }, id);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const handleStatus = async (id: string, status: AssessmentStatus) => {
    if (!viewer?.id) return;
    setBusy(id);
    try {
      await updateAssessmentStatus(viewer as OrgViewer & { id: string }, id, status);
      await load();
    } finally {
      setBusy(null);
    }
  };

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Assessment Library</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Create, version, publish, and organize assessments.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            onClick={handleCreate}
            disabled={busy === 'create'}
            className="lt-btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
          >
            <Plus size={14} /> New assessment
          </button>
          <Link to="/test/templates" className="lt-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>
            <Briefcase size={14} /> Role templates
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#aaa' }} />
          <input
            className="lt-input"
            placeholder="Search assessments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: 32, width: '100%' }}
          />
        </div>
        <select
          className="lt-input"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AssessmentStatus | '')}
          style={{ width: 140 }}
        >
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#808080' }}>Loading...</p>
      ) : items.length === 0 ? (
        <div className="lt-card" style={{ padding: 40, textAlign: 'center' }}>
          <FolderOpen size={32} color="#ccc" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#666' }}>No assessments yet. Create your first one.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((a) => (
            <div key={a.id} className="lt-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <Link to={`/test/library/${a.id}/builder`} style={{ fontSize: 14, fontWeight: 600, color: '#171717', textDecoration: 'none' }}>
                  {a.title}
                </Link>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  v{a.version} · {a.tags?.length ? a.tags.join(', ') : 'No tags'} · Updated {new Date(a.updated_at).toLocaleDateString()}
                </div>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: STATUS_COLORS[a.status], textTransform: 'capitalize' }}>{a.status}</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {a.status === 'draft' && (
                  <button onClick={() => handleStatus(a.id, 'published')} disabled={busy === a.id} className="lt-btn-secondary" style={{ padding: '5px 10px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Globe size={12} /> Publish
                  </button>
                )}
                {a.status === 'published' && (
                  <button onClick={() => handleStatus(a.id, 'draft')} disabled={busy === a.id} className="lt-btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }}>Unpublish</button>
                )}
                {a.status !== 'archived' && (
                  <button onClick={() => handleStatus(a.id, 'archived')} disabled={busy === a.id} className="lt-btn-secondary" style={{ padding: '5px 10px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}>
                    <Archive size={12} />
                  </button>
                )}
                <button onClick={() => handleDuplicate(a.id)} disabled={busy === a.id} className="lt-btn-secondary" style={{ padding: '5px 10px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}>
                  <Copy size={12} /> Duplicate
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </TestLayout>
  );
}
