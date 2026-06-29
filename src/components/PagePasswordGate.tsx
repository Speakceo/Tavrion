import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { MASTER_SUPER_ADMIN_UNIQUE_ID } from '../utils/platformAccess';

const DEFAULT_GATE_KEY = 'tavrion_internal_tools_gate';

function isGateUnlocked(storageKey: string) {
  try {
    return sessionStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
}

function unlockGate(storageKey: string) {
  try {
    sessionStorage.setItem(storageKey, '1');
  } catch {
    // ignore storage errors
  }
}

interface PagePasswordGateProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  /** Separate key per page if you want independent unlock state */
  storageKey?: string;
}

export function PagePasswordGate({
  children,
  title,
  description,
  storageKey = DEFAULT_GATE_KEY,
}: PagePasswordGateProps) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setUnlocked(isGateUnlocked(storageKey));
    setReady(true);
  }, [storageKey]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim().toLowerCase() === MASTER_SUPER_ADMIN_UNIQUE_ID) {
      unlockGate(storageKey);
      setUnlocked(true);
      setError('');
      return;
    }
    setError('Incorrect password');
  };

  if (!ready) {
    return (
      <div className="page-password-gate page-password-gate--loading">
        <div className="lt-spinner" />
      </div>
    );
  }

  if (unlocked) return <>{children}</>;

  return (
    <div className="page-password-gate" role="dialog" aria-modal="true" aria-labelledby="page-gate-title">
      <div className="page-password-gate-card lt-card">
        <div className="page-password-gate-header">
          <div className="page-password-gate-icon">
            <Lock size={18} color="#fff" />
          </div>
          <div>
            <p className="page-password-gate-label">Protected</p>
            <h1 id="page-gate-title" className="page-password-gate-title">{title}</h1>
          </div>
        </div>

        <p className="page-password-gate-description">
          {description || 'Enter the access password to continue.'}
        </p>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="page-password-gate-error">{error}</div>
          )}

          <label htmlFor="gate-password" className="page-password-gate-field-label">
            Access password
          </label>
          <div className="page-password-gate-input-wrap">
            <input
              id="gate-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              className="lt-input login-input page-password-gate-input"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="page-password-gate-eye"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={!password.trim()}
            className="lt-btn-primary page-password-gate-submit"
          >
            Continue <ArrowRight size={14} />
          </button>
        </form>

        <p className="page-password-gate-back">
          <Link to="/">&larr; Back to home</Link>
        </p>
      </div>
    </div>
  );
}
