import { useState, useEffect } from 'react';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, Plus, Trash2, X } from 'lucide-react';

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
  };
}

interface User {
  id: string;
  full_name: string;
  email: string;
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

  useEffect(() => {
    if (profile && ['super_admin', 'admin'].includes(profile.role)) {
      loadTeams();
      loadUsers();
    }
  }, [profile]);

  const loadTeams = async () => {
    try {
      setLoading(true);
      const { data: teamsData, error } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const teamsWithCounts = await Promise.all((teamsData || []).map(async (team) => {
        const { count } = await supabase
          .from('team_members')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', team.id);

        return { ...team, member_count: count || 0 };
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
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, email')
        .order('full_name');

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
          user:user_profiles(full_name, email)
        `)
        .eq('team_id', teamId);

      if (error) throw error;

      const members = (data || []).map((member: any) => ({
        ...member,
        user: Array.isArray(member.user) ? member.user[0] : member.user,
      }));

      setTeamMembers(members);
    } catch (error) {
      console.error('Error loading team members:', error);
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
    loadTeamMembers(team.id);
    setShowMembersModal(true);
  };

  if (profile?.role !== 'admin') {
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

        {showCreateModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
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
          </div>
        )}

        {showMembersModal && selectedTeam && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
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
                      {users.map((user) => <option key={user.id} value={user.id}>{user.full_name} ({user.email})</option>)}
                    </select>
                    <button onClick={handleAddMember} disabled={!selectedUserId} className="lt-btn-primary"
                      style={{ padding: '8px 14px' }}>Add</button>
                  </div>
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
          </div>
        )}
      </div>
    </Layout>
  );
}
