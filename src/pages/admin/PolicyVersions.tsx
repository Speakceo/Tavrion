import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { applyOrgScope, requireOrgId } from '../../utils/orgScope';
import { applyOrgUserScope } from '../../utils/orgUsers';
import {
  Plus, CheckCircle, ChevronDown, ChevronUp, X, FileText, Users, Upload, Eye,
} from 'lucide-react';

interface OrgPolicy {
  id: string;
  title: string;
  description: string | null;
  category: string;
  is_active: boolean;
  current_version_number: number;
  created_at: string;
}

interface PolicyVersion {
  id: string;
  policy_id: string;
  version_number: number;
  version_notes: string | null;
  changelog: string | null;
  file_path: string;
  file_name: string;
  file_size: number;
  requires_acknowledgment: boolean;
  effective_date: string;
  created_at: string;
  acknowledgment_count?: number;
}

interface PolicyAck {
  id: string;
  acknowledged_at: string;
  user?: { full_name: string; unique_id: string; department: string | null };
}

const T = {
  text: '#171717', textBody: '#4d4d4d', textMuted: '#666', textFaint: '#999',
  border: 'rgba(0,0,0,0.08)', bg: '#ffffff', bgSubtle: '#fafafa', bgSection: '#f5f5f5',
  blue: '#0a72ef', green: '#16a34a', red: '#dc2626', amber: '#d97706',
  shadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
  shadowCard: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', background: T.bgSubtle,
  boxShadow: T.shadow, border: 'none', borderRadius: 8,
  fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: T.textMuted,
  letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4,
};

