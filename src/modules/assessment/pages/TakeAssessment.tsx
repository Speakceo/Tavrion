import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAssignmentById } from '../services/assignmentService';
import { fetchAssessmentWithSections } from '../services/assessmentService';
import { startAttempt, saveResponse, submitAttempt, fetchAttemptResponses } from '../services/attemptService';
import { useIntegrityMonitor } from '../hooks/useIntegrityMonitor';
import type { AssessmentQuestion, AssessmentAttempt } from '../types';
import { Flag, ChevronLeft, ChevronRight, Maximize2, Clock, AlertTriangle } from 'lucide-react';

export function TakeAssessment() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;

  const [attempt, setAttempt] = useState<AssessmentAttempt | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [title, setTitle] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  const handleAutoSubmit = useCallback(async () => {
    if (!attempt || !assignmentId || submitting) return;
    setSubmitting(true);
    try {
      const result = await submitAttempt(attempt.id, assignmentId);
      navigate(`/test/result/${attempt.id}`, { state: result });
    } finally {
      setSubmitting(false);
    }
  }, [attempt, assignmentId, submitting, navigate]);

  useIntegrityMonitor(attempt?.id || null, handleAutoSubmit);

  useEffect(() => {
    if (!assignmentId || !viewer?.id) return;
    (async () => {
      try {
        const assignment = await fetchAssignmentById(assignmentId, viewer);
        if (!assignment?.assessment) return;
        setTitle(assignment.title);

        const assessment = await fetchAssessmentWithSections(assignment.assessment_id, viewer);
        const qs: AssessmentQuestion[] = [];
        for (const section of assessment?.sections || []) {
          for (const sq of section.assessment_section_questions || []) {
            if (sq.question) qs.push(sq.question);
          }
        }
        setQuestions(qs);

        const att = await startAttempt({ ...viewer, id: viewer.id }, assignmentId);
        setAttempt(att);

        const existing = await fetchAttemptResponses(att.id);
        const map: Record<string, Record<string, unknown>> = {};
        existing.forEach((r) => { map[r.question_id] = r.answer; });
        setAnswers(map);

        const limit = assignment.time_limit_minutes || assessment?.time_limit_minutes;
        if (limit) setTimeLeft(limit * 60);
      } finally {
        setLoading(false);
      }
    })();
  }, [assignmentId, profile?.id]);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0) return;
    const t = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev == null || prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [timeLeft, handleAutoSubmit]);

  const current = questions[currentIndex];

  const persistAnswer = async (questionId: string, answer: Record<string, unknown>, isFlagged = false) => {
    if (!attempt) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    await saveResponse(attempt.id, questionId, answer, isFlagged);
  };

  const toggleFlag = async () => {
    if (!current || !attempt) return;
    const next = new Set(flagged);
    if (next.has(current.id)) next.delete(current.id);
    else next.add(current.id);
    setFlagged(next);
    await saveResponse(attempt.id, current.id, answers[current.id] || {}, next.has(current.id));
  };

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const handleSubmit = async () => {
    if (!attempt || !assignmentId) return;
    if (!reviewMode) {
      setReviewMode(true);
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitAttempt(attempt.id, assignmentId);
      navigate(`/test/result/${attempt.id}`, { state: result });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
        <p style={{ color: '#808080' }}>Loading assessment...</p>
      </div>
    );
  }

  if (!current || !attempt) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
        <p>Assessment not available.</p>
      </div>
    );
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 11, color: '#999' }}>Question {currentIndex + 1} of {questions.length}</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {timeLeft != null && (
            <span style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, color: timeLeft < 60 ? '#c0392b' : '#171717' }}>
              <Clock size={14} /> {formatTime(timeLeft)}
            </span>
          )}
          <button onClick={enterFullscreen} style={{ padding: 6, background: 'none', border: '1px solid #e5e5e5', borderRadius: 6, cursor: 'pointer' }}>
            <Maximize2 size={14} />
          </button>
        </div>
      </header>

      <div style={{ height: 4, background: '#f0f0f0' }}>
        <div style={{ height: '100%', width: `${((currentIndex + 1) / questions.length) * 100}%`, background: '#171717', transition: 'width 0.2s' }} />
      </div>

      <main style={{ maxWidth: 720, margin: '0 auto', padding: '24px 20px' }}>
        {reviewMode ? (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Review before submit</h2>
            <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Check your answers. Flagged questions are marked.</p>
            {questions.map((q, i) => (
              <div key={q.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13 }}>{i + 1}. {q.prompt.slice(0, 80)}</span>
                <span style={{ fontSize: 11, color: answers[q.id] ? '#16a34a' : '#c0392b' }}>
                  {answers[q.id] ? 'Answered' : 'Unanswered'}{flagged.has(q.id) ? ' · Flagged' : ''}
                </span>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => setReviewMode(false)} className="lt-btn-secondary" style={{ padding: '10px 18px' }}>Back</button>
              <button onClick={handleSubmit} disabled={submitting} className="lt-btn-primary" style={{ padding: '10px 18px' }}>
                {submitting ? 'Submitting...' : 'Submit assessment'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="lt-card" style={{ padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8 }}>{current.question_type.replace(/_/g, ' ')}</div>
              <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>{current.prompt}</p>

              {(current.question_type === 'multiple_choice' || current.question_type === 'true_false') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(current.options || []).map((opt) => (
                    <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid #e5e5e5', borderRadius: 8, cursor: 'pointer', background: answers[current.id]?.selected === opt.id ? '#f5f5f5' : '#fff' }}>
                      <input
                        type="radio"
                        name={current.id}
                        checked={answers[current.id]?.selected === opt.id}
                        onChange={() => persistAnswer(current.id, { selected: opt.id })}
                      />
                      <span style={{ fontSize: 14 }}>{opt.option_text}</span>
                    </label>
                  ))}
                </div>
              )}

              {(current.question_type === 'short_answer' || current.question_type === 'long_answer') && (
                <textarea
                  className="lt-input"
                  rows={current.question_type === 'long_answer' ? 6 : 2}
                  value={String(answers[current.id]?.text ?? '')}
                  onChange={(e) => persistAnswer(current.id, { text: e.target.value })}
                  placeholder="Your answer..."
                />
              )}

              {current.question_type === 'coding' && (
                <textarea
                  className="lt-input"
                  rows={12}
                  value={String(answers[current.id]?.code ?? '')}
                  onChange={(e) => persistAnswer(current.id, { code: e.target.value, language: 'javascript' })}
                  placeholder="// Write your code here..."
                  style={{ fontFamily: 'monospace', fontSize: 13 }}
                />
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                disabled={currentIndex === 0}
                className="lt-btn-secondary"
                style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <ChevronLeft size={14} /> Previous
              </button>

              <button onClick={toggleFlag} style={{ padding: '8px 12px', background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: flagged.has(current.id) ? '#c0392b' : '#666' }}>
                <Flag size={14} /> {flagged.has(current.id) ? 'Flagged' : 'Flag'}
              </button>

              {currentIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentIndex((i) => i + 1)}
                  className="lt-btn-primary"
                  style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={handleSubmit} className="lt-btn-primary" style={{ padding: '8px 14px' }}>
                  Review & submit
                </button>
              )}
            </div>

            <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#999' }}>
              <AlertTriangle size={12} /> Tab switches and copy/paste are monitored for integrity.
            </div>
          </>
        )}
      </main>
    </div>
  );
}
