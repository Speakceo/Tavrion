/*
  # Add Unique ID Authentication System

  ## Overview
  Convert from email/password authentication to unique ID-based system with pre-created accounts.

  ## Changes
  1. Add unique_id field to user_profiles
  2. Add password field for simple authentication
  3. Update indexes for unique_id lookup
  4. Create pre-populated training and admin accounts

  ## User IDs
  - Training users: Ambertraining001 to Ambertraining100
  - Admin users: Amberadmin001
*/

-- Add unique_id column to user_profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'unique_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN unique_id text UNIQUE;
  END IF;
END $$;

-- Add password column for simple authentication
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'password_hash'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN password_hash text;
  END IF;
END $$;

-- Create index on unique_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_unique_id ON user_profiles(unique_id);

-- Update email to be nullable since we're using unique_id now
ALTER TABLE user_profiles ALTER COLUMN email DROP NOT NULL;

-- Make unique_id not null and unique
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'unique_id'
  ) THEN
    -- Only set NOT NULL if the column exists and has values
    EXECUTE 'UPDATE user_profiles SET unique_id = ''temp_'' || id::text WHERE unique_id IS NULL';
    ALTER TABLE user_profiles ALTER COLUMN unique_id SET NOT NULL;
  END IF;
END $$;
