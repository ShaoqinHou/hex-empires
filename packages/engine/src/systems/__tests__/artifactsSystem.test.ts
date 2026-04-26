import { describe, it, expect } from 'vitest';
import { artifactsSystem } from '../artifactsSystem';
import { victorySystem } from '../victorySystem';
import { createTestState, createTestPlayer, createTestUnit, createFlatMap } from './helpers';
import type { HexTile, CityState } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeArtifactTile(coord: { q: number; r: number }): HexTile {
  return {
    coord,
    terrain: 'grassland',
    feature: null,
    resource: null,
    improvement: null,
    building: null,
    river: [],
    elevation: 0.5,
    continent: 1,
    hasArtifactSite: true,
  };
}

function makeCityWith(id: string, owner: string, buildings: string[]): CityState {
  return {
    id,
    name: id,
    owner,
    position: { q: 5, r: 5 },
    population: 3,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings,
    territory: [coordToKey({ q: 5, r: 5 })],
    settlementType: 'city',
    happiness: 10,
    isCapital: true,
    defenseHP: 100,
    specialization: null,
    specialists: 0,
    districts: [],
  };
}

// ── EXCAVATE_ARTIFACT tests ───────────────────────────────────────────────────

describe('artifactsSystem', () => {
  it('increments player.artifactsCollected when Explorer excavates a valid site', () => {
    const tiles = createFlatMap(10, 10);
    const artifactCoord = { q: 2, r: 2 };
    tiles.set(coordToKey(artifactCoord), makeArtifactTile(artifactCoord));

    const explorer = createTestUnit({ id: 'u1', typeId: 'explorer', owner: 'p1', position: artifactCoord, movementLeft: 3 });
    const state = createTestState({
      units: new Map([['u1', explorer]]),
      map: { width: 10, height: 10, tiles, wrapX: false },
    });

    const next = artifactsSystem(state, { type: 'EXCAVATE_ARTIFACT', unitId: 'u1', tile: artifactCoord });

    const player = next.players.get('p1')!;
    expect(player.artifactsCollected).toBe(1);
  });

  it('removes the artifact site from the tile after excavation', () => {
    const tiles = createFlatMap(10, 10);
    const artifactCoord = { q: 3, r: 3 };
    tiles.set(coordToKey(artifactCoord), makeArtifactTile(artifactCoord));

    const explorer = createTestUnit({ id: 'u1', typeId: 'explorer', owner: 'p1', position: artifactCoord, movementLeft: 2 });
    const state = createTestState({
      units: new Map([['u1', explorer]]),
      map: { width: 10, height: 10, tiles, wrapX: false },
    });

    const next = artifactsSystem(state, { type: 'EXCAVATE_ARTIFACT', unitId: 'u1', tile: artifactCoord });

    const updatedTile = next.map.tiles.get(coordToKey(artifactCoord))!;
    expect(updatedTile.hasArtifactSite).toBe(false);
  });

  it('sets Explorer movementLeft to 0 after excavation', () => {
    const tiles = createFlatMap(10, 10);
    const artifactCoord = { q: 1, r: 1 };
    tiles.set(coordToKey(artifactCoord), makeArtifactTile(artifactCoord));

    const explorer = createTestUnit({ id: 'u1', typeId: 'explorer', owner: 'p1', position: artifactCoord, movementLeft: 3 });
    const state = createTestState({
      units: new Map([['u1', explorer]]),
      map: { width: 10, height: 10, tiles, wrapX: false },
    });

    const next = artifactsSystem(state, { type: 'EXCAVATE_ARTIFACT', unitId: 'u1', tile: artifactCoord });

    expect(next.units.get('u1')!.movementLeft).toBe(0);
  });

  it('does not excavate if unit is not an Explorer', () => {
    const tiles = createFlatMap(10, 10);
    const artifactCoord = { q: 2, r: 2 };
    tiles.set(coordToKey(artifactCoord), makeArtifactTile(artifactCoord));

    const warrior = createTestUnit({ id: 'u1', typeId: 'warrior', owner: 'p1', position: artifactCoord, movementLeft: 2 });
    const state = createTestState({
      units: new Map([['u1', warrior]]),
      map: { width: 10, height: 10, tiles, wrapX: false },
    });

    const next = artifactsSystem(state, { type: 'EXCAVATE_ARTIFACT', unitId: 'u1', tile: artifactCoord });

    // Returns state unchanged
    expect(next).toBe(state);
  });

  it('does not excavate if tile has no artifact site', () => {
    const tiles = createFlatMap(10, 10);
    const coord = { q: 4, r: 4 };

    const explorer = createTestUnit({ id: 'u1', typeId: 'explorer', owner: 'p1', position: coord, movementLeft: 3 });
    const state = createTestState({
      units: new Map([['u1', explorer]]),
      map: { width: 10, height: 10, tiles, wrapX: false },
    });

    const next = artifactsSystem(state, { type: 'EXCAVATE_ARTIFACT', unitId: 'u1', tile: coord });

    expect(next).toBe(state);
  });

  it('does not excavate if unit has no movement left', () => {
    const tiles = createFlatMap(10, 10);
    const artifactCoord = { q: 2, r: 2 };
    tiles.set(coordToKey(artifactCoord), makeArtifactTile(artifactCoord));

    const explorer = createTestUnit({ id: 'u1', typeId: 'explorer', owner: 'p1', position: artifactCoord, movementLeft: 0 });
    const state = createTestState({
      units: new Map([['u1', explorer]]),
      map: { width: 10, height: 10, tiles, wrapX: false },
    });

    const next = artifactsSystem(state, { type: 'EXCAVATE_ARTIFACT', unitId: 'u1', tile: artifactCoord });

    expect(next).toBe(state);
  });

  it('accumulates multiple artifact excavations correctly', () => {
    const tiles = createFlatMap(10, 10);
    const coord1 = { q: 1, r: 1 };
    const coord2 = { q: 2, r: 2 };
    tiles.set(coordToKey(coord1), makeArtifactTile(coord1));
    tiles.set(coordToKey(coord2), makeArtifactTile(coord2));

    const explorer = createTestUnit({ id: 'u1', typeId: 'explorer', owner: 'p1', position: coord1, movementLeft: 3 });
    const p1 = createTestPlayer({ id: 'p1', artifactsCollected: 5 });
    const state = createTestState({
      players: new Map([['p1', p1]]),
      units: new Map([['u1', explorer]]),
      map: { width: 10, height: 10, tiles, wrapX: false },
    });

    const afterFirst = artifactsSystem(state, { type: 'EXCAVATE_ARTIFACT', unitId: 'u1', tile: coord1 });
    expect(afterFirst.players.get('p1')!.artifactsCollected).toBe(6);
  });

  it('ignores non-EXCAVATE_ARTIFACT actions', () => {
    const state = createTestState();
    const next = artifactsSystem(state, { type: 'END_TURN' });
    expect(next).toBe(state);
  });
});

