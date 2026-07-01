import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchAssignments, createAssignment } from '../services/assignmentService';
import { fetchAssessments } from '../services/assessmentService';
import { supabase } from '../../../lib/supabase';
import type { Assessment, AssessmentAssignment } from '../types';
import { Plus, Link2, Calendar, Play } from 'lucide-react';
import { Link } from 'react-router-dom';

export function TestAssignments() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [assignments, setAssignments] = useState<AssessmentAssignment[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [learners, setLearners] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    assessment_id: '',
    title: '',
    assignee_type: 'learner' as const,
    user_id: '',
    due_at: '',
    max_attempts: 1,
    passing_score: 70,
  });
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!viewer) return;
    setLoading(true);
    try {
      const [a, asg] = await Promise.all([
        fetchAssessments(viewer, { status: 'published' }),
        fetchAssignments(viewer),
      ]);
      setAssessments(a);
      setAssignments(asg);

      if (viewer.organization_id) {
        const { data } = await supabase
          .from('user_profiles')
          .select('id, full_name, email')
          .eq('organization_id', viewer.organization_id)
          .eq('role', 'employee')
          .order('full_name');
        setLearners(data || []);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [profile?.id]);

  const handleCreate = async () => {
    if (!viewer?.id || !form.assessment_id || !form.title) return;
    await createAssignment(
      { ...viewer, id: viewer.id },
      {
        assessment_id: form.assessment_id,
        title: form.title,
        assignee_type: form.assignee_type,
        due_at: form.due_at || undefined,
        max_attempts: form.max_attempts,
        passing_score: form.passing_score,
        targets: form.user_id ? [{ user_id: form.user_id }] : [],
      },
    );
    setShowForm(false);
    setForm({ assessment_id: '', title: '', assignee_type: 'learner', user_id: '', due_at: '', max_attempts: 1, passing_score: 70 });
    await load();
  };

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Assignments</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Assign assessments to learners, cohorts, or external candidates.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="lt-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
          <Plus size={14} /> New assignment
        </button>
      </div>

      {showForm && (
        <div className="lt-card" style={{ padding: 20, marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Create assignment</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <label style={{ fontSize: 12 }}>
              Assessment
              <select className="lt-input" value={form.assessment_id} onChange={(e) => setForm({ ...form, assessment_id: e.target.value })} style={{ marginTop: 4 }}>
                <option value="">Select published assessment</option>
                {assessments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12 }}>
              Title
              <input className="lt-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} style={{ marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Assign to learner
              <select className="lt-input" value={form.user_id} onChange={(e) => setForm({ ...form, user_id: e.target.value })} style={{ marginTop: 4 }}>
                <option value="">All / cohort (manual)</option>
                {learners.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
              </select>
            </label>
            <label style={{ fontSize: 12 }}>
              Due date
              <input type="date" className="lt-input" value={form.due_at} onChange={(e) => setForm({ ...form, due_at: e.target.value })} style={{ marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Max attempts
              <input type="number" className="lt-input" value={form.max_attempts} onChange={(e) => setForm({ ...form, max_attempts: Number(e.target.value) })} style={{ marginTop: 4 }} />
            </label>
            <label style={{ fontSize: 12 }}>
              Passing score
              <input type="number" className="lt-input" value={form.passing_score} onChange={(e) => setForm({ ...form, passing_score: Number(e.target.value) })} style={{ marginTop: 4 }} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button onClick={handleCreate} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Create</button>
            <button onClick={() => setShowForm(false)} className="lt-btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>Cancel</button>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#808080' }}>Loading...</p> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {assignments.map((a) => (
            <div key={a.id} className="lt-card" style={{ padding: '14px 18px' }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{a.title}</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                {(a.assessment as { title?: string })?.title || 'Assessment'} · {a.assignee_type} · max {a.max_attempts} attempts
              </div>
              {a.due_at && (
                <div style={{ fontSize: 11, color: '#999', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> Due {new Date(a.due_at).toLocaleDateString()}
                </div>
              )}
              <div style={{ marginTop: 10 }}>
                <Link
                  to={`/test/take/${a.id}`}
                  className="lt-btn-secondary"
                  style={{ padding: '5px 12px', fontSize: 11, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}
                >
                  <Play size={11} /> Preview / take
                </Link>
              </div>
              {a.access_token && (
                <div style={{ fontSize: 11, color: '#666', marginTop: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Link2 size={11} /> External link token: {a.access_token.slice(0, 16)}...
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </TestLayout>
  );
}
