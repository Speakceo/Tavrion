import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { applyOrgUserScope } from '../utils/orgUsers';
import { getAssignmentStatusLabel } from '../utils/uploadedCourseDisplay';
import {
  Users, CheckCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Search, BarChart3, BookOpen,
} from 'lucide-react';

interface TeamMember {
  id: string;
  full_name: string;
  unique_id: string;
  department: string | null;
  designation: string | null;
  role: string;
  joining_date: string | null;
}

interface EnrollmentStat {
  user_id: string;
  total: number;
  completed: number;
  in_progress: number;
  not_started: number;
  overdue: number;
}

interface CourseRow {
  id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  due_date: string | null;
  recurrence_interval?: string | null;
  progress_percentage?: number | null;
  source: 'builtin' | 'uploaded';
  title: string;
  is_mandatory?: boolean;
}

const T = {
  text: '#171717', textBody: '#4d4d4d', textMuted: '#666', textFaint: '#999',
  border: 'rgba(0,0,0,0.08)', bg: '#ffffff', bgSubtle: '#fafafa', bgSection: '#f5f5f5',
  blue: '#0a72ef', green: '#16a34a', red: '#dc2626', amber: '#d97706',
  shadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
  shadowCard: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px',
};

function normalizeStatus(status: string) {
  if (status === 'completed') return 'completed';
  if (['in_progress', 'viewed', 'downloaded'].includes(status)) return 'in_progress';
  return 'not_started';
}

function statusColor(s: string) {
  if (s === 'completed') return T.green;
  if (s === 'in_progress') return T.blue;
  if (s === 'overdue') return T.red;
  return T.textMuted;
}

function statusBg(s: string) {
  if (s === 'completed') return '#dcfce7';
  if (s === 'in_progress') return '#dbeafe';
  if (s === 'overdue') return '#fee2e2';
  return T.bgSection;
}

