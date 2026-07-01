/*
  Tavrion Test — platform expansion: public links, hiring pipeline, analytics, media storage.
*/

-- Reusable / public assessment links
CREATE TABLE IF NOT EXISTS assessment_reusable_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assessment_id uuid NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  assignment_id uuid REFERENCES assessment_assignments(id) ON DELETE SET NULL,
  link_code text UNIQUE NOT NULL,
  title text NOT NULL DEFAULT 'Open assessment',
  is_active boolean NOT NULL DEFAULT true,
  uses_count int NOT NULL DEFAULT 0,
  max_uses int,
  expires_at timestamptz,
  require_camera boolean NOT NULL DEFAULT false,
  require_microphone boolean NOT NULL DEFAULT false,
  post_form_enabled boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE assessment_attempts
  ADD COLUMN IF NOT EXISTS selection_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS reusable_link_id uuid REFERENCES assessment_reusable_links(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS candidate_info jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS post_form_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS assigned_pool_label text;

ALTER TABLE assessment_assignments
  ADD COLUMN IF NOT EXISTS public_link_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE IF NOT EXISTS assessment_session_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
  overall_score int,
  communication_score int,
  aptitude_score int,
  integrity_score int,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  weaknesses jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommendation text DEFAULT '',
  ai_summary text DEFAULT '',
  detailed_scores jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id)
);

CREATE INDEX IF NOT EXISTS assessment_reusable_links_code_idx ON assessment_reusable_links (link_code) WHERE is_active;
CREATE INDEX IF NOT EXISTS assessment_attempts_selection_idx ON assessment_attempts (organization_id, selection_status);
CREATE INDEX IF NOT EXISTS assessment_attempts_link_idx ON assessment_attempts (reusable_link_id);

-- Storage for audio/video/file responses
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assessment-responses',
  'assessment-responses',
  true,
  52428800,
  ARRAY['audio/webm','audio/mpeg','audio/wav','video/webm','video/mp4','application/pdf','image/png','image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['assessment_reusable_links','assessment_session_analytics'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I_select ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_select ON %I FOR SELECT TO anon, authenticated USING (true)', t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I_manage ON %I', t, t);
    EXECUTE format('CREATE POLICY %I_manage ON %I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'assessment_responses_storage_read'
  ) THEN
    CREATE POLICY assessment_responses_storage_read ON storage.objects
      FOR SELECT TO anon, authenticated USING (bucket_id = 'assessment-responses');
    CREATE POLICY assessment_responses_storage_insert ON storage.objects
      FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'assessment-responses');
  END IF;
END $$;
