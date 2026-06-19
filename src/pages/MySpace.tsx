import { useState } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';
import { User, Lock, Building2, Shield, Check, Eye, EyeOff } from 'lucide-react';

const T = {
  text: '#171717', body: '#4d4d4d', muted: '#666666', faint: '#808080',
  bg: '#fff', bgSubtle: '#fafafa', bgSection: '#f5f5f5',
  border: '#ebebeb', shadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
};

export function MySpace() {
  const { profile, changePassword } = useAuth();

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (newPw.length < 4) {
      setPwError('New password must be at least 4 characters');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match');
      return;
    }

    setPwLoading(true);
    const { error } = await changePassword(currentPw, newPw);
    setPwLoading(false);

    if (error) {
      setPwError(error.message || 'Failed to change password');
    } else {
      setPwSuccess('Password changed successfully');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
    }
  };

  if (!profile) return null;

  const initials = profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <Layout>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Account</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: T.text, marginBottom: 4 }}>Settings</h1>
          <p style={{ fontSize: 14, color: T.body }}>Manage your profile and account preferences</p>
        </div>

        {/* Profile card */}
        <div className="lt-card" style={{ padding: '24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: T.text,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700, color: T.text }}>{profile.full_name}</div>
              <div style={{ fontSize: 13, color: T.muted, marginTop: 2 }}>{profile.email}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {[
              { label: 'User ID', value: profile.unique_id, icon: User },
              { label: 'Role', value: profile.role.replace('_', ' '), icon: Shield },
              { label: 'Department', value: profile.department || 'Not set', icon: Building2 },
              { label: 'Country', value: profile.country || 'Not set', icon: Building2 },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} style={{ background: T.bgSubtle, borderRadius: 10, padding: '14px 16px', boxShadow: T.shadow }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <Icon size={12} color={T.faint} />
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.faint, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, color: T.text, textTransform: 'capitalize' }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Password change */}
        <div className="lt-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
            <Lock size={15} color={T.body} />
            <h2 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>Change Password</h2>
          </div>
          <p style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>
            Your default password is your User ID. Change it here to something more secure.
          </p>

          <form onSubmit={handleChangePassword}>
            {pwError && (
              <div style={{ background: '#fff5f5', boxShadow: '#ff5b4f50 0px 0px 0px 1px', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c0392b', marginBottom: 16 }}>
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div style={{ background: '#f0faf0', boxShadow: '#1a7f1a50 0px 0px 0px 1px', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1a7f1a', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Check size={13} /> {pwSuccess}
              </div>
            )}

            {[
              { label: 'Current Password', value: currentPw, setter: setCurrentPw, show: showCurrent, toggler: setShowCurrent, placeholder: 'Your current password (default: User ID)' },
              { label: 'New Password', value: newPw, setter: setNewPw, show: showNew, toggler: setShowNew, placeholder: 'At least 4 characters' },
              { label: 'Confirm New Password', value: confirmPw, setter: setConfirmPw, show: showConfirm, toggler: setShowConfirm, placeholder: 'Repeat new password' },
            ].map(field => (
              <div key={field.label} style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: T.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {field.label}
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={field.show ? 'text' : 'password'}
                    value={field.value}
                    onChange={e => field.setter(e.target.value)}
                    placeholder={field.placeholder}
                    required
                    className="lt-input"
                    style={{ width: '100%', padding: '10px 44px 10px 12px', boxSizing: 'border-box' }}
                  />
                  <button
                    type="button"
                    onClick={() => field.toggler(!field.show)}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.faint, padding: 4, display: 'flex' }}
                  >
                    {field.show ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button type="submit" disabled={pwLoading} className="lt-btn-primary" style={{ padding: '10px 20px' }}>
                {pwLoading ? 'Saving...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
