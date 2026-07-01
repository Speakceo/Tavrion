import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import type { OrgViewer } from '../../../utils/orgScope';
import {
  fetchSkills, createSkill, updateSkill, deleteSkill,
  fetchFolders, createFolder,
  fetchAuditLogs,
  fetchOrgAssessmentBranding, saveOrgAssessmentBranding,
  type AssessmentSkill, type AssessmentFolder, type AssessmentAuditLog,
} from '../services/platformService';
import {
  getIntegrations, setIntegration, getIntegration,
  triggerWebhook, listWebhookEvents,
  type IntegrationProvider, type AssessmentIntegration, type WebhookEvent,
} from '../services/integrationService';
import { generateQuestions, summarizeCandidate, getAntiPlagiarismEnabled } from '../services/aiService';
import { supabase } from '../../../lib/supabase';
import {
  Tags, FolderOpen, Palette, Plug, Webhook, Sparkles,
  Plus, Pencil, Trash2, Save, Zap, ClipboardList,
} from 'lucide-react';

type Tab = 'skills' | 'folders' | 'branding' | 'integrations' | 'webhooks' | 'ai';

const TABS: { id: Tab; label: string; icon: typeof Tags }[] = [
  { id: 'skills', label: 'Skills', icon: Tags },
  { id: 'folders', label: 'Folders & Audit', icon: FolderOpen },
  { id: 'branding', label: 'Branding', icon: Palette },
  { id: 'integrations', label: 'Integrations', icon: Plug },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
  { id: 'ai', label: 'AI Tools', icon: Sparkles },
];

const INTEGRATION_META: Record<Exclude<IntegrationProvider, 'webhook'>, { label: string; description: string }> = {
  greenhouse: { label: 'Greenhouse', description: 'Sync candidates and push scores to Greenhouse ATS stages.' },
  lever: { label: 'Lever', description: 'Trigger assessments from Lever pipeline stages.' },
  ashby: { label: 'Ashby', description: 'Bi-directional candidate sync with Ashby.' },
  slack: { label: 'Slack', description: 'Hiring alerts when candidates complete or are shortlisted.' },
  teams: { label: 'Microsoft Teams', description: 'Notify recruiters in Teams channels.' },
  lms_rules: { label: 'LMS enrollment rules', description: 'Auto-assign assessments on course completion milestones.' },
  sso: { label: 'Enterprise SSO', description: 'SAML/OIDC for internal mobility assessments.' },
};

const WEBHOOK_EVENTS = [
  'assessment.completed',
  'assessment.scored',
  'assessment.flagged',
  'selection.changed',
  'integrity.violation',
];

