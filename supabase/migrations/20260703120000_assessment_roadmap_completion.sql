/*
  Tavrion Test — roadmap completion: org templates, integrations, webhooks,
  scorecards, version snapshots, attempt resume fields.
*/

-- ── Org-scoped assessment templates ──
CREATE TABLE IF NOT EXISTS assessment_org_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  source_assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  tags text[] NOT NULL DEFAULT '{}',
  is_shared boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_org_templates_org_idx
  ON assessment_org_templates (organization_id, created_at DESC);

-- ── Third-party integrations ──
CREATE TABLE IF NOT EXISTS assessment_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  provider text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, provider),
  CONSTRAINT assessment_integrations_provider_check CHECK (
    provider IN ('greenhouse', 'lever', 'ashby', 'slack', 'teams', 'webhook', 'lms_rules', 'sso')
  )
);

CREATE INDEX IF NOT EXISTS assessment_integrations_org_active_idx
  ON assessment_integrations (organization_id) WHERE is_active;

-- ── Webhook delivery log ──
CREATE TABLE IF NOT EXISTS assessment_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  delivered boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_webhook_events_org_idx
  ON assessment_webhook_events (organization_id, created_at DESC);

-- ── Manual grading scorecards ──
CREATE TABLE IF NOT EXISTS assessment_scorecards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  rubric jsonb NOT NULL DEFAULT '{}'::jsonb,
  scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assessment_scorecards_attempt_idx
  ON assessment_scorecards (attempt_id, created_at DESC);

-- ── Published assessment version history ──
CREATE TABLE IF NOT EXISTS assessment_version_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  version int NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, version)
);

CREATE INDEX IF NOT EXISTS assessment_version_snapshots_assessment_idx
  ON assessment_version_snapshots (assessment_id, version DESC);

-- ── Attempt columns (expansion migration may have added some already) ──
ALTER TABLE assessment_attempts
  ADD COLUMN IF NOT EXISTS resume_token text,
  ADD COLUMN IF NOT EXISTS candidate_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS selection_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reusable_link_id uuid REFERENCES assessment_reusable_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS post_form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS violation_count int NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS assessment_attempts_resume_token_idx
  ON assessment_attempts (resume_token) WHERE resume_token IS NOT NULL;

-- ── RLS (app-layer org scope; permissive policies for custom auth) ──
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assessment_org_templates',
    'assessment_integrations',
    'assessment_webhook_events',
    'assessment_scorecards',
    'assessment_version_snapshots'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT TO anon, authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_manage ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_manage ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
