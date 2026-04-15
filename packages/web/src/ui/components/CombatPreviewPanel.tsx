import { useGameState } from '../../providers/GameProvider';
import { calculateCombatPreview, calculateCityCombatPreview } from '@hex/engine';
import type { CombatPreview as EngineCombatPreview, UnitState, CityState } from '@hex/engine';
import { coordToKey } from '@hex/engine';
import { TooltipShell } from '../hud/TooltipShell';

interface CombatPreviewPanelProps {
  attackerUnitId: string;
  targetHex: { q: number; r: number } | null;
}

/**
 * Combat preview panel showing expected damage and combat odds.
 * Displays when player selects a unit and hovers over an enemy
 * unit/city. The content is detailed enough to occlude the hovered
 * tile, so the overlay renders in the bottom-right viewport corner via
 * `<TooltipShell position="fixed-corner">`.
 *
 * Z-index drops from the audit-flagged `1000` to
 * `var(--hud-z-fixed-corner)` (120, set by TooltipShell) so modal
 * panels at 210 correctly cover during age transitions, victory, and
 * crises. `sticky` is set because the caller owns the dismiss
 * lifecycle (overlay clears when the cursor leaves a valid target).
 */
export function CombatPreviewPanel({ attackerUnitId, targetHex }: CombatPreviewPanelProps) {
  const { state, unitRegistry } = useGameState();

  if (!targetHex) return null;

  const attacker = state.units.get(attackerUnitId);
  if (!attacker) return null;

  const targetKey = coordToKey(targetHex);

  // Check if target is an enemy unit
  let targetUnit: UnitState | null = null;
  for (const unit of state.units.values()) {
    if (coordToKey(unit.position) === targetKey && unit.owner !== attacker.owner) {
      targetUnit = unit;
      break;
    }
  }

  // Check if target is an enemy city
  let targetCity: CityState | null = null;
  for (const city of state.cities.values()) {
    if (coordToKey(city.position) === targetKey && city.owner !== attacker.owner) {
      targetCity = city;
      break;
    }
  }

  const preview: EngineCombatPreview | null = targetUnit
    ? calculateCombatPreview(state, attackerUnitId, targetUnit.id)
    : targetCity
      ? calculateCityCombatPreview(state, attackerUnitId, targetCity.id)
      : null;

  // "Cannot attack" fallback — still rendered as fixed-corner so its
  // position is consistent with the successful-attack variant.
  if (!preview || !preview.canAttack) {
    return (
      <TooltipShell
        id="combatPreview"
        anchor={{ kind: 'screen', x: 0, y: 0 }}
        position="fixed-corner"
        tier="compact"
        sticky
      >
        <div className="text-xs" style={{ color: 'var(--hud-text-muted)', maxWidth: '200px' }}>
          {preview?.reason ?? 'Cannot attack'}
        </div>
      </TooltipShell>
    );
  }

  const attackerDef = unitRegistry.get(attacker.typeId);
  const defenderName = targetCity
    ? targetCity.name
    : targetUnit
      ? unitRegistry.get(targetUnit.typeId)?.name ?? 'Enemy'
      : 'Enemy';

  const oddsColor = preview.odds.attackerWinPercent >= 70
    ? 'var(--hud-accent-friendly)'
    : preview.odds.attackerWinPercent >= 40
      ? 'var(--hud-text-emphasis)'
      : 'var(--hud-accent-enemy)';

  return (
    <TooltipShell
      id="combatPreview"
      anchor={{ kind: 'screen', x: 0, y: 0 }}
      position="fixed-corner"
      tier="detailed"
      sticky
    >
      <div className="text-xs" style={{ minWidth: '240px' }}>
        {/* Header - Attacker vs Defender */}
        <div
          className="flex items-center justify-between mb-2 pb-2"
          style={{ borderBottom: '1px solid var(--hud-border)' }}
        >
          <span className="font-semibold" style={{ color: 'var(--hud-text-muted)' }}>
            {attackerDef?.name ?? 'Attacker'}
          </span>
          <span className="font-bold" style={{ color: 'var(--hud-combat-text)' }}>
            {preview.isRanged ? '🏹' : 'VS'}
          </span>
          <span className="font-semibold" style={{ color: 'var(--hud-text-muted)' }}>
            {defenderName}
          </span>
        </div>

        {/* Strength comparison */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex flex-col">
            <span style={{ color: 'var(--hud-text-muted)', fontSize: '10px' }}>ATTACKER</span>
            <span className="font-bold" style={{ color: 'var(--hud-combat-attacker-bar)' }}>
              {preview.attackerStrength}
            </span>
          </div>
          <div className="flex flex-col items-center">
            <span style={{ color: 'var(--hud-text-muted)', fontSize: '10px' }}>VS</span>
          </div>
          <div className="flex flex-col text-right">
            <span style={{ color: 'var(--hud-text-muted)', fontSize: '10px' }}>DEFENDER</span>
            <span className="font-bold" style={{ color: 'var(--hud-combat-defender-bar)' }}>
              {preview.defenderStrength}
            </span>
          </div>
        </div>

        {/* Damage preview */}
        <div className="grid grid-cols-2 gap-2 mb-2">
          <div>
            <div style={{ color: 'var(--hud-text-muted)', fontSize: '10px' }}>TO DEFENDER</div>
            <div className="font-bold" style={{ color: 'var(--hud-combat-damage-positive)' }}>
              {preview.minDamageToDefender}-{preview.maxDamageToDefender}
              <span className="font-normal ml-1" style={{ color: 'var(--hud-text-muted)', fontSize: '9px' }}>
                (avg {preview.expectedDamageToDefender})
              </span>
            </div>
          </div>
          {preview.isRanged ? (
            <div>
              <div style={{ color: 'var(--hud-text-muted)', fontSize: '10px' }}>RETALIATION</div>
              <div style={{ color: 'var(--hud-text-muted)' }}>N/A (ranged)</div>
            </div>
          ) : (
            <div className="text-right">
              <div style={{ color: 'var(--hud-text-muted)', fontSize: '10px' }}>TO ATTACKER</div>
              <div className="font-bold" style={{ color: 'var(--hud-combat-damage-negative)' }}>
                {preview.minDamageToAttacker}-{preview.maxDamageToAttacker}
                <span className="font-normal ml-1" style={{ color: 'var(--hud-text-muted)', fontSize: '9px' }}>
                  (avg {preview.expectedDamageToAttacker})
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Outcome preview */}
        <div
          className="flex items-center gap-2 pt-2"
          style={{ borderTop: '1px solid var(--hud-border)' }}
        >
          {targetCity ? (
            <div className="flex items-center gap-2 flex-1">
              <span style={{ color: 'var(--hud-text-muted)', fontSize: '10px' }}>CITY:</span>
              <span
                style={{
                  color: preview.defenderWillDie
                    ? 'var(--hud-accent-friendly)'
                    : 'var(--hud-text-muted)',
                }}
              >
                {preview.defenderWillDie
                  ? 'CAPTURE'
                  : `-${preview.expectedDamageToDefender} HP`}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--hud-text-muted)', fontSize: '10px' }}>DEFENDER:</span>
                <span
                  style={{
                    color: preview.defenderWillDie
                      ? 'var(--hud-accent-enemy)'
                      : 'var(--hud-accent-friendly)',
                  }}
                >
                  {preview.defenderWillDie
                    ? 'DESTROYED'
                    : `${Math.max(0, preview.modifiers.defenderHealth - preview.expectedDamageToDefender)} HP`}
                </span>
              </div>
              {!preview.isRanged && (
                <div className="flex items-center gap-2">
                  <span style={{ color: 'var(--hud-text-muted)', fontSize: '10px' }}>ATTACKER:</span>
                  <span
                    style={{
                      color: preview.attackerWillDie
                        ? 'var(--hud-accent-enemy)'
                        : 'var(--hud-accent-friendly)',
                    }}
                  >
                    {preview.attackerWillDie
                      ? 'DESTROYED'
                      : `${Math.max(0, preview.modifiers.attackerHealth - preview.expectedDamageToAttacker)} HP`}
                  </span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modifiers */}
        {(preview.modifiers.flankingBonus > 0 ||
          preview.modifiers.terrainDefenseBonus > 0 ||
          preview.modifiers.riverPenalty ||
          preview.modifiers.firstStrikeBonus ||
          preview.modifiers.warSupportPenalty > 0 ||
          preview.modifiers.adjacentAlly) && (
          <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--hud-border)' }}>
            <div style={{ color: 'var(--hud-text-muted)', fontSize: '9px' }} className="mb-1">
              MODIFIERS:
            </div>
            <div className="flex flex-wrap gap-1">
              {preview.modifiers.flankingBonus > 0 && (
                <span
                  className="px-1 rounded"
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
                  className="px-1 rounded"
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
                  className="px-1 rounded"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-accent-enemy)',
                  }}
                >
                  River penalty
                </span>
              )}
              {preview.modifiers.firstStrikeBonus && (
                <span
                  className="px-1 rounded"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-text-emphasis)',
                  }}
                >
                  First Strike +5
                </span>
              )}
              {preview.modifiers.warSupportPenalty > 0 && (
                <span
                  className="px-1 rounded"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-accent-enemy)',
                  }}
                >
                  War weariness -{preview.modifiers.warSupportPenalty}
                </span>
              )}
              {preview.modifiers.adjacentAlly && (
                <span
                  className="px-1 rounded"
                  style={{
                    backgroundColor: 'var(--hud-cycle-indicator-bg)',
                    color: 'var(--hud-combat-attacker-bar)',
                  }}
                >
                  Adjacent ally
                </span>
              )}
              {preview.modifiers.defenderFortified && (
                <span
                  className="px-1 rounded"
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

        {/* Win probability */}
        <div className="mt-2 text-center">
          <span style={{ color: 'var(--hud-text-muted)', fontSize: '10px' }}>WIN CHANCE: </span>
          <span className="font-bold" style={{ color: oddsColor }}>
            {preview.odds.attackerWinPercent}%
          </span>
        </div>
      </div>
    </TooltipShell>
  );
}
