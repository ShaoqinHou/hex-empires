import { describe, it, expect } from 'vitest';
import { projectsSystem } from '../projectsSystem';
import { victorySystem } from '../victorySystem';
import { createTestState, createTestPlayer, createTestCity } from './helpers';
import { createGameConfig } from '../../state/GameConfigFactory';

// createGameConfig includes ALL_PROJECTS — use it so projectsSystem finds project defs

const configWithProjects = createGameConfig();

describe('projectsSystem', () => {
  it('ignores non-COMPLETE_PROJECT actions', () => {
    const state = createTestState({ config: configWithProjects });
    const next = projectsSystem(state, { type: 'START_TURN' });
    expect(next).toBe(state);
  });

  it('rejects unknown projectId', () => {
    const state = createTestState({ config: configWithProjects });
    const next = projectsSystem(state, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'nonexistent_project',
    });
    expect(next.lastValidation?.valid).toBe(false);
    expect((next.lastValidation as { valid: false; reason: string }).reason).toMatch(/Unknown project/);
  });

  it('rejects when required tech not researched', () => {
    const state = createTestState({ config: configWithProjects });
    // manhattan_project requires nuclear_fission + 20 ideology points
    const next = projectsSystem(state, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'manhattan_project',
    });
    expect(next.lastValidation?.valid).toBe(false);
    expect((next.lastValidation as { valid: false; reason: string }).reason).toMatch(/requires tech/);
  });

  it('rejects when ideology points below threshold', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['nuclear_fission'], ideologyPoints: 10 })],
    ]);
    const state = createTestState({ players, config: configWithProjects });
    const next = projectsSystem(state, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'manhattan_project',
    });
    expect(next.lastValidation?.valid).toBe(false);
    expect((next.lastValidation as { valid: false; reason: string }).reason).toMatch(/ideology points/);
  });

  it('completes manhattan_project when prereqs met', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['nuclear_fission'], ideologyPoints: 20 })],
    ]);
    const state = createTestState({ players, config: configWithProjects });
    const next = projectsSystem(state, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'manhattan_project',
    });
    expect(next.lastValidation?.valid).toBe(true);
    const p1 = next.players.get('p1')!;
    expect(p1.completedProjects).toContain('manhattan_project');
    expect(next.log.some(e => e.message.includes('Manhattan Project'))).toBe(true);
  });

  it('rejects operation_ivy when manhattan_project not completed', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['nuclear_fission'], ideologyPoints: 20 })],
    ]);
    const state = createTestState({ players, config: configWithProjects });
    const next = projectsSystem(state, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'operation_ivy',
    });
    expect(next.lastValidation?.valid).toBe(false);
    expect((next.lastValidation as { valid: false; reason: string }).reason).toMatch(/manhattan_project/);
  });

  it('completes operation_ivy after manhattan_project', () => {
    const players = new Map([
      ['p1', createTestPlayer({
        id: 'p1',
        researchedTechs: ['nuclear_fission'],
        ideologyPoints: 20,
        completedProjects: ['manhattan_project'],
      })],
    ]);
    const state = createTestState({ players, config: configWithProjects });
    const next = projectsSystem(state, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'operation_ivy',
    });
    expect(next.lastValidation?.valid).toBe(true);
    const p1 = next.players.get('p1')!;
    expect(p1.completedProjects).toContain('operation_ivy');
    expect(p1.completedProjects).toContain('manhattan_project');
  });

  it('rejects duplicate completion of manhattan_project', () => {
    const players = new Map([
      ['p1', createTestPlayer({
        id: 'p1',
        researchedTechs: ['nuclear_fission'],
        ideologyPoints: 20,
        completedProjects: ['manhattan_project'],
      })],
    ]);
    const state = createTestState({ players, config: configWithProjects });
    const next = projectsSystem(state, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'manhattan_project',
    });
    expect(next.lastValidation?.valid).toBe(false);
    expect((next.lastValidation as { valid: false; reason: string }).reason).toMatch(/already completed/);
  });

  it('increments spaceMilestonesComplete for space-race projects', () => {
    const players = new Map([
      ['p1', createTestPlayer({
        id: 'p1',
        researchedTechs: ['flight', 'combined_arms', 'rocketry'],
        spaceMilestonesComplete: 0,
      })],
    ]);
    const cities = new Map([
      ['c1', createTestCity({ id: 'c1', owner: 'p1', buildings: ['airport'] })],
    ]);
    const state = createTestState({ players, cities, config: configWithProjects });
    const after1 = projectsSystem(state, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'trans_oceanic_flight',
      cityId: 'c1',
    });
    expect(after1.players.get('p1')!.spaceMilestonesComplete).toBe(1);
  });

  it('world_bank_office decrements worldBankOfficesRemaining for each rival capital', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', researchedTechs: ['electricity'] })],
      ['p2', createTestPlayer({ id: 'p2' })],
      ['p3', createTestPlayer({ id: 'p3' })],
    ]);
    const state = createTestState({ players, config: configWithProjects });

    // First office — should initialize to (rivals - 1) = 3-1-1 = 1
    const after1 = projectsSystem(state, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'world_bank_office',
    });
    expect(after1.players.get('p1')!.worldBankOfficesRemaining).toBe(1);

    // Second office — decrement to 0
    const after2 = projectsSystem(after1, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'world_bank_office',
    });
    expect(after2.players.get('p1')!.worldBankOfficesRemaining).toBe(0);
  });
});

// ── Integration tests: project → victory check ───────────────────────────────

describe('projectsSystem + victorySystem integration', () => {
  it('Military: manhattan → operation_ivy chain + ideology civic fires Military Victory (W5-01 X5.1)', () => {
    const players = new Map([
      ['p1', createTestPlayer({
        id: 'p1',
        researchedTechs: ['nuclear_fission'],
        ideologyPoints: 20,
        ideology: 'democracy', // X5.1: ideology field required for Military victory
      })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', { id: 'c1', name: 'Rome', owner: 'p1', position: { q: 0, r: 0 }, population: 3, food: 0, productionQueue: [], productionProgress: 0, buildings: [] as string[], territory: [], settlementType: 'city' as const, happiness: 10, isCapital: true, defenseHP: 100, specialization: null, specialists: 0, districts: [] }],
      ['c2', { id: 'c2', name: 'Beijing', owner: 'p2', position: { q: 5, r: 5 }, population: 3, food: 0, productionQueue: [], productionProgress: 0, buildings: [] as string[], territory: [], settlementType: 'city' as const, happiness: 10, isCapital: true, defenseHP: 100, specialization: null, specialists: 0, districts: [] }],
    ]);
    const baseState = createTestState({
      players,
      cities,
      config: configWithProjects,
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
      currentPlayerId: 'p2',
    });

    // Step 1: Complete Manhattan Project
    const afterManhattan = projectsSystem(baseState, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'manhattan_project',
    });
    expect(afterManhattan.players.get('p1')!.completedProjects).toContain('manhattan_project');

    // Step 2: Complete Operation Ivy
    const afterIvy = projectsSystem(afterManhattan, {
      type: 'COMPLETE_PROJECT',
      playerId: 'p1',
      projectId: 'operation_ivy',
    });
    expect(afterIvy.players.get('p1')!.completedProjects).toContain('operation_ivy');

    // Step 3: END_TURN should fire Military Victory
    const afterEndTurn = victorySystem(afterIvy, { type: 'END_TURN' });
    expect(afterEndTurn.victory.winner).toBe('p1');
    expect(afterEndTurn.victory.winType).toBe('military');
  });

  it('Science: spaceMilestonesComplete >= 3 fires Science Victory (W5-01)', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', spaceMilestonesComplete: 3 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', { id: 'c1', name: 'Rome', owner: 'p1', position: { q: 0, r: 0 }, population: 3, food: 0, productionQueue: [], productionProgress: 0, buildings: [] as string[], territory: [], settlementType: 'city' as const, happiness: 10, isCapital: true, defenseHP: 100, specialization: null, specialists: 0, districts: [] }],
      ['c2', { id: 'c2', name: 'Beijing', owner: 'p2', position: { q: 5, r: 5 }, population: 3, food: 0, productionQueue: [], productionProgress: 0, buildings: [] as string[], territory: [], settlementType: 'city' as const, happiness: 10, isCapital: true, defenseHP: 100, specialization: null, specialists: 0, districts: [] }],
    ]);
    const state = createTestState({
      players,
      cities,
      config: configWithProjects,
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
      currentPlayerId: 'p2',
    });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('science');
  });

  it('Economic: worldBankOfficesRemaining === 0 alone no longer fires Economic Victory (X5.1: wonder required)', () => {
    // X5.1 rewrite: worldBankOfficesRemaining === 0 is now progress-only, not a victory trigger.
    // Economic victory requires the World Bank wonder + >= 3 distinct-civ trade routes.
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', worldBankOfficesRemaining: 0 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', { id: 'c1', name: 'Rome', owner: 'p1', position: { q: 0, r: 0 }, population: 3, food: 0, productionQueue: [], productionProgress: 0, buildings: [] as string[], territory: [], settlementType: 'city' as const, happiness: 10, isCapital: true, defenseHP: 100, specialization: null, specialists: 0, districts: [] }],
      ['c2', { id: 'c2', name: 'Beijing', owner: 'p2', position: { q: 5, r: 5 }, population: 3, food: 0, productionQueue: [], productionProgress: 0, buildings: [] as string[], territory: [], settlementType: 'city' as const, happiness: 10, isCapital: true, defenseHP: 100, specialization: null, specialists: 0, districts: [] }],
    ]);
    const state = createTestState({
      players,
      cities,
      config: configWithProjects,
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
      currentPlayerId: 'p2',
    });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull(); // worldBankOffices alone no longer triggers victory
  });

  it('Economic does NOT fire when worldBankOfficesRemaining > 0', () => {
    const players = new Map([
      ['p1', createTestPlayer({ id: 'p1', worldBankOfficesRemaining: 2 })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]);
    const cities = new Map([
      ['c1', { id: 'c1', name: 'Rome', owner: 'p1', position: { q: 0, r: 0 }, population: 3, food: 0, productionQueue: [], productionProgress: 0, buildings: [] as string[], territory: [], settlementType: 'city' as const, happiness: 10, isCapital: true, defenseHP: 100, specialization: null, specialists: 0, districts: [] }],
      ['c2', { id: 'c2', name: 'Beijing', owner: 'p2', position: { q: 5, r: 5 }, population: 3, food: 0, productionQueue: [], productionProgress: 0, buildings: [] as string[], territory: [], settlementType: 'city' as const, happiness: 10, isCapital: true, defenseHP: 100, specialization: null, specialists: 0, districts: [] }],
    ]);
    const state = createTestState({
      players,
      cities,
      config: configWithProjects,
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
      currentPlayerId: 'p2',
    });
    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });
});
