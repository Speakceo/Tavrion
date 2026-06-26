-- Only arpitadmin may be super_admin / platform owner.
-- Downgrade any other super_admin accounts and enforce via trigger.

UPDATE user_profiles
SET role = 'admin', is_platform_owner = false
WHERE role = 'super_admin'
  AND lower(unique_id) <> 'arpitadmin';

UPDATE user_profiles
SET role = 'super_admin', is_platform_owner = true
WHERE lower(unique_id) = 'arpitadmin';

CREATE OR REPLACE FUNCTION enforce_master_super_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF lower(NEW.unique_id) = 'arpitadmin' THEN
    NEW.role := 'super_admin';
    NEW.is_platform_owner := true;
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
  BEFORE INSERT OR UPDATE OF role, unique_id, is_platform_owner ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_master_super_admin();
