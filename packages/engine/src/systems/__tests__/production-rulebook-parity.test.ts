import { describe, it, expect } from 'vitest';
import { productionSystem } from '../productionSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState, GameState, HexTile } from '../../types/GameState';
import type { TerrainId } from '../../types/Terrain';
import { coordToKey } from '../../hex/HexMath';

/**
 * Rulebook §5 parity audit — each test asserts ONE specific rule from
 * civ7-rulebook.md §5 (Production).
 *
 * Tests that use `it.fails(...)` are intentional: they document bugs in
 * productionSystem vs the Civ VII rulebook. Failure messages are prefixed
 * with a rule code (R51–R54) so the follow-up implementation cycle knows
 * exactly which rule is broken.
 *
 * Relevant rulebook points covered:
 *   §5.1 Base Mechanics — production accumulates, applied to current queue item.
 *   §5.2 Overflow       — excess production carries to the next queue item.
 *   §5.3 Rush Buying    — ≈4× production cost; items in Towns only purchasable;
 *                         Wonders cannot be gold-purchased (§19.3).
 *   §5.4 Bonuses        — Barracks +10% Land Units; Workshop +10% non-wonder
 *                         Buildings (code labels its Workshop bonus as
 *                         toward "all buildings"; rulebook scopes it to
 *                         non-wonders). Bonuses stack additively.
 *
 * Reference map (from helpers.createFlatMap): all tiles are grassland
 * (food: 3, prod: 0). Default `createTestCity` territory is 5 grassland
 * tiles → base yields: food 17, production 1/turn (+1 from city center).
 */

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
    territory: [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
      coordToKey({ q: 2, r: 4 }),
      coordToKey({ q: 2, r: 3 }),
    ],
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

/** Replace every tile in the map with the given terrain. Used to fabricate
 *  high-production scenarios (plains = 1 prod/tile). */
function mapWithTerrain(state: GameState, terrain: TerrainId): GameState {
  const newTiles = new Map<string, HexTile>();
  for (const [key, tile] of state.map.tiles) {
    newTiles.set(key, { ...tile, terrain });
  }
  return { ...state, map: { ...state.map, tiles: newTiles } };
}

// ── §5.1 Base Mechanics — production accumulates turn by turn ──

describe('R51: Base Mechanics — production accumulates until cost met, then completes', () => {
  it('accumulates production each END_TURN by the same per-turn amount while below cost', () => {
    // Warrior cost = 30. Base city on flat grassland: some positive prod/turn.
    const city = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: 0,
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const afterT1 = productionSystem(state, { type: 'END_TURN' });
    const prodPerTurn = afterT1.cities.get('c1')!.productionProgress;
    expect(prodPerTurn).toBeGreaterThan(0);
    expect(afterT1.cities.get('c1')!.productionQueue).toHaveLength(1);

    const afterT2 = productionSystem(afterT1, { type: 'END_TURN' });
    expect(afterT2.cities.get('c1')!.productionProgress).toBe(prodPerTurn * 2);
    expect(afterT2.cities.get('c1')!.productionQueue).toHaveLength(1);
  });

  it('completes the queued warrior (cost 30) when accumulated production meets cost', () => {
    // Pre-seed progress so any positive prod/turn tips it over 30 this turn.
    const city = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: 29,
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = productionSystem(state, { type: 'END_TURN' });

    const warriors = [...next.units.values()].filter(u => u.typeId === 'warrior');
    expect(warriors).toHaveLength(1);
    expect(next.cities.get('c1')!.productionQueue).toHaveLength(0);
  });

  it('town with settlementType="town" does NOT accumulate queue production', () => {
    const town = createTestCity({
      settlementType: 'town',
      happiness: 5,
      isCapital: false,
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: 10,
    });
    const state = createTestState({ cities: new Map([['c1', town]]) });
    const next = productionSystem(state, { type: 'END_TURN' });
    expect(next.cities.get('c1')!.productionProgress).toBe(10);
  });
});

// ── §5.2 Production Overflow ──

