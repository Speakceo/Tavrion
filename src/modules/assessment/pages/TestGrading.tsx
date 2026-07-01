import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import type { OrgViewer } from '../../../utils/orgScope';
import {
  fetchGradingQueue, gradeResponse, runAiScoring,
  fetchScorecards, saveScorecard,
  type GradingQueueItem, type Scorecard,
} from '../services/gradingService';
import { ClipboardCheck, Sparkles, ChevronRight, User, Star } from 'lucide-react';

function formatAnswer(answer: Record<string, unknown>, questionType?: string): string {
  if (typeof answer.text === 'string') return answer.text;
  if (typeof answer.url === 'string') return answer.url;
  if (typeof answer.media_url === 'string') return answer.media_url;
  return JSON.stringify(answer, null, 2);
}

export function TestGrading() {
  const { profile } = useAuth();
  const viewer = profile
    ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id }
    : null;

  const [queue, setQueue] = useState<GradingQueueItem[]>([]);
  const [selected, setSelected] = useState<GradingQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const [score, setScore] = useState(0);
  const [partialCredit, setPartialCredit] = useState(false);
  const [graderNotes, setGraderNotes] = useState('');
  const [rubric, setRubric] = useState('');

  const [scorecards, setScorecards] = useState<Scorecard[]>([]);
  const [scorecardNotes, setScorecardNotes] = useState('');
  const [scorecardScores, setScorecardScores] = useState({
    communication: 3,
    technical: 3,
    culture: 3,
    overall: 3,
  });

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const items = await fetchGradingQueue(viewer);
      setQueue(items);
      if (selected) {
        const still = items.find((i) => i.response_id === selected.response_id);
        if (!still) setSelected(items[0] || null);
      } else if (items.length) {
        setSelected(items[0]);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadScorecards = async (attemptId?: string) => {
    if (!viewer || !attemptId) {
      setScorecards([]);
      return;
    }
    setScorecards(await fetchScorecards(viewer, { attemptId }));
  };

  useEffect(() => { load(); }, [profile?.id]);

  useEffect(() => {
    if (!selected) {
      setScore(0);
      setPartialCredit(false);
      setGraderNotes('');
      setRubric('');
      setScorecards([]);
      return;
    }
    setScore(selected.manual_score ?? 0);
    setPartialCredit(!!selected.answer?.partial_credit);
    setGraderNotes(selected.grader_notes || '');
    setRubric(typeof selected.answer?.rubric === 'string' ? selected.answer.rubric : '');
    loadScorecards(selected.attempt_id);
  }, [selected?.response_id]);

  const flash = (text: string, isError = false) => {
    setMessage(isError ? `Error: ${text}` : text);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleSubmitGrade = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await gradeResponse(selected.attempt_id, selected.response_id, score, graderNotes, {
        partialCredit,
        rubric,
      });
      flash('Grade saved.');
      await load();
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Save failed', true);
    } finally {
      setBusy(false);
    }
  };

  const handleAiScore = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const answerText = formatAnswer(selected.answer, selected.question_type);
      const mediaUrl = ['video_response', 'audio_response'].includes(selected.question_type || '')
        && (answerText.startsWith('http') || answerText.startsWith('/'))
        ? answerText
        : undefined;

      const result = await runAiScoring({
        attemptId: selected.attempt_id,
        responseId: selected.response_id,
        questionType: selected.question_type || 'long_answer',
        text: mediaUrl ? undefined : answerText,
        mediaUrl,
        rubric: rubric || undefined,
      });

      if (result.score != null) setScore(result.score);
      if (result.feedback) setGraderNotes(JSON.stringify(result.feedback, null, 2));
      flash(`AI score: ${result.score ?? '—'}%`);
      await load();
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'AI scoring failed', true);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveScorecard = async () => {
    if (!viewer?.id || !selected) return;
    setBusy(true);
    try {
      await saveScorecard(viewer as OrgViewer & { id: string }, {
        attempt_id: selected.attempt_id,
        rubric: { criteria: ['communication', 'technical', 'culture'] },
        scores: scorecardScores,
        notes: scorecardNotes,
      });
      setScorecardNotes('');
      await loadScorecards(selected.attempt_id);
      flash('Scorecard saved.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Save failed', true);
    } finally {
      setBusy(false);
    }
  };

  const answerText = selected ? formatAnswer(selected.answer, selected.question_type) : '';
  const isMedia = selected && ['video_response', 'audio_response'].includes(selected.question_type || '');

  return (
    <TestLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Manual grading</h1>
        <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
          Review long answers, video, and audio responses that need a human or AI-assisted score.
        </p>
      </div>

      {message && (
        <div className="lt-card" style={{ padding: 12, marginBottom: 16, fontSize: 13, color: message.startsWith('Error') ? '#c0392b' : '#16a34a' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 280px) 1fr', gap: 16, alignItems: 'start' }}>
        <div className="lt-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0', fontSize: 12, fontWeight: 700, color: '#666' }}>
            Queue ({queue.length})
          </div>
          {loading ? (
            <p style={{ padding: 16, fontSize: 13, color: '#999' }}>Loading...</p>
          ) : queue.length === 0 ? (
            <p style={{ padding: 16, fontSize: 13, color: '#999' }}>No responses awaiting manual grade.</p>
          ) : (
            queue.map((item) => {
              const active = selected?.response_id === item.response_id;
              return (
                <button
                  key={item.response_id}
                  onClick={() => setSelected(item)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left', padding: '12px 14px',
                    border: 'none', borderBottom: '1px solid #f5f5f5', cursor: 'pointer',
                    background: active ? '#f5f5f5' : '#fff',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <User size={12} color="#999" />
                    {item.candidate_name || item.candidate_email || 'Candidate'}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>{item.assignment_title || 'Assessment'}</div>
                  <div style={{ fontSize: 10, color: '#bbb', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                    {item.question_type?.replace('_', ' ')}
                    {active && <ChevronRight size={10} />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div>
          {selected ? (
            <>
              <div className="lt-card" style={{ padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Question prompt</div>
                <p style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.55, marginBottom: 16 }}>
                  {selected.question_prompt || selected.question_title || '—'}
                </p>

                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>Candidate answer</div>
                {isMedia && (answerText.startsWith('http') || answerText.startsWith('/')) ? (
                  <div style={{ marginBottom: 16 }}>
                    {selected.question_type === 'video_response' ? (
                      <video src={answerText} controls style={{ maxWidth: '100%', borderRadius: 8, background: '#000' }} />
                    ) : (
                      <audio src={answerText} controls style={{ width: '100%' }} />
                    )}
                  </div>
                ) : (
                  <div style={{ fontSize: 13, color: '#333', lineHeight: 1.6, padding: 14, background: '#fafafa', borderRadius: 8, marginBottom: 16, whiteSpace: 'pre-wrap', maxHeight: 240, overflow: 'auto' }}>
                    {answerText || '—'}
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 6 }}>Score (0–100)</label>
                    <input type="number" min={0} max={100} className="lt-input" value={score} onChange={(e) => setScore(Number(e.target.value))} style={{ width: '100%' }} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer', paddingBottom: 10 }}>
                      <input type="checkbox" checked={partialCredit} onChange={(e) => setPartialCredit(e.target.checked)} />
                      Partial credit
                    </label>
                  </div>
                </div>

                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 6 }}>Grader notes</label>
                <textarea className="lt-input" value={graderNotes} onChange={(e) => setGraderNotes(e.target.value)} rows={3} style={{ width: '100%', marginBottom: 14, fontSize: 13 }} placeholder="Feedback for recruiters..." />

                <label style={{ fontSize: 11, color: '#999', display: 'block', marginBottom: 6 }}>Rubric</label>
                <textarea className="lt-input" value={rubric} onChange={(e) => setRubric(e.target.value)} rows={3} style={{ width: '100%', marginBottom: 16, fontSize: 13 }} placeholder="Scoring criteria for this question..." />

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={handleSubmitGrade} disabled={busy} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ClipboardCheck size={14} /> Save grade
                  </button>
                  <button onClick={handleAiScore} disabled={busy} className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} /> AI score
                  </button>
                </div>
              </div>

              <div className="lt-card" style={{ padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Star size={14} /> Interviewer scorecards
                </div>

                {scorecards.length > 0 && (
                  <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {scorecards.map((card) => (
                      <div key={card.id} style={{ padding: 12, background: '#fafafa', borderRadius: 8, fontSize: 12 }}>
                        <div style={{ fontWeight: 600 }}>Reviewer · {new Date(card.created_at).toLocaleDateString()}</div>
                        <div style={{ color: '#666', marginTop: 4 }}>{card.notes || 'No notes'}</div>
                        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {Object.entries(card.scores || {}).map(([k, v]) => (
                            <span key={k} style={{ fontSize: 10, padding: '3px 8px', background: '#fff', borderRadius: 999, border: '1px solid #eee' }}>
                              {k}: {String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ display: 'grid', gap: 10, marginBottom: 14 }}>
                  {(['communication', 'technical', 'culture', 'overall'] as const).map((key) => (
                    <div key={key} style={{ display: 'grid', gridTemplateColumns: '120px 60px', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, textTransform: 'capitalize' }}>{key}</span>
                      <input
                        type="number"
                        min={1}
                        max={5}
                        className="lt-input"
                        value={scorecardScores[key]}
                        onChange={(e) => setScorecardScores((s) => ({ ...s, [key]: Number(e.target.value) }))}
                      />
                    </div>
                  ))}
                  <textarea className="lt-input" placeholder="Interviewer notes & recommendation" value={scorecardNotes} onChange={(e) => setScorecardNotes(e.target.value)} rows={2} />
                </div>
                <button onClick={handleSaveScorecard} disabled={busy} className="lt-btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }}>
                  Add scorecard
                </button>
              </div>
            </>
          ) : (
            <div className="lt-card" style={{ padding: 40, textAlign: 'center', color: '#999', fontSize: 13 }}>
              Select a response from the queue to begin grading.
            </div>
          )}
        </div>
      </div>
    </TestLayout>
  );
}
