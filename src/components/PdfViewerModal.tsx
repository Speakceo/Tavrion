import { X } from 'lucide-react';

interface PdfViewerModalProps {
  title: string;
  url: string;
  onClose: () => void;
}

export function PdfViewerModal({ title, url, onClose }: PdfViewerModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.9)' }}
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-h-full max-w-7xl flex-col bg-white sm:max-h-[95vh] sm:rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b bg-[#fafafa] p-3 sm:p-4">
          <h2 className="min-w-0 flex-1 truncate pr-3 text-sm font-semibold text-[#171717] sm:text-base">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex shrink-0 items-center justify-center rounded-lg p-2 text-[#666] transition hover:bg-[#f0f0f0] hover:text-[#171717]"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 bg-[#525252]">
          <iframe src={url} className="h-full w-full border-0" title={title} />
        </div>
      </div>
    </div>
  );
}
