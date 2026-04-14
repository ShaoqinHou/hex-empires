import { describe, it, expect } from 'vitest';
import { victorySystem } from '../victorySystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState, DiplomacyRelation } from '../../types/GameState';
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

function makeAlliance(p1: string, p2: string): [string, DiplomacyRelation] {
  return [`${p1}:${p2}`, {
    status: 'helpful',
    relationship: 80,
    warSupport: 0,
    turnsAtPeace: 10,
    turnsAtWar: 0,
    hasAlliance: true,
    hasFriendship: true,
    hasDenounced: false,
    warDeclarer: null,
    isSurpriseWar: false,
    activeEndeavors: [],
    activeSanctions: [],
  }];
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

  it('detects science victory when all modern techs researched AND culture >= 100', () => {
    const modernTechs = [
      'industrialization', 'scientific_theory', 'rifling',
      'steam_power', 'electricity', 'replaceable_parts',
      'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
    ];
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: modernTechs, culture: 100 })],
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

  it('does not trigger science victory without culture >= 100', () => {
    const modernTechs = [
      'industrialization', 'scientific_theory', 'rifling',
      'steam_power', 'electricity', 'replaceable_parts',
      'flight', 'nuclear_fission', 'combined_arms', 'rocketry',
    ];
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: modernTechs, culture: 50 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, currentPlayerId: 'p2' });
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

  it('detects economic victory with gold, total gold, and alliance', () => {
    const [allianceKey, allianceRel] = makeAlliance('p1', 'p2');
    // Use 3 players so 1 alliance doesn't satisfy diplomacy (needs ceil(2*0.6) = 2 alliances)
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', gold: 500, totalGoldEarned: 1000 })],
      ['p2', createTestPlayer({ id: 'p2' })],
      ['p3', createTestPlayer({ id: 'p3' })],
    ]);
    // Give p2 and p3 cities so domination doesn't trigger
    const cities = new Map([
      ['c1', makeCity('c1', 'p2', { q: 5, r: 5 })],
      ['c2', makeCity('c2', 'p3', { q: 6, r: 6 })],
    ]);
    const state = createTestState({
      players,
      cities,
      currentPlayerId: 'p3',
      diplomacy: { relations: new Map([[allianceKey, allianceRel]]) },
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
    });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('economic');
  });

  it('does not trigger economic victory without alliance', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', gold: 500, totalGoldEarned: 1000 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })], // p1 has city
      ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })], // p2 has city — neither triggers domination
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });

  it('detects military victory with kills >= 20 and cities >= 5', () => {
    const cities = new Map([
      ['c1', makeCity('c1', 'p1', { q: 0, r: 0 })],
      ['c2', makeCity('c2', 'p1', { q: 1, r: 0 })],
      ['c3', makeCity('c3', 'p1', { q: 2, r: 0 })],
      ['c4', makeCity('c4', 'p1', { q: 3, r: 0 })],
      ['c5', makeCity('c5', 'p1', { q: 4, r: 0 })],
      ['c6', makeCity('c6', 'p2', { q: 8, r: 8 })], // p2 has a city so domination doesn't trigger
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', totalKills: 20 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2', age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } } });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('military');
  });

  it('does not trigger military victory without enough cities', () => {
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
    ]);
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', totalKills: 20 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2' });
    const next = victorySystem(state, { type: 'END_TURN' });
    // Should not be military victory (only 1 city)
    expect(next.victory.winType).not.toBe('military');
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
    expect(p1Progress!.length).toBe(7); // 7 victory types now
  });

  it('uses legacy-based score calculation', () => {
    const players = new Map([
      ['p1', createTestPlayer({
        id: 'p1',
        legacyPaths: { military: 3, economic: 2, science: 1, culture: 0 },
        legacyPoints: 5,
        culture: 100,
        researchedTechs: ['a', 'b', 'c'],
      })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', makeCity('c1', 'p1')],
      ['c2', makeCity('c2', 'p2', { q: 5, r: 5 })], // p2 has a city so domination doesn't trigger
    ]);
    const state = createTestState({ players, cities, currentPlayerId: 'p2', turn: 300 });
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
});
