/**
 * W2-01: Growth → PLACE_IMPROVEMENT + ASSIGN_SPECIALIST_FROM_GROWTH tests
 *
 * Covers:
 *  - growthSystem emits pendingGrowthChoice on population growth
 *  - deriveImprovementType returns correct type for terrain/resource combos
 *  - PLACE_IMPROVEMENT places derived type + clears pending choice
 *  - ASSIGN_SPECIALIST_FROM_GROWTH increments specialists + clears pending choice
 */
import { describe, it, expect } from 'vitest';
import { growthSystem } from '../growthSystem';
import { improvementSystem } from '../improvementSystem';
import { specialistSystem } from '../specialistSystem';
import { deriveImprovementType } from '../../state/ImprovementRules';
import { createTestState, createTestPlayer } from './helpers';
import { coordToKey } from '../../hex/HexMath';
import type { CityState, HexTile, PlayerState } from '../../types/GameState';
import type { HexCoord } from '../../types/HexCoord';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 1,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 }), coordToKey({ q: 3, r: 4 })],
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

/** Create a tile with optional terrain/resource/feature overrides */
function makeTile(coord: HexCoord, overrides: Partial<HexTile> = {}): HexTile {
  return {
    coord,
    terrain: 'grassland',
    feature: null,
    resource: null,
    improvement: null,
    building: null,
    river: [],
    elevation: 0.5,
    continent: 1,
    ...overrides,
  };
}

// ── deriveImprovementType unit tests ─────────────────────────────────────────

describe('deriveImprovementType', () => {
  it('grassland with no resource → farm', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'grassland' });
    expect(deriveImprovementType(tile, state)).toBe('farm');
  });

  it('plains with no resource → farm', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'plains' });
    expect(deriveImprovementType(tile, state)).toBe('farm');
  });

  it('tropical with no resource → farm', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'tropical' });
    expect(deriveImprovementType(tile, state)).toBe('farm');
  });

  it('hills with no resource → mine', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { feature: 'hills' });
    expect(deriveImprovementType(tile, state)).toBe('mine');
  });

  it('wheat resource → farm', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'plains', resource: 'wheat' });
    expect(deriveImprovementType(tile, state)).toBe('farm');
  });

  it('cattle resource → pasture', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'grassland', resource: 'cattle' });
    expect(deriveImprovementType(tile, state)).toBe('pasture');
  });

  it('horses resource → pasture', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'plains', resource: 'horses' });
    expect(deriveImprovementType(tile, state)).toBe('pasture');
  });

  it('stone resource → quarry', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { feature: 'hills', resource: 'stone' });
    expect(deriveImprovementType(tile, state)).toBe('quarry');
  });

  it('iron/niter/coal/gems resources → mine', () => {
    const state = createTestState();
    const tileBase = { q: 0, r: 0 };
    expect(deriveImprovementType(makeTile(tileBase, { terrain: 'plains', resource: 'iron' }), state)).toBe('mine');
    expect(deriveImprovementType(makeTile(tileBase, { terrain: 'plains', resource: 'niter' }), state)).toBe('mine');
    expect(deriveImprovementType(makeTile(tileBase, { terrain: 'plains', resource: 'coal' }), state)).toBe('mine');
    expect(deriveImprovementType(makeTile(tileBase, { terrain: 'plains', resource: 'gems' }), state)).toBe('mine');
  });

  it('silk/spices/wine resources → plantation', () => {
    const state = createTestState();
    const tileBase = { q: 0, r: 0 };
    expect(deriveImprovementType(makeTile(tileBase, { terrain: 'plains', resource: 'silk' }), state)).toBe('plantation');
    expect(deriveImprovementType(makeTile(tileBase, { terrain: 'plains', resource: 'spices' }), state)).toBe('plantation');
    expect(deriveImprovementType(makeTile(tileBase, { terrain: 'plains', resource: 'wine' }), state)).toBe('plantation');
  });

  it('ivory resource → camp', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'plains', resource: 'ivory' });
    expect(deriveImprovementType(tile, state)).toBe('camp');
  });

  it('whales resource → fishing_boats', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'coast', resource: 'whales' });
    expect(deriveImprovementType(tile, state)).toBe('fishing_boats');
  });

  it('oil resource → oil_rig (forward-compatible)', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'coast', resource: 'oil' });
    expect(deriveImprovementType(tile, state)).toBe('oil_rig');
  });

  it('forest without resource → woodcutter', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'grassland', feature: 'forest' });
    expect(deriveImprovementType(tile, state)).toBe('woodcutter');
  });

  it('jungle without resource → woodcutter', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'plains', feature: 'jungle' });
    expect(deriveImprovementType(tile, state)).toBe('woodcutter');
  });

  it('rainforest terrain without resource → woodcutter', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'rainforest' });
    expect(deriveImprovementType(tile, state)).toBe('woodcutter');
  });

  it('marsh without resource → clay_pit', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'grassland', feature: 'marsh' });
    expect(deriveImprovementType(tile, state)).toBe('clay_pit');
  });

  it('mangrove without resource → clay_pit', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'mangrove' });
    expect(deriveImprovementType(tile, state)).toBe('clay_pit');
  });

  it('iron resource (overrides terrain) → mine', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'tropical', resource: 'iron' });
    expect(deriveImprovementType(tile, state)).toBe('mine');
  });

  it('gold-like resource not mapped → fallback to terrain', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'plains', resource: 'gold_ore' });
    expect(deriveImprovementType(tile, state)).toBe('farm');
  });

  it('desert without resource → null (not improvable)', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { terrain: 'desert' });
    expect(deriveImprovementType(tile, state)).toBeNull();
  });

  it('mountains without resource → null', () => {
    const state = createTestState();
    const tile = makeTile({ q: 0, r: 0 }, { feature: 'mountains' });
    expect(deriveImprovementType(tile, state)).toBeNull();
  });
});

