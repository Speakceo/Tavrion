import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { applyOrgScope } from '../../utils/orgScope';
import { applyOrgUserScope } from '../../utils/orgUsers';
import { Mail, Send, Users, BookOpen, Check, Filter } from 'lucide-react';

type CourseKind = 'builtin' | 'uploaded';

type CourseOption = {
  id: string;
  title: string;
  kind: CourseKind;
  status?: string;
};

type LearnerRow = {
  id: string;
  full_name: string;
  email: string;
  unique_id: string;
  department?: string;
  status: string;
};

type CompletionFilter = 'all' | 'pending' | 'in_progress' | 'completed';

const TEMPLATES = {
  reminder: {
    label: 'Course Reminder',
    subject: 'Reminder: Complete your assigned course',
    body: `<div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #171717;">
  <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Hi {{name}},</h2>
  <p style="color: #4d4d4d; line-height: 1.7; margin-bottom: 16px;">
    You have an assigned course that's waiting for you: <strong>{{course_title}}</strong>.
  </p>
  <p style="color: #4d4d4d; line-height: 1.7; margin-bottom: 24px;">
    Take a few minutes today to make progress on your learning journey.
  </p>
  <a href="https://jointavrion.com/courses" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
    Start Learning
  </a>
  <p style="margin-top: 32px; font-size: 12px; color: #808080;">Tavrion Learning Platform · jointavrion.com</p>
</div>`,
  },
  completion: {
    label: 'Completion Nudge',
    subject: 'Almost there! Finish {{course_title}} today',
    body: `<div style="font-family: system-ui, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #171717;">
  <h2 style="font-size: 20px; font-weight: 700; margin-bottom: 8px;">Hi {{name}},</h2>
  <p style="color: #4d4d4d; line-height: 1.7; margin-bottom: 16px;">
    You're so close to completing <strong>{{course_title}}</strong>!
  </p>
  <p style="color: #4d4d4d; line-height: 1.7; margin-bottom: 24px;">
    Log back in and finish what you started — your certificate is waiting.
  </p>
  <a href="https://jointavrion.com/courses" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
    Finish Course
  </a>
  <p style="margin-top: 32px; font-size: 12px; color: #808080;">Tavrion Learning Platform · jointavrion.com</p>
</div>`,
  },
};

function isPending(status: string) {
  return ['assigned', 'not_started', 'viewed', 'downloaded'].includes(status);
}

function isInProgress(status: string) {
  return status === 'in_progress';
}

function isCompleted(status: string) {
  return status === 'completed';
}

function statusLabel(status: string) {
  if (isCompleted(status)) return 'Completed';
  if (isInProgress(status)) return 'In progress';
  if (isPending(status)) return 'Pending';
  return status.replace('_', ' ');
}

function resolveRecipientEmail(
  user: { email?: string | null; unique_id?: string | null },
  orgEmailDomain?: string
) {
  const email = user.email?.trim() || '';
  if (email.includes('@')) return email;
  if (user.unique_id && orgEmailDomain) {
    return `${user.unique_id.toLowerCase()}@${orgEmailDomain}`;
  }
  return email;
}

function mapLearnerRows(
  rows: { status?: string | null; user: LearnerRow | null }[],
  orgEmailDomain?: string
): LearnerRow[] {
  return rows
    .filter((row) => row.user?.id)
    .map((row) => {
      const user = row.user as LearnerRow;
      return {
        ...user,
        email: resolveRecipientEmail(user, orgEmailDomain),
        status: row.status || 'assigned',
      };
    })
    .filter((row) => Boolean(row.email?.includes('@') || row.unique_id));
}

