import { describe, it, expect } from 'vitest';
import { SOLAR_ECLIPSE, ALL_CRISES } from '../crises';
import { crisisSystem } from '../../systems/crisisSystem';
import { createTestState, createTestPlayer } from '../../systems/__tests__/helpers';
import type { CityState, CrisisState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCity(id: string, owner: string, population: number, happiness = 10): CityState {
  return {
    id,
    name: id,
    owner,
    position: { q: 0, r: 0 },
    population,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [coordToKey({ q: 0, r: 0 })],
    settlementType: 'city',
    happiness,
    isCapital: false,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
  };
}

/** A state where all three compound trigger conditions are met (turn 20, pop 3, 1 tech). */
function makeReadyState() {
  const players = new Map([
    ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['pottery'] })],
  ]);
  const cities = new Map([['c1', makeCity('c1', 'p1', 3)]]);
  return createTestState({ turn: 20, players, cities });
}

// ---------------------------------------------------------------------------
// Data integrity
// ---------------------------------------------------------------------------

describe('SOLAR_ECLIPSE data definition', () => {
  it('has the correct id', () => {
    expect(SOLAR_ECLIPSE.id).toBe('solar_eclipse');
  });

  it('has the correct name', () => {
    expect(SOLAR_ECLIPSE.name).toBe('Solar Eclipse');
  });

  it('has a non-empty description', () => {
    expect(SOLAR_ECLIPSE.description.length).toBeGreaterThan(10);
  });

  it('uses the compound trigger condition', () => {
    expect(SOLAR_ECLIPSE.triggerCondition).toBe('compound');
  });

  it('declares compoundTrigger with minTurn 20', () => {
    expect(SOLAR_ECLIPSE.compoundTrigger?.minTurn).toBe(20);
  });

  it('declares compoundTrigger with minCityPopulation 3', () => {
    expect(SOLAR_ECLIPSE.compoundTrigger?.minCityPopulation).toBe(3);
  });

  it('declares compoundTrigger with minResearchedTechs 1', () => {
    expect(SOLAR_ECLIPSE.compoundTrigger?.minResearchedTechs).toBe(1);
  });

  it('has exactly three choices', () => {
    expect(SOLAR_ECLIPSE.choices).toHaveLength(3);
  });

  it('choice ids are unique', () => {
    const ids = SOLAR_ECLIPSE.choices.map(c => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('divine_favor choice boosts faith by 30', () => {
    const choice = SOLAR_ECLIPSE.choices.find(c => c.id === 'divine_favor')!;
    const faithEffect = choice.effects.find(e => e.type === 'MODIFY_YIELD' && e.yield === 'faith');
    expect(faithEffect).toBeDefined();
    expect(faithEffect!.value).toBe(30);
  });

  it('divine_favor choice reduces science by 10', () => {
    const choice = SOLAR_ECLIPSE.choices.find(c => c.id === 'divine_favor')!;
    const scienceEffect = choice.effects.find(e => e.type === 'MODIFY_YIELD' && e.yield === 'science');
    expect(scienceEffect).toBeDefined();
    expect(scienceEffect!.value).toBe(-10);
  });

  it('calm_with_science choice boosts science by 30', () => {
    const choice = SOLAR_ECLIPSE.choices.find(c => c.id === 'calm_with_science')!;
    const scienceEffect = choice.effects.find(e => e.type === 'MODIFY_YIELD' && e.yield === 'science');
    expect(scienceEffect).toBeDefined();
    expect(scienceEffect!.value).toBe(30);
  });

  it('calm_with_science choice costs 50 gold', () => {
    const choice = SOLAR_ECLIPSE.choices.find(c => c.id === 'calm_with_science')!;
    const goldEffect = choice.effects.find(e => e.type === 'MODIFY_GOLD');
    expect(goldEffect).toBeDefined();
    expect(goldEffect!.value).toBe(-50);
  });

  it('do_nothing choice has 20% probability on happiness reduction', () => {
    const choice = SOLAR_ECLIPSE.choices.find(c => c.id === 'do_nothing')!;
    const happinessEffect = choice.effects.find(e => e.type === 'REDUCE_CITY_HAPPINESS');
    expect(happinessEffect).toBeDefined();
    expect(happinessEffect!.probability).toBeCloseTo(0.2);
    expect(happinessEffect!.value).toBe(-1);
  });

  it('is included in ALL_CRISES', () => {
    expect(ALL_CRISES).toContain(SOLAR_ECLIPSE);
  });

  it('id does not collide with any other crisis in ALL_CRISES', () => {
    const ids = ALL_CRISES.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Trigger conditions (via crisisSystem END_TURN)
// ---------------------------------------------------------------------------

describe('SOLAR_ECLIPSE trigger conditions', () => {
  it('triggers when all three conditions are met', () => {
    const state = makeReadyState();
    const next = crisisSystem(state, { type: 'END_TURN' });
    const crisis = next.crises.find(c => c.id === 'solar_eclipse');
    expect(crisis).toBeDefined();
    expect(crisis!.active).toBe(true);
    expect(crisis!.turn).toBe(20);
  });

  it('does not trigger when turn < 20', () => {
    const base = makeReadyState();
    const state = { ...base, turn: 19 };
    const next = crisisSystem(state, { type: 'END_TURN' });
    expect(next.crises.find(c => c.id === 'solar_eclipse')).toBeUndefined();
  });

  it('does not trigger when no city has population >= 3', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['pottery'] })],
    ]);
    const cities = new Map([['c1', makeCity('c1', 'p1', 2)]]);
    const state = createTestState({ turn: 20, players, cities });
    const next = crisisSystem(state, { type: 'END_TURN' });
    expect(next.crises.find(c => c.id === 'solar_eclipse')).toBeUndefined();
  });

  it('does not trigger when player has no researched techs', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: [] })],
    ]);
    const cities = new Map([['c1', makeCity('c1', 'p1', 3)]]);
    const state = createTestState({ turn: 20, players, cities });
    const next = crisisSystem(state, { type: 'END_TURN' });
    expect(next.crises.find(c => c.id === 'solar_eclipse')).toBeUndefined();
  });

  it('does not trigger the same crisis twice', () => {
    const already: CrisisState = {
      id: 'solar_eclipse',
      name: 'Solar Eclipse',
      active: false,
      turn: 20,
      choices: [],
      resolvedBy: 'p1',
      choiceMade: 'do_nothing',
    };
    const base = makeReadyState();
    const state = { ...base, turn: 25, crises: [already] };
    const next = crisisSystem(state, { type: 'END_TURN' });
    const eclipseCrises = next.crises.filter(c => c.id === 'solar_eclipse');
    expect(eclipseCrises.length).toBe(1);
  });

  it('triggers at exactly turn 20 (boundary)', () => {
    const state = makeReadyState(); // turn === 20
    const next = crisisSystem(state, { type: 'END_TURN' });
    expect(next.crises.find(c => c.id === 'solar_eclipse')).toBeDefined();
  });

  it('triggers with a city that has more than the minimum population', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['pottery'] })],
    ]);
    const cities = new Map([['c1', makeCity('c1', 'p1', 7)]]);
    const state = createTestState({ turn: 20, players, cities });
    const next = crisisSystem(state, { type: 'END_TURN' });
    expect(next.crises.find(c => c.id === 'solar_eclipse')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Resolution — divine_favor
// ---------------------------------------------------------------------------

describe('SOLAR_ECLIPSE resolution: divine_favor', () => {
  function makeActiveCrisis(): CrisisState {
    return {
      id: 'solar_eclipse',
      name: 'Solar Eclipse',
      active: true,
      turn: 20,
      choices: [],
      resolvedBy: null,
      choiceMade: null,
    };
  }

  it('increases player faith by 30', () => {
    const players = new Map([['p1', createTestPlayer({ id: 'p1', faith: 0 })]]);
    const state = createTestState({ crises: [makeActiveCrisis()], players });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'divine_favor' });
    expect(next.players.get('p1')!.faith).toBe(30);
  });

  it('decreases player science by 10 (floored at 0)', () => {
    const players = new Map([['p1', createTestPlayer({ id: 'p1', science: 10 })]]);
    const state = createTestState({ crises: [makeActiveCrisis()], players });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'divine_favor' });
    expect(next.players.get('p1')!.science).toBe(0);
  });

  it('does not reduce science below 0', () => {
    const players = new Map([['p1', createTestPlayer({ id: 'p1', science: 5 })]]);
    const state = createTestState({ crises: [makeActiveCrisis()], players });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'divine_favor' });
    expect(next.players.get('p1')!.science).toBeGreaterThanOrEqual(0);
  });

  it('marks the crisis as resolved', () => {
    const state = createTestState({ crises: [makeActiveCrisis()] });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'divine_favor' });
    const crisis = next.crises.find(c => c.id === 'solar_eclipse')!;
    expect(crisis.active).toBe(false);
    expect(crisis.resolvedBy).toBe('p1');
    expect(crisis.choiceMade).toBe('divine_favor');
  });
});

