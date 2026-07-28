import { useState, useEffect } from 'react';
import { AppModal } from '../../components/AppModal';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { applyOrgUserScope } from '../../utils/orgUsers';
import JSZip from 'jszip';
import { Users, Plus, Trash2, Upload, X } from 'lucide-react';

interface Team {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  member_count: number;
}

interface TeamMember {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user: {
    full_name: string;
    email: string;
    is_active?: boolean;
  } | null;
}

interface User {
  id: string;
  full_name: string;
  email: string;
}

interface BulkUploadPreview {
  emails: string[];
  matchedUsers: User[];
  missingEmails: string[];
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function parseCsvLikeEmails(text: string): string[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) return [];

  const firstCols = lines[0].split(/,|\t/).map((col) => col.trim().toLowerCase());
  const emailIdx = firstCols.findIndex((col) => col === 'email' || col.includes('email'));
  const startIndex = emailIdx >= 0 ? 1 : 0;
  const values: string[] = [];

  for (let i = startIndex; i < lines.length; i += 1) {
    const cols = lines[i].split(/,|\t/).map((col) => col.trim());
    const raw = emailIdx >= 0 ? cols[emailIdx] : cols[0];
    const email = normalizeEmail(raw || '');
    if (email && email.includes('@')) values.push(email);
  }

  return [...new Set(values)];
}

function columnLabelToIndex(label: string) {
  return label.split('').reduce((acc, ch) => (acc * 26) + ch.charCodeAt(0) - 64, 0) - 1;
}

async function parseXlsxEmails(file: File): Promise<string[]> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);
  const parser = new DOMParser();

  const sharedStringsXml = await zip.file('xl/sharedStrings.xml')?.async('text');
  const sharedStrings: string[] = [];
  if (sharedStringsXml) {
    const sharedDoc = parser.parseFromString(sharedStringsXml, 'application/xml');
    sharedDoc.querySelectorAll('si').forEach((si) => {
      const text = Array.from(si.querySelectorAll('t')).map((node) => node.textContent || '').join('');
      sharedStrings.push(text);
    });
  }

  const sheetEntry = Object.keys(zip.files)
    .filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name))
    .sort()[0];
  if (!sheetEntry) throw new Error('No worksheet found in the Excel file.');

  const sheetXml = await zip.file(sheetEntry)?.async('text');
  if (!sheetXml) throw new Error('Could not read the first worksheet.');

  const sheetDoc = parser.parseFromString(sheetXml, 'application/xml');
  const rows = Array.from(sheetDoc.querySelectorAll('sheetData > row')).map((row) => {
    const cells: string[] = [];
    row.querySelectorAll('c').forEach((cell) => {
      const ref = cell.getAttribute('r') || '';
      const colLetters = (ref.match(/[A-Z]+/i) || ['A'])[0].toUpperCase();
      const idx = columnLabelToIndex(colLetters);
      const type = cell.getAttribute('t');
      let value = '';
      if (type === 'inlineStr') {
        value = Array.from(cell.querySelectorAll('is t')).map((node) => node.textContent || '').join('');
      } else {
        const raw = cell.querySelector('v')?.textContent || '';
        value = type === 's' ? (sharedStrings[Number(raw)] || '') : raw;
      }
      cells[idx] = value.trim();
    });
    return cells;
  }).filter((row) => row.some(Boolean));

  if (!rows.length) return [];

  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const emailIdx = header.findIndex((col) => col === 'email' || col.includes('email'));
  const startIndex = emailIdx >= 0 ? 1 : 0;
  const values: string[] = [];

  for (let i = startIndex; i < rows.length; i += 1) {
    const raw = emailIdx >= 0 ? rows[i][emailIdx] : rows[i][0];
    const email = normalizeEmail(raw || '');
    if (email && email.includes('@')) values.push(email);
  }

  return [...new Set(values)];
}

async function parseBulkEmailFile(file: File): Promise<string[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx')) {
    return parseXlsxEmails(file);
  }
  const text = await file.text();
  return parseCsvLikeEmails(text);
}

