import { describe, it, expect } from 'vitest';
import { combatSystem } from '../combatSystem';
import { createTestState, createTestUnit, createTestPlayer } from './helpers';
import { calculateBattlefrontFlankingBonus } from '../../state/CombatAnalytics';
import type { GameState, UnitState } from '../../types/GameState';

/**
 * Rulebook §6.7 parity audit — Civ VII battlefront flanking.
 *
 * Source-refresh 2026-05-03:
 *   - Firaxis Dev Diary #5: melee engagement locks units toward a front.
 *   - Fandom Combat_(Civ7): Military Training unlocks flanking; an existing
 *     battlefront makes the five remaining adjacent tiles vulnerable.
 *   - Angle bands: front-side +2 CS, rear-side +3 CS, direct rear +5 CS.
 *
 * These tests keep the Civ VII directional model separate from the adjacent
 * friendly support bonus tested elsewhere.
 */

function buildBattlefrontScenario(opts: {
  seed?: number;
  attackerTypeId?: string;
  attackerPosition?: { q: number; r: number };
  defenderFacing?: 0 | 1 | 2 | 3 | 4 | 5;
  includeAnchor?: boolean;
  anchorOwner?: string;
  attackerHasMilitaryTraining?: boolean;
} = {}): GameState {
  const defenderFacing = Object.prototype.hasOwnProperty.call(opts, 'defenderFacing') ? opts.defenderFacing : 3;
  const units = new Map<string, UnitState>();
  units.set('a1', createTestUnit({
    id: 'a1',
    owner: 'p1',
    typeId: opts.attackerTypeId ?? 'warrior',
    position: opts.attackerPosition ?? { q: 5, r: 3 },
    movementLeft: 2,
    health: 99,
  }));
  units.set('d1', createTestUnit({
    id: 'd1',
    owner: 'p2',
    typeId: 'warrior',
    position: { q: 4, r: 3 },
    health: 100,
    facing: defenderFacing,
  }));
  if (opts.includeAnchor !== false) {
    units.set('anchor', createTestUnit({
      id: 'anchor',
      owner: opts.anchorOwner ?? 'p1',
      typeId: 'warrior',
      position: { q: 3, r: 3 },
      movementLeft: 0,
      health: 100,
    }));
  }
  const players = new Map([
    ['p1', createTestPlayer({
      id: 'p1',
      leaderId: 'cleopatra',
      researchedTechs: opts.attackerHasMilitaryTraining === false ? [] : ['military_training'],
    })],
    ['p2', createTestPlayer({ id: 'p2', leaderId: 'cleopatra' })],
  ]);
  return createTestState({
    units,
    players,
    currentPlayerId: 'p1',
    rng: { seed: opts.seed ?? 42, counter: 0 },
  });
}

function damageTo(state: GameState): number {
  const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
  const defender = next.units.get('d1');
  return defender ? 100 - defender.health : 100;
}

describe('F1: battlefront angle bands', () => {
  it('maps front-side, rear-side, and direct-rear attacks to +2/+3/+5 CS', () => {
    const frontSide = buildBattlefrontScenario({ attackerPosition: { q: 4, r: 2 } });
    const rearSide = buildBattlefrontScenario({ attackerPosition: { q: 5, r: 2 } });
    const directRear = buildBattlefrontScenario({ attackerPosition: { q: 5, r: 3 } });

    expect(calculateBattlefrontFlankingBonus(frontSide, frontSide.units.get('a1')!, { q: 4, r: 3 })).toBe(2);
    expect(calculateBattlefrontFlankingBonus(rearSide, rearSide.units.get('a1')!, { q: 4, r: 3 })).toBe(3);
    expect(calculateBattlefrontFlankingBonus(directRear, directRear.units.get('a1')!, { q: 4, r: 3 })).toBe(5);
  });
});

describe('F2: battlefront prerequisite', () => {
  it('a direct rear attack deals more damage only when defender facing and front anchor exist', () => {
    const withBattlefront = damageTo(buildBattlefrontScenario({ seed: 7 }));
    const noFacing = damageTo(buildBattlefrontScenario({ seed: 7, defenderFacing: undefined }));
    const noAnchor = damageTo(buildBattlefrontScenario({ seed: 7, includeAnchor: false }));

    expect(withBattlefront).toBeGreaterThan(noFacing);
    expect(withBattlefront).toBeGreaterThan(noAnchor);
  });

  it('same-owner front anchor is required', () => {
    const withFriendlyAnchor = damageTo(buildBattlefrontScenario({ seed: 11 }));
    const withEnemyAnchor = damageTo(buildBattlefrontScenario({ seed: 11, anchorOwner: 'p2' }));

    expect(withFriendlyAnchor).toBeGreaterThan(withEnemyAnchor);
  });
});

describe('F3: Military Training gate', () => {
  it('no flanking bonus applies before Military Training', () => {
    const noTech = damageTo(buildBattlefrontScenario({ seed: 13, attackerHasMilitaryTraining: false }));
    const noFacing = damageTo(buildBattlefrontScenario({ seed: 13, defenderFacing: undefined, attackerHasMilitaryTraining: false }));

    expect(noTech).toBe(noFacing);
  });
});

describe('F4: attacker eligibility', () => {
  it('ranged attackers do not receive battlefront flanking bonuses', () => {
    const rangedRear = damageTo(buildBattlefrontScenario({
      seed: 17,
      attackerTypeId: 'archer',
      attackerPosition: { q: 5, r: 3 },
    }));
    const rangedNoFacing = damageTo(buildBattlefrontScenario({
      seed: 17,
      attackerTypeId: 'archer',
      attackerPosition: { q: 5, r: 3 },
      defenderFacing: undefined,
    }));

    expect(rangedRear).toBe(rangedNoFacing);
  });
});

describe('F5: count-based adjacent units are not flanking', () => {
  it('extra adjacent friendlies do not create flanking without a battlefront', () => {
    const baseline = buildBattlefrontScenario({
      seed: 23,
      attackerPosition: { q: 3, r: 3 },
      defenderFacing: undefined,
      includeAnchor: false,
    });
    const units = new Map(baseline.units);
    units.set('f1', createTestUnit({ id: 'f1', owner: 'p1', typeId: 'warrior', position: { q: 5, r: 2 }, health: 100 }));
    units.set('f2', createTestUnit({ id: 'f2', owner: 'p1', typeId: 'warrior', position: { q: 4, r: 4 }, health: 100 }));
    units.set('f3', createTestUnit({ id: 'f3', owner: 'p1', typeId: 'warrior', position: { q: 5, r: 3 }, health: 100 }));

    expect(damageTo({ ...baseline, units })).toBe(damageTo(baseline));
  });
});
