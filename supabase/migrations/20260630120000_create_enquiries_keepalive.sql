/*
  Enquiries table — contact submissions + Supabase keepalive ping target.
  Netlify scheduled function SELECTs this table daily (empty is fine).
*/

CREATE TABLE IF NOT EXISTS enquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  email text,
  message text,
  source text DEFAULT 'website',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE enquiries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_read_enquiries_keepalive" ON enquiries;
CREATE POLICY "anon_read_enquiries_keepalive"
  ON enquiries FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS enquiries_created_at_idx ON enquiries (created_at DESC);
