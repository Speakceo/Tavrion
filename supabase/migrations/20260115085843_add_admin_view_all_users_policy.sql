/*
  # Add Admin View All Users Policy

  1. Changes
    - Add SELECT policy to allow admins and super_admins to view all user profiles
    - This enables the User Management page to display all users

  2. Security
    - Regular users can only see their own profile
    - Admins and super_admins can see all profiles
*/

-- Allow admins and super_admins to view all user profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles 
      WHERE role IN ('admin', 'super_admin')
    )
  );
