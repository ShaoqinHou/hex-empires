/**
 * IdleUnitsToast — transient "No idle units" message shown when the player
 * presses J but every unit has already moved or is fortified this turn.
 *
 * Follows the HUD overlay pattern (TooltipShell + fixed-corner, token-only
 * styling, HUDManager registration). Auto-dismisses after 2.5 s.
 */

import { useEffect } from 'react';
import { TooltipShell } from '../hud/TooltipShell';
import { useHUDManager } from '../hud/HUDManager';

const DISMISS_DELAY_MS = 2500;

interface IdleUnitsToastProps {
  /** Incremented by the caller each time J is pressed with no idle unit. */
  readonly triggerCount: number;
}

export function IdleUnitsToast({ triggerCount }: IdleUnitsToastProps) {
  const { register, dismiss, isActive } = useHUDManager();
  // Visibility derives from HUDManager registration — single source of
  // truth. Phase 6d UI-C-VF1: the earlier revision used a local
  // `useState<boolean>` alongside `register`/`dismiss`, which is the
  // antipattern documented in `.claude/rules/ui-overlays.md`. Blind-eval
  // commit-review flagged this as F-1196b755 on 600662a; fixed here.
  const isVisible = isActive('idleUnitsToast');

  // Each new trigger (re-)shows the toast and resets the auto-dismiss timer.
  useEffect(() => {
    if (triggerCount === 0) return;

    const unregister = register('idleUnitsToast', { sticky: false });

    const timer = setTimeout(() => {
      dismiss('idleUnitsToast');
    }, DISMISS_DELAY_MS);

    return () => {
      clearTimeout(timer);
      unregister();
    };
  }, [triggerCount, register, dismiss]);

  if (!isVisible) return null;

  return (
    <TooltipShell
      id="idleUnitsToast"
      anchor={{ kind: 'screen', x: 0, y: 0 }}
      position="fixed-corner"
      tier="detailed"
    >
      <div
        data-testid="idle-units-toast"
        role="status"
        aria-live="polite"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--panel-padding-md)',
          color: 'var(--panel-text-color)',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        <span
          aria-hidden="true"
          style={{ fontSize: 16, color: 'var(--panel-muted-color)' }}
        >
          &#x23F8;
        </span>
        No idle units
      </div>
    </TooltipShell>
  );
}