const CATEGORIES = ['general', 'hr', 'compliance', 'safety', 'it', 'finance'];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function PolicyVersions() {
  const { profile } = useAuth();
  const [policies, setPolicies] = useState<OrgPolicy[]>([]);
  const [versionsByPolicy, setVersionsByPolicy] = useState<Record<string, PolicyVersion[]>>({});
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showNewVersionFor, setShowNewVersionFor] = useState<OrgPolicy | null>(null);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [acks, setAcks] = useState<Record<string, PolicyAck[]>>({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [saving, setSaving] = useState(false);
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category: 'general',
    version_notes: 'Initial policy upload',
    changelog: '',
    file: null as File | null,
  });
  const [versionForm, setVersionForm] = useState({
    version_notes: '',
    changelog: '',
    requires_acknowledgment: true,
    file: null as File | null,
  });

  useEffect(() => {
    if (profile) void loadAll();
  }, [profile]);

  async function loadAll() {
    if (!profile) return;
    setLoading(true);

    const usersQuery = applyOrgUserScope(
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('role', 'employee'),
      profile,
    );

    const [policiesRes, versionsRes, usersRes] = await Promise.all([
      applyOrgScope(
        supabase.from('org_policies').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        profile,
      ),
      applyOrgScope(
        supabase.from('org_policy_versions').select('*').order('version_number', { ascending: false }),
        profile,
      ),
      usersQuery,
    ]);

    const policyRows = (policiesRes.data || []) as OrgPolicy[];
    const versionRows = (versionsRes.data || []) as PolicyVersion[];
    const orgUserIds = await loadOrgEmployeeIds();

    const withCounts = await Promise.all(versionRows.map(async (v) => {
      let ackQuery = supabase
        .from('org_policy_acknowledgments')
        .select('id', { count: 'exact', head: true })
        .eq('policy_version_id', v.id);
      if (orgUserIds.length > 0) ackQuery = ackQuery.in('user_id', orgUserIds);
      else ackQuery = ackQuery.eq('user_id', '00000000-0000-0000-0000-000000000000');
      const { count } = await ackQuery;
      return { ...v, acknowledgment_count: count || 0 };
    }));

    const grouped: Record<string, PolicyVersion[]> = {};
    for (const version of withCounts) {
      if (!grouped[version.policy_id]) grouped[version.policy_id] = [];
      grouped[version.policy_id].push(version);
    }

    setPolicies(policyRows);
    setVersionsByPolicy(grouped);
    setTotalUsers(usersRes.count || 0);
    setLoading(false);
  }

  async function loadOrgEmployeeIds() {
    const { data } = await applyOrgUserScope(
      supabase.from('user_profiles').select('id').eq('is_active', true).eq('role', 'employee'),
      profile,
    );
    return (data || []).map((u) => u.id);
  }

  async function loadAcks(versionId: string) {
    const orgUserIds = await loadOrgEmployeeIds();
    let query = supabase
      .from('org_policy_acknowledgments')
      .select('id, acknowledged_at, user:user_profiles(full_name, unique_id, department)')
      .eq('policy_version_id', versionId)
      .order('acknowledged_at', { ascending: false });
    if (orgUserIds.length > 0) query = query.in('user_id', orgUserIds);
    else query = query.eq('user_id', '00000000-0000-0000-0000-000000000000');
    const { data } = await query;
    setAcks((prev) => ({ ...prev, [versionId]: (data || []) as unknown as PolicyAck[] }));
  }

  async function uploadPolicyFile(file: File, orgId: string, policyId: string, versionNumber: number) {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'pdf';
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `policies/${orgId}/${policyId}/v${versionNumber}_${Date.now()}_${safeName}`;
    const { error } = await supabase.storage.from('course-files').upload(path, file, {
      contentType: file.type || 'application/pdf',
      upsert: false,
    });
    if (error) throw error;
    return {
      file_path: path,
      file_name: file.name,
      file_size: file.size,
      file_type: ext,
    };
  }

  async function handleCreatePolicy() {
    if (!profile || !createForm.title.trim() || !createForm.file) return;
    setSaving(true);
    try {
      const orgId = requireOrgId(profile);
      const { data: policy, error: policyError } = await supabase
        .from('org_policies')
        .insert({
          organization_id: orgId,
          title: createForm.title.trim(),
          description: createForm.description.trim() || null,
          category: createForm.category,
          current_version_number: 1,
          created_by: profile.id,
        })
        .select('*')
        .single();
      if (policyError) throw policyError;

      const uploaded = await uploadPolicyFile(createForm.file, orgId, policy.id, 1);
      const { error: versionError } = await supabase.from('org_policy_versions').insert({
        policy_id: policy.id,
        organization_id: orgId,
        version_number: 1,
        version_notes: createForm.version_notes.trim() || 'Initial policy upload',
        changelog: createForm.changelog.trim() || null,
        ...uploaded,
        requires_acknowledgment: true,
        effective_date: new Date().toISOString(),
        created_by: profile.id,
      });
      if (versionError) throw versionError;

      setShowCreate(false);
      setCreateForm({
        title: '',
        description: '',
        category: 'general',
        version_notes: 'Initial policy upload',
        changelog: '',
        file: null,
      });
      await loadAll();
    } catch (error: any) {
      alert(error.message || 'Failed to upload policy');
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishVersion() {
    if (!profile || !showNewVersionFor || !versionForm.version_notes.trim() || !versionForm.file) return;
    setSaving(true);
    try {
      const orgId = requireOrgId(profile);
      const nextVersion = (showNewVersionFor.current_version_number || 0) + 1;
      const uploaded = await uploadPolicyFile(versionForm.file, orgId, showNewVersionFor.id, nextVersion);

      const { error: versionError } = await supabase.from('org_policy_versions').insert({
        policy_id: showNewVersionFor.id,
        organization_id: orgId,
        version_number: nextVersion,
        version_notes: versionForm.version_notes.trim(),
        changelog: versionForm.changelog.trim() || null,
        ...uploaded,
        requires_acknowledgment: versionForm.requires_acknowledgment,
        effective_date: new Date().toISOString(),
        created_by: profile.id,
      });
      if (versionError) throw versionError;

      const { error: policyError } = await supabase
        .from('org_policies')
        .update({
          current_version_number: nextVersion,
          updated_at: new Date().toISOString(),
        })
        .eq('id', showNewVersionFor.id)
        .eq('organization_id', orgId);
      if (policyError) throw policyError;

      setShowNewVersionFor(null);
      setVersionForm({
        version_notes: '',
        changelog: '',
        requires_acknowledgment: true,
        file: null,
      });
      await loadAll();
    } catch (error: any) {
      alert(error.message || 'Failed to publish version');
    } finally {
      setSaving(false);
    }
  }

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from('course-files').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      alert(error?.message || 'Could not open file');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  function toggleExpand(versionId: string) {
    if (expandedVersion === versionId) {
      setExpandedVersion(null);
      return;
    }
    setExpandedVersion(versionId);
    if (!acks[versionId]) void loadAcks(versionId);
  }

  const empty = useMemo(() => !loading && policies.length === 0, [loading, policies.length]);

  return (
    <Layout>
      <div style={{ maxWidth: 920, margin: '0 auto', paddingBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28, gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: T.text }}>Policies</h1>
            <p style={{ fontSize: 14, color: T.textBody, marginTop: 4 }}>
              Upload company policies, publish new versions, and track acknowledgments from everyone in your organisation.
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: T.text, color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            <Plus size={14} /> Upload Policy
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.textMuted }}>Loading…</div>
        ) : empty ? (
          <div style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <FileText size={40} style={{ color: T.border, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>No policies yet</p>
            <p style={{ fontSize: 13, color: T.textMuted }}>Upload your first policy document. Employees will be asked to acknowledge it.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {policies.map((policy) => {
              const versions = versionsByPolicy[policy.id] || [];
              const latest = versions[0];
              const totalAcks = latest?.acknowledgment_count || 0;
              const pct = totalUsers > 0 ? Math.round((totalAcks / totalUsers) * 100) : 0;
              return (
                <div key={policy.id} style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FileText size={16} color={T.blue} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{policy.title}</div>
                      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        {policy.category.toUpperCase()} · Latest v{policy.current_version_number}
                        {latest?.requires_acknowledgment && (
                          <span style={{ marginLeft: 8, background: '#fef3c7', color: T.amber, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100 }}>ACK REQUIRED</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginRight: 8 }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: pct >= 80 ? T.green : pct >= 50 ? T.amber : T.red }}>{pct}%</div>
                      <div style={{ fontSize: 11, color: T.textMuted }}>{totalAcks}/{totalUsers} acknowledged</div>
                    </div>
                    <button
                      onClick={() => setShowNewVersionFor(policy)}
                      style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: T.bgSection, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: T.text }}
                    >
                      New version
                    </button>
                  </div>
                  <div style={{ height: 3, background: T.bgSection }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? T.green : pct >= 50 ? T.amber : T.red, transition: 'width 0.4s' }} />
                  </div>
                  {versions.map((v) => (
                    <div key={v.id}>
                      <div
                        onClick={() => toggleExpand(v.id)}
                        style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: expandedVersion === v.id ? T.bgSubtle : 'transparent' }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.bgSection, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.textMuted, flexShrink: 0 }}>
                          v{v.version_number}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{v.version_notes}</div>
                          <div style={{ fontSize: 11, color: T.textMuted }}>
                            {v.file_name} · {formatSize(v.file_size)} · Effective {formatDate(v.effective_date)}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); void openFile(v.file_path); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 10px', borderRadius: 7, border: 'none', background: T.bgSection, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                        >
                          <Eye size={12} /> View
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.textMuted }}>
                          <Users size={11} />
                          {v.acknowledgment_count || 0}
                        </div>
                        {expandedVersion === v.id ? <ChevronUp size={13} color={T.textMuted} /> : <ChevronDown size={13} color={T.textMuted} />}
                      </div>
                      {expandedVersion === v.id && (
                        <div style={{ background: T.bgSubtle, borderTop: `1px solid ${T.border}`, padding: '14px 20px' }}>
                          {v.changelog && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ ...labelStyle, marginBottom: 4 }}>Changelog</p>
                              <p style={{ fontSize: 13, color: T.textBody, lineHeight: 1.6 }}>{v.changelog}</p>
                            </div>
                          )}
                          <p style={{ ...labelStyle, marginBottom: 8 }}>Acknowledgments ({acks[v.id]?.length ?? '…'})</p>
                          {!acks[v.id] ? (
                            <p style={{ fontSize: 13, color: T.textMuted }}>Loading…</p>
                          ) : acks[v.id].length === 0 ? (
                            <p style={{ fontSize: 13, color: T.textMuted }}>No acknowledgments yet.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {acks[v.id].map((a) => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.bg, borderRadius: 7, padding: '8px 12px', boxShadow: T.shadow }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CheckCircle size={13} color={T.green} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{a.user?.full_name}</span>
                                    {a.user?.department && <span style={{ fontSize: 11, color: T.textMuted }}>{a.user.department}</span>}
                                  </div>
                                  <span style={{ fontSize: 11, color: T.textFaint }}>{formatDate(a.acknowledged_at)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}

        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: T.bg, borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: 'rgba(0,0,0,0.2) 0px 20px 60px' }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Upload Policy</h2>
                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted }}><X size={16} /></button>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input style={inputStyle} value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Code of Conduct" />
                </div>
                <div>
                  <label style={labelStyle}>Category</label>
                  <select style={inputStyle} value={createForm.category} onChange={(e) => setCreateForm((f) => ({ ...f, category: e.target.value }))}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Policy document (PDF / DOC) *</label>
                  <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <Upload size={14} />
                    <span>{createForm.file ? createForm.file.name : 'Choose file…'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      style={{ display: 'none' }}
                      onChange={(e) => setCreateForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                    />
                  </label>
                </div>
                <div style={{ background: '#eff6ff', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
                  Version 1 will be published immediately. All active employees in your organisation will be asked to acknowledge it.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: 10, background: T.bgSection, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button
                    onClick={() => void handleCreatePolicy()}
                    disabled={saving || !createForm.title.trim() || !createForm.file}
                    style={{ flex: 2, padding: 10, background: saving || !createForm.title.trim() || !createForm.file ? T.bgSection : T.text, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: saving || !createForm.title.trim() || !createForm.file ? T.textMuted : 'white' }}
                  >
                    {saving ? 'Uploading…' : 'Upload & publish v1'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showNewVersionFor && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: T.bg, borderRadius: 14, width: '100%', maxWidth: 520, boxShadow: 'rgba(0,0,0,0.2) 0px 20px 60px' }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Publish v{(showNewVersionFor.current_version_number || 0) + 1}</h2>
                <button onClick={() => setShowNewVersionFor(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted }}><X size={16} /></button>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <p style={{ fontSize: 13, color: T.textMuted }}>Updating <strong style={{ color: T.text }}>{showNewVersionFor.title}</strong></p>
                <div>
                  <label style={labelStyle}>Version summary *</label>
                  <input style={inputStyle} value={versionForm.version_notes} onChange={(e) => setVersionForm((f) => ({ ...f, version_notes: e.target.value }))} placeholder="e.g. Updated leave policy for 2026" />
                </div>
                <div>
                  <label style={labelStyle}>Changelog</label>
                  <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={versionForm.changelog} onChange={(e) => setVersionForm((f) => ({ ...f, changelog: e.target.value }))} placeholder="What changed in this version?" />
                </div>
                <div>
                  <label style={labelStyle}>Updated document *</label>
                  <label style={{ ...inputStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <Upload size={14} />
                    <span>{versionForm.file ? versionForm.file.name : 'Choose file…'}</span>
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                      style={{ display: 'none' }}
                      onChange={(e) => setVersionForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                    />
                  </label>
                </div>
                <div style={{ background: '#fef3c7', borderRadius: 8, padding: '12px 14px' }}>
                  <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#92400e', cursor: 'pointer', lineHeight: 1.5 }}>
                    <input
                      type="checkbox"
                      checked={versionForm.requires_acknowledgment}
                      onChange={(e) => setVersionForm((f) => ({ ...f, requires_acknowledgment: e.target.checked }))}
                      style={{ marginTop: 2 }}
                    />
                    <span><strong>Require acknowledgment</strong> — Everyone in the organisation must re-acknowledge this new version.</span>
                  </label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => setShowNewVersionFor(null)} style={{ flex: 1, padding: 10, background: T.bgSection, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
                  <button
                    onClick={() => void handlePublishVersion()}
                    disabled={saving || !versionForm.version_notes.trim() || !versionForm.file}
                    style={{ flex: 2, padding: 10, background: saving || !versionForm.version_notes.trim() || !versionForm.file ? T.bgSection : T.text, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: saving || !versionForm.version_notes.trim() || !versionForm.file ? T.textMuted : 'white' }}
                  >
                    {saving ? 'Publishing…' : 'Publish version'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
