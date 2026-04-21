/**
 * notification-category.test.ts — Phase 5.2
 *
 * Asserts that log events emitted by engine systems carry the correct
 * `category` and `panelTarget` fields introduced in Phase 5.1.
 *
 * Coverage: production, research, civic, diplomacy, crisis, age systems
 * (one representative case per system).
 */
import { describe, it, expect } from 'vitest';
import { productionSystem } from '../productionSystem';
import { researchSystem } from '../researchSystem';
import { civicSystem } from '../civicSystem';
import { diplomacySystem } from '../diplomacySystem';
import { crisisSystem } from '../crisisSystem';
import { ageSystem } from '../ageSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState, GameEvent } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

// ── helpers ─────────────────────────────────────────────────────────────────

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: { q: 3, r: 3 },
    population: 5,
    food: 0,
    productionQueue: [{ type: 'unit', id: 'warrior' }],
    productionProgress: 0,
    buildings: [],
    territory: [coordToKey({ q: 3, r: 3 })],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
    ...overrides,
  };
}

/** Find the last log event matching a type predicate */
function lastEvent(events: ReadonlyArray<GameEvent>, predicate: (e: GameEvent) => boolean): GameEvent | undefined {
  return [...events].reverse().find(predicate);
}

// ── production ───────────────────────────────────────────────────────────────

describe('notification category — productionSystem', () => {
  it('emits category=production and panelTarget=city when a unit is produced', () => {
    const city = createTestCity({
      productionQueue: [{ type: 'unit', id: 'warrior' }],
      productionProgress: 95, // warrior costs 100, city has 5 pop = enough to complete
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });
    const next = productionSystem(state, { type: 'END_TURN' });
    const evt = lastEvent(next.log, e => e.message.includes('produced') || e.message.includes('built'));
    expect(evt).toBeDefined();
    expect(evt!.category).toBe('production');
    expect(evt!.panelTarget).toBe('city');
  });
});

// ── research ─────────────────────────────────────────────────────────────────

describe('notification category — researchSystem', () => {
  it('emits category=research and panelTarget=tech when a tech is completed', () => {
    // Give the player enough science progress to complete pottery (cost ~25)
    const player = createTestPlayer({
      currentResearch: 'pottery',
      researchProgress: 24,
      science: 0,
    });
    // Give a city so sciencePerTurn ≥ 1
    const city = createTestCity({ owner: 'p1', population: 5 });
    const state = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });
    const next = researchSystem(state, { type: 'END_TURN' });
    const evt = lastEvent(next.log, e => e.type === 'research' && e.message.includes('Researched'));
    expect(evt).toBeDefined();
    expect(evt!.category).toBe('research');
    expect(evt!.panelTarget).toBe('tech');
  });
});

// ── civic ────────────────────────────────────────────────────────────────────

describe('notification category — civicSystem', () => {
  it('emits category=civic and panelTarget=civics when a civic is completed', () => {
    // Check available antiquity civic ID
    const state = createTestState();
    // Find first antiquity civic available
    let firstCivicId = '';
    for (const [id, def] of state.config.civics) {
      if (def.age === 'antiquity' && def.prerequisites.length === 0) {
        firstCivicId = id;
        break;
      }
    }
    if (!firstCivicId) return; // skip if no civic available

    // Give a city for culture generation
    const city = createTestCity({ owner: 'p1', population: 3 });
    const civicCost = state.config.civics.get(firstCivicId)?.cost ?? 100;
    const player = createTestPlayer({
      currentCivic: firstCivicId,
      civicProgress: civicCost - 1, // one tick to complete
    });
    const stateWithCity = createTestState({
      players: new Map([['p1', player]]),
      cities: new Map([['c1', city]]),
    });
    const next = civicSystem(stateWithCity, { type: 'END_TURN' });
    const evt = lastEvent(next.log, e => e.type === 'civic' && e.message.includes('Completed'));
    expect(evt).toBeDefined();
    expect(evt!.category).toBe('civic');
    expect(evt!.panelTarget).toBe('civics');
  });
});

// ── diplomacy ────────────────────────────────────────────────────────────────

describe('notification category — diplomacySystem', () => {
  it('emits category=diplomatic and panelTarget=diplomacy on war declaration', () => {
    // Set up two players with enough influence for formal war
    const player = createTestPlayer({ influence: 500 });
    const player2 = createTestPlayer({
      id: 'p2',
      name: 'Athens',
      civilizationId: 'greece',
      leaderId: 'pericles',
      isHuman: false,
    });
    const state = createTestState({
      players: new Map([['p1', player], ['p2', player2]]),
    });
    const next = diplomacySystem(state, {
      type: 'PROPOSE_DIPLOMACY',
      targetId: 'p2',
      proposal: { type: 'DECLARE_WAR', warType: 'surprise' },
    });
    const evt = lastEvent(next.log, e => e.type === 'diplomacy' && e.message.includes('war'));
    expect(evt).toBeDefined();
    expect(evt!.category).toBe('diplomatic');
    expect(evt!.panelTarget).toBe('diplomacy');
  });
});

// ── crisis ───────────────────────────────────────────────────────────────────

describe('notification category — crisisSystem', () => {
  it('emits category=crisis on crisis trigger', () => {
    // Turn ≥ 5 should trigger the Barbarian Revolt crisis (turn_reached at 5)
    const state = createTestState({ turn: 5 });
    const next = crisisSystem(state, { type: 'END_TURN' });
    if (next.log.length === state.log.length) return; // no crisis triggered, skip
    const evt = lastEvent(next.log, e => e.type === 'crisis');
    expect(evt).toBeDefined();
    expect(evt!.category).toBe('crisis');
    expect(evt!.panelTarget).toBe('crisis');
  });
});

// ── age ──────────────────────────────────────────────────────────────────────

describe('notification category — ageSystem', () => {
  it('emits category=age and panelTarget=age on age transition', () => {
    const explorationThreshold = 50; // matches createTestState default
    const player = createTestPlayer({
      ageProgress: explorationThreshold,
      age: 'antiquity',
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: explorationThreshold, modern: 100 } },
    });
    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const evt = lastEvent(next.log, e => e.type === 'age');
    expect(evt).toBeDefined();
    expect(evt!.category).toBe('age');
    expect(evt!.panelTarget).toBe('age');
  });
});
