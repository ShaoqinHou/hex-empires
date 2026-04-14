import { describe, it, expect } from 'vitest';
import { combatSystem } from '../combatSystem';
import { movementSystem } from '../movementSystem';
import { buildingPlacementSystem } from '../buildingPlacementSystem';
import { turnSystem } from '../turnSystem';
import { createTestState, createTestUnit, createTestPlayer } from './helpers';
import type { CityState, GameState, UnitState, HexTile } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

/**
 * Rulebook §6 parity audit — each test asserts ONE specific rule from civ7-rulebook.md §6.
 *
 * Tests that FAIL are intentional: they document bugs in combatSystem vs the Civ VII rulebook.
 * Failure messages are prefixed with a rule code (R61–R69) so the follow-up implementation
 * cycle knows exactly which rule is broken.
 *
 * Randomness note: damage uses `30 * e^(diff/25) * U(0.75, 1.25)`. Tests that depend on
 * the exact expected damage average across many seeds to cancel the multiplier.
 */

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'TestCity',
    owner: 'p2',
    position: { q: 4, r: 3 },
    population: 3,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: ['4,3'],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    ...overrides,
  };
}

/** Run a melee attack averaged across many seeds and return mean defender-damage. */
function averageDefenderDamage(
  buildState: (seed: number) => GameState,
  samples: number = 200,
): number {
  let total = 0;
  for (let seed = 1; seed <= samples; seed++) {
    const state = buildState(seed);
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const defender = next.units.get('d1');
    const hp = defender ? defender.health : 0;
    total += (100 - hp);
  }
  return total / samples;
}

/**
 * Build a basic 1v1 melee scenario with attacker at (3,3) and defender at (4,3).
 * Uses `cleopatra` leader (gold-yield ability) so no MODIFY_COMBAT effects skew damage math.
 */
function buildMeleeScenario(opts: {
  seed?: number;
  attacker?: Partial<UnitState>;
  defender?: Partial<UnitState>;
  tileMutator?: (tiles: Map<string, HexTile>) => void;
}): GameState {
  const units = new Map<string, UnitState>([
    ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100, ...opts.attacker })],
    ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100, ...opts.defender })],
  ]);
  const players = new Map([
    ['p1', createTestPlayer({ id: 'p1', leaderId: 'cleopatra' })],
    ['p2', createTestPlayer({ id: 'p2', leaderId: 'cleopatra' })],
  ]);
  const base = createTestState({
    units,
    players,
    currentPlayerId: 'p1',
    rng: { seed: opts.seed ?? 42, counter: 0 },
  });
  if (opts.tileMutator) {
    const tiles = new Map(base.map.tiles);
    opts.tileMutator(tiles);
    return { ...base, map: { ...base.map, tiles } };
  }
  return base;
}

// ── §6.1 Core Stats ──

describe('R61: Core Stats — CS stat drives melee damage, rangedCombat drives ranged damage', () => {
  it('swapping melee warrior (CS 20) for spearman (CS 25) increases damage to defender', () => {
    // Same seed to isolate the CS stat effect.
    const warriorAttacker = combatSystem(
      buildMeleeScenario({ seed: 1, attacker: { typeId: 'warrior' } }),
      { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' },
    );
    const spearmanAttacker = combatSystem(
      buildMeleeScenario({ seed: 1, attacker: { typeId: 'spearman' } }),
      { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' },
    );
    const warriorDefHP = warriorAttacker.units.get('d1')!.health;
    const spearmanDefHP = spearmanAttacker.units.get('d1')!.health;
    expect(spearmanDefHP).toBeLessThan(warriorDefHP);
  });

  it('ranged archer uses rangedCombat (20) not combat (10) when attacking', () => {
    // Archer CS=10 but rangedCombat=20. Against warrior CS=20 defender, if ranged stat
    // is used, damage ≈ 30 (equal strengths) + 5 CS first-strike bonus → avg ≈ 36.6.
    // If CS=10 were used instead, damage would be much lower (~16 even with first strike).
    const avg = averageDefenderDamage((seed) => {
      const units = new Map<string, UnitState>([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 5, r: 3 }, health: 100 })],
      ]);
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1', leaderId: 'cleopatra' })],
        ['p2', createTestPlayer({ id: 'p2', leaderId: 'cleopatra' })],
      ]);
      return createTestState({ units, players, currentPlayerId: 'p1', rng: { seed, counter: 0 } });
    });
    // Expect ≥30: ranged stat in use. If melee CS=10 were used, avg would be <25.
    expect(avg).toBeGreaterThan(30);
  });
});

