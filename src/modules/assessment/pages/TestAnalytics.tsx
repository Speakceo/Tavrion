import { useEffect, useState, useMemo } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAttemptsForOrg } from '../services/attemptService';
import { fetchAssessments } from '../services/assessmentService';
import { BarChart3, TrendingUp, Clock, Award } from 'lucide-react';

type AttemptRow = {
  id: string;
  status: string;
  final_score?: number | null;
  passed?: boolean | null;
  started_at: string;
  submitted_at?: string | null;
  assignment?: { title?: string };
};

export function TestAnalytics() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer) return;
    (async () => {
      try {
        const [a, assessments] = await Promise.all([
          fetchAttemptsForOrg(viewer),
          fetchAssessments(viewer),
        ]);
        setAttempts(a as AttemptRow[]);
        setAssessmentCount(assessments.length);
      } finally {
        setLoading(false);
      }
    })();
  }, [profile?.id]);

  const metrics = useMemo(() => {
    const graded = attempts.filter((a) => a.status === 'graded');
    const passed = graded.filter((a) => a.passed);
    const avgScore = graded.length
      ? Math.round(graded.reduce((s, a) => s + (a.final_score || 0), 0) / graded.length)
      : 0;
    const completionRate = attempts.length
      ? Math.round((graded.length / attempts.length) * 100)
      : 0;
    return { graded: graded.length, passed: passed.length, avgScore, completionRate, total: attempts.length };
  }, [attempts]);

  const leaderboard = useMemo(() => {
    return [...attempts]
      .filter((a) => a.status === 'graded' && a.final_score != null)
      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
      .slice(0, 10);
  }, [attempts]);

  return (
    <TestLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Analytics</h1>
        <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Completion rates, pass rates, and candidate rankings.</p>
      </div>

      {loading ? <p style={{ color: '#808080' }}>Loading...</p> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Assessments', value: assessmentCount, icon: BarChart3 },
              { label: 'Attempts', value: metrics.total, icon: Clock },
              { label: 'Avg score', value: `${metrics.avgScore}%`, icon: TrendingUp },
              { label: 'Pass rate', value: metrics.graded ? `${Math.round((metrics.passed / metrics.graded) * 100)}%` : '—', icon: Award },
            ].map((c) => (
              <div key={c.label} className="lt-card" style={{ padding: 16 }}>
                <c.icon size={16} color="#171717" />
                <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{c.value}</div>
                <div style={{ fontSize: 12, color: '#666' }}>{c.label}</div>
              </div>
            ))}
          </div>

          <div className="lt-card" style={{ padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Candidate leaderboard</h2>
            {leaderboard.length === 0 ? (
              <p style={{ fontSize: 13, color: '#999' }}>No graded attempts yet.</p>
            ) : (
              <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                    <th style={{ padding: '8px 0', color: '#999', fontWeight: 600 }}>#</th>
                    <th style={{ padding: '8px 0', color: '#999', fontWeight: 600 }}>Assignment</th>
                    <th style={{ padding: '8px 0', color: '#999', fontWeight: 600 }}>Score</th>
                    <th style={{ padding: '8px 0', color: '#999', fontWeight: 600 }}>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((a, i) => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                      <td style={{ padding: '10px 0' }}>{i + 1}</td>
                      <td style={{ padding: '10px 0' }}>{a.assignment?.title || '—'}</td>
                      <td style={{ padding: '10px 0', fontWeight: 600 }}>{a.final_score}%</td>
                      <td style={{ padding: '10px 0', color: a.passed ? '#16a34a' : '#c0392b' }}>{a.passed ? 'Pass' : 'Fail'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </TestLayout>
  );
}
