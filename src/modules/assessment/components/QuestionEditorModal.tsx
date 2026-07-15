import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import type { AssessmentQuestion, QuestionType } from '../types';
import { QUESTION_TYPES } from '../constants';
import { saveQuestion } from '../services/questionService';
import type { OrgViewer } from '../../../utils/orgScope';
import { X, CheckCircle2, Circle } from 'lucide-react';

export type QuestionFormState = {
  id?: string;
  title: string;
  prompt: string;
  question_type: QuestionType;
  difficulty: string;
  weight: number;
  explanation: string;
  options: { id?: string; option_text: string; is_correct: boolean }[];
  metadata: Record<string, unknown>;
};

const OPTION_TYPES = new Set([
  'multiple_choice', 'multiple_select', 'true_false', 'listening', 'situational_judgment',
]);

const fieldLabel: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#444',
  marginBottom: 6,
};

const fieldStack: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
  width: '100%',
  minWidth: 0,
};

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={fieldStack}>
      <div style={fieldLabel}>{label}</div>
      {children}
    </div>
  );
}

function defaultOptions(type: QuestionType) {
  if (type === 'true_false') {
    return [
      { option_text: 'True', is_correct: true },
      { option_text: 'False', is_correct: false },
    ];
  }
  return [
    { option_text: '', is_correct: true },
    { option_text: '', is_correct: false },
  ];
}

export function questionToForm(q: AssessmentQuestion): QuestionFormState {
  return {
    id: q.id,
    title: q.title || '',
    prompt: q.prompt || '',
    question_type: q.question_type,
    difficulty: q.difficulty || 'medium',
    weight: q.weight ?? 1,
    explanation: q.explanation || '',
    options: q.options?.length
      ? q.options.map((o) => ({ id: o.id, option_text: o.option_text, is_correct: o.is_correct }))
      : defaultOptions(q.question_type),
    metadata: { ...(q.metadata || {}) },
  };
}

export function emptyQuestionForm(type: QuestionType = 'multiple_choice'): QuestionFormState {
  return {
    title: '',
    prompt: '',
    question_type: type,
    difficulty: 'medium',
    weight: 1,
    explanation: '',
    options: defaultOptions(type),
    metadata: {},
  };
}

type Props = {
  open: boolean;
  question: AssessmentQuestion | null;
  viewer: OrgViewer & { id: string };
  onClose: () => void;
  onSaved: () => void;
  readOnly?: boolean;
};