// ── growthSystem emits pendingGrowthChoice on growth ─────────────────────────

describe('growthSystem — pendingGrowthChoice emission', () => {
  it('appends a pendingGrowthChoice when a city grows', () => {
    // Build a city that is at or over the growth threshold after 1 turn of yields.
    // getGrowthThreshold(1, 'antiquity') = 30. Territory yields ~9 food, surplus ~7.
    // Set food = 29 so that 29 + surplus (>= 1) crosses threshold = 30.
    const city = makeCity({ population: 1, food: 29 });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = growthSystem(state, { type: 'END_TURN' });

    // City should have grown
    expect(next.cities.get('c1')!.population).toBe(2);

    // Player should have a pendingGrowthChoice for this city
    const player = next.players.get('p1')!;
    const choices = player.pendingGrowthChoices ?? [];
    expect(choices.length).toBeGreaterThanOrEqual(1);
    const choice = choices.find(c => c.cityId === 'c1');
    expect(choice).toBeDefined();
    expect(choice!.cityId).toBe('c1');
    expect(choice!.triggeredOnTurn).toBe(1);
  });

  it('does NOT emit pendingGrowthChoice when city does not grow', () => {
    // food = 0, surplus ~7 → far below threshold (30) → no growth
    const city = makeCity({ population: 1, food: 0 });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = growthSystem(state, { type: 'END_TURN' });

    expect(next.cities.get('c1')!.population).toBe(1);
    const player = next.players.get('p1')!;
    const choices = player.pendingGrowthChoices ?? [];
    expect(choices.filter(c => c.cityId === 'c1').length).toBe(0);
  });

  it('accumulates pendingGrowthChoices across turns', () => {
    // First growth event: threshold pop1 antiquity = 30; set food = 29 so surplus crosses it.
    const city = makeCity({ population: 1, food: 29 });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next1 = growthSystem(state, { type: 'END_TURN' });
    const choices1 = next1.players.get('p1')!.pendingGrowthChoices ?? [];
    expect(choices1.length).toBeGreaterThanOrEqual(1);
    // City must have grown on turn 1
    expect(next1.cities.get('c1')!.population).toBe(2);

    // Do NOT resolve the choice. Simulate another growth event turn.
    // Use a very large food value (1000) to ensure the second growth triggers
    // regardless of exact yield calculation.
    const cityAfterGrowth = next1.cities.get('c1')!;
    const cityAtThreshold = { ...cityAfterGrowth, food: 1000 };
    const state2 = { ...next1, cities: new Map([['c1', cityAtThreshold]]) };
    const next2 = growthSystem(state2, { type: 'END_TURN' });

    // City must have grown on turn 2 as well
    expect(next2.cities.get('c1')!.population).toBe(3);

    const choices2 = next2.players.get('p1')!.pendingGrowthChoices ?? [];
    // Should have 2 pending choices (one from each growth event)
    const c1Choices = choices2.filter(c => c.cityId === 'c1');
    expect(c1Choices.length).toBe(2);
  });
});

// ── PLACE_IMPROVEMENT handler ─────────────────────────────────────────────────

