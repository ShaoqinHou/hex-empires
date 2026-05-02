import { describe, it, expect } from 'vitest';
import { ageSystem } from '../ageSystem';
import { createTestState, createTestPlayer, createTestUnit } from './helpers';
import type { CommanderState } from '../../types/Commander';

function makeCommanderState(overrides: Partial<CommanderState>): CommanderState {
  return {
    unitId: 'commander',
    xp: 0,
    commanderLevel: 1,
    unspentPromotionPicks: 0,
    promotions: [],
    tree: null,
    attachedUnits: [],
    packed: false,
    packedUnitStates: [],
    ...overrides,
  };
}

describe('ageSystem commander transition cleanup', () => {
  it('clears legacy-packed Antiquity commander state and keeps commander identity data', () => {
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      ageProgress: 50,
      civilizationId: 'rome',
    });
    const rival = createTestPlayer({
      id: 'p2',
      age: 'antiquity',
      ageProgress: 50,
      civilizationId: 'greece',
    });

    const packedSnapshot = createTestUnit({
      id: 'antique-packed',
      typeId: 'swordsman',
      owner: 'p1',
      position: { q: 1, r: 0 },
    });
    const rivalPackedSnapshot = createTestUnit({
      id: 'rival-packed',
      typeId: 'swordsman',
      owner: 'p2',
      position: { q: -1, r: 0 },
    });

    const state = createTestState({
      players: new Map([['p1', player], ['p2', rival]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      units: new Map([
        ['cmd1', createTestUnit({ id: 'cmd1', typeId: 'captain', owner: 'p1', position: { q: 0, r: 0 } })],
        ['cmd2', createTestUnit({ id: 'cmd2', typeId: 'captain', owner: 'p2', position: { q: 2, r: 0 } })],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState({
          unitId: 'cmd1',
          xp: 7,
          unspentPromotionPicks: 1,
          promotions: ['assault_initiative'],
          attachedUnits: [packedSnapshot.id],
          packed: true,
          packedUnitStates: [packedSnapshot],
          respawnTurnsRemaining: 3,
          respawnUnitState: createTestUnit({
            id: 'cmd1-respawn',
            typeId: 'captain',
            owner: 'p1',
            position: { q: 3, r: 0 },
          }),
        })],
        ['cmd2', makeCommanderState({
          unitId: 'cmd2',
          attachedUnits: [rivalPackedSnapshot.id],
          packed: true,
          packedUnitStates: [rivalPackedSnapshot],
        })],
      ]),
    });

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });
    const nextCmd1 = next.commanders!.get('cmd1');
    const nextCmd2 = next.commanders!.get('cmd2');
    const beforeCmd1 = state.commanders!.get('cmd1');
    const beforeCmd2 = state.commanders!.get('cmd2');

    expect(next.age.currentAge).toBe('exploration');
    expect(next.units.has('cmd1')).toBe(true);
    expect(nextCmd1).toBeDefined();
    expect(nextCmd1!.packed).toBe(false);
    expect(nextCmd1!.attachedUnits).toEqual([]);
    expect(nextCmd1!.packedUnitStates).toEqual([]);
    expect(nextCmd1!.xp).toBe(beforeCmd1!.xp);
    expect(nextCmd1!.promotions).toEqual(beforeCmd1!.promotions);
    expect(nextCmd1!.respawnTurnsRemaining).toBe(beforeCmd1!.respawnTurnsRemaining);
    expect(nextCmd1!.respawnUnitState).toEqual(beforeCmd1!.respawnUnitState);
    expect(nextCmd2).toEqual(beforeCmd2);
  });

  it('removes legacy packed live units for non-fleet commanders on Antiquity -> Exploration transition', () => {
    const player = createTestPlayer({
      id: 'p1',
      age: 'antiquity',
      ageProgress: 50,
      civilizationId: 'rome',
    });
    const livePacked = createTestUnit({
      id: 'legacy-packed-live',
      typeId: 'swordsman',
      owner: 'p1',
      position: { q: 1, r: 0 },
      packedInCommanderId: 'cmd1',
    });

    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'antiquity', ageThresholds: { exploration: 50, modern: 100 } },
      units: new Map([
        ['cmd1', createTestUnit({ id: 'cmd1', typeId: 'captain', owner: 'p1', position: { q: 0, r: 0 } })],
        ['legacy-packed-live', livePacked],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState({
          unitId: 'cmd1',
          attachedUnits: [livePacked.id],
          packed: true,
          packedUnitStates: [],
        })],
      ]),
    });

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'spain' });

    expect(next.units.has('legacy-packed-live')).toBe(false);
    const nextCmd1 = next.commanders!.get('cmd1')!;
    expect(nextCmd1.packed).toBe(false);
    expect(nextCmd1.attachedUnits).toEqual([]);
    expect(nextCmd1.packedUnitStates).toEqual([]);
  });

  it('keeps only naval legacy-attached units for Exploration -> Modern fleet commanders', () => {
    const player = createTestPlayer({
      id: 'p1',
      age: 'exploration',
      ageProgress: 100,
      civilizationId: 'rome',
    });
    const rival = createTestPlayer({
      id: 'p2',
      age: 'exploration',
      ageProgress: 50,
      civilizationId: 'greece',
    });

    const assignedNaval = createTestUnit({
      id: 'fleet-packed-naval',
      typeId: 'quadrireme',
      owner: 'p1',
      position: { q: 1, r: 0 },
      packedInCommanderId: 'cmd1',
    });
    const assignedGround = createTestUnit({
      id: 'fleet-packed-ground',
      typeId: 'swordsman',
      owner: 'p1',
      position: { q: -1, r: 0 },
      packedInCommanderId: 'cmd1',
    });
    const unassignedNaval = createTestUnit({
      id: 'fleet-unassigned-naval',
      typeId: 'ironclad',
      owner: 'p1',
      position: { q: 0, r: 1 },
    });
    const enemyNaval = createTestUnit({
      id: 'fleet-enemy-naval',
      typeId: 'battleship',
      owner: 'p2',
      position: { q: 0, r: -1 },
    });

    const state = createTestState({
      players: new Map([['p1', player], ['p2', rival]]),
      age: { currentAge: 'exploration', ageThresholds: { exploration: 50, modern: 100 } },
      units: new Map([
        ['cmd1', createTestUnit({ id: 'cmd1', typeId: 'admiral', owner: 'p1', position: { q: 0, r: 0 } })],
        ['fleet-packed-naval', assignedNaval],
        ['fleet-packed-ground', assignedGround],
        ['fleet-unassigned-naval', unassignedNaval],
        ['fleet-enemy-naval', enemyNaval],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState({
          unitId: 'cmd1',
          packed: true,
          attachedUnits: [assignedNaval.id, assignedGround.id],
        })],
      ]),
    });

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'america' });
    const nextCmd1 = next.commanders!.get('cmd1')!;

    expect(next.age.currentAge).toBe('modern');
    expect(nextCmd1.packed).toBe(true);
    expect(nextCmd1.attachedUnits).toEqual([assignedNaval.id]);
    expect(nextCmd1.packedUnitStates).toEqual([assignedNaval]);
    expect(next.units.has('fleet-packed-naval')).toBe(false);
    expect(next.units.has('fleet-packed-ground')).toBe(false);
    expect(next.units.has('fleet-unassigned-naval')).toBe(false);
    expect(next.units.has('fleet-enemy-naval')).toBe(true);
    expect(next.units.get('fleet-enemy-naval')!.owner).toBe('p2');
    expect(next.units.has('cmd1')).toBe(true);
  });

  it('keeps naval packed snapshots for Exploration -> Modern fleet commanders', () => {
    const player = createTestPlayer({
      id: 'p1',
      age: 'exploration',
      ageProgress: 100,
      civilizationId: 'rome',
    });
    const packedNavalSnapshot = createTestUnit({
      id: 'fleet-snapshot-naval',
      typeId: 'quadrireme',
      owner: 'p1',
      position: { q: 1, r: 0 },
    });
    const packedGroundSnapshot = createTestUnit({
      id: 'fleet-snapshot-ground',
      typeId: 'swordsman',
      owner: 'p1',
      position: { q: -1, r: 0 },
    });

    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'exploration', ageThresholds: { exploration: 50, modern: 100 } },
      units: new Map([
        ['cmd1', createTestUnit({ id: 'cmd1', typeId: 'admiral', owner: 'p1', position: { q: 0, r: 0 } })],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState({
          unitId: 'cmd1',
          packed: true,
          attachedUnits: [packedNavalSnapshot.id, packedGroundSnapshot.id],
          packedUnitStates: [packedNavalSnapshot, packedGroundSnapshot],
        })],
      ]),
    });

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'america' });
    const nextCmd1 = next.commanders!.get('cmd1')!;

    expect(nextCmd1.packed).toBe(true);
    expect(nextCmd1.attachedUnits).toEqual([packedNavalSnapshot.id]);
    expect(nextCmd1.packedUnitStates).toEqual([packedNavalSnapshot]);
    expect(next.units.has(packedNavalSnapshot.id)).toBe(false);
    expect(next.units.has(packedGroundSnapshot.id)).toBe(false);
    expect(next.units.has('cmd1')).toBe(true);
  });

  it('scopes sequential Exploration -> Modern fleet cleanup to each transitioning player', () => {
    const playerOne = createTestPlayer({
      id: 'p1',
      age: 'exploration',
      ageProgress: 100,
      civilizationId: 'rome',
    });
    const playerTwo = createTestPlayer({
      id: 'p2',
      age: 'exploration',
      ageProgress: 100,
      civilizationId: 'greece',
    });

    const p1AssignedNaval = createTestUnit({
      id: 'p1-fleet-packed-naval',
      typeId: 'quadrireme',
      owner: 'p1',
      position: { q: 1, r: 0 },
      packedInCommanderId: 'cmd1',
    });
    const p1UnassignedNaval = createTestUnit({
      id: 'p1-fleet-unassigned-naval',
      typeId: 'ironclad',
      owner: 'p1',
      position: { q: 2, r: 0 },
    });
    const p2AssignedNaval = createTestUnit({
      id: 'p2-fleet-packed-naval',
      typeId: 'quadrireme',
      owner: 'p2',
      position: { q: 3, r: 0 },
      packedInCommanderId: 'cmd2',
    });
    const p2UnassignedNaval = createTestUnit({
      id: 'p2-fleet-unassigned-naval',
      typeId: 'ironclad',
      owner: 'p2',
      position: { q: 4, r: 0 },
    });

    const state = createTestState({
      currentPlayerId: 'p1',
      players: new Map([['p1', playerOne], ['p2', playerTwo]]),
      age: { currentAge: 'exploration', ageThresholds: { exploration: 50, modern: 100 } },
      units: new Map([
        ['cmd1', createTestUnit({ id: 'cmd1', typeId: 'admiral', owner: 'p1', position: { q: 0, r: 0 } })],
        ['cmd2', createTestUnit({ id: 'cmd2', typeId: 'admiral', owner: 'p2', position: { q: 5, r: 0 } })],
        [p1AssignedNaval.id, p1AssignedNaval],
        [p1UnassignedNaval.id, p1UnassignedNaval],
        [p2AssignedNaval.id, p2AssignedNaval],
        [p2UnassignedNaval.id, p2UnassignedNaval],
      ]),
      commanders: new Map([
        ['cmd1', makeCommanderState({
          unitId: 'cmd1',
          packed: true,
          attachedUnits: [p1AssignedNaval.id],
        })],
        ['cmd2', makeCommanderState({
          unitId: 'cmd2',
          packed: true,
          attachedUnits: [p2AssignedNaval.id],
        })],
      ]),
    });

    const afterP1 = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'america' });
    const p1CommanderAfterFirstTransition = afterP1.commanders!.get('cmd1')!;
    const p2CommanderBeforeTransition = state.commanders!.get('cmd2')!;

    expect(afterP1.playersReadyToTransition).toEqual(['p1']);
    expect(afterP1.units.has(p1AssignedNaval.id)).toBe(false);
    expect(afterP1.units.has(p1UnassignedNaval.id)).toBe(false);
    expect(afterP1.units.get(p2AssignedNaval.id)).toEqual(p2AssignedNaval);
    expect(afterP1.units.get(p2UnassignedNaval.id)).toEqual(p2UnassignedNaval);
    expect(p1CommanderAfterFirstTransition.attachedUnits).toEqual([p1AssignedNaval.id]);
    expect(p1CommanderAfterFirstTransition.packedUnitStates).toEqual([p1AssignedNaval]);
    expect(afterP1.commanders!.get('cmd2')).toEqual(p2CommanderBeforeTransition);

    const afterP2 = ageSystem(
      { ...afterP1, currentPlayerId: 'p2' },
      { type: 'TRANSITION_AGE', newCivId: 'america' },
    );
    const p2CommanderAfterSecondTransition = afterP2.commanders!.get('cmd2')!;

    expect(afterP2.playersReadyToTransition).toEqual([]);
    expect(afterP2.commanders!.get('cmd1')).toEqual(p1CommanderAfterFirstTransition);
    expect(afterP2.units.has(p1AssignedNaval.id)).toBe(false);
    expect(afterP2.units.has(p1UnassignedNaval.id)).toBe(false);
    expect(afterP2.units.has(p2AssignedNaval.id)).toBe(false);
    expect(afterP2.units.has(p2UnassignedNaval.id)).toBe(false);
    expect(p2CommanderAfterSecondTransition.attachedUnits).toEqual([p2AssignedNaval.id]);
    expect(p2CommanderAfterSecondTransition.packedUnitStates).toEqual([p2AssignedNaval]);
  });

  it('removes unassigned owned naval units on Exploration -> Modern even without commanders', () => {
    const player = createTestPlayer({
      id: 'p1',
      age: 'exploration',
      ageProgress: 100,
      civilizationId: 'rome',
    });
    const ownedNaval = createTestUnit({
      id: 'owned-naval',
      typeId: 'quadrireme',
      owner: 'p1',
      position: { q: 1, r: 0 },
    });
    const ownedGround = createTestUnit({
      id: 'owned-ground',
      typeId: 'swordsman',
      owner: 'p1',
      position: { q: 2, r: 0 },
    });
    const enemyNaval = createTestUnit({
      id: 'enemy-naval',
      typeId: 'quadrireme',
      owner: 'p2',
      position: { q: 3, r: 0 },
    });
    const state = createTestState({
      players: new Map([['p1', player]]),
      age: { currentAge: 'exploration', ageThresholds: { exploration: 50, modern: 100 } },
      units: new Map([
        [ownedNaval.id, ownedNaval],
        [ownedGround.id, ownedGround],
        [enemyNaval.id, enemyNaval],
      ]),
    });

    const next = ageSystem(state, { type: 'TRANSITION_AGE', newCivId: 'america' });

    expect(next.age.currentAge).toBe('modern');
    expect(next.units.has(ownedNaval.id)).toBe(false);
    expect(next.units.get(ownedGround.id)).toEqual(ownedGround);
    expect(next.units.get(enemyNaval.id)).toEqual(enemyNaval);
    expect(next.commanders).toBeUndefined();
  });
});
