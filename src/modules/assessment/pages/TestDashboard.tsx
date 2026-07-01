import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAssessments } from '../services/assessmentService';
import { fetchAttemptsForOrg } from '../services/attemptService';
import { fetchAssignments } from '../services/assignmentService';
import { BarChart3, ClipboardCheck, Users, TrendingUp, ListTodo } from 'lucide-react';
import { Link } from 'react-router-dom';
import { pendingFeatureStats } from '../constants/pendingFeatures';

export function TestDashboard() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [stats, setStats] = useState({ assessments: 0, published: 0, assignments: 0, attempts: 0, passRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer) return;
    (async () => {
      try {
        const [assessments, assignments, attempts] = await Promise.all([
          fetchAssessments(viewer),
          fetchAssignments(viewer),
          fetchAttemptsForOrg(viewer),
        ]);
        const published = assessments.filter((a) => a.status === 'published').length;
        const graded = attempts.filter((a: { status: string }) => a.status === 'graded');
        const passed = graded.filter((a: { passed: boolean }) => a.passed).length;
        const passRate = graded.length ? Math.round((passed / graded.length) * 100) : 0;
        setStats({ assessments: assessments.length, published, assignments: assignments.length, attempts: attempts.length, passRate });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const cards = [
    { label: 'Assessments', value: stats.assessments, sub: `${stats.published} published`, icon: ClipboardCheck, href: '/test/library' },
    { label: 'Assignments', value: stats.assignments, sub: 'Active campaigns', icon: Users, href: '/test/assignments' },
    { label: 'Attempts', value: stats.attempts, sub: 'All time', icon: BarChart3, href: '/test/sessions' },
    { label: 'Pass Rate', value: `${stats.passRate}%`, sub: 'Graded attempts', icon: TrendingUp, href: '/test/analytics' },
  ];

  const roadmap = pendingFeatureStats();

  return (
    <TestLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#171717', letterSpacing: '-0.03em', marginBottom: 4 }}>Assessment Dashboard</h1>
        <p style={{ fontSize: 14, color: '#666' }}>Manage hiring assessments, question banks, and candidate results for your organization.</p>
      </div>

      {loading ? (
        <p style={{ color: '#808080', fontSize: 14 }}>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          {cards.map((c) => (
            <Link key={c.label} to={c.href} className="lt-card" style={{ padding: '18px 20px', textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <c.icon size={18} color="#171717" />
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#171717', letterSpacing: '-0.03em' }}>{c.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#171717', marginTop: 4 }}>{c.label}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>{c.sub}</div>
            </Link>
          ))}
        </div>
      )}

      <div className="lt-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Quick actions</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          <Link to="/test/library" className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>Create assessment</Link>
          <Link to="/test/questions" className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>Add questions</Link>
          <Link to="/test/templates" className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>Role templates</Link>
          <Link to="/test/sessions" className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>View sessions</Link>
          <Link to="/test/links" className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13, textDecoration: 'none' }}>Public links</Link>
        </div>
      </div>

      <div className="lt-card" style={{ padding: 20, marginTop: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <ListTodo size={18} color="#171717" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#171717' }}>Pending features</div>
              <p style={{ fontSize: 12, color: '#666', marginTop: 4, lineHeight: 1.6 }}>
                {roadmap.total} items on the roadmap — {roadmap.high} high priority, {roadmap.inProgress} in progress, {roadmap.stubs} stubs ready to wire up.
              </p>
            </div>
          </div>
          <Link to="/test/roadmap" className="lt-btn-secondary" style={{ padding: '6px 14px', fontSize: 12, textDecoration: 'none', whiteSpace: 'nowrap' }}>
            View roadmap
          </Link>
        </div>
      </div>
    </TestLayout>
  );
}
