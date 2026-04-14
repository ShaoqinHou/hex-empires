import { describe, it, expect } from 'vitest';
import { diplomacySystem, defaultRelation, getRelationKey, getStatusFromRelationship } from '../diplomacySystem';
import { combatSystem } from '../combatSystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import type { DiplomacyRelation, GameState, PlayerState } from '../../types/GameState';

/**
 * Rulebook §11 parity audit — Diplomacy.
 *
 * Rulebook §11 (civ7-rulebook.md lines 651–721):
 *   11.1 Influence (Diplomacy Currency)
 *        - Base generation: **10 Influence per turn** (Standard speed).
 *        - Sources: Monuments (+1), Guildhalls (+2), Opera Houses (+3),
 *          Radio Stations (+4), Villa (+2), Hub Towns, Diplomatic Attributes.
 *        - Influence is spent on all diplomatic actions.
 *   11.2 Relationship Levels
 *        helpful / friendly / neutral / unfriendly / hostile — thresholds
 *        drive allowed actions (Alliance requires Helpful; Formal War
 *        requires Hostile; Sanctions require Unfriendly).
 *   11.3 Diplomatic Actions
 *        - Endeavors (7–15 turns) mutually beneficial.
 *        - Sanctions (5–10 turns) costly hostile actions.
 *        - **Influence Scaling**: Base costs × Age (x1 Antiquity, x2
 *          Exploration, x3 Modern).
 *   11.4 War and War Support
 *        - **Formal War**: requires Hostile relationship; no War Support
 *          advantage to either side.
 *        - **Surprise War**: can be declared at any relationship; gives the
 *          *opponent* a War Support advantage.
 *        - **-1 CS per point** of negative War Support, with Happiness
 *          penalties on top. Capped somewhere around -10 CS.
 *   11.5 Conquest Penalties — not asserted here (no settlement-conquest
 *        flow available in pure diplomacySystem).
 *   11.6 City-State Diplomacy — not asserted here (no city-state entity
 *        present in GameState yet).
 *
 * Each test asserts ONE specific §11 rule against the live engine. Tests
 * using `it.fails(...)` document a known mismatch (bug) that a follow-up
 * cycle should fix. Rule codes (D1–Dn) are searchable.
 *
 * Pattern mirrors M23 zoc-rulebook-parity, M24 healing-rulebook-parity,
 * M26 flanking-rulebook-parity.
 */

// ── Shared builders ────────────────────────────────────────────────────────

function twoPlayerState(overrides: Partial<GameState> = {}): GameState {
  return createTestState({
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', influence: 500 })],
      ['p2', createTestPlayer({ id: 'p2', influence: 500 })],
    ]),
    currentPlayerId: 'p1',
    ...overrides,
  });
}

function stateWithRelation(
  relationOverrides: Partial<DiplomacyRelation>,
  playerOverrides: { p1?: Partial<PlayerState>; p2?: Partial<PlayerState> } = {},
): GameState {
  const relation: DiplomacyRelation = { ...defaultRelation(), ...relationOverrides };
  const key = getRelationKey('p1', 'p2');
  return createTestState({
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', influence: 500, ...playerOverrides.p1 })],
      ['p2', createTestPlayer({ id: 'p2', influence: 500, ...playerOverrides.p2 })],
    ]),
    currentPlayerId: 'p1',
    diplomacy: { relations: new Map([[key, relation]]) },
  });
}

// ── D1: Initial relation is neutral / not at war (§11.2) ───────────────────

describe('D1: initial relation between two players is neutral, never at war (§11.2)', () => {
  it('default relation is neutral with no prior war or alliance', () => {
    // §11.2: "Neutral | Default starting state". Two players that have never
    // interacted must start in a peaceful, neutral posture — otherwise the
    // relationship-level progression is meaningless from turn 1.
    const state = twoPlayerState();
    const key = getRelationKey('p1', 'p2');
    // Engine convention: absent entry ⇒ defaultRelation() at lookup time.
    const rel = state.diplomacy.relations.get(key) ?? defaultRelation();
    expect(rel.status).toBe('neutral');
    expect(rel.relationship).toBe(0);
    expect(rel.warSupport).toBe(0);
    expect(rel.hasAlliance).toBe(false);
    expect(rel.hasFriendship).toBe(false);
    expect(rel.hasDenounced).toBe(false);
  });
});

