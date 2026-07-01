import { useState } from 'react';

const DEFAULT_FIELDS = [
  { key: 'phone', label: 'Contact number', type: 'tel', required: true },
  { key: 'experience_years', label: 'Total experience (years)', type: 'number', required: true },
  { key: 'current_ctc', label: 'Current CTC (LPA)', type: 'number', required: true },
  { key: 'expected_ctc', label: 'Expected CTC (LPA)', type: 'number', required: true },
  { key: 'joining_timeline', label: 'Joining timeline', type: 'select', options: ['Immediate', '15 days', '30 days', '60+ days'], required: true },
  { key: 'has_laptop', label: 'Do you have a personal laptop?', type: 'boolean', required: true },
];

type Props = {
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  loading?: boolean;
};

export function PostAssessmentForm({ onSubmit, loading }: Props) {
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    for (const f of DEFAULT_FIELDS) {
      if (f.required && (form[f.key] === undefined || form[f.key] === '')) {
        setError(`Please fill in: ${f.label}`);
        return;
      }
    }
    await onSubmit(form);
  };

  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Almost done!</h2>
      <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>Please share a few details to complete your application.</p>
      <form onSubmit={handleSubmit} className="lt-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {DEFAULT_FIELDS.map((f) => (
          <label key={f.key} style={{ fontSize: 12, fontWeight: 600 }}>
            {f.label}
            {f.type === 'select' ? (
              <select
                className="lt-input"
                style={{ marginTop: 4 }}
                value={String(form[f.key] ?? '')}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              >
                <option value="">Select...</option>
                {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : f.type === 'boolean' ? (
              <select
                className="lt-input"
                style={{ marginTop: 4 }}
                value={form[f.key] === undefined ? '' : form[f.key] ? 'yes' : 'no'}
                onChange={(e) => setForm({ ...form, [f.key]: e.target.value === 'yes' })}
              >
                <option value="">Select...</option>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            ) : (
              <input
                type={f.type}
                className="lt-input"
                style={{ marginTop: 4 }}
                value={String(form[f.key] ?? '')}
                onChange={(e) => setForm({ ...form, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value })}
              />
            )}
          </label>
        ))}
        {error && <p style={{ color: '#c0392b', fontSize: 13 }}>{error}</p>}
        <button type="submit" disabled={loading} className="lt-btn-primary" style={{ padding: '10px 18px', marginTop: 8 }}>
          {loading ? 'Submitting...' : 'Submit & finish'}
        </button>
      </form>
    </div>
  );
}
