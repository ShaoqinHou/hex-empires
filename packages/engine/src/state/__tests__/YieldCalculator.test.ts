import { describe, it, expect } from 'vitest';
import { calculateCityYields } from '../YieldCalculator';
import { createTestState } from '../../systems/__tests__/helpers';
import type { CityState, HexTile } from '../../types/GameState';
import type { BuildingDef } from '../../types/Building';
import type { NaturalWonderDef } from '../../types/NaturalWonder';
import { coordToKey } from '../../hex/HexMath';

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
    population: 1, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey({ q: 3, r: 3 })],
    settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
    specialization: null, specialists: 0, districts: [],
    ...overrides,
  };
}

describe('B3: specialist yields (food cost moved to growthSystem F-02)', () => {
  it('city with no specialists has no specialist bonus', () => {
    const state = createTestState();
    const city = makeCity({ specialists: 0 });
    const yields = calculateCityYields(city, state);
    expect(yields.food).toBeGreaterThan(0);
  });

  it('specialists do NOT deduct food from yields (cost moved to growthSystem)', () => {
    const state = createTestState();
    const cityNoSpec = makeCity({ specialists: 0 });
    const cityWith2Spec = makeCity({ specialists: 2 });

    const yieldsNoSpec = calculateCityYields(cityNoSpec, state);
    const yields2Spec = calculateCityYields(cityWith2Spec, state);

    // Food cost is handled in growthSystem.foodConsumed, not here
    expect(yieldsNoSpec.food).toBe(yields2Spec.food);
  });

  it('specialists produce +2 science and +2 culture each', () => {
    const state = createTestState();
    const cityNoSpec = makeCity({ specialists: 0 });
    const cityWith2Spec = makeCity({ specialists: 2 });

    const yieldsNoSpec = calculateCityYields(cityNoSpec, state);
    const yields2Spec = calculateCityYields(cityWith2Spec, state);

    // 2 specialists: +4 science, +4 culture
    expect(yields2Spec.science - yieldsNoSpec.science).toBe(4);
    expect(yields2Spec.culture - yieldsNoSpec.culture).toBe(4);
  });
});

describe('F-08: natural wonder tile yields', () => {
  it('natural wonder tile adds its yields to a city that includes it in territory', () => {
    const wonderId = 'aurora_borealis';
    const wonderDef: NaturalWonderDef = {
      id: wonderId,
      name: 'Aurora Borealis',
      type: 'scenic',
      tileCount: 1,
      firstSettleBonus: { type: 'GRANT_UNIT', unitId: 'scout', count: 1 },
      description: 'Shimmering lights in the sky.',
      yields: { food: 0, production: 0, gold: 0, science: 3, culture: 2, faith: 0, influence: 0, happiness: 0 },
    };

    const state = createTestState();
    // Register the wonder in config
    const naturalWonders = new Map([[wonderId, wonderDef]]);
    const config = { ...state.config, naturalWonders };

    // Place a wonder tile at the city position (3,3) which is already in territory
    const tileKey = coordToKey({ q: 3, r: 3 });
    const tiles = new Map(state.map.tiles);
    const existingTile = tiles.get(tileKey)!;
    const wonderTile: HexTile = {
      ...existingTile,
      isNaturalWonder: true,
      naturalWonderId: wonderId,
    };
    tiles.set(tileKey, wonderTile);

    const testState = { ...state, config, map: { ...state.map, tiles } };
    const city = makeCity();
    const yields = calculateCityYields(city, testState);

    // Science should include the wonder's +3
    // Base grassland tile (3,3) gives food=3; wonder adds science=3, culture=2
    expect(yields.science).toBeGreaterThanOrEqual(3);
    expect(yields.culture).toBeGreaterThanOrEqual(2);
  });

  it('tile without naturalWonderId contributes no wonder yields', () => {
    const state = createTestState();
    const city = makeCity();
    const yieldsNormal = calculateCityYields(city, state);
    // No wonder tile in the territory → science from yields only (zero from base grassland)
    expect(yieldsNormal.science).toBe(0);
  });
});

