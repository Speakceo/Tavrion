import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isBooksFeatureEnabled } from '../utils/books';

export function BooksFeatureRoute({ children }: { children: React.ReactNode }) {
  const { organization, profile, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="lt-spinner" />
      </div>
    );
  }

  if (profile?.is_platform_owner || isBooksFeatureEnabled(organization?.features)) {
    return <>{children}</>;
  }

  return <Navigate to="/dashboard" replace />;
}
