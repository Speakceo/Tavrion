import { useEffect } from 'react';
import { createPortal } from 'react-dom';

type AppModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: number;
  maxHeight?: string;
  paddingClassName?: string;
  closeOnBackdrop?: boolean;
};

export function AppModal({
  open,
  onClose,
  children,
  maxWidth = 760,
  maxHeight = 'min(88vh, 820px)',
  paddingClassName = 'p-4 sm:p-6',
  closeOnBackdrop = true,
}: AppModalProps) {
  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[120] flex items-center justify-center ${paddingClassName}`}
      style={{ background: 'rgba(17,17,17,0.52)', backdropFilter: 'blur(8px)' }}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      <div
        className="lt-card w-full"
        style={{
          maxWidth,
          maxHeight,
          overflow: 'hidden',
          borderRadius: 20,
          background: '#ffffff',
          boxShadow: 'rgba(0,0,0,0.18) 0px 20px 60px -20px, rgba(0,0,0,0.08) 0px 0px 0px 1px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
