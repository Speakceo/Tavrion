import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAssignments, createAssignment } from '../services/assignmentService';
import { fetchAssessments } from '../services/assessmentService';
import { supabase } from '../../../lib/supabase';
import type { Assessment, AssessmentAssignment, AssigneeType } from '../types';
import { Plus, Link2, Calendar, Play, Mail, Copy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

type AssignmentTarget = {
  id: string;
  assignment_id: string;
  user_id?: string | null;
  external_email?: string | null;
  external_name?: string | null;
  cohort_label?: string | null;
};

type AssignmentWithTargets = AssessmentAssignment & { targets?: AssignmentTarget[] };

function randomToken() {
  return `tst_${crypto.randomUUID().replace(/-/g, '')}`;
}

export function TestAssignments() {
  const { profile, organization } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [assignments, setAssignments] = useState<AssignmentWithTargets[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [learners, setLearners] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    assessment_id: '',
    title: '',
    assignee_type: 'learner' as AssigneeType,
    user_id: '',
    cohort_label: '',
    candidate_emails: '',
    due_at: '',
    expires_at: '',
    max_attempts: 1,
    passing_score: 70,
    reminder_enabled: true,
    practice_mode: false,
    send_invites: true,
  });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const [a, asg] = await Promise.all([
        fetchAssessments(viewer, { status: 'published' }),
        fetchAssignments(viewer),
      ]);
      setAssessments(a);
      setAssignments(asg);

      if (asg.length) {
        const ids = asg.map((x) => x.id);
        const { data: targets } = await supabase
          .from('assessment_assignment_targets')
          .select('*')
          .in('assignment_id', ids);
        const byAssignment = new Map<string, AssignmentTarget[]>();
        (targets || []).forEach((t) => {
          const list = byAssignment.get(t.assignment_id) || [];
          list.push(t);
          byAssignment.set(t.assignment_id, list);
        });
        setAssignments(asg.map((item) => ({ ...item, targets: byAssignment.get(item.id) || [] })));
      }

      if (viewer.organization_id) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('organization_id', viewer.organization_id)
          .eq('role', 'employee')
          .order('full_name');
        setLearners(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.id]);

  const sendInvites = async (
    recipients: { email: string; name: string; magicLink?: string }[],
    title: string,
    assessmentTitle: string,
  ) => {
    if (!recipients.length) return;
    await supabase.functions.invoke('send-email-nudge', {
      body: {
        recipients,
        subject: `Assessment invitation: ${title}`,
        htmlBody: recipients.map((r) =>
          `<p>Hi ${r.name || 'there'},</p><p>You have been invited to complete <strong>${assessmentTitle}</strong>.</p>${r.magicLink ? `<p><a href="${r.magicLink}">Start assessment</a></p>` : ''}`,
        ).join(''),
        emailType: 'assessment_invite',
        organizationId: organization?.id || viewer?.organization_id || null,
      },
    });
  };

  const handleCreate = async () => {
    if (!viewer?.id || !form.assessment_id || !form.title) return;
    setBusy(true);
    setMessage('');
    try {
      const assessment = assessments.find((a) => a.id === form.assessment_id);

      if (form.practice_mode && form.assessment_id) {
        const settings = (assessment?.settings || {}) as Record<string, unknown>;
        await supabase.from('assessments').update({
          settings: { ...settings, practice_mode: true },
          updated_at: new Date().toISOString(),
        }).eq('id', form.assessment_id);
      }

      const basePayload = {
        assessment_id: form.assessment_id,
        title: form.title,
        due_at: form.due_at || undefined,
        expires_at: form.expires_at || undefined,
        max_attempts: form.max_attempts,
        passing_score: form.passing_score,
        reminder_enabled: form.reminder_enabled,
      };

      const created: AssignmentWithTargets[] = [];

      if (form.assignee_type === 'cohort' && form.cohort_label.trim()) {
        const assignment = await createAssignment(
          { ...viewer, id: viewer.id },
          {
            ...basePayload,
            assignee_type: 'cohort',
            targets: [{ cohort_label: form.cohort_label.trim() }],
          },
        );
        created.push(assignment);
      } else if (form.assignee_type === 'external' && form.candidate_emails.trim()) {
        const emails = form.candidate_emails.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean);
        for (const email of emails) {
          const token = randomToken();
          const { data: assignment, error } = await supabase
            .from('assessment_assignments')
            .insert({
              organization_id: viewer.organization_id,
              assessment_id: form.assessment_id,
              title: `${form.title} — ${email}`,
              assignee_type: 'external',
              due_at: form.due_at || null,
              expires_at: form.expires_at || null,
              max_attempts: form.max_attempts,
              passing_score: form.passing_score,
              reminder_enabled: form.reminder_enabled,
              access_token: token,
              created_by: viewer.id,
            })
            .select()
            .single();
          if (error) throw error;

          await supabase.from('assessment_assignment_targets').insert({
            assignment_id: assignment.id,
            external_email: email,
            external_name: email.split('@')[0],
          });

          created.push({ ...assignment, access_token: token });

          if (form.send_invites) {
            const magicLink = `${window.location.origin}/assess/${token}`;
            await sendInvites(
              [{ email, name: email.split('@')[0], magicLink }],
              form.title,
              assessment?.title || 'Assessment',
            );
          }
        }
      } else {
        const assignment = await createAssignment(
          { ...viewer, id: viewer.id },
          {
            ...basePayload,
            assignee_type: form.assignee_type,
            targets: form.user_id ? [{ user_id: form.user_id }] : [],
          },
        );
        created.push(assignment);

        if (form.send_invites && form.user_id) {
          const learner = learners.find((l) => l.id === form.user_id);
          if (learner?.email) {
            await sendInvites(
              [{ email: learner.email, name: learner.full_name }],
              form.title,
              assessment?.title || 'Assessment',
            );
          }
        }
      }

      setShowForm(false);
      setForm({
        assessment_id: '', title: '', assignee_type: 'learner', user_id: '', cohort_label: '',
        candidate_emails: '', due_at: '', expires_at: '', max_attempts: 1, passing_score: 70,
        reminder_enabled: true, practice_mode: false, send_invites: true,
      });
      setMessage(`Created ${created.length} assignment${created.length > 1 ? 's' : ''}.`);
      await load();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to create assignment');
    } finally {
      setBusy(false);
    }
  };

  const copyLink = (token: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/assess/${token}`);
    setMessage('Magic link copied.');
    setTimeout(() => setMessage(''), 2000);
  };

  const resendInvite = async (email: string, name: string, token?: string | null, title?: string, assessmentTitle?: string) => {
    const magicLink = token ? `${window.location.origin}/assess/${token}` : undefined;
    await sendInvites([{ email, name, magicLink }], title || 'Assessment', assessmentTitle || 'Assessment');
    setMessage(`Invite sent to ${email}`);
    setTimeout(() => setMessage(''), 2500);
  };

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Assignments</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Assign assessments to learners, cohorts, or external candidates.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="lt-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
          <Plus size={14} /> New assignment
        </button>
      </div>

      {message && (
        <div className="lt-card" style={{ padding: 10, marginBottom: 12, fontSize: 12, color: message.includes('Failed') ? '#c0392b' : '#16a34a' }}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="lt-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Create assignment</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ fontSize: 12 }}>
              Assessment
              <select className="lt-input" value={form.assessment_id} onChange={(e) => setForm({ ...form, assessment_id: e.target.value })} style={{ marginTop: 4 }}>
                <option value="">Select published assessment</option>
                {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12 }}>
              Title
              <input className="lt-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Assignee type
              <select className="lt-input" value={form.assignee_type} onChange={(e) => setForm({ ...form, assignee_type: e.target.value as AssigneeType })} style={{ marginTop: 4 }}>
                <option value="learner">Learner</option>
                <option value="cohort">Cohort</option>
                <option value="external">External candidate</option>
              </select>
            </label>
            {form.assignee_type === 'learner' && (
              <label style={{ fontSize: 12 }}>
                Learner
                <select className="lt-input" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} style={{ marginTop: 4 }}>
                  <option value="">Select learner</option>
                  {learners.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
                </select>
              </label>
            )}
            {form.assignee_type === 'cohort' && (
              <label style={{ fontSize: 12 }}>
                Cohort label
                <input className="lt-input" placeholder="e.g. Q3 Sales hires" value={form.cohort_label} onChange={(e) => setForm({ ...form, cohort_label: e.target.value })} style={{ marginTop: 4 }} />
              </label>
            )}
            {form.assignee_type === 'external' && (
              <label style={{ fontSize: 12, gridColumn: '1 / -1' }}>
                Candidate emails (one per line or comma-separated)
                <textarea className="lt-input" rows={3} value={form.candidate_emails} onChange={(e) => setForm({ ...form, candidate_emails: e.target.value })} style={{ marginTop: 4 }} placeholder="candidate@example.com" />
              </label>
            )}
            <label style={{ fontSize: 12 }}>
              Window opens (due_at)
              <input type="datetime-local" className="lt-input" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} style={{ marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Window closes (expires_at)
              <input type="datetime-local" className="lt-input" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })} style={{ marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Max attempts
              <input type="number" className="lt-input" value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: Number(e.target.value) })} style={{ marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Passing score
              <input type="number" className="lt-input" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} style={{ marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.reminder_enabled} onChange={(e) => setForm({ ...form, reminder_enabled: e.target.checked })} />
              Send reminders
            </label>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.practice_mode} onChange={(e) => setForm({ ...form, practice_mode: e.target.checked })} />
              Practice mode (no scoring)
            </label>
            <label style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="checkbox" checked={form.send_invites} onChange={(e) => setForm({ ...form, send_invites: e.target.checked })} />
              Email invites on create
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={handleCreate} disabled={busy} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>{busy ? 'Creating...' : 'Create'}</button>
            <button onClick={() => setShowForm(false)} className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#808080' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {assignments.map((a) => (
            <div key={a.id} className="lt-card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {(a.assessment as { title?: string })?.title || 'Assessment'} · {a.assignee_type} · max {a.max_attempts} attempts
                {a.reminder_enabled ? ' · reminders on' : ' · reminders off'}
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {a.due_at && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} /> Opens {new Date(a.due_at).toLocaleString()}
                  </span>
                )}
                {a.expires_at && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar size={11} /> Closes {new Date(a.expires_at).toLocaleString()}
                  </span>
                )}
              </div>

              {a.targets && a.targets.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 11, color: '#666' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6, fontWeight: 600 }}>
                    <Users size={12} /> Targets
                  </div>
                  {a.targets.map((t) => (
                    <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', flexWrap: 'wrap' }}>
                      {t.cohort_label && <span>Cohort: {t.cohort_label}</span>}
                      {t.external_email && (
                        <>
                          <span>{t.external_email}</span>
                          {a.access_token && (
                            <>
                              <button type="button" onClick={() => copyLink(a.access_token!)} className="lt-btn-secondary" style={{ padding: '2px 8px', fontSize: 10, display: 'flex', gap: 4, alignItems: 'center' }}>
                                <Copy size={10} /> Copy link
                              </button>
                              <button
                                type="button"
                                onClick={() => resendInvite(t.external_email!, t.external_name || t.external_email!, a.access_token, a.title, (a.assessment as { title?: string })?.title)}
                                className="lt-btn-secondary"
                                style={{ padding: '2px 8px', fontSize: 10, display: 'flex', gap: 4, alignItems: 'center' }}
                              >
                                <Mail size={10} /> Resend
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Link to={`/test/take/${a.id}`} className="lt-btn-secondary" style={{ padding: '5px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                  <Play size={11} /> Preview / take
                </Link>
              </div>
              {a.access_token && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link2 size={11} /> Magic link: /assess/{a.access_token.slice(0, 12)}…
                  <button type="button" onClick={() => copyLink(a.access_token!)} className="lt-btn-secondary" style={{ padding: '2px 8px', fontSize: 10 }}>Copy</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </TestLayout>
  );
}
