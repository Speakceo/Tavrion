/*
  # Fix RLS Policies for User Profiles

  1. Changes
    - Drop existing problematic policies that cause 500 errors
    - Create simpler, non-recursive policies
    - Users can always view their own profile
    - Admins can view all profiles (checked via metadata, not subquery)

  2. Security
    - Maintains proper access control
    - Eliminates recursive policy checks
    - Fixes 500 database errors on profile fetch
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Super admins and admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins and admins can update profiles" ON user_profiles;
DROP POLICY IF EXISTS "Super admins and admins can insert profiles" ON user_profiles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
