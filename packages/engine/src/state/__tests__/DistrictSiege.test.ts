import { describe, expect, it } from 'vitest';
import { buildInitialDistrictHPs, hasStandingOuterDistricts } from '../DistrictSiege';
import type { CityState } from '../../types/GameState';

function makeCity(overrides: Partial<CityState> = {}): CityState {
  return {
    id: 'c1',
    name: 'Enemy City',
    owner: 'p2',
    position: { q: 4, r: 3 },
    population: 3,
    food: 0,
    productionQueue: [],
    productionProgress: 0,
    buildings: [],
    territory: ['4,3', '5,3'],
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

describe('DistrictSiege', () => {
  it('initializes city-center and outer urban district HP pools', () => {
    const city = makeCity({
      urbanTiles: new Map([[
        '5,3',
        {
          cityId: 'c1',
          coord: { q: 5, r: 3 },
          buildings: ['walls'],
          specialistCount: 0,
          specialistCapPerTile: 1,
          walled: true,
        },
      ]]),
    });

    expect(buildInitialDistrictHPs(city)).toEqual(new Map([
      ['4,3', 200],
      ['5,3', 100],
    ]));
  });

  it('detects standing outer districts from explicit HP state', () => {
    const city = makeCity({
      districtHPs: new Map([['4,3', 200], ['5,3', 100]]),
    });

    expect(hasStandingOuterDistricts(city)).toBe(true);
  });

  it('treats destroyed outer districts as cleared for city-center attack', () => {
    const city = makeCity({
      districtHPs: new Map([['4,3', 200], ['5,3', 0]]),
    });

    expect(hasStandingOuterDistricts(city)).toBe(false);
  });
});
