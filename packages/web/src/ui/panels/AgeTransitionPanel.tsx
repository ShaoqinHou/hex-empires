import { useGameState } from '../../providers/GameProvider';
import { ALL_CIVILIZATIONS, ALL_UNITS, ALL_BUILDINGS } from '@hex/engine';
import type { Age } from '@hex/engine';
import { PanelShell } from './PanelShell';

interface AgeTransitionPanelProps {
  onClose: () => void;
}

export function AgeTransitionPanel({ onClose }: AgeTransitionPanelProps) {
  const { state, dispatch } = useGameState();
  const player = state.players.get(state.currentPlayerId);
  if (!player) return null;

  const nextAge = getNextAge(player.age);
  if (!nextAge) return null;

  const threshold = state.age.ageThresholds[nextAge];
  const ready = player.ageProgress >= threshold;

  // Available civs for the next age
  const availableCivs = ALL_CIVILIZATIONS.filter(c => c.age === nextAge);

  // ── Blocking-modal semantic ──
  // AgeTransition is a blocking modal: the player MUST pick a civ to
  // continue. PanelShell's M34 chrome closes the panel on backdrop
  // click AND on the X button via a single onClose callback. Until
  // PanelShell exposes a `dismissible: false` prop (follow-up), we
  // suppress dismissal by passing a no-op onClose to the shell. The
  // panel still closes naturally once the player picks a civ —
  // dispatching TRANSITION_AGE advances player.age, which causes
  // getNextAge() above to return null on the next render and the
  // outer component returns null. The real `onClose` prop from the
  // parent is invoked from the civ-pick handler so App.tsx can reset
  // its activePanel state.
  const blockingOnClose = (): void => {
    /* intentionally a no-op — see comment above */
  };

  return (
    <PanelShell id="age" title="Age Transition" onClose={blockingOnClose} priority="modal" width="full">
      {/* Title-row supplement: from → to ages and lightning glyph */}
      <div className="flex items-center gap-4 mb-4">
        <div className="text-4xl">⚡</div>
        <div className="flex items-center gap-2">
          <span className="text-lg font-semibold capitalize" style={{ color: getAgeColor(player.age) }}>{player.age}</span>
          <span className="text-amber-400">→</span>
          <span className="text-lg font-semibold capitalize text-amber-300">{nextAge}</span>
        </div>
      </div>

      <div>
        {/* Progress section with celebration */}
        <div className={`mb-8 p-6 rounded-xl border-2 transition-all ${ready ? 'bg-gradient-to-r from-amber-900/40 to-yellow-900/40 border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-slate-800/50 border-slate-700'}`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-bold text-white mb-1">
                {ready ? '🎉 Age Transition Ready!' : 'Age Progress'}
              </h3>
              <div className="text-sm text-slate-400">
                {ready ? 'Choose your new civilization to begin the next era' : 'Research technologies to earn age progress'}
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold" style={{ color: ready ? '#fbbf24' : getAgeColor(player.age) }}>
                {player.ageProgress}
              </div>
              <div className="text-xs text-slate-400">/ {threshold} required</div>
            </div>
          </div>

          <div className="w-full h-4 rounded-full overflow-hidden bg-slate-700">
            <div
              className={`h-full rounded-full transition-all duration-700 ${ready ? 'bg-gradient-to-r from-amber-400 to-yellow-500 shadow-lg' : ''}`}
              style={{
                width: `${Math.min(100, (player.ageProgress / threshold) * 100)}%`,
                backgroundColor: !ready ? getAgeColor(player.age) : undefined,
                boxShadow: ready ? '0 0 20px rgba(251, 191, 36, 0.6)' : 'none',
              }}
            />
          </div>

          <div className="mt-3 text-xs text-slate-500">
            💡 Each technology researched grants +5 age progress
          </div>
        </div>

        {/* Current legacy bonuses */}
        {player.legacyBonuses.length > 0 && (
          <div className="mb-8 p-5 rounded-xl bg-gradient-to-r from-purple-900/20 to-indigo-900/20 border border-purple-500/30">
            <h3 className="text-sm font-bold mb-3 text-purple-300 flex items-center gap-2">
              <span>✨</span>
              <span>Legacy Bonuses Carried Forward</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {player.legacyBonuses.map((bonus, i) => (
                <div key={i} className="px-3 py-2 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="text-xs font-semibold text-amber-400 mb-1">{bonus.source}</div>
                  <div className="text-[10px] text-slate-400">
                    {bonus.effect.type === 'MODIFY_YIELD' && `+${bonus.effect.value} ${bonus.effect.yield}/turn`}
                    {bonus.effect.type === 'MODIFY_COMBAT' && `+${bonus.effect.value} combat`}
                    {bonus.effect.type === 'GRANT_UNIT' && `Free ${bonus.effect.unitId}`}
                    {bonus.effect.type === 'UNLOCK_BUILDING' && `Unlocks ${bonus.effect.buildingId}`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Civilization selection */}
        <div>
          <h3 className={`text-xl font-bold mb-4 ${ready ? 'text-amber-400' : 'text-slate-400'}`}>
            {ready ? '🌍 Choose Your New Civilization' : `🔒 Research More to Unlock ${nextAge.charAt(0).toUpperCase() + nextAge.slice(1)} Civilizations`}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableCivs.map(civ => {
              const uniqueUnit = ALL_UNITS.find(u => u.id === civ.uniqueUnit);
              const uniqueBuilding = ALL_BUILDINGS.find(b => b.id === civ.uniqueBuilding);

              return (
                <button
                  key={civ.id}
                  disabled={!ready}
                  className={`text-left p-5 rounded-xl cursor-pointer transition-all border-2 ${
                    ready
                      ? 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-600 hover:border-amber-500 hover:shadow-xl hover:shadow-amber-500/20 hover:scale-[1.02]'
                      : 'bg-slate-900/50 border-slate-800 opacity-60'
                  }`}
                  onClick={() => {
                    if (ready) {
                      dispatch({ type: 'TRANSITION_AGE', newCivId: civ.id });
                      onClose();
                    }
                  }}
                >
                  {/* Civ header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="font-bold text-lg" style={{ color: civ.color }}>{civ.name}</div>
                      <div className="text-xs text-slate-500 capitalize">{civ.age} Age</div>
                    </div>
                    {ready && (
                      <div className="px-2 py-1 rounded text-xs font-bold bg-amber-500 text-slate-900">
                        SELECT
                      </div>
                    )}
                  </div>

                  {/* Unique ability */}
                  <div className="mb-3 p-2 rounded bg-slate-700/30 border border-slate-600/30">
                    <div className="text-xs font-semibold text-amber-400 mb-1">Unique Ability</div>
                    <div className="text-sm text-white">{civ.uniqueAbility.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{civ.uniqueAbility.description}</div>
                  </div>

                  {/* Unique unit/building */}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {uniqueUnit && (
                      <div className="p-2 rounded bg-slate-700/30 border border-slate-600/30">
                        <div className="text-[10px] text-slate-500 mb-1">Unique Unit</div>
                        <div className="text-xs text-white">{uniqueUnit.name}</div>
                      </div>
                    )}
                    {uniqueBuilding && (
                      <div className="p-2 rounded bg-slate-700/30 border border-slate-600/30">
                        <div className="text-[10px] text-slate-500 mb-1">Unique Building</div>
                        <div className="text-xs text-white">{uniqueBuilding.name}</div>
                      </div>
                    )}
                  </div>

                  {/* Legacy bonus */}
                  <div className="p-2 rounded bg-purple-900/20 border border-purple-500/30">
                    <div className="text-[10px] text-purple-400 mb-1">🏆 Legacy Bonus</div>
                    <div className="text-xs text-white">{civ.legacyBonus.name}</div>
                    <div className="text-[10px] text-slate-400 mt-1">{civ.legacyBonus.description}</div>
                  </div>
                </button>
              );
            })}
            {availableCivs.length === 0 && (
              <div className="col-span-full text-center py-8 text-slate-500">
                No civilizations defined for {nextAge} age yet.
              </div>
            )}
          </div>
        </div>
      </div>
    </PanelShell>
  );
}

function getNextAge(current: Age): 'exploration' | 'modern' | null {
  switch (current) {
    case 'antiquity': return 'exploration';
    case 'exploration': return 'modern';
    default: return null;
  }
}

function getAgeColor(age: Age): string {
  switch (age) {
    case 'antiquity': return '#a78bfa'; // purple
    case 'exploration': return '#60a5fa'; // blue
    case 'modern': return '#fbbf24'; // gold
  }
}
