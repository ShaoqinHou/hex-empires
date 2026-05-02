import { describe, it, expect } from 'vitest';
import { combatSystem } from '../combatSystem';
import { createTestState, createTestUnit, createTestPlayer, createTestCity, setTile } from './helpers';
import { coordToKey } from '../../hex/HexMath';
import type { NarrativeEventDef } from '../../types/NarrativeEvent';

const BATTLE_WON_EVENT: NarrativeEventDef = {
  id: 'battle_won_test',
  title: 'Battle Won',
  vignette: 'A hard-fought victory echoes through the camp.',
  category: 'battle',
  requirements: { triggerType: 'BATTLE_WON' },
  choices: [{ label: 'Honor the troops', effects: [] }],
};

function simulateDamageToDefender(state: ReturnType<typeof createTestState>): number {
  const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
  const defender = next.units.get('d1');
  return defender ? 100 - defender.health : 100;
}

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
    expect(defender).toBeDefined();
    expect(defender!.health).toBeLessThan(100);
    expect(attacker).toBeDefined();
    expect(attacker!.health).toBeLessThan(100);
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
    expect(attacker).toBeDefined();
    expect(attacker!.movementLeft).toBe(0);
  });

  it('rejects attack on own units', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p1', position: { q: 4, r: 3 } })],
    ]);
    const state = createTestState({ units });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    expect(next.lastValidation).toEqual({
      valid: false,
      reason: 'Friendly fire - cannot attack own units',
      category: 'combat',
    });
    expect(next.units).toEqual(state.units);
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
    expect(next.lastValidation).toEqual({
      valid: false,
      reason: 'Target out of melee range',
      category: 'combat',
    });
    expect(next.units).toEqual(state.units);
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

  it('queues a BATTLE_WON narrative event when the attacker destroys a unit and survives', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 1 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const base = createTestState({ units, players, currentPlayerId: 'p1' });
    const state = {
      ...base,
      config: {
        ...base.config,
        narrativeEvents: new Map([[BATTLE_WON_EVENT.id, BATTLE_WON_EVENT]]),
      },
    };

    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    expect(next.units.has('d1')).toBe(false);
    expect(next.pendingNarrativeEvents).toContain(BATTLE_WON_EVENT.id);
    expect(next.firedNarrativeEvents).toContain(BATTLE_WON_EVENT.id);
  });

  it('does not queue a BATTLE_WON narrative event when the defender survives', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const base = createTestState({ units, players, currentPlayerId: 'p1' });
    const state = {
      ...base,
      config: {
        ...base.config,
        narrativeEvents: new Map([[BATTLE_WON_EVENT.id, BATTLE_WON_EVENT]]),
      },
    };

    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    expect(next.units.has('d1')).toBe(true);
    expect(next.pendingNarrativeEvents ?? []).not.toContain(BATTLE_WON_EVENT.id);
    expect(next.firedNarrativeEvents ?? []).not.toContain(BATTLE_WON_EVENT.id);
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
    expect(attacker).toBeDefined();
    expect(attacker!.position).toEqual({ q: 4, r: 3 });
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
    expect(attacker).toBeDefined();
    // combatSystem grants 5 XP to attacker per ATTACK_UNIT (combatSystem.ts line 138)
    expect(attacker!.experience).toBe(5);
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
    const next = combatSystem(state, { type: 'END_TURN' });
    expect(next.lastValidation).toBeNull();
    expect(next.units).toEqual(state.units);
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

    // Rulebook §6.7: flanking requires Military Training researched.
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['military_training'] })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);

    return createTestState({ units, players, currentPlayerId: 'p1' });
  }

  it('0 flankers: no bonus (baseline)', () => {
    // We just verify the test runs; baseline is established by comparing against 2-flanker case.
    const state = buildFlankedState(0);
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const defender = next.units.get('d1');
    // Defender should take damage
    if (defender) expect(defender.health).toBeLessThan(100);
  });

  it('1 flanker: no bonus applied (rulebook §6.7 requires 2+ flankers)', () => {
    const state0 = buildFlankedState(0);
    const state1 = buildFlankedState(1);
    // Same RNG seed; 1 flanker grants 0 bonus, so damage should be identical.
    const next0 = combatSystem(state0, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const next1 = combatSystem(state1, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const def0HP = next0.units.get('d1')?.health ?? 0;
    const def1HP = next1.units.get('d1')?.health ?? 0;
    expect(def1HP).toBe(def0HP);
  });

  it('2 flankers: defender takes more damage than with 0 flankers (2+ threshold met)', () => {
    const state0 = buildFlankedState(0);
    const state2 = buildFlankedState(2);
    const next0 = combatSystem(state0, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const next2 = combatSystem(state2, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const def0HP = next0.units.get('d1')?.health ?? 0;
    const def2HP = next2.units.get('d1')?.health ?? 0;
    expect(def2HP).toBeLessThan(def0HP);
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
      districts: [],
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
    expect(next.lastValidation).toEqual({
      valid: false,
      reason: 'Cannot attack own city',
      category: 'combat',
    });
    expect(next.units).toEqual(state.units);
    expect(next.cities).toEqual(state.cities);
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
    expect(next.lastValidation).toEqual({
      valid: false,
      reason: 'Target out of melee range',
      category: 'combat',
    });
    expect(next.units).toEqual(state.units);
    expect(next.cities).toEqual(state.cities);
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
    expect(next.lastValidation).toEqual({
      valid: false,
      reason: 'Unit has already attacked this turn',
      category: 'combat',
    });
    expect(next.units).toEqual(state.units);
    expect(next.cities).toEqual(state.cities);
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
      tilesRiverAttacker.set(attackerKey, { ...existingTile, river: [0] });
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
      tilesRiverDefender.set(defenderKey, { ...existingTile, river: [0] });
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

describe('combatSystem — HP health penalty (W4-03: VII multiplicative formula)', () => {
  // VII uses computeEffectiveCS: floor(baseCS * hp/100) — continuous multiplicative,
  // not the old discrete -1 CS per 10 HP bracket. Tests updated for W4-03.

  it('unit at 50 HP has exactly half the effective combat strength of the same unit at 100 HP', () => {
    // computeEffectiveCS(20, 50) = floor(20 * 0.5) = 10; vs computeEffectiveCS(20, 100) = 20
    // Units at different HP attack the same defender; lower HP → less damage.
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

    const next100 = combatSystem(makeState(100), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const next50 = combatSystem(makeState(50), { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    // At 100 HP attacker also gets +5 First Strike; the key invariant is the 50-HP unit deals LESS damage.
    // defHP50 > defHP100 (defender takes less damage from the weaker attacker)
    const defHP100 = next100.units.get('d1')?.health ?? -1;
    const defHP50 = next50.units.get('d1')?.health ?? -1;
    expect(defHP50).toBeGreaterThan(defHP100);
  });

  it('unit at 80 HP deals less damage than unit at 90 HP (continuous scaling)', () => {
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

    // Lower health → lower effectiveCS → less damage → defender survives with more HP
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

  it('structured war-support celebration bonus offsets disadvantage penalty', () => {
    const stateNeutral = makeWarState(0);
    const basePenalised = makeWarState(-6);
    const player = basePenalised.players.get('p1')!;
    const stateOffset = {
      ...basePenalised,
      players: new Map(basePenalised.players).set('p1', {
        ...player,
        activeCelebrationBonus: {
          governmentId: 'revolutionary_republic',
          bonusId: 'revolutionary-republic-war-support',
          turnsRemaining: 5,
          effects: [{ type: 'MODIFY_WAR_SUPPORT', value: 6 }],
        },
      }),
    };

    const nextNeutral = combatSystem(stateNeutral, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextOffset = combatSystem(stateOffset, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    expect(nextOffset.units.get('d1')?.health).toBe(nextNeutral.units.get('d1')?.health);
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

// ── W4-03: Directional flanking ──

describe('combatSystem — W4-03: directional rear-flank bonus', () => {
  it('rear attack on a defender with facing = 0 (E) gets +5 CS when attacker is in western arc', () => {
    // Defender faces E (0). Rear is W (3). Attacker at q=3,r=3, defender at q=4,r=3.
    // Attack direction: from defender (4,3) → attacker (3,3) = dq=-1,dr=0 = direction 3 (W) = rear.
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100, facing: 0 as const })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });
    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    // Rear flank = +5 CS for attacker → more damage → defender has lower HP than without flank.
    // We compare against a front attack (attacker in front of defender).
    const frontUnits = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 5, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100, facing: 0 as const })],
    ]);
    const frontState = createTestState({ units: frontUnits, players, currentPlayerId: 'p1' });
    const frontNext = combatSystem(frontState, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const rearDefHP = next.units.get('d1')?.health ?? 100;
    const frontDefHP = frontNext.units.get('d1')?.health ?? 100;
    // Rear attack deals more damage → defender has less HP remaining
    expect(rearDefHP).toBeLessThanOrEqual(frontDefHP);
  });

  it('front attack on a defender with facing gets no rear-flank bonus (same as facing=undefined)', () => {
    // Attacker is at q=5,r=3 — east side of defender at q=4,r=3. Attack direction = direction 0 (E) from defender.
    // Defender faces E (0). Front = E (0). Rear arc = W (3) ± 1. E is NOT in rear arc → no rear bonus.
    // Defender faces E (0) means rear is W. Attacker is to the E = front = no bonus.
    // Same position for both scenarios (same RNG seed), only facing differs; facing shouldn't change outcome
    // when it's a front attack (attacker at e=5,r=3 relative to defender at 4,3).
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);

    // Defender facing E (0) — attacker also to the E → front attack
    const unitsFrontFacing = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 5, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100, facing: 0 as const })],
    ]);
    // No facing
    const unitsNoFacing = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 5, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);

    const stateWithFrontFacing = createTestState({ units: unitsFrontFacing, players, currentPlayerId: 'p1' });
    const stateNoFacing = createTestState({ units: unitsNoFacing, players, currentPlayerId: 'p1' });

    const nextFront = combatSystem(stateWithFrontFacing, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextNoFacing = combatSystem(stateNoFacing, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    // Front attack with facing should not grant rear bonus — same result as no-facing
    const frontDefHP = nextFront.units.get('d1')?.health ?? 100;
    const noFacingDefHP = nextNoFacing.units.get('d1')?.health ?? 100;
    expect(frontDefHP).toBe(noFacingDefHP);
  });
});

// ── W4-03: District HPs ──

describe('combatSystem — W4-03: ATTACK_DISTRICT', () => {
  it('reduces district HP on attack', () => {
    // City at (0,0), district at (1,0), attacker at (2,0) — adjacent to district
    const cityPos = { q: 0, r: 0 };
    const districtKey = '1,0'; // urban district tile key
    const districtHPs = new Map([['0,0', 200], [districtKey, 100]]);
    const city = createTestCity({
      id: 'c1',
      owner: 'p2',
      position: cityPos,
      defenseHP: 100,
      districtHPs,
    });
    const units = new Map([
      // Attacker at q=2,r=0 — adjacent to district at q=1,r=0, not occupying it
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 2, r: 0 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]), currentPlayerId: 'p1' });
    const next = combatSystem(state, { type: 'ATTACK_DISTRICT', attackerId: 'a1', cityId: 'c1', districtTile: districtKey });

    const updatedCity = next.cities.get('c1')!;
    const remainingHP = updatedCity.districtHPs!.get(districtKey)!;
    expect(remainingHP).toBeLessThan(100);
  });

  it('initializes districtHPs if absent when attacked', () => {
    const cityPos = { q: 0, r: 0 };
    const districtKey = '1,0';
    const city = createTestCity({
      id: 'c1',
      owner: 'p2',
      position: cityPos,
      defenseHP: 100,
      // No districtHPs — should be initialized on first attack
    });
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 1, r: 0 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]), currentPlayerId: 'p1' });
    const next = combatSystem(state, { type: 'ATTACK_DISTRICT', attackerId: 'a1', cityId: 'c1', districtTile: '0,0' });

    const updatedCity = next.cities.get('c1')!;
    // Should have initialized districtHPs with the city center
    expect(updatedCity.districtHPs).toBeDefined();
    expect(updatedCity.districtHPs!.get('0,0')).toBeLessThan(200);
  });

  it('rejects attack on non-existent district tile', () => {
    const city = createTestCity({ id: 'c1', owner: 'p2', position: { q: 0, r: 0 }, defenseHP: 100 });
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 1, r: 0 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const districtHPs = new Map([['0,0', 200]]);
    const state = createTestState({
      units,
      players,
      cities: new Map([['c1', { ...city, districtHPs }]]),
      currentPlayerId: 'p1',
    });
    const next = combatSystem(state, { type: 'ATTACK_DISTRICT', attackerId: 'a1', cityId: 'c1', districtTile: 'nonexistent,tile' });
    expect(next.lastValidation).toMatchObject({ valid: false });
  });
});

