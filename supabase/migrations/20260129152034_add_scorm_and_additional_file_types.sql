/*
  # Add SCORM and Additional File Types Support
  
  1. Changes
    - Drop the restrictive file_type check constraint
    - Add new check constraint supporting all file types:
      * pdf - PDF documents
      * ppt, pptx - PowerPoint presentations
      * doc, docx - Word documents
      * zip, scorm - SCORM packages
      * mp4, mov, avi, webm - Video files
      * xlsx, xls, csv - Excel and data files
      * txt, md - Text files
  
  2. Security
    - Maintains table integrity with expanded file type support
    - Allows SCORM packages to be uploaded and viewed
*/

-- Drop the old restrictive check constraint
ALTER TABLE uploaded_courses 
DROP CONSTRAINT IF EXISTS uploaded_courses_file_type_check;

-- Add new check constraint with all supported file types
ALTER TABLE uploaded_courses
ADD CONSTRAINT uploaded_courses_file_type_check 
CHECK (file_type IN (
  'pdf',
  'ppt', 'pptx',
  'doc', 'docx',
  'zip', 'scorm',
  'mp4', 'mov', 'avi', 'webm',
  'xlsx', 'xls', 'csv',
  'txt', 'md'
));