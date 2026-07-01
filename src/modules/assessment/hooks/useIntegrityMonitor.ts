import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { DEFAULT_INTEGRITY_SETTINGS } from '../constants';

interface IntegritySettings {
  maxViolations?: number;
  autoSubmitOnMax?: boolean;
  blockCopyPaste?: boolean;
  requireFullscreen?: boolean;
  logIp?: boolean;
  logDevice?: boolean;
}

export function getDeviceFingerprint(): string {
  const parts = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ];
  try {
    return btoa(parts.join('|')).slice(0, 48);
  } catch {
    return parts.join('|').slice(0, 48);
  }
}

async function fetchClientIp(): Promise<string | null> {
  try {
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    return data.ip ?? null;
  } catch {
    return null;
  }
}

export function useIntegrityMonitor(
  attemptId: string | null,
  onMaxViolations?: () => void,
  settings: IntegritySettings = DEFAULT_INTEGRITY_SETTINGS,
) {
  const violationCountRef = useRef(0);
  const [violationCount, setViolationCount] = useState(0);
  const max = settings.maxViolations ?? DEFAULT_INTEGRITY_SETTINGS.maxViolations;

  const recordViolation = useCallback(async (type: string, metadata: Record<string, unknown> = {}) => {
    if (!attemptId) return;
    violationCountRef.current += 1;
    setViolationCount(violationCountRef.current);

    await supabase.from('assessment_violations').insert({
      attempt_id: attemptId,
      violation_type: type,
      severity: violationCountRef.current >= max ? 'high' : 'medium',
      metadata: {
        ...metadata,
        count: violationCountRef.current,
        timestamp: new Date().toISOString(),
      },
    });

    if (settings.autoSubmitOnMax && violationCountRef.current >= max) {
      onMaxViolations?.();
    }
  }, [attemptId, max, onMaxViolations, settings.autoSubmitOnMax]);

  useEffect(() => {
    if (!attemptId) return;

    const logDeviceInfo = async () => {
      const fingerprint = getDeviceFingerprint();
      const ip = settings.logIp !== false ? await fetchClientIp() : null;
      const payload: Record<string, unknown> = {};
      if (settings.logDevice !== false) {
        payload.device_fingerprint = fingerprint;
        payload.user_agent = navigator.userAgent;
      }
      if (ip) payload.ip_address = ip;
      if (Object.keys(payload).length) {
        await supabase.from('assessment_attempts').update(payload).eq('id', attemptId);
      }
    };
    logDeviceInfo();

    if (settings.requireFullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {
        recordViolation('fullscreen_exit', { reason: 'request_denied' });
      });
    }

    const onFullscreenChange = () => {
      if (settings.requireFullscreen && !document.fullscreenElement) {
        recordViolation('fullscreen_exit', { fullscreen: false });
      }
    };

    const onVisibility = () => {
      if (document.hidden) recordViolation('tab_switch', { hidden: true });
    };

    const onBlur = () => recordViolation('focus_loss');

    const onCopy = (e: ClipboardEvent) => {
      if (settings.blockCopyPaste) {
        e.preventDefault();
        recordViolation('copy_paste', { action: 'copy' });
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      if (settings.blockCopyPaste) {
        e.preventDefault();
        recordViolation('copy_paste', { action: 'paste' });
      }
    };

    const onContextMenu = (e: Event) => {
      e.preventDefault();
      recordViolation('right_click');
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen' || e.code === 'PrintScreen') {
        recordViolation('screenshot_warning', { key: e.key });
      }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [attemptId, recordViolation, settings.blockCopyPaste, settings.requireFullscreen, settings.logIp, settings.logDevice]);

  return { violationCount, recordViolation };
}