// ── §6.2 Damage Formula ──

describe('R62: Damage formula — base 30 at equal CS, ~+4% exponential per CS point', () => {
  // All R62 tests use attacker health=99 to avoid the +5 First-Strike bonus that
  // would otherwise skew expected damage (rulebook formula is measured without modifiers).
  it('equal CS (warrior vs warrior, no first strike) averages ~30 damage to defender', () => {
    const avg = averageDefenderDamage((seed) =>
      buildMeleeScenario({ seed, attacker: { health: 99 }, defender: { typeId: 'warrior' } }),
    );
    expect(avg).toBeGreaterThanOrEqual(27);
    expect(avg).toBeLessThanOrEqual(33);
  });

  it('attacker +10 CS advantage (warrior CS20 vs scout CS10, no first strike) → ~44 damage', () => {
    // Rulebook: 30 × 1.04^10 ≈ 44.4. Code uses 30 × e^(10/25) ≈ 44.75. Assert ±3.
    const avg = averageDefenderDamage((seed) =>
      buildMeleeScenario({ seed, attacker: { health: 99 }, defender: { typeId: 'scout' } }),
    );
    expect(Math.abs(avg - 44)).toBeLessThanOrEqual(3);
  });

  it('attacker -10 CS disadvantage (scout CS10 vs warrior CS20, no first strike) → ~20 damage', () => {
    // Rulebook: 30 × 1.04^-10 ≈ 20.3. Code: 30 × e^(-10/25) ≈ 20.1. Assert ±3.
    const avg = averageDefenderDamage((seed) =>
      buildMeleeScenario({ seed, attacker: { typeId: 'scout', health: 99 } }),
    );
    expect(Math.abs(avg - 20)).toBeLessThanOrEqual(3);
  });

  it('ranged attack deals damage to target only, attacker takes 0', () => {
    const state = buildMeleeScenario({
      seed: 5,
      attacker: { typeId: 'archer', position: { q: 3, r: 3 } },
      defender: { typeId: 'warrior', position: { q: 5, r: 3 } }, // range 2
    });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    expect(next.units.get('a1')!.health).toBe(100);
    expect(next.units.get('d1')!.health).toBeLessThan(100);
  });
});

// ── §6.3 HP Degradation ──

