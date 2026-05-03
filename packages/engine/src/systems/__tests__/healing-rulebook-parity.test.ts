import { describe, it, expect } from 'vitest';
import { turnSystem } from '../turnSystem';
import { createTestState, createTestUnit, createTestPlayer } from './helpers';
import { coordToKey } from '../../hex/HexMath';
import type {
  CityState,
  DiplomacyRelation,
  GameState,
  PlayerState,
  UnitState,
} from '../../types/GameState';
import type { CommanderState } from '../../types/Commander';

/**
 * Rulebook §6.9 parity audit — Healing Rates.
 *
 * Rulebook §6.9 (civ7-rulebook.md lines 321–334) specifies per-turn healing:
 *
 *   | Location                     | HP per Turn |
 *   |------------------------------|-------------|
 *   | Own City or Town             | 20 HP       |
 *   | Friendly / Allied territory  | 15 HP       |
 *   | Neutral territory            | 10 HP       |
 *   | Enemy territory              |  5 HP       |
 *
 *   Boosting healing:
 *     - Fort Town specialization: +5 HP/turn on tiles.
 *     - God of Healing Pantheon: bonus on Rural tiles.
 *     - Commander Logistics tree (Field Medic): bonus in non-friendly territory.
 *     - Partisan unique unit: +10 healing.
 *
 * Implicit per the Civ VII ruleset and surrounding engine code: a unit that
 * consumed all its movement last turn (treated as "acted this turn" — moved
 * to exhaustion and/or attacked) does NOT heal. The current engine uses the
 * heuristic `movementLeft === 0` at the START_TURN refresh boundary.
 *
 * Each test asserts ONE rule from §6.9 against the live `turnSystem` at
 * START_TURN. Rule codes (H1–Hn) are searchable and named in any `it.fails`
 * descriptions so the follow-up fix cycle can locate them quickly.
 *
 * Pattern mirrors M14 combat-rulebook-parity + M23 zoc-rulebook-parity.
 */

// ── Shared builders ────────────────────────────────────────────────────────

function createCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Capital',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 3,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [
      coordToKey({ q: 3, r: 3 }),
      coordToKey({ q: 4, r: 3 }),
      coordToKey({ q: 3, r: 4 }),
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

function makeWarRelation(overrides: Partial<DiplomacyRelation> = {}): DiplomacyRelation {
  return {
    status: 'war',
    relationship: -50,
    warSupport: 0,
    turnsAtPeace: 0,
    turnsAtWar: 3,
    hasAlliance: false,
    hasFriendship: false,
    hasDenounced: false,
    warDeclarer: 'p1',
    isSurpriseWar: false,
    activeEndeavors: [],
    activeSanctions: [],
    ...overrides,
  };
}

function makeCommanderState(overrides: Partial<CommanderState> = {}): CommanderState {
  return {
    unitId: 'cmd1',
    xp: 0,
    commanderLevel: 1,
    unspentPromotionPicks: 0,
    promotions: ['logistics_field_medic'],
    tree: null,
    attachedUnits: [],
    packed: false,
    ...overrides,
  };
}

function buildTurnState(args: {
  cities?: ReadonlyMap<string, CityState>;
  diplomacy?: GameState['diplomacy'];
  commanders?: ReadonlyMap<string, CommanderState>;
  units: ReadonlyMap<string, UnitState>;
}): GameState {
  return buildState({
    units: args.units,
    cities: args.cities,
    diplomacy: args.diplomacy ?? { relations: new Map() },
    commanders: args.commanders,
  });
}

/**
 * Build a minimal two-player state where `p1` is the current player. Any
 * `cities` / `units` / `diplomacy` supplied replace the defaults wholesale.
 */
function buildState(opts: {
  readonly units: ReadonlyMap<string, UnitState>;
  readonly cities?: ReadonlyMap<string, CityState>;
  readonly diplomacy?: GameState['diplomacy'];
  readonly players?: ReadonlyMap<string, PlayerState>;
  readonly commanders?: ReadonlyMap<string, CommanderState>;
}): GameState {
  const players: ReadonlyMap<string, PlayerState> =
    opts.players ??
    new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
  return createTestState({
    phase: 'start',
    currentPlayerId: 'p1',
    units: new Map(opts.units),
    cities: opts.cities ? new Map(opts.cities) : new Map(),
    diplomacy: opts.diplomacy ?? { relations: new Map() },
    commanders: opts.commanders,
    players: new Map(players),
  });
}

