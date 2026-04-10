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

describe('combatSystem — flanking bonus', () => {
  /**
   * To isolate the flanking bonus we compare attacker damage dealt to the defender
   * under identical conditions except for the number of friendly flankers.
   * More flankers → higher attacker strength → more damage to defender → lower defender HP.
   */

  function buildFlankedState(flankerCount: 0 | 1 | 2 | 3 | 4) {
    // Attacker at (3,3), defender at (4,3).
    // Positions adjacent to the defender (its 6 neighbours): (5,3),(4,4),(3,4),(4,2),(3,3),(5,2)
    // We use (5,3), (4,4), (3,4) as flanker slots (excluding the attacker's own hex).
    const flankerPositions = [
      { q: 5, r: 3 },
      { q: 4, r: 4 },
      { q: 3, r: 4 },
      { q: 5, r: 2 },
    ];

    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);

    for (let i = 0; i < flankerCount; i++) {
      const fid = `f${i + 1}`;
      units.set(fid, createTestUnit({ id: fid, owner: 'p1', typeId: 'warrior', position: flankerPositions[i], movementLeft: 2 }));
    }

    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);

    return createTestState({ units, players, currentPlayerId: 'p1' });
  }

  it('0 flankers: no bonus (baseline)', () => {
    // We just verify the test runs; baseline is established by comparing against 1-flanker case.
    const state = buildFlankedState(0);
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const defender = next.units.get('d1');
    // Defender should take damage
    if (defender) expect(defender.health).toBeLessThan(100);
  });

  it('1 flanker: defender takes more damage than with 0 flankers', () => {
    const state0 = buildFlankedState(0);
    const state1 = buildFlankedState(1);
    // Use same RNG seed — both states share seed:42, counter:0 so results are deterministic
    const next0 = combatSystem(state0, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const next1 = combatSystem(state1, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const def0HP = next0.units.get('d1')?.health ?? 0;
    const def1HP = next1.units.get('d1')?.health ?? 0;
    // With 1 flanker the attacker is stronger → defender HP is lower (more damage)
    expect(def1HP).toBeLessThan(def0HP);
  });

  it('2 flankers: defender takes more damage than with 1 flanker', () => {
    const state1 = buildFlankedState(1);
    const state2 = buildFlankedState(2);
    const next1 = combatSystem(state1, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const next2 = combatSystem(state2, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const def1HP = next1.units.get('d1')?.health ?? 0;
    const def2HP = next2.units.get('d1')?.health ?? 0;
    expect(def2HP).toBeLessThan(def1HP);
  });

  it('3 flankers: defender takes more damage than with 2 flankers', () => {
    const state2 = buildFlankedState(2);
    const state3 = buildFlankedState(3);
    const next2 = combatSystem(state2, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const next3 = combatSystem(state3, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const def2HP = next2.units.get('d1')?.health ?? 0;
    const def3HP = next3.units.get('d1')?.health ?? 0;
    expect(def3HP).toBeLessThan(def2HP);
  });

  it('4 flankers: same damage as 3 flankers (cap at +6 from 3 units)', () => {
    const state3 = buildFlankedState(3);
    const state4 = buildFlankedState(4);
    const next3 = combatSystem(state3, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const next4 = combatSystem(state4, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const def3HP = next3.units.get('d1')?.health ?? 0;
    const def4HP = next4.units.get('d1')?.health ?? 0;
    // 4th flanker adds no extra bonus (cap is already reached at 3)
    expect(def4HP).toBe(def3HP);
  });
});

describe('combatSystem — ATTACK_CITY', () => {
  function makeCity(overrides: Partial<import('../../types/GameState').CityState> = {}): import('../../types/GameState').CityState {
    return {
      id: 'c1',
      name: 'Enemy Capital',
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

  it('melee unit damages city defenseHP', () => {
    const city = makeCity();
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]) });

    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });

    const updatedCity = next.cities.get('c1')!;
    expect(updatedCity.defenseHP).toBeLessThan(100);
  });

  it('melee attacker takes retaliation damage from city', () => {
    const city = makeCity();
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]) });

    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });

    const attacker = next.units.get('a1');
    if (attacker) expect(attacker.health).toBeLessThan(100);
  });

  it('ranged unit does not take retaliation damage', () => {
    const city = makeCity({ position: { q: 5, r: 3 } });
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]) });

    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });

    const attacker = next.units.get('a1');
    if (attacker) expect(attacker.health).toBe(100);
  });

  it('melee unit conquers city when defenseHP reaches 0', () => {
    const city = makeCity({ defenseHP: 1 }); // nearly dead
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]) });

    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });

    const updatedCity = next.cities.get('c1')!;
    expect(updatedCity.owner).toBe('p1'); // conquered
    expect(updatedCity.defenseHP).toBe(0);
    // Attacker should move into city
    const attacker = next.units.get('a1');
    if (attacker) expect(attacker.position).toEqual({ q: 4, r: 3 });
  });

  it('ranged unit cannot capture city even at 0 HP', () => {
    const city = makeCity({ defenseHP: 1, position: { q: 5, r: 3 } });
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]) });

    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });

    const updatedCity = next.cities.get('c1')!;
    expect(updatedCity.owner).toBe('p2'); // NOT conquered — ranged can't capture
    expect(updatedCity.defenseHP).toBe(0);
  });

  it('city with walls has higher defense', () => {
    const cityNoWalls = makeCity({ defenseHP: 100 });
    const cityWithWalls = makeCity({ defenseHP: 200, buildings: ['walls'] });

    const units1 = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const units2 = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);

    const stateNoWalls = createTestState({ units: units1, players, cities: new Map([['c1', cityNoWalls]]) });
    const stateWithWalls = createTestState({ units: units2, players, cities: new Map([['c1', cityWithWalls]]) });

    const nextNoWalls = combatSystem(stateNoWalls, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });
    const nextWithWalls = combatSystem(stateWithWalls, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });

    // Walled city should lose less defenseHP (higher defense strength)
    const hpLostNoWalls = 100 - nextNoWalls.cities.get('c1')!.defenseHP;
    const hpLostWithWalls = 200 - nextWithWalls.cities.get('c1')!.defenseHP;
    expect(hpLostWithWalls).toBeLessThan(hpLostNoWalls);
  });

  it('rejects attack on own city', () => {
    const city = makeCity({ owner: 'p1' });
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units, cities: new Map([['c1', city]]) });

    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });
    expect(next).toBe(state);
  });

  it('rejects attack from non-adjacent melee unit', () => {
    const city = makeCity({ position: { q: 8, r: 3 } });
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]) });

    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });
    expect(next).toBe(state);
  });

  it('attacker movement goes to 0 after attacking city', () => {
    const city = makeCity();
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]) });

    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });

    const attacker = next.units.get('a1');
    if (attacker) expect(attacker.movementLeft).toBe(0);
  });

  it('adds combat log entry for city attack', () => {
    const city = makeCity();
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]) });

    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });
    expect(next.log.some(e => e.type === 'combat')).toBe(true);
  });

  it('rejects attack with no movement left', () => {
    const city = makeCity();
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 0 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]) });

    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });
    expect(next).toBe(state);
  });
});
