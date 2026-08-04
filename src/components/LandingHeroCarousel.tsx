import { useEffect, useState } from 'react';
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
    <div style={{ display: 'grid', gridTemplateColumns: compact ? '56px 1fr' : '72px 1fr', minHeight: compact ? 280 : 360 }}>
      <div style={{
        background: T.text, padding: compact ? '12px 8px' : '14px 10px',
        display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#fff', marginBottom: 8,
        }}>T</div>
        {NAV_ICONS.map((Icon, i) => (
          <div key={i} style={{
            width: compact ? 28 : 32, height: compact ? 28 : 32, borderRadius: 8,
            background: i === slide.activeNav ? 'rgba(255,255,255,0.14)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={14} color={i === slide.activeNav ? '#fff' : 'rgba(255,255,255,0.45)'} />
          </div>
        ))}
      </div>
      <div style={{ background: T.bgSubtle, padding: compact ? 12 : 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p style={{ fontSize: 11, color: T.textFaint, marginBottom: 2, fontWeight: 500 }}>{slide.eyebrow}</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: T.text, letterSpacing: '-0.03em' }}>{slide.title}</p>
          </div>
          <div style={{
            fontSize: 10, fontWeight: 600, color: T.blue, background: '#ebf5ff',
            padding: '4px 8px', borderRadius: 9999,
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { icon: Users, label: 'Learners', value: '12.8k', delta: '+18%', accent: T.blue },
          { icon: BookOpen, label: 'Completed', value: '94.2k', delta: '+34%', accent: T.pink },
          { icon: TrendingUp, label: 'Avg score', value: '87.4%', delta: '+6%', accent: T.red },
        ].map((card) => (
          <div key={card.label} style={{
            background: T.bg, borderRadius: 10, padding: compact ? '10px 8px' : '12px 10px',
            boxShadow: T.shadowBorder,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{
                width: 24, height: 24, background: T.bgSubtle, borderRadius: 6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.icon size={12} style={{ color: card.accent }} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#10b981' }}>{card.delta}</span>
            </div>
            <p style={{ fontSize: compact ? 14 : 16, fontWeight: 700, letterSpacing: '-0.04em', color: T.text, marginBottom: 1 }}>{card.value}</p>
            <p style={{ fontSize: 9, color: T.textFaint }}>{card.label}</p>
          </div>
        ))}
      </div>
      <div style={{ background: T.bg, borderRadius: 10, padding: compact ? 12 : 14, boxShadow: T.shadowBorder, marginBottom: 10 }}>
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
    </Shell>
  );
}

function MockCallsSlide({ compact }: { compact: boolean }) {
  return (
    <Shell slide={SLIDES[1]} compact={compact}>
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 8, marginBottom: 10 }}>
        <div style={{
          background: T.bg, borderRadius: 10, padding: 14, boxShadow: T.shadowBorder,
          minHeight: compact ? 120 : 160,
          display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: T.text,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Phone size={16} color="#fff" />
            </div>
            <div>
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
        <div style={{ background: T.bg, borderRadius: 10, padding: 14, boxShadow: T.shadowBorder }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: T.text, marginBottom: 10 }}>Score breakdown</p>
          {[
            { label: 'Objection handling', score: 94 },
            { label: 'Product knowledge', score: 88 },
            { label: 'Call structure', score: 91 },
            { label: 'Tone & empathy', score: 86 },
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
      <div style={{ background: T.bg, borderRadius: 10, padding: 12, boxShadow: T.shadowBorder }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <MessageSquare size={12} color={T.blue} />
          <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>AI coaching tip</span>
        </div>
        <p style={{ fontSize: 11, color: T.textBody, lineHeight: 1.5 }}>
          Strong discovery. Next: quantify pain before presenting pricing — ask for the cost of delay.
        </p>
      </div>
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
            flex: 1, minWidth: 72, background: T.bg, borderRadius: 10, padding: '10px 12px',
            boxShadow: T.shadowBorder,
          }}>
            <p style={{ fontSize: 16, fontWeight: 700, color: T.text, letterSpacing: '-0.03em' }}>{stat.value}</p>
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
                {course.mandatory && (
                  <span style={{ fontSize: 8, fontWeight: 700, color: T.text, background: T.bgSection, padding: '1px 5px', borderRadius: 4 }}>REQ</span>
                )}
              </div>
              <div style={{ background: T.bgSection, borderRadius: 100, height: 3, overflow: 'hidden' }}>
                <div style={{ width: `${course.pct}%`, height: '100%', background: T.text, borderRadius: 100 }} />
              </div>
            </div>
            <span style={{ fontSize: 9, fontWeight: 600, color: T.textMuted, flexShrink: 0 }}>{course.status}</span>
          </div>
        ))}
      </div>
    </Shell>
  );
}

