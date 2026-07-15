import { useCallback, useEffect, useMemo, useState, type DragEvent } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAssessmentWithSections, deleteAssessment } from '../services/assessmentService';
import { fetchQuestions, fetchQuestionById } from '../services/questionService';
import { createAssignment } from '../services/assignmentService';
import {
  listVersionSnapshots,
  restoreVersionSnapshot,
  saveAssessmentAsTemplate,
  type VersionSnapshot,
} from '../services/platformService';
import { supabase } from '../../../lib/supabase';
import type { Assessment, AssessmentQuestion, AssessmentSection } from '../types';
import type { OrgViewer } from '../../../utils/orgScope';
import {
  ArrowLeft, Plus, GripVertical, Pencil, Trash2, Eye, ChevronUp, ChevronDown,
  ExternalLink, Save, History, Settings2, Shuffle, Search, Inbox,
} from 'lucide-react';
import { QuestionEditorModal } from '../components/QuestionEditorModal';
import { confirmDelete } from '../utils/confirm';

type BranchingRule = { if_skill_below: string; show_section: string; threshold: number };

const BANK_DRAG_MIME = 'application/x-tavrion-question-id';

export function AssessmentBuilder() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [bank, setBank] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<AssessmentQuestion | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [bankDragActive, setBankDragActive] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [snapshots, setSnapshots] = useState<VersionSnapshot[]>([]);
  const [showVersions, setShowVersions] = useState(false);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [previewLink, setPreviewLink] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [dropInsertAt, setDropInsertAt] = useState<number | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [a, questions] = await Promise.all([
        fetchAssessmentWithSections(id, viewer),
        viewer ? fetchQuestions(viewer) : [],
      ]);
      setAssessment(a as Assessment | null);
      setBank(questions);
      const settings = (a as Assessment | null)?.settings as Record<string, unknown> | undefined;
      if (settings?.preview_assignment_id) {
        setPreviewLink(`/test/take/${settings.preview_assignment_id}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSnapshots = useCallback(async () => {
    if (!id) return;
    const data = await listVersionSnapshots(id);
    setSnapshots(data);
  }, [id]);

  useEffect(() => { load(); }, [id, profile?.id]);
  useEffect(() => { if (showVersions && id) loadSnapshots(); }, [showVersions, id, loadSnapshots]);

  const flash = (text: string) => {
    setMessage(text);
    setTimeout(() => setMessage(''), 3500);
  };

  const primarySection = assessment?.sections?.[0] as AssessmentSection | undefined;

  const ensureSection = async () => {
    if (!id || !assessment) return null;
    const sections = assessment.sections || [];
    if (sections.length > 0) return sections[0].id;

    const { data } = await supabase
      .from('assessment_sections')
      .insert({ assessment_id: id, title: 'Section 1', sort_order: 0 })
      .select()
      .single();
    return data?.id;
  };

  const addQuestionToAssessment = async (questionId: string, insertAt?: number) => {
    if (!id) return;
    setSaving(true);
    try {
      const sectionId = await ensureSection();
      if (!sectionId) return;

      const { data: existing } = await supabase
        .from('assessment_section_questions')
        .select('id, sort_order')
        .eq('section_id', sectionId)
        .order('sort_order', { ascending: true });

      const rows = existing || [];
      const at = insertAt == null || insertAt < 0 || insertAt > rows.length ? rows.length : insertAt;

      await supabase.from('assessment_section_questions').insert({
        section_id: sectionId,
        question_id: questionId,
        sort_order: at,
      });

      // Shift existing items at/after insert point
      await Promise.all(
        rows.slice(at).map((r, i) =>
          supabase.from('assessment_section_questions').update({ sort_order: at + 1 + i }).eq('id', r.id),
        ),
      );

      await supabase.from('assessments').update({ updated_at: new Date().toISOString() }).eq('id', id);
      flash('Question added to assessment.');
      await load();
    } finally {
      setSaving(false);
      setBankDragActive(false);
      setDropInsertAt(null);
    }
  };

  const removeFromAssessment = async (sectionQuestionId: string) => {
    setSaving(true);
    try {
      await supabase.from('assessment_section_questions').delete().eq('id', sectionQuestionId);
      if (id) await supabase.from('assessments').update({ updated_at: new Date().toISOString() }).eq('id', id);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const persistQuestionOrder = async (orderedIds: string[]) => {
    setSaving(true);
    try {
      await Promise.all(
        orderedIds.map((sqId, i) =>
          supabase.from('assessment_section_questions').update({ sort_order: i }).eq('id', sqId),
        ),
      );
      if (id) await supabase.from('assessments').update({ updated_at: new Date().toISOString() }).eq('id', id);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const moveQuestion = async (index: number, direction: -1 | 1) => {
    const items = sectionQuestions;
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    await persistQuestionOrder(reordered.map((sq) => sq.id));
  };

  const handleDrop = async (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDropInsertAt(null);
      return;
    }
    const reordered = [...sectionQuestions];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setDropInsertAt(null);
    await persistQuestionOrder(reordered.map((sq) => sq.id));
  };

  const handleBankDrop = async (e: DragEvent, insertAt?: number) => {
    e.preventDefault();
    e.stopPropagation();
    const questionId =
      e.dataTransfer.getData(BANK_DRAG_MIME) || e.dataTransfer.getData('text/plain');
    setBankDragActive(false);
    setDropInsertAt(null);
    if (!questionId || usedIds.has(questionId)) return;
    await addQuestionToAssessment(questionId, insertAt);
  };

  const onZoneDragOver = (e: DragEvent, insertAt?: number) => {
    e.preventDefault();
    const types = Array.from(e.dataTransfer.types || []);
    if (types.includes(BANK_DRAG_MIME) || types.includes('text/plain')) {
      setBankDragActive(true);
      if (insertAt != null) setDropInsertAt(insertAt);
      e.dataTransfer.dropEffect = 'copy';
    } else if (dragIndex != null) {
      e.dataTransfer.dropEffect = 'move';
      if (insertAt != null) setDropInsertAt(insertAt);
    }
  };

  const openQuestion = async (questionId: string, preview = false) => {
    const fresh = await fetchQuestionById(questionId, viewer);
    if (fresh) {
      setEditing(fresh);
      setPreviewOnly(preview);
      setEditorOpen(true);
    }
  };

  const updateMeta = async (field: string, value: unknown) => {
    if (!id) return;
    await supabase.from('assessments').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    await load();
  };

  const updateSettings = async (patch: Record<string, unknown>) => {
    if (!id || !assessment) return;
    const settings = { ...(assessment.settings || {}), ...patch };
    await supabase.from('assessments').update({ settings, updated_at: new Date().toISOString() }).eq('id', id);
    setAssessment({ ...assessment, settings });
    await load();
  };

  const updateBranding = async (patch: Record<string, unknown>) => {
    if (!id || !assessment) return;
    const branding = { ...(assessment.branding || {}), ...patch };
    await supabase.from('assessments').update({ branding, updated_at: new Date().toISOString() }).eq('id', id);
    setAssessment({ ...assessment, branding });
    await load();
  };

  const updateSection = async (sectionId: string, patch: Record<string, unknown>) => {
    await supabase.from('assessment_sections').update(patch).eq('id', sectionId);
    if (id) await supabase.from('assessments').update({ updated_at: new Date().toISOString() }).eq('id', id);
    await load();
  };

  const handleSaveTemplate = async () => {
    if (!viewer?.id || !id) return;
    setTemplateBusy(true);
    try {
      await saveAssessmentAsTemplate(viewer as OrgViewer & { id: string }, id);
      flash('Saved as org template.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Could not save template');
    } finally {
      setTemplateBusy(false);
    }
  };

  const ensurePreviewLink = async () => {
    if (!viewer?.id || !id || !assessment) return;
    const existing = (assessment.settings as Record<string, unknown>)?.preview_assignment_id as string | undefined;
    if (existing) {
      setPreviewLink(`/test/take/${existing}`);
      window.open(`/test/take/${existing}`, '_blank');
      return;
    }
    setSaving(true);
    try {
      const assignment = await createAssignment(
        { ...viewer, id: viewer.id },
        {
          assessment_id: id,
          title: `Preview: ${assessment.title}`,
          assignee_type: 'learner',
          max_attempts: 99,
          targets: [{ user_id: viewer.id }],
        },
      );
      await updateSettings({ preview_assignment_id: assignment.id });
      setPreviewLink(`/test/take/${assignment.id}`);
      window.open(`/test/take/${assignment.id}`, '_blank');
    } finally {
      setSaving(false);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    if (!viewer?.id || !window.confirm('Restore this version? Current draft content will be replaced.')) return;
    setSaving(true);
    try {
      await restoreVersionSnapshot(viewer as OrgViewer & { id: string }, snapshotId);
      flash('Version restored.');
      await load();
      await loadSnapshots();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAssessment = async () => {
    if (!viewer?.id || !id || !assessment) return;
    if (!confirmDelete(assessment.title)) return;
    setSaving(true);
    try {
      await deleteAssessment(viewer as OrgViewer & { id: string }, id);
      window.location.href = '/test/library';
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const sectionQuestions = assessment?.sections?.flatMap((s) =>
    (s.assessment_section_questions || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sq) => ({ ...sq, sectionTitle: s.title, sectionId: s.id })),
  ) || [];

  const usedIds = new Set(sectionQuestions.map((sq) => sq.question_id));
  const available = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    return bank.filter((item) => {
      if (usedIds.has(item.id)) return false;
      if (!q) return true;
      return (
        (item.title || '').toLowerCase().includes(q) ||
        (item.prompt || '').toLowerCase().includes(q) ||
        (item.question_type || '').toLowerCase().includes(q)
      );
    });
  }, [bank, bankSearch, sectionQuestions]);

  const settings = (assessment?.settings || {}) as Record<string, unknown>;
  const branchingRules = (settings.branching_rules as BranchingRule[]) || [];
  const poolSize = primarySection?.question_pool_size;
  const poolActive = poolSize != null && poolSize > 0 && sectionQuestions.length > poolSize;

  if (loading) {
    return <TestLayout><p style={{ color: '#808080' }}>Loading builder...</p></TestLayout>;
  }

  if (!assessment) {
    return <TestLayout><p>Assessment not found.</p></TestLayout>;
  }

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <Link to="/test/library" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to library
        </Link>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={ensurePreviewLink} disabled={saving} className="lt-btn-secondary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <ExternalLink size={13} /> Live preview
          </button>
          {previewLink && (
            <a href={previewLink} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#666', alignSelf: 'center' }}>
              {previewLink}
            </a>
          )}
          <button type="button" onClick={handleSaveTemplate} disabled={templateBusy} className="lt-btn-secondary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Save size={13} /> {templateBusy ? 'Saving...' : 'Save as template'}
          </button>
          <button type="button" onClick={() => setShowVersions((v) => !v)} className="lt-btn-secondary" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <History size={13} /> Version history
          </button>
          <button type="button" onClick={handleDeleteAssessment} disabled={saving} className="lt-btn-secondary test-delete-btn" style={{ padding: '6px 12px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}>
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {message && (
        <div style={{ fontSize: 12, color: '#16a34a', marginBottom: 12 }}>{message}</div>
      )}

      <div className="test-builder-grid">
        <div>
          <input
            className="lt-input"
            value={assessment.title}
            onChange={(e) => setAssessment({ ...assessment, title: e.target.value })}
            onBlur={(e) => updateMeta('title', e.target.value)}
            style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}
          />
          <textarea
            className="lt-input"
            placeholder="Instructions for candidates..."
            value={assessment.instructions || ''}
            onChange={(e) => setAssessment({ ...assessment, instructions: e.target.value })}
            onBlur={(e) => updateMeta('instructions', e.target.value)}
            rows={3}
            style={{ marginBottom: 16 }}
          />

          {primarySection && (
            <div className="lt-card" style={{ padding: 14, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                <Settings2 size={14} />
                <h3 style={{ fontSize: 13, fontWeight: 700 }}>Section: {primarySection.title}</h3>
              </div>
              <div className="test-section-grid">
                <div className="test-field">
                  <span>Section time (min)</span>
                  <input
                    type="number"
                    className="lt-input"
                    value={primarySection.time_limit_minutes ?? ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      sections: assessment.sections?.map((s) =>
                        s.id === primarySection.id ? { ...s, time_limit_minutes: Number(e.target.value) || null } : s,
                      ),
                    })}
                    onBlur={(e) => updateSection(primarySection.id, { time_limit_minutes: Number(e.target.value) || null })}
                  />
                </div>
                <div className="test-field">
                  <span>Pool size</span>
                  <input
                    type="number"
                    className="lt-input"
                    placeholder="All"
                    value={primarySection.question_pool_size ?? ''}
                    onChange={(e) => setAssessment({
                      ...assessment,
                      sections: assessment.sections?.map((s) =>
                        s.id === primarySection.id ? { ...s, question_pool_size: Number(e.target.value) || null } : s,
                      ),
                    })}
                    onBlur={(e) => updateSection(primarySection.id, { question_pool_size: Number(e.target.value) || null })}
                  />
                </div>
                <label style={{ fontSize: 11, display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={primarySection.shuffle_questions ?? false}
                    onChange={(e) => updateSection(primarySection.id, { shuffle_questions: e.target.checked })}
                  />
                  Shuffle section
                </label>
              </div>
              {poolActive && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: '#f5f5f5', borderRadius: 6, fontSize: 11, color: '#666', display: 'flex', gap: 6, alignItems: 'center' }}>
                  <Shuffle size={12} />
                  Candidates receive {poolSize} random questions from a pool of {sectionQuestions.length}.
                </div>
              )}
            </div>
          )}

          <div className="lt-card" style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, gap: 8 }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Assessment questions ({sectionQuestions.length})</h3>
              {saving && <span style={{ fontSize: 11, color: '#999' }}>Saving…</span>}
            </div>
            <p style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
              Drag from the question bank · reorder with handles · click a row to edit
            </p>

            <div
              className={`test-drop-zone${bankDragActive ? ' test-drop-zone--bank-drag' : ''}${dragIndex != null ? ' test-drop-zone--active' : ''}`}
              style={{ padding: sectionQuestions.length === 0 ? 28 : '6px 4px', minHeight: sectionQuestions.length === 0 ? 140 : undefined }}
              onDragOver={(e) => onZoneDragOver(e, sectionQuestions.length)}
              onDragLeave={() => { setBankDragActive(false); setDropInsertAt(null); }}
              onDrop={(e) => {
                if (dragIndex != null) {
                  e.preventDefault();
                  void handleDrop(sectionQuestions.length - 1);
                  return;
                }
                void handleBankDrop(e, sectionQuestions.length);
              }}
            >
              {sectionQuestions.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#888' }}>
                  <Inbox size={28} color="#ccc" style={{ margin: '0 auto 10px' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#555', margin: '0 0 4px' }}>Drop questions here</p>
                  <p style={{ fontSize: 12, margin: 0, lineHeight: 1.5 }}>
                    Drag from the bank on the right, or tap <strong>+</strong> to add.
                  </p>
                </div>
              ) : (
                sectionQuestions.map((sq, i) => {
                  const q = sq.question;
                  const correct = q?.options?.filter((o) => o.is_correct).map((o) => o.option_text).join(', ');
                  return (
                    <div key={sq.id}>
                      {dropInsertAt === i && bankDragActive && (
                        <div style={{ height: 3, background: '#0a72ef', borderRadius: 2, margin: '4px 8px' }} />
                      )}
                      <div
                        className={`test-q-row${dragIndex === i ? ' test-q-row--dragging' : ''}`}
                        draggable
                        onDragStart={(e) => {
                          setDragIndex(i);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => { setDragIndex(null); setDropInsertAt(null); }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          onZoneDragOver(e, i);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const bankId = e.dataTransfer.getData(BANK_DRAG_MIME) || e.dataTransfer.getData('text/plain');
                          if (bankId && !usedIds.has(bankId)) {
                            void handleBankDrop(e, i);
                            return;
                          }
                          void handleDrop(i);
                        }}
                        onClick={() => q && openQuestion(q.id, false)}
                      >
                        <GripVertical size={14} color="#ccc" style={{ marginTop: 2, flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#999', width: 20, marginTop: 2, flexShrink: 0 }}>{i + 1}</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>{q?.title || q?.prompt?.slice(0, 60) || 'Question'}</div>
                          {correct && (
                            <div style={{ fontSize: 11, color: '#16a34a', marginTop: 4 }}>✓ {correct}</div>
                          )}
                          <div style={{ fontSize: 10, color: '#aaa', marginTop: 4 }}>{q?.question_type?.replace(/_/g, ' ')}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                          <button type="button" onClick={() => moveQuestion(i, -1)} disabled={i === 0 || saving} className="lt-btn-secondary" style={{ padding: '4px 6px', fontSize: 11 }} title="Move up">
                            <ChevronUp size={12} />
                          </button>
                          <button type="button" onClick={() => moveQuestion(i, 1)} disabled={i === sectionQuestions.length - 1 || saving} className="lt-btn-secondary" style={{ padding: '4px 6px', fontSize: 11 }} title="Move down">
                            <ChevronDown size={12} />
                          </button>
                          <button type="button" onClick={() => q && openQuestion(q.id, true)} className="lt-btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} title="Preview">
                            <Eye size={12} />
                          </button>
                          <button type="button" onClick={() => q && openQuestion(q.id, false)} className="lt-btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }} title="Edit">
                            <Pencil size={12} />
                          </button>
                          <button type="button" onClick={() => removeFromAssessment(sq.id)} disabled={saving} className="lt-btn-secondary" style={{ padding: '4px 8px', fontSize: 11, color: '#c0392b' }} title="Remove">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="test-form-grid" style={{ marginBottom: 8 }}>
            <div className="test-field">
              <span>Passing score (%)</span>
              <input type="number" className="lt-input" value={assessment.passing_score} onChange={(e) => setAssessment({ ...assessment, passing_score: Number(e.target.value) })} onBlur={(e) => updateMeta('passing_score', Number(e.target.value))} />
            </div>
            <div className="test-field">
              <span>Overall time limit (min)</span>
              <input type="number" className="lt-input" value={assessment.time_limit_minutes || ''} onChange={(e) => setAssessment({ ...assessment, time_limit_minutes: Number(e.target.value) || null })} onBlur={(e) => updateMeta('time_limit_minutes', Number(e.target.value) || null)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 72 }}>
          <div className="lt-card" style={{ padding: 14 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Assessment settings</h3>
            <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <input type="checkbox" checked={assessment.shuffle_questions} onChange={(e) => updateMeta('shuffle_questions', e.target.checked)} />
              Shuffle questions globally
            </label>
            <label style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <input
                type="checkbox"
                checked={Boolean(settings.negative_marking)}
                onChange={(e) => updateSettings({ negative_marking: e.target.checked })}
              />
              Negative marking
            </label>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Branding</div>
            <label style={{ fontSize: 11, display: 'block', marginBottom: 8 }}>
              Logo URL
              <input
                className="lt-input"
                value={(assessment.branding?.logo_url as string) || ''}
                onChange={(e) => setAssessment({ ...assessment, branding: { ...assessment.branding, logo_url: e.target.value } })}
                onBlur={(e) => updateBranding({ logo_url: e.target.value })}
                style={{ marginTop: 4 }}
              />
            </label>
            <label style={{ fontSize: 11, display: 'block', marginBottom: 12 }}>
              Primary color
              <input
                type="color"
                value={(assessment.branding?.primary_color as string) || '#171717'}
                onChange={(e) => updateBranding({ primary_color: e.target.value })}
                style={{ marginTop: 4, width: '100%', height: 32, cursor: 'pointer' }}
              />
            </label>
            <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 6 }}>Conditional branching</div>
            {branchingRules.map((rule, idx) => (
              <div key={idx} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                <input className="lt-input" placeholder="Skill" defaultValue={rule.if_skill_below} onBlur={(e) => {
                  const next = [...branchingRules];
                  next[idx] = { ...rule, if_skill_below: e.target.value };
                  updateSettings({ branching_rules: next });
                }} style={{ fontSize: 11 }} />
                <input className="lt-input" type="number" placeholder="Threshold %" defaultValue={rule.threshold} onBlur={(e) => {
                  const next = [...branchingRules];
                  next[idx] = { ...rule, threshold: Number(e.target.value) };
                  updateSettings({ branching_rules: next });
                }} style={{ fontSize: 11 }} />
              </div>
            ))}
            <button
              type="button"
              className="lt-btn-secondary"
              style={{ padding: '4px 10px', fontSize: 11, width: '100%' }}
              onClick={() => updateSettings({ branching_rules: [...branchingRules, { if_skill_below: '', show_section: primarySection?.title || 'Section 2', threshold: 50 }] })}
            >
              + Add branching rule
            </button>
          </div>

          {showVersions && (
            <div className="lt-card" style={{ padding: 14, maxHeight: 280, overflowY: 'auto' }}>
              <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Version history</h3>
              {snapshots.length === 0 ? (
                <p style={{ fontSize: 11, color: '#999' }}>No snapshots yet. Publish to create versions.</p>
              ) : (
                snapshots.map((snap) => (
                  <div key={snap.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>v{snap.version}</div>
                      <div style={{ fontSize: 10, color: '#999' }}>{new Date(snap.created_at).toLocaleString()}</div>
                    </div>
                    <button type="button" onClick={() => handleRestore(snap.id)} disabled={saving} className="lt-btn-secondary" style={{ padding: '4px 8px', fontSize: 10 }}>
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="lt-card" style={{ padding: 16, position: 'sticky', top: 72, maxHeight: 'calc(100vh - 96px)', overflow: 'auto' }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Question bank</h3>
          <p style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
            Drag onto the assessment · or click + · title opens preview
          </p>
          <div style={{ position: 'relative', marginBottom: 12 }}>
            <Search size={13} color="#999" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="lt-input"
              placeholder="Search bank…"
              value={bankSearch}
              onChange={(e) => setBankSearch(e.target.value)}
              style={{ paddingLeft: 30, fontSize: 12 }}
            />
          </div>
          {available.length === 0 ? (
            <p style={{ fontSize: 12, color: '#999', lineHeight: 1.5 }}>
              {bankSearch ? 'No matches.' : <>No unused questions. <Link to="/test/questions">Create more</Link></>}
            </p>
          ) : (
            available.slice(0, 40).map((q) => (
              <div
                key={q.id}
                className="test-bank-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(BANK_DRAG_MIME, q.id);
                  e.dataTransfer.setData('text/plain', q.id);
                  e.dataTransfer.effectAllowed = 'copy';
                  setBankDragActive(true);
                }}
                onDragEnd={() => { setBankDragActive(false); setDropInsertAt(null); }}
              >
                <GripVertical size={12} color="#ccc" style={{ flexShrink: 0 }} />
                <button
                  type="button"
                  onClick={() => openQuestion(q.id, true)}
                  style={{ fontSize: 12, flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', color: '#171717', padding: 0, minWidth: 0 }}
                >
                  <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.title || q.prompt.slice(0, 40)}
                  </div>
                  <div style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                    {q.question_type.replace(/_/g, ' ')} · {q.difficulty || 'medium'}
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => addQuestionToAssessment(q.id)}
                  disabled={saving}
                  className="lt-btn-secondary"
                  style={{ padding: '4px 8px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center', flexShrink: 0 }}
                  title="Add to assessment"
                >
                  <Plus size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {viewer?.id && (
        <QuestionEditorModal
          open={editorOpen}
          question={editing}
          viewer={viewer as OrgViewer & { id: string }}
          readOnly={previewOnly}
          onClose={() => { setEditorOpen(false); setEditing(null); setPreviewOnly(false); }}
          onSaved={load}
        />
      )}
    </TestLayout>
  );
}
