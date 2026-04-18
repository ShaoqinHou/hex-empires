import { useGameState } from '../../providers/GameProvider';
// Phase 4.3: gold rule + chrome bar tokens.
import './chrome-bars.css';
import { coordToKey, getTileContents, hasStackedEntities } from '@hex/engine';
import type { YieldSet, UnitState } from '@hex/engine';
import type { UnitDef } from '@hex/engine';
import { useMemo } from 'react';

const SHORTCUT_LINE = 'WASD: pan | Scroll: zoom | Enter: end turn | Space: next unit | T: tech | Esc: deselect';

export function BottomBar() {
  const { selectedUnit, selectedHex, state, dispatch, terrainRegistry, featureRegistry, unitRegistry, setSelectedUnit, setSelectedHex } = useGameState();

  const player = state.players.get(state.currentPlayerId);

  const unitDef = selectedUnit ? state.config.units.get(selectedUnit.typeId) : null;
  const canFoundCity = unitDef?.abilities.includes('found_city') ?? false;
  const isCivilian = unitDef?.category === 'civilian';
  const isBuilder = unitDef?.abilities.includes('build_improvement') ?? false;

  // Upgrade availability
  const upgradeTargetDef = useMemo(() => {
    if (!unitDef?.upgradesTo || !player) return null;
    const target = state.config.units.get(unitDef.upgradesTo);
    if (!target) return null;
    if (target.requiredTech && !player.researchedTechs.includes(target.requiredTech)) return null;
    return target;
  }, [unitDef, player, state.config.units]);
  const upgradeCost = upgradeTargetDef ? upgradeTargetDef.cost * 2 : 0;
  const canAffordUpgrade = player ? player.gold >= upgradeCost : false;

  // Calculate available improvements for selected tile (builder)
  const availableImprovements = useMemo(() => {
    if (!isBuilder || !selectedHex) return [];
    if (!player) return [];
    const tileKey = coordToKey(selectedHex);
    const currentTile = state.map.tiles.get(tileKey);
    if (!currentTile) return [];
    return [...state.config.improvements.values()].filter(improvement => {
      if (improvement.requiredTech && !player.researchedTechs.includes(improvement.requiredTech)) return false;
      if (improvement.prerequisites.terrain && !improvement.prerequisites.terrain.includes(currentTile.terrain)) return false;
      if (improvement.prerequisites.feature) {
        if (!currentTile.feature || !improvement.prerequisites.feature.includes(currentTile.feature)) return false;
      }
      if (improvement.prerequisites.resource) {
        if (!currentTile.resource || !improvement.prerequisites.resource.includes(currentTile.resource)) return false;
      }
      if (currentTile.improvement) return false;
      return true;
    });
  }, [isBuilder, selectedHex, state, player]);

  // Empire summary stats (used when nothing is selected)
  const empireSummary = useMemo(() => {
    if (!player) return null;
    const playerCities = [...state.cities.values()].filter(c => c.owner === state.currentPlayerId);
    const totalPop = playerCities.reduce((s, c) => s + c.population, 0);

    const playerUnits = [...state.units.values()].filter(u => u.owner === state.currentPlayerId);
    const militaryUnits = playerUnits.filter(u => {
      const def = state.config.units.get(u.typeId);
      return def && def.category !== 'civilian';
    }).length;
    const civilianUnits = playerUnits.length - militaryUnits;

    const researchTech = player.currentResearch
      ? (state.config.technologies.get(player.currentResearch) ?? null)
      : null;
    const turnsRemaining = researchTech
      ? Math.max(1, Math.ceil((researchTech.cost - player.researchProgress) / Math.max(1, player.science)))
      : null;

    const civicDef = player.currentCivic
      ? (state.config.civics.get(player.currentCivic) ?? null)
      : null;
    const civicTurns = civicDef
      ? Math.max(1, Math.ceil((civicDef.cost - player.civicProgress) / Math.max(1, player.culture)))
      : null;

    return {
      cityCount: playerCities.length,
      totalPop,
      militaryUnits,
      civilianUnits,
      researchTech,
      researchProgress: player.researchProgress,
      turnsRemaining,
      civicDef,
      civicProgress: player.civicProgress,
      civicTurns,
    };
  }, [state, player]);

  // Stack picker: compute tile contents for the selected hex
  const selectedTileHex = selectedUnit?.position ?? selectedHex ?? null;
  const tileContents = useMemo(() => {
    if (!selectedTileHex) return null;
    return getTileContents(state, selectedTileHex, state.currentPlayerId);
  }, [state, selectedTileHex]);

  const showStackPicker = tileContents ? hasStackedEntities(tileContents, state.currentPlayerId) : false;

  // Derive a stable selected entity id for highlighting in the portrait strip
  const selectedEntityId = selectedUnit?.id ?? null;

  return (
    <div
      data-chrome-bar="bottom"
      className="flex flex-col select-none layout-chrome-bar"
      style={{
        // Phase 4.3: warm olive gradient replaces surface/bg fallback.
        // Reversed direction (0deg = bottom-to-top) preserved for BottomBar.
        background: 'linear-gradient(0deg, rgba(42, 37, 17, 0.98) 0%, rgba(67, 59, 28, 0.98) 100%)',
        // border-top replaced by ::before gold rule in chrome-bars.css.
        boxShadow: '0 -2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* ── Stack picker portrait strip (shown when 2+ entities on selected tile) ── */}
      {showStackPicker && tileContents && (
        <div
          className="flex items-center gap-1.5 px-4 overflow-x-auto"
          style={{
            // fixed: 32px = click-target minimum for portrait buttons;
            // no S-03 token for this sub-strip; intentional fixed value.
            height: '32px',
            borderBottom: '1px solid rgba(139,148,158,0.2)',
            background: 'rgba(0,0,0,0.2)',
            flexShrink: 0,
          }}
        >
          <span className="text-[10px] font-mono shrink-0" style={{ color: 'rgba(139,148,158,0.5)' }}>
            On tile:
          </span>
          {tileContents.ownUnits.map(unit => (
            <StackPortrait
              key={unit.id}
              label={state.config.units.get(unit.typeId)?.name ?? unit.typeId}
              icon={getUnitIcon(unit, state.config.units)}
              isSelected={selectedEntityId === unit.id}
              onClick={() => {
                setSelectedUnit(unit);
                setSelectedHex(unit.position);
              }}
            />
          ))}
          {tileContents.city && tileContents.city.owner === state.currentPlayerId && (
            <StackPortrait
              key={tileContents.city.id}
              label={tileContents.city.name}
              icon="🏰"
              isSelected={false /* TODO Phase C: selectedCity?.id === tileContents.city.id */}
              onClick={() => {
                // TODO Phase C: selectCity(tileContents.city!.id) when selectCity is in context
                // For now: deselect unit and set hex so terrain/city info shows
                setSelectedUnit(null);
                setSelectedHex(tileContents.city!.position);
              }}
            />
          )}
        </div>
      )}

      {/* ── Main content row ── */}
      <div className="flex-1 flex items-center px-4 gap-3 min-h-0 overflow-hidden" style={{ minHeight: 'var(--chrome-bar-content-min-height)' }}>

        {/* ── UNIT SELECTED ── */}
        {selectedUnit && unitDef && (
          <>
            {/* Unit identity card */}
            <InfoPill color="rgba(88,166,255,0.18)" border="rgba(88,166,255,0.35)">
              <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                {unitDef.name}
              </span>
              <div className="flex gap-2.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span>
                  ❤️{' '}
                  <span style={{ color: selectedUnit.health > 66 ? 'var(--color-health-high)' : 'var(--color-health-low)' }}>
                    {selectedUnit.health}
                  </span>
                  /100
                </span>
                <span>
                  🚀{' '}
                  <span style={{ color: selectedUnit.movementLeft > 0 ? 'var(--color-accent)' : 'var(--color-text-muted)' }}>
                    {selectedUnit.movementLeft}
                  </span>
                  /{unitDef.movement}
                </span>
                {selectedUnit.fortified && <span style={{ color: 'var(--color-science)' }}>🛡 Fortified</span>}
                {selectedUnit.experience > 0 && <span>⭐ {selectedUnit.experience} XP</span>}
              </div>
            </InfoPill>

            {/* Combat strength */}
            {!isCivilian && (
              <InfoPill color="rgba(255,107,107,0.12)" border="rgba(255,107,107,0.3)">
                <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
                  <span style={{ color: 'var(--color-production)' }}>⚔ {unitDef.combat}</span>
                  {unitDef.rangedCombat > 0 && (
                    <span style={{ color: 'var(--color-science)' }}> · 🎯 {unitDef.rangedCombat} (r{unitDef.range})</span>
                  )}
                </span>
              </InfoPill>
            )}

            {/* Promotions */}
            {selectedUnit.promotions.length > 0 && (
              <InfoPill color="rgba(255,213,79,0.1)" border="rgba(255,213,79,0.3)">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Promotions:{' '}
                  {selectedUnit.promotions.map(pid => {
                    const p = state.config.promotions?.get(pid);
                    return (
                      <span
                        key={pid}
                        className="inline-block px-1.5 py-0.5 rounded mr-1"
                        style={{
                          background: 'rgba(255,213,79,0.15)',
                          color: 'var(--panel-button-age)',
                          border: '1px solid rgba(255,213,79,0.25)',
                          fontSize: '11px',
                        }}
                        title={p?.description}
                      >
                        {p?.name ?? pid}
                      </span>
                    );
                  })}
                </span>
              </InfoPill>
            )}

            {/* Builder improvement hints */}
            {isBuilder && selectedHex && availableImprovements.length > 0 && (
              <InfoPill color="rgba(124,252,0,0.08)" border="rgba(124,252,0,0.3)">
                <span className="text-xs" style={{ color: 'var(--color-accent)' }}>🏗 Build:</span>
                <div className="flex gap-1 flex-wrap">
                  {availableImprovements.slice(0, 3).map(imp => (
                    <span
                      key={imp.id}
                      className="px-1.5 py-0.5 rounded text-[11px]"
                      style={{ background: 'rgba(124,252,0,0.1)', color: 'var(--color-text)', border: 'var(--border-hairline) solid rgba(124,252,0,0.2)' }}
                    >
                      {imp.name}
                    </span>
                  ))}
                  {availableImprovements.length > 3 && (
                    <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>
                      +{availableImprovements.length - 3}
                    </span>
                  )}
                </div>
              </InfoPill>
            )}

            {/* Action buttons — pushed right.
                role="toolbar" lets screen readers navigate with arrow keys. */}
            <div role="toolbar" aria-label="Unit actions" className="flex gap-2 ml-auto">
              {canFoundCity && (
                <ActionButton
                  label="Found City"
                  shortcut="B"
                  color="var(--color-food)"
                  icon="🏰"
                  onClick={() => dispatch({ type: 'FOUND_CITY', unitId: selectedUnit.id, name: `City ${state.cities.size + 1}` })}
                />
              )}
              {!isCivilian && selectedUnit.movementLeft > 0 && (
                <ActionButton
                  label={selectedUnit.fortified ? 'Unfortify' : 'Fortify'}
                  shortcut="F"
                  color="var(--color-science)"
                  icon="🛡️"
                  onClick={() => dispatch({ type: 'FORTIFY_UNIT', unitId: selectedUnit.id })}
                />
              )}
              {upgradeTargetDef && (
                <ActionButton
                  label={`Upgrade → ${upgradeTargetDef.name} (${upgradeCost}g)`}
                  shortcut="U"
                  color={canAffordUpgrade ? 'var(--color-gold)' : 'var(--color-text-muted)'}
                  icon="⬆️"
                  onClick={() => {
                    if (canAffordUpgrade) {
                      dispatch({ type: 'UPGRADE_UNIT', unitId: selectedUnit.id });
                    }
                  }}
                />
              )}
            </div>
          </>
        )}

        {/* ── HEX SELECTED (no unit) ── */}
        {selectedHex && !selectedUnit && (
          <>
            <span className="text-xs font-mono" style={{ color: 'var(--color-text-muted)' }}>
              ({selectedHex.q}, {selectedHex.r})
            </span>
            {(() => {
              const tile = state.map.tiles.get(coordToKey(selectedHex));
              if (!tile) return null;
              const terrain = terrainRegistry.get(tile.terrain);
              const feature = tile.feature ? featureRegistry.get(tile.feature) : null;
              return (
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                    {terrain?.name}{feature ? ` + ${feature.name}` : ''}
                  </span>
                  {terrain && <YieldDisplay yields={terrain.baseYields} />}
                  {tile.river.length > 0 && (
                    <span className="text-xs" style={{ color: 'var(--color-science)' }}>River (+1 gold)</span>
                  )}
                  {terrain && (
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      Move: {terrain.movementCost}{feature ? `+${feature.movementCostModifier}` : ''}
                      {terrain.defenseBonus > 0 && ` · Def: +${Math.round(terrain.defenseBonus * 100)}%`}
                      {feature && feature.defenseBonusModifier !== 0 &&
                        ` · Def: ${feature.defenseBonusModifier > 0 ? '+' : ''}${Math.round(feature.defenseBonusModifier * 100)}%`}
                    </span>
                  )}
                </div>
              );
            })()}
          </>
        )}

        {/* ── NOTHING SELECTED — empire summary ── */}
        {!selectedUnit && !selectedHex && empireSummary && (
          <div className="flex items-center gap-3 flex-1 flex-wrap">
            {/* Cities */}
            <InfoPill color="rgba(88,166,255,0.1)" border="rgba(88,166,255,0.25)">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                🏙{' '}
                <span className="font-bold" style={{ color: 'var(--color-accent)' }}>
                  {empireSummary.cityCount}
                </span>{' '}
                {empireSummary.cityCount === 1 ? 'city' : 'cities'}
                {empireSummary.totalPop > 0 && (
                  <span style={{ color: 'var(--color-text-muted)' }}> · pop {empireSummary.totalPop}</span>
                )}
              </span>
            </InfoPill>

            {/* Units */}
            <InfoPill color="rgba(255,107,107,0.1)" border="rgba(255,107,107,0.25)">
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                ⚔{' '}
                <span className="font-bold" style={{ color: 'var(--color-production)' }}>
                  {empireSummary.militaryUnits}
                </span>{' '}
                mil
                {empireSummary.civilianUnits > 0 && (
                  <span> ·{' '}
                    <span style={{ color: 'var(--color-food)' }}>{empireSummary.civilianUnits}</span> civ
                  </span>
                )}
              </span>
            </InfoPill>

            {/* Research */}
            {empireSummary.researchTech ? (
              <InfoPill color="rgba(77,171,247,0.1)" border="rgba(77,171,247,0.25)">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  🔬{' '}
                  <span className="font-semibold" style={{ color: 'var(--color-science)' }}>
                    {empireSummary.researchTech.name}
                  </span>
                  {empireSummary.turnsRemaining !== null && (
                    <span> · {empireSummary.turnsRemaining}t</span>
                  )}
                </span>
                {/* Progress bar */}
                <ProgressBar
                  value={empireSummary.researchProgress}
                  max={empireSummary.researchTech.cost}
                  color="var(--color-science)"
                />
              </InfoPill>
            ) : (
              <InfoPill color="rgba(77,171,247,0.08)" border="rgba(77,171,247,0.2)">
                <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>🔬 No research</span>
              </InfoPill>
            )}

            {/* Civic */}
            {empireSummary.civicDef ? (
              <InfoPill color="rgba(204,93,232,0.1)" border="rgba(204,93,232,0.25)">
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  🎭{' '}
                  <span className="font-semibold" style={{ color: 'var(--color-culture)' }}>
                    {empireSummary.civicDef.name}
                  </span>
                  {empireSummary.civicTurns !== null && (
                    <span> · {empireSummary.civicTurns}t</span>
                  )}
                </span>
                <ProgressBar
                  value={empireSummary.civicProgress}
                  max={empireSummary.civicDef.cost}
                  color="var(--color-culture)"
                />
              </InfoPill>
            ) : (
              <InfoPill color="rgba(204,93,232,0.08)" border="rgba(204,93,232,0.2)">
                <span className="text-xs italic" style={{ color: 'var(--color-text-muted)' }}>🎭 No civic</span>
              </InfoPill>
            )}
          </div>
        )}
      </div>

      {/* ── Keyboard shortcuts strip ── */}
      <div
        className="flex items-center justify-center px-4"
        style={{
          // fixed: 16px strip height — deliberately minimal; at 48px BottomBar
          // this strip consumes ~⅓ of the bar, which is intentional visual weight.
          height: '16px',
          borderTop: '1px solid rgba(139,148,158,0.12)',
          background: 'rgba(0,0,0,0.15)',
        }}
      >
        <span
          className="font-mono"
          style={{
            // fixed: 10px intentionally below --type-label-size (11px) for
            // visual de-emphasis; shortcut strip is secondary chrome.
            fontSize: '10px',
            color: 'rgba(139,148,158,0.55)',
            letterSpacing: '0.03em',
          }}
        >
          {SHORTCUT_LINE}
        </span>
      </div>
    </div>
  );
}

// ── Sub-components ──

function InfoPill({ color, border, children }: { color: string; border: string; children: React.ReactNode }) {
  return (
    <div
      className="flex flex-col justify-center px-2.5 py-1 rounded gap-0.5 shrink-0"
      style={{
        background: color,
        border: `1px solid ${border}`,
        minHeight: '34px',
      }}
    >
      {children}
    </div>
  );
}

// Progress bar track — fixed micro-visualization dimensions (not chrome layout).
// 3px track height and 64px width are intentional sub-chrome display values.
const PROGRESS_TRACK_STYLE = {
  height: '3px',
  width: '64px',
  background: 'rgba(255,255,255,0.1)',
  marginTop: '2px',
} as const;

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  // borderRadius pill via class to avoid inline px value (H-15).
  return (
    <div className="rounded-full overflow-hidden" style={PROGRESS_TRACK_STYLE}>
      <div className="rounded-full h-full" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function ActionButton({ label, shortcut, color, icon, textColor, onClick }: {
  label: string;
  shortcut: string;
  color: string;
  icon?: string;
  textColor?: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={`${label} (keyboard shortcut: ${shortcut})`}
      className="px-3 py-1.5 text-xs rounded font-bold cursor-pointer flex items-center gap-1.5 transition-all hover:scale-105"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
        color: textColor ?? 'var(--panel-turn-badge-text)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      }}
      onClick={onClick}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
      <span
        className="text-[10px] px-1.5 py-0.5 rounded ml-1"
        style={{
          backgroundColor: 'rgba(0,0,0,0.3)',
          fontWeight: 'normal',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        [{shortcut}]
      </span>
    </button>
  );
}

/**
 * Single portrait button in the stack picker strip.
 * Highlighted when this entity is the currently selected one.
 */
function StackPortrait({
  label,
  icon,
  isSelected,
  onClick,
}: {
  label: string;
  icon: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={isSelected ? `${label} (selected)` : label}
      className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] cursor-pointer transition-all hover:scale-105 shrink-0"
      style={{
        background: isSelected ? 'rgba(88,166,255,0.25)' : 'rgba(255,255,255,0.06)',
        border: isSelected
          ? '1px solid rgba(88,166,255,0.6)'
          : '1px solid rgba(139,148,158,0.2)',
        color: isSelected ? 'var(--color-accent)' : 'var(--color-text)',
        fontWeight: isSelected ? 700 : 400,
        boxShadow: isSelected ? '0 0 6px rgba(88,166,255,0.3)' : 'none',
      }}
    >
      <span>{icon}</span>
      <span className="max-w-[80px] overflow-hidden text-ellipsis whitespace-nowrap">
        {label}
      </span>
      {isSelected && (
        <span className="text-[8px] ml-px" style={{ color: 'rgba(88,166,255,0.8)' }}>●</span>
      )}
    </button>
  );
}

/**
 * Pick a representative emoji icon for a unit based on its category / abilities.
 */
function getUnitIcon(unit: UnitState, unitDefs: ReadonlyMap<string, UnitDef>): string {
  const def = unitDefs.get(unit.typeId);
  if (!def) return '⚔️';
  if (def.abilities?.includes('found_city')) return '🏘️';
  if (def.abilities?.includes('build_improvement')) return '⚒️';
  if (def.category === 'naval') return '⛵';
  if (def.category === 'ranged') return '🏹';
  if (def.category === 'siege') return '💣';
  if (def.category === 'civilian') return '🧑';
  if (def.category === 'religious') return '✝️';
  return '⚔️';
}

function YieldDisplay({ yields }: { yields: Partial<YieldSet> }) {
  const items = [
    { key: 'food', value: yields.food, color: 'var(--color-food)' },
    { key: 'production', value: yields.production, color: 'var(--color-production)' },
    { key: 'gold', value: yields.gold, color: 'var(--color-gold)' },
    { key: 'science', value: yields.science, color: 'var(--color-science)' },
    { key: 'culture', value: yields.culture, color: 'var(--color-culture)' },
    { key: 'faith', value: yields.faith, color: 'var(--color-faith)' },
  ].filter(i => i.value && i.value > 0);

  return (
    <div className="flex items-center gap-1.5">
      {items.map(i => (
        <span key={i.key} className="flex items-center gap-0.5 text-xs">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: i.color }} />
          <span style={{ color: i.color }}>{i.value}</span>
        </span>
      ))}
    </div>
  );
}
