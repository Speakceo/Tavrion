import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Dna, Globe2, Sparkles, Palette, Type, Target, ArrowRight, CheckCircle2,
  Zap, Layers, Share2, Scan, ChevronRight, ExternalLink, Instagram, Linkedin,
  Twitter, Facebook, ImageIcon, Loader2, Copy, Check,
} from 'lucide-react';

type ColorRole = { hex: string; usage: string; name?: string };
type BrandProfile = {
  name: string;
  tagline: string;
  industry: string;
  category: string;
  keywords: string[];
  tone: { primary: string; description: string; formality: number; energy: number; warmth: number };
  audience: { primary: string; secondary: string; ageRange: string; interests: string[]; painPoints: string[] };
};

type AnalysisResult = {
  url: string;
  title: string;
  description: string;
  language: string;
  topHeadings: string[];
  rawTextPreview?: string;
  og: { title?: string; description?: string; image?: string; siteName?: string };
  favicon?: string;
  logoUrl?: string | null;
  logos?: { url: string; alt: string }[];
  detectedColors: string[];
  colorPalette: ColorRole[];
  brand: BrandProfile;
  summary?: string;
  previewImage?: string | null;
};

type CampaignAsset = {
  platform: string;
  caption: string;
  hashtags: string[];
  cta: string;
  imagePrompt: string;
};

type CampaignConcept = {
  name: string;
  description: string;
  assets: CampaignAsset[];
};

