import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { applyOrgUserScope } from '../../utils/orgUsers';
import { applyOrgScope } from '../../utils/orgScope';
import { Users, BookOpen, TrendingUp, Award, Activity, Building2 } from 'lucide-react';

interface RecentActivity {
  enrollments: number;
  quizAttempts: number;
  mockCalls: number;
}

interface TopPerformer {
  user_id: string;
  full_name: string;
  department: string;
  avg_score: number;
}

function filterByOrgUsers<T extends { user_id?: string }>(
  rows: T[] | null | undefined,
  orgUserIds: Set<string>,
): T[] {
  if (!rows?.length || orgUserIds.size === 0) return [];
  return rows.filter((row) => row.user_id && orgUserIds.has(row.user_id));
}

export function Analytics() {
  const { profile, organization } = useAuth();
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    completionRate: 0,
    avgScore: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    enrollments: 0,
    quizAttempts: 0,
    mockCalls: 0,
  });
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile) fetchAnalytics();
  }, [profile]);

  const fetchAnalytics = async () => {
    if (!profile) return;

    try {
      setLoading(true);

      const { data: users } = await applyOrgUserScope(
        supabase.from('user_profiles').select('id, is_active'),
        profile,
      );

      const orgUsers = users || [];
      const orgUserIds = new Set(orgUsers.map((u) => u.id));
      const totalUsers = orgUsers.length;
      const activeUsers = orgUsers.filter((u) => u.is_active).length;

      const { data: uploadedCourses } = await applyOrgScope(
        supabase.from('uploaded_courses').select('id'),
        profile,
      );

      let enrollmentsQuery = supabase
        .from('user_course_enrollments')
        .select('id, status, user_id, course_id');

      let quizQuery = supabase
        .from('quiz_attempts')
        .select('id, score, user_id');

      if (orgUserIds.size > 0) {
        const ids = [...orgUserIds];
        enrollmentsQuery = enrollmentsQuery.in('user_id', ids);
        quizQuery = quizQuery.in('user_id', ids);
      } else {
        enrollmentsQuery = enrollmentsQuery.in('user_id', ['00000000-0000-0000-0000-000000000000']);
        quizQuery = quizQuery.in('user_id', ['00000000-0000-0000-0000-000000000000']);
      }

      const [{ data: enrollments }, { data: quizAttempts }] = await Promise.all([
        enrollmentsQuery,
        quizQuery,
      ]);

      const scopedEnrollments = filterByOrgUsers(enrollments, orgUserIds);
      const scopedQuizAttempts = filterByOrgUsers(quizAttempts, orgUserIds);

      const enrolledBuiltinIds = new Set(
        scopedEnrollments.map((e: { course_id?: string }) => e.course_id).filter(Boolean) as string[],
      );
      const uploadedIds = (uploadedCourses || []).map((c) => c.id);
      const totalCourses = new Set([...uploadedIds, ...enrolledBuiltinIds]).size;

      const completedEnrollments = scopedEnrollments.filter((e) => e.status === 'completed').length;
      const completionRate = scopedEnrollments.length
        ? Math.round((completedEnrollments / scopedEnrollments.length) * 100)
        : 0;
      const avgScore = scopedQuizAttempts.length
        ? Math.round(scopedQuizAttempts.reduce((acc, q) => acc + (q.score || 0), 0) / scopedQuizAttempts.length)
        : 0;

      setStats({
        totalUsers,
        activeUsers,
        totalCourses,
        completionRate,
        avgScore,
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const since = sevenDaysAgo.toISOString();

      let recentEnrollmentsQuery = supabase
        .from('user_course_enrollments')
        .select('id, user_id')
        .gte('enrolled_at', since);

      let recentQuizQuery = supabase
        .from('quiz_attempts')
        .select('id, user_id')
        .gte('completed_at', since);

      let recentMockQuery = supabase
        .from('mock_call_sessions')
        .select('id, user_id')
        .gte('completed_at', since);

      if (orgUserIds.size > 0) {
        const ids = [...orgUserIds];
        recentEnrollmentsQuery = recentEnrollmentsQuery.in('user_id', ids);
        recentQuizQuery = recentQuizQuery.in('user_id', ids);
        recentMockQuery = recentMockQuery.in('user_id', ids);
      } else {
        recentEnrollmentsQuery = recentEnrollmentsQuery.in('user_id', ['00000000-0000-0000-0000-000000000000']);
        recentQuizQuery = recentQuizQuery.in('user_id', ['00000000-0000-0000-0000-000000000000']);
        recentMockQuery = recentMockQuery.in('user_id', ['00000000-0000-0000-0000-000000000000']);
      }

      const [
        { data: recentEnrollments },
        { data: recentQuizAttempts },
        { data: recentMockCalls },
      ] = await Promise.all([
        recentEnrollmentsQuery,
        recentQuizQuery,
        recentMockQuery,
      ]);

      setRecentActivity({
        enrollments: filterByOrgUsers(recentEnrollments, orgUserIds).length,
        quizAttempts: filterByOrgUsers(recentQuizAttempts, orgUserIds).length,
        mockCalls: filterByOrgUsers(recentMockCalls, orgUserIds).length,
      });

      let performersQuery = supabase
        .from('quiz_attempts')
        .select('user_id, score, user:user_profiles(full_name, department, is_active, organization_id)')
        .order('score', { ascending: false });

      if (orgUserIds.size > 0) {
        performersQuery = performersQuery.in('user_id', [...orgUserIds]);
      }

      const { data: performersData } = await performersQuery;

      if (performersData?.length) {
        const userScores = new Map<string, { full_name: string; department: string; scores: number[] }>();

        performersData.forEach((attempt: {
          user_id: string;
          score: number;
          user: { full_name: string; department?: string; is_active?: boolean } | { full_name: string; department?: string; is_active?: boolean }[] | null;
        }) => {
          const user = Array.isArray(attempt.user) ? attempt.user[0] : attempt.user;
          if (!user?.full_name || user.is_active === false || !orgUserIds.has(attempt.user_id)) return;

          if (!userScores.has(attempt.user_id)) {
            userScores.set(attempt.user_id, {
              full_name: user.full_name,
              department: user.department || 'N/A',
              scores: [],
            });
          }
          userScores.get(attempt.user_id)!.scores.push(attempt.score);
        });

        const performers: TopPerformer[] = Array.from(userScores.entries())
          .map(([user_id, data]) => ({
            user_id,
            full_name: data.full_name,
            department: data.department,
            avg_score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
          }))
          .sort((a, b) => b.avg_score - a.avg_score)
          .slice(0, 3);

        setTopPerformers(performers);
      } else {
        setTopPerformers([]);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
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
      <div>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Admin</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717', marginBottom: 4 }}>Analytics</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, color: '#4d4d4d' }}>Learning outcomes for your organisation</p>
            {organization && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#4d4d4d', background: '#f5f5f5', padding: '3px 10px', borderRadius: 9999, boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                <Building2 size={10} /> {organization.name}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ marginBottom: 24 }}>
          {[
            { label: 'Active Users', value: stats.activeUsers, sub: stats.totalUsers !== stats.activeUsers ? `${stats.totalUsers} total in org` : 'In your organisation', Icon: Users },
            { label: 'Published Courses', value: stats.totalCourses, sub: 'Platform-wide catalogue', Icon: BookOpen },
            { label: 'Completion Rate', value: `${stats.completionRate}%`, sub: 'Your org learners', Icon: TrendingUp },
            { label: 'Avg Quiz Score', value: `${stats.avgScore}%`, sub: 'Your org learners', Icon: Award },
          ].map(({ label, value, sub, Icon }) => (
            <div key={label} className="lt-card" style={{ padding: '18px 20px' }}>
              <div style={{ width: 32, height: 32, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                <Icon size={14} color="#808080" />
              </div>
              <div className="lt-stat-num">{value}</div>
              <div style={{ fontSize: 12, color: '#666666', marginTop: 4 }}>{label}</div>
              {sub && <div style={{ fontSize: 11, color: '#808080', marginTop: 2 }}>{sub}</div>}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="lt-card" style={{ padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              <Activity size={15} color="#4d4d4d" />
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#171717' }}>Recent Activity</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[
                { label: 'Course Enrollments', sub: 'Last 7 days · your org', value: recentActivity.enrollments },
                { label: 'Quiz Attempts', sub: 'Last 7 days · your org', value: recentActivity.quizAttempts },
                { label: 'Mock Call Sessions', sub: 'Last 7 days · your org', value: recentActivity.mockCalls },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#171717' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#808080', marginTop: 2 }}>{item.sub}</div>
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717' }}>{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="lt-card" style={{ padding: '20px 24px' }}>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#171717', marginBottom: 20 }}>Top Performers</h2>
            {topPerformers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {topPerformers.map((performer, index) => (
                  <div key={performer.user_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', background: index === 0 ? '#fafafa' : 'transparent', borderRadius: 8, boxShadow: index === 0 ? 'rgba(0,0,0,0.05) 0px 0px 0px 1px' : 'none' }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: index === 0 ? '#171717' : '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: index === 0 ? 'white' : '#4d4d4d', fontWeight: 700, fontSize: 13 }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#171717' }}>{performer.full_name}</div>
                      <div style={{ fontSize: 11, color: '#808080' }}>{performer.department}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#171717' }}>{performer.avg_score}%</div>
                      <div style={{ fontSize: 10, color: '#808080' }}>Avg Score</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <Award size={28} color="#ddd" style={{ margin: '0 auto 10px' }} />
                <p style={{ fontSize: 13, color: '#808080' }}>No quiz data available yet</p>
                <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Top performers will appear here once your learners start taking quizzes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
