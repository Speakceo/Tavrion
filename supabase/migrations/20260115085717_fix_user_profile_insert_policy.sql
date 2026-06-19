/*
  # Fix User Profile Creation Policy

  1. Changes
    - Add INSERT policy for user_profiles to allow admins and service role to create new user profiles
    - This fixes the issue where user accounts are created in auth but profiles fail to insert

  2. Security
    - Only authenticated admins and super_admins can insert profiles
    - Service role can also insert (for automated processes)
*/

-- Allow admins to create user profiles
CREATE POLICY "Admins can insert user profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM user_profiles 
      WHERE role IN ('admin', 'super_admin')
    )
  );

-- Allow service role to insert profiles (for system operations)
CREATE POLICY "Service role can insert profiles"
  ON user_profiles FOR INSERT
  TO service_role
  WITH CHECK (true);
