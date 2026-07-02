import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { applyOrgUserScope } from '../../utils/orgUsers';
import { Plus, CheckCircle, Clock, AlertTriangle, ChevronDown, ChevronUp, X, FileText, Users } from 'lucide-react';

interface PolicyVersion {
  id: string;
  course_id: string;
  version_number: number;
  version_notes: string | null;
  changelog: string | null;
  effective_date: string;
  requires_reacknowledgment: boolean;
  created_at: string;
  course?: { title: string };
  acknowledgment_count?: number;
}

interface PolicyAck {
  id: string;
  acknowledged_at: string;
  user?: { full_name: string; unique_id: string; department: string | null };
}

interface Course { id: string; title: string; is_mandatory: boolean; version: number; }

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

export function PolicyVersions() {
  const { profile } = useAuth();
  const [versions, setVersions] = useState<PolicyVersion[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);
  const [acks, setAcks] = useState<Record<string, PolicyAck[]>>({});
  const [totalUsers, setTotalUsers] = useState(0);
  const [form, setForm] = useState({
    course_id: '',
    version_notes: '',
    changelog: '',
    requires_reacknowledgment: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (profile) loadAll(); }, [profile]);

  async function loadAll() {
    setLoading(true);
    const usersQuery = applyOrgUserScope(
      supabase.from('user_profiles').select('id', { count: 'exact', head: true }).eq('is_active', true).eq('role', 'employee'),
      profile,
    );
    const [verRes, courseRes, usersRes] = await Promise.all([
      supabase.from('course_policy_versions')
        .select('*, course:courses(title)')
        .order('created_at', { ascending: false }),
      supabase.from('courses').select('id, title, is_mandatory, version').eq('status', 'published').order('title'),
      usersQuery,
    ]);
    const rawVersions = verRes.data || [];
    // Fetch acknowledgment counts
    const withCounts = await Promise.all(rawVersions.map(async (v) => {
      const { count } = await supabase.from('policy_acknowledgments').select('id', { count: 'exact', head: true }).eq('policy_version_id', v.id);
      return { ...v, acknowledgment_count: count || 0 };
    }));
    setVersions(withCounts);
    setCourses(courseRes.data || []);
    setTotalUsers(usersRes.count || 0);
    setLoading(false);
  }

  async function loadAcks(versionId: string) {
    const { data } = await supabase.from('policy_acknowledgments')
      .select('id, acknowledged_at, user:user_profiles(full_name, unique_id, department)')
      .eq('policy_version_id', versionId)
      .order('acknowledged_at', { ascending: false });
    setAcks(prev => ({ ...prev, [versionId]: (data || []) as unknown as PolicyAck[] }));
  }

  async function handleCreate() {
    if (!form.course_id || !form.version_notes) return;
    setSaving(true);
    // Find next version number for this course
    const existing = versions.filter(v => v.course_id === form.course_id);
    const nextVersion = existing.length > 0 ? Math.max(...existing.map(v => v.version_number)) + 1 : 1;

    const { error } = await supabase.from('course_policy_versions').insert({
      course_id: form.course_id,
      version_number: nextVersion,
      version_notes: form.version_notes,
      changelog: form.changelog || null,
      effective_date: new Date().toISOString(),
      requires_reacknowledgment: form.requires_reacknowledgment,
      created_by: profile?.id,
    });

    if (!error && form.requires_reacknowledgment) {
      // Reset enrollment status for all employees enrolled in this course
      await supabase.from('user_course_enrollments')
        .update({ status: 'assigned' })
        .eq('course_id', form.course_id)
        .eq('status', 'completed');
      // Update course version
      await supabase.from('courses').update({ version: nextVersion }).eq('id', form.course_id);
    }

    setSaving(false);
    if (!error) {
      setForm({ course_id: '', version_notes: '', changelog: '', requires_reacknowledgment: true });
      setShowCreate(false);
      loadAll();
    } else {
      alert('Error: ' + error.message);
    }
  }

  function toggleExpand(versionId: string) {
    if (expandedVersion === versionId) {
      setExpandedVersion(null);
    } else {
      setExpandedVersion(versionId);
      if (!acks[versionId]) loadAcks(versionId);
    }
  }

  const formatDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  // Group by course
  const byCourse: Record<string, PolicyVersion[]> = {};
  versions.forEach(v => {
    if (!byCourse[v.course_id]) byCourse[v.course_id] = [];
    byCourse[v.course_id].push(v);
  });

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 48 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: T.text }}>Policy Version Control</h1>
            <p style={{ fontSize: 14, color: T.textBody, marginTop: 4 }}>Track policy revisions and require employees to re-acknowledge updated versions</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: T.text, color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={14} /> New Version
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.textMuted }}>Loading...</div>
        ) : Object.keys(byCourse).length === 0 ? (
          <div style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <FileText size={40} style={{ color: T.border, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>No policy versions yet</p>
            <p style={{ fontSize: 13, color: T.textMuted }}>Create a version to start tracking policy changes and acknowledgments.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(byCourse).map(([courseId, courseVersions]) => {
              const courseName = courseVersions[0]?.course?.title || 'Unknown Course';
              const latestVersion = courseVersions[0];
              const totalAcks = latestVersion?.acknowledgment_count || 0;
              const pct = totalUsers > 0 ? Math.round((totalAcks / totalUsers) * 100) : 0;
              return (
                <div key={courseId} style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <FileText size={16} color={T.blue} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{courseName}</div>
                      <div style={{ fontSize: 12, color: T.textMuted, marginTop: 2 }}>
                        Latest: v{latestVersion?.version_number} · {formatDate(latestVersion?.created_at)}
                        {latestVersion?.requires_reacknowledgment && (
                          <span style={{ marginLeft: 8, background: '#fef3c7', color: T.amber, fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100 }}>RE-ACK REQUIRED</span>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color: pct >= 80 ? T.green : pct >= 50 ? T.amber : T.red }}>{pct}%</div>
                      <div style={{ fontSize: 11, color: T.textMuted }}>{totalAcks}/{totalUsers} acknowledged</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: 3, background: T.bgSection }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: pct >= 80 ? T.green : pct >= 50 ? T.amber : T.red, transition: 'width 0.4s' }} />
                  </div>
                  {/* Version list */}
                  {courseVersions.map(v => (
                    <div key={v.id}>
                      <div
                        onClick={() => toggleExpand(v.id)}
                        style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: expandedVersion === v.id ? T.bgSubtle : 'transparent', transition: 'background 0.15s' }}
                      >
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: T.bgSection, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: T.textMuted, flexShrink: 0 }}>
                          v{v.version_number}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{v.version_notes}</div>
                          <div style={{ fontSize: 11, color: T.textMuted }}>Effective {formatDate(v.effective_date)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: T.textMuted }}>
                            <Users size={11} />
                            {v.acknowledgment_count || 0} acks
                          </div>
                          {expandedVersion === v.id ? <ChevronUp size={13} color={T.textMuted} /> : <ChevronDown size={13} color={T.textMuted} />}
                        </div>
                      </div>
                      {expandedVersion === v.id && (
                        <div style={{ background: T.bgSubtle, borderTop: `1px solid ${T.border}`, padding: '14px 20px' }}>
                          {v.changelog && (
                            <div style={{ marginBottom: 12 }}>
                              <p style={{ ...labelStyle, marginBottom: 4 }}>Changelog</p>
                              <p style={{ fontSize: 13, color: T.textBody, lineHeight: 1.6 }}>{v.changelog}</p>
                            </div>
                          )}
                          <p style={{ ...labelStyle, marginBottom: 8 }}>Acknowledgments ({acks[v.id]?.length ?? '...'})</p>
                          {!acks[v.id] ? (
                            <p style={{ fontSize: 13, color: T.textMuted }}>Loading...</p>
                          ) : acks[v.id].length === 0 ? (
                            <p style={{ fontSize: 13, color: T.textMuted }}>No acknowledgments yet.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {acks[v.id].map(a => (
                                <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: T.bg, borderRadius: 7, padding: '8px 12px', boxShadow: T.shadow }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <CheckCircle size={13} color={T.green} />
                                    <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{(a.user as any)?.full_name}</span>
                                    {(a.user as any)?.department && <span style={{ fontSize: 11, color: T.textMuted }}>{(a.user as any).department}</span>}
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

        {/* Create Modal */}
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: T.bg, borderRadius: 14, width: '100%', maxWidth: 500, boxShadow: 'rgba(0,0,0,0.2) 0px 20px 60px' }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>Publish New Policy Version</h2>
                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted }}><X size={16} /></button>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Course / Policy *</label>
                  <select style={inputStyle} value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}>
                    <option value="">Select course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title} (currently v{c.version})</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Version Summary *</label>
                  <input style={inputStyle} placeholder="e.g. Updated POSH guidelines per 2026 amendments" value={form.version_notes} onChange={e => setForm(f => ({ ...f, version_notes: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Changelog (what changed)</label>
                  <textarea
                    style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                    placeholder="List the specific changes made in this version..."
                    value={form.changelog}
                    onChange={e => setForm(f => ({ ...f, changelog: e.target.value }))}
                  />
                </div>
                <div style={{ background: '#fef3c7', borderRadius: 8, padding: '12px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <input
                      type="checkbox"
                      id="reack"
                      checked={form.requires_reacknowledgment}
                      onChange={e => setForm(f => ({ ...f, requires_reacknowledgment: e.target.checked }))}
                      style={{ marginTop: 2 }}
                    />
                    <label htmlFor="reack" style={{ fontSize: 13, color: '#92400e', cursor: 'pointer', lineHeight: 1.5 }}>
                      <strong>Require re-acknowledgment</strong> — All employees who previously completed this course will be reset to "assigned" and must re-read and acknowledge the new version.
                    </label>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
                  <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px', background: T.bgSection, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: T.textBody }}>Cancel</button>
                  <button
                    onClick={handleCreate}
                    disabled={saving || !form.course_id || !form.version_notes}
                    style={{ flex: 2, padding: '10px', background: saving || !form.course_id || !form.version_notes ? T.bgSection : T.text, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: saving || !form.course_id || !form.version_notes ? T.textMuted : 'white' }}
                  >
                    {saving ? 'Publishing...' : 'Publish Version'}
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