// ── D2: Cannot declare war on self (sanity guard) ──────────────────────────

describe('D2: a player cannot declare war on themselves (§11 guard)', () => {
  it('DECLARE_WAR targeting self is a no-op (no relation row created)', () => {
    // Diplomacy is strictly pairwise between distinct players. Self-targets
    // must be rejected or silently no-op'd.
    const state = twoPlayerState();
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p1',             // self-target
      proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
    });
    expect(next).toBe(state);     // engine returns state unchanged by reference
    expect(next.diplomacy.relations.size).toBe(0);
  });
});

// ── D3: Surprise war transitions status to 'war' (§11.4) ───────────────────

describe('D3: declaring surprise war transitions relation status to \'war\' (§11.4)', () => {
  it('neutral → war after a surprise declaration; warDeclarer records attacker', () => {
    // §11.4: Surprise War "can be declared at any relationship." From a clean
    // neutral starting point a surprise declaration must flip status to
    // 'war' and mark p1 as the declarer.
    const state = twoPlayerState();
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
    });
    const rel = next.diplomacy.relations.get('p1:p2');
    expect(rel).toBeDefined();
    expect(rel!.status).toBe('war');
    expect(rel!.isSurpriseWar).toBe(true);
    expect(rel!.warDeclarer).toBe('p1');
  });
});

// ── D4: Making peace flips 'war' back to a peaceful status (§11.4) ─────────

describe('D4: peace proposal ends war and returns to a peaceful status (§11.4)', () => {
  it('war → neutral once war has lasted long enough for peace to be accepted', () => {
    // §11.4: war must be terminable. Engine accepts peace when turnsAtWar
    // ≥ 5 OR |warSupport| ≤ 20. We set turnsAtWar = 10 to unambiguously
    // satisfy the acceptance rule.
    const state = stateWithRelation({
      status: 'war',
      relationship: -50,
      turnsAtWar: 10,
      warSupport: 0,
      warDeclarer: 'p1',
      isSurpriseWar: true,
    });
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_PEACE' },
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.status).not.toBe('war');
    // relationship bumped by +10 → -40 → status 'unfriendly' by threshold.
    expect(rel.relationship).toBe(-40);
    expect(rel.status).toBe(getStatusFromRelationship(-40));
    expect(rel.warDeclarer).toBeNull();
    expect(rel.isSurpriseWar).toBe(false);
    expect(rel.warSupport).toBe(0);
  });
});

// ── D5: Alliance requires the 'helpful' relationship level (§11.2) ─────────

describe('D5: alliance requires Helpful relationship (relationship > 60) (§11.2)', () => {
  it('alliance proposal is REJECTED when relationship is only friendly (≤ 60)', () => {
    // §11.2: "Helpful | Strong alliance | Military Alliance" — alliance
    // requires the top tier. A Friendly-tier relation (relationship = 60 in
    // engine thresholds) must not auto-elevate to alliance.
    const state = stateWithRelation({ relationship: 40, status: 'friendly' });
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_ALLIANCE' },
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.hasAlliance).toBe(false);
    // Relationship score must not have been mutated by a rejected proposal.
    expect(rel.relationship).toBe(40);
  });

  it('alliance proposal is ACCEPTED when relationship is helpful (> 60)', () => {
    // The complementary positive case: once we cross into 'helpful'
    // territory the alliance should lock in.
    const state = stateWithRelation({ relationship: 70, status: 'helpful' });
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_ALLIANCE' },
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.hasAlliance).toBe(true);
    expect(rel.hasFriendship).toBe(true);  // alliance implies friendship
  });
});

// ── D6: Formal War requires Hostile relationship (§11.4) ───────────────────