describe('X3.1: YieldSet.happiness accumulates from buildings', () => {
  it('happiness-providing building (Bath) contributes its happiness yield to calculateCityYields', () => {
    // Bath: yields: { happiness: 2 }
    const bath: BuildingDef = {
      id: 'bath', name: 'Bath', age: 'antiquity', cost: 90, maintenance: 1,
      yields: { happiness: 2 },
      effects: [], requiredTech: 'construction', category: 'happiness', happinessCost: 0,
    };
    const state = createTestState();
    const buildings = new Map(state.config.buildings);
    buildings.set('bath', bath);
    const config = { ...state.config, buildings };
    const testState = { ...state, config };

    const cityNoBath = makeCity({ buildings: [] });
    const cityWithBath = makeCity({ buildings: ['bath'] });

    const yieldsNoBath = calculateCityYields(cityNoBath, testState);
    const yieldsWithBath = calculateCityYields(cityWithBath, testState);

    // Bath adds +2 happiness
    expect(yieldsWithBath.happiness - yieldsNoBath.happiness).toBe(2);
  });

  it('multiple happiness-providing buildings accumulate in YieldSet.happiness', () => {
    // Bath (+2), Aqueduct (+3), Hanging Gardens (+2) = +7 total
    const bath: BuildingDef = {
      id: 'bath', name: 'Bath', age: 'antiquity', cost: 90, maintenance: 1,
      yields: { happiness: 2 },
      effects: [], requiredTech: 'construction', category: 'happiness', happinessCost: 0,
    };
    const aqueduct: BuildingDef = {
      id: 'aqueduct', name: 'Aqueduct', age: 'antiquity', cost: 75, maintenance: 0,
      yields: { happiness: 3 },
      effects: [], requiredTech: 'construction', category: 'food', happinessCost: 0,
    };
    const hangingGardens: BuildingDef = {
      id: 'hanging_gardens', name: 'Hanging Gardens', age: 'antiquity', cost: 350, maintenance: 0,
      yields: { food: 8, happiness: 2 },
      effects: [], requiredTech: 'irrigation', category: 'wonder', happinessCost: 0,
      isWonder: true, isAgeless: true,
    };

    const state = createTestState();
    const buildings = new Map(state.config.buildings);
    buildings.set('bath', bath);
    buildings.set('aqueduct', aqueduct);
    buildings.set('hanging_gardens', hangingGardens);
    const config = { ...state.config, buildings };
    const testState = { ...state, config };

    const cityWithAll = makeCity({ buildings: ['bath', 'aqueduct', 'hanging_gardens'] });
    const yieldsWithAll = calculateCityYields(cityWithAll, testState);

    // Bath +2, Aqueduct +3, Hanging Gardens +2 = 7 total happiness yield
    expect(yieldsWithAll.happiness).toBe(7);
  });
});

// ── Y2.2: Slotted policy MODIFY_YIELD effects ──

describe('Y2.2: slotted policy effects applied in YieldCalculator', () => {
  it('slotted +2 production policy increases city production by 2', () => {
    const state = createTestState();
    const city = makeCity();

    // Base yields without policy
    const baseYields = calculateCityYields(city, state);

    // Inject a player with slottedPolicies containing urban_planning (+1 production per city)
    // and a custom +2 production policy to keep the test independent of real policy data
    const testPolicyId = 'test_prod_policy';
    const policies = new Map(state.config.policies);
    policies.set(testPolicyId, {
      id: testPolicyId,
      name: 'Test Production Policy',
      category: 'economic' as const,
      unlockCivic: 'code_of_laws',
      bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 2 },
      description: '+2 Production per city.',
    });
    const config = { ...state.config, policies };

    const players = new Map(state.players);
    players.set('p1', {
      ...state.players.get('p1')!,
      slottedPolicies: [testPolicyId, null, null, null],
    });
    const testState = { ...state, config, players };

    const yieldsWithPolicy = calculateCityYields(city, testState);
    expect(yieldsWithPolicy.production - baseYields.production).toBe(2);
  });

  it('Z1.1: removing the policy drops the +2 production effect (effect absent without slot)', () => {
    // When a policy is NOT in slottedPolicies, it must not contribute yields.
    const testPolicyId = 'test_prod_policy_z1';
    const state = createTestState();
    const city = makeCity();

    const policies = new Map(state.config.policies);
    policies.set(testPolicyId, {
      id: testPolicyId,
      name: 'Test Production Policy Z1',
      category: 'economic' as const,
      unlockCivic: 'code_of_laws',
      bonus: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 2 },
      description: '+2 Production per city.',
    });
    const config = { ...state.config, policies };

    // State WITH the policy slotted
    const playersWithPolicy = new Map(state.players);
    playersWithPolicy.set('p1', {
      ...state.players.get('p1')!,
      slottedPolicies: [testPolicyId, null, null, null],
    });
    const stateWith = { ...state, config, players: playersWithPolicy };

    // State WITHOUT the policy (empty slots)
    const playersWithout = new Map(state.players);
    playersWithout.set('p1', {
      ...state.players.get('p1')!,
      slottedPolicies: [null, null, null, null],
    });
    const stateWithout = { ...state, config, players: playersWithout };

    const yieldsWith = calculateCityYields(city, stateWith);
    const yieldsWithout = calculateCityYields(city, stateWithout);

    expect(yieldsWith.production - yieldsWithout.production).toBe(2);
  });
});

