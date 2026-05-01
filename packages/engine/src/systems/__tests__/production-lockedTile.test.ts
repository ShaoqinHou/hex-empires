import { describe, it, expect } from 'vitest';
import { productionSystem } from '../productionSystem';
import { createTestState, createTestPlayer } from './helpers';
import type { CityState, HexTile, ProductionItem } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

/**
 * Cycle 1 of the building-placement rework — coverage for
 * `ProductionItem.lockedTile` auto-placement on completion.
 *
 * See `.codex/workflow/design/building-placement-rework.md` §3.3 and §6.1.
 */

const CITY_POSITION = { q: 3, r: 3 };
const TERRITORY_TILES = [
  { q: 3, r: 3 }, // centre
  { q: 4, r: 3 },
  { q: 3, r: 4 },
  { q: 2, r: 4 },
  { q: 2, r: 3 },
  { q: 3, r: 2 },
  { q: 4, r: 2 },
];

function createTestCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Rome',
    owner: 'p1',
    position: CITY_POSITION,
    population: 5,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: TERRITORY_TILES.map(coordToKey),
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

/** Patch a specific tile on the base test map. */
function patchTile(
  state: ReturnType<typeof createTestState>,
  coord: { q: number; r: number },
  patch: Partial<HexTile>,
): ReturnType<typeof createTestState> {
  const key = coordToKey(coord);
  const tiles = new Map(state.map.tiles);
  const existing = tiles.get(key)!;
  tiles.set(key, { ...existing, ...patch });
  return { ...state, map: { ...state.map, tiles } };
}

