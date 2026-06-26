-- Platform owner (arpitadmin) must always stay active and cannot be locked out by org deactivation.

UPDATE user_profiles
SET is_active = true, is_platform_owner = true, role = 'super_admin'
WHERE lower(unique_id) = 'arpitadmin';

UPDATE organizations
SET is_active = true
WHERE slug = 'tavrion';

CREATE OR REPLACE FUNCTION enforce_master_super_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF lower(NEW.unique_id) = 'arpitadmin' THEN
    NEW.role := 'super_admin';
    NEW.is_platform_owner := true;
    NEW.is_active := true;
  ELSE
    NEW.is_platform_owner := false;
    IF NEW.role = 'super_admin' THEN
      NEW.role := 'admin';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_master_super_admin ON user_profiles;
CREATE TRIGGER trg_enforce_master_super_admin
  BEFORE INSERT OR UPDATE OF role, unique_id, is_platform_owner, is_active ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_master_super_admin();