// ── Cultural victory (W5-02) ─────────────────────────────────────────────────

describe('victorySystem — cultural victory (W5-02 GDD path)', () => {
  it('triggers cultural victory with 15 artifacts + World Fair built in modern age', () => {
    const tiles = createFlatMap(10, 10);
    const p1 = createTestPlayer({ id: 'p1', artifactsCollected: 15 });
    const p2 = createTestPlayer({ id: 'p2' });
    const players = new Map([['p1', p1], ['p2', p2]]);

    // p1 has a city with worlds_fair; p2 also has a city (so domination doesn't trigger)
    const cities = new Map([
      ['c1', makeCityWith('c1', 'p1', ['worlds_fair'])],
      ['c2', makeCityWith('c2', 'p2', [])],
    ]);

    const state = createTestState({
      players,
      cities,
      currentPlayerId: 'p2',
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
      builtWonders: ['worlds_fair'],
    });

    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBe('p1');
    expect(next.victory.winType).toBe('culture');
  });

  it('does not trigger cultural victory with 15 artifacts but no World Fair', () => {
    const p1 = createTestPlayer({ id: 'p1', artifactsCollected: 15 });
    const p2 = createTestPlayer({ id: 'p2' });
    const players = new Map([['p1', p1], ['p2', p2]]);
    const cities = new Map([
      ['c1', makeCityWith('c1', 'p1', [])],
      ['c2', makeCityWith('c2', 'p2', [])],
    ]);

    const state = createTestState({
      players,
      cities,
      currentPlayerId: 'p2',
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
      builtWonders: [],
    });

    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });

  it('does not trigger cultural victory with World Fair but only 9 artifacts (X5.1: threshold is 10)', () => {
    const p1 = createTestPlayer({ id: 'p1', artifactsCollected: 9 });
    const p2 = createTestPlayer({ id: 'p2' });
    const players = new Map([['p1', p1], ['p2', p2]]);
    const cities = new Map([
      ['c1', makeCityWith('c1', 'p1', ['worlds_fair'])],
      ['c2', makeCityWith('c2', 'p2', [])],
    ]);

    const state = createTestState({
      players,
      cities,
      currentPlayerId: 'p2',
      age: { currentAge: 'modern', ageThresholds: { exploration: 50, modern: 100 } },
      builtWonders: ['worlds_fair'],
    });

    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });

  it('does not trigger cultural victory (GDD path) outside the modern age', () => {
    const p1 = createTestPlayer({ id: 'p1', artifactsCollected: 15 });
    const p2 = createTestPlayer({ id: 'p2' });
    const players = new Map([['p1', p1], ['p2', p2]]);
    const cities = new Map([
      ['c1', makeCityWith('c1', 'p1', ['worlds_fair'])],
      ['c2', makeCityWith('c2', 'p2', [])],
    ]);

    const state = createTestState({
      players,
      cities,
      currentPlayerId: 'p2',
      age: { currentAge: 'exploration', ageThresholds: { exploration: 50, modern: 100 } },
      builtWonders: ['worlds_fair'],
    });

    const next = victorySystem(state, { type: 'END_TURN' });
    expect(next.victory.winner).toBeNull();
  });
});

