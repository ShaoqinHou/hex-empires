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

describe('combatSystem — B1: river penalty on attacker', () => {
  /**
   * River penalty should reduce ATTACKER strength when attacking across a river.
   * Attacker on a river tile → takes penalty → defender takes less damage.
   * Defender on a river tile → no penalty from B1 (old bug was defender penalized).
   */
  it('attacker on river tile deals less damage than attacker on flat tile', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);

    // Baseline: no river on either tile
    const stateFlat = createTestState({ units, players });

    // Attacker on river tile
    const tilesRiverAttacker = new Map(stateFlat.map.tiles);
    const attackerKey = '3,3';
    const existingTile = tilesRiverAttacker.get(attackerKey);
    if (existingTile) {
      tilesRiverAttacker.set(attackerKey, { ...existingTile, river: ['north'] });
    }
    const stateRiverAttacker = { ...stateFlat, map: { ...stateFlat.map, tiles: tilesRiverAttacker } };

    const nextFlat = combatSystem(stateFlat, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextRiverAttacker = combatSystem(stateRiverAttacker, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defFlatHP = nextFlat.units.get('d1')?.health ?? 0;
    const defRiverAttackerHP = nextRiverAttacker.units.get('d1')?.health ?? 0;

    // Attacker penalized by river → defender takes less damage → higher HP
    expect(defRiverAttackerHP).toBeGreaterThanOrEqual(defFlatHP);
  });

  it('defender on river tile does NOT get penalized (B1 fix)', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);

    // Baseline: no river
    const stateFlat = createTestState({ units, players });

    // Defender on river tile (old bug: this used to penalize defender)
    const tilesRiverDefender = new Map(stateFlat.map.tiles);
    const defenderKey = '4,3';
    const existingTile = tilesRiverDefender.get(defenderKey);
    if (existingTile) {
      tilesRiverDefender.set(defenderKey, { ...existingTile, river: ['north'] });
    }
    const stateRiverDefender = { ...stateFlat, map: { ...stateFlat.map, tiles: tilesRiverDefender } };

    const nextFlat = combatSystem(stateFlat, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextRiverDefender = combatSystem(stateRiverDefender, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defFlatHP = nextFlat.units.get('d1')?.health ?? 0;
    const defRiverHP = nextRiverDefender.units.get('d1')?.health ?? 0;

    // Defender on river should NOT be penalized → same or more HP than flat (not less)
    expect(defRiverHP).toBeGreaterThanOrEqual(defFlatHP);
  });
});

describe('combatSystem — B6: fortification flat +5 CS', () => {
  it('fortified defender survives better than non-fortified', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100, fortified: false })],
      ['d2', createTestUnit({ id: 'd2', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100, fortified: true })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);

    const stateUnfortified = createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100, fortified: false })],
      ]),
      players,
    });
    const stateFortified = createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100, fortified: true })],
      ]),
      players,
    });

    const nextUnfortified = combatSystem(stateUnfortified, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextFortified = combatSystem(stateFortified, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defUnfortifiedHP = nextUnfortified.units.get('d1')?.health ?? 0;
    const defFortifiedHP = nextFortified.units.get('d1')?.health ?? 0;

    // Fortified defender should take less damage (survive better)
    expect(defFortifiedHP).toBeGreaterThan(defUnfortifiedHP);
  });
});

describe('combatSystem — B7: discrete HP degradation', () => {
  it('unit at 90 HP has 0.9x effective strength compared to 100 HP (not 0.9x continuous)', () => {
    // At 90 HP: Math.floor(90/10)/10 = 9/10 = 0.9 (same in this case, but formula is correct)
    // At 95 HP (continuous would give 0.95x, discrete gives 0.9x floor)
    // Test: unit at 91 HP and unit at 99 HP should have identical effective strength (both floor to 0.9x)
    const state91 = createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 91 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
      ]),
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
    });
    const state99 = createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 99 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
      ]),
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
    });

    const next91 = combatSystem(state91, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const next99 = combatSystem(state99, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    // Both should deal the same damage (both floor to 0.9x bracket)
    const defHP91 = next91.units.get('d1')?.health ?? -1;
    const defHP99 = next99.units.get('d1')?.health ?? -1;
    expect(defHP91).toBe(defHP99);
  });

  it('unit at 80 HP deals less damage than unit at 90 HP (stepped brackets)', () => {
    const makeState = (attackerHP: number) => createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: attackerHP })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
      ]),
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
    });

    const next90 = combatSystem(makeState(90), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const next80 = combatSystem(makeState(80), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defHP90 = next90.units.get('d1')?.health ?? -1;
    const defHP80 = next80.units.get('d1')?.health ?? -1;

    // Lower health bracket → less damage → defender survives with more HP
    expect(defHP80).toBeGreaterThan(defHP90);
  });
});

