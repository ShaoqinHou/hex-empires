import type { UnitDef } from './Unit';
import type { BuildingDef } from './Building';
import type { TechnologyDef } from './Technology';
import type { CivicDef } from './Civic';
import type { PromotionDef } from './Promotion';
import type { ResourceDef } from './Resource';
import type { TerrainDef, TerrainFeatureDef } from './Terrain';
import type { DistrictDef } from './District';
import type { GovernorDef } from './Governor';
import type { ImprovementDef } from './Improvement';
import type { PantheonDef } from './Religion';
import type { GovernmentDef } from '../data/governments/governments';
import type { PolicyDef } from '../data/governments/policies';
import type { FounderBeliefDef } from '../data/religion/founder-beliefs';
import type { FollowerBeliefDef } from '../data/religion/follower-beliefs';
import type { CivilizationDef } from '../data/civilizations/types';
import type { LeaderDef } from '../data/leaders/types';
import type { AchievementDef } from '../data/achievements';
import type { CrisisEventDef } from '../data/crises/types';

/**
 * GameConfig holds all registered content definitions.
 * Embedded in GameState so pure system functions can query it
 * without external dependencies. This enables truly data-driven systems.
 */
export interface GameConfig {
  readonly units: ReadonlyMap<string, UnitDef>;
  readonly buildings: ReadonlyMap<string, BuildingDef>;
  readonly districts: ReadonlyMap<string, DistrictDef>;
  readonly technologies: ReadonlyMap<string, TechnologyDef>;
  readonly civics: ReadonlyMap<string, CivicDef>;
  readonly terrains: ReadonlyMap<string, TerrainDef>;
  readonly features: ReadonlyMap<string, TerrainFeatureDef>;
  readonly promotions: ReadonlyMap<string, PromotionDef>;
  readonly resources: ReadonlyMap<string, ResourceDef>;
  readonly governors: ReadonlyMap<string, GovernorDef>;
  readonly civilizations: ReadonlyMap<string, CivilizationDef>;
  readonly leaders: ReadonlyMap<string, LeaderDef>;
  readonly improvements: ReadonlyMap<string, ImprovementDef>;
  readonly pantheons: ReadonlyMap<string, PantheonDef>;
  readonly governments: ReadonlyMap<string, GovernmentDef>;
  readonly policies: ReadonlyMap<string, PolicyDef>;
  readonly founderBeliefs: ReadonlyMap<string, FounderBeliefDef>;
  readonly followerBeliefs: ReadonlyMap<string, FollowerBeliefDef>;
  readonly achievements: ReadonlyMap<string, AchievementDef>;
  readonly crises: ReadonlyArray<CrisisEventDef>;

  /**
   * Feature flag — when false (default), the Achievements panel is hidden
   * from the UI (no button, no keyboard shortcut). Set to true to enable
   * the panel while it is still under active development.
   */
  readonly experimentalAchievements: boolean;
}
