/*
  # Fix Social Media Storage for Custom Authentication

  1. Changes
    - Update social-media bucket policies to work with custom authentication
    - Allow anon users to upload (custom auth uses anon keys)
    - Maintain public read access
    - Update delete policy to work with custom auth
  
  2. Security
    - Files are still organized by user_id in folder structure
    - Public can view all social media
    - All users can upload (application layer handles auth)
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can upload social media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view social media" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own social media" ON storage.objects;

-- Allow all users to upload to social-media bucket (custom auth handles permissions)
CREATE POLICY "Allow upload to social media bucket"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'social-media'
  );

-- Allow public read access to social-media files
CREATE POLICY "Public can view social media files"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'social-media');

-- Allow all users to delete from social-media bucket (custom auth handles permissions)
CREATE POLICY "Allow delete from social media bucket"
  ON storage.objects
  FOR DELETE
  TO public
  USING (
    bucket_id = 'social-media'
  );

-- Allow updates to social-media bucket
CREATE POLICY "Allow update to social media bucket"
  ON storage.objects
  FOR UPDATE
  TO public
  USING (
    bucket_id = 'social-media'
  )
  WITH CHECK (
    bucket_id = 'social-media'
  );
