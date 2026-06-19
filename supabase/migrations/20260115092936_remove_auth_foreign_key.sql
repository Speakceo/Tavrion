/*
  # Remove Auth Foreign Key Constraint

  1. Changes
    - Remove foreign key constraint from user_profiles.id to auth.users
    - Make user_profiles.id independent (not tied to Supabase Auth)
    - This allows ID-only authentication without passwords

  2. Security
    - RLS policies remain unchanged
    - Authentication now handled via unique_id lookup
*/

-- Drop the foreign key constraint
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;

-- Make id column independent (remove default if it references auth)
ALTER TABLE user_profiles
ALTER COLUMN id SET DEFAULT gen_random_uuid();
