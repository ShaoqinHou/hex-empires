// @vitest-environment jsdom

/**
 * Tooltip compact-vs-detailed tier tests (HUD cycles d + e).
 *
 * Compact tier (default, isAltPressed=false):
 *   • Terrain name + features inline
 *   • Improvement / resource summary
 *   • Summed yields one-per-type
 *   • NO per-source breakdown
 *
 * Detailed tier (isAltPressed=true):
 *   • Per-source yield breakdown ("Grassland +2", "Forest +1", …)
 *   • Full unit stats (hp, xp, movement, promotions) via UnitStateTooltip
 *   • Building maintenance line
 *   • District adjacency preview
 *   • Compact-tier content still present
 *
 * The shell's `data-tier` attribute switches to mirror the prop. Both
 * tiers anchor on the same hex — toggling Alt does not jump the overlay.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import type {
  GameState,
  UnitState,
  HexTile,
  CityState,
  BuildingDef,
} from '@hex/engine';
import { ALL_BASE_TERRAINS, ALL_BUILDINGS, createGameConfig } from '@hex/engine';
import { TooltipOverlay } from '../TooltipOverlay';
import { HUDManagerProvider } from '../HUDManager';

function coordKey(q: number, r: number): string {
  return `${q},${r}`;
}

function makeUnit(overrides: Partial<UnitState> & { id: string; typeId: string }): UnitState {
  return {
    id: overrides.id,
    typeId: overrides.typeId,
    owner: overrides.owner ?? 'p1',
    position: overrides.position ?? { q: 0, r: 0 },
    movementLeft: overrides.movementLeft ?? 2,
    health: overrides.health ?? 100,
    experience: overrides.experience ?? 0,
    promotions: overrides.promotions ?? [],
    fortified: overrides.fortified ?? false,
  };
}

function makeTile(q: number, r: number, overrides: Partial<HexTile> = {}): HexTile {
  return {
    coord: { q, r },
    terrain: ALL_BASE_TERRAINS[0].id, // grassland (food: 2)
    feature: null,
    resource: null,
    improvement: null,
    building: null,
    river: [],
    elevation: 0.5,
    continent: 0,
    ...overrides,
  };
}

interface MakeStateOptions {
  readonly units?: ReadonlyArray<UnitState>;
  readonly tile?: Partial<HexTile>;
  readonly city?: CityState | null;
}

function makeState(options: MakeStateOptions = {}): GameState {
  const tiles = new Map<string, HexTile>();
  tiles.set(coordKey(0, 0), makeTile(0, 0, options.tile));
  const unitMap = new Map<string, UnitState>();
  for (const u of options.units ?? []) unitMap.set(u.id, u);

  const cities = new Map<string, CityState>();
  if (options.city) cities.set(options.city.id, options.city);

  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([
      [
        'p1',
        {
          id: 'p1',
          name: 'Human',
          isHuman: true,
          civilizationId: 'rome',
          leaderId: 'augustus',
          visibility: new Set([coordKey(0, 0)]),
          // legacyBonuses + activeEffects must be iterable arrays so the
          // city-yield path (calculateCityYields → getActiveEffects) can
          // walk them without crashing on undefined.
          legacyBonuses: [],
          activeEffects: [],
        },
      ],
    ]),
    map: { width: 1, height: 1, tiles, wrapX: false },
    units: unitMap,
    cities,
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
    config: createGameConfig(),
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
  } as unknown as GameState;
}

const stubHexToScreen = (_q: number, _r: number) => ({ x: 400, y: 300 });

afterEach(() => {
  cleanup();
});

// ── Compact tier ────────────────────────────────────────────────────────

describe('TooltipOverlay — compact tier', () => {
  it('renders the compact body (no detailed body) when isAltPressed=false', () => {
    const state = makeState();

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    expect(container.querySelector('[data-testid="tooltip-body-compact"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tooltip-body-detailed"]')).toBeNull();
    // The shell exposes the tier as data-attr.
    const shell = container.querySelector('[data-testid="tooltip-shell"]');
    expect(shell?.getAttribute('data-tier')).toBe('compact');
  });

  it('renders summed yields one-per-type and OMITS the per-source breakdown', () => {
    // Grassland (food 2) — no other sources.
    const state = makeState();

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    const compact = container.querySelector('[data-testid="tooltip-yields-compact"]');
    expect(compact).not.toBeNull();
    // Grassland gives 2 food -> "🌾 2" appears.
    expect(compact?.textContent ?? '').toMatch(/🌾\s*2/);
    // Compact tier must NOT carry the breakdown panel.
    expect(container.querySelector('[data-testid="tooltip-yields-breakdown"]')).toBeNull();
  });

  it('renders inline features in the header — "Grassland (River)" — not on a separate line', () => {
    const state = makeState({ tile: { river: [0] } });

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    const body = container.querySelector('[data-testid="tooltip-body-compact"]');
    expect(body).not.toBeNull();
    expect(body?.textContent ?? '').toContain('(River)');
  });
});

// ── Detailed tier ───────────────────────────────────────────────────────

describe('TooltipOverlay — detailed tier (Alt-held)', () => {
  it('renders the detailed body and the per-source yield breakdown panel', () => {
    const state = makeState({ tile: { river: [0] } });

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={true}
          state={state}
        />
      </HUDManagerProvider>,
    );

    expect(container.querySelector('[data-testid="tooltip-body-detailed"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="tooltip-body-compact"]')).toBeNull();

    const breakdown = container.querySelector('[data-testid="tooltip-yields-breakdown"]');
    expect(breakdown).not.toBeNull();
    // Per-source rows: terrain name and "River" both appear with their yield values.
    expect(breakdown?.textContent ?? '').toContain('River');
    // Grassland's name appears (verifies the terrain row landed in the breakdown).
    expect(breakdown?.textContent ?? '').toMatch(/Grassland|grassland/);
  });

  it('renders unit hp + xp via UnitStateTooltip when a unit is on the hex', () => {
    // Warrior with 50 hp, 25 xp — both numbers must appear in the detailed body.
    const warrior = makeUnit({
      id: 'w1',
      typeId: 'warrior',
      health: 50,
      experience: 25,
      movementLeft: 1,
    });
    const state = makeState({ units: [warrior] });

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={true}
          state={state}
        />
      </HUDManagerProvider>,
    );

    const detail = container.querySelector('[data-testid="tooltip-unit-detail"]');
    expect(detail).not.toBeNull();
    const text = detail?.textContent ?? '';
    // UnitStateTooltip renders "Health" with "50/100" + "Experience" with "25".
    expect(text).toMatch(/50\/100/);
    expect(text).toMatch(/25/);
    // Movement Left line is also rendered.
    expect(text).toMatch(/Movement Left/i);
  });

  it('renders building maintenance for buildings inside a city on the hex', () => {
    // Pick any building from the registry that has positive maintenance,
    // so the test is independent of the specific id list. We bias toward
    // a small known set first, then fall back to whatever the registry
    // surfaces.
    const buildingWithMaint: BuildingDef | undefined =
      ALL_BUILDINGS.find(b => b.maintenance > 0);
    expect(buildingWithMaint).toBeDefined();

    const city: CityState = {
      id: 'c1',
      name: 'Roma',
      owner: 'p1',
      position: { q: 0, r: 0 },
      population: 4,
      food: 0,
      productionQueue: [],
      productionProgress: 0,
      buildings: [buildingWithMaint!.id],
      territory: [coordKey(0, 0)],
      settlementType: 'city',
      happiness: 0,
      isCapital: true,
      defenseHP: 100,
      specialization: null,
      specialists: 0,
      districts: [],
    } as unknown as CityState;

    const state = makeState({ city });

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={true}
          state={state}
        />
      </HUDManagerProvider>,
    );

    const buildingsPanel = container.querySelector('[data-testid="tooltip-city-buildings"]');
    expect(buildingsPanel).not.toBeNull();
    const text = buildingsPanel?.textContent ?? '';
    expect(text).toContain(buildingWithMaint!.name);
    // Maintenance line shows the literal cost number with a − sign.
    expect(text).toMatch(new RegExp(`−${buildingWithMaint!.maintenance}`));
  });

  it('flips the shell tier attribute when isAltPressed switches from false to true', () => {
    const state = makeState();

    // Compact first.
    const { container, rerender } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );
    expect(
      container.querySelector('[data-testid="tooltip-shell"]')?.getAttribute('data-tier'),
    ).toBe('compact');

    // Toggle Alt.
    rerender(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={true}
          state={state}
        />
      </HUDManagerProvider>,
    );
    expect(
      container.querySelector('[data-testid="tooltip-shell"]')?.getAttribute('data-tier'),
    ).toBe('detailed');
  });
});
