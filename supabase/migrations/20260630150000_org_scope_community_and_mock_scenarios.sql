/*
  Org-scoped community features + per-org mock call scenarios.
*/

-- ── organization_id on community / content tables ──
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE best_calls ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE uploaded_courses ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE mock_call_sessions ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE live_call_sessions ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

UPDATE social_posts sp
SET organization_id = up.organization_id
FROM user_profiles up
WHERE sp.user_id = up.id AND sp.organization_id IS NULL;

UPDATE best_calls bc
SET organization_id = up.organization_id
FROM user_profiles up
WHERE bc.uploaded_by = up.id AND bc.organization_id IS NULL;

UPDATE uploaded_courses uc
SET organization_id = up.organization_id
FROM user_profiles up
WHERE uc.uploaded_by = up.id AND uc.organization_id IS NULL;

UPDATE mock_call_sessions m
SET organization_id = up.organization_id
FROM user_profiles up
WHERE m.user_id = up.id AND m.organization_id IS NULL;

UPDATE live_call_sessions l
SET organization_id = up.organization_id
FROM user_profiles up
WHERE l.user_id = up.id AND l.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS social_posts_organization_id_idx ON social_posts (organization_id);
CREATE INDEX IF NOT EXISTS best_calls_organization_id_idx ON best_calls (organization_id);
CREATE INDEX IF NOT EXISTS uploaded_courses_organization_id_idx ON uploaded_courses (organization_id);

-- ── live_call_sessions columns used by the app ──
ALTER TABLE live_call_sessions ADD COLUMN IF NOT EXISTS scenario_type text;
ALTER TABLE live_call_sessions ADD COLUMN IF NOT EXISTS scenario_details jsonb DEFAULT '{}'::jsonb;
ALTER TABLE live_call_sessions ADD COLUMN IF NOT EXISTS score numeric;
ALTER TABLE live_call_sessions ADD COLUMN IF NOT EXISTS feedback jsonb;
ALTER TABLE live_call_sessions ADD COLUMN IF NOT EXISTS transcript jsonb DEFAULT '[]'::jsonb;

-- ── per-org mock / live call scenarios (platform owner customises per org) ──
CREATE TABLE IF NOT EXISTS mock_call_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  scenario_key text NOT NULL,
  title text NOT NULL,
  character_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  system_prompt text NOT NULL,
  difficulty text NOT NULL DEFAULT 'Medium',
  icon_name text NOT NULL DEFAULT 'Phone',
  color text NOT NULL DEFAULT 'blue',
  voice text NOT NULL DEFAULT 'nova',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, scenario_key)
);

CREATE INDEX IF NOT EXISTS mock_call_scenarios_org_idx ON mock_call_scenarios (organization_id, is_active, sort_order);

ALTER TABLE mock_call_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mock_scenarios_select" ON mock_call_scenarios;
CREATE POLICY "mock_scenarios_select" ON mock_call_scenarios FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "mock_scenarios_manage" ON mock_call_scenarios;
CREATE POLICY "mock_scenarios_manage" ON mock_call_scenarios FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
