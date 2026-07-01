import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import type { OrgViewer } from '../../../utils/orgScope';
import {
  fetchAssessments, createAssessment, duplicateAssessment, updateAssessmentStatus, deleteAssessment,
} from '../services/assessmentService';
import { fetchFolders, createFolder, fetchSkills, type AssessmentFolder } from '../services/platformService';
import { supabase } from '../../../lib/supabase';
import type { Assessment, AssessmentStatus } from '../types';
import { Plus, Copy, Archive, Globe, Search, FolderOpen, Briefcase, Tag, FolderInput, Trash2 } from 'lucide-react';
import { confirmDelete } from '../utils/confirm';

const STATUS_COLORS: Record<AssessmentStatus, string> = {
  draft: '#808080',
  published: '#16a34a',
  archived: '#c0392b',
};

export function AssessmentLibrary() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [items, setItems] = useState<Assessment[]>([]);
  const [folders, setFolders] = useState<AssessmentFolder[]>([]);
  const [skills, setSkills] = useState<{ id: string; name: string }[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssessmentStatus | ''>('');
  const [folderFilter, setFolderFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkTags, setBulkTags] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const [data, folderData, skillData] = await Promise.all([
        fetchAssessments(viewer, { search: search || undefined, status: statusFilter || undefined }),
        fetchFolders(viewer),
        fetchSkills(viewer),
      ]);
      setItems(data);
      setFolders(folderData);
      setSkills(skillData.map((s) => ({ id: s.id, name: s.name })));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.id, search, statusFilter]);

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach((a) => a.tags?.forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [items]);

  const filtered = useMemo(() => {
    return items.filter((a) => {
      if (folderFilter && a.folder_id !== folderFilter) return false;
      if (tagFilter && !a.tags?.includes(tagFilter)) return false;
      if (skillFilter) {
        const skillName = skills.find((s) => s.id === skillFilter)?.name?.toLowerCase();
        if (skillName && !a.tags?.some((t) => t.toLowerCase().includes(skillName))) return false;
      }
      return true;
    });
  }, [items, folderFilter, tagFilter, skillFilter, skills]);

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

  const handleCreateFolder = async () => {
    if (!viewer?.id || !newFolderName.trim()) return;
    setBusy('folder');
    try {
      await createFolder(viewer as OrgViewer & { id: string }, { name: newFolderName.trim() });
      setNewFolderName('');
      await load();
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

  const handleDelete = async (a: Assessment) => {
    if (!viewer?.id) return;
    if (!confirmDelete(a.title)) return;
    setBusy(a.id);
    try {
      await deleteAssessment(viewer as OrgViewer & { id: string }, a.id);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(null);
    }
  };

  const moveToFolder = async (assessmentId: string, folderId: string | null) => {
    setBusy(assessmentId);
    try {
      await supabase.from('assessments').update({ folder_id: folderId, updated_at: new Date().toISOString() }).eq('id', assessmentId);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const applyBulkTags = async () => {
    if (!bulkTags.trim() || selected.size === 0) return;
    const newTags = bulkTags.split(',').map((t) => t.trim()).filter(Boolean);
    setBusy('bulk');
    try {
      for (const id of selected) {
        const item = items.find((a) => a.id === id);
        if (!item) continue;
        const merged = Array.from(new Set([...(item.tags || []), ...newTags]));
        await supabase.from('assessments').update({ tags: merged, updated_at: new Date().toISOString() }).eq('id', id);
      }
      setBulkTags('');
      setSelected(new Set());
      await load();
    } finally {
      setBusy(null);
    }
  };

  const folderName = (folderId?: string | null) =>
    folders.find((f) => f.id === folderId)?.name || null;

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Assessment Library</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Create, version, publish, and organize assessments.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={handleCreate} disabled={busy === 'create'} className="lt-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
            <Plus size={14} /> New assessment
          </button>
          <Link to="/test/templates" className="lt-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>
            <Briefcase size={14} /> Role templates
          </Link>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#aaa' }} />
          <input className="lt-input" placeholder="Search assessments..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
        </div>
        <select className="lt-input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as AssessmentStatus | '')} style={{ width: 130 }}>
          <option value="">All statuses</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select className="lt-input" value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} style={{ width: 150 }}>
          <option value="">All folders</option>
          {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="lt-input" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={{ width: 130 }}>
          <option value="">All tags</option>
          {allTags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="lt-input" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} style={{ width: 140 }}>
          <option value="">All skills</option>
          {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <FolderOpen size={14} color="#666" />
        <input className="lt-input" placeholder="New folder name..." value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} style={{ width: 180 }} />
        <button onClick={handleCreateFolder} disabled={busy === 'folder' || !newFolderName.trim()} className="lt-btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Create folder</button>
        {selected.size > 0 && (
          <>
            <Tag size={14} color="#666" />
            <input className="lt-input" placeholder="Bulk tags (comma-separated)" value={bulkTags} onChange={(e) => setBulkTags(e.target.value)} style={{ width: 220 }} />
            <button onClick={applyBulkTags} disabled={busy === 'bulk'} className="lt-btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>
              Apply to {selected.size} selected
            </button>
          </>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#808080' }}>Loading...</p>
      ) : filtered.length === 0 ? (
        <div className="lt-card" style={{ padding: 40, textAlign: 'center' }}>
          <FolderOpen size={32} color="#ccc" style={{ margin: '0 auto 12px' }} />
          <p style={{ fontSize: 14, color: '#666' }}>No assessments match your filters.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((a) => (
            <div key={a.id} className="lt-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <input type="checkbox" checked={selected.has(a.id)} onChange={() => toggleSelect(a.id)} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 200 }}>
                <Link to={`/test/library/${a.id}/builder`} style={{ fontSize: 14, fontWeight: 600, color: '#171717', textDecoration: 'none' }}>
                  {a.title}
                </Link>
                <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                  v{a.version}
                  {folderName(a.folder_id) && <> · <FolderInput size={10} style={{ display: 'inline', verticalAlign: 'middle' }} /> {folderName(a.folder_id)}</>}
                  {' · '}{a.tags?.length ? a.tags.join(', ') : 'No tags'} · Updated {new Date(a.updated_at).toLocaleDateString()}
                </div>
              </div>
              <select
                className="lt-input"
                value={a.folder_id || ''}
                onChange={(e) => moveToFolder(a.id, e.target.value || null)}
                disabled={busy === a.id}
                style={{ width: 140, fontSize: 11 }}
                title="Move to folder"
              >
                <option value="">No folder</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
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
                <button
                  onClick={() => handleDelete(a)}
                  disabled={busy === a.id}
                  className="lt-btn-secondary test-delete-btn"
                  style={{ padding: '5px 10px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}
                  title="Delete permanently"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </TestLayout>
  );
}
