import { useCallback, useEffect, useRef, useState } from 'react';
import type { AssessmentQuestion, AssessmentQuestionOption, AssessmentCodingTestCase } from '../../types';

type Props = {
  question: AssessmentQuestion;
  value: Record<string, unknown>;
  onChange: (answer: Record<string, unknown>) => void;
};

export function MCQQuestion({ question, value, onChange }: Props) {
  const options = question.options || [];
  const multi = question.question_type === 'multiple_select';
  const selected = multi
    ? new Set((value.selected as string[]) || [])
    : value.selected;

  const toggle = (opt: AssessmentQuestionOption) => {
    if (multi) {
      const next = new Set((value.selected as string[]) || []);
      if (next.has(opt.id)) next.delete(opt.id);
      else next.add(opt.id);
      onChange({ selected: [...next] });
    } else {
      onChange({ selected: opt.id });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((opt) => {
        const checked = multi ? (selected as Set<string>).has(opt.id) : selected === opt.id;
        return (
          <label
            key={opt.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
              border: '1px solid #e5e5e5', borderRadius: 8, cursor: 'pointer',
              background: checked ? '#f5f5f5' : '#fff',
            }}
          >
            <input type={multi ? 'checkbox' : 'radio'} checked={checked} onChange={() => toggle(opt)} />
            <span style={{ fontSize: 14 }}>{opt.option_text}</span>
          </label>
        );
      })}
    </div>
  );
}

export function WritingQuestion({ question, value, onChange }: Props) {
  const long = question.question_type === 'long_answer';
  return (
    <textarea
      className="lt-input"
      rows={long ? 8 : 3}
      value={String(value.text ?? '')}
      onChange={(e) => onChange({ text: e.target.value, word_count: e.target.value.trim().split(/\s+/).filter(Boolean).length })}
      placeholder="Type your response..."
    />
  );
}

export function ListeningQuestion({ question, value, onChange }: Props) {
  const audioUrl = String(question.metadata?.audio_url ?? '');
  const passage = String(question.metadata?.passage ?? '');
  const hasAudio = Boolean(audioUrl);

  return (
    <div>
      <div style={{
        marginBottom: 14, padding: '10px 12px', borderRadius: 10,
        background: hasAudio ? '#eff6ff' : '#f8fafc',
        border: `1px solid ${hasAudio ? '#bfdbfe' : '#e2e8f0'}`,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: hasAudio ? '#1d4ed8' : '#64748b', marginBottom: 4 }}>
          {hasAudio ? 'Listening' : 'Read carefully'}
        </div>
        <p style={{ fontSize: 12, color: '#666', margin: 0, lineHeight: 1.5 }}>
          {hasAudio
            ? 'Play the audio, then answer the question below.'
            : 'This is a comprehension question. Read the passage, then choose the best answer.'}
        </p>
      </div>
      {passage && (
        <div style={{
          fontSize: 14, lineHeight: 1.7, marginBottom: 16, color: '#171717',
          padding: '14px 16px', borderRadius: 10, background: '#fff', border: '1px solid #eee',
        }}>
          {passage}
        </div>
      )}
      {hasAudio && <audio controls src={audioUrl} style={{ width: '100%', marginBottom: 16 }} />}
      <MCQQuestion question={question} value={value} onChange={onChange} />
    </div>
  );
}