export function Teams() {
  const { profile } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [newTeam, setNewTeam] = useState({
    name: '',
    description: '',
  });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [bulkPreview, setBulkPreview] = useState<BulkUploadPreview | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkAdding, setBulkAdding] = useState(false);

  useEffect(() => {
    if (profile && ['super_admin', 'admin'].includes(profile.role)) {
      loadTeams();
      loadUsers();
    }
  }, [profile]);

  const orgUserIds = async (): Promise<Set<string>> => {
    let query = applyOrgUserScope(
      supabase.from('user_profiles').select('id').eq('is_active', true),
      profile,
    );
    const { data } = await query;
    return new Set((data || []).map((u) => u.id));
  };

  const loadTeams = async () => {
    try {
      setLoading(true);
      const activeUserIds = await orgUserIds();

      let teamsQuery = supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (profile?.organization_id && !profile.is_platform_owner) {
        const ids = [...activeUserIds];
        if (ids.length === 0) {
          setTeams([]);
          setLoading(false);
          return;
        }
        teamsQuery = teamsQuery.in('created_by', ids);
      }

      const { data: teamsData, error } = await teamsQuery;

      if (error) throw error;

      const teamsWithCounts = await Promise.all((teamsData || []).map(async (team) => {
        const { data: members } = await supabase
          .from('team_members')
          .select('id, user_id')
          .eq('team_id', team.id);

        const activeCount = (members || []).filter((m) => activeUserIds.has(m.user_id)).length;
        return { ...team, member_count: activeCount };
      }));

      setTeams(teamsWithCounts);
    } catch (error) {
      console.error('Error loading teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await applyOrgUserScope(
        supabase.from('user_profiles').select('id, full_name, email').eq('is_active', true).order('full_name'),
        profile,
      );

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          user:user_profiles(full_name, email, is_active)
        `)
        .eq('team_id', teamId);

      if (error) throw error;

      const members = (data || [])
        .map((member: TeamMember & { user: TeamMember['user'] | TeamMember['user'][] }) => ({
          ...member,
          user: Array.isArray(member.user) ? member.user[0] : member.user,
        }))
        .filter((member) => member.user?.is_active !== false);

      const staleIds = (data || [])
        .filter((member: { id: string; user: TeamMember['user'] | TeamMember['user'][] | null }) => {
          const user = Array.isArray(member.user) ? member.user[0] : member.user;
          return !user || user.is_active === false;
        })
        .map((member: { id: string }) => member.id);

      if (staleIds.length > 0) {
        await supabase.from('team_members').delete().in('id', staleIds);
      }

      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers([]);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeam.name.trim()) {
      alert('Please provide a team name');
      return;
    }

    try {
      const { error } = await supabase.from('teams').insert({
        name: newTeam.name,
        description: newTeam.description,
        created_by: profile?.id,
      });

      if (error) throw error;

      setShowCreateModal(false);
      setNewTeam({ name: '', description: '' });
      loadTeams();
    } catch (error: any) {
      console.error('Error creating team:', error);
      alert('Failed to create team: ' + error.message);
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team? All team members will be removed.')) return;

    try {
      const { error } = await supabase.from('teams').delete().eq('id', teamId);

      if (error) throw error;
      loadTeams();
    } catch (error) {
      console.error('Error deleting team:', error);
      alert('Failed to delete team');
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeam || !selectedUserId) return;

    try {
      const { error } = await supabase.from('team_members').insert({
        team_id: selectedTeam.id,
        user_id: selectedUserId,
        role: 'member',
      });

      if (error) {
        if (error.code === '23505') {
          alert('User is already a member of this team');
        } else {
          throw error;
        }
        return;
      }

      setSelectedUserId('');
      loadTeamMembers(selectedTeam.id);
      loadTeams();
    } catch (error: any) {
      console.error('Error adding member:', error);
      alert('Failed to add member: ' + error.message);
    }
  };

  const handleBulkFile = async (file: File) => {
    try {
      setBulkLoading(true);
      const emails = await parseBulkEmailFile(file);
      if (!emails.length) {
        alert('No valid email addresses were found in that file.');
        setBulkPreview(null);
        return;
      }

      const availableByEmail = new Map(
        availableUsers
          .filter((user) => user.email)
          .map((user) => [normalizeEmail(user.email), user] as const),
      );

      const matchedUsers: User[] = [];
      const missingEmails: string[] = [];

      emails.forEach((email) => {
        const match = availableByEmail.get(email);
        if (match) matchedUsers.push(match);
        else missingEmails.push(email);
      });

      setBulkPreview({ emails, matchedUsers, missingEmails });
    } catch (error: any) {
      console.error('Error parsing bulk upload:', error);
      alert(`Failed to read file: ${error.message || 'Unknown error'}`);
      setBulkPreview(null);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkAddMembers = async () => {
    if (!selectedTeam || !bulkPreview?.matchedUsers.length) return;

    try {
      setBulkAdding(true);
      const rows = bulkPreview.matchedUsers.map((user) => ({
        team_id: selectedTeam.id,
        user_id: user.id,
        role: 'member',
      }));

      const { error } = await supabase.from('team_members').insert(rows);
      if (error) throw error;

      setBulkPreview(null);
      await loadTeamMembers(selectedTeam.id);
      await loadTeams();
    } catch (error: any) {
      console.error('Error bulk adding team members:', error);
      alert('Failed to add bulk members: ' + error.message);
    } finally {
      setBulkAdding(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeam || !confirm('Remove this member from the team?')) return;

    try {
      const { error } = await supabase.from('team_members').delete().eq('id', memberId);

      if (error) throw error;

      loadTeamMembers(selectedTeam.id);
      loadTeams();
    } catch (error) {
      console.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const openMembersModal = (team: Team) => {
    setSelectedTeam(team);
    setTeamMembers([]);
    setSelectedUserId('');
    setBulkPreview(null);
    setShowMembersModal(true);
    loadTeamMembers(team.id);
  };

  const availableUsers = users.filter(
    (user) => !teamMembers.some((member) => member.user_id === user.id),
  );

  if (!profile || !['super_admin', 'admin'].includes(profile.role)) {
    return (
      <Layout>
        <div style={{ textAlign: 'center', padding: '48px 20px', color: '#666666' }}>
          Access denied. Admin privileges required.
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ maxWidth: 960, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Admin</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717', marginBottom: 4 }}>Team Management</h1>
            <p style={{ fontSize: 14, color: '#4d4d4d' }}>Create and manage teams</p>
          </div>
          <button onClick={() => setShowCreateModal(true)} className="lt-btn-primary"
            style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
            <Plus size={14} /> Create Team
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, gap: 12 }}>
            <div className="lt-spinner" />
            <span style={{ color: '#666666', fontSize: 14 }}>Loading teams...</span>
          </div>
        ) : teams.length === 0 ? (
          <div className="lt-card" style={{ padding: 48, textAlign: 'center' }}>
            <Users size={32} color="#bbb" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: 15, fontWeight: 600, color: '#171717', marginBottom: 6 }}>No teams yet</h3>
            <p style={{ fontSize: 13, color: '#666666', marginBottom: 16 }}>Create your first team to get started</p>
            <button onClick={() => setShowCreateModal(true)} className="lt-btn-primary"
              style={{ padding: '9px 16px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: 8 }}>
              <Plus size={13} /> Create First Team
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <div key={team.id} className="lt-card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ width: 36, height: 36, background: '#f5f5f5', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                    <Users size={16} color="#666666" />
                  </div>
                  <button onClick={() => handleDeleteTeam(team.id)} style={{ padding: 4, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', borderRadius: 6, transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fff5f5')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  ><Trash2 size={14} /></button>
                </div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: '#171717', marginBottom: 4 }}>{team.name}</h3>
                {team.description && <p style={{ fontSize: 12, color: '#666666', marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{team.description}</p>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid #f0f0f0' }}>
                  <span style={{ fontSize: 12, color: '#808080' }}>{team.member_count} {team.member_count === 1 ? 'member' : 'members'}</span>
                  <button onClick={() => openMembersModal(team)} style={{ fontSize: 12, color: '#171717', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                    Manage Members
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <AppModal open={showCreateModal} onClose={() => setShowCreateModal(false)} maxWidth={440}>
            <div className="lt-card" style={{ maxWidth: 440, width: '100%' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#171717' }}>Create Team</h3>
                <button onClick={() => setShowCreateModal(false)} style={{ padding: 4, color: '#808080', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Team Name *</label>
                  <input type="text" value={newTeam.name} onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                    className="lt-input" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }} placeholder="Enter team name" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666666', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Description</label>
                  <textarea value={newTeam.description} onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })} rows={3}
                    className="lt-input" style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box', resize: 'vertical' }} placeholder="Team description..." />
                </div>
              </div>
              <div style={{ padding: '16px 24px', borderTop: '1px solid #ebebeb', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCreateModal(false)} className="lt-btn-secondary" style={{ padding: '9px 16px' }}>Cancel</button>
                <button onClick={handleCreateTeam} className="lt-btn-primary" style={{ padding: '9px 16px' }}>Create Team</button>
              </div>
            </div>
        </AppModal>

        {selectedTeam && (
        <AppModal open={showMembersModal} onClose={() => setShowMembersModal(false)} maxWidth={560}>
            <div className="lt-card" style={{ maxWidth: 560, width: '100%', maxHeight: '88vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '20px 24px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: '#171717' }}>{selectedTeam.name} Members</h3>
                <button onClick={() => setShowMembersModal(false)} style={{ padding: 4, color: '#808080', background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} /></button>
              </div>
              <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
                <div style={{ marginBottom: 20, background: '#fafafa', borderRadius: 8, padding: 14, boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Add Member</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}
                      className="lt-input" style={{ flex: 1, padding: '8px 10px' }}>
                      <option value="">Select a user...</option>
                      {availableUsers.map((user) => (
                        <option key={user.id} value={user.id}>{user.full_name} ({user.email})</option>
                      ))}
                    </select>
                    <button onClick={handleAddMember} disabled={!selectedUserId} className="lt-btn-primary"
                      style={{ padding: '8px 14px' }}>Add</button>
                  </div>
                </div>
                <div style={{ marginBottom: 20, background: '#fafafa', borderRadius: 8, padding: 14, boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666666', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Bulk Upload by Email</label>
                  <p style={{ fontSize: 12, color: '#808080', marginBottom: 10 }}>
                    Upload a CSV or Excel `.xlsx` file with an `email` column. Matching existing users in this organisation will be added to the team.
                  </p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label className="lt-btn-secondary" style={{ padding: '8px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <Upload size={13} />
                      {bulkLoading ? 'Reading file…' : 'Choose file'}
                      <input
                        type="file"
                        accept=".csv,.txt,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        hidden
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) void handleBulkFile(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                    {bulkPreview && (
                      <button
                        onClick={handleBulkAddMembers}
                        disabled={!bulkPreview.matchedUsers.length || bulkAdding}
                        className="lt-btn-primary"
                        style={{ padding: '8px 14px' }}
                      >
                        {bulkAdding ? 'Adding…' : `Add ${bulkPreview.matchedUsers.length} matched users`}
                      </button>
                    )}
                  </div>
                  {bulkPreview && (
                    <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 }}>
                      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', boxShadow: 'rgba(0,0,0,0.05) 0px 0px 0px 1px' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#171717' }}>{bulkPreview.emails.length}</div>
                        <div style={{ fontSize: 11, color: '#808080' }}>emails found</div>
                      </div>
                      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', boxShadow: 'rgba(0,0,0,0.05) 0px 0px 0px 1px' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: '#16a34a' }}>{bulkPreview.matchedUsers.length}</div>
                        <div style={{ fontSize: 11, color: '#808080' }}>matched users</div>
                      </div>
                      <div style={{ background: '#fff', borderRadius: 8, padding: '10px 12px', boxShadow: 'rgba(0,0,0,0.05) 0px 0px 0px 1px' }}>
                        <div style={{ fontSize: 18, fontWeight: 700, color: bulkPreview.missingEmails.length ? '#d97706' : '#171717' }}>{bulkPreview.missingEmails.length}</div>
                        <div style={{ fontSize: 11, color: '#808080' }}>not found</div>
                      </div>
                    </div>
                  )}
                  {bulkPreview?.missingEmails.length ? (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#a16207', lineHeight: 1.5 }}>
                      Not found: {bulkPreview.missingEmails.slice(0, 8).join(', ')}
                      {bulkPreview.missingEmails.length > 8 ? ` +${bulkPreview.missingEmails.length - 8} more` : ''}
                    </div>
                  ) : null}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {teamMembers.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#808080', padding: '24px 0', fontSize: 13 }}>No members yet</p>
                  ) : teamMembers.map((member) => (
                    <div key={member.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#fafafa', borderRadius: 8, boxShadow: 'rgba(0,0,0,0.05) 0px 0px 0px 1px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, background: '#171717', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: 12 }}>
                          {member.user?.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#171717' }}>{member.user?.full_name}</p>
                          <p style={{ fontSize: 11, color: '#808080' }}>{member.user?.email}</p>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="lt-badge">{member.role}</span>
                        <button onClick={() => handleRemoveMember(member.id)} style={{ padding: 5, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer' }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </AppModal>
        )}
      </div>
    </Layout>
  );
}