describe('D6: formal war requires Hostile relationship (relationship < -60) (§11.4)', () => {
  it('formal war declaration is REJECTED at unfriendly relationship', () => {
    // §11.4: "Formal War: Requires Hostile relationship." Unfriendly
    // (relationship ∈ [-60, -21]) is not yet hostile — the declaration must
    // be bounced without flipping status.
    const state = stateWithRelation({ relationship: -40, status: 'unfriendly' });
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR', warType: 'formal' },
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.status).not.toBe('war');
    expect(rel.status).toBe('unfriendly');
  });

  it('formal war declaration is ACCEPTED at hostile relationship', () => {
    // Positive complement: at relationship < -60 the declaration succeeds
    // and the war is *not* flagged as a surprise.
    const state = stateWithRelation({ relationship: -70, status: 'hostile' });
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR', warType: 'formal' },
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.status).toBe('war');
    expect(rel.isSurpriseWar).toBe(false);
  });
});

// ── D7: Surprise war leaves defender with War Support advantage (§11.4) ────

describe('D7: surprise war grants the defender a War Support advantage (§11.4)', () => {
  it('after surprise declaration, warSupport is negative (defender advantage)', () => {
    // §11.4: "Surprise War [...] Gives opponent a War Support advantage."
    // The engine encodes defender-advantage as warSupport < 0 (docstring on
    // DiplomacyRelation). After a fresh surprise war we should see warSupport
    // strictly below zero.
    const state = twoPlayerState();
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.warSupport).toBeLessThan(0);
  });

  it('formal war leaves warSupport at zero (no advantage to either side)', () => {
    // §11.4: Formal War has "No War Support advantage to either side."
    const state = stateWithRelation({ relationship: -80, status: 'hostile' });
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR', warType: 'formal' },
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.warSupport).toBe(0);
  });
});

// ── D8: Negative War Support imposes a CS penalty in combat (§11.4) ────────

describe('D8: negative War Support reduces CS of the disadvantaged side in combatSystem (§11.4)', () => {
  it('attacker at negative warSupport takes measurable extra damage vs. no-war-support control', () => {
    // §11.4: "-1 CS per point of negative War Support." We pit p1 (attacker,
    // negative warSupport) against p2 in two otherwise-identical fights and
    // verify the attacker is weaker when their war support is tanked.
    //
    // Geometry: a1 (attacker, p1, warrior) at (3,3) attacking d1 (p2,
    // warrior) at (4,3). Both on grassland. Seed is fixed so RNG is identical
    // between the two runs.
    const base: DiplomacyRelation = {
      ...defaultRelation(),
      status: 'war',
      relationship: -100,
      turnsAtWar: 1,
      warDeclarer: 'p1',
      isSurpriseWar: true,
    };
    const buildCombat = (warSupport: number): GameState => createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]),
      currentPlayerId: 'p1',
      units: new Map([
        ['a1', createTestUnit({ id: 'a1', owner: 'p1', position: { q: 3, r: 3 }, movementLeft: 2, health: 99 })],
        ['d1', createTestUnit({ id: 'd1', owner: 'p2', position: { q: 4, r: 3 }, health: 100 })],
      ]),
      diplomacy: { relations: new Map([['p1:p2', { ...base, warSupport }]]) },
      rng: { seed: 101, counter: 0 },
    });
    const dmgAt = (state: GameState): number => {
      const after = combatSystem(state, { type: 'ATTACK_UNIT', attackerId: 'a1', targetId: 'd1' });
      const d = after.units.get('d1');
      return d ? 100 - d.health : 100;
    };
    const neutral = dmgAt(buildCombat(0));
    const attackerPenalised = dmgAt(buildCombat(-10)); // attacker at full -10 CS penalty cap
    // When the attacker is penalised, they deal strictly less damage under
    // the same RNG seed.
    expect(attackerPenalised).toBeLessThan(neutral);
  });
});

// ── D9: Endeavor costs Influence (§11.1 / §11.3) ───────────────────────────

