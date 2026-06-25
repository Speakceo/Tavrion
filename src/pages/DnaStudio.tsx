import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Dna, Globe2, Sparkles, Palette, Type, Target, ArrowRight, CheckCircle2,
  Zap, Layers, Share2, Scan, ChevronRight, ExternalLink,
} from 'lucide-react';

type AnalysisResult = {
  url: string;
  title: string;
  description: string;
  language: string;
  topHeadings: string[];
  og: { title?: string; description?: string; image?: string };
  detectedColors: string[];
  summary?: string;
};

const T = {
  bg: '#060608',
  bgElevated: '#0f0f14',
  bgCard: '#14141c',
  text: '#fafafa',
  textBody: '#a1a1aa',
  textMuted: '#71717a',
  border: 'rgba(255,255,255,0.08)',
  accent: '#8b5cf6',
  accent2: '#06b6d4',
  accent3: '#ec4899',
  glow: 'rgba(139, 92, 246, 0.35)',
};

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

const FEATURES = [
  { icon: Scan, title: 'Instant Brand Scan', body: 'Paste any URL. We crawl the page and extract metadata, structure, and visual signals in seconds.' },
  { icon: Palette, title: 'Color DNA', body: 'Surface dominant hex values from stylesheets and inline CSS — your palette, decoded automatically.' },
  { icon: Type, title: 'Voice & Structure', body: 'Headings, descriptions, and OG tags reveal tone, hierarchy, and how the brand speaks online.' },
  { icon: Target, title: 'Audience Signals', body: 'Infer positioning from page copy — who they sell to, what they promise, and how they differentiate.' },
  { icon: Share2, title: 'Campaign-Ready', body: 'Turn extracted DNA into on-brand social posts, ads, and content — built for global teams.' },
  { icon: Layers, title: 'Multi-Platform', body: 'Instagram, LinkedIn, X, and Facebook — each asset respects platform conventions and limits.' },
];

const STEPS = [
  { n: '01', title: 'Paste a URL', desc: 'Any marketing site, landing page, or product homepage worldwide.' },
  { n: '02', title: 'Extract DNA', desc: 'Colors, copy, headings, OG data, and language — structured instantly.' },
  { n: '03', title: 'Ship campaigns', desc: 'Generate on-brand content and publish across your channels.' },
];

const EXAMPLE_URLS = ['https://jointavrion.com', 'https://stripe.com', 'https://linear.app'];

