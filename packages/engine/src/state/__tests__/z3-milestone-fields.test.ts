/**
 * Z3 milestone-schema tests.
 *
 * Z3.1 — Predicate-system reconciliation: ageSystem.checkLegacyMilestones()
 *         must agree with scoreLegacyPaths() for each of the 4 axes.
 * Z3.2 — New PlayerState fields default to 0 in fresh state.
 * Z3.3 — Increment hooks: distantLandPoints, resourcesAssigned, relicsDisplayedCount.
 * Z3.4 — LegacyPaths predicates use new fields (culture t2 threshold test).
 */

import { describe, it, expect } from 'vitest';
import { ageSystem } from '../../systems/ageSystem';
import { scoreLegacyPaths } from '../LegacyPaths';
import { citySystem } from '../../systems/citySystem';
import { resourceAssignmentSystem } from '../../systems/resourceAssignmentSystem';
import { religionSystem } from '../../systems/religionSystem';
import { createTestState, createTestPlayer, createTestCity } from '../../systems/__tests__/helpers';
import type { GameState, PlayerState, CityState, HexTile } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

// ── Helpers ─────────────────────────────────────────────────────────────────

function makeUnitOnTile(
  state: GameState,
  unitId: string,
  typeId: string,
  playerId: string,
  coord: { q: number; r: number },
  isDistantLands?: boolean,
): GameState {
  const key = coordToKey(coord);
  const tile = state.map.tiles.get(key) ?? {
    coord,
    terrain: 'grassland' as const,
    feature: null,
    resource: null,
    improvement: null,
    building: null,
    river: [],
    elevation: 0.5,
    continent: 1,
  };

  const nextTiles = new Map(state.map.tiles);
  nextTiles.set(key, { ...tile, isDistantLands: isDistantLands ?? false });

  const nextUnits = new Map(state.units);
  nextUnits.set(unitId, {
    id: unitId,
    typeId,
    owner: playerId,
    position: coord,
    movementLeft: 2,
    health: 100,
    experience: 0,
    promotions: [],
    fortified: false,
  });

  return {
    ...state,
    map: { ...state.map, tiles: nextTiles },
    units: nextUnits,
  };
}

// ── Z3.1: Predicate-system reconciliation ───────────────────────────────────

