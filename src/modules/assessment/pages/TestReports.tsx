import { useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { orgIdForInsert } from '../../../utils/orgScope';
import { Download, FileText, Shield } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'assessment', label: 'Assessment report', icon: FileText },
  { id: 'candidate', label: 'Candidate report', icon: FileText },
  { id: 'integrity', label: 'Integrity report', icon: Shield },
  { id: 'skill', label: 'Skill gap report', icon: FileText },
];

export function TestReports() {
  const { profile } = useAuth();
  const [generating, setGenerating] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const generateReport = async (type: string) => {
    if (!profile) return;
    const orgId = orgIdForInsert(profile);
    if (!orgId) return;

    setGenerating(type);
    setMessage('');
    try {
      const { error } = await supabase.from('assessment_reports').insert({
        organization_id: orgId,
        report_type: type,
        entity_id: orgId,
        title: `${type.replace('_', ' ')} — ${new Date().toLocaleDateString()}`,
        data: { generated_at: new Date().toISOString(), format: 'json' },
        generated_by: profile.id,
      });
      if (error) throw error;
      setMessage(`${type} report saved. Export PDF/Excel/CSV available when connected to report service.`);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  return (
    <TestLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Reports</h1>
        <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Generate and export assessment, candidate, and integrity reports.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
        {REPORT_TYPES.map((r) => (
          <div key={r.id} className="lt-card" style={{ padding: 20 }}>
            <r.icon size={20} color="#171717" />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>{r.label}</div>
            <p style={{ fontSize: 12, color: '#999', marginTop: 6, marginBottom: 14 }}>Organization-scoped summary</p>
            <button
              onClick={() => generateReport(r.id)}
              disabled={generating === r.id}
              className="lt-btn-primary"
              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Download size={12} /> {generating === r.id ? 'Generating...' : 'Generate'}
            </button>
          </div>
        ))}
      </div>

      {message && (
        <div className="lt-card" style={{ padding: 16, marginTop: 16, fontSize: 13, color: '#666' }}>{message}</div>
      )}
    </TestLayout>
  );
}
