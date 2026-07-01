import { useState } from 'react';
import type { AssessmentQuestion, AssessmentQuestionOption } from '../../types';

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
