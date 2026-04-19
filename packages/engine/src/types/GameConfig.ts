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
import type { IndependentPowerDef } from './IndependentPower';
import type { NarrativeEventDef, DiscoveryDef } from './NarrativeEvent';
import type { AttributeNodeDef } from './Attribute';
import type { FoundationChallengeDef } from '../data/foundation-challenges';
import type { LeaderChallengeDef } from '../data/leader-challenges';
import type { MementoDef } from './Memento';
import type { QuarterDef } from './Quarter';
import type { ProjectDef } from './Project';
import type { NaturalWonderDef } from './NaturalWonder';

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
   * Independent Powers registry (W3-04). Required with empty-Map default in
   * GameConfigFactory. Systems that don't need IPs pass new Map() explicitly.
   */
  readonly independentPowers: ReadonlyMap<string, IndependentPowerDef>;
  /**
   * Attribute tree node definitions (W3-07). Required with empty-Map default in
   * GameConfigFactory. Systems that don't need attribute nodes pass new Map() explicitly.
   */
  readonly attributeNodes: ReadonlyMap<string, AttributeNodeDef>;

  /**
   * Narrative Events registry (W3-05). Optional so existing GameConfig
   * construction (tests, save files) compiles unchanged. When absent,
   * narrativeEventSystem is a no-op.
   */
  readonly narrativeEvents?: ReadonlyMap<string, NarrativeEventDef>;

  /**
   * Discoveries registry (W3-05) — map discovery tiles (Goody Hut replacement).
   * Optional so existing GameConfig construction compiles unchanged.
   */
  readonly discoveries?: ReadonlyMap<string, DiscoveryDef>;

  /**
   * Foundation Challenges registry (W3-06). Optional so existing GameConfig
   * construction (tests, save files) compiles unchanged. When absent,
   * legendsSystem falls back to an empty collection.
   */
  readonly foundationChallenges?: ReadonlyMap<string, FoundationChallengeDef>;

  /**
   * Leader Challenges registry (W3-06). Optional so existing GameConfig
   * construction (tests, save files) compiles unchanged. When absent,
   * legendsSystem falls back to an empty collection.
   */
  readonly leaderChallenges?: ReadonlyMap<string, LeaderChallengeDef>;

  /**
   * Mementos registry (W3-06). Optional so existing GameConfig
   * construction (tests, save files) compiles unchanged. When absent,
   * legendsSystem/MementoApply fall back to an empty collection.
   */
  readonly mementos?: ReadonlyMap<string, MementoDef>;

  /**
   * Named Quarter catalog (W3-01). Optional so existing GameConfig
   * construction (tests, save files) compiles unchanged. When absent,
   * `urbanBuildingSystem` skips unique_quarter detection gracefully.
   */
  readonly quarters?: ReadonlyMap<string, QuarterDef>;

  /**
   * Feature flag — when false (default), the Achievements panel is hidden
   * from the UI (no button, no keyboard shortcut). Set to true to enable
   * the panel while it is still under active development.
   */
  readonly experimentalAchievements: boolean;

  /**
   * Projects registry (W5-01). Optional so existing GameConfig construction
   * (tests, save files) compiles unchanged. When absent, projectsSystem is a no-op.
   */
  readonly projects?: ReadonlyMap<string, ProjectDef>;

  /**
   * Natural Wonders registry (W5-02). Required with empty-Map default in
   * GameConfigFactory. Systems that don't need natural wonders pass new Map() explicitly.
   */
  readonly naturalWonders: ReadonlyMap<string, NaturalWonderDef>;
}
