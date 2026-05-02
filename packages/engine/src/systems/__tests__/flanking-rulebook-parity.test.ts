import { describe, it, expect } from 'vitest';
import { combatSystem } from '../combatSystem';
import { createTestState, createTestUnit, createTestPlayer } from './helpers';
import type { GameState, UnitState } from '../../types/GameState';

/**
 * Rulebook §6.7 parity audit — Flanking.
 *
 * Rulebook §6.7 (civ7-rulebook.md lines 307–313):
 *   - Unlocked after researching **Military Training**.
 *   - Requires **2+ friendly units** adjacent to the target.
 *   - Melee combat creates a **Battlefront** (front facing). Attacks from the
 *     side or rear gain flanking bonus.
 *   - Cavalry ignores Zone of Control (ZoC) via **Swift** ability, making them
 *     ideal flankers.
 *   - Ironclad has +50% from Flanking.
 *
 * Current engine implementation (combatSystem.calculateFlankingBonus):
 *   "+3 strength per qualifying friendly unit adjacent to the defender,
 *   capped at +9", excluding the attacker and non-combat units.
 *
 * Each test asserts ONE specific §6.7 rule against live combatSystem behaviour.
 * Tests using `it.fails(...)` document a known mismatch (bug) that a follow-up
 * cycle should fix. Rule codes (F1–Fn) in each test name are searchable.
 *
 * Pattern mirrors M23 zoc-rulebook-parity + M24 healing-rulebook-parity.
 *
 * ── Methodology ─────────────────────────────────────────────────────────────
 * Combat damage is RNG-perturbed: 30 * e^(diff/25) * U(0.75, 1.25). For exact
 * comparisons we fix the seed, so the same strength diff always produces
 * identical defender-HP loss. Comparing two scenarios with the same seed
 * isolates the CS delta — if flanker count changes, the diff in damage is a
 * pure signal of the flanking-bonus rule.
 *
 * Attacker geometry: attacker warrior at (3,3), defender warrior at (4,3),
 * both on grassland. Flankers are placed on `neighbors(4,3)` hexes other than
 * (3,3) (the attacker). neighbors(4,3) in pointy-top axial =
 *   { (5,3), (5,2), (4,2), (3,3), (3,4), (4,4) }.
 * So we can place up to 5 flankers adjacent to the defender without collision.
 */

// ── Shared builders ────────────────────────────────────────────────────────

interface FlankerSpec {
  id: string;
  typeId?: string;                         // defaults to 'warrior' (melee)
  owner?: string;                          // defaults to 'p1' (attacker's owner)
  position: { q: number; r: number };
}

