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
  detectAiSidebar?: boolean;
}

function isChromiumBrowser() {
  const ua = navigator.userAgent;
  return /Chrome|CriOS|Edg\//.test(ua) && !/OPR\//.test(ua);
}

function hasWindowAiApi() {
  const w = window as Window & { ai?: unknown; model?: unknown };
  return Boolean(w.ai || (navigator as Navigator & { ml?: unknown }).ml);
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
  const lastInnerWidthRef = useRef(typeof window !== 'undefined' ? window.innerWidth : 0);
  const lastOuterWidthRef = useRef(typeof window !== 'undefined' ? window.outerWidth : 0);
  const sidePanelOpenRef = useRef(false);
  const lastSidebarSignalAtRef = useRef(0);

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
        chrome: isChromiumBrowser(),
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

    if (settings.detectAiSidebar !== false && isChromiumBrowser() && hasWindowAiApi()) {
      recordViolation('chrome_ai_api_detected', { api: true });
    }

    const onFullscreenChange = () => {
      if (settings.requireFullscreen && !document.fullscreenElement) {
        recordViolation('fullscreen_exit', { fullscreen: false });
      }
    };

    const onVisibility = () => {
      if (document.hidden) recordViolation('tab_switch', { hidden: true });
    };

    const onBlur = () => {
      const now = Date.now();
      const recentSidebarSignal = now - lastSidebarSignalAtRef.current < 4000;
      const chromeChromeGap = window.outerWidth - window.innerWidth;
      // Large chrome gap + visible blur usually means side panel / Gemini / AI tools panel
      const looksLikeSideChrome =
        settings.detectAiSidebar !== false
        && isChromiumBrowser()
        && document.visibilityState === 'visible'
        && (sidePanelOpenRef.current || recentSidebarSignal || chromeChromeGap >= 320);

      if (looksLikeSideChrome) {
        recordViolation('ai_sidebar_use', {
          reason: sidePanelOpenRef.current || recentSidebarSignal
            ? 'focus_lost_while_side_panel_open'
            : 'chrome_gap_while_visible',
          innerWidth: window.innerWidth,
          outerWidth: window.outerWidth,
          chromeGap: chromeChromeGap,
        });
        return;
      }
      recordViolation('focus_loss');
    };

    const onCopy = (e: ClipboardEvent) => {
      if (settings.blockCopyPaste) {
        e.preventDefault();
        recordViolation('copy_paste', { action: 'copy' });
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      if (settings.blockCopyPaste) {
        e.preventDefault();
        const text = e.clipboardData?.getData('text') || '';
        recordViolation('copy_paste', {
          action: 'paste',
          length: text.length,
          suspicious_ai_paste: text.length > 400,
        });
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
      // Common Chrome side-panel / Gemini shortcuts
      if (isChromiumBrowser() && e.altKey && (e.key === 'g' || e.key === 'G')) {
        recordViolation('ai_sidebar_shortcut', { combo: 'alt+g' });
      }
    };

    const onResize = () => {
      if (settings.detectAiSidebar === false || !isChromiumBrowser()) {
        lastInnerWidthRef.current = window.innerWidth;
        lastOuterWidthRef.current = window.outerWidth;
        return;
      }

      const prevInner = lastInnerWidthRef.current;
      const prevOuter = lastOuterWidthRef.current;
      const nextInner = window.innerWidth;
      const nextOuter = window.outerWidth;
      const innerDrop = prevInner - nextInner;
      const outerDelta = Math.abs(nextOuter - prevOuter);

      // Side panel typically shrinks page width a lot without resizing the OS window much
      if (innerDrop >= 280 && outerDelta < 80) {
        sidePanelOpenRef.current = true;
        lastSidebarSignalAtRef.current = Date.now();
        recordViolation('browser_side_panel', {
          prevInner,
          nextInner,
          prevOuter,
          nextOuter,
          innerDrop,
        });
      } else if (sidePanelOpenRef.current && nextInner - prevInner >= 240) {
        sidePanelOpenRef.current = false;
      }

      lastInnerWidthRef.current = nextInner;
      lastOuterWidthRef.current = nextOuter;
    };

    // Mid-test: camera/mic revoked
    const permissionCleanups: Array<() => void> = [];
    let permissionsCancelled = false;
    void (async () => {
      for (const name of ['camera', 'microphone'] as const) {
        try {
          const status = await navigator.permissions.query({ name: name as PermissionName });
          if (permissionsCancelled) return;
          const onChange = () => {
            if (status.state === 'denied') {
              recordViolation('media_permission_revoked', { device: name });
            }
          };
          status.addEventListener('change', onChange);
          permissionCleanups.push(() => status.removeEventListener('change', onChange));
        } catch {
          // Permissions API may not support camera/mic on all browsers
        }
      }
    })();

    let mediaMissingLogged = false;
    // Periodic check: media tracks killed mid-test
    const mediaWatch = window.setInterval(async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cams = devices.filter((d) => d.kind === 'videoinput' && d.label);
        const mics = devices.filter((d) => d.kind === 'audioinput' && d.label);
        // Empty labels usually mean permission not granted
        if ((!cams.length || !mics.length) && !mediaMissingLogged) {
          mediaMissingLogged = true;
          recordViolation('media_device_missing', {
            cameras: cams.length,
            microphones: mics.length,
          });
        }
      } catch {
        // ignore
      }
    }, 20000);

    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    window.addEventListener('resize', onResize);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      permissionsCancelled = true;
      permissionCleanups.forEach((fn) => fn());
      window.clearInterval(mediaWatch);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [attemptId, recordViolation, settings.blockCopyPaste, settings.requireFullscreen, settings.logIp, settings.logDevice, settings.detectAiSidebar]);

  return { violationCount, recordViolation };
}
