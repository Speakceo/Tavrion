-- Create Admin001 user
-- Run this in Supabase SQL Editor

INSERT INTO user_profiles (id, unique_id, full_name, email, role, department, country, is_active)
VALUES (
  gen_random_uuid(),
  'Admin001',
  'Admin User',
  'admin001@amberstudent.com',
  'admin',
  'Administration',
  'Global',
  true
)
ON CONFLICT (unique_id) DO NOTHING;
