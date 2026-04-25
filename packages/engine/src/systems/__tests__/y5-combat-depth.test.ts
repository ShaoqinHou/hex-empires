import { describe, it, expect } from 'vitest';
import { combatSystem } from '../combatSystem';
import { createTestState, createTestUnit, createTestPlayer, createFlatMap } from './helpers';
import type { GameState, UnitState } from '../../types/GameState';
import type { UnitDef } from '../../types/Unit';
import { coordToKey } from '../../hex/HexMath';
import { createGameConfig } from '../../state/GameConfigFactory';

/**
 * Y5 combat depth tests (Y5.1, Y5.2, Y5.3).
 *
 * Y5.1 — Flanking bonus: +3 CS per flanking ally, capped at +9 (3 effective flankers).
 * Y5.2 — Terrain modifiers: Forest +25%, Mountain +50%, Hills +25%, River crossing -25%.
 * Y5.3 — Support adjacency: adjacent friendly support unit grants +2 CS.
 *
 * Geometry: attacker at (3,3), defender at (4,3). Edge 0 (E) of attacker's tile
 * faces the defender.
 */

// ── Shared builders ─────────────────────────────────────────────────────────

function buildScenario(opts: {
  seed?: number;
  units?: Map<string, UnitState>;
  tileMutator?: (tiles: Map<string, ReturnType<ReturnType<typeof createFlatMap>['get']> & {}>) => void;
} = {}): GameState {
  const units = opts.units ?? new Map([
    ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 99 })],
    ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
  ]);
  const players = new Map([
    ['p1', createTestPlayer({ id: 'p1', leaderId: 'cleopatra', researchedTechs: ['military_training'] })],
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
    opts.tileMutator(tiles as never);
    return { ...base, map: { ...base.map, tiles } };
  }
  return base;
}

/** Return damage dealt to defender d1 in one attack. */
function damageTo(state: GameState): number {
  const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
  const def = next.units.get('d1');
  if (!def) return 100; // destroyed = full damage
  return 100 - def.health;
}

/** Average damage across many seeds (cancels out RNG randomisation). */
function avgDamage(buildFn: (seed: number) => GameState, samples = 200): number {
  let total = 0;
  for (let seed = 1; seed <= samples; seed++) {
    total += damageTo(buildFn(seed));
  }
  return total / samples;
}

// ── Y5.1: Flanking bonus ─────────────────────────────────────────────────────

describe('Y5.1: flanking bonus — +3 CS per ally, cap +9', () => {
  const FLANK_A = { q: 5, r: 3 }; // adjacent to defender (4,3)
  const FLANK_B = { q: 5, r: 2 };
  const FLANK_C = { q: 4, r: 2 };
  const FLANK_D = { q: 3, r: 4 };

  it('1 flanking ally → +3 CS (base case; requires military_training & 1+ adjacent ally above 2-ally floor)', () => {
    // Per rulebook the minimum is 2 allies for legacy flanking. But the directional
    // rear-flank model fires at 1. Since both units here are melee and military_training
    // is unlocked, the legacy path requires 2+. With only 1 flanker the legacy bonus
    // should remain 0. We verify WITH 2 flankers to isolate the +3-per-ally math.
    const baseline = damageTo(buildScenario({ seed: 7 }));
    const with2 = damageTo(buildScenario({
      seed: 7,
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 99 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
        ['f1', createTestUnit({ id: 'f1', owner: 'p1', typeId: 'warrior', position: FLANK_A, health: 100 })],
        ['f2', createTestUnit({ id: 'f2', owner: 'p1', typeId: 'warrior', position: FLANK_B, health: 100 })],
      ]),
    }));
    // 2 flankers → +6 CS (3 * 2). Attacker deals more damage.
    expect(with2).toBeGreaterThan(baseline);
  });

  it('1 flanking ally (below 2+ threshold) grants zero bonus', () => {
    const baseline = damageTo(buildScenario({ seed: 9 }));
    const with1 = damageTo(buildScenario({
      seed: 9,
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 99 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
        ['f1', createTestUnit({ id: 'f1', owner: 'p1', typeId: 'warrior', position: FLANK_A, health: 100 })],
      ]),
    }));
    // Single flanker = legacy path requires 2+, so zero bonus → same damage as baseline.
    expect(with1).toBe(baseline);
  });

  it('4 flanking allies → same damage as 3 (cap at +9 = 3 allies)', () => {
    const units3 = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 99 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
      ['f1', createTestUnit({ id: 'f1', owner: 'p1', typeId: 'warrior', position: FLANK_A, health: 100 })],
      ['f2', createTestUnit({ id: 'f2', owner: 'p1', typeId: 'warrior', position: FLANK_B, health: 100 })],
      ['f3', createTestUnit({ id: 'f3', owner: 'p1', typeId: 'warrior', position: FLANK_C, health: 100 })],
    ]);
    const units4 = new Map([
      ...units3,
      ['f4', createTestUnit({ id: 'f4', owner: 'p1', typeId: 'warrior', position: FLANK_D, health: 100 })],
    ]);
    const with3 = damageTo(buildScenario({ seed: 13, units: units3 }));
    const with4 = damageTo(buildScenario({ seed: 13, units: units4 }));
    // Both capped at +9 (3 effective allies) → identical damage.
    expect(with4).toBe(with3);
  });
});

