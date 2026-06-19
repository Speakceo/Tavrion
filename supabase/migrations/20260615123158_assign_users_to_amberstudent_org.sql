-- Assign all existing users without an org to Amber Student
UPDATE user_profiles
SET organization_id = 'fdd6264c-d1a8-4723-948b-5675cbdb7a01'
WHERE organization_id IS NULL;

-- Platform owner (TavrionOwner) belongs to the Tavrion Platform org
UPDATE user_profiles
SET organization_id = 'b1418139-daaf-4eb5-adf3-f43a82bc30c0'
WHERE is_platform_owner = true;

-- Store email_domain in organization settings for use when creating users
UPDATE organizations
SET settings = settings || '{"email_domain": "amberstudent.com"}'::jsonb
WHERE slug = 'amberstudent';

UPDATE organizations
SET settings = settings || '{"email_domain": "jointavrion.com"}'::jsonb
WHERE slug = 'tavrion';
