import type { YieldSet, YieldType } from './Yields';

export interface BuildingDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly cost: number;          // production cost
  readonly maintenance: number;   // gold per turn
  readonly yields: Partial<YieldSet>;
  readonly effects: ReadonlyArray<string>; // effect descriptions
  readonly requiredTech: string | null;
  readonly growthRateBonus?: number; // 0-1 fraction; reduces growth threshold (e.g. 0.1 = -10% threshold)
  /** Building category for maintenance cost grouping */
  readonly category?: 'warehouse' | 'science' | 'culture' | 'gold' | 'happiness' | 'military' | 'food' | 'wonder';
  /** Happiness maintenance cost per turn (default 0). Science/culture/military buildings cost 2-4 by age. */
  readonly happinessCost?: number;
  /** Whether this is a world wonder (only one can be built per game) */
  readonly isWonder?: boolean;
  /** Great person points generated per turn */
  readonly greatPersonPoints?: { type: string; amount: number };
  /**
   * When true, this building persists across age transitions (not dismantled
   * when the player's civilization changes). Applies to wonders and select
   * infrastructure.
   */
  readonly isAgeless?: boolean;
  /**
   * Number of codex display slots this building provides.
   * Each displayed codex contributes +2 science per turn (VII baseline).
   * Libraries: 2, Academies: 3, Palace: 1.
   */
  readonly codexSlots?: number;
  /** True if this building is unique to a specific civilization */
  readonly isCivUnique?: boolean;
  /** CivilizationId of the civ that can build this, when isCivUnique is true */
  readonly civId?: string;
  /** Civic research prerequisite (parity with District.requiredCivic) */
  readonly requiredCivic?: string;
  /**
   * F-06: Per-wonder adjacency effect. When this wonder is built on an urban
   * tile, neighboring tiles of the specified category receive the given yield
   * bonus. When absent, wonders use the generic WONDER_ADJACENCY_PER_NEIGHBOR
   * constant (+2 culture, +1 science).
   *
   * targetCategory:
   *   'all'    — any neighboring urban tile benefits (no building prerequisite)
   *   'urban'  — only neighboring tiles that have at least one building
   */
  readonly adjacencyEffect?: {
    readonly yield: YieldType;
    readonly value: number;
    readonly targetCategory: 'all' | 'urban';
  };
}
