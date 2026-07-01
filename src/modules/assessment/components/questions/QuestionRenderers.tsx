import { useState } from 'react';
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

  return (
    <div>
      {passage && <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 16, color: '#4d4d4d' }}>{passage}</p>}
      {audioUrl && <audio controls src={audioUrl} style={{ width: '100%', marginBottom: 16 }} />}
      <MCQQuestion question={question} value={value} onChange={onChange} />
    </div>
  );
}

export function MediaRecordQuestion({
  value,
  onChange,
  mode,
}: Props & { mode: 'audio' | 'video' }) {
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [error, setError] = useState('');

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: mode === 'video',
      });
      const mr = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunks, { type: mode === 'video' ? 'video/webm' : 'audio/webm' });
        const url = URL.createObjectURL(blob);
        onChange({ blob, preview_url: url, media_type: mode });
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start();
      setRecorder(mr);
      setRecording(true);
      setError('');
    } catch {
      setError(`Please allow ${mode === 'video' ? 'camera and microphone' : 'microphone'} access.`);
    }
  };

  const stopRecording = () => {
    recorder?.stop();
    setRecording(false);
    setRecorder(null);
  };

  return (
    <div>
      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 12 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {!recording ? (
          <button type="button" onClick={startRecording} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
            {value.preview_url ? 'Re-record' : `Start ${mode} recording`}
          </button>
        ) : (
          <button type="button" onClick={stopRecording} className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13, color: '#c0392b' }}>
            Stop recording
          </button>
        )}
      </div>
      {value.preview_url && (
        mode === 'video'
          ? <video src={String(value.preview_url)} controls style={{ width: '100%', borderRadius: 8 }} />
          : <audio src={String(value.preview_url)} controls style={{ width: '100%' }} />
      )}
    </div>
  );
}

type TestResult = { label?: string; passed: boolean; expected?: string; actual?: string; error?: string };

function runVisibleTests(code: string, testCases: AssessmentCodingTestCase[] = []): TestResult[] {
  const visible = testCases.filter((t) => !t.is_hidden);
  return visible.map((tc) => {
    try {
      const wrapped = `${code}\n;return (function(){ try { ${tc.input_data ? `const input = ${JSON.stringify(tc.input_data)};` : ''} ${code.includes('function solve') ? 'return typeof solve === "function" ? solve(input) : null;' : ''} } catch(e) { return e.message; } })();`;
      const fn = new Function(wrapped);
      const output = String(fn() ?? '').trim();
      const expected = tc.expected_output.trim();
      return { label: tc.label, passed: output === expected, expected, actual: output };
    } catch (e) {
      return { label: tc.label, passed: false, error: e instanceof Error ? e.message : String(e) };
    }
  });
}

export function CodingQuestion({ question, value, onChange }: Props) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);
  const code = String(value.code ?? question.metadata?.starter_code ?? '');
  const language = String(question.metadata?.language ?? 'javascript');
  const lineCount = Math.max(12, code.split('\n').length);

  const handleRun = () => {
    setRunning(true);
    const results = runVisibleTests(code, question.test_cases);
    const passed = results.filter((r) => r.passed).length;
    setTestResults(results);
    onChange({ code, language, testsPassed: passed, testsTotal: results.length, testResults: results });
    setRunning(false);
  };

  return (
    <div>
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
          onChange={(e) => onChange({ ...value, code: e.target.value, language })}
          rows={lineCount}
          spellCheck={false}
          style={{
            flex: 1, border: 'none', borderRadius: 0, resize: 'vertical',
            fontFamily: 'inherit', fontSize: 'inherit', lineHeight: 1.5, padding: 10,
          }}
          placeholder="// Your code here..."
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
        <button type="button" onClick={handleRun} disabled={running} className="lt-btn-primary" style={{ padding: '6px 14px', fontSize: 12 }}>
          {running ? 'Running...' : 'Run tests'}
        </button>
        <span style={{ fontSize: 11, color: '#999' }}>{language}</span>
      </div>
      {testResults.length > 0 && (
        <div style={{ marginTop: 12, border: '1px solid #e5e5e5', borderRadius: 8, overflow: 'hidden' }}>
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
