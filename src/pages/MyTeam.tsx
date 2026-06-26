import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { applyOrgUserScope } from '../utils/orgUsers';
import {
  Users, BookOpen, CheckCircle, Clock, AlertTriangle,
  ChevronDown, ChevronUp, Search, BarChart3, Award, Filter
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
  overdue: number;
}

interface CourseEnrollment {
  id: string;
  course_id: string;
  status: string;
  enrolled_at: string;
  completed_at: string | null;
  due_date: string | null;
  recurrence_interval: string;
  course: { title: string; is_mandatory: boolean } | null;
}

const T = {
  text: '#171717', textBody: '#4d4d4d', textMuted: '#666', textFaint: '#999',
  border: 'rgba(0,0,0,0.08)', bg: '#ffffff', bgSubtle: '#fafafa', bgSection: '#f5f5f5',
  blue: '#0a72ef', green: '#16a34a', red: '#dc2626', amber: '#d97706',
  shadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
  shadowCard: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px',
};

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
  const [enrollments, setEnrollments] = useState<Record<string, CourseEnrollment[]>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'overdue' | 'completed' | 'in_progress'>('all');
  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [loadingEnrollments, setLoadingEnrollments] = useState<string | null>(null);

  const isAdmin = ['super_admin', 'admin', 'trainer'].includes(profile?.role || '');

  useEffect(() => {
    if (profile) loadTeam();
  }, [profile]);

  async function loadTeam() {
    setLoading(true);
    let query = applyOrgUserScope(
      supabase.from('user_profiles').select('id, full_name, unique_id, department, designation, role, joining_date').eq('is_active', true),
      profile,
    );

    if (!isAdmin) {
      // Non-admin: only see direct reports (manager_id = current user)
      query = query.eq('manager_id', profile!.id);
    } else if (profile?.role === 'trainer') {
      // Trainers see their department
      if (profile.department) query = query.eq('department', profile.department);
    }

    const { data: memberData } = await query.neq('id', profile!.id).order('full_name');
    const teamMembers = memberData || [];
    setMembers(teamMembers);

    // Fetch enrollment stats for all team members
    if (teamMembers.length > 0) {
      const ids = teamMembers.map(m => m.id);
      const { data: enrollData } = await supabase
        .from('user_course_enrollments')
        .select('user_id, status, due_date')
        .in('user_id', ids);

      const statsMap: Record<string, EnrollmentStat> = {};
      for (const m of teamMembers) {
        const userEnrolls = (enrollData || []).filter(e => e.user_id === m.id);
        const now = new Date();
        statsMap[m.id] = {
          user_id: m.id,
          total: userEnrolls.length,
          completed: userEnrolls.filter(e => e.status === 'completed').length,
          in_progress: userEnrolls.filter(e => e.status === 'in_progress').length,
          overdue: userEnrolls.filter(e => e.due_date && new Date(e.due_date) < now && e.status !== 'completed').length,
        };
      }
      setStats(statsMap);
    }
    setLoading(false);
  }

  async function loadMemberEnrollments(memberId: string) {
    setLoadingEnrollments(memberId);
    const { data } = await supabase
      .from('user_course_enrollments')
      .select('id, course_id, status, enrolled_at, completed_at, due_date, recurrence_interval, course:courses(title, is_mandatory)')
      .eq('user_id', memberId)
      .order('enrolled_at', { ascending: false });
    setEnrollments(prev => ({ ...prev, [memberId]: (data || []) as unknown as CourseEnrollment[] }));
    setLoadingEnrollments(null);
  }

  function toggleMember(id: string) {
    if (expandedMember === id) {
      setExpandedMember(null);
    } else {
      setExpandedMember(id);
      if (!enrollments[id]) loadMemberEnrollments(id);
    }
  }

  const filtered = members.filter(m => {
    if (search && !m.full_name.toLowerCase().includes(search.toLowerCase()) && !m.department?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterStatus === 'overdue' && !(stats[m.id]?.overdue > 0)) return false;
    if (filterStatus === 'completed' && stats[m.id]?.completed === 0) return false;
    if (filterStatus === 'in_progress' && stats[m.id]?.in_progress === 0) return false;
    return true;
  });

  const teamStats = {
    total: members.length,
    avgCompletion: members.length > 0 ? Math.round(members.reduce((acc, m) => {
      const s = stats[m.id];
      if (!s || s.total === 0) return acc;
      return acc + (s.completed / s.total) * 100;
    }, 0) / members.length) : 0,
    withOverdue: members.filter(m => stats[m.id]?.overdue > 0).length,
    totalCerts: 0, // computed below
  };

  const formatDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const isOverdue = (e: CourseEnrollment) => e.due_date && new Date(e.due_date) < new Date() && e.status !== 'completed';
  const effectiveStatus = (e: CourseEnrollment) => isOverdue(e) ? 'overdue' : e.status;
  const tenureDays = (joining_date: string | null) => {
    if (!joining_date) return null;
    return Math.floor((Date.now() - new Date(joining_date).getTime()) / 86400000);
  };

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto', paddingBottom: 48 }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: T.text }}>My Team</h1>
          <p style={{ fontSize: 14, color: T.textBody, marginTop: 4 }}>
            {isAdmin ? 'Organisation-wide learning completion overview' : 'Track your direct reports\' learning progress'}
          </p>
        </div>

        {/* Summary Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { icon: Users, label: 'Team Members', value: teamStats.total, color: T.blue },
            { icon: BarChart3, label: 'Avg Completion', value: `${teamStats.avgCompletion}%`, color: T.green },
            { icon: AlertTriangle, label: 'With Overdue', value: teamStats.withOverdue, color: teamStats.withOverdue > 0 ? T.red : T.green },
          ].map(s => (
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

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: T.textFaint }} />
            <input
              style={{ width: '100%', padding: '9px 12px 9px 32px', background: T.bg, boxShadow: T.shadow, border: 'none', borderRadius: 9, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box' }}
              placeholder="Search by name or department..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'overdue', 'in_progress', 'completed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilterStatus(f)}
                style={{ padding: '8px 14px', background: filterStatus === f ? T.text : T.bg, boxShadow: T.shadow, border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', color: filterStatus === f ? 'white' : T.textBody, transition: 'all 0.12s' }}
              >
                {f === 'all' ? 'All' : f === 'in_progress' ? 'In Progress' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.textMuted }}>Loading team data...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <Users size={40} style={{ color: T.border, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>
              {members.length === 0 ? 'No team members found' : 'No members match your filter'}
            </p>
            <p style={{ fontSize: 13, color: T.textMuted }}>
              {members.length === 0 ? 'Team members with you as their manager will appear here.' : 'Try adjusting your search or filter.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(m => {
              const s = stats[m.id] || { total: 0, completed: 0, in_progress: 0, overdue: 0 };
              const compPct = s.total > 0 ? Math.round((s.completed / s.total) * 100) : 0;
              const expanded = expandedMember === m.id;
              const tenure = tenureDays(m.joining_date);
              const memberEnrolls = enrollments[m.id] || [];

              return (
                <div key={m.id} style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, overflow: 'hidden', border: s.overdue > 0 ? `1px solid #fca5a520` : `1px solid transparent` }}>
                  <div
                    onClick={() => toggleMember(m.id)}
                    style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                  >
                    {/* Avatar */}
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                      {m.full_name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>{m.full_name}</span>
                        {m.designation && <span style={{ fontSize: 11, color: T.textMuted }}>{m.designation}</span>}
                        {m.department && <span style={{ fontSize: 11, background: T.bgSection, color: T.textMuted, padding: '1px 6px', borderRadius: 100 }}>{m.department}</span>}
                        {tenure !== null && <span style={{ fontSize: 11, color: T.textFaint }}>{tenure}d tenure</span>}
                      </div>
                      {/* Progress bar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                        <div style={{ flex: 1, height: 4, background: T.bgSection, borderRadius: 2, maxWidth: 200 }}>
                          <div style={{ height: '100%', width: `${compPct}%`, background: compPct === 100 ? T.green : T.blue, borderRadius: 2 }} />
                        </div>
                        <span style={{ fontSize: 11, color: T.textMuted, flexShrink: 0 }}>{compPct}% complete</span>
                      </div>
                    </div>

                    {/* Stats chips */}
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      {[
                        { label: `${s.completed} done`, color: T.green, bg: '#dcfce7', show: s.completed > 0 },
                        { label: `${s.in_progress} active`, color: T.blue, bg: '#dbeafe', show: s.in_progress > 0 },
                        { label: `${s.overdue} overdue`, color: T.red, bg: '#fee2e2', show: s.overdue > 0 },
                        { label: `${s.total} total`, color: T.textMuted, bg: T.bgSection, show: s.total > 0 && s.overdue === 0 && s.in_progress === 0 && s.completed === 0 },
                      ].filter(x => x.show).map(chip => (
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
                        <p style={{ fontSize: 13, color: T.textMuted }}>Loading courses...</p>
                      ) : memberEnrolls.length === 0 ? (
                        <p style={{ fontSize: 13, color: T.textMuted }}>No courses assigned.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <p style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.04em', textTransform: 'uppercase', marginBottom: 4 }}>
                            Assigned Courses ({memberEnrolls.length})
                          </p>
                          {memberEnrolls.map(e => {
                            const effStatus = effectiveStatus(e);
                            const courseTitle = (e.course as any)?.title || 'Course';
                            const isMandatory = (e.course as any)?.is_mandatory;
                            return (
                              <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: T.bg, borderRadius: 8, padding: '9px 12px', boxShadow: T.shadow }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor(effStatus), flexShrink: 0 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                                    {courseTitle}
                                    {isMandatory && <span style={{ fontSize: 9, fontWeight: 700, background: '#fee2e2', color: T.red, padding: '1px 5px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Mandatory</span>}
                                  </div>
                                  <div style={{ fontSize: 11, color: T.textMuted }}>
                                    Enrolled {formatDate(e.enrolled_at)}
                                    {e.completed_at && <> · Completed {formatDate(e.completed_at)}</>}
                                    {e.due_date && effStatus !== 'completed' && (
                                      <span style={{ color: isOverdue(e) ? T.red : T.amber }}> · Due {formatDate(e.due_date)}</span>
                                    )}
                                    {e.recurrence_interval !== 'none' && <> · Recurs {e.recurrence_interval.replace('_', ' ')}</>}
                                  </div>
                                </div>
                                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 100, background: statusBg(effStatus), color: statusColor(effStatus), textTransform: 'capitalize', flexShrink: 0 }}>
                                  {effStatus.replace('_', ' ')}
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