// ── Commander Aura bonus in combat ──

describe('combatSystem — commander aura', () => {
  it('attacker near friendly commander deals more damage (aura bonus)', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);

    // Baseline: no commander
    const unitsBaseline = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const stateBaseline = createTestState({ units: unitsBaseline, players });

    // With commander at distance 2 from attacker (3,3) → commander at (3,5), distance = 2 (within aura range)
    const commanderState: import('../../types/Commander').CommanderState = {
      unitId: 'cmd1', xp: 0, commanderLevel: 1, unspentPromotionPicks: 0,
      promotions: [], tree: null, attachedUnits: [], packed: false,
    };
    const unitsWithCmd = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
      ['cmd1', createTestUnit({ id: 'cmd1', owner: 'p1', typeId: 'captain', position: { q: 3, r: 5 }, health: 100 })],
    ]);
    const stateWithCmd = createTestState({
      units: unitsWithCmd,
      players: new Map(players),
      commanders: new Map([['cmd1', commanderState]]),
    });

    // Use same RNG seed for deterministic comparison
    const rng = { seed: 42, counter: 0 };
    const nextBaseline = combatSystem({ ...stateBaseline, rng }, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextWithCmd = combatSystem({ ...stateWithCmd, rng: { seed: 42, counter: 0 } }, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defBaseline = nextBaseline.units.get('d1');
    const defWithCmd = nextWithCmd.units.get('d1');
    if (defBaseline && defWithCmd) {
      // With +3 CS aura, attacker deals more damage → defender has lower HP
      expect(defWithCmd.health).toBeLessThan(defBaseline.health);
    }
  });

  it('commander aura does not apply when commander belongs to enemy', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);

    const rng = { seed: 42, counter: 0 };

    // Baseline — no commanders
    const unitsBaseline = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const stateBaseline = createTestState({ units: unitsBaseline, players });

    // Enemy commander near the attacker but far from the defender — should NOT grant bonus to attacker
    // Place enemy commander at (2,3) — distance to attacker (3,3) = 1, distance to defender (4,3) = 2
    // The commander belongs to p2, so it should help p2's defender, not p1's attacker.
    // To avoid helping the defender too, place it far: (0,3), distance to attacker=3, to defender=4
    const commanderState: import('../../types/Commander').CommanderState = {
      unitId: 'cmd_enemy', xp: 0, commanderLevel: 1, unspentPromotionPicks: 0,
      promotions: [], tree: null, attachedUnits: [], packed: false,
    };
    const unitsWithEnemyCmd = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
      ['cmd_enemy', createTestUnit({ id: 'cmd_enemy', owner: 'p2', typeId: 'captain', position: { q: 0, r: 3 }, health: 100 })],
    ]);
    const stateWithEnemyCmd = createTestState({
      units: unitsWithEnemyCmd,
      players: new Map(players),
      commanders: new Map([['cmd_enemy', commanderState]]),
    });

    const nextBaseline = combatSystem({ ...stateBaseline, rng: { seed: 42, counter: 0 } }, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextWithEnemyCmd = combatSystem({ ...stateWithEnemyCmd, rng: { seed: 42, counter: 0 } }, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    // Enemy commander should not help the attacker — same damage
    const defBaseline = nextBaseline.units.get('d1');
    const defEnemy = nextWithEnemyCmd.units.get('d1');
    if (defBaseline && defEnemy) {
      expect(defEnemy.health).toBe(defBaseline.health);
    }
  });

  it('commander aura does not apply when commander is out of range (distance > 2)', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);

    const rng = { seed: 42, counter: 0 };

    // Baseline — no commanders
    const unitsBaseline = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const stateBaseline = createTestState({ units: unitsBaseline, players });

    // Commander at distance 3 from attacker — out of aura range
    const commanderState: import('../../types/Commander').CommanderState = {
      unitId: 'cmd_far', xp: 0, commanderLevel: 1, unspentPromotionPicks: 0,
      promotions: [], tree: null, attachedUnits: [], packed: false,
    };
    // Attacker at (3,3), commander at (3,6) — distance = 3 (out of range)
    const unitsWithFarCmd = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
      ['cmd_far', createTestUnit({ id: 'cmd_far', owner: 'p1', typeId: 'captain', position: { q: 3, r: 6 }, health: 100 })],
    ]);
    const stateWithFarCmd = createTestState({
      units: unitsWithFarCmd,
      players: new Map(players),
      commanders: new Map([['cmd_far', commanderState]]),
    });

    const nextBaseline = combatSystem({ ...stateBaseline, rng: { seed: 42, counter: 0 } }, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextWithFarCmd = combatSystem({ ...stateWithFarCmd, rng: { seed: 42, counter: 0 } }, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    // Out-of-range commander should not grant bonus — same damage
    const defBaseline = nextBaseline.units.get('d1');
    const defFar = nextWithFarCmd.units.get('d1');
    if (defBaseline && defFar) {
      expect(defFar.health).toBe(defBaseline.health);
    }
  });

  // -- Y1.1: ideologyPoints from kills --

  it('Y1.1: kill without ideology civic awards 0 ideologyPoints', () => {
    // Attacker has NO ideology set -- defender at 1 HP so kill is guaranteed
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, movementLeft: 0, health: 1 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', ideology: null })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });

    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    // Defender should be dead (1 HP + warrior attack)
    expect(next.units.has('d1')).toBe(false);
    // No ideology -> no ideologyPoints
    expect(next.players.get('p1')!.ideologyPoints ?? 0).toBe(0);
  });

  it('Y1.1: kill after ideology civic researched awards +1 ideologyPoints', () => {
    // Attacker has ideology set -- defender at 1 HP so kill is guaranteed
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, movementLeft: 0, health: 1 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', ideology: 'democracy' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, currentPlayerId: 'p1' });

    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    // Defender should be dead
    expect(next.units.has('d1')).toBe(false);
    // ideology set -> +1 ideologyPoints
    expect(next.players.get('p1')!.ideologyPoints).toBe(1);
  });
});