// ── H1: Own City/Town heals 20 HP/turn (§6.9 row 1) ─────────────────────────

describe('H1: unit in own city/town heals 20 HP/turn (§6.9 row 1)', () => {
  it('unit at 80 HP on its own city tile heals to 100 (capped at full)', () => {
    // 80 + 20 = 100, exactly at the cap. Confirms the +20 tier AND the cap.
    const city = createCity({ position: { q: 3, r: 3 } });
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 3, r: 3 },
        health: 80, movementLeft: 1,
      })],
    ]);
    const state = buildState({ units, cities: new Map([['c1', city]]) });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(100);
  });

  it('unit at 50 HP on own city tile heals to 70 (+20)', () => {
    const city = createCity({ position: { q: 3, r: 3 } });
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 3, r: 3 },
        health: 50, movementLeft: 1,
      })],
    ]);
    const state = buildState({ units, cities: new Map([['c1', city]]) });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(70);
  });
});

// ── H2: Friendly territory heals 15 HP/turn (§6.9 row 2) ───────────────────

describe('H2: unit in own friendly territory heals 15 HP/turn (§6.9 row 2)', () => {
  it('unit at 50 HP in friendly territory heals to 65 (+15)', () => {
    // Unit is on (4,3), inside city territory but NOT on the city tile itself.
    const city = createCity({ position: { q: 3, r: 3 } });
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 4, r: 3 },
        health: 50, movementLeft: 1,
      })],
    ]);
    const state = buildState({ units, cities: new Map([['c1', city]]) });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(65);
  });

  it('friendly territory healing is strictly less than own-city healing', () => {
    // Parallel runs, same starting HP, different location classification.
    const city = createCity({ position: { q: 3, r: 3 } });
    const unitInCity = createTestUnit({
      id: 'uC', owner: 'p1',
      position: { q: 3, r: 3 },
      health: 50, movementLeft: 1,
    });
    const unitInTerritory = createTestUnit({
      id: 'uT', owner: 'p1',
      position: { q: 4, r: 3 },
      health: 50, movementLeft: 1,
    });
    const state = buildState({
      units: new Map([['uC', unitInCity], ['uT', unitInTerritory]]),
      cities: new Map([['c1', city]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    const healInCity = next.units.get('uC')!.health - 50;
    const healInTerritory = next.units.get('uT')!.health - 50;
    expect(healInCity).toBe(20);
    expect(healInTerritory).toBe(15);
    expect(healInCity).toBeGreaterThan(healInTerritory);
  });
});

// ── H3: Neutral territory heals 10 HP/turn (§6.9 row 3) ────────────────────

describe('H3: unit in neutral territory heals 10 HP/turn (§6.9 row 3)', () => {
  it('unit at 50 HP with no owning city at its tile and no war heals to 60 (+10)', () => {
    // No cities at all → every tile is neutral per current engine semantics.
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 0, r: 0 },
        health: 50, movementLeft: 1,
      })],
    ]);
    const state = buildState({ units });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(60);
  });

  it('neutral healing is between enemy (5) and friendly (15) tiers', () => {
    // Sandwich invariant — confirms the tier ordering of §6.9.
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 0, r: 0 },
        health: 50, movementLeft: 1,
      })],
    ]);
    const state = buildState({ units });
    const next = turnSystem(state, { type: 'START_TURN' });
    const heal = next.units.get('u1')!.health - 50;
    expect(heal).toBeGreaterThan(5);
    expect(heal).toBeLessThan(15);
    expect(heal).toBe(10);
  });
});

// ── H4: Enemy territory heals 5 HP/turn (§6.9 row 4) ───────────────────────

