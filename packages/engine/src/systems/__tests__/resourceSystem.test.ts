import { describe, it, expect } from 'vitest';
import { resourceSystem, nextCelebrationThreshold, calculateCityHappiness, calculateSettlementCapPenalty, calculateEffectiveSettlementCap } from '../resourceSystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import type { CityState, HexTile } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
    population: 3, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 })],
    settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
    specialists: 0,
    ...overrides,
  };
}

describe('resourceSystem', () => {
  it('accumulates resources from cities on END_TURN', () => {
    const city = createTestCity();
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // resourceSystem should have processed and returned new state
    expect(next).not.toBe(state);
    const player = next.players.get('p1')!;
    // Player should exist with updated resources (grassland has no gold, so gold may decrease from maintenance)
    expect(player).toBeDefined();
  });

  it('deducts military unit maintenance', () => {
    const city = createTestCity();
    const units = new Map([
      ['w1', createTestUnit({ id: 'w1', typeId: 'warrior' })],
      ['w2', createTestUnit({ id: 'w2', typeId: 'warrior' })],
    ]);
    const state = createTestState({
      cities: new Map([['c1', city]]),
      units,
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // 2 military units = 2 maintenance
    const goldWithMaintenance = next.players.get('p1')!.gold;

    // Compare with no units
    const stateNoUnits = createTestState({
      cities: new Map([['c1', city]]),
      units: new Map(),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const nextNoUnits = resourceSystem(stateNoUnits, { type: 'END_TURN' });
    expect(goldWithMaintenance).toBeLessThan(nextNoUnits.players.get('p1')!.gold);
  });

  it('does not charge maintenance for civilian units', () => {
    const city = createTestCity();
    const units = new Map([
      ['s1', createTestUnit({ id: 's1', typeId: 'settler' })],
    ]);
    const state = createTestState({
      cities: new Map([['c1', city]]),
      units,
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const stateNoUnits = createTestState({
      cities: new Map([['c1', city]]),
      units: new Map(),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    const nextNoUnits = resourceSystem(stateNoUnits, { type: 'END_TURN' });
    // Settler has no maintenance, so gold should be equal
    expect(next.players.get('p1')!.gold).toBe(nextNoUnits.players.get('p1')!.gold);
  });

  it('ignores non-END_TURN actions', () => {
    const state = createTestState();
    expect(resourceSystem(state, { type: 'START_TURN' })).toBe(state);
  });

  it('only processes current player', () => {
    const city = createTestCity({ owner: 'p2' });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      currentPlayerId: 'p1',
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // p1 has no cities so resources shouldn't increase much
    expect(next.players.get('p1')!.gold).toBe(100);
  });
});

describe('nextCelebrationThreshold', () => {
  it('returns 50 for the first celebration (count = 0)', () => {
    expect(nextCelebrationThreshold(0)).toBe(50);
  });

  it('returns 100 for the second celebration (count = 1)', () => {
    expect(nextCelebrationThreshold(1)).toBe(100);
  });

  it('scales linearly with celebration count', () => {
    expect(nextCelebrationThreshold(2)).toBe(150);
    expect(nextCelebrationThreshold(4)).toBe(250);
  });
});

describe('resourceSystem — celebrations', () => {
  /**
   * Build a city with enough luxury tiles in territory to produce high happiness.
   * One silk tile = +2 happiness.
   * City base = 10 (city type, pop 1, no penalty).
   * With 20 silk tiles: 10 + 20*2 = 50 excess happiness → crosses first threshold.
   */
  function createHighHappinessSetup() {
    const centerCoord = { q: 0, r: 0 };
    const silkTiles: Array<[string, HexTile]> = [];
    const territoryKeys: string[] = [coordToKey(centerCoord)];

    // Center tile (no resource)
    silkTiles.push([coordToKey(centerCoord), {
      coord: centerCoord,
      terrain: 'grassland',
      feature: null,
      resource: null,
      river: [],
      elevation: 0.5,
      continent: 1,
    }]);

    // 20 silk luxury tiles
    for (let i = 1; i <= 20; i++) {
      const coord = { q: i, r: 0 };
      const key = coordToKey(coord);
      territoryKeys.push(key);
      silkTiles.push([key, {
        coord,
        terrain: 'grassland',
        feature: null,
        resource: 'silk',
        river: [],
        elevation: 0.5,
        continent: 1,
      }]);
    }

    const city = createTestCity({
      id: 'c1',
      position: centerCoord,
      population: 1,
      settlementType: 'city',
      territory: territoryKeys,
      happiness: 0,
    });

    // Use the createFlatMap base but override with silk tiles
    const baseState = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });

    // Merge silk tiles into the map
    const updatedTiles = new Map(baseState.map.tiles);
    for (const [key, tile] of silkTiles) {
      updatedTiles.set(key, tile);
    }

    return {
      ...baseState,
      map: { ...baseState.map, tiles: updatedTiles },
    };
  }

  it('triggers a celebration when excess happiness meets the threshold', () => {
    const state = createHighHappinessSetup();
    const next = resourceSystem(state, { type: 'END_TURN' });

    const player = next.players.get('p1')!;
    // Happiness = 10 (base, pop=1) + 20*2 (silk) = 50 >= threshold 50
    expect(player.celebrationCount).toBe(1);
    expect(player.celebrationBonus).toBe(10);
    expect(player.celebrationTurnsLeft).toBe(10);
  });

  it('does not trigger a celebration when excess happiness is below the threshold', () => {
    // One city with pop 1 and no luxuries: happiness = 10, threshold = 50 → no trigger
    const city = createTestCity({ population: 1 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer()]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });

    const player = next.players.get('p1')!;
    expect(player.celebrationCount).toBe(0);
    expect(player.celebrationBonus).toBe(0);
    expect(player.celebrationTurnsLeft).toBe(0);
  });

  it('decrements celebrationTurnsLeft on each END_TURN', () => {
    const city = createTestCity({ population: 1 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({
        celebrationCount: 1,
        celebrationBonus: 10,
        celebrationTurnsLeft: 5,
      })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });

    expect(next.players.get('p1')!.celebrationTurnsLeft).toBe(4);
    expect(next.players.get('p1')!.celebrationBonus).toBe(10);
  });

  it('removes celebration bonus when celebrationTurnsLeft reaches 0', () => {
    const city = createTestCity({ population: 1 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({
        celebrationCount: 1,
        celebrationBonus: 10,
        celebrationTurnsLeft: 1,
      })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });

    expect(next.players.get('p1')!.celebrationTurnsLeft).toBe(0);
    expect(next.players.get('p1')!.celebrationBonus).toBe(0);
  });

  it('second celebration requires double the initial threshold', () => {
    const state = createHighHappinessSetup();
    // Player already has 1 celebration, needs 100 excess to trigger second
    const stateWithOneCelebration = {
      ...state,
      players: new Map([[
        'p1',
        {
          ...state.players.get('p1')!,
          celebrationCount: 1,
          celebrationBonus: 0,
          celebrationTurnsLeft: 0,
        },
      ]]),
    };
    // 50 excess happiness < 100 threshold → no new celebration
    const next = resourceSystem(stateWithOneCelebration, { type: 'END_TURN' });
    expect(next.players.get('p1')!.celebrationCount).toBe(1);
  });
});

describe('productionSystem — celebration bonus', () => {
  /**
   * Create a city on plains tiles to get solid production output.
   * plains = 1 food + 1 production per tile.
   * With 10 plains tiles + center bonus (1 production): 11 production/turn.
   * 10% bonus → Math.floor(11 * 1.1) = Math.floor(12.1) = 12 → +1 over baseline.
   */
  it('applies celebration bonus to production', async () => {
    // Import productionSystem here to keep test focused
    const { productionSystem } = await import('../productionSystem');
    const { createFlatMap } = await import('./helpers');

    const cityCoord = { q: 3, r: 3 };
    const territory: string[] = [];
    const tiles = createFlatMap(15, 15);

    // Overwrite territory tiles with plains (1 food + 1 production)
    for (let i = 0; i < 10; i++) {
      const coord = { q: 3 + i, r: 3 };
      const key = coordToKey(coord);
      territory.push(key);
      tiles.set(key, {
        coord,
        terrain: 'plains',
        feature: null,
        resource: null,
        river: [],
        elevation: 0.5,
        continent: 1,
      });
    }

    const city = createTestCity({
      id: 'c1',
      position: cityCoord,
      territory,
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: 0,
    });

    const baseState = createTestState({
      cities: new Map([['c1', city]]),
      map: { width: 15, height: 15, tiles, wrapX: false },
    });

    // Without celebration bonus
    const stateNoCelebration = {
      ...baseState,
      players: new Map([['p1', createTestPlayer({ celebrationCount: 0, celebrationBonus: 0, celebrationTurnsLeft: 0 })]]),
    };
    const nextNoCelebration = productionSystem(stateNoCelebration, { type: 'END_TURN' });
    const progressNoCelebration = nextNoCelebration.cities.get('c1')!.productionProgress;

    // With 10% celebration bonus
    const stateWithCelebration = {
      ...baseState,
      players: new Map([['p1', createTestPlayer({ celebrationCount: 1, celebrationBonus: 10, celebrationTurnsLeft: 8 })]]),
    };
    const nextWithCelebration = productionSystem(stateWithCelebration, { type: 'END_TURN' });
    const progressWithCelebration = nextWithCelebration.cities.get('c1')!.productionProgress;

    expect(progressWithCelebration).toBeGreaterThan(progressNoCelebration);
  });
});

describe('B2: specialist happiness cost (-2 per specialist)', () => {
  it('each specialist reduces happiness by 2', () => {
    const base = createTestState();
    const cityNoSpec: CityState = {
      id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
      population: 1, food: 0, productionQueue: [], productionProgress: 0,
      buildings: [], territory: [coordToKey({ q: 3, r: 3 })],
      settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
      specialization: null, specialists: 0,
    };
    const cityWithSpec: CityState = { ...cityNoSpec, specialists: 2 };

    const happinessNoSpec = calculateCityHappiness(cityNoSpec, base);
    const happinessWith2Spec = calculateCityHappiness(cityWithSpec, base);

    // 2 specialists × -2 = -4 happiness penalty
    expect(happinessNoSpec - happinessWith2Spec).toBe(4);
  });

  it('1 specialist costs -2 happiness (not -1)', () => {
    const base = createTestState();
    const cityNoSpec: CityState = {
      id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
      population: 1, food: 0, productionQueue: [], productionProgress: 0,
      buildings: [], territory: [coordToKey({ q: 3, r: 3 })],
      settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
      specialization: null, specialists: 0,
    };
    const cityWith1Spec: CityState = { ...cityNoSpec, specialists: 1 };

    const happinessNoSpec = calculateCityHappiness(cityNoSpec, base);
    const happinessWith1Spec = calculateCityHappiness(cityWith1Spec, base);

    expect(happinessNoSpec - happinessWith1Spec).toBe(2);
  });
});

describe('B5: settlement cap penalty applied per-settlement (not flat total)', () => {
  function makeCity(id: string, owner: string): CityState {
    return {
      id, name: id, owner, position: { q: 0, r: 0 },
      population: 1, food: 0, productionQueue: [], productionProgress: 0,
      buildings: [], territory: [],
      settlementType: 'city', happiness: 0, isCapital: false, defenseHP: 100,
      specialization: null, specialists: 0,
    };
  }

  it('returns 0 penalty when at or under the free cap', () => {
    // 4 cities = at the free cap of 4
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
      ['c2', makeCity('c2', 'p1')],
      ['c3', makeCity('c3', 'p1')],
      ['c4', makeCity('c4', 'p1')],
    ]);
    const state = createTestState({ cities, players: new Map([['p1', createTestPlayer()]]) });
    expect(calculateSettlementCapPenalty(state, 'p1')).toBe(0);
  });

  it('returns per-settlement penalty of 5 when 1 over cap', () => {
    // 5 cities = 1 over cap → penalty per city = 1 × 5 = 5
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
      ['c2', makeCity('c2', 'p1')],
      ['c3', makeCity('c3', 'p1')],
      ['c4', makeCity('c4', 'p1')],
      ['c5', makeCity('c5', 'p1')],
    ]);
    const state = createTestState({ cities, players: new Map([['p1', createTestPlayer()]]) });
    // penalty = 1 excess × 5 = 5 per settlement
    expect(calculateSettlementCapPenalty(state, 'p1')).toBe(5);
  });

  it('caps excess at 7 (max penalty -35 per settlement)', () => {
    // 12 cities = 8 over cap → but excess capped at 7 → penalty = 7 × 5 = 35
    const cities = new Map();
    for (let i = 1; i <= 12; i++) {
      cities.set(`c${i}`, makeCity(`c${i}`, 'p1'));
    }
    const state = createTestState({ cities, players: new Map([['p1', createTestPlayer()]]) });
    expect(calculateSettlementCapPenalty(state, 'p1')).toBe(35);
  });

  it('base cap is 4 for antiquity players', () => {
    const player = createTestPlayer({ age: 'antiquity' });
    const state = createTestState({ players: new Map([['p1', player]]) });
    expect(calculateEffectiveSettlementCap(state, 'p1')).toBe(4);
  });

  it('exploration age increases cap to 5', () => {
    const player = createTestPlayer({ age: 'exploration' });
    const state = createTestState({ players: new Map([['p1', player]]) });
    expect(calculateEffectiveSettlementCap(state, 'p1')).toBe(5);
  });

  it('modern age increases cap to 6', () => {
    const player = createTestPlayer({ age: 'modern' });
    const state = createTestState({ players: new Map([['p1', player]]) });
    expect(calculateEffectiveSettlementCap(state, 'p1')).toBe(6);
  });

  it('exploration player has no penalty at 5 settlements (cap is 5)', () => {
    const player = createTestPlayer({ age: 'exploration' });
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
      ['c2', makeCity('c2', 'p1')],
      ['c3', makeCity('c3', 'p1')],
      ['c4', makeCity('c4', 'p1')],
      ['c5', makeCity('c5', 'p1')],
    ]);
    const state = createTestState({ cities, players: new Map([['p1', player]]) });
    expect(calculateSettlementCapPenalty(state, 'p1')).toBe(0);
  });

  it('antiquity player incurs penalty at 5 settlements (cap is 4)', () => {
    const player = createTestPlayer({ age: 'antiquity' });
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
      ['c2', makeCity('c2', 'p1')],
      ['c3', makeCity('c3', 'p1')],
      ['c4', makeCity('c4', 'p1')],
      ['c5', makeCity('c5', 'p1')],
    ]);
    const state = createTestState({ cities, players: new Map([['p1', player]]) });
    expect(calculateSettlementCapPenalty(state, 'p1')).toBe(5); // 1 over cap × 5 = 5
  });
});
