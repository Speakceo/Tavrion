-- Organizations table
CREATE TABLE organizations (
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
CREATE POLICY "public_read_orgs" ON organizations FOR SELECT TO public USING (true);
CREATE POLICY "admin_manage_orgs" ON organizations FOR ALL TO public USING (true);

-- Extend user_profiles
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS password TEXT,
  ADD COLUMN IF NOT EXISTS is_platform_owner BOOLEAN DEFAULT false;

-- Create platform organizations
INSERT INTO organizations (name, slug, description)
VALUES ('Tavrion Platform', 'tavrion', 'The Tavrion learning platform');

INSERT INTO organizations (name, slug, description)
VALUES ('Amber Student', 'amberstudent', 'Amber Student organization');

-- Email nudge log table
CREATE TABLE email_nudge_log (
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
CREATE POLICY "read_email_nudge_log" ON email_nudge_log FOR SELECT TO public USING (true);
CREATE POLICY "insert_email_nudge_log" ON email_nudge_log FOR INSERT TO public WITH CHECK (true);
CREATE POLICY "update_email_nudge_log" ON email_nudge_log FOR UPDATE TO public USING (true);
