import { describe, it, expect } from 'vitest';
import { calculateResourceChanges } from '../ResourceChangeCalculator';
import { calculateCityYieldsWithAdjacency } from '../CityYieldsWithAdjacency';
import { createTestPlayer, createTestState, createTestUnit } from '../../systems/__tests__/helpers';
import { coordToKey } from '../../hex/HexMath';
import type { CommanderState } from '../../types/Commander';
import type { CityState, GameState, HexTile } from '../../types/GameState';
import type { TerrainId } from '../../types/Terrain';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 5,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [coordToKey({ q: 3, r: 3 })],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
    ...overrides,
  };
}

function mapWithTerrain(state: GameState, terrain: TerrainId): GameState {
  const tiles = new Map<string, HexTile>();
  for (const [key, tile] of state.map.tiles) {
    tiles.set(key, { ...tile, terrain, feature: null });
  }
  return {
    ...state,
    map: { ...state.map, tiles },
  };
}

function makeCommanderState(overrides: Partial<CommanderState> = {}): CommanderState {
  return {
    unitId: 'cmd1',
    xp: 0,
    commanderLevel: 1,
    unspentPromotionPicks: 0,
    promotions: [],
    tree: null,
    attachedUnits: [],
    packed: false,
    ...overrides,
  };
}

describe('calculateResourceChanges', () => {
  it('uses stacked city yields so Leadership Zeal appears in per-turn summaries', () => {
    const baseState = mapWithTerrain(createTestState({
      players: new Map([['p1', createTestPlayer({ id: 'p1', gold: 0 })]]),
    }), 'plains');
    const territory = [...baseState.map.tiles.keys()].slice(0, 30);
    const city = createTestCity({
      territory,
      buildings: ['library', 'monument'],
    });
    const commanderUnit = createTestUnit({
      id: 'cmd1',
      typeId: 'army_commander',
      owner: 'p1',
      position: city.position,
    });
    const state: GameState = {
      ...baseState,
      cities: new Map([['c1', city]]),
      units: new Map([['cmd1', commanderUnit]]),
      commanders: new Map([['cmd1', makeCommanderState({ promotions: ['leadership_zeal'] })]]),
    };

    const expectedYields = calculateCityYieldsWithAdjacency(city, state);
    const summary = calculateResourceChanges(state, 'p1');

    expect(summary.totalProduction).toBe(expectedYields.production);
    expect(summary.sciencePerTurn).toBe(expectedYields.science);
    expect(summary.culturePerTurn).toBe(expectedYields.culture);
  });
});
