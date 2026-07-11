import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { applyOrgScope } from '../utils/orgScope';
import { CheckCircle, Clock, Eye, FileText, ShieldCheck } from 'lucide-react';

interface PendingPolicy {
  policyId: string;
  title: string;
  description: string | null;
  category: string;
  versionId: string;
  versionNumber: number;
  versionNotes: string | null;
  changelog: string | null;
  filePath: string;
  fileName: string;
  effectiveDate: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
}

const T = {
  text: '#171717', body: '#4d4d4d', muted: '#666', faint: '#999',
  border: '#ebebeb', bg: '#fff', section: '#f5f5f5',
  green: '#16a34a', amber: '#d97706', blue: '#0a72ef',
};

export function Policies() {
  const { profile } = useAuth();
  const [items, setItems] = useState<PendingPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [ackingId, setAckingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  useEffect(() => {
    if (profile) void loadPolicies();
  }, [profile]);

  async function loadPolicies() {
    if (!profile?.organization_id || !profile.id) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const [policiesRes, versionsRes, acksRes] = await Promise.all([
      applyOrgScope(
        supabase.from('org_policies').select('id, title, description, category, current_version_number, is_active').eq('is_active', true),
        profile,
      ),
      applyOrgScope(
        supabase.from('org_policy_versions').select('*').eq('requires_acknowledgment', true).order('version_number', { ascending: false }),
        profile,
      ),
      supabase
        .from('org_policy_acknowledgments')
        .select('policy_version_id, acknowledged_at')
        .eq('user_id', profile.id),
    ]);

    const policies = policiesRes.data || [];
    const versions = versionsRes.data || [];
    const ackMap = new Map((acksRes.data || []).map((a) => [a.policy_version_id, a.acknowledged_at]));

    const latestByPolicy = new Map<string, typeof versions[number]>();
    for (const version of versions) {
      if (!latestByPolicy.has(version.policy_id)) {
        latestByPolicy.set(version.policy_id, version);
      }
    }

    const rows: PendingPolicy[] = policies.flatMap((policy) => {
      const latest = latestByPolicy.get(policy.id);
      if (!latest) return [];
      const acknowledgedAt = ackMap.get(latest.id);
      return [{
        policyId: policy.id,
        title: policy.title,
        description: policy.description,
        category: policy.category,
        versionId: latest.id,
        versionNumber: latest.version_number,
        versionNotes: latest.version_notes,
        changelog: latest.changelog,
        filePath: latest.file_path,
        fileName: latest.file_name,
        effectiveDate: latest.effective_date,
        acknowledged: Boolean(acknowledgedAt),
        acknowledgedAt: acknowledgedAt || undefined,
      }];
    });

    setItems(rows);
    setLoading(false);
  }

  async function openFile(path: string) {
    const { data, error } = await supabase.storage.from('course-files').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) {
      alert(error?.message || 'Could not open policy document');
      return;
    }
    window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  }

  async function acknowledge(item: PendingPolicy) {
    if (!profile?.id || !profile.organization_id) return;
    setAckingId(item.versionId);
    try {
      const { error } = await supabase.from('org_policy_acknowledgments').upsert({
        policy_id: item.policyId,
        policy_version_id: item.versionId,
        organization_id: profile.organization_id,
        user_id: profile.id,
        acknowledged_at: new Date().toISOString(),
      }, { onConflict: 'policy_version_id,user_id' });
      if (error) throw error;
      await loadPolicies();
    } catch (error: any) {
      alert(error.message || 'Failed to acknowledge policy');
    } finally {
      setAckingId(null);
    }
  }

  const filtered = useMemo(() => {
    if (filter === 'pending') return items.filter((i) => !i.acknowledged);
    if (filter === 'completed') return items.filter((i) => i.acknowledged);
    return items;
  }, [items, filter]);

  const pendingCount = items.filter((i) => !i.acknowledged).length;

  return (
    <Layout>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#808080', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Compliance</p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: T.text, marginBottom: 4 }}>Company Policies</h1>
          <p style={{ fontSize: 14, color: T.body }}>
            Read and acknowledge the latest policy versions from your organisation
            {pendingCount > 0 ? ` · ${pendingCount} pending` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {[
            { value: 'pending', label: 'Pending' },
            { value: 'completed', label: 'Acknowledged' },
            { value: 'all', label: 'All' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as typeof filter)}
              style={{
                padding: '7px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontWeight: filter === tab.value ? 600 : 500, fontSize: 13,
                background: filter === tab.value ? T.text : T.bg,
                color: filter === tab.value ? '#fff' : T.body,
                boxShadow: filter === tab.value ? 'none' : 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: T.muted }}>Loading policies…</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: T.bg, borderRadius: 12, padding: '48px 24px', textAlign: 'center', boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>
            <ShieldCheck size={36} color="#bbb" style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text }}>
              {filter === 'pending' ? 'You are all caught up' : 'No policies found'}
            </p>
            <p style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>
              {filter === 'pending' ? 'No policy acknowledgments are waiting for you.' : 'Your organisation has not published policies yet.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((item) => (
              <div key={item.versionId} style={{ background: T.bg, borderRadius: 12, padding: 20, boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px' }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: T.section, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FileText size={18} color={T.muted} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: T.text }}>{item.title}</h3>
                      <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, background: T.section, padding: '2px 8px', borderRadius: 999 }}>v{item.versionNumber}</span>
                      {item.acknowledged ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: T.green }}>
                          <CheckCircle size={12} /> Acknowledged
                        </span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, color: T.amber }}>
                          <Clock size={12} /> Action required
                        </span>
                      )}
                    </div>
                    {item.description && <p style={{ fontSize: 13, color: T.body, marginBottom: 8 }}>{item.description}</p>}
                    <p style={{ fontSize: 12, color: T.muted, marginBottom: 4 }}>{item.versionNotes}</p>
                    {item.changelog && <p style={{ fontSize: 12, color: T.faint, marginBottom: 12 }}>Changes: {item.changelog}</p>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button
                        onClick={() => void openFile(item.filePath)}
                        className="lt-btn-secondary"
                        style={{ padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                      >
                        <Eye size={13} /> Read document
                      </button>
                      {!item.acknowledged && (
                        <button
                          onClick={() => void acknowledge(item)}
                          disabled={ackingId === item.versionId}
                          className="lt-btn-primary"
                          style={{ padding: '8px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
                        >
                          <CheckCircle size={13} />
                          {ackingId === item.versionId ? 'Saving…' : 'I acknowledge'}
                        </button>
                      )}
                    </div>
                    {item.acknowledgedAt && (
                      <p style={{ fontSize: 11, color: T.faint, marginTop: 10 }}>
                        Acknowledged on {new Date(item.acknowledgedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
