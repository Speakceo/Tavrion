import { useEffect, useState, useCallback } from 'react';
import { Flag, ChevronLeft, ChevronRight, Maximize2, Clock } from 'lucide-react';
import type { AssessmentQuestion } from '../types';
import { saveResponse, submitAttempt } from '../services/attemptService';
import { uploadAssessmentMedia } from '../services/mediaService';
import { useIntegrityMonitor } from '../hooks/useIntegrityMonitor';
import { ProctoringMonitor } from './ProctoringMonitor';
import {
  MCQQuestion, WritingQuestion, ListeningQuestion, MediaRecordQuestion,
} from './questions/QuestionRenderers';

export type TestCompleteResult = {
  percentage: number;
  passed: boolean;
  attemptId: string;
  showPostForm?: boolean;
};

type Props = {
  attemptId: string;
  assignmentId: string;
  questions: AssessmentQuestion[];
  title: string;
  timeLimitMinutes?: number | null;
  onComplete: (result: TestCompleteResult) => void;
  showPostForm?: boolean;
};

export function TestInterface({
  attemptId,
  assignmentId,
  questions,
  title,
  timeLimitMinutes,
  onComplete,
  showPostForm = false,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(timeLimitMinutes ? timeLimitMinutes * 60 : null);
  const [violationCount, setViolationCount] = useState(0);

  const handleAutoSubmit = useCallback(async () => {
    if (submitting) return;
    await doSubmit();
  }, [submitting, attemptId, assignmentId]);

  const { violationCount: _v } = useIntegrityMonitor(attemptId, handleAutoSubmit);

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
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    await saveResponse(attemptId, questionId, answer, isFlagged);
  };

  const uploadMediaIfNeeded = async (questionId: string, answer: Record<string, unknown>) => {
    if (answer.blob instanceof Blob) {
      const ext = answer.media_type === 'video' ? 'webm' : 'webm';
      const url = await uploadAssessmentMedia(attemptId, questionId, answer.blob as Blob, ext);
      const cleaned = { ...answer, media_url: url };
      delete cleaned.blob;
      delete cleaned.preview_url;
      await persistAnswer(questionId, cleaned);
      return cleaned;
    }
    return answer;
  };

  const toggleFlag = async () => {
    if (!current) return;
    const next = new Set(flagged);
    if (next.has(current.id)) next.delete(current.id);
    else next.add(current.id);
    setFlagged(next);
    await saveResponse(attemptId, current.id, answers[current.id] || {}, next.has(current.id));
  };

  const doSubmit = async () => {
    setSubmitting(true);
    try {
      for (const q of questions) {
        const ans = answers[q.id];
        if (ans?.blob) await uploadMediaIfNeeded(q.id, ans);
      }
      const result = await submitAttempt(attemptId, assignmentId);
      onComplete({
        percentage: result.percentage,
        passed: result.passed,
        attemptId,
        showPostForm,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!reviewMode) {
      setReviewMode(true);
      return;
    }
    await doSubmit();
  };

  if (!current) {
    return <p style={{ padding: 40, textAlign: 'center', color: '#666' }}>No questions in this assessment.</p>;
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const renderQuestion = () => {
    const val = answers[current.id] || {};
    const onChange = (a: Record<string, unknown>) => persistAnswer(current.id, a);

    if (['multiple_choice', 'multiple_select', 'true_false', 'situational_judgment'].includes(current.question_type)) {
      return <MCQQuestion question={current} value={val} onChange={onChange} />;
    }
    if (['short_answer', 'long_answer'].includes(current.question_type)) {
      return <WritingQuestion question={current} value={val} onChange={onChange} />;
    }
    if (current.question_type === 'listening') {
      return <ListeningQuestion question={current} value={val} onChange={onChange} />;
    }
    if (current.question_type === 'audio_response') {
      return <MediaRecordQuestion question={current} value={val} onChange={onChange} mode="audio" />;
    }
    if (current.question_type === 'video_response') {
      return <MediaRecordQuestion question={current} value={val} onChange={onChange} mode="video" />;
    }
    if (current.question_type === 'coding' || current.question_type === 'sql') {
      return (
        <textarea
          className="lt-input"
          rows={12}
          value={String(val.code ?? '')}
          onChange={(e) => onChange({ code: e.target.value, language: current.metadata?.language || 'javascript' })}
          style={{ fontFamily: 'monospace', fontSize: 13 }}
          placeholder="// Your code here..."
        />
      );
    }
    return <WritingQuestion question={current} value={val} onChange={onChange} />;
  };

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
          <button type="button" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})} style={{ padding: 6, background: 'none', border: '1px solid #e5e5e5', borderRadius: 6, cursor: 'pointer' }}>
            <Maximize2 size={14} />
          </button>
        </div>
      </header>

      <div style={{ height: 4, background: '#f0f0f0' }}>
        <div style={{ height: '100%', width: `${((currentIndex + 1) / questions.length) * 100}%`, background: '#171717', transition: 'width 0.2s' }} />
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20 }}>
        <main>
          {reviewMode ? (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>Review before submit</h2>
              {questions.map((q, i) => (
                <div key={q.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13 }}>{i + 1}. {q.prompt.slice(0, 80)}</span>
                  <span style={{ fontSize: 11, color: answers[q.id] ? '#16a34a' : '#c0392b' }}>
                    {answers[q.id] ? 'Answered' : 'Unanswered'}{flagged.has(q.id) ? ' · Flagged' : ''}
                  </span>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setReviewMode(false)} className="lt-btn-secondary" style={{ padding: '10px 18px' }}>Back</button>
                <button type="button" onClick={handleSubmit} disabled={submitting} className="lt-btn-primary" style={{ padding: '10px 18px' }}>
                  {submitting ? 'Submitting...' : 'Submit assessment'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="lt-card" style={{ padding: 24, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: '#999', textTransform: 'uppercase', marginBottom: 8 }}>{current.question_type.replace(/_/g, ' ')}</div>
                <p style={{ fontSize: 15, lineHeight: 1.6, marginBottom: 20 }}>{current.prompt}</p>
                {renderQuestion()}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="lt-btn-secondary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronLeft size={14} /> Previous
                </button>
                <button type="button" onClick={toggleFlag} style={{ padding: '8px 12px', background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: flagged.has(current.id) ? '#c0392b' : '#666' }}>
                  <Flag size={14} /> {flagged.has(current.id) ? 'Flagged' : 'Flag'}
                </button>
                {currentIndex < questions.length - 1 ? (
                  <button type="button" onClick={() => setCurrentIndex((i) => i + 1)} className="lt-btn-primary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    Next <ChevronRight size={14} />
                  </button>
                ) : (
                  <button type="button" onClick={handleSubmit} className="lt-btn-primary" style={{ padding: '8px 14px' }}>Review & submit</button>
                )}
              </div>
            </>
          )}
        </main>
        <aside>
          <ProctoringMonitor attemptId={attemptId} violationCount={violationCount} />
        </aside>
      </div>
    </div>
  );
}
