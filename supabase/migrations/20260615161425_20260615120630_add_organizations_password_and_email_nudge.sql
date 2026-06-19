/*
# Add Organizations, Password Column, and Email Nudge Log

1. New Tables
   - `organizations`: Multi-tenant org support with features/settings JSONB
   - `email_nudge_log`: Tracks sent email nudges per user/org/course

2. Modified Tables
   - `user_profiles`: Added `organization_id` (FK to organizations), `password` (plain text for custom auth), `is_platform_owner` boolean

3. Seed Data
   - Inserts 'Tavrion Platform' and 'Amber Student' orgs

4. Security
   - RLS enabled on both new tables with public read/write policies
*/

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  logo_url TEXT,
  features JSONB DEFAULT '{"mock_calls":true,"ai_tutor":true,"live_calls":true,"social":true,"events":true,"polls":true,"vault":true,"shots":true,"best_calls":true}',
  settings JSONB DEFAULT '{"primary_color":"#171717","allow_self_signup":false,"email_notifications":true}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  is_active BOOLEAN DEFAULT true
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_orgs" ON organizations;
CREATE POLICY "public_read_orgs" ON organizations FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "admin_manage_orgs" ON organizations;
CREATE POLICY "admin_manage_orgs" ON organizations FOR ALL TO public USING (true);

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS is_platform_owner BOOLEAN DEFAULT false;

INSERT INTO organizations (name, slug, description)
VALUES ('Tavrion Platform', 'tavrion', 'The Tavrion learning platform')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO organizations (name, slug, description)
VALUES ('Amber Student', 'amberstudent', 'Amber Student organization')
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS email_nudge_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email_type TEXT NOT NULL DEFAULT 'course_reminder',
  course_id UUID,
  recipient_email TEXT NOT NULL,
  recipient_name TEXT,
  subject TEXT,
  status TEXT DEFAULT 'sent',
  sent_at TIMESTAMPTZ DEFAULT now(),
  error_message TEXT
);

ALTER TABLE email_nudge_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "read_email_nudge_log" ON email_nudge_log;
CREATE POLICY "read_email_nudge_log" ON email_nudge_log FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "insert_email_nudge_log" ON email_nudge_log;
CREATE POLICY "insert_email_nudge_log" ON email_nudge_log FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "update_email_nudge_log" ON email_nudge_log;
CREATE POLICY "update_email_nudge_log" ON email_nudge_log FOR UPDATE TO public USING (true);
