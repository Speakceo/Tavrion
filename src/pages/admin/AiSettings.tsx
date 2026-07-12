import { useEffect, useMemo, useState } from 'react';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { getSupabaseAnonKey, getSupabaseUrl } from '../../lib/supabaseEnv';
import { Brain, CheckCircle2, KeyRound, Loader2, Sparkles, TestTube2 } from 'lucide-react';

type Provider = 'openai' | 'openrouter' | 'groq' | 'custom';

type LlmConfig = {
  organizationId: string;
  provider: Provider;
  chatModel: string;
  embeddingModel: string;
  ttsModel: string;
  sttModel: string;
  baseUrl: string;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyPreview: string | null;
  providers: Provider[];
  modelPresets: Record<Provider, string[]>;
};

const PROVIDER_LABELS: Record<Provider, string> = {
  openai: 'OpenAI',
  openrouter: 'OpenRouter',
  groq: 'Groq',
  custom: 'Custom (OpenAI-compatible)',
};

async function callOrgLlmConfig(body: Record<string, unknown>) {
  const res = await fetch(`${getSupabaseUrl()}/functions/v1/org-llm-config`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getSupabaseAnonKey()}`,
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export function AdminAiSettings() {
  const { profile, organization } = useAuth();
  const orgId = profile?.organization_id || organization?.id || '';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [testResult, setTestResult] = useState('');

  const [provider, setProvider] = useState<Provider>('openai');
  const [chatModel, setChatModel] = useState('gpt-4o-mini');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
  const [baseUrl, setBaseUrl] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null);
  const [presets, setPresets] = useState<Record<Provider, string[]>>({
    openai: ['gpt-4o-mini', 'gpt-4o'],
    openrouter: ['openai/gpt-4o-mini'],
    groq: ['llama-3.3-70b-versatile'],
    custom: ['gpt-4o-mini'],
  });

  const modelOptions = useMemo(() => presets[provider] || [], [presets, provider]);

  useEffect(() => {
    if (!orgId || !profile?.unique_id) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const data = (await callOrgLlmConfig({
          action: 'get',
          organizationId: orgId,
          actorUniqueId: profile.unique_id,
        })) as LlmConfig;
        if (cancelled) return;
        setProvider(data.provider);
        setChatModel(data.chatModel);
        setEmbeddingModel(data.embeddingModel);
        setBaseUrl(data.baseUrl || '');
        setEnabled(data.enabled);
        setHasApiKey(data.hasApiKey);
        setApiKeyPreview(data.apiKeyPreview);
        if (data.modelPresets) setPresets(data.modelPresets);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load AI settings');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [orgId, profile?.unique_id]);

  const save = async () => {
    if (!orgId || !profile?.unique_id) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await callOrgLlmConfig({
        action: 'save',
        organizationId: orgId,
        actorUniqueId: profile.unique_id,
        provider,
        chatModel,
        embeddingModel,
        baseUrl: provider === 'custom' ? baseUrl : '',
        enabled,
        apiKey: apiKey.trim() || undefined,
      });
      setApiKey('');
      setSuccess('AI settings saved. This provider will be used for your organisation’s AI Tutor, Mock Calls, Live Calls, course generation, and assessment scoring.');
      const data = (await callOrgLlmConfig({
        action: 'get',
        organizationId: orgId,
        actorUniqueId: profile.unique_id,
      })) as LlmConfig;
      setHasApiKey(data.hasApiKey);
      setApiKeyPreview(data.apiKeyPreview);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    if (!orgId || !profile?.unique_id) return;
    setTesting(true);
    setTestResult('');
    setError('');
    try {
      const data = await callOrgLlmConfig({
        action: 'test',
        organizationId: orgId,
        actorUniqueId: profile.unique_id,
      });
      if (data.ok) {
        setTestResult(`Connected via ${data.provider} / ${data.model} (${data.source}). Reply: ${data.reply || 'ok'}`);
      } else {
        setError(data.error || 'Connection test failed');
      }
    } catch (err: any) {
      setError(err.message || 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  if (!orgId) {
    return (
      <Layout>
        <div className="lt-card p-8">
          <h1 className="text-xl font-bold text-gray-900">AI Settings</h1>
          <p className="text-gray-600 mt-2">Join or select an organisation to configure its LLM provider.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="w-6 h-6" /> AI Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Configure the LLM used for <strong>{organization?.name || 'your organisation'}</strong>. Keys are stored
            server-side and never shown in full.
          </p>
        </div>

        {loading ? (
          <div className="lt-card p-10 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3" />
            Loading AI settings…
          </div>
        ) : (
          <div className="lt-card p-6 space-y-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
              <span className="text-sm font-medium text-gray-900">Use organisation LLM for all AI features</span>
            </label>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Provider</label>
              <select
                value={provider}
                onChange={(e) => {
                  const next = e.target.value as Provider;
                  setProvider(next);
                  const preset = presets[next]?.[0];
                  if (preset) setChatModel(preset);
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                {(Object.keys(PROVIDER_LABELS) as Provider[]).map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_LABELS[p]}
                  </option>
                ))}
              </select>
            </div>

            {provider === 'custom' && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Base URL (OpenAI-compatible)
                </label>
                <input
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.example.com/v1"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Chat model</label>
              <input
                list="chat-model-presets"
                value={chatModel}
                onChange={(e) => setChatModel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <datalist id="chat-model-presets">
                {modelOptions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Embedding model</label>
              <input
                value={embeddingModel}
                onChange={(e) => setEmbeddingModel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
              <p className="text-xs text-gray-500 mt-1">Used by Tavrion Bot / RAG features when org-scoped.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5" /> API key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={hasApiKey ? `Saved key ${apiKeyPreview || '••••'} — leave blank to keep` : 'Paste API key'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                autoComplete="off"
              />
              {hasApiKey && (
                <p className="text-xs text-green-700 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Key on file: {apiKeyPreview}
                </p>
              )}
            </div>

            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600 space-y-1">
              <p className="font-medium text-gray-900 flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> Applies to
              </p>
              <p>AI Tutor · Mock Calls · Live Calls · AI Course Generator · presentations · assessment AI scoring</p>
              <p className="text-xs text-gray-500">
                Voice (TTS/STT) needs OpenAI or a custom endpoint that supports `/audio/*`. OpenRouter/Groq work for chat.
              </p>
              <p className="text-xs text-gray-500">
                If no org key is set, the platform fallback key is used (if configured by the owner).
              </p>
            </div>

            {error && <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
            {success && (
              <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">{success}</div>
            )}
            {testResult && (
              <div className="text-sm text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">{testResult}</div>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              <button type="button" onClick={save} disabled={saving} className="lt-btn-primary" style={{ padding: '10px 18px', borderRadius: 8 }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Save settings
              </button>
              <button
                type="button"
                onClick={testConnection}
                disabled={testing || saving}
                className="lt-btn-secondary"
                style={{ padding: '10px 18px', borderRadius: 8, display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube2 className="w-4 h-4" />}
                Test connection
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