export function MediaRecordQuestion({
  question,
  value,
  onChange,
  mode,
}: Props & { mode: 'audio' | 'video' }) {
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [error, setError] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);
  const videoPreviewRef = useRef<HTMLVideoElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const maxSeconds = Number(question.metadata?.max_duration_seconds ?? (mode === 'video' ? 120 : 90));
  const playbackUrl = String(value.preview_url || value.media_url || '');
  const aiAudioEval = question.metadata?.ai_score_audio === true
    || (question.tags || []).some((t) => ['ai-audio-eval', 'german'].includes(String(t).toLowerCase()));
  const speakLang = typeof question.metadata?.language === 'string' ? question.metadata.language : null;

  useEffect(() => () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  useEffect(() => {
    if (recording && mode === 'video' && videoPreviewRef.current && streamRef.current) {
      videoPreviewRef.current.srcObject = streamRef.current;
      videoPreviewRef.current.play().catch(() => undefined);
    }
  }, [recording, mode]);

  const stopRecording = useCallback(() => {
    recorder?.stop();
    setRecording(false);
    setRecorder(null);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [recorder]);

  useEffect(() => {
    if (!recording) return undefined;
    if (elapsed >= maxSeconds) {
      stopRecording();
    }
    return undefined;
  }, [elapsed, maxSeconds, recording, stopRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      });
      streamRef.current = stream;
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      elapsedRef.current = 0;
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mode === 'video' ? 'video/webm' : 'audio/webm' });
        const url = URL.createObjectURL(blob);
        const durationSeconds = Math.min(elapsedRef.current || maxSeconds, maxSeconds);
        setUploading(true);
        onChange({
          blob,
          preview_url: url,
          media_type: mode,
          duration_seconds: durationSeconds,
          submitted: true,
        });
        setUploading(false);
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };
      mr.start(250);
      setRecorder(mr);
      setRecording(true);
      setElapsed(0);
      setError('');
      timerRef.current = window.setInterval(() => {
        elapsedRef.current += 1;
        setElapsed(elapsedRef.current);
      }, 1000);
    } catch {
      setError(`Please allow ${mode === 'video' ? 'camera and microphone' : 'microphone'} access.`);
    }
  };

  const remaining = Math.max(0, maxSeconds - elapsed);
  const formatClock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div>
      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      {aiAudioEval && (
        <p style={{ fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 1.45 }}>
          Your recording’s audio will be transcribed and evaluated by AI
          {speakLang === 'de' ? ' (German — grammar, fluency, vocabulary, clarity)' : ' (grammar, fluency, clarity)'}
          {' '}after you submit.
        </p>
      )}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        {!recording ? (
          <button type="button" onClick={startRecording} disabled={uploading} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
            {playbackUrl ? 'Re-record' : `Start ${mode} recording`}
          </button>
        ) : (
          <button type="button" onClick={stopRecording} className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13, color: '#c0392b' }}>
            Stop recording
          </button>
        )}
        <span style={{ fontSize: 12, color: recording ? (remaining <= 10 ? '#c0392b' : '#666') : '#999', fontWeight: 600 }}>
          {recording ? `Recording ${formatClock(elapsed)} · ${formatClock(remaining)} left` : `Max ${formatClock(maxSeconds)}`}
        </span>
        {(uploading || value.media_url) && (
          <span className="answer-saved-badge" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
            background: '#ecfdf5', color: '#166534',
          }}>
            {uploading ? 'Saving recording…' : '✓ Recording saved'}
          </span>
        )}
      </div>
      {recording && mode === 'video' && (
        <video
          ref={videoPreviewRef}
          muted
          playsInline
          style={{ width: '100%', maxHeight: 280, borderRadius: 8, background: '#111', marginBottom: 12 }}
        />
      )}
      {playbackUrl && !recording && (
        mode === 'video'
          ? <video src={playbackUrl} controls style={{ width: '100%', borderRadius: 8 }} />
          : <audio src={playbackUrl} controls style={{ width: '100%' }} />
      )}
    </div>
  );
}

type TestResult = { label?: string; passed: boolean; expected?: string; actual?: string; error?: string };

type SampleTest = {
  label?: string;
  input_data: string;
  expected_output: string;
  is_hidden?: boolean;
};

function builtinSampleTests(question: AssessmentQuestion): SampleTest[] {
  const title = question.title.toLowerCase();
  const starter = String(question.metadata?.starter_code ?? '');
  if (title.includes('fizzbuzz') || starter.includes('function fizzBuzz')) {
    return [
      { label: '3 → Fizz', input_data: '3', expected_output: 'Fizz' },
      { label: '5 → Buzz', input_data: '5', expected_output: 'Buzz' },
      { label: '15 → FizzBuzz', input_data: '15', expected_output: 'FizzBuzz' },
      { label: '7 → "7"', input_data: '7', expected_output: '7' },
    ];
  }
  if (title.includes('two sum') || starter.includes('function twoSum')) {
    return [
      { label: 'Example 1', input_data: '[2,7,11,15], 9', expected_output: '[0,1]' },
      { label: 'Example 2', input_data: '[3,2,4], 6', expected_output: '[1,2]' },
      { label: 'Example 3', input_data: '[3,3], 6', expected_output: '[0,1]' },
    ];
  }
  return [];
}

