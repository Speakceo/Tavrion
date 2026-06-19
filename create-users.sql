-- Script to create training and admin users
-- Note: This needs to be run after manually creating auth.users in Supabase dashboard
-- Or use Supabase Admin API to create users programmatically

-- This script creates user profiles with unique IDs
-- The auth.users must be created separately with matching emails

-- Create Admin User Profile
-- Auth email: amberadmin001@amberstudent.com
-- Default password: Amber@2024
INSERT INTO user_profiles (id, unique_id, full_name, email, role, department, country, is_active)
SELECT
  id,
  'Amberadmin001',
  'Admin User',
  'amberadmin001@amberstudent.com',
  'admin',
  'Administration',
  'UK',
  true
FROM auth.users
WHERE email = 'amberadmin001@amberstudent.com'
ON CONFLICT (id) DO UPDATE
SET unique_id = 'Amberadmin001',
    role = 'admin';

-- Create Training Users (1-100)
-- Auth emails: ambertraining001@amberstudent.com to ambertraining100@amberstudent.com
-- Default password: Amber@2024
DO $$
DECLARE
  i INTEGER;
  user_id UUID;
  unique_id_str TEXT;
  email_str TEXT;
BEGIN
  FOR i IN 1..100 LOOP
    unique_id_str := 'Ambertraining' || LPAD(i::TEXT, 3, '0');
    email_str := 'ambertraining' || LPAD(i::TEXT, 3, '0') || '@amberstudent.com';

    -- Find the auth user
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = email_str
    LIMIT 1;

    -- Only insert if auth user exists
    IF user_id IS NOT NULL THEN
      INSERT INTO user_profiles (id, unique_id, full_name, email, role, department, country, is_active)
      VALUES (
        user_id,
        unique_id_str,
        'Training User ' || LPAD(i::TEXT, 3, '0'),
        email_str,
        'employee',
        'Training',
        'UK',
        true
      )
      ON CONFLICT (id) DO UPDATE
      SET unique_id = unique_id_str,
          full_name = 'Training User ' || LPAD(i::TEXT, 3, '0');
    END IF;
  END LOOP;
END $$;
