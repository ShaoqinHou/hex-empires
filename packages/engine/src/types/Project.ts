import type { EffectDef } from './GameState';

/**
 * Defines a non-wonder city-level project that can be completed via COMPLETE_PROJECT.
 *
 * Projects are age-gated and sequenced (e.g. Operation Ivy requires Manhattan Project
 * to already be in completedProjects). Unlike wonders, projects are not placed on a tile;
 * they're city-level undertakings that contribute to modern victory chains.
 *
 * W5-01: Manhattan Project, Operation Ivy, space-race milestones, World Bank offices.
 */
export interface ProjectDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  /**
   * Production cost to complete the project in a city's queue.
   * For projects that are manually dispatched via COMPLETE_PROJECT (e.g. World Bank office
   * establishment by a Great Banker unit), this field is 0.
   */
  readonly cost: number;
  /**
   * Tech that must be researched before this project is available.
   * Null if no tech prerequisite.
   */
  readonly requiredTech: string | null;
  /**
   * Another project that must already be in completedProjects before this one can be started.
   * Null if no project prerequisite.
   */
  readonly requiredProject: string | null;
  /**
   * Building id that must exist in the completing city (e.g. 'launch_pad' for space projects).
   * Null if no building prerequisite.
   */
  readonly requiredBuilding: string | null;
  /**
   * Player-level ideology points threshold that must be reached before this project is available.
   * 0 if no threshold required.
   */
  readonly requiredIdeologyPoints: number;
  /**
   * Effects applied to the completing player on project completion.
   */
  readonly effects: ReadonlyArray<EffectDef>;
  /**
   * When true, completing this project awards one spaceMilestonesComplete tick.
   */
  readonly isSpaceMilestone: boolean;
  /**
   * When true, completing this project sets the Military victory flag
   * (completedProjects.includes('operation_ivy')).
   */
  readonly isMilitaryTerminal: boolean;
  /**
   * Descriptive text shown in the UI.
   */
  readonly description: string;
}
