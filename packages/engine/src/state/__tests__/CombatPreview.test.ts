import { describe, it, expect } from 'vitest';
import { calculateCombatPreview, calculateCityCombatPreview, getAttackableUnits, getAttackableCities } from '../CombatPreview';
import { computeEffectiveCS } from '../CombatAnalytics';
import { createTestState, createTestUnit, createTestPlayer, setTile } from '../../systems/__tests__/helpers';

describe('calculateCombatPreview', () => {
  it('returns cannot-attack preview when attacker not found', () => {
    const state = createTestState();
    const preview = calculateCombatPreview(state, 'nonexistent', 'd1');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Unit not found');
    expect(preview.attackerStrength).toBe(0);
    expect(preview.defenderStrength).toBe(0);
  });

  it('returns cannot-attack preview when defender not found', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'nonexistent');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Unit not found');
  });

  it('returns cannot-attack preview when not players turn', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p2', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p1', typeId: 'warrior', position: { q: 4, r: 3 } })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });
    const preview = calculateCombatPreview(state, 'a1', 'd1');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Not your turn');
  });

  it('returns cannot-attack preview for friendly fire', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p1', typeId: 'warrior', position: { q: 4, r: 3 } })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Cannot attack own units');
  });

  it('returns cannot-attack preview when no movement left', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 0 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 } })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('No movement left');
  });

  it('returns cannot-attack preview for melee unit out of range', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 0, r: 0 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 5, r: 0 } })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Melee unit must be adjacent');
  });

  it('returns cannot-attack preview for ranged unit out of range', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 10, r: 3 } })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Target out of range');
  });

  it('calculates preview for valid melee attack', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.isRanged).toBe(false);
    expect(preview.attackerStrength).toBeGreaterThan(0);
    expect(preview.defenderStrength).toBeGreaterThan(0);
    expect(preview.expectedDamageToDefender).toBeGreaterThan(0);
    expect(preview.expectedDamageToAttacker).toBeGreaterThan(0); // Melee takes retaliation
    expect(preview.strengthDifference).toEqual(preview.attackerStrength - preview.defenderStrength);
  });

  it('calculates preview for valid ranged attack', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 5, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ units, players });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.isRanged).toBe(true);
    expect(preview.expectedDamageToDefender).toBeGreaterThan(0);
    expect(preview.expectedDamageToAttacker).toBe(0); // Ranged takes no retaliation
    expect(preview.minDamageToAttacker).toBe(0);
    expect(preview.maxDamageToAttacker).toBe(0);
  });

  it('correctly identifies defender will die', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 1 })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.defenderWillDie).toBe(true);
  });

  it('includes flanking bonus in modifiers', () => {
    // Attacker at (3,3), defender at (4,3)
    // Flankers at (5,3), (4,4), (3,4)
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
      ['f1', createTestUnit({ id: 'f1', owner: 'p1', typeId: 'warrior', position: { q: 5, r: 3 }, movementLeft: 2 })],
      ['f2', createTestUnit({ id: 'f2', owner: 'p1', typeId: 'warrior', position: { q: 4, r: 4 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.modifiers.flankingBonus).toBe(4); // 2 flankers * 2
  });

  it('includes terrain defense bonus in modifiers', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 } })],
    ]);
    const stateBase = createTestState({ units });

    // Put defender on jungle (flatDefenseBonus: 2 per F-08 standardization).
    // Jungle, hills, and forest all use flat CS bonuses (rulebook §6.4).
    const tilesJungle = new Map(stateBase.map.tiles);
    setTile(tilesJungle, { q: 4, r: 3 }, 'grassland', 'jungle');
    const stateJungle = { ...stateBase, map: { ...stateBase.map, tiles: tilesJungle } };

    const preview = calculateCombatPreview(stateJungle, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.modifiers.terrainDefenseBonus).toBeGreaterThan(0);
  });

  it('includes river penalty in modifiers', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 } })],
    ]);
    const stateBase = createTestState({ units });

    // Put attacker on river
    const tilesRiver = new Map(stateBase.map.tiles);
    const attackerKey = '3,3';
    const existingTile = tilesRiver.get(attackerKey);
    if (existingTile) {
      tilesRiver.set(attackerKey, { ...existingTile, river: [0] });
    }
    const stateRiver = { ...stateBase, map: { ...stateBase.map, tiles: tilesRiver } };

    const preview = calculateCombatPreview(stateRiver, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.modifiers.riverPenalty).toBe(true);
  });

  it('includes fortification status in modifiers', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, fortified: true })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, fortified: true })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.modifiers.attackerFortified).toBe(true);
    expect(preview.modifiers.defenderFortified).toBe(true);
  });

  it('includes health values in modifiers', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 75 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 50 })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.modifiers.attackerHealth).toBe(75);
    expect(preview.modifiers.defenderHealth).toBe(50);
    expect(preview.modifiers.targetWounded).toBe(true);
  });

  it('includes first strike bonus in modifiers', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 } })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.modifiers.firstStrikeBonus).toBe(true);
  });

  it('calculates combat odds percentages', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.odds.attackerWinPercent).toBeGreaterThanOrEqual(0);
    expect(preview.odds.attackerWinPercent).toBeLessThanOrEqual(100);
    expect(preview.odds.defenderWinPercent).toBeGreaterThanOrEqual(0);
    expect(preview.odds.defenderWinPercent).toBeLessThanOrEqual(100);
    expect(preview.odds.drawPercent).toBeGreaterThanOrEqual(0);
    expect(preview.odds.drawPercent).toBeLessThanOrEqual(100);
    // Percentages should sum to 100
    expect(preview.odds.attackerWinPercent + preview.odds.defenderWinPercent + preview.odds.drawPercent).toBe(100);
  });

  it('damage range is non-negative', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.minDamageToDefender).toBeGreaterThanOrEqual(0);
    expect(preview.maxDamageToDefender).toBeGreaterThanOrEqual(preview.minDamageToDefender);
    expect(preview.minDamageToAttacker).toBeGreaterThanOrEqual(0);
    expect(preview.maxDamageToAttacker).toBeGreaterThanOrEqual(preview.minDamageToAttacker);
  });

  it('expected damage is average of min and max', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    const expectedDefenderDamage = Math.round((preview.minDamageToDefender + preview.maxDamageToDefender) / 2);
    const expectedAttackerDamage = Math.round((preview.minDamageToAttacker + preview.maxDamageToAttacker) / 2);
    expect(preview.expectedDamageToDefender).toBe(expectedDefenderDamage);
    expect(preview.expectedDamageToAttacker).toBe(expectedAttackerDamage);
  });
});

