import { useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import type { Age } from '@hex/engine';
import { DramaModal } from './DramaModal';

interface AgeTransitionPanelProps {
  onResolve: () => void;
}

export function AgeTransitionPanel({ onResolve }: AgeTransitionPanelProps) {
  const { state, dispatch } = useGameState();
  const player = state.players.get(state.currentPlayerId);

  // F-04: track which pending legacy bonuses the player has selected (max 2)
  const [selectedBonusIds, setSelectedBonusIds] = useState<ReadonlyArray<string>>([]);

  if (!player) return null;

  const nextAge = getNextAge(player.age);
  if (!nextAge) return null;

  const threshold = state.age.ageThresholds[nextAge];
  const ready = player.ageProgress >= threshold;

  // Available civs for the next age, sorted with historical-pair matches first
  const availableCivs = [...state.config.civilizations.values()]
    .filter(c => c.age === nextAge)
    .sort((a, b) => {
      const aMatch = a.historicalPair?.includes(player.civilizationId) ? 0 : 1;
      const bMatch = b.historicalPair?.includes(player.civilizationId) ? 0 : 1;
      return aMatch - bMatch;
    });

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
                ? 'linear-gradient(to right, var(--panel-accent-gold-soft), var(--panel-accent-gold-dark))'
                : undefined,
              backgroundColor: !ready ? getAgeColor(player.age) : undefined,
              boxShadow: ready ? '0 0 20px rgba(251, 191, 36, 0.6)' : 'none',
            }}
          />
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

      {/* F-04: Pending legacy bonus pick-2 section */}
      {player.pendingLegacyBonuses && player.pendingLegacyBonuses.length > 0 && (
        <div
          className="mb-8 p-5 rounded-xl border"
          style={{
            background: 'linear-gradient(to right, rgba(6, 78, 59, 0.20), rgba(6, 95, 70, 0.20))',
            borderColor: 'var(--panel-accent-gold-soft)',
          }}
        >
          <h3 className="text-sm font-bold mb-1 flex items-center gap-2" style={{ color: 'var(--panel-accent-gold-soft)' }}>
            <span>🏅</span>
            <span>Choose Your Legacy Bonuses (pick 2 of {player.pendingLegacyBonuses.length})</span>
          </h3>
          <p className="text-xs mb-3" style={{ color: 'var(--panel-muted-color)' }}>
            These permanent bonuses carry into the next age. Select exactly 2, then confirm.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            {player.pendingLegacyBonuses.map(bonus => {
              const isSelected = selectedBonusIds.includes(bonus.bonusId);
              const atMax = selectedBonusIds.length >= 2 && !isSelected;
              return (
                <button
                  key={bonus.bonusId}
                  disabled={atMax}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedBonusIds(selectedBonusIds.filter(id => id !== bonus.bonusId));
                    } else if (selectedBonusIds.length < 2) {
                      setSelectedBonusIds([...selectedBonusIds, bonus.bonusId]);
                    }
                  }}
                  className={`text-left p-3 rounded-lg border-2 transition-all ${atMax ? 'opacity-40' : 'hover:scale-[1.01]'}`}
                  style={
                    isSelected
                      ? {
                          backgroundColor: 'var(--panel-muted-bg)',
                          borderColor: 'var(--panel-accent-gold-soft)',
                          boxShadow: '0 0 8px rgba(251, 191, 36, 0.3)',
                        }
                      : {
                          backgroundColor: 'var(--panel-muted-bg)',
                          borderColor: 'var(--panel-border)',
                        }
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="text-xs font-semibold mb-1 capitalize" style={{ color: 'var(--panel-accent-gold-soft)' }}>
                        {bonus.axis} axis
                      </div>
                      <div className="text-sm" style={{ color: 'var(--panel-text-color)' }}>
                        {bonus.description}
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: 'var(--panel-muted-color)' }}>
                        {bonus.effect.type === 'MODIFY_YIELD' && `+${bonus.effect.value} ${bonus.effect.yield}/turn`}
                        {bonus.effect.type === 'MODIFY_COMBAT' && `+${bonus.effect.value} combat strength`}
                        {bonus.effect.type === 'GRANT_UNIT' && `Free ${bonus.effect.unitId}`}
                        {bonus.effect.type === 'UNLOCK_BUILDING' && `Unlocks ${bonus.effect.buildingId}`}
                      </div>
                    </div>
                    {isSelected && (
                      <div
                        className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: 'var(--panel-accent-gold-soft)', color: 'var(--panel-turn-badge-text)' }}
                      >
                        ✓
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          <button
            disabled={selectedBonusIds.length !== 2}
            onClick={() => {
              if (selectedBonusIds.length === 2) {
                dispatch({ type: 'CHOOSE_LEGACY_BONUSES', picks: [...selectedBonusIds] });
                setSelectedBonusIds([]);
              }
            }}
            className="w-full py-2 rounded-lg font-semibold text-sm transition-all"
            style={
              selectedBonusIds.length === 2
                ? {
                    backgroundColor: 'var(--panel-accent-gold-soft)',
                    color: 'var(--panel-turn-badge-text)',
                    cursor: 'pointer',
                  }
                : {
                    backgroundColor: 'var(--panel-muted-strong)',
                    color: 'var(--panel-muted-color)',
                    cursor: 'not-allowed',
                    opacity: 0.6,
                  }
            }
            data-testid="confirm-legacy-bonuses"
          >
            {selectedBonusIds.length === 2
              ? 'Confirm Legacy Bonuses'
              : `Select ${2 - selectedBonusIds.length} more bonus${2 - selectedBonusIds.length === 1 ? '' : 'es'}`}
          </button>
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
            const uniqueUnit = civ.uniqueUnit ? state.config.units.get(civ.uniqueUnit) : undefined;
            const uniqueBuilding = civ.uniqueBuilding ? state.config.buildings.get(civ.uniqueBuilding) : undefined;
            const isRecommended = civ.historicalPair?.includes(player.civilizationId) ?? false;

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
                    <div className="font-bold text-lg flex items-center gap-2" style={{ color: civ.color }}>
                      {civ.name}
                      {isRecommended && (
                        <span
                          className="px-1.5 py-0.5 rounded text-[10px] font-semibold"
                          style={{ backgroundColor: 'var(--panel-accent-gold-soft)', color: 'var(--panel-turn-badge-text)' }}
                        >
                          ★ Recommended
                        </span>
                      )}
                    </div>
                    <div className="text-xs capitalize" style={{ color: 'var(--panel-muted-color)' }}>{civ.age} Age</div>
                  </div>
                  {ready && (
                    <div
                      className="px-2 py-1 rounded text-xs font-bold"
                      style={{ backgroundColor: 'var(--panel-accent-gold-soft)', color: 'var(--panel-turn-badge-text)' }}
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
    case 'antiquity': return 'var(--panel-accent-purple)';   // purple
    case 'exploration': return 'var(--panel-accent-info-bright)'; // blue
    case 'modern': return 'var(--panel-accent-gold-soft)';  // gold
  }
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
