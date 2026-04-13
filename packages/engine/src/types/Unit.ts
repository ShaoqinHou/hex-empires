export interface UnitDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly category: 'melee' | 'ranged' | 'siege' | 'cavalry' | 'naval' | 'civilian' | 'religious';
  readonly cost: number;       // production cost
  readonly combat: number;     // melee combat strength
  readonly rangedCombat: number; // ranged combat strength (0 = melee only)
  readonly range: number;      // attack range (0 = melee)
  readonly movement: number;   // base movement points
  readonly sightRange: number; // fog of war visibility radius (default 2)
  readonly requiredTech: string | null;
  readonly requiredResource?: string; // strategic resource ID required to produce this unit
  readonly upgradesTo: string | null;
  readonly abilities: ReadonlyArray<string>;
}
