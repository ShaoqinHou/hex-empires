/**
 * HUDManager — React context owning HUD / overlay registration state,
 * per-anchor cycle indices, and coordinated ESC dismissal.
 *
 * Sibling to `PanelManager`: panels are explicit player-triggered
 * surfaces; the HUD layer is the cursor-driven, engine-driven,
 * transient surface (tooltips, toasts, validation feedback, hints,
 * minimap, turn transition). Same shape — context + provider + hook —
 * with its own concerns (stack cycles, sticky-vs-transient dismiss).
 *
 * This provider does NOT render any overlay components; it is state +
 * API only. Actual overlays register themselves on mount and render in
 * the usual places until later cycles migrate them through the eventual
 * `TooltipShell`.
 *
 * ESC precedence (capture phase):
 *   1. Panel ESC wins. When any `[data-panel-id]` shell is present in
 *      the DOM, the HUD manager yields — the panel's own ESC handler
 *      (PanelManagerProvider) will handle it.
 *   2. Otherwise, if any sticky overlay is registered, dismiss the
 *      most-recently-registered sticky entry and stop propagation.
 *   3. Otherwise, if any cycle index is non-zero, reset every cycle
 *      back to 0 and stop propagation.
 *   4. Otherwise, do nothing — the event falls through to the canvas'
 *      selection-clear handler.
 *
 * Cycle (a) of the HUD UI rethink — see
 * `.codex/workflow/design/hud-ui-audit.md`.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { HUDElementId } from './hudRegistry';

// Loaded at provider mount so the custom properties are available as
// soon as any HUD consumer renders. Separate from panel-tokens.css.
import '../../styles/hud-tokens.css';

/**
 * Per-registration entry. Minimal on purpose — overlays announce their
 * presence and (optionally) whether they are sticky. Additional fields
 * (anchor, content hash, timeout) can be added in later cycles without
 * breaking the current shape.
 */
export interface HUDEntry {
  /**
   * Sticky overlays persist until explicitly dismissed (combat preview
   * in detailed tier, pinned tooltips, the minimap). Non-sticky
   * overlays are driven by transient state (cursor position, engine
   * event) and clean themselves up on pointer-leave.
   *
   * Only sticky overlays are dismissed by ESC.
   */
  readonly sticky?: boolean;

  /**
   * Optional anchor key identifying the map position / entity stack the
   * overlay is attached to (typically `coordToKey({ q, r })` for a hex).
   *
   * When an overlay registers with an `anchorKey`, the manager treats it
   * as the "active anchor" — the target of Tab-driven stack cycling.
   * The most-recently-registered anchor wins if multiple overlays
   * declare anchors simultaneously.
   *
   * Cycle (f) of the HUD UI rethink — see
   * `.codex/workflow/design/hud-ui-audit.md`.
   */
  readonly anchorKey?: string;
}

export interface HUDManagerValue {
  /** Register an overlay. Returns an unregister closure. */
  readonly register: (id: HUDElementId, entry: HUDEntry) => () => void;
  /** Dismiss a single overlay by id. No-op when not registered. */
  readonly dismiss: (id: HUDElementId) => void;
  /** Dismiss every registered overlay. */
  readonly dismissAll: () => void;
  /** Current cycle index for the given anchor key (defaults to 0). */
  readonly cycleIndex: (anchorKey: string) => number;
  /** Increment the cycle index for the given anchor key by 1. */
  readonly advanceCycle: (anchorKey: string) => void;
  /** Reset the cycle index for the given anchor key to 0. */
  readonly resetCycle: (anchorKey: string) => void;
  /** True when the given overlay id currently has a live registration. */
  readonly isActive: (id: HUDElementId) => boolean;
}

const HUDManagerContext = createContext<HUDManagerValue | null>(null);

export interface HUDManagerProviderProps {
  readonly children: ReactNode;
}

/**
 * Heuristic used in the ESC handler to yield to PanelManager. We look
 * for a DOM node stamped with `data-panel-id` — the same attribute
 * `PanelShell` writes. If no panel shell is mounted we handle the
 * keypress ourselves. This mirrors the approach PanelManager uses to
 * respect non-dismissible shells via `data-dismissible="false"`.
 */
function isAnyPanelOpen(): boolean {
  if (typeof document === 'undefined') return false;
  return document.querySelector('[data-panel-id]') !== null;
}

