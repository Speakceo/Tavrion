import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard, Library, HelpCircle, Users, BarChart3, FileText,
  LogOut, ChevronDown, Menu, X, ArrowLeftRight, ClipboardCheck, Link2, UserCheck,
} from 'lucide-react';
import { getOrgLogoUrl } from '../../../utils/orgSettings';

const TEST_NAV = [
  { name: 'Dashboard', href: '/test', icon: LayoutDashboard },
  { name: 'Sessions', href: '/test/sessions', icon: UserCheck },
  { name: 'Assessment Library', href: '/test/library', icon: Library },
  { name: 'Question Bank', href: '/test/questions', icon: HelpCircle },
  { name: 'Public Links', href: '/test/links', icon: Link2 },
  { name: 'Assignments', href: '/test/assignments', icon: Users },
  { name: 'Analytics', href: '/test/analytics', icon: BarChart3 },
  { name: 'Reports', href: '/test/reports', icon: FileText },
];

const PAGE_TITLES: Record<string, string> = {
  '/test': 'Test Dashboard',
  '/test/sessions': 'Candidate Sessions',
  '/test/library': 'Assessment Library',
  '/test/questions': 'Question Bank',
  '/test/links': 'Public Links',
  '/test/assignments': 'Assignments',
  '/test/analytics': 'Analytics',
  '/test/reports': 'Reports',
};

export function TestLayout({ children }: { children: React.ReactNode }) {
  const { profile, organization, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const orgLogo = getOrgLogoUrl(organization);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const pageTitle = PAGE_TITLES[location.pathname]
    || (location.pathname.startsWith('/test/library/') ? 'Assessment Builder' : 'Tavrion Test');

  const navLink = (href: string): React.CSSProperties => {
    const active = location.pathname === href
      || (href !== '/test' && location.pathname.startsWith(href));
    return {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 10px', borderRadius: 7,
      fontSize: 13, fontWeight: active ? 600 : 500,
      color: active ? '#171717' : '#666',
      background: active ? '#f0f0f0' : 'transparent',
      textDecoration: 'none',
    };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: '"Geist", "Inter", system-ui, sans-serif' }}>
      <nav style={{ background: '#fff', boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.08)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => setMobileOpen((o) => !o)}
              className="sm:hidden"
              style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 7, color: '#808080' }}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {orgLogo ? (
                <img src={orgLogo} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
              ) : (
                <div style={{ width: 28, height: 28, background: '#171717', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ClipboardCheck size={13} color="white" />
                </div>
              )}
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#171717', letterSpacing: '-0.03em' }}>Tavrion Test</div>
                <div style={{ fontSize: 10, color: '#999' }}>{organization?.name || 'Assessments'}</div>
              </div>
            </div>
            <span style={{ fontSize: 11, color: '#bbb', display: 'none', sm: 'inline' } as React.CSSProperties}>·</span>
            <span className="hidden sm:inline" style={{ fontSize: 12, color: '#666', fontWeight: 500 }}>{pageTitle}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button
              onClick={() => navigate('/dashboard')}
              className="lt-btn-secondary"
              style={{ padding: '6px 12px', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}
              title="Switch back to LMS"
            >
              <ArrowLeftRight size={13} /> <span className="hidden sm:inline">LMS</span>
            </button>

            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: showUserMenu ? '#f5f5f5' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8 }}
              >
                <div style={{ width: 28, height: 28, background: '#171717', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 11 }}>
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'T'}
                </div>
                <ChevronDown size={11} color="#808080" className="hidden sm:block" />
              </button>
              {showUserMenu && (
                <div style={{ position: 'absolute', top: 42, right: 0, width: 200, background: '#fff', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{profile?.full_name}</div>
                    <div style={{ fontSize: 11, color: '#808080' }}>{profile?.role?.replace('_', ' ')}</div>
                  </div>
                  <div style={{ padding: 6 }}>
                    <button
                      onClick={async () => { setShowUserMenu(false); await signOut(); navigate('/login'); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', width: '100%', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#c0392b', borderRadius: 7 }}
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div style={{ display: 'flex' }}>
        <aside style={{
          width: 220, background: '#fff', boxShadow: 'inset -1px 0 0 rgba(0,0,0,0.06)',
          minHeight: 'calc(100vh - 52px)', padding: '10px 8px', flexShrink: 0,
          ...(mobileOpen ? {} : { display: 'none' }),
        }}
          className="sm:block"
        >
          {TEST_NAV.map((item) => (
            <Link key={item.href} to={item.href} style={navLink(item.href)}>
              <item.icon size={14} />
              {item.name}
            </Link>
          ))}
        </aside>

        <main style={{ flex: 1, padding: '20px 24px', maxWidth: 1200, width: '100%' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
