import { useEffect, useRef, useState, type MouseEvent } from 'react';
import {
  Award, BarChart3, BookOpen, Calendar, CheckCircle, Home, MessageSquare,
  Phone, TrendingUp, Users, Video, Zap,
} from 'lucide-react';

const T = {
  bg: '#ffffff',
  bgSubtle: '#fafafa',
  bgSection: '#f5f5f5',
  text: '#171717',
  textBody: '#4d4d4d',
  textMuted: '#666666',
  textFaint: '#808080',
  borderStrong: '#ebebeb',
  blue: '#0a72ef',
  pink: '#de1d8d',
  red: '#ff5b4f',
  shadowBorder: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
};

const SLIDES = [
  {
    id: 'dashboard',
    url: 'app.jointavrion.com/dashboard',
    title: 'Learning dashboard',
    eyebrow: 'Overview',
    activeNav: 0,
  },
  {
    id: 'mock-calls',
    url: 'app.jointavrion.com/mock-calls',
    title: 'AI mock calls',
    eyebrow: 'Practice',
    activeNav: 2,
  },
  {
    id: 'courses',
    url: 'app.jointavrion.com/courses',
    title: 'Assigned learning',
    eyebrow: 'Courses',
    activeNav: 1,
  },
  {
    id: 'analytics',
    url: 'app.jointavrion.com/admin/analytics',
    title: 'Team analytics',
    eyebrow: 'Insights',
    activeNav: 3,
  },
  {
    id: 'events',
    url: 'app.jointavrion.com/events',
    title: 'Live events',
    eyebrow: 'Community',
    activeNav: 4,
  },
] as const;

const NAV_ICONS = [Home, BookOpen, Phone, BarChart3, Calendar, Award];

function Shell({
  slide,
  compact,
  children,
}: {
  slide: (typeof SLIDES)[number];
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: compact ? '1fr' : '72px 1fr',
      minHeight: compact ? 250 : 360,
      minWidth: 0,
    }}>
      {!compact && (
        <div style={{
          background: T.text, padding: '14px 10px',
          display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 8,
          }}>T</div>
          {NAV_ICONS.map((Icon, i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: 8,
              background: i === slide.activeNav ? 'rgba(255,255,255,0.14)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon size={14} color={i === slide.activeNav ? '#fff' : 'rgba(255,255,255,0.45)'} />
            </div>
          ))}
        </div>
      )}
      <div style={{ background: T.bgSubtle, padding: compact ? 12 : 16, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: compact ? 10 : 14, gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, color: T.textFaint, marginBottom: 2, fontWeight: 500 }}>{slide.eyebrow}</p>
            <p style={{
              fontSize: compact ? 14 : 15, fontWeight: 700, color: T.text, letterSpacing: '-0.03em',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{slide.title}</p>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 600, color: T.blue, background: '#ebf5ff',
            padding: '4px 8px', borderRadius: 9999, flexShrink: 0,
          }}>Live</div>
        </div>
        {children}
      </div>
    </div>
  );
}

