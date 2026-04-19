import type { GameConfig } from '../types/GameConfig';
import type { UnitDef } from '../types/Unit';
import type { BuildingDef } from '../types/Building';
import type { DistrictDef } from '../types/District';
import type { TechnologyDef } from '../types/Technology';
import type { CivicDef } from '../types/Civic';
import type { PromotionDef } from '../types/Promotion';
import type { ResourceDef } from '../types/Resource';
import type { TerrainDef, TerrainFeatureDef } from '../types/Terrain';
import type { GovernorDef } from '../types/Governor';
import type { ImprovementDef } from '../types/Improvement';
import type { PantheonDef } from '../types/Religion';
import type { GovernmentDef } from '../data/governments/governments';
import type { PolicyDef } from '../data/governments/policies';
import type { FounderBeliefDef } from '../data/religion/founder-beliefs';
import type { FollowerBeliefDef } from '../data/religion/follower-beliefs';
import type { CivilizationDef } from '../data/civilizations/types';
import type { LeaderDef } from '../data/leaders/types';
import type { AchievementDef } from '../data/achievements';
import { ALL_UNITS } from '../data/units';
import { ALL_BUILDINGS } from '../data/buildings';
import { ALL_DISTRICTS } from '../data/districts';
import { ALL_TECHNOLOGIES } from '../data/technologies';
import { ALL_CIVICS } from '../data/civics';
import { ALL_BASE_TERRAINS } from '../data/terrains/base-terrains';
import { ALL_FEATURES } from '../data/terrains/features';
import { ALL_PROMOTIONS } from '../data/units/promotions';
import { ALL_RESOURCES } from '../data/resources';
import { ALL_GOVERNORS } from '../data/governors';
import { ALL_CIVILIZATIONS } from '../data/civilizations';
import { ALL_LEADERS } from '../data/leaders';
import { ALL_IMPROVEMENTS } from '../data/improvements';
import { ALL_PANTHEONS } from '../data/religion';
import { ALL_GOVERNMENTS, ALL_POLICIES } from '../data/governments';
import { ALL_FOUNDER_BELIEFS } from '../data/religion/founder-beliefs';
import { ALL_FOLLOWER_BELIEFS } from '../data/religion/follower-beliefs';
import { ALL_ACHIEVEMENTS } from '../data/achievements';
import { ALL_CRISES } from '../data/crises/all-crises';
import { ALL_INDEPENDENT_POWERS } from '../data/independent-powers';
import type { IndependentPowerDef } from '../types/IndependentPower';
import { ALL_ATTRIBUTE_NODES } from '../data/attribute-trees';
import type { AttributeNodeDef } from '../types/Attribute';
import { ALL_NARRATIVE_EVENTS } from '../data/narrative-events';
import { ALL_DISCOVERIES } from '../data/discoveries';
import type { NarrativeEventDef, DiscoveryDef } from '../types/NarrativeEvent';
import { ALL_FOUNDATION_CHALLENGES } from '../data/foundation-challenges';
import { ALL_LEADER_CHALLENGES } from '../data/leader-challenges';
import { ALL_MEMENTOS } from '../data/mementos';
import type { FoundationChallengeDef } from '../data/foundation-challenges';
import type { LeaderChallengeDef } from '../data/leader-challenges';
import type { MementoDef } from '../types/Memento';

/** Build a GameConfig from all registered content data */
export function createGameConfig(): GameConfig {
  const units = new Map<string, UnitDef>();
  for (const u of ALL_UNITS) units.set(u.id, u);

  const buildings = new Map<string, BuildingDef>();
  for (const b of ALL_BUILDINGS) buildings.set(b.id, b);

  const districts = new Map<string, DistrictDef>();
  for (const d of ALL_DISTRICTS) districts.set(d.id, d);

  const technologies = new Map<string, TechnologyDef>();
  for (const t of ALL_TECHNOLOGIES) technologies.set(t.id, t);

  const civics = new Map<string, CivicDef>();
  for (const c of ALL_CIVICS) civics.set(c.id, c);

  const terrains = new Map<string, TerrainDef>();
  for (const t of ALL_BASE_TERRAINS) terrains.set(t.id, t);

  const features = new Map<string, TerrainFeatureDef>();
  for (const f of ALL_FEATURES) features.set(f.id, f);

  const promotions = new Map<string, PromotionDef>();
  for (const p of ALL_PROMOTIONS) promotions.set(p.id, p);

  const resources = new Map<string, ResourceDef>();
  for (const r of ALL_RESOURCES) resources.set(r.id, r);

  const governors = new Map<string, GovernorDef>();
  for (const g of ALL_GOVERNORS) governors.set(g.id, g);

  const civilizations = new Map<string, CivilizationDef>();
  for (const c of ALL_CIVILIZATIONS) civilizations.set(c.id, c);

  const leaders = new Map<string, LeaderDef>();
  for (const l of ALL_LEADERS) leaders.set(l.id, l);

  const improvements = new Map<string, ImprovementDef>();
  for (const i of ALL_IMPROVEMENTS) improvements.set(i.id, i);

  const pantheons = new Map<string, PantheonDef>();
  for (const p of ALL_PANTHEONS) pantheons.set(p.id, p);

  const governments = new Map<string, GovernmentDef>();
  for (const g of ALL_GOVERNMENTS) governments.set(g.id, g);

  const policies = new Map<string, PolicyDef>();
  for (const p of ALL_POLICIES) policies.set(p.id, p);

  const founderBeliefs = new Map<string, FounderBeliefDef>();
  for (const f of ALL_FOUNDER_BELIEFS) founderBeliefs.set(f.id, f);

  const followerBeliefs = new Map<string, FollowerBeliefDef>();
  for (const f of ALL_FOLLOWER_BELIEFS) followerBeliefs.set(f.id, f);

  const achievements = new Map<string, AchievementDef>();
  for (const a of ALL_ACHIEVEMENTS) achievements.set(a.id, a);

  const independentPowers = new Map<string, IndependentPowerDef>();
  for (const ip of ALL_INDEPENDENT_POWERS) independentPowers.set(ip.id, ip);

  const attributeNodes = new Map<string, AttributeNodeDef>();
  for (const n of ALL_ATTRIBUTE_NODES) attributeNodes.set(n.id, n);

  const narrativeEvents = new Map<string, NarrativeEventDef>();
  for (const e of ALL_NARRATIVE_EVENTS) narrativeEvents.set(e.id, e);

  const discoveries = new Map<string, DiscoveryDef>();
  for (const d of ALL_DISCOVERIES) discoveries.set(d.id, d);

  const foundationChallenges = new Map<string, FoundationChallengeDef>();
  for (const c of ALL_FOUNDATION_CHALLENGES) foundationChallenges.set(c.id, c);

  const leaderChallenges = new Map<string, LeaderChallengeDef>();
  for (const c of ALL_LEADER_CHALLENGES) leaderChallenges.set(c.id, c);

  const mementos = new Map<string, MementoDef>();
  for (const m of ALL_MEMENTOS) mementos.set(m.id, m);

  return { units, buildings, districts, technologies, civics, terrains, features, promotions, resources, governors, civilizations, leaders, improvements, pantheons, governments, policies, founderBeliefs, followerBeliefs, achievements, crises: ALL_CRISES, independentPowers, attributeNodes, narrativeEvents, discoveries, foundationChallenges, leaderChallenges, mementos, experimentalAchievements: false };
}
