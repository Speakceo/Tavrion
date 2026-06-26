import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
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
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const selectedCourse = useMemo(() => {
    if (!selectedCourseKey) return null;
    const [kind, id] = selectedCourseKey.split(':') as [CourseKind, string];
    return courses.find((c) => c.kind === kind && c.id === id) || null;
  }, [selectedCourseKey, courses]);

  useEffect(() => {
    Promise.all([
      supabase.from('courses').select('id, title, status').order('title'),
      supabase.from('uploaded_courses').select('id, title').order('title'),
    ]).then(([{ data: builtin }, { data: uploaded }]) => {
      const list: CourseOption[] = [
        ...(builtin || []).map((c) => ({ id: c.id, title: c.title, kind: 'builtin' as const, status: c.status })),
        ...(uploaded || []).map((c) => ({ id: c.id, title: c.title, kind: 'uploaded' as const })),
      ];
      setCourses(list);
      setLoading(false);
    });
  }, []);

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
        email: resolveRecipientEmail(u, orgEmailDomain),
        name: u.full_name,
        courseTitle: selectedCourse.title,
      }))
      .filter((recipient) => recipient.email.includes('@'));

    try {
      const { data, error } = await supabase.functions.invoke('send-email-nudge', {
        body: {
          recipients,
          subject: tpl.subject,
          htmlBody: tpl.body,
          courseId: selectedCourse.id,
          emailType: template,
        },
      });

      if (error) throw error;

      const sent = data.results?.filter((r: { status: string }) => r.status === 'sent').length || 0;
      const failed = data.results?.filter((r: { status: string }) => r.status === 'failed').length || 0;
      setResult({ sent, failed });
    } catch (err) {
      console.error('Error sending nudges:', err);
      setResult({ sent: 0, failed: selectedUsers.length });
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
          <p style={{ fontSize: 14, color: '#4d4d4d' }}>Select a course, filter by completion status, and nudge pending learners</p>
        </div>

        {result && (
          <div style={{ background: result.failed === 0 ? '#f0faf0' : '#fff5f5', boxShadow: `${result.failed === 0 ? '#1a7f1a' : '#ff5b4f'}50 0px 0px 0px 1px`, borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Check size={14} color={result.failed === 0 ? '#1a7f1a' : '#c0392b'} />
            <span style={{ fontSize: 14, color: result.failed === 0 ? '#1a7f1a' : '#c0392b', fontWeight: 600 }}>
              {result.sent} email{result.sent !== 1 ? 's' : ''} sent successfully{result.failed > 0 ? `, ${result.failed} failed` : ''}.
            </span>
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
                <p style={{ fontSize: 12, color: '#808080', marginTop: 8 }}>No courses found. Upload a course or publish a built-in course first.</p>
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
