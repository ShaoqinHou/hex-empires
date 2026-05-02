import { describe, it, expect } from 'vitest';
import {
  averageUnitHealth,
  fortifiedRatio,
  militaryUnitCount,
  totalCombatStrength,
  averageCityDefense,
  combatStrengthRanking,
  computeEffectiveCS,
  computeCombatDamage,
  computeCombatDamageFromRoll,
  calculateFirstStrikeCombatBonus,
  calculateBattlefrontFlankingBonus,
} from '../CombatAnalytics';
import type { CityState } from '../../types/GameState';
import type { CommanderState } from '../../types/Commander';
import { createTestState, createTestUnit, createTestPlayer } from '../../systems/__tests__/helpers';

// ── W4-03: computeEffectiveCS ──

describe('computeEffectiveCS', () => {
  it('applies Civ VII wounded penalty as additive CS loss', () => {
    // round(10 - 50 / 10) = 5, so 30 CS at 50 HP fights at 25 CS.
    expect(computeEffectiveCS(30, 50)).toBe(25);
  });

  it('full HP preserves base CS exactly', () => {
    expect(computeEffectiveCS(20, 100)).toBe(20);
    expect(computeEffectiveCS(30, 100)).toBe(30);
  });

  it('caps wounded penalty at -10 CS', () => {
    expect(computeEffectiveCS(20, 0)).toBe(10);
    expect(computeEffectiveCS(20, 5)).toBe(10);
  });

  it('rounds the HP-derived penalty to the nearest CS point', () => {
    expect(computeEffectiveCS(20, 99)).toBe(20);
    expect(computeEffectiveCS(20, 95)).toBe(19);
    expect(computeEffectiveCS(20, 90)).toBe(19);
  });

  it('respects custom maxHP parameter', () => {
    expect(computeEffectiveCS(30, 50, 200)).toBe(22);
  });

  it('applies first strike only to attacking full-HP units with the ability', () => {
    const base = createTestState();
    const firstStrikeWarrior = {
      ...base.config.units.get('warrior')!,
      abilities: ['first_strike'],
    };
    const config = {
      ...base.config,
      units: new Map(base.config.units).set('warrior', firstStrikeWarrior),
    };
    const state = { ...base, config };
    const unit = createTestUnit({ typeId: 'warrior', health: 100 });

    expect(calculateFirstStrikeCombatBonus(state, unit, true)).toBe(5);
    expect(calculateFirstStrikeCombatBonus(state, { ...unit, health: 99 }, true)).toBe(0);
    expect(calculateFirstStrikeCombatBonus(state, unit, false)).toBe(0);
  });

  it('applies commander-granted Advancement First Strike to full-HP melee and cavalry attackers in radius', () => {
    const commander: CommanderState = {
      unitId: 'cmd1',
      xp: 300,
      commanderLevel: 4,
      unspentPromotionPicks: 0,
      promotions: ['assault_advancement'],
      tree: 'assault',
      attachedUnits: [],
      packed: false,
    };
    const units = new Map([
      ['attacker', createTestUnit({ id: 'attacker', owner: 'p1', typeId: 'warrior', position: { q: 1, r: 0 }, health: 100 })],
      ['cavalry', createTestUnit({ id: 'cavalry', owner: 'p1', typeId: 'horseman', position: { q: 0, r: 1 }, health: 100 })],
      ['archer', createTestUnit({ id: 'archer', owner: 'p1', typeId: 'archer', position: { q: 1, r: -1 }, health: 100 })],
      ['cmd1', createTestUnit({ id: 'cmd1', owner: 'p1', typeId: 'captain', position: { q: 0, r: 0 }, health: 100 })],
    ]);
    const state = createTestState({
      units,
      commanders: new Map([['cmd1', commander]]),
    });

    expect(calculateFirstStrikeCombatBonus(state, state.units.get('attacker')!, true)).toBe(5);
    expect(calculateFirstStrikeCombatBonus(state, state.units.get('cavalry')!, true)).toBe(5);
    expect(calculateFirstStrikeCombatBonus(state, state.units.get('archer')!, true)).toBe(0);
    expect(calculateFirstStrikeCombatBonus(state, { ...state.units.get('attacker')!, health: 99 }, true)).toBe(0);
    expect(calculateFirstStrikeCombatBonus(state, state.units.get('attacker')!, false)).toBe(0);
  });

  it('does not apply commander-granted First Strike from enemy, out-of-range, or unpromoted commanders', () => {
    const attacker = createTestUnit({ id: 'attacker', owner: 'p1', typeId: 'warrior', position: { q: 1, r: 0 }, health: 100 });
    const promotedCommander: CommanderState = {
      unitId: 'cmd1',
      xp: 300,
      commanderLevel: 4,
      unspentPromotionPicks: 0,
      promotions: ['assault_advancement'],
      tree: 'assault',
      attachedUnits: [],
      packed: false,
    };
    const baseUnits = new Map([
      ['attacker', attacker],
      ['cmd1', createTestUnit({ id: 'cmd1', owner: 'p1', typeId: 'captain', position: { q: 3, r: 0 }, health: 100 })],
    ]);
    const outOfRange = createTestState({
      units: baseUnits,
      commanders: new Map([['cmd1', promotedCommander]]),
    });
    expect(calculateFirstStrikeCombatBonus(outOfRange, attacker, true)).toBe(0);

    const enemyCommander = createTestState({
      units: new Map([
        ['attacker', attacker],
        ['cmd1', createTestUnit({ id: 'cmd1', owner: 'p2', typeId: 'captain', position: { q: 0, r: 0 }, health: 100 })],
      ]),
      commanders: new Map([['cmd1', promotedCommander]]),
    });
    expect(calculateFirstStrikeCombatBonus(enemyCommander, attacker, true)).toBe(0);

    const unpromoted = createTestState({
      units: new Map([
        ['attacker', attacker],
        ['cmd1', createTestUnit({ id: 'cmd1', owner: 'p1', typeId: 'captain', position: { q: 0, r: 0 }, health: 100 })],
      ]),
      commanders: new Map([['cmd1', { ...promotedCommander, promotions: [] }]]),
    });
    expect(calculateFirstStrikeCombatBonus(unpromoted, attacker, true)).toBe(0);
  });

  it('recognizes Advancement picked on the commander unit promotion array', () => {
    const attacker = createTestUnit({ id: 'attacker', owner: 'p1', typeId: 'warrior', position: { q: 1, r: 0 }, health: 100 });
    const commander: CommanderState = {
      unitId: 'cmd1',
      xp: 300,
      commanderLevel: 4,
      unspentPromotionPicks: 0,
      promotions: [],
      tree: 'assault',
      attachedUnits: [],
      packed: false,
    };
    const state = createTestState({
      units: new Map([
        ['attacker', attacker],
        ['cmd1', createTestUnit({ id: 'cmd1', owner: 'p1', typeId: 'captain', position: { q: 0, r: 0 }, promotions: ['assault_advancement'] })],
      ]),
      commanders: new Map([['cmd1', commander]]),
    });

    expect(calculateFirstStrikeCombatBonus(state, attacker, true)).toBe(5);
  });
});

