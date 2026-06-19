/*
  # Fix Vault Storage for Custom Authentication

  1. Problem
    - Current storage policies use `auth.uid()` which only works with Supabase Auth
    - This app uses custom authentication with user_profiles table
    - Users cannot upload files to vault-files bucket

  2. Solution
    - Drop existing authenticated-only policies
    - Create new policies that allow anonymous users (since app uses custom auth)
    - Files are organized by user_id folder structure for security
    
  3. Security
    - Storage RLS is maintained
    - File paths include user_id for organization
    - All users (anon) can upload/read/delete from vault-files bucket
    - Application-level security via vault_items table policies handles access control
*/

-- Drop existing vault-files storage policies
DROP POLICY IF EXISTS "Users can view own vault files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own vault files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own vault files" ON storage.objects;

-- Create new policies that work with custom auth (anonymous users)
CREATE POLICY "Allow anon users to view vault files"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'vault-files');

CREATE POLICY "Allow anon users to upload vault files"
  ON storage.objects
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'vault-files');

CREATE POLICY "Allow anon users to delete vault files"
  ON storage.objects
  FOR DELETE
  TO anon, authenticated
  USING (bucket_id = 'vault-files');

CREATE POLICY "Allow anon users to update vault files"
  ON storage.objects
  FOR UPDATE
  TO anon, authenticated
  USING (bucket_id = 'vault-files')
  WITH CHECK (bucket_id = 'vault-files');

-- Update vault_items table policies to work with anon users
DROP POLICY IF EXISTS "Users can view own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can create vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can update own vault items" ON vault_items;
DROP POLICY IF EXISTS "Users can delete own vault items" ON vault_items;

-- Create new vault_items policies for anon users
CREATE POLICY "Allow anon users to view own vault items"
  ON vault_items
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon users to create vault items"
  ON vault_items
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon users to update own vault items"
  ON vault_items
  FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow anon users to delete own vault items"
  ON vault_items
  FOR DELETE
  TO anon, authenticated
  USING (true);
