/**
 * HappinessHUD — celebrations progress bar.
 *
 * Fixed-position HUD element showing empire happiness as a progress bar
 * toward the next celebration threshold. When happiness reaches the
 * threshold, the engine triggers a celebration choice.
 *
 * Reads from `useGameState()` + `celebrationThresholdForCount` from
 * the engine. Styled exclusively with panel-tokens.css variables.
 */

import { useGameState } from '../../providers/GameProvider';
import { celebrationThresholdForCount } from '@hex/engine';

export function HappinessHUD() {
  const { state } = useGameState();
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const globalHappiness = player.globalHappiness ?? 0;
  const threshold = celebrationThresholdForCount(player.age, player.celebrationCount);
  const pct = Math.min(100, Math.max(0, (globalHappiness / threshold) * 100));

  return (
    <div
      data-hud-id="happinessProgress"
      style={{
        position: 'fixed',
        bottom: 80,
        left: 12,
        width: 180,
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        zIndex: 'var(--panel-z-info)',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          fontSize: '11px',
          color: 'var(--panel-muted-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>🎉 Celebrations</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>
          {Math.floor(globalHappiness)} / {threshold}
        </span>
      </div>
      <div
        style={{
          height: 8,
          borderRadius: 'var(--panel-radius)',
          backgroundColor: 'color-mix(in srgb, var(--panel-accent-gold) 15%, transparent)',
          border: '1px solid var(--panel-border)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: 'var(--panel-radius)',
            backgroundColor: 'var(--panel-accent-gold)',
            boxShadow: pct >= 100 ? '0 0 8px color-mix(in srgb, var(--panel-accent-gold) 60%, transparent)' : undefined,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div
        style={{
          fontSize: '10px',
          color: 'var(--panel-muted-color)',
          textAlign: 'center',
        }}
      >
        {pct >= 100 ? 'Celebration ready!' : `Next celebration at ${threshold}`}
      </div>
    </div>
  );
}
