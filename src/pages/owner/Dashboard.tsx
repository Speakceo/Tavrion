import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Layout } from '../../components/Layout';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Users, BookOpen, Plus, ExternalLink, ToggleRight, BarChart3, Mail, Check, AlertTriangle } from 'lucide-react';
import { Organization } from '../../types';

interface OrgWithStats extends Organization {
  userCount: number;
}

export function OwnerDashboard() {
  const { profile } = useAuth();
  const [orgs, setOrgs] = useState<OrgWithStats[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalCourses, setTotalCourses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [resendConfigured, setResendConfigured] = useState<boolean | null>(null);
  const [resendFromEmail, setResendFromEmail] = useState('Tavrion Learning <noreply@jointavrion.com>');
  const [resendApiKey, setResendApiKey] = useState('');
  const [resendSaving, setResendSaving] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [resendError, setResendError] = useState('');

  useEffect(() => {
    fetchData();
    fetchResendStatus();
  }, []);

  const fetchResendStatus = async () => {
    const { data } = await supabase.functions.invoke('send-email-nudge', { method: 'GET' });
    if (data) {
      setResendConfigured(Boolean(data.configured));
      if (data.fromEmail) setResendFromEmail(data.fromEmail);
    }
  };

  const saveResendSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setResendSaving(true);
    setResendMessage('');
    setResendError('');

    try {
      if (resendApiKey.trim()) {
        const { data, error } = await supabase.functions.invoke('save-platform-secret', {
          body: {
            actorUniqueId: profile?.unique_id,
            key: 'RESEND_API_KEY',
            value: resendApiKey.trim(),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        if (data?.warning) setResendError(data.warning);
      }

      if (resendFromEmail.trim()) {
        const { data, error } = await supabase.functions.invoke('save-platform-secret', {
          body: {
            actorUniqueId: profile?.unique_id,
            key: 'RESEND_FROM_EMAIL',
            value: resendFromEmail.trim(),
          },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      }

      setResendMessage('Email settings saved. Resend connection verified.');
      setResendApiKey('');
      await fetchResendStatus();
    } catch (err: any) {
      setResendError(err.message || 'Failed to save email settings');
    } finally {
      setResendSaving(false);
    }
  };

  const fetchData = async () => {
    try {
      const [{ data: orgsData }, { count: uc }, { count: cc }] = await Promise.all([
        supabase.from('organizations').select('*').order('created_at', { ascending: true }),
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('courses').select('id', { count: 'exact', head: true }),
      ]);

      setTotalUsers(uc || 0);
      setTotalCourses(cc || 0);

      if (orgsData) {
        const orgsWithCounts = await Promise.all(
          orgsData.map(async (org) => {
            const { count } = await supabase
              .from('user_profiles')
              .select('id', { count: 'exact', head: true })
              .eq('organization_id', org.id);
            return { ...org, userCount: count || 0 };
          })
        );
        setOrgs(orgsWithCounts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Owner Portal</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: '#171717', marginBottom: 4 }}>Platform Overview</h1>
            <p style={{ fontSize: 14, color: '#4d4d4d' }}>Manage all organizations and platform settings</p>
          </div>
          <Link to="/owner/organizations/new" className="lt-btn-primary"
            style={{ padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 6, borderRadius: 8, textDecoration: 'none' }}>
            <Plus size={14} /> New Organization
          </Link>
        </div>

        {/* Quick actions for master admin */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4" style={{ marginBottom: 28 }}>
          {[
            { label: 'New Organization', href: '/owner/organizations/new', Icon: Plus },
            { label: 'Manage Courses', href: '/admin/courses', Icon: BookOpen },
            { label: 'Manage Users', href: '/admin/users', Icon: Users },
            { label: 'Analytics', href: '/admin/analytics', Icon: BarChart3 },
          ].map(({ label, href, Icon }) => (
            <Link key={label} to={href} className="lt-card" style={{ padding: '16px 18px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color="#4d4d4d" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#171717' }}>{label}</span>
            </Link>
          ))}
        </div>

        {/* Platform stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6" style={{ marginBottom: 28 }}>
          {[
            { label: 'Organizations', value: orgs.length, Icon: Building2 },
            { label: 'Total Users', value: totalUsers, Icon: Users },
            { label: 'Total Courses', value: totalCourses, Icon: BookOpen },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="lt-card" style={{ padding: '18px 20px' }}>
              <div style={{ width: 32, height: 32, background: '#f5f5f5', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                <Icon size={14} color="#808080" />
              </div>
              <div className="lt-stat-num">{value}</div>
              <div style={{ fontSize: 12, color: '#666666', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>

        <div className="lt-card" style={{ padding: '20px 24px', marginBottom: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <Mail size={14} color="#4d4d4d" />
            <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>Email Settings (Resend)</h2>
            {resendConfigured === true && (
              <span className="lt-badge lt-badge-success" style={{ fontSize: 10 }}>Connected</span>
            )}
            {resendConfigured === false && (
              <span className="lt-badge lt-badge-error" style={{ fontSize: 10 }}>Not configured</span>
            )}
          </div>
          <p style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
            Email nudges use <a href="https://resend.com" target="_blank" rel="noreferrer" style={{ color: '#171717', fontWeight: 600 }}>Resend</a>.
            Create an API key, verify <strong>jointavrion.com</strong>, then paste the key below.
          </p>
          <form onSubmit={saveResendSettings} style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>Resend API key</label>
              <input
                type="password"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="re_..."
                className="lt-input"
                style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#666', marginBottom: 6, textTransform: 'uppercase' }}>From address</label>
              <input
                type="text"
                value={resendFromEmail}
                onChange={(e) => setResendFromEmail(e.target.value)}
                placeholder="Tavrion Learning <noreply@jointavrion.com>"
                className="lt-input"
                style={{ width: '100%', padding: '9px 12px', boxSizing: 'border-box' }}
              />
            </div>
            {resendMessage && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1a7f1a' }}>
                <Check size={14} /> {resendMessage}
              </div>
            )}
            {resendError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#c0392b' }}>
                <AlertTriangle size={14} /> {resendError}
              </div>
            )}
            <button type="submit" disabled={resendSaving} className="lt-btn-primary" style={{ width: 'fit-content', padding: '9px 16px' }}>
              {resendSaving ? 'Saving...' : 'Save & test connection'}
            </button>
          </form>
        </div>

        {/* Org list */}
        <div className="lt-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #ebebeb', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Building2 size={14} color="#4d4d4d" />
              <h2 style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>Organizations</h2>
            </div>
            <span style={{ fontSize: 12, color: '#808080' }}>{orgs.length} org{orgs.length !== 1 ? 's' : ''}</span>
          </div>

          {orgs.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', color: '#808080', fontSize: 14 }}>
              No organizations yet.{' '}
              <Link to="/owner/organizations/new" style={{ color: '#171717', fontWeight: 600, textDecoration: 'none' }}>Create one →</Link>
            </div>
          ) : (
            orgs.map((org, i) => {
              const enabledFeatureCount = Object.values(org.features || {}).filter(Boolean).length;
              const emailDomain = (org.settings as any)?.email_domain;
              return (
                <div key={org.id} style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', borderBottom: i < orgs.length - 1 ? '1px solid #f5f5f5' : 'none', gap: 16 }}>
                  {/* Org icon */}
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: 'rgba(0,0,0,0.06) 0px 0px 0px 1px' }}>
                    <Building2 size={16} color="#4d4d4d" />
                  </div>

                  {/* Org info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#171717' }}>{org.name}</span>
                      <span className={`lt-badge ${org.is_active ? 'lt-badge-success' : 'lt-badge-error'}`} style={{ fontSize: 10 }}>
                        {org.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12, color: '#808080', flexWrap: 'wrap' }}>
                      <span>/{org.slug}</span>
                      {emailDomain && <span>@{emailDomain}</span>}
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={11} /> {org.userCount} user{org.userCount !== 1 ? 's' : ''}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ToggleRight size={11} /> {enabledFeatureCount} feature{enabledFeatureCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <Link
                      to={`/owner/organizations/${org.id}?tab=users`}
                      style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#4d4d4d', textDecoration: 'none', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px', background: '#fff', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <Users size={11} /> Users
                    </Link>
                    <Link
                      to={`/owner/organizations/${org.id}`}
                      style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 5, borderRadius: 7, fontSize: 12, fontWeight: 600, color: '#4d4d4d', textDecoration: 'none', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px', background: '#fff', transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                      onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                    >
                      <ExternalLink size={11} /> Manage
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </Layout>
  );
}
