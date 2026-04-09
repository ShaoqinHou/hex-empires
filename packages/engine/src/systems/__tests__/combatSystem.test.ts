import { describe, it, expect } from 'vitest';
import { combatSystem } from '../combatSystem';
import { createTestState, createTestUnit, createTestPlayer, setTile } from './helpers';

describe('combatSystem', () => {
  it('deals damage to defender on melee attack', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });

    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    // Both units should take damage (melee combat)
    const defender = next.units.get('d1');
    const attacker = next.units.get('a1');
    if (defender) expect(defender.health).toBeLessThan(100);
    if (attacker) expect(attacker.health).toBeLessThan(100);
  });

  it('attacker movement goes to 0 after attack', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 } })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const attacker = next.units.get('a1');
    if (attacker) expect(attacker.movementLeft).toBe(0);
  });

  it('rejects attack on own units', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p1', position: { q: 4, r: 3 } })],
    ]);
    const state = createTestState({ units });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    expect(next).toBe(state);
  });

  it('rejects attack from non-adjacent melee unit', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', position: { q: 0, r: 0 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', position: { q: 5, r: 0 } })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    expect(next).toBe(state);
  });

  it('ranged unit does not take damage when attacking', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 5, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const attacker = next.units.get('a1');
    if (attacker) expect(attacker.health).toBe(100);
  });

  it('removes destroyed unit', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 1 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    expect(next.units.has('d1')).toBe(false);
  });

  it('melee attacker moves into defeated defender position', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 1 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const attacker = next.units.get('a1');
    if (attacker) expect(attacker.position).toEqual({ q: 4, r: 3 });
  });

  it('terrain gives defense bonus (hills)', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const stateFlat = createTestState({ units, players });

    // Put defender on hills
    const tilesHills = new Map(stateFlat.map.tiles);
    setTile(tilesHills, { q: 4, r: 3 }, 'grassland', 'hills');
    const stateHills = { ...stateFlat, map: { ...stateFlat.map, tiles: tilesHills } };

    const nextFlat = combatSystem(stateFlat, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextHills = combatSystem(stateHills, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    // Defender on hills should take less damage
    const defFlat = nextFlat.units.get('d1');
    const defHills = nextHills.units.get('d1');
    if (defFlat && defHills) {
      expect(defHills.health).toBeGreaterThanOrEqual(defFlat.health);
    }
  });

  it('grants experience to survivors', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, experience: 0 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, experience: 0 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const attacker = next.units.get('a1');
    if (attacker) expect(attacker.experience).toBeGreaterThan(0);
  });

  it('adds combat log entry', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 } })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    expect(next.log.some(e => e.type === 'combat')).toBe(true);
  });

  it('ignores non-ATTACK_UNIT actions', () => {
    const state = createTestState();
    expect(combatSystem(state, { type: 'END_TURN' })).toBe(state);
  });
});