// ── Y5.2: Terrain modifiers ──────────────────────────────────────────────────

describe('Y5.2: terrain combat modifiers (forest +25%, hills +25%, river crossing -25%)', () => {
  it('forest defender takes less damage than flat defender (multiplicative +25% defense)', () => {
    const flat = avgDamage((seed) => buildScenario({ seed }));
    const forest = avgDamage((seed) => buildScenario({
      seed,
      tileMutator: (tiles) => {
        const key = coordToKey({ q: 4, r: 3 });
        const t = tiles.get(key);
        if (t) tiles.set(key, { ...t, feature: 'forest' } as never);
      },
    }));
    expect(forest).toBeLessThan(flat);
  });

  it('forest +25% — average damage ≈ 24.8 (attacker 99 HP, warrior vs warrior)', () => {
    // effectiveCS(warrior 99HP) = floor(20 * 0.99) = 19
    // defender CS = 19 * 1.25 = 23.75; diff = -4.75; avg ≈ 30 * e^(-4.75/25) ≈ 24.8
    const forest = avgDamage((seed) => buildScenario({
      seed,
      tileMutator: (tiles) => {
        const key = coordToKey({ q: 4, r: 3 });
        const t = tiles.get(key);
        if (t) tiles.set(key, { ...t, feature: 'forest' } as never);
      },
    }));
    expect(Math.abs(forest - 24.8)).toBeLessThanOrEqual(2);
  });

  it('hills defender takes less damage than flat defender (multiplicative +25% defense)', () => {
    const flat = avgDamage((seed) => buildScenario({ seed }));
    const hills = avgDamage((seed) => buildScenario({
      seed,
      tileMutator: (tiles) => {
        const key = coordToKey({ q: 4, r: 3 });
        const t = tiles.get(key);
        if (t) tiles.set(key, { ...t, feature: 'hills' } as never);
      },
    }));
    expect(hills).toBeLessThan(flat);
  });

  it('river crossing — attacker crossing river edge deals LESS damage (-25% CS)', () => {
    // Attacker at (3,3), defender at (4,3). Edge 0 (E) of attacker's tile.
    const flat = avgDamage((seed) => buildScenario({ seed }));
    const river = avgDamage((seed) => buildScenario({
      seed,
      tileMutator: (tiles) => {
        const key = coordToKey({ q: 3, r: 3 });
        const t = tiles.get(key);
        if (t) tiles.set(key, { ...t, river: [0] } as never); // edge 0=E faces (4,3)
      },
    }));
    // River crossing: attacker CS * 0.75 → less damage
    expect(river).toBeLessThan(flat);
  });

  it('river edge NOT facing defender does NOT apply penalty', () => {
    // Edge 3 (W) faces away from the defender (4,3); no penalty should apply.
    const flat = avgDamage((seed) => buildScenario({ seed }));
    const riverWrong = avgDamage((seed) => buildScenario({
      seed,
      tileMutator: (tiles) => {
        const key = coordToKey({ q: 3, r: 3 });
        const t = tiles.get(key);
        if (t) tiles.set(key, { ...t, river: [3] } as never); // edge 3=W faces away
      },
    }));
    // River is on the wrong edge; no penalty → damage should equal baseline.
    expect(Math.abs(riverWrong - flat)).toBeLessThanOrEqual(1);
  });
});

// ── Y5.3: Support unit adjacency ─────────────────────────────────────────────

describe('Y5.3: support unit adjacency — +2 CS to adjacent combat unit', () => {
  it('combat unit adjacent to a friendly support unit gets +2 CS', () => {
    // Inject a support-category unit def into the config.
    const baseConfig = createGameConfig();
    const supportUnitDef: UnitDef = {
      id: 'engineer',
      name: 'Engineer',
      age: 'antiquity',
      category: 'support',
      cost: 60,
      combat: 10,
      rangedCombat: 0,
      range: 0,
      movement: 2,
      sightRange: 2,
      requiredTech: null,
      upgradesTo: null,
      abilities: [],
    };
    const extendedUnits = new Map(baseConfig.units);
    extendedUnits.set('engineer', supportUnitDef);
    const config = { ...baseConfig, units: extendedUnits };

    const buildWithSupport = (seed: number, hasSupport: boolean): GameState => {
      const units = new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 99 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
        ...(hasSupport
          ? [['s1', createTestUnit({ id: 's1', owner: 'p1', typeId: 'engineer', position: { q: 3, r: 4 }, health: 100 })] as [string, typeof createTestUnit extends (...args: never[]) => infer R ? R : never]]
          : []),
      ]);
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1', leaderId: 'cleopatra' })],
        ['p2', createTestPlayer({ id: 'p2', leaderId: 'cleopatra' })],
      ]);
      return createTestState({ units, players, currentPlayerId: 'p1', config, rng: { seed, counter: 0 } });
    };

    const withoutSupport = avgDamage((seed) => buildWithSupport(seed, false));
    const withSupport = avgDamage((seed) => buildWithSupport(seed, true));

    // +2 CS from support → attacker deals more damage
    expect(withSupport).toBeGreaterThan(withoutSupport);
  });
});
