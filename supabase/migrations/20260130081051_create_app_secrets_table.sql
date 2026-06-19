/*
  # Create App Secrets Table
  
  1. New Tables
    - `app_secrets`
      - `id` (uuid, primary key)
      - `key` (text, unique) - Secret name/key
      - `value` (text) - Secret value (encrypted at rest by Supabase)
      - `description` (text) - Optional description
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
  
  2. Security
    - Enable RLS on `app_secrets` table
    - Only service role can access secrets (no user access)
    - Secrets are protected from all user roles
*/

CREATE TABLE IF NOT EXISTS app_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;

-- No policies = no access for authenticated or anon users
-- Only service role (used by edge functions) can access this table

-- Insert OpenAI API key
INSERT INTO app_secrets (key, value, description)
VALUES (
  'OPENAI_API_KEY',
  'YOUR_OPENAI_API_KEY_HERE',
  'OpenAI API key for AI features (tutor, mock calls, etc.)'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
