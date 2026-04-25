import { describe, it, expect } from 'vitest';
import { religionSystem } from '../religionSystem';
import type { GameState, UnitState } from '../../types/GameState';
import { createTestState, createTestPlayer, createTestUnit, createTestCity } from './helpers';
import { ALL_RELICS } from '../../data/relics';
import { victorySystem } from '../victorySystem';
import { scoreLegacyPaths } from '../../state/LegacyPaths';

// -- Missionary helpers --

function createMissionary(overrides: Partial<UnitState> = {}): UnitState {
  return createTestUnit({
    id: 'm1',
    typeId: 'missionary',
    owner: 'p1',
    position: { q: 3, r: 3 },
    movementLeft: 2,
    spreadsRemaining: 3,
    ...overrides,
  });
}

function foundReligionState(): {
  state: GameState;
  religionId: string;
} {
  // X4.3: Piety civic + Temple building required to found a religion
  const city = createTestCity({ id: 'c1', owner: 'p1', name: 'Rome', position: { q: 3, r: 3 }, buildings: ['temple'] });
  const base = createTestState({
    turn: 5,
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1', faith: 500, researchedCivics: ['piety'] })],
    ]),
    cities: new Map([['c1', city]]),
  });
  const religionState = religionSystem(base, {
    type: 'FOUND_RELIGION',
    playerId: 'p1',
    cityId: 'c1',
    religionName: 'Buddhism',
    founderBelief: 'world_church',
    followerBelief: 'jesuit_education',
  });
  return {
    state: religionState,
    religionId: religionState.religion!.religions[0].id,
  };
}

function withRelics(state: GameState, relicIds: ReadonlyArray<string>): GameState {
  const player = state.players.get('p1')!;
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set('p1', { ...player, relics: relicIds });
  return { ...state, players: updatedPlayers };
}

// ======================================================================
// Missionary tests (3)
// ======================================================================

describe('SPREAD_RELIGION - missionary system (F-08)', () => {
  it('spreads religion to an adjacent city and decrements spread charges', () => {
    const { state, religionId } = foundReligionState();
    const missionary = createMissionary({ position: { q: 3, r: 2 } });
    const stateWithUnit = { ...state, units: new Map([['m1', missionary]]) };

    const next = religionSystem(stateWithUnit, {
      type: 'SPREAD_RELIGION',
      unitId: 'm1',
      targetCityId: 'c1',
    });

    expect(next.cities.get('c1')!.religionId).toBe(religionId);
    expect(next.units.get('m1')!.spreadsRemaining).toBe(2);
    const lastEvent = next.log[next.log.length - 1];
    expect(lastEvent.type).toBe('legacy');
    expect(lastEvent.message).toContain('Buddhism');
    expect(lastEvent.message).toContain('Rome');
  });

  it('rejects spread when unit is out of range (distance > 1)', () => {
    const { state } = foundReligionState();
    const missionary = createMissionary({ position: { q: 10, r: 10 } });
    const stateWithUnit = { ...state, units: new Map([['m1', missionary]]) };

    const next = religionSystem(stateWithUnit, {
      type: 'SPREAD_RELIGION',
      unitId: 'm1',
      targetCityId: 'c1',
    });

    expect(next).toBe(stateWithUnit);
    expect(next.cities.get('c1')!.religionId).toBeUndefined();
  });

  it('rejects spread when unit has zero charges remaining', () => {
    const { state } = foundReligionState();
    const missionary = createMissionary({ position: { q: 3, r: 2 }, spreadsRemaining: 0 });
    const stateWithUnit = { ...state, units: new Map([['m1', missionary]]) };

    const next = religionSystem(stateWithUnit, {
      type: 'SPREAD_RELIGION',
      unitId: 'm1',
      targetCityId: 'c1',
    });

    expect(next).toBe(stateWithUnit);
    expect(next.cities.get('c1')!.religionId).toBeUndefined();
  });
});

// ======================================================================
// Relic tests (3)
// ======================================================================

describe('Relic subsystem (F-09)', () => {
  it('ALL_RELICS contains exactly 6 relic definitions with valid yields', () => {
    expect(ALL_RELICS.length).toBe(6);
    for (const relic of ALL_RELICS) {
      expect(relic.id).toBeTruthy();
      expect(relic.name).toBeTruthy();
      expect(relic.faithPerTurn).toBeGreaterThanOrEqual(0);
      expect(relic.culturePerTurn).toBeGreaterThanOrEqual(0);
      expect(relic.faithPerTurn + relic.culturePerTurn).toBeGreaterThan(0);
    }
  });

  it('relics on PlayerState contribute to exploration culture legacy path', () => {
    const base = createTestState({
      players: new Map([
        ['p1', createTestPlayer({ id: 'p1', culture: 0 })],
      ]),
    });

    const progress0 = scoreLegacyPaths('p1', base);
    const ec0 = progress0.find(p => p.axis === 'culture' && p.age === 'exploration');
    expect(ec0!.tiersCompleted).toBe(0);

    const stateWith4 = withRelics(base, ['r1', 'r2', 'r3', 'r4']);
    const progress4 = scoreLegacyPaths('p1', stateWith4);
    const ec4 = progress4.find(p => p.axis === 'culture' && p.age === 'exploration');
    expect(ec4!.tiersCompleted).toBe(1);

    const stateWith8 = withRelics(base, ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8']);
    const progress8 = scoreLegacyPaths('p1', stateWith8);
    const ec8 = progress8.find(p => p.axis === 'culture' && p.age === 'exploration');
    expect(ec8!.tiersCompleted).toBe(2);
  });

  it('relics contribute to cultural victory progress in victorySystem', () => {
    const state = createTestState({
      turn: 50,
      players: new Map([
        ['p1', createTestPlayer({
          id: 'p1',
          culture: 100,
          researchedCivics: ['mysticism'],
          relics: ['ark_of_the_covenant', 'shroud_of_turin', 'sacred_tooth'],
        })],
        ['p2', createTestPlayer({ id: 'p2', name: 'Player 2', culture: 50 })],
      ]),
    });

    const lastPlayerId = [...state.players.keys()][state.players.size - 1];
    const stateLastTurn = { ...state, currentPlayerId: lastPlayerId };
    const next = victorySystem(stateLastTurn, { type: 'END_TURN' });

    const p1Progress = next.victory.progress.get('p1');
    expect(p1Progress).toBeDefined();
    const cultureProgress = p1Progress!.find(p => p.type === 'culture');
    expect(cultureProgress).toBeDefined();
    expect(cultureProgress!.progress).toBeGreaterThan(0);
  });
});
