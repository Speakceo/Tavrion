-- Fix: Allow users to create their own profile during signup
-- Run this in Supabase SQL Editor

CREATE POLICY "Users can create own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);
