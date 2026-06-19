import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { Mail, Send, Users, BookOpen, Check } from 'lucide-react';

interface Course {
  id: string;
  title: string;
  status: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  unique_id: string;
  department?: string;
}

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
  <a href="https://app.jointavrion.com/courses" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
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
  <a href="https://app.jointavrion.com/courses" style="display: inline-block; background: #171717; color: #fff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px;">
    Finish Course
  </a>
  <p style="margin-top: 32px; font-size: 12px; color: #808080;">Tavrion Learning Platform · jointavrion.com</p>
</div>`,
  },
};

export function EmailNudges() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [template, setTemplate] = useState<keyof typeof TEMPLATES>('reminder');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('courses').select('id, title, status').eq('status', 'published').order('title'),
      supabase.from('user_profiles').select('id, full_name, email, unique_id, department').eq('is_active', true).order('full_name'),
    ]).then(([{ data: c }, { data: u }]) => {
      if (c) setCourses(c);
      if (u) setUsers(u);
      setLoading(false);
    });
  }, []);

  const usersWithEmail = users.filter(u => u.email && u.email.includes('@'));

  const handleSend = async () => {
    if (!selectedCourse || selectedUsers.length === 0) return;

    setSending(true);
    setResult(null);

    const course = courses.find(c => c.id === selectedCourse);
    const tpl = TEMPLATES[template];

    const recipients = users
      .filter(u => selectedUsers.includes(u.id))
      .map(u => ({ email: u.email, name: u.full_name, courseTitle: course?.title || '' }));

    try {
      const { data, error } = await supabase.functions.invoke('send-email-nudge', {
        body: {
          recipients,
          subject: tpl.subject,
          htmlBody: tpl.body,
          courseId: selectedCourse,
          emailType: template,
        },
      });

      if (error) throw error;

      const sent = data.results?.filter((r: any) => r.status === 'sent').length || 0;
      const failed = data.results?.filter((r: any) => r.status === 'failed').length || 0;
      setResult({ sent, failed });
    } catch (err: any) {
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
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Admin</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717', marginBottom: 4 }}>Email Nudges</h1>
          <p style={{ fontSize: 14, color: '#4d4d4d' }}>Send course reminders and completion nudges to learners</p>
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
          {/* Config panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Course selector */}
            <div className="lt-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <BookOpen size={14} color="#4d4d4d" />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>Select Course</h2>
              </div>
              <select
                value={selectedCourse}
                onChange={e => setSelectedCourse(e.target.value)}
                className="lt-input"
                style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }}
              >
                <option value="">-- Choose a course --</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
            </div>

            {/* Template selector */}
            <div className="lt-card" style={{ padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Mail size={14} color="#4d4d4d" />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>Email Template</h2>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(Object.entries(TEMPLATES) as [keyof typeof TEMPLATES, { label: string; subject: string }][]).map(([key, tpl]) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, cursor: 'pointer', boxShadow: template === key ? 'rgba(0,0,0,0.12) 0px 0px 0px 1.5px' : 'rgba(0,0,0,0.06) 0px 0px 0px 1px', background: template === key ? '#fafafa' : '#fff', transition: 'all 0.1s' }}>
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

          {/* User selector */}
          <div className="lt-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Users size={14} color="#4d4d4d" />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>Recipients ({selectedUsers.length} selected)</h2>
              </div>
              <button
                onClick={() => setSelectedUsers(selectedUsers.length === usersWithEmail.length ? [] : usersWithEmail.map(u => u.id))}
                style={{ fontSize: 12, color: '#666', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}
              >
                {selectedUsers.length === usersWithEmail.length ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              {usersWithEmail.map((user, i) => (
                <label key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px', cursor: 'pointer', borderBottom: i < usersWithEmail.length - 1 ? '1px solid #f5f5f5' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <input type="checkbox" checked={selectedUsers.includes(user.id)}
                    onChange={e => setSelectedUsers(e.target.checked ? [...selectedUsers, user.id] : selectedUsers.filter(id => id !== user.id))} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#171717' }}>{user.full_name}</div>
                    <div style={{ fontSize: 11, color: '#808080', marginTop: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                  </div>
                  {user.department && <span className="lt-badge" style={{ fontSize: 10, flexShrink: 0 }}>{user.department}</span>}
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
