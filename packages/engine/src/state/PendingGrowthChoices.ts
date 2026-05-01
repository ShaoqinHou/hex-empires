import type { PendingGrowthChoice } from '../types/GameState';

export function removeOnePendingGrowthChoice(
  choices: ReadonlyArray<PendingGrowthChoice> | undefined,
  cityId: string,
): ReadonlyArray<PendingGrowthChoice> {
  let removed = false;
  const next: PendingGrowthChoice[] = [];

  for (const choice of choices ?? []) {
    if (!removed && choice.cityId === cityId) {
      removed = true;
      continue;
    }
    next.push(choice);
  }

  return next;
}