describe('R63: HP degradation — unit loses -1 CS per 10 HP lost', () => {
  it('defender at 70 HP (lost 30 → -3 CS) takes more damage than defender at 100 HP', () => {
    const full = averageDefenderDamage((seed) =>
      buildMeleeScenario({ seed, defender: { health: 100 } }),
    );
    const wounded = averageDefenderDamage((seed) =>
      buildMeleeScenario({ seed, defender: { health: 70 } }),
    );
    // Wounded defender has effective CS 20-3=17; attacker CS stays 20 → diff +3.
    // Expected: 30 × e^(3/25) ≈ 33.8. Full: 30. So wounded should take ≥3 more damage avg.
    expect(wounded - full).toBeGreaterThanOrEqual(2);
  });

  it('attackers at 99 HP and 91 HP deal identical damage (same 0-bracket)', () => {
    // floor((100-99)/10)=0 and floor((100-91)/10)=0 → both have 0 penalty.
    // Same seed → identical RNG → identical damage.
    const n99 = combatSystem(
      buildMeleeScenario({ seed: 7, attacker: { health: 99 } }),
      { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' },
    );
    const n91 = combatSystem(
      buildMeleeScenario({ seed: 7, attacker: { health: 91 } }),
      { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' },
    );
    expect(n99.units.get('d1')!.health).toBe(n91.units.get('d1')!.health);
  });

  it('attacker at 50 HP (-5 CS penalty) deals less damage than at 100 HP', () => {
    const full = averageDefenderDamage((seed) =>
      buildMeleeScenario({ seed, attacker: { health: 100 } }),
    );
    const half = averageDefenderDamage((seed) =>
      buildMeleeScenario({ seed, attacker: { health: 50 } }),
    );
    expect(half).toBeLessThan(full);
  });
});

// ── §6.4 Terrain Modifiers ──

describe('R64: Terrain modifiers — defender terrain grants CS bonus', () => {
  it('hills defender takes less damage than grassland defender', () => {
    const flat = averageDefenderDamage((seed) => buildMeleeScenario({ seed }));
    const hillsDef = averageDefenderDamage((seed) =>
      buildMeleeScenario({
        seed,
        tileMutator: (tiles) => {
          const key = coordToKey({ q: 4, r: 3 });
          const t = tiles.get(key)!;
          tiles.set(key, { ...t, feature: 'hills' });
        },
      }),
    );
    expect(hillsDef).toBeLessThan(flat);
  });

  it('forest defender takes less damage than grassland defender', () => {
    const flat = averageDefenderDamage((seed) => buildMeleeScenario({ seed }));
    const forestDef = averageDefenderDamage((seed) =>
      buildMeleeScenario({
        seed,
        tileMutator: (tiles) => {
          const key = coordToKey({ q: 4, r: 3 });
          const t = tiles.get(key)!;
          tiles.set(key, { ...t, feature: 'forest' });
        },
      }),
    );
    expect(forestDef).toBeLessThan(flat);
  });

  it('R64a: hills gives FLAT +3 CS (rulebook §6.4), not +30% multiplicative', () => {
    // Attacker at 99 HP (no first strike), warrior vs warrior on hills.
    // Rulebook: defender CS 20+3=23, attacker CS 20. Diff -3. Expected avg ≈ 30 × e^(-3/25) ≈ 26.6.
    const hillsDef = averageDefenderDamage((seed) =>
      buildMeleeScenario({
        seed,
        attacker: { health: 99 },
        tileMutator: (tiles) => {
          const key = coordToKey({ q: 4, r: 3 });
          const t = tiles.get(key)!;
          tiles.set(key, { ...t, feature: 'hills' });
        },
      }),
    );
    expect(Math.abs(hillsDef - 26.6)).toBeLessThanOrEqual(2);
  });

  it('R64b: mountains are impassable — movementSystem blocks entry', () => {
    // Place mountain feature on an adjacent tile; attempt to move there.
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', position: { q: 0, r: 0 }, movementLeft: 3 })],
    ]);
    const base = createTestState({
      units,
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      currentPlayerId: 'p1',
    });
    const tiles = new Map(base.map.tiles);
    const targetKey = coordToKey({ q: 1, r: 0 });
    const t = tiles.get(targetKey);
    if (t) tiles.set(targetKey, { ...t, feature: 'mountains' });
    const state = { ...base, map: { ...base.map, tiles } };

    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    // Should reject as impassable — unit stays at origin.
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
    expect(next.lastValidation?.valid).toBe(false);
  });

  it('R64c: river penalty applies to ATTACKER attacking from a river tile', () => {
    const flat = averageDefenderDamage((seed) => buildMeleeScenario({ seed }));
    const river = averageDefenderDamage((seed) =>
      buildMeleeScenario({
        seed,
        tileMutator: (tiles) => {
          const key = coordToKey({ q: 3, r: 3 });
          const t = tiles.get(key)!;
          tiles.set(key, { ...t, river: [0] });
        },
      }),
    );
    // Attacker on river is penalised → defender takes less damage.
    expect(river).toBeLessThan(flat);
  });
});

// ── §6.5 Fortification ──

describe('R65: Fortification grants FLAT +5 CS when defending', () => {
  it('fortified defender takes less damage than non-fortified defender', () => {
    const unfort = averageDefenderDamage((seed) =>
      buildMeleeScenario({ seed, defender: { fortified: false } }),
    );
    const fort = averageDefenderDamage((seed) =>
      buildMeleeScenario({ seed, defender: { fortified: true } }),
    );
    expect(fort).toBeLessThan(unfort);
  });

  it('R65a: fortification bonus magnitude matches +5 flat CS (not +50% multiplicative)', () => {
    // Attacker at 99 HP (no first strike). Warrior CS=20 defender, fortified → 25.
    // Attacker CS=20. Diff: -5. Avg damage ≈ 30 × e^(-5/25) ≈ 24.6.
    // If +50% multiplicative: defender CS=30, diff -10 → avg ≈ 20.1. +5 flat predicts ~24.6.
    const fort = averageDefenderDamage((seed) =>
      buildMeleeScenario({ seed, attacker: { health: 99 }, defender: { fortified: true } }),
    );
    expect(Math.abs(fort - 24.6)).toBeLessThanOrEqual(3);
  });
});

// ── §6.6 Walls ──

