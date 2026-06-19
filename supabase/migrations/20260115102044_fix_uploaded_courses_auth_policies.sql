/*
  # Fix Uploaded Courses Policies for Authenticated Users

  1. Changes
    - Drop existing anon policies
    - Create new policies that work with authenticated users
    
  2. Security
    - Authenticated users can insert courses
    - All authenticated users can view courses
    - Only admins/trainers can update/delete courses
*/

-- Drop old anon policies
DROP POLICY IF EXISTS "Allow anon to delete uploaded courses" ON uploaded_courses;
DROP POLICY IF EXISTS "Allow anon to insert uploaded courses" ON uploaded_courses;
DROP POLICY IF EXISTS "Allow anon to update uploaded courses" ON uploaded_courses;
DROP POLICY IF EXISTS "Allow anon to view uploaded courses" ON uploaded_courses;

-- Create new authenticated policies
CREATE POLICY "Authenticated users can insert uploaded courses"
ON uploaded_courses FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can view uploaded courses"
ON uploaded_courses FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can update uploaded courses"
ON uploaded_courses FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
  )
);

CREATE POLICY "Admins can delete uploaded courses"
ON uploaded_courses FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
  )
);