describe('calculateCityCombatPreview', () => {
  function makeCity(overrides: Partial<import('../../types/GameState').CityState> = {}): import('../../types/GameState').CityState {
    return {
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
      isCapital: true,
      defenseHP: 100,
      specialization: null,
      specialists: 0,
      districts: [],
      ...overrides,
    };
  }

  it('returns cannot-attack preview when attacker not found', () => {
    const state = createTestState();
    const preview = calculateCityCombatPreview(state, 'nonexistent', 'c1');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Unit or city not found');
  });

  it('returns cannot-attack preview when city not found', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCityCombatPreview(state, 'a1', 'nonexistent');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Unit or city not found');
  });

  it('returns cannot-attack preview when not players turn', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p2', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1', cities: new Map([['c1', makeCity()]]) });
    const preview = calculateCityCombatPreview(state, 'a1', 'c1');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Not your turn');
  });

  it('returns cannot-attack preview for own city', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const city = makeCity({ owner: 'p1' });
    const state = createTestState({ units, cities: new Map([['c1', city]]) });
    const preview = calculateCityCombatPreview(state, 'a1', 'c1');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Cannot attack own city');
  });

  it('returns cannot-attack preview when no movement left', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 0 })],
    ]);
    const state = createTestState({ units, cities: new Map([['c1', makeCity()]]) });
    const preview = calculateCityCombatPreview(state, 'a1', 'c1');
    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('No movement left');
  });

  it('calculates preview for valid melee attack on city', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const state = createTestState({ units, cities: new Map([['c1', makeCity()]]) });
    const preview = calculateCityCombatPreview(state, 'a1', 'c1');

    expect(preview.canAttack).toBe(true);
    expect(preview.isRanged).toBe(false);
    expect(preview.target).toEqual({ type: 'city', cityId: 'c1' });
    expect(preview.expectedDamageToDefender).toBeGreaterThan(0);
    expect(preview.expectedDamageToAttacker).toBeGreaterThan(0); // Melee takes retaliation
  });

  it('calculates preview for valid ranged attack on city', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const city = makeCity({ position: { q: 5, r: 3 } });
    const state = createTestState({ units, cities: new Map([['c1', city]]) });
    const preview = calculateCityCombatPreview(state, 'a1', 'c1');

    expect(preview.canAttack).toBe(true);
    expect(preview.isRanged).toBe(true);
    expect(preview.expectedDamageToDefender).toBeGreaterThan(0);
    expect(preview.expectedDamageToAttacker).toBe(0); // Ranged takes no retaliation
  });

  it('melee attacker can capture weakened city', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const city = makeCity({ defenseHP: 5 });
    const state = createTestState({ units, cities: new Map([['c1', city]]) });
    const preview = calculateCityCombatPreview(state, 'a1', 'c1');

    expect(preview.canAttack).toBe(true);
    expect(preview.defenderWillDie).toBe(true); // Melee can capture
    expect(preview.target.type).toBe('city');
  });

  it('ranged attacker cannot capture city even at 0 HP', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const city = makeCity({ defenseHP: 1, position: { q: 5, r: 3 } });
    const state = createTestState({ units, cities: new Map([['c1', city]]) });
    const preview = calculateCityCombatPreview(state, 'a1', 'c1');

    expect(preview.canAttack).toBe(true);
    expect(preview.defenderWillDie).toBe(false); // Ranged cannot capture
    expect(preview.odds.attackerWinPercent).toBe(0); // Ranged cannot "win" (capture)
  });

  it('city with walls has higher defense strength', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
    ]);
    const cityNoWalls = makeCity();
    const cityWithWalls = makeCity({ buildings: ['walls'] });

    const stateNoWalls = createTestState({ units, cities: new Map([['c1', cityNoWalls]]) });
    const stateWithWalls = createTestState({ units, cities: new Map([['c1', cityWithWalls]]) });

    const previewNoWalls = calculateCityCombatPreview(stateNoWalls, 'a1', 'c1');
    const previewWithWalls = calculateCityCombatPreview(stateWithWalls, 'a1', 'c1');

    expect(previewWithWalls.defenderStrength).toBeGreaterThan(previewNoWalls.defenderStrength);
  });

  it('city with walls starts with higher defense HP', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const city = makeCity({ buildings: ['walls'], defenseHP: 200 });
    const state = createTestState({ units, cities: new Map([['c1', city]]) });
    const preview = calculateCityCombatPreview(state, 'a1', 'c1');

    expect(preview.modifiers.defenderHealth).toBe(200); // City with walls has 200 HP
  });

  it('includes targetWounded modifier for damaged cities', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const city = makeCity({ defenseHP: 50 });
    const state = createTestState({ units, cities: new Map([['c1', city]]) });
    const preview = calculateCityCombatPreview(state, 'a1', 'c1');

    expect(preview.modifiers.targetWounded).toBe(true);
  });

  it('melee must be adjacent to attack city', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const city = makeCity({ position: { q: 8, r: 3 } });
    const state = createTestState({ units, cities: new Map([['c1', city]]) });
    const preview = calculateCityCombatPreview(state, 'a1', 'c1');

    expect(preview.canAttack).toBe(false);
    expect(preview.reason).toBe('Melee unit must be adjacent');
  });
});