// ── Natural Wonder first-settle bonus ────────────────────────────────────────

describe('natural wonders data', () => {
  it('has at least 12 natural wonders registered (JJ4 expanded from 12 to 17)', async () => {
    const { ALL_NATURAL_WONDERS } = await import('../../data/natural-wonders');
    expect(ALL_NATURAL_WONDERS.length).toBeGreaterThanOrEqual(12);
  });

  it('each natural wonder has a unique id', async () => {
    const { ALL_NATURAL_WONDERS } = await import('../../data/natural-wonders');
    const ids = new Set(ALL_NATURAL_WONDERS.map(nw => nw.id));
    expect(ids.size).toBe(ALL_NATURAL_WONDERS.length);
  });

  it('each natural wonder has tileCount of 1 or 2', async () => {
    const { ALL_NATURAL_WONDERS } = await import('../../data/natural-wonders');
    for (const nw of ALL_NATURAL_WONDERS) {
      expect([1, 2]).toContain(nw.tileCount);
    }
  });

  it('each natural wonder has a firstSettleBonus effect', async () => {
    const { ALL_NATURAL_WONDERS } = await import('../../data/natural-wonders');
    for (const nw of ALL_NATURAL_WONDERS) {
      expect(nw.firstSettleBonus).toBeDefined();
      expect(nw.firstSettleBonus.type).toBeDefined();
    }
  });

  it('World Fair is in the buildings registry as a modern wonder requiring natural_history civic', async () => {
    const { ALL_MODERN_BUILDINGS } = await import('../../data/buildings/modern-buildings');
    const wf = ALL_MODERN_BUILDINGS.find(b => b.id === 'worlds_fair');
    expect(wf).toBeDefined();
    expect(wf!.isWonder).toBe(true);
    expect(wf!.age).toBe('modern');
    expect(wf!.requiredCivic).toBe('natural_history');
  });

  it('Explorer unit is in the exploration units registry with excavate ability', async () => {
    const { ALL_EXPLORATION_UNITS } = await import('../../data/units/exploration-units');
    const explorer = ALL_EXPLORATION_UNITS.find(u => u.id === 'explorer');
    expect(explorer).toBeDefined();
    expect(explorer!.age).toBe('exploration');
    expect(explorer!.abilities).toContain('excavate');
  });
});
