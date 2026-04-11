import { useGame } from '../../providers/GameProvider';
import { calculateCombatPreview, calculateCityCombatPreview } from '@hex/engine';
import type { CombatPreview as EngineCombatPreview, UnitState, CityState } from '@hex/engine';
import { coordToKey, distance } from '@hex/engine';

interface CombatPreviewPanelProps {
  attackerUnitId: string;
  targetHex: { q: number; r: number } | null;
}

/**
 * Combat preview panel showing expected damage and combat odds.
 * Displays when player selects a unit and hovers over enemy unit/city.
 */
export function CombatPreviewPanel({ attackerUnitId, targetHex }: CombatPreviewPanelProps) {
  const { state, unitRegistry, terrainRegistry, featureRegistry } = useGame();

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

  if (!preview || !preview.canAttack) {
    return (
      <div className="absolute pointer-events-none text-xs px-2 py-1.5 rounded shadow-lg"
        style={{
          backgroundColor: 'var(--color-surface)',
          border: '1px solid var(--color-border)',
          opacity: 0.9,
          maxWidth: '200px',
        }}>
        <div style={{ color: 'var(--color-text-muted)' }}>
          {preview?.reason ?? 'Cannot attack'}
        </div>
      </div>
    );
  }

  const isFavorable = preview.attackerStrength > preview.defenderStrength;
  const isEven = Math.abs(preview.attackerStrength - preview.defenderStrength) <= 3;
  const strengthColor = isFavorable
    ? 'var(--color-health-high)'
    : isEven
      ? 'var(--color-gold)'
      : 'var(--color-health-low)';

  return (
    <div className="absolute pointer-events-none text-xs px-3 py-2 rounded shadow-lg"
      style={{
        backgroundColor: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        opacity: 0.95,
        minWidth: '220px',
        zIndex: 1000,
      }}>
      {/* Strength comparison */}
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex flex-col">
          <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>ATTACKER</span>
          <span className="font-bold" style={{ color: strengthColor }}>
            {preview.attackerStrength}
          </span>
        </div>
        <div className="flex flex-col items-center">
          <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>VS</span>
          <span style={{ color: 'var(--color-text-muted)' }}>{preview.isRanged ? '🏹' : '⚔️'}</span>
        </div>
        <div className="flex flex-col text-right">
          <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>DEFENDER</span>
          <span className="font-bold" style={{ color: preview.defenderStrength > preview.attackerStrength ? 'var(--color-health-low)' : strengthColor }}>
            {preview.defenderStrength}
          </span>
        </div>
      </div>

      {/* Damage preview */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>TO DEFENDER</div>
          <div className="font-bold" style={{ color: 'var(--color-production)' }}>
            {preview.minDamageToDefender}-{preview.maxDamageToDefender}
            <span className="font-normal ml-1" style={{ color: 'var(--color-text-muted)', fontSize: '9px' }}>
              (avg {preview.expectedDamageToDefender})
            </span>
          </div>
        </div>
        {preview.isRanged ? (
          <div>
            <div style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>RETALIATION</div>
            <div style={{ color: 'var(--color-text-muted)' }}>N/A (ranged)</div>
          </div>
        ) : (
          <div className="text-right">
            <div style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>TO ATTACKER</div>
            <div className="font-bold" style={{ color: 'var(--color-health-low)' }}>
              {preview.minDamageToAttacker}-{preview.maxDamageToAttacker}
              <span className="font-normal ml-1" style={{ color: 'var(--color-text-muted)', fontSize: '9px' }}>
                (avg {preview.expectedDamageToAttacker})
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Outcome preview */}
      <div className="flex items-center gap-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
        {targetCity ? (
          <div className="flex items-center gap-2 flex-1">
            <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>CITY:</span>
            <span style={{ color: preview.defenderWillDie ? 'var(--color-health-high)' : 'var(--color-text-muted)' }}>
              {preview.defenderWillDie ? 'CAPTURE' : `-${preview.expectedDamageToDefender} HP`}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>DEFENDER:</span>
              <span style={{ color: preview.defenderWillDie ? 'var(--color-health-low)' : 'var(--color-health-high)' }}>
                {preview.defenderWillDie ? 'DESTROYED' : `${Math.max(0, preview.modifiers.defenderHealth - preview.expectedDamageToDefender)} HP`}
              </span>
            </div>
            {!preview.isRanged && (
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>ATTACKER:</span>
                <span style={{ color: preview.attackerWillDie ? 'var(--color-health-low)' : 'var(--color-health-high)' }}>
                  {preview.attackerWillDie ? 'DESTROYED' : `${Math.max(0, preview.modifiers.attackerHealth - preview.expectedDamageToAttacker)} HP`}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modifiers tooltip indicator */}
      {(preview.modifiers.flankingBonus > 0 || preview.modifiers.terrainDefenseBonus > 0 ||
        preview.modifiers.riverPenalty || preview.modifiers.firstStrikeBonus ||
        preview.modifiers.warSupportPenalty > 0 || preview.modifiers.adjacentAlly) && (
        <div className="mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
          <div style={{ color: 'var(--color-text-muted)', fontSize: '9px' }} className="mb-1">MODIFIERS:</div>
          <div className="flex flex-wrap gap-1">
            {preview.modifiers.flankingBonus > 0 && (
              <span className="px-1 rounded" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-accent)' }}>
                Flanking +{preview.modifiers.flankingBonus}
              </span>
            )}
            {preview.modifiers.terrainDefenseBonus > 0 && (
              <span className="px-1 rounded" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-science)' }}>
                Terrain +{preview.modifiers.terrainDefenseBonus}%
              </span>
            )}
            {preview.modifiers.riverPenalty && (
              <span className="px-1 rounded" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-health-low)' }}>
                River penalty
              </span>
            )}
            {preview.modifiers.firstStrikeBonus && (
              <span className="px-1 rounded" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-production)' }}>
                First Strike +5
              </span>
            )}
            {preview.modifiers.warSupportPenalty > 0 && (
              <span className="px-1 rounded" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-health-low)' }}>
                War weariness -{preview.modifiers.warSupportPenalty}
              </span>
            )}
            {preview.modifiers.adjacentAlly && (
              <span className="px-1 rounded" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-culture)' }}>
                Adjacent ally
              </span>
            )}
            {preview.modifiers.defenderFortified && (
              <span className="px-1 rounded" style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-gold)' }}>
                Fortified +5
              </span>
            )}
          </div>
        </div>
      )}

      {/* Win probability */}
      <div className="mt-2 text-center">
        <span style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>WIN CHANCE: </span>
        <span className="font-bold"
          style={{
            color: preview.odds.attackerWinPercent >= 70
              ? 'var(--color-health-high)'
              : preview.odds.attackerWinPercent >= 40
                ? 'var(--color-gold)'
                : 'var(--color-health-low)',
          }}>
          {preview.odds.attackerWinPercent}%
        </span>
      </div>
    </div>
  );
}
