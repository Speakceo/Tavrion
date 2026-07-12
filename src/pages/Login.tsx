import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { SEO, usePageSeo } from '../lib/seo';
import { ArrowRight, Eye, EyeOff, Shield, Users, BarChart3, Zap, Building2, X } from 'lucide-react';
import { TavrionLogo } from '../components/TavrionLogo';

const T = {
  bg: '#ffffff',
  bgSubtle: '#fafafa',
  bgSection: '#f5f5f5',
  text: '#171717',
  textBody: '#4d4d4d',
  textMuted: '#666666',
  textFaint: '#808080',
  border: 'rgba(0,0,0,0.08)',
  borderStrong: '#ebebeb',
  blue: '#0a72ef',
  pink: '#de1d8d',
  red: '#ff5b4f',
  shadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
  shadowCard: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px, rgba(0,0,0,0.04) 0px 8px 16px -8px',
  shadowFocus: `rgba(10,114,239,0.2) 0px 0px 0px 3px, rgba(0,0,0,0.08) 0px 0px 0px 1px`,
};

const SOCIAL_PROOF = [
  { icon: Users, value: '2M+', label: 'Learners trained', color: T.blue },
  { icon: BarChart3, value: '98%', label: 'Completion rate', color: T.pink },
  { icon: Zap, value: '150+', label: 'Countries', color: T.red },
];

interface OrgOption { id: string; name: string; slug: string; }

const OWNER_SENTINEL = '__platform_owner__';
const MIN_ORG_SEARCH = 3;
const PLATFORM_OWNER_LABEL = 'Platform Owner (Master Admin)';

function escapeIlike(term: string): string {
  return term.replace(/[%_\\]/g, '\\$&');
}

function matchesPlatformOwner(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length < MIN_ORG_SEARCH) return false;
  return PLATFORM_OWNER_LABEL.toLowerCase().includes(q);
}

