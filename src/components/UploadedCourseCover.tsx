import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { getUploadedCourseSignedUrl } from '../utils/uploadedCourseMedia';

interface UploadedCourseCoverProps {
  title: string;
  thumbnailPath?: string | null;
  fileType?: string;
  height?: number;
}

export function UploadedCourseCover({
  title,
  thumbnailPath,
  fileType,
  height = 140,
}: UploadedCourseCoverProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!thumbnailPath) {
      setImageUrl(null);
      return;
    }

    getUploadedCourseSignedUrl(thumbnailPath).then((url) => {
      if (!cancelled) setImageUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [thumbnailPath]);

  return (
    <div
      style={{
        height,
        background: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid #ebebeb',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={title}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <FileText size={height > 100 ? 40 : 28} color="#bbb" />
      )}
      {fileType && !imageUrl && (
        <span
          style={{
            position: 'absolute',
            marginTop: height - 28,
            fontSize: 10,
            fontWeight: 700,
            color: '#808080',
            letterSpacing: '0.06em',
          }}
        >
          {fileType.toUpperCase()}
        </span>
      )}
    </div>
  );
}
