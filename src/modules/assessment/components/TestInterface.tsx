import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Flag, ChevronLeft, ChevronRight, Maximize2, Clock, Award, Info } from 'lucide-react';
import type { AssessmentQuestion } from '../types';
import { saveResponse } from '../services/attemptService';
import { uploadAssessmentMedia } from '../services/mediaService';
import { useIntegrityMonitor } from '../hooks/useIntegrityMonitor';
import { ProctoringMonitor } from './ProctoringMonitor';
import {
  MCQQuestion, WritingQuestion, ListeningQuestion, MediaRecordQuestion,
  CodingQuestion, ExcelQuestion,
} from './questions/QuestionRenderers';

export type TestCompleteResult = {
  percentage: number;
  passed: boolean;
  attemptId: string;
  showPostForm?: boolean;
  certificateUrl?: string;
  practiceMode?: boolean;
};

type SectionMeta = {
  id: string;
  title: string;
  time_limit_minutes?: number | null;
  questionIds: string[];
};

type BranchRule = {
  when: { question_id: string; answer: string | string[] };
  skip_question_ids?: string[];
};

type Props = {
  attemptId: string;
  assignmentId: string;
  questions: AssessmentQuestion[];
  title: string;
  timeLimitMinutes?: number | null;
  sections?: SectionMeta[];
  practiceMode?: boolean;
  onComplete: (result: TestCompleteResult) => void;
  showPostForm?: boolean;
  /** When false, candidates see a thank-you screen without scores (default for hiring). */
  showScoreToCandidate?: boolean;
};

const MOBILE_CSS = `
@media (max-width: 640px) {
  .test-interface-grid { grid-template-columns: 1fr !important; }
  .test-interface-aside { order: -1; }
  .test-interface-header { padding: 10px 14px !important; flex-wrap: wrap; gap: 8px; }
  .test-interface-main { padding: 16px 14px !important; }
  .test-interface-nav { flex-wrap: wrap; gap: 8px; }
  .test-interface-nav button { flex: 1; min-width: 100px; justify-content: center; }
  .test-q-palette { max-height: 160px; overflow-y: auto; }
}
`;

function isAnswered(ans?: Record<string, unknown>): boolean {
  if (!ans) return false;
  const selected = ans.selected;
  if (Array.isArray(selected) && selected.length > 0) return true;
  if (selected != null && selected !== '') return true;
  if (typeof ans.text === 'string' && ans.text.trim()) return true;
  if (typeof ans.code === 'string' && ans.code.trim()) return true;
  if (ans.audio_url || ans.video_url || ans.media_url || ans.file_url) return true;
  return Object.values(ans).some((v) => {
    if (v == null || v === '') return false;
    if (typeof v === 'object') return Array.isArray(v) ? v.length > 0 : Object.keys(v as object).length > 0;
    return true;
  });
}

function buildSkippedSet(questions: AssessmentQuestion[], answers: Record<string, Record<string, unknown>>): Set<string> {
  const skipped = new Set<string>();
  for (const q of questions) {
    const rules = (q.metadata?.branch_rules as BranchRule[] | undefined) || [];
    for (const rule of rules) {
      const ans = answers[rule.when.question_id];
      if (!ans) continue;
      const selected = ans.selected;
      const match = Array.isArray(rule.when.answer)
        ? (Array.isArray(selected) ? rule.when.answer.some((a) => (selected as string[]).includes(a)) : rule.when.answer.includes(String(selected)))
        : String(selected) === rule.when.answer;
      if (match && rule.skip_question_ids) {
        rule.skip_question_ids.forEach((id) => skipped.add(id));
      }
    }
  }
  return skipped;
}

