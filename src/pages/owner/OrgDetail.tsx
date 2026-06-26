import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import {
  Building2, ArrowLeft, Save, Users, BookOpen, ToggleLeft, ToggleRight,
  UserPlus, Search, Trash2, UserX, Check, X, CreditCard as Edit, KeyRound,
} from 'lucide-react';
import { Organization, UserProfile } from '../../types';
import { ORG_ASSIGNABLE_ROLES, sanitizeUserRole, isMasterSuperAdmin } from '../../utils/platformAccess';

const DEFAULT_FEATURES = {
  ai_tutor: false,
  mock_calls: false,
  live_calls: false,
  polls: false,
  social_feed: false,
  vault: false,
  leaderboard: false,
  email_nudges: false,
  scorm_upload: false,
  certificates: false,
  books: false,
};

type Tab = 'settings' | 'users';

export function OrgDetail() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const isNew = orgId === 'new';

  const [tab, setTab] = useState<Tab>('settings');
  const [org, setOrg] = useState<Partial<Organization>>({
    name: '', slug: '', description: '',
    features: { ...DEFAULT_FEATURES }, settings: {}, is_active: true,
  });
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Users state
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ unique_id: '', full_name: '', email: '', password: '', role: 'employee' as any, department: '', country: '' });
  const [addUserError, setAddUserError] = useState('');
  const [addUserSuccess, setAddUserSuccess] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Password reset state
  const [pwUserId, setPwUserId] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  useEffect(() => {
    if (!isNew && orgId) fetchOrg(orgId);
  }, [orgId]);

  useEffect(() => {
    if (!isNew && orgId && tab === 'users') fetchOrgUsers(orgId);
  }, [tab, orgId]);

  const fetchOrg = async (id: string) => {
    const { data } = await supabase.from('organizations').select('*').eq('id', id).maybeSingle();
    if (data) setOrg({ ...data, features: { ...DEFAULT_FEATURES, ...(data.features || {}) } });
    setLoading(false);
  };

  const fetchOrgUsers = async (id: string) => {
    setUsersLoading(true);
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('organization_id', id)
      .order('unique_id', { ascending: true });
    if (data) setUsers(data);
    setUsersLoading(false);
  };

  const emailDomain = (org.settings as any)?.email_domain || `${org.slug || 'org'}.com`;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!org.name || !org.slug) { setError('Name and slug are required'); return; }

    setSaving(true);
    try {
      if (isNew) {
        const { data, error: err } = await supabase.from('organizations').insert({
          name: org.name, slug: org.slug, description: org.description,
          features: org.features, settings: org.settings || {}, is_active: org.is_active,
        }).select().single();
        if (err) throw err;
        setSuccess('Organization created!');
        setTimeout(() => navigate(`/owner/organizations/${data.id}`), 1200);
      } else {
        const { error: err } = await supabase.from('organizations').update({
          name: org.name, slug: org.slug, description: org.description,
          features: org.features, settings: org.settings || {},
          is_active: org.is_active, updated_at: new Date().toISOString(),
        }).eq('id', orgId);
        if (err) throw err;
        setSuccess('Changes saved!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddUserError('');
    setAddUserSuccess('');
    if (!newUser.unique_id || !newUser.full_name || !newUser.email) { setAddUserError('User ID, name, and email are required'); return; }

    const insertData: any = {
      unique_id: newUser.unique_id,
      full_name: newUser.full_name,
      email: newUser.email,
      role: sanitizeUserRole(newUser.role, newUser.unique_id),
      department: newUser.department || null,
      country: newUser.country || null,
      is_active: true,
      organization_id: orgId,
    };
    if (newUser.password.trim()) insertData.password = newUser.password.trim();

    const { error: err } = await supabase.from('user_profiles').insert(insertData);

    if (err) {
      setAddUserError(err.message.includes('duplicate') || err.code === '23505' ? 'User ID already exists' : err.message);
      return;
    }

    setAddUserSuccess(`${newUser.unique_id} added!`);
    setNewUser({ unique_id: '', full_name: '', email: '', password: '', role: 'employee', department: '', country: '' });
    if (orgId) fetchOrgUsers(orgId);
    setTimeout(() => { setShowAddUser(false); setAddUserSuccess(''); }, 1500);
  };

  const handleDeleteUser = async (userId: string, userName: string, user?: UserProfile) => {
    if (user?.is_platform_owner || isMasterSuperAdmin(user?.unique_id)) return;
    if (!confirm(`Delete "${userName}" permanently?`)) return;
    await supabase.from('user_profiles').delete().eq('id', userId);
    if (orgId) fetchOrgUsers(orgId);
  };

  const toggleUserStatus = async (userId: string, current: boolean, user?: UserProfile) => {
    if (user?.is_platform_owner || isMasterSuperAdmin(user?.unique_id)) return;
    await supabase.from('user_profiles').update({ is_active: !current }).eq('id', userId);
    if (orgId) fetchOrgUsers(orgId);
  };

  const saveName = async (userId: string) => {
    if (!editingName.trim()) return;
    await supabase.from('user_profiles').update({ full_name: editingName.trim() }).eq('id', userId);
    setEditingUserId(null);
    setEditingName('');
    if (orgId) fetchOrgUsers(orgId);
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (!pwValue.trim() || pwValue.trim().length < 4) {
      setPwError('Password must be at least 4 characters');
      return;
    }
    const { error } = await supabase.from('user_profiles').update({ password: pwValue.trim() }).eq('id', pwUserId!);
    if (error) { setPwError(error.message); return; }
    setPwSuccess('Password updated!');
    setTimeout(() => { setPwUserId(null); setPwValue(''); setPwSuccess(''); }, 1200);
  };

  const toggleFeature = (key: string) => {
    setOrg(prev => ({ ...prev, features: { ...(prev.features || {}), [key]: !(prev.features || {})[key] } }));
  };

  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.unique_id?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240 }}>
          <div className="lt-spinner" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <Link to="/owner" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#808080', textDecoration: 'none', marginBottom: 16 }}
            onMouseEnter={e => (e.currentTarget.style.color = '#171717')}
            onMouseLeave={e => (e.currentTarget.style.color = '#808080')}
          >
            <ArrowLeft size={13} /> Back to Owner Portal
          </Link>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Owner Portal</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717' }}>
            {isNew ? 'New Organization' : org.name}
          </h1>
        </div>

        {/* Stats row (existing orgs only) */}
        {!isNew && (
          <div className="grid grid-cols-2 gap-4" style={{ marginBottom: 20 }}>
            {[
              { label: 'Users', value: users.length, Icon: Users },
              { label: 'Features enabled', value: Object.values(org.features || {}).filter(Boolean).length, Icon: BookOpen },
            ].map(({ label, value, Icon }) => (
              <div key={label} className="lt-card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 32, height: 32, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                  <Icon size={14} color="#808080" />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717' }}>{value}</div>
                  <div style={{ fontSize: 11, color: '#808080' }}>{label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs (existing orgs only) */}
        {!isNew && (
          <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
            {(['settings', 'users'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === t ? 600 : 500, background: tab === t ? '#171717' : '#fff', color: tab === t ? '#fff' : '#4d4d4d', boxShadow: tab === t ? 'none' : 'rgba(0,0,0,0.08) 0px 0px 0px 1px', transition: 'all 0.12s', textTransform: 'capitalize' }}>
                {t === 'users' ? `Users (${users.length || '...'})` : 'Settings'}
              </button>
            ))}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {(isNew || tab === 'settings') && (
          <form onSubmit={handleSave}>
            {error && <div style={{ background: '#fff5f5', boxShadow: '#ff5b4f50 0px 0px 0px 1px', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#c0392b', marginBottom: 16 }}>{error}</div>}
            {success && <div style={{ background: '#f0faf0', boxShadow: '#1a7f1a50 0px 0px 0px 1px', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#1a7f1a', marginBottom: 16 }}>{success}</div>}

            <div className="lt-card" style={{ padding: '24px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
                <Building2 size={15} color="#4d4d4d" />
                <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>Organization Details</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                {[
                  { label: 'Organization Name *', key: 'name', placeholder: 'e.g., Amber Student' },
                  { label: 'Slug *', key: 'slug', placeholder: 'e.g., amberstudent' },
                ].map(f => (
                  <div key={f.key}>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                    <input type="text" value={(org as any)[f.key] || ''} onChange={e => setOrg({ ...org, [f.key]: e.target.value })}
                      placeholder={f.placeholder} className="lt-input" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }} />
                  </div>
                ))}
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Email Domain</label>
                  <input type="text"
                    value={(org.settings as any)?.email_domain || ''}
                    onChange={e => setOrg({ ...org, settings: { ...(org.settings || {}), email_domain: e.target.value } })}
                    placeholder="e.g., company.com"
                    className="lt-input" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
                <textarea value={org.description || ''} onChange={e => setOrg({ ...org, description: e.target.value })}
                  placeholder="Brief description..." rows={3} className="lt-input" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#171717' }}>Active</span>
                <button type="button" onClick={() => setOrg({ ...org, is_active: !org.is_active })}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: org.is_active ? '#171717' : '#cccccc' }}>
                  {org.is_active ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
                </button>
              </div>
            </div>

            <div className="lt-card" style={{ padding: '24px', marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717', marginBottom: 6 }}>Feature Configuration</h2>
              <p style={{ fontSize: 13, color: '#666', marginBottom: 20 }}>Toggle features available to this organization</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                {Object.keys(DEFAULT_FEATURES).map((key, i, arr) => (
                  <div key={key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '11px 0', gap: 12,
                    borderBottom: i < arr.length - 2 ? '1px solid #f5f5f5' : 'none',
                    paddingRight: i % 2 === 0 ? 24 : 0,
                    paddingLeft: i % 2 === 1 ? 24 : 0,
                    borderLeft: i % 2 === 1 ? '1px solid #f5f5f5' : 'none',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#171717', textTransform: 'capitalize' }}>{key.replace(/_/g, ' ')}</span>
                    <button type="button" onClick={() => toggleFeature(key)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: org.features?.[key] ? '#171717' : '#cccccc' }}>
                      {org.features?.[key] ? <ToggleRight size={24} /> : <ToggleLeft size={24} />}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Link to="/owner" className="lt-btn-secondary" style={{ padding: '9px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center' }}>Cancel</Link>
              <button type="submit" disabled={saving} className="lt-btn-primary" style={{ padding: '9px 18px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Save size={13} /> {saving ? 'Saving...' : isNew ? 'Create Organization' : 'Save Changes'}
              </button>
            </div>
          </form>
        )}

        {/* ── USERS TAB ── */}
        {!isNew && tab === 'users' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontSize: 14, color: '#4d4d4d' }}>
                Users in <strong>{org.name}</strong>
              </p>
              <button onClick={() => setShowAddUser(true)} className="lt-btn-primary"
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
                <UserPlus size={13} /> Add User
              </button>
            </div>

            <div className="lt-card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <Search size={12} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
                  <input type="text" value={userSearch} onChange={e => setUserSearch(e.target.value)}
                    placeholder="Search users..." className="lt-input"
                    style={{ width: '100%', padding: '7px 12px 7px 28px', boxSizing: 'border-box' }} />
                </div>
                <span style={{ fontSize: 12, color: '#808080', flexShrink: 0 }}>{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="lt-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr><th>User ID</th><th>Name</th><th>Role</th><th>Department</th><th>Status</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {usersLoading ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#808080' }}>Loading...</td></tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: 32, color: '#808080' }}>No users in this organisation yet</td></tr>
                    ) : filteredUsers.map(user => (
                      <tr key={user.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{user.unique_id}</td>
                        <td>
                          {editingUserId === user.id ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <input type="text" value={editingName} onChange={e => setEditingName(e.target.value)}
                                className="lt-input" style={{ padding: '5px 9px', fontSize: 13 }} autoFocus />
                              <button onClick={() => saveName(user.id)} style={{ padding: 5, color: '#1a7f1a', background: 'none', border: 'none', cursor: 'pointer' }}><Check size={14} /></button>
                              <button onClick={() => { setEditingUserId(null); setEditingName(''); }} style={{ padding: 5, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                            </div>
                          ) : (
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#171717' }}>{user.full_name}</span>
                          )}
                        </td>
                        <td><span className="lt-badge">{user.role.replace('_', ' ')}</span></td>
                        <td>{user.department || '-'}</td>
                        <td>
                          <span className={`lt-badge ${user.is_active ? 'lt-badge-success' : 'lt-badge-error'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {editingUserId !== user.id && (
                              <button onClick={() => { setEditingUserId(user.id); setEditingName(user.full_name); }} title="Edit name"
                                style={{ padding: 6, color: '#4d4d4d', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              ><Edit size={13} /></button>
                            )}
                            <button onClick={() => { setPwUserId(user.id); setPwValue(''); setPwError(''); setPwSuccess(''); }} title="Set password"
                              style={{ padding: 6, color: '#0a72ef', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#f0f6ff')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            ><KeyRound size={13} /></button>
                            {!user.is_platform_owner && !isMasterSuperAdmin(user.unique_id) && (
                              <button onClick={() => toggleUserStatus(user.id, user.is_active, user)}
                                style={{ padding: 6, color: '#a06000', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={e => (e.currentTarget.style.background = '#fffbf0')}
                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                              ><UserX size={13} /></button>
                            )}
                            {!user.is_platform_owner && !isMasterSuperAdmin(user.unique_id) && (
                              <button onClick={() => handleDeleteUser(user.id, user.full_name, user)}
                              style={{ padding: 6, color: '#c0392b', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            ><Trash2 size={13} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Set Password Modal */}
            {pwUserId && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                <div className="lt-card" style={{ maxWidth: 380, width: '100%' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#171717' }}>Set Password</h2>
                    <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                      For <strong>{users.find(u => u.id === pwUserId)?.unique_id}</strong>
                    </p>
                  </div>
                  <form onSubmit={handleSetPassword} style={{ padding: '20px 24px' }}>
                    {pwError && <div className="lt-badge lt-badge-error" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontWeight: 400, fontSize: 13 }}>{pwError}</div>}
                    {pwSuccess && <div className="lt-badge lt-badge-success" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontWeight: 400, fontSize: 13 }}>{pwSuccess}</div>}
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>New Password</label>
                      <input type="text" value={pwValue} onChange={e => setPwValue(e.target.value)}
                        placeholder="Min. 4 characters" className="lt-input"
                        style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }} autoFocus />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 14, borderTop: '1px solid #ebebeb' }}>
                      <button type="button" className="lt-btn-secondary" style={{ padding: '9px 16px' }}
                        onClick={() => { setPwUserId(null); setPwValue(''); setPwError(''); setPwSuccess(''); }}>
                        Cancel
                      </button>
                      <button type="submit" className="lt-btn-primary" style={{ padding: '9px 16px' }}>Set Password</button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* Add user modal */}
            {showAddUser && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
                <div className="lt-card" style={{ maxWidth: 520, width: '100%', overflow: 'hidden' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb' }}>
                    <h2 style={{ fontSize: 16, fontWeight: 700, color: '#171717' }}>Add User to {org.name}</h2>
                    <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Fill in user details below</p>
                  </div>
                  <form onSubmit={handleAddUser} style={{ padding: '20px 24px' }}>
                    {addUserError && <div className="lt-badge lt-badge-error" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontWeight: 400, fontSize: 13 }}>{addUserError}</div>}
                    {addUserSuccess && <div className="lt-badge lt-badge-success" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontWeight: 400, fontSize: 13 }}>{addUserSuccess}</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                      {[
                        { label: 'User ID *', key: 'unique_id', placeholder: 'e.g., UserABC' },
                        { label: 'Full Name *', key: 'full_name', placeholder: 'John Doe' },
                        { label: 'Email *', key: 'email', placeholder: 'user@company.com' },
                        { label: 'Password', key: 'password', placeholder: 'Blank = User ID default' },
                        { label: 'Department', key: 'department', placeholder: 'Sales, IT...' },
                        { label: 'Country', key: 'country', placeholder: 'UK, USA...' },
                      ].map(f => (
                        <div key={f.key}>
                          <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{f.label}</label>
                          <input type="text" value={(newUser as any)[f.key]}
                            onChange={e => setNewUser({ ...newUser, [f.key]: e.target.value })}
                            placeholder={f.placeholder} className="lt-input"
                            style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box' }} />
                        </div>
                      ))}
                      <div>
                        <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role *</label>
                        <select value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value as any })}
                          className="lt-input" style={{ width: '100%', padding: '8px 12px', boxSizing: 'border-box' }}>
                          {ORG_ASSIGNABLE_ROLES.map((role) => (
                            <option key={role} value={role}>{role.replace('_', ' ')}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 14, borderTop: '1px solid #ebebeb' }}>
                      <button type="button" className="lt-btn-secondary" style={{ padding: '8px 16px' }}
                        onClick={() => { setShowAddUser(false); setAddUserError(''); setAddUserSuccess(''); setNewUser({ unique_id: '', full_name: '', email: '', password: '', role: 'employee', department: '', country: '' }); }}>
                        Cancel
                      </button>
                      <button type="submit" className="lt-btn-primary" style={{ padding: '8px 16px' }}>Add User</button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
