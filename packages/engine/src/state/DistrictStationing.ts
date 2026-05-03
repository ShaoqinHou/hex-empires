import { coordToKey } from '../hex/HexMath';
import type { GameState, UnitState } from '../types/GameState';

type PositionedUnit = Pick<UnitState, 'position'>;

export function findDistrictStationedCityId(
  state: GameState,
  unit: PositionedUnit,
): string | null {
  const unitKey = coordToKey(unit.position);

  for (const district of state.districts.values()) {
    if (coordToKey(district.position) === unitKey) return district.cityId;
  }

  for (const city of state.cities.values()) {
    if (coordToKey(city.position) === unitKey) return city.id;
    if (city.urbanTiles?.has(unitKey)) return city.id;
  }

  return null;
}

export function unitIsStationedOnDistrict(
  state: GameState,
  unit: PositionedUnit,
): boolean {
  return findDistrictStationedCityId(state, unit) !== null;
}
