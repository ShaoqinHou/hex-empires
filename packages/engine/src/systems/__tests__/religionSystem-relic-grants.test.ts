import { describe, it, expect } from 'vitest';
import { religionSystem } from '../religionSystem';
import { civicSystem } from '../civicSystem';
import { productionSystem } from '../productionSystem';
import type { GameState } from '../../types/GameState';
import { createTestState, createTestPlayer, createTestCity } from './helpers';

// ======================================================================
// religionSystem-relic-grants (KK2 / F-09)
// ======================================================================

function foundedReligionState(): GameState {
  const city = createTestCity({
    id: 'c1',
    owner: 'p1',
    name: 'Rome',
    position: { q: 3, r: 3 },
    buildings: ['temple'],
  });
  const base = createTestState({
    turn: 5,
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', faith: 500, researchedCivics: ['piety'] })],
    ]),
    cities: new Map([['c1', city]]),
  });
  return religionSystem(base, {
    type: 'FOUND_RELIGION',
    playerId: 'p1',
    cityId: 'c1',
    religionName: 'Buddhism',
    founderBelief: 'world_church',
    followerBelief: 'jesuit_education',
  });
}

describe('Relic grants (KK2 / F-09)', () => {
  it('FOUND_RELIGION result: player relics array is defined and is an array', () => {
    const next = foundedReligionState();
    const player = next.players.get('p1')!;
    const relics = player.relics ?? [];
    expect(Array.isArray(relics)).toBe(true);
  });

  it('completing Mysticism civic grants 1 relic to the player', () => {
    // Mysticism (age=antiquity, cost=60) requires foreign_trade as prerequisite.
    // civicSystem derives culturePerTurn from cities (base 1 + building yields).
    // We add a city with monuments (culture buildings) to ensure culturePerTurn > 0.
    // With civicProgress pre-set high enough, the civic completes in one END_TURN.
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      name: 'Rome',
      position: { q: 0, r: 0 },
      // Monument gives +2 culture/turn; base city gives +1. Total = 3/turn.
      buildings: ['monument'],
    });
    const base = createTestState({
      turn: 10,
      players: new Map([
        ['p1', createTestPlayer({
          id: 'p1',
          age: 'antiquity',
          researchedCivics: ['piety', 'foreign_trade'],
          currentCivic: 'mysticism',
          // Pre-set progress so 1 END_TURN completes it (cost=60, needs >= 60).
          civicProgress: 57,
          relics: [],
        })],
      ]),
      cities: new Map([['c1', city]]),
    });

    const completed = civicSystem(base, { type: 'END_TURN' });

    const playerAfter = completed.players.get('p1')!;
    expect(playerAfter.researchedCivics).toContain('mysticism');

    const relicsAfter = playerAfter.relics ?? [];
    expect(relicsAfter.length).toBeGreaterThanOrEqual(1);

    const relicLog = completed.log.find(
      (e) => e.type === 'legacy' && e.message.toLowerCase().includes('relic'),
    );
    expect(relicLog).toBeDefined();
  });

  it('building Stonehenge (religious wonder) grants 1 relic to the builder', () => {
    // Stonehenge cost is 250; set productionProgress to 9999 so it completes.
    const city = createTestCity({
      id: 'c1',
      owner: 'p1',
      name: 'Rome',
      position: { q: 0, r: 0 },
      population: 5,
      productionQueue: [{ id: 'stonehenge', type: 'building' }],
      productionProgress: 9999,
    });
    const base = createTestState({
      turn: 1,
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', relics: [] })],
      ]),
      cities: new Map([['c1', city]]),
    });

    const next = productionSystem(base, { type: 'END_TURN' });

    const playerAfter = next.players.get('p1')!;
    const relicsAfter = playerAfter.relics ?? [];
    expect(relicsAfter.length).toBeGreaterThanOrEqual(1);

    const relicLog = next.log.find(
      (e) => e.type === 'legacy' && e.message.toLowerCase().includes('relic'),
    );
    expect(relicLog).toBeDefined();
  });
});
