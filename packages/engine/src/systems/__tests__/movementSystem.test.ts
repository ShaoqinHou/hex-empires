import { describe, it, expect } from 'vitest';
import { movementSystem, tilesShareRiverEdge } from '../movementSystem';
import { createTestState, createTestUnit, createTestPlayer, setTile } from './helpers';
import { coordToKey } from '../../hex/HexMath';
import type { HexTile } from '../../types/GameState';

describe('movementSystem', () => {
  it('moves unit to adjacent hex', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(1);
  });

  it('moves unit along multi-step path', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 3 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(1);
  });

  it('rejects movement with insufficient movement points', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 1 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
    });
    // Should not move — cost is 2 but only 1 movement left
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('rejects movement into impassable terrain (ocean)', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    // Set target tile to ocean
    const tiles = new Map(state.map.tiles);
    setTile(tiles, { q: 1, r: 0 }, 'ocean');
    const next = movementSystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] },
    );
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('rejects movement into mountains', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const tiles = new Map(state.map.tiles);
    setTile(tiles, { q: 1, r: 0 }, 'plains', 'mountains');
    const next = movementSystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] },
    );
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('depletes all movement for hills (binary deplete, F-03)', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 3 })],
    ]);
    const state = createTestState({ units });
    const tiles = new Map(state.map.tiles);
    setTile(tiles, { q: 1, r: 0 }, 'grassland', 'hills');
    const next = movementSystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] },
    );
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(0); // F-03: hills deplete all remaining MP
  });

  it('rejects movement to non-adjacent hex', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 5 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 3, r: 0 }], // not adjacent
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('rejects movement of non-existent unit', () => {
    const state = createTestState();
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'nonexistent',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.lastValidation).toEqual({
      valid: false,
      reason: 'Unit not found',
      category: 'movement',
    });
    expect(next.units).toEqual(state.units);
  });

  it('rejects movement of enemy unit', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', owner: 'p2', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
  });

  it('prevents stacking two friendly military units (Civ VII 1-per-class)', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', typeId: 'warrior', position: { q: 0, r: 0 }, movementLeft: 2 })],
      ['u2', createTestUnit({ id: 'u2', typeId: 'warrior', position: { q: 1, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
    expect(next.lastValidation?.valid).toBe(false);
  });

  describe('Civ VII stacking (1 military + 1 civilian per tile)', () => {
    it('allows a civilian to move onto a friendly military unit', () => {
      const units = new Map([
        ['warrior1', createTestUnit({ id: 'warrior1', typeId: 'warrior', position: { q: 1, r: 0 }, movementLeft: 0 })],
        ['settler1', createTestUnit({ id: 'settler1', typeId: 'settler', position: { q: 0, r: 0 }, movementLeft: 2 })],
      ]);
      const state = createTestState({ units });
      const next = movementSystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'settler1',
        path: [{ q: 1, r: 0 }],
      });
      expect(next.units.get('settler1')!.position).toEqual({ q: 1, r: 0 });
      expect(next.units.get('warrior1')!.position).toEqual({ q: 1, r: 0 });
    });

    it('allows a military unit to move onto a friendly civilian', () => {
      const units = new Map([
        ['settler1', createTestUnit({ id: 'settler1', typeId: 'settler', position: { q: 1, r: 0 }, movementLeft: 0 })],
        ['warrior1', createTestUnit({ id: 'warrior1', typeId: 'warrior', position: { q: 0, r: 0 }, movementLeft: 2 })],
      ]);
      const state = createTestState({ units });
      const next = movementSystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'warrior1',
        path: [{ q: 1, r: 0 }],
      });
      expect(next.units.get('warrior1')!.position).toEqual({ q: 1, r: 0 });
      expect(next.units.get('settler1')!.position).toEqual({ q: 1, r: 0 });
    });

    it('rejects military stacking on friendly military', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', typeId: 'warrior', position: { q: 0, r: 0 }, movementLeft: 2 })],
        ['u2', createTestUnit({ id: 'u2', typeId: 'warrior', position: { q: 1, r: 0 }, movementLeft: 0 })],
      ]);
      const state = createTestState({ units });
      const next = movementSystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }],
      });
      expect(next.units.get('u1')!.position).toEqual({ q: 0, r: 0 });
      expect((next.lastValidation as { valid: false; reason: string } | null | undefined)?.reason).toBe('Cannot stack two military units on the same tile');
    });

    it('rejects civilian stacking on friendly civilian', () => {
      const units = new Map([
        ['s1', createTestUnit({ id: 's1', typeId: 'settler', position: { q: 0, r: 0 }, movementLeft: 2 })],
        ['s2', createTestUnit({ id: 's2', typeId: 'settler', position: { q: 1, r: 0 }, movementLeft: 0 })],
      ]);
      const state = createTestState({ units });
      const next = movementSystem(state, {
        type: 'MOVE_UNIT',
        unitId: 's1',
        path: [{ q: 1, r: 0 }],
      });
      expect(next.units.get('s1')!.position).toEqual({ q: 0, r: 0 });
      expect((next.lastValidation as { valid: false; reason: string } | null | undefined)?.reason).toBe('Cannot stack two civilian units on the same tile');
    });

    it('does not allow stacking onto an enemy-occupied tile via ZoC stop', () => {
      // Path (0,0) -> (1,0) -> (2,0). Enemy warrior at (2,-1) exerts ZoC on (1,0).
      // The enemy at (1,0)? No — we put an enemy settler at (1,0) directly so the
      // intermediate stop hex is enemy-occupied, exercising the enemy-block path.
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const units = new Map([
        ['mine', createTestUnit({ id: 'mine', owner: 'p1', typeId: 'warrior', position: { q: 0, r: 0 }, movementLeft: 5 })],
        ['blocker', createTestUnit({ id: 'blocker', owner: 'p2', typeId: 'settler', position: { q: 1, r: 0 }, movementLeft: 0 })],
        ['zoc', createTestUnit({ id: 'zoc', owner: 'p2', typeId: 'warrior', position: { q: 2, r: -1 }, movementLeft: 0 })],
      ]);
      const state = createTestState({ units, players, currentPlayerId: 'p1' });
      const next = movementSystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'mine',
        path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
      });
      // Enemy blocks at ZoC stop position (1,0).
      expect(next.units.get('mine')!.position).toEqual({ q: 0, r: 0 });
      expect((next.lastValidation as { valid: false; reason: string } | null | undefined)?.reason).toBe('Cannot move into a tile occupied by an enemy');
    });
  });

  it('breaks fortification on movement', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2, fortified: true })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.units.get('u1')!.fortified).toBe(false);
  });

  it('adds log entry on successful move', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const next = movementSystem(state, {
      type: 'MOVE_UNIT',
      unitId: 'u1',
      path: [{ q: 1, r: 0 }],
    });
    expect(next.log.length).toBe(1);
    expect(next.log[0].type).toBe('move');
  });

  it('ignores non-MOVE_UNIT actions', () => {
    const state = createTestState();
    const next = movementSystem(state, { type: 'END_TURN' });
    expect(next.lastValidation).toBeNull();
    expect(next.units).toEqual(state.units);
  });

  describe('Zone of Control', () => {
    it('stops movement when entering ZoC of enemy unit', () => {
      // Enemy warrior at (2, 0). Moving unit walks (0,0) -> (1,0) -> (2,0) would be into it,
      // but we place enemy at (2, -1) so (1,0) is adjacent to enemy = ZoC hex.
      // Unit at (0,0), path [(1,0), (2,0)]. Enemy warrior at (2, -1) is adjacent to (1,0).
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, movementLeft: 5, typeId: 'warrior' })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', position: { q: 2, r: -1 }, movementLeft: 2, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units, players, currentPlayerId: 'p1' });
      const next = movementSystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
      });
      // Unit should stop at (1, 0) due to ZoC of enemy at (2, -1)
      expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
      expect(next.units.get('u1')!.movementLeft).toBe(0);
    });

    it('cavalry ignores ZoC and completes full path', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, movementLeft: 5, typeId: 'chariot' })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', position: { q: 2, r: -1 }, movementLeft: 2, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units, players, currentPlayerId: 'p1' });
      const next = movementSystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
      });
      // Cavalry should complete the full path
      expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
      expect(next.units.get('u1')!.movementLeft).toBe(3); // 5 - 2
    });

    it('civilian units do not exert ZoC', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, movementLeft: 5, typeId: 'warrior' })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', position: { q: 2, r: -1 }, movementLeft: 2, typeId: 'settler' })],
      ]);
      const state = createTestState({ units, players, currentPlayerId: 'p1' });
      const next = movementSystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }, { q: 2, r: 0 }],
      });
      // Settler does not exert ZoC, so unit moves fully
      expect(next.units.get('u1')!.position).toEqual({ q: 2, r: 0 });
      expect(next.units.get('u1')!.movementLeft).toBe(3);
    });

    it('ZoC sets movementLeft to 0', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, movementLeft: 5, typeId: 'warrior' })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', position: { q: 1, r: -1 }, movementLeft: 2, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units, players, currentPlayerId: 'p1' });
      const next = movementSystem(state, {
        type: 'MOVE_UNIT',
        unitId: 'u1',
        path: [{ q: 1, r: 0 }],
      });
      // (1,0) is adjacent to enemy at (1,-1), so ZoC stops movement
      expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
      expect(next.units.get('u1')!.movementLeft).toBe(0);
    });
  });

  describe('UPGRADE_UNIT', () => {
    it('upgrades a warrior to swordsman with gold cost', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1', gold: 500, researchedTechs: ['iron_working'] })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, typeId: 'warrior', movementLeft: 2 })],
      ]);
      const state = createTestState({ units, players, currentPlayerId: 'p1' });
      const next = movementSystem(state, { type: 'UPGRADE_UNIT', unitId: 'u1' });

      expect(next.units.get('u1')!.typeId).toBe('swordsman');
      expect(next.units.get('u1')!.movementLeft).toBe(0);
      // Upgrade cost is 2x target unit cost (deducted from 500)
      expect(next.players.get('p1')!.gold).toBeLessThan(500);
    });

    it('rejects upgrade without required tech', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1', gold: 500, researchedTechs: [] })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units, players, currentPlayerId: 'p1' });
      const next = movementSystem(state, { type: 'UPGRADE_UNIT', unitId: 'u1' });

      // Unit should not change
      expect(next.units.get('u1')!.typeId).toBe('warrior');
      expect(next.players.get('p1')!.gold).toBe(500);
    });

    it('rejects upgrade without enough gold', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1', gold: 10, researchedTechs: ['iron_working'] })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units, players, currentPlayerId: 'p1' });
      const next = movementSystem(state, { type: 'UPGRADE_UNIT', unitId: 'u1' });

      expect(next.units.get('u1')!.typeId).toBe('warrior');
      expect(next.players.get('p1')!.gold).toBe(10);
    });

    it('rejects upgrade for unit with no upgrade path', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1', gold: 500 })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', position: { q: 0, r: 0 }, typeId: 'settler' })],
      ]);
      const state = createTestState({ units, players, currentPlayerId: 'p1' });
      const next = movementSystem(state, { type: 'UPGRADE_UNIT', unitId: 'u1' });

      expect(next.units.get('u1')!.typeId).toBe('settler');
    });

    it('rejects upgrade for enemy unit', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1', gold: 500 })],
        ['p2', createTestPlayer({ id: 'p2', gold: 500 })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p2', position: { q: 0, r: 0 }, typeId: 'warrior' })],
      ]);
      const state = createTestState({ units, players, currentPlayerId: 'p1' });
      const next = movementSystem(state, { type: 'UPGRADE_UNIT', unitId: 'u1' });

      expect(next.units.get('u1')!.typeId).toBe('warrior');
    });
  });

  describe('F-02: navigable river movement bonus', () => {
    /**
     * HEX_DIRECTIONS[0] = E (+q direction).
     * If tile at (0,0) has river on edge 0, and tile at (1,0) has river on edge 3,
     * they share a river edge — movement cost halved (1 → 0.5).
     */
    it('tilesShareRiverEdge detects shared river edge between E-adjacent tiles', () => {
      const tile1: HexTile = {
        coord: { q: 0, r: 0 },
        terrain: 'grassland',
        feature: null,
        resource: null,
        improvement: null,
        building: null,
        river: [0], // edge 0 = E direction facing (1,0)
        elevation: 0.5,
        continent: 1,
      };
      const tile2: HexTile = {
        coord: { q: 1, r: 0 },
        terrain: 'grassland',
        feature: null,
        resource: null,
        improvement: null,
        building: null,
        river: [3], // edge 3 = W direction (opposite of E), facing back to (0,0)
        elevation: 0.5,
        continent: 1,
      };
      expect(tilesShareRiverEdge(tile1, tile2)).toBe(true);
    });

    it('movement cost is halved when crossing a shared river edge', () => {
      const state = createTestState();
      const tiles = new Map(state.map.tiles);
      // Set (0,0) with river on east edge (0) and (1,0) with river on west edge (3)
      const tile00 = tiles.get(coordToKey({ q: 0, r: 0 }))!;
      const tile10 = tiles.get(coordToKey({ q: 1, r: 0 }))!;
      tiles.set(coordToKey({ q: 0, r: 0 }), { ...tile00, river: [0] });
      tiles.set(coordToKey({ q: 1, r: 0 }), { ...tile10, river: [3] });

      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 1 })],
      ]);
      // Normal grassland cost is 1 MP; with river bonus it is 0.5 MP.
      // A unit with only 1 MP can cross if cost = 0.5 (validated against movementLeft).
      // But since we validate with totalCost > unit.movementLeft, 0.5 <= 1 → allowed.
      const next = movementSystem(
        { ...state, map: { ...state.map, tiles }, units },
        { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] },
      );
      expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
      expect(next.units.get('u1')!.movementLeft).toBe(0.5);
    });
  });
});