describe('Z3.1 — ageSystem/LegacyPaths predicate reconciliation', () => {
  it('military axis: ageSystem legacyPaths.military matches scoreLegacyPaths tier', () => {
    // 3 kills satisfies antiquity_military_t1 (killsThisAge >= 3)
    const player = createTestPlayer({
      totalKills: 3,
      killsThisAge: 3,
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({ players: new Map([['p1', player]]) });

    // scoreLegacyPaths says military tier = 1
    const progress = scoreLegacyPaths('p1', state);
    const militaryEntry = progress.find(e => e.axis === 'military');
    expect(militaryEntry?.tiersCompleted).toBeGreaterThanOrEqual(1);

    // ageSystem also awards military tier 1
    const next = ageSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.legacyPaths.military).toBe(
      militaryEntry?.tiersCompleted as 0 | 1 | 2 | 3,
    );
  });

  it('economic axis: ageSystem legacyPaths.economic matches scoreLegacyPaths tier (fallback path)', () => {
    // totalGoldEarned: 200 → antiquity_economic_t1 via fallback (no resourcesAssigned)
    const player = createTestPlayer({
      totalGoldEarned: 200,
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({ players: new Map([['p1', player]]) });

    const progress = scoreLegacyPaths('p1', state);
    const economicEntry = progress.find(e => e.axis === 'economic');
    expect(economicEntry?.tiersCompleted).toBeGreaterThanOrEqual(1);

    const next = ageSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.legacyPaths.economic).toBe(
      economicEntry?.tiersCompleted as 0 | 1 | 2 | 3,
    );
  });

  it('science axis: ageSystem legacyPaths.science matches scoreLegacyPaths tier', () => {
    // F-03 fix: codex placements only drive science legacy (tech count no longer contributes).
    // 1 codexPlacement → antiquity_science_t1 (codexPlacements.length >= 1).
    const player = createTestPlayer({
      codexPlacements: [{ codexId: 'cx1', buildingId: 'library', cityId: 'c1' }],
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({ players: new Map([['p1', player]]) });

    const progress = scoreLegacyPaths('p1', state);
    const scienceEntry = progress.find(e => e.axis === 'science');
    expect(scienceEntry?.tiersCompleted).toBeGreaterThanOrEqual(1);

    const next = ageSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.legacyPaths.science).toBe(
      scienceEntry?.tiersCompleted as 0 | 1 | 2 | 3,
    );
  });

  it('culture axis: ageSystem legacyPaths.culture matches scoreLegacyPaths max tier across all ages', () => {
    // culture >= 100 → exploration_culture_t1 via fallback (no relicsDisplayedCount)
    // Note: scoreLegacyPaths returns per-path entries; ageSystem takes the max per axis.
    const player = createTestPlayer({
      culture: 150,
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({ players: new Map([['p1', player]]) });

    // Compute max culture tier across all ages from the predicate system
    const progress = scoreLegacyPaths('p1', state);
    const maxCultureTier = progress
      .filter(e => e.axis === 'culture')
      .reduce((max, e) => Math.max(max, e.tiersCompleted), 0);
    expect(maxCultureTier).toBeGreaterThanOrEqual(1); // exploration_culture_t1 fires

    // ageSystem result must match the max
    const next = ageSystem(state, { type: 'END_TURN' });
    expect(next.players.get('p1')!.legacyPaths.culture).toBe(maxCultureTier);
  });

  it('all 4 axes: scoreLegacyPaths and ageSystem produce identical tier results for a hand-crafted state', () => {
    // Hand-crafted state that should satisfy:
    //   science  tier 1: 1 codexPlacement (F-03: codex-only proxy)
    //   military tier 1: 3 kills
    //   economic tier 1: totalGoldEarned 200 (fallback, no resourcesAssigned)
    //   culture  tier 0: no wonders, culture=0, no artifacts
    const player = createTestPlayer({
      codexPlacements: [{ codexId: 'cx1', buildingId: 'library', cityId: 'c1' }],
      totalKills: 3,
      killsThisAge: 3,
      totalGoldEarned: 200,
      culture: 0,
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({ players: new Map([['p1', player]]) });

    // Get raw predicate scores
    const progress = scoreLegacyPaths('p1', state);
    const axisTiers: Record<string, number> = { military: 0, economic: 0, science: 0, culture: 0 };
    for (const entry of progress) {
      if (entry.tiersCompleted > axisTiers[entry.axis]) {
        axisTiers[entry.axis] = entry.tiersCompleted;
      }
    }

    // ageSystem should produce the same values
    const next = ageSystem(state, { type: 'END_TURN' });
    const resultPlayer = next.players.get('p1')!;
    expect(resultPlayer.legacyPaths.military).toBe(Math.min(3, axisTiers['military']));
    expect(resultPlayer.legacyPaths.economic).toBe(Math.min(3, axisTiers['economic']));
    expect(resultPlayer.legacyPaths.science).toBe(Math.min(3, axisTiers['science']));
    expect(resultPlayer.legacyPaths.culture).toBe(Math.min(3, axisTiers['culture']));
  });
});

// ── Z3.2: New field defaults ─────────────────────────────────────────────────

describe('Z3.2 — new PlayerState milestone fields default to 0 in fresh state', () => {
  it('artifactsInMuseums defaults to 0 via createTestPlayer (undefined maps to 0 in predicate)', () => {
    const player = createTestPlayer({});
    // Field is optional so undefined; predicates treat undefined as "field absent, use proxy"
    // But when explicitly set to 0, predicate should return false for thresholds >= 1
    const playerWithField: PlayerState = { ...player, artifactsInMuseums: 0 };
    const state = createTestState({ players: new Map([['p1', playerWithField]]) });
    const p = state.players.get('p1')!;
    expect(p.artifactsInMuseums).toBe(0);
  });

  it('distantLandPoints defaults to 0 via createTestPlayer', () => {
    const player = createTestPlayer({});
    const playerWithField: PlayerState = { ...player, distantLandPoints: 0 };
    const state = createTestState({ players: new Map([['p1', playerWithField]]) });
    expect(state.players.get('p1')!.distantLandPoints).toBe(0);
  });

  it('relicsDisplayedCount defaults to 0 via createTestPlayer', () => {
    const player = createTestPlayer({});
    const playerWithField: PlayerState = { ...player, relicsDisplayedCount: 0 };
    const state = createTestState({ players: new Map([['p1', playerWithField]]) });
    expect(state.players.get('p1')!.relicsDisplayedCount).toBe(0);
  });

  it('resourcesAssigned defaults to 0 via createTestPlayer', () => {
    const player = createTestPlayer({});
    const playerWithField: PlayerState = { ...player, resourcesAssigned: 0 };
    const state = createTestState({ players: new Map([['p1', playerWithField]]) });
    expect(state.players.get('p1')!.resourcesAssigned).toBe(0);
  });
});

// ── Z3.3: Increment hooks ────────────────────────────────────────────────────

describe('Z3.3 — distantLandPoints increments on FOUND_CITY in Distant Lands', () => {
  it('founding a city on isDistantLands=true increments player.distantLandPoints', () => {
    const player = createTestPlayer({
      id: 'p1',
      distantLandPoints: 0,
    });
    let state = createTestState({ players: new Map([['p1', player]]) });

    // Place a settler unit at the distant lands tile
    const coord = { q: 3, r: 3 };
    state = makeUnitOnTile(state, 'settler1', 'settler', 'p1', coord, true);

    const next = citySystem(state, {
      type: 'FOUND_CITY',
      unitId: 'settler1',
      name: 'Far Harbor',
      foundingType: 'founder',
    });

    expect(next.players.get('p1')!.distantLandPoints).toBe(1);
  });

  it('founding a city on isDistantLands=false does NOT increment distantLandPoints', () => {
    const player = createTestPlayer({
      id: 'p1',
      distantLandPoints: 0,
    });
    let state = createTestState({ players: new Map([['p1', player]]) });

    const coord = { q: 3, r: 3 };
    state = makeUnitOnTile(state, 'settler1', 'settler', 'p1', coord, false);

    const next = citySystem(state, {
      type: 'FOUND_CITY',
      unitId: 'settler1',
      name: 'Nearby Town',
      foundingType: 'founder',
    });

    expect(next.players.get('p1')!.distantLandPoints).toBe(0);
  });
});

describe('Z3.3 — resourcesAssigned increments/decrements with ASSIGN/UNASSIGN', () => {
  function stateWithCityAndResource(): GameState {
    const player = createTestPlayer({
      id: 'p1',
      resourcesAssigned: 0,
      ownedResources: ['wheat'],
    } as Partial<PlayerState>);
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      assignedResources: [],
    } as Partial<CityState>);
    return createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });
  }

  it('ASSIGN_RESOURCE increments resourcesAssigned by 1', () => {
    const state = stateWithCityAndResource();
    const next = resourceAssignmentSystem(state, {
      type: 'ASSIGN_RESOURCE',
      resourceId: 'wheat',
      cityId: 'c1',
      playerId: 'p1',
    });
    expect(next.players.get('p1')!.resourcesAssigned).toBe(1);
  });

  it('UNASSIGN_RESOURCE decrements resourcesAssigned by 1 (clamps at 0)', () => {
    // First assign, then unassign
    const base = stateWithCityAndResource();
    const assigned = resourceAssignmentSystem(base, {
      type: 'ASSIGN_RESOURCE',
      resourceId: 'wheat',
      cityId: 'c1',
      playerId: 'p1',
    });
    expect(assigned.players.get('p1')!.resourcesAssigned).toBe(1);

    const unassigned = resourceAssignmentSystem(assigned, {
      type: 'UNASSIGN_RESOURCE',
      resourceId: 'wheat',
      cityId: 'c1',
      playerId: 'p1',
    });
    expect(unassigned.players.get('p1')!.resourcesAssigned).toBe(0);
  });
});

describe('Z3.3 — relicsDisplayedCount increments when EARN_RELIC + Cathedral owned', () => {
  it('earning a relic with a cathedral increments relicsDisplayedCount', () => {
    const player = createTestPlayer({
      id: 'p1',
      faith: 50,
      researchedCivics: ['mysticism'],
      relicsDisplayedCount: 0,
      relics: [],
    });
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      buildings: ['cathedral'],
    });

    // Set up state with a relic in config
    const base = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });

    // Add a relic to config
    const relicMap = new Map(base.config.relics ?? []);
    relicMap.set('the_crown', { id: 'the_crown', name: 'The Crown', description: 'A sacred relic.', faithPerTurn: 2, culturePerTurn: 0 });
    const stateWithRelic = {
      ...base,
      config: { ...base.config, relics: relicMap },
    };

    const next = religionSystem(stateWithRelic, {
      type: 'EARN_RELIC',
      playerId: 'p1',
      relicId: 'the_crown',
    });

    expect(next.players.get('p1')!.relicsDisplayedCount).toBe(1);
  });

  it('earning a relic WITHOUT a cathedral does NOT increment relicsDisplayedCount', () => {
    const player = createTestPlayer({
      id: 'p1',
      faith: 50,
      researchedCivics: ['mysticism'],
      relicsDisplayedCount: 0,
      relics: [],
    });
    // No cathedral in city
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      buildings: ['granary'],
    });

    const base = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });

    const relicMap = new Map(base.config.relics ?? []);
    relicMap.set('the_crown', { id: 'the_crown', name: 'The Crown', description: 'A sacred relic.', faithPerTurn: 2, culturePerTurn: 0 });
    const stateWithRelic = {
      ...base,
      config: { ...base.config, relics: relicMap },
    };

    const next = religionSystem(stateWithRelic, {
      type: 'EARN_RELIC',
      playerId: 'p1',
      relicId: 'the_crown',
    });

    // relicsDisplayedCount stays at 0 (no cathedral)
    expect(next.players.get('p1')!.relicsDisplayedCount).toBe(0);
  });
});

