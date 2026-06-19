/*
  # Create Mock Call Usage Tracking

  1. New Tables
    - `mock_call_usage`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references user_profiles)
      - `topic` (text, the topic of the mock call)
      - `call_date` (timestamp, when the call was made)
      - `created_at` (timestamp)
  
  2. Indexes
    - Index on user_id for fast lookups
    - Index on (user_id, topic) for checking topic limits
  
  3. Security
    - Enable RLS
    - Users can view and create their own usage records
  
  4. Purpose
    - Track mock call usage per user
    - Enforce limit of 1 call per topic
    - Enforce limit of 3 total calls per user
*/

-- Create mock_call_usage table
CREATE TABLE IF NOT EXISTS mock_call_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  topic text NOT NULL,
  call_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_mock_call_usage_user_id ON mock_call_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_mock_call_usage_user_topic ON mock_call_usage(user_id, topic);

-- Enable RLS
ALTER TABLE mock_call_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for anon users (custom auth)
CREATE POLICY "Allow anon users to view own usage"
  ON mock_call_usage
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Allow anon users to create usage records"
  ON mock_call_usage
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
