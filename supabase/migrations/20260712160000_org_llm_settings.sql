-- Per-organisation LLM provider settings (API keys live in app_secrets as org_llm_key:<org_id>).
CREATE TABLE IF NOT EXISTS org_llm_settings (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'openai'
    CHECK (provider IN ('openai', 'openrouter', 'groq', 'custom')),
  chat_model text NOT NULL DEFAULT 'gpt-4o-mini',
  embedding_model text NOT NULL DEFAULT 'text-embedding-3-small',
  tts_model text NOT NULL DEFAULT 'tts-1',
  stt_model text NOT NULL DEFAULT 'whisper-1',
  base_url text,
  enabled boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_org_llm_settings_enabled
  ON org_llm_settings (enabled)
  WHERE enabled = true;

ALTER TABLE org_llm_settings ENABLE ROW LEVEL SECURITY;

-- App uses custom auth + service role for secrets; allow anon read of non-secret columns for UI.
DROP POLICY IF EXISTS "org_llm_settings_select" ON org_llm_settings;
CREATE POLICY "org_llm_settings_select"
  ON org_llm_settings FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "org_llm_settings_write" ON org_llm_settings;
CREATE POLICY "org_llm_settings_write"
  ON org_llm_settings FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE org_llm_settings IS
  'Org-scoped LLM provider/model. API keys stored in app_secrets under org_llm_key:<organization_id>.';
