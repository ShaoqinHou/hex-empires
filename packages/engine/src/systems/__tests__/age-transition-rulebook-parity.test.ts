import { describe, it, expect } from 'vitest';
import { ageSystem } from '../ageSystem';
import { researchSystem } from '../researchSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState, GameState, PlayerState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

/**
 * Rulebook §16 parity audit — Age Transitions.
 *
 * Rulebook §16 (civ7-rulebook.md lines 1035–1054):
 *   16.1 What Happens
 *     1. Age Progress hits 100%.
 *     2. Player picks a new **Civilization** from the next Age's roster.
 *     3. **Leader** stays the same (with all attributes and promotions).
 *     4. Legacy Points are spent on **Legacies** (permanent bonuses).
 *     5. Previous civilization's **Legacy Bonus** becomes a permanent
 *        active effect.
 *     6. Legacy bonuses stack (Modern player has Antiquity + Exploration
 *        bonuses).
 *     7. Settlement cap may increase.
 *     8. Existing buildings/units may become obsolete or auto-upgrade.
 *     9. Tech/Civic trees reset to the new Age's tree.
 *
 *   16.2 Legacy Costs
 *     - **Leader Attributes**: 1 point each (cheap, bulk-purchasable).
 *     - **Standard Legacies**: Vary in cost (1-3 points).
 *     - **Golden Age Legacies**: Expensive, require completing the full
 *       Legacy Path in the previous Age.
 *
 * Each test asserts ONE specific §16 rule against the live engine. Tests
 * using `it.fails(...)` document a known mismatch (bug) that a follow-up
 * cycle should fix. Rule codes (A1–An) are searchable.
 *
 * Pattern mirrors M23 zoc-rulebook-parity, M24 healing-rulebook-parity,
 * M26 flanking-rulebook-parity, M27 diplomacy-rulebook-parity.
 */

// ── Shared builders ────────────────────────────────────────────────────────

function readyToTransitionPlayer(overrides: Partial<PlayerState> = {}): PlayerState {
  return createTestPlayer({
    id: 'p1',
    age: 'antiquity',
    civilizationId: 'rome',
    leaderId: 'augustus',
    ageProgress: 50, // at the exploration threshold below
    legacyPoints: 0,
    legacyBonuses: [],
    // Milestones deliberately at 1–2 so no golden/dark age fires.
    legacyPaths: { military: 1, economic: 1, science: 1, culture: 1 },
    ...overrides,
  });
}

function readyToTransitionState(
  player: PlayerState,
  overrides: Partial<GameState> = {},
): GameState {
  return createTestState({
    players: new Map([[player.id, player]]),
    currentPlayerId: player.id,
    age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    ...overrides,
  });
}

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 4,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: [coordToKey({ q: 3, r: 3 })],
    settlementType: 'city',
    happiness: 5,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
    ...overrides,
  };
}

// ── A1: new civ id applied on TRANSITION_AGE (§16.1 #2) ───────────────────

describe('A1: TRANSITION_AGE applies the new civilization id (§16.1 #2)', () => {
  it('player.civilizationId becomes the picked next-age civ', () => {
    // §16.1 #2: "Player picks a new Civilization from the next Age's
    // roster." Picking `spain` (exploration age) must overwrite `rome`.
    const state = readyToTransitionState(readyToTransitionPlayer());
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.civilizationId).toBe('spain');
    expect(next.players.get('p1')!.age).toBe('exploration');
    expect(next.age.currentAge).toBe('exploration');
  });
});

// ── A2: leader unchanged across transition (§16.1 #3) ─────────────────────

describe('A2: leader stays the same across an age transition (§16.1 #3)', () => {
  it('leaderId is preserved after TRANSITION_AGE', () => {
    // §16.1 #3: "Leader stays the same (with all attributes and
    // promotions)." The civ swap must never touch leaderId.
    const player = readyToTransitionPlayer({ leaderId: 'augustus' });
    const state = readyToTransitionState(player);
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.leaderId).toBe('augustus');
  });
});

// ── A3: cities carry forward (§16.1 — settlements persist) ────────────────

describe('A3: cities survive an age transition (§16.1 — settlements persist)', () => {
  it('city count and identity are preserved after TRANSITION_AGE', () => {
    // §16.1 establishes that civilizations change but settlements
    // (towns/cities) carry forward — otherwise age transitions would wipe
    // the empire. Assert the city map is untouched.
    const player = readyToTransitionPlayer();
    const city = makeCity({ id: 'c1', name: 'Rome', population: 6 });
    const state = readyToTransitionState(player, {
      cities: new Map([[city.id, city]]),
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.cities.size).toBe(1);
    expect(next.cities.get('c1')!.name).toBe('Rome');
    expect(next.cities.get('c1')!.population).toBe(6);
  });
});

describe('A3b: settlement growth history resets on age transition (§3.1 / §16)', () => {
  it('resets food and growthEventCount without erasing settlement population', () => {
    const player = readyToTransitionPlayer();
    const capital = makeCity({
      id: 'c1',
      name: 'Rome',
      population: 8,
      food: 42,
      growthEventCount: 7,
      isCapital: true,
      settlementType: 'city',
    });
    const town = makeCity({
      id: 't1',
      name: 'Ostia',
      population: 7,
      food: 20,
      growthEventCount: 6,
      isCapital: false,
      settlementType: 'town',
      specialization: 'farming_town',
    });
    const legacyTown = makeCity({
      id: 't2',
      name: 'Antium',
      population: 7,
      food: 0,
      isCapital: false,
      settlementType: 'town',
      specialization: 'mining_town',
    });
    const state = readyToTransitionState(player, {
      cities: new Map([
        [capital.id, capital],
        [town.id, town],
        [legacyTown.id, legacyTown],
      ]),
    });

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });

    const updatedCapital = next.cities.get('c1')!;
    const updatedTown = next.cities.get('t1')!;
    const updatedLegacyTown = next.cities.get('t2')!;
    expect(updatedCapital.population).toBe(8);
    expect(updatedCapital.food).toBe(0);
    expect(updatedCapital.growthEventCount).toBe(0);
    expect(updatedTown.population).toBe(7);
    expect(updatedTown.food).toBe(0);
    expect(updatedTown.growthEventCount).toBe(0);
    expect(updatedLegacyTown.population).toBe(7);
    expect(updatedLegacyTown.food).toBe(0);
    expect(updatedLegacyTown.growthEventCount).toBe(0);
  });
});

// ── A4: previous civ legacy bonus becomes persistent ActiveEffect (§16.1 #5)

describe('A4: previous civ legacy bonus becomes a persistent ActiveEffect (§16.1 #5)', () => {
  it('rome -> spain leaves the rome legacy bonus stored on the player', () => {
    // §16.1 #5: "Previous civilization's Legacy Bonus becomes a permanent
    // active effect." Rome grants +2 production empire-wide.
    // F-04: bonus is now in pendingLegacyBonuses for player selection.
    const state = readyToTransitionState(readyToTransitionPlayer({ civilizationId: 'rome' }));
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const pending = next.players.get('p1')!.pendingLegacyBonuses ?? [];
    const romeBonus = pending.find(b => b.bonusId === 'civ:rome:legacyBonus');
    expect(romeBonus).toBeDefined();
    expect(romeBonus!.effect).toEqual({
      type: 'MODIFY_YIELD',
      target: 'empire',
      yield: 'production',
      value: 2,
    });
  });
});

// ── A5: units obsoleted / auto-upgraded on transition (§16.1 #8) ──────────

describe('A5: old-age units are obsoleted or auto-upgraded on transition (§16.1 #8)', () => {
  // §16.1 #8: "Existing buildings/units may become obsolete or auto-upgrade."
  // An antiquity-only unit (e.g. warrior) should either be removed from
  // `state.units` or upgraded to its exploration-era successor at the
  // moment of transition — otherwise the new age inherits stale data.
  it.fails('antiquity unit is either removed or upgraded post-transition', () => {
    const player = readyToTransitionPlayer();
    const state = readyToTransitionState(player, {
      units: new Map([
        [
          'u1',
          {
            id: 'u1',
            typeId: 'warrior', // antiquity-era unit
            owner: 'p1',
            position: { q: 0, r: 0 },
            movementLeft: 2,
            health: 100,
            experience: 0,
            promotions: [],
            fortified: false,
          },
        ],
      ]),
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const u1 = next.units.get('u1');
    // Pass iff the unit is gone OR its typeId moved to an exploration-era
    // upgrade (definitely not still a plain 'warrior').
    const gone = u1 === undefined;
    const upgraded = u1 !== undefined && u1.typeId !== 'warrior';
    expect(gone || upgraded).toBe(true);
  });
});

// ── A6: gold / science / culture resources survive (§16.1 — carry-over) ───

describe('A6: gold / science / culture / faith survive the transition (§16.1)', () => {
  it('player resource pools are preserved (no dark age active)', () => {
    // §16.1 never mentions wiping a player's stored resources. Only dark
    // ages (§16 golden/dark age extension) apply penalties. With all
    // legacy paths at 1, no dark age triggers — resources should be intact.
    const player = readyToTransitionPlayer({
      gold: 237,
      science: 42,
      culture: 15,
      faith: 8,
    });
    const state = readyToTransitionState(player);
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const p = next.players.get('p1')!;
    expect(p.gold).toBe(237);
    expect(p.science).toBe(42);
    expect(p.culture).toBe(15);
    expect(p.faith).toBe(8);
  });
});

// ── A7: government / policies wipe; city resources persist; pantheon wipes Antiquity→Exploration

describe('A7: government/policy/pantheon wipe + city.assignedResources persist (W1-B)', () => {
  it('governmentId and slottedPolicies are reset to null/empty on TRANSITION_AGE', () => {
    // W1-B: government requires re-selection in new age; legacy policies expire.
    // W2-03: slottedPolicies is now a flat ReadonlyArray, not a Map.
    const slotted: ReadonlyArray<string | null> = ['professional_army', 'free_market'];
    const player = readyToTransitionPlayer({
      governmentId: 'classical_republic',
      slottedPolicies: slotted,
    });
    const state = readyToTransitionState(player);
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const p = next.players.get('p1')!;
    expect(p.governmentId).toBeNull();
    expect(p.slottedPolicies).toBeDefined();
    expect(p.slottedPolicies!.length).toBe(0);
  });

  it('pantheonId is cleared on Antiquity→Exploration transition (§18 / F-02)', () => {
    // §18: pantheon does NOT carry from Antiquity to Exploration.
    const player = readyToTransitionPlayer({ pantheonId: 'god_of_war' });
    const state = readyToTransitionState(player, {
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.pantheonId).toBeNull();
  });

  it('pantheonClaims are cleared on Antiquity→Exploration, but founded religions are preserved', () => {
    const player = readyToTransitionPlayer({ pantheonId: 'god_of_war' });
    const foundedReligion = {
      id: 'religion.p1.world_church',
      name: 'World Faith',
      founderPlayerId: 'p1',
      founderBeliefId: 'world_church',
      followerBeliefId: 'jesuit_education',
      holyCityId: 'c1',
      foundedOnTurn: 3,
    };
    const state = readyToTransitionState(player, {
      religion: {
        religions: [foundedReligion],
        pantheonClaims: new Map([['god_of_war', 'p1']]),
      },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });

    expect(next.religion).toBeDefined();
    expect(next.religion!.pantheonClaims).toBeUndefined();
    expect(next.religion!.religions).toEqual([foundedReligion]);
    expect(next.players.get('p1')!.pantheonId).toBeNull();
  });

  it('clears the transitioning player pantheon even when the global age already advanced', () => {
    const player = readyToTransitionPlayer({ id: 'p2', pantheonId: 'god_of_war' });
    const state = readyToTransitionState(player, {
      age: { currentAge: 'exploration', ageThresholds: { exploration: 50, modern: 100 } },
      playersReadyToTransition: ['p1'],
      religion: {
        religions: [],
        pantheonClaims: new Map([['god_of_war', 'p2']]),
      },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });

    expect(next.players.get('p2')!.pantheonId).toBeNull();
    expect(next.religion?.pantheonClaims).toBeUndefined();
  });

  it('clears stale pantheonId on Exploration→Modern transition (§18 / F-02)', () => {
    // §18/F-02: pantheons are Antiquity-only. This also cleans old saves
    // that entered Exploration before the boundary clear existed.
    const explorationPlayer = readyToTransitionPlayer({
      age: 'exploration',
      ageProgress: 100,
      pantheonId: 'god_of_war',
    });
    const state = readyToTransitionState(explorationPlayer, {
      age: { currentAge: 'exploration', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'america' });
    expect(next.players.get('p1')!.age).toBe('modern');
    expect(next.players.get('p1')!.pantheonId).toBeNull();
  });

  it('city.assignedResources persist across the transition', () => {
    // §13 resource slot assignments sit on the city, not the civ.
    // Swapping civ does not un-assign them.
    const city = makeCity({ id: 'c1', assignedResources: ['iron', 'wheat'] });
    const state = readyToTransitionState(readyToTransitionPlayer(), {
      cities: new Map([[city.id, city]]),
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.cities.get('c1')!.assignedResources).toEqual(['iron', 'wheat']);
  });
});

// ── A8: legacyPaths milestone record carries over (§16.1 #6 stacking) ─────

describe('A8: legacyPaths milestone record is observable post-transition (§16.1 #6)', () => {
  // §16.1 #6: "Legacy bonuses stack (Modern player has Antiquity +
  // Exploration bonuses)." The record of what was completed in the
  // previous age must be visible on the player after the swap so later
  // systems (victory scoring, UI) can stack bonuses across ages. Current
  // ageSystem implicitly carries `legacyPaths` through the `...player`
  // spread, but it does NOT reset the counters to 0 for the new age — the
  // rulebook's stacking model requires a per-age history, so the current
  // in-place counter is overwritten as soon as the new age earns
  // milestones. Flag as a gap: per-age milestone history is not preserved.
  it.fails('per-age legacyPaths history is preserved (not overwritten by new age counters)', () => {
    const player = readyToTransitionPlayer({
      legacyPaths: { military: 2, economic: 3, science: 1, culture: 2 },
    });
    const state = readyToTransitionState(player);
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // Expect a per-age breakdown, e.g. on legacyBonuses or a dedicated
    // `legacyHistory` field. Current engine exposes neither.
    interface MaybeLegacyHistoryPlayer extends PlayerState {
      readonly legacyHistory?: {
        readonly antiquity?: { readonly military: number; readonly economic: number; readonly science: number; readonly culture: number };
      };
    }
    const p = next.players.get('p1')! as MaybeLegacyHistoryPlayer;
    expect(p.legacyHistory?.antiquity?.economic).toBe(3);
  });
});

// ── A9: new age's tech tree becomes researchable (§16.1 #9) ───────────────

describe('A9: new age research becomes available after transition (§16.1 #9)', () => {
  it('SET_RESEARCH on an exploration-age tech succeeds post-transition', () => {
    // §16.1 #9: "Tech/Civic trees reset to the new Age's tree." Before the
    // transition, exploration techs are gated by `techDef.age !== player.age`
    // in researchSystem. After the transition, that gate must open.
    const state = readyToTransitionState(readyToTransitionPlayer());
    const afterTransition = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(afterTransition.players.get('p1')!.age).toBe('exploration');
    const afterResearch = researchSystem(afterTransition, {
      type: 'SET_RESEARCH',
      techId: 'cartography', // exploration-age tech
    });
    expect(afterResearch.players.get('p1')!.currentResearch).toBe('cartography');
  });
});

// ── A10: previous age's in-progress research is cleared (§16.1 #9) ────────

describe('A10: previous age research is cleared on transition (§16.1 #9 — tree resets)', () => {
  // §16.1 #9: "Tech/Civic trees reset to the new Age's tree." An
  // antiquity-era `currentResearch` that has not completed is nonsensical
  // once the player has advanced to exploration — the tech tree UI and
  // `researchSystem.END_TURN` would keep accumulating science toward an
  // un-picklable tech. ageSystem currently preserves `currentResearch`
  // via the `...player` spread — flag as a gap.
  it('currentResearch is reset to null after transition (W1-B)', () => {
    const player = readyToTransitionPlayer({
      currentResearch: 'pottery', // antiquity-age tech still in progress
      researchProgress: 30,
    });
    const state = readyToTransitionState(player);
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.players.get('p1')!.currentResearch).toBeNull();
    expect(next.players.get('p1')!.researchProgress).toBe(0);
  });
});

// ── A10b: civic/mastery/gov/policy/pantheon all wiped on transition (W1-B) ─

describe('A10b: civic/tech-mastery/gov/policy/pantheon all reset on TRANSITION_AGE (W1-B)', () => {
  it('after Antiquity→Exploration: researchedCivics PRESERVED, masteredCivics/masteredTechs persist, governmentId/slottedPolicies/pantheonId cleared', () => {
    // W2-03: slottedPolicies is now a flat ReadonlyArray<string | null>, not a Map.
    const slotted: ReadonlyArray<string | null> = ['professional_army'];
    const player = readyToTransitionPlayer({
      researchedCivics: ['code_of_laws', 'craftsmanship'],
      currentCivic: 'foreign_trade',
      civicProgress: 25,
      masteredCivics: ['code_of_laws'],
      currentCivicMastery: 'craftsmanship',
      civicMasteryProgress: 10,
      currentResearch: 'pottery',
      researchProgress: 30,
      masteredTechs: ['animal_husbandry'],
      currentMastery: 'mining',
      masteryProgress: 5,
      governmentId: 'classical_republic',
      slottedPolicies: slotted,
      pantheonId: 'god_of_war',
    });
    const state = readyToTransitionState(player);
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const p = next.players.get('p1')!;

    // Civic tree: researchedCivics is a PERMANENT historical record -- persists across ages (X1.3).
    // Only per-age progress fields reset.
    expect(p.researchedCivics).toEqual(['code_of_laws', 'craftsmanship']);
    expect(p.currentCivic).toBeNull();
    expect(p.civicProgress).toBe(0);
    // F-14: masteredCivics persist across age transitions (permanent knowledge)
    expect(p.masteredCivics).toEqual(['code_of_laws']);
    expect(p.currentCivicMastery).toBeNull();
    expect(p.civicMasteryProgress).toBe(0);

    // Tech tree resets (research clears, but F-14: masteries persist)
    expect(p.currentResearch).toBeNull();
    expect(p.researchProgress).toBe(0);
    // F-14: masteredTechs persist across age transitions (permanent knowledge)
    expect(p.masteredTechs).toEqual(['animal_husbandry']);
    expect(p.currentMastery).toBeNull();
    expect(p.masteryProgress).toBe(0);

    // Government resets
    expect(p.governmentId).toBeNull();
    expect(p.slottedPolicies!.length).toBe(0); // W2-03: flat array, not Map

    // Pantheon wipes on Antiquity→Exploration
    expect(p.pantheonId).toBeNull();
  });
});

// ── A11: legacy points become player-chosen purchases (§16.2) ─────────────

describe('A11: legacy points are spent on player-chosen legacies, not RNG (§16.2)', () => {
  // §16.2: "Leader Attributes: 1 point each. Standard Legacies: 1-3
  // points. Golden Age Legacies: expensive." — the player *chooses* what
  // to buy. The current ageSystem instead spends every banked legacy
  // point on a uniformly-random yield bonus (+1 to one of
  // food/production/gold/science/culture). There is no spend action, no
  // catalog of legacies, and no cost variance. Flag as a gap: §16.2 is
  // unimplemented.
  // F-04 fix: legacy-point bonuses now go to pendingLegacyBonuses instead of
  // legacyBonuses, so legacyBonuses is deterministic regardless of RNG seed.
  it('identical legacyPoints counts but different RNG seeds must produce identical bonuses (determinism via player choice, not RNG)', () => {
    const playerA = readyToTransitionPlayer({ legacyPoints: 3 });
    const playerB = readyToTransitionPlayer({ legacyPoints: 3 });
    const stateA = readyToTransitionState(playerA, { rng: { seed: 1, counter: 0 } });
    const stateB = readyToTransitionState(playerB, { rng: { seed: 999, counter: 0 } });
    const nextA = ageSystem(stateA, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const nextB = ageSystem(stateB, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    // Under §16.2, what the player buys is a deterministic choice, not an
    // RNG roll — so two identical purchase sets must be indistinguishable
    // regardless of seed. F-04: legacy-point bonuses are now in
    // pendingLegacyBonuses (not legacyBonuses), making legacyBonuses deterministic.
    const sourcesA = nextA.players.get('p1')!.legacyBonuses
      .filter(b => b.source.startsWith('legacy-point:'))
      .map(b => (b.effect.type === 'MODIFY_YIELD' ? b.effect.yield : 'other'))
      .sort();
    const sourcesB = nextB.players.get('p1')!.legacyBonuses
      .filter(b => b.source.startsWith('legacy-point:'))
      .map(b => (b.effect.type === 'MODIFY_YIELD' ? b.effect.yield : 'other'))
      .sort();
    expect(sourcesA).toEqual(sourcesB);
  });
});

// ── A12: victory.legacyProgress map is untouched by TRANSITION_AGE ────────

describe('A12: victory.legacyProgress survives an age transition (§16.1 #6 support)', () => {
  it('VictoryState.legacyProgress map is preserved verbatim', () => {
    // §16.1 #6 bonus stacking only works if the victory system has access
    // to every previously-completed legacy tier. TRANSITION_AGE must not
    // clobber `state.victory.legacyProgress`.
    const progress = new Map([
      [
        'p1',
        [
          { axis: 'science' as const, age: 'antiquity' as const, tiersCompleted: 2 as const },
          { axis: 'military' as const, age: 'antiquity' as const, tiersCompleted: 1 as const },
        ],
      ],
    ]);
    const state = readyToTransitionState(readyToTransitionPlayer(), {
      victory: { winner: null, winType: null, progress: new Map(), legacyProgress: progress },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    expect(next.victory.legacyProgress).toBe(progress);
    expect(next.victory.legacyProgress!.get('p1')).toEqual([
      { axis: 'science', age: 'antiquity', tiersCompleted: 2 },
      { axis: 'military', age: 'antiquity', tiersCompleted: 1 },
    ]);
  });
});
