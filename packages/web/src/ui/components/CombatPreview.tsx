import { useGameState } from '../../providers/GameProvider';
import { calculateCombatPreview } from '@hex/engine';

interface CombatPreviewProps {
  attackerId: string;
  targetId: string;
  onAttack: () => void;
  onClose: () => void;
}

export function CombatPreviewPanel({ attackerId, targetId, onAttack, onClose }: CombatPreviewProps) {
  const { state, unitRegistry } = useGameState();

  const preview = calculateCombatPreview(state, attackerId, targetId);
  const attacker = state.units.get(attackerId);
  const defender = preview.target.type === 'unit' ? state.units.get(preview.target.unitId) : null;
  const attackerDef = attacker ? unitRegistry.get(attacker.typeId) : null;
  const defenderDef = defender ? unitRegistry.get(defender.typeId) : null;

  if (!attacker || !defender || !attackerDef || !defenderDef) {
    return null;
  }

  const oddsColor = preview.odds.attackerWinPercent >= 70
    ? 'var(--color-health-high)'
    : preview.odds.attackerWinPercent >= 40
    ? 'var(--color-food)'
    : 'var(--color-health-low)';

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-black/50"
      onClick={onClose}
      style={{ zIndex: 1000 }}
    >
      <div
        className="rounded-lg p-4 max-w-md w-full mx-4"
        style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
            Combat Preview
          </h3>
          <button
            className="text-xs px-2 py-1 rounded"
            style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Units comparison */}
        <div className="flex items-center justify-between gap-4 mb-4">
          {/* Attacker */}
          <div className="flex-1 text-center">
            <div className="text-sm font-bold mb-1" style={{ color: 'var(--color-text)' }}>
              {attackerDef.name}
            </div>
            <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              HP: {preview.modifiers.attackerHealth}
              {preview.modifiers.attackerFortified && ' • Fortified'}
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-production)' }}>
              {preview.attackerStrength}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Combat Strength
            </div>
          </div>

          {/* VS */}
          <div className="text-2xl font-bold" style={{ color: 'var(--color-accent)' }}>
            VS
          </div>

          {/* Defender */}
          <div className="flex-1 text-center">
            <div className="text-sm font-bold mb-1" style={{ color: 'var(--color-text)' }}>
              {defenderDef.name}
            </div>
            <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
              HP: {preview.modifiers.defenderHealth}
              {preview.modifiers.defenderFortified && ' • Fortified'}
            </div>
            <div className="text-2xl font-bold" style={{ color: 'var(--color-science)' }}>
              {preview.defenderStrength}
            </div>
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Defense Strength
            </div>
          </div>
        </div>

        {/* Damage preview */}
        <div className="mb-4 p-3 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>
              Damage to {defenderDef.name}:
            </span>
            <span className="font-bold" style={{ color: 'var(--color-health-low)' }}>
              {preview.expectedDamageToDefender}
              <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
                {' '}({preview.minDamageToDefender}-{preview.maxDamageToDefender})
              </span>
            </span>
          </div>
          {!preview.isRanged && (
            <div className="flex justify-between items-center">
              <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                Retaliation damage:
              </span>
              <span className="font-bold" style={{ color: 'var(--color-health-low)' }}>
                {preview.expectedDamageToAttacker}
                <span className="text-xs font-normal" style={{ color: 'var(--color-text-muted)' }}>
                  {' '}({preview.minDamageToAttacker}-{preview.maxDamageToAttacker})
                </span>
              </span>
            </div>
          )}
        </div>

        {/* Odds */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm" style={{ color: 'var(--color-text)' }}>Victory Chance:</span>
            <span className="font-bold text-lg" style={{ color: oddsColor }}>
              {preview.odds.attackerWinPercent}%
            </span>
          </div>
          <div className="w-full h-2 rounded overflow-hidden flex" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div
              className="h-full"
              style={{
                width: `${preview.odds.attackerWinPercent}%`,
                backgroundColor: 'var(--color-health-high)',
              }}
            />
            <div
              className="h-full"
              style={{
                width: `${preview.odds.drawPercent}%`,
                backgroundColor: 'var(--color-food)',
              }}
            />
            <div
              className="h-full"
              style={{
                width: `${preview.odds.defenderWinPercent}%`,
                backgroundColor: 'var(--color-health-low)',
              }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            <span>Win: {preview.odds.attackerWinPercent}%</span>
            <span>Draw: {preview.odds.drawPercent}%</span>
            <span>Loss: {preview.odds.defenderWinPercent}%</span>
          </div>
        </div>

        {/* Modifiers */}
        <div className="mb-4 text-xs space-y-1" style={{ color: 'var(--color-text-muted)' }}>
          {preview.modifiers.flankingBonus > 0 && (
            <div className="flex justify-between">
              <span>Flanking bonus:</span>
              <span style={{ color: 'var(--color-accent)' }}>+{preview.modifiers.flankingBonus} strength</span>
            </div>
          )}
          {preview.modifiers.terrainDefenseBonus > 0 && (
            <div className="flex justify-between">
              <span>Terrain defense:</span>
              <span style={{ color: 'var(--color-science)' }}>+{preview.modifiers.terrainDefenseBonus}%</span>
            </div>
          )}
          {preview.modifiers.riverPenalty && (
            <div className="flex justify-between">
              <span>River crossing penalty:</span>
              <span style={{ color: 'var(--color-health-low)' }}>-15% strength</span>
            </div>
          )}
          {preview.modifiers.firstStrikeBonus && (
            <div className="flex justify-between">
              <span>First strike bonus:</span>
              <span style={{ color: 'var(--color-accent)' }}>+5 strength</span>
            </div>
          )}
          {preview.modifiers.warSupportPenalty > 0 && (
            <div className="flex justify-between">
              <span>War support penalty:</span>
              <span style={{ color: 'var(--color-health-low)' }}>-{preview.modifiers.warSupportPenalty} strength</span>
            </div>
          )}
          {preview.modifiers.targetWounded && (
            <div className="flex justify-between">
              <span>Target wounded:</span>
              <span style={{ color: 'var(--color-accent)' }}>+5% strength</span>
            </div>
          )}
          {preview.modifiers.adjacentAlly && (
            <div className="flex justify-between">
              <span>Adjacent ally:</span>
              <span style={{ color: 'var(--color-accent)' }}>+5% strength</span>
            </div>
          )}
        </div>

        {/* Outcome prediction */}
        {preview.defenderWillDie && (
          <div className="mb-4 p-2 rounded text-center text-sm font-bold" style={{ backgroundColor: 'rgba(var(--color-health-high), 0.2)', color: 'var(--color-health-high)' }}>
            ✓ {defenderDef.name} will be destroyed
          </div>
        )}
        {preview.attackerWillDie && !preview.defenderWillDie && (
          <div className="mb-4 p-2 rounded text-center text-sm font-bold" style={{ backgroundColor: 'rgba(var(--color-health-low), 0.2)', color: 'var(--color-health-low)' }}>
            ⚠ {attackerDef.name} may be destroyed
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <button
            className="flex-1 px-4 py-2 rounded font-bold text-sm"
            style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className="flex-1 px-4 py-2 rounded font-bold text-sm"
            style={{ backgroundColor: 'var(--color-health-low)', color: 'var(--color-bg)' }}
            onClick={() => {
              onAttack();
              onClose();
            }}
          >
            Attack
          </button>
        </div>
      </div>
    </div>
  );
}
