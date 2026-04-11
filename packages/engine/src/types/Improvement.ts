import type { YieldSet } from './Yields';
import type { TerrainId, FeatureId } from './Terrain';
import type { TechnologyId } from './Ids';

/**
 * Tile improvements built by Builder units
 * Examples: Farm, Mine, Pasture, Camp, Plantation, Quarry, Road
 */
export interface ImprovementDef {
  readonly id: string;
  readonly name: string;
  readonly category: 'basic' | 'resource' | 'infrastructure';
  readonly cost: number; // Builder charges to build
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
}
