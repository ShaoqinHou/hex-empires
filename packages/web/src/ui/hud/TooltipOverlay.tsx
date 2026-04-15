import { useEffect, useMemo, useRef } from 'react';
import type { HexCoord, GameState, HexTile, UnitState, UnitDef } from '@hex/engine';
import {
  getTileContents,
  calculateCityYields,
  coordToKey,
  ALL_UNITS,
  ALL_BASE_TERRAINS,
  ALL_FEATURES,
  ALL_IMPROVEMENTS,
  ALL_RESOURCES,
  ALL_BUILDINGS,
} from '@hex/engine';
import { TooltipShell } from './TooltipShell';
import { UnitStateTooltip } from '../components/tooltips';
import { useHUDManager } from './HUDManager';

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

// ─── Yield aggregation helpers (pure) ─────────────────────────────────────

/** A single yield source contribution, broken out for the detailed tier. */
interface YieldSourceContribution {
  readonly label: string;
  readonly food?: number;
  readonly production?: number;
  readonly gold?: number;
  readonly science?: number;
  readonly culture?: number;
  readonly faith?: number;
}

/**
 * Enumerate every yield contribution on the tile with its human label.
 * Powers the detailed-tier per-source breakdown
 * ("Grassland +2, Forest +1, Farm +1, River +1") AND the compact-tier
 * summed yields. Pure — reads only the tile and engine data arrays.
 */
function collectYieldSources(tile: HexTile): ReadonlyArray<YieldSourceContribution> {
  const sources: YieldSourceContribution[] = [];

  const terrain = ALL_BASE_TERRAINS.find(t => t.id === tile.terrain);
  if (terrain) {
    const y = terrain.baseYields;
    if (y.food || y.production || y.gold) {
      sources.push({
        label: terrain.name,
        food: y.food,
        production: y.production,
        gold: y.gold,
      });
    }
  }

  if (tile.feature) {
    const feature = ALL_FEATURES.find(f => f.id === tile.feature);
    if (feature) {
      const y = feature.yieldModifiers;
      if (y.food || y.production || y.gold) {
        sources.push({
          label: feature.name,
          food: y.food,
          production: y.production,
          gold: y.gold,
        });
      }
    }
  }

  if (tile.improvement) {
    const improvement = ALL_IMPROVEMENTS.find(i => i.id === tile.improvement);
    if (improvement) {
      const y = improvement.yields;
      if (y.food || y.production || y.gold || y.science || y.culture || y.faith) {
        sources.push({
          label: improvement.name,
          food: y.food,
          production: y.production,
          gold: y.gold,
          science: y.science,
          culture: y.culture,
          faith: y.faith,
        });
      }
    }
  }

  if (tile.resource) {
    const resource = ALL_RESOURCES.find(r => r.id === tile.resource);
    if (resource) {
      // ResourceDef.yieldBonus matches YieldCalculator's expectation; fall
      // back to {} if the test fixture's ResourceDef omits it.
      const rd = resource as unknown as {
        readonly yieldBonus?: Partial<{ food: number; production: number; gold: number }>;
      };
      const y = rd.yieldBonus ?? {};
      if (y.food || y.production || y.gold) {
        sources.push({
          label: resource.name,
          food: y.food,
          production: y.production,
          gold: y.gold,
        });
      }
    }
  }

  if (tile.river.length > 0) {
    // Matches YieldCalculator: rivers grant +1 gold.
    sources.push({ label: 'River', gold: 1 });
  }

  return sources;
}

interface YieldTotals {
  food: number;
  production: number;
  gold: number;
  science: number;
  culture: number;
  faith: number;
}

function sumYieldSources(sources: ReadonlyArray<YieldSourceContribution>): YieldTotals {
  const total: YieldTotals = {
    food: 0, production: 0, gold: 0, science: 0, culture: 0, faith: 0,
  };
  for (const s of sources) {
    total.food += s.food ?? 0;
    total.production += s.production ?? 0;
    total.gold += s.gold ?? 0;
    total.science += s.science ?? 0;
    total.culture += s.culture ?? 0;
    total.faith += s.faith ?? 0;
  }
  return total;
}

