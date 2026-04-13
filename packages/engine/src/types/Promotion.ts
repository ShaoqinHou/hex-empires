export interface PromotionDef {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: 'melee' | 'ranged' | 'cavalry' | 'siege' | 'naval' | 'all';
  readonly tier: 1 | 2 | 3;
  readonly effects: ReadonlyArray<{ readonly type: string; readonly value: number }>;
}
