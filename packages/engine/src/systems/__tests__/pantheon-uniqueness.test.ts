/**
 * pantheon-uniqueness.test.ts — verifies that M10 religionSystem +
 * M17 religion-slot `pantheonClaims` enforce the two uniqueness
 * invariants from the design:
 *
 *   (1) Global: one civ per pantheon — once player A adopts
 *       `god_of_war`, player B cannot also adopt `god_of_war`.
 *   (2) Per-civ: one pantheon per civ — once A adopts `god_of_war`,
 *       a second ADOPT_PANTHEON from A (same or different pantheon)
 *       is a no-op.
 *
 * Plus: the optional `pantheonClaims` map on the religion slot should
 * be lazily initialized on first successful adoption.
 *
 * NOTE (cycle context): the current religionSystem ADOPT_PANTHEON
 * handler only deducts faith and logs — it does NOT write to
 * `state.religion.pantheonClaims` and does NOT set
 * `player.pantheonId`. Tests that exercise the uniqueness invariants
 * are therefore wrapped in `it.fails(...)` so the gap is documented
 * for a follow-up fix cycle without modifying source here.
 *
 * Scope: read-only tests — no changes to production sources.
 */

import { describe, it, expect } from 'vitest';
import { religionSystem } from '../religionSystem';
import type { ReligionAction } from '../../types/Religion';
import type { GameState } from '../../types/GameState';
import { createTestState, createTestPlayer } from './helpers';

/**
 * Convenience accessor — the religion slot's optional pantheonClaims
 * field, typed for ergonomic assertions in tests.
 */
function pantheonClaimsOf(state: GameState): ReadonlyMap<string, string> | undefined {
  return state.religion?.pantheonClaims;
}