function formatSourceYields(s: YieldSourceContribution): string {
  const parts: string[] = [];
  if (s.food)       parts.push(`🌾 +${s.food}`);
  if (s.production) parts.push(`🔨 +${s.production}`);
  if (s.gold)       parts.push(`💰 +${s.gold}`);
  if (s.science)    parts.push(`🔬 +${s.science}`);
  if (s.culture)    parts.push(`🎭 +${s.culture}`);
  if (s.faith)      parts.push(`⛪ +${s.faith}`);
  return parts.join(' ');
}

// ─── Entity splitting (civilian vs military) ──────────────────────────────

function isCivilianUnit(typeId: string): boolean {
  const def = ALL_UNITS.find(u => u.id === typeId);
  return def?.category === 'civilian' || def?.category === 'religious';
}

// ─── Compact (always-on) tooltip body ─────────────────────────────────────

function LightweightTooltipBody({
  state, hex, stackSize, cycleIndex,
}: {
  state: GameState;
  hex: HexCoord;
  stackSize: number;
  cycleIndex: number;
}) {
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

  // Header: "Terrain (Feature, River)" inline.
  const terrainLabel = terrain?.name ?? tile.terrain;
  const inlineFeatures: string[] = [];
  if (feature) inlineFeatures.push(feature.name);
  if (tile.river.length > 0) inlineFeatures.push('River');
  const headerSuffix = inlineFeatures.length > 0 ? ` (${inlineFeatures.join(', ')})` : '';

  // Summed yields across every source (terrain + feature + improvement +
  // resource + river). Only non-zero yield types are rendered.
  const sources = collectYieldSources(tile);
  const totals = sumYieldSources(sources);

  // Per-category entity split preserves the M37-B regression fix: a
  // warrior + settler stack must show BOTH, not "Warrior ×2". Compact
  // tier still shows one entry per category (not the whole list).
  const ownMilitary = contents.ownUnits.filter(u => !isCivilianUnit(u.typeId));
  const ownCivilian = contents.ownUnits.filter(u => isCivilianUnit(u.typeId));
  const enemyMilitary = contents.enemyUnits.filter(u => !isCivilianUnit(u.typeId));
  const enemyCivilian = contents.enemyUnits.filter(u => isCivilianUnit(u.typeId));

  const topOwnMilitary = ownMilitary[0] ?? null;
  const topOwnCivilian = ownCivilian[0] ?? null;
  const topEnemyMilitary = enemyMilitary[0] ?? null;
  const topEnemyCivilian = enemyCivilian[0] ?? null;

  const defFor = (u: UnitState | null): UnitDef | undefined =>
    u ? ALL_UNITS.find(d => d.id === u.typeId) : undefined;

  const topOwnMilitaryDef = defFor(topOwnMilitary);
  const topOwnCivilianDef = defFor(topOwnCivilian);
  const topEnemyMilitaryDef = defFor(topEnemyMilitary);
  const topEnemyCivilianDef = defFor(topEnemyCivilian);

  // City ownership colour hint.
  let cityColor = 'text-slate-300';
  if (contents.city) {
    if (contents.city.owner === state.currentPlayerId) cityColor = 'text-green-400';
    else if (state.players.get(contents.city.owner)) cityColor = 'text-red-400';
    else cityColor = 'text-slate-400';
  }

  // Stack-cycle pill: shown whenever the combined stack has >1 entity.
  // cycleIndex is supplied by HUDManager; Tab wiring already lives in the
  // manager (see HUDManager.tsx). `(i / N — Tab to cycle)` is one-indexed
  // for human readability.
  const showCyclePill = stackSize > 1;
  const displayIndex = stackSize > 0 ? (cycleIndex % stackSize) + 1 : 1;

  return (
    <div
      data-testid="tooltip-body-compact"
      className="text-xs"
      style={{ minWidth: '160px', lineHeight: '1.5' }}
    >
      {/* Header: Terrain + inline features */}
      <div className="font-semibold text-amber-300">
        {terrainLabel}
        {headerSuffix && (
          <span className="font-normal text-slate-300">{headerSuffix}</span>
        )}
      </div>

      {/* Summed yields — one per type, non-zero only. */}
      <div
        data-testid="tooltip-yields-compact"
        className="flex flex-wrap gap-2 text-slate-300 mt-0.5"
      >
        {totals.food !== 0       && <span>🌾 {totals.food}</span>}
        {totals.production !== 0 && <span>🔨 {totals.production}</span>}
        {totals.gold !== 0       && <span>💰 {totals.gold}</span>}
        {totals.science !== 0    && <span>🔬 {totals.science}</span>}
        {totals.culture !== 0    && <span>🎭 {totals.culture}</span>}
        {totals.faith !== 0      && <span>⛪ {totals.faith}</span>}
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

      {/* Own military — per-category count. M37-B: keeps civilian line
          distinct so a warrior + settler pair renders BOTH. */}
      {topOwnMilitary && topOwnMilitaryDef && (
        <div className="text-green-300 mt-0.5">
          ⚔ {topOwnMilitaryDef.name} ({topOwnMilitary.health}hp)
          {ownMilitary.length > 1 && (
            <span className="text-slate-400"> ×{ownMilitary.length}</span>
          )}
        </div>
      )}

      {/* Own civilian */}
      {topOwnCivilian && topOwnCivilianDef && (
        <div className="text-green-200 mt-0.5">
          👤 {topOwnCivilianDef.name} ({topOwnCivilian.health}hp)
          {ownCivilian.length > 1 && (
            <span className="text-slate-400"> ×{ownCivilian.length}</span>
          )}
        </div>
      )}

      {/* Enemy military */}
      {topEnemyMilitary && topEnemyMilitaryDef && (
        <div className="text-red-400 mt-0.5">
          ⚔ {topEnemyMilitaryDef.name} ({topEnemyMilitary.health}hp)
          {enemyMilitary.length > 1 && (
            <span className="text-red-300"> ×{enemyMilitary.length}</span>
          )}
        </div>
      )}

      {/* Enemy civilian */}
      {topEnemyCivilian && topEnemyCivilianDef && (
        <div className="text-red-300 mt-0.5">
          👤 {topEnemyCivilianDef.name} ({topEnemyCivilian.health}hp)
          {enemyCivilian.length > 1 && (
            <span className="text-red-300"> ×{enemyCivilian.length}</span>
          )}
        </div>
      )}

      {/* Stack-cycle pill — rendering only; Tab wiring lives in HUDManager. */}
      {showCyclePill && (
        <div
          data-testid="tooltip-cycle-pill"
          className="mt-1 text-slate-400"
          style={{ fontSize: '11px' }}
        >
          ({displayIndex} / {stackSize} — Tab to cycle)
        </div>
      )}
    </div>
  );
}

