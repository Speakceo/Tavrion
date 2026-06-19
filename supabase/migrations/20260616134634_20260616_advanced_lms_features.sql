/*
  # Advanced LMS Features Migration
  
  Adds:
  1. Mandatory Course Recurrence     - recurrence_interval on courses + due_date on enrollments
  2. Course Assignment Rules         - filter-based auto-assignment table
  3. Assessment Passing Criteria     - enforced via existing quiz system (no schema change needed)
  4. Certificate Enhancements        - certificate_number, expiry_date, display fields
  5. Policy Version Control          - course_policy_versions + policy_acknowledgments tables
  6. Manager Visibility              - manager_id on user_profiles
*/

-- ─────────────────────────────────────────────────────────────────
-- 1. Recurrence enum + course additions
-- ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE recurrence_interval AS ENUM ('none','monthly','quarterly','semi_annual','annual');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE courses
  ADD COLUMN IF NOT EXISTS recurrence_interval recurrence_interval DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS passing_score integer DEFAULT 70,
  ADD COLUMN IF NOT EXISTS requires_quiz_pass boolean DEFAULT false;

-- ─────────────────────────────────────────────────────────────────
-- 2. Enrollment additions
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE user_course_enrollments
  ADD COLUMN IF NOT EXISTS due_date timestamptz,
  ADD COLUMN IF NOT EXISTS last_assigned_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS recurrence_interval recurrence_interval DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS times_completed integer DEFAULT 0;

-- ─────────────────────────────────────────────────────────────────
-- 3. Manager relationship on user_profiles
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS designation text,
  ADD COLUMN IF NOT EXISTS joining_date date DEFAULT CURRENT_DATE;

-- ─────────────────────────────────────────────────────────────────
-- 4. Course assignment rules
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_assignment_rules (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  rule_name       text NOT NULL,
  department      text,
  country         text,
  designation     text,
  role            user_role,
  min_tenure_days integer,
  max_tenure_days integer,
  auto_enroll     boolean DEFAULT true,
  recurrence_interval recurrence_interval DEFAULT 'none',
  is_active       boolean DEFAULT true,
  created_by      uuid REFERENCES user_profiles(id),
  created_at      timestamptz DEFAULT now()
);

ALTER TABLE course_assignment_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_assignment_rules" ON course_assignment_rules
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_assignment_rules" ON course_assignment_rules
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_assignment_rules" ON course_assignment_rules
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_assignment_rules" ON course_assignment_rules
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_assignment_rules_course ON course_assignment_rules(course_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_org ON course_assignment_rules(organization_id);

-- ─────────────────────────────────────────────────────────────────
-- 5. Policy version control
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS course_policy_versions (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id                 uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  version_number            integer NOT NULL,
  version_notes             text,
  effective_date            timestamptz DEFAULT now(),
  requires_reacknowledgment boolean DEFAULT true,
  changelog                 text,
  created_by                uuid REFERENCES user_profiles(id),
  created_at                timestamptz DEFAULT now(),
  UNIQUE(course_id, version_number)
);

ALTER TABLE course_policy_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_policy_versions" ON course_policy_versions
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_policy_versions" ON course_policy_versions
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_update_policy_versions" ON course_policy_versions
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "anon_delete_policy_versions" ON course_policy_versions
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_policy_versions_course ON course_policy_versions(course_id);

-- ─────────────────────────────────────────────────────────────────
-- 6. Policy acknowledgments
-- ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_acknowledgments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id uuid NOT NULL REFERENCES course_policy_versions(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  acknowledged_at   timestamptz DEFAULT now(),
  UNIQUE(policy_version_id, user_id)
);

ALTER TABLE policy_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_select_policy_ack" ON policy_acknowledgments
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "anon_insert_policy_ack" ON policy_acknowledgments
  FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "anon_delete_policy_ack" ON policy_acknowledgments
  FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_policy_acks_version ON policy_acknowledgments(policy_version_id);
CREATE INDEX IF NOT EXISTS idx_policy_acks_user ON policy_acknowledgments(user_id);

-- ─────────────────────────────────────────────────────────────────
-- 7. Certificate enhancements
-- ─────────────────────────────────────────────────────────────────
ALTER TABLE certificates
  ADD COLUMN IF NOT EXISTS certificate_number text,
  ADD COLUMN IF NOT EXISTS expiry_date timestamptz,
  ADD COLUMN IF NOT EXISTS course_title text,
  ADD COLUMN IF NOT EXISTS user_name text;

-- Backfill certificate_number for any existing certificates
UPDATE certificates
  SET certificate_number = 'CERT-' || UPPER(SUBSTR(id::text, 1, 8))
  WHERE certificate_number IS NULL;
