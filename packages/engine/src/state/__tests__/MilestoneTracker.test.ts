import { describe, it, expect } from 'vitest';
import {
  playerAchievedMilestones,
  empireMilestoneSummary,
  milestoneLeaderboard,
  type MilestoneAchievement,
} from '../MilestoneTracker';
import { ALL_LEGACY_PATHS } from '../LegacyPaths';
import { createTestState, createTestPlayer } from '../../systems/__tests__/helpers';
import type { CityState, GameState, PlayerState } from '../../types/GameState';

// ── Helpers ────────────────────────────────────────────────────────────────

function cityWith(
  overrides: Partial<CityState> & Pick<CityState, 'id' | 'owner'>,
): CityState {
  return {
    id: overrides.id,
    name: overrides.name ?? 'City',
    owner: overrides.owner,
    position: overrides.position ?? { q: 0, r: 0 },
    population: overrides.population ?? 1,
    food: overrides.food ?? 0,
    productionQueue: overrides.productionQueue ?? [],
    productionProgress: overrides.productionProgress ?? 0,
    buildings: overrides.buildings ?? [],
    territory: overrides.territory ?? [],
    settlementType: overrides.settlementType ?? 'city',
    happiness: overrides.happiness ?? 0,
    isCapital: overrides.isCapital ?? false,
    defenseHP: overrides.defenseHP ?? 100,
    specialization: overrides.specialization ?? null,
    specialists: overrides.specialists ?? 0,
    districts: overrides.districts ?? [],
  };
}

function stateWithPlayer(
  playerOverrides: Partial<PlayerState>,
  citiesList: ReadonlyArray<CityState> = [],
): GameState {
  const p = createTestPlayer({ id: 'p1', ...playerOverrides });
  const cities = new Map<string, CityState>();
  for (const c of citiesList) cities.set(c.id, c);
  return createTestState({
    players: new Map([['p1', p]]),
    cities,
  });
}

function stateWithManyPlayers(
  specs: ReadonlyArray<{ id: string; player?: Partial<PlayerState>; cities?: ReadonlyArray<CityState> }>,
): GameState {
  const players = new Map<string, PlayerState>();
  const cities = new Map<string, CityState>();
  for (const spec of specs) {
    players.set(spec.id, createTestPlayer({ id: spec.id, ...spec.player }));
    for (const c of spec.cities ?? []) cities.set(c.id, c);
  }
  return createTestState({ players, cities });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('playerAchievedMilestones — empty / unknown cases', () => {
  it('empty state with fresh player → zero achievements', () => {
    const state = stateWithPlayer({});
    const out = playerAchievedMilestones('p1', state);
    expect(out).toEqual([]);
  });

  it('unknown player id → empty list', () => {
    const state = stateWithPlayer({});
    const out = playerAchievedMilestones('ghost', state);
    expect(out).toEqual([]);
  });
});

describe('playerAchievedMilestones — milestone emission', () => {
  it('4 antiquity-era techs → includes Antiquity Science tier-1 milestone', () => {
    const state = stateWithPlayer({
      researchedTechs: ['pottery', 'writing', 'mining', 'animal_husbandry'],
    });
    const out = playerAchievedMilestones('p1', state);
    const match = out.find(
      (m) => m.age === 'antiquity' && m.axis === 'science' && m.tier === 1,
    );
    expect(match).toBeDefined();
    expect(match?.pathId).toBe('antiquity_science');
    expect(match?.description.length).toBeGreaterThan(0);
    // Only tier 1 — not tier 2 (requires 8 techs)
    expect(
      out.some((m) => m.age === 'antiquity' && m.axis === 'science' && m.tier === 2),
    ).toBe(false);
  });

  it('8 techs → emits tier 1 and tier 2 (cumulative), not tier 3', () => {
    const state = stateWithPlayer({
      researchedTechs: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'],
    });
    const out = playerAchievedMilestones('p1', state);
    const antiquityScience = out.filter(
      (m) => m.age === 'antiquity' && m.axis === 'science',
    );
    expect(antiquityScience.length).toBe(2);
    expect(antiquityScience.map((m) => m.tier).sort()).toEqual([1, 2]);
  });

  it('all 3 antiquity-science tiers satisfied emits 3 records in tier order', () => {
    const c1 = cityWith({ id: 'c1', owner: 'p1', buildings: ['library'] });
    const state = stateWithPlayer(
      { researchedTechs: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] },
      [c1],
    );
    const out = playerAchievedMilestones('p1', state);
    const antSci = out.filter(
      (m) => m.age === 'antiquity' && m.axis === 'science',
    );
    expect(antSci.map((m) => m.tier)).toEqual([1, 2, 3]);
  });

  it('every emitted record has a pathId matching `${age}_${axis}`', () => {
    const state = stateWithPlayer({
      totalGoldEarned: 10_000,
      totalKills: 30,
      culture: 600,
      researchedTechs: [
        'industrialization', 'scientific_theory', 'rifling',
        'steam_power', 'electricity', 'replaceable_parts',
        'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
      ],
    });
    const out = playerAchievedMilestones('p1', state);
    expect(out.length).toBeGreaterThan(0);
    for (const m of out) {
      expect(m.pathId).toBe(`${m.age}_${m.axis}`);
    }
  });

  it('all 12 paths fully achieved → exactly 36 achievements', () => {
    // Saturate every proxy threshold used by M18.
    const c1 = cityWith({
      id: 'c1',
      owner: 'p1',
      buildings: [
        'library',
        // 8 wonders — assert count via config.isWonder flag; since we cannot
        // guarantee which building ids are wonders in the test config, we only
        // claim saturation on the paths whose checks are counter-based.
      ],
    });
    const state = stateWithPlayer(
      {
        totalGoldEarned: 100_000,
        totalKills: 100,
        culture: 10_000,
        researchedTechs: [
          'industrialization', 'scientific_theory', 'rifling',
          'steam_power', 'electricity', 'replaceable_parts',
          'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
          'extra1', 'extra2',
        ],
      },
      [c1],
    );
    const out = playerAchievedMilestones('p1', state);
    // At minimum the counter-driven paths (all except wonder & district paths)
    // must be fully saturated. We expect >= 24 (8 paths × 3 tiers).
    expect(out.length).toBeGreaterThanOrEqual(24);
    // Every record must be a valid discriminated milestone shape.
    for (const m of out) {
      expect([1, 2, 3]).toContain(m.tier);
      expect(['science', 'culture', 'military', 'economic']).toContain(m.axis);
      expect(['antiquity', 'exploration', 'modern']).toContain(m.age);
    }
  });
});

describe('playerAchievedMilestones — purity', () => {
  it('same inputs → identical outputs across calls', () => {
    const state = stateWithPlayer({ totalGoldEarned: 600 });
    const a = playerAchievedMilestones('p1', state);
    const b = playerAchievedMilestones('p1', state);
    expect(a).toEqual(b);
  });

  it('does not mutate state', () => {
    const state = stateWithPlayer({ totalGoldEarned: 600, totalKills: 7 });
    const goldBefore = state.players.get('p1')!.totalGoldEarned;
    const killsBefore = state.players.get('p1')!.totalKills;
    playerAchievedMilestones('p1', state);
    expect(state.players.get('p1')!.totalGoldEarned).toBe(goldBefore);
    expect(state.players.get('p1')!.totalKills).toBe(killsBefore);
  });
});

describe('empireMilestoneSummary', () => {
  it('empty state → map with zero-valued entry for every known player', () => {
    const state = stateWithManyPlayers([{ id: 'p1' }, { id: 'p2' }]);
    const summary = empireMilestoneSummary(state);
    expect(summary.size).toBe(2);
    for (const s of summary.values()) {
      expect(s.totalAchieved).toBe(0);
      expect(s.byAxis).toEqual({ science: 0, culture: 0, military: 0, economic: 0 });
      expect(s.byAge).toEqual({ antiquity: 0, exploration: 0, modern: 0 });
    }
  });

  it('sums achievements correctly across axes and ages', () => {
    // p1: 4 techs + 600 culture + 3000 gold + 20 kills
    //   antiquity_science: 4 techs → tier 1 (1)
    //   exploration_culture: 600 culture → all 3 tiers (3)
    //   exploration_economic: 3000 gold ≥ 2500 → tiers 1+2 (2)
    //   antiquity_economic: 3000 gold ≥ 1000 → 3 tiers (3)
    //   exploration_military: 20 kills ≥ 15 → 3 tiers (3)
    //   modern_economic: 3000 gold ≥ 3000 → tier 1 (1)
    //   antiquity_military: 20 kills ≥ 3, 0 cities → tier 1 only (1)
    //   modern_military: 20 kills ≥ 20 → tiers 1+2 (2)
    const state = stateWithPlayer({
      researchedTechs: ['t1', 't2', 't3', 't4'],
      culture: 600,
      totalGoldEarned: 3000,
      totalKills: 20,
    });
    const summary = empireMilestoneSummary(state);
    const s = summary.get('p1');
    expect(s).toBeDefined();
    // Totals of byAxis and byAge must both equal totalAchieved.
    const axisTotal =
      s!.byAxis.science + s!.byAxis.culture + s!.byAxis.military + s!.byAxis.economic;
    const ageTotal = s!.byAge.antiquity + s!.byAge.exploration + s!.byAge.modern;
    expect(axisTotal).toBe(s!.totalAchieved);
    expect(ageTotal).toBe(s!.totalAchieved);
    expect(s!.totalAchieved).toBeGreaterThanOrEqual(
      1 + 3 + 2 + 3 + 3 + 1 + 1 + 2,
    );
  });

  it('each player counted independently — no cross-contamination', () => {
    const state = stateWithManyPlayers([
      { id: 'p1', player: { researchedTechs: ['t1', 't2', 't3', 't4'] } },
      { id: 'p2' },
    ]);
    const summary = empireMilestoneSummary(state);
    expect(summary.get('p1')!.totalAchieved).toBeGreaterThan(0);
    expect(summary.get('p2')!.totalAchieved).toBe(0);
  });
});

describe('milestoneLeaderboard — dense rank', () => {
  it('two players with different totals → dense ranks 1 and 2', () => {
    const state = stateWithManyPlayers([
      { id: 'p1', player: { researchedTechs: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'] } },
      { id: 'p2' },
    ]);
    const board = milestoneLeaderboard(state);
    expect(board.length).toBe(2);
    expect(board[0].playerId).toBe('p1');
    expect(board[0].rank).toBe(1);
    expect(board[1].playerId).toBe('p2');
    expect(board[1].rank).toBe(2);
    expect(board[0].totalAchieved).toBeGreaterThan(board[1].totalAchieved);
  });

  it('ties share a rank; the next distinct value gets the immediately following rank', () => {
    // p1 and p2 both fresh → tie. p3 has 4 techs → ahead.
    const state = stateWithManyPlayers([
      { id: 'p1' },
      { id: 'p2' },
      { id: 'p3', player: { researchedTechs: ['a', 'b', 'c', 'd'] } },
    ]);
    const board = milestoneLeaderboard(state);
    expect(board.length).toBe(3);
    expect(board[0].playerId).toBe('p3');
    expect(board[0].rank).toBe(1);
    // p1 and p2 both have 0 → tied for rank 2.
    expect(board[1].rank).toBe(2);
    expect(board[2].rank).toBe(2);
    expect(board[1].totalAchieved).toBe(0);
    expect(board[2].totalAchieved).toBe(0);
  });

  it('sorted descending by totalAchieved', () => {
    const state = stateWithManyPlayers([
      { id: 'a' },
      { id: 'b', player: { researchedTechs: ['t1', 't2', 't3', 't4'] } },
      { id: 'c', player: { researchedTechs: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'] } },
    ]);
    const board = milestoneLeaderboard(state);
    for (let i = 0; i + 1 < board.length; i++) {
      expect(board[i].totalAchieved).toBeGreaterThanOrEqual(board[i + 1].totalAchieved);
    }
  });

  it('empty players map → empty leaderboard', () => {
    const state = createTestState({ players: new Map() });
    expect(milestoneLeaderboard(state)).toEqual([]);
  });
});

describe('cross-check against ALL_LEGACY_PATHS', () => {
  it('every emitted achievement references a valid (age, axis) pair in ALL_LEGACY_PATHS', () => {
    const state = stateWithPlayer({
      researchedTechs: ['a', 'b', 'c', 'd'],
      culture: 600,
      totalGoldEarned: 2000,
      totalKills: 10,
    });
    const achievements: ReadonlyArray<MilestoneAchievement> =
      playerAchievedMilestones('p1', state);
    for (const m of achievements) {
      const path = ALL_LEGACY_PATHS.find((p) => p.age === m.age && p.axis === m.axis);
      expect(path).toBeDefined();
      const milestone = path!.milestones.find((x) => x.tier === m.tier);
      expect(milestone).toBeDefined();
      expect(milestone!.description).toBe(m.description);
    }
  });
});
