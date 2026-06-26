import { FileText } from 'lucide-react';
import { getBookFileUrl } from '../utils/books';

interface BookCoverProps {
  title: string;
  hue: number;
  filePath?: string;
  compact?: boolean;
}

export function BookCover({ title, hue, filePath, compact }: BookCoverProps) {
  const height = compact ? 120 : 180;
  const previewUrl = filePath ? `${getBookFileUrl(filePath)}#page=1&view=FitH` : null;

  return (
    <div
      style={{
        height,
        borderRadius: 10,
        overflow: 'hidden',
        position: 'relative',
        background: `linear-gradient(145deg, hsl(${hue} 45% 42%), hsl(${(hue + 40) % 360} 50% 28%))`,
        boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px',
      }}
    >
      {previewUrl ? (
        <iframe
          src={previewUrl}
          title={`${title} preview`}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '200%',
            height: '200%',
            border: 'none',
            transform: 'scale(0.5)',
            transformOrigin: 'top left',
            pointerEvents: 'none',
            background: '#fff',
          }}
        />
      ) : (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, color: 'rgba(255,255,255,0.95)' }}>
          <FileText size={compact ? 28 : 36} strokeWidth={1.5} />
          <span style={{ marginTop: 10, fontSize: compact ? 22 : 28, fontWeight: 800, letterSpacing: '-0.04em' }}>
            {title.charAt(0).toUpperCase()}
          </span>
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 55%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: 10,
          right: 10,
          bottom: 10,
          color: '#fff',
          fontSize: compact ? 11 : 12,
          fontWeight: 700,
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {title}
      </div>
    </div>
  );
}