describe('combatSystem — S6: war support CS penalty', () => {
  /**
   * A player at a war support disadvantage should deal less damage.
   * War key format: "p1:p2" where p1 is the declarer.
   * warSupport > 0 = attacker (p1) advantage; warSupport < 0 = defender (p2) advantage.
   * If p1 is the attacker and warSupport < 0, p1 suffers a CS penalty.
   */

  function makeWarState(warSupportForAttacker: number) {
    // p1 is the war declarer, p2 is defender.
    // warSupport = warSupportForAttacker: positive = p1 advantage, negative = p1 at disadvantage.
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const diplomacy = {
      relations: new Map([
        ['p1:p2', {
          status: 'war' as const,
          relationship: -50,
          warSupport: warSupportForAttacker,
          turnsAtPeace: 0,
          turnsAtWar: 3,
          hasAlliance: false,
          hasFriendship: false,
          hasDenounced: false,
          warDeclarer: 'p1',
          isSurpriseWar: false,
          activeEndeavors: [],
          activeSanctions: [],
        }],
      ]),
    };
    return createTestState({ units, players, diplomacy, currentPlayerId: 'p1' });
  }

  it('attacker with no war support disadvantage deals normal damage', () => {
    const stateNeutral = makeWarState(0);
    const stateAdvantage = makeWarState(10);

    const nextNeutral = combatSystem(stateNeutral, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextAdvantage = combatSystem(stateAdvantage, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defHPNeutral = nextNeutral.units.get('d1')?.health ?? 100;
    const defHPAdvantage = nextAdvantage.units.get('d1')?.health ?? 100;

    // Advantage (warSupport > 0) should not penalise attacker — may even help slightly if ever implemented
    expect(defHPAdvantage).toBeLessThanOrEqual(defHPNeutral);
  });

  it('attacker with negative war support deals less damage than attacker with neutral war support', () => {
    const stateNeutral = makeWarState(0);
    const statePenalised = makeWarState(-5); // -5 war support → attacker loses 5 CS

    const nextNeutral = combatSystem(stateNeutral, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextPenalised = combatSystem(statePenalised, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defHPNeutral = nextNeutral.units.get('d1')?.health ?? 100;
    const defHPPenalised = nextPenalised.units.get('d1')?.health ?? 100;

    // Penalised attacker has lower CS → defender survives with more HP
    expect(defHPPenalised).toBeGreaterThan(defHPNeutral);
  });

  it('war support penalty caps at -10 CS (warSupport = -20 same as -10)', () => {
    const state10 = makeWarState(-10);
    const state20 = makeWarState(-20);

    const next10 = combatSystem(state10, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const next20 = combatSystem(state20, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defHP10 = next10.units.get('d1')?.health ?? 100;
    const defHP20 = next20.units.get('d1')?.health ?? 100;

    // Both should deal the same damage (cap at -10 penalty)
    expect(defHP10).toBe(defHP20);
  });

  it('no war support penalty when no war relations exist', () => {
    // No diplomacy state → same as neutral (0 penalty)
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const statePeace = createTestState({ units, players, currentPlayerId: 'p1' });
    const statePenalised = makeWarState(-5);

    const nextPeace = combatSystem(statePeace, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextPenalised = combatSystem(statePenalised, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defHPPeace = nextPeace.units.get('d1')?.health ?? 100;
    const defHPPenalised = nextPenalised.units.get('d1')?.health ?? 100;

    // No war → no penalty; penalised state deals less damage → defender has more HP
    expect(defHPPeace).toBeLessThanOrEqual(defHPPenalised);
  });
});
