import { describe, it, expect } from 'vitest';
import { productionSystem } from '../productionSystem';
import { createTestState } from './helpers';
import type { CityState, ProductionItem } from '../../types/GameState';
import { coordToKey } from '../../hex/HexMath';

/**
 * Cycle 2 of the building-placement rework — coverage for the
 * `CANCEL_BUILDING_PLACEMENT` action.
 *
 * See `.codex/workflow/design/building-placement-rework.md` §2.2 and §3.4.
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

describe('productionSystem — CANCEL_BUILDING_PLACEMENT (Cycle 2)', () => {
  it('cancels a queued building with lockedTile when progress is below threshold', () => {
    const lockedTile = { q: 4, r: 3 };
    const city = createTestCity({
      productionQueue: [
        { type: 'building', id: 'library', lockedTile } as ProductionItem,
      ],
      productionProgress: 5, // well below the 10-point floor
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = productionSystem(state, {
      type: 'CANCEL_BUILDING_PLACEMENT',
      cityId: 'c1',
    });

    const updated = next.cities.get('c1')!;
    expect(updated.productionQueue.length).toBe(0);
    expect(updated.productionProgress).toBe(0);
    // Input is untouched (purity check)
    expect(state.cities.get('c1')!.productionQueue.length).toBe(1);
    expect(state.cities.get('c1')!.productionProgress).toBe(5);
  });

  it('cancels a queued wonder with lockedTile when progress is below threshold', () => {
    const lockedTile = { q: 3, r: 4 };
    const city = createTestCity({
      productionQueue: [
        { type: 'wonder', id: 'pyramids', lockedTile } as ProductionItem,
      ],
      productionProgress: 0,
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = productionSystem(state, {
      type: 'CANCEL_BUILDING_PLACEMENT',
      cityId: 'c1',
    });

    const updated = next.cities.get('c1')!;
    expect(updated.productionQueue.length).toBe(0);
    expect(updated.productionProgress).toBe(0);
  });

  it('returns state unchanged when progress is past the threshold', () => {
    const lockedTile = { q: 4, r: 3 };
    const city = createTestCity({
      productionQueue: [
        { type: 'building', id: 'library', lockedTile } as ProductionItem,
      ],
      // Threshold has a 10-point floor; 50 is comfortably past for a small test city.
      productionProgress: 50,
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = productionSystem(state, {
      type: 'CANCEL_BUILDING_PLACEMENT',
      cityId: 'c1',
    });

    expect(next).toBe(state);
  });

  it('returns state unchanged when the head of the queue is a unit', () => {
    const city = createTestCity({
      productionQueue: [
        { type: 'unit', id: 'warrior' } as ProductionItem,
      ],
      productionProgress: 2,
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = productionSystem(state, {
      type: 'CANCEL_BUILDING_PLACEMENT',
      cityId: 'c1',
    });

    expect(next).toBe(state);
  });

  it('returns state unchanged when the head building has no lockedTile (legacy queue)', () => {
    const city = createTestCity({
      productionQueue: [
        { type: 'building', id: 'granary' } as ProductionItem, // no lockedTile
      ],
      productionProgress: 0,
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = productionSystem(state, {
      type: 'CANCEL_BUILDING_PLACEMENT',
      cityId: 'c1',
    });

    expect(next).toBe(state);
  });

  it('returns state unchanged when the cityId is unknown', () => {
    const lockedTile = { q: 4, r: 3 };
    const city = createTestCity({
      productionQueue: [
        { type: 'building', id: 'library', lockedTile } as ProductionItem,
      ],
      productionProgress: 3,
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = productionSystem(state, {
      type: 'CANCEL_BUILDING_PLACEMENT',
      cityId: 'does-not-exist',
    });

    expect(next).toBe(state);
    expect(next.cities.get('c1')!.productionQueue.length).toBe(1);
  });

  it('returns state unchanged when the production queue is empty', () => {
    const city = createTestCity({
      productionQueue: [],
      productionProgress: 0,
    });
    const state = createTestState({ cities: new Map([['c1', city]]) });

    const next = productionSystem(state, {
      type: 'CANCEL_BUILDING_PLACEMENT',
      cityId: 'c1',
    });

    expect(next).toBe(state);
  });
});
