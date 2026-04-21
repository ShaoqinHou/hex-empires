/**
 * CelebrationBonusPanel — modal to pick a celebration bonus.
 *
 * Shown when `player.pendingCelebrationChoice` is set (engine has detected
 * that happiness crossed a celebration threshold). Displays the 2 bonus
 * options from the player's current government and dispatches
 * `PICK_CELEBRATION_BONUS` on selection.
 *
 * Uses PanelShell with priority="modal" and dismissible=false — the player
 * MUST pick a bonus before continuing.
 */

import { useGameState } from '../../providers/GameProvider';
import { PanelShell } from './PanelShell';
import type { GovernmentDef } from '@hex/engine';

interface CelebrationBonusPanelProps {
  readonly onClose: () => void;
}

export function CelebrationBonusPanel({ onClose }: CelebrationBonusPanelProps) {
  const { state, dispatch } = useGameState();
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const pending = player.pendingCelebrationChoice;
  if (!pending) return null;

  const governmentId = pending.governmentId;
  const governmentDef: GovernmentDef | undefined =
    state.config.governments?.get(governmentId);

  // Fallback: look up from ALL_GOVERNMENTS if config doesn't have governments
  const bonuses = governmentDef?.celebrationBonuses ?? [];

  const handlePick = (bonusId: string) => {
    dispatch({ type: 'PICK_CELEBRATION_BONUS', playerId: state.currentPlayerId, bonusId });
    onClose();
  };

  return (
    <PanelShell
      id="celebrationBonus"
      title="🎉 Celebration!"
      onClose={onClose}
      priority="modal"
      width="narrow"
      dismissible={false}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--panel-padding-md)' }}>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--panel-text-color)',
            lineHeight: 1.5,
          }}
        >
          Your empire&apos;s happiness has reached a celebration threshold!
          Choose one of the following bonuses for 10 turns:
        </div>

        {bonuses.length === 0 && (
          <div style={{ color: 'var(--panel-muted-color)', fontSize: '12px' }}>
            No celebration bonuses available for the current government.
          </div>
        )}

        {bonuses.map((bonus) => (
          <button
            key={bonus.id}
            type="button"
            onClick={() => handlePick(bonus.id)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              padding: 'var(--panel-padding-md) var(--panel-padding-lg)',
              borderRadius: 'var(--panel-radius)',
              backgroundColor: 'var(--panel-muted-bg)',
              border: '1px solid var(--panel-border)',
              color: 'var(--panel-text-color)',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--panel-accent-gold)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--panel-border)';
            }}
          >
            <span style={{ fontWeight: 600, fontSize: '14px' }}>
              {bonus.name}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--panel-muted-color)' }}>
              {bonus.description}
            </span>
          </button>
        ))}
      </div>
    </PanelShell>
  );
}