// ── AA2.3 (F-11): Civilian capture ──

describe('AA2.3 civilian capture', () => {
  it('settler is captured when enemy melee unit moves onto its hex', () => {
    const warrior = createTestUnit({ id: 'warrior1', typeId: 'warrior', owner: 'p1', position: { q: 0, r: 0 }, movementLeft: 2 });
    const settler = createTestUnit({ id: 'settler1', typeId: 'settler', owner: 'p2', position: { q: 1, r: 0 } });

    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', { ...createTestPlayer({ id: 'p1' }) }],
        ['p2', { ...createTestPlayer({ id: 'p2' }) }],
      ]),
      units: new Map([['warrior1', warrior], ['settler1', settler]]),
    });

    const next = movementSystem(state, { type: 'MOVE_UNIT', unitId: 'warrior1', path: [{ q: 1, r: 0 }] });

    // Warrior moved successfully
    expect(next.units.get('warrior1')!.position).toEqual({ q: 1, r: 0 });
    // Settler ownership transferred to p1 (captured)
    expect(next.units.get('settler1')!.owner).toBe('p1');
    // Captured settler has no movement left this turn
    expect(next.units.get('settler1')!.movementLeft).toBe(0);
    // Capture logged
    expect(next.log.some(e => e.message.includes('captured') && e.message.includes('settler'))).toBe(true);
  });

  it('merchant (civilian) is captured by enemy combat unit moving onto its hex', () => {
    // Using 'archer' (ranged/combat) and 'merchant' (civilian) — both known unit types
    const archer = createTestUnit({ id: 'archer1', typeId: 'archer', owner: 'p1', position: { q: 0, r: 0 }, movementLeft: 2 });
    const merchant = createTestUnit({ id: 'merchant1', typeId: 'merchant', owner: 'p2', position: { q: 1, r: 0 } });

    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      units: new Map([['archer1', archer], ['merchant1', merchant]]),
    });

    const next = movementSystem(state, { type: 'MOVE_UNIT', unitId: 'archer1', path: [{ q: 1, r: 0 }] });

    // Merchant ownership transferred to p1
    expect(next.units.get('merchant1')!.owner).toBe('p1');
    expect(next.units.get('merchant1')!.movementLeft).toBe(0);
  });

  it('missionary is captured (not pass-through) per simpler GDD interpretation', () => {
    // Decision: missionaries are capturable (ownership transfer), same as civilians.
    const warrior = createTestUnit({ id: 'warrior1', typeId: 'warrior', owner: 'p1', position: { q: 0, r: 0 }, movementLeft: 2 });
    const missionary = createTestUnit({ id: 'missionary1', typeId: 'missionary', owner: 'p2', position: { q: 1, r: 0 } });

    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      units: new Map([['warrior1', warrior], ['missionary1', missionary]]),
    });

    const next = movementSystem(state, { type: 'MOVE_UNIT', unitId: 'warrior1', path: [{ q: 1, r: 0 }] });

    // Missionary captured (ownership transfer) per the simpler GDD interpretation
    expect(next.units.get('missionary1')!.owner).toBe('p1');
    expect(next.units.get('missionary1')!.movementLeft).toBe(0);
    expect(next.log.some(e => e.message.includes('captured'))).toBe(true);
  });
});