export function MyTeam() {
  const { profile } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [stats, setStats] = useState<Record<string, EnrollmentStat>>({});
  const [enrollments, setEnrollments] = useState<Record<string, CourseRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'completed' | 'in_progress' | 'not_started'>('all');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [loadingEnrollments, setLoadingEnrollments] = useState<string | null>(null);

  const isAdmin = ['super_admin', 'admin', 'trainer'].includes(profile?.role || '');

  useEffect(() => {
    if (profile) void loadTeam();
  }, [profile]);

  async function loadTeam() {
    if (!profile) return;
    setLoading(true);

    // Course tracking should focus on learners (employees), not other admins/test staff accounts.
    let query = applyOrgUserScope(
      supabase
        .from('user_profiles')
        .select('id, full_name, unique_id, department, designation, role, joining_date')
        .eq('is_active', true)
        .eq('role', 'employee'),
      profile,
    );

    if (!isAdmin) {
      query = query.eq('manager_id', profile.id);
    } else if (profile.role === 'trainer' && profile.department) {
      query = query.eq('department', profile.department);
    }

    const { data: memberData } = await query.neq('id', profile.id).order('full_name');
    const teamMembers = (memberData || []) as TeamMember[];
    setMembers(teamMembers);

    if (teamMembers.length === 0) {
      setStats({});
      setLoading(false);
      return;
    }

    const ids = teamMembers.map((m) => m.id);
    const [{ data: builtinData }, { data: uploadedData }] = await Promise.all([
      supabase
        .from('user_course_enrollments')
        .select('user_id, status, due_date')
        .in('user_id', ids),
      supabase
        .from('uploaded_course_assignments')
        .select('user_id, status')
        .in('user_id', ids),
    ]);

    const statsMap: Record<string, EnrollmentStat> = {};
    const now = new Date();

    for (const member of teamMembers) {
      const builtin = (builtinData || []).filter((e) => e.user_id === member.id);
      const uploaded = (uploadedData || []).filter((e) => e.user_id === member.id);
      const allStatuses = [
        ...builtin.map((e) => ({ status: e.status, due_date: e.due_date as string | null })),
        ...uploaded.map((e) => ({ status: e.status, due_date: null as string | null })),
      ];

      statsMap[member.id] = {
        user_id: member.id,
        total: allStatuses.length,
        completed: allStatuses.filter((e) => normalizeStatus(e.status) === 'completed').length,
        in_progress: allStatuses.filter((e) => normalizeStatus(e.status) === 'in_progress').length,
        not_started: allStatuses.filter((e) => normalizeStatus(e.status) === 'not_started').length,
        overdue: allStatuses.filter(
          (e) => e.due_date && new Date(e.due_date) < now && normalizeStatus(e.status) !== 'completed',
        ).length,
      };
    }

    setStats(statsMap);
    setLoading(false);
  }

  async function loadMemberEnrollments(memberId: string) {
    setLoadingEnrollments(memberId);

    const [{ data: builtin }, { data: uploaded }] = await Promise.all([
      supabase
        .from('user_course_enrollments')
        .select('id, course_id, status, enrolled_at, completed_at, due_date, recurrence_interval, course:courses(title, is_mandatory)')
        .eq('user_id', memberId)
        .order('enrolled_at', { ascending: false }),
      supabase
        .from('uploaded_course_assignments')
        .select('id, course_id, status, created_at, completed_at, viewed_at, progress_percentage, course:uploaded_courses(title)')
        .eq('user_id', memberId)
        .order('created_at', { ascending: false }),
    ]);

    const rows: CourseRow[] = [
      ...(builtin || []).map((e: any) => ({
        id: `builtin-${e.id}`,
        course_id: e.course_id,
        status: e.status,
        enrolled_at: e.enrolled_at,
        completed_at: e.completed_at,
        due_date: e.due_date,
        recurrence_interval: e.recurrence_interval,
        source: 'builtin' as const,
        title: e.course?.title || 'Course',
        is_mandatory: Boolean(e.course?.is_mandatory),
      })),
      ...(uploaded || []).map((e: any) => ({
        id: `uploaded-${e.id}`,
        course_id: e.course_id,
        status: e.status,
        enrolled_at: e.created_at,
        completed_at: e.completed_at,
        due_date: null,
        progress_percentage: e.progress_percentage,
        source: 'uploaded' as const,
        title: e.course?.title || 'Uploaded course',
        is_mandatory: false,
      })),
    ].sort((a, b) => new Date(b.enrolled_at).getTime() - new Date(a.enrolled_at).getTime());

    setEnrollments((prev) => ({ ...prev, [memberId]: rows }));
    setLoadingEnrollments(null);
  }

  function toggleMember(id: string) {
    if (expandedMember === id) {
      setExpandedMember(null);
      return;
    }
    setExpandedMember(id);
    if (!enrollments[id]) void loadMemberEnrollments(id);
  }

  const filtered = members.filter((m) => {
    if (
      search
      && !m.full_name.toLowerCase().includes(search.toLowerCase())
      && !m.department?.toLowerCase().includes(search.toLowerCase())
    ) {
      return false;
    }
    const s = stats[m.id];
    if (filterStatus === 'overdue' && !(s?.overdue > 0)) return false;
    if (filterStatus === 'completed' && !(s?.completed > 0)) return false;
    if (filterStatus === 'in_progress' && !(s?.in_progress > 0)) return false;
    if (filterStatus === 'not_started' && !(s?.not_started > 0)) return false;
    return true;
  });

  const teamStats = useMemo(() => {
    const withCourses = members.filter((m) => (stats[m.id]?.total || 0) > 0);
    const avgCompletion = withCourses.length > 0
      ? Math.round(
        withCourses.reduce((acc, m) => {
          const s = stats[m.id];
          return acc + ((s.completed / s.total) * 100);
        }, 0) / withCourses.length,
      )
      : 0;

    return {
      total: members.length,
      assigned: withCourses.length,
      avgCompletion,
      withOverdue: members.filter((m) => (stats[m.id]?.overdue || 0) > 0).length,
      totalCourses: members.reduce((acc, m) => acc + (stats[m.id]?.total || 0), 0),
      completedCourses: members.reduce((acc, m) => acc + (stats[m.id]?.completed || 0), 0),
    };
  }, [members, stats]);

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const isOverdue = (e: CourseRow) =>
    Boolean(e.due_date && new Date(e.due_date) < new Date() && normalizeStatus(e.status) !== 'completed');
  const effectiveStatus = (e: CourseRow) => (isOverdue(e) ? 'overdue' : normalizeStatus(e.status));
  const tenureDays = (joining_date: string | null) => {
    if (!joining_date) return null;
    return Math.floor((Date.now() - new Date(joining_date).getTime()) / 86400000);
  };

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 48 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: T.text }}>My Team</h1>
          <p style={{ fontSize: 14, color: T.textBody, marginTop: 4 }}>
            {isAdmin
              ? 'Learner progress across assigned modules and uploaded courses'
              : 'Track your direct reports learning progress'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(170px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { icon: Users, label: 'Learners', value: teamStats.total, color: T.blue },
            { icon: BookOpen, label: 'Course assignments', value: teamStats.totalCourses, color: T.text },
            { icon: CheckCircle, label: 'Completed', value: teamStats.completedCourses, color: T.green },
            { icon: BarChart3, label: 'Avg completion', value: `${teamStats.avgCompletion}%`, color: T.green },
            { icon: AlertTriangle, label: 'With overdue', value: teamStats.withOverdue, color: teamStats.withOverdue > 0 ? T.red : T.green },
          ].map((s) => (
            <div key={s.label} style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <s.icon size={15} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: T.text }}>{s.value}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T.textFaint }} />
            <input
              style={{ width: '100%', padding: '9px 12px 9px 32px', background: T.bg, boxShadow: T.shadow, border: 'none', borderRadius: 9, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box' }}
              placeholder="Search by name or department..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {([
              ['all', 'All'],
              ['not_started', 'Not started'],
              ['in_progress', 'In progress'],
              ['completed', 'Completed'],
              ['overdue', 'Overdue'],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                onClick={() => setFilterStatus(value)}
                style={{ padding: '8px 14px', background: filterStatus === value ? T.text : T.bg, boxShadow: T.shadow, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: filterStatus === value ? 'white' : T.textBody }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.textMuted }}>Loading team data…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <Users size={40} style={{ color: T.border, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>
              {members.length === 0 ? 'No learners found' : 'No members match your filter'}
            </p>
            <p style={{ fontSize: 13, color: T.textMuted }}>
              {members.length === 0
                ? (isAdmin
                  ? 'Active employees in your organisation will appear here once created.'
                  : 'People with you set as their manager will appear here.')
                : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map((m) => {
              const s = stats[m.id] || { total: 0, completed: 0, in_progress: 0, not_started: 0, overdue: 0 };
              const compPct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
              const expanded = expandedMember === m.id;
              const tenure = tenureDays(m.joining_date);
              const memberEnrolls = enrollments[m.id] || [];

              return (
                <div key={m.id} style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, overflow: 'hidden', border: s.overdue > 0 ? '1px solid #fca5a520' : '1px solid transparent' }}>
                  <div onClick={() => toggleMember(m.id)} style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {m.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{m.full_name}</span>
                        {m.designation && <span style={{ fontSize: 11, color: T.textMuted }}>{m.designation}</span>}
                        {m.department && <span style={{ fontSize: 11, background: T.bgSection, color: T.textMuted, padding: '1px 6px', borderRadius: 100 }}>{m.department}</span>}
                        {tenure !== null && <span style={{ fontSize: 11, color: T.textFaint }}>{tenure}d tenure</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <div style={{ flex: 1, height: 4, background: T.bgSection, borderRadius: 2, maxWidth: 200 }}>
                          <div style={{ height: '100%', width: `${compPct}%`, background: compPct === 100 ? T.green : T.blue, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0 }}>
                          {s.total === 0 ? 'No courses assigned' : `${compPct}% complete · ${s.completed}/${s.total}`}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {[
                        { label: `${s.completed} done`, color: T.green, bg: '#dcfce7', show: s.completed > 0 },
                        { label: `${s.in_progress} active`, color: T.blue, bg: '#dbeafe', show: s.in_progress > 0 },
                        { label: `${s.not_started} pending`, color: T.textMuted, bg: T.bgSection, show: s.not_started > 0 },
                        { label: `${s.overdue} overdue`, color: T.red, bg: '#fee2e2', show: s.overdue > 0 },
                      ].filter((x) => x.show).map((chip) => (
                        <span key={chip.label} style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 100, background: chip.bg, color: chip.color }}>
                          {chip.label}
                        </span>
                      ))}
                    </div>
                    <button style={{ padding: 4, background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, flexShrink: 0 }}>
                      {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                  </div>

                  {expanded && (
                    <div style={{ borderTop: `1px solid ${T.border}`, background: T.bgSubtle, padding: '14px 20px' }}>
                      {loadingEnrollments === m.id ? (
                        <p style={{ fontSize: 13, color: T.textMuted }}>Loading courses…</p>
                      ) : memberEnrolls.length === 0 ? (
                        <p style={{ fontSize: 13, color: T.textMuted }}>No courses assigned yet.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
                            Assigned courses ({memberEnrolls.length})
                          </p>
                          {memberEnrolls.map((e) => {
                            const effStatus = effectiveStatus(e);
                            return (
                              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.bg, borderRadius: 8, padding: '9px 12px', boxShadow: T.shadow }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(effStatus), flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                    {e.title}
                                    {e.is_mandatory && (
                                      <span style={{ fontSize: 9, fontWeight: 700, background: '#fee2e2', color: T.red, padding: '1px 5px', borderRadius: 100, textTransform: 'uppercase' }}>Mandatory</span>
                                    )}
                                    <span style={{ fontSize: 10, fontWeight: 600, color: T.textFaint, background: T.bgSection, padding: '1px 6px', borderRadius: 100 }}>
                                      {e.source === 'uploaded' ? 'Uploaded' : 'Module'}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: 11, color: T.textMuted }}>
                                    Assigned {formatDate(e.enrolled_at)}
                                    {e.completed_at && <> · Completed {formatDate(e.completed_at)}</>}
                                    {e.due_date && effStatus !== 'completed' && (
                                      <span style={{ color: isOverdue(e) ? T.red : T.amber }}> · Due {formatDate(e.due_date)}</span>
                                    )}
                                    {typeof e.progress_percentage === 'number' && e.source === 'uploaded' && (
                                      <> · {e.progress_percentage}%</>
                                    )}
                                  </div>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: statusBg(effStatus), color: statusColor(effStatus), flexShrink: 0 }}>
                                  {effStatus === 'overdue' ? 'Overdue' : getAssignmentStatusLabel(e.status)}
                                </span>
                              </div>
                            );
                          })}
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
    </Layout>
  );
}