describe('H4: unit in enemy territory heals 5 HP/turn (§6.9 row 4)', () => {
  it('unit at 50 HP inside a city owned by a player at war with owner heals to 55 (+5)', () => {
    // Enemy city of p2, at war with p1. p1 unit stands inside p2's territory.
    const enemyCity = createCity({
      id: 'ec1', name: 'EnemyBurg', owner: 'p2',
      position: { q: 7, r: 7 },
      territory: [coordToKey({ q: 7, r: 7 }), coordToKey({ q: 0, r: 0 })],
      isCapital: true,
    });
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 0, r: 0 },
        health: 50, movementLeft: 1,
      })],
    ]);
    const diplomacy: GameState['diplomacy'] = {
      relations: new Map([['p1:p2', makeWarRelation()]]),
    };
    const state = buildState({
      units,
      cities: new Map([['ec1', enemyCity]]),
      diplomacy,
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(55);
  });

  it('territory owned by a NON-war third party is treated as neutral (+10), not enemy (+5)', () => {
    // p2 city, p1 and p2 are NOT at war (no relation entry) → should be neutral.
    const p2City = createCity({
      id: 'c2', name: 'Athens', owner: 'p2',
      position: { q: 7, r: 7 },
      territory: [coordToKey({ q: 7, r: 7 }), coordToKey({ q: 0, r: 0 })],
      isCapital: true,
    });
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 0, r: 0 },
        health: 50, movementLeft: 1,
      })],
    ]);
    const state = buildState({
      units,
      cities: new Map([['c2', p2City]]),
      // No diplomacy relations → not at war.
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    // Per §6.9 the tiers are own / friendly / neutral / enemy. A non-owned
    // city's territory without a war relation is "neutral" to us.
    expect(next.units.get('u1')!.health).toBe(60);
  });
});

// ── H5: Full-HP units do NOT heal ──────────────────────────────────────────

describe('H5: full-HP unit does not gain HP beyond 100 in any territory tier', () => {
  it('unit at 100 HP in own city stays at 100', () => {
    const city = createCity({ position: { q: 3, r: 3 } });
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 3, r: 3 },
        health: 100, movementLeft: 1,
      })],
    ]);
    const state = buildState({ units, cities: new Map([['c1', city]]) });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(100);
  });

  it('unit at 100 HP in neutral territory stays at 100', () => {
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 0, r: 0 },
        health: 100, movementLeft: 1,
      })],
    ]);
    const state = buildState({ units });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(100);
  });
});

// ── H6: Multiple units heal independently ──────────────────────────────────

describe('H6: multiple units heal independently per their own location tier', () => {
  it('two p1 units at 50 HP — one in city, one in neutral — heal by 20 and 10 respectively', () => {
    const city = createCity({ position: { q: 3, r: 3 } });
    const units = new Map<string, UnitState>([
      ['uCity', createTestUnit({
        id: 'uCity', owner: 'p1',
        position: { q: 3, r: 3 },
        health: 50, movementLeft: 1,
      })],
      ['uNeutral', createTestUnit({
        id: 'uNeutral', owner: 'p1',
        position: { q: 0, r: 0 },
        health: 50, movementLeft: 1,
      })],
    ]);
    const state = buildState({ units, cities: new Map([['c1', city]]) });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('uCity')!.health).toBe(70);
    expect(next.units.get('uNeutral')!.health).toBe(60);
  });

  it('healing is not applied to units owned by the non-current player this turn', () => {
    // p2 unit at 50 HP in neutral — p1 is the current player, so p2 must NOT heal.
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 0, r: 0 },
        health: 50, movementLeft: 1,
      })],
      ['u2', createTestUnit({
        id: 'u2', owner: 'p2',
        position: { q: 5, r: 5 },
        health: 50, movementLeft: 1,
      })],
    ]);
    const state = buildState({ units });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(60); // p1 heals
    expect(next.units.get('u2')!.health).toBe(50); // p2 untouched
  });
});

// ── H7: Exhausted (acted this turn) units do NOT heal ──────────────────────

describe('H7: unit that spent all movement last turn does not heal (acted-this-turn proxy)', () => {
  it('unit at 50 HP with movementLeft=0 at START_TURN does not heal', () => {
    // Rulebook convention: a unit that attacked/moved-to-exhaustion does not
    // heal. The engine uses movementLeft===0 as its proxy.
    const units = new Map<string, UnitState>([
      ['u1', createTestUnit({
        id: 'u1', owner: 'p1',
        position: { q: 0, r: 0 },
        health: 50, movementLeft: 0,
      })],
    ]);
    const state = buildState({ units });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(50);
  });
});

// ── H8: Fort Town specialization — +5 HP on tiles (§6.9 "Boosting healing") ─

