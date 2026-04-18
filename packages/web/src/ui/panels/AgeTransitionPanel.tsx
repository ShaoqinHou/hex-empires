import { useGameState } from '../../providers/GameProvider';
import { ALL_CIVILIZATIONS, ALL_UNITS, ALL_BUILDINGS } from '@hex/engine';
import type { Age } from '@hex/engine';
import { DramaModal } from './DramaModal';

interface AgeTransitionPanelProps {
  onResolve: () => void;
}

export function AgeTransitionPanel({ onResolve }: AgeTransitionPanelProps) {
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
  // continue. DramaModal has no X button and no backdrop click, matching
  // dismissible={false} semantics from PanelShell. The panel resolves only
  // when a civ card is clicked: dispatch TRANSITION_AGE then call onResolve.

  const heroNode = (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '80px', lineHeight: 1.1 }}>⚡</div>
    </div>
  );

  const subtitle = `${capitalize(player.age)} → ${capitalize(nextAge)}`;

  const bodyNode = (
    <div>
      {/* Progress section */}
      <div
        className="mb-8 p-6 rounded-xl border-2 transition-all"
        style={
          ready
            ? {
                background: 'linear-gradient(to right, rgba(120, 53, 15, 0.40), rgba(113, 63, 18, 0.40))',
                borderColor: 'var(--panel-accent-gold-soft)',
                boxShadow: '0 10px 15px -3px rgba(251, 191, 36, 0.20)',
              }
            : {
                backgroundColor: 'var(--panel-muted-bg)',
                borderColor: 'var(--panel-border)',
              }
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--panel-text-color)' }}>
              {ready ? '🎉 Age Transition Ready!' : 'Age Progress'}
            </h3>
            <div className="text-sm" style={{ color: 'var(--panel-muted-color)' }}>
              {ready ? 'Choose your new civilization to begin the next era' : 'Research technologies to earn age progress'}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold" style={{ color: ready ? 'var(--panel-accent-gold-soft)' : getAgeColor(player.age) }}>
              {player.ageProgress}
            </div>
            <div className="text-xs" style={{ color: 'var(--panel-muted-color)' }}>/ {threshold} required</div>
          </div>
        </div>

        <div
          className="w-full h-4 rounded-full overflow-hidden"
          style={{ backgroundColor: 'var(--panel-muted-strong)' }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(100, (player.ageProgress / threshold) * 100)}%`,
              background: ready
                ? 'linear-gradient(to right, var(--panel-accent-gold-soft), #eab308)'
                : undefined,
              backgroundColor: !ready ? getAgeColor(player.age) : undefined,
              boxShadow: ready ? '0 0 20px rgba(251, 191, 36, 0.6)' : 'none',
            }}
          />
        </div>

        <div className="mt-3 text-xs" style={{ color: 'var(--panel-muted-color)' }}>
          💡 Each technology researched grants +5 age progress
        </div>
      </div>

      {/* Current legacy bonuses */}
      {player.legacyBonuses.length > 0 && (
        <div
          className="mb-8 p-5 rounded-xl border"
          style={{
            background: 'linear-gradient(to right, rgba(88, 28, 135, 0.20), rgba(49, 46, 129, 0.20))',
            borderColor: 'var(--panel-accent-purple-glow)',
          }}
        >
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--panel-accent-purple-soft)' }}>
            <span>✨</span>
            <span>Legacy Bonuses Carried Forward</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {player.legacyBonuses.map((bonus, i) => (
              <div
                key={i}
                className="px-3 py-2 rounded-lg border"
                style={{ backgroundColor: 'var(--panel-muted-bg)', borderColor: 'var(--panel-border)' }}
              >
                <div className="text-xs font-semibold mb-1" style={{ color: 'var(--panel-accent-gold-soft)' }}>{bonus.source}</div>
                <div className="text-[10px]" style={{ color: 'var(--panel-muted-color)' }}>
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

      {/* Civilization selection grid — choices=[] on DramaModal; civ-card onClick resolves */}
      <div>
        <h3
          className="text-xl font-bold mb-4"
          style={{ color: ready ? 'var(--panel-accent-gold-soft)' : 'var(--panel-muted-color)' }}
        >
          {ready ? '🌍 Choose Your New Civilization' : `🔒 Research More to Unlock ${capitalize(nextAge)} Civilizations`}
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
                    ? 'hover:shadow-xl hover:scale-[1.02]'
                    : 'opacity-60'
                }`}
                style={
                  ready
                    ? {
                        background: 'linear-gradient(to bottom right, rgba(30, 41, 59, 1), rgba(15, 23, 42, 1))',
                        borderColor: 'var(--panel-muted-strong)',
                      }
                    : {
                        backgroundColor: 'var(--panel-muted-bg-strong)',
                        borderColor: 'var(--panel-border)',
                      }
                }
                onClick={() => {
                  if (ready) {
                    dispatch({ type: 'TRANSITION_AGE', newCivId: civ.id });
                    onResolve();
                  }
                }}
              >
                {/* Civ header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="font-bold text-lg" style={{ color: civ.color }}>{civ.name}</div>
                    <div className="text-xs capitalize" style={{ color: 'var(--panel-muted-color)' }}>{civ.age} Age</div>
                  </div>
                  {ready && (
                    <div
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{ backgroundColor: 'var(--panel-accent-gold-soft)', color: '#0f172a' }}
                    >
                      SELECT
                    </div>
                  )}
                </div>

                {/* Unique ability */}
                <div
                  className="mb-3 p-2 rounded border"
                  style={{ backgroundColor: 'var(--panel-muted-bg-soft)', borderColor: 'var(--panel-muted-border)' }}
                >
                  <div className="text-xs font-semibold mb-1" style={{ color: 'var(--panel-accent-gold-soft)' }}>Unique Ability</div>
                  <div className="text-sm" style={{ color: 'var(--panel-text-color)' }}>{civ.uniqueAbility.name}</div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--panel-muted-color)' }}>{civ.uniqueAbility.description}</div>
                </div>

                {/* Unique unit/building */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {uniqueUnit && (
                    <div
                      className="p-2 rounded border"
                      style={{ backgroundColor: 'var(--panel-muted-bg-soft)', borderColor: 'var(--panel-muted-border)' }}
                    >
                      <div className="text-[10px] mb-1" style={{ color: 'var(--panel-muted-color)' }}>Unique Unit</div>
                      <div className="text-xs" style={{ color: 'var(--panel-text-color)' }}>{uniqueUnit.name}</div>
                    </div>
                  )}
                  {uniqueBuilding && (
                    <div
                      className="p-2 rounded border"
                      style={{ backgroundColor: 'var(--panel-muted-bg-soft)', borderColor: 'var(--panel-muted-border)' }}
                    >
                      <div className="text-[10px] mb-1" style={{ color: 'var(--panel-muted-color)' }}>Unique Building</div>
                      <div className="text-xs" style={{ color: 'var(--panel-text-color)' }}>{uniqueBuilding.name}</div>
                    </div>
                  )}
                </div>

                {/* Legacy bonus */}
                <div
                  className="p-2 rounded border"
                  style={{ backgroundColor: 'rgba(88, 28, 135, 0.20)', borderColor: 'var(--panel-accent-purple-glow)' }}
                >
                  <div className="text-[10px] mb-1" style={{ color: 'var(--panel-accent-purple)' }}>🏆 Legacy Bonus</div>
                  <div className="text-xs" style={{ color: 'var(--panel-text-color)' }}>{civ.legacyBonus.name}</div>
                  <div className="text-[10px] mt-1" style={{ color: 'var(--panel-muted-color)' }}>{civ.legacyBonus.description}</div>
                </div>
              </button>
            );
          })}
          {availableCivs.length === 0 && (
            <div className="col-span-full text-center py-8" style={{ color: 'var(--panel-muted-color)' }}>
              No civilizations defined for {nextAge} age yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <DramaModal
      id="age"
      title="A New Age Dawns"
      subtitle={subtitle}
      hero={heroNode}
      body={bodyNode}
      choices={[]}
      onResolve={onResolve}
      tone="passage"
      reveal="fade"
    />
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

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
