import type { ResourceDef, ResourceBonusRow } from '../types/Resource';
import type { Age } from '../types/GameState';
import type { YieldSet } from '../types/Yields';
import { EMPTY_YIELDS } from '../types/Yields';

/**
 * Returns the per-age bonus row for a resource at the given age.
 * If the resource has no bonusTable or no entry for the age, returns undefined.
 *
 * Civ VII: every resource has an age-keyed bonus table (F-02). The row contains
 * yield deltas, happiness, and combat strength modifiers that apply when the
 * resource is owned/assigned.
 */
export function getResourceBonusRow(
  resource: ResourceDef,
  age: Age,
): ResourceBonusRow | undefined {
  return resource.bonusTable?.[age];
}

/**
 * Returns the yield bonus from a resource's per-age bonus table for the given age.
 * If the resource has no bonusTable entry for the age, returns an empty YieldSet.
 *
 * Use this when you need only the yield component of the bonus row (not happiness
 * or combat strength modifiers).
 *
 * Example:
 *   getResourceYieldForAge(IRON, 'antiquity')  → { production: 0, ... } (no yield bonus; IRON is a combatMod)
 *   getResourceYieldForAge(SILK, 'antiquity')  → { gold: 1, ... }
 *   getResourceYieldForAge(WHEAT, 'modern')    → { food: 2, ... }
 */
export function getResourceYieldForAge(
  resource: ResourceDef,
  age: Age,
): YieldSet {
  const row = getResourceBonusRow(resource, age);
  if (!row?.yields) return { ...EMPTY_YIELDS };
  return {
    ...EMPTY_YIELDS,
    ...row.yields,
  };
}

/**
 * Returns the happiness bonus from a resource's per-age bonus table for the given age.
 * If the resource has no happiness in its bonus row for the age, returns 0.
 */
export function getResourceHappinessForAge(
  resource: ResourceDef,
  age: Age,
): number {
  return getResourceBonusRow(resource, age)?.happiness ?? 0;
}
