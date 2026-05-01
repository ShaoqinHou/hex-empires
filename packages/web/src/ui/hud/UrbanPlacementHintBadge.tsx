/**
 * UrbanPlacementHintBadge — per-tile placement hint tooltip shown while
 * the player is in building-placement mode.
 *
 * Anchored to the hex currently under the cursor. Displays:
 *   - The name of the building being placed
 *   - Validity ("Valid" / "Invalid: <reason>") sourced from
 *     `validateBuildingPlacement` in the engine
 *   - Per-neighbour adjacency yield contributions (e.g. "+1 Production
 *     from Mountain", "+1 Food from River")
 *   - Aggregate placement score (sum of yields the tile would earn from
 *     its six neighbours), mirroring the engine's scoring helper
 *
 * The canvas-side green/gray overlay (GameCanvas.drawPlacementOverlay) is
 * untouched — this badge is the cursor-following detailed companion to
 * that broad-brush tile shading. When `placementMode` is null the badge
 * unmounts cleanly.
 *
 * Cycle (k) of the HUD refactor: first HUD element written directly
 * against the TooltipShell + HUDManager contract. Reuses engine-side
 * adjacency logic via `computeAdjacencyBonus` (DistrictAdjacency) and
 * validation via `validateBuildingPlacement` — no re-implementation of
 * scoring or validity rules in the UI layer.
 */

import { useEffect, useMemo, useRef } from 'react';
import type { CSSProperties } from 'react';
import type { HexCoord, GameState, BuildingDef, CityId, CityState } from '@hex/engine';
import { validateBuildingPlacement, neighbors, coordToKey } from '@hex/engine';
import { TooltipShell } from './TooltipShell';
import { useHUDManager } from './HUDManager';
import { useGame } from '../../providers/GameProvider';

export interface UrbanPlacementHintBadgeProps {
  /**
   * Hex → screen-pixel projector. Supplied by the App-level glue that
   * owns the canvas camera; kept as a prop so this file stays inside
   * `ui/hud/` and does not import from `canvas/`.
   */
  readonly hexToScreen: (q: number, r: number) => { readonly x: number; readonly y: number } | null;
}

// ── Adjacency-source attribution ──────────────────────────────────────
// Mirrors the rule table in DistrictAdjacency.computeAdjacencyBonus.
// That helper is not re-exported from the engine barrel, so this file
// walks the same neighbours by the same rules to produce a labelled
// per-source breakdown suitable for UI display. The aggregate score is
// the sum of the per-source amounts — mechanically equivalent to the
// engine's sum of yields. If the adjacency rules expand in the engine,
// they must be kept in sync here; the engine's scoring helper stays the
// source of truth for game logic (yield calculation, AI ranking).

interface AdjacencySource {
  readonly yield: 'food' | 'production' | 'science' | 'culture' | 'gold';
  readonly amount: number;
  readonly source: string;
}

function collectAdjacencySources(
  state: GameState,
  city: CityState,
  tile: HexCoord,
): ReadonlyArray<AdjacencySource> {
  const sources: AdjacencySource[] = [];
  for (const coord of neighbors(tile)) {
    const key = coordToKey(coord);
    const terrainTile = state.map.tiles.get(key);
    if (terrainTile !== undefined) {
      if (terrainTile.feature === 'mountains') {
        sources.push({ yield: 'production', amount: 1, source: 'Mountain' });
      }
      if (terrainTile.river.length > 0) {
        sources.push({ yield: 'food', amount: 1, source: 'River' });
      }
    }
    const urban = city.urbanTiles?.get(key);
    if (urban !== undefined) {
      for (const bid of urban.buildings) {
        const def = state.config.buildings.get(bid);
        if (def === undefined) continue;
        if (bid === 'campus' || def.category === 'science') {
          sources.push({ yield: 'science', amount: 1, source: def.name });
        }
        if (bid === 'theater' || def.category === 'culture') {
          sources.push({ yield: 'culture', amount: 1, source: def.name });
        }
        if (bid === 'commercial' || bid === 'commercial_hub' || def.category === 'gold') {
          sources.push({ yield: 'gold', amount: 1, source: def.name });
        }
      }
    }
  }
  return sources;
}

function sumSources(sources: ReadonlyArray<AdjacencySource>): number {
  let total = 0;
  for (const s of sources) total += s.amount;
  return total;
}

