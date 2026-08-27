import { useEffect, useRef, useState } from 'react';
import { Camera, Mic, ShieldAlert, CheckCircle2 } from 'lucide-react';

type Props = {
  onGranted: (stream: MediaStream) => void;
  onRevoked?: () => void;
  requireCamera?: boolean;
  requireMicrophone?: boolean;
};

export async function verifyMediaAccess(opts: {
  requireCamera?: boolean;
  requireMicrophone?: boolean;
}): Promise<{ ok: true; stream: MediaStream } | { ok: false; error: string }> {
  const requireCamera = opts.requireCamera !== false;
  const requireMicrophone = opts.requireMicrophone !== false;
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, error: 'This browser does not support camera/microphone access. Use Chrome.' };
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: requireCamera,
      audio: requireMicrophone,
    });
    const hasVideo = !requireCamera || stream.getVideoTracks().some((t) => t.readyState === 'live' && t.enabled);
    const hasAudio = !requireMicrophone || stream.getAudioTracks().some((t) => t.readyState === 'live' && t.enabled);
    if (!hasVideo || !hasAudio) {
      stream.getTracks().forEach((t) => t.stop());
      return {
        ok: false,
        error: !hasVideo
          ? 'Camera access was not granted. Enable camera to continue.'
          : 'Microphone access was not granted. Enable microphone to continue.',
      };
    }
    return { ok: true, stream };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return { ok: false, error: 'Camera and microphone permission is required. Allow access in browser settings, then try again.' };
    }
    if (name === 'NotFoundError') {
      return { ok: false, error: 'No camera or microphone was found on this device.' };
    }
    return { ok: false, error: err instanceof Error ? err.message : 'Could not access camera/microphone.' };
  }
}

/** Stop all tracks from a MediaStream safely. */
export function stopMediaStream(stream: MediaStream | null | undefined) {
  stream?.getTracks().forEach((t) => {
    try { t.stop(); } catch { /* ignore */ }
  });
}

/**
 * Forces camera + mic grant before assessment start.
 * Does not proceed until live tracks are confirmed.
 */
export function MediaPermissionGate({
  onGranted,
  onRevoked,
  requireCamera = true,
  requireMicrophone = true,
}: Props) {
  const [status, setStatus] = useState<'idle' | 'requesting' | 'granted' | 'denied'>('idle');
  const [error, setError] = useState('');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => undefined);
    }
  }, [stream]);

  useEffect(() => () => {
    // Parent owns the stream after grant for handoff; only stop if still local and denied/idle cleanup
  }, []);

  const requestAccess = async () => {
    setStatus('requesting');
    setError('');
    // Stop previous preview if any
    stopMediaStream(stream);
    setStream(null);

    const result = await verifyMediaAccess({ requireCamera, requireMicrophone });
    if (!result.ok) {
      setStatus('denied');
      setError(result.error);
      onRevoked?.();
      return;
    }
    setStream(result.stream);
    setStatus('granted');
    onGranted(result.stream);
  };

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        border: `1px solid ${status === 'granted' ? '#bbf7d0' : status === 'denied' ? '#fecaca' : '#ebebeb'}`,
        background: status === 'granted' ? '#f0fdf4' : status === 'denied' ? '#fef2f2' : '#fafafa',
        borderRadius: 12,
        padding: 14,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <ShieldAlert size={16} color={status === 'granted' ? '#16a34a' : '#171717'} />
          <strong style={{ fontSize: 13 }}>Camera & microphone required</strong>
        </div>
        <p style={{ fontSize: 12, color: '#666', lineHeight: 1.55, margin: '0 0 12px' }}>
          This test cannot start until Chrome grants live camera and microphone access. Keep both enabled for the full session.
        </p>

        {stream && status === 'granted' && (
          <video
            ref={videoRef}
            muted
            playsInline
            style={{ width: '100%', maxHeight: 180, borderRadius: 8, background: '#111', marginBottom: 10, objectFit: 'cover' }}
          />
        )}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => void requestAccess()}
            disabled={status === 'requesting'}
            className="lt-btn-primary"
            style={{ padding: '9px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <Camera size={14} />
            <Mic size={14} />
            {status === 'requesting' ? 'Requesting…' : status === 'granted' ? 'Re-check access' : 'Allow camera & microphone'}
          </button>
          {status === 'granted' && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
              <CheckCircle2 size={14} /> Access granted
            </span>
          )}
        </div>
        {error && <p style={{ color: '#c0392b', fontSize: 12, marginTop: 10, marginBottom: 0 }}>{error}</p>}
      </div>
    </div>
  );
}
