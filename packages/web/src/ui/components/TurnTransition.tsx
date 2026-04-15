import { useEffect, useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { useHUDManager } from '../hud/HUDManager';
import { TooltipShell } from '../hud/TooltipShell';

interface TurnTransitionProps {
  onComplete?: () => void;
}

/**
 * TurnTransition — brief full-screen interstitial shown on turn change,
 * displaying "Turn N / <Age> Age" and up to 3 recent notifications.
 *
 * HUD cycle (j): migrated from hand-rolled `fixed inset-0 z-50` +
 * inline `textShadow: '0 0 20px rgba(100, 181, 246, 0.8)'` to a
 * `<TooltipShell>` wrapper with `position="fixed-corner"` for the
 * announcement body, plus a click-catching backdrop layer.
 *
 * Design notes:
 *   - The backdrop (fixed inset) is kept as a separate sibling — it's
 *     behavior (click-anywhere-to-dismiss), not chrome. Its color and
 *     z-index come from `--hud-turn-transition-backdrop` and
 *     `--hud-z-tooltip`; no raw hex.
 *   - A dedicated `position="centered"` shell mode would better express
 *     this surface; its implementation is out of scope for this cycle
 *     (see `.claude/workflow/design/hud-ui-audit.md`, cycle k) — the
 *     audit plan calls for `position="modal-hint"` / full-screen shell
 *     in a later iteration. Until it lands, `fixed-corner` keeps the
 *     splash out of the raw-positioning anti-pattern.
 */
export function TurnTransition({ onComplete }: TurnTransitionProps) {
  const { state } = useGameState();
  const { register, dismiss } = useHUDManager();
  const [showOverlay, setShowOverlay] = useState(false);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [previousTurn, setPreviousTurn] = useState(state.turn);

  useEffect(() => {
    // Detect turn change
    if (state.turn !== previousTurn) {
      setShowOverlay(true);

      // Collect events from the log for the current player
      const playerEvents = state.log.filter(
        e => e.playerId === state.currentPlayerId && e.turn === state.turn
      );

      const eventMessages = playerEvents.map(e => e.message);
      setNotifications(eventMessages);

      // Auto-dismiss quickly so it doesn't block gameplay
      const timer = setTimeout(() => {
        setShowOverlay(false);
        onComplete?.();
      }, 600);

      setPreviousTurn(state.turn);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [state.turn, state.log, state.currentPlayerId, previousTurn, onComplete]);

  // Register with HUDManager as sticky so ESC dismisses us via the
  // manager's precedence chain (panels first, then sticky overlays).
  useEffect(() => {
    if (!showOverlay) return undefined;
    const unregister = register('turnTransition', { sticky: true });
    return () => {
      dismiss('turnTransition');
      unregister();
    };
  }, [showOverlay, register, dismiss]);

  const handleDismiss = () => {
    setShowOverlay(false);
    onComplete?.();
  };

  if (!showOverlay) return null;

  const meaningfulNotifications = notifications.filter(n => !n.includes('started'));

  return (
    <>
      {/* Full-viewport click-catcher + fade wash. Tokens for color and
          z-index; no raw rgba / Tailwind color utilities. Pointer-events
          enabled so clicking anywhere dismisses. */}
      <div
        data-testid="turn-transition-backdrop"
        onClick={handleDismiss}
        style={{
          position: 'fixed',
          inset: 0,
          cursor: 'pointer',
          backgroundColor: 'var(--hud-turn-transition-backdrop)',
          zIndex: 'var(--hud-z-tooltip)' as unknown as number,
          transition: `opacity var(--hud-turn-transition-animation-duration) ease-out`,
        }}
        aria-hidden="true"
      />

      {/* Announcement body via TooltipShell — shell owns positioning,
          user-select, context-menu suppression, z-index layering. */}
      <TooltipShell
        id="turnTransition"
        anchor={{ kind: 'screen', x: 0, y: 0 }}
        position="fixed-corner"
        tier="detailed"
        sticky
      >
        <div
          className="animate-fade-in"
          style={{ textAlign: 'center', minWidth: '240px' }}
        >
          <div
            style={{
              fontSize: '3.5rem',
              fontWeight: 700,
              lineHeight: 1.1,
              marginBottom: 'var(--hud-padding-md)',
              color: 'var(--hud-text-emphasis)',
              textShadow: 'var(--hud-turn-transition-accent-shadow)',
            }}
          >
            Turn {state.turn}
          </div>

          {state.age.currentAge && (
            <div
              style={{
                fontSize: '0.95rem',
                textTransform: 'uppercase',
                letterSpacing: '0.2em',
                marginBottom: 'var(--hud-padding-md)',
                color: 'var(--hud-text-muted)',
              }}
            >
              {state.age.currentAge} Age
            </div>
          )}

          {/* Notifications — only render if there are meaningful events */}
          {meaningfulNotifications.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--hud-padding-sm)',
                padding: 'var(--hud-padding-md)',
                borderRadius: 'var(--hud-radius)',
                border: '1px solid var(--hud-border)',
                backgroundColor: 'var(--hud-enemy-activity-item-bg)',
              }}
            >
              {meaningfulNotifications.slice(0, 3).map((msg, i) => (
                <div
                  key={i}
                  style={{
                    fontSize: 13,
                    color: 'var(--hud-text-color)',
                  }}
                >
                  {msg}
                </div>
              ))}
              {meaningfulNotifications.length > 3 && (
                <div
                  style={{
                    fontSize: 11,
                    fontStyle: 'italic',
                    color: 'var(--hud-text-muted)',
                  }}
                >
                  +{meaningfulNotifications.length - 3} more events
                </div>
              )}
            </div>
          )}

          <div
            style={{
              fontSize: 12,
              marginTop: 'var(--hud-padding-md)',
              opacity: 0.6,
              color: 'var(--hud-text-muted)',
            }}
          >
            Click anywhere to continue
          </div>
        </div>

        <style>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.9);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
          .animate-fade-in {
            animation: fadeIn var(--hud-turn-transition-animation-duration) ease-out;
          }
        `}</style>
      </TooltipShell>
    </>
  );
}
