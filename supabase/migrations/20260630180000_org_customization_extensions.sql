/*
  Org customization: scope remaining community tables + per-org best call categories.
*/

ALTER TABLE polls ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE events ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE shots ADD COLUMN IF NOT EXISTS organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL;

UPDATE polls p
SET organization_id = up.organization_id
FROM user_profiles up
WHERE p.created_by = up.id AND p.organization_id IS NULL;

UPDATE events e
SET organization_id = up.organization_id
FROM user_profiles up
WHERE e.created_by = up.id AND e.organization_id IS NULL;

UPDATE vault_items v
SET organization_id = up.organization_id
FROM user_profiles up
WHERE v.user_id = up.id AND v.organization_id IS NULL;

UPDATE shots s
SET organization_id = up.organization_id
FROM user_profiles up
WHERE s.user_id = up.id AND s.organization_id IS NULL;

CREATE INDEX IF NOT EXISTS polls_organization_id_idx ON polls (organization_id);
CREATE INDEX IF NOT EXISTS events_organization_id_idx ON events (organization_id);
CREATE INDEX IF NOT EXISTS vault_items_organization_id_idx ON vault_items (organization_id);
CREATE INDEX IF NOT EXISTS shots_organization_id_idx ON shots (organization_id);

CREATE TABLE IF NOT EXISTS best_call_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  category_key text NOT NULL,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, category_key)
);

CREATE INDEX IF NOT EXISTS best_call_categories_org_idx ON best_call_categories (organization_id, is_active, sort_order);

ALTER TABLE best_call_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "best_call_categories_select" ON best_call_categories;
CREATE POLICY "best_call_categories_select" ON best_call_categories FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "best_call_categories_manage" ON best_call_categories;
CREATE POLICY "best_call_categories_manage" ON best_call_categories FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
