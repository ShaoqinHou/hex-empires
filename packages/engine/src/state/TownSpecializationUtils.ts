import type { CityState, TownSpecialization } from '../types/GameState';

const FORT_TOWN_DEFENSE_HP_BONUS = 5;

export function transitionFortTownDefenseHP(
  city: CityState,
  nextSpecialization: TownSpecialization | null,
): number {
  const wasFortTown = city.specialization === 'fort_town';
  const isFortTown = nextSpecialization === 'fort_town';
  if (wasFortTown === isFortTown) return city.defenseHP;
  if (isFortTown) return city.defenseHP + FORT_TOWN_DEFENSE_HP_BONUS;
  return Math.max(0, city.defenseHP - FORT_TOWN_DEFENSE_HP_BONUS);
}

export function clearTownSpecializationState(city: CityState): CityState {
  return {
    ...city,
    specialization: null,
    lockedTownSpecialization: null,
    defenseHP: transitionFortTownDefenseHP(city, null),
  };
}