describe('improvementSystem — PLACE_IMPROVEMENT', () => {
  it('places the game-derived improvement type on a grassland tile', () => {
    const tileCoord: HexCoord = { q: 4, r: 3 };
    const city = makeCity({ territory: [coordToKey({ q: 3, r: 3 }), coordToKey(tileCoord)] });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = improvementSystem(state, {
      type: 'PLACE_IMPROVEMENT',
      cityId: 'c1',
      tile: tileCoord,
    });

    const tileKey = coordToKey(tileCoord);
    expect(next.map.tiles.get(tileKey)!.improvement).toBe('farm');
  });

  it('clears the pendingGrowthChoice for the city after placement', () => {
    const tileCoord: HexCoord = { q: 4, r: 3 };
    const city = makeCity({ territory: [coordToKey({ q: 3, r: 3 }), coordToKey(tileCoord)] });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = improvementSystem(state, {
      type: 'PLACE_IMPROVEMENT',
      cityId: 'c1',
      tile: tileCoord,
    });

    const choices = next.players.get('p1')!.pendingGrowthChoices ?? [];
    expect(choices.filter(c => c.cityId === 'c1').length).toBe(0);
  });

  it('only clears the matching city, not other cities pending choices', () => {
    const tileCoord: HexCoord = { q: 4, r: 3 };
    const city = makeCity({ territory: [coordToKey({ q: 3, r: 3 }), coordToKey(tileCoord)] });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [
        { cityId: 'c1', triggeredOnTurn: 1 },
        { cityId: 'c2', triggeredOnTurn: 1 },
      ],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = improvementSystem(state, {
      type: 'PLACE_IMPROVEMENT',
      cityId: 'c1',
      tile: tileCoord,
    });

    const choices = next.players.get('p1')!.pendingGrowthChoices ?? [];
    // c1 cleared, c2 remains
    expect(choices.filter(c => c.cityId === 'c1').length).toBe(0);
    expect(choices.filter(c => c.cityId === 'c2').length).toBe(1);
  });

  it('clears only one pending growth choice for the city per placement', () => {
    const tileCoord: HexCoord = { q: 4, r: 3 };
    const city = makeCity({ territory: [coordToKey({ q: 3, r: 3 }), coordToKey(tileCoord)] });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [
        { cityId: 'c1', triggeredOnTurn: 1 },
        { cityId: 'c1', triggeredOnTurn: 2 },
      ],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = improvementSystem(state, {
      type: 'PLACE_IMPROVEMENT',
      cityId: 'c1',
      tile: tileCoord,
    });

    const choices = next.players.get('p1')!.pendingGrowthChoices ?? [];
    expect(choices.filter(c => c.cityId === 'c1')).toHaveLength(1);
    expect(choices[0].triggeredOnTurn).toBe(2);
  });

  it('no-ops when city does not exist', () => {
    const state = createTestState();
    const next = improvementSystem(state, {
      type: 'PLACE_IMPROVEMENT',
      cityId: 'nonexistent',
      tile: { q: 0, r: 0 },
    });
    expect(next).toBe(state);
  });

  it('no-ops when tile already has an improvement', () => {
    const tileCoord: HexCoord = { q: 4, r: 3 };
    // Mutate tile to have improvement pre-set
    const tiles = new Map(createTestState().map.tiles);
    const key = coordToKey(tileCoord);
    const existing = tiles.get(key)!;
    tiles.set(key, { ...existing, improvement: 'mine' });

    const city = makeCity({ territory: [key] });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
      map: { width: 10, height: 10, tiles, wrapX: false },
    });

    const next = improvementSystem(state, {
      type: 'PLACE_IMPROVEMENT',
      cityId: 'c1',
      tile: tileCoord,
    });

    expect(next).toBe(state);
  });

  it('no-ops when terrain is not improvable (desert)', () => {
    const tileCoord: HexCoord = { q: 4, r: 3 };
    const tiles = new Map(createTestState().map.tiles);
    const key = coordToKey(tileCoord);
    const existing = tiles.get(key)!;
    tiles.set(key, { ...existing, terrain: 'desert', resource: null });

    const city = makeCity({ territory: [key] });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
      map: { width: 10, height: 10, tiles, wrapX: false },
    });

    const next = improvementSystem(state, {
      type: 'PLACE_IMPROVEMENT',
      cityId: 'c1',
      tile: tileCoord,
    });

    expect(next).toBe(state);
    // Pending choice remains unresolved
    const choices = next.players.get('p1')!.pendingGrowthChoices ?? [];
    expect(choices.filter(c => c.cityId === 'c1').length).toBe(1);
  });

  it('adds a log entry on successful placement', () => {
    const tileCoord: HexCoord = { q: 4, r: 3 };
    const city = makeCity({ territory: [coordToKey({ q: 3, r: 3 }), coordToKey(tileCoord)] });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = improvementSystem(state, {
      type: 'PLACE_IMPROVEMENT',
      cityId: 'c1',
      tile: tileCoord,
    });

    expect(next.log.length).toBe(1);
    expect(next.log[0].type).toBe('production');
  });
});

