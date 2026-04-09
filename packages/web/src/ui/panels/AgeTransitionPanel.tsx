import { useGame } from '../../providers/GameProvider';
import { ALL_CIVILIZATIONS } from '@hex/engine';
import type { Age } from '@hex/engine';

interface AgeTransitionPanelProps {
  onClose: () => void;
}

export function AgeTransitionPanel({ onClose }: AgeTransitionPanelProps) {
  const { state, dispatch } = useGame();
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const nextAge = getNextAge(player.age);
  if (!nextAge) return null;

  const threshold = state.age.ageThresholds[nextAge];
  const ready = player.ageProgress >= threshold;

  // Available civs for the next age
  const availableCivs = ALL_CIVILIZATIONS.filter(c => c.age === nextAge);

  return (
    <div className="absolute inset-x-0 top-12 bottom-14 overflow-auto"
      style={{ backgroundColor: 'rgba(26, 26, 46, 0.95)' }}>
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-bold">Age Transition</h2>
          <span className="text-xs uppercase" style={{ color: 'var(--color-text-muted)' }}>
            {player.age} → {nextAge}
          </span>
        </div>
        <button onClick={onClose} className="text-sm px-2 py-1 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}>X</button>
      </div>

      <div className="p-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="text-sm mb-2" style={{ color: 'var(--color-text)' }}>
            Age Progress: {player.ageProgress} / {threshold}
            {ready && <span className="ml-2 font-bold" style={{ color: 'var(--color-gold)' }}>READY!</span>}
          </div>
          <div className="w-full h-3 rounded-full" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, (player.ageProgress / threshold) * 100)}%`,
                backgroundColor: ready ? 'var(--color-gold)' : 'var(--color-accent)',
              }} />
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Earn age progress by researching technologies (+5 per tech)
          </div>
        </div>

        {/* Current legacy bonuses */}
        {player.legacyBonuses.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-bold mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Legacy Bonuses (carried from previous ages)
            </h3>
            {player.legacyBonuses.map((bonus, i) => (
              <div key={i} className="text-xs px-2 py-1 rounded mb-1"
                style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)' }}>
                {bonus.source}: +{bonus.effect.type === 'MODIFY_YIELD' ? `${bonus.effect.value} ${bonus.effect.yield}` : 'bonus'}
              </div>
            ))}
          </div>
        )}

        {/* Pick new civilization */}
        <h3 className="text-sm font-bold mb-3" style={{ color: 'var(--color-text)' }}>
          {ready ? 'Choose your new civilization:' : `Civilizations available when you reach ${nextAge} age:`}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {availableCivs.map(civ => (
            <button
              key={civ.id}
              disabled={!ready}
              className="text-left p-3 rounded-lg cursor-pointer transition-all"
              style={{
                backgroundColor: 'var(--color-bg)',
                border: '2px solid var(--color-border)',
                opacity: ready ? 1 : 0.5,
              }}
              onClick={() => {
                if (ready) {
                  dispatch({ type: 'TRANSITION_AGE', newCivId: civ.id });
                  onClose();
                }
              }}
            >
              <div className="font-bold text-sm" style={{ color: civ.color }}>{civ.name}</div>
              <div className="text-xs mt-1" style={{ color: 'var(--color-text)' }}>
                {civ.uniqueAbility.name}
              </div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {civ.uniqueAbility.description}
              </div>
              <div className="text-[10px] mt-1" style={{ color: 'var(--color-gold)' }}>
                Legacy: {civ.legacyBonus.name} — {civ.legacyBonus.description}
              </div>
            </button>
          ))}
          {availableCivs.length === 0 && (
            <div className="col-span-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              No civilizations defined for {nextAge} age yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function getNextAge(current: Age): 'exploration' | 'modern' | null {
  switch (current) {
    case 'antiquity': return 'exploration';
    case 'exploration': return 'modern';
    default: return null;
  }
}
