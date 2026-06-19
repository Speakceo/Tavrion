/*
  # Add DELETE Policy for Courses

  1. Security Enhancement
    - Add DELETE policy for courses table
    - Allow super_admin, admin, and trainer roles to delete courses
    - Ensures cascade deletion of modules and lessons works properly
  
  2. Changes
    - CREATE POLICY for DELETE operations on courses table
    - Restricts deletion to authenticated users with appropriate roles
*/

-- Add DELETE policy for courses
CREATE POLICY "Trainers and admins can delete courses"
  ON courses FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() 
      AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
    )
  );