// ── Y2.3: Tech-effect MODIFY_YIELD applied in YieldCalculator ──

describe('Y2.3: tech-effect yields applied in YieldCalculator', () => {
  it('researched tech with +1 science effect adds +1 science to city yields', () => {
    const state = createTestState();
    const city = makeCity();

    const baseYields = calculateCityYields(city, state);

    // Register a tech with a persistent +1 science effect
    const testTechId = 'test_science_tech';
    const technologies = new Map(state.config.technologies);
    technologies.set(testTechId, {
      id: testTechId,
      name: 'Test Science Tech',
      age: 'antiquity' as const,
      cost: 50,
      prerequisites: [],
      unlocks: [],
      description: '+1 science',
      treePosition: { row: 0, col: 0 },
      effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 1 }],
    });
    const config = { ...state.config, technologies };

    const players = new Map(state.players);
    players.set('p1', {
      ...state.players.get('p1')!,
      researchedTechs: [testTechId as import('../../types/GameState').TechnologyId],
    });
    const testState = { ...state, config, players };

    const yieldsWithTech = calculateCityYields(city, testState);
    expect(yieldsWithTech.science - baseYields.science).toBe(1);
  });

  it('Z1.2: tech without effects field causes no yield change', () => {
    // A TechnologyDef with no effects array (effects is optional) should not crash or alter yields.
    const state = createTestState();
    const city = makeCity();

    const baseYields = calculateCityYields(city, state);

    const testTechId = 'test_no_effects_tech';
    const technologies = new Map(state.config.technologies);
    technologies.set(testTechId, {
      id: testTechId,
      name: 'Test No-Effects Tech',
      age: 'antiquity' as const,
      cost: 50,
      prerequisites: [],
      unlocks: [],
      description: 'No persistent effects',
      treePosition: { row: 0, col: 0 },
      // effects deliberately omitted — optional field
    });
    const config = { ...state.config, technologies };

    const players = new Map(state.players);
    players.set('p1', {
      ...state.players.get('p1')!,
      researchedTechs: [testTechId as import('../../types/GameState').TechnologyId],
    });
    const testState = { ...state, config, players };

    const yieldsWithTech = calculateCityYields(city, testState);
    // No effects → yields should be identical to base
    expect(yieldsWithTech.food).toBe(baseYields.food);
    expect(yieldsWithTech.production).toBe(baseYields.production);
    expect(yieldsWithTech.science).toBe(baseYields.science);
    expect(yieldsWithTech.gold).toBe(baseYields.gold);
  });
});

// ── Y2.4: localHappiness penalty ──