describe('R52: Production Overflow — excess production carries to next queue item', () => {
  it('overflow from completed warrior carries to the next queue entry', () => {
    // First measure this city's production-per-turn from an empty-queue END_TURN.
    const probe = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: 0,
    });
    const probeState = createTestState({ cities: new Map([['c1', probe]]) });
    const perTurn = productionSystem(probeState, { type: 'END_TURN' })
      .cities.get('c1')!.productionProgress;
    expect(perTurn).toBeGreaterThan(0);

    // Preload progress so that (35 + perTurn) > 30 with overflow = 5 + perTurn.
    const city = createTestCity({
      productionQueue: [
        { type: 'unit', id: 'warrior' },   // cost 30
        { type: 'unit', id: 'warrior' },   // next
      ],
      productionProgress: 35,
    });
    const base = createTestState({ cities: new Map([['c1', city]]) });
    const next = productionSystem(base, { type: 'END_TURN' });
    const after = next.cities.get('c1')!;

    // First warrior completed → produced 1 unit
    expect([...next.units.values()].filter(u => u.typeId === 'warrior')).toHaveLength(1);
    // Queue advanced to second warrior
    expect(after.productionQueue).toEqual([{ type: 'unit', id: 'warrior' }]);
    // Overflow = (35 + perTurn) - 30
    expect(after.productionProgress).toBe(35 + perTurn - 30);
  });

  it('exact-match completion leaves 0 overflow for the next item', () => {
    // Pick a starting progress equal to (cost - perTurn) so overflow is exactly 0.
    const probe = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: 0,
    });
    const probeState = createTestState({ cities: new Map([['c1', probe]]) });
    const perTurn = productionSystem(probeState, { type: 'END_TURN' })
      .cities.get('c1')!.productionProgress;

    const city = createTestCity({
      productionQueue: [
        { type: 'unit', id: 'warrior' },   // cost 30
        { type: 'unit', id: 'warrior' },
      ],
      productionProgress: 30 - perTurn,    // + perTurn → exactly 30, overflow = 0
    });
    const base = createTestState({ cities: new Map([['c1', city]]) });
    const next = productionSystem(base, { type: 'END_TURN' });
    expect(next.cities.get('c1')!.productionProgress).toBe(0);
    expect(next.cities.get('c1')!.productionQueue).toHaveLength(1);
  });
});

// ── §5.3 Rush Buying ──

describe('R53: Rush Buy — ≈4× production cost in gold', () => {
  it('warrior (cost 30) rush-buys for 120 gold (exactly 4×, within ±10%)', () => {
    const city = createTestCity({ settlementType: 'town', happiness: 5, isCapital: false });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ gold: 500 })]]),
    });
    const next = productionSystem(state, {
      type: 'PURCHASE_ITEM',
      cityId: 'c1',
      itemId: 'warrior',
      itemType: 'unit',
    });
    const spent = 500 - next.players.get('p1')!.gold;
    // Rulebook says "approximately 4x" — accept ±10% band around 120.
    expect(spent).toBeGreaterThanOrEqual(108);
    expect(spent).toBeLessThanOrEqual(132);
    // Unit instantly added (no production delay — §5.3)
    expect([...next.units.values()].filter(u => u.typeId === 'warrior')).toHaveLength(1);
  });

  it('granary (cost 55) rush-buys for ~220 gold (±10% band)', () => {
    const city = createTestCity({ settlementType: 'town', happiness: 5, isCapital: false });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ gold: 500 })]]),
    });
    const next = productionSystem(state, {
      type: 'PURCHASE_ITEM',
      cityId: 'c1',
      itemId: 'granary',
      itemType: 'building',
    });
    const spent = 500 - next.players.get('p1')!.gold;
    expect(spent).toBeGreaterThanOrEqual(198);
    expect(spent).toBeLessThanOrEqual(242);
    // Building immediately added to city (no production delay — §5.3)
    expect(next.cities.get('c1')!.buildings).toContain('granary');
  });

  it.fails('R53-A: rush-buying a Wonder is rejected (rulebook §19.3: no gold purchase of wonders)', () => {
    // Pyramids is a wonder (isWonder: true). Under §19.3, wonders can ONLY be
    // completed via production — never by gold purchase. Engine currently
    // allows PURCHASE_ITEM for wonders, which is a bug.
    const city = createTestCity();
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ gold: 5000 })]]),
    });
    const next = productionSystem(state, {
      type: 'PURCHASE_ITEM',
      cityId: 'c1',
      itemId: 'pyramids',
      itemType: 'building',
    });
    // Expected: validation error, gold unchanged, wonder NOT added.
    expect(next.lastValidation?.valid).toBe(false);
    expect(next.players.get('p1')!.gold).toBe(5000);
    expect(next.cities.get('c1')!.buildings).not.toContain('pyramids');
    expect(next.builtWonders).not.toContain('pyramids');
  });

  it.fails('R53-B: rush-buying a Settler is rejected (rulebook §5.3 — settlers cannot be purchased)', () => {
    // Settlers historically cannot be gold-purchased in Civ VII — they must be
    // produced. Engine currently allows PURCHASE_ITEM for any unit.
    const city = createTestCity();
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ gold: 1000 })]]),
    });
    const next = productionSystem(state, {
      type: 'PURCHASE_ITEM',
      cityId: 'c1',
      itemId: 'settler',
      itemType: 'unit',
    });
    expect(next.lastValidation?.valid).toBe(false);
    expect(next.players.get('p1')!.gold).toBe(1000);
    expect([...next.units.values()].filter(u => u.typeId === 'settler')).toHaveLength(0);
  });

  it('purchased building enters city buildings immediately with no production progress required', () => {
    // Rulebook §5.3 — gold purchase completes the item instantly (no queue wait).
    const city = createTestCity({ productionProgress: 0, productionQueue: [] });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ gold: 500 })]]),
    });
    const next = productionSystem(state, {
      type: 'PURCHASE_ITEM',
      cityId: 'c1',
      itemId: 'granary',
      itemType: 'building',
    });
    // Queue did not advance; no accumulated progress; building present.
    expect(next.cities.get('c1')!.buildings).toContain('granary');
    expect(next.cities.get('c1')!.productionProgress).toBe(0);
    expect(next.cities.get('c1')!.productionQueue).toHaveLength(0);
  });
});

