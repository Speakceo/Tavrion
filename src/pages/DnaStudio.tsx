import { useState } from 'react';

type AnalysisResult = {
  url: string;
  title: string;
  description: string;
  language: string;
  topHeadings: string[];
  og: {
    title?: string;
    description?: string;
    image?: string;
  };
  detectedColors: string[];
  summary?: string;
};

export function DnaStudio() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dna-studio-analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Analysis failed');
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error while analyzing URL');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f8', padding: '32px 20px' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', background: 'transparent' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, color: '#171717' }}>DNA Studio</h1>
        <p style={{ color: '#666', marginBottom: 20 }}>
          Paste any website URL to extract brand DNA: page intent, tone cues, heading structure, and visual hints.
        </p>

        <form onSubmit={analyze} style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            style={{
              flex: 1,
              border: '1px solid #ddd',
              borderRadius: 10,
              padding: '12px 14px',
              fontSize: 14,
            }}
          />
          <button
            type="submit"
            disabled={loading}
            style={{
              border: 'none',
              borderRadius: 10,
              padding: '12px 16px',
              background: '#171717',
              color: '#fff',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Analyzing...' : 'Analyze URL'}
          </button>
        </form>

        {error && (
          <div style={{ background: '#fff4f4', color: '#b42318', border: '1px solid #fecaca', padding: 12, borderRadius: 8, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {result && (
          <div style={{ display: 'grid', gap: 12 }}>
            <section style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#999' }}>URL</div>
              <div style={{ fontSize: 14, color: '#171717', wordBreak: 'break-all' }}>{result.url}</div>
            </section>

            <section style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 6 }}>Title</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#171717' }}>{result.title || '-'}</div>
              <div style={{ fontSize: 12, color: '#999', marginTop: 10 }}>Description</div>
              <div style={{ color: '#444', marginTop: 4 }}>{result.description || '-'}</div>
            </section>

            <section style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Detected Colors</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {result.detectedColors.length === 0 && <span style={{ color: '#666' }}>None detected</span>}
                {result.detectedColors.map((hex) => (
                  <div key={hex} style={{ display: 'flex', alignItems: 'center', gap: 6, border: '1px solid #eee', borderRadius: 999, padding: '4px 8px' }}>
                    <span style={{ width: 14, height: 14, borderRadius: '50%', background: hex, border: '1px solid rgba(0,0,0,0.08)' }} />
                    <span style={{ fontSize: 12, color: '#444' }}>{hex}</span>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>Top Headings</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: '#444' }}>
                {result.topHeadings.length === 0 && <li>No headings extracted</li>}
                {result.topHeadings.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </section>

            {!!result.summary && (
              <section style={{ background: '#fff', border: '1px solid #eee', borderRadius: 10, padding: 14 }}>
                <div style={{ fontSize: 12, color: '#999', marginBottom: 8 }}>AI Summary</div>
                <div style={{ whiteSpace: 'pre-wrap', color: '#333' }}>{result.summary}</div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