describe('Y2.4: localHappiness penalty in YieldCalculator', () => {
  it('city at -10 happiness has roughly 80% yield multiplier (floor applied)', () => {
    // happiness=-10 → multiplier = 1 + (-10) * 0.02 = 0.8
    const state = createTestState();
    const cityHappy = makeCity({ happiness: 0 }); // neutral (no penalty)
    const cityUnhappy = makeCity({ happiness: -10 });

    const yieldsHappy = calculateCityYields(cityHappy, state);
    const yieldsUnhappy = calculateCityYields(cityUnhappy, state);

    // Food should be reduced by roughly 20% (floors applied)
    // e.g. if baseFood = 5, unhappy should be floor(5 * 0.8) = 4
    expect(yieldsUnhappy.food).toBeLessThan(yieldsHappy.food);
    expect(yieldsUnhappy.production).toBeLessThan(yieldsHappy.production);
    // Verify approximate multiplier: unhappy/happy ≈ 0.8 (within floor rounding)
    if (yieldsHappy.food > 0) {
      expect(yieldsUnhappy.food / yieldsHappy.food).toBeGreaterThanOrEqual(0.75);
      expect(yieldsUnhappy.food / yieldsHappy.food).toBeLessThanOrEqual(1.0);
    }
  });

  it('Z1.3: city at 0 happiness has no penalty (yields unchanged vs neutral baseline)', () => {
    // At happiness = 0, the multiplier would be 1 + 0 * 0.02 = 1.0 — no change.
    // The code only applies the multiplier when localHappiness < 0.
    const state = createTestState();
    const cityNeutral = makeCity({ happiness: 0 });

    // To confirm "no change" we compare 0-happiness against a city with +5 (both should yield same).
    const cityMild = makeCity({ happiness: 5 });

    const yieldsNeutral = calculateCityYields(cityNeutral, state);
    const yieldsMild = calculateCityYields(cityMild, state);

    expect(yieldsNeutral.food).toBe(yieldsMild.food);
    expect(yieldsNeutral.production).toBe(yieldsMild.production);
    expect(yieldsNeutral.gold).toBe(yieldsMild.gold);
  });

  it('city at +10 happiness has no bonus multiplier (positive happiness unaffected)', () => {
    const state = createTestState();
    const cityNeutral = makeCity({ happiness: 0 });
    const cityHappy = makeCity({ happiness: 10 });

    const yieldsNeutral = calculateCityYields(cityNeutral, state);
    const yieldsHappy = calculateCityYields(cityHappy, state);

    // Positive happiness does NOT grant bonus yields
    expect(yieldsHappy.food).toBe(yieldsNeutral.food);
    expect(yieldsHappy.production).toBe(yieldsNeutral.production);
    expect(yieldsHappy.gold).toBe(yieldsNeutral.gold);
  });
});

describe('BB5.3: placed-codex science yield in calculateCityYields', () => {
  it('city with 3 placed codices gets +6 science from codices', () => {
    const city = makeCity({ id: 'c1', owner: 'p1' });
    const codex1 = { id: 'cx1', playerId: 'p1', cityId: 'c1', buildingId: 'library', addedTurn: 1, placedInCityId: 'c1', placedInBuildingId: 'library' };
    const codex2 = { id: 'cx2', playerId: 'p1', cityId: 'c1', buildingId: 'library', addedTurn: 1, placedInCityId: 'c1', placedInBuildingId: 'library' };
    const codex3 = { id: 'cx3', playerId: 'p1', cityId: 'c1', buildingId: 'library', addedTurn: 1, placedInCityId: 'c1', placedInBuildingId: 'library' };
    const state = createTestState({
      cities: new Map([['c1', city]]),
      codices: new Map([['cx1', codex1], ['cx2', codex2], ['cx3', codex3]]),
    });
    const baseCity = makeCity({ id: 'c1', owner: 'p1' });
    const stateNoCodex = createTestState({ cities: new Map([['c1', baseCity]]) });

    const yieldsWithCodex = calculateCityYields(city, state);
    const yieldsNoCodex = calculateCityYields(baseCity, stateNoCodex);

    // 3 placed codices → +6 science
    expect(yieldsWithCodex.science - yieldsNoCodex.science).toBe(6);
  });

  it('city with 0 placed codices gets +0 science from codices', () => {
    const city = makeCity({ id: 'c1', owner: 'p1' });
    // Codex earned (not placed — no placedInCityId) should not contribute
    const codexUnplaced = { id: 'cx1', playerId: 'p1', cityId: 'c1', buildingId: 'library', addedTurn: 1 };
    const stateWithUnplaced = createTestState({
      cities: new Map([['c1', city]]),
      codices: new Map([['cx1', codexUnplaced]]),
    });
    const stateNoCodex = createTestState({ cities: new Map([['c1', city]]) });

    const yieldsWithUnplaced = calculateCityYields(city, stateWithUnplaced);
    const yieldsNoCodex = calculateCityYields(city, stateNoCodex);

    // Unplaced codex should not add science
    expect(yieldsWithUnplaced.science).toBe(yieldsNoCodex.science);
  });
});
