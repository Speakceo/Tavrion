import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { DEFAULT_INTEGRITY_SETTINGS } from '../constants';

interface IntegritySettings {
  maxViolations?: number;
  autoSubmitOnMax?: boolean;
  blockCopyPaste?: boolean;
  requireFullscreen?: boolean;
}

export function useIntegrityMonitor(
  attemptId: string | null,
  onMaxViolations?: () => void,
  settings: IntegritySettings = DEFAULT_INTEGRITY_SETTINGS,
) {
  const violationCount = useRef(0);
  const max = settings.maxViolations ?? DEFAULT_INTEGRITY_SETTINGS.maxViolations;

  const recordViolation = useCallback(async (type: string, metadata: Record<string, unknown> = {}) => {
    if (!attemptId) return;
    violationCount.current += 1;

    await supabase.from('assessment_violations').insert({
      attempt_id: attemptId,
      violation_type: type,
      severity: violationCount.current >= max ? 'high' : 'medium',
      metadata: {
        ...metadata,
        count: violationCount.current,
        timestamp: new Date().toISOString(),
      },
    });

    if (settings.autoSubmitOnMax && violationCount.current >= max) {
      onMaxViolations?.();
    }
  }, [attemptId, max, onMaxViolations, settings.autoSubmitOnMax]);

  useEffect(() => {
    if (!attemptId) return;

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

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', onBlur);
    document.addEventListener('copy', onCopy);
    document.addEventListener('paste', onPaste);
    document.addEventListener('contextmenu', onContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('copy', onCopy);
      document.removeEventListener('paste', onPaste);
      document.removeEventListener('contextmenu', onContextMenu);
    };
  }, [attemptId, recordViolation, settings.blockCopyPaste]);

  return { violationCount: violationCount.current, recordViolation };
}
