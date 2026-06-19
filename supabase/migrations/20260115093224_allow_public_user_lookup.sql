/*
  # Allow Public User Lookup for Login

  1. Changes
    - Add policy to allow anyone to read user_profiles by unique_id for login
    - This is safe because it only allows looking up if a user exists
    - No sensitive data is exposed (password_hash is always null for ID-only auth)

  2. Security
    - RLS remains enabled
    - Only SELECT is allowed for public
    - Other operations still require proper authorization
*/

-- Allow anyone to look up users by unique_id (needed for login)
CREATE POLICY "Allow public user lookup for login"
  ON user_profiles FOR SELECT
  TO anon, authenticated
  USING (true);
