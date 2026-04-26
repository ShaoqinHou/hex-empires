import type { YieldSet } from './Yields';
import type { TerrainId, FeatureId } from './Terrain';
import type { TechnologyId } from './Ids';

/**
 * Tile improvements placed by the city growth system (PLACE_IMPROVEMENT)
 * Examples: Farm, Mine, Pasture, Camp, Plantation, Quarry, Road
 */
export interface ImprovementDef {
  readonly id: string;
  readonly name: string;
  readonly category: 'basic' | 'resource' | 'infrastructure';
  readonly requiredTech: TechnologyId | null;
  readonly prerequisites: {
    readonly terrain?: TerrainId[];
    readonly feature?: FeatureId[];
    readonly resource?: string[]; // Resource types this improvement can be built on
  };
  readonly yields: Partial<YieldSet>; // Additional yields from improvement
  readonly modifier: {
    readonly movement?: number; // Movement cost modifier (for roads)
    readonly defense?: number; // Defense bonus
  };
  /**
   * When true, this improvement persists across age transitions. Ageless
   * improvements are not cleared when the player's civilization changes.
   * Roads are the canonical ageless improvement.
   */
  readonly isAgeless?: boolean;
  /**
   * When set, this improvement is exclusive to the given civilization.
   * Only players whose current civId matches can build it.
   */
  readonly civId?: string;
}