// ---------------------------------------------------------------------------
// Resolution — calm_with_science
// ---------------------------------------------------------------------------

describe('SOLAR_ECLIPSE resolution: calm_with_science', () => {
  function makeActiveCrisis(): CrisisState {
    return {
      id: 'solar_eclipse',
      name: 'Solar Eclipse',
      active: true,
      turn: 20,
      choices: [],
      resolvedBy: null,
      choiceMade: null,
    };
  }

  it('increases player science by 30', () => {
    const players = new Map([['p1', createTestPlayer({ id: 'p1', science: 0, gold: 100 })]]);
    const state = createTestState({ crises: [makeActiveCrisis()], players });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'calm_with_science' });
    expect(next.players.get('p1')!.science).toBe(30);
  });

  it('deducts 50 gold', () => {
    const players = new Map([['p1', createTestPlayer({ id: 'p1', gold: 100 })]]);
    const state = createTestState({ crises: [makeActiveCrisis()], players });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'calm_with_science' });
    expect(next.players.get('p1')!.gold).toBe(50);
  });

  it('does not reduce gold below 0', () => {
    const players = new Map([['p1', createTestPlayer({ id: 'p1', gold: 20 })]]);
    const state = createTestState({ crises: [makeActiveCrisis()], players });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'calm_with_science' });
    expect(next.players.get('p1')!.gold).toBeGreaterThanOrEqual(0);
  });

  it('marks the crisis as resolved', () => {
    const state = createTestState({ crises: [makeActiveCrisis()] });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'calm_with_science' });
    const crisis = next.crises.find(c => c.id === 'solar_eclipse')!;
    expect(crisis.active).toBe(false);
    expect(crisis.choiceMade).toBe('calm_with_science');
  });
});