function capitalise(s: string): string {
  return s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Body ─────────────────────────────────────────────────────────────

interface BadgeBodyProps {
  readonly state: GameState;
  readonly cityId: CityId;
  readonly buildingId: string;
  readonly hex: HexCoord;
}

function BadgeBody({ state, cityId, buildingId, hex }: BadgeBodyProps) {
  const city = state.cities.get(cityId);
  const buildingDef: BuildingDef | undefined = state.config.buildings.get(buildingId);

  const validity = useMemo(
    () => validateBuildingPlacement(cityId, hex, buildingId, state),
    [state, cityId, buildingId, hex],
  );

  const sources = useMemo(() => {
    if (city === undefined) return [];
    return collectAdjacencySources(state, city, hex);
  }, [state, city, hex]);

  const score = sumSources(sources);

  const buildingName = buildingDef?.name ?? buildingId;

  const statusBg = validity.valid
    ? 'var(--hud-placement-valid-bg)'
    : 'var(--hud-placement-invalid-bg)';

  const rootStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--hud-padding-sm)',
    minWidth: '200px',
    fontSize: '13px',
    color: 'var(--hud-text-color, var(--panel-text-color))',
  };

  const headerStyle: CSSProperties = {
    fontWeight: 600,
    color: 'var(--hud-text-emphasis, var(--panel-accent-gold, #fbbf24))',
  };

  const statusStyle: CSSProperties = {
    padding: 'var(--hud-padding-sm) var(--hud-padding-md)',
    borderRadius: 'var(--hud-radius)',
    backgroundColor: statusBg,
    fontWeight: 500,
  };

  const mutedStyle: CSSProperties = {
    color: 'var(--hud-text-muted, var(--panel-muted-color))',
    fontSize: '12px',
  };

  const scoreStyle: CSSProperties = {
    fontWeight: 600,
    color: 'var(--hud-placement-score-text)',
  };

  return (
    <div style={rootStyle} data-testid="urban-placement-hint-body">
      <div style={headerStyle} data-testid="placement-hint-building-name">
        Placing: {buildingName}
      </div>
      <div style={statusStyle} data-testid="placement-hint-status">
        {validity.valid ? 'Valid' : `Invalid: ${validity.reason ?? 'not allowed here'}`}
      </div>
      {sources.length > 0 && (
        <ul
          data-testid="placement-hint-sources"
          style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '2px' }}
        >
          {sources.map((s, i) => (
            <li key={`${s.source}-${s.yield}-${i}`} style={mutedStyle}>
              +{s.amount} {capitalise(s.yield)} from {s.source}
            </li>
          ))}
        </ul>
      )}
      {sources.length === 0 && validity.valid && (
        <div style={mutedStyle} data-testid="placement-hint-no-adjacency">
          No adjacency bonuses from neighbours
        </div>
      )}
      <div style={scoreStyle} data-testid="placement-hint-score">
        Score: {score}
      </div>
    </div>
  );
}

// ── Shell wrapper ────────────────────────────────────────────────────

/**
 * Top-level component. Reads `placementMode` + `hoveredHex` from the
 * game context; unmounts cleanly when placement mode is inactive or
 * there is no hovered hex. Registers/unregisters with HUDManager so
 * ESC coordination and future stack cycles work out of the box.
 */
export function UrbanPlacementHintBadge({ hexToScreen }: UrbanPlacementHintBadgeProps) {
  const { state: nullableState, placementMode, hoveredHex } = useGame();
  const hud = useHUDManager();

  // Hold a stable ref to `hud.register` so the registration effect does
  // not re-fire on every HUDManager context update (which otherwise
  // loops when `register` itself mutates HUDManager state).
  const registerRef = useRef(hud.register);
  registerRef.current = hud.register;

  // Register for the lifetime of the placement session. The effect
  // depends only on whether a session is active (placementMode !== null)
  // — a cursor move (hoveredHex change) does not re-register.
  const placementActive = placementMode !== null;
  useEffect(() => {
    if (!placementActive) return;
    const unregister = registerRef.current('urbanPlacementHint', { sticky: false });
    return unregister;
  }, [placementActive]);

  if (nullableState === null) return null;
  if (placementMode === null) return null;
  if (hoveredHex === null) return null;

  return (
    <TooltipShell
      id="urbanPlacementHint"
      anchor={{ kind: 'hex', q: hoveredHex.q, r: hoveredHex.r }}
      position="floating"
      tier="detailed"
      sticky={false}
      offset="small"
      hexToScreen={hexToScreen}
    >
      <BadgeBody
        state={nullableState}
        cityId={placementMode.cityId}
        buildingId={placementMode.buildingId}
        hex={hoveredHex}
      />
    </TooltipShell>
  );
}
