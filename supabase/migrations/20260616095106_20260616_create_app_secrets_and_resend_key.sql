/*
# Create app_secrets table and store Resend API key

1. New Tables
   - `app_secrets`: stores API keys and secrets, readable only by service role
2. Seed
   - Inserts RESEND_API_KEY for the send-email-nudge edge function
*/

CREATE TABLE IF NOT EXISTS app_secrets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE app_secrets ENABLE ROW LEVEL SECURITY;
-- No policies: only service role can access this table

INSERT INTO app_secrets (key, value, description)
VALUES (
  'RESEND_API_KEY',
  'YOUR_RESEND_API_KEY_HERE',
  'Resend API key for sending email nudges'
)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = now();
