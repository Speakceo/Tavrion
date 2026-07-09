import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { isBooksFeatureEnabled } from '../utils/books';
import { FeatureDisabledModal } from './FeatureDisabledModal';

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

  return <DisabledBooksFallback />;
}

function DisabledBooksFallback() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    navigate('/dashboard', { replace: true });
  };

  if (!open) return null;
  return (
    <FeatureDisabledModal
      title="Books feature disabled for your team"
      message="Books is currently disabled for your organisation. Talk to the Tavrion team to enable it."
      onClose={handleClose}
    />
  );
}