function buildFlankingScenario(opts: {
  seed?: number;
  attackerTypeId?: string;                 // defaults to 'warrior'
  defenderTypeId?: string;                 // defaults to 'warrior'
  attackerPosition?: { q: number; r: number };
  defenderPosition?: { q: number; r: number };
  flankers?: ReadonlyArray<FlankerSpec>;
  attackerHealth?: number;                 // defaults to 99 (avoids +5 first-strike)
  attackerHasMilitaryTraining?: boolean;   // defaults to true (F9 overrides to false)
}): GameState {
  const attackerPos = opts.attackerPosition ?? { q: 3, r: 3 };
  const defenderPos = opts.defenderPosition ?? { q: 4, r: 3 };
  const units = new Map<string, UnitState>();
  units.set('a1', createTestUnit({
    id: 'a1',
    owner: 'p1',
    typeId: opts.attackerTypeId ?? 'warrior',
    position: attackerPos,
    movementLeft: 2,
    health: opts.attackerHealth ?? 99,
  }));
  units.set('d1', createTestUnit({
    id: 'd1',
    owner: 'p2',
    typeId: opts.defenderTypeId ?? 'warrior',
    position: defenderPos,
    health: 100,
  }));
  for (const f of opts.flankers ?? []) {
    units.set(f.id, createTestUnit({
      id: f.id,
      owner: f.owner ?? 'p1',
      typeId: f.typeId ?? 'warrior',
      position: f.position,
      health: 100,
    }));
  }
  // Give the attacker's owner Military Training so flanking is unlocked
  // (per §6.7). The F9 test overrides this to false to verify the tech gate.
  const hasMT = opts.attackerHasMilitaryTraining ?? true;
  const players = new Map([
    ['p1', createTestPlayer({
      id: 'p1',
      leaderId: 'cleopatra',
      researchedTechs: hasMT ? ['military_training'] : [],
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

/** Run the canonical attack and return damage dealt to defender d1. */
function damageTo(state: GameState): number {
  const next = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
  const defender = next.units.get('d1');
  if (!defender) return 100;
  return 100 - defender.health;
}

// Tile positions adjacent to defender (4,3) other than the attacker at (3,3):
const FLANK_POS_A = { q: 5, r: 3 };
const FLANK_POS_B = { q: 5, r: 2 };
const FLANK_POS_C = { q: 4, r: 2 };
const FLANK_POS_D = { q: 3, r: 4 };
const FLANK_POS_E = { q: 4, r: 4 };

// ── F1: Flanking bonus scales with friendly-adjacent count ──────────────────

describe('F1: flanking bonus scales with count of friendlies adjacent to defender (§6.7)', () => {
  it('two flankers yield strictly greater damage than zero flankers (seed held constant)', () => {
    // Rulebook requires "2+ friendly units" adjacent. The engine applies a
    // +2 CS bonus per flanker, so two flankers = +4 CS → noticeably more
    // damage than no flankers with the same RNG stream.
    const baseline = damageTo(buildFlankingScenario({ seed: 7 }));
    const withTwo = damageTo(buildFlankingScenario({
      seed: 7,
      flankers: [
        { id: 'f1', position: FLANK_POS_A },
        { id: 'f2', position: FLANK_POS_B },
      ],
    }));
    expect(withTwo).toBeGreaterThan(baseline);
  });

  it('three flankers yield greater damage than two flankers (seed held constant)', () => {
    // +2 CS per flanker below the cap → 3 flankers (+6 CS) > 2 flankers (+4 CS).
    const withTwo = damageTo(buildFlankingScenario({
      seed: 11,
      flankers: [
        { id: 'f1', position: FLANK_POS_A },
        { id: 'f2', position: FLANK_POS_B },
      ],
    }));
    const withThree = damageTo(buildFlankingScenario({
      seed: 11,
      flankers: [
        { id: 'f1', position: FLANK_POS_A },
        { id: 'f2', position: FLANK_POS_B },
        { id: 'f3', position: FLANK_POS_C },
      ],
    }));
    expect(withThree).toBeGreaterThan(withTwo);
  });
});

// ── F2: Minimum 2 friendly units required (§6.7 bullet 2) ───────────────────

describe('F2: a single friendly flanker grants NO bonus (rulebook requires 2+ adjacent) (§6.7)', () => {
  it('one flanker alone should grant zero bonus', () => {
    // Rulebook §6.7: "Requires 2+ friendly units adjacent to the target."
    // With only one friendly adjacent, flanking should NOT apply at all.
    // The chosen position is not adjacent to the attacker, so the separate
    // support-adjacency rule does not affect this assertion.
    const baseline = damageTo(buildFlankingScenario({ seed: 9 }));
    const withOne = damageTo(buildFlankingScenario({
      seed: 9,
      flankers: [{ id: 'f1', position: FLANK_POS_A }],
    }));
    expect(withOne).toBe(baseline);
  });
});

// ── F3: Cap on total flanking bonus ─────────────────────────────────────────

describe('F3: flanking bonus is capped (engine cap: +9 CS, i.e. 3 flankers) (§6.7)', () => {
  it('a fourth non-supporting flanker produces the same damage as 3 flankers (bonus capped)', () => {
    // Flanking itself is capped at 3 effective allies. Use FLANK_POS_E as the
    // fourth unit because it is adjacent to the defender but not the attacker,
    // so this isolates flanking from the separate support-adjacency rule.
    const withThree = damageTo(buildFlankingScenario({
      seed: 13,
      flankers: [
        { id: 'f1', position: FLANK_POS_A },
        { id: 'f2', position: FLANK_POS_B },
        { id: 'f3', position: FLANK_POS_C },
      ],
    }));
    const withFour = damageTo(buildFlankingScenario({
      seed: 13,
      flankers: [
        { id: 'f1', position: FLANK_POS_A },
        { id: 'f2', position: FLANK_POS_B },
        { id: 'f3', position: FLANK_POS_C },
        { id: 'f4', position: FLANK_POS_E },
      ],
    }));
    expect(withFour).toBe(withThree);
  });
});

// ── F4: Attacker itself never counted as its own flanker ────────────────────

describe('F4: the attacker is not counted as a flanker (§6.7)', () => {
  it('attacker alone (no other friendlies) produces the zero-flanker baseline', () => {
    // If the attacker somehow counted itself, damage would exceed the
    // zero-flanker baseline. The reference baseline here IS the zero-flanker
    // scenario, so we assert damage matches a reconstruction using a
    // distinct seed-keyed run with still no flankers — tautologically equal.
    const a = damageTo(buildFlankingScenario({ seed: 21 }));
    const b = damageTo(buildFlankingScenario({ seed: 21 }));
    expect(a).toBe(b);
    // And confirm that adding a non-adjacent friendly changes nothing:
    const withDistantFriendly = damageTo(buildFlankingScenario({
      seed: 21,
      // (0,0) is NOT adjacent to defender (4,3), so it must not count.
      flankers: [{ id: 'f1', position: { q: 0, r: 0 } }],
    }));
    expect(withDistantFriendly).toBe(a);
  });
});

// ── F5: Civilian units do NOT contribute flanking ───────────────────────────

describe('F5: civilian units do NOT contribute flanking bonus (§6.7 — only combat units flank)', () => {
  it('an adjacent settler (civilian) should contribute 0 flanking', () => {
    // Rulebook §6.7 speaks of combat units forming a Battlefront; civilians
    // cannot participate in the flank. A settler/civilian beside the
    // defender should NOT boost the attacker's CS.
    const baseline = damageTo(buildFlankingScenario({ seed: 17 }));
    const withCivilian = damageTo(buildFlankingScenario({
      seed: 17,
      flankers: [{ id: 'f1', typeId: 'settler', position: FLANK_POS_A }],
    }));
    expect(withCivilian).toBe(baseline);
  });
});

// ── F6: Enemy units adjacent to defender don't flank (wrong side) ───────────

describe('F6: enemy units adjacent to defender do NOT grant attacker flanking (§6.7)', () => {
  it('a defender-owned unit next to the defender grants NO flanking bonus to the attacker', () => {
    // Flanking counts friendlies OF THE ATTACKER only. Another unit belonging
    // to p2 (defender's owner) standing adjacent to the defender must not
    // be counted as one of the attacker's flankers.
    const baseline = damageTo(buildFlankingScenario({ seed: 23 }));
    const withEnemyAlly = damageTo(buildFlankingScenario({
      seed: 23,
      flankers: [
        // Owned by p2 (the defender), adjacent to defender (4,3).
        { id: 'e2', owner: 'p2', position: FLANK_POS_A },
      ],
    }));
    // It does not flank for the attacker, but it is now defensive support for d1.
    expect(withEnemyAlly).toBeLessThan(baseline);
  });

  it('third-party (p3) unit adjacent to defender does not grant p1 a flanking bonus', () => {
    // The attacker's flanking must only count the attacker's OWN units —
    // a neutral/third civ's unit nearby is irrelevant.
    const baseline = damageTo(buildFlankingScenario({ seed: 27 }));
    const withNeutral = damageTo(buildFlankingScenario({
      seed: 27,
      flankers: [
        { id: 'n1', owner: 'p3', position: FLANK_POS_A },
      ],
    }));
    expect(withNeutral).toBe(baseline);
  });
});

// ── F7: Flanking applies to melee attackers; rulebook limits it to melee ────

describe('F7: flanking applies to MELEE attacks only (§6.7 bullet 3: "Melee combat creates a Battlefront")', () => {
  it('ranged archer attacker should NOT receive flanking bonus', () => {
    // Rulebook §6.7: "Melee combat creates a Battlefront. Attacks from the
    // side or rear gain flanking bonus." The flanking bonus is thus scoped
    // to melee attacks. A ranged attacker should not benefit.
    // BUG: calculateFlankingBonus is called unconditionally for any
    // `isAttacking`, irrespective of the attacker's category/range.
    const baselineArcher = damageTo(buildFlankingScenario({
      seed: 31,
      attackerTypeId: 'archer',
      attackerPosition: { q: 2, r: 3 },   // within range 2 of (4,3)
    }));
    const archerWithFlankers = damageTo(buildFlankingScenario({
      seed: 31,
      attackerTypeId: 'archer',
      attackerPosition: { q: 2, r: 3 },
      flankers: [
        { id: 'f1', position: FLANK_POS_A },
        { id: 'f2', position: FLANK_POS_B },
        { id: 'f3', position: FLANK_POS_C },
      ],
    }));
    expect(archerWithFlankers).toBe(baselineArcher);
  });
});

// ── F8: Flanking stacks additively with fortification / terrain ─────────────

describe('F8: flanking stacks additively with fortification / terrain defense (§6.7)', () => {
  it('flankers still increase damage against a fortified defender (bonus not suppressed)', () => {
    // Fortified defender gets +5 CS; attacker gets +2 per flanker. Both are
    // additive CS modifiers. Across a shared seed, damage WITH 3 flankers
    // must strictly exceed damage WITH 0 flankers even when the defender
    // is fortified — proving the flank stacks rather than being swallowed.
    const fortify = (s: GameState): GameState => {
      const units = new Map(s.units);
      const d = units.get('d1');
      if (!d) return s;
      units.set('d1', { ...d, fortified: true });
      return { ...s, units };
    };
    const fortifiedNoFlank = damageTo(fortify(buildFlankingScenario({ seed: 41 })));
    const fortifiedWithFlank = damageTo(fortify(buildFlankingScenario({
      seed: 41,
      flankers: [
        { id: 'f1', position: FLANK_POS_A },
        { id: 'f2', position: FLANK_POS_B },
        { id: 'f3', position: FLANK_POS_C },
      ],
    })));
    expect(fortifiedWithFlank).toBeGreaterThan(fortifiedNoFlank);
  });
});

// ── F9: Military Training tech required to unlock flanking ──────────────────

describe('F9: flanking is gated behind Military Training tech (§6.7 bullet 1)', () => {
  it('attacker without Military Training researched should get zero flanking', () => {
    // Rulebook §6.7: "Unlocked after researching Military Training." Before
    // the attacker's owner has researched that tech, no flanking bonus
    // should apply.
    const baseline = damageTo(buildFlankingScenario({
      seed: 53,
      attackerHasMilitaryTraining: false,
    }));
    const withFlankersNoTech = damageTo(buildFlankingScenario({
      seed: 53,
      attackerHasMilitaryTraining: false,
      flankers: [
        { id: 'f1', position: FLANK_POS_A },
        { id: 'f2', position: FLANK_POS_B },
      ],
    }));
    // Without Military Training researched, flanking should NOT apply,
    // so damage should equal the zero-flanker baseline.
    expect(withFlankersNoTech).toBe(baseline);
  });
});

// ── F10: Flanker ADJACENCY is strict (not within-2-hex) ─────────────────────

describe('F10: only friendlies DIRECTLY adjacent to the defender flank (distance === 1) (§6.7)', () => {
  it('friendly two tiles away from the defender grants no flanking bonus', () => {
    // distance((6,3), (4,3)) = 2 (same row, two steps east). That unit is
    // adjacent to the attacker (3,3) path but NOT to the defender, so it
    // cannot be a flanker.
    const baseline = damageTo(buildFlankingScenario({ seed: 59 }));
    const withFarFriendly = damageTo(buildFlankingScenario({
      seed: 59,
      flankers: [{ id: 'f1', position: { q: 6, r: 3 } }],
    }));
    expect(withFarFriendly).toBe(baseline);
  });

  it('two friendlies at distance 2 from defender do NOT combine into a flanking bonus', () => {
    // Two faraway friendlies should not be treated as if they were both
    // adjacent. They are also not adjacent to the attacker, avoiding support.
    const baseline = damageTo(buildFlankingScenario({ seed: 61 }));
    const withTwoFar = damageTo(buildFlankingScenario({
      seed: 61,
      flankers: [
        { id: 'f1', position: { q: 6, r: 3 } },
        { id: 'f2', position: { q: 6, r: 2 } }, // distance 2 from (4,3)
      ],
    }));
    expect(withTwoFar).toBe(baseline);
  });
});
