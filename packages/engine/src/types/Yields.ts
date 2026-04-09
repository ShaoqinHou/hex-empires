export type YieldType = 'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith';

/** A set of yields — all values default to 0 if omitted */
export interface YieldSet {
  readonly food: number;
  readonly production: number;
  readonly gold: number;
  readonly science: number;
  readonly culture: number;
  readonly faith: number;
}

export const EMPTY_YIELDS: YieldSet = {
  food: 0,
  production: 0,
  gold: 0,
  science: 0,
  culture: 0,
  faith: 0,
} as const;

export function addYields(a: YieldSet, b: Partial<YieldSet>): YieldSet {
  return {
    food: a.food + (b.food ?? 0),
    production: a.production + (b.production ?? 0),
    gold: a.gold + (b.gold ?? 0),
    science: a.science + (b.science ?? 0),
    culture: a.culture + (b.culture ?? 0),
    faith: a.faith + (b.faith ?? 0),
  };
}
