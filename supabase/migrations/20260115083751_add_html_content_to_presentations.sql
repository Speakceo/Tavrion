/*
  # Add HTML Content Column to Presentations

  1. Changes
    - Add `html_content` column to `presentations` table to store generated HTML presentations
    - This column stores the complete HTML content of the presentation for viewing and downloading

  2. Notes
    - Using TEXT type to accommodate large HTML content
    - Column is nullable to support backwards compatibility with existing records
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'presentations' AND column_name = 'html_content'
  ) THEN
    ALTER TABLE presentations ADD COLUMN html_content TEXT;
  END IF;
END $$;
