/**
 * PanelManager — React context owning `activePanel` state.
 *
 * Single-slot model: at most one panel is open at a time. Opening a new
 * panel replaces whatever was open. ESC closes the active panel in
 * capture phase so downstream handlers (e.g. GameCanvas's selection
 * clear) don't also run.
 *
 * This provider does NOT mount any panel components — it is state + API
 * only. Actual rendering stays in App.tsx until later cycles migrate
 * each panel to `PanelShell` + this manager.
 *
 * Cycle 1 of the panel-manager refactor.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { PanelId } from './panelRegistry';

export interface PanelManagerValue {
  readonly activePanel: PanelId | null;
  readonly openPanel: (id: PanelId) => void;
  readonly closePanel: () => void;
  readonly isOpen: (id: PanelId) => boolean;
  readonly togglePanel: (id: PanelId) => void;
}

const PanelManagerContext = createContext<PanelManagerValue | null>(null);

export interface PanelManagerProviderProps {
  readonly children: ReactNode;
  /** Optional initial panel, primarily for tests. */
  readonly initialPanel?: PanelId | null;
}

export function PanelManagerProvider({ children, initialPanel = null }: PanelManagerProviderProps) {
  const [activePanel, setActivePanel] = useState<PanelId | null>(initialPanel);

  const openPanel = useCallback((id: PanelId) => {
    setActivePanel(id);
  }, []);

  const closePanel = useCallback(() => {
    setActivePanel(null);
  }, []);

  const isOpen = useCallback((id: PanelId): boolean => {
    // Read latest state via functional setState? No — this closes over
    // the render's `activePanel`. React re-renders when it changes so
    // callers always get a fresh comparator. Avoiding useRef here keeps
    // the API reactive for consumers that read `isOpen(x)` in render.
    return activePanel === id;
  }, [activePanel]);

  const togglePanel = useCallback((id: PanelId) => {
    setActivePanel(prev => (prev === id ? null : id));
  }, []);

  // ESC closes the active panel. Capture phase so we intercept before
  // bubble-phase handlers (GameCanvas's ESC deselect). stopPropagation
  // prevents the downstream handler from running when we actually did
  // close a panel. Ignored when focus is in a form field so text inputs
  // can still use ESC normally.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (activePanel === null) return;
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setActivePanel(null);
      e.stopPropagation();
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [activePanel]);

  const value = useMemo<PanelManagerValue>(() => ({
    activePanel,
    openPanel,
    closePanel,
    isOpen,
    togglePanel,
  }), [activePanel, openPanel, closePanel, isOpen, togglePanel]);

  return (
    <PanelManagerContext.Provider value={value}>
      {children}
    </PanelManagerContext.Provider>
  );
}

/**
 * Access the panel manager. Throws if used outside a
 * `PanelManagerProvider` — this mirrors the pattern of `useGame` in
 * GameProvider and surfaces mis-wirings at test time.
 */
export function usePanelManager(): PanelManagerValue {
  const value = useContext(PanelManagerContext);
  if (value === null) {
    throw new Error('usePanelManager must be called inside a PanelManagerProvider');
  }
  return value;
}