describe('H8: Fort Town specialization adds +5 HP/turn to units on its tiles', () => {
  // Rulebook §6.9: "Fort Town specialization: +5 HP/turn on tiles."
  // A friendly-territory tile in a Fort Town should therefore heal 15+5=20.
  // A city-center tile in a Fort Town should therefore heal 20+5=25, but
  // capped at 100 per the HP cap. We test the non-capped friendly case.
  it(
    'H8: unit at 50 HP on Fort-Town-specialized friendly territory heals +20 (= 15 base + 5 fort-town)',
    () => {
      const fortTown = createCity({
        id: 'cFT', name: 'Fortville', owner: 'p1',
        position: { q: 3, r: 3 },
        territory: [coordToKey({ q: 3, r: 3 }), coordToKey({ q: 4, r: 3 })],
        settlementType: 'town',
        specialization: 'fort_town',
      });
      const units = new Map<string, UnitState>([
        ['u1', createTestUnit({
          id: 'u1', owner: 'p1',
          position: { q: 4, r: 3 }, // friendly territory tile, not the center
          health: 50, movementLeft: 1,
        })],
      ]);
      const state = buildState({ units, cities: new Map([['cFT', fortTown]]) });
      const next = turnSystem(state, { type: 'START_TURN' });
      // 15 (friendly) + 5 (fort_town bonus) = +20 → 70 HP.
      expect(next.units.get('u1')!.health).toBe(70);
    },
  );
});

// ── H9: Partisan unique unit — +10 healing (§6.9 "Boosting healing") ───────

describe('H9: Partisan unique unit receives +10 healing', () => {
  // Rulebook §6.9: "Partisan unique unit: +10 healing." The engine does not
  // plumb unit-type-specific healing bonuses into `getHealAmount`, so a
  // partisan on a neutral tile still heals at the base 10 rather than 20.
  it(
    'H9: partisan unit at 50 HP in neutral territory heals +20 (= 10 base + 10 partisan bonus)',
    () => {
      const units = new Map<string, UnitState>([
        ['u1', createTestUnit({
          id: 'u1', owner: 'p1',
          typeId: 'partisan',
          position: { q: 0, r: 0 },
          health: 50, movementLeft: 1,
        })],
      ]);
      const state = buildState({ units });
      const next = turnSystem(state, { type: 'START_TURN' });
      // Expected: 50 + 10 (neutral) + 10 (partisan) = 70.
      expect(next.units.get('u1')!.health).toBe(70);
    },
  );
});

// ── H10: Field Medic healing bonus ──────────────────────────────────────────

