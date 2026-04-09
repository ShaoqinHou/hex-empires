import type { UnitDef } from '../data/units/antiquity-units';
import type { BuildingDef } from '../data/buildings/antiquity-buildings';
import type { TechnologyDef } from '../data/technologies/types';
import type { TerrainDef, TerrainFeatureDef } from './Terrain';

/**
 * GameConfig holds all registered content definitions.
 * Embedded in GameState so pure system functions can query it
 * without external dependencies. This enables truly data-driven systems.
 */
export interface GameConfig {
  readonly units: ReadonlyMap<string, UnitDef>;
  readonly buildings: ReadonlyMap<string, BuildingDef>;
  readonly technologies: ReadonlyMap<string, TechnologyDef>;
  readonly terrains: ReadonlyMap<string, TerrainDef>;
  readonly features: ReadonlyMap<string, TerrainFeatureDef>;
}