describe('R66: Walls — +100 HP to district, walls must be destroyed before capture', () => {
  it('city with walls has higher effective defense strength (takes less damage)', () => {
    // Compare attacking a walls city vs no-walls city with same defenseHP.
    const damageNoWalls: number[] = [];
    const damageWalls: number[] = [];
    for (let seed = 1; seed <= 50; seed++) {
      const noWallsCity = makeCity({ buildings: [], defenseHP: 100 });
      const wallsCity = makeCity({ buildings: ['walls'], defenseHP: 100 });
      const units = new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ]);
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const s1 = createTestState({ units, players, currentPlayerId: 'p1', cities: new Map([['c1', noWallsCity]]), rng: { seed, counter: 0 } });
      const s2 = createTestState({ units, players, currentPlayerId: 'p1', cities: new Map([['c1', wallsCity]]), rng: { seed, counter: 0 } });
      const r1 = combatSystem(s1, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });
      const r2 = combatSystem(s2, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });
      damageNoWalls.push(100 - r1.cities.get('c1')!.defenseHP);
      damageWalls.push(100 - r2.cities.get('c1')!.defenseHP);
    }
    const avg1 = damageNoWalls.reduce((a, b) => a + b, 0) / damageNoWalls.length;
    const avg2 = damageWalls.reduce((a, b) => a + b, 0) / damageWalls.length;
    expect(avg2).toBeLessThan(avg1);
  });

  it('R66a: placing walls building grants +100 defenseHP to the city (rulebook §6.6)', () => {
    // Rulebook: walls add 100 HP to the district. Place walls in a city that currently
    // has defenseHP 100 → expect defenseHP to become 200.
    // Walls must already be constructed (in city.buildings) before placement — mirrors the
    // productionSystem → buildingPlacementSystem flow.
    const city = makeCity({ id: 'c1', owner: 'p1', defenseHP: 100, buildings: ['walls'] });
    const state = createTestState({
      cities: new Map([['c1', city]]),
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      currentPlayerId: 'p1',
    });
    const next = buildingPlacementSystem(state, {
      type: 'PLACE_BUILDING',
      cityId: 'c1',
      buildingId: 'walls',
      tile: { q: 4, r: 3 },
    });
    const updated = next.cities.get('c1')!;
    // Rulebook expects defenseHP to increase by 100 when walls are placed.
    expect(updated.defenseHP).toBe(200);
  });

  it('R66b: ranged attacker cannot capture a city even when its defenseHP reaches 0', () => {
    const city = makeCity({ id: 'c1', owner: 'p2', defenseHP: 1, position: { q: 5, r: 3 } });
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1', cities: new Map([['c1', city]]) });
    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });
    const updated = next.cities.get('c1')!;
    expect(updated.owner).toBe('p2'); // not conquered
    expect(updated.defenseHP).toBe(0);
  });
});

// ── §6.7 Flanking ──