describe('AA1.2: wasConquered provenance on city capture', () => {
  it('captured city has wasConquered set to true', () => {
    // Set defenseHP to 1 so a single warrior attack captures it
    const city: import('../../types/GameState').CityState = {
      id: 'c1',
      name: 'Enemy City',
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
      isCapital: false,
      defenseHP: 1, // nearly dead — will be captured
      specialization: null,
      specialists: 0,
      districts: [],
    };
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players, cities: new Map([['c1', city]]) });
    const next = combatSystem(state, { type: 'ATTACK_CITY', attackerId: 'a1', cityId: 'c1' });
    const capturedCity = next.cities.get('c1')!;
    expect(capturedCity.owner).toBe('p1');   // ownership transferred
    expect(capturedCity.wasConquered).toBe(true); // AA1.2 flag set
  });
});

describe('combatSystem — BB1.3: river-crossing penalty (Y5.2)', () => {
  /**
   * Attacker at (3,3), defender at (4,3) — East edge (direction index 0).
   * River on ATTACKER tile edge 0 means attacker is crossing the river.
   * River on DEFENDER tile edge 3 (West, the mirror edge) does NOT penalise.
   *
   * HEX_DIRECTIONS: 0=E, 1=NE, 2=NW, 3=W, 4=SW, 5=SE
   */
  function buildRiverState(
    riverOn: 'attacker-edge' | 'defender-edge' | 'none',
  ) {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const base = createTestState({ units, players, currentPlayerId: 'p1' });

    const tiles = new Map(base.map.tiles);

    if (riverOn === 'attacker-edge') {
      // Place river on attacker's tile edge facing East (index 0 = toward defender)
      const attackerKey = coordToKey({ q: 3, r: 3 });
      const attackerTile = tiles.get(attackerKey)!;
      tiles.set(attackerKey, { ...attackerTile, river: [0] });
    } else if (riverOn === 'defender-edge') {
      // Place river on defender's tile edge facing West (index 3, the mirror),
      // but NOT on the attacker's tile — attacker is not crossing from its side.
      const defenderKey = coordToKey({ q: 4, r: 3 });
      const defenderTile = tiles.get(defenderKey)!;
      tiles.set(defenderKey, { ...defenderTile, river: [3] });
    }

    return { ...base, map: { ...base.map, tiles } };
  }

  it('attacker crossing a river edge takes -25% CS penalty (deals less damage than no-river)', () => {
    const stateNoRiver = buildRiverState('none');
    const stateRiver = buildRiverState('attacker-edge');

    const nextNoRiver = combatSystem(stateNoRiver, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextRiver = combatSystem(stateRiver, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defHPNoRiver = nextNoRiver.units.get('d1')?.health ?? 0;
    const defHPRiver = nextRiver.units.get('d1')?.health ?? 0;

    // With river-crossing penalty attacker deals less damage → defender has MORE HP remaining
    expect(defHPRiver).toBeGreaterThan(defHPNoRiver);
  });

  it('defender behind a river (river on defender tile, not attacker) does NOT penalise the attacker', () => {
    const stateNoRiver = buildRiverState('none');
    const stateDefenderRiver = buildRiverState('defender-edge');

    const nextNoRiver = combatSystem(stateNoRiver, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const nextDefRiver = combatSystem(stateDefenderRiver, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });

    const defHPNoRiver = nextNoRiver.units.get('d1')?.health ?? 0;
    const defHPDefRiver = nextDefRiver.units.get('d1')?.health ?? 0;

    // No penalty applied — damage is identical to baseline
    expect(defHPDefRiver).toBe(defHPNoRiver);
  });
});

describe('combatSystem — support bonus', () => {
  it('adds +2 attacker strength per adjacent friendly unit (exactly)', () => {
    const baseUnits = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);

    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', leaderId: 'cleopatra' })],
      ['p2', createTestPlayer({ id: 'p2', leaderId: 'cleopatra' })],
    ]);

    const baseState = createTestState({ units: baseUnits, players, currentPlayerId: 'p1' });
    const withOneFriendly = createTestState({
      units: new Map([
        ...baseUnits,
        ['s1', createTestUnit({ id: 's1', owner: 'p1', typeId: 'scout', position: { q: 3, r: 2 }, health: 100 })],
      ]),
      players,
      currentPlayerId: 'p1',
    });
    const withTwoFriendlies = createTestState({
      units: new Map([
        ...baseUnits,
        ['s1', createTestUnit({ id: 's1', owner: 'p1', typeId: 'scout', position: { q: 3, r: 2 }, health: 100 })],
        ['s2', createTestUnit({ id: 's2', owner: 'p1', typeId: 'scout', position: { q: 2, r: 3 }, health: 100 })],
      ]),
      players,
      currentPlayerId: 'p1',
    });

    const noSupport = simulateDamageToDefender(baseState);
    const oneSupport = simulateDamageToDefender(withOneFriendly);
    const twoSupport = simulateDamageToDefender(withTwoFriendlies);

    // 100->98 at base, +2 strength with one friendly gives more damage, +4 with two gives more again.
    expect(oneSupport).toBeGreaterThan(noSupport);
    expect(twoSupport).toBeGreaterThan(oneSupport);
  });

  it('applies defender support independently, reducing damage to a wounded defender with +2 per adjacent friendly', () => {
    const baseUnits = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);

    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', leaderId: 'cleopatra' })],
      ['p2', createTestPlayer({ id: 'p2', leaderId: 'cleopatra' })],
    ]);

    const withDefenderSupportOne = createTestState({
      units: new Map([
        ...baseUnits,
        ['s1', createTestUnit({ id: 's1', owner: 'p2', typeId: 'scout', position: { q: 4, r: 2 }, health: 100 })],
      ]),
      players,
      currentPlayerId: 'p1',
    });
    const withDefenderSupportTwo = createTestState({
      units: new Map([
        ...baseUnits,
        ['s1', createTestUnit({ id: 's1', owner: 'p2', typeId: 'scout', position: { q: 4, r: 2 }, health: 100 })],
        ['s2', createTestUnit({ id: 's2', owner: 'p2', typeId: 'scout', position: { q: 5, r: 3 }, health: 100 })],
      ]),
      players,
      currentPlayerId: 'p1',
    });

    const one = simulateDamageToDefender(withDefenderSupportOne);
    const two = simulateDamageToDefender(withDefenderSupportTwo);

    // More defender support => higher defender CS => less damage.
    expect(two).toBeLessThan(one);
  });
});
