/**
 * useAltKey — window-level Alt key tracking hook.
 *
 * Returns `true` while the Alt key is held anywhere on the page. Resets to
 * `false` on keyup OR on window blur (so Alt-Tabbing away and releasing the
 * key in another window doesn't leave the hook "stuck" in detailed-tier
 * mode the next time the game window regains focus).
 *
 * Used by the HUD layer to toggle tooltip tiers (compact ↔ detailed) and by
 * any other overlay that wants progressive disclosure on Alt-hold. The Alt
 * key itself is currently ALSO tracked in `GameProvider` and exposed as
 * `isAltPressed`; this hook exists as the standalone primitive the HUD rule
 * doc references (`.claude/rules/ui-overlays.md` — "tier is a prop driven
 * by the Alt-held state"). New HUD consumers should prefer this hook over
 * prop-drilling from GameProvider.
 */
import { useEffect, useState } from 'react';

export function useAltKey(): boolean {
  const [alt, setAlt] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.altKey) setAlt(true);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      // Use altKey (not e.key === 'Alt') because some platforms emit keyup
      // for non-Alt keys while Alt is still held. Clearing on any keyup
      // with altKey===false catches releases cleanly.
      if (!e.altKey) setAlt(false);
    };
    const onBlur = () => setAlt(false);

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  return alt;
}