export function DnaStudio() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const analyze = async (targetUrl?: string) => {
    const value = (targetUrl ?? url).trim();
    if (!value) return;
    setUrl(value);
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
        body: JSON.stringify({ url: value }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Analysis failed');
      setResult(data);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error while analyzing URL');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    analyze();
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: FONT }}>
      {/* Ambient gradient */}
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: '900px', height: '600px', background: `radial-gradient(ellipse, ${T.glow} 0%, transparent 70%)`, filter: 'blur(60px)' }} />
        <div style={{ position: 'absolute', bottom: '10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(ellipse, rgba(6,182,212,0.15) 0%, transparent 70%)', filter: 'blur(50px)' }} />
      </div>

      {/* Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${T.border}`, background: 'rgba(6,6,8,0.85)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Dna size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em' }}>DNA Studio</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(139,92,246,0.2)', color: T.accent, marginLeft: 4 }}>by Tavrion</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#features" style={{ fontSize: 13, color: T.textBody, textDecoration: 'none' }}>Features</a>
            <a href="#how" style={{ fontSize: 13, color: T.textBody, textDecoration: 'none' }}>How it works</a>
            <Link to="/login" style={{ fontSize: 13, color: T.textBody, textDecoration: 'none' }}>Tavrion LMS</Link>
            <a href="#analyze" style={{ fontSize: 13, fontWeight: 600, background: T.text, color: '#060608', padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>Try free</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="analyze" style={{ position: 'relative', zIndex: 1, maxWidth: 1120, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, border: `1px solid ${T.border}`, background: T.bgElevated, marginBottom: 28, fontSize: 12, color: T.textBody }}>
          <Sparkles size={14} color={T.accent} />
          AI-powered brand intelligence for global teams
        </div>

        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05, marginBottom: 20, maxWidth: 800, margin: '0 auto 20px' }}>
          Paste a URL.{' '}
          <span style={{ background: `linear-gradient(90deg, ${T.accent}, ${T.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Extract brand DNA.
          </span>
        </h1>

        <p style={{ fontSize: 18, color: T.textBody, maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.6 }}>
          Decode any website&apos;s colors, tone, structure, and positioning — then turn insights into on-brand campaigns across every channel.
        </p>

        <form onSubmit={handleSubmit} style={{ maxWidth: 640, margin: '0 auto 16px', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <Globe2 size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://yourbrand.com"
              style={{
                width: '100%',
                padding: '16px 16px 16px 48px',
                fontSize: 15,
                borderRadius: 12,
                border: `1px solid ${T.border}`,
                background: T.bgCard,
                color: T.text,
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '16px 28px',
              borderRadius: 12,
              border: 'none',
              background: loading ? T.textMuted : `linear-gradient(135deg, ${T.accent}, ${T.accent2})`,
              color: '#fff',
              fontWeight: 700,
              fontSize: 15,
              cursor: loading ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              minWidth: 160,
              justifyContent: 'center',
            }}
          >
            {loading ? 'Analyzing…' : <>Analyze <ArrowRight size={18} /></>}
          </button>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', alignItems: 'center', fontSize: 12, color: T.textMuted }}>
          <span>Try:</span>
          {EXAMPLE_URLS.map((u) => (
            <button
              key={u}
              type="button"
              onClick={() => analyze(u)}
              disabled={loading}
              style={{ background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 999, padding: '4px 12px', color: T.textBody, cursor: 'pointer', fontSize: 12 }}
            >
              {u.replace('https://', '')}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ maxWidth: 640, margin: '20px auto 0', padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 14, textAlign: 'left' }}>
            {error}
          </div>
        )}
      </section>

      {/* Results */}
      {result && (
        <section ref={resultsRef} style={{ position: 'relative', zIndex: 1, maxWidth: 1120, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <CheckCircle2 size={22} color="#22c55e" />
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Brand DNA extracted</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {/* Brand card */}
            <div style={{ gridColumn: '1 / -1', background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 24 }}>
              {result.og.image && (
                <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/9', background: T.bgElevated }}>
                  <img src={result.og.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                </div>
              )}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Brand identity</div>
                <h3 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>{result.title || 'Untitled'}</h3>
                <p style={{ fontSize: 14, color: T.textBody, lineHeight: 1.6, margin: '0 0 16px' }}>{result.description || result.og.description || '—'}</p>
                <a href={result.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: T.accent2, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {result.url} <ExternalLink size={14} />
                </a>
                <div style={{ marginTop: 16, display: 'flex', gap: 12, fontSize: 12, color: T.textMuted }}>
                  <span>Language: {result.language}</span>
                </div>
              </div>
            </div>

            {/* Colors */}
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Palette size={18} color={T.accent3} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Color palette</span>
              </div>
              {result.detectedColors.length === 0 ? (
                <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>No colors detected on this page.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                  {result.detectedColors.map((hex) => (
                    <div key={hex} style={{ textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: hex, border: `1px solid ${T.border}`, marginBottom: 6 }} />
                      <span style={{ fontSize: 11, color: T.textMuted, fontFamily: 'monospace' }}>{hex}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Headings */}
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Type size={18} color={T.accent} />
                <span style={{ fontWeight: 700, fontSize: 15 }}>Page structure</span>
              </div>
              {result.topHeadings.length === 0 ? (
                <p style={{ color: T.textMuted, fontSize: 13, margin: 0 }}>No H1–H3 headings found (may be client-rendered).</p>
              ) : (
                <ul style={{ margin: 0, paddingLeft: 18, color: T.textBody, fontSize: 14, lineHeight: 1.8 }}>
                  {result.topHeadings.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Summary */}
            {result.summary && (
              <div style={{ gridColumn: '1 / -1', background: `linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08))`, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Zap size={18} color={T.accent2} />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>AI insight</span>
                </div>
                <p style={{ margin: 0, fontSize: 15, color: T.textBody, lineHeight: 1.7 }}>{result.summary}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" style={{ position: 'relative', zIndex: 1, borderTop: `1px solid ${T.border}`, background: T.bgElevated, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Capabilities</p>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 48, maxWidth: 520 }}>
            Everything you need to decode and deploy a brand
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24, transition: 'border-color 0.2s' }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(139,92,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                  <f.icon size={20} color={T.accent} />
                </div>
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: T.textBody, lineHeight: 1.6, margin: 0 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" style={{ position: 'relative', zIndex: 1, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 48, textAlign: 'center' }}>
            Three steps. Zero guesswork.
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, fontWeight: 800, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16 }}>{s.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: T.textBody, margin: 0, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: '0 24px 100px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '48px 32px', borderRadius: 20, background: `linear-gradient(135deg, rgba(139,92,246,0.2), rgba(6,182,212,0.15))`, border: `1px solid ${T.border}` }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 12px', letterSpacing: '-0.02em' }}>Ready to decode your brand?</h2>
          <p style={{ color: T.textBody, margin: '0 0 24px', fontSize: 16 }}>Start with any URL. No signup required.</p>
          <a href="#analyze" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 28px', borderRadius: 12, background: T.text, color: T.bg, fontWeight: 700, fontSize: 15, textDecoration: 'none' }}>
            Analyze a website <ChevronRight size={18} />
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: `1px solid ${T.border}`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dna size={18} color={T.accent} />
            <span style={{ fontWeight: 700, fontSize: 14 }}>DNA Studio</span>
            <span style={{ color: T.textMuted, fontSize: 13 }}>· Part of Tavrion</span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
            <a href="https://jointavrion.com" style={{ color: T.textBody, textDecoration: 'none' }}>jointavrion.com</a>
            <Link to="/login" style={{ color: T.textBody, textDecoration: 'none' }}>Tavrion LMS</Link>
          </div>
          <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>© 2026 Tavrion, Inc.</p>
        </div>
      </footer>
    </div>
  );
}
