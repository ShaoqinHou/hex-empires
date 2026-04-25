export interface UnitDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly category: 'melee' | 'ranged' | 'siege' | 'cavalry' | 'naval' | 'civilian' | 'religious' | 'support';
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
  /**
   * F-11: When set, this unit is a unique named commander granted to the
   * specified leader at game start. The GRANT_UNIT effect on the leader's
   * ability references this unit by id.
   */
  readonly leaderId?: string;
  /**
   * F-03: True for unique named commanders (e.g. Hephaestion) — distinguishes
   * them from generic/mercenary commanders that any civ can produce.
   */
  readonly isNamedCommander?: boolean;
  /**
   * F-08: Initial number of spread-religion charges for religious units (Missionaries).
   * When a unit is produced, its UnitState.spreadsRemaining is initialized to this value.
   * If absent, defaults to 3 for units with the 'spread_religion' ability.
   * Optional so existing UnitDef entries compile unchanged.
   */
  readonly religiousCharges?: number;
}