describe('D9: diplomatic endeavors cost Influence when executed (§11.1, §11.3)', () => {
  it('executing a Research Collaboration endeavor deducts Influence from the initiator', () => {
    // §11.1: "Influence is spent on all diplomatic actions." We fire one
    // endeavor and verify the sourcing player's Influence strictly decreases.
    const state = stateWithRelation({}, { p1: { influence: 500 } });
    const before = state.players.get('p1')!.influence;
    const next = diplomacySystem(state, {
      type: 'DIPLOMATIC_ENDEAVOR',
      targetId: 'p2',
      endeavorType: 'research_collaboration',
    });
    const after = next.players.get('p1')!.influence;
    expect(after).toBeLessThan(before);
    // And the endeavor must have been recorded on the relation.
    const rel = next.diplomacy.relations.get('p1:p2')!;
    expect(rel.activeEndeavors.length).toBe(1);
    expect(rel.activeEndeavors[0].type).toBe('research_collaboration');
  });

  it('endeavor is REJECTED when initiator lacks Influence', () => {
    // An insufficient-Influence proposal must be a no-op on the relation —
    // no endeavor gets attached and Influence is not deducted.
    const state = stateWithRelation({}, { p1: { influence: 0 } });
    const next = diplomacySystem(state, {
      type: 'DIPLOMATIC_ENDEAVOR',
      targetId: 'p2',
      endeavorType: 'research_collaboration',
    });
    expect(next.players.get('p1')!.influence).toBe(0);
    const rel = next.diplomacy.relations.get('p1:p2');
    // Either the row doesn't exist yet, or it exists with no endeavors.
    expect(rel?.activeEndeavors.length ?? 0).toBe(0);
  });
});

// ── D10: Influence costs scale with Age (§11.3) ────────────────────────────

describe('D10: endeavor Influence cost scales with Age (x1 Antiquity, x2 Exploration, x3 Modern) (§11.3)', () => {
  it.fails('Exploration-age endeavor should cost 2× Antiquity — engine cost is a flat 50', () => {
    // §11.3: "Base costs are multiplied by the current Age number (x1
    // Antiquity, x2 Exploration, x3 Modern)." The engine's endeavor cost is
    // currently a hard-coded ENDEAVOR_INFLUENCE_COST = 50 with no age scaling.
    // BUG: Influence drain in Exploration should be double Antiquity, but
    // both deduct exactly 50.
    const buildState = (currentAge: 'antiquity' | 'exploration'): GameState => {
      const base = stateWithRelation({}, { p1: { influence: 500 } });
      return { ...base, age: { ...base.age, currentAge } };
    };
    const antiquity = diplomacySystem(buildState('antiquity'), {
      type: 'DIPLOMATIC_ENDEAVOR',
      targetId: 'p2',
      endeavorType: 'research_collaboration',
    });
    const exploration = diplomacySystem(buildState('exploration'), {
      type: 'DIPLOMATIC_ENDEAVOR',
      targetId: 'p2',
      endeavorType: 'research_collaboration',
    });
    const antiquityCost = 500 - antiquity.players.get('p1')!.influence;
    const explorationCost = 500 - exploration.players.get('p1')!.influence;
    expect(explorationCost).toBe(antiquityCost * 2);
  });
});

// ── D11: War declaration costs Influence (§11.1, §11.4) ────────────────────

describe('D11: declaring war costs Influence (§11.1 — "Influence is spent on all diplomatic actions")', () => {
  it.fails('surprise war should deduct Influence from the declarer — engine currently costs 0', () => {
    // §11.1 makes Influence the universal diplomacy currency. §11.4 further
    // specifies that boosting War Support costs 180 Influence, strongly
    // implying war-related actions cost Influence. A surprise war launched
    // from 500 Influence must end with < 500 Influence.
    // BUG: diplomacySystem.DECLARE_WAR branch does not modify player.influence,
    // so wars are effectively free.
    const state = twoPlayerState();
    const before = state.players.get('p1')!.influence;
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
    });
    const after = next.players.get('p1')!.influence;
    expect(after).toBeLessThan(before);
  });
});

// ── D12: Surprise war should cost more Influence than Formal war (§11.4) ───