describe('R67: Flanking — +2 CS per adjacent friendly unit (capped at +6)', () => {
  function buildFlankedScenario(flankers: number, seed: number): GameState {
    // Attacker at (3,3), defender at (4,3). Neighbors of (4,3) include (5,3), (4,4), (5,2), (3,4), (4,2), (3,3 itself=attacker).
    const flankerCoords = [
      { q: 5, r: 3 },
      { q: 4, r: 4 },
      { q: 5, r: 2 },
      { q: 3, r: 4 },
      { q: 4, r: 2 },
    ].slice(0, flankers);

    const units = new Map<string, UnitState>();
    units.set('a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 }));
    units.set('d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 }));
    flankerCoords.forEach((pos, i) => {
      units.set(`f${i}`, createTestUnit({ id: `f${i}`, owner: 'p1', typeId: 'warrior', position: pos, movementLeft: 2, health: 100 }));
    });
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', leaderId: 'cleopatra' })],
      ['p2', createTestPlayer({ id: 'p2', leaderId: 'cleopatra' })],
    ]);
    return createTestState({ units, players, currentPlayerId: 'p1', rng: { seed, counter: 0 } });
  }

  it('1 flanker increases damage vs 0 flankers', () => {
    let dmg0 = 0, dmg1 = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const r0 = combatSystem(buildFlankedScenario(0, seed), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
      const r1 = combatSystem(buildFlankedScenario(1, seed), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
      dmg0 += (100 - (r0.units.get('d1')?.health ?? 0));
      dmg1 += (100 - (r1.units.get('d1')?.health ?? 0));
    }
    expect(dmg1).toBeGreaterThan(dmg0);
  });

  it('4 flankers deal same damage as 3 flankers (cap at +6)', () => {
    let dmg3 = 0, dmg4 = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const r3 = combatSystem(buildFlankedScenario(3, seed), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
      const r4 = combatSystem(buildFlankedScenario(4, seed), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
      dmg3 += (100 - (r3.units.get('d1')?.health ?? 0));
      dmg4 += (100 - (r4.units.get('d1')?.health ?? 0));
    }
    expect(dmg4).toBe(dmg3);
  });

  it('R67a: flanking bonus magnitude ≈ +2 CS per flanker (1 flanker → +2 CS over baseline)', () => {
    // Baseline: no flankers. Warrior vs warrior, avg damage ≈ 30.
    // With 1 flanker: attacker CS 22, diff +2, avg ≈ 30 × e^(2/25) ≈ 32.5.
    let total = 0, totalFl = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const base = combatSystem(buildFlankedScenario(0, seed), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
      const fl = combatSystem(buildFlankedScenario(1, seed), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
      total += 100 - base.units.get('d1')!.health;
      totalFl += 100 - fl.units.get('d1')!.health;
    }
    const avg = total / 200;
    const avgFl = totalFl / 200;
    const delta = avgFl - avg;
    // Expected delta: 32.5 - 30 = 2.5. Allow ±2.
    expect(delta).toBeGreaterThan(0.5);
    expect(delta).toBeLessThan(4.5);
  });
});

// ── §6.8 Zone of Control ──

describe('R68: Zone of Control — enemy adjacency stops movement', () => {
  it('unit entering ZoC tile stops there with 0 movement remaining', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', position: { q: 0, r: 0 }, movementLeft: 5 })],
      ['e1', createTestUnit({ id: 'e1', owner: 'p2', typeId: 'warrior', position: { q: 2, r: -1 } })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    // Unit should stop at (1,0) because it's adjacent to enemy at (2,-1).
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(0);
  });

  it('cavalry ignores ZoC (Swift ability)', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'chariot', position: { q: 0, r: 0 }, movementLeft: 5 })],
      ['e1', createTestUnit({ id: 'e1', owner: 'p2', typeId: 'warrior', position: { q: 2, r: -1 } })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    // Cavalry completes full path through ZoC.
    expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
  });
});

// ── §6.9 Healing Rates ──

describe('R69: Healing rates by territory', () => {
  it('wounded unit in own city heals 20 HP/turn', () => {
    const unitPos = { q: 6, r: 5 };
    const ownCity = makeCity({ id: 'c1', owner: 'p1', position: unitPos, territory: ['6,5'] });
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', position: unitPos, movementLeft: 2, health: 50 })],
    ]);
    const state = createTestState({
      phase: 'start',
      units,
      cities: new Map([['c1', ownCity]]),
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(70);
  });

  it('wounded unit in friendly territory (own city tile) heals 15 HP/turn', () => {
    const unitPos = { q: 5, r: 5 };
    const ownCity = makeCity({ id: 'c1', owner: 'p1', position: { q: 6, r: 5 }, territory: ['5,5'] });
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', position: unitPos, movementLeft: 2, health: 50 })],
    ]);
    const state = createTestState({
      phase: 'start',
      units,
      cities: new Map([['c1', ownCity]]),
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(65);
  });

  it('wounded unit in neutral territory heals 10 HP/turn', () => {
    const unitPos = { q: 5, r: 5 };
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', position: unitPos, movementLeft: 2, health: 50 })],
    ]);
    const state = createTestState({
      phase: 'start',
      units,
      players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(60);
  });

  it('wounded unit in enemy territory (at war) heals 5 HP/turn', () => {
    const unitPos = { q: 5, r: 5 };
    const enemyCity = makeCity({ id: 'ec', owner: 'p2', position: { q: 6, r: 5 }, territory: ['5,5'] });
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', position: unitPos, movementLeft: 2, health: 50 })],
    ]);
    const state = createTestState({
      phase: 'start',
      units,
      cities: new Map([['ec', enemyCity]]),
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      diplomacy: {
        relations: new Map([
          ['p1:p2', {
            status: 'war' as const,
            relationship: -50,
            warSupport: 0,
            turnsAtPeace: 0,
            turnsAtWar: 1,
            hasAlliance: false,
            hasFriendship: false,
            hasDenounced: false,
            warDeclarer: 'p1',
            isSurpriseWar: false,
            activeEndeavors: [],
            activeSanctions: [],
          }],
        ]),
      },
    });
    const next = turnSystem(state, { type: 'START_TURN' });
    expect(next.units.get('u1')!.health).toBe(55);
  });
});
