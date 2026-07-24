import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Download, ExternalLink, X } from 'lucide-react';
import { getUploadedCourseSignedUrl } from '../utils/uploadedCourseMedia';
import { getCourseFormatLabel } from '../utils/uploadedCourseDisplay';

export type UploadedCourseViewerProps = {
  courseTitle: string;
  filePath: string;
  fileName?: string;
  fileType?: string;
  alreadyCompleted?: boolean;
  onClose: () => void;
  onComplete: () => void | Promise<void>;
  onDownload?: () => void | Promise<void>;
};

function isVideoType(fileType?: string) {
  return ['mp4', 'mov', 'webm', 'avi'].includes(fileType || '');
}

function isImageType(fileType?: string) {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileType || '');
}

function isPdfType(fileType?: string) {
  return fileType === 'pdf';
}

function isOfficeType(fileType?: string) {
  return ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(fileType || '');
}

function isTextType(fileType?: string) {
  return ['txt', 'md', 'csv'].includes(fileType || '');
}

function officeEmbedUrl(signedUrl: string) {
  return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(signedUrl)}`;
}

export function UploadedCourseViewer({
  courseTitle,
  filePath,
  fileName,
  fileType,
  alreadyCompleted = false,
  onClose,
  onComplete,
  onDownload,
}: UploadedCourseViewerProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [completing, setCompleting] = useState(false);
  const [officeFailed, setOfficeFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    setTextContent(null);
    setOfficeFailed(false);

    (async () => {
      const signed = await getUploadedCourseSignedUrl(filePath);
      if (cancelled) return;
      if (!signed) {
        setError('Could not open this course file. Try again or download it.');
        setLoading(false);
        return;
      }
      setUrl(signed);

      if (isTextType(fileType)) {
        try {
          const res = await fetch(signed);
          const text = await res.text();
          if (!cancelled) setTextContent(text);
        } catch {
          if (!cancelled) setError('Could not load text content.');
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [filePath, fileType]);

  const markComplete = async () => {
    if (alreadyCompleted || completing) return;
    setCompleting(true);
    try {
      await onCompleteRef.current();
    } finally {
      setCompleting(false);
    }
  };

  const formatLabel = getCourseFormatLabel(fileType);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-5">
      <div className="flex h-full w-full max-h-[94vh] max-w-7xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div
          className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 sm:px-5"
          style={{ borderColor: '#ebebeb', background: '#fafafa' }}
        >
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-bold text-gray-900 sm:text-lg">{courseTitle}</h2>
            <p className="mt-0.5 text-xs text-gray-500 sm:text-sm">
              {formatLabel}
              {fileName ? ` · ${fileName}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onDownload && (
              <button
                type="button"
                onClick={() => void onDownload()}
                className="lt-btn-secondary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
              >
                <Download size={14} /> Download
              </button>
            )}
            {!alreadyCompleted && (
              <button
                type="button"
                onClick={() => void markComplete()}
                disabled={completing}
                className="lt-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm"
              >
                <CheckCircle2 size={14} />
                {completing ? 'Saving…' : 'Mark complete'}
              </button>
            )}
            {alreadyCompleted && (
              <span className="lt-badge lt-badge-success inline-flex items-center gap-1">
                <CheckCircle2 size={12} /> Completed
              </span>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 hover:bg-gray-50"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="relative min-h-0 flex-1 overflow-hidden bg-gray-50">
          {loading && (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Preparing course content…
            </div>
          )}

          {!loading && error && (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
              <p className="text-sm text-red-600">{error}</p>
              {url && (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="lt-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-sm"
                >
                  <ExternalLink size={14} /> Open file
                </a>
              )}
            </div>
          )}

          {!loading && !error && url && isPdfType(fileType) && (
            <iframe src={url} className="h-full w-full" title={courseTitle} />
          )}

          {!loading && !error && url && isVideoType(fileType) && (
            <div className="flex h-full items-center justify-center bg-black p-2">
              <video
                ref={videoRef}
                src={url}
                controls
                className="max-h-full max-w-full"
                onEnded={() => {
                  if (!alreadyCompleted) void markComplete();
                }}
              >
                Your browser does not support video playback.
              </video>
            </div>
          )}

          {!loading && !error && url && isImageType(fileType) && (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <img src={url} alt={courseTitle} className="max-h-full max-w-full object-contain" />
            </div>
          )}

          {!loading && !error && url && isOfficeType(fileType) && !officeFailed && (
            <iframe
              src={officeEmbedUrl(url)}
              className="h-full w-full border-0"
              title={courseTitle}
              onError={() => setOfficeFailed(true)}
            />
          )}

          {!loading && !error && url && isOfficeType(fileType) && officeFailed && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="max-w-md text-sm text-gray-600">
                This presentation/document couldn’t be embedded. Open it in a new tab to review, then mark the course complete.
              </p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="lt-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
              >
                <ExternalLink size={14} /> Open {formatLabel.toLowerCase()}
              </a>
            </div>
          )}

          {!loading && !error && isTextType(fileType) && (
            <pre className="h-full overflow-auto whitespace-pre-wrap p-5 text-sm leading-relaxed text-gray-800">
              {textContent ?? 'No content.'}
            </pre>
          )}

          {!loading && !error && url && !isPdfType(fileType) && !isVideoType(fileType) && !isImageType(fileType) && !isOfficeType(fileType) && !isTextType(fileType) && (
            <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
              <p className="max-w-md text-sm text-gray-600">
                Preview isn’t available for this file type. Open or download the file, then mark the course complete when finished.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="lt-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
                >
                  <ExternalLink size={14} /> Open file
                </a>
                {onDownload && (
                  <button
                    type="button"
                    onClick={() => void onDownload()}
                    className="lt-btn-secondary inline-flex items-center gap-1.5 px-4 py-2 text-sm"
                  >
                    <Download size={14} /> Download
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {!alreadyCompleted && (
          <div className="shrink-0 border-t px-4 py-3 text-xs text-gray-500 sm:px-5" style={{ borderColor: '#ebebeb' }}>
            Review the material in the LMS, then click <strong>Mark complete</strong>
            {isVideoType(fileType) ? ' (or finish the video)' : ''} so progress is recorded.
          </div>
        )}
      </div>
    </div>
  );
}
