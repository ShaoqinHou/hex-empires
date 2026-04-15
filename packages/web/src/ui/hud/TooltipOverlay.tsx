import { useMemo } from 'react';
import type { HexCoord, GameState } from '@hex/engine';
import {
  getTileContents,
  calculateCityYields,
  ALL_UNITS,
  ALL_BASE_TERRAINS,
  ALL_FEATURES,
  ALL_IMPROVEMENTS,
  ALL_RESOURCES,
  ALL_BUILDINGS,
} from '@hex/engine';
import { TooltipShell } from './TooltipShell';
import { UnitStateTooltip } from '../components/tooltips';

interface TooltipOverlayProps {
  /**
   * Hex → screen-pixel projector. Must return absolute viewport
   * coordinates (or null when the hex is off-camera). Passed by the
   * App-level glue that owns the camera; lives here as a prop to keep
   * this file out of the `canvas/ → ui/` import boundary.
   */
  hexToScreen: (q: number, r: number) => { readonly x: number; readonly y: number } | null;
  hoveredHex: HexCoord | null;
  isAltPressed: boolean;
  state: GameState;
}

// ─── Lightweight (always-on) tooltip body ───────────────────────────────────

function LightweightTooltipBody({ state, hex }: { state: GameState; hex: HexCoord }) {
  const contents = useMemo(
    () => getTileContents(state, hex, state.currentPlayerId),
    [state, hex],
  );

  const tile = contents.tile;
  if (!tile) return null;

  const terrain = ALL_BASE_TERRAINS.find(t => t.id === tile.terrain);
  const feature = tile.feature ? ALL_FEATURES.find(f => f.id === tile.feature) : null;
  const resource = tile.resource ? ALL_RESOURCES.find(r => r.id === tile.resource) : null;
  const improvement = contents.improvement
    ? ALL_IMPROVEMENTS.find(i => i.id === contents.improvement)
    : null;

  // Aggregate tile yields: terrain base + feature modifiers
  const food =
    (terrain?.baseYields.food ?? 0) + (feature?.yieldModifiers.food ?? 0);
  const production =
    (terrain?.baseYields.production ?? 0) + (feature?.yieldModifiers.production ?? 0);
  const gold =
    (terrain?.baseYields.gold ?? 0) + (feature?.yieldModifiers.gold ?? 0);

  const terrainLabel = terrain?.name ?? tile.terrain;
  const featureLabel = feature?.name;

  // City ownership label
  let cityColor = 'text-slate-300';
  if (contents.city) {
    if (contents.city.owner === state.currentPlayerId) cityColor = 'text-green-400';
    else {
      const ownerPlayer = state.players.get(contents.city.owner);
      if (ownerPlayer) cityColor = 'text-red-400';
      else cityColor = 'text-slate-400';
    }
  }

  // Split own + enemy units into military vs civilian so the tooltip can show
  // each category separately. Without this split, a warrior+settler stack would
  // render as "Warrior ×2" (the top unit's name with the combined count), misreading
  // the settler as a duplicate warrior. Preserves the M37-B regression fix.
  const isCivilianUnit = (typeId: string): boolean => {
    const def = ALL_UNITS.find(u => u.id === typeId);
    return def?.category === 'civilian' || def?.category === 'religious';
  };

  const ownMilitary = contents.ownUnits.filter(u => !isCivilianUnit(u.typeId));
  const ownCivilian = contents.ownUnits.filter(u => isCivilianUnit(u.typeId));
  const enemyMilitary = contents.enemyUnits.filter(u => !isCivilianUnit(u.typeId));
  const enemyCivilian = contents.enemyUnits.filter(u => isCivilianUnit(u.typeId));

  const topOwnMilitary = ownMilitary[0] ?? null;
  const topOwnCivilian = ownCivilian[0] ?? null;
  const topEnemyMilitary = enemyMilitary[0] ?? null;
  const topEnemyCivilian = enemyCivilian[0] ?? null;

  const topOwnMilitaryDef = topOwnMilitary ? ALL_UNITS.find(u => u.id === topOwnMilitary.typeId) : null;
  const topOwnCivilianDef = topOwnCivilian ? ALL_UNITS.find(u => u.id === topOwnCivilian.typeId) : null;
  const topEnemyMilitaryDef = topEnemyMilitary ? ALL_UNITS.find(u => u.id === topEnemyMilitary.typeId) : null;
  const topEnemyCivilianDef = topEnemyCivilian ? ALL_UNITS.find(u => u.id === topEnemyCivilian.typeId) : null;

  return (
    <div className="text-xs" style={{ minWidth: '140px', lineHeight: '1.5' }}>
      {/* Line 1: Terrain + feature */}
      <div className="font-semibold text-amber-300">
        {terrainLabel}
        {featureLabel && <span className="font-normal text-slate-300"> + {featureLabel}</span>}
      </div>

      {/* Line 2: Compact yields (always shown even if all zero) */}
      <div className="flex gap-2 text-slate-300 mt-0.5">
        <span>🍖{food}</span>
        <span>⚙️{production}</span>
        <span>💰{gold}</span>
      </div>

      {/* Resource */}
      {resource && (
        <div className="text-yellow-300 mt-0.5">★ {resource.name}</div>
      )}

      {/* Improvement */}
      {improvement && (
        <div className="text-blue-300 mt-0.5">⛏ {improvement.name}</div>
      )}

      {/* City */}
      {contents.city && (
        <div className={`mt-0.5 ${cityColor}`}>
          🏛 {contents.city.name}{' '}
          <span className="text-slate-400">Pop {contents.city.population}</span>
        </div>
      )}

      {/* Own military unit */}
      {topOwnMilitary && topOwnMilitaryDef && (
        <div className="text-green-300 mt-0.5">
          ⚔ {topOwnMilitaryDef.name} ({topOwnMilitary.health}hp)
          {ownMilitary.length > 1 && (
            <span className="text-slate-400"> ×{ownMilitary.length}</span>
          )}
        </div>
      )}

      {/* Own civilian unit (separate line — a settler stacked with a warrior must
          show as its own entry, not collapse into the military count) */}
      {topOwnCivilian && topOwnCivilianDef && (
        <div className="text-green-200 mt-0.5">
          👤 {topOwnCivilianDef.name} ({topOwnCivilian.health}hp)
          {ownCivilian.length > 1 && (
            <span className="text-slate-400"> ×{ownCivilian.length}</span>
          )}
        </div>
      )}

      {/* Enemy military unit */}
      {topEnemyMilitary && topEnemyMilitaryDef && (
        <div className="text-red-400 mt-0.5">
          ⚔ {topEnemyMilitaryDef.name} ({topEnemyMilitary.health}hp)
          {enemyMilitary.length > 1 && (
            <span className="text-red-300"> ×{enemyMilitary.length}</span>
          )}
        </div>
      )}

      {/* Enemy civilian unit */}
      {topEnemyCivilian && topEnemyCivilianDef && (
        <div className="text-red-300 mt-0.5">
          👤 {topEnemyCivilianDef.name} ({topEnemyCivilian.health}hp)
          {enemyCivilian.length > 1 && (
            <span className="text-red-300"> ×{enemyCivilian.length}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Alt-expanded detailed tooltip body ─────────────────────────────────────

function DetailedTooltipBody({ state, hex }: { state: GameState; hex: HexCoord }) {
  const contents = useMemo(
    () => getTileContents(state, hex, state.currentPlayerId),
    [state, hex],
  );

  const tile = contents.tile;
  if (!tile) return null;

  const terrain = ALL_BASE_TERRAINS.find(t => t.id === tile.terrain);
  const feature = tile.feature ? ALL_FEATURES.find(f => f.id === tile.feature) : null;
  const resource = tile.resource ? ALL_RESOURCES.find(r => r.id === tile.resource) : null;
  const improvement = contents.improvement
    ? ALL_IMPROVEMENTS.find(i => i.id === contents.improvement)
    : null;
  const building = tile.building
    ? ALL_BUILDINGS.find(b => b.id === tile.building)
    : null;

  const cityYields = contents.city ? calculateCityYields(contents.city, state) : null;

  // Gather all own + enemy units with their defs for full stat display
  const allUnitsWithDefs = [
    ...contents.ownUnits.map(u => ({
      unit: u,
      def: ALL_UNITS.find(d => d.id === u.typeId),
      isEnemy: false,
    })),
    ...contents.enemyUnits.map(u => ({
      unit: u,
      def: ALL_UNITS.find(d => d.id === u.typeId),
      isEnemy: true,
    })),
  ];

  return (
    <div className="text-xs" style={{ minWidth: '220px', lineHeight: '1.6' }}>
      {/* Terrain header */}
      <div className="font-bold text-sm text-amber-400 mb-1">
        {terrain?.name ?? tile.terrain}
        {feature && <span className="text-slate-300 font-normal"> + {feature.name}</span>}
      </div>

      {/* Terrain details */}
      <div className="text-slate-400 space-y-0.5 mb-2">
        <div className="flex justify-between">
          <span>Movement cost</span>
          <span className="text-slate-200">
            {(terrain?.movementCost ?? 1) + (feature?.movementCostModifier ?? 0)}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Defense bonus</span>
          <span className="text-slate-200">
            +{Math.round(((terrain?.defenseBonus ?? 0) + (feature?.defenseBonusModifier ?? 0)) * 100)}%
          </span>
        </div>
      </div>

      {/* Yield breakdown */}
      <div className="border-t border-slate-700 pt-2 mb-2">
        <div className="text-slate-400 font-semibold mb-1">Tile Yields</div>
        <div className="grid grid-cols-3 gap-1 text-slate-300">
          {(terrain?.baseYields.food ?? 0) > 0 && (
            <div>🌾 {terrain!.baseYields.food}</div>
          )}
          {(terrain?.baseYields.production ?? 0) > 0 && (
            <div>🔨 {terrain!.baseYields.production}</div>
          )}
          {(terrain?.baseYields.gold ?? 0) > 0 && (
            <div>💰 {terrain!.baseYields.gold}</div>
          )}
          {(feature?.yieldModifiers.food ?? 0) > 0 && (
            <div className="text-green-300">🌾 +{feature!.yieldModifiers.food}</div>
          )}
          {(feature?.yieldModifiers.production ?? 0) > 0 && (
            <div className="text-green-300">🔨 +{feature!.yieldModifiers.production}</div>
          )}
          {(feature?.yieldModifiers.gold ?? 0) > 0 && (
            <div className="text-green-300">💰 +{feature!.yieldModifiers.gold}</div>
          )}
          {improvement?.yields.food && improvement.yields.food > 0 && (
            <div className="text-blue-300">🌾 +{improvement.yields.food}</div>
          )}
          {improvement?.yields.production && improvement.yields.production > 0 && (
            <div className="text-blue-300">🔨 +{improvement.yields.production}</div>
          )}
          {improvement?.yields.gold && improvement.yields.gold > 0 && (
            <div className="text-blue-300">💰 +{improvement.yields.gold}</div>
          )}
        </div>
      </div>

      {/* Resource */}
      {resource && (
        <div className="border-t border-slate-700 pt-2 mb-2">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{
                backgroundColor:
                  resource.type === 'luxury'
                    ? 'var(--color-resource-luxury, #ffd54f)'
                    : resource.type === 'strategic'
                    ? 'var(--color-resource-strategic, #9e9e9e)'
                    : 'var(--color-resource-bonus, #66bb6a)',
              }}
            />
            <span className="text-yellow-300 font-semibold">{resource.name}</span>
            <span className="text-slate-400 capitalize">({resource.type})</span>
          </div>
        </div>
      )}

      {/* Improvement */}
      {improvement && (
        <div className="border-t border-slate-700 pt-2 mb-2">
          <div className="text-blue-300">⛏ {improvement.name}</div>
        </div>
      )}

      {/* Building (tile-placed) */}
      {building && (
        <div className="border-t border-slate-700 pt-2 mb-2">
          <div className="text-purple-300">🏗 {building.name}</div>
        </div>
      )}

      {/* City */}
      {contents.city && (
        <div className="border-t border-slate-700 pt-2 mb-2">
          <div className="font-bold text-amber-400 mb-1">{contents.city.name}</div>
          <div className="space-y-0.5 text-slate-400">
            <div className="flex justify-between">
              <span>Owner</span>
              <span className="text-slate-200">{contents.city.owner}</span>
            </div>
            <div className="flex justify-between">
              <span>Population</span>
              <span className="text-slate-200">{contents.city.population}</span>
            </div>
            <div className="flex justify-between">
              <span>Type</span>
              <span className="text-slate-200 capitalize">{contents.city.settlementType}</span>
            </div>
            <div className="flex justify-between">
              <span>Defense</span>
              <span className="text-slate-200">{contents.city.defenseHP} HP</span>
            </div>
            <div className="flex justify-between">
              <span>Happiness</span>
              <span
                className={
                  contents.city.happiness >= 0 ? 'text-green-400' : 'text-red-400'
                }
              >
                {contents.city.happiness >= 0
                  ? `+${contents.city.happiness}`
                  : contents.city.happiness}
              </span>
            </div>
            {contents.city.specialization && (
              <div className="flex justify-between">
                <span>Specialization</span>
                <span className="text-amber-400 capitalize">
                  {contents.city.specialization.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
          {cityYields && (
            <div className="mt-2 grid grid-cols-2 gap-1 text-slate-300">
              <div>🌾 {cityYields.food.toFixed(1)}</div>
              <div>🔨 {cityYields.production.toFixed(1)}</div>
              <div>💰 {cityYields.gold.toFixed(1)}</div>
              <div>🔬 {cityYields.science.toFixed(1)}</div>
              <div>🎭 {cityYields.culture.toFixed(1)}</div>
              <div>⛪ {cityYields.faith.toFixed(1)}</div>
            </div>
          )}
          {contents.city.productionQueue.length > 0 &&
            contents.city.settlementType === 'city' && (
              <div className="mt-2">
                <div className="text-slate-400">
                  Producing: {contents.city.productionQueue[0].id}
                </div>
              </div>
            )}
        </div>
      )}

      {/* All units (own + enemy, full stats) */}
      {allUnitsWithDefs.length > 0 && (
        <div className="border-t border-slate-700 pt-2 space-y-2">
          {allUnitsWithDefs.map(({ unit, def, isEnemy }) => (
            <div key={unit.id}>
              {def ? (
                <UnitStateTooltip unitState={unit} unitDef={def} />
              ) : (
                <div className={isEnemy ? 'text-red-400' : 'text-green-300'}>
                  {unit.typeId} ({unit.health}hp)
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Hover tooltip for map hexes — tile terrain, entity snapshot, unit stats.
 *
 * Migrated to use {@link TooltipShell} for positioning (cycle (c) of the HUD
 * audit). The shell owns quadrant-aware diagonal offset, viewport clamping,
 * pointer-events discipline, and context-menu suppression. The old
 * `ClampedTooltipPositioner` with `translate(-50%, -100%)` placed the tooltip
 * directly above the anchor and covered the top of the hovered hex — the #1
 * audit complaint. `TooltipShell` offsets diagonally away from viewport edges
 * so the focal hex stays visible.
 *
 * TODO(cycle-e): migrate the Alt-held detailed tier to
 * `position="fixed-corner"` so the detailed body does not occlude the hex at
 * all. Cycle (c) ships compact-tier positioning only; detailed tier keeps the
 * same anchor for now, just at tier="detailed" (slightly wider padding).
 *
 * This component lives in `ui/hud/` rather than `canvas/` because it wraps
 * `TooltipShell` (also in `ui/hud/`); the `canvas/ → ui/` import boundary
 * forbids the reverse. The camera / hex-to-screen conversion is now taken as
 * a `hexToScreen` function prop so the component stays canvas-free.
 */
export function TooltipOverlay({
  hexToScreen,
  hoveredHex,
  isAltPressed,
  state,
}: TooltipOverlayProps) {
  if (!hoveredHex) return null;

  // Probe hexToScreen early — if the hex can't be projected (off-camera) we
  // render nothing. TooltipShell would otherwise render at (0, 0) with a
  // placeholder, which is fine for the shell but undesirable for a tile
  // hover tooltip where the anchor is always expected to be projectable.
  const projected = hexToScreen(hoveredHex.q, hoveredHex.r);
  if (!projected) return null;

  return (
    <TooltipShell
      id="tileTooltip"
      anchor={{ kind: 'hex', q: hoveredHex.q, r: hoveredHex.r }}
      position="floating"
      tier={isAltPressed ? 'detailed' : 'compact'}
      offset="auto"
      hexToScreen={hexToScreen}
    >
      {isAltPressed ? (
        <DetailedTooltipBody state={state} hex={hoveredHex} />
      ) : (
        <LightweightTooltipBody state={state} hex={hoveredHex} />
      )}
    </TooltipShell>
  );
}
