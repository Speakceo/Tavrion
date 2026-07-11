import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useLearnerCourses } from '../hooks/useLearnerCourses';
import { subscribeLearnerCourses } from '../utils/learnerCourses';
import { TavrionMark } from './TavrionLogo';
import {
  Home, Users as UsersIcon, BarChart3, Share2, Calendar, Bookmark,
  Video, Users as TeamIcon, FolderLock, Sparkles, BookOpen, Clock, CheckCircle,
  ChevronRight, MessageSquare, Phone, LogOut, Settings, Upload, Bell,
  ListChecks, Headphones, User, ChevronDown, Activity, Building2, Mail, Menu, X,
  Award, Target, FileText, Library, ClipboardCheck,
} from 'lucide-react';
import { getOrgLogoUrl } from '../utils/orgSettings';
import { TestModeToggle } from '../modules/assessment/components/TestModeToggle';
import { useDocumentTitle } from '../lib/seo';

function useWindowWidth() {
  const [width, setWidth] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener('resize', fn, { passive: true });
    return () => window.removeEventListener('resize', fn);
  }, []);
  return width;
}

const PAGE_TITLES: Record<string, { label: string; section: string }> = {
  '/dashboard': { label: 'Home', section: 'Overview' },
  '/social': { label: 'Social', section: 'Community' },
  '/polls': { label: 'Polls', section: 'Community' },
  '/events': { label: 'Events', section: 'Community' },
  '/saved': { label: 'Saved', section: 'Library' },
  '/shots': { label: 'Shots', section: 'Content' },
  '/best-calls': { label: 'Best Calls', section: 'Library' },
  '/certificates': { label: 'My Certificates', section: 'Learning' },
  '/books': { label: 'Books', section: 'Library' },
  '/owner/books': { label: 'Books Library', section: 'Owner Portal' },
  '/my-team': { label: 'My Team', section: 'People' },
  '/vault': { label: 'Vault', section: 'Library' },
  '/my-space': { label: 'Settings', section: 'Account' },
  '/courses': { label: 'Assigned Learning', section: 'Learning' },
  '/recent-learning': { label: 'Recent Learning', section: 'Learning' },
  '/completed-learning': { label: 'Completed Learning', section: 'Learning' },
  '/ai-tutor': { label: 'AI Tutor', section: 'AI Tools' },
  '/mock-calls': { label: 'Mock Calls', section: 'AI Tools' },
  '/live-calls': { label: 'Live Calls', section: 'AI Tools' },
  '/admin/users': { label: 'User Management', section: 'Admin' },
  '/admin/teams': { label: 'Team Management', section: 'Admin' },
  '/admin/courses': { label: 'Course Management', section: 'Admin' },
  '/admin/uploaded-courses': { label: 'Uploaded Courses', section: 'Admin' },
  '/admin/best-calls': { label: 'Best Calls', section: 'Admin' },
  '/admin/course-tracking': { label: 'Course Tracking', section: 'Admin' },
  '/admin/analytics': { label: 'Analytics', section: 'Admin' },
  '/admin/email-nudges': { label: 'Email Nudges', section: 'Admin' },
  '/test': { label: 'Tavrion Test', section: 'Admin' },
  '/test/library': { label: 'Assessment Library', section: 'Tavrion Test' },
  '/admin/assignment-rules': { label: 'Assignment Rules', section: 'Admin' },
  '/admin/policy-versions': { label: 'Policies', section: 'Admin' },
  '/policies': { label: 'Policies', section: 'Learning' },
  '/owner': { label: 'Platform Overview', section: 'Owner Portal' },
};

