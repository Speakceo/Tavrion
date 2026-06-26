import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Search, Check, X, CreditCard as Edit, UserX, Trash2, Building2, KeyRound } from 'lucide-react';
import { UserProfile } from '../../types';
import { ORG_ASSIGNABLE_ROLES, sanitizeUserRole, isMasterSuperAdmin } from '../../utils/platformAccess';

export function AdminUsers() {
  const { profile, organization } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    unique_id: '',
    full_name: '',
    email: '',
    password: '',
    role: 'employee' as 'employee' | 'trainer' | 'admin',
    department: '',
    country: '',
  });
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');
  const [bulkCreating, setBulkCreating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');

  // Password reset state
  const [pwUserId, setPwUserId] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const orgId = profile?.organization_id;

  useEffect(() => {
    if (profile) fetchUsers();
  }, [profile]);

  const fetchUsers = async () => {
    let query = supabase
      .from('user_profiles')
      .select('*')
      .order('unique_id', { ascending: true });

    if (!profile?.is_platform_owner && orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { data } = await query;
    if (data) setUsers(data);
    setLoading(false);
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.unique_id?.toLowerCase().includes(search.toLowerCase())
  );

  const toggleUserStatus = async (userId: string, currentStatus: boolean, user?: UserProfile) => {
    if (user?.is_platform_owner || isMasterSuperAdmin(user?.unique_id)) return;
    await supabase.from('user_profiles').update({ is_active: !currentStatus }).eq('id', userId);
    fetchUsers();
  };

  const saveName = async (userId: string) => {
    if (!editingName.trim()) return;
    await supabase.from('user_profiles').update({ full_name: editingName.trim() }).eq('id', userId);
    setEditingUserId(null);
    setEditingName('');
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string, userName: string, user?: UserProfile) => {
    if (user?.is_platform_owner || isMasterSuperAdmin(user?.unique_id)) return;
    if (!confirm(`Delete "${userName}" permanently? This cannot be undone.`)) return;
    const { error } = await supabase.from('user_profiles').delete().eq('id', userId);
    if (error) { alert('Failed to delete user. Please try again.'); return; }
    fetchUsers();
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

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');
    setAddSuccess('');

    if (!newUser.unique_id || !newUser.full_name || !newUser.email) {
      setAddError('User ID, name, and email are required');
      return;
    }

    try {
      const insertData: any = {
        unique_id: newUser.unique_id,
        full_name: newUser.full_name,
        email: newUser.email,
        role: sanitizeUserRole(newUser.role, newUser.unique_id),
        department: newUser.department || null,
        country: newUser.country || null,
        is_active: true,
        organization_id: orgId || null,
      };
      if (newUser.password.trim()) insertData.password = newUser.password.trim();

      const { error } = await supabase.from('user_profiles').insert(insertData);

      if (error) {
        setAddError(error.message.includes('duplicate') || error.code === '23505'
          ? 'This User ID already exists'
          : error.message);
        return;
      }

      setAddSuccess(`User ${newUser.unique_id} added to ${organization?.name || 'org'} successfully!`);
      setNewUser({ unique_id: '', full_name: '', email: '', password: '', role: 'employee', department: '', country: '' });

      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess('');
        fetchUsers();
      }, 1500);
    } catch (error: any) {
      setAddError(error.message || 'Failed to add user');
    }
  };

  const bulkCreateTrainingUsers = async () => {
    const count = 200;
    const orgName = organization?.name || 'org';
    if (!confirm(`Create ${count} training users for ${orgName}? This may take a moment.`)) return;

    setBulkCreating(true);
    setBulkProgress('Starting bulk user creation...');

    const prefix = organization?.slug === 'amberstudent' ? 'Amber' : (organization?.slug?.slice(0, 5) || 'User');
    const domain = (organization?.settings as any)?.email_domain || `${organization?.slug || 'tavrion'}.com`;
    const usersToCreate = [];
    for (let i = 1; i <= count; i++) {
      const paddedNum = String(i).padStart(3, '0');
      const uniqueId = `${prefix}${paddedNum}`;
      usersToCreate.push({
        unique_id: uniqueId,
        full_name: `User ${paddedNum}`,
        email: `${uniqueId.toLowerCase()}@${domain}`,
        role: 'employee',
        department: 'Training',
        country: 'Global',
        is_active: true,
        organization_id: orgId || null,
      });
    }

    setBulkProgress(`Creating ${count} users for ${orgName}...`);

    try {
      const { data, error } = await supabase.from('user_profiles').insert(usersToCreate).select();
      if (error) setBulkProgress(`Error: ${error.message}`);
      else setBulkProgress(`Successfully created ${data?.length || 0} users!`);
    } catch (error: any) {
      setBulkProgress(`Error: ${error.message}`);
    }

    await fetchUsers();
    setTimeout(() => { setBulkCreating(false); setBulkProgress(''); }, 3000);
  };

  return (
    <Layout>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Admin</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717', marginBottom: 4 }}>User Management</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <p style={{ fontSize: 14, color: '#4d4d4d' }}>Manage users, roles, and permissions</p>
              {organization && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#4d4d4d', background: '#f5f5f5', padding: '3px 10px', borderRadius: 9999, boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                  <Building2 size={10} /> {organization.name}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={bulkCreateTrainingUsers} disabled={bulkCreating} className="lt-btn-secondary"
              style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <UserPlus size={14} />
              <span>{bulkCreating ? 'Creating...' : 'Bulk Create 200'}</span>
            </button>
            <button onClick={() => setShowAddModal(true)} className="lt-btn-primary"
              style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <UserPlus size={14} /> Add User
            </button>
          </div>
        </div>

        {bulkProgress && (
          <div style={{ background: '#fafafa', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="lt-spinner" />
            <span style={{ fontSize: 13, color: '#4d4d4d' }}>{bulkProgress}</span>
          </div>
        )}

        <div className="lt-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${filteredUsers.length} users...`} className="lt-input"
                style={{ width: '100%', padding: '8px 12px 8px 32px', boxSizing: 'border-box' }} />
            </div>
            <span style={{ fontSize: 12, color: '#808080', flexShrink: 0, fontWeight: 500 }}>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="lt-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th>User ID</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#808080', padding: 40 }}>Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', color: '#808080', padding: 40 }}>No users found</td></tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{user.unique_id}</td>
                      <td>
                        {editingUserId === user.id ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input type="text" value={editingName} onChange={(e) => setEditingName(e.target.value)}
                              className="lt-input" style={{ padding: '5px 9px', fontSize: 13 }} autoFocus />
                            <button onClick={() => saveName(user.id)} style={{ padding: 5, color: '#1a7f1a', background: 'none', border: 'none', cursor: 'pointer' }}><Check size={14} /></button>
                            <button onClick={() => { setEditingUserId(null); setEditingName(''); }} style={{ padding: 5, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer' }}><X size={14} /></button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 13, color: '#171717', fontWeight: 500 }}>{user.full_name}</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12, color: '#4d4d4d' }}>{user.email}</td>
                      <td><span className="lt-badge">{user.role.replace('_', ' ')}</span></td>
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
                            <button onClick={() => toggleUserStatus(user.id, user.is_active, user)} title={user.is_active ? 'Deactivate' : 'Activate'}
                              style={{ padding: 6, color: '#a06000', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={e => (e.currentTarget.style.background = '#fffbf0')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            ><UserX size={13} /></button>
                          )}
                          {!user.is_platform_owner && !isMasterSuperAdmin(user.unique_id) && (
                            <button onClick={() => handleDeleteUser(user.id, user.full_name, user)} title="Delete user"
                            style={{ padding: 6, color: '#c0392b', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          ><Trash2 size={13} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
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
                  For <strong>{users.find(u => u.id === pwUserId)?.unique_id}</strong> · Leave blank to reset to User ID default
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

        {/* Add User Modal */}
        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div className="lt-card" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#171717' }}>Add New User</h2>
                <p style={{ fontSize: 13, color: '#666666', marginTop: 4 }}>
                  Adding to <strong>{organization?.name || 'your organisation'}</strong>
                </p>
              </div>

              <form onSubmit={handleAddUser} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {addError && <div className="lt-badge lt-badge-error" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontWeight: 400, fontSize: 13 }}>{addError}</div>}
                {addSuccess && <div className="lt-badge lt-badge-success" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontWeight: 400, fontSize: 13 }}>{addSuccess}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'User ID *', key: 'unique_id', placeholder: 'e.g., Amber001' },
                    { label: 'Full Name *', key: 'full_name', placeholder: 'John Doe' },
                    { label: 'Email *', key: 'email', placeholder: 'user@company.com' },
                    { label: 'Password', key: 'password', placeholder: 'Leave blank = User ID default' },
                    { label: 'Department', key: 'department', placeholder: 'Sales, IT, HR...' },
                    { label: 'Country', key: 'country', placeholder: 'UK, USA, India...' },
                  ].map(field => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{field.label}</label>
                      <input
                        type={field.key === 'password' ? 'text' : 'text'}
                        required={field.label.endsWith('*')}
                        value={(newUser as any)[field.key]}
                        onChange={(e) => setNewUser({ ...newUser, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="lt-input"
                        style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role *</label>
                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                      className="lt-input" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }}>
                      {ORG_ASSIGNABLE_ROLES.map((role) => (
                        <option key={role} value={role}>{role.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 24, paddingTop: 16, borderTop: '1px solid #ebebeb' }}>
                  <button type="button" className="lt-btn-secondary" style={{ padding: '9px 16px' }}
                    onClick={() => { setShowAddModal(false); setAddError(''); setAddSuccess(''); setNewUser({ unique_id: '', full_name: '', email: '', password: '', role: 'employee', department: '', country: '' }); }}>
                    Cancel
                  </button>
                  <button type="submit" className="lt-btn-primary" style={{ padding: '9px 16px' }}>Add User</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
