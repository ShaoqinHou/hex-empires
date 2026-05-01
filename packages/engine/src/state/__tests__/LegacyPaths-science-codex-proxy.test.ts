import { describe, it, expect } from 'vitest';
import { scoreLegacyPaths } from '../LegacyPaths';
import { createTestState, createTestPlayer } from '../../systems/__tests__/helpers';
import type { CodexState } from '../../types/GameState';

/**
 * II3.2 (tech-tree F-09): Science legacy uses Codex count, not techs-count proxy.
 *
 * Verifies:
 *  - Tech count alone does NOT satisfy antiquity/exploration science tiers.
 *  - Placed codices (state.codices path) satisfy science tiers correctly.
 *  - codexPlacements fallback (for pre-AA5.1 saves) satisfies tiers by count.
 */
describe('LegacyPaths — science legacy uses Codex count (F-09)', () => {
  function progressFor(
    state: Parameters<typeof scoreLegacyPaths>[1],
    age: string,
    axis: string,
  ): number {
    const results = scoreLegacyPaths('p1', state);
    const entry = results.find((e) => e.age === age && e.axis === axis);
    return entry?.tiersCompleted ?? 0;
  }

  function makeCodex(id: string, cityId: string): CodexState {
    return {
      id,
      playerId: 'p1',
      cityId,
      buildingId: 'library',
      addedTurn: 1,
      placedInCityId: cityId,
      placedInBuildingId: 'library',
    };
  }

  // ── Primary path: state.codices ─────────────────────────────────────────────

  it('5 techs researched, no codices → antiquity science tier 0 (techs do not count)', () => {
    const player = createTestPlayer({
      researchedTechs: ['pottery', 'mining', 'animal_husbandry', 'irrigation', 'sailing'],
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    expect(progressFor(state, 'antiquity', 'science')).toBe(0);
  });

  it('10 techs researched, no codices → exploration science tier 0', () => {
    const player = createTestPlayer({
      researchedTechs: ['t1', 't2', 't3', 't4', 't5', 't6', 't7', 't8', 't9', 't10'],
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    expect(progressFor(state, 'exploration', 'science')).toBe(0);
  });

  it('1 placed codex (state.codices) → antiquity science tier 1', () => {
    const player = createTestPlayer({ researchedTechs: [] });
    const baseState = createTestState({ players: new Map([['p1', player]]) });
    const state = {
      ...baseState,
      codices: new Map([['cx1', makeCodex('cx1', 'c1')]]),
    };
    expect(progressFor(state, 'antiquity', 'science')).toBe(1);
  });

  it('3 placed codices (state.codices) → antiquity science tier 2', () => {
    const player = createTestPlayer({ researchedTechs: [] });
    const baseState = createTestState({ players: new Map([['p1', player]]) });
    const state = {
      ...baseState,
      codices: new Map([
        ['cx1', makeCodex('cx1', 'c1')],
        ['cx2', makeCodex('cx2', 'c1')],
        ['cx3', makeCodex('cx3', 'c1')],
      ]),
    };
    expect(progressFor(state, 'antiquity', 'science')).toBe(2);
  });

  it('6 placed codices (state.codices) → antiquity science tier 3', () => {
    const player = createTestPlayer({ researchedTechs: [] });
    const baseState = createTestState({ players: new Map([['p1', player]]) });
    const codices = new Map<string, CodexState>();
    for (let i = 1; i <= 6; i++) {
      codices.set(`cx${i}`, makeCodex(`cx${i}`, 'c1'));
    }
    const state = { ...baseState, codices };
    expect(progressFor(state, 'antiquity', 'science')).toBe(3);
  });

  it('unplaced codex (no placedInCityId) does NOT count toward science tier', () => {
    const player = createTestPlayer({ researchedTechs: [] });
    const baseState = createTestState({ players: new Map([['p1', player]]) });
    // Codex without placedInCityId = unplaced
    const unplacedCodex: CodexState = {
      id: 'cx-unplaced',
      playerId: 'p1',
      cityId: 'c1',
      buildingId: 'library',
      addedTurn: 1,
      // No placedInCityId — unplaced
    };
    const state = {
      ...baseState,
      codices: new Map([['cx-unplaced', unplacedCodex]]),
    };
    expect(progressFor(state, 'antiquity', 'science')).toBe(0);
  });

  // ── Fallback path: player.codexPlacements (no state.codices) ────────────────

  it('0 codexPlacements, 5 techs → antiquity science tier 0 (techs do not count)', () => {
    const player = createTestPlayer({
      researchedTechs: ['t1', 't2', 't3', 't4', 't5'],
      codexPlacements: [],
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    // No state.codices → falls through to scienceLegacyScore (codexPlacements.length only)
    expect(progressFor(state, 'antiquity', 'science')).toBe(0);
  });

  it('1 codexPlacement (fallback, no state.codices) → antiquity science tier 1', () => {
    const player = createTestPlayer({
      codexPlacements: [{ codexId: 'cx1', buildingId: 'library', cityId: 'c1' }],
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    expect(progressFor(state, 'antiquity', 'science')).toBe(1);
  });

  it('3 codexPlacements (fallback) → antiquity science tier 2', () => {
    const player = createTestPlayer({
      codexPlacements: [
        { codexId: 'cx1', buildingId: 'library', cityId: 'c1' },
        { codexId: 'cx2', buildingId: 'library', cityId: 'c1' },
        { codexId: 'cx3', buildingId: 'library', cityId: 'c1' },
      ],
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    expect(progressFor(state, 'antiquity', 'science')).toBe(2);
  });

  it('6 codexPlacements (fallback) → antiquity science tier 3', () => {
    const player = createTestPlayer({
      codexPlacements: [
        { codexId: 'cx1', buildingId: 'library', cityId: 'c1' },
        { codexId: 'cx2', buildingId: 'library', cityId: 'c1' },
        { codexId: 'cx3', buildingId: 'library', cityId: 'c1' },
        { codexId: 'cx4', buildingId: 'library', cityId: 'c1' },
        { codexId: 'cx5', buildingId: 'library', cityId: 'c1' },
        { codexId: 'cx6', buildingId: 'library', cityId: 'c1' },
      ],
    });
    const state = createTestState({ players: new Map([['p1', player]]) });
    expect(progressFor(state, 'antiquity', 'science')).toBe(3);
  });

  // ── Exploration science codex path ───────────────────────────────────────────

  it('2 placed codices (state.codices) → exploration science tier 1', () => {
    const player = createTestPlayer({ researchedTechs: [], age: 'exploration' });
    const baseState = createTestState({ players: new Map([['p1', player]]) });
    const state = {
      ...baseState,
      codices: new Map([
        ['cx1', makeCodex('cx1', 'c1')],
        ['cx2', makeCodex('cx2', 'c1')],
      ]),
    };
    expect(progressFor(state, 'exploration', 'science')).toBe(1);
  });
});
