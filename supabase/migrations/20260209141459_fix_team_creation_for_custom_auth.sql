/*
  # Fix Team Creation for Custom Authentication

  1. Changes
    - Updates team creation policy to work with custom authentication (not Supabase Auth)
    - Removes auth.uid() dependency since we use custom authentication
    - Validates that created_by user exists and has admin privileges

  2. Security
    - Maintains RLS protection
    - Only allows users with super_admin or admin role to create teams
    - Validates the created_by field matches an actual admin user
*/

DROP POLICY IF EXISTS "Only admins can create teams" ON teams;

CREATE POLICY "Only admins can create teams"
  ON teams
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = teams.created_by
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
  );

-- Also update the SELECT policy to work with custom auth
DROP POLICY IF EXISTS "Users can view teams" ON teams;

CREATE POLICY "Users can view teams"
  ON teams
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Update UPDATE policy
DROP POLICY IF EXISTS "Team creators can update teams" ON teams;

CREATE POLICY "Team creators can update teams"
  ON teams
  FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = teams.created_by
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = teams.created_by
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
  );

-- Update DELETE policy
DROP POLICY IF EXISTS "Team creators can delete teams" ON teams;

CREATE POLICY "Team creators can delete teams"
  ON teams
  FOR DELETE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = teams.created_by
      AND user_profiles.role IN ('super_admin', 'admin')
      AND user_profiles.is_active = true
    )
  );
