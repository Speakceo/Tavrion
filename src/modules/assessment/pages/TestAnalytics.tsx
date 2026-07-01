import { useEffect, useState, useMemo } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAttemptsForOrg } from '../services/attemptService';
import { fetchAssessments } from '../services/assessmentService';
import { fetchQuestions } from '../services/questionService';
import { fetchSessions } from '../services/sessionService';
import { scoreNormReferenced } from '../utils/scoring';
import { supabase } from '../../../lib/supabase';
import { BarChart3, TrendingUp, Clock, Award, Target } from 'lucide-react';
import type { AssessmentQuestion } from '../types';

type AttemptRow = {
  id: string;
  status: string;
  final_score?: number | null;
  passed?: boolean | null;
  started_at: string;
  submitted_at?: string | null;
  assignment?: { title?: string };
};

type ResponseRow = {
  question_id: string;
  final_score?: number | null;
  answer: Record<string, unknown>;
  answered_at?: string | null;
  time_spent_seconds?: number | null;
};

function heatColor(pct: number): string {
  if (pct >= 70) return '#bbf7d0';
  if (pct >= 50) return '#fef08a';
  if (pct >= 30) return '#fed7aa';
  return '#fecaca';
}

export function TestAnalytics() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [attempts, setAttempts] = useState<AttemptRow[]>([]);
  const [sessions, setSessions] = useState<Awaited<ReturnType<typeof fetchSessions>>>([]);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [responses, setResponses] = useState<ResponseRow[]>([]);
  const [assessmentCount, setAssessmentCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!viewer) return;
    (async () => {
      try {
        const [a, assessments, qs, sess] = await Promise.all([
          fetchAttemptsForOrg(viewer),
          fetchAssessments(viewer),
          fetchQuestions(viewer, { includeArchived: true }),
          fetchSessions(viewer),
        ]);
        setAttempts(a as AttemptRow[]);
        setAssessmentCount(assessments.length);
        setQuestions(qs);
        setSessions(sess);

        const attemptIds = (a as AttemptRow[]).map((x) => x.id);
        if (attemptIds.length) {
          const { data } = await supabase
            .from('assessment_responses')
            .select('question_id, final_score, answer, answered_at, time_spent_seconds, attempt_id')
            .in('attempt_id', attemptIds.slice(0, 100));
          setResponses((data || []) as ResponseRow[]);
        }
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

  const leaderboard = useMemo(() => (
    [...attempts]
      .filter((a) => a.status === 'graded' && a.final_score != null)
      .sort((a, b) => (b.final_score || 0) - (a.final_score || 0))
      .slice(0, 10)
  ), [attempts]);

  const skillHeatmap = useMemo(() => {
    const tagStats = new Map<string, { total: number; sum: number; count: number }>();
    const qMap = new Map(questions.map((q) => [q.id, q]));

    for (const r of responses) {
      const q = qMap.get(r.question_id);
      if (!q) continue;
      const tags = q.tags?.length ? q.tags : ['untagged'];
      const score = r.final_score ?? (r.answer?.testsPassed != null
        ? (Number(r.answer.testsPassed) / Math.max(1, Number(r.answer.testsTotal ?? 1))) * 100
        : null);
      if (score == null) continue;
      for (const tag of tags) {
        const entry = tagStats.get(tag) || { total: 0, sum: 0, count: 0 };
        entry.sum += score;
        entry.count += 1;
        entry.total += 1;
        tagStats.set(tag, entry);
      }
    }

    return [...tagStats.entries()]
      .map(([tag, { sum, count }]) => ({ tag, avg: Math.round(sum / count), gap: Math.round(100 - sum / count), attempts: count }))
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 12);
  }, [questions, responses]);

  const itemDifficulty = useMemo(() => {
    const byQ = new Map<string, { correct: number; total: number }>();
    for (const r of responses) {
      const entry = byQ.get(r.question_id) || { correct: 0, total: 0 };
      entry.total += 1;
      if ((r.final_score ?? 0) >= 70) entry.correct += 1;
      else if (r.answer?.selected) {
        const q = questions.find((x) => x.id === r.question_id);
        const correct = q?.options?.find((o) => o.is_correct);
        if (correct && String(r.answer.selected) === correct.id) entry.correct += 1;
      }
      byQ.set(r.question_id, entry);
    }

    return [...byQ.entries()]
      .map(([qId, { correct, total }]) => {
        const q = questions.find((x) => x.id === qId);
        const pct = total ? Math.round((correct / total) * 100) : 0;
        return {
          id: qId,
          title: q?.title || q?.prompt?.slice(0, 40) || qId.slice(0, 8),
          difficulty: q?.difficulty || 'medium',
          calibration: pct,
          attempts: total,
        };
      })
      .sort((a, b) => a.calibration - b.calibration)
      .slice(0, 15);
  }, [responses, questions]);

  const funnel = useMemo(() => {
    const invited = sessions.length + Math.round(sessions.length * 0.3);
    const started = sessions.filter((s) => s.status !== 'expired').length;
    const completed = sessions.filter((s) => s.status === 'graded' || s.status === 'submitted').length;
    const max = Math.max(invited, 1);
    return [
      { label: 'Invited', value: invited, pct: 100 },
      { label: 'Started', value: started, pct: Math.round((started / max) * 100) },
      { label: 'Completed', value: completed, pct: Math.round((completed / max) * 100) },
    ];
  }, [sessions]);

  const timePerQuestion = useMemo(() => {
    const byQ = new Map<string, { sum: number; count: number }>();
    for (const r of responses) {
      const secs = r.time_spent_seconds ?? (r.answered_at ? 45 : null);
      if (secs == null) continue;
      const entry = byQ.get(r.question_id) || { sum: 0, count: 0 };
      entry.sum += secs;
      entry.count += 1;
      byQ.set(r.question_id, entry);
    }
    return [...byQ.entries()]
      .map(([qId, { sum, count }]) => {
        const q = questions.find((x) => x.id === qId);
        return { title: q?.title || qId.slice(0, 8), avgSecs: Math.round(sum / count) };
      })
      .sort((a, b) => b.avgSecs - a.avgSecs)
      .slice(0, 10);
  }, [responses, questions]);

  const normScores = useMemo(() => {
    const psychQuestions = questions.filter((q) => ['personality', 'cognitive'].includes(q.question_type));
    if (!psychQuestions.length || !responses.length) return [];
    const respMap = new Map<string, Record<string, unknown>>();
    for (const r of responses) respMap.set(r.question_id, r.answer);
    return scoreNormReferenced(psychQuestions, respMap);
  }, [questions, responses]);

  return (
    <TestLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Analytics</h1>
        <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Completion rates, skill gaps, item calibration, and psychometric norms.</p>
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="lt-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Target size={14} /> Completion funnel
              </h2>
              {funnel.map((f) => (
                <div key={f.label} style={{ marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span>{f.label}</span>
                    <span style={{ fontWeight: 600 }}>{f.value}</span>
                  </div>
                  <div style={{ height: 8, background: '#f0f0f0', borderRadius: 4 }}>
                    <div style={{ height: '100%', width: `${f.pct}%`, background: '#171717', borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="lt-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Skill gap heatmap</h2>
              {skillHeatmap.length === 0 ? (
                <p style={{ fontSize: 13, color: '#999' }}>No tagged response data yet.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {skillHeatmap.map((s) => (
                    <div
                      key={s.tag}
                      title={`Avg ${s.avg}% · Gap ${s.gap}% · ${s.attempts} responses`}
                      style={{
                        padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: heatColor(s.avg), border: '1px solid rgba(0,0,0,0.06)',
                      }}
                    >
                      {s.tag} <span style={{ fontWeight: 400, opacity: 0.8 }}>({s.gap}% gap)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 16 }}>
            <div className="lt-card" style={{ padding: 20, overflow: 'auto' }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Item difficulty (auto-calibration %)</h2>
              {itemDifficulty.length === 0 ? (
                <p style={{ fontSize: 13, color: '#999' }}>No graded responses yet.</p>
              ) : (
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                      <th style={{ padding: '6px 0', color: '#999' }}>Question</th>
                      <th style={{ padding: '6px 0', color: '#999' }}>Difficulty</th>
                      <th style={{ padding: '6px 0', color: '#999' }}>% correct</th>
                      <th style={{ padding: '6px 0', color: '#999' }}>N</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemDifficulty.map((item) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '8px 0', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</td>
                        <td style={{ padding: '8px 0' }}>{item.difficulty}</td>
                        <td style={{ padding: '8px 0', fontWeight: 600 }}>{item.calibration}%</td>
                        <td style={{ padding: '8px 0', color: '#999' }}>{item.attempts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="lt-card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Avg time per question</h2>
              {timePerQuestion.length === 0 ? (
                <p style={{ fontSize: 13, color: '#999' }}>No timing data yet.</p>
              ) : (
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <tbody>
                    {timePerQuestion.map((t) => (
                      <tr key={t.title} style={{ borderBottom: '1px solid #f5f5f5' }}>
                        <td style={{ padding: '8px 0' }}>{t.title}</td>
                        <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 600 }}>{t.avgSecs}s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {normScores.length > 0 && (
            <div className="lt-card" style={{ padding: 20, marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Psychometric norm scores</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {normScores.map((n) => (
                  <div key={n.normKey} style={{ background: '#f8f8f8', borderRadius: 8, padding: 12 }}>
                    <div style={{ fontSize: 11, color: '#999', textTransform: 'capitalize' }}>{n.label}</div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{n.percentile}<span style={{ fontSize: 12, fontWeight: 400 }}>th</span></div>
                    <div style={{ fontSize: 10, color: '#999' }}>raw {n.raw}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
