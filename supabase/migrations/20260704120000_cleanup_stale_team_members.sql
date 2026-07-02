-- Remove team memberships for inactive or deleted users.
DELETE FROM team_members tm
WHERE NOT EXISTS (
  SELECT 1
  FROM user_profiles up
  WHERE up.id = tm.user_id
    AND up.is_active = true
);

CREATE OR REPLACE FUNCTION public.remove_team_members_for_inactive_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.is_active = false) THEN
    DELETE FROM team_members
    WHERE user_id = COALESCE(OLD.id, NEW.id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_remove_team_members_for_inactive_user ON user_profiles;

CREATE TRIGGER trg_remove_team_members_for_inactive_user
  AFTER UPDATE OF is_active ON user_profiles
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active AND NEW.is_active = false)
  EXECUTE FUNCTION public.remove_team_members_for_inactive_user();

DROP TRIGGER IF EXISTS trg_remove_team_members_for_deleted_user ON user_profiles;

CREATE TRIGGER trg_remove_team_members_for_deleted_user
  AFTER DELETE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.remove_team_members_for_inactive_user();
