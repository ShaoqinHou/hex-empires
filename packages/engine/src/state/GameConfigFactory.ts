import type { GameConfig } from '../types/GameConfig';
import type { UnitDef } from '../data/units/antiquity-units';
import type { BuildingDef } from '../data/buildings/antiquity-buildings';
import type { TechnologyDef } from '../data/technologies/types';
import type { TerrainDef, TerrainFeatureDef } from '../types/Terrain';
import { ALL_UNITS } from '../data/units';
import { ALL_BUILDINGS } from '../data/buildings';
import { ALL_TECHNOLOGIES } from '../data/technologies';
import { ALL_BASE_TERRAINS } from '../data/terrains/base-terrains';
import { ALL_FEATURES } from '../data/terrains/features';

/** Build a GameConfig from all registered content data */
export function createGameConfig(): GameConfig {
  const units = new Map<string, UnitDef>();
  for (const u of ALL_UNITS) units.set(u.id, u);

  const buildings = new Map<string, BuildingDef>();
  for (const b of ALL_BUILDINGS) buildings.set(b.id, b);

  const technologies = new Map<string, TechnologyDef>();
  for (const t of ALL_TECHNOLOGIES) technologies.set(t.id, t);

  const terrains = new Map<string, TerrainDef>();
  for (const t of ALL_BASE_TERRAINS) terrains.set(t.id, t);

  const features = new Map<string, TerrainFeatureDef>();
  for (const f of ALL_FEATURES) features.set(f.id, f);

  return { units, buildings, technologies, terrains, features };
}