export function TestInterface({
  attemptId,
  assignmentId,
  questions,
  title,
  timeLimitMinutes,
  sections,
  practiceMode = false,
  onComplete,
  showPostForm = false,
  showScoreToCandidate = false,
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Record<string, unknown>>>({});
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [reviewMode, setReviewMode] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(timeLimitMinutes ? timeLimitMinutes * 60 : null);
  const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null);
  const [resultScreen, setResultScreen] = useState<TestCompleteResult | null>(null);
  const sectionAdvancedRef = useRef(false);

  const skippedIds = useMemo(() => buildSkippedSet(questions, answers), [questions, answers]);
  const activeQuestions = useMemo(
    () => questions.filter((q) => !skippedIds.has(q.id)),
    [questions, skippedIds],
  );

  const sectionMeta = useMemo(() => {
    if (sections?.length) return sections;
    const bySection = new Map<string, SectionMeta>();
    for (const q of activeQuestions) {
      const sid = String(q.metadata?.section_id ?? 'default');
      const existing = bySection.get(sid) || {
        id: sid,
        title: String(q.metadata?.section_title ?? 'Section'),
        time_limit_minutes: q.metadata?.section_time_limit_minutes as number | null | undefined,
        questionIds: [],
      };
      existing.questionIds.push(q.id);
      bySection.set(sid, existing);
    }
    return [...bySection.values()];
  }, [sections, activeQuestions]);

  const currentSection = useMemo(() => {
    const current = activeQuestions[currentIndex];
    if (!current) return sectionMeta[0];
    return sectionMeta.find((s) => s.questionIds.includes(current.id)) || sectionMeta[0];
  }, [activeQuestions, currentIndex, sectionMeta]);

  const doSubmit = useCallback(async () => {
    setSubmitting(true);
    try {
      for (const q of activeQuestions) {
        const ans = answers[q.id];
        if (!ans) continue;
        if (ans.blob) {
          const ext = ans.media_type === 'video' ? 'webm' : 'webm';
          const url = await uploadAssessmentMedia(attemptId, q.id, ans.blob as Blob, ext);
          const cleaned = { ...ans, media_url: url };
          delete cleaned.blob;
          delete cleaned.preview_url;
          await saveResponse(attemptId, q.id, cleaned, flagged.has(q.id), q);
        } else {
          await saveResponse(attemptId, q.id, ans, flagged.has(q.id), q);
        }
      }

      if (practiceMode) {
        const mockResult: TestCompleteResult = {
          percentage: 0,
          passed: false,
          attemptId,
          showPostForm: false,
          practiceMode: true,
        };
        setResultScreen(mockResult);
        return;
      }

      const { submitAttempt } = await import('../services/attemptService');
      const result = await submitAttempt(attemptId, assignmentId);
      const completeResult: TestCompleteResult = {
        percentage: result.percentage,
        passed: result.passed,
        attemptId,
        showPostForm,
        certificateUrl: result.passed ? `/certificates?attempt=${attemptId}` : undefined,
        practiceMode: false,
      };
      setResultScreen(completeResult);
    } finally {
      setSubmitting(false);
    }
  }, [activeQuestions, answers, flagged, attemptId, assignmentId, practiceMode, showPostForm]);

  const handleAutoSubmit = useCallback(async () => {
    if (submitting || resultScreen) return;
    await doSubmit();
  }, [submitting, resultScreen, doSubmit]);

  const { violationCount } = useIntegrityMonitor(attemptId, practiceMode ? undefined : handleAutoSubmit);

  useEffect(() => {
    if (timeLeft == null || timeLeft <= 0 || practiceMode) return;
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
  }, [timeLeft, handleAutoSubmit, practiceMode]);

  useEffect(() => {
    if (!currentSection?.time_limit_minutes) {
      setSectionTimeLeft(null);
      return;
    }
    setSectionTimeLeft(currentSection.time_limit_minutes * 60);
    sectionAdvancedRef.current = false;
  }, [currentSection?.id]);

  useEffect(() => {
    if (sectionTimeLeft == null || sectionTimeLeft <= 0 || practiceMode) return;
    const t = setInterval(() => {
      setSectionTimeLeft((prev) => {
        if (prev == null || prev <= 1) {
          if (!sectionAdvancedRef.current) {
            sectionAdvancedRef.current = true;
            const lastInSection = currentSection?.questionIds[currentSection.questionIds.length - 1];
            const lastIdx = activeQuestions.findIndex((q) => q.id === lastInSection);
            if (lastIdx >= 0 && lastIdx < activeQuestions.length - 1) {
              setCurrentIndex(lastIdx + 1);
            } else if (lastIdx === activeQuestions.length - 1) {
              setReviewMode(true);
            }
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [sectionTimeLeft, practiceMode, currentSection, activeQuestions]);

  const current = activeQuestions[currentIndex];

  const persistAnswer = async (questionId: string, answer: Record<string, unknown>, isFlagged = false) => {
    const q = questions.find((x) => x.id === questionId);
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    await saveResponse(attemptId, questionId, answer, isFlagged, q);
  };

  const toggleFlag = async () => {
    if (!current) return;
    const next = new Set(flagged);
    if (next.has(current.id)) next.delete(current.id);
    else next.add(current.id);
    setFlagged(next);
    await saveResponse(attemptId, current.id, answers[current.id] || {}, next.has(current.id), current);
  };

  const handleSubmit = async () => {
    if (!reviewMode) {
      setReviewMode(true);
      return;
    }
    await doSubmit();
  };

  if (resultScreen) {
    return (
      <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="lt-card" style={{ padding: 40, textAlign: 'center', maxWidth: 440, width: '100%' }}>
          {resultScreen.practiceMode ? (
            <>
              <Info size={40} color="#d97706" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Practice complete</h2>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 20 }}>Your responses were not submitted for scoring.</p>
            </>
          ) : showScoreToCandidate ? (
            <>
              <Award size={40} color={resultScreen.passed ? '#16a34a' : '#808080'} style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>{resultScreen.passed ? 'Congratulations!' : 'Assessment submitted'}</h2>
              <p style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>{resultScreen.percentage}%</p>
              <p style={{ fontSize: 14, color: resultScreen.passed ? '#16a34a' : '#666', marginBottom: 16 }}>
                {resultScreen.passed ? 'You passed!' : 'Below passing threshold'}
              </p>
              {resultScreen.passed && resultScreen.certificateUrl && (
                <a href={resultScreen.certificateUrl} className="lt-btn-primary" style={{ display: 'inline-block', padding: '10px 20px', marginBottom: 16, textDecoration: 'none' }}>
                  View certificate
                </a>
              )}
            </>
          ) : (
            <>
              <Award size={40} color="#16a34a" style={{ margin: '0 auto 16px' }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Thank you!</h2>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 16 }}>
                Your responses have been submitted successfully. Our team will review your assessment and contact you about next steps.
              </p>
            </>
          )}
          <button type="button" onClick={() => onComplete(resultScreen)} className="lt-btn-secondary" style={{ padding: '10px 20px' }}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  if (!current) {
    return <p style={{ padding: 40, textAlign: 'center', color: '#666' }}>No questions in this assessment.</p>;
  }

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const answeredCount = activeQuestions.filter((q) => isAnswered(answers[q.id])).length;

  const goToQuestion = (index: number) => {
    setReviewMode(false);
    setCurrentIndex(index);
  };

  const renderQuestion = () => {
    const val = answers[current.id] || {};
    const onChange = (a: Record<string, unknown>) => persistAnswer(current.id, a);

    if (['multiple_choice', 'multiple_select', 'true_false', 'situational_judgment', 'personality', 'cognitive'].includes(current.question_type)) {
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
      return <CodingQuestion question={current} value={val} onChange={onChange} />;
    }
    if (current.question_type === 'excel') {
      return <ExcelQuestion question={current} value={val} onChange={onChange} />;
    }
    return <WritingQuestion question={current} value={val} onChange={onChange} />;
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: 'system-ui, sans-serif' }}>
      <style>{MOBILE_CSS}</style>
      {practiceMode && (
        <div style={{ background: '#fef3c7', borderBottom: '1px solid #fcd34d', padding: '8px 20px', fontSize: 12, color: '#92400e', textAlign: 'center' }}>
          Practice mode — responses will not be scored or submitted.
        </div>
      )}
      <header className="test-interface-header" style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 11, color: '#999' }}>
            {currentSection?.title && <span>{currentSection.title} · </span>}
            Question {currentIndex + 1} of {activeQuestions.length}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {sectionTimeLeft != null && (
            <span style={{ fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, color: sectionTimeLeft < 60 ? '#d97706' : '#666' }}>
              <Clock size={13} /> Section {formatTime(sectionTimeLeft)}
            </span>
          )}
          {timeLeft != null && !practiceMode && (
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
        <div style={{ height: '100%', width: `${((currentIndex + 1) / activeQuestions.length) * 100}%`, background: '#171717', transition: 'width 0.2s' }} />
      </div>

      <div className="test-interface-grid" style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px', display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20 }}>
        <main className="test-interface-main">
          {reviewMode ? (
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Review before submit</h2>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
                {answeredCount} of {activeQuestions.length} answered
                {flagged.size > 0 ? ` · ${flagged.size} flagged` : ''}. Tap a question to jump back.
              </p>
              {activeQuestions.map((q, i) => {
                const done = isAnswered(answers[q.id]);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => goToQuestion(i)}
                    style={{
                      width: '100%', textAlign: 'left', padding: '12px 0', border: 'none', borderBottom: '1px solid #f0f0f0',
                      background: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', gap: 8,
                    }}
                  >
                    <span style={{ fontSize: 13, color: '#171717' }}>{i + 1}. {q.prompt.slice(0, 80)}</span>
                    <span style={{ fontSize: 11, color: done ? '#16a34a' : '#c0392b', flexShrink: 0 }}>
                      {done ? 'Answered' : 'Unanswered'}{flagged.has(q.id) ? ' · Flagged' : ''}
                    </span>
                  </button>
                );
              })}
              <div className="test-interface-nav" style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button type="button" onClick={() => setReviewMode(false)} className="lt-btn-secondary" style={{ padding: '10px 18px' }}>Back</button>
                <button type="button" onClick={handleSubmit} disabled={submitting} className="lt-btn-primary" style={{ padding: '10px 18px' }}>
                  {submitting ? 'Submitting...' : practiceMode ? 'Finish practice' : 'Submit assessment'}
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
              <div className="test-interface-nav" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button type="button" onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0} className="lt-btn-secondary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <ChevronLeft size={14} /> Previous
                </button>
                <button type="button" onClick={toggleFlag} style={{ padding: '8px 12px', background: 'none', border: '1px solid #e5e5e5', borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, color: flagged.has(current.id) ? '#c0392b' : '#666' }}>
                  <Flag size={14} /> {flagged.has(current.id) ? 'Flagged' : 'Flag'}
                </button>
                {currentIndex < activeQuestions.length - 1 ? (
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
        <aside className="test-interface-aside" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="lt-card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '-0.01em' }}>Questions</div>
              <div style={{ fontSize: 11, color: '#999' }}>{answeredCount}/{activeQuestions.length}</div>
            </div>
            <div className="test-q-palette" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {activeQuestions.map((q, i) => {
                const done = isAnswered(answers[q.id]);
                const isCurrent = i === currentIndex && !reviewMode;
                const isFlagged = flagged.has(q.id);
                let bg = '#f5f5f5';
                let color = '#666';
                let border = '1px solid transparent';
                if (isCurrent) {
                  bg = '#171717';
                  color = '#fff';
                } else if (done) {
                  bg = '#ecfdf5';
                  color = '#15803d';
                  border = '1px solid #bbf7d0';
                } else if (isFlagged) {
                  bg = '#fef2f2';
                  color = '#b91c1c';
                  border = '1px solid #fecaca';
                }
                return (
                  <button
                    key={q.id}
                    type="button"
                    title={`Question ${i + 1}${done ? ' · answered' : ''}${isFlagged ? ' · flagged' : ''}`}
                    onClick={() => goToQuestion(i)}
                    style={{
                      aspectRatio: '1', borderRadius: 8, border, background: bg, color, fontSize: 12, fontWeight: 700,
                      cursor: 'pointer', position: 'relative', padding: 0, lineHeight: 1,
                    }}
                  >
                    {i + 1}
                    {isFlagged && !isCurrent && (
                      <span style={{ position: 'absolute', top: 2, right: 3, width: 5, height: 5, borderRadius: '50%', background: '#c0392b' }} />
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', marginTop: 12, fontSize: 10, color: '#999' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#171717' }} /> Current
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#ecfdf5', border: '1px solid #bbf7d0' }} /> Done
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#f5f5f5' }} /> Todo
              </span>
            </div>
          </div>
          {!practiceMode && <ProctoringMonitor attemptId={attemptId} violationCount={violationCount} />}
        </aside>
      </div>
    </div>
  );
}
