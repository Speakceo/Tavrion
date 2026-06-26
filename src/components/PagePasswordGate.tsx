import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isMasterSuperAdmin, MASTER_SUPER_ADMIN_UNIQUE_ID } from '../utils/platformAccess';

const GATE_STORAGE_KEY = 'tavrion_internal_tools_gate';

function isGateUnlocked() {
  try {
    return sessionStorage.getItem(GATE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function unlockGate() {
  try {
    sessionStorage.setItem(GATE_STORAGE_KEY, '1');
  } catch {
    // ignore storage errors
  }
}

interface PagePasswordGateProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function PagePasswordGate({ children, title, description }: PagePasswordGateProps) {
  const { profile, loading } = useAuth();
  const [unlocked, setUnlocked] = useState(isGateUnlocked);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && isMasterSuperAdmin(profile?.unique_id)) {
      unlockGate();
      setUnlocked(true);
    }
  }, [loading, profile?.unique_id]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().toLowerCase() === MASTER_SUPER_ADMIN_UNIQUE_ID) {
      unlockGate();
      setUnlocked(true);
      setError('');
      return;
    }
    setError('Incorrect password');
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="lt-spinner" />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        background: '#fafafa',
        fontFamily: '"Geist", "Inter", system-ui, -apple-system, sans-serif',
      }}
    >
      <div
        className="lt-card"
        style={{ width: '100%', maxWidth: 400, padding: '28px 24px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: '#171717',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Lock size={18} color="#fff" />
          </div>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>
              Protected
            </p>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: '#171717', letterSpacing: '-0.03em' }}>{title}</h1>
          </div>
        </div>

        <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, marginBottom: 20 }}>
          {description || 'Enter the access password to continue.'}
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: '#fff5f5', borderRadius: 8, padding: '10px 12px', fontSize: 13, color: '#c0392b', marginBottom: 14 }}>
              {error}
            </div>
          )}

          <label htmlFor="gate-password" style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Access password
          </label>
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <input
              id="gate-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              className="lt-input login-input"
              style={{ width: '100%', padding: '12px 44px 12px 12px', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#808080',
                padding: 4,
                display: 'flex',
              }}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={!password.trim()}
            className="lt-btn-primary"
            style={{
              width: '100%',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: password.trim() ? 1 : 0.5,
            }}
          >
            Continue <ArrowRight size={14} />
          </button>
        </form>

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13 }}>
          <Link to="/" style={{ color: '#808080', textDecoration: 'none' }}>&larr; Back to home</Link>
        </p>
      </div>
    </div>
  );
}
