/*
  # Increase book-files bucket limits for large ZIP libraries (up to 2GB)

  - Match course-files limit
  - Allow all MIME types (ZIPs often report as application/octet-stream)
*/

UPDATE storage.buckets
SET
  file_size_limit = 2147483648,
  allowed_mime_types = NULL
WHERE id = 'book-files';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('book-files', 'book-files', true, 2147483648, NULL)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
