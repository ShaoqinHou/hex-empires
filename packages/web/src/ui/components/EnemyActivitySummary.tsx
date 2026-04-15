import { useEffect, useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { TooltipShell } from '../hud/TooltipShell';
import { useHUDManager } from '../hud/HUDManager';

interface EnemyActivitySummaryProps {
  onClose?: () => void;
}

/**
 * EnemyActivitySummary — post-AI-turn summary of enemy moves shown to
 * the human player. Surfaces as a sticky HUD overlay in a fixed screen
 * corner; auto-dismisses after 8 seconds or on close-button click.
 *
 * HUD cycle (j): migrated from hand-rolled `fixed top-20 left-4 z-40`
 * positioning + `var(--color-*)` chrome to a `<TooltipShell>` wrapper
 * with `position="fixed-corner"` and `sticky`. User-select suppression
 * and context-menu suppression are owned by the shell. The overlay
 * registers with `HUDManager` as a sticky entry so ESC can dismiss it
 * via the manager's standard precedence chain.
 */
export function EnemyActivitySummary({ onClose }: EnemyActivitySummaryProps) {
  const { state } = useGameState();
  const { register, dismiss } = useHUDManager();
  const [show, setShow] = useState(false);
  const [activities, setActivities] = useState<string[]>([]);

  useEffect(() => {
    // Show summary when turn changes to human player
    const currentPlayer = state.players.get(state.currentPlayerId);
    const isHumanTurn = currentPlayer?.isHuman ?? false;

    if (isHumanTurn) {
      // Collect enemy activities from the previous turn
      const enemyActivities = state.log.filter(
        e => e.turn === state.turn && e.playerId !== state.currentPlayerId
      );

      if (enemyActivities.length > 0) {
        const summary = enemyActivities.map(e => {
          const player = state.players.get(e.playerId);
          const playerName = player?.name ?? 'Unknown';
          return `${playerName}: ${e.message}`;
        });

        setActivities(summary);
        setShow(true);

        // Auto-hide after 8 seconds
        const timer = setTimeout(() => {
          setShow(false);
          onClose?.();
        }, 8000);

        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [state.turn, state.currentPlayerId, state.log, state.players, onClose]);

  // Register with HUDManager as sticky so ESC dismisses us via the
  // manager's precedence chain (panels first, then sticky overlays).
  useEffect(() => {
    if (!show) return undefined;
    const unregister = register('enemyActivitySummary', { sticky: true });
    return () => {
      dismiss('enemyActivitySummary');
      unregister();
    };
  }, [show, register, dismiss]);

  if (!show || activities.length === 0) return null;

  const handleClose = () => {
    setShow(false);
    onClose?.();
  };

  return (
    <TooltipShell
      id="enemyActivitySummary"
      anchor={{ kind: 'screen', x: 0, y: 0 }}
      position="fixed-corner"
      tier="detailed"
      sticky
    >
      <div style={{ minWidth: '280px', maxWidth: '360px' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: 'var(--hud-padding-sm)',
            marginBottom: 'var(--hud-padding-sm)',
            borderBottom: '1px solid var(--hud-border)',
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: 'var(--hud-text-emphasis)',
            }}
          >
            Enemy Activity
          </div>
          <button
            type="button"
            aria-label="Dismiss enemy activity summary"
            style={{
              fontSize: 12,
              color: 'var(--hud-text-muted)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              padding: '0 4px',
              lineHeight: 1,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--hud-enemy-activity-close-hover)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--hud-text-muted)';
            }}
            onClick={handleClose}
          >
            ×
          </button>
        </div>

        {/* Activities list */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--hud-padding-sm)',
            maxHeight: '16rem',
            overflowY: 'auto',
          }}
        >
          {activities.map((activity, index) => (
            <div
              key={index}
              style={{
                fontSize: 12,
                padding: 'var(--hud-padding-sm) var(--hud-padding-md)',
                borderRadius: 'var(--hud-radius)',
                backgroundColor: 'var(--hud-enemy-activity-item-bg)',
                color: 'var(--hud-text-color)',
                borderLeft: '2px solid var(--hud-enemy-activity-item-border-accent)',
              }}
            >
              {activity}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          style={{
            fontSize: 11,
            fontStyle: 'italic',
            textAlign: 'center',
            paddingTop: 'var(--hud-padding-sm)',
            marginTop: 'var(--hud-padding-sm)',
            borderTop: '1px solid var(--hud-border)',
            color: 'var(--hud-text-muted)',
          }}
        >
          Click × or wait to dismiss
        </div>
      </div>
    </TooltipShell>
  );
}
