/*
  # Books feature — PDF ebook collections from ZIP uploads

  - book_collections: owner-uploaded ZIP libraries
  - book_documents: extracted PDFs with titles and storage paths
  - book-files storage bucket (public read, anon upload — matches custom auth pattern)
*/

CREATE TABLE IF NOT EXISTS book_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  zip_file_path text,
  cover_hue int DEFAULT 220,
  is_published boolean DEFAULT true,
  document_count int DEFAULT 0,
  uploaded_by uuid REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS book_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES book_collections(id) ON DELETE CASCADE,
  title text NOT NULL,
  original_filename text NOT NULL,
  file_path text NOT NULL,
  file_size bigint DEFAULT 0,
  sort_order int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_book_documents_collection ON book_documents(collection_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_book_collections_published ON book_collections(is_published, created_at DESC);

ALTER TABLE book_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "book_collections_select" ON book_collections;
CREATE POLICY "book_collections_select" ON book_collections
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "book_collections_insert" ON book_collections;
CREATE POLICY "book_collections_insert" ON book_collections
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "book_collections_update" ON book_collections;
CREATE POLICY "book_collections_update" ON book_collections
  FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "book_collections_delete" ON book_collections;
CREATE POLICY "book_collections_delete" ON book_collections
  FOR DELETE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "book_documents_select" ON book_documents;
CREATE POLICY "book_documents_select" ON book_documents
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "book_documents_insert" ON book_documents;
CREATE POLICY "book_documents_insert" ON book_documents
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "book_documents_update" ON book_documents;
CREATE POLICY "book_documents_update" ON book_documents
  FOR UPDATE TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "book_documents_delete" ON book_documents;
CREATE POLICY "book_documents_delete" ON book_documents
  FOR DELETE TO anon, authenticated USING (true);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-files',
  'book-files',
  true,
  524288000,
  ARRAY['application/pdf', 'application/zip', 'application/x-zip-compressed']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "book_files_insert" ON storage.objects;
CREATE POLICY "book_files_insert" ON storage.objects
  FOR INSERT TO anon, authenticated
  WITH CHECK (bucket_id = 'book-files');

DROP POLICY IF EXISTS "book_files_select" ON storage.objects;
CREATE POLICY "book_files_select" ON storage.objects
  FOR SELECT TO anon, authenticated
  USING (bucket_id = 'book-files');

DROP POLICY IF EXISTS "book_files_update" ON storage.objects;
CREATE POLICY "book_files_update" ON storage.objects
  FOR UPDATE TO anon, authenticated
  USING (bucket_id = 'book-files');

DROP POLICY IF EXISTS "book_files_delete" ON storage.objects;
CREATE POLICY "book_files_delete" ON storage.objects
  FOR DELETE TO anon, authenticated
  USING (bucket_id = 'book-files');
