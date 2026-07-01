import { useLocation, Link } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

export function AssessmentResult() {
  const location = useLocation();
  const result = location.state as { percentage?: number; passed?: boolean; showScore?: boolean } | null;
  const showScore = result?.showScore === true;

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="lt-card" style={{ padding: 40, textAlign: 'center', maxWidth: 400 }}>
        <CheckCircle size={48} color="#16a34a" style={{ margin: '0 auto 16px' }} />
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>Submitted</h1>
        {showScore && result?.percentage != null ? (
          <>
            <p style={{ fontSize: 32, fontWeight: 700, color: '#171717', marginBottom: 8 }}>{result.percentage}%</p>
            <p style={{ fontSize: 14, color: '#666', marginBottom: 24 }}>
              {result.passed ? 'You passed this assessment.' : 'Your attempt has been recorded.'}
            </p>
          </>
        ) : (
          <p style={{ fontSize: 14, color: '#666', marginBottom: 24, lineHeight: 1.6 }}>
            Your assessment has been submitted. Results will be shared by your administrator after review.
          </p>
        )}
        <Link to="/test" className="lt-btn-primary" style={{ padding: '10px 20px', textDecoration: 'none', fontSize: 14 }}>
          Back to Test dashboard
        </Link>
      </div>
    </div>
  );
}
