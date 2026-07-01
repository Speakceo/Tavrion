-- Enable Tavrion Test for all organisations (feature was default-off on first release).
UPDATE organizations
SET features = COALESCE(features, '{}'::jsonb) || '{"tavrion_test": true}'::jsonb
WHERE features IS NULL
   OR NOT (features ? 'tavrion_test')
   OR (features->>'tavrion_test')::boolean IS NOT TRUE;