function AnalyticsSlide({ compact }: { compact: boolean }) {
  return (
    <Shell slide={SLIDES[3]} compact={compact}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
        {[
          { label: 'Completion', value: '96%', accent: T.blue },
          { label: 'Avg quiz', value: '84%', accent: T.pink },
          { label: 'Active orgs', value: '42', accent: T.red },
        ].map((card) => (
          <div key={card.label} style={{ background: T.bg, borderRadius: 10, padding: 12, boxShadow: T.shadowBorder }}>
            <p style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.04em', color: T.text }}>{card.value}</p>
            <p style={{ fontSize: 9, color: T.textFaint }}>{card.label}</p>
            <div style={{ marginTop: 8, height: 3, background: T.bgSection, borderRadius: 100, overflow: 'hidden' }}>
              <div style={{ width: '78%', height: '100%', background: card.accent, borderRadius: 100 }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: T.bg, borderRadius: 10, padding: 12, boxShadow: T.shadowBorder, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: T.text }}>Weekly activity</span>
          <span style={{ fontSize: 10, color: T.textFaint }}>+12% vs last week</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: compact ? 56 : 72 }}>
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

export function LandingHeroCarousel({ compact = false }: { compact?: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % SLIDES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [paused]);

  const Slide = SLIDE_VIEWS[index];
  const slide = SLIDES[index];

  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      style={{ width: '100%' }}
    >
      <div style={{
        background: T.bg,
        borderRadius: 14,
        boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.06) 0px 8px 24px, rgba(0,0,0,0.04) 0px 24px 48px -12px',
        overflow: 'hidden',
        border: `1px solid ${T.borderStrong}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '11px 14px', background: T.bgSubtle, borderBottom: `1px solid ${T.borderStrong}` }}>
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#ff5b4f' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#f59e0b' }} />
          <div style={{ width: 9, height: 9, borderRadius: '50%', background: '#10b981' }} />
          <div style={{
            flex: 1, marginLeft: 8, background: T.bg, border: `1px solid ${T.borderStrong}`,
            borderRadius: 6, padding: '4px 10px', fontSize: 11, color: T.textFaint, maxWidth: 260,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            transition: 'opacity 0.25s',
          }}>
            {slide.url}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 4 }}>
            <Zap size={11} color={paused ? T.textFaint : T.blue} />
            <span style={{ fontSize: 9, fontWeight: 600, color: paused ? T.textFaint : T.blue }}>
              {paused ? 'Paused' : 'Auto'}
            </span>
          </div>
        </div>

        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <div
            key={slide.id}
            className="lp-hero-carousel-slide"
            style={{ animation: 'lp-carousel-in 0.45s ease' }}
          >
            <Slide compact={compact} />
          </div>
        </div>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 14,
      }}>
        {SLIDES.map((item, i) => (
          <button
            key={item.id}
            type="button"
            aria-label={`Show ${item.title}`}
            onClick={() => setIndex(i)}
            style={{
              width: i === index ? 22 : 8,
              height: 8,
              borderRadius: 9999,
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              background: i === index ? T.text : '#d4d4d4',
              transition: 'width 0.25s ease, background 0.25s ease',
            }}
          />
        ))}
      </div>

      <div style={{
        display: 'flex', justifyContent: 'center', gap: 6, marginTop: 8, flexWrap: 'wrap',
      }}>
        {SLIDES.map((item, i) => (
          <button
            key={`${item.id}-label`}
            type="button"
            onClick={() => setIndex(i)}
            style={{
              fontSize: 10,
              fontWeight: i === index ? 700 : 500,
              color: i === index ? T.text : T.textFaint,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            {item.eyebrow}
          </button>
        ))}
      </div>
    </div>
  );
}
