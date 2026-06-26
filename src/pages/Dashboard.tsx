import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { ScormPlayer } from '../components/ScormPlayer';
import {
  BookOpen, Award, Clock, TrendingUp, ArrowRight, FileText, Download, Eye,
  Phone, MessageSquare, Sparkles, Calendar, Users, Activity,
  CheckCircle, Target, Zap, Star, Play, BarChart3, ChevronRight,
  Upload,
} from 'lucide-react';
import { UserCourseEnrollment, Course } from '../types';

const T = {
  text: '#171717', body: '#4d4d4d', muted: '#666666', faint: '#808080',
  bg: '#ffffff', bgSubtle: '#fafafa', bgSection: '#f5f5f5',
  border: 'rgba(0,0,0,0.08)', borderStrong: '#ebebeb',
  shadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
  card: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px, rgba(0,0,0,0.03) 0px 8px 16px -8px',
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function Dashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [enrollments, setEnrollments] = useState<(UserCourseEnrollment & { course: Course })[]>([]);
  const [uploadedCourses, setUploadedCourses] = useState<any[]>([]);
  const [stats, setStats] = useState({ enrolled: 0, inProgress: 0, completed: 0, certificates: 0 });
  const [loading, setLoading] = useState(true);
  const [previewCourse, setPreviewCourse] = useState<any>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [activityFeed, setActivityFeed] = useState<{ id: string; text: string; sub: string; time: string; icon: string }[]>([]);
  const [aiStats, setAiStats] = useState({ mockCalls: 0, tutorSessions: 0, avgScore: 0 });
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [recentQuizzes, setRecentQuizzes] = useState<any[]>([]);

  useEffect(() => { if (profile) fetchAll(); }, [profile]);

  const fetchAll = async () => {
    if (!profile) return;
    try {
      await Promise.all([
        fetchCourses(),
        fetchEvents(),
        fetchActivityFeed(),
        fetchAIStats(),
        fetchLeaderboard(),
        fetchRecentQuizzes(),
      ]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    const { data: enrollmentsData } = await supabase
      .from('user_course_enrollments')
      .select('*, course:courses(*)')
      .eq('user_id', profile!.id)
      .order('enrolled_at', { ascending: false });

    if (enrollmentsData) {
      setEnrollments(enrollmentsData as any);
      const { count: certCount } = await supabase
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile!.id);
      setStats({
        enrolled: enrollmentsData.length,
        inProgress: enrollmentsData.filter(e => e.status === 'in_progress').length,
        completed: enrollmentsData.filter(e => e.status === 'completed').length,
        certificates: certCount || 0,
      });
    }

    const { data: uploadedData } = await supabase
      .from('uploaded_course_assignments')
      .select('*, course:uploaded_courses(*)')
      .eq('user_id', profile!.id)
      .order('created_at', { ascending: false });

    if (uploadedData) setUploadedCourses(uploadedData);
  };

  const fetchEvents = async () => {
    const { data } = await supabase
      .from('events')
      .select('id, title, event_date, location, virtual_link, description')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
      .limit(4);
    if (data) setUpcomingEvents(data);
  };

  const fetchActivityFeed = async () => {
    const feed: typeof activityFeed = [];

    const { data: recent } = await supabase
      .from('user_course_enrollments')
      .select('id, enrolled_at, status, updated_at, course:courses(title)')
      .eq('user_id', profile!.id)
      .order('updated_at', { ascending: false })
      .limit(5);

    (recent || []).forEach((e: any) => {
      const label = e.status === 'completed' ? 'Completed' : e.status === 'in_progress' ? 'Started' : 'Enrolled in';
      feed.push({ id: e.id, text: `${label} "${e.course?.title}"`, sub: 'Learning', time: formatRelative(e.updated_at || e.enrolled_at), icon: 'book' });
    });

    const { data: quizzes } = await supabase
      .from('quiz_attempts')
      .select('id, score, completed_at, quiz:quizzes(title)')
      .eq('user_id', profile!.id)
      .order('completed_at', { ascending: false })
      .limit(3);

    (quizzes || []).forEach((q: any) => {
      feed.push({ id: q.id + '-q', text: `Quiz score: ${q.score}% on "${q.quiz?.title || 'Assessment'}"`, sub: 'Assessment', time: formatRelative(q.completed_at), icon: 'quiz' });
    });

    feed.sort((a, b) => a.time.localeCompare(b.time));
    setActivityFeed(feed.slice(0, 8));
  };

  const fetchAIStats = async () => {
    const { count: mockCount } = await supabase
      .from('mock_call_sessions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile!.id);

    const { count: tutorCount } = await supabase
      .from('ai_chat_history')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profile!.id)
      .eq('role', 'user');

    const { data: scores } = await supabase
      .from('quiz_attempts')
      .select('score')
      .eq('user_id', profile!.id);

    const avg = scores?.length ? Math.round(scores.reduce((a, s) => a + s.score, 0) / scores.length) : 0;

    setAiStats({ mockCalls: mockCount || 0, tutorSessions: tutorCount || 0, avgScore: avg });
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('quiz_attempts')
      .select('user_id, score, user:user_profiles(full_name, department)')
      .order('score', { ascending: false })
      .limit(30);

    if (data) {
      const map = new Map<string, { full_name: string; department: string; scores: number[] }>();
      (data as any[]).forEach(d => {
        if (d.user?.full_name) {
          const ex = map.get(d.user_id) || { full_name: d.user.full_name, department: d.user.department || '', scores: [] as number[] };
          ex.scores.push(d.score);
          map.set(d.user_id, ex);
        }
      });
      const ranked = Array.from(map.entries())
        .map(([id, v]) => ({ user_id: id, full_name: v.full_name, department: v.department, avg: Math.round(v.scores.reduce((a, b) => a + b, 0) / v.scores.length), count: v.scores.length }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 5);
      setTopPerformers(ranked);
    }
  };

  const fetchRecentQuizzes = async () => {
    const { data } = await supabase
      .from('quiz_attempts')
      .select('id, score, completed_at, quiz:quizzes(title)')
      .eq('user_id', profile!.id)
      .order('completed_at', { ascending: false })
      .limit(5);
    if (data) setRecentQuizzes(data as any[]);
  };

  const handleDownloadFile = async (filePath: string, fileName: string) => {
    if (!profile) return;
    try {
      const { data, error } = await supabase.storage.from('course-files').download(filePath);
      if (error) throw error;
      const url = window.URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url; a.download = fileName;
      document.body.appendChild(a); a.click();
      window.URL.revokeObjectURL(url); document.body.removeChild(a);
    } catch (error: any) { alert('Download failed: ' + error.message); }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10 }}>
          <div className="lt-spinner" />
          <span style={{ fontSize: 13, color: T.muted }}>Loading your dashboard...</span>
        </div>
      </Layout>
    );
  }

  const completionRate = stats.enrolled > 0 ? Math.round((stats.completed / stats.enrolled) * 100) : 0;
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const QUICK_ACTIONS = [
    { label: 'Practice Mock Call', sub: 'AI-powered role play', icon: Phone, href: '/mock-calls', color: '#171717' },
    { label: 'AI Tutor', sub: 'Get instant help', icon: MessageSquare, href: '/ai-tutor', color: '#171717' },
    { label: 'My Courses', sub: `${stats.enrolled} assigned`, icon: BookOpen, href: '/courses', color: '#171717' },
    { label: 'Live Call Session', sub: 'Join now', icon: Zap, href: '/live-calls', color: '#171717' },
    { label: 'Social Feed', sub: 'Team updates', icon: Activity, href: '/social', color: '#171717' },
    { label: 'Events', sub: `${upcomingEvents.length} upcoming`, icon: Calendar, href: '/events', color: '#171717' },
  ];

  return (
    <Layout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── HERO ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>{today}</p>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.04em', color: T.text, marginBottom: 4 }}>
              {getGreeting()}, {profile?.full_name?.split(' ')[0]} 👋
            </h1>
            <p style={{ fontSize: 14, color: T.body }}>Here's what's happening with your learning today.</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => navigate('/courses')} className="lt-btn-secondary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, fontSize: 13 }}>
              <BookOpen size={13} /> My Courses
            </button>
            <button onClick={() => navigate('/mock-calls')} className="lt-btn-primary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, fontSize: 13 }}>
              <Phone size={13} /> Practice Call
            </button>
          </div>
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 10 }}>
          {QUICK_ACTIONS.map(action => (
            <Link key={action.href} to={action.href} style={{ textDecoration: 'none' }}>
              <div className="lt-card" style={{ padding: '14px 14px 12px', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'rgba(0,0,0,0.12) 0px 0px 0px 1px, rgba(0,0,0,0.08) 0px 4px 12px'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = T.card; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
              >
                <div style={{ width: 28, height: 28, background: T.bgSection, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: T.shadow }}>
                  <action.icon size={13} color={T.muted} />
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2, lineHeight: 1.2 }}>{action.label}</div>
                <div style={{ fontSize: 10, color: T.faint }}>{action.sub}</div>
              </div>
            </Link>
          ))}
        </div>

        {/* ── STATS ROW ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
          {[
            { key: 'enrolled', label: 'Enrolled', icon: BookOpen, hint: 'Total courses' },
            { key: 'inProgress', label: 'In Progress', icon: Clock, hint: 'Active now' },
            { key: 'completed', label: 'Completed', icon: CheckCircle, hint: 'Finished' },
            { key: 'certificates', label: 'Certificates', icon: Award, hint: 'Earned' },
          ].map(s => (
            <div key={s.key} className="lt-card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ width: 30, height: 30, background: T.bgSection, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadow }}>
                  <s.icon size={13} color={T.muted} />
                </div>
                <span style={{ fontSize: 10, color: T.faint }}>{s.hint}</span>
              </div>
              <div className="lt-stat-num">{stats[s.key as keyof typeof stats]}</div>
              <p style={{ fontSize: 12, color: T.muted, marginTop: 4, fontWeight: 500 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── PROGRESS + AI STATS ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Learning progress */}
          <div className="lt-card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Target size={14} color={T.muted} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Learning Progress</span>
              </div>
              <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.04em', color: T.text }}>{completionRate}%</span>
            </div>
            <div style={{ height: 6, background: T.bgSection, borderRadius: 100, overflow: 'hidden', marginBottom: 14 }}>
              <div style={{ height: '100%', width: `${completionRate}%`, background: T.text, borderRadius: 100, transition: 'width 0.8s ease' }} />
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                { label: 'Assigned', val: stats.enrolled, color: '#aaa' },
                { label: 'Active', val: stats.inProgress, color: '#555' },
                { label: 'Done', val: stats.completed, color: '#171717' },
              ].map(item => (
                <div key={item.label} style={{ flex: 1, textAlign: 'center', padding: '8px 0', background: T.bgSubtle, borderRadius: 7 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: item.color }}>{item.val}</div>
                  <div style={{ fontSize: 10, color: T.faint, marginTop: 2 }}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Stats */}
          <div className="lt-card" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Sparkles size={14} color={T.muted} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>AI Activity</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Mock Call Sessions', val: aiStats.mockCalls, icon: Phone, href: '/mock-calls' },
                { label: 'Tutor Conversations', val: aiStats.tutorSessions, icon: MessageSquare, href: '/ai-tutor' },
                { label: 'Quiz Avg. Score', val: aiStats.avgScore ? `${aiStats.avgScore}%` : '—', icon: BarChart3, href: '/completed-learning' },
              ].map(item => (
                <Link key={item.label} to={item.href} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, background: T.bgSubtle, textDecoration: 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f0f0f0'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = T.bgSubtle; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <item.icon size={12} color={T.muted} />
                    <span style={{ fontSize: 12, color: T.body }}>{item.label}</span>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{item.val}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── ACTIVITY FEED + LEADERBOARD ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {/* Activity feed */}
          <div className="lt-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity size={13} color={T.muted} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Recent Activity</span>
              </div>
              <Link to="/recent-learning" style={{ fontSize: 11, color: T.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>View all <ChevronRight size={10} /></Link>
            </div>
            {activityFeed.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                <Activity size={24} color={T.borderStrong} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: T.muted }}>No activity yet</p>
                <p style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>Start a course to see your activity here</p>
              </div>
            ) : (
              <div>
                {activityFeed.map((item, i) => (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 18px', borderBottom: i < activityFeed.length - 1 ? `1px solid ${T.bgSection}` : 'none' }}>
                    <div style={{ width: 28, height: 28, background: T.bgSection, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {item.icon === 'quiz' ? <BarChart3 size={11} color={T.muted} /> : <BookOpen size={11} color={T.muted} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: T.body, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.text}</p>
                      <p style={{ fontSize: 10, color: T.faint, marginTop: 2 }}>{item.sub} · {item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leaderboard */}
          <div className="lt-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Star size={13} color={T.muted} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Top Performers</span>
              </div>
              <Link to="/completed-learning" style={{ fontSize: 11, color: T.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>View learning <ChevronRight size={10} /></Link>
            </div>
            {topPerformers.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                <Star size={24} color={T.borderStrong} style={{ margin: '0 auto 8px' }} />
                <p style={{ fontSize: 12, color: T.muted }}>No quiz data yet</p>
                <p style={{ fontSize: 11, color: T.faint, marginTop: 2 }}>Complete quizzes to appear on the leaderboard</p>
              </div>
            ) : (
              <div>
                {topPerformers.map((p, i) => (
                  <div key={p.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 18px', borderBottom: i < topPerformers.length - 1 ? `1px solid ${T.bgSection}` : 'none' }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: i === 0 ? T.text : T.bgSection, display: 'flex', alignItems: 'center', justifyContent: 'center', color: i === 0 ? 'white' : T.muted, fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name}</p>
                      <p style={{ fontSize: 10, color: T.faint }}>{p.department || 'No department'} · {p.count} quiz{p.count !== 1 ? 'zes' : ''}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{p.avg}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── UPCOMING EVENTS ── */}
        {upcomingEvents.length > 0 && (
          <div className="lt-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={13} color={T.muted} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Upcoming Events</span>
              </div>
              <Link to="/events" style={{ fontSize: 11, color: T.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>View all <ChevronRight size={10} /></Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
              {upcomingEvents.map((event, i) => (
                <Link key={event.id} to="/events" style={{ textDecoration: 'none', padding: '14px 18px', borderRight: i < upcomingEvents.length - 1 ? `1px solid ${T.bgSection}` : 'none', transition: 'background 0.1s', display: 'block' }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.bgSubtle; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ display: 'inline-block', background: T.bgSection, borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: T.muted, marginBottom: 8, boxShadow: T.shadow }}>
                    {formatDate(event.event_date)}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 4, lineHeight: 1.3 }}>{event.title}</p>
                  {event.location && <p style={{ fontSize: 11, color: T.faint, display: 'flex', alignItems: 'center', gap: 4 }}><Calendar size={9} /> {event.location}</p>}
                  {event.virtual_link && !event.location && <p style={{ fontSize: 11, color: T.faint }}>Virtual event</p>}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── RECENT QUIZ SCORES ── */}
        {recentQuizzes.length > 0 && (
          <div className="lt-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChart3 size={13} color={T.muted} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Recent Quiz Results</span>
              </div>
            </div>
            <div style={{ display: 'flex' }}>
              {recentQuizzes.map((q: any, i) => (
                <div key={q.id} style={{ flex: 1, padding: '16px 18px', borderRight: i < recentQuizzes.length - 1 ? `1px solid ${T.bgSection}` : 'none', textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.04em', color: q.score >= 80 ? '#1a7f1a' : q.score >= 60 ? '#a06000' : T.text }}>{q.score}%</div>
                  <p style={{ fontSize: 11, color: T.body, marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.quiz?.title || 'Quiz'}</p>
                  <p style={{ fontSize: 10, color: T.faint, marginTop: 2 }}>{formatRelative(q.completed_at)}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MY COURSES ── */}
        <div className="lt-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <BookOpen size={13} color={T.muted} />
              <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>My Courses</span>
              {stats.enrolled > 0 && <span className="lt-badge">{stats.enrolled}</span>}
            </div>
            <Link to="/courses" style={{ fontSize: 11, color: T.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>All courses <ChevronRight size={10} /></Link>
          </div>

          {enrollments.length === 0 ? (
            <div style={{ padding: '40px 18px', textAlign: 'center' }}>
              <BookOpen size={28} color={T.borderStrong} style={{ margin: '0 auto 10px' }} />
              <p style={{ fontSize: 13, color: T.muted }}>No courses assigned yet</p>
              <p style={{ fontSize: 11, color: T.faint, marginTop: 3 }}>Check back later for new assignments</p>
            </div>
          ) : (
            <div>
              {enrollments.slice(0, 5).map((enrollment, i) => (
                <Link key={enrollment.id} to={`/courses/${enrollment.course_id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', textDecoration: 'none', borderBottom: i < Math.min(enrollments.length, 5) - 1 ? `1px solid ${T.bgSection}` : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => { e.currentTarget.style.background = T.bgSubtle; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <div style={{ width: 32, height: 32, background: T.bgSection, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: T.shadow }}>
                    <Play size={11} color={T.muted} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{enrollment.course.title}</p>
                    {enrollment.course.description && (
                      <p style={{ fontSize: 11, color: T.muted, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{enrollment.course.description}</p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {enrollment.course.is_mandatory && <span className="lt-badge lt-badge-error">Mandatory</span>}
                    <span className={`lt-badge ${enrollment.status === 'completed' ? 'lt-badge-success' : enrollment.status === 'in_progress' ? 'lt-badge-blue' : ''}`}>
                      {enrollment.status.replace('_', ' ')}
                    </span>
                    <ArrowRight size={12} color={T.faint} />
                  </div>
                </Link>
              ))}
              {enrollments.length > 5 && (
                <div style={{ padding: '10px 18px', textAlign: 'center' }}>
                  <Link to="/courses" style={{ fontSize: 12, color: T.muted, textDecoration: 'none' }}>+{enrollments.length - 5} more courses →</Link>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── UPLOADED MATERIALS ── */}
        {uploadedCourses.length > 0 && (
          <div className="lt-card" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.borderStrong}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Upload size={13} color={T.muted} />
                <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>Course Materials</span>
                <span className="lt-badge">{uploadedCourses.length}</span>
              </div>
            </div>
            <div>
              {uploadedCourses.slice(0, 4).map((assignment, i) => (
                <div key={assignment.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 18px', borderBottom: i < Math.min(uploadedCourses.length, 4) - 1 ? `1px solid ${T.bgSection}` : 'none' }}>
                  <div style={{ width: 32, height: 32, background: T.bgSection, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: T.shadow }}>
                    <FileText size={12} color={T.muted} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{assignment.course.title}</p>
                    <p style={{ fontSize: 10, color: T.faint, marginTop: 2 }}>{assignment.course.file_type?.toUpperCase()} · {formatFileSize(assignment.course.file_size)}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span className={`lt-badge ${assignment.status === 'completed' ? 'lt-badge-success' : assignment.status === 'downloaded' ? 'lt-badge-blue' : ''}`}>
                      {assignment.status}
                    </span>
                    {assignment.course.file_type === 'zip' && (
                      <button onClick={() => setPreviewCourse(assignment.course)} className="lt-btn-secondary" style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                        <Eye size={10} /> Preview
                      </button>
                    )}
                    <button onClick={() => handleDownloadFile(assignment.course.file_path, assignment.course.file_name)} className="lt-btn-primary" style={{ padding: '5px 10px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                      <Download size={10} /> Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {previewCourse && previewCourse.file_type === 'zip' && (
        <ScormPlayer
          courseId={previewCourse.id}
          courseTitle={previewCourse.title}
          filePath={previewCourse.file_path}
          fileName={previewCourse.file_name}
          onClose={() => setPreviewCourse(null)}
          onComplete={async () => {
            if (profile) {
              await supabase.from('uploaded_course_assignments')
                .update({ status: 'completed', completed_at: new Date().toISOString(), progress_percentage: 100 })
                .eq('user_id', profile.id)
                .eq('course_id', previewCourse.id);
              fetchCourses();
            }
            setPreviewCourse(null);
          }}
        />
      )}
    </Layout>
  );
}
