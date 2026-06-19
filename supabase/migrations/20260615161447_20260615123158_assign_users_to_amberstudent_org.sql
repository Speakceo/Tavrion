/*
# Assign users to organizations by slug (safe, ID-independent)

- Assigns all users without an org to 'Amber Student'
- Assigns platform owners to 'Tavrion Platform'
- Sets email_domain in each org's settings
*/

UPDATE user_profiles
SET organization_id = (SELECT id FROM organizations WHERE slug = 'amberstudent')
WHERE organization_id IS NULL;

UPDATE user_profiles
SET organization_id = (SELECT id FROM organizations WHERE slug = 'tavrion')
WHERE is_platform_owner = true;

UPDATE organizations
SET settings = settings || '{"email_domain": "amberstudent.com"}'::jsonb
WHERE slug = 'amberstudent';

UPDATE organizations
SET settings = settings || '{"email_domain": "jointavrion.com"}'::jsonb
WHERE slug = 'tavrion';
