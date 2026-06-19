/*
  # Fix Uploaded Courses Policies for Anonymous Users

  1. Changes
    - Drop existing authenticated-only policies
    - Create new policies that allow anon users (custom auth system)
    - The app uses custom authentication with unique_id in localStorage
    - Database queries use anon key, not authenticated JWT
    
  2. Security
    - Allow anon users to insert, view, update, and delete uploaded courses
    - RLS is still enabled to maintain security structure
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can insert uploaded courses" ON uploaded_courses;
DROP POLICY IF EXISTS "Authenticated users can view uploaded courses" ON uploaded_courses;
DROP POLICY IF EXISTS "Admins can update uploaded courses" ON uploaded_courses;
DROP POLICY IF EXISTS "Admins can delete uploaded courses" ON uploaded_courses;

-- Create anon-friendly policies
CREATE POLICY "Allow anon to insert uploaded courses"
ON uploaded_courses FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon to view uploaded courses"
ON uploaded_courses FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon to update uploaded courses"
ON uploaded_courses FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon to delete uploaded courses"
ON uploaded_courses FOR DELETE
TO anon, authenticated
USING (true);

-- Also fix uploaded_course_assignments policies
DROP POLICY IF EXISTS "Users can view their own assignments" ON uploaded_course_assignments;
DROP POLICY IF EXISTS "Admins and trainers can create assignments" ON uploaded_course_assignments;
DROP POLICY IF EXISTS "Users can update their own assignment status" ON uploaded_course_assignments;
DROP POLICY IF EXISTS "Admins and trainers can delete assignments" ON uploaded_course_assignments;

CREATE POLICY "Allow anon to view assignments"
ON uploaded_course_assignments FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow anon to create assignments"
ON uploaded_course_assignments FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow anon to update assignments"
ON uploaded_course_assignments FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow anon to delete assignments"
ON uploaded_course_assignments FOR DELETE
TO anon, authenticated
USING (true);