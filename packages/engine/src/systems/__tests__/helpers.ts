import type { GameState, HexTile, PlayerState, UnitState } from '../../types/GameState';
import type { HexCoord } from '../../types/HexCoord';
import { coordToKey } from '../../hex/HexMath';
import { createGameConfig } from '../../state/GameConfigFactory';

/**
 * Create a minimal GameState for testing.
 * Override any fields via the partial parameter.
 */
export function createTestState(overrides: Partial<GameState> = {}): GameState {
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', name: 'Player 1' })],
    ]),
    map: {
      width: 10,
      height: 10,
      tiles: createFlatMap(10, 10),
      wrapX: false,
    },
    units: new Map(),
    cities: new Map(),
    diplomacy: { relations: new Map() },
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    crises: [],
    victory: { winner: null, winType: null, progress: new Map() },
    log: [],
    rng: { seed: 42, counter: 0 },
    config: createGameConfig(),
    ...overrides,
  };
}

export function createTestPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    id: 'p1',
    name: 'Test Player',
    isHuman: true,
    civilizationId: 'rome',
    leaderId: 'augustus',
    age: 'antiquity',
    researchedTechs: [],
    currentResearch: null,
    researchProgress: 0,
    researchedCivics: [],
    currentCivic: null,
    civicProgress: 0,
    gold: 100,
    science: 0,
    culture: 0,
    faith: 0,
    influence: 0,
    ageProgress: 0,
    legacyBonuses: [],
    legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
    legacyPoints: 0,
    totalGoldEarned: 0,
    totalKills: 0,
    visibility: new Set(),
    explored: new Set(),
    celebrationCount: 0,
    celebrationBonus: 0,
    celebrationTurnsLeft: 0,
    ...overrides,
  };
}

export function createTestUnit(overrides: Partial<UnitState> = {}): UnitState {
  return {
    id: 'u1',
    typeId: 'warrior',
    owner: 'p1',
    position: { q: 0, r: 0 },
    movementLeft: 2,
    health: 100,
    experience: 0,
    promotions: [],
    fortified: false,
    ...overrides,
  };
}

/** Create a flat grassland map for testing */
export function createFlatMap(width: number, height: number): Map<string, HexTile> {
  const tiles = new Map<string, HexTile>();
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const q = col - Math.floor(row / 2);
      const r = row;
      const coord: HexCoord = { q, r };
      tiles.set(coordToKey(coord), {
        coord,
        terrain: 'grassland',
        feature: null,
        resource: null,
        river: [],
        elevation: 0.5,
        continent: 1,
      });
    }
  }
  return tiles;
}

/** Set a specific tile's terrain/feature */
export function setTile(
  tiles: Map<string, HexTile>,
  coord: HexCoord,
  terrain: string,
  feature: string | null = null,
): void {
  const key = coordToKey(coord);
  const existing = tiles.get(key);
  if (existing) {
    tiles.set(key, { ...existing, terrain, feature });
  }
}
