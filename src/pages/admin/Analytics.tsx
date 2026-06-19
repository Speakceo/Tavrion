import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { Users, BookOpen, TrendingUp, Award, Activity } from 'lucide-react';

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

export function Analytics() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalCourses: 0,
    completionRate: 0,
    avgScore: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity>({
    enrollments: 0,
    quizAttempts: 0,
    mockCalls: 0
  });
  const [topPerformers, setTopPerformers] = useState<TopPerformer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, is_active');

      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('status', 'published');

      const { data: enrollments } = await supabase
        .from('user_course_enrollments')
        .select('id, status');

      const { data: quizAttempts } = await supabase
        .from('quiz_attempts')
        .select('score');

      const totalUsers = users?.length || 0;
      const activeUsers = users?.filter(u => u.is_active).length || 0;
      const totalCourses = courses?.length || 0;
      const completedEnrollments = enrollments?.filter(e => e.status === 'completed').length || 0;
      const completionRate = enrollments?.length ? Math.round((completedEnrollments / enrollments.length) * 100) : 0;
      const avgScore = quizAttempts?.length
        ? Math.round(quizAttempts.reduce((acc, q) => acc + q.score, 0) / quizAttempts.length)
        : 0;

      setStats({
        totalUsers,
        activeUsers,
        totalCourses,
        completionRate,
        avgScore
      });

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentEnrollments } = await supabase
        .from('user_course_enrollments')
        .select('id')
        .gte('enrolled_at', sevenDaysAgo.toISOString());

      const { data: recentQuizAttempts } = await supabase
        .from('quiz_attempts')
        .select('id')
        .gte('created_at', sevenDaysAgo.toISOString());

      const { data: recentMockCalls } = await supabase
        .from('ai_chat_history')
        .select('id')
        .gte('created_at', sevenDaysAgo.toISOString());

      setRecentActivity({
        enrollments: recentEnrollments?.length || 0,
        quizAttempts: recentQuizAttempts?.length || 0,
        mockCalls: recentMockCalls?.length || 0
      });

      const { data: performersData } = await supabase
        .from('quiz_attempts')
        .select('user_id, score, user:user_profiles(full_name, department)')
        .order('score', { ascending: false });

      if (performersData && performersData.length > 0) {
        const userScores = new Map<string, { full_name: string; department: string; scores: number[] }>();

        performersData.forEach((attempt: any) => {
          if (attempt.user && attempt.user.full_name) {
            const userId = attempt.user_id;
            if (!userScores.has(userId)) {
              userScores.set(userId, {
                full_name: attempt.user.full_name,
                department: attempt.user.department || 'N/A',
                scores: []
              });
            }
            userScores.get(userId)!.scores.push(attempt.score);
          }
        });

        const performers: TopPerformer[] = Array.from(userScores.entries())
          .map(([user_id, data]) => ({
            user_id,
            full_name: data.full_name,
            department: data.department,
            avg_score: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
          }))
          .sort((a, b) => b.avg_score - a.avg_score)
          .slice(0, 3);

        setTopPerformers(performers);
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
          <p style={{ fontSize: 14, color: '#4d4d4d' }}>Track learning outcomes and engagement</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Users', value: stats.totalUsers, sub: `${stats.activeUsers} active`, Icon: Users },
            { label: 'Published Courses', value: stats.totalCourses, sub: '', Icon: BookOpen },
            { label: 'Completion Rate', value: `${stats.completionRate}%`, sub: '', Icon: TrendingUp },
            { label: 'Avg Quiz Score', value: `${stats.avgScore}%`, sub: '', Icon: Award },
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
                { label: 'Course Enrollments', sub: 'Last 7 days', value: recentActivity.enrollments },
                { label: 'Quiz Attempts', sub: 'Last 7 days', value: recentActivity.quizAttempts },
                { label: 'Mock Call Sessions', sub: 'Last 7 days', value: recentActivity.mockCalls },
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
                <p style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Top performers will appear here once users start taking quizzes</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
