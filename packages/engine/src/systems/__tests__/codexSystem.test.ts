/**
 * AA5.1: Codex skeleton tests
 * - Researching a tech with a library generates 1 CodexState in state.codices
 * - Scientific legacy predicates use codicesCount when state.codices is present
 */

import { describe, it, expect } from 'vitest';
import { researchSystem } from '../researchSystem';
import { createTestState, createTestPlayer, createTestCity } from './helpers';
import { scoreLegacyPaths } from '../../state/LegacyPaths';

describe('AA5.1: Codex generation on tech research', () => {
  it('generates 1 codex when player researches a tech and has a library', () => {
    // Build a state where the player has pottery researching (cost 25)
    // and a city with a library
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      buildings: ['library'],
      population: 3,
    });
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      currentResearch: 'pottery',
      researchProgress: 24, // one science away from completion
      science: 0,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });

    // END_TURN accumulates science — min 1 — so progress goes 24 + 1 = 25 >= 25
    const next = researchSystem(state, { type: 'END_TURN' });

    // Tech should be completed
    expect(next.players.get('p1')!.researchedTechs).toContain('pottery');
    expect(next.players.get('p1')!.currentResearch).toBeNull();

    // Codex should be generated
    const codices = next.codices;
    expect(codices).toBeDefined();
    expect(codices!.size).toBe(1);

    const codex = [...codices!.values()][0];
    expect(codex.playerId).toBe('p1');
    expect(codex.cityId).toBe('c1');
    expect(codex.buildingId).toBe('library');
    expect(codex.addedTurn).toBe(1);
  });

  it('generates 1 codex when player has a museum (not just library)', () => {
    const city = createTestCity({
      id: 'c2',
      owner: 'p1',
      buildings: ['museum'],
      population: 3,
    });
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      currentResearch: 'pottery',
      researchProgress: 24,
      science: 0,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c2', city]]),
    });

    const next = researchSystem(state, { type: 'END_TURN' });

    const codices = next.codices;
    expect(codices).toBeDefined();
    expect(codices!.size).toBe(1);
    const codex = [...codices!.values()][0];
    expect(codex.buildingId).toBe('museum');
  });

  it('does NOT generate a codex when player has no library or museum', () => {
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      buildings: ['granary'], // no library/museum
      population: 3,
    });
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      currentResearch: 'pottery',
      researchProgress: 24,
      science: 0,
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });

    const next = researchSystem(state, { type: 'END_TURN' });

    // Tech completes but no codex
    expect(next.players.get('p1')!.researchedTechs).toContain('pottery');
    const codices = next.codices;
    expect(!codices || codices.size === 0).toBe(true);
  });
});

describe('BB5.4: Antiquity science legacy predicate uses placedCodicesCount', () => {
  it('tier 1 satisfied with 1 PLACED codex when state.codices is present', () => {
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
    });
    // Manually inject state.codices with 1 PLACED codex for player p1
    const codex = {
      id: 'codex-pottery-p1-1',
      playerId: 'p1',
      cityId: 'c1',
      buildingId: 'library',
      addedTurn: 1,
      placedInCityId: 'c1',        // BB5.4: must be placed
      placedInBuildingId: 'library',
    };
    const state = createTestState({
      players: new Map([['p1', player]]),
      codices: new Map([['codex-pottery-p1-1', codex]]),
    });

    const progress = scoreLegacyPaths('p1', state);
    const antiquityScience = progress.find(
      (p) => p.age === 'antiquity' && p.axis === 'science',
    );
    expect(antiquityScience).toBeDefined();
    expect(antiquityScience!.tiersCompleted).toBeGreaterThanOrEqual(1);
  });

  it('tier 1 NOT satisfied with 1 UNPLACED codex when state.codices is present', () => {
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
    });
    // Codex earned but not placed (no placedInCityId)
    const codex = {
      id: 'codex-pottery-p1-1',
      playerId: 'p1',
      cityId: 'c1',
      buildingId: 'library',
      addedTurn: 1,
      // placedInCityId intentionally absent
    };
    const state = createTestState({
      players: new Map([['p1', player]]),
      codices: new Map([['codex-pottery-p1-1', codex]]),
    });

    const progress = scoreLegacyPaths('p1', state);
    const antiquityScience = progress.find(
      (p) => p.age === 'antiquity' && p.axis === 'science',
    );
    expect(antiquityScience!.tiersCompleted).toBe(0);
  });

  it('tier 1 NOT satisfied with 0 codices when state.codices is present', () => {
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      researchedTechs: ['pottery', 'animal_husbandry', 'mining'], // 3 techs, score=3 < 4
    });
    // state.codices is present but empty
    const state = createTestState({
      players: new Map([['p1', player]]),
      codices: new Map(), // present but empty
    });

    const progress = scoreLegacyPaths('p1', state);
    const antiquityScience = progress.find(
      (p) => p.age === 'antiquity' && p.axis === 'science',
    );
    expect(antiquityScience!.tiersCompleted).toBe(0);
  });
});
