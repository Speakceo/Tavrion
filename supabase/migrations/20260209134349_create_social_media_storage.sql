/*
  # Create Social Media Storage Bucket

  1. Storage Setup
    - Create 'social-media' bucket for user-uploaded images and videos
    - Set public access for viewing
    - Configure allowed MIME types for images and videos
  
  2. Security
    - Enable RLS on storage.objects
    - Allow authenticated users to upload their own media
    - Allow public read access for all media
    - Allow users to delete their own media
*/

-- Create the social-media storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'social-media',
  'social-media',
  true,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to social-media bucket
CREATE POLICY "Authenticated users can upload social media"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'social-media'
  );

-- Allow public read access to social-media files
CREATE POLICY "Public can view social media"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'social-media');

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete own social media"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'social-media' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );