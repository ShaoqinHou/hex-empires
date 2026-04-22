import { describe, it, expect } from 'vitest';
import { victorySystem } from '../victorySystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState, UnitState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

function makeCity(id: string, owner: string, position = { q: 0, r: 0 }): CityState {
  return {
    id, name: id, owner, position,
    population: 1, food: 0, productionQueue: [], productionProgress: 0,
    buildings: [], territory: [coordToKey(position)],
    settlementType: 'city', happiness: 10, isCapital: false, defenseHP: 100,
    specialization: null, specialists: 0,
    districts: [],
  };
}

function makeUnit(id: string, owner: string, position = { q: 0, r: 0 }): UnitState {
  return {
    id, typeId: 'warrior', owner, position,
    movementLeft: 2, health: 100, experience: 0,
    promotions: [], fortified: false,
  };
}

describe('victorySystem', () => {
  it('detects domination victory when opponent has no cities or units', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
    ]);
    // p2 is last player, check at end of their turn
    const state = createTestState({ players, cities, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('domination');
  });

  it('does not trigger domination when opponent has cities', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
      ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });

  it('triggers domination when opponent has only units (no cities) — W2-08 F-05', () => {
    // A player stripped of all cities is eliminated even if stray units remain.
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')], // p1 has a city; p2 has none
    ]);
    const units = new Map([
      ['u1', makeUnit('u1', 'p2', { q: 3, r: 3 })], // p2 only has units — not alive
    ]);
    const state = createTestState({ players, cities, units, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('domination');
  });

  it('detects science victory when all modern techs researched (culture gate removed — W2-08 F-04)', () => {
    // The invented culture >= 100 gate is removed; techs alone are sufficient.
    const modernTechs = [
      'industrialization', 'scientific_theory', 'rifling',
      'steam_power', 'electricity', 'replaceable_parts',
      'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
    ];
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: modernTechs, culture: 0 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, currentPlayerId: 'p2', age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } } });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('science');
  });

  it('does not trigger science victory outside modern age', () => {
    const modernTechs = [
      'industrialization', 'scientific_theory', 'rifling',
      'steam_power', 'electricity', 'replaceable_parts',
      'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
    ];
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: modernTechs, culture: 100 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
      ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2', age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } } });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });

  it('does not trigger science victory outside modern age (culture is irrelevant — W2-08 F-04)', () => {
    // culture gate is removed; the only guards are: techs complete + modern age
    const modernTechs = [
      'industrialization', 'scientific_theory', 'rifling',
      'steam_power', 'electricity', 'replaceable_parts',
      'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
    ];
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: modernTechs, culture: 0 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
      ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2', age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } } });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });

  it('detects culture victory when culture >= 300 AND civics >= 5', () => {
    const players = new Map([
      ['p1', createTestPlayer({
        id: 'p1',
        culture: 300,
        researchedCivics: ['a', 'b', 'c', 'd', 'e'],
      })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, currentPlayerId: 'p2', age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } } });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('culture');
  });

  it('does not trigger culture victory without enough civics', () => {
    const players = new Map([
      ['p1', createTestPlayer({
        id: 'p1',
        culture: 500,
        researchedCivics: ['a', 'b'],
      })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });

  it('detects economic victory with gold and totalGoldEarned (alliance gate removed — W2-08 F-01)', () => {
    // The invented alliance >= 1 gate is removed; gold thresholds alone are sufficient.
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', gold: 500, totalGoldEarned: 1000 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p2', { q: 5, r: 5 })], // p2 has city so domination doesn't trigger
    ]);
    const state = createTestState({
      players,
      cities,
      currentPlayerId: 'p2',
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('economic');
  });

  it('does not trigger economic victory without enough gold', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', gold: 100, totalGoldEarned: 200 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
      ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2', age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } } });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });

  // W5-01: Military victory now requires Operation Ivy project chain, NOT kills+cities scaffold
  it('detects military victory when operation_ivy project is completed (W5-01)', () => {
    const cities = new Map([
      ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
      ['c2', makeCity('c2', 'p2', { q: 8, r: 8 })], // p2 has a city so domination doesn't trigger
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', completedProjects: ['manhattan_project', 'operation_ivy'] })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2', age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } } });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('military');
  });

  it('does not trigger military victory with kills >= 20 and cities >= 5 (W5-01: project chain required)', () => {
    // Scaffold proxy no longer fires military victory — only operation_ivy does.
    const cities = new Map([
      ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
      ['c2', makeCity('c2', 'p1', { q: 1, r: 0 })],
      ['c3', makeCity('c3', 'p1', { q: 2, r: 0 })],
      ['c4', makeCity('c4', 'p1', { q: 3, r: 0 })],
      ['c5', makeCity('c5', 'p1', { q: 4, r: 0 })],
      ['c6', makeCity('c6', 'p2', { q: 8, r: 8 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', totalKills: 20 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2', age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } } });
    const next = victorySystem(state, { type: 'END_TURN' });
    // kills+cities alone do NOT fire military victory in W5-01; only operation_ivy does
    expect(next.victory.winner).toBeNull();
  });

  it('does not trigger military victory with operation_ivy but outside modern age', () => {
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
      ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', completedProjects: ['manhattan_project', 'operation_ivy'] })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2', age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } } });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });

  it('tracks progress for all victory types', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', culture: 100 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    const p1Progress = next.victory.progress.get('p1');
    expect(p1Progress).toBeDefined();
    expect(p1Progress!.length).toBe(6); // 6 victory types (diplomacy removed)
  });

  it('uses legacy-based score calculation', () => {
    const players = new Map([
      ['p1', createTestPlayer({
        id: 'p1',
        legacyPaths: { military: 3, economic: 2, science: 1, culture: 0 },
        legacyPoints: 5,
        culture: 100,
        researchedTechs: ['a', 'b', 'c'],
        ageProgress: 100, // F-06: age progress at modern threshold
      })],
      ['p2', createTestPlayer({ id: 'p2', ageProgress: 100 })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
      ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })], // p2 has a city so domination doesn't trigger
    ]);
    const state = createTestState({
      players,
      cities,
      currentPlayerId: 'p2',
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = victorySystem(state, { type: 'END_TURN' });
    // p1 score: milestones(6)*100 + legacyPoints(5)*50 + cities(1)*100 + techs(3)*20 + culture(100)
    //         = 600 + 250 + 100 + 60 + 100 = 1110
    // p2 score: milestones(0) + legacyPoints(0) + cities(1)*100 + techs(0) + culture(0) = 100
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('score');
  });

  it('ignores non-END_TURN actions', () => {
    const state = createTestState();
    expect(victorySystem(state, { type: 'START_TURN' })).toBe(state);
  });

  it('does not overwrite existing winner', () => {
    const state = createTestState({
      victory: { winner: 'p1', winType: 'domination', progress: new Map() },
      currentPlayerId: 'p1',
    });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
  });

  // ── M18: LegacyPath progress enrichment ─────────────────────────────────
  describe('legacyProgress enrichment (M18)', () => {
    it('attaches legacyProgress after END_TURN recomputation', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      // Give each player a city so domination does not trigger
      const cities = new Map([
        ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
        ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
      ]);
      const state = createTestState({ players, cities, currentPlayerId: 'p2' });
      const next = victorySystem(state, { type: 'END_TURN' });
      expect(next.victory.legacyProgress).toBeDefined();
      expect(next.victory.legacyProgress!.size).toBe(2);
      expect(next.victory.legacyProgress!.has('p1')).toBe(true);
      expect(next.victory.legacyProgress!.has('p2')).toBe(true);
    });

    it('each player has 12 legacy progress entries (4 axes × 3 ages)', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const cities = new Map([
        ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
        ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
      ]);
      const state = createTestState({ players, cities, currentPlayerId: 'p2' });
      const next = victorySystem(state, { type: 'END_TURN' });
      const p1Entries = next.victory.legacyProgress!.get('p1')!;
      const p2Entries = next.victory.legacyProgress!.get('p2')!;
      expect(p1Entries.length).toBe(12);
      expect(p2Entries.length).toBe(12);

      // Confirm the shape: every axis/age combo present exactly once
      const axes = ['science', 'culture', 'military', 'economic'] as const;
      const ages = ['antiquity', 'exploration', 'modern'] as const;
      for (const axis of axes) {
        for (const age of ages) {
          const match = p1Entries.filter(e => e.axis === axis && e.age === age);
          expect(match.length).toBe(1);
        }
      }
    });

    it('fresh player (0 techs, 0 kills, 0 gold, 0 wonders) has tiersCompleted === 0 on every path', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const cities = new Map([
        ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
        ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
      ]);
      const state = createTestState({ players, cities, currentPlayerId: 'p2' });
      const next = victorySystem(state, { type: 'END_TURN' });
      const entries = next.victory.legacyProgress!.get('p1')!;
      for (const entry of entries) {
        expect(entry.tiersCompleted).toBe(0);
      }
    });

    it('player with 4+ researched techs has tiersCompleted >= 1 on Antiquity Science axis', () => {
      const players = new Map([
        ['p1', createTestPlayer({
          id: 'p1',
          researchedTechs: ['pottery', 'writing', 'bronze_working', 'mining'],
        })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const cities = new Map([
        ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
        ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
      ]);
      const state = createTestState({ players, cities, currentPlayerId: 'p2' });
      const next = victorySystem(state, { type: 'END_TURN' });
      const entries = next.victory.legacyProgress!.get('p1')!;
      const antiquityScience = entries.find(e => e.axis === 'science' && e.age === 'antiquity')!;
      expect(antiquityScience.tiersCompleted).toBeGreaterThanOrEqual(1);
    });

    it('does not recompute legacyProgress on non-END_TURN actions', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
      ]);
      const state = createTestState({ players, currentPlayerId: 'p1' });
      const next = victorySystem(state, { type: 'START_TURN' });
      // Non-END_TURN returns state unchanged — legacyProgress remains unset
      expect(next).toBe(state);
      expect(next.victory.legacyProgress).toBeUndefined();
    });

    it('does not recompute legacyProgress when winner already set', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const state = createTestState({
        players,
        currentPlayerId: 'p2',
        victory: { winner: 'p1', winType: 'domination', progress: new Map() },
      });
      const next = victorySystem(state, { type: 'END_TURN' });
      // Existing-winner early-return path: legacyProgress must remain unset
      expect(next.victory.legacyProgress).toBeUndefined();
    });
  });

  // ── F-11: Simultaneous victory tiebreak ────────────────────────────────────
  describe('F-11: simultaneous victory tiebreak', () => {
    it('resolves tie by highest totalCareerLegacyPoints', () => {
      // Both p1 and p2 can achieve domination (the other has no cities).
      // Give both a city each so neither dominates the other, then use score victory.
      // Actually: set up so both achieve culture victory simultaneously.
      const players = new Map([
        ['p1', createTestPlayer({
          id: 'p1',
          culture: 300,
          researchedCivics: ['a', 'b', 'c', 'd', 'e'],
          totalCareerLegacyPoints: 100,
        })],
        ['p2', createTestPlayer({
          id: 'p2',
          culture: 300,
          researchedCivics: ['a', 'b', 'c', 'd', 'e'],
          totalCareerLegacyPoints: 50,
        })],
      ]);
      // Both have cities so domination doesn't trigger
      const cities = new Map([
        ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
        ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
      ]);
      const state = createTestState({
        players,
        cities,
        currentPlayerId: 'p2',
        age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = victorySystem(state, { type: 'END_TURN' });
      // p1 has higher career legacy → p1 wins
      expect(next.victory.winner).toBe('p1');
      expect(next.victory.winType).toBe('culture');
      expect(next.victory.tied).toBe(true);
    });

    it('falls back to insertion order when totalCareerLegacyPoints are equal', () => {
      const players = new Map([
        ['p1', createTestPlayer({
          id: 'p1',
          culture: 300,
          researchedCivics: ['a', 'b', 'c', 'd', 'e'],
          totalCareerLegacyPoints: 50,
        })],
        ['p2', createTestPlayer({
          id: 'p2',
          culture: 300,
          researchedCivics: ['a', 'b', 'c', 'd', 'e'],
          totalCareerLegacyPoints: 50,
        })],
      ]);
      const cities = new Map([
        ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
        ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })],
      ]);
      const state = createTestState({
        players,
        cities,
        currentPlayerId: 'p2',
        age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
      });
      const next = victorySystem(state, { type: 'END_TURN' });
      // Insertion order: p1 was iterated first → p1 wins
      expect(next.victory.winner).toBe('p1');
      expect(next.victory.tied).toBe(true);
    });

    it('single winner does not set tied flag', () => {
      const players = new Map([
        ['p1', createTestPlayer({ id: 'p1' })],
        ['p2', createTestPlayer({ id: 'p2' })],
      ]);
      const cities = new Map([
        ['c1', makeCity('c1', 'p1')],
      ]);
      const state = createTestState({ players, cities, currentPlayerId: 'p2' });
      const next = victorySystem(state, { type: 'END_TURN' });
      expect(next.victory.winner).toBe('p1');
      expect(next.victory.tied).toBeFalsy();
    });
  });
});
