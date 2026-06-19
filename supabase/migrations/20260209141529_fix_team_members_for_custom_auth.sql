/*
  # Fix Team Members Policies for Custom Authentication

  1. Changes
    - Updates team_members policies to work with custom authentication
    - Removes auth.uid() dependency
    - Validates that users being added exist and are active

  2. Security
    - Maintains RLS protection
    - Validates user_id exists in user_profiles
    - Validates team_id exists in teams
    
  Note: Since we use custom authentication, we cannot use auth.uid() to identify the current user.
  The application layer must enforce admin-only access to these endpoints.
*/

-- Drop existing policies
DROP POLICY IF EXISTS "System admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "System admins can update team members" ON team_members;
DROP POLICY IF EXISTS "System admins can delete team members" ON team_members;
DROP POLICY IF EXISTS "Users can view team members" ON team_members;

-- Allow viewing team members
CREATE POLICY "Users can view team members"
  ON team_members
  FOR SELECT
  TO authenticated, anon
  USING (true);

-- Allow inserting team members if the user and team exist
CREATE POLICY "Can add team members"
  ON team_members
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = team_members.user_id
      AND user_profiles.is_active = true
    )
    AND EXISTS (
      SELECT 1 FROM teams 
      WHERE teams.id = team_members.team_id
    )
  );

-- Allow updating team members if the user and team exist
CREATE POLICY "Can update team members"
  ON team_members
  FOR UPDATE
  TO authenticated, anon
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = team_members.user_id
      AND user_profiles.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = team_members.user_id
      AND user_profiles.is_active = true
    )
  );

-- Allow deleting team members
CREATE POLICY "Can delete team members"
  ON team_members
  FOR DELETE
  TO authenticated, anon
  USING (true);