const T = {
  bg: '#060608', bgElevated: '#0f0f14', bgCard: '#14141c',
  text: '#fafafa', textBody: '#a1a1aa', textMuted: '#71717a',
  border: 'rgba(255,255,255,0.08)', accent: '#8b5cf6', accent2: '#06b6d4', accent3: '#ec4899',
  glow: 'rgba(139, 92, 246, 0.35)',
};

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
const PLATFORMS = [
  { id: 'instagram', label: 'Instagram', icon: Instagram, color: '#E1306C' },
  { id: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: '#0A66C2' },
  { id: 'twitter', label: 'X / Twitter', icon: Twitter, color: '#1DA1F2' },
  { id: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2' },
] as const;

const FEATURES = [
  { icon: Scan, title: 'Instant Brand Scan', body: 'Paste any URL. We crawl the page and extract metadata, structure, and visual signals in seconds.' },
  { icon: Palette, title: 'Color DNA', body: 'Surface dominant hex values from stylesheets and inline CSS — your palette, decoded automatically.' },
  { icon: Type, title: 'Voice & Structure', body: 'Headings, descriptions, and OG tags reveal tone, hierarchy, and how the brand speaks online.' },
  { icon: Target, title: 'Audience Signals', body: 'AI infers positioning — who they sell to, what they promise, and how they differentiate.' },
  { icon: Share2, title: 'Campaign-Ready', body: 'Turn extracted DNA into on-brand social posts, ads, and content — built for global teams.' },
  { icon: Layers, title: 'Multi-Platform', body: 'Instagram, LinkedIn, X, and Facebook — each asset respects platform conventions and limits.' },
];

const STEPS = [
  { n: '01', title: 'Paste a URL', desc: 'Any marketing site, landing page, or product homepage worldwide.' },
  { n: '02', title: 'Extract DNA', desc: 'Colors, copy, tone, audience, and industry — structured instantly.' },
  { n: '03', title: 'Ship campaigns', desc: 'Generate platform-specific posts and image prompts in one click.' },
];

const EXAMPLE_URLS = ['https://jointavrion.com', 'https://stripe.com', 'https://linear.app'];
const CAMPAIGN_GOALS = ['Brand awareness', 'Product launch', 'Lead generation', 'Event promotion'];

function proxyImage(url: string) {
  const base = import.meta.env.VITE_SUPABASE_URL;
  return `${base}/functions/v1/dna-studio-image-proxy?url=${encodeURIComponent(url)}`;
}

function PlatformIcon({ platform }: { platform: string }) {
  const p = PLATFORMS.find((x) => x.id === platform);
  if (!p) return <Share2 size={16} />;
  return <p.icon size={16} color={p.color} />;
}

function SocialPreview({ asset, brand, previewImage, primaryColor = '#8b5cf6' }: { asset: CampaignAsset; brand: BrandProfile; previewImage?: string | null; primaryColor?: string }) {
  const [copied, setCopied] = useState(false);
  const text = `${asset.caption}\n\n${asset.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`;

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 14, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <PlatformIcon platform={asset.platform} />
          <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{asset.platform}</span>
        </div>
        <button onClick={copy} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
          {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {(previewImage || brand.name) && (
        <div style={{ aspectRatio: asset.platform === 'instagram' ? '1' : '16/9', background: `linear-gradient(135deg, ${primaryColor}33, ${T.bgCard})`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
          {previewImage ? (
            <img src={proxyImage(previewImage)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          ) : (
            <div style={{ textAlign: 'center', padding: 24 }}>
              <ImageIcon size={32} color={T.textMuted} />
              <p style={{ fontSize: 12, color: T.textMuted, marginTop: 8 }}>Image prompt ready</p>
            </div>
          )}
        </div>
      )}
      <div style={{ padding: 16 }}>
        <p style={{ fontSize: 14, color: T.text, lineHeight: 1.6, margin: '0 0 10px', whiteSpace: 'pre-wrap' }}>{asset.caption}</p>
        <p style={{ fontSize: 12, color: T.accent2, margin: '0 0 8px' }}>
          {asset.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}
        </p>
        {asset.cta && <p style={{ fontSize: 12, fontWeight: 600, color: T.accent, margin: 0 }}>{asset.cta}</p>}
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 11, color: T.textMuted, cursor: 'pointer' }}>Image generation prompt</summary>
          <p style={{ fontSize: 11, color: T.textBody, marginTop: 8, lineHeight: 1.5 }}>{asset.imagePrompt}</p>
        </details>
      </div>
    </div>
  );
}

export function DnaStudio() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['instagram', 'linkedin', 'twitter', 'facebook']);
  const [campaignGoal, setCampaignGoal] = useState(CAMPAIGN_GOALS[0]);
  const [campaigns, setCampaigns] = useState<CampaignConcept[] | null>(null);
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [campaignError, setCampaignError] = useState('');
  const [activeConcept, setActiveConcept] = useState(0);
  const resultsRef = useRef<HTMLDivElement>(null);

  const analyze = async (targetUrl?: string) => {
    const value = (targetUrl ?? url).trim();
    if (!value) return;
    setUrl(value);
    setError('');
    setResult(null);
    setCampaigns(null);
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

  const generateCampaign = async () => {
    if (!result) return;
    setCampaignLoading(true);
    setCampaignError('');
    setCampaigns(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dna-studio-generate-campaign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          brand: { ...result.brand, colorPalette: result.colorPalette, detectedColors: result.detectedColors, summary: result.summary },
          goal: campaignGoal,
          platforms: selectedPlatforms,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Campaign generation failed');
      setCampaigns(data.concepts || []);
      setActiveConcept(0);
    } catch (err) {
      setCampaignError(err instanceof Error ? err.message : 'Failed to generate campaign');
    } finally {
      setCampaignLoading(false);
    }
  };

  const togglePlatform = (id: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((p) => p !== id) : prev) : [...prev, id],
    );
  };

  const previewImg = result?.previewImage || result?.og?.image || result?.logoUrl;
  const primaryColor = result?.colorPalette?.[0]?.hex || result?.detectedColors?.[0] || T.accent;

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: FONT }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-20%', left: '50%', transform: 'translateX(-50%)', width: 900, height: 600, background: `radial-gradient(ellipse, ${T.glow} 0%, transparent 70%)`, filter: 'blur(60px)' }} />
      </div>

      <nav style={{ position: 'sticky', top: 0, zIndex: 50, borderBottom: `1px solid ${T.border}`, background: 'rgba(6,6,8,0.85)', backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Dna size={16} color="#fff" />
            </div>
            <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: '-0.03em' }}>DNA Studio</span>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: 'rgba(139,92,246,0.2)', color: T.accent }}>by Tavrion</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a href="#features" style={{ fontSize: 13, color: T.textBody, textDecoration: 'none' }}>Features</a>
            <Link to="/login" style={{ fontSize: 13, color: T.textBody, textDecoration: 'none' }}>Tavrion LMS</Link>
            <a href="#analyze" style={{ fontSize: 13, fontWeight: 600, background: T.text, color: '#060608', padding: '8px 16px', borderRadius: 8, textDecoration: 'none' }}>Try free</a>
          </div>
        </div>
      </nav>

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
          Decode colors, tone, audience, and positioning — then generate platform-specific social campaigns.
        </p>

        <form onSubmit={(e) => { e.preventDefault(); analyze(); }} style={{ maxWidth: 640, margin: '0 auto 16px', display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ flex: '1 1 320px', position: 'relative' }}>
            <Globe2 size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: T.textMuted }} />
            <input type="url" required value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourbrand.com"
              style={{ width: '100%', padding: '16px 16px 16px 48px', fontSize: 15, borderRadius: 12, border: `1px solid ${T.border}`, background: T.bgCard, color: T.text, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <button type="submit" disabled={loading}
            style={{ padding: '16px 28px', borderRadius: 12, border: 'none', background: loading ? T.textMuted : `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, color: '#fff', fontWeight: 700, fontSize: 15, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, minWidth: 160, justifyContent: 'center' }}>
            {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing…</> : <>Analyze <ArrowRight size={18} /></>}
          </button>
        </form>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', fontSize: 12, color: T.textMuted }}>
          <span>Try:</span>
          {EXAMPLE_URLS.map((u) => (
            <button key={u} type="button" onClick={() => analyze(u)} disabled={loading}
              style={{ background: T.bgElevated, border: `1px solid ${T.border}`, borderRadius: 999, padding: '4px 12px', color: T.textBody, cursor: 'pointer' }}>
              {u.replace('https://', '')}
            </button>
          ))}
        </div>
        {error && <div style={{ maxWidth: 640, margin: '20px auto 0', padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#fca5a5', fontSize: 14, textAlign: 'left' }}>{error}</div>}
      </section>

      {result && (
        <section ref={resultsRef} style={{ position: 'relative', zIndex: 1, maxWidth: 1120, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <CheckCircle2 size={22} color="#22c55e" />
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Brand DNA — {result.brand.name}</h2>
          </div>

          {/* Brand preview */}
          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 16, padding: 24, marginBottom: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
            <div style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '16/10', background: `linear-gradient(135deg, ${primaryColor}44, ${T.bgElevated})`, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {previewImg ? (
                <img src={proxyImage(previewImg)} alt="Brand preview" style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              ) : null}
              {!previewImg && (
                <div style={{ textAlign: 'center', padding: 24, zIndex: 1 }}>
                  <div style={{ width: 64, height: 64, borderRadius: 16, background: primaryColor, margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 800 }}>
                    {result.brand.name.charAt(0)}
                  </div>
                  <p style={{ fontSize: 13, color: T.textMuted, margin: 0 }}>No OG image — using brand colors</p>
                </div>
              )}
              {result.logoUrl && (
                <img src={proxyImage(result.logoUrl)} alt="Logo" style={{ position: 'absolute', bottom: 12, left: 12, width: 40, height: 40, borderRadius: 8, background: '#fff', padding: 4, objectFit: 'contain' }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                {result.favicon && <img src={proxyImage(result.favicon)} alt="" style={{ width: 24, height: 24, borderRadius: 4 }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                <span style={{ fontSize: 11, fontWeight: 600, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{result.brand.industry} · {result.brand.category}</span>
              </div>
              <h3 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.02em' }}>{result.brand.name}</h3>
              {result.brand.tagline && <p style={{ fontSize: 15, color: T.accent2, margin: '0 0 12px', fontStyle: 'italic' }}>{result.brand.tagline}</p>}
              <p style={{ fontSize: 14, color: T.textBody, lineHeight: 1.6, margin: '0 0 16px' }}>{result.summary}</p>
              <a href={result.url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: T.textMuted, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {result.url} <ExternalLink size={14} />
              </a>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
            {/* Tone */}
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Zap size={16} color={T.accent2} /> Tone of voice</div>
              <p style={{ fontSize: 14, color: T.text, fontWeight: 600, margin: '0 0 6px', textTransform: 'capitalize' }}>{result.brand.tone.primary}</p>
              <p style={{ fontSize: 13, color: T.textBody, margin: '0 0 12px', lineHeight: 1.5 }}>{result.brand.tone.description}</p>
              <div style={{ display: 'grid', gap: 6, fontSize: 11, color: T.textMuted }}>
                <div>Formality {result.brand.tone.formality}% · Energy {result.brand.tone.energy}% · Warmth {result.brand.tone.warmth}%</div>
              </div>
            </div>
            {/* Audience */}
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Target size={16} color={T.accent3} /> Target audience</div>
              <p style={{ fontSize: 14, color: T.text, fontWeight: 600, margin: '0 0 4px' }}>{result.brand.audience.primary}</p>
              {result.brand.audience.secondary && <p style={{ fontSize: 13, color: T.textBody, margin: '0 0 8px' }}>{result.brand.audience.secondary}</p>}
              <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>Age: {result.brand.audience.ageRange}</p>
            </div>
            {/* Colors */}
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Palette size={16} color={T.accent} /> Color palette</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {(result.colorPalette.length ? result.colorPalette : result.detectedColors.map((hex) => ({ hex, usage: 'accent' }))).map((c) => (
                  <div key={c.hex} style={{ textAlign: 'center' }}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: c.hex, border: `1px solid ${T.border}`, marginBottom: 4 }} />
                    <div style={{ fontSize: 10, fontFamily: 'monospace', color: T.textMuted }}>{c.hex}</div>
                    <div style={{ fontSize: 9, color: T.textMuted, textTransform: 'capitalize' }}>{c.usage}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Keywords */}
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontWeight: 700, marginBottom: 12 }}>Keywords</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {result.brand.keywords.map((kw) => (
                  <span key={kw} style={{ fontSize: 11, padding: '4px 10px', borderRadius: 999, background: T.bgElevated, border: `1px solid ${T.border}`, color: T.textBody }}>{kw}</span>
                ))}
              </div>
              {result.topHeadings.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 6 }}>Page headings</div>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: T.textBody, lineHeight: 1.6 }}>
                    {result.topHeadings.slice(0, 4).map((h) => <li key={h}>{h}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* Campaign generator */}
          <div style={{ background: `linear-gradient(135deg, rgba(139,92,246,0.15), rgba(6,182,212,0.1))`, border: `1px solid ${T.border}`, borderRadius: 16, padding: 28, marginBottom: 24 }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Generate social campaign</h3>
            <p style={{ fontSize: 14, color: T.textBody, margin: '0 0 20px' }}>Create platform-specific posts with captions, hashtags, CTAs, and image prompts.</p>

            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 8 }}>Campaign goal</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {CAMPAIGN_GOALS.map((g) => (
                  <button key={g} type="button" onClick={() => setCampaignGoal(g)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${campaignGoal === g ? T.accent : T.border}`, background: campaignGoal === g ? 'rgba(139,92,246,0.2)' : T.bgCard, color: T.text, cursor: 'pointer', fontSize: 13 }}>
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 8 }}>Platforms</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {PLATFORMS.map((p) => (
                  <button key={p.id} type="button" onClick={() => togglePlatform(p.id)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: `1px solid ${selectedPlatforms.includes(p.id) ? p.color : T.border}`, background: selectedPlatforms.includes(p.id) ? `${p.color}22` : T.bgCard, color: T.text, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p.icon size={14} color={p.color} /> {p.label}
                  </button>
                ))}
              </div>
            </div>

            <button type="button" onClick={generateCampaign} disabled={campaignLoading}
              style={{ padding: '14px 24px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, color: '#fff', fontWeight: 700, fontSize: 14, cursor: campaignLoading ? 'wait' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              {campaignLoading ? <><Loader2 size={16} /> Generating campaign…</> : <><Share2 size={16} /> Generate campaign assets</>}
            </button>
            {campaignError && <p style={{ color: '#fca5a5', fontSize: 13, marginTop: 12 }}>{campaignError}</p>}
          </div>

          {/* Campaign results */}
          {campaigns && campaigns.length > 0 && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {campaigns.map((c, i) => (
                  <button key={c.name} type="button" onClick={() => setActiveConcept(i)}
                    style={{ padding: '10px 16px', borderRadius: 8, border: `1px solid ${activeConcept === i ? T.accent : T.border}`, background: activeConcept === i ? 'rgba(139,92,246,0.2)' : T.bgCard, color: T.text, cursor: 'pointer', fontSize: 13, fontWeight: activeConcept === i ? 700 : 500 }}>
                    {c.name}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 14, color: T.textBody, marginBottom: 20 }}>{campaigns[activeConcept].description}</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
                {campaigns[activeConcept].assets.map((asset) => (
                  <SocialPreview key={`${asset.platform}-${asset.caption.slice(0, 20)}`} asset={asset} brand={result.brand} previewImage={previewImg} primaryColor={primaryColor} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section id="features" style={{ position: 'relative', zIndex: 1, borderTop: `1px solid ${T.border}`, background: T.bgElevated, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 48 }}>Everything you need to decode and deploy a brand</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: 24 }}>
                <f.icon size={20} color={T.accent} style={{ marginBottom: 12 }} />
                <h3 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: T.textBody, margin: 0, lineHeight: 1.6 }}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="how" style={{ position: 'relative', zIndex: 1, padding: '80px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', fontWeight: 800, marginBottom: 48, textAlign: 'center' }}>Three steps. Zero guesswork.</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32 }}>
            {STEPS.map((s) => (
              <div key={s.n} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, fontWeight: 800, background: `linear-gradient(135deg, ${T.accent}, ${T.accent2})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: 16 }}>{s.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>{s.title}</h3>
                <p style={{ fontSize: 14, color: T.textBody, margin: 0 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer style={{ position: 'relative', zIndex: 1, borderTop: `1px solid ${T.border}`, padding: '32px 24px' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
          <span style={{ fontWeight: 700 }}>DNA Studio · Tavrion</span>
          <p style={{ fontSize: 12, color: T.textMuted, margin: 0 }}>© 2026 Tavrion, Inc.</p>
        </div>
      </footer>
    </div>
  );
}
