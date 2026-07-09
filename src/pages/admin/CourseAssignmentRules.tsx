import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import {
  Plus, Trash2, RefreshCw, Users, CheckCircle, Clock,
  AlertTriangle, Target, Filter, Play, ChevronDown, ChevronUp, X
} from 'lucide-react';
import { applyOrgUserScope } from '../../utils/orgUsers';

type RecurrenceInterval = 'none' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
type UserRole = 'super_admin' | 'admin' | 'trainer' | 'employee' | 'partner';

interface Course {
  id: string;
  title: string;
  is_mandatory: boolean;
  recurrence_interval: RecurrenceInterval;
  passing_score: number;
  requires_quiz_pass: boolean;
}

interface AssignmentRule {
  id: string;
  course_id: string;
  rule_name: string;
  department: string | null;
  country: string | null;
  designation: string | null;
  role: UserRole | null;
  min_tenure_days: number | null;
  max_tenure_days: number | null;
  recurrence_interval: RecurrenceInterval;
  auto_enroll: boolean;
  is_active: boolean;
  created_at: string;
  course?: { title: string };
}

interface UserProfile {
  id: string;
  full_name: string;
  department: string | null;
  country: string | null;
  designation: string | null;
  role: UserRole;
  joining_date: string | null;
}

const T = {
  text: '#171717', textBody: '#4d4d4d', textMuted: '#666', textFaint: '#999',
  border: 'rgba(0,0,0,0.08)', bg: '#ffffff', bgSubtle: '#fafafa', bgSection: '#f5f5f5',
  blue: '#0a72ef', green: '#16a34a', red: '#dc2626', amber: '#d97706',
  shadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
  shadowCard: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px',
};

const RECURRENCE_LABELS: Record<RecurrenceInterval, string> = {
  none: 'No recurrence',
  monthly: 'Monthly',
  quarterly: 'Quarterly (3 months)',
  semi_annual: 'Semi-annual (6 months)',
  annual: 'Annual',
};

const RECURRENCE_DAYS: Record<RecurrenceInterval, number> = {
  none: 0, monthly: 30, quarterly: 90, semi_annual: 180, annual: 365,
};

function calcDueDate(recurrence: RecurrenceInterval): string | undefined {
  if (recurrence === 'none') return undefined;
  const d = new Date();
  d.setDate(d.getDate() + RECURRENCE_DAYS[recurrence]);
  return d.toISOString();
}

const EMPTY_RULE = {
  course_id: '',
  rule_name: '',
  department: '',
  country: '',
  designation: '',
  role: '' as UserRole | '',
  min_tenure_days: '',
  max_tenure_days: '',
  recurrence_interval: 'none' as RecurrenceInterval,
  auto_enroll: true,
};

