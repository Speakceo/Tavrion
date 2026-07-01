import { useNavigate, useLocation } from 'react-router-dom';
import { ClipboardCheck } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { canAccessTavrionTest, isOrgFeatureEnabled } from '../../../utils/orgFeatures';
import { isMasterSuperAdmin } from '../../../utils/platformAccess';

/** Header toggle — admins/trainers, when org has tavrion_test enabled. */
export function TestModeToggle() {
  const { profile, organization } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const isAdmin = canAccessTavrionTest(profile?.role);
  const enabled = isOrgFeatureEnabled(organization?.features, 'tavrion_test', {
    platformOwner: profile?.is_platform_owner || isMasterSuperAdmin(profile?.unique_id),
  });

  if (!isAdmin || !enabled) return null;
  if (location.pathname.startsWith('/test')) return null;

  return (
    <button
      onClick={() => navigate('/test')}
      title="Open Tavrion Test — Assessments & Hiring"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 12px', borderRadius: 8,
        border: '1px solid #e5e5e5', background: '#fff',
        cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#171717',
        transition: 'all 0.12s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f5f5f5'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
    >
      <ClipboardCheck size={14} />
      <span className="hidden sm:inline">Tavrion Test</span>
    </button>
  );
}
