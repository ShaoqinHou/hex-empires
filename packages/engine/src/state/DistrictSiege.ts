import { coordToKey } from '../hex/HexMath';
import type { CityState, GameState, UnitState } from '../types/GameState';
import type { CommanderState } from '../types/Commander';

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

export function getDistrictHpBonusByTile(state: GameState, city: CityState): Map<string, number> {
  const bonus = getStationedCommanderDistrictHpBonus(state, city);
  if (bonus <= 0) return new Map();

  const bonuses = new Map<string, number>();
  for (const [districtTile, hp] of getDistrictHPs(city)) {
    if (hp > 0) bonuses.set(districtTile, bonus);
  }
  return bonuses;
}

export function getEffectiveDistrictHPs(state: GameState, city: CityState): Map<string, number> {
  const districtHPs = getDistrictHPs(city);
  const bonusByTile = getDistrictHpBonusByTile(state, city);
  const effectiveHPs = new Map<string, number>();

  for (const [districtTile, hp] of districtHPs) {
    if (hp <= 0) {
      effectiveHPs.set(districtTile, 0);
      continue;
    }

    const activeBonus = bonusByTile.get(districtTile) ?? 0;
    const storedBonus = city.districtBonusHPs?.get(districtTile);
    const currentBonus = activeBonus > 0 ? Math.min(activeBonus, storedBonus ?? activeBonus) : 0;
    effectiveHPs.set(districtTile, hp + currentBonus);
  }

  return effectiveHPs;
}

export function getEffectiveDistrictHP(
  state: GameState,
  city: CityState,
  districtTile: string,
): number {
  return getEffectiveDistrictHPs(state, city).get(districtTile) ?? 0;
}

export function cityUsesDistrictSiegeModel(state: GameState, city: CityState): boolean {
  return city.districtHPs !== undefined
    || city.urbanTiles !== undefined
    || getStationedCommanderDistrictHpBonus(state, city) > 0;
}

export function hasStandingCityCenterDistrict(state: GameState, city: CityState): boolean {
  if (!cityUsesDistrictSiegeModel(state, city)) return false;
  return getEffectiveDistrictHP(state, city, getCityCenterDistrictKey(city)) > 0;
}

export function getDistrictCurrentBonusHP(
  city: CityState,
  districtTile: string,
  activeBonus: number,
  baseHP: number,
): number {
  if (baseHP <= 0 || activeBonus <= 0) return 0;
  const storedBonus = city.districtBonusHPs?.get(districtTile);
  return Math.min(activeBonus, storedBonus ?? activeBonus);
}

export function getStationedCommanderDistrictHpBonus(state: GameState, city: CityState): number {
  if (!state.commanders) return 0;

  const cityCenter = getCityCenterDistrictKey(city);
  let bonus = 0;
  for (const [commanderId, commanderState] of state.commanders) {
    const commanderUnit = state.units.get(commanderId);
    if (!commanderUnit) continue;
    if (commanderUnit.health <= 0) continue;
    if (commanderUnit.owner !== city.owner) continue;
    if (coordToKey(commanderUnit.position) !== cityCenter) continue;

    for (const promotionId of getCommanderPromotionIds(commanderUnit, commanderState)) {
      const promotion = state.config.commanderPromotions?.get(promotionId);
      if (promotion?.aura.type !== 'AURA_DISTRICT_HP_BONUS') continue;
      if (promotion.aura.requiresCommanderOnCityCenter !== true) continue;
      bonus = Math.max(bonus, promotion.aura.value);
    }
  }

  return bonus;
}

export function hasStandingOuterDistricts(city: CityState): boolean {
  const cityCenter = getCityCenterDistrictKey(city);
  for (const [key, hp] of getDistrictHPs(city)) {
    if (key !== cityCenter && hp > 0) return true;
  }
  return false;
}

function getCommanderPromotionIds(
  commanderUnit: UnitState,
  commanderState: CommanderState,
): ReadonlySet<string> {
  return new Set([
    ...commanderState.promotions,
    ...commanderUnit.promotions,
  ]);
}
