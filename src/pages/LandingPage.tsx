import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe as Globe2, ArrowRight, CheckCircle, Users, BookOpen, TrendingUp, BarChart3,
  Brain, Phone, Shield, Video, Star, ChevronRight, Play, Award, MessageSquare,
  Activity, Zap, Building2, Layers, Target, GraduationCap, Headphones, Lock, Globe,
  Check, Menu, X,
} from 'lucide-react';

const T = {
  bg: '#ffffff', bgSubtle: '#fafafa', bgSection: '#f5f5f5',
  text: '#171717', textBody: '#4d4d4d', textMuted: '#666666', textFaint: '#808080',
  border: 'rgba(0,0,0,0.08)', borderStrong: '#ebebeb', borderDark: '#171717',
  blue: '#0a72ef', pink: '#de1d8d', red: '#ff5b4f',
  shadowBorder: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
  shadowCard: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 2px, rgba(0,0,0,0.04) 0px 8px 8px -8px, #fafafa 0px 0px 0px 1px',
  shadowHover: 'rgba(0,0,0,0.12) 0px 0px 0px 1px, rgba(0,0,0,0.08) 0px 4px 8px, rgba(0,0,0,0.04) 0px 12px 16px -8px, #fafafa 0px 0px 0px 1px',
};

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

const STATS = [
  { value: '150+', label: 'Countries', accent: T.blue },
  { value: '2M+', label: 'Learners trained', accent: T.pink },
  { value: '98%', label: 'Completion rate', accent: T.red },
  { value: '40+', label: 'Languages', accent: T.blue },
];

const PIPELINE = [
  { step: 'Learn', desc: 'Assign courses, SCORM content, and AI-personalised paths to every learner worldwide.', accent: T.blue, icon: BookOpen },
  { step: 'Practice', desc: 'AI mock calls, live coaching sessions, and real-time feedback loops graded automatically.', accent: T.pink, icon: Phone },
  { step: 'Measure', desc: 'Live dashboards with completion, scores, and ROI across every region in one view.', accent: T.red, icon: BarChart3 },
];

const FEATURES = [
  { icon: Brain, title: 'AI-Powered Paths', body: 'Adaptive learning that responds to each learner\'s velocity, style, and performance signals in real time.', accent: T.blue },
  { icon: Phone, title: 'Call Intelligence', body: 'AI-graded mock calls with transcript scoring, tone analysis, and manager roll-up across regions.', accent: T.pink },
  { icon: Globe2, title: 'Global by Default', body: 'Deploy to 150+ countries with localisation, timezone scheduling, and regional compliance baked in.', accent: T.red },
  { icon: Shield, title: 'Enterprise Security', body: 'SOC 2 compliant. Role-based access, SSO, and end-to-end encryption — zero friction.', accent: T.blue },
  { icon: Video, title: 'SCORM + xAPI', body: 'Full SCORM 1.2/2004 support. Import existing content in minutes. No rebuild required.', accent: T.pink },
  { icon: BarChart3, title: 'Deep Analytics', body: 'Surface completion, performance, and ROI signals across every market from a single dashboard.', accent: T.red },
];

const SOLUTIONS = [
  {
    icon: GraduationCap, title: 'Sales Enablement', accent: T.blue,
    body: 'Ramp reps faster with AI mock calls, product certifications, and pitch scoring. Proven to increase close rates by 23%.',
    tags: ['Mock Calls', 'Certifications', 'Leaderboards'],
  },
  {
    icon: Target, title: 'Compliance Training', accent: T.pink,
    body: 'Mandatory training workflows, audit trails, and automated reminders. Full reporting for regulators.',
    tags: ['Audit Trails', 'Automated Nudges', 'Certificates'],
  },
  {
    icon: Layers, title: 'Onboarding at Scale', accent: T.red,
    body: 'Consistent global onboarding across 150+ countries. Localised content, role-specific paths, and progress tracking.',
    tags: ['Role Paths', 'Multi-language', 'Progress Tracking'],
  },
  {
    icon: Headphones, title: 'Customer Success', accent: T.blue,
    body: 'Train support and success teams on product changes instantly. Keep everyone sharp with live call coaching.',
    tags: ['Live Calls', 'Product Updates', 'AI Tutor'],
  },
  {
    icon: Building2, title: 'Partner Training', accent: T.pink,
    body: 'Extend your learning platform to partners, resellers, and distributors with org-level access controls.',
    tags: ['Multi-Org', 'Access Control', 'White Label'],
  },
  {
    icon: Users, title: 'Leadership Development', accent: T.red,
    body: 'Structured leadership paths, 360 feedback, and analytics that tie learning to business outcomes.',
    tags: ['360 Feedback', 'Analytics', 'Career Paths'],
  },
];

