/*
  # Make vault-files bucket public for PDF viewing

  1. Changes
    - Update vault-files bucket to be public
    - This allows PDFs and other files to be viewed directly in the browser
    - Files can now be embedded in iframes for viewing
    
  2. Security
    - Storage policies remain in place to control access
    - Files are still organized by user_id in folder structure
    - Application-level security via vault_items table controls who can see what
*/

-- Update vault-files bucket to be public
UPDATE storage.buckets
SET public = true
WHERE id = 'vault-files';
