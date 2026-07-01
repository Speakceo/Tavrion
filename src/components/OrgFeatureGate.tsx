import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isOrgFeatureEnabled, type NavFeatureKey } from '../utils/orgFeatures';

export function OrgFeatureGate({
  feature,
  children,
}: {
  feature: NavFeatureKey;
  children: React.ReactNode;
}) {
  const { profile, organization, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <div className="lt-spinner" />
      </div>
    );
  }

  const enabled = isOrgFeatureEnabled(organization?.features, feature, {
    platformOwner: profile?.is_platform_owner,
  });

  if (!enabled) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
