import { Link } from 'react-router-dom';
import { TavrionLogo } from '../components/TavrionLogo';
import { usePageSeo } from '../lib/seo';

export function NotFound() {
  usePageSeo({
    title: 'Page not found | Tavrion',
    description: 'This page does not exist on Tavrion.',
    path: typeof window !== 'undefined' ? window.location.pathname : '/404',
    noindex: true,
  });

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#fff',
        color: '#171717',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        padding: '28px 24px 48px',
      }}
    >
      <Link to="/" style={{ textDecoration: 'none', width: 'fit-content' }}>
        <TavrionLogo size="md" />
      </Link>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 520, margin: '0 auto', width: '100%' }}>
        <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#808080', margin: '0 0 12px' }}>
          404
        </p>
        <h1 style={{ fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 750, letterSpacing: '-0.04em', lineHeight: 1.1, margin: '0 0 12px' }}>
          Page not found
        </h1>
        <p style={{ fontSize: 16, color: '#666', lineHeight: 1.6, margin: '0 0 28px' }}>
          That URL is not a page on Tavrion. Head back to the homepage to learn about the platform, or sign in if you already have an account.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link to="/" className="lt-btn-primary" style={{ padding: '10px 18px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Go to homepage
          </Link>
          <Link to="/login" className="lt-btn-secondary" style={{ padding: '10px 18px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
