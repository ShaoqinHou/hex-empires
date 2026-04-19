/**
 * W4-02: Map terrain biome+modifier model tests
 *
 * Tests:
 * - Biome+modifier annotations on existing terrains
 * - Tropical biome terrain definitions
 * - Navigable river as water tile (in MapAnalytics.WATER_TERRAINS)
 * - Distant Lands permafog (visibilitySystem)
 * - Deep Ocean attrition (movementSystem)
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_BASE_TERRAINS,
  GRASSLAND,
  PLAINS,
  DESERT,
  TUNDRA,
  COAST,
  OCEAN,
  TROPICAL,
  RAINFOREST,
  MANGROVE,
  NAVIGABLE_RIVER,
  DEEP_OCEAN,
} from '../terrains/base-terrains';
import { ALL_FEATURES, HILLS, MOUNTAINS, FOREST, JUNGLE, MARSH } from '../terrains/features';
import { landRatio, passableLandTiles } from '../../state/MapAnalytics';
import { visibilitySystem } from '../../systems/visibilitySystem';
import { movementSystem } from '../../systems/movementSystem';
import { createTestState, createTestUnit, createTestPlayer } from '../../systems/__tests__/helpers';
import { coordToKey } from '../../hex/HexMath';
import type { HexTile } from '../../types/GameState';

// ── 1. Biome+modifier annotations on existing terrains ───────────────────────

describe('W4-02 biome+modifier compound model', () => {
  it('GRASSLAND has biome=grassland and modifier=flat', () => {
    expect(GRASSLAND.biome).toBe('grassland');
    expect(GRASSLAND.modifier).toBe('flat');
  });

  it('PLAINS has biome=plains and modifier=flat', () => {
    expect(PLAINS.biome).toBe('plains');
    expect(PLAINS.modifier).toBe('flat');
  });

  it('DESERT has biome=desert and modifier=flat', () => {
    expect(DESERT.biome).toBe('desert');
    expect(DESERT.modifier).toBe('flat');
  });

  it('TUNDRA has biome=tundra and modifier=flat', () => {
    expect(TUNDRA.biome).toBe('tundra');
    expect(TUNDRA.modifier).toBe('flat');
  });

  it('COAST has biome=marine and modifier=flat', () => {
    expect(COAST.biome).toBe('marine');
    expect(COAST.modifier).toBe('flat');
  });

  it('OCEAN has biome=marine and modifier=flat', () => {
    expect(OCEAN.biome).toBe('marine');
    expect(OCEAN.modifier).toBe('flat');
  });

  it('all base terrains have biome and modifier set', () => {
    for (const terrain of ALL_BASE_TERRAINS) {
      expect(terrain.biome, `${terrain.id} missing biome`).toBeDefined();
      expect(terrain.modifier, `${terrain.id} missing modifier`).toBeDefined();
    }
  });
});

describe('W4-02 feature modifier annotations', () => {
  it('HILLS has modifier=rough', () => {
    expect(HILLS.modifier).toBe('rough');
  });

  it('MOUNTAINS has modifier=rough', () => {
    expect(MOUNTAINS.modifier).toBe('rough');
  });

  it('FOREST has modifier=vegetated', () => {
    expect(FOREST.modifier).toBe('vegetated');
  });

  it('JUNGLE has modifier=vegetated', () => {
    expect(JUNGLE.modifier).toBe('vegetated');
  });

  it('MARSH has modifier=wet', () => {
    expect(MARSH.modifier).toBe('wet');
  });
});

// ── 2. Tropical biome terrain definitions ────────────────────────────────────

describe('W4-02 Tropical biome terrains', () => {
  it('TROPICAL has biome=tropical, modifier=flat, food=3', () => {
    expect(TROPICAL.id).toBe('tropical');
    expect(TROPICAL.biome).toBe('tropical');
    expect(TROPICAL.modifier).toBe('flat');
    expect(TROPICAL.baseYields.food).toBe(3);
    expect(TROPICAL.isPassable).toBe(true);
    expect(TROPICAL.isWater).toBe(false);
  });

  it('RAINFOREST has biome=tropical, modifier=vegetated, production=2, science=1', () => {
    expect(RAINFOREST.id).toBe('rainforest');
    expect(RAINFOREST.biome).toBe('tropical');
    expect(RAINFOREST.modifier).toBe('vegetated');
    expect(RAINFOREST.baseYields.production).toBe(2);
    expect(RAINFOREST.baseYields.science).toBe(1);
    expect(RAINFOREST.isPassable).toBe(true);
    expect(RAINFOREST.isWater).toBe(false);
  });

  it('MANGROVE has biome=tropical, modifier=wet, production=2, science=1', () => {
    expect(MANGROVE.id).toBe('mangrove');
    expect(MANGROVE.biome).toBe('tropical');
    expect(MANGROVE.modifier).toBe('wet');
    expect(MANGROVE.baseYields.production).toBe(2);
    expect(MANGROVE.baseYields.science).toBe(1);
    expect(MANGROVE.isPassable).toBe(true);
    expect(MANGROVE.isWater).toBe(false);
  });

  it('all three tropical terrains are in ALL_BASE_TERRAINS', () => {
    const ids = ALL_BASE_TERRAINS.map(t => t.id);
    expect(ids).toContain('tropical');
    expect(ids).toContain('rainforest');
    expect(ids).toContain('mangrove');
  });
});

// ── 3. Navigable river as water tile ────────────────────────────────────────

describe('W4-02 Navigable River (F-02)', () => {
  it('NAVIGABLE_RIVER has isWater=true and biome=marine, modifier=wet', () => {
    expect(NAVIGABLE_RIVER.id).toBe('navigable_river');
    expect(NAVIGABLE_RIVER.isWater).toBe(true);
    expect(NAVIGABLE_RIVER.biome).toBe('marine');
    expect(NAVIGABLE_RIVER.modifier).toBe('wet');
  });

  it('NAVIGABLE_RIVER is impassable for land (isPassable=false)', () => {
    expect(NAVIGABLE_RIVER.isPassable).toBe(false);
  });

  it('NAVIGABLE_RIVER yields food=1 and gold=1', () => {
    expect(NAVIGABLE_RIVER.baseYields.food).toBe(1);
    expect(NAVIGABLE_RIVER.baseYields.gold).toBe(1);
  });

  it('navigable_river counts as water in MapAnalytics landRatio', () => {
    // Create a 1-tile state with navigable_river — landRatio should be 0
    const state = createTestState();
    const tile: HexTile = {
      coord: { q: 0, r: 0 },
      terrain: 'navigable_river',
      feature: null,
      resource: null,
      improvement: null,
      building: null,
      river: [],
      elevation: 0,
      continent: 1,
    };
    const tiles = new Map([[coordToKey({ q: 0, r: 0 }), tile]]);
    const ratio = landRatio({ ...state, map: { ...state.map, tiles } });
    expect(ratio).toBe(0); // navigable_river is water, so 0% land
  });

  it('navigable_river excluded from passableLandTiles', () => {
    const state = createTestState();
    const tile: HexTile = {
      coord: { q: 0, r: 0 },
      terrain: 'navigable_river',
      feature: null,
      resource: null,
      improvement: null,
      building: null,
      river: [],
      elevation: 0,
      continent: 1,
    };
    const tiles = new Map([[coordToKey({ q: 0, r: 0 }), tile]]);
    const count = passableLandTiles({ ...state, map: { ...state.map, tiles } });
    expect(count).toBe(0);
  });
});

// ── 4. Deep Ocean definition ─────────────────────────────────────────────────

describe('W4-02 Deep Ocean (F-05)', () => {
  it('DEEP_OCEAN has isDeepOcean=true, isWater=true, biome=marine', () => {
    expect(DEEP_OCEAN.id).toBe('deep_ocean');
    expect(DEEP_OCEAN.isDeepOcean).toBe(true);
    expect(DEEP_OCEAN.isWater).toBe(true);
    expect(DEEP_OCEAN.biome).toBe('marine');
  });

  it('DEEP_OCEAN is impassable by default (isPassable=false)', () => {
    expect(DEEP_OCEAN.isPassable).toBe(false);
  });

  it('DEEP_OCEAN counts as water in MapAnalytics', () => {
    const state = createTestState();
    const tile: HexTile = {
      coord: { q: 0, r: 0 },
      terrain: 'deep_ocean',
      feature: null,
      resource: null,
      improvement: null,
      building: null,
      river: [],
      elevation: 0,
      continent: 1,
    };
    const tiles = new Map([[coordToKey({ q: 0, r: 0 }), tile]]);
    const ratio = landRatio({ ...state, map: { ...state.map, tiles } });
    expect(ratio).toBe(0);
  });

  it('blocks movement without Cartography tech', () => {
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 3 })],
    ]);
    const state = createTestState({ units });
    const tiles = new Map(state.map.tiles);
    const deepOceanTile: HexTile = {
      coord: { q: 1, r: 0 },
      terrain: 'deep_ocean',
      feature: null,
      resource: null,
      improvement: null,
      building: null,
      river: [],
      elevation: 0,
      continent: 1,
    };
    tiles.set(coordToKey({ q: 1, r: 0 }), deepOceanTile);

    const next = movementSystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] },
    );
    // Should fail — no cartography
    expect(next.lastValidation).not.toBeNull();
    expect(next.lastValidation?.valid).toBe(false);
    if (next.lastValidation?.valid === false) {
      expect(next.lastValidation.reason).toContain('Deep Ocean');
    }
  });

  it('allows movement with Cartography tech and applies 15HP attrition', () => {
    const playerWithCartography = createTestPlayer({
      id: 'p1',
      researchedTechs: ['cartography'],
      masteredTechs: [],
    });
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 3, health: 100 })],
    ]);
    const state = createTestState({
      units,
      players: new Map([['p1', playerWithCartography]]),
    });
    const tiles = new Map(state.map.tiles);
    const deepOceanTile: HexTile = {
      coord: { q: 1, r: 0 },
      terrain: 'deep_ocean',
      feature: null,
      resource: null,
      improvement: null,
      building: null,
      river: [],
      elevation: 0,
      continent: 1,
    };
    tiles.set(coordToKey({ q: 1, r: 0 }), deepOceanTile);

    const next = movementSystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] },
    );
    // Should succeed
    expect(next.lastValidation).toBeNull();
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    // Attrition: 15 HP
    expect(next.units.get('u1')!.health).toBe(85);
  });

  it('allows movement with Shipbuilding mastery and applies NO attrition', () => {
    const playerWithMastery = createTestPlayer({
      id: 'p1',
      researchedTechs: ['cartography'],
      masteredTechs: ['shipbuilding'],
    });
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 3, health: 100 })],
    ]);
    const state = createTestState({
      units,
      players: new Map([['p1', playerWithMastery]]),
    });
    const tiles = new Map(state.map.tiles);
    const deepOceanTile: HexTile = {
      coord: { q: 1, r: 0 },
      terrain: 'deep_ocean',
      feature: null,
      resource: null,
      improvement: null,
      building: null,
      river: [],
      elevation: 0,
      continent: 1,
    };
    tiles.set(coordToKey({ q: 1, r: 0 }), deepOceanTile);

    const next = movementSystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] },
    );
    expect(next.lastValidation).toBeNull();
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    // No attrition with mastery
    expect(next.units.get('u1')!.health).toBe(100);
  });
});

// ── 5. Distant Lands permafog ────────────────────────────────────────────────

describe('W4-02 Distant Lands partition (F-04)', () => {
  it('Distant Lands tiles are NOT revealed when player.distantLandsReachable is false/undefined', () => {
    const player = createTestPlayer({
      id: 'p1',
      visibility: new Set(),
      explored: new Set(),
      // distantLandsReachable not set (defaults to undefined/false)
    });
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({
      units,
      players: new Map([['p1', player]]),
    });

    // Place a Distant Lands tile adjacent to unit
    const tiles = new Map(state.map.tiles);
    const distantTile: HexTile = {
      coord: { q: 1, r: 0 },
      terrain: 'grassland',
      feature: null,
      resource: null,
      improvement: null,
      building: null,
      river: [],
      elevation: 0.5,
      continent: 2,
      isDistantLands: true,
    };
    tiles.set(coordToKey({ q: 1, r: 0 }), distantTile);

    const next = visibilitySystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'START_TURN' },
    );
    const p = next.players.get('p1')!;
    // Distant Lands tile should NOT be in visibility
    expect(p.visibility.has(coordToKey({ q: 1, r: 0 }))).toBe(false);
  });

  it('Distant Lands tiles ARE revealed when player.distantLandsReachable is true', () => {
    const player = createTestPlayer({
      id: 'p1',
      visibility: new Set(),
      explored: new Set(),
      distantLandsReachable: true,
    });
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({
      units,
      players: new Map([['p1', player]]),
    });

    // Place a Distant Lands tile adjacent to unit
    const tiles = new Map(state.map.tiles);
    const distantTile: HexTile = {
      coord: { q: 1, r: 0 },
      terrain: 'grassland',
      feature: null,
      resource: null,
      improvement: null,
      building: null,
      river: [],
      elevation: 0.5,
      continent: 2,
      isDistantLands: true,
    };
    tiles.set(coordToKey({ q: 1, r: 0 }), distantTile);

    const next = visibilitySystem(
      { ...state, map: { ...state.map, tiles } },
      { type: 'START_TURN' },
    );
    const p = next.players.get('p1')!;
    // Distant Lands tile SHOULD be in visibility
    expect(p.visibility.has(coordToKey({ q: 1, r: 0 }))).toBe(true);
  });

  it('non-Distant-Lands tiles are always revealed regardless of distantLandsReachable', () => {
    const player = createTestPlayer({
      id: 'p1',
      visibility: new Set(),
      explored: new Set(),
      // distantLandsReachable not set
    });
    const units = new Map([
      ['u1', createTestUnit({ id: 'u1', position: { q: 0, r: 0 }, movementLeft: 2 })],
    ]);
    const state = createTestState({
      units,
      players: new Map([['p1', player]]),
    });

    const next = visibilitySystem(state, { type: 'START_TURN' });
    const p = next.players.get('p1')!;
    // Regular tiles should be visible
    expect(p.visibility.has(coordToKey({ q: 0, r: 0 }))).toBe(true);
    expect(p.visibility.has(coordToKey({ q: 1, r: 0 }))).toBe(true);
  });
});
