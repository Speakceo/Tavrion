import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import type { OrgViewer } from '../../../utils/orgScope';
import { listRoleTemplates, importRoleTemplate, importAllRoleTemplates } from '../services/templateService';
import {
  listOrgTemplates,
  listDepartmentTemplatePacks,
  importDepartmentTemplatePack,
  type OrgAssessmentTemplate,
  type DepartmentTemplatePack,
} from '../services/platformService';
import { Briefcase, Download, CheckCircle, Layers, Search, Building2, Store, FileStack } from 'lucide-react';

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

type TabId = 'builtin' | 'org' | 'department' | 'marketplace';

const MARKETPLACE_PACKS = [
  {
    id: 'tech-hiring-starter',
    title: 'Tech Hiring Starter',
    description: 'Curated pack: software engineer, data analyst, and QA fundamentals.',
    tags: ['engineering', 'data', 'qa'],
    questionCount: 45,
    roles: 3,
  },
  {
    id: 'customer-facing-roles',
    title: 'Customer-Facing Roles',
    description: 'Sales, support, and account management situational assessments.',
    tags: ['sales', 'support', 'communication'],
    questionCount: 36,
    roles: 3,
  },
  {
    id: 'leadership-pipeline',
    title: 'Leadership Pipeline',
    description: 'Manager and team lead judgment scenarios with scoring rubrics.',
    tags: ['leadership', 'management'],
    questionCount: 24,
    roles: 2,
  },
  {
    id: 'graduate-trainee',
    title: 'Graduate Trainee Pack',
    description: 'Aptitude, cognitive, and culture-fit questions for early careers.',
    tags: ['graduate', 'aptitude'],
    questionCount: 30,
    roles: 1,
  },
];

function TemplateCard({
  role, title, description, qCount, timeLimit, passingScore, types, busy, templateId, onImport,
}: {
  role: string; title: string; description: string; qCount: number;
  timeLimit?: number; passingScore?: number; types: string[];
  busy: boolean; templateId: string; onImport: (id: string) => void;
}) {
  return (
    <div className="lt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, background: '#171717', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Briefcase size={16} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase' }}>{role}</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
        </div>
      </div>
      <p style={{ fontSize: 12, color: '#666', lineHeight: 1.55, marginBottom: 12, flex: 1 }}>{description}</p>
      <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
        {qCount} questions{timeLimit ? ` · ${timeLimit} min` : ''}{passingScore ? ` · Pass ${passingScore}%` : ''}
      </div>
      {types.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {types.map((type) => (
            <span key={type} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: '#f5f5f5', color: '#666' }}>
              {QUESTION_TYPE_LABELS[type] || type}
            </span>
          ))}
        </div>
      )}
      <button onClick={() => onImport(templateId)} disabled={busy} className="lt-btn-primary" style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Download size={13} />
        {busy ? 'Importing...' : 'Import & publish'}
      </button>
    </div>
  );
}

