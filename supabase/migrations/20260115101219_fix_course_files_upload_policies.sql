/*
  # Fix Course Files Upload Policies

  1. Changes
    - Drop all existing conflicting storage policies for course-files
    - Create new, clean policies that allow authenticated users to upload
    - Allow all authenticated users to read files
    - Allow admins to manage files
    
  2. Security
    - All authenticated users can upload and read course files
    - Only admins can delete and update files
*/

-- Drop all existing policies for course-files bucket
DROP POLICY IF EXISTS "Admins and trainers can delete course files" ON storage.objects;
DROP POLICY IF EXISTS "Admins and trainers can upload course files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete course files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can manage all course files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update course files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can read course files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload course files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view assigned course files" ON storage.objects;

-- Create simple, clear policies
-- Policy 1: All authenticated users can upload files
CREATE POLICY "course_files_upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-files');

-- Policy 2: All authenticated users can read files
CREATE POLICY "course_files_read"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-files');

-- Policy 3: Admins can update files
CREATE POLICY "course_files_update_admin"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
  )
)
WITH CHECK (
  bucket_id = 'course-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
  )
);

-- Policy 4: Admins can delete files
CREATE POLICY "course_files_delete_admin"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role IN ('super_admin', 'admin', 'trainer')
  )
);
