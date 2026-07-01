import { useLocation, Link } from 'react-router-dom';
import { CheckCircle, XCircle } from 'lucide-react';

export function AssessmentResult() {
  const location = useLocation();
  const result = location.state as { percentage?: number; passed?: boolean } | null;

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="lt-card" style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
        {result?.passed ? (
          <CheckCircle size={48} color="#16a34a" style={{ margin: '0 auto 16px' }} />
        ) : (
          <XCircle size={48} color="#c0392b" style={{ margin: '0 auto 16px' }} />
        )}
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
          {result?.passed ? 'Passed' : 'Submitted'}
        </h1>
        <p style={{ fontSize: 32, fontWeight: 700, color: '#171717', marginBottom: 8 }}>{result?.percentage ?? 0}%</p>
        <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>Your assessment has been submitted and scored.</p>
        <Link to="/test" className="lt-btn-primary" style={{ padding: '10px 20px', textDecoration: 'none', fontSize: 14 }}>
          Back to Test dashboard
        </Link>
      </div>
    </div>
  );
}
