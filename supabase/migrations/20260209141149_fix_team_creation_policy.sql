/*
  # Fix Team Creation Policy

  1. Changes
    - Updates team creation policy to allow both super_admin and admin roles
    - Previously only allowed 'admin' role, now allows both 'super_admin' and 'admin'

  2. Security
    - Maintains RLS protection
    - Only allows authenticated users with admin privileges to create teams
*/

DROP POLICY IF EXISTS "Only admins can create teams" ON teams;

CREATE POLICY "Only admins can create teams"
  ON teams
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (created_by = auth.uid()) AND 
    (EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('super_admin', 'admin')
    ))
  );