describe('getAttackableUnits', () => {
  it('returns empty array when attacker not found', () => {
    const state = createTestState();
    const attackable = getAttackableUnits(state, 'nonexistent');
    expect(attackable).toEqual([]);
  });

  it('returns empty array when not players turn', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p2', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });
    const attackable = getAttackableUnits(state, 'a1');
    expect(attackable).toEqual([]);
  });

  it('returns empty array when no movement left', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 0 })],
    ]);
    const state = createTestState({ units });
    const attackable = getAttackableUnits(state, 'a1');
    expect(attackable).toEqual([]);
  });

  it('returns adjacent enemies for melee unit', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['e1', createTestUnit({ id: 'e1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 } })],
      ['e2', createTestUnit({ id: 'e2', owner: 'p2', typeId: 'warrior', position: { q: 10, r: 10 } })], // Too far
      ['f1', createTestUnit({ id: 'f1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 4 } })], // Friendly, should be filtered
    ]);
    const state = createTestState({ units });
    const attackable = getAttackableUnits(state, 'a1');

    expect(attackable.length).toBe(1);
    expect(attackable[0].unitId).toBe('e1');
  });

  it('returns enemies in range for ranged unit', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['e1', createTestUnit({ id: 'e1', owner: 'p2', typeId: 'warrior', position: { q: 5, r: 3 } })], // Range 2, should be in range
      ['e2', createTestUnit({ id: 'e2', owner: 'p2', typeId: 'warrior', position: { q: 10, r: 3 } })], // Too far
    ]);
    const state = createTestState({ units });
    const attackable = getAttackableUnits(state, 'a1');

    expect(attackable.length).toBe(1);
    expect(attackable[0].unitId).toBe('e1');
  });
});

