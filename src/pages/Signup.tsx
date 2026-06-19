import { Navigate } from 'react-router-dom';

/** Self-signup is disabled — admins create accounts via the Users panel. */
export function Signup() {
  return <Navigate to="/login" replace />;
}
