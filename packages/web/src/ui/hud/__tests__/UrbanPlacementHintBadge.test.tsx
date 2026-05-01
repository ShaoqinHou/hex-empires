// @vitest-environment jsdom

/**
 * UrbanPlacementHintBadge — smoke tests.
 *
 * Stubs `useGame` from GameProvider so tests can feed minimal state
 * slices directly. Tests verify:
 *   - No render when placementMode is null.
 *   - Building name surfaces in the body.
 *   - "Valid" copy for a valid placement.
 *   - "Invalid: <reason>" copy when validateBuildingPlacement rejects.
 *   - Adjacency yield preview enumerates at least one neighbour source.
 *   - Aggregate score line renders.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import type { GameState, HexCoord, HexTile, CityState, BuildingDef } from '@hex/engine';

// ── Mock useGame ──
interface MockGame {
  state: GameState | null;
  placementMode: { readonly cityId: string; readonly buildingId: string } | null;
  hoveredHex: HexCoord | null;
}

const mockGame: MockGame = {
  state: null,
  placementMode: null,
  hoveredHex: null,
};

vi.mock('../../../providers/GameProvider', () => ({
  useGame: () => mockGame,
}));

// Import AFTER vi.mock so the component picks up the stub.
import { UrbanPlacementHintBadge } from '../UrbanPlacementHintBadge';
import { HUDManagerProvider } from '../HUDManager';

// ── Fixtures ──

function coordKey(q: number, r: number): string {
  return `${q},${r}`;
}

function makeTile(q: number, r: number, overrides: Partial<HexTile> = {}): HexTile {
  return {
    coord: { q, r },
    terrain: 'grassland',
    feature: null,
    resource: null,
    improvement: null,
    building: null,
    river: [],
    elevation: 0.5,
    continent: 0,
    ...overrides,
  } as HexTile;
}

function makeBuildingDef(id: string, name: string): BuildingDef {
  return {
    id,
    name,
    age: 'antiquity',
    cost: 50,
    maintenance: 1,
    yields: { production: 1 },
    effects: [],
    requiredTech: null,
  };
}

function makeCity(position: HexCoord, overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position,
    population: 1,
    territory: [coordKey(position.q, position.r), coordKey(position.q + 1, position.r)],
    buildings: [],
    ...overrides,
  } as CityState;
}

function makeState(opts: {
  readonly cities: ReadonlyMap<string, CityState>;
  readonly tiles: ReadonlyMap<string, HexTile>;
  readonly buildings: ReadonlyMap<string, BuildingDef>;
}): GameState {
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map(),
    map: { width: 10, height: 10, tiles: opts.tiles, wrapX: false },
    units: new Map(),
    cities: opts.cities,
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
    config: { buildings: opts.buildings },
  } as unknown as GameState;
}

const stubProjector = (_q: number, _r: number) => ({ x: 400, y: 300 });

function renderWithHUD(ui: ReactNode) {
  return render(<HUDManagerProvider>{ui}</HUDManagerProvider>);
}

afterEach(() => {
  cleanup();
  mockGame.state = null;
  mockGame.placementMode = null;
  mockGame.hoveredHex = null;
});

// ── Tests ──

describe('UrbanPlacementHintBadge', () => {
  it('renders nothing when placementMode is null', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0)]]);
    const buildings = new Map([['granary', makeBuildingDef('granary', 'Granary')]]);
    const cities = new Map([['c1', makeCity({ q: 0, r: 0 })]]);
    mockGame.state = makeState({ cities, tiles, buildings });
    mockGame.placementMode = null;
    mockGame.hoveredHex = { q: 0, r: 0 };

    const { container } = renderWithHUD(<UrbanPlacementHintBadge hexToScreen={stubProjector} />);

    // No shell mounts when placementMode is null.
    expect(container.querySelector('[data-hud-id="urbanPlacementHint"]')).toBeNull();
    expect(container.querySelector('[data-testid="urban-placement-hint-body"]')).toBeNull();
  });

  it('renders the building name when placementMode is active over a hovered hex', () => {
    const tiles = new Map([
      [coordKey(0, 0), makeTile(0, 0)],
      [coordKey(1, 0), makeTile(1, 0)],
    ]);
    const buildings = new Map([['granary', makeBuildingDef('granary', 'Granary')]]);
    const cities = new Map([['c1', makeCity({ q: 0, r: 0 })]]);
    mockGame.state = makeState({ cities, tiles, buildings });
    mockGame.placementMode = { cityId: 'c1', buildingId: 'granary' };
    mockGame.hoveredHex = { q: 1, r: 0 };

    const { getByTestId } = renderWithHUD(<UrbanPlacementHintBadge hexToScreen={stubProjector} />);
    expect(getByTestId('placement-hint-building-name').textContent).toContain('Granary');
  });

  it('shows "Valid" copy when validateBuildingPlacement accepts the tile', () => {
    const tiles = new Map([
      [coordKey(0, 0), makeTile(0, 0)],
      [coordKey(1, 0), makeTile(1, 0)],
    ]);
    const buildings = new Map([['granary', makeBuildingDef('granary', 'Granary')]]);
    const cities = new Map([['c1', makeCity({ q: 0, r: 0 })]]);
    mockGame.state = makeState({ cities, tiles, buildings });
    mockGame.placementMode = { cityId: 'c1', buildingId: 'granary' };
    mockGame.hoveredHex = { q: 1, r: 0 };

    const { getByTestId } = renderWithHUD(<UrbanPlacementHintBadge hexToScreen={stubProjector} />);
    expect(getByTestId('placement-hint-status').textContent).toBe('Valid');
  });

  it('shows "Invalid" copy with a reason when the tile is outside territory', () => {
    const tiles = new Map([
      [coordKey(0, 0), makeTile(0, 0)],
      [coordKey(99, 99), makeTile(99, 99)],
    ]);
    const buildings = new Map([['granary', makeBuildingDef('granary', 'Granary')]]);
    // City territory omits (99, 99) and distance(0,0 → 99,99) is well outside the work range.
    const cities = new Map([[
      'c1',
      makeCity({ q: 0, r: 0 }, { territory: [coordKey(0, 0)] }),
    ]]);
    mockGame.state = makeState({ cities, tiles, buildings });
    mockGame.placementMode = { cityId: 'c1', buildingId: 'granary' };
    mockGame.hoveredHex = { q: 99, r: 99 };

    const { getByTestId } = renderWithHUD(<UrbanPlacementHintBadge hexToScreen={stubProjector} />);
    const statusText = getByTestId('placement-hint-status').textContent ?? '';
    expect(statusText).toMatch(/^Invalid:/);
    expect(statusText.toLowerCase()).toContain('territory');
  });

  it('lists a neighbour source when the hovered tile is adjacent to a mountain', () => {
    // hex (1, 0) neighbours include (0, 0), (2, 0), (1, -1), (1, 1), (0, 1), (2, -1).
    // Put a mountain at (0, 0) so the placement tile (1, 0) earns +1 Production.
    const tiles = new Map<string, HexTile>([
      [coordKey(0, 0), makeTile(0, 0, { feature: 'mountains' })],
      [coordKey(1, 0), makeTile(1, 0)],
      [coordKey(2, 0), makeTile(2, 0)],
    ]);
    const buildings = new Map([['granary', makeBuildingDef('granary', 'Granary')]]);
    const cities = new Map([[
      'c1',
      makeCity({ q: 1, r: 0 }, { territory: [coordKey(1, 0), coordKey(0, 0), coordKey(2, 0)] }),
    ]]);
    mockGame.state = makeState({ cities, tiles, buildings });
    mockGame.placementMode = { cityId: 'c1', buildingId: 'granary' };
    mockGame.hoveredHex = { q: 1, r: 0 };

    const { getByTestId, container } = renderWithHUD(
      <UrbanPlacementHintBadge hexToScreen={stubProjector} />,
    );

    const sourcesEl = container.querySelector('[data-testid="placement-hint-sources"]');
    expect(sourcesEl).not.toBeNull();
    const text = sourcesEl?.textContent ?? '';
    expect(text).toContain('Mountain');
    expect(text).toContain('Production');

    // Aggregate score line exists and reflects the mountain contribution.
    const scoreText = getByTestId('placement-hint-score').textContent ?? '';
    expect(scoreText).toMatch(/Score:\s*\d+/);
  });
});
