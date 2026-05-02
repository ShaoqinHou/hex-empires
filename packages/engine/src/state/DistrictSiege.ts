import { coordToKey } from '../hex/HexMath';
import type { CityState } from '../types/GameState';

export const CITY_CENTER_DISTRICT_HP = 200;
export const URBAN_DISTRICT_HP = 100;

export function getCityCenterDistrictKey(city: CityState): string {
  return coordToKey(city.position);
}

export function buildInitialDistrictHPs(city: CityState): Map<string, number> {
  const hps = new Map<string, number>();
  const centerKey = getCityCenterDistrictKey(city);
  hps.set(centerKey, CITY_CENTER_DISTRICT_HP);

  if (city.urbanTiles) {
    for (const [tileKey] of city.urbanTiles) {
      if (tileKey !== centerKey) {
        hps.set(tileKey, URBAN_DISTRICT_HP);
      }
    }
  }

  return hps;
}

export function getDistrictHPs(city: CityState): Map<string, number> {
  return city.districtHPs ? new Map(city.districtHPs) : buildInitialDistrictHPs(city);
}

export function hasStandingOuterDistricts(city: CityState): boolean {
  const cityCenter = getCityCenterDistrictKey(city);
  for (const [key, hp] of getDistrictHPs(city)) {
    if (key !== cityCenter && hp > 0) return true;
  }
  return false;
}