// ── ASSIGN_SPECIALIST_FROM_GROWTH ─────────────────────────────────────────────

describe('specialistSystem — ASSIGN_SPECIALIST_FROM_GROWTH', () => {
  it('increments city specialists on growth-triggered assignment', () => {
    const city = makeCity({ population: 3, specialists: 0 });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = specialistSystem(state, {
      type: 'ASSIGN_SPECIALIST_FROM_GROWTH',
      cityId: 'c1',
    });

    expect(next.cities.get('c1')!.specialists).toBe(1);
  });

  it('clears the pendingGrowthChoice for the city', () => {
    const city = makeCity({ population: 3, specialists: 0 });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = specialistSystem(state, {
      type: 'ASSIGN_SPECIALIST_FROM_GROWTH',
      cityId: 'c1',
    });

    const choices = next.players.get('p1')!.pendingGrowthChoices ?? [];
    expect(choices.filter(c => c.cityId === 'c1').length).toBe(0);
  });

  it('clears only one pending growth choice for the city per specialist assignment', () => {
    const city = makeCity({ population: 4, specialists: 0 });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [
        { cityId: 'c1', triggeredOnTurn: 1 },
        { cityId: 'c1', triggeredOnTurn: 2 },
      ],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = specialistSystem(state, {
      type: 'ASSIGN_SPECIALIST_FROM_GROWTH',
      cityId: 'c1',
    });

    expect(next.cities.get('c1')!.specialists).toBe(1);
    const choices = next.players.get('p1')!.pendingGrowthChoices ?? [];
    expect(choices.filter(c => c.cityId === 'c1')).toHaveLength(1);
    expect(choices[0].triggeredOnTurn).toBe(2);
  });

  it('respects the specialists cap (max = population - 1)', () => {
    // population 2, specialists already 1 → cap reached
    const city = makeCity({ population: 2, specialists: 1 });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = specialistSystem(state, {
      type: 'ASSIGN_SPECIALIST_FROM_GROWTH',
      cityId: 'c1',
    });

    // At cap — no change
    expect(next).toBe(state);
    expect(next.cities.get('c1')!.specialists).toBe(1);
  });

  it('requires a pending growth choice', () => {
    const city = makeCity({ population: 3, specialists: 0 });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = specialistSystem(state, {
      type: 'ASSIGN_SPECIALIST_FROM_GROWTH',
      cityId: 'c1',
    });

    expect(next).toBe(state);
    expect(next.cities.get('c1')!.specialists).toBe(0);
  });

  it('rejects town growth-specialist assignment', () => {
    const city = makeCity({ population: 3, specialists: 0, settlementType: 'town' });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = specialistSystem(state, {
      type: 'ASSIGN_SPECIALIST_FROM_GROWTH',
      cityId: 'c1',
    });

    expect(next).toBe(state);
    expect(next.cities.get('c1')!.specialists).toBe(0);
    expect(next.players.get('p1')!.pendingGrowthChoices).toHaveLength(1);
  });

  it('adds a log entry on successful assignment', () => {
    const city = makeCity({ population: 3, specialists: 0 });
    const player = createTestPlayer({
      id: 'p1',
      pendingGrowthChoices: [{ cityId: 'c1', triggeredOnTurn: 1 }],
    });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', player]]),
    });

    const next = specialistSystem(state, {
      type: 'ASSIGN_SPECIALIST_FROM_GROWTH',
      cityId: 'c1',
    });

    expect(next.log.length).toBe(1);
    expect(next.log[0].type).toBe('city');
    expect(next.log[0].message).toContain('growth resolved via specialist');
  });

  it('no-ops when city does not exist', () => {
    const state = createTestState();
    const next = specialistSystem(state, {
      type: 'ASSIGN_SPECIALIST_FROM_GROWTH',
      cityId: 'nonexistent',
    });
    expect(next).toBe(state);
  });
});
