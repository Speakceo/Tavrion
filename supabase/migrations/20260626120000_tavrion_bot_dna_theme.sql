-- Brand DNA theming + larger crawl metadata for Tavrion Bot

ALTER TABLE tavrion_bots
  ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#1e293b',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#3b82f6',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS brand_dna jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS crawl_depth integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS max_pages integer DEFAULT 75;