export function RoleTemplates() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const templates = listRoleTemplates();
  const departmentPacks = listDepartmentTemplatePacks();
  const [tab, setTab] = useState<TabId>('builtin');
  const [orgTemplates, setOrgTemplates] = useState<OrgAssessmentTemplate[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!viewer || tab !== 'org') return;
    listOrgTemplates(viewer).then(setOrgTemplates).catch(console.error);
  }, [viewer, tab]);

  const filteredBuiltin = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.role.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [templates, query]);

  const filteredOrg = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return orgTemplates;
    return orgTemplates.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [orgTemplates, query]);

  const filteredDept = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return departmentPacks;
    return departmentPacks.filter((p) => p.department.toLowerCase().includes(q));
  }, [departmentPacks, query]);

  const filteredMarket = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MARKETPLACE_PACKS;
    return MARKETPLACE_PACKS.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }, [query]);

  const totalQuestions = templates.reduce(
    (sum, t) => sum + t.sections.reduce((s, sec) => s + sec.questions.length, 0),
    0,
  );

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

  const handleImportDept = async (pack: DepartmentTemplatePack) => {
    if (!viewer?.id) return;
    setBusy(pack.department);
    setMessage('');
    try {
      const result = await importDepartmentTemplatePack(viewer as OrgViewer & { id: string }, pack.department, { publish: true });
      setMessage(`Imported ${result.results.length} assessments for ${pack.department}.`);
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

  const TABS: { id: TabId; label: string; icon: typeof Briefcase }[] = [
    { id: 'builtin', label: 'Built-in roles', icon: Briefcase },
    { id: 'org', label: 'Org templates', icon: FileStack },
    { id: 'department', label: 'Department packs', icon: Building2 },
    { id: 'marketplace', label: 'Marketplace', icon: Store },
  ];

  return (
    <TestLayout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Role templates</h1>
          <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
            {tab === 'builtin' && `${templates.length} hiring role assessments · ${totalQuestions} ready-to-use questions`}
            {tab === 'org' && `${orgTemplates.length} org-saved templates`}
            {tab === 'department' && `${departmentPacks.length} department packs`}
            {tab === 'marketplace' && `${MARKETPLACE_PACKS.length} curated marketplace packs`}
            {' · '}fully editable after import.
          </p>
        </div>
        {tab === 'builtin' && (
          <button onClick={handleImportAll} disabled={busy === 'all'} className="lt-btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13 }}>
            <Layers size={14} /> {busy === 'all' ? 'Importing...' : 'Import all roles'}
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={tab === id ? 'lt-btn-primary' : 'lt-btn-secondary'}
            style={{ padding: '8px 14px', fontSize: 12, display: 'flex', gap: 6, alignItems: 'center' }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {message && (
        <div className="lt-card" style={{ padding: 12, marginBottom: 16, fontSize: 13, color: message.includes('failed') ? '#c0392b' : '#16a34a' }}>
          {message}
        </div>
      )}

      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <Search size={14} color="#999" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search templates..."
          className="lt-input"
          style={{ width: '100%', paddingLeft: 36 }}
        />
      </div>

      {tab === 'builtin' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filteredBuiltin.map((t) => {
            const types = [...new Set(t.sections.flatMap((s) => s.questions.map((q) => q.question_type)))];
            const qCount = t.sections.reduce((s, sec) => s + sec.questions.length, 0);
            return (
              <TemplateCard
                key={t.id}
                role={t.role}
                title={t.title}
                description={t.description}
                qCount={qCount}
                timeLimit={t.time_limit_minutes}
                passingScore={t.passing_score}
                types={types}
                busy={busy === t.id}
                templateId={t.id}
                onImport={handleImport}
              />
            );
          })}
        </div>
      )}

      {tab === 'org' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filteredOrg.length === 0 ? (
            <div className="lt-card" style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#666', gridColumn: '1 / -1' }}>
              No org templates yet. Save an assessment as a template from the builder.
            </div>
          ) : (
            filteredOrg.map((t) => (
              <div key={t.id} className="lt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 8 }}>{t.title}</div>
                <p style={{ fontSize: 12, color: '#666', lineHeight: 1.55, marginBottom: 10, flex: 1 }}>{t.description || 'No description'}</p>
                <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
                  {t.tags?.length ? t.tags.join(', ') : 'No tags'} · {t.is_shared ? 'Shared' : 'Private'}
                </div>
                {t.source_assessment_id ? (
                  <Link to={`/test/library/${t.source_assessment_id}/builder`} className="lt-btn-primary" style={{ padding: '8px 14px', fontSize: 12, textAlign: 'center', textDecoration: 'none' }}>
                    Open source assessment
                  </Link>
                ) : (
                  <span style={{ fontSize: 11, color: '#999' }}>Snapshot template (no live source)</span>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'department' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filteredDept.map((pack) => (
            <div key={pack.department} className="lt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: '#171717', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase' }}>Department</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{pack.department}</div>
                </div>
              </div>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>
                {pack.templateIds.length} role templates · Pass {pack.defaultPassingScore}%
              </div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 14 }}>
                Post-form fields: {pack.postFormFields.join(', ')}
              </div>
              <button onClick={() => handleImportDept(pack)} disabled={busy === pack.department} className="lt-btn-primary" style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <Download size={13} />
                {busy === pack.department ? 'Importing...' : 'Import department pack'}
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'marketplace' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filteredMarket.map((pack) => (
            <div key={pack.id} className="lt-card" style={{ padding: 20, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, background: '#171717', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Store size={16} color="#fff" />
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase' }}>Marketplace</div>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>{pack.title}</div>
                </div>
              </div>
              <p style={{ fontSize: 12, color: '#666', lineHeight: 1.55, marginBottom: 12, flex: 1 }}>{pack.description}</p>
              <div style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>
                {pack.questionCount} questions · {pack.roles} roles
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                {pack.tags.map((tag) => (
                  <span key={tag} style={{ fontSize: 10, padding: '3px 8px', borderRadius: 999, background: '#f5f5f5', color: '#666' }}>{tag}</span>
                ))}
              </div>
              <button
                onClick={() => setMessage(`Marketplace pack "${pack.title}" — contact sales to enable.`)}
                className="lt-btn-secondary"
                style={{ padding: '8px 14px', fontSize: 12 }}
              >
                Request access
              </button>
            </div>
          ))}
        </div>
      )}

      {tab === 'builtin' && filteredBuiltin.length === 0 && (
        <div className="lt-card" style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#666' }}>
          No templates match &ldquo;{query}&rdquo;.
        </div>
      )}

      <div className="lt-card" style={{ padding: 16, marginTop: 20, display: 'flex', gap: 10, alignItems: 'center' }}>
        <CheckCircle size={16} color="#16a34a" />
        <p style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>
          Templates are copied into your organisation&apos;s question bank and published as assessments.
          Every question, option, and section is editable in the{' '}
          <Link to="/test/library" style={{ color: '#171717', fontWeight: 600 }}>Assessment Library</Link>{' '}
          and <Link to="/test/questions" style={{ color: '#171717', fontWeight: 600 }}>Question Bank</Link> after import.
        </p>
      </div>
    </TestLayout>
  );
}
