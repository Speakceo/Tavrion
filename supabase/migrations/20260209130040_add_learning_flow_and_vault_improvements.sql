/*
  # Learning Flow and Vault Improvements

  1. Changes
    
    ## Vault Improvements
    - Add `uk_city` field to vault_items for UK city filtering
    - Add `content_type` to distinguish text vs image uploads
    - Make file fields optional for text-only entries
    
    ## Course Assignment and Completion Tracking
    - Update uploaded_course_assignments to track completion better
    - Add fields for tracking when courses are viewed and completed
    - Add progress tracking
    
    ## Team Management Improvements  
    - Update team policies so only admins can create/manage teams
    
    ## Events Restrictions
    - Update events policies so only admins can create events
    
  2. Security
    - Update RLS policies to enforce admin-only event creation
    - Update team management policies
    - Maintain secure access for vault items
*/

-- Add UK city and content type to vault_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vault_items' AND column_name = 'uk_city'
  ) THEN
    ALTER TABLE vault_items ADD COLUMN uk_city text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vault_items' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE vault_items ADD COLUMN content_type text DEFAULT 'file' CHECK (content_type IN ('file', 'text', 'image'));
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vault_items' AND column_name = 'text_content'
  ) THEN
    ALTER TABLE vault_items ADD COLUMN text_content text;
  END IF;
END $$;

-- Make file fields optional for text-only vault entries
ALTER TABLE vault_items ALTER COLUMN file_path DROP NOT NULL;
ALTER TABLE vault_items ALTER COLUMN file_name DROP NOT NULL;
ALTER TABLE vault_items ALTER COLUMN file_type DROP NOT NULL;
ALTER TABLE vault_items ALTER COLUMN file_size DROP NOT NULL;

-- Add completion tracking to uploaded_course_assignments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_course_assignments' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE uploaded_course_assignments ADD COLUMN completed_at timestamptz;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'uploaded_course_assignments' AND column_name = 'progress_percentage'
  ) THEN
    ALTER TABLE uploaded_course_assignments ADD COLUMN progress_percentage integer DEFAULT 0;
  END IF;
END $$;

-- Update uploaded_course_assignments status to include more states
DO $$
BEGIN
  ALTER TABLE uploaded_course_assignments DROP CONSTRAINT IF EXISTS uploaded_course_assignments_status_check;
  ALTER TABLE uploaded_course_assignments ADD CONSTRAINT uploaded_course_assignments_status_check 
    CHECK (status IN ('assigned', 'downloaded', 'in_progress', 'completed'));
END $$;

-- Drop old restrictive events policies
DROP POLICY IF EXISTS "Users can create events" ON events;

-- Add admin-only event creation policy
CREATE POLICY "Only admins can create events"
  ON events FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update team creation policy to be admin-only
DROP POLICY IF EXISTS "Users can create teams" ON teams;

CREATE POLICY "Only admins can create teams"
  ON teams FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update team management policies
DROP POLICY IF EXISTS "Team admins can manage members" ON team_members;

CREATE POLICY "System admins can manage team members"
  ON team_members FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System admins can update team members"
  ON team_members FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "System admins can delete team members"
  ON team_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create storage bucket for vault files if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('vault-files', 'vault-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for vault files
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can upload own vault files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can view own vault files" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete own vault files" ON storage.objects;
END $$;

CREATE POLICY "Users can upload own vault files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'vault-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own vault files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'vault-files' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own vault files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'vault-files' AND (storage.foldername(name))[1] = auth.uid()::text);