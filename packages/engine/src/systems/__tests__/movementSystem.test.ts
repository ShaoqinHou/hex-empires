import { describe, it, expect } from 'vitest';
import { movementSystem } from '../movementSystem';
import { createTestState, createTestUnit, createTestPlayer, setTile } from './helpers';
import { coordToKey } from '../../hex/HexMath';

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

  it('charges extra movement for hills', () => {
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
    expect(next.units.get('u1')!.movementLeft).toBe(1); // cost 2 (1 base + 1 hills)
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
});