function builtinSqlKeywords(question: AssessmentQuestion): string[] {
  const title = question.title.toLowerCase();
  if (title.includes('active users')) return ['select', 'distinct', 'user_id', 'logins'];
  if (title.includes('department headcount')) return ['select', 'join', 'group by', 'count', 'order by'];
  if (title.includes('monthly revenue')) return ['select', 'sum', 'group by'];
  if (title.includes('second purchase')) return ['select', 'count', 'orders'];
  return [];
}

function resolveTestCases(question: AssessmentQuestion): AssessmentCodingTestCase[] {
  if (question.test_cases?.length) return question.test_cases;
  const samples = (question.metadata?.sample_tests as SampleTest[] | undefined) || builtinSampleTests(question);
  return samples.map((tc, i) => ({
    id: `sample-${i}`,
    question_id: question.id,
    label: tc.label,
    input_data: tc.input_data,
    expected_output: tc.expected_output,
    is_hidden: Boolean(tc.is_hidden),
    weight: 1,
    sort_order: i,
  }));
}

function extractEntryName(code: string): string | null {
  const match = code.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
  return match?.[1] ?? null;
}

function normalizeOutput(value: string): string {
  const trimmed = value.trim();
  try {
    return JSON.stringify(JSON.parse(trimmed));
  } catch {
    return trimmed;
  }
}

