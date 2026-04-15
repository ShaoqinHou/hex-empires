import { useGameState } from '../../providers/GameProvider';
import { TooltipShell } from '../hud/TooltipShell';
import type { CombatPreview } from '@hex/engine';

interface CombatHoverPreviewProps {
  preview: CombatPreview | null;
  position: { x: number; y: number } | null;
}

/**
 * Combat preview overlay.
 *
 * Shows detailed combat math (attacker vs. defender strengths, damage
 * ranges, odds, outcome, modifiers) when a unit is selected and the
 * cursor hovers an attackable enemy. The content is dense enough to
 * occlude the hovered tile, so the overlay renders in the viewport's
 * fixed bottom-right corner via `<TooltipShell position="fixed-corner">`.
 *
 * `sticky` is set because the caller (GameCanvas) owns the dismiss
 * lifecycle — the overlay clears when the cursor leaves attack range,
 * not on pointer-leave of the tooltip itself.
 *
 * Z-index drops from the audit-flagged `1000` to
 * `var(--hud-z-fixed-corner)` (120, set by TooltipShell) so modal
 * panels at 210 correctly cover the preview during age transitions,
 * victory, and crises.
 */
export function CombatHoverPreview({ preview, position }: CombatHoverPreviewProps) {
  const { state, unitRegistry } = useGameState();

  if (!preview || !position || !preview.canAttack) {
    return null;
  }

  const attacker = state.units.get(preview.attackerId);
  const defender = preview.target.type === 'unit' ? state.units.get(preview.target.unitId) : null;
  const city = preview.target.type === 'city' ? state.cities.get(preview.target.cityId) : null;
  const attackerDef = attacker ? unitRegistry.get(attacker.typeId) : null;
  const defenderDef = defender ? unitRegistry.get(defender.typeId) : null;

  if (!attacker || (!defender && !city) || !attackerDef) {
    return null;
  }

  const defenderName = defenderDef ? defenderDef.name : city?.name ?? 'Unknown';

  const oddsColor = preview.odds.attackerWinPercent >= 70
    ? 'var(--hud-accent-friendly)'
    : preview.odds.attackerWinPercent >= 40
    ? 'var(--hud-text-emphasis)'
    : 'var(--hud-accent-enemy)';

  const strengthDiffColor = preview.attackerStrength > preview.defenderStrength
    ? 'var(--hud-accent-friendly)'
    : preview.attackerStrength < preview.defenderStrength
    ? 'var(--hud-accent-enemy)'
    : 'var(--hud-accent-neutral)';

  return (
    <TooltipShell
      id="combatPreview"
      anchor={{ kind: 'screen', x: 0, y: 0 }}
      position="fixed-corner"
      tier="detailed"
      sticky
    >
      <div className="min-w-[260px] max-w-[320px]">
        {/* Header - Attacker vs Defender */}
        <div
          className="flex items-center justify-between mb-3 pb-2"
          style={{ borderBottom: '1px solid var(--hud-border)' }}
        >
          <div className="text-xs font-semibold" style={{ color: 'var(--hud-text-muted)' }}>
            {attackerDef.name}
          </div>
          <div className="text-xs font-bold" style={{ color: 'var(--hud-combat-text)' }}>
            VS
          </div>
          <div className="text-xs font-semibold" style={{ color: 'var(--hud-text-muted)' }}>
            {defenderName}
          </div>
        </div>

        {/* Strength comparison */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'var(--hud-combat-attacker-bar)' }}>
              {preview.attackerStrength}
            </div>
            <div className="text-xs" style={{ color: 'var(--hud-text-muted)' }}>Attack</div>
          </div>
          <div className="text-xs" style={{ color: 'var(--hud-text-muted)' }}>strength</div>
          <div className="text-center">
            <div className="text-xl font-bold" style={{ color: 'var(--hud-combat-defender-bar)' }}>
              {preview.defenderStrength}
            </div>
            <div className="text-xs" style={{ color: 'var(--hud-text-muted)' }}>Defense</div>
          </div>
        </div>

        {/* Strength difference indicator */}
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className="text-xs" style={{ color: 'var(--hud-text-muted)' }}>
            Diff:{' '}
            <span style={{ color: strengthDiffColor, fontWeight: 600 }}>
              {preview.strengthDifference !== undefined
                ? (preview.strengthDifference > 0 ? '+' : '') + preview.strengthDifference
                : (preview.attackerStrength - preview.defenderStrength > 0 ? '+' : '') +
                  (preview.attackerStrength - preview.defenderStrength)}
            </span>
          </div>
        </div>

        {/* Damage preview */}
        <div className="mb-3 space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span style={{ color: 'var(--hud-text-muted)' }}>Damage to enemy:</span>
            <span className="font-bold" style={{ color: 'var(--hud-combat-damage-positive)' }}>
              {preview.expectedDamageToDefender}
              <span className="text-xs ml-1" style={{ color: 'var(--hud-text-muted)' }}>
                ({preview.minDamageToDefender}-{preview.maxDamageToDefender})
              </span>
            </span>
          </div>
          {!preview.isRanged && (
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--hud-text-muted)' }}>Retaliation:</span>
              <span className="font-bold" style={{ color: 'var(--hud-combat-damage-negative)' }}>
                {preview.expectedDamageToAttacker}
                <span className="text-xs ml-1" style={{ color: 'var(--hud-text-muted)' }}>
                  ({preview.minDamageToAttacker}-{preview.maxDamageToAttacker})
                </span>
              </span>
            </div>
          )}
          {preview.isRanged && (
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--hud-text-muted)' }}>Retaliation:</span>
              <span className="font-medium" style={{ color: 'var(--hud-text-muted)' }}>
                None (ranged)
              </span>
            </div>
          )}
        </div>

        {/* Victory probability bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs" style={{ color: 'var(--hud-text-muted)' }}>
              Victory chance:
            </span>
            <span className="text-sm font-bold" style={{ color: oddsColor }}>
              {preview.odds.attackerWinPercent}%
            </span>
          </div>
          <div className="w-full h-2 rounded overflow-hidden" style={{ backgroundColor: 'var(--hud-border)' }}>
            <div
              className="h-full transition-all duration-200"
              style={{
                width: `${preview.odds.attackerWinPercent}%`,
                backgroundColor: oddsColor,
              }}
            />
          </div>
        </div>

        {/* Outcome indicators */}
        <div className="flex gap-2 text-xs">
          {preview.defenderWillDie && (
            <div
              className="flex-1 text-center py-1 rounded font-medium"
              style={{
                backgroundColor: 'var(--hud-cycle-indicator-bg)',
                color: 'var(--hud-accent-friendly)',
              }}
            >
              ✓ Enemy destroyed
            </div>
          )}
          {preview.attackerWillDie && !preview.defenderWillDie && (
            <div
              className="flex-1 text-center py-1 rounded font-medium"
              style={{
                backgroundColor: 'var(--hud-cycle-indicator-bg)',
                color: 'var(--hud-accent-enemy)',
              }}
            >
              ⚠ Risk of death
            </div>
          )}
          {preview.isRanged && (
            <div
              className="flex-1 text-center py-1 rounded font-medium"
              style={{
                backgroundColor: 'var(--hud-cycle-indicator-bg)',
                color: 'var(--hud-combat-attacker-bar)',
              }}
            >
              🏹 Ranged attack
            </div>
          )}
        </div>

        {/* Modifier badges (compact) */}
        {(preview.modifiers.flankingBonus > 0 ||
          preview.modifiers.terrainDefenseBonus > 0 ||
          preview.modifiers.riverPenalty ||
          preview.modifiers.firstStrikeBonus ||
          preview.modifiers.warSupportPenalty > 0 ||
          preview.modifiers.adjacentAlly) && (
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--hud-border)' }}>
            <div className="flex flex-wrap gap-1">
              {preview.modifiers.flankingBonus > 0 && (
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-accent-friendly)',
                  }}
                >
                  Flanking +{preview.modifiers.flankingBonus}
                </span>
              )}
              {preview.modifiers.terrainDefenseBonus > 0 && (
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-combat-defender-bar)',
                  }}
                >
                  Terrain +{preview.modifiers.terrainDefenseBonus}%
                </span>
              )}
              {preview.modifiers.riverPenalty && (
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-accent-enemy)',
                  }}
                >
                  River -15%
                </span>
              )}
              {preview.modifiers.firstStrikeBonus && (
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-text-emphasis)',
                  }}
                >
                  First Strike +5
                </span>
              )}
              {preview.modifiers.adjacentAlly && (
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-combat-attacker-bar)',
                  }}
                >
                  Adjacent Ally
                </span>
              )}
              {preview.modifiers.warSupportPenalty > 0 && (
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-accent-enemy)',
                  }}
                >
                  War Support -{preview.modifiers.warSupportPenalty}
                </span>
              )}
              {preview.modifiers.defenderFortified && (
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-accent-neutral)',
                  }}
                >
                  Fortified +5
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </TooltipShell>
  );
}