describe('productionSystem — ProductionItem.lockedTile auto-placement (Cycle 1)', () => {
  describe('auto-place on completion', () => {
    it('writes the building onto the locked tile when production completes', () => {
      const lockedTile = { q: 4, r: 3 };
      const city = createTestCity({
        productionQueue: [
          { type: 'building', id: 'granary', lockedTile } as ProductionItem,
        ],
        productionProgress: 54, // granary costs 55 — any production completes it
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });

      const updatedCity = next.cities.get('c1')!;
      const placedTile = next.map.tiles.get(coordToKey(lockedTile))!;

      // Building appended to city.buildings as before
      expect(updatedCity.buildings).toContain('granary');
      // Queue cleared
      expect(updatedCity.productionQueue.length).toBe(0);
      // Tile now carries the building
      expect(placedTile.building).toBe('granary');
      // A log entry for placement was emitted
      const placeLog = next.log.find((e) => e.message.includes('Placed'));
      expect(placeLog).toBeDefined();
      expect(placeLog!.message).toContain('(4, 3)');
    });

    it('leaves other territory tiles unchanged when auto-placing', () => {
      const lockedTile = { q: 4, r: 3 };
      const otherTile = { q: 3, r: 4 };
      const city = createTestCity({
        productionQueue: [
          { type: 'building', id: 'granary', lockedTile } as ProductionItem,
        ],
        productionProgress: 54,
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });

      const placed = next.map.tiles.get(coordToKey(lockedTile))!;
      const untouched = next.map.tiles.get(coordToKey(otherTile))!;
      expect(placed.building).toBe('granary');
      expect(untouched.building ?? null).toBe(null);
    });

    it('preserves existing tile fields (terrain, resource, elevation) when auto-placing', () => {
      const lockedTile = { q: 4, r: 3 };
      const city = createTestCity({
        productionQueue: [
          { type: 'building', id: 'library', lockedTile } as ProductionItem,
        ],
        productionProgress: 89, // library costs 90
      });
      const base = createTestState({ cities: new Map([['c1', city]]) });
      // Mark the target tile with a distinguishing field so we can prove
      // the auto-place merges rather than clobbers.
      const state = patchTile(base, lockedTile, { resource: 'iron', elevation: 0.87 });
      const next = productionSystem(state, { type: 'END_TURN' });

      const placed = next.map.tiles.get(coordToKey(lockedTile))!;
      expect(placed.building).toBe('library');
      expect(placed.resource).toBe('iron');
      expect(placed.elevation).toBe(0.87);
      expect(placed.terrain).toBe('grassland'); // unchanged from base
    });
  });

  describe('safe fallback when lockedTile is invalid', () => {
    it('does NOT auto-place when the locked tile already has a building', () => {
      const lockedTile = { q: 4, r: 3 };
      const city = createTestCity({
        productionQueue: [
          { type: 'building', id: 'library', lockedTile } as ProductionItem,
        ],
        productionProgress: 89,
      });
      const base = createTestState({ cities: new Map([['c1', city]]) });
      // Tile is already occupied by a different building.
      const state = patchTile(base, lockedTile, { building: 'granary' });
      const next = productionSystem(state, { type: 'END_TURN' });

      const updatedCity = next.cities.get('c1')!;
      const tile = next.map.tiles.get(coordToKey(lockedTile))!;

      // Legacy "completed but not placed" fallback: building added to city,
      // queue cleared, but the tile is NOT overwritten with the new building.
      expect(updatedCity.buildings).toContain('library');
      expect(updatedCity.productionQueue.length).toBe(0);
      expect(tile.building).toBe('granary'); // untouched
      // No placement log should have fired
      const placeLog = next.log.find((e) => e.message.startsWith('Placed '));
      expect(placeLog).toBeUndefined();
    });

    it('does NOT auto-place when the locked tile is outside city territory', () => {
      const outOfTerritory = { q: 9, r: 9 };
      const city = createTestCity({
        productionQueue: [
          { type: 'building', id: 'granary', lockedTile: outOfTerritory } as ProductionItem,
        ],
        productionProgress: 54,
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });

      const updatedCity = next.cities.get('c1')!;
      // Building completes (city list has it) but map tile stays clean.
      expect(updatedCity.buildings).toContain('granary');
      const foreignTile = next.map.tiles.get(coordToKey(outOfTerritory));
      // The tile may or may not exist in the base map; either way, no granary.
      expect(foreignTile?.building ?? null).toBe(null);
    });

    it('does not throw when the locked tile does not exist on the map', () => {
      const ghostTile = { q: 999, r: 999 };
      const city = createTestCity({
        productionQueue: [
          { type: 'building', id: 'granary', lockedTile: ghostTile } as ProductionItem,
        ],
        productionProgress: 54,
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      expect(() => productionSystem(state, { type: 'END_TURN' })).not.toThrow();
      const next = productionSystem(state, { type: 'END_TURN' });
      expect(next.cities.get('c1')!.buildings).toContain('granary');
    });
  });

  describe('legacy queue items (no lockedTile) — regression guard', () => {
    it('completes a building without lockedTile using the legacy path (no tile write)', () => {
      const city = createTestCity({
        productionQueue: [
          { type: 'building', id: 'granary' } as ProductionItem, // no lockedTile
        ],
        productionProgress: 54,
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });

      const updatedCity = next.cities.get('c1')!;
      expect(updatedCity.buildings).toContain('granary');
      expect(updatedCity.productionQueue.length).toBe(0);

      // No map tile in the city's territory should have gained a building.
      for (const tileKey of updatedCity.territory) {
        const tile = next.map.tiles.get(tileKey);
        expect(tile?.building ?? null).toBe(null);
      }
    });

    it('unit production is unaffected by the lockedTile path', () => {
      const city = createTestCity({
        productionQueue: [{ type: 'unit', id: 'warrior' } as ProductionItem],
        productionProgress: 29,
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });

      const newWarriors = [...next.units.values()].filter((u) => u.typeId === 'warrior');
      expect(newWarriors.length).toBe(1);
      expect(newWarriors[0].position).toEqual(CITY_POSITION);
      // No placement log for a unit
      const placeLog = next.log.find((e) => e.message.startsWith('Placed '));
      expect(placeLog).toBeUndefined();
    });

    it('lockedTile is ignored for unit queue items (defence-in-depth)', () => {
      // Even if an ill-formed queue item somehow ships with a lockedTile on a
      // unit, the unit path must not touch the map.
      const lockedTile = { q: 4, r: 3 };
      const city = createTestCity({
        productionQueue: [
          { type: 'unit', id: 'warrior', lockedTile } as ProductionItem,
        ],
        productionProgress: 29,
      });
      const state = createTestState({ cities: new Map([['c1', city]]) });
      const next = productionSystem(state, { type: 'END_TURN' });

      const tile = next.map.tiles.get(coordToKey(lockedTile))!;
      expect(tile.building ?? null).toBe(null);
    });
  });

  describe('purity / immutability', () => {
    it('does not mutate the input state when auto-placing', () => {
      const lockedTile = { q: 4, r: 3 };
      const city = createTestCity({
        productionQueue: [
          { type: 'building', id: 'granary', lockedTile } as ProductionItem,
        ],
        productionProgress: 54,
      });
      const state = createTestState({
        cities: new Map([['c1', city]]),
        players: new Map([['p1', createTestPlayer({ id: 'p1' })]]),
      });

      const beforeBuildings = [...state.cities.get('c1')!.buildings];
      const beforeTile = state.map.tiles.get(coordToKey(lockedTile))!;
      const beforeTileBuilding = beforeTile.building ?? null;

      productionSystem(state, { type: 'END_TURN' });

      // Input state untouched
      expect([...state.cities.get('c1')!.buildings]).toEqual(beforeBuildings);
      expect(state.map.tiles.get(coordToKey(lockedTile))!.building ?? null).toBe(beforeTileBuilding);
    });
  });
});
