/*
  # Create Live Call Sessions Table

  1. New Tables
    - `live_call_sessions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to user_profiles)
      - `duration` (integer, call duration in seconds)
      - `transcript` (jsonb, array of messages)
      - `completed_at` (timestamptz, when the call was completed)
      - `created_at` (timestamptz, auto-generated)

  2. Security
    - Enable RLS on `live_call_sessions` table
    - Add policies for users to manage their own live call sessions
*/

-- Create live_call_sessions table
CREATE TABLE IF NOT EXISTS live_call_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES user_profiles(id) ON DELETE CASCADE NOT NULL,
  duration integer NOT NULL DEFAULT 0,
  transcript jsonb DEFAULT '[]'::jsonb,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE live_call_sessions ENABLE ROW LEVEL SECURITY;

-- Users can view their own sessions
CREATE POLICY "Users can view own live call sessions"
  ON live_call_sessions
  FOR SELECT
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM user_profiles WHERE id = user_id));

-- Users can insert their own sessions
CREATE POLICY "Users can insert own live call sessions"
  ON live_call_sessions
  FOR INSERT
  WITH CHECK (user_id = auth.uid() OR user_id IN (SELECT id FROM user_profiles WHERE id = user_id));

-- Users can update their own sessions
CREATE POLICY "Users can update own live call sessions"
  ON live_call_sessions
  FOR UPDATE
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM user_profiles WHERE id = user_id))
  WITH CHECK (user_id = auth.uid() OR user_id IN (SELECT id FROM user_profiles WHERE id = user_id));

-- Users can delete their own sessions
CREATE POLICY "Users can delete own live call sessions"
  ON live_call_sessions
  FOR DELETE
  USING (user_id = auth.uid() OR user_id IN (SELECT id FROM user_profiles WHERE id = user_id));

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_live_call_sessions_user_id ON live_call_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_call_sessions_completed_at ON live_call_sessions(completed_at DESC);
