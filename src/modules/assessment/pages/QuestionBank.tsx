import { useEffect, useRef, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchQuestions, archiveQuestion, saveQuestion } from '../services/questionService';
import { fetchSkills, type AssessmentSkill } from '../services/platformService';
import { QUESTION_TYPES } from '../constants';
import type { AssessmentQuestion, QuestionType } from '../types';
import type { OrgViewer } from '../../../utils/orgScope';
import { Plus, Search, Sparkles, Pencil, ChevronRight, CheckCircle2, Upload, X, AlertTriangle, Trash2 } from 'lucide-react';
import { generateQuestions } from '../services/aiService';
import { QuestionEditorModal } from '../components/QuestionEditorModal';
import { confirmDelete } from '../utils/confirm';

function parseCsvRow(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else current += ch;
  }
  result.push(current.trim());
  return result;
}

function normalizePrompt(text: string) {
  return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function QuestionBank() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [skills, setSkills] = useState<AssessmentSkill[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<QuestionType | ''>('');
  const [skillFilter, setSkillFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AssessmentQuestion | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiCount, setAiCount] = useState(5);
  const [aiSkillId, setAiSkillId] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [importSkillId, setImportSkillId] = useState('');
  const [importReport, setImportReport] = useState<{ imported: number; skipped: number; duplicates: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const [data, skillData] = await Promise.all([
        fetchQuestions(viewer, { search: search || undefined, type: typeFilter || undefined }),
        fetchSkills(viewer),
      ]);
      setQuestions(data);
      setSkills(skillData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.id, search, typeFilter]);

  const filtered = skillFilter
    ? questions.filter((q) => q.skill_id === skillFilter)
    : questions;

  const existingPrompts = new Set(questions.map((q) => normalizePrompt(q.prompt)));

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
      const result = await generateQuestions(aiPrompt, aiCount);
      for (const q of result.questions) {
        await saveQuestion(
          { ...viewer, id: viewer.id },
          {
            title: q.title,
            prompt: q.prompt,
            question_type: q.question_type,
            skill_id: aiSkillId || undefined,
          },
          q.options,
        );
      }
      setAiPrompt('');
      setAiModalOpen(false);
      await load();
    } finally {
      setAiBusy(false);
    }
  };

  const handleCsvImport = async (file: File) => {
    if (!viewer?.id) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return;

    const header = parseCsvRow(lines[0]).map((h) => h.toLowerCase());
    const titleIdx = header.indexOf('title');
    const promptIdx = header.indexOf('prompt');
    const typeIdx = header.indexOf('type');
    const optionsIdx = header.indexOf('options');

    let imported = 0;
    let skipped = 0;
    const duplicates: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = parseCsvRow(lines[i]);
      const prompt = cols[promptIdx] || '';
      if (!prompt) { skipped++; continue; }

      const norm = normalizePrompt(prompt);
      if (existingPrompts.has(norm)) {
        duplicates.push(prompt.slice(0, 60));
        skipped++;
        continue;
      }

      const questionType = (cols[typeIdx] || 'multiple_choice') as QuestionType;
      const optionTexts = (cols[optionsIdx] || '').split(';').map((o) => o.trim()).filter(Boolean);
      const options = optionTexts.length
        ? optionTexts.map((option_text, idx) => ({ option_text, is_correct: idx === 0 }))
        : [{ option_text: 'Yes', is_correct: true }, { option_text: 'No', is_correct: false }];

      await saveQuestion(
        { ...viewer, id: viewer.id },
        {
          title: cols[titleIdx] || prompt.slice(0, 80),
          prompt,
          question_type: questionType,
          skill_id: importSkillId || undefined,
        },
        options,
      );
      existingPrompts.add(norm);
      imported++;
    }

    setImportReport({ imported, skipped, duplicates });
    await load();
  };

  const correctLabel = (q: AssessmentQuestion) => {
    const correct = q.options?.filter((o) => o.is_correct) || [];
    if (!correct.length) return null;
    return correct.map((o) => o.option_text).join(', ');
  };

  const skillName = (id?: string | null) => skills.find((s) => s.id === id)?.name;

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Question Bank</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Click any question to edit prompt, answers, and scoring.</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => fileRef.current?.click()} className="lt-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13 }}>
            <Upload size={14} /> Import CSV
          </button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvImport(f); e.target.value = ''; }} />
          <button onClick={() => setAiModalOpen(true)} className="lt-btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', fontSize: 13 }}>
            <Sparkles size={14} /> AI generate
          </button>
          <button onClick={openNew} className="lt-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
            <Plus size={14} /> Add question
          </button>
        </div>
      </div>

      {importReport && (
        <div className="lt-card" style={{ padding: 12, marginBottom: 16, fontSize: 12 }}>
          <div style={{ color: '#16a34a' }}>Imported {importReport.imported} questions · Skipped {importReport.skipped}</div>
          {importReport.duplicates.length > 0 && (
            <div style={{ marginTop: 6, color: '#c0392b', display: 'flex', gap: 6, alignItems: 'flex-start' }}>
              <AlertTriangle size={13} style={{ marginTop: 2, flexShrink: 0 }} />
              <span>Duplicates detected: {importReport.duplicates.slice(0, 3).join('; ')}{importReport.duplicates.length > 3 ? '…' : ''}</span>
            </div>
          )}
        </div>
      )}

      <div className="lt-card" style={{ padding: 12, marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', fontSize: 11, color: '#666' }}>
        <span>CSV format: title, prompt, type, options</span>
        <span>·</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          Default skill for import:
          <select className="lt-input" value={importSkillId} onChange={(e) => setImportSkillId(e.target.value)} style={{ width: 160 }}>
            <option value="">None</option>
            {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
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
        <select className="lt-input" value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} style={{ width: 160 }}>
          <option value="">All skills</option>
          {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? <p style={{ color: '#808080' }}>Loading...</p> : filtered.length === 0 ? (
        <div className="lt-card" style={{ padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#666', marginBottom: 12 }}>No questions yet.</p>
          <button onClick={openNew} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Create first question</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((q) => {
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
                    <div style={{ fontSize: 11, color: '#999', marginTop: 8 }}>
                      {q.question_type.replace(/_/g, ' ')} · {q.difficulty} · weight {q.weight}
                      {skillName(q.skill_id) && ` · ${skillName(q.skill_id)}`}
                      {q.tags?.length ? ` · ${q.tags.slice(0, 3).join(', ')}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'center' }}>
                    <button type="button" onClick={(e) => { e.stopPropagation(); openEdit(q); }} className="lt-btn-secondary" style={{ padding: '5px 10px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}>
                      <Pencil size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!confirmDelete(q.title || 'this question')) return;
                        archiveQuestion(q.id).then(load);
                      }}
                      className="lt-btn-secondary test-delete-btn"
                      style={{ padding: '5px 10px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}
                      title="Archive question"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                    <ChevronRight size={14} color="#ccc" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {aiModalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div className="lt-card" style={{ width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Sparkles size={16} /> AI generate questions
              </h3>
              <button type="button" onClick={() => setAiModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <textarea
              className="lt-input"
              placeholder="Topic, job description, or skill area..."
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              rows={4}
              style={{ marginBottom: 12, width: '100%' }}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <label style={{ fontSize: 12 }}>
                Count
                <input type="number" className="lt-input" min={1} max={20} value={aiCount} onChange={(e) => setAiCount(Number(e.target.value))} style={{ marginTop: 4 }} />
              </label>
              <label style={{ fontSize: 12 }}>
                Map to skill
                <select className="lt-input" value={aiSkillId} onChange={(e) => setAiSkillId(e.target.value)} style={{ marginTop: 4 }}>
                  <option value="">None</option>
                  {skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setAiModalOpen(false)} className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
              <button type="button" onClick={handleAiGenerate} disabled={aiBusy} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                {aiBusy ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
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
