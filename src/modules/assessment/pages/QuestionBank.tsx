import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchQuestions, archiveQuestion } from '../services/questionService';
import { QUESTION_TYPES } from '../constants';
import type { AssessmentQuestion, QuestionType } from '../types';
import type { OrgViewer } from '../../../utils/orgScope';
import { Plus, Search, Archive, Sparkles, Pencil, ChevronRight, CheckCircle2 } from 'lucide-react';
import { generateQuestions } from '../services/aiService';
import { QuestionEditorModal } from '../components/QuestionEditorModal';
import { saveQuestion } from '../services/questionService';

export function QuestionBank() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AssessmentQuestion | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
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

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (q: AssessmentQuestion) => {
    setEditing(q);
    setEditorOpen(true);
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

  const correctLabel = (q: AssessmentQuestion) => {
    const correct = q.options?.filter((o) => o.is_correct) || [];
    if (!correct.length) return null;
    return correct.map((o) => o.option_text).join(', ');
  };

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Question Bank</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Click any question to edit prompt, answers, and scoring.</p>
        </div>
        <button onClick={openNew} className="lt-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
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

      {loading ? <p style={{ color: '#808080' }}>Loading...</p> : questions.length === 0 ? (
        <div className="lt-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#666', marginBottom: 12 }}>No questions yet.</p>
          <button onClick={openNew} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Create first question</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {questions.map((q) => {
            const answer = correctLabel(q);
            return (
              <div
                key={q.id}
                className="lt-card"
                style={{ padding: '14px 18px', cursor: 'pointer', transition: 'box-shadow 0.12s' }}
                onClick={() => openEdit(q)}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.08)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = ''; }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#171717' }}>{q.title || 'Untitled'}</div>
                    <p style={{ fontSize: 13, color: '#4d4d4d', marginTop: 6, lineHeight: 1.5 }}>
                      {q.prompt.length > 160 ? `${q.prompt.slice(0, 160)}…` : q.prompt}
                    </p>
                    {answer && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#16a34a' }}>
                        <CheckCircle2 size={13} />
                        <span>Correct: {answer}</span>
                      </div>
                    )}
                    {q.options && q.options.length > 0 && !answer && (
                      <div style={{ fontSize: 11, color: '#999', marginTop: 6 }}>
                        {q.options.length} options — click to view & edit
                      </div>
                    )}
                    <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
                      {q.question_type.replace(/_/g, ' ')} · {q.difficulty} · weight {q.weight}
                      {q.tags?.length ? ` · ${q.tags.slice(0, 3).join(', ')}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); openEdit(q); }}
                      className="lt-btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}
                    >
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); archiveQuestion(q.id).then(load); }}
                      className="lt-btn-secondary"
                      style={{ padding: '5px 10px', fontSize: 11 }}
                      title="Archive"
                    >
                      <Archive size={12} />
                    </button>
                    <ChevronRight size={14} color="#ccc" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {viewer?.id && (
        <QuestionEditorModal
          open={editorOpen}
          question={editing}
          viewer={viewer as OrgViewer & { id: string }}
          onClose={() => { setEditorOpen(false); setEditing(null); }}
          onSaved={load}
        />
      )}
    </TestLayout>
  );
}
