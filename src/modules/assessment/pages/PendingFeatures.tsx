import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { TestLayout } from '../components/TestLayout';
import {
  PENDING_FEATURES,
  FEATURE_STATUS_LABEL,
  FEATURE_STATUS_COLOR,
  pendingFeatureStats,
  type FeatureStatus,
} from '../constants/pendingFeatures';
import { FEATURE_ROUTES } from '../constants/featureRoutes';
import { CheckCircle2, Layers, Zap, ExternalLink } from 'lucide-react';

const CATEGORIES = [...new Set(PENDING_FEATURES.map((f) => f.category))].sort();

export function PendingFeatures() {
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('');
  const stats = pendingFeatureStats();

  const filtered = useMemo(() => {
    return PENDING_FEATURES.filter((f) => {
      if (category && f.category !== category) return false;
      if (priority && f.priority !== priority) return false;
      return true;
    });
  }, [category, priority]);

  const byCategory = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((f) => {
      const list = map.get(f.category) || [];
      list.push(f);
      map.set(f.category, list);
    });
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <TestLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>Feature catalog</h1>
        <p style={{ fontSize: 14, color: '#666' }}>
          All {stats.total} Tavrion Test capabilities are production-ready. Use the links below to open each feature.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total features', value: stats.total, icon: Layers },
          { label: 'Live & ready', value: stats.live, icon: CheckCircle2 },
          { label: 'High priority', value: stats.high, icon: Zap },
        ].map((c) => (
          <div key={c.label} className="lt-card" style={{ padding: 14 }}>
            <c.icon size={16} color="#16a34a" />
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="lt-card" style={{ padding: 16, marginBottom: 20, background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>Quick access</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            { label: 'Platform settings', href: '/test/platform' },
            { label: 'Manual grading', href: '/test/grading' },
            { label: 'Sessions', href: '/test/sessions' },
            { label: 'Analytics', href: '/test/analytics' },
            { label: 'Reports', href: '/test/reports' },
            { label: 'Assignments', href: '/test/assignments' },
            { label: 'Templates', href: '/test/templates' },
          ].map((item) => (
            <Link
              key={item.href}
              to={item.href}
              style={{
                fontSize: 11, padding: '5px 10px', borderRadius: 999,
                background: '#fff', color: '#166534', border: '1px solid #bbf7d0',
                textDecoration: 'none', fontWeight: 600,
              }}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="lt-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 160 }}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="lt-input" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: 130 }}>
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span style={{ fontSize: 12, color: '#999' }}>{filtered.length} features</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {byCategory.map(([cat, items]) => (
          <div key={cat}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#171717', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {cat}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((f) => {
                const route = FEATURE_ROUTES[f.id];
                return (
                  <div key={f.id} className="lt-card" style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#171717' }}>{f.title}</div>
                        <p style={{ fontSize: 12, color: '#666', marginTop: 6, lineHeight: 1.55 }}>{f.description}</p>
                        {route && (
                          <Link to={route} style={{ fontSize: 11, color: '#2563eb', fontWeight: 600, marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                            Open <ExternalLink size={11} />
                          </Link>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                          color: FEATURE_STATUS_COLOR[f.status as FeatureStatus], background: '#f0fdf4',
                        }}>
                          {FEATURE_STATUS_LABEL[f.status as FeatureStatus]}
                        </span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                          color: f.priority === 'high' ? '#c0392b' : f.priority === 'medium' ? '#d97706' : '#808080',
                          background: '#fafafa', border: '1px solid #eee',
                        }}>
                          {f.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </TestLayout>
  );
}
