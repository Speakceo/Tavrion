import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isOrgFeatureEnabled, type NavFeatureKey } from '../utils/orgFeatures';
import { FeatureDisabledModal } from './FeatureDisabledModal';

import { isMasterSuperAdmin } from '../utils/platformAccess';

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
    platformOwner: profile?.is_platform_owner || isMasterSuperAdmin(profile?.unique_id),
  });

  if (!enabled) {
    return <DisabledFeatureFallback />;
  }

  return <>{children}</>;
}

function DisabledFeatureFallback() {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  return (
    <FeatureDisabledModal
      onClose={() => setOpen(false)}
      message="This feature is disabled for your team. Talk to the Tavrion team and we can enable it for your organisation."
    />
  );
}
