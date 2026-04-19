import { describe, it, expect } from 'vitest';
import type {
  DistrictKindV2,
  UrbanTileV2,
  RuralTileV2,
  QuarterKindV2,
  QuarterV2,
  CitySpatialV2,
  DistrictOverhaulStateV2,
  PlaceUrbanBuildingActionV2,
  DemolishBuildingActionV2,
  AssignRuralWorkerActionV2,
  UnassignRuralWorkerActionV2,
  AssignUrbanSpecialistActionV2,
  UnassignUrbanSpecialistActionV2,
  DistrictOverhaulActionV2,
} from '../../types/DistrictOverhaul';

/**
 * Compile-time type-shape checks for the District Overhaul (Cycle A).
 *
 * These tests do not exercise behavior — Cycle A contributes types only.
 * Each test constructs a concrete instance of a new type and asserts a
 * load-bearing field so that the TypeScript compiler validates the shape.
 * If any interface drifts from its intended shape, these tests will stop
 * compiling, acting as a guard against accidental changes.
 */
describe('DistrictOverhaul types (Cycle A — compile-time shape guards)', () => {
  it('DistrictKindV2 accepts "rural" and "urban"', () => {
    const rural: DistrictKindV2 = 'rural';
    const urban: DistrictKindV2 = 'urban';
    expect(rural).toBe('rural');
    expect(urban).toBe('urban');
  });

  it('UrbanTileV2 constructs with buildings, specialistCount, specialistCapPerTile, and walled flag (W3-02)', () => {
    const tile: UrbanTileV2 = {
      cityId: 'c1',
      coord: { q: 2, r: 3 },
      buildings: ['granary', 'library'],
      specialistCount: 1,
      specialistCapPerTile: 1,
      walled: false,
    };
    expect(tile.cityId).toBe('c1');
    expect(tile.coord).toEqual({ q: 2, r: 3 });
    expect(tile.buildings.length).toBe(2);
    expect(tile.specialistCount).toBe(1);
    expect(tile.specialistCapPerTile).toBe(1);
    expect(tile.walled).toBe(false);
  });

  it('RuralTileV2 constructs with optional improvement and worker flag', () => {
    const tile: RuralTileV2 = {
      cityId: 'c1',
      coord: { q: -1, r: 4 },
      improvement: 'farm',
      workerAssigned: true,
    };
    expect(tile.improvement).toBe('farm');
    expect(tile.workerAssigned).toBe(true);

    const unworked: RuralTileV2 = {
      cityId: 'c1',
      coord: { q: 0, r: 5 },
      improvement: null,
      workerAssigned: false,
    };
    expect(unworked.improvement).toBeNull();
  });

  it('QuarterKindV2 accepts pure_age, unique_quarter, ageless_pair (W3-02)', () => {
    const pure: QuarterKindV2 = 'pure_age';
    const unique: QuarterKindV2 = 'unique_quarter';
    const ageless: QuarterKindV2 = 'ageless_pair';
    expect([pure, unique, ageless]).toEqual(['pure_age', 'unique_quarter', 'ageless_pair']);
  });

  it('QuarterV2 constructs with age, kind, and building ids', () => {
    const quarter: QuarterV2 = {
      cityId: 'c1',
      coord: { q: 2, r: 3 },
      age: 'antiquity',
      kind: 'pure_age',
      buildingIds: ['granary', 'library'],
    };
    expect(quarter.age).toBe('antiquity');
    expect(quarter.kind).toBe('pure_age');
    expect(quarter.buildingIds.length).toBe(2);

    const agelessQuarter: QuarterV2 = {
      cityId: 'c1',
      coord: { q: 3, r: 3 },
      age: 'ageless',
      kind: 'ageless_pair',
      buildingIds: ['walls'],
    };
    expect(agelessQuarter.age).toBe('ageless');
  });

  it('CitySpatialV2 constructs with typed urban, rural, quarters, and cap', () => {
    const urbanTile: UrbanTileV2 = {
      cityId: 'c1',
      coord: { q: 0, r: 0 },
      buildings: [],
      specialistCount: 0,
      specialistCapPerTile: 1,
      walled: false,
    };
    const ruralTile: RuralTileV2 = {
      cityId: 'c1',
      coord: { q: 1, r: 0 },
      improvement: null,
      workerAssigned: false,
    };
    const spatial: CitySpatialV2 = {
      cityId: 'c1',
      urbanTiles: new Map([['0,0', urbanTile]]),
      ruralTiles: new Map([['1,0', ruralTile]]),
      quarters: [],
      urbanTileCap: 3,
    };
    expect(spatial.urbanTiles.size).toBe(1);
    expect(spatial.ruralTiles.size).toBe(1);
    expect(spatial.quarters.length).toBe(0);
    expect(spatial.urbanTileCap).toBe(3);
  });

  it('DistrictOverhaulStateV2 holds a per-city spatial map', () => {
    const state: DistrictOverhaulStateV2 = {
      byCity: new Map(),
    };
    expect(state.byCity.size).toBe(0);
  });

  it('PlaceUrbanBuildingActionV2 has correct discriminator', () => {
    const action: PlaceUrbanBuildingActionV2 = {
      type: 'PLACE_URBAN_BUILDING',
      cityId: 'c1',
      tile: { q: 0, r: 0 },
      buildingId: 'granary',
    };
    expect(action.type).toBe('PLACE_URBAN_BUILDING');
    expect(action.buildingId).toBe('granary');
  });

  it('DemolishBuildingActionV2 has correct discriminator', () => {
    const action: DemolishBuildingActionV2 = {
      type: 'DEMOLISH_BUILDING',
      cityId: 'c1',
      tile: { q: 0, r: 0 },
      buildingId: 'monument',
    };
    expect(action.type).toBe('DEMOLISH_BUILDING');
  });

  it('Rural worker actions have correct discriminators', () => {
    const assign: AssignRuralWorkerActionV2 = {
      type: 'ASSIGN_RURAL_WORKER',
      cityId: 'c1',
      tile: { q: 1, r: 0 },
    };
    const unassign: UnassignRuralWorkerActionV2 = {
      type: 'UNASSIGN_RURAL_WORKER',
      cityId: 'c1',
      tile: { q: 1, r: 0 },
    };
    expect(assign.type).toBe('ASSIGN_RURAL_WORKER');
    expect(unassign.type).toBe('UNASSIGN_RURAL_WORKER');
  });

  it('Urban specialist actions have correct discriminators', () => {
    const assign: AssignUrbanSpecialistActionV2 = {
      type: 'ASSIGN_URBAN_SPECIALIST',
      cityId: 'c1',
      tile: { q: 0, r: 0 },
    };
    const unassign: UnassignUrbanSpecialistActionV2 = {
      type: 'UNASSIGN_URBAN_SPECIALIST',
      cityId: 'c1',
      tile: { q: 0, r: 0 },
    };
    expect(assign.type).toBe('ASSIGN_URBAN_SPECIALIST');
    expect(unassign.type).toBe('UNASSIGN_URBAN_SPECIALIST');
  });

  it('DistrictOverhaulActionV2 union narrows on discriminator', () => {
    const actions: ReadonlyArray<DistrictOverhaulActionV2> = [
      { type: 'PLACE_URBAN_BUILDING', cityId: 'c1', tile: { q: 0, r: 0 }, buildingId: 'granary' },
      { type: 'DEMOLISH_BUILDING', cityId: 'c1', tile: { q: 0, r: 0 }, buildingId: 'granary' },
      { type: 'ASSIGN_RURAL_WORKER', cityId: 'c1', tile: { q: 1, r: 0 } },
      { type: 'UNASSIGN_RURAL_WORKER', cityId: 'c1', tile: { q: 1, r: 0 } },
      { type: 'ASSIGN_URBAN_SPECIALIST', cityId: 'c1', tile: { q: 0, r: 0 } },
      { type: 'UNASSIGN_URBAN_SPECIALIST', cityId: 'c1', tile: { q: 0, r: 0 } },
    ];
    // Exhaustiveness: switch should narrow on discriminator with no default required.
    for (const a of actions) {
      switch (a.type) {
        case 'PLACE_URBAN_BUILDING':
          expect(a.buildingId).toBeDefined();
          break;
        case 'DEMOLISH_BUILDING':
          expect(a.buildingId).toBeDefined();
          break;
        case 'ASSIGN_RURAL_WORKER':
        case 'UNASSIGN_RURAL_WORKER':
        case 'ASSIGN_URBAN_SPECIALIST':
        case 'UNASSIGN_URBAN_SPECIALIST':
          expect(a.tile).toBeDefined();
          break;
      }
    }
    expect(actions.length).toBe(6);
  });
});
