-- Org-scoped company policies: upload → version → require acknowledgments

CREATE TABLE IF NOT EXISTS org_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_version_number INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS org_policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES org_policies(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_notes TEXT,
  changelog TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  file_type TEXT,
  requires_acknowledgment BOOLEAN NOT NULL DEFAULT true,
  effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (policy_id, version_number)
);

CREATE TABLE IF NOT EXISTS org_policy_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id UUID NOT NULL REFERENCES org_policies(id) ON DELETE CASCADE,
  policy_version_id UUID NOT NULL REFERENCES org_policy_versions(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (policy_version_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_policies_org ON org_policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_policy_versions_policy ON org_policy_versions(policy_id);
CREATE INDEX IF NOT EXISTS idx_org_policy_versions_org ON org_policy_versions(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_policy_acks_version ON org_policy_acknowledgments(policy_version_id);
CREATE INDEX IF NOT EXISTS idx_org_policy_acks_user ON org_policy_acknowledgments(user_id);
CREATE INDEX IF NOT EXISTS idx_org_policy_acks_org ON org_policy_acknowledgments(organization_id);

ALTER TABLE org_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_policy_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_policy_acknowledgments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_org_policies" ON org_policies;
DROP POLICY IF EXISTS "anon_insert_org_policies" ON org_policies;
DROP POLICY IF EXISTS "anon_update_org_policies" ON org_policies;
DROP POLICY IF EXISTS "anon_delete_org_policies" ON org_policies;
CREATE POLICY "anon_select_org_policies" ON org_policies FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_org_policies" ON org_policies FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_org_policies" ON org_policies FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_org_policies" ON org_policies FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_org_policy_versions" ON org_policy_versions;
DROP POLICY IF EXISTS "anon_insert_org_policy_versions" ON org_policy_versions;
DROP POLICY IF EXISTS "anon_update_org_policy_versions" ON org_policy_versions;
DROP POLICY IF EXISTS "anon_delete_org_policy_versions" ON org_policy_versions;
CREATE POLICY "anon_select_org_policy_versions" ON org_policy_versions FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_org_policy_versions" ON org_policy_versions FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_org_policy_versions" ON org_policy_versions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_org_policy_versions" ON org_policy_versions FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_select_org_policy_acks" ON org_policy_acknowledgments;
DROP POLICY IF EXISTS "anon_insert_org_policy_acks" ON org_policy_acknowledgments;
DROP POLICY IF EXISTS "anon_delete_org_policy_acks" ON org_policy_acknowledgments;
CREATE POLICY "anon_select_org_policy_acks" ON org_policy_acknowledgments FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_org_policy_acks" ON org_policy_acknowledgments FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_delete_org_policy_acks" ON org_policy_acknowledgments FOR DELETE TO anon, authenticated USING (true);

COMMENT ON TABLE org_policies IS 'Organisation policy library. Admins upload documents; new versions require employee acknowledgments.';
COMMENT ON TABLE org_policy_versions IS 'Immutable version history for each org policy document.';
COMMENT ON TABLE org_policy_acknowledgments IS 'Employee acknowledgments of a specific policy version.';
