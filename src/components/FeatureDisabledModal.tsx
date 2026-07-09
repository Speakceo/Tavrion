import { MessageSquareWarning } from 'lucide-react';

export function FeatureDisabledModal({
  title = 'Feature disabled for your team',
  message = 'This feature is currently turned off for your organisation. Talk to the Tavrion team to enable it.',
  onClose,
}: {
  title?: string;
  message?: string;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.55)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(460px, 100%)',
          background: '#fff',
          borderRadius: 12,
          boxShadow: 'rgba(0,0,0,0.2) 0px 12px 32px',
          padding: 22,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <MessageSquareWarning size={18} color="#171717" />
          <h3 style={{ fontSize: 17, fontWeight: 700, color: '#171717' }}>{title}</h3>
        </div>
        <p style={{ fontSize: 14, color: '#4d4d4d', lineHeight: 1.6, marginBottom: 16 }}>
          {message}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <a
            href="mailto:hello@jointavrion.com?subject=Enable%20feature%20for%20our%20team"
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              textDecoration: 'none',
              color: '#171717',
              background: '#f5f5f5',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Talk to Tavrion team
          </a>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 12px',
              borderRadius: 8,
              border: 'none',
              background: '#171717',
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
