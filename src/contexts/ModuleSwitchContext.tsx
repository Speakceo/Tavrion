import {
  createContext, useCallback, useContext, useRef, useState, type ReactNode,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, ClipboardCheck } from 'lucide-react';

export type ModuleTarget = 'lms' | 'test';

const ENTER_KEY = 'module_switch_enter';

interface ModuleSwitchContextValue {
  switchModule: (target: ModuleTarget, path: string) => void;
  isSwitching: boolean;
}

const ModuleSwitchContext = createContext<ModuleSwitchContextValue | null>(null);

function ModuleSwitchOverlay({
  target,
  phase,
}: {
  target: ModuleTarget;
  phase: 'in' | 'out';
}) {
  const isTest = target === 'test';

  return (
    <div
      className={`module-switch-overlay module-switch-overlay--${phase}`}
      aria-hidden
    >
      <div className={`module-switch-panel module-switch-panel--${target} module-switch-panel--${phase}`}>
        <div className="module-switch-icon">
          {isTest ? <ClipboardCheck size={28} strokeWidth={2.2} /> : <BookOpen size={28} strokeWidth={2.2} />}
        </div>
        <div className="module-switch-copy">
          <span className="module-switch-kicker">Switching to</span>
          <span className="module-switch-title">{isTest ? 'Tavrion Test' : 'Tavrion LMS'}</span>
        </div>
        <div className="module-switch-bar" />
      </div>
    </div>
  );
}

export function ModuleSwitchProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [overlay, setOverlay] = useState<{ target: ModuleTarget; phase: 'in' | 'out' } | null>(null);
  const busyRef = useRef(false);

  const switchModule = useCallback((target: ModuleTarget, path: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setOverlay({ target, phase: 'in' });

    window.setTimeout(() => {
      sessionStorage.setItem(ENTER_KEY, target);
      navigate(path);
      setOverlay({ target, phase: 'out' });
      window.setTimeout(() => {
        setOverlay(null);
        busyRef.current = false;
      }, 320);
    }, 340);
  }, [navigate]);

  return (
    <ModuleSwitchContext.Provider value={{ switchModule, isSwitching: !!overlay }}>
      {children}
      {overlay && <ModuleSwitchOverlay target={overlay.target} phase={overlay.phase} />}
    </ModuleSwitchContext.Provider>
  );
}

export function useModuleSwitch() {
  const ctx = useContext(ModuleSwitchContext);
  if (!ctx) throw new Error('useModuleSwitch must be used within ModuleSwitchProvider');
  return ctx;
}

export function useModuleEnterAnimation(target: ModuleTarget) {
  const [active, setActive] = useState(false);

  const trigger = useCallback(() => {
    const enter = sessionStorage.getItem(ENTER_KEY);
    if (enter !== target) return;
    sessionStorage.removeItem(ENTER_KEY);
    setActive(true);
    window.setTimeout(() => setActive(false), 520);
  }, [target]);

  return { active, trigger };
}
