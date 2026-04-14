import { describe, it, expect } from 'vitest';
import {
  ALL_LEGACY_PATHS,
  scoreLegacyPaths,
  type LegacyAxis,
  type LegacyAge,
} from '../LegacyPaths';
import { createTestState, createTestPlayer } from '../../systems/__tests__/helpers';
import type { GameState, CityState, PlayerState } from '../../types/GameState';

// ── Helpers ────────────────────────────────────────────────────────────────

function cityWith(overrides: Partial<CityState> & Pick<CityState, 'id' | 'owner'>): CityState {
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

function stateWithPlayer(playerOverrides: Partial<PlayerState>, citiesList: ReadonlyArray<CityState> = []): GameState {
  const p = createTestPlayer({ id: 'p1', ...playerOverrides });
  const cities = new Map<string, CityState>();
  for (const c of citiesList) cities.set(c.id, c);
  return createTestState({
    players: new Map([['p1', p]]),
    cities,
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('LegacyPaths — structure', () => {
  it('has exactly 12 paths (4 axes × 3 ages)', () => {
    expect(ALL_LEGACY_PATHS.length).toBe(12);
  });

  it('covers every (age, axis) pair exactly once', () => {
    const ages: ReadonlyArray<LegacyAge> = ['antiquity', 'exploration', 'modern'];
    const axes: ReadonlyArray<LegacyAxis> = ['science', 'culture', 'military', 'economic'];
    for (const age of ages) {
      for (const axis of axes) {
        const matches = ALL_LEGACY_PATHS.filter((p) => p.age === age && p.axis === axis);
        expect(matches.length).toBe(1);
      }
    }
  });

  it('every path has exactly 3 milestones', () => {
    for (const path of ALL_LEGACY_PATHS) {
      expect(path.milestones.length).toBe(3);
    }
  });

  it('milestone tiers are strictly 1, 2, 3 in order', () => {
    for (const path of ALL_LEGACY_PATHS) {
      expect(path.milestones[0].tier).toBe(1);
      expect(path.milestones[1].tier).toBe(2);
      expect(path.milestones[2].tier).toBe(3);
    }
  });

  it('all milestone ids are globally unique', () => {
    const ids = new Set<string>();
    for (const path of ALL_LEGACY_PATHS) {
      for (const m of path.milestones) {
        expect(ids.has(m.id)).toBe(false);
        ids.add(m.id);
      }
    }
    expect(ids.size).toBe(12 * 3);
  });

  it('every milestone has non-empty id and description', () => {
    for (const path of ALL_LEGACY_PATHS) {
      for (const m of path.milestones) {
        expect(m.id.length).toBeGreaterThan(0);
        expect(m.description.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('scoreLegacyPaths — shape & invariants', () => {
  it('returns an array of length 12 for any player', () => {
    const state = stateWithPlayer({});
    expect(scoreLegacyPaths('p1', state).length).toBe(12);
  });

  it('preserves the order of ALL_LEGACY_PATHS', () => {
    const state = stateWithPlayer({});
    const out = scoreLegacyPaths('p1', state);
    for (let i = 0; i < ALL_LEGACY_PATHS.length; i++) {
      expect(out[i].age).toBe(ALL_LEGACY_PATHS[i].age);
      expect(out[i].axis).toBe(ALL_LEGACY_PATHS[i].axis);
    }
  });

  it('fresh player (no techs, no cities, no gold) → every tiersCompleted === 0', () => {
    const state = stateWithPlayer({});
    const out = scoreLegacyPaths('p1', state);
    for (const entry of out) {
      expect(entry.tiersCompleted).toBe(0);
    }
  });

  it('unknown player id → every tiersCompleted === 0', () => {
    const state = stateWithPlayer({});
    const out = scoreLegacyPaths('ghost', state);
    expect(out.length).toBe(12);
    for (const entry of out) {
      expect(entry.tiersCompleted).toBe(0);
    }
  });

  it('is pure: same inputs → identical outputs across calls', () => {
    const state = stateWithPlayer({
      researchedTechs: ['pottery', 'writing', 'mining', 'animal_husbandry'],
    });
    const a = scoreLegacyPaths('p1', state);
    const b = scoreLegacyPaths('p1', state);
    expect(a).toEqual(b);
  });

  it('does not mutate state or player data', () => {
    const state = stateWithPlayer({ researchedTechs: ['a', 'b', 'c', 'd'] });
    const techsBefore = [...(state.players.get('p1')?.researchedTechs ?? [])];
    scoreLegacyPaths('p1', state);
    expect([...(state.players.get('p1')?.researchedTechs ?? [])]).toEqual(techsBefore);
  });
});

describe('scoreLegacyPaths — milestone satisfaction', () => {
  function progressFor(state: GameState, age: LegacyAge, axis: LegacyAxis): number {
    const out = scoreLegacyPaths('p1', state);
    const entry = out.find((e) => e.age === age && e.axis === axis);
    expect(entry).toBeDefined();
    return entry!.tiersCompleted;
  }

  it('4 techs researched → Antiquity Science tiersCompleted >= 1', () => {
    const state = stateWithPlayer({
      researchedTechs: ['t1', 't2', 't3', 't4'],
    });
    expect(progressFor(state, 'antiquity', 'science')).toBeGreaterThanOrEqual(1);
  });

  it('8 techs researched → Antiquity Science tiersCompleted >= 2', () => {
    const state = stateWithPlayer({
      researchedTechs: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'],
    });
    expect(progressFor(state, 'antiquity', 'science')).toBeGreaterThanOrEqual(2);
  });

  it('library in every owned city → Antiquity Science tier 3 satisfied', () => {
    const c1 = cityWith({ id: 'c1', owner: 'p1', buildings: ['library'] });
    const c2 = cityWith({ id: 'c2', owner: 'p1', buildings: ['library', 'granary'] });
    const state = stateWithPlayer({ researchedTechs: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8'] }, [c1, c2]);
    // tier 1 (4 techs) + tier 2 (8 techs) + tier 3 (library in every city) all satisfied
    expect(progressFor(state, 'antiquity', 'science')).toBe(3);
  });

  it('library missing in one city → Antiquity Science tier 3 NOT satisfied', () => {
    const c1 = cityWith({ id: 'c1', owner: 'p1', buildings: ['library'] });
    const c2 = cityWith({ id: 'c2', owner: 'p1', buildings: [] });
    const state = stateWithPlayer({}, [c1, c2]);
    expect(progressFor(state, 'antiquity', 'science')).toBe(0);
  });

  it('totalGoldEarned thresholds drive Antiquity Economic tiers', () => {
    const s1 = stateWithPlayer({ totalGoldEarned: 250 });
    expect(progressFor(s1, 'antiquity', 'economic')).toBe(1);

    const s2 = stateWithPlayer({ totalGoldEarned: 600 });
    expect(progressFor(s2, 'antiquity', 'economic')).toBe(2);

    const s3 = stateWithPlayer({ totalGoldEarned: 1500 });
    expect(progressFor(s3, 'antiquity', 'economic')).toBe(3);
  });

  it('owned cities count drives Antiquity Military mid/final tiers', () => {
    const cities = Array.from({ length: 12 }, (_, i) => cityWith({ id: `c${i}`, owner: 'p1' }));
    const state = stateWithPlayer({ totalKills: 5 }, cities);
    // tier 1 (3 kills) + tier 2 (6 cities) + tier 3 (12 cities) all satisfied
    expect(progressFor(state, 'antiquity', 'military')).toBe(3);
  });

  it('Modern Science tier 1 requires flight tech', () => {
    const noFlight = stateWithPlayer({ researchedTechs: ['electricity', 'steam_power'] });
    expect(progressFor(noFlight, 'modern', 'science')).toBe(0);

    const withFlight = stateWithPlayer({ researchedTechs: ['flight'] });
    expect(progressFor(withFlight, 'modern', 'science')).toBe(1);
  });

  it('all 10 modern techs → Modern Science all 3 tiers satisfied', () => {
    const state = stateWithPlayer({
      researchedTechs: [
        'industrialization', 'scientific_theory', 'rifling',
        'steam_power', 'electricity', 'replaceable_parts',
        'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
      ],
    });
    expect(progressFor(state, 'modern', 'science')).toBe(3);
  });

  it('culture accumulation drives Exploration Culture tiers', () => {
    expect(progressFor(stateWithPlayer({ culture: 50 }), 'exploration', 'culture')).toBe(0);
    expect(progressFor(stateWithPlayer({ culture: 150 }), 'exploration', 'culture')).toBe(1);
    expect(progressFor(stateWithPlayer({ culture: 300 }), 'exploration', 'culture')).toBe(2);
    expect(progressFor(stateWithPlayer({ culture: 600 }), 'exploration', 'culture')).toBe(3);
  });

  it('only counts cities owned by the given player for library check', () => {
    const p1City = cityWith({ id: 'c1', owner: 'p1', buildings: ['library'] });
    const p2City = cityWith({ id: 'c2', owner: 'p2', buildings: [] });
    const p1 = createTestPlayer({ id: 'p1', researchedTechs: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] });
    const p2 = createTestPlayer({ id: 'p2', name: 'P2' });
    const state = createTestState({
      players: new Map([['p1', p1], ['p2', p2]]),
      cities: new Map([['c1', p1City], ['c2', p2City]]),
    });
    const out = scoreLegacyPaths('p1', state);
    const sci = out.find((e) => e.age === 'antiquity' && e.axis === 'science');
    // p1 has 8 techs (t1+t2) and library in its only city (t3) → all 3
    expect(sci?.tiersCompleted).toBe(3);
  });
});