function DashboardSlide({ compact }: { compact: boolean }) {
  return (
    <Shell slide={SLIDES[0]} compact={compact}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: compact ? 6 : 8, marginBottom: 12 }}>
        {[
          { icon: Users, label: 'Learners', value: '12.8k', delta: '+18%', accent: T.blue },
          { icon: BookOpen, label: 'Completed', value: '94.2k', delta: '+34%', accent: T.pink },
          { icon: TrendingUp, label: 'Avg score', value: '87.4%', delta: '+6%', accent: T.red },
        ].map((card) => (
          <div key={card.label} style={{
            background: T.bg, borderRadius: 10, padding: compact ? '8px 6px' : '12px 10px',
            boxShadow: T.shadowBorder, minWidth: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{
                width: 22, height: 22, background: T.bgSubtle, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.icon size={11} style={{ color: card.accent }} />
              </div>
              {!compact && <span style={{ fontSize: 9, fontWeight: 600, color: '#10b981' }}>{card.delta}</span>}
            </div>
            <p style={{ fontSize: compact ? 13 : 16, fontWeight: 700, letterSpacing: '-0.04em', color: T.text, marginBottom: 1 }}>{card.value}</p>
            <p style={{ fontSize: 9, color: T.textFaint }}>{card.label}</p>
          </div>
        ))}
      </div>
      <div style={{ background: T.bg, borderRadius: 10, padding: compact ? 10 : 14, boxShadow: T.shadowBorder, marginBottom: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: T.textBody }}>Global completion</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>96.2%</span>
        </div>
        <div style={{ background: T.bgSection, borderRadius: 100, height: 5, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{
            width: '96.2%', height: '100%',
            background: `linear-gradient(90deg, ${T.blue}, ${T.pink})`,
            borderRadius: 100,
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {['AMER', 'EU', 'APAC', 'MENA'].map((r) => (
            <span key={r} style={{ fontSize: 9, color: T.textFaint, fontWeight: 500 }}>{r}</span>
          ))}
        </div>
      </div>
      {!compact && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 8 }}>
          <div style={{ background: T.bg, borderRadius: 10, padding: 12, boxShadow: T.shadowBorder }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 8 }}>Active journeys</p>
            {[
              { name: 'Sales ramp', pct: 82 },
              { name: 'Compliance Q3', pct: 64 },
              { name: 'Product update', pct: 91 },
            ].map((row) => (
              <div key={row.name} style={{ marginBottom: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 10, color: T.textMuted }}>{row.name}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: T.text }}>{row.pct}%</span>
                </div>
                <div style={{ background: T.bgSection, borderRadius: 100, height: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${row.pct}%`, height: '100%', background: T.text, borderRadius: 100 }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ background: T.bg, borderRadius: 10, padding: 12, boxShadow: T.shadowBorder }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 8 }}>AI coaching</p>
            <div style={{ background: T.bgSubtle, borderRadius: 8, padding: 10, border: `1px solid ${T.borderStrong}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Phone size={11} color={T.pink} />
                <span style={{ fontSize: 10, fontWeight: 600, color: T.text }}>Mock call score</span>
              </div>
              <p style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: T.text, marginBottom: 2 }}>91</p>
              <p style={{ fontSize: 9, color: T.textFaint }}>Objection handling · Tone</p>
            </div>
          </div>
        </div>
      )}
      {compact && (
        <div style={{ background: T.bg, borderRadius: 10, padding: 10, boxShadow: T.shadowBorder }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Phone size={11} color={T.pink} />
              <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>AI coaching score</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: T.text }}>91</span>
          </div>
        </div>
      )}
    </Shell>
  );
}