describe('H10: Field Medic grants +5 healing in neutral/enemy territory', () => {
  it('heals a neutral land unit within radius for +5 (50 -> 65)', () => {
    const units = new Map<string, UnitState>([
      ['cmd1', createTestUnit({
        id: 'cmd1',
        owner: 'p1',
        typeId: 'captain',
        position: { q: 0, r: 0 },
        health: 100,
        movementLeft: 2,
      })],
      ['u1', createTestUnit({
        id: 'u1',
        owner: 'p1',
        typeId: 'warrior',
        position: { q: 1, r: 0 },
        health: 50,
        movementLeft: 1,
      })],
    ]);

    const state = buildTurnState({
      units,
      commanders: new Map([['cmd1', makeCommanderState()]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(65);
  });

  it('heals an enemy-territory land unit within radius for +5 (50 -> 60)', () => {
    const enemyCity = createCity({
      id: 'ec1',
      owner: 'p2',
      name: 'Outpost',
      position: { q: 5, r: 5 },
      territory: [coordToKey({ q: 5, r: 5 }), coordToKey({ q: 1, r: 0 })],
      isCapital: true,
    });

    const units = new Map<string, UnitState>([
      ['cmd1', createTestUnit({
        id: 'cmd1',
        owner: 'p1',
        typeId: 'captain',
        position: { q: 0, r: 0 },
        health: 100,
        movementLeft: 2,
      })],
      ['u1', createTestUnit({
        id: 'u1',
        owner: 'p1',
        typeId: 'warrior',
        position: { q: 1, r: 0 },
        health: 50,
        movementLeft: 1,
      })],
    ]);

    const diplomacy: GameState['diplomacy'] = {
      relations: new Map([['p1:p2', makeWarRelation()]]),
    };

    const state = buildTurnState({
      units,
      cities: new Map([['ec1', enemyCity]]),
      diplomacy,
      commanders: new Map([['cmd1', makeCommanderState()]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(60);
  });

  it('does not apply Field Medic in friendly territory, so +15 only', () => {
    const city = createCity({
      position: { q: 2, r: 2 },
      territory: [coordToKey({ q: 2, r: 2 }), coordToKey({ q: 2, r: 3 })],
    });
    const units = new Map<string, UnitState>([
      ['cmd1', createTestUnit({
        id: 'cmd1',
        owner: 'p1',
        typeId: 'captain',
        position: { q: 2, r: 3 },
        health: 100,
        movementLeft: 2,
      })],
      ['u1', createTestUnit({
        id: 'u1',
        owner: 'p1',
        typeId: 'warrior',
        position: { q: 2, r: 3 },
        health: 50,
        movementLeft: 1,
      })],
    ]);

    const state = buildTurnState({
      units,
      cities: new Map([['c1', city]]),
      commanders: new Map([['cmd1', makeCommanderState()]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(65);
  });

  it('does not heal civilian or naval units from Field Medic', () => {
    const units = new Map<string, UnitState>([
      ['cmd1', createTestUnit({
        id: 'cmd1',
        owner: 'p1',
        typeId: 'captain',
        position: { q: 0, r: 0 },
      })],
      ['settler', createTestUnit({
        id: 'settler',
        owner: 'p1',
        typeId: 'settler',
        position: { q: 1, r: 0 },
        health: 50,
        movementLeft: 1,
      })],
      ['galley', createTestUnit({
        id: 'galley',
        owner: 'p1',
        typeId: 'galley',
        position: { q: 1, r: 0 },
        health: 50,
        movementLeft: 1,
      })],
    ]);

    const state = buildTurnState({
      units,
      commanders: new Map([['cmd1', makeCommanderState()]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('settler')!.health).toBe(60);
    expect(next.units.get('galley')!.health).toBe(60);
  });

  it('does not apply Field Medic when unit is outside aura radius', () => {
    const units = new Map<string, UnitState>([
      ['cmd1', createTestUnit({
        id: 'cmd1',
        owner: 'p1',
        typeId: 'captain',
        position: { q: 0, r: 0 },
        health: 100,
      })],
      ['u1', createTestUnit({
        id: 'u1',
        owner: 'p1',
        typeId: 'warrior',
        position: { q: 2, r: 0 },
        health: 50,
        movementLeft: 1,
      })],
    ]);

    const state = buildTurnState({
      units,
      commanders: new Map([['cmd1', makeCommanderState()]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(60);
  });

  it('uses legacy commander-unit UnitState promotions when state promotions are absent', () => {
    const units = new Map<string, UnitState>([
      ['cmd1', createTestUnit({
        id: 'cmd1',
        owner: 'p1',
        typeId: 'captain',
        position: { q: 0, r: 0 },
        health: 100,
        movementLeft: 2,
        promotions: ['logistics_field_medic'],
      })],
      ['u1', createTestUnit({
        id: 'u1',
        owner: 'p1',
        typeId: 'warrior',
        position: { q: 1, r: 0 },
        health: 50,
        movementLeft: 1,
      })],
    ]);

    const state = buildTurnState({
      units,
      commanders: new Map([['cmd1', makeCommanderState({ promotions: [] })]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(65);
  });

  it('does not apply Field Medic from an enemy commander', () => {
    const units = new Map<string, UnitState>([
      ['cmd1', createTestUnit({
        id: 'cmd1',
        owner: 'p2',
        typeId: 'captain',
        position: { q: 0, r: 0 },
        health: 100,
      })],
      ['u1', createTestUnit({
        id: 'u1',
        owner: 'p1',
        typeId: 'warrior',
        position: { q: 1, r: 0 },
        health: 50,
        movementLeft: 1,
      })],
    ]);

    const state = buildTurnState({
      units,
      commanders: new Map([['cmd1', makeCommanderState({ promotions: ['logistics_field_medic'] })]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(60);
  });

  it('does not heal exhausted units even when Field Medic is nearby', () => {
    const units = new Map<string, UnitState>([
      ['cmd1', createTestUnit({
        id: 'cmd1',
        owner: 'p1',
        typeId: 'captain',
        position: { q: 0, r: 0 },
        health: 100,
      })],
      ['u1', createTestUnit({
        id: 'u1',
        owner: 'p1',
        typeId: 'warrior',
        position: { q: 1, r: 0 },
        health: 50,
        movementLeft: 0,
      })],
    ]);

    const state = buildTurnState({
      units,
      commanders: new Map([['cmd1', makeCommanderState()]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(50);
  });
});
