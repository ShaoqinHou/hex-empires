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
import type { CivilizationDef } from '../data/civilizations/types';
import type { LeaderDef } from '../data/leaders/types';
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

  return { units, buildings, districts, technologies, civics, terrains, features, promotions, resources, governors, civilizations, leaders };
}
