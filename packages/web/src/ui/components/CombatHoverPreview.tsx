import { useGameState } from '../../providers/GameProvider';
import type { CombatPreview } from '@hex/engine';

interface CombatHoverPreviewProps {
  preview: CombatPreview | null;
  position: { x: number; y: number } | null;
}

/**
 * Hover-style combat preview tooltip.
 * Shows compact combat information when hovering over attackable targets.
 * Displays near the cursor/target unit.
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
    ? 'rgba(34, 197, 94, 0.9)'  // green
    : preview.odds.attackerWinPercent >= 40
    ? 'rgba(234, 179, 8, 0.9)'   // yellow
    : 'rgba(239, 68, 68, 0.9)';  // red

  const strengthDiffColor = preview.attackerStrength > preview.defenderStrength
    ? 'rgba(34, 197, 94, 1)'
    : preview.attackerStrength < preview.defenderStrength
    ? 'rgba(239, 68, 68, 1)'
    : 'rgba(156, 163, 175, 1)';

  // Position tooltip near cursor but keep on screen
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x + 20, window.innerWidth - 320),
    top: Math.min(position.y + 20, window.innerHeight - 300),
    zIndex: 1000,
  };

  return (
    <div
      className="rounded-lg shadow-xl p-3 min-w-[280px] max-w-[320px]"
      style={{
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        border: '1px solid rgba(75, 85, 99, 0.5)',
        backdropFilter: 'blur(8px)',
        ...tooltipStyle,
      }}
    >
      {/* Header - Attacker vs Defender */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-700">
        <div className="text-xs font-semibold text-gray-400">{attackerDef.name}</div>
        <div className="text-xs font-bold text-white">VS</div>
        <div className="text-xs font-semibold text-gray-400">{defenderName}</div>
      </div>

      {/* Strength comparison */}
      <div className="flex items-center justify-between mb-3">
        <div className="text-center">
          <div className="text-xl font-bold" style={{ color: 'rgba(59, 130, 246, 1)' }}>
            {preview.attackerStrength}
          </div>
          <div className="text-xs text-gray-500">Attack</div>
        </div>
        <div className="text-xs text-gray-600">strength</div>
        <div className="text-center">
          <div className="text-xl font-bold" style={{ color: 'rgba(139, 92, 246, 1)' }}>
            {preview.defenderStrength}
          </div>
          <div className="text-xs text-gray-500">Defense</div>
        </div>
      </div>

      {/* Strength difference indicator */}
      <div className="mb-3 flex items-center justify-center gap-2">
        <div className="text-xs text-gray-400">
          Diff: <span style={{ color: strengthDiffColor, fontWeight: 600 }}>
            {preview.strengthDifference !== undefined
              ? (preview.strengthDifference > 0 ? '+' : '') + preview.strengthDifference
              : (preview.attackerStrength - preview.defenderStrength > 0 ? '+' : '') +
                (preview.attackerStrength - preview.defenderStrength)
            }
          </span>
        </div>
      </div>

      {/* Damage preview */}
      <div className="mb-3 space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-400">Damage to enemy:</span>
          <span className="font-bold" style={{ color: 'rgba(239, 68, 68, 1)' }}>
            {preview.expectedDamageToDefender}
            <span className="text-xs text-gray-500 ml-1">
              ({preview.minDamageToDefender}-{preview.maxDamageToDefender})
            </span>
          </span>
        </div>
        {!preview.isRanged && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Retaliation:</span>
            <span className="font-bold" style={{ color: 'rgba(249, 115, 22, 1)' }}>
              {preview.expectedDamageToAttacker}
              <span className="text-xs text-gray-500 ml-1">
                ({preview.minDamageToAttacker}-{preview.maxDamageToAttacker})
              </span>
            </span>
          </div>
        )}
        {preview.isRanged && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-400">Retaliation:</span>
            <span className="font-medium text-gray-500">None (ranged)</span>
          </div>
        )}
      </div>

      {/* Victory probability bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-400">Victory chance:</span>
          <span className="text-sm font-bold" style={{ color: oddsColor }}>
            {preview.odds.attackerWinPercent}%
          </span>
        </div>
        <div className="w-full h-2 bg-gray-800 rounded overflow-hidden">
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
          <div className="flex-1 text-center py-1 rounded bg-green-900/50 text-green-400 font-medium">
            ✓ Enemy destroyed
          </div>
        )}
        {preview.attackerWillDie && !preview.defenderWillDie && (
          <div className="flex-1 text-center py-1 rounded bg-red-900/50 text-red-400 font-medium">
            ⚠ Risk of death
          </div>
        )}
        {preview.isRanged && (
          <div className="flex-1 text-center py-1 rounded bg-blue-900/50 text-blue-400 font-medium">
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
        <div className="mt-2 pt-2 border-t border-gray-700">
          <div className="flex flex-wrap gap-1">
            {preview.modifiers.flankingBonus > 0 && (
              <span className="px-2 py-0.5 rounded text-xs bg-green-900/50 text-green-400">
                Flanking +{preview.modifiers.flankingBonus}
              </span>
            )}
            {preview.modifiers.terrainDefenseBonus > 0 && (
              <span className="px-2 py-0.5 rounded text-xs bg-purple-900/50 text-purple-400">
                Terrain +{preview.modifiers.terrainDefenseBonus}%
              </span>
            )}
            {preview.modifiers.riverPenalty && (
              <span className="px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-400">
                River -15%
              </span>
            )}
            {preview.modifiers.firstStrikeBonus && (
              <span className="px-2 py-0.5 rounded text-xs bg-yellow-900/50 text-yellow-400">
                First Strike +5
              </span>
            )}
            {preview.modifiers.adjacentAlly && (
              <span className="px-2 py-0.5 rounded text-xs bg-blue-900/50 text-blue-400">
                Adjacent Ally
              </span>
            )}
            {preview.modifiers.warSupportPenalty > 0 && (
              <span className="px-2 py-0.5 rounded text-xs bg-red-900/50 text-red-400">
                War Support -{preview.modifiers.warSupportPenalty}
              </span>
            )}
            {preview.modifiers.defenderFortified && (
              <span className="px-2 py-0.5 rounded text-xs bg-gray-700/50 text-gray-400">
                Fortified +5
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Strength difference calculator (for display)
 */
function getStrengthDifference(preview: CombatPreview): number {
  return preview.attackerStrength - preview.defenderStrength;
}