export function QuestionEditorModal({ open, question, viewer, onClose, onSaved, readOnly }: Props) {
  const [form, setForm] = useState<QuestionFormState>(emptyQuestionForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(question ? questionToForm(question) : emptyQuestionForm());
    setError('');
  }, [open, question]);

  if (!open) return null;

  const hasOptions = OPTION_TYPES.has(form.question_type);
  const multiCorrect = form.question_type === 'multiple_select';

  const setCorrectOption = (index: number) => {
    if (multiCorrect) {
      const opts = form.options.map((o, i) =>
        i === index ? { ...o, is_correct: !o.is_correct } : o,
      );
      setForm({ ...form, options: opts });
    } else {
      const opts = form.options.map((o, i) => ({ ...o, is_correct: i === index }));
      setForm({ ...form, options: opts });
    }
  };

  const handleTypeChange = (type: QuestionType) => {
    setForm({
      ...form,
      question_type: type,
      options: OPTION_TYPES.has(type) ? defaultOptions(type) : [],
    });
  };

  const handleSave = async () => {
    if (!form.prompt.trim()) {
      setError('Question prompt is required.');
      return;
    }
    if (hasOptions) {
      const filled = form.options.filter((o) => o.option_text.trim());
      if (filled.length < 2) {
        setError('Add at least two answer options.');
        return;
      }
      if (!filled.some((o) => o.is_correct)) {
        setError('Mark at least one correct answer.');
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      await saveQuestion(
        viewer,
        {
          id: form.id,
          title: form.title || form.prompt.slice(0, 80),
          prompt: form.prompt,
          question_type: form.question_type,
          difficulty: form.difficulty,
          weight: form.weight,
          explanation: form.explanation,
          metadata: form.metadata,
        },
        hasOptions
          ? form.options.filter((o) => o.option_text.trim()).map((o) => ({
            option_text: o.option_text.trim(),
            is_correct: o.is_correct,
          }))
          : undefined,
      );
      onSaved();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.45)', display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        className="lt-card"
        style={{
          width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto',
          padding: 0, boxShadow: '0 24px 48px rgba(0,0,0,0.15)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{
          padding: '16px 20px', borderBottom: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
              {readOnly ? 'View question' : question ? 'Edit question' : 'New question'}
            </h2>
            {question && (
              <p style={{ fontSize: 11, color: '#999', marginTop: 4, marginBottom: 0 }}>
                {form.question_type.replace(/_/g, ' ')} · {form.difficulty} · weight {form.weight}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} color="#666" />
          </button>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {!readOnly && (
            <Field label="Question type">
              <select
                className="lt-input"
                value={form.question_type}
                onChange={(e) => handleTypeChange(e.target.value as QuestionType)}
              >
                {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          )}

          <Field label="Title">
            <input
              className="lt-input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Short label for recruiters"
              readOnly={readOnly}
            />
          </Field>

          <Field label="Prompt">
            <textarea
              className="lt-input"
              rows={4}
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              readOnly={readOnly}
              style={{ resize: 'vertical', minHeight: 96 }}
            />
          </Field>

          {hasOptions && (
            <div>
              <div style={{ ...fieldLabel, marginBottom: 8 }}>
                Answer options {multiCorrect ? '(multiple correct)' : '(select one correct)'}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {form.options.map((opt, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => !readOnly && setCorrectOption(i)}
                      style={{
                        background: 'none', border: 'none', cursor: readOnly ? 'default' : 'pointer',
                        padding: 0, flexShrink: 0, color: opt.is_correct ? '#16a34a' : '#ccc',
                      }}
                      title={opt.is_correct ? 'Correct answer' : 'Mark as correct'}
                    >
                      {opt.is_correct ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                    </button>
                    <input
                      className="lt-input"
                      style={{
                        flex: 1,
                        width: 'auto',
                        borderColor: opt.is_correct ? '#bbf7d0' : undefined,
                        background: opt.is_correct ? '#f0fdf4' : undefined,
                        boxShadow: opt.is_correct
                          ? 'rgba(22,163,74,0.25) 0px 0px 0px 1px'
                          : undefined,
                      }}
                      value={opt.option_text}
                      onChange={(e) => {
                        const opts = [...form.options];
                        opts[i] = { ...opts[i], option_text: e.target.value };
                        setForm({ ...form, options: opts });
                      }}
                      placeholder={`Option ${i + 1}`}
                      readOnly={readOnly}
                    />
                    {!readOnly && form.options.length > 2 && form.question_type !== 'true_false' && (
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, options: form.options.filter((_, j) => j !== i) })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 18 }}
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!readOnly && form.question_type !== 'true_false' && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, options: [...form.options, { option_text: '', is_correct: false }] })}
                  className="lt-btn-secondary"
                  style={{ marginTop: 8, padding: '6px 12px', fontSize: 12 }}
                >
                  + Add option
                </button>
              )}
            </div>
          )}

          {(form.question_type === 'short_answer' || form.question_type === 'long_answer') && (
            <Field label="Expected answer (auto-grade exact match, optional)">
              <input
                className="lt-input"
                value={String(form.metadata.expected_answer ?? '')}
                onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, expected_answer: e.target.value } })}
                readOnly={readOnly}
              />
            </Field>
          )}

          {form.question_type === 'listening' && (
            <Field label="Listening passage / scenario">
              <textarea
                className="lt-input"
                rows={3}
                value={String(form.metadata.passage ?? '')}
                onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, passage: e.target.value } })}
                readOnly={readOnly}
                style={{ resize: 'vertical' }}
              />
            </Field>
          )}

          {(form.question_type === 'coding' || form.question_type === 'sql') && (
            <Field label="Starter code (optional)">
              <textarea
                className="lt-input"
                style={{ fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
                rows={5}
                value={String(form.metadata.starter_code ?? '')}
                onChange={(e) => setForm({ ...form, metadata: { ...form.metadata, starter_code: e.target.value } })}
                readOnly={readOnly}
              />
            </Field>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Difficulty">
              <select
                className="lt-input"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                disabled={readOnly}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </Field>
            <Field label="Weight">
              <input
                type="number"
                className="lt-input"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: Number(e.target.value) || 1 })}
                readOnly={readOnly}
                min={0.1}
                step={0.1}
              />
            </Field>
          </div>

          <Field label="Explanation (shown after grading, optional)">
            <textarea
              className="lt-input"
              rows={2}
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              readOnly={readOnly}
              placeholder="Why the correct answer is correct..."
              style={{ resize: 'vertical' }}
            />
          </Field>

          {error && <p style={{ color: '#c0392b', fontSize: 13, margin: 0 }}>{error}</p>}
        </div>

        <div style={{
          padding: '14px 20px', borderTop: '1px solid #f0f0f0',
          display: 'flex', justifyContent: 'flex-end', gap: 8,
          position: 'sticky', bottom: 0, background: '#fff',
        }}>
          <button type="button" onClick={onClose} className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>
            {readOnly ? 'Close' : 'Cancel'}
          </button>
          {!readOnly && (
            <button type="button" onClick={handleSave} disabled={saving} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
              {saving ? 'Saving...' : 'Save question'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