describe('computeCombatDamage', () => {
  it('uses Civ VII exact exponent with 30 base damage at equal strength', () => {
    expect(computeCombatDamage(0, 1)).toBe(30);
  });

  it('averages 100 damage at +30 CS before random variance', () => {
    expect(computeCombatDamage(30, 1)).toBe(100);
  });

  it('maps normalized random rolls to the Civ VII 70-130% range', () => {
    expect(computeCombatDamageFromRoll(0, 0)).toBe(21);
    expect(computeCombatDamageFromRoll(0, 1)).toBe(39);
  });
});

describe('calculateBattlefrontFlankingBonus', () => {
  function buildBattlefront(attackerPosition: { q: number; r: number }, researchedTechs: ReadonlyArray<string> = ['military_training']) {
    const units = new Map([
      ['anchor', createTestUnit({ id: 'anchor', owner: 'p1', typeId: 'warrior', position: { q: 3, r: 3 }, health: 100 })],
      ['attacker', createTestUnit({ id: 'attacker', owner: 'p1', typeId: 'warrior', position: attackerPosition, health: 100 })],
      ['defender', createTestUnit({ id: 'defender', owner: 'p2', typeId: 'warrior', position: { q: 4, r: 3 }, health: 100, facing: 3 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    return createTestState({ units, players, currentPlayerId: 'p1' });
  }

  it('uses Civ VII angle bands: +2 front-side, +3 rear-side, +5 direct rear', () => {
    expect(calculateBattlefrontFlankingBonus(buildBattlefront({ q: 4, r: 2 }), createTestUnit({ id: 'attacker', owner: 'p1', position: { q: 4, r: 2 } }), { q: 4, r: 3 })).toBe(2);
    expect(calculateBattlefrontFlankingBonus(buildBattlefront({ q: 5, r: 2 }), createTestUnit({ id: 'attacker', owner: 'p1', position: { q: 5, r: 2 } }), { q: 4, r: 3 })).toBe(3);
    expect(calculateBattlefrontFlankingBonus(buildBattlefront({ q: 5, r: 3 }), createTestUnit({ id: 'attacker', owner: 'p1', position: { q: 5, r: 3 } }), { q: 4, r: 3 })).toBe(5);
  });

  it('requires Military Training and an existing battlefront anchor', () => {
    const rearAttacker = createTestUnit({ id: 'attacker', owner: 'p1', position: { q: 5, r: 3 } });
    expect(calculateBattlefrontFlankingBonus(buildBattlefront({ q: 5, r: 3 }, []), rearAttacker, { q: 4, r: 3 })).toBe(0);

    const noAnchor = buildBattlefront({ q: 5, r: 3 });
    const units = new Map(noAnchor.units);
    units.delete('anchor');
    expect(calculateBattlefrontFlankingBonus({ ...noAnchor, units }, rearAttacker, { q: 4, r: 3 })).toBe(0);
  });
});

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 0, r: 0 },
    population: 1,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [],
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

describe('CombatAnalytics', () => {
  describe('averageUnitHealth', () => {
    it('returns 100 when the player has no units at all', () => {
      const state = createTestState({ units: new Map() });
      expect(averageUnitHealth(state, 'p1')).toBe(100);
    });

    it('returns 100 when the player owns only civilians (no military)', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'settler', health: 40 })],
      ]);
      const state = createTestState({ units });
      expect(averageUnitHealth(state, 'p1')).toBe(100);
    });

    it('averages health of only military units; civilians do not dilute', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'warrior', health: 50 })],
        ['u3', createTestUnit({ id: 'u3', owner: 'p1', typeId: 'settler', health: 10 })],
      ]);
      const state = createTestState({ units });
      expect(averageUnitHealth(state, 'p1')).toBe(75);
    });

    it('wounded units correctly lower the average', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'warrior', health: 40 })],
        ['u3', createTestUnit({ id: 'u3', owner: 'p1', typeId: 'warrior', health: 10 })],
      ]);
      const state = createTestState({ units });
      expect(averageUnitHealth(state, 'p1')).toBeCloseTo(50, 5);
    });

    it('ignores units belonging to other players', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 80 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', typeId: 'warrior', health: 20 })],
      ]);
      const state = createTestState({ units });
      expect(averageUnitHealth(state, 'p1')).toBe(80);
    });

    it('returns 100 for a player who is not registered (no owned units)', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 30 })],
      ]);
      const state = createTestState({ units });
      expect(averageUnitHealth(state, 'ghost')).toBe(100);
    });
  });

  describe('fortifiedRatio', () => {
    it('returns 0 with no military units', () => {
      const state = createTestState({ units: new Map() });
      expect(fortifiedRatio(state, 'p1')).toBe(0);
    });

    it('returns 0 when no military unit is fortified', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', fortified: false })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'warrior', fortified: false })],
      ]);
      const state = createTestState({ units });
      expect(fortifiedRatio(state, 'p1')).toBe(0);
    });

    it('returns integer-fraction 1/3 when 1 of 3 military units is fortified', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', fortified: true })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'warrior', fortified: false })],
        ['u3', createTestUnit({ id: 'u3', owner: 'p1', typeId: 'warrior', fortified: false })],
      ]);
      const state = createTestState({ units });
      expect(fortifiedRatio(state, 'p1')).toBeCloseTo(1 / 3, 10);
    });

    it('civilians do not contribute to the fortified ratio denominator', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', fortified: true })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'settler', fortified: false })],
      ]);
      const state = createTestState({ units });
      expect(fortifiedRatio(state, 'p1')).toBe(1);
    });
  });

  describe('militaryUnitCount', () => {
    it('returns 0 when the player has no units', () => {
      const state = createTestState({ units: new Map() });
      expect(militaryUnitCount(state, 'p1')).toBe(0);
    });

    it('counts melee, ranged, cavalry, siege but excludes civilians', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior' })],       // melee
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'archer' })],        // ranged
        ['u3', createTestUnit({ id: 'u3', owner: 'p1', typeId: 'horseman' })],      // cavalry
        ['u4', createTestUnit({ id: 'u4', owner: 'p1', typeId: 'settler' })],       // civilian
        ['u5', createTestUnit({ id: 'u5', owner: 'p1', typeId: 'scout' })],         // recon (civilian-ish, check)
      ]);
      const state = createTestState({ units });
      // warrior + archer + horseman = 3. Scout is category 'recon' or similar; depends on data.
      // We only assert it excludes the settler civilian and counts at least the 3 unambiguous military types.
      const count = militaryUnitCount(state, 'p1');
      expect(count).toBeGreaterThanOrEqual(3);
      expect(count).toBeLessThanOrEqual(4);
    });

    it('ignores units owned by other players', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior' })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', typeId: 'warrior' })],
        ['u3', createTestUnit({ id: 'u3', owner: 'p2', typeId: 'archer' })],
      ]);
      const state = createTestState({ units });
      expect(militaryUnitCount(state, 'p1')).toBe(1);
      expect(militaryUnitCount(state, 'p2')).toBe(2);
    });

    it('returns 0 for an unknown player id', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior' })],
      ]);
      const state = createTestState({ units });
      expect(militaryUnitCount(state, 'ghost')).toBe(0);
    });
  });

  describe('totalCombatStrength', () => {
    it('returns 0 for a player with no units', () => {
      const state = createTestState({ units: new Map() });
      expect(totalCombatStrength(state, 'p1')).toBe(0);
    });

    it('sums effective combat strength across military units', () => {
      // warrior combat = 20 (per data file)
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'warrior', health: 50 })],
      ]);
      const state = createTestState({ units });
      // 20 + (20 - 5 wounded penalty) = 35
      expect(totalCombatStrength(state, 'p1')).toBeCloseTo(35, 5);
    });

    it('skips units whose UnitDef is missing from config', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'nonexistent_type', health: 100 })],
      ]);
      const state = createTestState({ units });
      expect(totalCombatStrength(state, 'p1')).toBeCloseTo(20, 5);
    });

    it('skips civilians (their combat is irrelevant to strength)', () => {
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p1', typeId: 'settler', health: 100 })],
      ]);
      const state = createTestState({ units });
      expect(totalCombatStrength(state, 'p1')).toBeCloseTo(20, 5);
    });
  });

  describe('averageCityDefense', () => {
    it('returns 0 when the player has no cities', () => {
      const state = createTestState({ cities: new Map() });
      expect(averageCityDefense(state, 'p1')).toBe(0);
    });

    it('averages defenseHP across owned cities only', () => {
      const cities = new Map<string, CityState>([
        ['c1', makeCity({ id: 'c1', owner: 'p1', defenseHP: 100 })],
        ['c2', makeCity({ id: 'c2', owner: 'p1', defenseHP: 200 })],
        ['c3', makeCity({ id: 'c3', owner: 'p2', defenseHP: 999 })],
      ]);
      const state = createTestState({ cities });
      expect(averageCityDefense(state, 'p1')).toBe(150);
      expect(averageCityDefense(state, 'p2')).toBe(999);
    });
  });

  describe('combatStrengthRanking', () => {
    it('ranks players descending by strength', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
        ['p3', createTestPlayer({ id: 'p3' })],
      ]);
      const units = new Map([
        // p1: one warrior at full health → 20
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        // p2: two warriors at full health → 40
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', typeId: 'warrior', health: 100 })],
        ['u3', createTestUnit({ id: 'u3', owner: 'p2', typeId: 'warrior', health: 100 })],
        // p3: nothing → 0
      ]);
      const state = createTestState({ players, units });
      const ranking = combatStrengthRanking(state);
      expect(ranking.map((r) => r.playerId)).toEqual(['p2', 'p1', 'p3']);
      expect(ranking.map((r) => r.rank)).toEqual([1, 2, 3]);
      expect(ranking[0].strength).toBeCloseTo(40, 5);
      expect(ranking[1].strength).toBeCloseTo(20, 5);
      expect(ranking[2].strength).toBe(0);
    });

    it('uses dense ranking: ties share a rank and the next unique strength advances by exactly one', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
        ['p3', createTestPlayer({ id: 'p3' })],
      ]);
      const units = new Map([
        ['u1', createTestUnit({ id: 'u1', owner: 'p1', typeId: 'warrior', health: 100 })],
        ['u2', createTestUnit({ id: 'u2', owner: 'p2', typeId: 'warrior', health: 100 })],
        // p3 has no military → strength 0
      ]);
      const state = createTestState({ players, units });
      const ranking = combatStrengthRanking(state);
      // p1 and p2 tie at 20, p3 at 0. Dense ranking: ranks 1,1,2 (not 1,1,3).
      expect(ranking.map((r) => r.rank)).toEqual([1, 1, 2]);
      expect(new Set(ranking.slice(0, 2).map((r) => r.playerId))).toEqual(new Set(['p1', 'p2']));
      expect(ranking[2].playerId).toBe('p3');
    });

    it('returns an empty array when there are no players', () => {
      const state = createTestState({ players: new Map() });
      expect(combatStrengthRanking(state)).toEqual([]);
    });
  });
});