export function HUDManagerProvider({ children }: HUDManagerProviderProps) {
  // Registration state. Using a Map keeps insertion order, which we use
  // as "topmost" for ESC dismissal of sticky overlays.
  const [registrations, setRegistrations] = useState<ReadonlyMap<HUDElementId, HUDEntry>>(() => new Map());

  // Cycle indices per anchor key. State so consumers re-render when it
  // changes; a ref-backed mirror keeps the ESC handler's closure free
  // of stale-state bugs without forcing it into the effect dependency
  // list.
  const [cycles, setCycles] = useState<ReadonlyMap<string, number>>(() => new Map());
  const cyclesRef = useRef(cycles);
  cyclesRef.current = cycles;
  const registrationsRef = useRef(registrations);
  registrationsRef.current = registrations;

  const register = useCallback((id: HUDElementId, entry: HUDEntry) => {
    setRegistrations(prev => {
      const next = new Map(prev);
      next.set(id, entry);
      return next;
    });
    return () => {
      setRegistrations(prev => {
        if (!prev.has(id)) return prev;
        const next = new Map(prev);
        next.delete(id);
        return next;
      });
    };
  }, []);

  /**
   * Derive the current "active anchor" from the registration set: the
   * most-recently-registered entry that declared an `anchorKey`. Using
   * Map iteration order gives us insertion order for free, so the last
   * overlay to register wins — matching the "topmost sticky" rule in
   * the ESC handler.
   */
  const getActiveAnchorKey = useCallback((): string | null => {
    let last: string | null = null;
    registrationsRef.current.forEach(entry => {
      if (typeof entry.anchorKey === 'string') last = entry.anchorKey;
    });
    return last;
  }, []);

  const dismiss = useCallback((id: HUDElementId) => {
    setRegistrations(prev => {
      if (!prev.has(id)) return prev;
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const dismissAll = useCallback(() => {
    setRegistrations(prev => (prev.size === 0 ? prev : new Map()));
  }, []);

  const cycleIndex = useCallback((anchorKey: string): number => {
    return cycles.get(anchorKey) ?? 0;
  }, [cycles]);

  const advanceCycle = useCallback((anchorKey: string) => {
    setCycles(prev => {
      const next = new Map(prev);
      const current = prev.get(anchorKey) ?? 0;
      next.set(anchorKey, current + 1);
      return next;
    });
  }, []);

  const resetCycle = useCallback((anchorKey: string) => {
    setCycles(prev => {
      if (!prev.has(anchorKey)) return prev;
      const next = new Map(prev);
      next.delete(anchorKey);
      return next;
    });
  }, []);

  const isActive = useCallback((id: HUDElementId): boolean => {
    return registrations.has(id);
  }, [registrations]);

  // ESC handler. Capture phase so we run alongside PanelManager's
  // capture-phase handler. We explicitly yield to PanelManager by
  // checking for a mounted panel shell (see `isAnyPanelOpen`) — this
  // way a single ESC press dismisses the panel without also perturbing
  // any overlay state.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;

      // Ignore while typing in a form field — the panel manager applies
      // the same guard and for the same reason.
      const tag = (typeof document !== 'undefined'
        ? document.activeElement?.tagName
        : undefined);
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Panel ESC wins. Yield.
      if (isAnyPanelOpen()) return;

      const regs = registrationsRef.current;
      const cyc = cyclesRef.current;

      // Sticky overlays take priority — dismiss the most recent.
      let lastSticky: HUDElementId | null = null;
      regs.forEach((entry, id) => {
        if (entry.sticky) lastSticky = id;
      });
      if (lastSticky !== null) {
        dismiss(lastSticky);
        e.stopPropagation();
        return;
      }

      // No sticky overlays — reset any active stack-cycle.
      if (cyc.size > 0) {
        setCycles(new Map());
        e.stopPropagation();
        return;
      }

      // Otherwise fall through to the canvas' ESC-deselect handler.
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [dismiss]);

  // Tab handler — cycle f. When an overlay has registered with an
  // `anchorKey`, Tab advances the stack cycle for that anchor so the
  // tooltip body shows the next entity in the stack. We only consume
  // the keypress when we actually have an active anchor; otherwise we
  // leave Tab alone so it keeps its default "move keyboard focus"
  // semantics on panels, buttons, and the like.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      // Text-field focus → leave Tab alone so form navigation works.
      const tag = (typeof document !== 'undefined'
        ? document.activeElement?.tagName
        : undefined);
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      // Panel open → let the panel / browser handle Tab normally.
      if (isAnyPanelOpen()) return;

      const anchorKey = getActiveAnchorKey();
      if (anchorKey === null) return;

      e.preventDefault();
      e.stopPropagation();
      setCycles(prev => {
        const next = new Map(prev);
        const current = prev.get(anchorKey) ?? 0;
        next.set(anchorKey, current + 1);
        return next;
      });
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [getActiveAnchorKey]);

  const value = useMemo<HUDManagerValue>(() => ({
    register,
    dismiss,
    dismissAll,
    cycleIndex,
    advanceCycle,
    resetCycle,
    isActive,
  }), [register, dismiss, dismissAll, cycleIndex, advanceCycle, resetCycle, isActive]);

  return (
    <HUDManagerContext.Provider value={value}>
      {children}
    </HUDManagerContext.Provider>
  );
}

/**
 * Access the HUD manager. Throws if used outside an
 * `HUDManagerProvider` — mirrors `usePanelManager` / `useGame` so
 * mis-wirings surface at test time instead of producing silent no-ops.
 */
export function useHUDManager(): HUDManagerValue {
  const value = useContext(HUDManagerContext);
  if (value === null) {
    throw new Error('useHUDManager must be called inside a HUDManagerProvider');
  }
  return value;
}