function runVisibleTests(code: string, testCases: AssessmentCodingTestCase[] = []): TestResult[] {
  const visible = testCases.filter((t) => !t.is_hidden);
  if (!visible.length) return [];

  const entry = extractEntryName(code) || 'solve';

  return visible.map((tc) => {
    try {
      // input_data is a JS argument list expression, e.g. "15" or "[2,7,11,15], 9"
      const runner = new Function(`
        "use strict";
        ${code}
        if (typeof ${entry} !== "function") {
          throw new Error("Define function ${entry}(...) to run tests");
        }
        const __args = [${tc.input_data}];
        const __out = ${entry}(...__args);
        if (__out === undefined) return "undefined";
        if (__out === null) return "null";
        if (typeof __out === "object") return JSON.stringify(__out);
        return String(__out);
      `);
      const output = String(runner() ?? '').trim();
      const expected = tc.expected_output.trim();
      return {
        label: tc.label,
        passed: normalizeOutput(output) === normalizeOutput(expected),
        expected,
        actual: output,
      };
    } catch (e) {
      return { label: tc.label, passed: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
}

function AnswerSavedBadge({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span className="answer-saved-badge" style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700,
      background: '#ecfdf5', color: '#166534',
    }}>
      ✓ Answer saved
    </span>
  );
}

function CodeEditor({
  code,
  onCodeChange,
  placeholder,
}: {
  code: string;
  onCodeChange: (next: string) => void;
  placeholder: string;
}) {
  const lineCount = Math.max(12, code.split('\n').length);
  return (
    <div style={{ display: 'flex', border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden', fontFamily: 'ui-monospace, monospace', fontSize: 13 }}>
      <div
        aria-hidden
        style={{
          padding: '10px 8px', background: '#f8f8f8', color: '#999', textAlign: 'right',
          userSelect: 'none', lineHeight: 1.5, minWidth: 36, borderRight: '1px solid #e5e5e5',
        }}
      >
        {Array.from({ length: lineCount }, (_, i) => <div key={i}>{i + 1}</div>)}
      </div>
      <textarea
        className="lt-input"
        value={code}
        onChange={(e) => onCodeChange(e.target.value)}
        rows={lineCount}
        spellCheck={false}
        style={{
          flex: 1, border: 'none', borderRadius: 0, resize: 'vertical',
          fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 1.5, padding: 10,
        }}
        placeholder={placeholder}
      />
    </div>
  );
}

export function CodingQuestion({ question, value, onChange }: Props) {
  const [testResults, setTestResults] = useState<TestResult[]>(
    Array.isArray(value.testResults) ? (value.testResults as TestResult[]) : [],
  );
  const [running, setRunning] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const code = String(value.code ?? question.metadata?.starter_code ?? '');
  const language = String(question.metadata?.language ?? 'javascript');
  const testCases = resolveTestCases(question);
  const flashTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  const flashSaved = () => {
    setSavedFlash(true);
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setSavedFlash(false), 1800);
  };

  const handleRun = () => {
    if (!testCases.length) {
      setTestResults([]);
      onChange({
        code,
        language,
        submitted: true,
        testsPassed: 0,
        testsTotal: 0,
        saved_at: new Date().toISOString(),
      });
      flashSaved();
      return;
    }

    setRunning(true);
    window.setTimeout(() => {
      const results = runVisibleTests(code, testCases);
      const passed = results.filter((r) => r.passed).length;
      setTestResults(results);
      onChange({
        code,
        language,
        submitted: true,
        testsPassed: passed,
        testsTotal: results.length,
        testResults: results,
        saved_at: new Date().toISOString(),
      });
      setRunning(false);
      flashSaved();
    }, 180);
  };

  const handleSaveOnly = () => {
    onChange({
      ...value,
      code,
      language,
      submitted: true,
      saved_at: new Date().toISOString(),
    });
    flashSaved();
  };

  return (
    <div>
      <CodeEditor
        code={code}
        onCodeChange={(next) => onChange({ ...value, code: next, language, submitted: false })}
        placeholder="// Your code here..."
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={handleRun} disabled={running || !code.trim()} className="lt-btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
          {running ? 'Running...' : testCases.length ? 'Run tests' : 'Save answer'}
        </button>
        {testCases.length > 0 && (
          <button type="button" onClick={handleSaveOnly} disabled={!code.trim()} className="lt-btn-secondary" style={{ padding: '6px 14px', fontSize: 12 }}>
            Save without running
          </button>
        )}
        <span style={{ fontSize: 11, color: '#999' }}>{language}</span>
        <AnswerSavedBadge show={savedFlash || Boolean(value.submitted)} />
      </div>
      {!testCases.length && (
        <p style={{ fontSize: 12, color: '#666', marginTop: 10, lineHeight: 1.5 }}>
          No automated tests are configured for this question. Write your solution and click Save answer — your code will be stored for review.
        </p>
      )}
      {testResults.length > 0 && (
        <div className="test-results-panel" style={{ marginTop: 12, border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, background: '#fafafa', borderBottom: '1px solid #f0f0f0' }}>
            {testResults.filter((r) => r.passed).length}/{testResults.length} tests passed
          </div>
          {testResults.map((r, i) => (
            <div key={i} style={{ padding: '8px 12px', fontSize: 12, borderTop: i ? '1px solid #f0f0f0' : undefined, background: r.passed ? '#f0fdf4' : '#fef2f2' }}>
              <span style={{ fontWeight: 600, color: r.passed ? '#16a34a' : '#c0392b' }}>
                {r.passed ? '✓' : '✗'} {r.label || `Test ${i + 1}`}
              </span>
              {!r.passed && r.expected != null && (
                <div style={{ color: '#666', marginTop: 4 }}>Expected: {r.expected} · Got: {r.actual}</div>
              )}
              {r.error && <div style={{ color: '#c0392b', marginTop: 4 }}>{r.error}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function scoreSqlKeywords(sql: string, keywords: string[]) {
  const lower = sql.toLowerCase();
  const hits = keywords.filter((k) => lower.includes(k.toLowerCase()));
  return { hits: hits.length, total: keywords.length, matched: hits };
}

export function SqlQuestion({ question, value, onChange }: Props) {
  const starter = String(question.metadata?.starter_code ?? 'SELECT\n  -- write your query here\n;');
  const code = String(value.code ?? starter);
  const [checking, setChecking] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(
    value.submitted ? { ok: true, message: 'Answer saved' } : null,
  );
  const keywords = (question.metadata?.expected_keywords as string[] | undefined)?.length
    ? (question.metadata?.expected_keywords as string[])
    : builtinSqlKeywords(question);
  const schemaHint = String(question.metadata?.schema_hint ?? '');

  const handleSave = () => {
    const trimmed = code.trim();
    if (!trimmed || trimmed === starter.trim()) {
      setFeedback({ ok: false, message: 'Write your SQL query before saving.' });
      return;
    }

    setChecking(true);
    window.setTimeout(() => {
      const looksLikeSql = /\b(select|with|insert|update|delete|create)\b/i.test(trimmed);
      if (!looksLikeSql) {
        setFeedback({ ok: false, message: 'Your answer should be a SQL statement (e.g. start with SELECT).' });
        setChecking(false);
        return;
      }

      let testsPassed = 1;
      let testsTotal = 1;
      let detail = 'Answer saved for review.';

      if (keywords.length) {
        const scored = scoreSqlKeywords(trimmed, keywords);
        testsPassed = scored.hits;
        testsTotal = scored.total;
        detail = scored.hits === scored.total
          ? `Answer saved · matched all ${scored.total} required patterns.`
          : `Answer saved · matched ${scored.hits}/${scored.total} required patterns.`;
      }

      onChange({
        code: trimmed,
        language: 'sql',
        submitted: true,
        testsPassed,
        testsTotal,
        saved_at: new Date().toISOString(),
      });
      setFeedback({ ok: true, message: detail });
      setChecking(false);
    }, 220);
  };

  return (
    <div>
      {schemaHint && (
        <div style={{ fontSize: 12, color: '#666', background: '#f8f8f8', border: '1px solid #eee', borderRadius: 8, padding: '10px 12px', marginBottom: 12, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
          {schemaHint}
        </div>
      )}
      <CodeEditor
        code={code}
        onCodeChange={(next) => {
          setFeedback(null);
          onChange({ ...value, code: next, language: 'sql', submitted: false });
        }}
        placeholder="SELECT ..."
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" onClick={handleSave} disabled={checking || !code.trim()} className="lt-btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
          {checking ? 'Checking...' : value.submitted ? 'Update answer' : 'Save answer'}
        </button>
        <span style={{ fontSize: 11, color: '#999' }}>sql</span>
        {feedback?.ok && <AnswerSavedBadge show />}
      </div>
      {feedback && (
        <div
          className={feedback.ok ? 'answer-saved-panel' : undefined}
          style={{
            marginTop: 12, padding: '10px 12px', borderRadius: 8, fontSize: 12, lineHeight: 1.5,
            background: feedback.ok ? '#ecfdf5' : '#fef2f2',
            color: feedback.ok ? '#166534' : '#b91c1c',
            border: `1px solid ${feedback.ok ? '#bbf7d0' : '#fecaca'}`,
          }}
        >
          {feedback.message}
        </div>
      )}
      <p style={{ fontSize: 12, color: '#666', marginTop: 10, lineHeight: 1.5 }}>
        SQL runs are checked in-browser for structure (not a live database). Click Save answer so your query is submitted for scoring.
      </p>
    </div>
  );
}

export function ExcelQuestion({ question, value, onChange }: Props) {
  const rows = Number(question.metadata?.grid_rows ?? 4);
  const cols = Number(question.metadata?.grid_cols ?? 4);
  const colLabels = Array.from({ length: cols }, (_, i) => String.fromCharCode(65 + i));
  const cells = (value.cells as Record<string, string>) || {};

  const setCell = (ref: string, val: string) => {
    onChange({ cells: { ...cells, [ref]: val } });
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ width: 32 }} />
            {colLabels.map((c) => (
              <th key={c} style={{ padding: '4px 8px', color: '#999', fontWeight: 600, fontSize: 11 }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, r) => (
            <tr key={r}>
              <td style={{ padding: '4px 8px', color: '#999', fontWeight: 600, fontSize: 11 }}>{r + 1}</td>
              {colLabels.map((c) => {
                const ref = `${c}${r + 1}`;
                return (
                  <td key={ref} style={{ padding: 2, border: '1px solid #e5e5e5' }}>
                    <input
                      value={cells[ref] ?? ''}
                      onChange={(e) => setCell(ref, e.target.value)}
                      style={{ width: '100%', minWidth: 64, border: 'none', padding: '6px 8px', fontSize: 13, outline: 'none' }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