// ── §5.4 Production Bonuses ──

describe('R54: Production Bonuses — buildings add % bonuses to specific item classes', () => {
  it('Barracks grants +10% production toward military land units (warrior)', () => {
    // Use a big-cost item (pyramids, cost 400) so the item does NOT complete
    // this turn — we want to read the per-turn accumulated progress directly.
    const state0 = createTestState();
    const tileKeys = [...state0.map.tiles.keys()].slice(0, 30);

    const cityNoBarracks = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: -500, // preload so completion is impossible this turn
      territory: tileKeys,
      buildings: [],
    });
    const cityWithBarracks = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: -500,
      territory: tileKeys,
      buildings: ['barracks'],
    });
    const plainsMap = mapWithTerrain(
      createTestState({ cities: new Map([['c1', cityNoBarracks]]) }),
      'plains',
    );
    const withBarracksState = mapWithTerrain(
      createTestState({ cities: new Map([['c1', cityWithBarracks]]) }),
      'plains',
    );

    const baseAfter = productionSystem(plainsMap, { type: 'END_TURN' })
      .cities.get('c1')!;
    const boostedAfter = productionSystem(withBarracksState, { type: 'END_TURN' })
      .cities.get('c1')!;
    // Neither should complete (warriors not produced this turn).
    expect(baseAfter.productionQueue).toHaveLength(1);
    expect(boostedAfter.productionQueue).toHaveLength(1);

    const basePerTurn = baseAfter.productionProgress - (-500);
    const boostedPerTurn = boostedAfter.productionProgress - (-500);
    // F-02: building yields are included in YieldCalculator, so the boosted city
    // has higher base production from the barracks' own yield (+2). The 10%
    // bonus applies to (basePerTurn + barracksYield), not just basePerTurn.
    const barracksProd = withBarracksState.config.buildings.get('barracks')?.yields.production ?? 0;
    expect(basePerTurn).toBeGreaterThanOrEqual(10);
    expect(boostedPerTurn).toBeGreaterThan(basePerTurn);
    expect(boostedPerTurn).toBe(Math.floor((basePerTurn + barracksProd) * 1.1));
  });

  it('Barracks does NOT apply its bonus to civilian units (e.g. settler)', () => {
    const state0 = createTestState();
    const tileKeys = [...state0.map.tiles.keys()].slice(0, 30);

    const cityBarracks = createTestCity({
      productionQueue: [{ type: 'unit', id: 'settler' }],
      productionProgress: -500,
      territory: tileKeys,
      buildings: ['barracks'],
    });
    const cityNone = createTestCity({
      productionQueue: [{ type: 'unit', id: 'settler' }],
      productionProgress: -500,
      territory: tileKeys,
      buildings: [],
    });
    const stA = mapWithTerrain(createTestState({ cities: new Map([['c1', cityBarracks]]) }), 'plains');
    const stB = mapWithTerrain(createTestState({ cities: new Map([['c1', cityNone]]) }), 'plains');

    const a = productionSystem(stA, { type: 'END_TURN' }).cities.get('c1')!;
    const b = productionSystem(stB, { type: 'END_TURN' }).cities.get('c1')!;
    expect(a.productionQueue).toHaveLength(1);
    expect(b.productionQueue).toHaveLength(1);
    // F-02: barracks contributes its own production yield to the base, so the
    // two cities differ by exactly the building's yield — NOT by the 10% bonus.
    const barracksProd = stA.config.buildings.get('barracks')?.yields.production ?? 0;
    expect(a.productionProgress - b.productionProgress).toBe(barracksProd);
  });

  it('Workshop grants +10% production toward buildings', () => {
    const state0 = createTestState();
    const tileKeys = [...state0.map.tiles.keys()].slice(0, 30);

    const cityWithWorkshop = createTestCity({
      productionQueue: [{ type: 'building', id: 'granary' }],
      productionProgress: -500,
      territory: tileKeys,
      buildings: ['workshop'],
    });
    const cityNoWorkshop = createTestCity({
      productionQueue: [{ type: 'building', id: 'granary' }],
      productionProgress: -500,
      territory: tileKeys,
      buildings: [],
    });
    const stA = mapWithTerrain(createTestState({ cities: new Map([['c1', cityWithWorkshop]]) }), 'plains');
    const stB = mapWithTerrain(createTestState({ cities: new Map([['c1', cityNoWorkshop]]) }), 'plains');

    const a = productionSystem(stA, { type: 'END_TURN' }).cities.get('c1')!;
    const b = productionSystem(stB, { type: 'END_TURN' }).cities.get('c1')!;
    expect(a.productionQueue).toHaveLength(1);
    expect(b.productionQueue).toHaveLength(1);
    const basePerTurn = b.productionProgress - (-500);
    const boostedPerTurn = a.productionProgress - (-500);
    // F-02: workshop yields (+3 production) are included in YieldCalculator,
    // so the boosted city has higher base. The 10% bonus applies to
    // (basePerTurn + workshopYield), not just basePerTurn.
    const workshopProd = stA.config.buildings.get('workshop')?.yields.production ?? 0;
    expect(basePerTurn).toBeGreaterThanOrEqual(10);
    expect(boostedPerTurn).toBeGreaterThan(basePerTurn);
    expect(boostedPerTurn).toBe(Math.floor((basePerTurn + workshopProd) * 1.1));
  });

  it.fails('R54-A: Workshop bonus does NOT apply to Wonders (rulebook §5.4 — Amphitheatre/Kiln is the wonder-bonus building)', () => {
    // Per §5.4, the Workshop bonus is scoped to "non-wonder buildings". Only
    // Amphitheatre/Kiln grants +10% toward Wonders. Engine currently applies
    // the Workshop multiplier to any `building` queue item, wonder included.
    const state0 = createTestState();
    const tileKeys = [...state0.map.tiles.keys()].slice(0, 30);

    const cityWorkshopWonder = createTestCity({
      productionQueue: [{ type: 'building', id: 'pyramids' }],
      productionProgress: -500,
      territory: tileKeys,
      buildings: ['workshop'],
    });
    const cityNoWorkshopWonder = createTestCity({
      productionQueue: [{ type: 'building', id: 'pyramids' }],
      productionProgress: -500,
      territory: tileKeys,
      buildings: [],
    });
    const stA = mapWithTerrain(createTestState({ cities: new Map([['c1', cityWorkshopWonder]]) }), 'plains');
    const stB = mapWithTerrain(createTestState({ cities: new Map([['c1', cityNoWorkshopWonder]]) }), 'plains');

    const a = productionSystem(stA, { type: 'END_TURN' }).cities.get('c1')!;
    const b = productionSystem(stB, { type: 'END_TURN' }).cities.get('c1')!;
    // Expected (per rulebook): Workshop does NOT boost Wonder production.
    expect(a.productionProgress).toBe(b.productionProgress);
  });

  it('Bonuses stack (Barracks +10% on military × celebration bonus) yielding strictly more than either alone', () => {
    // Player on celebration with +10 celebrationBonus (% toward everything).
    // Combined with Barracks +10% on a warrior. Rulebook does not explicitly
    // say additive vs multiplicative for celebration stacking, so we assert
    // the weakest rulebook-consistent property: combined > either-alone.
    const state0 = createTestState();
    const tileKeys = [...state0.map.tiles.keys()].slice(0, 30);

    const bothBonuses = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: -500,
      territory: tileKeys,
      buildings: ['barracks'],
    });
    const celebratingPlayer = createTestPlayer({
      id: 'p1',
      gold: 0,
      celebrationBonus: 10,
      celebrationTurnsLeft: 5,
      celebrationCount: 1,
    });
    const barracksOnlyCity = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: -500,
      territory: tileKeys,
      buildings: ['barracks'],
    });
    const celebrationOnlyCity = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: -500,
      territory: tileKeys,
      buildings: [],
    });

    const stBoth = mapWithTerrain(
      createTestState({
        cities: new Map([['c1', bothBonuses]]),
        players: new Map([['p1', celebratingPlayer]]),
      }),
      'plains',
    );
    const stBarracksOnly = mapWithTerrain(
      createTestState({ cities: new Map([['c1', barracksOnlyCity]]) }),
      'plains',
    );
    const stCelebOnly = mapWithTerrain(
      createTestState({
        cities: new Map([['c1', celebrationOnlyCity]]),
        players: new Map([['p1', celebratingPlayer]]),
      }),
      'plains',
    );

    const bothPerTurn = productionSystem(stBoth, { type: 'END_TURN' })
      .cities.get('c1')!.productionProgress;
    const barracksPerTurn = productionSystem(stBarracksOnly, { type: 'END_TURN' })
      .cities.get('c1')!.productionProgress;
    const celebPerTurn = productionSystem(stCelebOnly, { type: 'END_TURN' })
      .cities.get('c1')!.productionProgress;

    // Combined bonus must strictly exceed either bonus applied alone.
    expect(bothPerTurn).toBeGreaterThan(barracksPerTurn);
    expect(bothPerTurn).toBeGreaterThan(celebPerTurn);
  });

  it('applies structured celebration production bonus only to matching production targets', () => {
    const state0 = createTestState();
    const tileKeys = [...state0.map.tiles.keys()].slice(0, 30);
    const player = createTestPlayer({
      id: 'p1',
      activeCelebrationBonus: {
        governmentId: 'revolucion',
        bonusId: 'revolucion-science-military',
        turnsRemaining: 5,
        effects: [
          { type: 'MODIFY_PRODUCTION_PERCENT', target: { kind: 'militaryUnit' }, percent: 40 },
        ],
      },
    });

    const militaryCity = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: -500,
      territory: tileKeys,
    });
    const buildingCity = createTestCity({
      productionQueue: [{ type: 'building', id: 'granary' }],
      productionProgress: -500,
      territory: tileKeys,
    });

    const militaryState = mapWithTerrain(createTestState({
      cities: new Map([['c1', militaryCity]]),
      players: new Map([['p1', player]]),
    }), 'plains');
    const buildingState = mapWithTerrain(createTestState({
      cities: new Map([['c1', buildingCity]]),
      players: new Map([['p1', player]]),
    }), 'plains');

    const militaryProgress = productionSystem(militaryState, { type: 'END_TURN' })
      .cities.get('c1')!.productionProgress;
    const buildingProgress = productionSystem(buildingState, { type: 'END_TURN' })
      .cities.get('c1')!.productionProgress;

    expect(militaryProgress).toBeGreaterThan(buildingProgress);
  });
});
