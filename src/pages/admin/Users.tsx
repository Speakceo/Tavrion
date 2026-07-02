import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import {
  UserPlus, Search, Check, X, CreditCard as Edit, UserX, Trash2, Building2, KeyRound,
  Upload, Download, Users,
} from 'lucide-react';
import { UserProfile } from '../../types';
import {
  ORG_ASSIGNABLE_ROLES,
  sanitizeUserRole,
  isMasterSuperAdmin,
  canAssignRole,
} from '../../utils/platformAccess';
import {
  parseUserCsv,
  buildUserInsert,
  uniqueIdFromEmail,
  USER_CSV_TEMPLATE,
  type ParsedUserCsvRow,
} from '../../utils/userCsvImport';

type EditableUserFields = {
  full_name: string;
  role: UserProfile['role'];
  department: string;
};

export function AdminUsers() {
  const { profile, organization } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState<EditableUserFields>({ full_name: '', role: 'employee', department: '' });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCsvModal, setShowCsvModal] = useState(false);
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
  const [csvText, setCsvText] = useState('');
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvProgress, setCsvProgress] = useState('');
  const [csvResult, setCsvResult] = useState('');
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [pwUserId, setPwUserId] = useState<string | null>(null);
  const [pwValue, setPwValue] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const orgId = profile?.organization_id;

  const takenUniqueIds = useMemo(
    () => new Set(users.map((u) => u.unique_id.toLowerCase())),
    [users],
  );

  const parsedCsv = useMemo(() => parseUserCsv(csvText), [csvText]);

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

  const filteredUsers = users.filter((user) =>
    user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase()) ||
    user.unique_id?.toLowerCase().includes(search.toLowerCase()) ||
    (user.department || '').toLowerCase().includes(search.toLowerCase()),
  );

  const isProtectedUser = (user?: UserProfile) =>
    Boolean(user?.is_platform_owner || isMasterSuperAdmin(user?.unique_id));

  const toggleUserStatus = async (userId: string, currentStatus: boolean, user?: UserProfile) => {
    if (isProtectedUser(user)) return;
    await supabase.from('user_profiles').update({ is_active: !currentStatus }).eq('id', userId);
    if (currentStatus) {
      await supabase.from('team_members').delete().eq('user_id', userId);
    }
    fetchUsers();
  };

  const startEditUser = (user: UserProfile) => {
    setEditingUserId(user.id);
    setEditFields({
      full_name: user.full_name,
      role: user.role,
      department: user.department || '',
    });
  };

  const saveUserEdits = async (user: UserProfile) => {
    if (!editFields.full_name.trim()) return;
    if (!canAssignRole(editFields.role, profile || undefined)) {
      alert('You cannot assign that role.');
      return;
    }
    if (isProtectedUser(user) && editFields.role !== user.role) {
      alert('This account role cannot be changed.');
      return;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({
        full_name: editFields.full_name.trim(),
        role: sanitizeUserRole(editFields.role, user.unique_id),
        department: editFields.department.trim() || null,
      })
      .eq('id', user.id);

    if (error) {
      alert(error.message || 'Failed to update user.');
      return;
    }

    setEditingUserId(null);
    fetchUsers();
  };

  const handleDeleteUser = async (userId: string, userName: string, user?: UserProfile) => {
    if (isProtectedUser(user)) return;
    if (!confirm(`Delete "${userName}" permanently? This cannot be undone.`)) return;
    await supabase.from('team_members').delete().eq('user_id', userId);
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

    if (!newUser.full_name || !newUser.email) {
      setAddError('Name and email are required');
      return;
    }

    const unique_id = newUser.unique_id.trim()
      || uniqueIdFromEmail(newUser.email, new Set(takenUniqueIds));

    if (takenUniqueIds.has(unique_id.toLowerCase())) {
      setAddError('This User ID already exists in the organisation');
      return;
    }

    try {
      const insertData: Record<string, unknown> = {
        unique_id,
        full_name: newUser.full_name.trim(),
        email: newUser.email.trim().toLowerCase(),
        role: sanitizeUserRole(newUser.role, unique_id),
        department: newUser.department.trim() || null,
        country: newUser.country.trim() || null,
        is_active: true,
        organization_id: orgId || null,
      };
      if (newUser.password.trim()) insertData.password = newUser.password.trim();

      const { error } = await supabase.from('user_profiles').insert(insertData);

      if (error) {
        setAddError(error.message.includes('duplicate') || error.code === '23505'
          ? 'This User ID or email already exists'
          : error.message);
        return;
      }

      setAddSuccess(`User ${unique_id} added to ${organization?.name || 'org'} successfully!`);
      setNewUser({ unique_id: '', full_name: '', email: '', password: '', role: 'employee', department: '', country: '' });

      setTimeout(() => {
        setShowAddModal(false);
        setAddSuccess('');
        fetchUsers();
      }, 1500);
    } catch (error: unknown) {
      setAddError(error instanceof Error ? error.message : 'Failed to add user');
    }
  };

  const handleCsvFile = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
    setCsvResult('');
  };

  const downloadCsvTemplate = () => {
    const blob = new Blob([USER_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tavrion-users-template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importCsvUsers = async () => {
    const { rows, errors } = parsedCsv;
    if (!rows.length) {
      setCsvResult(errors[0] || 'No valid rows found in CSV.');
      return;
    }
    if (!orgId && !profile?.is_platform_owner) {
      setCsvResult('Organisation context is required for bulk import.');
      return;
    }

    setCsvImporting(true);
    setCsvProgress(`Importing ${rows.length} users...`);
    setCsvResult('');

    const taken = new Set(takenUniqueIds);
    const payloads = rows.map((row) => buildUserInsert(row, orgId, taken));

    let created = 0;
    const rowErrors: string[] = [...errors];

    const chunkSize = 50;
    for (let i = 0; i < payloads.length; i += chunkSize) {
      const chunk = payloads.slice(i, i + chunkSize);
      const { data, error } = await supabase.from('user_profiles').insert(chunk).select('id');
      if (error) {
        const startLine = rows[i]?.line || i + 2;
        rowErrors.push(`Batch starting line ${startLine}: ${error.message}`);
      } else {
        created += data?.length || 0;
      }
      setCsvProgress(`Imported ${Math.min(i + chunkSize, payloads.length)} of ${payloads.length}...`);
    }

    await fetchUsers();
    setCsvImporting(false);
    setCsvProgress('');
    setCsvResult(
      rowErrors.length
        ? `Created ${created} users. ${rowErrors.length} issue(s):\n${rowErrors.slice(0, 8).join('\n')}`
        : `Successfully created ${created} users.`,
    );
  };

  const resetCsvModal = () => {
    setShowCsvModal(false);
    setCsvText('');
    setCsvProgress('');
    setCsvResult('');
    if (csvInputRef.current) csvInputRef.current.value = '';
  };

  return (
    <Layout>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Admin</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717', marginBottom: 4 }}>User Management</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ fontSize: 14, color: '#4d4d4d' }}>Create users, update roles, and import in bulk</p>
              {organization && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 600, color: '#4d4d4d', background: '#f5f5f5', padding: '3px 10px', borderRadius: 9999, boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                  <Building2 size={10} /> {organization.name}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowCsvModal(true)} className="lt-btn-secondary"
              style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <Upload size={14} /> Import CSV
            </button>
            <button onClick={() => setShowAddModal(true)} className="lt-btn-primary"
              style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <UserPlus size={14} /> Add User
            </button>
          </div>
        </div>

        {csvProgress && (
          <div style={{ background: '#fafafa', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px', borderRadius: 8, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="lt-spinner" />
            <span style={{ fontSize: 13, color: '#4d4d4d' }}>{csvProgress}</span>
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
                  <th>User ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#808080', padding: 40 }}>Loading users...</td></tr>
                ) : filteredUsers.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', color: '#808080', padding: 40 }}>No users found</td></tr>
                ) : (
                  filteredUsers.map((user) => {
                    const editing = editingUserId === user.id;
                    const protectedUser = isProtectedUser(user);
                    return (
                      <tr key={user.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{user.unique_id}</td>
                        <td>
                          {editing ? (
                            <input type="text" value={editFields.full_name}
                              onChange={(e) => setEditFields({ ...editFields, full_name: e.target.value })}
                              className="lt-input" style={{ padding: '5px 9px', fontSize: 13, minWidth: 140 }} />
                          ) : (
                            <span style={{ fontSize: 13, color: '#171717', fontWeight: 500 }}>{user.full_name}</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: '#4d4d4d' }}>{user.email}</td>
                        <td>
                          {editing ? (
                            <input type="text" value={editFields.department}
                              onChange={(e) => setEditFields({ ...editFields, department: e.target.value })}
                              placeholder="Department"
                              className="lt-input" style={{ padding: '5px 9px', fontSize: 13, minWidth: 120 }} />
                          ) : (
                            <span style={{ fontSize: 13, color: '#4d4d4d' }}>{user.department || '—'}</span>
                          )}
                        </td>
                        <td>
                          {editing && !protectedUser ? (
                            <select value={editFields.role}
                              onChange={(e) => setEditFields({ ...editFields, role: e.target.value as UserProfile['role'] })}
                              className="lt-input" style={{ padding: '5px 9px', fontSize: 12 }}>
                              {ORG_ASSIGNABLE_ROLES.map((role) => (
                                <option key={role} value={role}>{role.replace('_', ' ')}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="lt-badge">{user.role.replace('_', ' ')}</span>
                          )}
                        </td>
                        <td>
                          <span className={`lt-badge ${user.is_active ? 'lt-badge-success' : 'lt-badge-error'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 4 }}>
                            {editing ? (
                              <>
                                <button onClick={() => saveUserEdits(user)} title="Save changes"
                                  style={{ padding: 6, color: '#1a7f1a', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
                                  <Check size={14} />
                                </button>
                                <button onClick={() => setEditingUserId(null)} title="Cancel"
                                  style={{ padding: 6, color: '#c0392b', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}>
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <button onClick={() => startEditUser(user)} title="Edit user"
                                style={{ padding: 6, color: '#4d4d4d', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              ><Edit size={13} /></button>
                            )}
                            <button onClick={() => { setPwUserId(user.id); setPwValue(''); setPwError(''); setPwSuccess(''); }} title="Set password"
                              style={{ padding: 6, color: '#0a72ef', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f6ff')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            ><KeyRound size={13} /></button>
                            {!protectedUser && (
                              <button onClick={() => toggleUserStatus(user.id, user.is_active, user)} title={user.is_active ? 'Deactivate' : 'Activate'}
                                style={{ padding: 6, color: '#a06000', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fffbf0')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              ><UserX size={13} /></button>
                            )}
                            {!protectedUser && (
                              <button onClick={() => handleDeleteUser(user.id, user.full_name, user)} title="Delete user"
                                style={{ padding: 6, color: '#c0392b', borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer' }}
                                onMouseEnter={(e) => (e.currentTarget.style.background = '#fff5f5')}
                                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                              ><Trash2 size={13} /></button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {pwUserId && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div className="lt-card" style={{ maxWidth: 380, width: '100%' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#171717' }}>Set Password</h2>
                <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>
                  For <strong>{users.find((u) => u.id === pwUserId)?.unique_id}</strong> · Leave blank to reset to User ID default
                </p>
              </div>
              <form onSubmit={handleSetPassword} style={{ padding: '20px 24px' }}>
                {pwError && <div className="lt-badge lt-badge-error" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontWeight: 400, fontSize: 13 }}>{pwError}</div>}
                {pwSuccess && <div className="lt-badge lt-badge-success" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 14, fontWeight: 400, fontSize: 13 }}>{pwSuccess}</div>}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>New Password</label>
                  <input type="text" value={pwValue} onChange={(e) => setPwValue(e.target.value)}
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

        {showAddModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div className="lt-card" style={{ maxWidth: 560, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#171717' }}>Add New User</h2>
                <p style={{ fontSize: 13, color: '#666666', marginTop: 4 }}>
                  Adding to <strong>{organization?.name || 'your organisation'}</strong>. User ID is optional — we generate one from email if left blank.
                </p>
              </div>

              <form onSubmit={handleAddUser} style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                {addError && <div className="lt-badge lt-badge-error" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontWeight: 400, fontSize: 13 }}>{addError}</div>}
                {addSuccess && <div className="lt-badge lt-badge-success" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontWeight: 400, fontSize: 13 }}>{addSuccess}</div>}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'User ID', key: 'unique_id', placeholder: 'Auto from email if blank' },
                    { label: 'Full Name *', key: 'full_name', placeholder: 'John Doe' },
                    { label: 'Email *', key: 'email', placeholder: 'user@company.com' },
                    { label: 'Password', key: 'password', placeholder: 'Leave blank = User ID default' },
                    { label: 'Department', key: 'department', placeholder: 'Sales, IT, HR...' },
                    { label: 'Country', key: 'country', placeholder: 'UK, USA, India...' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{field.label}</label>
                      <input
                        type="text"
                        required={field.label.endsWith('*')}
                        value={(newUser as Record<string, string>)[field.key]}
                        onChange={(e) => setNewUser({ ...newUser, [field.key]: e.target.value })}
                        placeholder={field.placeholder}
                        className="lt-input"
                        style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Role *</label>
                    <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as typeof newUser.role })}
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

        {showCsvModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
            <div className="lt-card" style={{ maxWidth: 720, width: '100%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb' }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: '#171717', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Users size={16} /> Bulk import users (CSV)
                </h2>
                <p style={{ fontSize: 13, color: '#666', marginTop: 6, lineHeight: 1.6 }}>
                  Upload a CSV with columns: <strong>name, email, department, role</strong>.
                  Roles must be <code>employee</code>, <code>trainer</code>, or <code>admin</code>.
                  User IDs are generated automatically from email.
                </p>
              </div>

              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <input ref={csvInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }}
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
                  <button type="button" className="lt-btn-secondary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={() => csvInputRef.current?.click()}>
                    <Upload size={14} /> Choose CSV file
                  </button>
                  <button type="button" className="lt-btn-secondary" style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}
                    onClick={downloadCsvTemplate}>
                    <Download size={14} /> Download template
                  </button>
                </div>

                <textarea value={csvText} onChange={(e) => { setCsvText(e.target.value); setCsvResult(''); }}
                  placeholder={USER_CSV_TEMPLATE}
                  className="lt-input"
                  style={{ width: '100%', minHeight: 160, padding: 12, fontFamily: 'monospace', fontSize: 12, boxSizing: 'border-box', marginBottom: 16 }}
                />

                {parsedCsv.rows.length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <p style={{ fontSize: 12, fontWeight: 600, color: '#666', marginBottom: 8 }}>
                      Preview — {parsedCsv.rows.length} valid row{parsedCsv.rows.length !== 1 ? 's' : ''}
                    </p>
                    <div style={{ maxHeight: 180, overflow: 'auto', border: '1px solid #ebebeb', borderRadius: 8 }}>
                      <table className="lt-table" style={{ width: '100%', fontSize: 12 }}>
                        <thead>
                          <tr><th>Name</th><th>Email</th><th>Department</th><th>Role</th></tr>
                        </thead>
                        <tbody>
                          {parsedCsv.rows.slice(0, 10).map((row: ParsedUserCsvRow) => (
                            <tr key={`${row.line}-${row.email}`}>
                              <td>{row.full_name}</td>
                              <td>{row.email}</td>
                              <td>{row.department || '—'}</td>
                              <td>{row.role}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {parsedCsv.rows.length > 10 && (
                      <p style={{ fontSize: 11, color: '#808080', marginTop: 6 }}>Showing first 10 rows</p>
                    )}
                  </div>
                )}

                {parsedCsv.errors.length > 0 && (
                  <div className="lt-badge lt-badge-error" style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontWeight: 400, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                    {parsedCsv.errors.slice(0, 6).join('\n')}
                  </div>
                )}

                {csvResult && (
                  <div className={csvResult.startsWith('Successfully') ? 'lt-badge lt-badge-success' : 'lt-badge lt-badge-error'}
                    style={{ display: 'block', padding: '10px 14px', borderRadius: 8, marginBottom: 12, fontWeight: 400, fontSize: 12, whiteSpace: 'pre-wrap' }}>
                    {csvResult}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 24px', borderTop: '1px solid #ebebeb' }}>
                <button type="button" className="lt-btn-secondary" style={{ padding: '9px 16px' }} onClick={resetCsvModal}>
                  Close
                </button>
                <button type="button" className="lt-btn-primary" style={{ padding: '9px 16px' }}
                  disabled={csvImporting || parsedCsv.rows.length === 0}
                  onClick={importCsvUsers}>
                  {csvImporting ? 'Importing...' : `Import ${parsedCsv.rows.length || 0} users`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