describe('D12: surprise war should be costlier (or more penalised) than formal war (§11.4)', () => {
  it.fails('surprise war should deduct MORE Influence than formal war — engine treats both as free', () => {
    // §11.4: Formal War requires hostile relationship (already an investment)
    // and grants NO advantage. Surprise War is available at any relationship
    // but "Gives opponent a War Support advantage" — the cost model the
    // rulebook implies is that surprise carries a strictly higher diplomatic
    // price (reputation and/or Influence). At minimum the declarer should
    // pay *some* Influence for a surprise war that exceeds the formal cost.
    // BUG: neither code path deducts any Influence, so formal and surprise
    // wars are both free in engine terms.
    const surpriseState = twoPlayerState();
    const surpriseNext = diplomacySystem(surpriseState, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
    });
    const surpriseCost = 500 - surpriseNext.players.get('p1')!.influence;

    const formalState = stateWithRelation({ relationship: -80, status: 'hostile' });
    const formalNext = diplomacySystem(formalState, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR', warType: 'formal' },
    });
    const formalCost = 500 - formalNext.players.get('p1')!.influence;

    expect(surpriseCost).toBeGreaterThan(formalCost);
  });
});

// ── D13: Base Influence generation per turn (§11.1) ────────────────────────

describe('D13: base Influence generation is at least 10/turn (§11.1)', () => {
  it.fails('a single-city player should accrue ≥10 Influence per turn — engine yields only +1 per city', () => {
    // §11.1: "Base generation: 10 Influence per turn (Standard speed)." The
    // engine's resourceSystem grants +1 Influence per city (+2 per alliance)
    // with no base generation, so a 1-city player nets +1 / turn. This
    // silently starves every diplomacy cost in §11.3.
    // BUG: missing base 10 Influence/turn accrual.
    //
    // We directly import the resourceSystem to drive an END_TURN tick and
    // measure Influence delta for p1 (who owns one city).
    const rulebookMinimum = 10;
    // Import lazily inside the test to keep the failing-import cost contained
    // to this one test; the test harness still reports `it.fails` cleanly.
    return import('../resourceSystem').then(({ resourceSystem }) => {
      // Build a one-city state for p1, zero cities for p2. +1 per city = +1.
      const base = twoPlayerState();
      const cityId = 'c1';
      const stateWithCity: GameState = {
        ...base,
        cities: new Map([
          [cityId, {
            id: cityId,
            owner: 'p1',
            name: 'Rome',
            position: { q: 0, r: 0 },
            population: 1,
            food: 0,
            happiness: 0,
            production: 0,
            productionQueue: [],
            workedTiles: new Set(),
            ownedTiles: new Set([`${0}:${0}`]),
            buildings: [],
            isCapital: true,
            isTown: false,
            settlementType: 'city',
            specialization: null,
            foundedTurn: 1,
            hp: 200,
            walls: 0,
            rallyPoint: null,
            specialists: 0,
            growthProgress: 0,
          }],
        ]),
      } as unknown as GameState;
      const before = stateWithCity.players.get('p1')!.influence;
      const next = resourceSystem(stateWithCity, { type: 'END_TURN' });
      const delta = next.players.get('p1')!.influence - before;
      expect(delta).toBeGreaterThanOrEqual(rulebookMinimum);
    });
  });
});

// ── D14: Cease-fire window: peace rejected immediately after war starts ────

describe('D14: peace cannot be negotiated in the first turns after war is declared (§11.4 cease-fire window)', () => {
  it('peace proposal is rejected at turnsAtWar = 0 with high warSupport', () => {
    // §11.4 + standard 4X convention: there is a cease-fire window right
    // after a declaration — you cannot instantly sue for peace mid-stab.
    // Engine: peace is rejected when turnsAtWar < 5 AND |warSupport| > 20.
    const state = stateWithRelation({
      status: 'war',
      relationship: -80,
      turnsAtWar: 0,
      warSupport: -50,
      warDeclarer: 'p1',
      isSurpriseWar: true,
    });
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'PROPOSE_PEACE' },
    });
    const rel = next.diplomacy.relations.get('p1:p2')!;
    // War still on, no fields flipped.
    expect(rel.status).toBe('war');
    expect(rel.turnsAtWar).toBe(0);
    expect(rel.warSupport).toBe(-50);
  });
});
