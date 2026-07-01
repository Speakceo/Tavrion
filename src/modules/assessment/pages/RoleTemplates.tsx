import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import type { OrgViewer } from '../../../utils/orgScope';
import { listRoleTemplates, importRoleTemplate, importAllRoleTemplates } from '../services/templateService';
import { Briefcase, Download, CheckCircle, Layers } from 'lucide-react';

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: 'MCQ',
  multiple_select: 'Multi-select',
  true_false: 'T/F',
  short_answer: 'Short',
  long_answer: 'Long',
  coding: 'Code',
  sql: 'SQL',
  listening: 'Listening',
  audio_response: 'Audio',
  video_response: 'Video',
  situational_judgment: 'SJT',
};

export function RoleTemplates() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const templates = listRoleTemplates();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const handleImport = async (templateId: string, publish = true) => {
    if (!viewer?.id) return;
    setBusy(templateId);
    setMessage('');
    try {
      const { assessmentId, questionCount } = await importRoleTemplate(
        viewer as OrgViewer & { id: string },
        templateId,
        { publish },
      );
      setMessage(`Imported ${questionCount} questions — assessment ready.`);
      window.location.href = `/test/library/${assessmentId}/builder`;
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(null);
    }
  };

  const handleImportAll = async () => {
    if (!viewer?.id) return;
    setBusy('all');
    setMessage('');
    try {
      const results = await importAllRoleTemplates(viewer as OrgViewer & { id: string }, { publish: true });
      setMessage(`Imported ${results.length} role assessments (${results.reduce((s, r) => s + r.questionCount, 0)} questions total).`);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Role templates</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
            Ready-made assessments for common hiring roles — multiple question types per template.
          </p>
        </div>
        <button
          onClick={handleImportAll}
          disabled={busy === 'all'}
          className="lt-btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}
        >
          <Layers size={14} /> {busy === 'all' ? 'Importing...' : 'Import all roles'}
        </button>
      </div>

      {message && (
        <div className="lt-card" style={{ padding: 12, marginBottom: 16, fontSize: 13, color: message.includes('failed') ? '#c0392b' : '#16a34a' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
        {templates.map((t) => {
          const types = [...new Set(t.sections.flatMap((s) => s.questions.map((q) => q.question_type)))];
          const qCount = t.sections.reduce((s, sec) => s + sec.questions.length, 0);

          return (
            <div key={t.id} className="lt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: '#171717', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Briefcase size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase' }}>{t.role}</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{t.title}</div>
                </div>
              </div>

              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.55, marginBottom: 12, flex: 1 }}>{t.description}</p>

              <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
                {qCount} questions · {t.time_limit_minutes} min · Pass {t.passing_score}%
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {types.map((type) => (
                  <span key={type} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: '#f5f5f5', color: '#666' }}>
                    {QUESTION_TYPE_LABELS[type] || type}
                  </span>
                ))}
              </div>

              <button
                onClick={() => handleImport(t.id)}
                disabled={busy === t.id}
                className="lt-btn-primary"
                style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <Download size={13} />
                {busy === t.id ? 'Importing...' : 'Import & publish'}
              </button>
            </div>
          );
        })}
      </div>

      <div className="lt-card" style={{ padding: 16, marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <CheckCircle size={16} color="#16a34a" />
        <p style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
          Templates are copied into your organisation&apos;s question bank and published as assessments.
          Edit them in the <Link to="/test/library" style={{ color: '#171717', fontWeight: 600 }}>Assessment Library</Link> after import.
        </p>
      </div>
    </TestLayout>
  );
}