export function TestPlatform() {
  const { profile, organization } = useAuth();
  const viewer = profile
    ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id }
    : null;

  const [tab, setTab] = useState<Tab>('skills');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [skills, setSkills] = useState<AssessmentSkill[]>([]);
  const [skillForm, setSkillForm] = useState({ name: '', description: '' });
  const [editingSkill, setEditingSkill] = useState<AssessmentSkill | null>(null);

  const [folders, setFolders] = useState<AssessmentFolder[]>([]);
  const [folderName, setFolderName] = useState('');
  const [auditLogs, setAuditLogs] = useState<AssessmentAuditLog[]>([]);

  const [branding, setBranding] = useState({ logo_url: '', primary_color: '#171717', white_label: false });

  const [integrations, setIntegrations] = useState<AssessmentIntegration[]>([]);
  const [configDrafts, setConfigDrafts] = useState<Record<string, string>>({});

  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);
  const [deliveryLog, setDeliveryLog] = useState<WebhookEvent[]>([]);

  const [aiPrompt, setAiPrompt] = useState('');
  const [summaryAttemptId, setSummaryAttemptId] = useState('');
  const [summaryResult, setSummaryResult] = useState('');
  const [antiPlagiarism, setAntiPlagiarism] = useState(false);

  const flash = (text: string, isError = false) => {
    setMessage(isError ? `Error: ${text}` : text);
    setTimeout(() => setMessage(''), 4000);
  };

  const loadIntegrations = async () => {
    const data = await getIntegrations(viewer);
    setIntegrations(data);
    const drafts: Record<string, string> = {};
    data.forEach((i) => { drafts[i.provider] = JSON.stringify(i.config, null, 2); });
    setConfigDrafts(drafts);
  };

  const loadWebhooks = async () => {
    const webhook = await getIntegration(viewer, 'webhook');
    const config = webhook?.config || {};
    setWebhookUrl((config.url as string) || '');
    setWebhookEvents((config.events as string[]) || []);
    setDeliveryLog(await listWebhookEvents(viewer));
  };

  useEffect(() => {
    if (!viewer) return;
    const run = async () => {
      if (tab === 'skills') setSkills(await fetchSkills(viewer));
      if (tab === 'folders') {
        const [f, a] = await Promise.all([fetchFolders(viewer), fetchAuditLogs(viewer)]);
        setFolders(f);
        setAuditLogs(a);
      }
      if (tab === 'branding') setBranding(await fetchOrgAssessmentBranding(viewer.organization_id));
      if (tab === 'integrations') await loadIntegrations();
      if (tab === 'webhooks') await loadWebhooks();
      if (tab === 'ai') {
        setAntiPlagiarism(await getAntiPlagiarismEnabled((organization?.settings || {}) as Record<string, unknown>));
      }
    };
    run();
  }, [tab, profile?.id]);

  const handleSaveSkill = async () => {
    if (!viewer?.id || !skillForm.name.trim()) return;
    setBusy(true);
    try {
      if (editingSkill) {
        await updateSkill(editingSkill.id, skillForm, viewer);
      } else {
        await createSkill(viewer as OrgViewer & { id: string }, skillForm);
      }
      setSkillForm({ name: '', description: '' });
      setEditingSkill(null);
      setSkills(await fetchSkills(viewer));
      flash('Skill saved.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Save failed', true);
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    if (!confirm('Delete this skill?')) return;
    setBusy(true);
    try {
      await deleteSkill(id, viewer);
      setSkills(await fetchSkills(viewer));
      flash('Skill deleted.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Delete failed', true);
    } finally {
      setBusy(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!viewer?.id || !folderName.trim()) return;
    setBusy(true);
    try {
      await createFolder(viewer as OrgViewer & { id: string }, { name: folderName });
      setFolderName('');
      const [f, a] = await Promise.all([fetchFolders(viewer), fetchAuditLogs(viewer)]);
      setFolders(f);
      setAuditLogs(a);
      flash('Folder created.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Create failed', true);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!viewer?.id) return;
    setBusy(true);
    try {
      await saveOrgAssessmentBranding(viewer as OrgViewer & { id: string }, branding);
      flash('Branding saved to org settings.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Save failed', true);
    } finally {
      setBusy(false);
    }
  };

  const integrationRow = (provider: Exclude<IntegrationProvider, 'webhook'>) => {
    const row = integrations.find((i) => i.provider === provider);
    return row || { provider, config: {}, is_active: false } as AssessmentIntegration;
  };

  const handleToggleIntegration = async (provider: Exclude<IntegrationProvider, 'webhook'>, enabled: boolean) => {
    if (!viewer?.id) return;
    setBusy(true);
    try {
      let config: Record<string, unknown> = {};
      try { config = JSON.parse(configDrafts[provider] || '{}'); } catch { /* empty */ }
      await setIntegration(viewer as OrgViewer & { id: string }, provider, config, enabled);
      await loadIntegrations();
      flash(`${INTEGRATION_META[provider].label} ${enabled ? 'enabled' : 'disabled'}.`);
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Update failed', true);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveIntegrationConfig = async (provider: Exclude<IntegrationProvider, 'webhook'>) => {
    if (!viewer?.id) return;
    setBusy(true);
    try {
      const row = integrationRow(provider);
      const config = JSON.parse(configDrafts[provider] || '{}');
      await setIntegration(viewer as OrgViewer & { id: string }, provider, config, row.is_active);
      flash('Integration config saved.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Invalid JSON', true);
    } finally {
      setBusy(false);
    }
  };

  const handleSaveWebhooks = async () => {
    if (!viewer?.id) return;
    setBusy(true);
    try {
      await setIntegration(viewer as OrgViewer & { id: string }, 'webhook', {
        url: webhookUrl,
        events: webhookEvents,
      }, !!webhookUrl.trim());
      flash('Webhook settings saved.');
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Save failed', true);
    } finally {
      setBusy(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!viewer?.id) return;
    setBusy(true);
    try {
      const event = await triggerWebhook(viewer, 'assessment.completed', { test: true });
      setDeliveryLog(await listWebhookEvents(viewer));
      flash(`Test webhook ${event.delivered ? 'delivered' : 'failed'}.`);
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Test failed', true);
    } finally {
      setBusy(false);
    }
  };

  const handleGenerateQuestions = async () => {
    if (!aiPrompt.trim()) return;
    setBusy(true);
    try {
      const result = await generateQuestions(aiPrompt, 3);
      flash(`Generated ${result.questions.length} sample questions. ${result.note}`);
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Generation failed', true);
    } finally {
      setBusy(false);
    }
  };

  const handleSummarize = async () => {
    if (!summaryAttemptId.trim()) return;
    setBusy(true);
    try {
      const result = await summarizeCandidate(summaryAttemptId);
      setSummaryResult(`${result.summary}\n\nStrengths: ${result.strengths.join(', ')}\nGaps: ${result.gaps.join(', ')}`);
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Summary failed', true);
    } finally {
      setBusy(false);
    }
  };

  const handleToggleAntiPlagiarism = async () => {
    if (!viewer?.organization_id) return;
    const next = !antiPlagiarism;
    setBusy(true);
    try {
      const settings = { ...(organization?.settings || {}) } as Record<string, unknown>;
      settings.assessment_ai = { ...((settings.assessment_ai || {}) as object), anti_plagiarism: next };
      await supabase.from('organizations').update({ settings }).eq('id', viewer.organization_id);
      setAntiPlagiarism(next);
      flash(`Anti-plagiarism ${next ? 'enabled' : 'disabled'}.`);
    } catch (e: unknown) {
      flash(e instanceof Error ? e.message : 'Update failed', true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <TestLayout>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Platform settings</h1>
        <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
          Skills taxonomy, folders, branding, integrations, webhooks, and AI tools for your hiring assessments.
        </p>
      </div>

      {message && (
        <div className="lt-card" style={{ padding: 12, marginBottom: 16, fontSize: 13, color: message.startsWith('Error') ? '#c0392b' : '#16a34a' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={tab === t.id ? 'lt-btn-primary' : 'lt-btn-secondary'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', fontSize: 12 }}
          >
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'skills' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="lt-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>
              {editingSkill ? 'Edit skill' : 'Add skill'}
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input className="lt-input" placeholder="Skill name" value={skillForm.name} onChange={(e) => setSkillForm((f) => ({ ...f, name: e.target.value }))} style={{ flex: 1, minWidth: 160 }} />
              <input className="lt-input" placeholder="Description" value={skillForm.description} onChange={(e) => setSkillForm((f) => ({ ...f, description: e.target.value }))} style={{ flex: 2, minWidth: 200 }} />
              <button onClick={handleSaveSkill} disabled={busy} className="lt-btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>
                <Save size={13} /> {editingSkill ? 'Update' : 'Create'}
              </button>
              {editingSkill && (
                <button onClick={() => { setEditingSkill(null); setSkillForm({ name: '', description: '' }); }} className="lt-btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }}>Cancel</button>
              )}
            </div>
          </div>
          <div className="lt-card" style={{ overflow: 'auto' }}>
            <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', color: '#999', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '10px 14px', color: '#999', fontWeight: 600 }}>Description</th>
                  <th style={{ padding: '10px 14px', color: '#999', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {skills.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '12px 14px', fontWeight: 600 }}>{s.name}</td>
                    <td style={{ padding: '12px 14px', color: '#666' }}>{s.description || '—'}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEditingSkill(s); setSkillForm({ name: s.name, description: s.description }); }} className="lt-btn-secondary" style={{ padding: '4px 8px' }}><Pencil size={12} /></button>
                        <button onClick={() => handleDeleteSkill(s.id)} className="lt-btn-secondary" style={{ padding: '4px 8px', color: '#c0392b' }}><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {skills.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#999' }}>No skills yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'folders' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="lt-card" style={{ padding: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Assessment folders</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input className="lt-input" placeholder="New folder name" value={folderName} onChange={(e) => setFolderName(e.target.value)} style={{ flex: 1 }} />
              <button onClick={handleCreateFolder} disabled={busy} className="lt-btn-primary" style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Plus size={13} /> Create folder
              </button>
            </div>
            <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {folders.map((f) => (
                <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, padding: '8px 10px', background: '#fafafa', borderRadius: 8 }}>
                  <FolderOpen size={14} color="#666" />
                  <span style={{ fontWeight: 600 }}>{f.name}</span>
                  <span style={{ fontSize: 11, color: '#999', marginLeft: 'auto' }}>{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
              ))}
              {folders.length === 0 && <p style={{ fontSize: 12, color: '#999' }}>No folders yet.</p>}
            </div>
          </div>
          <div className="lt-card" style={{ overflow: 'auto' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 8 }}>
              <ClipboardList size={14} /><span style={{ fontSize: 13, fontWeight: 700 }}>Audit log</span>
            </div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', color: '#999' }}>When</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Action</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Entity</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 14px', color: '#666' }}>{new Date(log.created_at).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 600 }}>{log.action}</td>
                    <td style={{ padding: '10px 14px' }}>{log.entity_type}</td>
                    <td style={{ padding: '10px 14px', color: '#666' }}>{JSON.stringify(log.metadata).slice(0, 80) || '—'}</td>
                  </tr>
                ))}
                {auditLogs.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#999' }}>No audit entries yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'branding' && (
        <div className="lt-card" style={{ padding: 20, maxWidth: 480 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 16 }}>Org assessment defaults</div>
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6 }}>Logo URL</label>
          <input className="lt-input" value={branding.logo_url} onChange={(e) => setBranding((b) => ({ ...b, logo_url: e.target.value }))} placeholder="https://..." style={{ width: '100%', marginBottom: 14 }} />
          <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 6 }}>Primary color</label>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
            <input type="color" value={branding.primary_color} onChange={(e) => setBranding((b) => ({ ...b, primary_color: e.target.value }))} style={{ width: 40, height: 36, border: 'none', cursor: 'pointer' }} />
            <input className="lt-input" value={branding.primary_color} onChange={(e) => setBranding((b) => ({ ...b, primary_color: e.target.value }))} style={{ flex: 1 }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 20, cursor: 'pointer' }}>
            <input type="checkbox" checked={branding.white_label} onChange={(e) => setBranding((b) => ({ ...b, white_label: e.target.checked }))} />
            White-label candidate portal (hide Tavrion branding)
          </label>
          {branding.logo_url && (
            <div style={{ marginBottom: 16, padding: 12, background: branding.primary_color, borderRadius: 8, textAlign: 'center' }}>
              <img src={branding.logo_url} alt="" style={{ maxHeight: 40, maxWidth: 160, objectFit: 'contain' }} />
            </div>
          )}
          <button onClick={handleSaveBranding} disabled={busy} className="lt-btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>Save branding</button>
        </div>
      )}

      {tab === 'integrations' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {(Object.keys(INTEGRATION_META) as Exclude<IntegrationProvider, 'webhook'>[]).map((provider) => {
            const meta = INTEGRATION_META[provider];
            const row = integrationRow(provider);
            return (
              <div key={provider} className="lt-card" style={{ padding: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{meta.label}</div>
                    <p style={{ fontSize: 12, color: '#666', marginTop: 6, lineHeight: 1.5 }}>{meta.description}</p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                    <input type="checkbox" checked={row.is_active} onChange={(e) => handleToggleIntegration(provider, e.target.checked)} />
                    {row.is_active ? 'On' : 'Off'}
                  </label>
                </div>
                <textarea
                  className="lt-input"
                  value={configDrafts[provider] || '{}'}
                  onChange={(e) => setConfigDrafts((d) => ({ ...d, [provider]: e.target.value }))}
                  rows={4}
                  style={{ width: '100%', fontFamily: 'monospace', fontSize: 11, marginBottom: 10 }}
                />
                <button onClick={() => handleSaveIntegrationConfig(provider)} disabled={busy} className="lt-btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Save config</button>
              </div>
            );
          })}
        </div>
      )}

      {tab === 'webhooks' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="lt-card" style={{ padding: 18, maxWidth: 560 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Webhook endpoint</div>
            <input className="lt-input" placeholder="https://your-server.com/webhooks/assessment" value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} style={{ width: '100%', marginBottom: 14 }} />
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Events</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
              {WEBHOOK_EVENTS.map((ev) => (
                <label key={ev} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                  <input type="checkbox" checked={webhookEvents.includes(ev)} onChange={(e) => setWebhookEvents((prev) => e.target.checked ? [...prev, ev] : prev.filter((x) => x !== ev))} />
                  {ev}
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSaveWebhooks} disabled={busy} className="lt-btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>Save webhooks</button>
              <button onClick={handleTestWebhook} disabled={busy} className="lt-btn-secondary" style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Zap size={13} /> Test fire
              </button>
            </div>
          </div>
          <div className="lt-card" style={{ overflow: 'auto' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', fontSize: 13, fontWeight: 700 }}>Recent events</div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Time</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Event</th>
                  <th style={{ padding: '10px 14px', color: '#999' }}>Delivered</th>
                </tr>
              </thead>
              <tbody>
                {deliveryLog.map((ev) => (
                  <tr key={ev.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '10px 14px' }}>{new Date(ev.created_at).toLocaleString()}</td>
                    <td style={{ padding: '10px 14px' }}>{ev.event_type}</td>
                    <td style={{ padding: '10px 14px', color: ev.delivered ? '#16a34a' : '#c0392b' }}>{ev.delivered ? 'yes' : 'no'}</td>
                  </tr>
                ))}
                {deliveryLog.length === 0 && <tr><td colSpan={3} style={{ padding: 20, textAlign: 'center', color: '#999' }}>No webhook events yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'ai' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          <div className="lt-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Generate questions</div>
            <textarea className="lt-input" placeholder="Describe the role or topic..." value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} rows={3} style={{ width: '100%', marginBottom: 10, fontSize: 13 }} />
            <button onClick={handleGenerateQuestions} disabled={busy} className="lt-btn-primary" style={{ padding: '8px 14px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={13} /> Generate questions
            </button>
          </div>
          <div className="lt-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Summarize candidate</div>
            <input className="lt-input" placeholder="Attempt ID" value={summaryAttemptId} onChange={(e) => setSummaryAttemptId(e.target.value)} style={{ width: '100%', marginBottom: 10 }} />
            <button onClick={handleSummarize} disabled={busy} className="lt-btn-secondary" style={{ padding: '8px 14px', fontSize: 12, marginBottom: 10 }}>Generate summary</button>
            {summaryResult && <pre style={{ fontSize: 11, color: '#666', whiteSpace: 'pre-wrap', background: '#fafafa', padding: 10, borderRadius: 8 }}>{summaryResult}</pre>}
          </div>
          <div className="lt-card" style={{ padding: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Anti-plagiarism</div>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 14, lineHeight: 1.5 }}>Flag written responses likely generated by AI or copied from external sources.</p>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={antiPlagiarism} onChange={handleToggleAntiPlagiarism} />
              {antiPlagiarism ? 'Enabled' : 'Disabled'}
            </label>
          </div>
        </div>
      )}
    </TestLayout>
  );
}
