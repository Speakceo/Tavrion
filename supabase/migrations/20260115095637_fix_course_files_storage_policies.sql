/*
  # Fix Course Files Storage Policies

  1. Changes
    - Create storage policies for course-files bucket
    - Allow authenticated users to upload files
    - Allow admins to manage all files
    - Allow users to read their own uploaded files
    
  2. Security
    - Authenticated users can upload files to course-files bucket
    - Admins can view, upload, update, and delete all files
    - Users can view their own uploads
*/

-- Create policy for admins to manage all files
CREATE POLICY "Admins can manage all course files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'course-files' 
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'course-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Create policy for authenticated users to upload files
CREATE POLICY "Authenticated users can upload course files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'course-files'
);

-- Create policy for authenticated users to read files
CREATE POLICY "Authenticated users can read course files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'course-files');

-- Create policy for file updates (admins only)
CREATE POLICY "Admins can update course files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
)
WITH CHECK (
  bucket_id = 'course-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);

-- Create policy for file deletion (admins only)
CREATE POLICY "Admins can delete course files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'course-files'
  AND EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'admin'
  )
);