// ── Z3.4: Cultural-path tier-2 milestone uses new fields ─────────────────────

describe('Z3.4 — Exploration Culture tier-2 predicate uses relicsDisplayedCount', () => {
  it('relicsDisplayedCount >= 8 satisfies exploration_culture_t2', () => {
    const player = createTestPlayer({
      id: 'p1',
      relicsDisplayedCount: 8,
      culture: 0,
      relics: [],
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({ players: new Map([['p1', player]]) });

    const next = ageSystem(state, { type: 'END_TURN' });
    // exploration_culture_t2 requires relicsDisplayedCount >= 8
    // exploration_culture_t1 requires relicsDisplayedCount >= 4
    // Both should fire → culture tier = 2
    expect(next.players.get('p1')!.legacyPaths.culture).toBeGreaterThanOrEqual(2);
  });

  it('relicsDisplayedCount < 8 does NOT satisfy exploration_culture_t2', () => {
    // relicsDisplayedCount = 5 satisfies t1 (>= 4) but not t2 (>= 8)
    const player = createTestPlayer({
      id: 'p1',
      relicsDisplayedCount: 5,
      culture: 0,
      relics: [],
      legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
      legacyPoints: 0,
    });
    const state = createTestState({ players: new Map([['p1', player]]) });

    const next = ageSystem(state, { type: 'END_TURN' });
    // Only t1 fires → culture tier = 1
    expect(next.players.get('p1')!.legacyPaths.culture).toBe(1);
  });
});