describe('pantheon uniqueness — ADOPT_PANTHEON invariants', () => {
  it.fails(
    'records claim: Player A adopting god_of_war sets pantheonClaims.get("god_of_war") === "pA"',
    () => {
      const state = createTestState({
        currentPlayerId: 'pA',
        players: new Map([
          ['pA', createTestPlayer({ id: 'pA', name: 'Alpha', faith: 100 })],
        ]),
      });
      const action: ReligionAction = {
        type: 'ADOPT_PANTHEON',
        playerId: 'pA',
        pantheonId: 'god_of_war',
      };
      const next = religionSystem(state, action);
      const claims = pantheonClaimsOf(next);
      expect(claims).toBeDefined();
      expect(claims!.get('god_of_war')).toBe('pA');
    },
  );

  it.fails(
    'rejects duplicate claim: once pA holds god_of_war, pB adopting god_of_war is a no-op',
    () => {
      const base = createTestState({
        currentPlayerId: 'pA',
        players: new Map([
          ['pA', createTestPlayer({ id: 'pA', name: 'Alpha', faith: 100 })],
          ['pB', createTestPlayer({ id: 'pB', name: 'Beta', faith: 100 })],
        ]),
      });
      const afterA = religionSystem(base, {
        type: 'ADOPT_PANTHEON',
        playerId: 'pA',
        pantheonId: 'god_of_war',
      });
      const afterB = religionSystem(afterA, {
        type: 'ADOPT_PANTHEON',
        playerId: 'pB',
        pantheonId: 'god_of_war',
      });

      // pB's attempt must be a complete no-op:
      //  - state reference unchanged
      //  - pB's faith pool untouched
      //  - pantheonClaims still maps 'god_of_war' -> 'pA' (no overwrite)
      expect(afterB).toBe(afterA);
      expect(afterB.players.get('pB')!.faith).toBe(100);
      expect(pantheonClaimsOf(afterB)!.get('god_of_war')).toBe('pA');
    },
  );

  it.fails(
    'allows distinct pantheon: once pA holds god_of_war, pB adopting god_of_healing succeeds',
    () => {
      const base = createTestState({
        currentPlayerId: 'pA',
        players: new Map([
          ['pA', createTestPlayer({ id: 'pA', name: 'Alpha', faith: 100 })],
          ['pB', createTestPlayer({ id: 'pB', name: 'Beta', faith: 100 })],
        ]),
      });
      const afterA = religionSystem(base, {
        type: 'ADOPT_PANTHEON',
        playerId: 'pA',
        pantheonId: 'god_of_war',
      });
      const afterB = religionSystem(afterA, {
        type: 'ADOPT_PANTHEON',
        playerId: 'pB',
        pantheonId: 'god_of_healing',
      });

      const claims = pantheonClaimsOf(afterB);
      expect(claims).toBeDefined();
      expect(claims!.size).toBe(2);
      expect(claims!.get('god_of_war')).toBe('pA');
      expect(claims!.get('god_of_healing')).toBe('pB');
      // Both players paid the faith cost.
      expect(afterB.players.get('pA')!.faith).toBe(75);
      expect(afterB.players.get('pB')!.faith).toBe(75);
    },
  );

  it.fails(
    'lazily initializes pantheonClaims on first adoption (map with exactly 1 entry)',
    () => {
      const state = createTestState({
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', faith: 100 })],
        ]),
      });
      // Precondition: no religion slot at all.
      expect(state.religion).toBeUndefined();

      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_craftsmen',
      });

      expect(next.religion).toBeDefined();
      const claims = pantheonClaimsOf(next);
      expect(claims).toBeDefined();
      expect(claims!.size).toBe(1);
      expect(claims!.get('god_of_craftsmen')).toBe('p1');
    },
  );

  it('insufficient faith — no claim recorded, state unchanged', () => {
    // This invariant IS enforced today (faith cost check) — regular it().
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', faith: 0 })],
      ]),
    });
    const next = religionSystem(state, {
      type: 'ADOPT_PANTHEON',
      playerId: 'p1',
      pantheonId: 'god_of_war',
    });
    expect(next).toBe(state);
    expect(pantheonClaimsOf(next)).toBeUndefined();
    expect(next.players.get('p1')!.faith).toBe(0);
  });

  it('unknown pantheonId — no claim recorded, state unchanged', () => {
    // Also enforced today — regular it().
    const state = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', faith: 500 })],
      ]),
    });
    const next = religionSystem(state, {
      type: 'ADOPT_PANTHEON',
      playerId: 'p1',
      pantheonId: 'not_a_real_pantheon',
    });
    expect(next).toBe(state);
    expect(pantheonClaimsOf(next)).toBeUndefined();
    expect(next.players.get('p1')!.faith).toBe(500);
  });

  it.fails(
    'one pantheon per civ: player with existing pantheonId cannot adopt a second',
    () => {
      // Seed pA with an already-taken pantheon slot. The invariant says
      // a second ADOPT_PANTHEON from pA must be a no-op, regardless of
      // which pantheon they target.
      const state = createTestState({
        players: new Map([
          ['pA', createTestPlayer({
            id: 'pA',
            faith: 500,
            pantheonId: 'god_of_war',
          })],
        ]),
        religion: {
          religions: [],
          pantheonClaims: new Map([['god_of_war', 'pA']]),
        },
      });

      const next = religionSystem(state, {
        type: 'ADOPT_PANTHEON',
        playerId: 'pA',
        pantheonId: 'god_of_healing',
      });

      // State must be strictly unchanged: no second claim, no faith spent.
      expect(next).toBe(state);
      expect(next.players.get('pA')!.faith).toBe(500);
      const claims = pantheonClaimsOf(next)!;
      expect(claims.size).toBe(1);
      expect(claims.has('god_of_healing')).toBe(false);
      expect(claims.get('god_of_war')).toBe('pA');
    },
  );

  it.fails(
    'three players claim three distinct pantheons — claims map has exactly 3 correct entries',
    () => {
      const base = createTestState({
        currentPlayerId: 'p1',
        players: new Map([
          ['p1', createTestPlayer({ id: 'p1', name: 'One', faith: 100 })],
          ['p2', createTestPlayer({ id: 'p2', name: 'Two', faith: 100 })],
          ['p3', createTestPlayer({ id: 'p3', name: 'Three', faith: 100 })],
        ]),
      });

      const s1 = religionSystem(base, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p1',
        pantheonId: 'god_of_war',
      });
      const s2 = religionSystem(s1, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p2',
        pantheonId: 'god_of_healing',
      });
      const s3 = religionSystem(s2, {
        type: 'ADOPT_PANTHEON',
        playerId: 'p3',
        pantheonId: 'goddess_of_harvest',
      });

      const claims = pantheonClaimsOf(s3);
      expect(claims).toBeDefined();
      expect(claims!.size).toBe(3);
      expect(claims!.get('god_of_war')).toBe('p1');
      expect(claims!.get('god_of_healing')).toBe('p2');
      expect(claims!.get('goddess_of_harvest')).toBe('p3');
    },
  );
});