describe('getAttackableCities', () => {
  function makeCity(id: string, position: { q: number; r: number }, owner: string = 'p2'): import('../../types/GameState').CityState {
    return {
      id,
      name: `City ${id}`,
      owner,
      position,
      population: 3,
      food: 0,
      productionQueue: [],
      productionProgress: 0,
      buildings: [],
      territory: [`${position.q},${position.r}`],
      settlementType: 'city',
      happiness: 10,
      isCapital: true,
      defenseHP: 100,
      specialization: null,
      specialists: 0,
      districts: [],
    };
  }

  it('returns empty array when attacker not found', () => {
    const state = createTestState();
    const attackable = getAttackableCities(state, 'nonexistent');
    expect(attackable).toEqual([]);
  });

  it('returns empty array when not players turn', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p2', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const state = createTestState({ units, currentPlayerId: 'p1' });
    const attackable = getAttackableCities(state, 'a1');
    expect(attackable).toEqual([]);
  });

  it('returns empty array when no movement left', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 0 })],
    ]);
    const state = createTestState({ units });
    const attackable = getAttackableCities(state, 'a1');
    expect(attackable).toEqual([]);
  });

  it('returns adjacent enemy cities for melee unit', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', { q: 4, r: 3 })],
      ['c2', makeCity('c2', { q: 10, r: 10 })], // Too far
      ['c3', makeCity('c3', { q: 5, r: 5 }, 'p1')], // Friendly, should be filtered
    ]);
    const state = createTestState({ units, cities });
    const attackable = getAttackableCities(state, 'a1');

    expect(attackable.length).toBe(1);
    expect(attackable[0].cityId).toBe('c1');
  });

  it('returns enemy cities in range for ranged unit', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'archer', position: { q: 3, r: 3 }, movementLeft: 2 })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', { q: 5, r: 3 })], // Range 2, should be in range
      ['c2', makeCity('c2', { q: 10, r: 3 })], // Too far
    ]);
    const state = createTestState({ units, cities });
    const attackable = getAttackableCities(state, 'a1');

    expect(attackable.length).toBe(1);
    expect(attackable[0].cityId).toBe('c1');
  });
});

describe('Z2.3: CombatPreview uses shared computeEffectiveCS formula', () => {
  it('preview attackerStrength uses computeEffectiveCS(base, hp) — single shared formula', () => {
    // A warrior at 75 HP attacks an adjacent enemy.
    // Warrior base combat = 20 (from test config). computeEffectiveCS(20, 75) = floor(20 * 75/100) = 15.
    // Preview attackerStrength should equal computeEffectiveCS(base, hp) (no other modifiers in this clean scenario).
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 75 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    // Retrieve attacker's base CS from state.config (same as CombatPreview uses internally)
    const warriorBase = state.config.units.get('warrior')?.combat ?? 20;
    const expectedEffectiveCS = computeEffectiveCS(warriorBase, 75);
    // Preview strength includes effective CS as its foundation; verify they use the same formula.
    // (No terrain/flanking/support/commander bonuses in this scenario — clean unit vs unit.)
    expect(preview.attackerStrength).toBe(expectedEffectiveCS);
  });

  it('preview defenderStrength degrades with HP (same formula as attacker)', () => {
    // Defender at 50 HP: computeEffectiveCS(base, 50) = floor(base * 0.5)
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 50 })],
    ]);
    const state = createTestState({ units });
    const preview = calculateCombatPreview(state, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    const warriorBase = state.config.units.get('warrior')?.combat ?? 20;
    const expectedDefenderCS = computeEffectiveCS(warriorBase, 50);
    // Defender strength = computeEffectiveCS on flat grassland, not fortified
    expect(preview.defenderStrength).toBe(expectedDefenderCS);
  });
});
