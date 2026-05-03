import { describe, expect, it } from 'vitest';
import {
  buildInitialDistrictHPs,
  getDistrictCurrentBonusHP,
  getEffectiveDistrictHPs,
  getStationedCommanderDistrictHpBonus,
  hasStandingOuterDistricts,
} from '../DistrictSiege';
import type { CityState } from '../../types/GameState';
import type { CommanderState } from '../../types/Commander';
import { createTestPlayer, createTestState, createTestUnit } from '../../systems/__tests__/helpers';

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

function makeCommander(promotions: ReadonlyArray<string>): CommanderState {
  return {
    unitId: 'cmd1',
    xp: 300,
    commanderLevel: 4,
    unspentPromotionPicks: 0,
    promotions,
    tree: 'bastion',
    attachedUnits: [],
    packed: false,
  };
}

function makeState(city: CityState, options: {
  readonly commanderOwner?: string;
  readonly commanderPosition?: { q: number; r: number };
  readonly commanderPromotions?: ReadonlyArray<string>;
  readonly commanderUnitPromotions?: ReadonlyArray<string>;
} = {}) {
  const commanderOwner = options.commanderOwner ?? 'p2';
  const units = new Map([
    ['cmd1', createTestUnit({
      id: 'cmd1',
      owner: commanderOwner,
      typeId: 'captain',
      position: options.commanderPosition ?? city.position,
      promotions: options.commanderUnitPromotions ?? [],
      health: 100,
    })],
  ]);
  return createTestState({
    players: new Map([
      ['p1', createTestPlayer({ id: 'p1' })],
      ['p2', createTestPlayer({ id: 'p2' })],
    ]),
    units,
    cities: new Map([[city.id, city]]),
    commanders: new Map([['cmd1', makeCommander(options.commanderPromotions ?? ['bastion_garrison'])]]),
  });
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

  it('grants Garrison district HP when the defender commander is on the city center', () => {
    const city = makeCity({
      districtHPs: new Map([['4,3', 200], ['5,3', 100]]),
    });

    const state = makeState(city);

    expect(getStationedCommanderDistrictHpBonus(state, city)).toBe(10);
    expect(getEffectiveDistrictHPs(state, city)).toEqual(new Map([
      ['4,3', 210],
      ['5,3', 110],
    ]));
  });

  it('uses the remaining Garrison bonus layer without granting it repeatedly', () => {
    const city = makeCity({
      districtHPs: new Map([['4,3', 200], ['5,3', 100]]),
      districtBonusHPs: new Map([['5,3', 4]]),
    });

    const state = makeState(city);

    expect(getDistrictCurrentBonusHP(city, '5,3', 10, 100)).toBe(4);
    expect(getEffectiveDistrictHPs(state, city).get('5,3')).toBe(104);
  });

  it('does not resurrect destroyed districts with Garrison bonus HP', () => {
    const city = makeCity({
      districtHPs: new Map([['4,3', 200], ['5,3', 0]]),
    });

    const state = makeState(city);

    expect(getEffectiveDistrictHPs(state, city).get('5,3')).toBe(0);
  });

  it('requires the Garrison commander to belong to the city owner and occupy the center', () => {
    const city = makeCity({
      districtHPs: new Map([['4,3', 200], ['5,3', 100]]),
    });

    expect(getStationedCommanderDistrictHpBonus(makeState(city, {
      commanderOwner: 'p1',
    }), city)).toBe(0);
    expect(getStationedCommanderDistrictHpBonus(makeState(city, {
      commanderPosition: { q: 5, r: 3 },
    }), city)).toBe(0);
    expect(getStationedCommanderDistrictHpBonus(makeState(city, {
      commanderPromotions: [],
      commanderUnitPromotions: ['bastion_garrison'],
    }), city)).toBe(10);
  });
});