// ── BB3.2: Civilian capture — all civilian categories captured identically ──
// Spec (Civ-VII): settler, explorer, merchant, missionary are all category='civilian'
// and must be captured (ownership transfer, movementLeft=0) when an enemy combat
// unit moves onto their hex. Note: 'builder' does not exist as a unit type in this
// codebase (civilian equivalents are settler/explorer/merchant/missionary).

describe('BB3.2 civilian capture — full category audit', () => {
  function captureState(captorTypeId: string, targetTypeId: string) {
    const captor = createTestUnit({ id: 'captor', typeId: captorTypeId, owner: 'p1', position: { q: 0, r: 0 }, movementLeft: 2 });
    const target = createTestUnit({ id: 'target', typeId: targetTypeId, owner: 'p2', position: { q: 1, r: 0 } });
    return createTestState({
      currentPlayerId: 'p1',
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      units: new Map([['captor', captor], ['target', target]]),
    });
  }

  it('settler is captured — ownership transfers, movementLeft zeroed', () => {
    const state = captureState('warrior', 'settler');
    const next = movementSystem(state, { type: 'MOVE_UNIT', unitId: 'captor', path: [{ q: 1, r: 0 }] });
    expect(next.units.get('target')!.owner).toBe('p1');
    expect(next.units.get('target')!.movementLeft).toBe(0);
    expect(next.log.some(e => e.message.includes('captured') && e.message.includes('settler'))).toBe(true);
  });

  it('explorer (exploration-age civilian) is captured — ownership transfers, movementLeft zeroed', () => {
    // Explorer is the exploration-age civilian; 'builder' does not exist in this codebase.
    const state = captureState('warrior', 'explorer');
    const next = movementSystem(state, { type: 'MOVE_UNIT', unitId: 'captor', path: [{ q: 1, r: 0 }] });
    expect(next.units.get('target')!.owner).toBe('p1');
    expect(next.units.get('target')!.movementLeft).toBe(0);
    expect(next.log.some(e => e.message.includes('captured') && e.message.includes('explorer'))).toBe(true);
  });

  it('missionary is captured — ownership transfers, movementLeft zeroed (same as civilian, not exempted)', () => {
    const state = captureState('warrior', 'missionary');
    const next = movementSystem(state, { type: 'MOVE_UNIT', unitId: 'captor', path: [{ q: 1, r: 0 }] });
    expect(next.units.get('target')!.owner).toBe('p1');
    expect(next.units.get('target')!.movementLeft).toBe(0);
    expect(next.log.some(e => e.message.includes('captured') && e.message.includes('missionary'))).toBe(true);
  });

  it('merchant is captured — ownership transfers, movementLeft zeroed', () => {
    const state = captureState('warrior', 'merchant');
    const next = movementSystem(state, { type: 'MOVE_UNIT', unitId: 'captor', path: [{ q: 1, r: 0 }] });
    expect(next.units.get('target')!.owner).toBe('p1');
    expect(next.units.get('target')!.movementLeft).toBe(0);
    expect(next.log.some(e => e.message.includes('captured') && e.message.includes('merchant'))).toBe(true);
  });
});
