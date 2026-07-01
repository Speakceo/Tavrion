import { useEffect, useState } from 'react';
import { TestLayout } from '../components/TestLayout';
import { useAuth } from '../../../contexts/AuthContext';
import { supabase } from '../../../lib/supabase';
import { orgIdForInsert } from '../../../utils/orgScope';
import { exportReportByType, downloadCsv, downloadExcel } from '../services/exportService';
import { Download, FileText, Shield, FileSpreadsheet } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'assessment' as const, label: 'Assessment report', icon: FileText },
  { id: 'candidate' as const, label: 'Candidate report', icon: FileText },
  { id: 'integrity' as const, label: 'Integrity report', icon: Shield },
  { id: 'skill' as const, label: 'Skill gap report', icon: FileText },
];

type SavedReport = {
  id: string;
  report_type: string;
  title: string;
  created_at: string;
  data: Record<string, unknown>;
};

export function TestReports() {
  const { profile } = useAuth();
  const viewer = profile ? { organization_id: profile.organization_id, is_platform_owner: profile.is_platform_owner, id: profile.id } : null;
  const [generating, setGenerating] = useState<string | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [recentReports, setRecentReports] = useState<SavedReport[]>([]);

  const loadReports = async () => {
    if (!profile) return;
    const orgId = orgIdForInsert(profile);
    if (!orgId) return;
    const { data } = await supabase
      .from('assessment_reports')
      .select('id, report_type, title, created_at, data')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(20);
    setRecentReports((data || []) as SavedReport[]);
  };

  useEffect(() => { loadReports(); }, [profile?.id]);

  const generateReport = async (type: string) => {
    if (!profile) return;
    const orgId = orgIdForInsert(profile);
    if (!orgId) return;

    setGenerating(type);
    setMessage('');
    try {
      const rowCount = await exportReportByType(viewer, type as 'assessment' | 'candidate' | 'integrity' | 'skill', 'csv');
      const { error } = await supabase.from('assessment_reports').insert({
        organization_id: orgId,
        report_type: type,
        entity_id: orgId,
        title: `${type.replace('_', ' ')} — ${new Date().toLocaleDateString()}`,
        data: { generated_at: new Date().toISOString(), format: 'csv', row_count: rowCount },
        generated_by: profile.id,
      });
      if (error) throw error;
      setMessage(`${type} report generated (${rowCount} rows) and saved.`);
      await loadReports();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Failed to generate report');
    } finally {
      setGenerating(null);
    }
  };

  const handleExport = async (type: 'assessment' | 'candidate' | 'integrity' | 'skill', format: 'csv' | 'excel') => {
    setExporting(`${type}-${format}`);
    setMessage('');
    try {
      const count = await exportReportByType(viewer, type, format);
      setMessage(`Exported ${count} rows as ${format.toUpperCase()}.`);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setExporting(null);
    }
  };

  const downloadSavedReport = (report: SavedReport, format: 'csv' | 'excel') => {
    const rows = (report.data?.rows as Record<string, unknown>[]) || [
      { report_type: report.report_type, title: report.title, generated_at: report.created_at },
    ];
    const filename = `${report.report_type}-${report.id.slice(0, 8)}`;
    if (format === 'excel') downloadExcel(filename, rows as Record<string, string | number | boolean | null | undefined>[]);
    else downloadCsv(filename, rows as Record<string, string | number | boolean | null | undefined>[]);
  };

  return (
    <TestLayout>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em' }}>Reports</h1>
        <p style={{ fontSize: 13, color: '#666', marginTop: 4 }}>Generate, export, and download assessment reports.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14, marginBottom: 24 }}>
        {REPORT_TYPES.map((r) => (
          <div key={r.id} className="lt-card" style={{ padding: 20 }}>
            <r.icon size={20} color="#171717" />
            <div style={{ fontSize: 14, fontWeight: 600, marginTop: 12 }}>{r.label}</div>
            <p style={{ fontSize: 12, color: '#999', marginTop: 6, marginBottom: 14 }}>Organization-scoped summary</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                type="button"
                onClick={() => generateReport(r.id)}
                disabled={generating === r.id}
                className="lt-btn-primary"
                style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Download size={12} /> {generating === r.id ? 'Generating...' : 'Generate & save'}
              </button>
              <button
                type="button"
                onClick={() => handleExport(r.id, 'csv')}
                disabled={exporting === `${r.id}-csv`}
                className="lt-btn-secondary"
                style={{ padding: '6px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <FileText size={11} /> CSV
              </button>
              <button
                type="button"
                onClick={() => handleExport(r.id, 'excel')}
                disabled={exporting === `${r.id}-excel`}
                className="lt-btn-secondary"
                style={{ padding: '6px 10px', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}
              >
                <FileSpreadsheet size={11} /> Excel
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="lt-card" style={{ padding: 20 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Recent reports</h2>
        {recentReports.length === 0 ? (
          <p style={{ fontSize: 13, color: '#999' }}>No saved reports yet. Generate one above.</p>
        ) : (
          <table style={{ width: '100%', fontSize: 13, borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0', textAlign: 'left' }}>
                <th style={{ padding: '8px 0', color: '#999' }}>Title</th>
                <th style={{ padding: '8px 0', color: '#999' }}>Type</th>
                <th style={{ padding: '8px 0', color: '#999' }}>Created</th>
                <th style={{ padding: '8px 0', color: '#999' }}>Download</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '10px 0' }}>{r.title}</td>
                  <td style={{ padding: '10px 0', color: '#666' }}>{r.report_type}</td>
                  <td style={{ padding: '10px 0', fontSize: 12, color: '#999' }}>{new Date(r.created_at).toLocaleString()}</td>
                  <td style={{ padding: '10px 0' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => downloadSavedReport(r, 'csv')} className="lt-btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}>CSV</button>
                      <button type="button" onClick={() => downloadSavedReport(r, 'excel')} className="lt-btn-secondary" style={{ padding: '4px 8px', fontSize: 11 }}>Excel</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {message && (
        <div className="lt-card" style={{ padding: 16, marginTop: 16, fontSize: 13, color: '#666' }}>{message}</div>
      )}
    </TestLayout>
  );
}
