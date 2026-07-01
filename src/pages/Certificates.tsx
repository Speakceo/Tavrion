import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Layout } from '../components/Layout';
import { Award, Download, Printer, Search, Calendar, CheckCircle, BookOpen } from 'lucide-react';
import { CertificateLayout, type CertificateTemplateId } from '../utils/certificateTemplates';

interface CertificateRecord {
  id: string;
  user_id: string;
  course_id: string;
  issued_at: string;
  expiry_date: string | null;
  certificate_number: string | null;
  certificate_template?: CertificateTemplateId | null;
  course_title: string | null;
  user_name: string | null;
  course?: { title: string; description: string };
}

const T = {
  text: '#171717', textBody: '#4d4d4d', textMuted: '#666', textFaint: '#999',
  border: 'rgba(0,0,0,0.08)', bg: '#ffffff', bgSubtle: '#fafafa', bgSection: '#f5f5f5',
  blue: '#0a72ef', green: '#16a34a', gold: '#b45309', red: '#dc2626',
  shadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
  shadowCard: 'rgba(0,0,0,0.08) 0px 0px 0px 1px, rgba(0,0,0,0.04) 0px 2px 4px',
};

import { getCertificateBranding } from '../utils/orgSettings';

function CertificatePrint({ cert, userName, branding }: { cert: CertificateRecord; userName: string; branding?: ReturnType<typeof getCertificateBranding> }) {
  const courseTitle = cert.course_title || cert.course?.title || 'Course';
  const issuedDate = new Date(cert.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const expiryDate = cert.expiry_date ? new Date(cert.expiry_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null;
  const certNum = cert.certificate_number || `CERT-${cert.id.substring(0, 8).toUpperCase()}`;
  const template = (cert.certificate_template || 'classic') as CertificateTemplateId;

  return (
    <CertificateLayout
      template={template}
      userName={userName}
      courseTitle={courseTitle}
      issuedDate={issuedDate}
      certNum={certNum}
      expiryDate={expiryDate}
      branding={branding}
    />
  );
}

export function Certificates() {
  const { profile, organization } = useAuth();
  const certBranding = getCertificateBranding(organization);
  const [certs, setCerts] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<CertificateRecord | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (profile) loadCerts();
  }, [profile]);

  async function loadCerts() {
    const { data } = await supabase
      .from('certificates')
      .select('*, course:courses(title, description)')
      .eq('user_id', profile!.id)
      .order('issued_at', { ascending: false });
    setCerts(data || []);
    setLoading(false);
  }

  function handlePrint() {
    const el = printRef.current;
    if (!el) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html><html><head>
      <meta charset="utf-8">
      <title>Certificate</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { background: white; display: flex; align-items: center; justify-content: center; min-height: 100vh; padding: 20px; }
        @media print { body { padding: 0; } @page { margin: 0; size: A4 landscape; } }
      </style>
      </head><body>${el.innerHTML}</body></html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 500);
  }

  const filtered = certs.filter(c => {
    const title = c.course_title || c.course?.title || '';
    return title.toLowerCase().includes(search.toLowerCase());
  });

  const isExpired = (cert: CertificateRecord) => cert.expiry_date && new Date(cert.expiry_date) < new Date();

  return (
    <Layout>
      <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 48 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', color: T.text }}>My Certificates</h1>
          <p style={{ fontSize: 14, color: T.textBody, marginTop: 4 }}>Download and print your course completion certificates</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { icon: Award, label: 'Total Earned', value: certs.length, color: T.gold },
            { icon: CheckCircle, label: 'Valid', value: certs.filter(c => !isExpired(c)).length, color: T.green },
            { icon: Calendar, label: 'This Year', value: certs.filter(c => new Date(c.issued_at).getFullYear() === new Date().getFullYear()).length, color: T.blue },
          ].map(s => (
            <div key={s.label} style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, background: `${s.color}15`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={16} color={s.color} />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', color: T.text }}>{s.value}</div>
                <div style={{ fontSize: 12, color: T.textMuted }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: T.textFaint }} />
          <input
            style={{ width: '100%', padding: '10px 12px 10px 36px', background: T.bg, boxShadow: T.shadow, border: 'none', borderRadius: 9, fontSize: 13, color: T.text, outline: 'none', boxSizing: 'border-box' }}
            placeholder="Search certificates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.textMuted }}>Loading certificates...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, padding: '48px 24px', textAlign: 'center' }}>
            <Award size={40} style={{ color: T.border, margin: '0 auto 12px' }} />
            <p style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 4 }}>
              {certs.length === 0 ? 'No certificates yet' : 'No matching certificates'}
            </p>
            <p style={{ fontSize: 13, color: T.textMuted }}>
              {certs.length === 0 ? 'Complete a course to earn your first certificate.' : 'Try a different search term.'}
            </p>
            {certs.length === 0 && (
              <a href="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '9px 18px', background: T.text, color: 'white', borderRadius: 9, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                <BookOpen size={13} /> Browse Courses
              </a>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 14 }}>
            {filtered.map(c => {
              const expired = isExpired(c);
              const title = c.course_title || c.course?.title || 'Course';
              const certNum = c.certificate_number || `CERT-${c.id.substring(0, 8).toUpperCase()}`;
              return (
                <div
                  key={c.id}
                  style={{ background: T.bg, boxShadow: T.shadowCard, borderRadius: 12, overflow: 'hidden', transition: 'transform 0.15s, box-shadow 0.15s', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'rgba(0,0,0,0.1) 0px 0px 0px 1px, rgba(0,0,0,0.08) 0px 8px 24px'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = T.shadowCard; }}
                  onClick={() => setSelected(c)}
                >
                  {/* Certificate Preview Strip */}
                  <div style={{ height: 80, background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', inset: 0, opacity: 0.1, backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                    <Award size={32} color="#c9a84c" style={{ position: 'relative', zIndex: 1 }} />
                    {expired && (
                      <div style={{ position: 'absolute', top: 8, right: 8, background: T.red, color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: '0.04em' }}>EXPIRED</div>
                    )}
                  </div>
                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 4, lineHeight: 1.3 }}>{title}</div>
                    <div style={{ fontSize: 11, color: T.textMuted, marginBottom: 10 }}>
                      Issued {new Date(c.issued_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 10, color: T.textFaint, fontFamily: 'monospace' }}>{certNum}</span>
                      <button
                        onClick={e => { e.stopPropagation(); setSelected(c); setTimeout(() => handlePrint(), 100); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: T.bgSection, border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: T.textBody }}
                      >
                        <Download size={10} /> Download
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Certificate Preview Modal */}
        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: T.bg, borderRadius: 14, overflow: 'hidden', maxWidth: '95vw', boxShadow: 'rgba(0,0,0,0.3) 0px 24px 80px' }}>
              <div style={{ padding: '14px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: T.bgSubtle }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: T.text }}>Certificate Preview</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handlePrint}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: T.text, color: 'white', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
                  >
                    <Printer size={12} /> Print / Save PDF
                  </button>
                  <button onClick={() => setSelected(null)} style={{ padding: '7px 14px', background: T.bgSection, border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: T.textBody }}>Close</button>
                </div>
              </div>
              <div style={{ padding: 24, overflowX: 'auto' }}>
                <div ref={printRef}>
                  <CertificatePrint cert={selected} userName={profile?.full_name || ''} branding={certBranding} />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
