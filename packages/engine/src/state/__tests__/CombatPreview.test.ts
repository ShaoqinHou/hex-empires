import { describe, it, expect } from 'vitest';
import { calculateCombatPreview, calculateCityCombatPreview, getAttackableUnits, getAttackableCities } from '../CombatPreview';
import { computeEffectiveCS } from '../CombatAnalytics';
import { combatSystem } from '../../systems/combatSystem';
import { createTestState, createTestUnit, createTestPlayer, setTile } from '../../systems/__tests__/helpers';
import { nextRandom } from '../SeededRng';

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
    // warrior combat=20, health=100 → effectiveCS=floor(20*(100/100))=20
    // + Augustus leader ability: MODIFY_COMBAT all +5 → attackerStrength=25
    // defender p2 also has Augustus but effectBonus only applies to attacker CS, not defense CS
    // defenderStrength = effectiveCS(20, 100) = 20 (no effectBonus in defense formula)
    expect(preview.attackerStrength).toBe(25);
    expect(preview.defenderStrength).toBe(20);
    // strengthDiff=5 → atk min=round(30*exp(5/25)*0.75)=27, max=round(30*exp(5/25)*1.25)=46, exp=round((27+46)/2)=37
    // def retaliation (strengthDiff=-5): min=round(30*exp(-5/25)*0.75)=18, max=31, exp=25
    expect(preview.expectedDamageToDefender).toBe(37);
    expect(preview.expectedDamageToAttacker).toBe(25); // Melee retaliation at -5 diff
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
    // archer rangedCombat=20 + Augustus leader +5 (all categories) = 25; warrior defense=20
    // strengthDiff=5 → min=27, max=46, expected=37
    expect(preview.expectedDamageToDefender).toBe(37);
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

  it('adds +2 support per adjacent friendly to attacker and +4 with two', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', leaderId: 'cleopatra' })],
      ['p2', createTestPlayer({ id: 'p2', leaderId: 'cleopatra' })],
    ]);

    const base = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const withOne = new Map([
      ...base,
      ['s1', createTestUnit({ id: 's1', owner: 'p1', typeId: 'scout', position: { q: 3, r: 2 }, health: 100 })],
    ]);
    const withTwo = new Map([
      ...base,
      ['s1', createTestUnit({ id: 's1', owner: 'p1', typeId: 'scout', position: { q: 3, r: 2 }, health: 100 })],
      ['s2', createTestUnit({ id: 's2', owner: 'p1', typeId: 'scout', position: { q: 2, r: 3 }, health: 100 })],
    ]);

    const state = createTestState({ units: base, players });
    const stateOne = createTestState({ units: withOne, players });
    const stateTwo = createTestState({ units: withTwo, players });

    const basePreview = calculateCombatPreview(state, 'a1', 'd1');
    const onePreview = calculateCombatPreview(stateOne, 'a1', 'd1');
    const twoPreview = calculateCombatPreview(stateTwo, 'a1', 'd1');

    expect(basePreview.canAttack).toBe(true);
    expect(onePreview.canAttack).toBe(true);
    expect(twoPreview.canAttack).toBe(true);

    const baseWarrior = state.config.units.get('warrior')?.combat ?? 20;
    const baseEffective = computeEffectiveCS(baseWarrior, 100);

    // No leader modifiers in this test (Cleopatra), no terrain/wall/ranged effects.
    expect(basePreview.attackerStrength).toBe(baseEffective);
    expect(onePreview.attackerStrength).toBe(baseEffective + 2);
    expect(twoPreview.attackerStrength).toBe(baseEffective + 4);
  });

  it('adds +2 support per adjacent friendly to defender, reducing expected damage', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', leaderId: 'cleopatra' })],
      ['p2', createTestPlayer({ id: 'p2', leaderId: 'cleopatra' })],
    ]);

    const withDefenderSupportOne = createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
        ['s1', createTestUnit({ id: 's1', owner: 'p2', typeId: 'scout', position: { q: 4, r: 2 }, health: 100 })],
      ]),
      players,
      currentPlayerId: 'p1',
    });
    const withDefenderSupportTwo = createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
        ['s1', createTestUnit({ id: 's1', owner: 'p2', typeId: 'scout', position: { q: 4, r: 2 }, health: 100 })],
        ['s2', createTestUnit({ id: 's2', owner: 'p2', typeId: 'scout', position: { q: 5, r: 3 }, health: 100 })],
      ]),
      players,
      currentPlayerId: 'p1',
    });

    const base = calculateCombatPreview(createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
      ]),
      players,
      currentPlayerId: 'p1',
    }), 'a1', 'd1');
    const one = calculateCombatPreview(withDefenderSupportOne, 'a1', 'd1');
    const two = calculateCombatPreview(withDefenderSupportTwo, 'a1', 'd1');

    expect(base.canAttack).toBe(true);
    expect(one.canAttack).toBe(true);
    expect(two.canAttack).toBe(true);

    expect(base.defenderStrength).toBe(20);
    expect(one.defenderStrength).toBe(22);
    expect(two.defenderStrength).toBe(24);
  });

  it('preview and live combat both use the same support-adjusted strength formula', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', leaderId: 'cleopatra' })],
      ['p2', createTestPlayer({ id: 'p2', leaderId: 'cleopatra' })],
    ]);

    const state = createTestState({
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
        ['s1', createTestUnit({ id: 's1', owner: 'p1', typeId: 'scout', position: { q: 3, r: 2 }, health: 100 })],
        ['s2', createTestUnit({ id: 's2', owner: 'p2', typeId: 'scout', position: { q: 4, r: 2 }, health: 100 })],
      ]),
      players,
      currentPlayerId: 'p1',
      rng: { seed: 21, counter: 0 },
    });

    const preview = calculateCombatPreview(state, 'a1', 'd1');
    expect(preview.canAttack).toBe(true);
    expect(preview.attackerStrength).toBe(22); // base 20 + one adjacent friendly
    expect(preview.defenderStrength).toBe(22); // base 20 + one adjacent friendly on defender

    const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const actualDamage = 100 - next.units.get('d1')!.health;

    const strengthDiff = preview.attackerStrength - preview.defenderStrength;
    const { value: randomFactor } = nextRandom(state.rng);
    const expectedModifier = 0.75 + randomFactor * 0.5;
    const expectedDamage = Math.round(30 * Math.exp(strengthDiff / 25) * expectedModifier);

    expect(actualDamage).toBe(expectedDamage);
  });

  it('includes terrain defense bonus in modifiers', () => {
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 } })],
    ]);
    const stateBase = createTestState({ units });

    // Put defender on jungle (II2 F-08: defenseBonusModifier=0.25 = +25% CS).
    // Jungle uses percentage convention same as hills and forest (rulebook §6.4).
    const tilesJungle = new Map(stateBase.map.tiles);
    setTile(tilesJungle, { q: 4, r: 3 }, 'grassland', 'jungle');
    const stateJungle = { ...stateBase, map: { ...stateBase.map, tiles: tilesJungle } };

    const preview = calculateCombatPreview(stateJungle, 'a1', 'd1');

    expect(preview.canAttack).toBe(true);
    expect(preview.modifiers.terrainDefenseBonus).toBe(25); // jungle defenseBonusModifier=0.25; Math.round(0.25*100)+0=25
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
    // warrior effectiveCS=20 + Augustus leader +5 (all categories) = 25; cityDefense=10(base)+0(no walls)
    // strengthDiff=15 → atk min=round(30*exp(15/25)*0.75)=41, max=68, exp=55
    // city retaliation (-15): def min=round(30*exp(-15/25)*0.75)=12, max=21, exp=17
    expect(preview.expectedDamageToDefender).toBe(55);
    expect(preview.expectedDamageToAttacker).toBe(17); // Melee takes retaliation (strengthDiff=-15)
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
    // archer rangedCombat=20 + Augustus leader +5 = 25; cityDefense=10; strengthDiff=15
    // min=41, max=68, expected=55; no retaliation for ranged
    expect(preview.expectedDamageToDefender).toBe(55);
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
  it('preview attackerStrength uses computeEffectiveCS(base, hp) plus active effects — single shared formula', () => {
    // A warrior at 75 HP attacks an adjacent enemy.
    // Warrior base combat = 20 (from test config). computeEffectiveCS(20, 75) = floor(20 * 75/100) = 15.
    // Default test player has Rome/Augustus leader (+5 MODIFY_COMBAT all categories).
    // Preview attackerStrength = effectiveCS(15) + effectBonus(5) = 20.
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
    // Preview strength = effectiveCS + leader ability (Augustus +5) — mirrors combatSystem exactly.
    // Note: effectBonus (+5) is included in the shared formula, so just checking the total directly.
    expect(preview.attackerStrength).toBe(expectedEffectiveCS + 5); // effectiveCS(15) + augustus(5) = 20
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

describe('DD4.2: CombatPreview vs combatSystem parity', () => {
  it('preview expectedDamageToDefender is within ±10% of actual combatSystem damage', () => {
    // Simulate the same combat with both preview and live system.
    // Both use the same strength formula — preview shows the expected (average) value;
    // combatSystem uses a seeded random modifier in [0.75, 1.25].
    // At seed=42, counter=0, the actual modifier is ~1.05 → actual ≈ expected.
    const units = new Map([
      ['a1', createTestUnit({ id: 'a1', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, movementLeft: 2, health: 100 })],
      ['d1', createTestUnit({ id: 'd1', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    // Use default seed (42, counter 0) — deterministic modifier ~1.05 → actual ≈ expected
    const state = createTestState({ units, players, rng: { seed: 42, counter: 0 } });

    // Preview: computed without RNG (average of min-max range)
    const preview = calculateCombatPreview(state, 'a1', 'd1');
    expect(preview.canAttack).toBe(true);

    // Live combat: uses seeded RNG modifier
    const nextState = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
    const defender = nextState.units.get('d1');
    expect(defender).toBeDefined();
    const actualDamage = 100 - defender!.health;

    // Preview expected vs actual: assert within ±10% (random modifier is 0.75-1.25; average is 1.0)
    const tolerance = 0.10;
    const ratio = actualDamage / preview.expectedDamageToDefender;
    expect(ratio).toBeGreaterThanOrEqual(1 - tolerance);
    expect(ratio).toBeLessThanOrEqual(1 + tolerance);
  });
});
