/*
  Tavrion Test — Assessment & Hiring Engine (org-scoped, plug-in module).
  Does not modify existing LMS/auth tables.
*/

-- ── Skills taxonomy ──
CREATE TABLE IF NOT EXISTS assessment_skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- ── Folders ──
CREATE TABLE IF NOT EXISTS assessment_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES assessment_folders(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Question bank ──
CREATE TABLE IF NOT EXISTS assessment_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question_type text NOT NULL,
  title text NOT NULL DEFAULT '',
  prompt text NOT NULL,
  skill_id uuid REFERENCES assessment_skills(id) ON DELETE SET NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  weight numeric NOT NULL DEFAULT 1,
  tags text[] NOT NULL DEFAULT '{}',
  explanation text DEFAULT '',
  time_limit_seconds int,
  is_required boolean NOT NULL DEFAULT true,
  randomize_options boolean NOT NULL DEFAULT false,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_archived boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_question_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessment_coding_test_cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  label text DEFAULT '',
  input_data text NOT NULL DEFAULT '',
  expected_output text NOT NULL DEFAULT '',
  is_hidden boolean NOT NULL DEFAULT false,
  weight numeric NOT NULL DEFAULT 1,
  sort_order int NOT NULL DEFAULT 0
);

-- ── Assessments ──
CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  folder_id uuid REFERENCES assessment_folders(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  version int NOT NULL DEFAULT 1,
  parent_assessment_id uuid REFERENCES assessments(id) ON DELETE SET NULL,
  tags text[] NOT NULL DEFAULT '{}',
  instructions text DEFAULT '',
  passing_score numeric NOT NULL DEFAULT 70,
  time_limit_minutes int,
  shuffle_questions boolean NOT NULL DEFAULT false,
  shuffle_answers boolean NOT NULL DEFAULT true,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  archived_at timestamptz,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_sections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Section',
  instructions text DEFAULT '',
  sort_order int NOT NULL DEFAULT 0,
  time_limit_minutes int,
  weight numeric NOT NULL DEFAULT 1,
  question_pool_size int,
  shuffle_questions boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS assessment_section_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section_id uuid NOT NULL REFERENCES assessment_sections(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  weight_override numeric,
  UNIQUE (section_id, question_id)
);

-- ── Assignments ──
CREATE TABLE IF NOT EXISTS assessment_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  title text NOT NULL,
  assignee_type text NOT NULL DEFAULT 'learner',
  due_at timestamptz,
  expires_at timestamptz,
  max_attempts int NOT NULL DEFAULT 1,
  time_limit_minutes int,
  passing_score numeric,
  reminder_enabled boolean NOT NULL DEFAULT true,
  access_token text UNIQUE,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_assignment_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE,
  external_email text,
  external_name text,
  cohort_label text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Attempts & responses ──
CREATE TABLE IF NOT EXISTS assessment_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES assessment_assignments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  candidate_email text,
  candidate_name text,
  status text NOT NULL DEFAULT 'in_progress',
  attempt_number int NOT NULL DEFAULT 1,
  started_at timestamptz NOT NULL DEFAULT now(),
  submitted_at timestamptz,
  time_spent_seconds int DEFAULT 0,
  auto_score numeric,
  manual_score numeric,
  final_score numeric,
  passed boolean,
  integrity_score numeric,
  device_fingerprint text,
  ip_address text,
  user_agent text,
  progress jsonb NOT NULL DEFAULT '{}'::jsonb,
  review_notes text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS assessment_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
  answer jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_flagged boolean NOT NULL DEFAULT false,
  auto_score numeric,
  manual_score numeric,
  final_score numeric,
  grader_notes text DEFAULT '',
  answered_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE TABLE IF NOT EXISTS assessment_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  violation_type text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_video_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id uuid NOT NULL REFERENCES assessment_responses(id) ON DELETE CASCADE,
  file_path text,
  duration_seconds int,
  transcript text,
  ai_analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  entity_id uuid NOT NULL,
  title text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS assessment_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS assessment_questions_org_idx ON assessment_questions (organization_id, is_archived);
CREATE INDEX IF NOT EXISTS assessments_org_status_idx ON assessments (organization_id, status);
CREATE INDEX IF NOT EXISTS assessment_assignments_org_idx ON assessment_assignments (organization_id);
CREATE INDEX IF NOT EXISTS assessment_attempts_assignment_idx ON assessment_attempts (assignment_id, status);
CREATE INDEX IF NOT EXISTS assessment_attempts_org_idx ON assessment_attempts (organization_id);

-- ── RLS (app-layer org scope; permissive policies for custom auth) ──
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'assessment_skills','assessment_folders','assessment_questions','assessment_question_options',
    'assessment_coding_test_cases','assessments','assessment_sections','assessment_section_questions',
    'assessment_assignments','assessment_assignment_targets','assessment_attempts','assessment_responses',
    'assessment_violations','assessment_video_responses','assessment_reports','assessment_audit_logs'
  ] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT TO anon, authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_manage ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_manage ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;
