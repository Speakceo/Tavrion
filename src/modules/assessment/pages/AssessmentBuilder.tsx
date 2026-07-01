import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAssessmentWithSections } from '../services/assessmentService';
import { fetchQuestions } from '../services/questionService';
import { supabase } from '../../../lib/supabase';
import type { Assessment, AssessmentQuestion } from '../types';
import { ArrowLeft, Plus, GripVertical } from 'lucide-react';

export function AssessmentBuilder() {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [bank, setBank] = useState<AssessmentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id, profile?.id]);

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

  const addQuestionToAssessment = async (questionId: string) => {
    if (!id) return;
    setSaving(true);
    try {
      const sectionId = await ensureSection();
      if (!sectionId) return;

      const { data: existing } = await supabase
        .from('assessment_section_questions')
        .select('sort_order')
        .eq('section_id', sectionId)
        .order('sort_order', { ascending: false })
        .limit(1);

      const nextOrder = (existing?.[0]?.sort_order ?? -1) + 1;
      await supabase.from('assessment_section_questions').insert({
        section_id: sectionId,
        question_id: questionId,
        sort_order: nextOrder,
      });

      await supabase.from('assessments').update({ updated_at: new Date().toISOString() }).eq('id', id);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const updateMeta = async (field: string, value: unknown) => {
    if (!id) return;
    await supabase.from('assessments').update({ [field]: value, updated_at: new Date().toISOString() }).eq('id', id);
    await load();
  };

  const sectionQuestions = assessment?.sections?.flatMap((s) =>
    (s.assessment_section_questions || []).map((sq) => ({ ...sq, sectionTitle: s.title })),
  ) || [];

  const usedIds = new Set(sectionQuestions.map((sq) => sq.question_id));
  const available = bank.filter((q) => !usedIds.has(q.id));

  if (loading) {
    return <TestLayout><p style={{ color: '#808080' }}>Loading builder...</p></TestLayout>;
  }

  if (!assessment) {
    return <TestLayout><p>Assessment not found.</p></TestLayout>;
  }

  return (
    <TestLayout>
      <Link to="/test/library" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#666', textDecoration: 'none', marginBottom: 16 }}>
        <ArrowLeft size={14} /> Back to library
      </Link>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, alignItems: 'start' }}>
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

          <div className="lt-card" style={{ padding: 16, marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Assessment questions ({sectionQuestions.length})</h3>
            {sectionQuestions.length === 0 ? (
              <p style={{ fontSize: 12, color: '#999' }}>Add questions from the bank on the right.</p>
            ) : (
              sectionQuestions.map((sq, i) => (
                <div key={sq.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                  <GripVertical size={14} color="#ccc" />
                  <span style={{ fontSize: 12, color: '#999', width: 20 }}>{i + 1}</span>
                  <span style={{ fontSize: 13, flex: 1 }}>{sq.question?.title || sq.question?.prompt?.slice(0, 60) || 'Question'}</span>
                  <span style={{ fontSize: 10, color: '#aaa' }}>{sq.question?.question_type?.replace(/_/g, ' ')}</span>
                </div>
              ))
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ fontSize: 12 }}>
              Passing score (%)
              <input type="number" className="lt-input" value={assessment.passing_score} onChange={(e) => setAssessment({ ...assessment, passing_score: Number(e.target.value) })} onBlur={(e) => updateMeta('passing_score', Number(e.target.value))} style={{ marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Time limit (min)
              <input type="number" className="lt-input" value={assessment.time_limit_minutes || ''} onChange={(e) => setAssessment({ ...assessment, time_limit_minutes: Number(e.target.value) || null })} onBlur={(e) => updateMeta('time_limit_minutes', Number(e.target.value) || null)} style={{ marginTop: 4 }} />
            </label>
          </div>
        </div>

        <div className="lt-card" style={{ padding: 16, position: 'sticky', top: 72 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Question bank</h3>
          {available.length === 0 ? (
            <p style={{ fontSize: 12, color: '#999' }}>No more questions. <Link to="/test/questions">Create questions</Link></p>
          ) : (
            available.slice(0, 20).map((q) => (
              <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: 12, flex: 1 }}>{q.title || q.prompt.slice(0, 40)}</span>
                <button
                  onClick={() => addQuestionToAssessment(q.id)}
                  disabled={saving}
                  className="lt-btn-secondary"
                  style={{ padding: '4px 8px', fontSize: 11, display: 'flex', gap: 4, alignItems: 'center' }}
                >
                  <Plus size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </TestLayout>
  );
}