async function loadUploadedLearners(courseId: string, orgId?: string | null) {
  const { data, error } = await supabase
    .from('uploaded_course_assignments')
    .select('status, user_id, user:user_profiles!uploaded_course_assignments_user_id_fkey(id, full_name, email, unique_id, department, organization_id)')
    .eq('course_id', courseId);

  if (error) {
    console.error('Email nudges uploaded join failed:', error);
    const { data: assignments, error: assignmentError } = await supabase
      .from('uploaded_course_assignments')
      .select('status, user_id')
      .eq('course_id', courseId);

    if (assignmentError) throw assignmentError;

    const userIds = [...new Set((assignments || []).map((row) => row.user_id))];
    if (userIds.length === 0) return [];

    let profileQuery = supabase
      .from('user_profiles')
      .select('id, full_name, email, unique_id, department, organization_id')
      .in('id', userIds);

    if (orgId) profileQuery = profileQuery.eq('organization_id', orgId);

    const { data: profiles, error: profileError } = await profileQuery;
    if (profileError) throw profileError;

    const profileMap = new Map((profiles || []).map((profile) => [profile.id, profile]));
    return (assignments || [])
      .map((assignment) => {
        const user = profileMap.get(assignment.user_id);
        if (!user) return null;
        return { status: assignment.status, user };
      })
      .filter(Boolean) as { status?: string | null; user: LearnerRow | null }[];
  }

  const filtered = orgId
    ? (data || []).filter((row: any) => row.user?.organization_id === orgId)
    : data || [];

  return filtered as { status?: string | null; user: LearnerRow | null }[];
}

async function loadBuiltinLearners(courseId: string, orgId?: string | null) {
  const { data, error } = await supabase
    .from('user_course_enrollments')
    .select('status, user:user_profiles(id, full_name, email, unique_id, department, organization_id)')
    .eq('course_id', courseId);

  if (error) throw error;

  const filtered = orgId
    ? (data || []).filter((row: any) => row.user?.organization_id === orgId)
    : data || [];

  return filtered as { status?: string | null; user: LearnerRow | null }[];
}

async function loadOrgScopedCourses(
  profile: { organization_id?: string | null; is_platform_owner?: boolean } | null | undefined,
): Promise<CourseOption[]> {
  if (profile?.is_platform_owner) {
    const [{ data: builtin }, { data: uploaded }] = await Promise.all([
      supabase.from('courses').select('id, title, status').order('title'),
      supabase.from('uploaded_courses').select('id, title').order('title'),
    ]);
    return [
      ...(builtin || []).map((c) => ({ id: c.id, title: c.title, kind: 'builtin' as const, status: c.status })),
      ...(uploaded || []).map((c) => ({ id: c.id, title: c.title, kind: 'uploaded' as const })),
    ];
  }

  const orgId = profile?.organization_id;
  if (!orgId) return [];

  const { data: orgUsers } = await applyOrgUserScope(
    supabase.from('user_profiles').select('id'),
    profile,
  );
  const orgUserIds = (orgUsers || []).map((u) => u.id);

  let uploadedQuery = applyOrgScope(
    supabase.from('uploaded_courses').select('id, title').order('title'),
    profile,
  );

  const [uploadedRes, enrollmentsRes, assignmentsRes] = await Promise.all([
    uploadedQuery,
    orgUserIds.length > 0
      ? supabase.from('user_course_enrollments').select('course_id').in('user_id', orgUserIds)
      : Promise.resolve({ data: [] as { course_id: string }[] }),
    orgUserIds.length > 0
      ? supabase.from('uploaded_course_assignments').select('course_id').in('user_id', orgUserIds)
      : Promise.resolve({ data: [] as { course_id: string }[] }),
  ]);

  const enrolledCourseIds = [...new Set((enrollmentsRes.data || []).map((e) => e.course_id))];
  const assignedUploadedIds = new Set((assignmentsRes.data || []).map((a) => a.course_id));

  let builtinCourses: { id: string; title: string; status: string }[] = [];
  if (enrolledCourseIds.length > 0) {
    const { data } = await supabase
      .from('courses')
      .select('id, title, status')
      .in('id', enrolledCourseIds)
      .order('title');
    builtinCourses = data || [];
  }

  const uploadedCourses = (uploadedRes.data || []).filter((c) => assignedUploadedIds.has(c.id));

  return [
    ...builtinCourses.map((c) => ({ id: c.id, title: c.title, kind: 'builtin' as const, status: c.status })),
    ...uploadedCourses.map((c) => ({ id: c.id, title: c.title, kind: 'uploaded' as const })),
  ];
}