const ENTERPRISE_FEATURES = [
  { icon: Lock, title: 'SOC 2 Type II', body: 'Independently audited. Your data is encrypted at rest and in transit.' },
  { icon: Shield, title: 'SSO & SAML', body: 'Integrate with Okta, Azure AD, Google Workspace, or any SAML 2.0 provider.' },
  { icon: Globe, title: 'Data Residency', body: 'Choose where your data lives — EU, US, APAC, or a private cloud deployment.' },
  { icon: Users, title: 'RBAC', body: 'Granular role-based access control across every org, team, and content type.' },
  { icon: Activity, title: '99.99% SLA', body: 'Enterprise-grade uptime with dedicated support and 24/7 incident response.' },
  { icon: Layers, title: 'API & Webhooks', body: 'Deep integrations with your HRIS, CRM, and existing tech stack via REST API.' },
];

const PRICING_PLANS = [
  {
    name: 'Starter', price: 'Free', period: '',
    description: 'Perfect for small teams getting started.',
    accent: T.textBody, highlight: false,
    features: ['Up to 5 learners', '5 courses', 'Basic analytics', 'Email support', 'SCORM import'],
    cta: 'Get started free',
  },
  {
    name: 'Growth', price: '$12', period: '/user/month',
    description: 'For growing teams that need more power.',
    accent: T.blue, highlight: true,
    features: ['Up to 500 learners', 'Unlimited courses', 'AI Tutor + Mock Calls', 'Advanced analytics', 'Email nudges', 'Priority support', 'Custom branding'],
    cta: 'Start 14-day trial',
  },
  {
    name: 'Enterprise', price: 'Custom', period: '',
    description: 'For global organisations at scale.',
    accent: T.text, highlight: false,
    features: ['Unlimited learners', 'Multi-org management', 'SSO & SAML', 'Data residency choice', 'Dedicated CSM', 'SLA guarantee', 'Custom integrations', 'White-label option'],
    cta: 'Talk to sales',
  },
];

const TESTIMONIALS = [
  { quote: 'Tavrion transformed how we onboard across 30 markets. Completion jumped from 64% to 96% in six months.', name: 'Sarah Mitchell', role: 'Head of L&D, Global Fintech', avatar: 'SM' },
  { quote: 'The mock call AI is extraordinary. Our reps close 23% more deals after four weeks on the platform.', name: 'James Okonkwo', role: 'VP Sales Enablement, EMEA', avatar: 'JO' },
  { quote: 'Finally a platform built for genuine global scale. Real-time analytics across every region — one view.', name: 'Priya Sharma', role: 'Chief People Officer, TechScale', avatar: 'PS' },
];

const LOGOS = ['Meridian', 'NovaPay', 'AtlasOps', 'TechScale', 'GlobalBank', 'Stellar'];

const NAV_ITEMS = [
  { label: 'Platform', id: 'platform' },
  { label: 'Solutions', id: 'solutions' },
  { label: 'Enterprise', id: 'enterprise' },
  { label: 'Pricing', id: 'pricing' },
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function useWindowWidth() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return width;
}

