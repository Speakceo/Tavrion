-- Create 100 training users (Ambertraining001-100)
-- Run this SQL in Supabase SQL Editor or via API

-- Note: This requires Supabase Auth Admin privileges
-- These users will have email: ambertraining001@amberstudent.com to ambertraining100@amberstudent.com
-- Password for all users: Amber@2024

-- First, we'll create user profiles
-- The auth users should be created via Supabase Auth Admin API or Dashboard

-- For now, let's prepare the profile inserts that will be linked when auth users are created

-- Example for first 10 users:
-- You would repeat this pattern for all 100 users

DO $$
DECLARE
  i INT;
  user_email TEXT;
  user_unique_id TEXT;
  user_full_name TEXT;
BEGIN
  FOR i IN 1..100 LOOP
    user_unique_id := 'Ambertraining' || LPAD(i::TEXT, 3, '0');
    user_email := 'ambertraining' || LPAD(i::TEXT, 3, '0') || '@amberstudent.com';
    user_full_name := 'Training User ' || LPAD(i::TEXT, 3, '0');

    -- Note: This only creates profiles. Auth users must be created via Supabase Auth
    -- The bulk creation button in the admin panel handles this properly

    RAISE NOTICE 'User: % - Email: % - Name: %', user_unique_id, user_email, user_full_name;
  END LOOP;
END $$;

-- Instructions:
-- 1. Go to Admin Panel > Users in the application
-- 2. Click "Bulk Create Training Users" button
-- 3. Wait for the process to complete
-- This will properly create both auth users and profiles
