import { describe, it, expect } from 'vitest';
import { movementSystem } from '../movementSystem';
import { createTestState, createTestUnit, createTestPlayer } from './helpers';
import type { GameState, UnitState } from '../../types/GameState';

/**
 * Rulebook §6.8 parity audit — Zone of Control.
 *
 * Rulebook §6.8 (civ7-rulebook.md lines 315–319):
 *   - Military units exert ZoC on adjacent tiles.
 *   - Enemy units must stop when entering a ZoC tile (cannot move through).
 *   - Cavalry / Swift units ignore enemy ZoC.
 *
 * Each test below asserts one specific §6.8 rule against the current
 * movementSystem behaviour. Tests that use `it.fails(...)` document a known
 * mismatch (behavioural bug) that a follow-up cycle should fix. The rule
 * code (Z1–Zn) in the test name is searchable.
 *
 * Reference geometry (axial, pointy-top, per HexMath.HEX_DIRECTIONS):
 *   neighbors(1,0) = { (2,0), (2,-1), (1,-1), (0,0), (0,1), (1,1) }
 *   neighbors(2,0) = { (3,0), (3,-1), (2,-1), (1,0), (1,1), (2,1) }
 * So an enemy at (2,-1) exerts ZoC over both (1,0) and (2,0) — perfect for
 * testing a two-step path where both steps are in ZoC.
 */

function buildZoCScenario(opts: {
  moverTypeId?: string;              // defaults to 'warrior'
  enemyTypeId?: string;              // defaults to 'warrior'
  enemyCount?: 1 | 2;                // number of overlapping enemies
  moverMovement?: number;            // defaults to 5
  moverPos?: { q: number; r: number };
  enemyPos?: { q: number; r: number };
  enemy2Pos?: { q: number; r: number };
}): GameState {
  const units = new Map<string, UnitState>();
  units.set('u1', createTestUnit({
    id: 'u1',
    owner: 'p1',
    typeId: opts.moverTypeId ?? 'warrior',
    position: opts.moverPos ?? { q: 0, r: 0 },
    movementLeft: opts.moverMovement ?? 5,
  }));
  units.set('e1', createTestUnit({
    id: 'e1',
    owner: 'p2',
    typeId: opts.enemyTypeId ?? 'warrior',
    position: opts.enemyPos ?? { q: 2, r: -1 },
  }));
  if (opts.enemyCount === 2) {
    units.set('e2', createTestUnit({
      id: 'e2',
      owner: 'p2',
      typeId: 'warrior',
      position: opts.enemy2Pos ?? { q: 2, r: 1 }, // also adjacent to (1,0) and (2,0)
    }));
  }
  const players = new Map([
    ['p1', createTestPlayer({ id: 'p1' })],
    ['p2', createTestPlayer({ id: 'p2' })],
  ]);
  return createTestState({ units, players, currentPlayerId: 'p1' });
}

// ── Z1: Military units exert ZoC on adjacent tiles ──

describe('Z1: military units exert ZoC on adjacent tiles (§6.8 bullet 1)', () => {
  it('unit moving into a tile adjacent to an enemy melee unit is stopped there', () => {
    // Path: (0,0) → (1,0) → (2,0). Enemy warrior at (2,-1) makes (1,0) a ZoC tile.
    // Unit must stop at (1,0).
    const state = buildZoCScenario({});
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
  });

  it('ranged units do NOT exert ZoC (VII spec F-04: only melee/siege project ZoC)', () => {
    // Archer (category: 'ranged') at (2,-1). Per VII spec only melee/siege project
    // ZoC — mover should complete the full path to (2,0).
    const state = buildZoCScenario({ enemyTypeId: 'archer' });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
  });

  it('cavalry (enemy chariot) does NOT exert ZoC (VII spec F-04: only melee/siege project ZoC)', () => {
    // Enemy chariot (category: 'cavalry') at (2,-1). Per VII spec only melee and
    // siege project ZoC — cavalry does not. Mover should complete the full path.
    const state = buildZoCScenario({ enemyTypeId: 'chariot' });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
  });

  it('civilian units do NOT exert ZoC', () => {
    // Enemy settler (category: 'civilian') at (2,-1). Rule §6.8 says only
    // "military" units exert ZoC. Mover should complete the full path.
    const state = buildZoCScenario({ enemyTypeId: 'settler' });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
  });

  it('Z2.1: ranged enemy (archer) does NOT project ZoC — mover passes through freely', () => {
    // VII spec F-04: only melee and siege project ZoC. An enemy archer at (2,-1)
    // must NOT stop the mover at (1,0). Mover should reach (2,0).
    const state = buildZoCScenario({ enemyTypeId: 'archer', moverMovement: 5 });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(3);
  });

  it('Z2.1: melee enemy (warrior) DOES project ZoC — mover is stopped', () => {
    // Melee units still project ZoC. Confirms the basic case is unaffected.
    const state = buildZoCScenario({ enemyTypeId: 'warrior', moverMovement: 5 });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(0);
  });

  it('unit moving only OUT of ZoC into a non-ZoC tile completes normally', () => {
    // Mover starts at (1,1), enemy at (2,0).
    // neighbors(2,0) = {(3,0),(3,-1),(2,-1),(1,0),(1,1),(2,1)} → (1,1) IS ZoC.
    // neighbors(1,2) = {(2,2),(2,1),(1,1),(0,2),(0,3),(1,3)} → (1,2) NOT adjacent to (2,0).
    // So the mover moves OUT of a ZoC tile into a non-ZoC tile: path completes
    // and ZoC does not strip remaining movement. (Using coords inside the
    // flat-map bounds produced by helpers.createFlatMap.)
    const state = buildZoCScenario({
      moverPos: { q: 1, r: 1 },
      enemyPos: { q: 2, r: 0 },
    });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 2 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 2 });
    // Grassland cost = 1. Mover had 5, so 4 should remain. Destination (1,2)
    // is NOT adjacent to enemy at (2,0) → no ZoC stop.
    expect(next.units.get('u1')!.movementLeft).toBe(4);
  });
});

