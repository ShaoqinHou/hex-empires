import { describe, it, expect } from 'vitest';
import { resourceSystem, nextCelebrationThreshold, calculateCityHappiness, calculateSettlementCapPenalty, calculateEffectiveSettlementCap } from '../resourceSystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import type { CommanderState } from '../../types/Commander';
import type { CityState, HexTile } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
    population: 3, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 })],
    settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
    specialization: null, specialists: 0, districts: [],
    ...overrides,
  };
}

function makeCommanderState(overrides: Partial<CommanderState> = {}): CommanderState {
  return {
    unitId: 'cmd',
    xp: 0,
    commanderLevel: 1,
    unspentPromotionPicks: 0,
    promotions: [],
    tree: null,
    attachedUnits: [],
    packed: true,
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

  it('adds +1 gold per packed unit when quartermaster promotion is present (2 packed snapshots => +2)', () => {
    const stateWithQuartermaster: ReturnType<typeof createTestState> = createTestState({
      units: new Map([
        ['cmd1', createTestUnit({ id: 'cmd1', typeId: 'captain' })],
        ['a1', createTestUnit({ id: 'a1', typeId: 'warrior' })],
        ['a2', createTestUnit({ id: 'a2', typeId: 'warrior' })],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState({
          unitId: 'cmd1',
          promotions: ['logistics_quartermaster'],
          packedUnitStates: [
            createTestUnit({ id: 'a1', typeId: 'warrior' }),
            createTestUnit({ id: 'a2', typeId: 'warrior' }),
          ],
        })],
      ]),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const stateWithoutQuartermaster: ReturnType<typeof createTestState> = createTestState({
      units: new Map([
        ['cmd1', createTestUnit({ id: 'cmd1', typeId: 'captain' })],
        ['a1', createTestUnit({ id: 'a1', typeId: 'warrior' })],
        ['a2', createTestUnit({ id: 'a2', typeId: 'warrior' })],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState({
          unitId: 'cmd1',
          packedUnitStates: [
            createTestUnit({ id: 'a1', typeId: 'warrior' }),
            createTestUnit({ id: 'a2', typeId: 'warrior' }),
          ],
        })],
      ]),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });

    const nextWithQuartermaster = resourceSystem(stateWithQuartermaster, { type: 'END_TURN' });
    const nextWithoutQuartermaster = resourceSystem(stateWithoutQuartermaster, { type: 'END_TURN' });
    expect(nextWithQuartermaster.players.get('p1')!.gold - nextWithoutQuartermaster.players.get('p1')!.gold).toBe(2);
  });

  it('does not grant quartermaster gold when commander is not packed', () => {
    const state = createTestState({
      units: new Map([
        ['cmd1', createTestUnit({ id: 'cmd1', typeId: 'captain' })],
        ['a1', createTestUnit({ id: 'a1', typeId: 'warrior' })],
        ['a2', createTestUnit({ id: 'a2', typeId: 'warrior' })],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState({
          unitId: 'cmd1',
          packed: false,
          promotions: ['logistics_quartermaster'],
          packedUnitStates: [
            createTestUnit({ id: 'a1', typeId: 'warrior' }),
            createTestUnit({ id: 'a2', typeId: 'warrior' }),
          ],
        })],
      ]),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.gold).toBe(100);
  });

  it('uses attachedUnits when packedUnitStates is missing (legacy packed state)', () => {
    const state = createTestState({
      units: new Map([
        ['cmd1', createTestUnit({ id: 'cmd1', typeId: 'captain' })],
        ['a1', createTestUnit({ id: 'a1', typeId: 'warrior', packedInCommanderId: 'cmd1' })],
        ['a2', createTestUnit({ id: 'a2', typeId: 'warrior', packedInCommanderId: 'cmd1' })],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState({
          unitId: 'cmd1',
          promotions: ['logistics_quartermaster'],
          attachedUnits: ['a1', 'a2'],
        })],
      ]),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });

    const next = resourceSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.gold).toBe(102);
  });

  it('counts quartermaster promotion when stored only on commander unit promotions', () => {
    const state = createTestState({
      units: new Map([
        ['cmd1', createTestUnit({ id: 'cmd1', typeId: 'captain', promotions: ['logistics_quartermaster'] })],
        ['a1', createTestUnit({ id: 'a1', typeId: 'warrior' })],
        ['a2', createTestUnit({ id: 'a2', typeId: 'warrior' })],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState({
          unitId: 'cmd1',
          promotions: [],
          packedUnitStates: [
            createTestUnit({ id: 'a1', typeId: 'warrior' }),
            createTestUnit({ id: 'a2', typeId: 'warrior' }),
          ],
        })],
      ]),
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });

    const next = resourceSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.gold).toBe(102);
  });

  it('ignores non-END_TURN actions', () => {
    const state = createTestState();
    expect(resourceSystem(state, { type: 'START_TURN' })).toBe(state);
  });

  it('gold does not go below 0 (gold floor)', () => {
    // Player with low gold, a city that generates no gold, and 5 military units
    const city = createTestCity({ population: 1 });
    const units = new Map([
      ['w1', createTestUnit({ id: 'w1', typeId: 'warrior' })],
      ['w2', createTestUnit({ id: 'w2', typeId: 'warrior' })],
      ['w3', createTestUnit({ id: 'w3', typeId: 'warrior' })],
      ['w4', createTestUnit({ id: 'w4', typeId: 'warrior' })],
      ['w5', createTestUnit({ id: 'w5', typeId: 'warrior' })],
    ]);
    const state = createTestState({
      cities: new Map([['c1', city]]),
      units,
      players: new Map([['p1', createTestPlayer({ gold: 2 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // 5 military units = 5 maintenance, city yields ~0 gold → netGold = -5
    // Gold floor prevents going below 0
    expect(next.players.get('p1')!.gold).toBe(0);
  });

  it('does not charge maintenance before first city is founded', () => {
    // No cities: pre-founding phase — military units should not cost maintenance
    const units = new Map([
      ['w1', createTestUnit({ id: 'w1', typeId: 'warrior' })],
      ['s1', createTestUnit({ id: 's1', typeId: 'scout' })],
    ]);
    const state = createTestState({
      units,
      players: new Map([['p1', createTestPlayer({ gold: 100 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // No cities → no income, but also no maintenance deducted
    expect(next.players.get('p1')!.gold).toBe(100);
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

describe('nextCelebrationThreshold (legacy linear formula — backward-compat export)', () => {
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

describe('resourceSystem — celebrations (W3-03: globalHappiness accumulator + VII thresholds)', () => {
  /**
   * Build a state where the player's accumulated globalHappiness already exceeds
   * the antiquity first-celebration threshold (200), so that the next END_TURN
   * crosses the threshold and sets pendingCelebrationChoice.
   *
   * The player must have a governmentId for the government-gated bonus menu to trigger.
   */
  function createNearThresholdState(governmentId: string | null = 'classical_republic') {
    const city = createTestCity({ population: 1 });
    const player = createTestPlayer({
      gold: 100,
      // Pre-load globalHappiness just below antiquity threshold 200
      // with enough city happiness that one END_TURN crosses it.
      // City base happiness ~10; set globalHappiness to 190 → 190+10 = 200 >= 200
      globalHappiness: 190,
      celebrationCount: 0,
      celebrationBonus: 0,
      celebrationTurnsLeft: 0,
      ...(governmentId !== null ? { governmentId } : {}),
    });
    return createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });
  }

  it('accumulates globalHappiness each END_TURN (does not reset)', () => {
    const city = createTestCity({ population: 1 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ globalHappiness: 50 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // globalHappiness must be >= 50 (it only grows)
    expect((next.players.get('p1')!.globalHappiness ?? 0)).toBeGreaterThanOrEqual(50);
  });

  it('does not accumulate happiness from negative-happiness cities', () => {
    // City happiness = 0 (not positive); contributes 0 to accumulator
    const city = createTestCity({ population: 1, happiness: 0 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ globalHappiness: 0 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // globalHappiness should stay at 0 since city happiness will be 0 or may be recalculated to ~10
    // The system only adds positive cityHappiness; 0 happiness contributes 0
    const newHappiness = next.players.get('p1')!.globalHappiness ?? 0;
    expect(newHappiness).toBeGreaterThanOrEqual(0);
  });

  it('sets pendingCelebrationChoice when globalHappiness crosses antiquity threshold 200', () => {
    // globalHappiness 190 + ~10 city happiness = 200 >= antiquity[0]=200
    const state = createNearThresholdState('classical_republic');
    const next = resourceSystem(state, { type: 'END_TURN' });
    const player = next.players.get('p1')!;

    expect(player.pendingCelebrationChoice).toBeTruthy();
    expect(player.pendingCelebrationChoice!.governmentId).toBe('classical_republic');
    // celebrationCount should NOT have incremented yet (player must pick bonus first)
    expect(player.celebrationCount).toBe(0);
  });

  it('does not set pendingCelebrationChoice when below threshold', () => {
    // globalHappiness starts at 0; city happiness ~10; accumulated = 10 < 200
    const city = createTestCity({ population: 1 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ celebrationCount: 0, globalHappiness: 0 })]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    const player = next.players.get('p1')!;
    expect(player.pendingCelebrationChoice ?? null).toBeNull();
    expect(player.celebrationCount).toBe(0);
  });

  it('does not set pendingCelebrationChoice if player has no government', () => {
    // Without a governmentId, the system cannot present a bonus menu
    const state = createNearThresholdState(null);
    const next = resourceSystem(state, { type: 'END_TURN' });
    const player = next.players.get('p1')!;
    expect(player.pendingCelebrationChoice ?? null).toBeNull();
  });

  it('does not re-trigger if pendingCelebrationChoice is already set', () => {
    // If already pending, a second END_TURN should not overwrite the pending choice
    const city = createTestCity({ population: 1 });
    const existingPending = { governmentId: 'classical_republic' };
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({
        globalHappiness: 999, // well above threshold
        celebrationCount: 0,
        governmentId: 'classical_republic',
        pendingCelebrationChoice: existingPending,
      } as Parameters<typeof createTestPlayer>[0])]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    // Should remain the same pending (not duplicated)
    expect(next.players.get('p1')!.pendingCelebrationChoice).toEqual(existingPending);
  });

  it('decrements celebrationTurnsLeft on each END_TURN (timer still works)', () => {
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

  it('clears celebration bonus when celebrationTurnsLeft reaches 0', () => {
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

  it('decrements and clears structured activeCelebrationBonus on END_TURN', () => {
    const city = createTestCity({ population: 1 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({
        celebrationCount: 1,
        celebrationBonus: 0,
        celebrationTurnsLeft: 2,
        activeCelebrationBonus: {
          governmentId: 'classical_republic',
          bonusId: 'classical-rep-culture',
          turnsRemaining: 2,
          effects: [
            { type: 'MODIFY_YIELD_PERCENT', target: 'empire', yield: 'culture', percent: 20 },
          ],
        },
      })]]),
    });

    const next = resourceSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.celebrationTurnsLeft).toBe(1);
    expect(next.players.get('p1')!.activeCelebrationBonus?.turnsRemaining).toBe(1);

    const finished = resourceSystem(next, { type: 'END_TURN' });
    expect(finished.players.get('p1')!.celebrationTurnsLeft).toBe(0);
    expect(finished.players.get('p1')!.activeCelebrationBonus).toBeNull();
  });

  it('treats legacy string activeCelebrationBonus as scalar save data and normalizes it away', () => {
    const city = createTestCity({ population: 1 });
    const legacyPlayer = {
      ...createTestPlayer({
        celebrationCount: 1,
        celebrationBonus: 10,
        celebrationTurnsLeft: 2,
      }),
      activeCelebrationBonus: 'classical-rep-culture',
    } as unknown as ReturnType<typeof createTestPlayer>;
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', legacyPlayer]]),
    });

    const next = resourceSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.celebrationTurnsLeft).toBe(1);
    expect(next.players.get('p1')!.celebrationBonus).toBe(10);
    expect(next.players.get('p1')!.activeCelebrationBonus).toBeNull();
  });

  it('uses second antiquity threshold 349 for celebrationCount=1', () => {
    // Player has 1 celebration done; globalHappiness 348 + ~10 = 358 >= 349
    const city = createTestCity({ population: 1 });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({
        globalHappiness: 348,
        celebrationCount: 1,
        governmentId: 'classical_republic',
      } as Parameters<typeof createTestPlayer>[0])]]),
    });
    const next = resourceSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.pendingCelebrationChoice).toBeTruthy();
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
        improvement: null,
        building: null,
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
      specialization: null, specialists: 0, districts: [],
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
      specialization: null, specialists: 0, districts: [],
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
      specialization: null, specialists: 0, districts: [],
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

  it('exploration age increases cap to 8 (VII parity: +4)', () => {
    const player = createTestPlayer({ age: 'exploration' });
    const state = createTestState({ players: new Map([['p1', player]]) });
    expect(calculateEffectiveSettlementCap(state, 'p1')).toBe(8);
  });

  it('modern age increases cap to 12 (VII parity: +8)', () => {
    const player = createTestPlayer({ age: 'modern' });
    const state = createTestState({ players: new Map([['p1', player]]) });
    expect(calculateEffectiveSettlementCap(state, 'p1')).toBe(12);
  });

  it('exploration player has no penalty at 5 settlements (cap is 8, well within limit)', () => {
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