export function Login() {
  usePageSeo(SEO.login);

  const [orgQuery, setOrgQuery] = useState('');
  const [orgId, setOrgId] = useState('');
  const [selectedOrgLabel, setSelectedOrgLabel] = useState('');
  const [suggestions, setSuggestions] = useState<OrgOption[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [orgSearchLoading, setOrgSearchLoading] = useState(false);
  const orgSearchRef = useRef<HTMLDivElement>(null);
  const orgBlurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showId, setShowId] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<'org' | 'id' | 'pw' | null>(null);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const searchOrganizations = useCallback(async (query: string) => {
    const term = query.trim();
    if (term.length < MIN_ORG_SEARCH) {
      setSuggestions([]);
      setOrgSearchLoading(false);
      return;
    }

    setOrgSearchLoading(true);
    try {
      const escaped = escapeIlike(term);
      const { data, error: searchError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('is_active', true)
        .or(`name.ilike.%${escaped}%,slug.ilike.%${escaped}%`)
        .order('name', { ascending: true })
        .limit(8);

      if (searchError) throw searchError;
      setSuggestions(data || []);
      setError('');
    } catch (err) {
      console.error('Failed to search organisations:', err);
      setSuggestions([]);
      setError('Could not reach organisation directory. Please refresh and try again.');
    } finally {
      setOrgSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showSuggestions) return;
    const term = orgQuery.trim();
    if (term.length < MIN_ORG_SEARCH) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      searchOrganizations(term);
    }, 250);

    return () => clearTimeout(timer);
  }, [orgQuery, showSuggestions, searchOrganizations]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (orgSearchRef.current && !orgSearchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  const clearOrgSelection = () => {
    setOrgId('');
    setSelectedOrgLabel('');
    setOrgQuery('');
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const selectOrganization = (id: string, label: string) => {
    if (orgBlurTimer.current) clearTimeout(orgBlurTimer.current);
    setOrgId(id);
    setSelectedOrgLabel(label);
    setOrgQuery(label);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleOrgInputChange = (value: string) => {
    setOrgQuery(value);
    if (orgId && value !== selectedOrgLabel) {
      setOrgId('');
      setSelectedOrgLabel('');
    }
    setShowSuggestions(true);
  };

  const platformOwnerMatch = matchesPlatformOwner(orgQuery);
  const showOrgDropdown = showSuggestions && orgQuery.trim().length >= MIN_ORG_SEARCH;
  const hasOrgResults = platformOwnerMatch || suggestions.length > 0;
  const showNoResults = showOrgDropdown && !orgSearchLoading && !hasOrgResults;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error, profile: signedIn } = await signIn(userId, password, orgId === OWNER_SENTINEL ? undefined : orgId);
    if (error) {
      setError(error.message || 'Invalid organisation, User ID, or password. Please try again.');
      setLoading(false);
    } else {
      navigate(signedIn?.is_platform_owner ? '/owner' : '/dashboard');
    }
  };

  const isDisabled = loading || !orgId || !userId.trim() || !password.trim();

  return (
    <div
      className="login-page"
      style={{
        background: T.bg,
        fontFamily: '"Geist", "Inter", system-ui, -apple-system, sans-serif',
        color: T.text,
      }}
    >
      {/* ── LEFT BRANDING PANEL (lg+ only — no inline display; it overrides Tailwind hidden) */}
      <div
        className="login-brand-panel"
        style={{
          background: T.bgSection,
          boxShadow: `${T.borderStrong} 1px 0 0 0`,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '30%', left: '30%', width: 320, height: 320, background: `radial-gradient(ellipse, ${T.blue}18 0%, transparent 70%)`, pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '48px 52px' }}>
          <Link to="/" style={{ textDecoration: 'none' }}>
            <TavrionLogo size="lg" />
          </Link>

          <div style={{ marginTop: 'auto', marginBottom: 52 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: `${T.blue}12`, boxShadow: `${T.blue}40 0px 0px 0px 1px`, borderRadius: 100, padding: '4px 12px', fontSize: 11, fontWeight: 600, color: T.blue, marginBottom: 24, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
              <Zap size={10} />
              Enterprise learning · Global scale
            </div>
            <h1 style={{ fontSize: 'clamp(32px, 3.5vw, 48px)', fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.08, color: T.text, marginBottom: 16 }}>
              Train the world.<br />
              <span style={{ color: T.textMuted }}>Scale without limits.</span>
            </h1>
            <p style={{ fontSize: 15, color: T.textBody, lineHeight: 1.7, maxWidth: 360 }}>
              The enterprise platform for global teams — AI-powered coaching, SCORM, analytics, and live call training in one system.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 16 }}>
            {SOCIAL_PROOF.map(item => (
              <div key={item.label} style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, padding: '16px 14px' }}>
                <div style={{ width: 28, height: 28, background: `${item.color}12`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                  <item.icon size={13} color={item.color} />
                </div>
                <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: T.text, lineHeight: 1, marginBottom: 3 }}>{item.value}</p>
                <p style={{ fontSize: 11, color: T.textMuted, fontWeight: 500 }}>{item.label}</p>
              </div>
            ))}
          </div>

          <div style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 14, padding: '18px 20px' }}>
            <div style={{ display: 'flex', gap: 3, marginBottom: 10 }}>
              {[...Array(5)].map((_, i) => (
                <svg key={i} width="12" height="12" viewBox="0 0 12 12" fill="#F59E0B"><polygon points="6,1 7.5,4.5 11,5 8.5,7.5 9,11 6,9.5 3,11 3.5,7.5 1,5 4.5,4.5" /></svg>
              ))}
            </div>
            <p style={{ fontSize: 13, color: T.textBody, lineHeight: 1.65, marginBottom: 10, fontStyle: 'italic' }}>
              "Completion jumped from 64% to 96% in six months across 30 markets."
            </p>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.textMuted }}>Sarah Mitchell · Head of L&D, Global Fintech</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="login-form-panel">
        <Link to="/" className="login-mobile-logo" style={{ textDecoration: 'none' }}>
          <TavrionLogo size="md" />
        </Link>

        <div className="login-mobile-proof">
          {SOCIAL_PROOF.map(item => (
            <div key={item.label} style={{ background: T.bgSubtle, boxShadow: T.shadow, borderRadius: 10, padding: '10px 6px', textAlign: 'center', minWidth: 0 }}>
              <p className="login-proof-value" style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.04em', color: T.text, lineHeight: 1, marginBottom: 3 }}>{item.value}</p>
              <p style={{ fontSize: 10, color: T.textMuted, fontWeight: 500, lineHeight: 1.2 }}>{item.label}</p>
            </div>
          ))}
        </div>

        <div className="login-form-wrap">
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 'clamp(22px, 6vw, 32px)', fontWeight: 700, letterSpacing: '-0.04em', color: T.text, marginBottom: 8 }}>
              Welcome back
            </h2>
            <p style={{ fontSize: 14, color: T.textBody, lineHeight: 1.6 }}>
              Type your organisation name to find it, then sign in with your User ID.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ background: '#fff5f5', boxShadow: `${T.red}50 0px 0px 0px 1px`, borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#c0392b', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 6, height: 6, background: T.red, borderRadius: '50%', flexShrink: 0 }} />
                {error}
              </div>
            )}

            {/* Organisation autocomplete */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="orgSearch" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                Organisation
              </label>
              <div ref={orgSearchRef} style={{ position: 'relative' }}>
                <Building2 size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textFaint, pointerEvents: 'none', zIndex: 1 }} />
                <input
                  id="orgSearch"
                  type="text"
                  value={orgQuery}
                  onChange={(e) => handleOrgInputChange(e.target.value)}
                  onFocus={() => {
                    setFocusedField('org');
                    if (orgQuery.trim().length >= MIN_ORG_SEARCH) setShowSuggestions(true);
                  }}
                  onBlur={() => {
                    setFocusedField(null);
                    orgBlurTimer.current = setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  placeholder={`Type at least ${MIN_ORG_SEARCH} characters...`}
                  autoComplete="off"
                  role="combobox"
                  aria-expanded={showOrgDropdown}
                  aria-autocomplete="list"
                  aria-controls="org-suggestions"
                  className="login-input"
                  style={{
                    width: '100%',
                    padding: orgId ? '12px 40px 12px 36px' : '12px 14px 12px 36px',
                    background: T.bgSubtle,
                    boxShadow: focusedField === 'org' ? T.shadowFocus : T.shadow,
                    border: 'none',
                    borderRadius: 10,
                    color: orgQuery ? T.text : T.textFaint,
                    outline: 'none',
                    transition: 'box-shadow 0.15s',
                    boxSizing: 'border-box' as const,
                  }}
                />
                {orgId && (
                  <button
                    type="button"
                    onClick={clearOrgSelection}
                    aria-label="Clear organisation"
                    style={{
                      position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint,
                      padding: 4, display: 'flex', borderRadius: 6,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}

                {showOrgDropdown && (
                  <div
                    id="org-suggestions"
                    role="listbox"
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 6px)',
                      left: 0,
                      right: 0,
                      background: T.bg,
                      borderRadius: 10,
                      boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.12) 0px 8px 24px',
                      zIndex: 50,
                      maxHeight: 240,
                      overflowY: 'auto',
                    }}
                  >
                    {orgSearchLoading && (
                      <div style={{ padding: '12px 14px', fontSize: 13, color: T.textMuted }}>
                        Searching...
                      </div>
                    )}

                    {!orgSearchLoading && platformOwnerMatch && (
                      <button
                        type="button"
                        role="option"
                        aria-selected={orgId === OWNER_SENTINEL}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectOrganization(OWNER_SENTINEL, PLATFORM_OWNER_LABEL)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '11px 14px', border: 'none', background: orgId === OWNER_SENTINEL ? T.bgSection : 'transparent',
                          cursor: 'pointer', fontSize: 13, color: T.text,
                          borderBottom: suggestions.length ? `1px solid ${T.borderStrong}` : 'none',
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{PLATFORM_OWNER_LABEL}</span>
                      </button>
                    )}

                    {!orgSearchLoading && suggestions.map((org) => (
                      <button
                        key={org.id}
                        type="button"
                        role="option"
                        aria-selected={orgId === org.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => selectOrganization(org.id, org.name)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          padding: '11px 14px', border: 'none',
                          background: orgId === org.id ? T.bgSection : 'transparent',
                          cursor: 'pointer', fontSize: 13, color: T.text,
                          borderBottom: `1px solid ${T.borderStrong}`,
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{org.name}</span>
                        {org.slug && (
                          <span style={{ display: 'block', fontSize: 11, color: T.textMuted, marginTop: 2 }}>
                            {org.slug}
                          </span>
                        )}
                      </button>
                    ))}

                    {showNoResults && (
                      <div style={{ padding: '12px 14px', fontSize: 13, color: T.textMuted }}>
                        No organisations match &ldquo;{orgQuery.trim()}&rdquo;
                      </div>
                    )}
                  </div>
                )}

                {orgQuery.trim().length > 0 && orgQuery.trim().length < MIN_ORG_SEARCH && (
                  <p style={{ fontSize: 11, color: T.textFaint, marginTop: 6 }}>
                    Keep typing — enter at least {MIN_ORG_SEARCH} characters to search.
                  </p>
                )}
              </div>
            </div>

            {/* User ID */}
            <div style={{ marginBottom: 16 }}>
              <label htmlFor="userId" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                User ID
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="userId"
                  type={showId ? 'text' : 'password'}
                  value={userId}
                  onChange={e => setUserId(e.target.value)}
                  onFocus={() => setFocusedField('id')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your User ID"
                  required
                  className="login-input"
                  style={{
                    width: '100%', padding: '12px 44px 12px 14px', background: T.bgSubtle,
                    boxShadow: focusedField === 'id' ? T.shadowFocus : T.shadow,
                    border: 'none', borderRadius: 10, color: T.text,
                    outline: 'none', transition: 'box-shadow 0.15s', boxSizing: 'border-box' as const,
                  }}
                />
                <button type="button" onClick={() => setShowId(!showId)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint, padding: 4, display: 'flex', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = T.textBody)}
                  onMouseLeave={e => (e.currentTarget.style.color = T.textFaint)}
                >
                  {showId ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label htmlFor="password" style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textMuted, marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase' as const }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('pw')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter your password"
                  required
                  className="login-input"
                  style={{
                    width: '100%', padding: '12px 44px 12px 14px', background: T.bgSubtle,
                    boxShadow: focusedField === 'pw' ? T.shadowFocus : T.shadow,
                    border: 'none', borderRadius: 10, color: T.text,
                    outline: 'none', transition: 'box-shadow 0.15s', boxSizing: 'border-box' as const,
                  }}
                />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.textFaint, padding: 4, display: 'flex', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = T.textBody)}
                  onMouseLeave={e => (e.currentTarget.style.color = T.textFaint)}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p style={{ fontSize: 11, color: T.textFaint, marginTop: 6 }}>
                {orgId === OWNER_SENTINEL
                  ? 'Use your platform owner User ID and password'
                  : 'Default password is your User ID unless changed'}
              </p>
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="login-submit-btn"
              style={{
                width: '100%', padding: '14px 24px', minHeight: 48,
                background: isDisabled ? T.bgSection : T.text,
                border: 'none', borderRadius: 10,
                color: isDisabled ? T.textFaint : '#ffffff',
                fontWeight: 600, fontSize: 15,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                letterSpacing: '-0.01em',
                boxShadow: isDisabled ? T.shadow : 'rgba(0,0,0,0.15) 0px 1px 2px, rgba(0,0,0,0.06) 0px 4px 8px',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = '#2d2d2d'; }}
              onMouseLeave={e => { if (!isDisabled) (e.currentTarget as HTMLButtonElement).style.background = T.text; }}
            >
              {loading ? (
                <>
                  <div style={{ width: 15, height: 15, border: '2px solid rgba(255,255,255,0.25)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>Sign in <ArrowRight size={14} /></>
              )}
            </button>
          </form>

          <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 12, color: T.textFaint }}>
              <Shield size={11} style={{ color: T.textFaint }} />
              Enterprise-grade encryption · SOC 2 compliant
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              {['SSO', 'RBAC', 'GDPR'].map(badge => (
                <span key={badge} style={{ fontSize: 10, fontWeight: 600, color: T.textMuted, letterSpacing: '0.06em', background: T.bgSection, boxShadow: T.shadow, borderRadius: 6, padding: '3px 8px' }}>
                  {badge}
                </span>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 28, textAlign: 'center' }}>
            <Link to="/" style={{ fontSize: 13, color: T.textMuted, textDecoration: 'none', transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = T.text)}
              onMouseLeave={e => (e.currentTarget.style.color = T.textMuted)}
            >
              &larr; Back to jointavrion.com
            </Link>
          </div>
        </div>

        <div className="login-footer">
          &copy; 2026 Tavrion &nbsp;&middot;&nbsp;
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Privacy</a>
          &nbsp;&middot;&nbsp;
          <a href="#" style={{ color: 'inherit', textDecoration: 'none' }}>Terms</a>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } } input::placeholder { color: #999; }`}</style>
    </div>
  );
}
