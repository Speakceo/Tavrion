export type CertificateTemplateId = 'classic' | 'modern' | 'executive';

export const CERTIFICATE_TEMPLATES: { id: CertificateTemplateId; label: string; description: string }[] = [
  { id: 'classic', label: 'Classic Gold', description: 'Traditional bordered certificate with gold accents' },
  { id: 'modern', label: 'Modern Blue', description: 'Clean minimalist layout with blue branding' },
  { id: 'executive', label: 'Executive Dark', description: 'Premium dark certificate for leadership programs' },
];

type CertProps = {
  userName: string;
  courseTitle: string;
  issuedDate: string;
  certNum: string;
  expiryDate?: string | null;
};

export function CertificateLayout({ template, ...props }: CertProps & { template: CertificateTemplateId }) {
  if (template === 'modern') return <ModernCertificate {...props} />;
  if (template === 'executive') return <ExecutiveCertificate {...props} />;
  return <ClassicCertificate {...props} />;
}

function ClassicCertificate({ userName, courseTitle, issuedDate, certNum, expiryDate }: CertProps) {
  return (
    <div style={{
      width: 800, minHeight: 560, background: '#fff', border: '8px solid #1a1a1a',
      outline: '2px solid #c9a84c', outlineOffset: -16, padding: '48px 56px',
      fontFamily: 'Georgia, "Times New Roman", serif', boxSizing: 'border-box', position: 'relative',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#666', marginBottom: 24, fontFamily: 'Inter, sans-serif' }}>
          Tavrion · Enterprise Learning Platform
        </div>
        <div style={{ fontSize: 13, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#c9a84c', marginBottom: 10, fontFamily: 'Inter, sans-serif', fontWeight: 700 }}>
          Certificate of Completion
        </div>
        <div style={{ fontSize: 13, color: '#666', marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>This certifies that</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#1a1a1a', marginBottom: 8 }}>{userName}</div>
        <div style={{ width: 160, height: 2, background: 'linear-gradient(to right, transparent, #c9a84c, transparent)', margin: '0 auto 16px' }} />
        <div style={{ fontSize: 13, color: '#666', marginBottom: 8, fontFamily: 'Inter, sans-serif' }}>has successfully completed</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', marginBottom: 32 }}>{courseTitle}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ borderTop: '1px solid #1a1a1a', width: 160, paddingTop: 6, marginTop: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Date of Issue</div>
            <div style={{ fontSize: 11, color: '#666', fontFamily: 'Inter, sans-serif' }}>{issuedDate}</div>
          </div>
          <div style={{ borderTop: '1px solid #1a1a1a', width: 160, paddingTop: 6, marginTop: 32 }}>
            <div style={{ fontSize: 12, fontWeight: 600, fontFamily: 'Inter, sans-serif' }}>Certificate No.</div>
            <div style={{ fontSize: 11, color: '#666', fontFamily: 'Inter, sans-serif' }}>{certNum}</div>
          </div>
        </div>
        {expiryDate && <div style={{ marginTop: 16, fontSize: 11, color: '#999', fontFamily: 'Inter, sans-serif' }}>Valid until: {expiryDate}</div>}
      </div>
    </div>
  );
}

function ModernCertificate({ userName, courseTitle, issuedDate, certNum }: CertProps) {
  return (
    <div style={{
      width: 800, minHeight: 560, background: 'linear-gradient(135deg, #f8fbff 0%, #ffffff 55%, #f0f7ff 100%)',
      borderRadius: 16, padding: '48px 56px', boxSizing: 'border-box',
      border: '1px solid #dbeafe', fontFamily: 'Inter, system-ui, sans-serif', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 8, background: 'linear-gradient(90deg, #0a72ef, #3b82f6)' }} />
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#0a72ef', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 20 }}>Tavrion</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: '#171717', letterSpacing: '-0.03em', marginBottom: 8 }}>Certificate of Achievement</div>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 28 }}>Awarded to</div>
        <div style={{ fontSize: 34, fontWeight: 700, color: '#171717', marginBottom: 12 }}>{userName}</div>
        <div style={{ fontSize: 15, color: '#4d4d4d', marginBottom: 8 }}>for successfully completing</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#0a72ef', marginBottom: 36 }}>{courseTitle}</div>
        <div style={{ display: 'inline-flex', gap: 24, fontSize: 12, color: '#666' }}>
          <span>Issued {issuedDate}</span>
          <span>·</span>
          <span>{certNum}</span>
        </div>
      </div>
    </div>
  );
}

function ExecutiveCertificate({ userName, courseTitle, issuedDate, certNum }: CertProps) {
  return (
    <div style={{
      width: 800, minHeight: 560, background: '#111827', color: '#f9fafb',
      borderRadius: 12, padding: '48px 56px', boxSizing: 'border-box', fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#9ca3af', marginBottom: 18 }}>Tavrion Executive Program</div>
        <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 24 }}>Certificate of Completion</div>
        <div style={{ fontSize: 14, color: '#d1d5db', marginBottom: 10 }}>Presented to</div>
        <div style={{ fontSize: 36, fontWeight: 700, color: '#fff', marginBottom: 12 }}>{userName}</div>
        <div style={{ width: 120, height: 1, background: '#fbbf24', margin: '0 auto 20px' }} />
        <div style={{ fontSize: 15, color: '#d1d5db', marginBottom: 8 }}>In recognition of completing</div>
        <div style={{ fontSize: 22, fontWeight: 600, color: '#fbbf24', marginBottom: 40 }}>{courseTitle}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
          <span>{issuedDate}</span>
          <span>{certNum}</span>
        </div>
      </div>
    </div>
  );
}
