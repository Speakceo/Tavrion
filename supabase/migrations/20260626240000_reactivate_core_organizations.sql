/*
  # Reactivate core organizations for login

  Amber Student and Tavrion Platform must be active for org selection on the login page.
*/

UPDATE organizations
SET is_active = true, updated_at = now()
WHERE slug IN ('amberstudent', 'tavrion');
