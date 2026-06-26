-- Tavrion Bot: website chatbots with RAG pipeline

CREATE TABLE IF NOT EXISTS tavrion_bots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_url text NOT NULL,
  embed_key text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  created_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'ready', 'error')),
  pages_crawled integer NOT NULL DEFAULT 0,
  chunks_count integer NOT NULL DEFAULT 0,
  welcome_message text DEFAULT 'Hi! Ask me anything about this website.',
  primary_color text DEFAULT '#6366f1',
  bot_name text,
  whatsapp_enabled boolean NOT NULL DEFAULT false,
  whatsapp_phone_number_id text,
  whatsapp_access_token text,
  whatsapp_verify_token text DEFAULT encode(gen_random_bytes(8), 'hex'),
  crawl_error text,
  last_crawled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tavrion_bot_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES tavrion_bots(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text,
  content text,
  word_count integer DEFAULT 0,
  crawled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bot_id, url)
);

CREATE TABLE IF NOT EXISTS tavrion_bot_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES tavrion_bots(id) ON DELETE CASCADE,
  page_id uuid REFERENCES tavrion_bot_pages(id) ON DELETE CASCADE,
  content text NOT NULL,
  embedding jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tavrion_bot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id uuid NOT NULL REFERENCES tavrion_bots(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  channel text NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'whatsapp')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tavrion_bot_chunks_bot_id ON tavrion_bot_chunks(bot_id);
CREATE INDEX IF NOT EXISTS idx_tavrion_bot_pages_bot_id ON tavrion_bot_pages(bot_id);
CREATE INDEX IF NOT EXISTS idx_tavrion_bot_messages_bot_session ON tavrion_bot_messages(bot_id, session_id);

ALTER TABLE tavrion_bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE tavrion_bot_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tavrion_bot_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tavrion_bot_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read tavrion_bots" ON tavrion_bots FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert tavrion_bots" ON tavrion_bots FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon update tavrion_bots" ON tavrion_bots FOR UPDATE TO anon, authenticated USING (true);

CREATE POLICY "Allow anon read tavrion_bot_pages" ON tavrion_bot_pages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert tavrion_bot_pages" ON tavrion_bot_pages FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon delete tavrion_bot_pages" ON tavrion_bot_pages FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Allow anon read tavrion_bot_chunks" ON tavrion_bot_chunks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert tavrion_bot_chunks" ON tavrion_bot_chunks FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow anon delete tavrion_bot_chunks" ON tavrion_bot_chunks FOR DELETE TO anon, authenticated USING (true);

CREATE POLICY "Allow anon read tavrion_bot_messages" ON tavrion_bot_messages FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow anon insert tavrion_bot_messages" ON tavrion_bot_messages FOR INSERT TO anon, authenticated WITH CHECK (true);
