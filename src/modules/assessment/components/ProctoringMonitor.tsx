import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { AlertTriangle, Camera, CameraOff, Shield } from 'lucide-react';

interface ProctoringMonitorProps {
  attemptId: string;
  violationCount?: number;
  showWebcam?: boolean;
  deviceFingerprint?: string | null;
  ipAddress?: string | null;
}

export function ProctoringMonitor({
  attemptId,
  violationCount = 0,
  showWebcam = false,
  deviceFingerprint,
  ipAddress,
}: ProctoringMonitorProps) {
  const [recent, setRecent] = useState<{ type: string; created_at: string }[]>([]);
  const [cameraStatus, setCameraStatus] = useState<'idle' | 'active' | 'denied' | 'error'>('idle');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    const load = async () => {
      const { data } = await supabase
        .from('assessment_violations')
        .select('violation_type, created_at')
        .eq('attempt_id', attemptId)
        .order('created_at', { ascending: false })
        .limit(5);
      setRecent(data || []);
    };
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [attemptId]);

  useEffect(() => {
    if (!showWebcam) return;

    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setCameraStatus('active');
      } catch {
        setCameraStatus('denied');
      }
    })();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [showWebcam]);

  const integrity = Math.max(0, 100 - violationCount * 8);

  return (
    <div className="lt-card" style={{ padding: 14, fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <Shield size={14} />
        <span style={{ fontWeight: 700 }}>Integrity monitor</span>
      </div>

      {showWebcam && (
        <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', background: '#111', aspectRatio: '4/3', position: 'relative' }}>
          {cameraStatus === 'active' ? (
            <video ref={videoRef} muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', gap: 6, padding: 12, textAlign: 'center' }}>
              {cameraStatus === 'denied' ? <CameraOff size={20} /> : <Camera size={20} />}
              <span style={{ fontSize: 11 }}>
                {cameraStatus === 'denied' ? 'Camera access denied' : 'Face not detected — camera status only'}
              </span>
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ color: '#666' }}>Integrity score</span>
          <span style={{ fontWeight: 700, color: integrity < 70 ? '#c0392b' : '#16a34a' }}>{integrity}%</span>
        </div>
        <div style={{ height: 4, background: '#f0f0f0', borderRadius: 2 }}>
          <div style={{ width: `${integrity}%`, height: '100%', background: integrity < 70 ? '#c0392b' : '#171717', borderRadius: 2 }} />
        </div>
      </div>
      <div style={{ color: '#666', marginBottom: 6 }}>Violations: {violationCount}</div>

      {(deviceFingerprint || ipAddress) && (
        <div style={{ fontSize: 10, color: '#999', marginBottom: 8, lineHeight: 1.5 }}>
          {ipAddress && <div>IP: {ipAddress}</div>}
          {deviceFingerprint && <div style={{ wordBreak: 'break-all' }}>Device: {deviceFingerprint}</div>}
        </div>
      )}

      {recent.length > 0 && (
        <div>
          {recent.map((v, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', color: '#999' }}>
              <AlertTriangle size={11} />
              {v.violation_type.replace(/_/g, ' ')}
            </div>
          ))}
        </div>
      )}
      <p style={{ fontSize: 10, color: '#bbb', marginTop: 8, lineHeight: 1.4 }}>
        Tab switches, copy/paste, fullscreen exit, and focus loss are logged.
      </p>
    </div>
  );
}
