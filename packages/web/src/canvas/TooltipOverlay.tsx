import React, { useMemo } from 'react';
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
import type { Camera } from './Camera';
import { hexToPixel } from './HexRenderer';
import { UnitStateTooltip } from '../ui/components/tooltips';

interface TooltipOverlayProps {
  camera: Camera;
  hoveredHex: HexCoord | null;
  isAltPressed: boolean;
  state: GameState;
}

// ─── Lightweight (always-on) tooltip ────────────────────────────────────────

function LightweightTooltip({ state, hex }: { state: GameState; hex: HexCoord }) {
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

  const topOwnUnit = contents.ownUnits[0] ?? null;
  const topEnemyUnit = contents.enemyUnits[0] ?? null;

  const topOwnUnitDef = topOwnUnit ? ALL_UNITS.find(u => u.id === topOwnUnit.typeId) : null;
  const topEnemyUnitDef = topEnemyUnit ? ALL_UNITS.find(u => u.id === topEnemyUnit.typeId) : null;

  return (
    <div
      className="rounded-md shadow-lg border text-xs pointer-events-none"
      style={{
        background: 'rgba(15,23,42,0.92)',
        borderColor: 'rgba(148,163,184,0.25)',
        minWidth: '140px',
        maxWidth: '220px',
        padding: '6px 10px',
        lineHeight: '1.5',
      }}
    >
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

      {/* Own units */}
      {topOwnUnit && topOwnUnitDef && (
        <div className="text-green-300 mt-0.5">
          ⚔ {topOwnUnitDef.name} ({topOwnUnit.health}hp)
          {contents.ownUnits.length > 1 && (
            <span className="text-slate-400"> ×{contents.ownUnits.length}</span>
          )}
        </div>
      )}

      {/* Enemy units */}
      {topEnemyUnit && topEnemyUnitDef && (
        <div className="text-red-400 mt-0.5">
          ⚔ {topEnemyUnitDef.name} ({topEnemyUnit.health}hp)
          {contents.enemyUnits.length > 1 && (
            <span className="text-red-300"> ×{contents.enemyUnits.length}</span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Alt-expanded detailed tooltip ──────────────────────────────────────────

function DetailedTooltip({ state, hex }: { state: GameState; hex: HexCoord }) {
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
    <div
      className="rounded-lg shadow-xl border text-xs pointer-events-none"
      style={{
        background: 'linear-gradient(135deg, rgba(30,41,59,0.97) 0%, rgba(15,23,42,0.99) 100%)',
        borderColor: 'rgba(251,191,36,0.35)',
        borderWidth: '2px',
        minWidth: '220px',
        maxWidth: '300px',
        padding: '10px 14px',
        lineHeight: '1.6',
      }}
    >
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
                    ? '#ffd54f'
                    : resource.type === 'strategic'
                    ? '#9e9e9e'
                    : '#66bb6a',
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
 * Canvas overlay that shows hover tooltips on hex tiles.
 *
 * - Always-on lightweight tooltip: terrain, yields, top entity, city info.
 * - Alt-expanded detailed tooltip: full stats, yield breakdown, unit cards.
 *
 * Positioning: anchored above the hovered hex center (world → screen via camera).
 */
export function TooltipOverlay({
  camera,
  hoveredHex,
  isAltPressed,
  state,
}: TooltipOverlayProps) {
  if (!hoveredHex) return null;

  const { x: worldX, y: worldY } = hexToPixel(hoveredHex);
  const screen = camera.worldToScreen(worldX, worldY);

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: screen.x,
        top: screen.y,
        transform: 'translate(-50%, -100%) translateY(-12px)',
      }}
    >
      {isAltPressed ? (
        <DetailedTooltip state={state} hex={hoveredHex} />
      ) : (
        <LightweightTooltip state={state} hex={hoveredHex} />
      )}
    </div>
  );
}