// ---------------------------------------------------------------------------
// Resolution — do_nothing (probabilistic happiness)
// ---------------------------------------------------------------------------

describe('SOLAR_ECLIPSE resolution: do_nothing', () => {
  function makeActiveCrisis(): CrisisState {
    return {
      id: 'solar_eclipse',
      name: 'Solar Eclipse',
      active: true,
      turn: 20,
      choices: [],
      resolvedBy: null,
      choiceMade: null,
    };
  }

  it('marks the crisis as resolved regardless of probability outcome', () => {
    const cities = new Map([['c1', makeCity('c1', 'p1', 5, 10)]]);
    const state = createTestState({ crises: [makeActiveCrisis()], cities });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'do_nothing' });
    const crisis = next.crises.find(c => c.id === 'solar_eclipse')!;
    expect(crisis.active).toBe(false);
    expect(crisis.choiceMade).toBe('do_nothing');
  });

  it('happiness reduction never goes below 0', () => {
    // Run with a state where happiness is already 0; must not go negative.
    const cities = new Map([['c1', makeCity('c1', 'p1', 5, 0)]]);
    // Force probability to trigger by using a specific rng seed
    const state = createTestState({
      crises: [makeActiveCrisis()],
      cities,
      rng: { seed: 0, counter: 0 }, // will compute rngValue; result is implementation-defined
    });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'do_nothing' });
    for (const city of next.cities.values()) {
      expect(city.happiness).toBeGreaterThanOrEqual(0);
    }
  });

  it('only affects player cities, not opponent cities', () => {
    const cities = new Map([
      ['c1', makeCity('c1', 'p1', 5, 10)],
      ['c2', makeCity('c2', 'p2', 5, 10)], // belongs to another player
    ]);
    // Use a deterministic RNG state that forces the happiness reduction to apply
    // (probability 0.2; rngValue from seed=0,counter=0 is ~0.0, so it triggers)
    const state = createTestState({
      crises: [makeActiveCrisis()],
      cities,
      rng: { seed: 0, counter: 0 },
    });
    const next = crisisSystem(state, { type: 'RESOLVE_CRISIS', crisisId: 'solar_eclipse', choice: 'do_nothing' });
    // p2's city must never be affected
    expect(next.cities.get('c2')!.happiness).toBe(10);
  });
});