export function CourseAssignmentRules() {
  const { profile } = useAuth();
  const [rules, setRules] = useState<AssignmentRule[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(EMPTY_RULE);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState<string | null>(null);
  const [previewUsers, setPreviewUsers] = useState<UserProfile[]>([]);
  const [expandedRule, setExpandedRule] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<{ ruleId: string; count: number } | null>(null);
  const [courseForm, setCourseForm] = useState<{ id: string; recurrence: RecurrenceInterval; passingScore: number; requiresQuizPass: boolean; isMandatory: boolean } | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);

  useEffect(() => { if (profile) loadAll(); }, [profile]);

  async function loadAll() {
    setLoading(true);
    const usersQuery = applyOrgUserScope(
      supabase.from('user_profiles').select('id, full_name, department, country, designation, role, joining_date').eq('is_active', true).order('full_name'),
      profile,
    );
    const [rulesRes, coursesRes, usersRes] = await Promise.all([
      supabase.from('course_assignment_rules').select('*, course:courses(title)').order('created_at', { ascending: false }),
      supabase.from('courses').select('id, title, is_mandatory, recurrence_interval, passing_score, requires_quiz_pass').eq('status', 'published').order('title'),
      usersQuery,
    ]);
    setRules(rulesRes.data || []);
    setCourses(coursesRes.data || []);
    setUsers(usersRes.data || []);
    setLoading(false);
  }

  function matchUsers(rule: {
    department?: string | null;
    country?: string | null;
    designation?: string | null;
    role?: UserRole | null | '';
    min_tenure_days?: string | number | null;
    max_tenure_days?: string | number | null;
  }): UserProfile[] {
    return users.filter(u => {
      if (rule.department && u.department?.toLowerCase() !== rule.department.toLowerCase()) return false;
      if (rule.country && u.country?.toLowerCase() !== rule.country.toLowerCase()) return false;
      if (rule.designation && u.designation?.toLowerCase() !== rule.designation.toLowerCase()) return false;
      if (rule.role && u.role !== rule.role) return false;
      if (rule.min_tenure_days || rule.max_tenure_days) {
        const joiningDate = u.joining_date ? new Date(u.joining_date) : null;
        if (joiningDate) {
          const tenureDays = Math.floor((Date.now() - joiningDate.getTime()) / 86400000);
          if (rule.min_tenure_days && tenureDays < Number(rule.min_tenure_days)) return false;
          if (rule.max_tenure_days && tenureDays > Number(rule.max_tenure_days)) return false;
        }
      }
      return true;
    });
  }

  async function handleCreate() {
    if (!form.course_id || !form.rule_name) return;
    setSaving(true);
    const { error } = await supabase.from('course_assignment_rules').insert({
      course_id: form.course_id,
      rule_name: form.rule_name,
      department: form.department || null,
      country: form.country || null,
      designation: form.designation || null,
      role: form.role || null,
      min_tenure_days: form.min_tenure_days ? Number(form.min_tenure_days) : null,
      max_tenure_days: form.max_tenure_days ? Number(form.max_tenure_days) : null,
      recurrence_interval: form.recurrence_interval,
      auto_enroll: form.auto_enroll,
      is_active: true,
      created_by: profile?.id,
    });
    setSaving(false);
    if (!error) {
      setForm(EMPTY_RULE);
      setShowCreate(false);
      loadAll();
    } else {
      alert('Error saving rule: ' + error.message);
    }
  }

  async function runRule(rule: AssignmentRule) {
    setRunning(rule.id);
    const matched = matchUsers(rule);
    let enrolled = 0;
    let failed = 0;
    for (const u of matched) {
      const { data: existing } = await supabase
        .from('user_course_enrollments')
        .select('id, status')
        .eq('user_id', u.id)
        .eq('course_id', rule.course_id)
        .maybeSingle();

      if (!existing) {
        const { error } = await supabase.from('user_course_enrollments').upsert({
          user_id: u.id,
          course_id: rule.course_id,
          status: 'assigned',
          recurrence_interval: rule.recurrence_interval,
          due_date: calcDueDate(rule.recurrence_interval),
          last_assigned_at: new Date().toISOString(),
        }, { onConflict: 'user_id,course_id' });
        if (error) failed++;
        else enrolled++;
      } else if (rule.recurrence_interval !== 'none' && existing.status === 'completed') {
        const { error } = await supabase.from('user_course_enrollments').update({
          status: 'assigned',
          due_date: calcDueDate(rule.recurrence_interval),
          last_assigned_at: new Date().toISOString(),
        }).eq('id', existing.id);
        if (error) failed++;
        else enrolled++;
      }
    }
    setRunning(null);
    setRunResult({ ruleId: rule.id, count: enrolled });
    if (failed > 0) {
      alert(`${enrolled} enrollment(s) updated. ${failed} failed — refresh and try again.`);
    }
    setTimeout(() => setRunResult(null), 4000);
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this assignment rule?')) return;
    await supabase.from('course_assignment_rules').delete().eq('id', id);
    loadAll();
  }

  async function saveCourseSettings() {
    if (!courseForm) return;
    setSavingCourse(true);
    await supabase.from('courses').update({
      recurrence_interval: courseForm.recurrence,
      passing_score: courseForm.passingScore,
      requires_quiz_pass: courseForm.requiresQuizPass,
      is_mandatory: courseForm.isMandatory,
    }).eq('id', courseForm.id);
    setSavingCourse(false);
    setCourseForm(null);
    loadAll();
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: T.bgSubtle,
    boxShadow: T.shadow, border: 'none', borderRadius: 8,
    fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 11, fontWeight: 600, color: T.textMuted,
    letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4,
  };

  const depts = [...new Set(users.map(u => u.department).filter(Boolean))].sort();
  const countries = [...new Set(users.map(u => u.country).filter(Boolean))].sort();
  const desigs = [...new Set(users.map(u => u.designation).filter(Boolean))].sort();

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 0 48px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: T.text }}>Course Assignment</h1>
            <p style={{ fontSize: 14, color: T.textBody, marginTop: 4 }}>Automate enrolment based on employee attributes and recurrence schedules</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', background: T.text, color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={14} /> New Rule
          </button>
        </div>

        {/* Course Settings Section */}
        <div style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Course Recurrence & Passing Settings</h2>
            <span style={{ fontSize: 12, color: T.textMuted }}>{courses.length} published courses</span>
          </div>
          {loading ? <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMuted, fontSize: 13 }}>Loading...</div> : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.bgSection}` }}>
                    {['Course', 'Mandatory', 'Recurrence', 'Passing Score', 'Require Pass', ''].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {courses.map(c => (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${T.bgSection}` }}>
                      <td style={{ padding: '10px 12px', color: T.text, fontWeight: 500 }}>{c.title}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: c.is_mandatory ? '#dcfce7' : T.bgSection, color: c.is_mandatory ? T.green : T.textMuted }}>
                          {c.is_mandatory ? 'Mandatory' : 'Optional'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', color: T.textBody }}>{RECURRENCE_LABELS[c.recurrence_interval || 'none']}</td>
                      <td style={{ padding: '10px 12px', color: T.textBody }}>{c.passing_score ?? 70}%</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: c.requires_quiz_pass ? T.blue : T.textMuted }}>{c.requires_quiz_pass ? 'Required' : 'Optional'}</span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <button
                          onClick={() => setCourseForm({ id: c.id, recurrence: c.recurrence_interval || 'none', passingScore: c.passing_score ?? 70, requiresQuizPass: !!c.requires_quiz_pass, isMandatory: !!c.is_mandatory })}
                          style={{ padding: '4px 10px', background: T.bgSection, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: T.textBody }}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Assignment Rules */}
        <div style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Assignment Rules</h2>
            <span style={{ fontSize: 12, color: T.textMuted }}>{rules.length} rules</span>
          </div>

          {loading ? <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMuted, fontSize: 13 }}>Loading...</div>
            : rules.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: T.textMuted }}>
                <Target size={32} style={{ color: T.border, margin: '0 auto 8px' }} />
                <p style={{ fontSize: 14 }}>No assignment rules yet. Create one to auto-enrol users.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {rules.map(r => {
                  const matched = matchUsers(r);
                  const expanded = expandedRule === r.id;
                  const result = runResult?.ruleId === r.id ? runResult : null;
                  return (
                    <div key={r.id} style={{ border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, background: r.is_active ? T.bg : T.bgSubtle }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                            <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>{r.rule_name}</span>
                            {!r.is_active && <span style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', background: T.bgSection, color: T.textFaint, borderRadius: 100 }}>Inactive</span>}
                          </div>
                          <div style={{ fontSize: 12, color: T.textMuted }}>
                            Course: <b style={{ color: T.textBody }}>{r.course?.title}</b>
                            {r.department && <> · Dept: <b style={{ color: T.textBody }}>{r.department}</b></>}
                            {r.country && <> · Country: <b style={{ color: T.textBody }}>{r.country}</b></>}
                            {r.role && <> · Role: <b style={{ color: T.textBody }}>{r.role}</b></>}
                            {r.recurrence_interval !== 'none' && <> · Recurs: <b style={{ color: T.blue }}>{RECURRENCE_LABELS[r.recurrence_interval]}</b></>}
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                          <span style={{ fontSize: 12, color: T.textMuted, background: T.bgSection, padding: '3px 8px', borderRadius: 6 }}>
                            {matched.length} users match
                          </span>
                          {result && (
                            <span style={{ fontSize: 12, color: T.green, background: '#dcfce7', padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>
                              {result.count} enrolled
                            </span>
                          )}
                          <button
                            onClick={() => runRule(r)}
                            disabled={running === r.id}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', background: T.blue, color: 'white', border: 'none', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: running === r.id ? 'wait' : 'pointer', opacity: running === r.id ? 0.7 : 1 }}
                          >
                            {running === r.id ? <RefreshCw size={11} className="animate-spin" /> : <Play size={11} />}
                            {running === r.id ? 'Running...' : 'Run'}
                          </button>
                          <button onClick={() => setExpandedRule(expanded ? null : r.id)} style={{ padding: 5, background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted }}>
                            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          <button onClick={() => deleteRule(r.id)} style={{ padding: 5, background: 'none', border: 'none', cursor: 'pointer', color: T.red }}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      {expanded && (
                        <div style={{ background: T.bgSubtle, borderTop: `1px solid ${T.border}`, padding: '12px 16px' }}>
                          <p style={{ fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 8 }}>Matched users ({matched.length})</p>
                          {matched.length === 0 ? <p style={{ fontSize: 12, color: T.textFaint }}>No users match this rule's filters.</p> : (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                              {matched.slice(0, 20).map(u => (
                                <span key={u.id} style={{ fontSize: 11, background: T.bg, boxShadow: T.shadow, borderRadius: 6, padding: '3px 8px', color: T.textBody }}>
                                  {u.full_name}
                                </span>
                              ))}
                              {matched.length > 20 && <span style={{ fontSize: 11, color: T.textMuted }}>+{matched.length - 20} more</span>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
        </div>

        {/* Create Rule Modal */}
        {showCreate && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: T.bg, borderRadius: 14, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'rgba(0,0,0,0.2) 0px 20px 60px' }}>
              <div style={{ padding: '20px 24px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text }}>New Assignment Rule</h2>
                <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 4 }}><X size={16} /></button>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Rule Name *</label>
                  <input style={inputStyle} placeholder="e.g. POSH for Sales Team" value={form.rule_name} onChange={e => setForm(f => ({ ...f, rule_name: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Course *</label>
                  <select style={inputStyle} value={form.course_id} onChange={e => setForm(f => ({ ...f, course_id: e.target.value }))}>
                    <option value="">Select course...</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                  </select>
                </div>
                <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                    <Filter size={12} color={T.textMuted} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: T.textMuted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Filters (leave blank for all)</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Department</label>
                      <select style={inputStyle} value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                        <option value="">Any department</option>
                        {depts.map(d => <option key={d} value={d!}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Country</label>
                      <select style={inputStyle} value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))}>
                        <option value="">Any country</option>
                        {countries.map(c => <option key={c} value={c!}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Designation</label>
                      <select style={inputStyle} value={form.designation} onChange={e => setForm(f => ({ ...f, designation: e.target.value }))}>
                        <option value="">Any designation</option>
                        {desigs.map(d => <option key={d} value={d!}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Role</label>
                      <select style={inputStyle} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as UserRole | '' }))}>
                        <option value="">Any role</option>
                        {(['employee', 'trainer', 'partner', 'admin'] as UserRole[]).map(r => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Min Tenure (days)</label>
                      <input style={inputStyle} type="number" placeholder="e.g. 0 (from day 1)" value={form.min_tenure_days} onChange={e => setForm(f => ({ ...f, min_tenure_days: e.target.value }))} />
                    </div>
                    <div>
                      <label style={labelStyle}>Max Tenure (days)</label>
                      <input style={inputStyle} type="number" placeholder="e.g. 90 (first 3 months)" value={form.max_tenure_days} onChange={e => setForm(f => ({ ...f, max_tenure_days: e.target.value }))} />
                    </div>
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Recurrence</label>
                  <select style={inputStyle} value={form.recurrence_interval} onChange={e => setForm(f => ({ ...f, recurrence_interval: e.target.value as RecurrenceInterval }))}>
                    {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>

                {form.course_id && (
                  <div style={{ background: T.bgSubtle, borderRadius: 8, padding: '10px 14px', fontSize: 12, color: T.textBody }}>
                    <strong>Preview:</strong> {matchUsers(form).length} users will be enrolled
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                  <button onClick={() => setShowCreate(false)} style={{ flex: 1, padding: '10px', background: T.bgSection, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: T.textBody }}>Cancel</button>
                  <button
                    onClick={handleCreate}
                    disabled={saving || !form.course_id || !form.rule_name}
                    style={{ flex: 2, padding: '10px', background: saving || !form.course_id || !form.rule_name ? T.bgSection : T.text, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: saving || !form.course_id || !form.rule_name ? T.textMuted : 'white' }}
                  >
                    {saving ? 'Saving...' : 'Create Rule'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Course Settings Modal */}
        {courseForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: T.bg, borderRadius: 14, width: '100%', maxWidth: 420, boxShadow: 'rgba(0,0,0,0.2) 0px 20px 60px', padding: '24px' }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: T.text, marginBottom: 20 }}>Course Settings</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Recurrence</label>
                  <select style={inputStyle} value={courseForm.recurrence} onChange={e => setCourseForm(f => f ? { ...f, recurrence: e.target.value as RecurrenceInterval } : f)}>
                    {Object.entries(RECURRENCE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Passing Score (%)</label>
                  <input style={inputStyle} type="number" min={0} max={100} value={courseForm.passingScore} onChange={e => setCourseForm(f => f ? { ...f, passingScore: Number(e.target.value) } : f)} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="requirePass" checked={courseForm.requiresQuizPass} onChange={e => setCourseForm(f => f ? { ...f, requiresQuizPass: e.target.checked } : f)} />
                  <label htmlFor="requirePass" style={{ fontSize: 13, color: T.textBody, cursor: 'pointer' }}>Require quiz pass to mark course complete</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="isMandatory" checked={courseForm.isMandatory} onChange={e => setCourseForm(f => f ? { ...f, isMandatory: e.target.checked } : f)} />
                  <label htmlFor="isMandatory" style={{ fontSize: 13, color: T.textBody, cursor: 'pointer' }}>Mark as mandatory training</label>
                </div>
                <div style={{ display: 'flex', gap: 8, paddingTop: 8 }}>
                  <button onClick={() => setCourseForm(null)} style={{ flex: 1, padding: '10px', background: T.bgSection, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: T.textBody }}>Cancel</button>
                  <button onClick={saveCourseSettings} disabled={savingCourse} style={{ flex: 2, padding: '10px', background: T.text, border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', color: 'white' }}>
                    {savingCourse ? 'Saving...' : 'Save Settings'}
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