function MockCallsSlide({ compact }: { compact: boolean }) {
  return (
    <Shell slide={SLIDES[1]} compact={compact}>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{
          background: T.bg, borderRadius: 10, padding: compact ? 12 : 14, boxShadow: T.shadowBorder,
          minHeight: compact ? undefined : 160,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: T.text,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Phone size={16} color="#fff" />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Enterprise discovery</p>
              <p style={{ fontSize: 10, color: T.textFaint }}>AI buyer · Mid-market SaaS</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['Live', '4:12', 'Recording'].map((tag) => (
              <span key={tag} style={{
                fontSize: 9, fontWeight: 600, color: tag === 'Live' ? T.red : T.textMuted,
                background: tag === 'Live' ? '#fff1f0' : T.bgSection,
                padding: '3px 7px', borderRadius: 9999,
              }}>{tag}</span>
            ))}
          </div>
        </div>
        <div style={{ background: T.bg, borderRadius: 10, padding: compact ? 12 : 14, boxShadow: T.shadowBorder }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 10 }}>Score breakdown</p>
          {[
            { label: 'Objection handling', score: 94 },
            { label: 'Product knowledge', score: 88 },
            { label: 'Call structure', score: 91 },
            ...(compact ? [] : [{ label: 'Tone & empathy', score: 86 }]),
          ].map((row) => (
            <div key={row.label} style={{ marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: T.textMuted }}>{row.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: T.text }}>{row.score}</span>
              </div>
              <div style={{ background: T.bgSection, borderRadius: 100, height: 3, overflow: 'hidden' }}>
                <div style={{ width: `${row.score}%`, height: '100%', background: T.pink, borderRadius: 100 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
      {!compact && (
        <div style={{ background: T.bg, borderRadius: 10, padding: 12, boxShadow: T.shadowBorder }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <MessageSquare size={12} color={T.blue} />
            <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>AI coaching tip</span>
          </div>
          <p style={{ fontSize: 11, color: T.textBody, lineHeight: 1.5 }}>
            Strong discovery. Next: quantify pain before presenting pricing. Ask for the cost of delay.
          </p>
        </div>
      )}
    </Shell>
  );
}

function CoursesSlide({ compact }: { compact: boolean }) {
  const courses = [
    { title: 'Sales ramp · Week 1', status: 'In progress', pct: 68, mandatory: true },
    { title: 'SCORM · Product certification', status: 'Assigned', pct: 12, mandatory: true },
    { title: 'Objection handling masterclass', status: 'Completed', pct: 100, mandatory: false },
    { title: 'Compliance essentials 2026', status: 'Pending', pct: 0, mandatory: true },
  ];
  return (
    <Shell slide={SLIDES[2]} compact={compact}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {[
          { label: 'Assigned', value: '8' },
          { label: 'In progress', value: '3' },
          { label: 'Completed', value: '14' },
        ].map((stat) => (
          <div key={stat.label} style={{
            flex: 1, minWidth: 0, background: T.bg, borderRadius: 10, padding: compact ? '8px 8px' : '10px 12px',
            boxShadow: T.shadowBorder,
          }}>
            <p style={{ fontSize: compact ? 14 : 16, fontWeight: 700, color: T.text, letterSpacing: '-0.03em' }}>{stat.value}</p>
            <p style={{ fontSize: 9, color: T.textFaint }}>{stat.label}</p>
          </div>
        ))}
      </div>
      <div style={{ background: T.bg, borderRadius: 10, boxShadow: T.shadowBorder, overflow: 'hidden' }}>
        {courses.slice(0, compact ? 3 : 4).map((course, i, arr) => (
          <div key={course.title} style={{
            padding: '11px 12px',
            borderBottom: i < arr.length - 1 ? `1px solid ${T.borderStrong}` : 'none',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, background: T.bgSection,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <BookOpen size={12} color={T.textMuted} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {course.title}
                </p>
                {course.mandatory && !compact && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: T.text, background: T.bgSection, padding: '1px 5px', borderRadius: 4 }}>REQ</span>
                )}
              </div>
              <div style={{ background: T.bgSection, borderRadius: 100, height: 3, overflow: 'hidden' }}>
                <div style={{ width: `${course.pct}%`, height: '100%', background: T.text, borderRadius: 100 }} />
              </div>
            </div>
            {!compact && (
              <span style={{ fontSize: 9, fontWeight: 600, color: T.textMuted, flexShrink: 0 }}>{course.status}</span>
            )}
          </div>
        ))}
      </div>
    </Shell>
  );
}

function AnalyticsSlide({ compact }: { compact: boolean }) {
  return (
    <Shell slide={SLIDES[3]} compact={compact}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,minmax(0,1fr))', gap: compact ? 6 : 8, marginBottom: 10 }}>
        {[
          { label: 'Completion', value: '96%', accent: T.blue },
          { label: 'Avg quiz', value: '84%', accent: T.pink },
          { label: 'Active orgs', value: '42', accent: T.red },
        ].map((card) => (
          <div key={card.label} style={{ background: T.bg, borderRadius: 10, padding: compact ? 8 : 12, boxShadow: T.shadowBorder, minWidth: 0 }}>
            <p style={{ fontSize: compact ? 15 : 18, fontWeight: 700, letterSpacing: '-0.04em', color: T.text }}>{card.value}</p>
            <p style={{ fontSize: 9, color: T.textFaint }}>{card.label}</p>
            <div style={{ marginTop: 8, height: 3, background: T.bgSection, borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ width: '78%', height: '100%', background: card.accent, borderRadius: 100 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: T.bg, borderRadius: 10, padding: compact ? 10 : 12, boxShadow: T.shadowBorder, marginBottom: compact ? 0 : 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Weekly activity</span>
          <span style={{ fontSize: 10, color: T.textFaint }}>+12%</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: compact ? 48 : 72 }}>
          {[42, 58, 51, 73, 66, 88, 79].map((h, i) => (
            <div key={i} style={{
              flex: 1, height: `${h}%`, borderRadius: '4px 4px 0 0',
              background: i === 5 ? T.text : T.bgSection,
            }} />
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={`${d}-${i}`} style={{ flex: 1, textAlign: 'center', fontSize: 8, color: T.textFaint }}>{d}</span>
          ))}
        </div>
      </div>
      {!compact && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {[
            { name: 'Priya S.', score: '98', role: 'Top performer' },
            { name: 'James O.', score: '95', role: 'Rising star' },
          ].map((person) => (
            <div key={person.name} style={{ background: T.bg, borderRadius: 10, padding: 10, boxShadow: T.shadowBorder, display: 'flex', gap: 8, alignItems: 'center' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8, background: T.text, color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700,
              }}>{person.name.charAt(0)}</div>
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{person.name}</p>
                <p style={{ fontSize: 9, color: T.textFaint }}>{person.role} · {person.score}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </Shell>
  );
}

function EventsSlide({ compact }: { compact: boolean }) {
  return (
    <Shell slide={SLIDES[4]} compact={compact}>
      <div style={{
        background: T.bg, borderRadius: 10, padding: 14, boxShadow: T.shadowBorder, marginBottom: 10,
        borderLeft: `3px solid ${T.text}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Video size={14} color={T.red} />
          <span style={{ fontSize: 10, fontWeight: 700, color: T.red, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Live now</span>
        </div>
        <p style={{ fontSize: 14, fontWeight: 700, color: T.text, marginBottom: 4, letterSpacing: '-0.02em' }}>
          Q3 Sales kickoff
        </p>
        <p style={{ fontSize: 11, color: T.textMuted, marginBottom: 12 }}>128 attending · Zoom + LMS join</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{
            flex: 1, background: T.text, color: '#fff', borderRadius: 8, padding: '8px 10px',
            fontSize: 11, fontWeight: 600, textAlign: 'center',
          }}>Join now</div>
          <div style={{
            background: T.bgSection, color: T.text, borderRadius: 8, padding: '8px 10px',
            fontSize: 11, fontWeight: 600,
          }}>Details</div>
        </div>
      </div>
      <div style={{ background: T.bg, borderRadius: 10, boxShadow: T.shadowBorder, overflow: 'hidden' }}>
        {[
          { title: 'Product demo certification', when: 'Thu 15:00', people: 46 },
          { title: 'Manager coaching clinic', when: 'Fri 11:00', people: 22 },
          { title: 'Partner enablement workshop', when: 'Mon 09:30', people: 61 },
        ].slice(0, compact ? 2 : 3).map((event, i, arr) => (
          <div key={event.title} style={{
            padding: '11px 12px',
            borderBottom: i < arr.length - 1 ? `1px solid ${T.borderStrong}` : 'none',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 8, background: T.bgSection,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <Calendar size={12} color={T.textMuted} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: T.text }}>{event.title}</p>
              <p style={{ fontSize: 9, color: T.textFaint }}>{event.when} · {event.people} going</p>
            </div>
            <CheckCircle size={13} color="#10b981" />
          </div>
        ))}
      </div>
    </Shell>
  );
}

const SLIDE_VIEWS = [DashboardSlide, MockCallsSlide, CoursesSlide, AnalyticsSlide, EventsSlide];
const AUTO_MS = 2000;

export function LandingHeroCarousel({ compact = false }: { compact?: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animate, setAnimate] = useState(true);
  const [progressKey, setProgressKey] = useState(0);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const displayIndex = index % SLIDES.length;
  const slide = SLIDES[displayIndex];
  const ActiveSlide = SLIDE_VIEWS[displayIndex];
  const trackSlides = [...SLIDE_VIEWS, SLIDE_VIEWS[0]];
  const trackMeta = [...SLIDES, SLIDES[0]];

  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => {
      if (compact) {
        setIndex((current) => (current + 1) % SLIDES.length);
        setProgressKey((key) => key + 1);
        return;
      }
      setIndex((current) => {
        if (current >= SLIDES.length) return current;
        return current + 1;
      });
      setAnimate(true);
      setProgressKey((key) => key + 1);
    }, AUTO_MS);
    return () => window.clearInterval(timer);
  }, [paused, compact]);

  useEffect(() => {
    if (compact) return undefined;
    const track = trackRef.current;
    if (!track) return undefined;

    const onEnd = (event: TransitionEvent) => {
      if (event.propertyName !== 'transform') return;
      if (index < SLIDES.length) return;
      setAnimate(false);
      setIndex(0);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setAnimate(true));
      });
    };

    track.addEventListener('transitionend', onEnd);
    return () => track.removeEventListener('transitionend', onEnd);
  }, [index, compact]);

  const goTo = (target: number) => {
    if (compact) {
      setIndex(target);
      setProgressKey((key) => key + 1);
      return;
    }
    setAnimate(true);
    setIndex(target);
    setProgressKey((key) => key + 1);
  };

  const handlePointerMove = (event: MouseEvent<HTMLDivElement>) => {
    if (compact) return;
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    setTilt({
      x: (0.5 - py) * 10,
      y: (px - 0.5) * 14,
    });
  };

  const resetTilt = () => setTilt({ x: 0, y: 0 });

  const canHoverPause = () =>
    typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  const frameTransform = compact
    ? 'none'
    : `perspective(1400px) rotateX(${6 + tilt.x}deg) rotateY(${-12 + tilt.y}deg) translateZ(0)`;

  return (
    <div
      className="lp-hero-carousel-root"
      onMouseEnter={() => {
        if (canHoverPause()) setPaused(true);
      }}
      onMouseLeave={() => {
        setPaused(false);
        resetTilt();
      }}
    >
      <div
        ref={stageRef}
        onMouseMove={handlePointerMove}
        className={compact ? undefined : 'lp-hero-carousel-stage'}
        style={{
          position: 'relative',
          padding: compact ? 0 : '8px 10px 28px',
          perspective: compact ? undefined : 1400,
        }}
      >
        {!compact && (
          <>
            <div aria-hidden style={{
              position: 'absolute', left: '8%', right: '8%', bottom: 8, height: 28,
              background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.22) 0%, transparent 70%)',
              filter: 'blur(10px)',
              transform: 'translateZ(-40px)',
              pointerEvents: 'none',
            }} />
            <div aria-hidden style={{
              position: 'absolute', inset: '18px 18px auto', height: '70%',
              borderRadius: 20,
              background: 'linear-gradient(135deg, rgba(10,114,239,0.12), rgba(222,29,141,0.08))',
              filter: 'blur(18px)',
              transform: 'translateZ(-24px) rotateY(-8deg)',
              pointerEvents: 'none',
            }} />
          </>
        )}

        <div
          className={compact ? undefined : 'lp-hero-carousel-frame'}
          style={{
            position: 'relative',
            background: T.bg,
            borderRadius: 16,
            overflow: 'hidden',
            border: `1px solid ${T.borderStrong}`,
            transform: frameTransform,
            transformStyle: 'preserve-3d',
            transformOrigin: 'center center',
            transition: compact ? undefined : 'transform 0.18s ease-out',
            boxShadow: compact
              ? 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 8px 24px'
              : 'rgba(0,0,0,0.1) 0px 0px 0px 1px, rgba(0,0,0,0.08) 0px 12px 28px, rgba(0,0,0,0.12) 0px 32px 64px -16px, rgba(255,255,255,0.7) 0px 1px 0px inset',
          }}
        >
          <div aria-hidden style={{
            position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2,
            background: 'linear-gradient(125deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.05) 28%, transparent 48%)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 14px', background: T.bgSubtle, borderBottom: `1px solid ${T.borderStrong}`, position: 'relative', zIndex: 1 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5b4f' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981' }} />
            <div style={{
              flex: 1, marginLeft: 8, background: T.bg, border: `1px solid ${T.borderStrong}`,
              borderRadius: 6, padding: '4px 10px', fontSize: 11, color: T.textFaint, maxWidth: 260,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              transition: 'opacity 0.3s ease',
            }}>
              {slide.url}
            </div>
            {!compact && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
                <Zap size={11} color={paused ? T.textFaint : T.blue} />
                <span style={{ fontSize: 9, fontWeight: 600, color: paused ? T.textFaint : T.blue }}>
                  {paused ? 'Paused' : 'Auto'}
                </span>
              </div>
            )}
          </div>

          <div className="lp-hero-carousel-viewport" style={{ zIndex: 1 }}>
            {compact ? (
              <div key={displayIndex} className="lp-hero-carousel-slide-enter">
                <ActiveSlide compact />
              </div>
            ) : (
              <div
                ref={trackRef}
                className="lp-hero-carousel-track"
                style={{
                  display: 'flex',
                  width: `${trackSlides.length * 100}%`,
                  transform: `translate3d(-${(index * 100) / trackSlides.length}%, 0, 0)`,
                  transition: animate
                    ? 'transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)'
                    : 'none',
                  willChange: 'transform',
                }}
              >
                {trackSlides.map((SlideView, i) => {
                  const active = i === index || (index === SLIDES.length && i === 0);
                  const slideWidth = `${100 / trackSlides.length}%`;
                  return (
                    <div
                      key={`${trackMeta[i].id}-${i}`}
                      style={{
                        flex: `0 0 ${slideWidth}`,
                        width: slideWidth,
                        maxWidth: slideWidth,
                        minWidth: 0,
                        flexShrink: 0,
                        overflow: 'hidden',
                        opacity: active ? 1 : 0.7,
                        transform: active ? 'scale(1) translateZ(0)' : 'scale(0.97) translateZ(-20px)',
                        transition: animate
                          ? 'opacity 0.55s ease, transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)'
                          : 'none',
                      }}
                    >
                      <SlideView compact={false} />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: compact ? 14 : 6,
      }}>
        {SLIDES.map((item, i) => {
          const active = i === displayIndex;
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`Show ${item.title}`}
              onClick={() => goTo(i)}
              style={{
                position: 'relative',
                width: active ? 28 : 8,
                height: 8,
                borderRadius: 9999,
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                background: '#d4d4d4',
                overflow: 'hidden',
                transition: 'width 0.35s cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              {active && (
                <span
                  key={progressKey}
                  className="lp-carousel-progress"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: T.text,
                    transformOrigin: 'left center',
                    animationDuration: `${AUTO_MS}ms`,
                    animationPlayState: paused ? 'paused' : 'running',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {!compact && (
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap',
        }}>
          {SLIDES.map((item, i) => (
            <button
              key={`${item.id}-label`}
              type="button"
              onClick={() => goTo(i)}
              style={{
                fontSize: 10,
                fontWeight: i === displayIndex ? 700 : 500,
                color: i === displayIndex ? T.text : T.textFaint,
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                transition: 'color 0.25s ease',
              }}
            >
              {item.eyebrow}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