export function Layout({ children }: { children: React.ReactNode }) {
  const { profile, organization, signOut } = useAuth();
  const { stats: learnerStats } = useLearnerCourses(profile?.id);
  const location = useLocation();
  const navigate = useNavigate();
  const [channelsExpanded, setChannelsExpanded] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [recentNotifs, setRecentNotifs] = useState<{ id: string; text: string; time: string }[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const width = useWindowWidth();
  const isMobile = width < 768;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  useEffect(() => {
    if (!profile) return;
    fetchNotifications();
    const unsubscribe = subscribeLearnerCourses(profile.id, fetchNotifications);
    return unsubscribe;
  }, [profile]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  const fetchNotifications = async () => {
    if (!profile) return;
    try {
      const { data: events } = await supabase
        .from('events')
        .select('id, title, event_date')
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(3);

      const [{ data: enrollments }, { data: uploaded }] = await Promise.all([
        supabase
          .from('user_course_enrollments')
          .select('id, enrolled_at, course:courses(title)')
          .eq('user_id', profile.id)
          .order('enrolled_at', { ascending: false })
          .limit(3),
        supabase
          .from('uploaded_course_assignments')
          .select('id, created_at, course:uploaded_courses(title)')
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);

      const notifs: { id: string; text: string; time: string }[] = [];

      (events || []).forEach((e: any) => {
        notifs.push({ id: e.id, text: `Upcoming: ${e.title}`, time: formatRelTime(e.event_date) });
      });

      (enrollments || []).forEach((en: any) => {
        if (en.course?.title) notifs.push({ id: en.id, text: `Course assigned: ${en.course.title}`, time: formatRelTime(en.enrolled_at) });
      });

      (uploaded || []).forEach((row: any) => {
        if (row.course?.title) notifs.push({ id: `up-${row.id}`, text: `Course assigned: ${row.course.title}`, time: formatRelTime(row.created_at) });
      });

      notifs.sort((a, b) => b.time.localeCompare(a.time));
      setRecentNotifs(notifs.slice(0, 5));
      setNotifCount(notifs.length);
    } catch {
      // silent
    }
  };

  const formatRelTime = (iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const d = Math.floor(diff / 86400000);
    if (d === 0) return 'Today';
    if (d === 1) return 'Yesterday';
    if (d < 0) return `In ${Math.abs(d)}d`;
    return `${d}d ago`;
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setShowUserMenu(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotifications(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentPage = PAGE_TITLES[location.pathname]
    || (location.pathname.startsWith('/books') ? PAGE_TITLES['/books'] : null)
    || (location.pathname.startsWith('/owner/books') ? PAGE_TITLES['/owner/books'] : null)
    || (location.pathname.startsWith('/test') ? PAGE_TITLES[location.pathname] || { label: 'Tavrion Test', section: 'Admin' } : null)
    || { label: 'Tavrion', section: '' };
  useDocumentTitle(currentPage.label);
  const orgLogo = getOrgLogoUrl(organization);

  const userNavigation = [
    { name: 'Home', href: '/dashboard', icon: Home },
    { name: 'Social', href: '/social', icon: Share2 },
    { name: 'Polls', href: '/polls', icon: BarChart3 },
    { name: 'Events', href: '/events', icon: Calendar },
    { name: 'Saved', href: '/saved', icon: Bookmark },
    { name: 'Books', href: '/books', icon: Library },
    { name: 'Shots', href: '/shots', icon: Video },
    { name: 'Best Calls', href: '/best-calls', icon: Headphones },
    { name: 'My Team', href: '/my-team', icon: TeamIcon },
    { name: 'Vault', href: '/vault', icon: FolderLock },
    { name: 'My Space', href: '/my-space', icon: Sparkles },
    { name: 'Assigned Learning', href: '/courses', icon: BookOpen },
    { name: 'Policies', href: '/policies', icon: FileText },
    { name: 'Recent Learning', href: '/recent-learning', icon: Clock },
    { name: 'Completed Learning', href: '/completed-learning', icon: CheckCircle },
    { name: 'My Certificates', href: '/certificates', icon: Award },
  ];

  const aiTools = [
    { name: 'AI Tutor', href: '/ai-tutor', icon: MessageSquare },
    { name: 'Mock Calls', href: '/mock-calls', icon: Phone },
    { name: 'Live Calls', href: '/live-calls', icon: Phone },
  ];

  const adminNavigation = [
    { name: 'Manage Users', href: '/admin/users', icon: UsersIcon, roles: ['super_admin', 'admin'] },
    { name: 'Manage Teams', href: '/admin/teams', icon: TeamIcon, roles: ['super_admin', 'admin'] },
    { name: 'Manage Courses', href: '/admin/courses', icon: Settings, roles: ['super_admin', 'admin', 'trainer'] },
    { name: 'Uploaded Courses', href: '/admin/uploaded-courses', icon: Upload, roles: ['super_admin', 'admin', 'trainer'] },
    { name: 'Best Calls', href: '/admin/best-calls', icon: Headphones, roles: ['super_admin', 'admin', 'trainer'] },
    { name: 'Course Tracking', href: '/admin/course-tracking', icon: ListChecks, roles: ['super_admin', 'admin', 'trainer'] },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, roles: ['super_admin', 'admin'] },
    { name: 'Email Nudges', href: '/admin/email-nudges', icon: Mail, roles: ['super_admin', 'admin'] },
    { name: 'Tavrion Test', href: '/test', icon: ClipboardCheck, roles: ['super_admin', 'admin', 'trainer'] },
    { name: 'Assignment Rules', href: '/admin/assignment-rules', icon: Target, roles: ['super_admin', 'admin', 'trainer'] },
    { name: 'Policies', href: '/admin/policy-versions', icon: FileText, roles: ['super_admin', 'admin', 'trainer'] },
  ];

  const filteredAdminNav = adminNavigation.filter((item) => item.roles.includes(profile?.role || ''));
  const isAdmin = ['super_admin', 'admin', 'trainer'].includes(profile?.role || '');
  const mobileNavExtra = isMobile && currentPage.section ? 44 : 0;
  const navOffset = 52 + mobileNavExtra;

  const navLinkClass = (href: string): React.CSSProperties => {
    const active = location.pathname === href || (href !== '/dashboard' && location.pathname.startsWith(href + '/'));
    return {
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '7px 10px', borderRadius: 7,
      fontSize: 13, fontWeight: active ? 600 : 500,
      color: active ? '#171717' : '#666666',
      background: active ? '#f0f0f0' : 'transparent',
      textDecoration: 'none',
      transition: 'all 0.12s',
    };
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fafafa', fontFamily: '"Geist", "Inter", system-ui, -apple-system, sans-serif' }}>

      {/* ── MOBILE SIDEBAR OVERLAY ── */}
      {isMobile && mobileSidebarOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 45, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* ── TOP NAV ── */}
      <nav style={{ background: '#ffffff', boxShadow: 'rgba(0,0,0,0.08) 0px -1px 0px 0px inset', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ maxWidth: '100%', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 52 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Mobile hamburger */}
            {isMobile && (
              <button
                onClick={() => setMobileSidebarOpen(o => !o)}
                style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 7, color: '#808080', display: 'flex', alignItems: 'center', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#171717'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#808080'; }}
              >
                {mobileSidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            )}
            <Link to="/dashboard" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
              {orgLogo ? (
                <img src={orgLogo} alt="" style={{ width: 28, height: 28, borderRadius: 8, objectFit: 'cover' }} />
              ) : (
                <TavrionMark size={28} />
              )}
              <span className="hidden sm:inline" style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.04em', color: '#171717' }}>
                {organization?.name || 'Tavrion'}
              </span>
            </Link>

            {/* Breadcrumb — desktop only */}
            {!isMobile && currentPage.section && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#bbb' }}>·</span>
                <span style={{ fontSize: 12, color: '#808080', fontWeight: 500 }}>{currentPage.section}</span>
                <ChevronRight size={10} color="#bbb" />
                <span style={{ fontSize: 12, color: '#4d4d4d', fontWeight: 600 }}>{currentPage.label}</span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <TestModeToggle />
            {/* Activity */}
            <Link to="/social" style={{ padding: 7, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 7, color: '#808080', display: 'flex', alignItems: 'center', textDecoration: 'none', transition: 'all 0.12s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#171717'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#808080'; }}
            >
              <Activity size={16} />
            </Link>

            {/* Notifications */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                style={{ padding: 7, background: 'transparent', border: 'none', cursor: 'pointer', borderRadius: 7, color: '#808080', display: 'flex', alignItems: 'center', position: 'relative', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; e.currentTarget.style.color = '#171717'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#808080'; }}
              >
                <Bell size={16} />
                {notifCount > 0 && (
                  <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, background: '#171717', borderRadius: '50%', border: '1.5px solid white' }} />
                )}
              </button>
              {showNotifications && (
                <div style={{ position: 'absolute', top: 40, right: 0, width: isMobile ? 'min(300px, calc(100vw - 24px))' : 300, background: 'white', borderRadius: 10, boxShadow: 'rgba(0,0,0,0.12) 0px 0px 0px 1px, rgba(0,0,0,0.08) 0px 8px 24px', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#171717' }}>Notifications</span>
                    {notifCount > 0 && <span style={{ fontSize: 11, color: '#808080' }}>{notifCount} new</span>}
                  </div>
                  {recentNotifs.length === 0 ? (
                    <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: '#808080' }}>No notifications</div>
                  ) : (
                    recentNotifs.map(n => (
                      <div key={n.id} style={{ padding: '10px 16px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                        <span style={{ fontSize: 12, color: '#4d4d4d', flex: 1 }}>{n.text}</span>
                        <span style={{ fontSize: 10, color: '#aaa', flexShrink: 0 }}>{n.time}</span>
                      </div>
                    ))
                  )}
                  <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 12 }}>
                    <Link to="/courses" style={{ fontSize: 12, color: '#171717', fontWeight: 600, textDecoration: 'none' }} onClick={() => setShowNotifications(false)}>
                      My courses →
                    </Link>
                    <Link to="/events" style={{ fontSize: 12, color: '#808080', textDecoration: 'none' }} onClick={() => setShowNotifications(false)}>
                      Events →
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* User avatar + dropdown */}
            <div ref={userMenuRef} style={{ position: 'relative', marginLeft: 4 }}>
              <button
                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 8px', background: showUserMenu ? '#f5f5f5' : 'transparent', border: 'none', cursor: 'pointer', borderRadius: 8, transition: 'background 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; }}
                onMouseLeave={e => { if (!showUserMenu) e.currentTarget.style.background = 'transparent'; }}
              >
                <div style={{ width: 28, height: 28, background: '#171717', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 11 }}>
                  {profile?.full_name?.charAt(0)?.toUpperCase() || 'T'}
                </div>
                <span className="hidden sm:inline" style={{ fontSize: 12, fontWeight: 600, color: '#171717' }}>{profile?.full_name?.split(' ')[0]}</span>
                <ChevronDown size={11} color="#808080" className="hidden sm:block" />
              </button>
              {showUserMenu && (
                <div style={{ position: 'absolute', top: 42, right: 0, width: 220, background: 'white', borderRadius: 10, boxShadow: 'rgba(0,0,0,0.12) 0px 0px 0px 1px, rgba(0,0,0,0.08) 0px 8px 24px', zIndex: 100, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#171717' }}>{profile?.full_name}</div>
                    <div style={{ fontSize: 11, color: '#808080', marginTop: 2 }}>{profile?.unique_id} · {profile?.role?.replace('_', ' ')}</div>
                    {profile?.department && <div style={{ fontSize: 11, color: '#aaa', marginTop: 1 }}>{profile.department}</div>}
                  </div>
                  <div style={{ padding: '6px 8px' }}>
                    <Link to="/my-space" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, fontSize: 13, color: '#4d4d4d', textDecoration: 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <User size={13} /> My Space
                    </Link>
                    <Link to="/dashboard" onClick={() => setShowUserMenu(false)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, fontSize: 13, color: '#4d4d4d', textDecoration: 'none', transition: 'background 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f5f5f5'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <Home size={13} /> Dashboard
                    </Link>
                  </div>
                  <div style={{ padding: '6px 8px', borderTop: '1px solid #f0f0f0' }}>
                    <button onClick={() => { setShowUserMenu(false); handleSignOut(); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, fontSize: 13, color: '#c0392b', background: 'none', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', transition: 'background 0.1s' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#fff5f5'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <LogOut size={13} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {isMobile && currentPage.section && (
          <div style={{ padding: '8px 16px 10px', borderTop: '1px solid #f5f5f5', background: '#fff' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#aaa', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 2 }}>{currentPage.section}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#171717', letterSpacing: '-0.02em' }}>{currentPage.label}</p>
          </div>
        )}
      </nav>

      <div style={{ display: 'flex' }}>
        {/* ── SIDEBAR ── */}
        <aside style={{
          width: 220, background: '#ffffff',
          boxShadow: isMobile ? 'rgba(0,0,0,0.12) 2px 0 12px' : 'rgba(0,0,0,0.06) 1px 0 0 0',
          minHeight: 'calc(100vh - 52px)', overflowY: 'auto', flexShrink: 0, padding: '10px 8px',
          // Mobile: fixed overlay slide-in
          ...(isMobile ? {
            position: 'fixed', top: navOffset, left: 0, bottom: 0, zIndex: 46,
            transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          } : {}),
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {userNavigation.map(item => {
              const active = location.pathname === item.href;
              return (
                <Link key={item.name} to={item.href} style={navLinkClass(item.href)}
                  onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#171717'; e.currentTarget.style.background = '#f5f5f5'; } }}
                  onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#666666'; e.currentTarget.style.background = 'transparent'; } }}
                >
                  <item.icon size={14} />
                  <span>{item.name}</span>
                  {item.href === '/courses' && learnerStats.pending > 0 && (
                    <span style={{ marginLeft: 'auto', minWidth: 18, height: 18, padding: '0 6px', borderRadius: 999, background: '#171717', color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {learnerStats.pending}
                    </span>
                  )}
                  {active && item.href !== '/courses' && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#171717' }} />}
                  {active && item.href === '/courses' && learnerStats.pending === 0 && <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: '#171717' }} />}
                </Link>
              );
            })}
          </div>

          <div style={{ marginTop: 14 }}>
            <button onClick={() => setChannelsExpanded(!channelsExpanded)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '5px 10px', borderRadius: 7, background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'color 0.12s' }}>
              Channels
              <ChevronRight size={11} style={{ transition: 'transform 0.2s', transform: channelsExpanded ? 'rotate(90deg)' : 'rotate(0deg)', color: '#bbb' }} />
            </button>
            {channelsExpanded && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginTop: 2 }}>
                {['general', 'announcements'].map(ch => (
                  <Link key={ch} to="/social" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 7, fontSize: 13, color: '#666666', textDecoration: 'none', transition: 'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#171717'; e.currentTarget.style.background = '#f5f5f5'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#666666'; e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ color: '#bbb' }}>#</span> {ch}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* AI Tools */}
          <div style={{ marginTop: 14, borderTop: '1px solid #ebebeb', paddingTop: 10 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px 6px' }}>AI Tools</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {aiTools.map(item => {
                const active = location.pathname === item.href;
                return (
                  <Link key={item.name} to={item.href} style={navLinkClass(item.href)}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#171717'; e.currentTarget.style.background = '#f5f5f5'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#666666'; e.currentTarget.style.background = 'transparent'; } }}
                  >
                    <item.icon size={14} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Admin */}
          {isAdmin && filteredAdminNav.length > 0 && (
            <div style={{ marginTop: 14, borderTop: '1px solid #ebebeb', paddingTop: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px 6px' }}>Admin</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {filteredAdminNav.map(item => {
                  const active = location.pathname === item.href;
                  return (
                    <Link key={item.name} to={item.href} style={navLinkClass(item.href)}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#171717'; e.currentTarget.style.background = '#f5f5f5'; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#666666'; e.currentTarget.style.background = 'transparent'; } }}
                    >
                      <item.icon size={14} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Owner Portal */}
          {profile?.is_platform_owner && (
            <div style={{ marginTop: 14, borderTop: '1px solid #ebebeb', paddingTop: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#999', letterSpacing: '0.08em', textTransform: 'uppercase', padding: '3px 10px 6px' }}>Owner Portal</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {[
                  { name: 'Platform Overview', href: '/owner', icon: Building2 },
                  { name: 'Books Library', href: '/owner/books', icon: Library },
                  { name: 'Manage Courses', href: '/admin/courses', icon: BookOpen },
                  { name: 'Manage Users', href: '/admin/users', icon: UsersIcon },
                  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
                ].map(item => {
                  const active = location.pathname === item.href || location.pathname.startsWith('/owner/');
                  return (
                    <Link key={item.name} to={item.href} style={navLinkClass(item.href)}
                      onMouseEnter={e => { if (!active) { e.currentTarget.style.color = '#171717'; e.currentTarget.style.background = '#f5f5f5'; } }}
                      onMouseLeave={e => { if (!active) { e.currentTarget.style.color = '#666666'; e.currentTarget.style.background = 'transparent'; } }}
                    >
                      <item.icon size={14} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sign Out */}
          <div style={{ marginTop: 14, borderTop: '1px solid #ebebeb', paddingTop: 10 }}>
            <button onClick={handleSignOut} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 7, width: '100%', fontSize: 13, fontWeight: 500, color: '#666666', background: 'none', border: 'none', cursor: 'pointer', transition: 'all 0.12s', textAlign: 'left' }}
              onMouseEnter={e => { e.currentTarget.style.color = '#c0392b'; e.currentTarget.style.background = '#fff5f5'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#666666'; e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main style={{ flex: 1, padding: isMobile ? '14px 14px 20px' : 24, overflowY: 'auto', minHeight: `calc(100dvh - ${navOffset}px)`, maxWidth: isMobile ? '100%' : 'calc(100vw - 220px)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