export function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [activeTesti, setActiveTesti] = useState(0);
  const [activeNav, setActiveNav] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const width = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width < 1024;

  useEffect(() => {
    const fn = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', fn, { passive: true });
    return () => window.removeEventListener('scroll', fn);
  }, []);

  useEffect(() => {
    const t = setInterval(() => setActiveTesti(p => (p + 1) % TESTIMONIALS.length), 4800);
    return () => clearInterval(t);
  }, []);

  // Lock body scroll when mobile nav is open
  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileNavOpen]);

  const navScrolled = scrollY > 20;

  const cardBase: React.CSSProperties = {
    background: T.bg, borderRadius: 12,
    boxShadow: T.shadowCard, transition: 'box-shadow 0.2s',
  };

  return (
    <div style={{ background: T.bg, color: T.text, fontFamily: FONT, minHeight: '100vh', overflowX: 'hidden' }}>

      {/* ── MOBILE NAV OVERLAY ── */}
      {mobileNavOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      <div style={{
        position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 70,
        width: 280, background: T.bg,
        boxShadow: '4px 0 24px rgba(0,0,0,0.12)',
        transform: mobileNavOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        padding: '20px 16px',
        overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <Link to="/" onClick={() => setMobileNavOpen(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, background: T.text, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe2 size={13} color="white" />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.04em', color: T.text }}>
              Tav<span style={{ color: T.blue }}>rion</span>
            </span>
          </Link>
          <button onClick={() => setMobileNavOpen(false)} style={{ padding: 6, background: T.bgSection, border: 'none', borderRadius: 7, cursor: 'pointer', color: T.textMuted }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.label}
              onClick={() => { scrollTo(item.id); setMobileNavOpen(false); }}
              style={{
                fontSize: 15, fontWeight: 500, padding: '12px 14px', borderRadius: 8,
                color: T.textBody, background: 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = T.bgSection; e.currentTarget.style.color = T.text; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = T.textBody; }}
            >{item.label}</button>
          ))}
        </div>

        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 24, borderTop: `1px solid ${T.borderStrong}` }}>
          <Link to="/login" onClick={() => setMobileNavOpen(false)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 14, fontWeight: 500, color: T.text,
            background: T.bgSection, padding: '11px 20px', borderRadius: 7,
            textDecoration: 'none',
          }}>Sign in</Link>
          <Link to="/login" onClick={() => setMobileNavOpen(false)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            fontSize: 14, fontWeight: 600, color: 'white',
            background: T.text, padding: '11px 20px', borderRadius: 7,
            textDecoration: 'none',
          }}>Get started free <ArrowRight size={13} /></Link>
        </div>
      </div>

      {/* ── NAV ── */}
      <header style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
        background: navScrolled ? 'rgba(255,255,255,0.92)' : T.bg,
        backdropFilter: navScrolled ? 'blur(20px) saturate(180%)' : 'none',
        borderBottom: `1px solid ${navScrolled ? T.borderStrong : 'transparent'}`,
        transition: 'all 0.3s',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, background: T.text, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe2 size={16} color="white" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.04em', color: T.text }}>
              Tav<span style={{ color: T.blue }}>rion</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
            <nav style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              {NAV_ITEMS.map(item => (
                <button
                  key={item.label}
                  onClick={() => { scrollTo(item.id); setActiveNav(item.id); }}
                  style={{
                    fontSize: 14, fontWeight: 500, padding: '6px 14px', borderRadius: 7,
                    color: activeNav === item.id ? T.text : T.textMuted,
                    background: activeNav === item.id ? T.bgSection : 'transparent',
                    border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = T.text; e.currentTarget.style.background = T.bgSection; }}
                  onMouseLeave={e => { e.currentTarget.style.color = activeNav === item.id ? T.text : T.textMuted; e.currentTarget.style.background = activeNav === item.id ? T.bgSection : 'transparent'; }}
                >{item.label}</button>
              ))}
            </nav>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {!isMobile && (
              <>
                <Link to="/login" style={{ fontSize: 14, fontWeight: 500, color: T.textMuted, textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                  onMouseLeave={e => (e.currentTarget.style.color = T.textMuted)}
                >Sign in</Link>
                <Link to="/login" style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  fontSize: 14, fontWeight: 500, color: 'white',
                  background: T.text, padding: '8px 16px', borderRadius: 6,
                  textDecoration: 'none', transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#2d2d2d')}
                  onMouseLeave={e => (e.currentTarget.style.background = T.text)}
                >Get started <ArrowRight size={13} /></Link>
              </>
            )}
            {isMobile && (
              <button
                onClick={() => setMobileNavOpen(true)}
                style={{ padding: '7px 8px', background: T.bgSection, border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center', color: T.text }}
              >
                <Menu size={18} />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── HERO ── */}
      <section style={{ paddingTop: isMobile ? 96 : 140, paddingBottom: isMobile ? 60 : 100, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', top: -80, left: '50%', transform: 'translateX(-50%)',
          width: 900, height: 500, pointerEvents: 'none',
          background: 'radial-gradient(ellipse 70% 60% at 50% 40%, rgba(10,114,239,0.06) 0%, rgba(222,29,141,0.04) 40%, transparent 70%)',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{
              fontSize: 12, fontWeight: 500, color: T.blue,
              background: '#ebf5ff', padding: '4px 12px', borderRadius: 9999,
              boxShadow: T.shadowBorder,
            }}>Now in 40+ languages</span>
          </div>

          <h1 style={{
            fontSize: isMobile ? 38 : 'clamp(44px, 7vw, 72px)',
            fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 1.0,
            color: T.text, maxWidth: 800, margin: '0 auto 20px',
          }}>
            Train the world.<br />
            Scale without limits.
          </h1>

          <p style={{
            fontSize: isMobile ? 16 : 20, fontWeight: 400, color: T.textBody,
            lineHeight: 1.75, maxWidth: 520, margin: '0 auto 36px', letterSpacing: '-0.01em',
          }}>
            The enterprise learning platform for global organisations — AI coaching, live call training, and analytics in one system.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 48 }}>
            <Link to="/login" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: isMobile ? 14 : 15, fontWeight: 500, color: 'white',
              background: T.text, padding: isMobile ? '11px 22px' : '12px 28px', borderRadius: 6,
              textDecoration: 'none', transition: 'background 0.15s',
              boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2d2d2d')}
              onMouseLeave={e => (e.currentTarget.style.background = T.text)}
            >Start free trial <ArrowRight size={14} /></Link>
            <button
              onClick={() => scrollTo('platform')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: isMobile ? 14 : 15, fontWeight: 500, color: T.text,
                background: T.bg, padding: isMobile ? '11px 18px' : '12px 24px', borderRadius: 6,
                border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                boxShadow: T.shadowBorder,
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = T.shadowHover)}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = T.shadowBorder)}
            >
              <div style={{ width: 26, height: 26, background: T.bgSubtle, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadowBorder }}>
                <Play size={9} style={{ marginLeft: 2 }} />
              </div>
              See the platform
            </button>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? 14 : 24, fontSize: 13, color: T.textFaint }}>
            {['No credit card required', '14-day free trial', 'Enterprise SLA'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <CheckCircle size={13} style={{ color: '#10b981' }} /> {item}
              </div>
            ))}
          </div>

          {/* Dashboard mockup — hidden on small mobile */}
          {!isMobile && (
            <div style={{
              marginTop: 72, background: T.bg, borderRadius: '12px 12px 0 0',
              boxShadow: T.shadowCard, overflow: 'hidden',
              border: `1px solid ${T.borderStrong}`, maxWidth: 960, marginLeft: 'auto', marginRight: 'auto',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', background: T.bgSubtle, borderBottom: `1px solid ${T.borderStrong}` }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5b4f' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#10b981' }} />
                <div style={{ flex: 1, marginLeft: 8, background: T.bg, border: `1px solid ${T.borderStrong}`, borderRadius: 6, padding: '4px 12px', fontSize: 11, color: T.textFaint, maxWidth: 240 }}>
                  app.jointavrion.com/dashboard
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: T.borderStrong }}>
                {[
                  { icon: Users, label: 'Active Learners', value: '12,847', delta: '+18%', accent: T.blue },
                  { icon: BookOpen, label: 'Completed', value: '94,203', delta: '+34%', accent: T.pink },
                  { icon: TrendingUp, label: 'Avg. Score', value: '87.4%', delta: '+6%', accent: T.red },
                ].map(card => (
                  <div key={card.label} style={{ background: T.bg, padding: '20px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <div style={{ width: 32, height: 32, background: T.bgSubtle, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadowBorder }}>
                        <card.icon size={14} style={{ color: card.accent }} />
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#10b981', background: '#f0fdf4', padding: '2px 8px', borderRadius: 9999 }}>{card.delta}</span>
                    </div>
                    <p style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', color: T.text, marginBottom: 2 }}>{card.value}</p>
                    <p style={{ fontSize: 12, color: T.textFaint }}>{card.label}</p>
                  </div>
                ))}
              </div>
              <div style={{ padding: '20px 24px', borderTop: `1px solid ${T.borderStrong}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.textBody }}>Global Completion Rate</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: T.text }}>96.2%</span>
                </div>
                <div style={{ background: T.bgSection, borderRadius: 100, height: 4, overflow: 'hidden' }}>
                  <div style={{ width: '96.2%', height: '100%', background: `linear-gradient(90deg, ${T.blue}, ${T.pink})`, borderRadius: 100 }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  {['Americas', 'Europe', 'Asia Pac', 'MENA', 'LatAm'].map(r => (
                    <span key={r} style={{ fontSize: 10, color: T.textFaint }}>{r}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── LOGO BAR ── */}
      <section style={{ borderTop: `1px solid ${T.borderStrong}`, borderBottom: `1px solid ${T.borderStrong}`, padding: '20px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 20px', textAlign: 'center' }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>Trusted by global enterprises</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: isMobile ? 24 : 48 }}>
            {LOGOS.map(name => (
              <span key={name} style={{ fontSize: isMobile ? 12 : 14, fontWeight: 700, color: T.borderStrong, letterSpacing: '-0.02em', transition: 'color 0.15s', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget.style.color = T.textBody)}
                onMouseLeave={e => (e.currentTarget.style.color = T.borderStrong)}
              >{name}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ padding: isMobile ? '48px 20px' : '96px 24px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 1, background: T.borderStrong, borderRadius: 12, overflow: 'hidden', boxShadow: T.shadowCard }}>
          {STATS.map(stat => (
            <div key={stat.label} style={{ background: T.bg, padding: isMobile ? '28px 16px' : '40px 32px', textAlign: 'center' }}>
              <p style={{ fontSize: isMobile ? 36 : 'clamp(36px,5vw,52px)', fontWeight: 700, letterSpacing: '-0.045em', color: T.text, lineHeight: 1, marginBottom: 8 }}>{stat.value}</p>
              <p style={{ fontSize: 12, color: T.textFaint, fontWeight: 500 }}>{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── PLATFORM ── */}
      <section id="platform" style={{ borderTop: `1px solid ${T.borderDark}`, borderBottom: `1px solid ${T.borderDark}`, padding: isMobile ? '60px 20px' : '80px 24px', background: T.bg, scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>The Platform</p>
            <h2 style={{ fontSize: isMobile ? 28 : 'clamp(28px,4vw,40px)', fontWeight: 700, letterSpacing: '-0.04em', color: T.text, marginBottom: 14 }}>
              Everything your global team needs
            </h2>
            <p style={{ fontSize: isMobile ? 15 : 17, color: T.textBody, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              One platform. Every region. No compromise on quality.
            </p>
          </div>

          {/* How it works */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: isMobile ? 32 : 48, marginBottom: 64 }}>
            {PIPELINE.map((step, i) => (
              <div key={step.step} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: step.accent, fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div style={{ flex: 1, height: 1, background: (!isMobile && i < 2) ? T.borderStrong : 'transparent' }} />
                </div>
                <div style={{ width: 40, height: 40, background: T.bgSubtle, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: T.shadowBorder }}>
                  <step.icon size={18} style={{ color: step.accent }} />
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.03em', color: step.accent }}>{step.step}</h3>
                <p style={{ fontSize: 14, color: T.textBody, lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Feature cards */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 12 }}>
            {FEATURES.map(feat => (
              <div
                key={feat.title}
                style={{ ...cardBase, padding: isMobile ? 20 : 28, cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadowHover}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadowCard}
              >
                <div style={{ width: 40, height: 40, background: T.bgSubtle, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14, boxShadow: T.shadowBorder }}>
                  <feat.icon size={18} style={{ color: feat.accent }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.03em', color: T.text, marginBottom: 8 }}>{feat.title}</h3>
                <p style={{ fontSize: 14, color: T.textBody, lineHeight: 1.7, marginBottom: 16 }}>{feat.body}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 500, color: feat.accent }}>
                  Learn more <ChevronRight size={13} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOLUTIONS ── */}
      <section id="solutions" style={{ padding: isMobile ? '60px 20px' : '96px 24px', background: T.bgSubtle, scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Solutions</p>
            <h2 style={{ fontSize: isMobile ? 28 : 'clamp(28px,4vw,40px)', fontWeight: 700, letterSpacing: '-0.04em', color: T.text, marginBottom: 14 }}>
              Built for every team
            </h2>
            <p style={{ fontSize: isMobile ? 15 : 17, color: T.textBody, maxWidth: 480, margin: '0 auto', lineHeight: 1.7 }}>
              From sales floors to compliance departments — Tavrion adapts to your workflow.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 14 }}>
            {SOLUTIONS.map(sol => (
              <div
                key={sol.title}
                style={{ background: T.bg, borderRadius: 12, padding: isMobile ? 20 : 28, boxShadow: T.shadowCard, transition: 'box-shadow 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadowHover}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadowCard}
              >
                <div style={{ width: 44, height: 44, background: `${sol.accent}10`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, boxShadow: `${sol.accent}30 0px 0px 0px 1px` }}>
                  <sol.icon size={20} style={{ color: sol.accent }} />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.03em', color: T.text, marginBottom: 10 }}>{sol.title}</h3>
                <p style={{ fontSize: 14, color: T.textBody, lineHeight: 1.7, marginBottom: 16 }}>{sol.body}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {sol.tags.map(tag => (
                    <span key={tag} style={{ fontSize: 11, fontWeight: 600, color: sol.accent, background: `${sol.accent}10`, padding: '3px 10px', borderRadius: 9999, letterSpacing: '0.02em' }}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 44 }}>
            <Link to="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              fontSize: 15, fontWeight: 500, color: 'white',
              background: T.text, padding: '12px 28px', borderRadius: 6,
              textDecoration: 'none', transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#2d2d2d')}
              onMouseLeave={e => (e.currentTarget.style.background = T.text)}
            >Find your solution <ArrowRight size={15} /></Link>
          </div>
        </div>
      </section>

      {/* ── ENTERPRISE ── */}
      <section id="enterprise" style={{ padding: isMobile ? '60px 20px' : '96px 24px', background: T.bg, scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? '1fr' : '1fr 1fr', gap: isMobile ? 40 : 64, alignItems: 'center', marginBottom: 72 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Enterprise</p>
              <h2 style={{ fontSize: isMobile ? 28 : 'clamp(28px,4vw,40px)', fontWeight: 700, letterSpacing: '-0.04em', color: T.text, lineHeight: 1.15, marginBottom: 18 }}>
                Built for organisations<br />that can't afford to fail.
              </h2>
              <p style={{ fontSize: isMobile ? 14 : 16, color: T.textBody, lineHeight: 1.75, marginBottom: 28 }}>
                Tavrion is architected for the security, compliance, and scale demands of global enterprises. Dedicated infrastructure. Zero-compromise security.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {['Dedicated CSM and onboarding team', '24/7 enterprise support with 1-hour SLA', 'Custom integrations with your HRIS & CRM', 'Private cloud or on-premise deployment option'].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: T.textBody }}>
                    <CheckCircle size={14} style={{ color: '#10b981', flexShrink: 0, marginTop: 2 }} /> {f}
                  </li>
                ))}
              </ul>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: 'white', background: T.text, padding: '10px 22px', borderRadius: 6, textDecoration: 'none', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#2d2d2d')}
                  onMouseLeave={e => (e.currentTarget.style.background = T.text)}
                >Book a demo</Link>
                <button
                  onClick={() => scrollTo('pricing')}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 500, color: T.text, background: T.bg, padding: '10px 22px', borderRadius: 6, border: 'none', cursor: 'pointer', boxShadow: T.shadowBorder, transition: 'box-shadow 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = T.shadowHover)}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = T.shadowBorder)}
                >View pricing <ChevronRight size={14} /></button>
              </div>
            </div>

            {/* AI Call card */}
            <div style={{ ...cardBase, padding: isMobile ? 18 : 24, borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 600, color: T.text }}>Mock Call Analysis</p>
                  <p style={{ fontSize: 11, color: T.textFaint, marginTop: 2 }}>London Team · 14 Jun 2026</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f0fdf4', padding: '5px 10px', borderRadius: 9999, boxShadow: T.shadowBorder }}>
                  <Activity size={11} style={{ color: '#10b981' }} />
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#10b981' }}>Live</span>
                </div>
              </div>
              {[
                { label: 'Objection Handling', score: 91, accent: T.blue },
                { label: 'Tone & Empathy', score: 84, accent: T.pink },
                { label: 'Product Knowledge', score: 96, accent: '#10b981' },
                { label: 'Call Structure', score: 78, accent: T.red },
              ].map(m => (
                <div key={m.label} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontSize: 12, color: T.textBody }}>{m.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{m.score}%</span>
                  </div>
                  <div style={{ background: T.bgSection, borderRadius: 100, height: 4 }}>
                    <div style={{ width: `${m.score}%`, height: '100%', background: m.accent, borderRadius: 100 }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 14, padding: 12, background: T.bgSubtle, borderRadius: 8, boxShadow: T.shadowBorder }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>AI Coach Feedback</p>
                <p style={{ fontSize: 13, color: T.textBody, lineHeight: 1.65 }}>"Strong product knowledge. Work on structure — open with rapport before discovery."</p>
              </div>
            </div>
          </div>

          {/* Security grid */}
          <div style={{ borderTop: `1px solid ${T.borderStrong}`, paddingTop: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 36, textAlign: 'center' }}>Security & Compliance</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(3,1fr)', gap: isMobile ? 12 : 16 }}>
              {ENTERPRISE_FEATURES.map(ef => (
                <div key={ef.title} style={{ display: 'flex', gap: 14, padding: '18px 0', borderBottom: `1px solid ${T.borderStrong}` }}>
                  <div style={{ width: 34, height: 34, background: T.bgSubtle, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: T.shadowBorder }}>
                    <ef.icon size={15} color={T.textBody} />
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: T.text, marginBottom: 3 }}>{ef.title}</p>
                    <p style={{ fontSize: 12, color: T.textBody, lineHeight: 1.6 }}>{ef.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section style={{ padding: isMobile ? '60px 20px' : '96px 24px', background: T.bgSubtle, borderTop: `1px solid ${T.borderStrong}` }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 14 }}>
              {[...Array(5)].map((_, i) => (
                <Star key={i} size={15} style={{ color: '#f59e0b', fill: '#f59e0b' }} />
              ))}
            </div>
            <h2 style={{ fontSize: isMobile ? 26 : 'clamp(28px,4vw,40px)', fontWeight: 700, letterSpacing: '-0.04em', color: T.text }}>Loved by learning leaders</h2>
          </div>

          <div style={{ maxWidth: 720, margin: '0 auto' }}>
            <div style={{ ...cardBase, padding: isMobile ? '28px 20px' : '48px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden', minHeight: 180 }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: [T.blue, T.pink, T.red][activeTesti], transition: 'background 0.6s' }} />
              <blockquote style={{ fontSize: isMobile ? 15 : 'clamp(16px,2.5vw,20px)', fontWeight: 400, color: T.textBody, lineHeight: 1.7, marginBottom: 24, letterSpacing: '-0.01em', fontStyle: 'italic' }}>
                "{TESTIMONIALS[activeTesti].quote}"
              </blockquote>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, background: T.text, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>
                  {TESTIMONIALS[activeTesti].avatar}
                </div>
                <div style={{ textAlign: 'left' }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{TESTIMONIALS[activeTesti].name}</p>
                  <p style={{ fontSize: 11, color: T.textFaint }}>{TESTIMONIALS[activeTesti].role}</p>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
              {TESTIMONIALS.map((_, i) => (
                <button key={i} onClick={() => setActiveTesti(i)} style={{
                  height: 3, borderRadius: 100, border: 'none', cursor: 'pointer',
                  width: i === activeTesti ? 24 : 8,
                  background: i === activeTesti ? T.text : T.borderStrong,
                  transition: 'all 0.3s',
                }} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="pricing" style={{ padding: isMobile ? '60px 20px' : '96px 24px', background: T.bg, scrollMarginTop: 60 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Pricing</p>
            <h2 style={{ fontSize: isMobile ? 28 : 'clamp(28px,4vw,40px)', fontWeight: 700, letterSpacing: '-0.04em', color: T.text, marginBottom: 14 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ fontSize: isMobile ? 15 : 17, color: T.textBody, maxWidth: 440, margin: '0 auto', lineHeight: 1.7 }}>
              Start free. Scale as you grow. No hidden fees, no lock-in contracts.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 14, maxWidth: 960, margin: '0 auto' }}>
            {PRICING_PLANS.map(plan => (
              <div
                key={plan.name}
                style={{
                  background: plan.highlight ? T.text : T.bg, borderRadius: 14,
                  padding: isMobile ? '24px 20px' : '32px 28px',
                  boxShadow: plan.highlight
                    ? 'rgba(0,0,0,0.2) 0px 0px 0px 1px, rgba(0,0,0,0.12) 0px 8px 24px'
                    : T.shadowCard,
                  position: 'relative', overflow: 'hidden',
                }}
              >
                {plan.highlight && (
                  <div style={{ position: 'absolute', top: 14, right: 14, fontSize: 10, fontWeight: 700, color: T.text, background: '#f5f5f5', padding: '3px 10px', borderRadius: 9999, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    Most popular
                  </div>
                )}
                <p style={{ fontSize: 12, fontWeight: 600, color: plan.highlight ? 'rgba(255,255,255,0.5)' : T.textFaint, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{plan.name}</p>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.045em', color: plan.highlight ? 'white' : T.text }}>{plan.price}</span>
                  {plan.period && <span style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.4)' : T.textFaint }}>{plan.period}</span>}
                </div>
                <p style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.5)' : T.textMuted, marginBottom: 24, lineHeight: 1.6 }}>{plan.description}</p>
                <div style={{ borderTop: `1px solid ${plan.highlight ? 'rgba(255,255,255,0.1)' : T.borderStrong}`, paddingTop: 20, marginBottom: 24 }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {plan.features.map(f => (
                      <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.8)' : T.textBody }}>
                        <div style={{ width: 15, height: 15, borderRadius: '50%', background: plan.highlight ? 'rgba(255,255,255,0.12)' : T.bgSection, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Check size={9} style={{ color: plan.highlight ? 'white' : '#10b981' }} />
                        </div>
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
                <Link to="/login" style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  fontSize: 14, fontWeight: 600,
                  color: plan.highlight ? T.text : 'white',
                  background: plan.highlight ? 'white' : T.text,
                  padding: '11px 18px', borderRadius: 8,
                  textDecoration: 'none', transition: 'all 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  {plan.cta} <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: T.textMuted, marginBottom: 4 }}>Need a custom quote for 1,000+ learners?</p>
            <a href="#" style={{ fontSize: 14, fontWeight: 600, color: T.blue, textDecoration: 'none' }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >Talk to our enterprise team →</a>
          </div>

          <div style={{ marginTop: 52, background: T.bgSubtle, borderRadius: 12, padding: isMobile ? '24px 20px' : '32px 40px', boxShadow: T.shadowBorder }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20, textAlign: 'center' }}>All plans include</p>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12 }}>
              {['99.9% uptime SLA', 'SCORM & xAPI support', 'Mobile-responsive', 'Email support', 'Data export', 'API access', 'Audit logs', 'GDPR compliant'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: T.textBody }}>
                  <CheckCircle size={12} style={{ color: '#10b981', flexShrink: 0 }} /> {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: T.text, padding: isMobile ? '60px 20px' : '96px 24px' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', padding: '4px 12px', borderRadius: 9999, border: '1px solid rgba(245,158,11,0.2)' }}>
              <Award size={11} style={{ display: 'inline', marginRight: 4 }} />#1 Global Learning Platform 2026
            </span>
          </div>
          <h2 style={{ fontSize: isMobile ? 32 : 'clamp(36px,6vw,56px)', fontWeight: 700, letterSpacing: '-0.045em', color: 'white', lineHeight: 1.05, marginBottom: 18 }}>
            Ready to go global?
          </h2>
          <p style={{ fontSize: isMobile ? 15 : 17, color: 'rgba(255,255,255,0.5)', marginBottom: 36, lineHeight: 1.7 }}>
            Join 2 million learners across 150 countries. No setup fees. No long contracts.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
            <Link to="/login" style={{
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 15, fontWeight: 500, color: T.text,
              background: 'white', padding: '13px 28px', borderRadius: 6,
              textDecoration: 'none', transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >Start free trial <ArrowRight size={15} /></Link>
            <button
              onClick={() => scrollTo('pricing')}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.7)',
                background: 'rgba(255,255,255,0.08)', padding: '13px 22px', borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
            ><MessageSquare size={15} /> View pricing</button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: `1px solid ${T.borderStrong}`, padding: isMobile ? '28px 20px' : '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, background: T.text, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Globe2 size={12} color="white" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.04em', color: T.text }}>
              Tav<span style={{ color: T.blue }}>rion</span>
            </span>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: isMobile ? 16 : 24 }}>
            {['Privacy', 'Terms', 'Security', 'Status', 'Contact'].map(item => (
              <a key={item} href="#" style={{ fontSize: 12, color: T.textFaint, textDecoration: 'none', transition: 'color 0.15s' }}
                onMouseEnter={e => (e.currentTarget.style.color = T.text)}
                onMouseLeave={e => (e.currentTarget.style.color = T.textFaint)}
              >{item}</a>
            ))}
          </div>
          <p style={{ fontSize: 11, color: T.textFaint }}>&copy; 2026 Tavrion, Inc.</p>
        </div>
      </footer>
    </div>
  );
}
