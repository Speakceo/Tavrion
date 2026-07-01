import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchQuestions, saveQuestion, archiveQuestion } from '../services/questionService';
import { QUESTION_TYPES } from '../constants';
import type { AssessmentQuestion, QuestionType } from '../types';
import { Plus, Search, Archive, Sparkles } from 'lucide-react';
import { generateQuestions } from '../services/aiService';

export function QuestionBank() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', prompt: '', question_type: 'multiple_choice' as QuestionType, options: ['', ''] });
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBusy, setAiBusy] = useState(false);

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const data = await fetchQuestions(viewer, { search: search || undefined, type: typeFilter || undefined });
      setQuestions(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.id, search, typeFilter]);

  const handleSave = async () => {
    if (!viewer?.id || !form.prompt.trim()) return;
    const options = form.question_type === 'multiple_choice' || form.question_type === 'true_false'
      ? form.options.filter(Boolean).map((t, i) => ({ option_text: t, is_correct: i === 0 }))
      : undefined;
    await saveQuestion(
      { ...viewer, id: viewer.id },
      { title: form.title || form.prompt.slice(0, 60), prompt: form.prompt, question_type: form.question_type },
      options,
    );
    setShowForm(false);
    setForm({ title: '', prompt: '', question_type: 'multiple_choice', options: ['', ''] });
    await load();
  };

  const handleAiGenerate = async () => {
    if (!viewer?.id || !aiPrompt.trim()) return;
    setAiBusy(true);
    try {
      const result = await generateQuestions(aiPrompt, 3);
      for (const q of result.questions) {
        await saveQuestion(
          { ...viewer, id: viewer.id },
          { title: q.title, prompt: q.prompt, question_type: q.question_type },
          q.options,
        );
      }
      setAiPrompt('');
      await load();
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Question Bank</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Reusable questions with skills, difficulty, and tags.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="lt-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
          <Plus size={14} /> Add question
        </button>
      </div>

      <div className="lt-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Sparkles size={16} color="#171717" />
          <input className="lt-input" placeholder="AI: Generate questions from a topic or job description..." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <button onClick={handleAiGenerate} disabled={aiBusy} className="lt-btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }}>{aiBusy ? 'Generating...' : 'Generate'}</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#aaa' }} />
          <input className="lt-input" placeholder="Search questions..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ paddingLeft: 32, width: '100%' }} />
        </div>
        <select className="lt-input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as QuestionType | '')} style={{ width: 180 }}>
          <option value="">All types</option>
          {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="lt-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>New question</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select className="lt-input" value={form.question_type} onChange={(e) => setForm({ ...form, question_type: e.target.value as QuestionType })}>
              {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input className="lt-input" placeholder="Title (optional)" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <textarea className="lt-input" placeholder="Question prompt" value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} rows={3} />
            {(form.question_type === 'multiple_choice' || form.question_type === 'multiple_select') && form.options.map((opt, i) => (
              <input key={i} className="lt-input" placeholder={`Option ${i + 1}`} value={opt} onChange={(e) => {
                const opts = [...form.options];
                opts[i] = e.target.value;
                setForm({ ...form, options: opts });
              }} />
            ))}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={handleSave} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Save</button>
              <button onClick={() => setShowForm(false)} className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#808080' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.map((q) => (
            <div key={q.id} className="lt-card" style={{ padding: '14px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{q.title || q.prompt.slice(0, 80)}</div>
                  <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                    {q.question_type.replace(/_/g, ' ')} · {q.difficulty} · weight {q.weight}
                  </div>
                </div>
                <button onClick={() => archiveQuestion(q.id).then(load)} className="lt-btn-secondary" style={{ padding: '5px 10px', fontSize: 11 }}>
                  <Archive size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </TestLayout>
  );
}