// ─── Alt-expanded detailed tooltip body ───────────────────────────────────

function DetailedTooltipBody({
  state, hex, stackSize, cycleIndex,
}: {
  state: GameState;
  hex: HexCoord;
  stackSize: number;
  cycleIndex: number;
}) {
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
  const tileBuilding = tile.building
    ? ALL_BUILDINGS.find(b => b.id === tile.building)
    : null;

  const inlineFeatures: string[] = [];
  if (feature) inlineFeatures.push(feature.name);
  if (tile.river.length > 0) inlineFeatures.push('River');
  const headerSuffix = inlineFeatures.length > 0 ? ` (${inlineFeatures.join(', ')})` : '';

  const sources = collectYieldSources(tile);

  // Per-source breakdown for the detailed tier — spec (e):
  // "Grassland +1, Farm +1, River +1" listing by contributor.
  const cityYields = contents.city ? calculateCityYields(contents.city, state) : null;

  // Buildings inside the city (for detailed tier). Lists name +
  // maintenance so the player can read their building roster without
  // opening the city panel.
  const cityBuildings = useMemo(() => {
    if (!contents.city) return [];
    return contents.city.buildings
      .map(id => ALL_BUILDINGS.find(b => b.id === id))
      .filter((b): b is NonNullable<typeof b> => b !== undefined);
  }, [contents.city]);

  // District on this tile — adjacency preview: the current adjacency
  // bonus stored on the district plus its type/level. Detailed per-
  // neighbour computation lives in `packages/engine/src/state/DistrictAdjacency.ts`
  // and is read through `DistrictSlot.adjacencyBonus` (already persisted
  // by the adjacency system) rather than re-evaluated in the view layer.
  const district = contents.district;
  const districtDef = useMemo(() => {
    if (!district) return null;
    const cfg = state.config as unknown as {
      readonly districts?: ReadonlyMap<string, { readonly name: string; readonly type: string }>;
    };
    return cfg.districts?.get(district.type) ?? null;
  }, [district, state]);

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

  const showCyclePill = stackSize > 1;
  const displayIndex = stackSize > 0 ? (cycleIndex % stackSize) + 1 : 1;

  return (
    <div
      data-testid="tooltip-body-detailed"
      className="text-xs"
      style={{ minWidth: '260px', lineHeight: '1.55' }}
    >
      {/* Header */}
      <div className="font-bold text-sm text-amber-400 mb-1">
        {terrain?.name ?? tile.terrain}
        {headerSuffix && (
          <span className="text-slate-300 font-normal">{headerSuffix}</span>
        )}
      </div>

      {/* Terrain stats */}
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

      {/* Per-source yield breakdown — the detailed tier's headline. */}
      {sources.length > 0 && (
        <div
          data-testid="tooltip-yields-breakdown"
          className="border-t border-slate-700 pt-2 mb-2"
        >
          <div className="text-slate-400 font-semibold mb-1">Yield Breakdown</div>
          <div className="space-y-0.5">
            {sources.map((s, idx) => (
              <div
                key={`${s.label}-${idx}`}
                className="flex justify-between gap-3 text-slate-300"
              >
                <span className="text-slate-400">{s.label}</span>
                <span>{formatSourceYields(s)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resource detail */}
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

      {/* Tile-placed building (rarer — most buildings live in city/district). */}
      {tileBuilding && (
        <div className="border-t border-slate-700 pt-2 mb-2">
          <div className="text-purple-300 font-semibold">🏗 {tileBuilding.name}</div>
          {tileBuilding.maintenance > 0 && (
            <div className="text-slate-400">
              Maintenance: {tileBuilding.maintenance} gold/turn
            </div>
          )}
        </div>
      )}

      {/* District adjacency preview */}
      {district && (
        <div
          data-testid="tooltip-district-adjacency"
          className="border-t border-slate-700 pt-2 mb-2"
        >
          <div className="font-semibold text-purple-300">
            {districtDef?.name ?? district.type} (Lv {district.level})
          </div>
          <div className="text-slate-400">
            Adjacency bonus:{' '}
            <span className={district.adjacencyBonus >= 0 ? 'text-green-400' : 'text-red-400'}>
              {district.adjacencyBonus >= 0 ? '+' : ''}
              {district.adjacencyBonus}
            </span>
          </div>
        </div>
      )}

      {/* City detail */}
      {contents.city && (
        <div
          data-testid="tooltip-city-detail"
          className="border-t border-slate-700 pt-2 mb-2"
        >
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
          {cityBuildings.length > 0 && (
            <div
              data-testid="tooltip-city-buildings"
              className="mt-2 pt-2 border-t border-slate-700 space-y-1"
            >
              <div className="text-slate-400 font-semibold">Buildings</div>
              {cityBuildings.slice(0, 6).map(b => (
                <div key={b.id} className="flex justify-between gap-2 text-slate-300">
                  <span>🏛 {b.name}</span>
                  <span className="text-slate-400">
                    {b.maintenance > 0 ? `−${b.maintenance}💰` : 'free'}
                  </span>
                </div>
              ))}
              {cityBuildings.length > 6 && (
                <div className="text-slate-500">
                  …and {cityBuildings.length - 6} more
                </div>
              )}
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

      {/* Full unit stats — UnitStateTooltip surfaces hp/xp/movement/
          promotions in one consistent sub-widget. */}
      {allUnitsWithDefs.length > 0 && (
        <div
          data-testid="tooltip-unit-detail"
          className="border-t border-slate-700 pt-2 space-y-2"
        >
          {allUnitsWithDefs.map(({ unit, def, isEnemy }) => (
            <div key={unit.id}>
              {def ? (
                <UnitStateTooltip unitState={unit} unitDef={def} />
              ) : (
                <div className={isEnemy ? 'text-red-400' : 'text-green-300'}>
                  {unit.typeId} ({unit.health}hp, xp {unit.experience}, mv {unit.movementLeft})
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Stack-cycle pill mirrors compact-tier. */}
      {showCyclePill && (
        <div
          data-testid="tooltip-cycle-pill"
          className="mt-1 text-slate-400"
          style={{ fontSize: '11px' }}
        >
          ({displayIndex} / {stackSize} — Tab to cycle)
        </div>
      )}
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────

/**
 * Hover tooltip for map hexes — tile terrain, entity snapshot, unit stats.
 *
 * Cycles (d) + (e) of the HUD UI rethink — expanded tooltip bodies.
 *
 *   • Compact tier (default): terrain name + inline features, summed
 *     yields one-per-type, resource/improvement/city summaries, per-
 *     category top entity (preserves M37-B civilian+military split),
 *     stack-cycle pill `(i / N — Tab to cycle)` when stack > 1.
 *   • Detailed tier (Alt-held): everything compact shows PLUS per-source
 *     yield breakdown, full unit stats via `UnitStateTooltip`, building
 *     detail (maintenance), district adjacency preview.
 *
 * Tier is routed through `TooltipShell` (cycle (c)); the shell adjusts
 * padding + max-width. Anchor and projector stay identical across tiers
 * so toggling Alt does not jump the overlay. Tab-to-cycle wiring lives
 * in `HUDManager`; this component just reads the cycle index and renders
 * the indicator pill.
 */
export function TooltipOverlay({
  hexToScreen,
  hoveredHex,
  isAltPressed,
  state,
}: TooltipOverlayProps) {
  const hud = useHUDManager();

  // Register with HUDManager so Tab can advance the stack cycle for the
  // currently-hovered hex. The anchor key ties the registration to the
  // cycle state keyed by the same string. No-op when no hex is hovered.
  // Cycle (f) of the HUD UI rethink.
  //
  // We intentionally depend only on `anchorKey`, not on `hud` itself:
  // `HUDManager`'s context value re-memos whenever any registration
  // changes (because `isActive` closes over the registrations map), so
  // including `hud` as a dep would cause this very register() call to
  // retrigger the effect → infinite loop. A ref captures the latest
  // register/dismiss closures without making them into effect deps.
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const anchorKey = hoveredHex ? coordToKey(hoveredHex) : null;
  useEffect(() => {
    if (anchorKey === null) return;
    const unregister = hudRef.current.register('tileTooltip', { sticky: false, anchorKey });
    return unregister;
  }, [anchorKey]);

  if (!hoveredHex) return null;

  // Probe hexToScreen early — if the hex can't be projected (off-camera) we
  // render nothing. TooltipShell would otherwise render at (0, 0) with a
  // placeholder, which is fine for the shell but undesirable for a tile
  // hover tooltip where the anchor is always expected to be projectable.
  const projected = hexToScreen(hoveredHex.q, hoveredHex.r);
  if (!projected) return null;

  // Stack size + cycle index derived from TileContents (same source the
  // bodies use to render per-category entity lines).
  const contents = getTileContents(state, hoveredHex, state.currentPlayerId);
  const stackSize = contents.ownUnits.length + contents.enemyUnits.length;
  const cycleIndex = anchorKey !== null ? hud.cycleIndex(anchorKey) : 0;

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
        <DetailedTooltipBody
          state={state}
          hex={hoveredHex}
          stackSize={stackSize}
          cycleIndex={cycleIndex}
        />
      ) : (
        <LightweightTooltipBody
          state={state}
          hex={hoveredHex}
          stackSize={stackSize}
          cycleIndex={cycleIndex}
        />
      )}
    </TooltipShell>
  );
}