export function EmailNudges() {
  const { profile, organization } = useAuth();
  const orgEmailDomain =
    (organization?.settings as { email_domain?: string } | undefined)?.email_domain ||
    (organization?.slug ? `${organization.slug}.com` : undefined);
  const scopeOrgId = profile?.is_platform_owner ? null : profile?.organization_id || null;

  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [learners, setLearners] = useState<LearnerRow[]>([]);
  const [selectedCourseKey, setSelectedCourseKey] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [completionFilter, setCompletionFilter] = useState<CompletionFilter>('pending');
  const [template, setTemplate] = useState<keyof typeof TEMPLATES>('reminder');
  const [sending, setSending] = useState(false);
  const [loadingLearners, setLoadingLearners] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; errors?: string[]; warning?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [resendConfigured, setResendConfigured] = useState<boolean | null>(null);

  const selectedCourse = useMemo(() => {
    if (!selectedCourseKey) return null;
    const [kind, id] = selectedCourseKey.split(':') as [CourseKind, string];
    return courses.find((c) => c.kind === kind && c.id === id) || null;
  }, [selectedCourseKey, courses]);

  useEffect(() => {
    supabase.functions.invoke('send-email-nudge', { method: 'GET' }).then(({ data }) => {
      setResendConfigured(Boolean(data?.configured));
    });
  }, []);

  useEffect(() => {
    if (!profile) return;

    setLoading(true);
    loadOrgScopedCourses(profile)
      .then((list) => {
        setCourses(list);
        setLoadError('');
      })
      .catch((err) => {
        console.error('Error loading email nudge courses:', err);
        setCourses([]);
        setLoadError('Could not load courses for your organisation.');
      })
      .finally(() => setLoading(false));
  }, [profile]);

  useEffect(() => {
    if (!selectedCourse) {
      setLearners([]);
      setSelectedUsers([]);
      return;
    }

    setLoadingLearners(true);
    setSelectedUsers([]);
    setLoadError('');

    (async () => {
      try {
        const rawRows =
          selectedCourse.kind === 'builtin'
            ? await loadBuiltinLearners(selectedCourse.id, scopeOrgId)
            : await loadUploadedLearners(selectedCourse.id, scopeOrgId);

        setLearners(mapLearnerRows(rawRows, orgEmailDomain));
      } catch (err) {
        console.error('Error loading email nudge recipients:', err);
        setLearners([]);
        setLoadError('Could not load recipients for this course. Please try again.');
      } finally {
        setLoadingLearners(false);
      }
    })();
  }, [selectedCourse, scopeOrgId, orgEmailDomain]);

  const filteredLearners = useMemo(() => {
    return learners.filter((u) => {
      if (completionFilter === 'pending') return isPending(u.status);
      if (completionFilter === 'in_progress') return isInProgress(u.status);
      if (completionFilter === 'completed') return isCompleted(u.status);
      return true;
    });
  }, [learners, completionFilter]);

  useEffect(() => {
    setSelectedUsers(filteredLearners.map((u) => u.id));
  }, [filteredLearners, completionFilter, selectedCourseKey]);

  const counts = useMemo(() => ({
    pending: learners.filter((u) => isPending(u.status)).length,
    in_progress: learners.filter((u) => isInProgress(u.status)).length,
    completed: learners.filter((u) => isCompleted(u.status)).length,
    all: learners.length,
  }), [learners]);

  const handleSend = async () => {
    if (!selectedCourse || selectedUsers.length === 0) return;

    setSending(true);
    setResult(null);

    const tpl = TEMPLATES[template];
    const recipients = learners
      .filter((u) => selectedUsers.includes(u.id))
      .map((u) => ({
        userId: u.id,
        email: resolveRecipientEmail(u, orgEmailDomain),
        name: u.full_name,
        courseTitle: selectedCourse.title,
      }))
      .filter((recipient) => recipient.email.includes('@'));

    if (recipients.length === 0) {
      setResult({ sent: 0, failed: selectedUsers.length, errors: ['No valid email addresses for selected learners'] });
      setSending(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-email-nudge', {
        body: {
          recipients,
          subject: tpl.subject,
          htmlBody: tpl.body,
          courseId: selectedCourse.id,
          emailType: template,
          organizationId: organization?.id || profile?.organization_id || null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const results = data.results || [];
      const sent = results.filter((r: { status: string }) => r.status === 'sent').length;
      const failed = results.filter((r: { status: string }) => r.status === 'failed').length;
      const errors = results
        .filter((r: { status: string; error?: string }) => r.status === 'failed' && r.error)
        .map((r: { email: string; error?: string }) => `${r.email}: ${r.error}`);
      setResult({ sent, failed, errors, warning: data.warning });
      if (sent > 0) setResendConfigured(true);
    } catch (err: any) {
      console.error('Error sending nudges:', err);
      setResult({
        sent: 0,
        failed: recipients.length,
        errors: [err.message || 'Email send failed. Check Resend settings in Owner Portal.'],
      });
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <div className="lt-spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Admin</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717', marginBottom: 4 }}>Email Nudges</h1>
          <p style={{ fontSize: 14, color: '#4d4d4d' }}>
            Select a course with learners in {organization?.name || 'your organisation'}, filter by completion status, and send nudges
          </p>
        </div>

        {loadError && (
          <div style={{ background: '#fff5f5', boxShadow: '#ff5b4f50 0px 0px 0px 1px', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#c0392b' }}>
            {loadError}
          </div>
        )}

        {resendConfigured === false && (
          <div style={{ background: '#fff8e6', boxShadow: '#e6a81750 0px 0px 0px 1px', borderRadius: 10, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: '#8a6d00' }}>
            Resend is not configured for the platform yet. Ask the platform owner to add one API key under Owner Portal → Email Settings — it applies to every organisation.
          </div>
        )}

        {result && (
          <div style={{ background: result.failed === 0 ? '#f0faf0' : '#fff5f5', boxShadow: `${result.failed === 0 ? '#1a7f1a' : '#ff5b4f'}50 0px 0px 0px 1px`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Check size={14} color={result.failed === 0 ? '#1a7f1a' : '#c0392b'} />
              <span style={{ fontSize: 14, color: result.failed === 0 ? '#1a7f1a' : '#c0392b', fontWeight: 600 }}>
                {result.sent} email{result.sent !== 1 ? 's' : ''} sent successfully{result.failed > 0 ? `, ${result.failed} failed` : ''}.
              </span>
            </div>
            {result.warning && (
              <p style={{ marginTop: 8, fontSize: 12, color: '#8a6d00' }}>{result.warning}</p>
            )}
            {result.errors && result.errors.length > 0 && (
              <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: 12, color: '#c0392b' }}>
                {result.errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="lt-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <BookOpen size={14} color="#4d4d4d" />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>Select Course</h2>
              </div>
              <select
                value={selectedCourseKey}
                onChange={(e) => setSelectedCourseKey(e.target.value)}
                className="lt-input"
                style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }}
              >
                <option value="">-- Choose a course --</option>
                {courses.some((c) => c.kind === 'builtin') && (
                  <optgroup label="Built-in courses">
                    {courses.filter((c) => c.kind === 'builtin').map((c) => (
                      <option key={`builtin:${c.id}`} value={`builtin:${c.id}`}>
                        {c.title}{c.status !== 'published' ? ` (${c.status})` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
                {courses.some((c) => c.kind === 'uploaded') && (
                  <optgroup label="Uploaded / SCORM courses">
                    {courses.filter((c) => c.kind === 'uploaded').map((c) => (
                      <option key={`uploaded:${c.id}`} value={`uploaded:${c.id}`}>{c.title}</option>
                    ))}
                  </optgroup>
                )}
              </select>
              {courses.length === 0 && (
                <p style={{ fontSize: 12, color: '#808080', marginTop: 8 }}>
                  No courses with assigned learners in your organisation yet. Assign a course first, then return here to send nudges.
                </p>
              )}
            </div>

            {selectedCourse && (
              <div className="lt-card" style={{ padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Filter size={14} color="#4d4d4d" />
                  <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>Completion Filter</h2>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {([
                    ['pending', `Pending (${counts.pending})`],
                    ['in_progress', `In progress (${counts.in_progress})`],
                    ['completed', `Completed (${counts.completed})`],
                    ['all', `All assigned (${counts.all})`],
                  ] as [CompletionFilter, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCompletionFilter(key)}
                      style={{
                        padding: '7px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                        background: completionFilter === key ? '#171717' : '#f5f5f5',
                        color: completionFilter === key ? '#fff' : '#4d4d4d',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="lt-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Mail size={14} color="#4d4d4d" />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>Email Template</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(Object.entries(TEMPLATES) as [keyof typeof TEMPLATES, { label: string; subject: string }][]).map(([key, tpl]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, cursor: 'pointer', boxShadow: template === key ? 'rgba(0,0,0,0.12) 0px 0px 0px 1.5px' : 'rgba(0,0,0,0.06) 0px 0px 0px 1px', background: template === key ? '#fafafa' : '#fff' }}>
                    <input type="radio" name="template" value={key} checked={template === key} onChange={() => setTemplate(key)} style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#171717' }}>{tpl.label}</div>
                      <div style={{ fontSize: 11, color: '#808080', marginTop: 2 }}>{tpl.subject}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleSend}
              disabled={sending || !selectedCourse || selectedUsers.length === 0}
              className="lt-btn-primary"
              style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 10, fontSize: 14, opacity: !selectedCourse || selectedUsers.length === 0 ? 0.5 : 1 }}
            >
              <Send size={14} />
              {sending ? 'Sending...' : `Send to ${selectedUsers.length} user${selectedUsers.length !== 1 ? 's' : ''}`}
            </button>
          </div>

          <div className="lt-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={14} color="#4d4d4d" />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>
                  Recipients ({selectedUsers.length} selected)
                </h2>
              </div>
              {filteredLearners.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedUsers(selectedUsers.length === filteredLearners.length ? [] : filteredLearners.map((u) => u.id))}
                  style={{ fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
                >
                  {selectedUsers.length === filteredLearners.length ? 'Deselect all' : 'Select all'}
                </button>
              )}
            </div>
            <div style={{ maxHeight: 520, overflowY: 'auto' }}>
              {!selectedCourse ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#808080', fontSize: 13 }}>Select a course to see assigned learners</div>
              ) : loadingLearners ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#808080', fontSize: 13 }}>Loading learners...</div>
              ) : loadError ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#c0392b', fontSize: 13 }}>{loadError}</div>
              ) : filteredLearners.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#808080', fontSize: 13 }}>
                  {learners.length === 0
                    ? 'No learners assigned to this course yet. Assign users from Uploaded Courses or Manage Courses.'
                    : 'No learners match this filter.'}
                </div>
              ) : (
                filteredLearners.map((user, i) => (
                  <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', borderBottom: i < filteredLearners.length - 1 ? '1px solid #f5f5f5' : 'none' }}>
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => setSelectedUsers(e.target.checked ? [...selectedUsers, user.id] : selectedUsers.filter((id) => id !== user.id))}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#171717' }}>{user.full_name}</div>
                      <div style={{ fontSize: 11, color: '#808080', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                    </div>
                    <span className={`lt-badge ${isCompleted(user.status) ? 'lt-badge-success' : isPending(user.status) ? 'lt-badge-warn' : 'lt-badge-blue'}`} style={{ fontSize: 10, flexShrink: 0 }}>
                      {statusLabel(user.status)}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
