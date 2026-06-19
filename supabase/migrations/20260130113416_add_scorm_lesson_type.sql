/*
  # Add SCORM lesson type
  
  1. Changes
    - Add 'scorm' to the lesson_type enum
  
  2. Notes
    - This allows lessons to be of type 'scorm' for SCORM package playback
*/

-- Add 'scorm' to the lesson_type enum
ALTER TYPE lesson_type ADD VALUE IF NOT EXISTS 'scorm';
