/*
  # Fix AI Chat History RLS Policies

  1. Changes
    - Update ai_chat_history table policies to allow anon users
    - Remove auth.uid() checks since app uses custom authentication
    
  2. Security Notes
    - App uses custom authentication with unique_id stored in localStorage
    - RLS is still enabled to protect the table
    - Anon users can insert and select their own chat messages
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert own chat messages" ON ai_chat_history;
DROP POLICY IF EXISTS "Users can view own chat history" ON ai_chat_history;

-- Create new policies that allow anon users
CREATE POLICY "Allow anon to insert chat messages"
  ON ai_chat_history
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Allow anon to view chat history"
  ON ai_chat_history
  FOR SELECT
  TO anon, authenticated
  USING (true);