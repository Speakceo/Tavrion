import { useMemo, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import {
  PENDING_FEATURES,
  FEATURE_STATUS_LABEL,
  FEATURE_STATUS_COLOR,
  pendingFeatureStats,
  type FeatureStatus,
} from '../constants/pendingFeatures';
import { CheckCircle2, Circle, Clock, Layers, Filter } from 'lucide-react';

const CATEGORIES = [...new Set(PENDING_FEATURES.map((f) => f.category))].sort();

export function PendingFeatures() {
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState<FeatureStatus | ''>('');
  const [priority, setPriority] = useState('');
  const stats = pendingFeatureStats();

  const filtered = useMemo(() => {
    return PENDING_FEATURES.filter((f) => {
      if (category && f.category !== category) return false;
      if (status && f.status !== status) return false;
      if (priority && f.priority !== priority) return false;
      return true;
    });
  }, [category, status, priority]);

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
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>Roadmap & pending features</h1>
        <p style={{ fontSize: 14, color: '#666' }}>
          What ships today vs what is planned for Tavrion Test. Live modules are production-ready; items below are queued.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Pending items', value: stats.total, icon: Layers },
          { label: 'High priority', value: stats.high, icon: Clock },
          { label: 'In progress', value: stats.inProgress, icon: Circle },
          { label: 'Stubs (wire up)', value: stats.stubs, icon: CheckCircle2 },
        ].map((c) => (
          <div key={c.label} className="lt-card" style={{ padding: 14 }}>
            <c.icon size={16} color="#171717" />
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 8 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: '#999' }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div className="lt-card" style={{ padding: 16, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <CheckCircle2 size={16} color="#16a34a" />
          <span style={{ fontSize: 13, fontWeight: 700 }}>Live today</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[
            'Assessment library & builder',
            'Question bank (15+ types)',
            'Public candidate links',
            'Sessions & selection pipeline',
            'Proctoring & integrity log',
            'MCQ / writing / audio / video',
            'Post-assessment form',
            'Analytics & reports (basic)',
            'Role templates (7 roles)',
          ].map((item) => (
            <span
              key={item}
              style={{
                fontSize: 11, padding: '5px 10px', borderRadius: 999,
                background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0',
              }}
            >
              {item}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Filter size={14} color="#999" />
        <select className="lt-input" value={category} onChange={(e) => setCategory(e.target.value)} style={{ width: 160 }}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="lt-input" value={status} onChange={(e) => setStatus(e.target.value as FeatureStatus | '')} style={{ width: 140 }}>
          <option value="">All statuses</option>
          <option value="planned">Planned</option>
          <option value="in_progress">In progress</option>
          <option value="stub">Stub built</option>
        </select>
        <select className="lt-input" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ width: 130 }}>
          <option value="">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <span style={{ fontSize: 12, color: '#999' }}>{filtered.length} items</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {byCategory.map(([cat, items]) => (
          <div key={cat}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: '#171717', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {cat}
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((f) => (
                <div key={f.id} className="lt-card" style={{ padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#171717' }}>{f.title}</div>
                      <p style={{ fontSize: 12, color: '#666', marginTop: 6, lineHeight: 1.55 }}>{f.description}</p>
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                        color: FEATURE_STATUS_COLOR[f.status], background: '#f5f5f5',
                      }}>
                        {FEATURE_STATUS_LABEL[f.status]}
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
              ))}
            </div>
          </div>
        ))}
      </div>
    </TestLayout>
  );
}