// ── Z2: Enemy units must stop when entering a ZoC tile (§6.8 bullet 2) ──

describe('Z2: enemy must stop on entering ZoC tile (§6.8 bullet 2)', () => {
  it('unit entering a ZoC tile loses all remaining movement points', () => {
    // Mover has 5 MP. First step into (1,0) is ZoC → stops with 0 MP.
    const state = buildZoCScenario({ moverMovement: 5 });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(0);
  });

  it('unit cannot move THROUGH a ZoC tile to a non-ZoC tile beyond it', () => {
    // Path (0,0) → (1,0) → (1,1). (1,0) IS ZoC (adjacent to enemy at (2,-1)).
    // (1,1) is NOT adjacent to (2,-1) — neighbors(1,1) = {(2,1),(2,0),(1,0),
    // (0,1),(0,2),(1,2)}. So beyond the ZoC tile lies a non-ZoC tile, but the
    // rule "must stop when entering" means the mover never proceeds past (1,0).
    const state = buildZoCScenario({});
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 1, r: 1 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
  });

  it('two enemies overlapping the same ZoC tile still stop the mover exactly once', () => {
    // Two enemies, both adjacent to (1,0). ZoC is a boolean property of the
    // tile — overlap should NOT double-stop or produce any different result
    // than one enemy. Mover stops at (1,0) with movement 0.
    const state = buildZoCScenario({ enemyCount: 2 });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(0);
  });

  it('mover heading toward enemy-occupied tile is stopped one step short by ZoC', () => {
    // Mover at (0,1), enemy at (2,1). Path (0,1) → (1,1) → (2,1).
    // neighbors(2,1) = {(3,1),(3,0),(2,0),(1,1),(1,2),(2,2)} → (1,1) is ZoC.
    // Mover must stop at (1,1), never reaches the enemy tile at (2,1).
    const state = buildZoCScenario({
      moverPos: { q: 0, r: 1 },
      enemyPos: { q: 2, r: 1 },
    });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 1 }, { q: 2, r: 1 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 1 });
    expect(next.units.get('u1')!.position).not.toEqual({ q: 2, r: 1 });
  });
});

// ── Z3: Cavalry (Swift) ignore enemy ZoC (§6.8 bullet 3) ──

describe('Z3: cavalry / Swift units ignore enemy ZoC (§6.8 bullet 3)', () => {
  it('chariot (cavalry) can move ZoC tile → ZoC tile in a single action', () => {
    // Chariot at (0,0) moves (1,0) → (2,0). Both are adjacent to enemy at (2,-1).
    // Per rulebook, cavalry completely ignore ZoC.
    const state = buildZoCScenario({ moverTypeId: 'chariot' });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
  });

  it('cavalry passing through ZoC pays only tile costs (does not lose remaining MP)', () => {
    // Chariot has movementLeft=5 in createTestUnit? No — createTestUnit default
    // is 2. We set 5 explicitly. Path is 2 grassland tiles → 2 MP spent, 3 left.
    // If ZoC wrongly applied, movementLeft would be 0.
    const state = buildZoCScenario({ moverTypeId: 'chariot', moverMovement: 5 });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.movementLeft).toBe(3);
  });

  it('non-cavalry ranged unit (archer) is STOPPED by enemy melee ZoC', () => {
    // Archer is category 'ranged', not 'cavalry'. It cannot ignore enemy ZoC
    // when ENTERING a ZoC tile. (The enemy here is a warrior — melee — which DOES
    // project ZoC. The mover is an archer who must still respect that ZoC.)
    const state = buildZoCScenario({ moverTypeId: 'archer', moverMovement: 5 });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(0);
  });

  it('non-cavalry melee unit (warrior) is still STOPPED by enemy ZoC', () => {
    // Baseline — mirrors the existing combat-parity R68 test but kept here
    // as a Z3 complement so the "cavalry vs non-cavalry" contrast is co-located.
    const state = buildZoCScenario({ moverTypeId: 'warrior', moverMovement: 5 });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(0);
  });
});

// ── Z4: ZoC applies only to ENEMY units (not friendlies) ──

describe('Z4: ZoC only applies across enemy lines (not friendly units)', () => {
  it('friendly adjacent unit does NOT exert ZoC on our own mover', () => {
    // Friendly warrior at (2,-1). Mover (also p1) walks (0,0) → (1,0) → (2,0).
    // No enemy → no ZoC. Unit should complete the path with movement left.
    const units = new Map<string, UnitState>();
    units.set('u1', createTestUnit({
      id: 'u1',
      owner: 'p1',
      typeId: 'warrior',
      position: { q: 0, r: 0 },
      movementLeft: 5,
    }));
    units.set('f1', createTestUnit({
      id: 'f1',
      owner: 'p1',
      typeId: 'warrior',
      position: { q: 2, r: -1 },
    }));
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(3);
  });
});
