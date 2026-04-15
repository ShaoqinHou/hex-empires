import type { WonderPlacementRule } from '../../types/WonderPlacement';

// ── Rules table ──────────────────────────────────────────────────────────────
//
// Pure data: each entry carries a `constraint` discriminated union that
// describes *what* the rule requires. The actual predicate evaluation lives in
// `state/WonderPlacement.ts`, which may freely import from `hex/`.
//
// Adding a new wonder placement rule requires:
//   1. A new entry in this table with the appropriate constraint variant.
//   2. A matching `case` in `evaluateWonderConstraint()` in
//      `state/WonderPlacement.ts` (only needed for new constraint types).

export type { WonderPlacementRule };

export const WONDER_PLACEMENT_RULES: ReadonlyMap<string, WonderPlacementRule> = new Map<string, WonderPlacementRule>([
  ['pyramids', {
    wonderId: 'pyramids',
    constraint: { type: 'TERRAIN_OR_FEATURE', terrain: 'desert', feature: 'floodplains' },
    description: 'Must be placed on flat Desert or Floodplains terrain.',
  }],
  ['hanging_gardens', {
    wonderId: 'hanging_gardens',
    constraint: { type: 'ADJACENT_RIVER' },
    description: 'Must be placed adjacent to a river.',
  }],
  ['colossus', {
    wonderId: 'colossus',
    constraint: { type: 'ADJACENT_COAST' },
    description: 'Must be placed on a land tile adjacent to Coast (not Ocean).',
  }],
  ['stonehenge', {
    wonderId: 'stonehenge',
    constraint: { type: 'ADJACENT_RESOURCE', resourceId: 'stone' },
    description: 'Must be placed next to a Stone resource.',
  }],
  ['oracle', {
    wonderId: 'oracle',
    constraint: { type: 'HAS_FEATURE', feature: 'hills' },
    description: 'Must be placed on Hills.',
  }],
  ['venetian_arsenal', {
    wonderId: 'venetian_arsenal',
    constraint: { type: 'ADJACENT_COAST' },
    description: 'Must be placed on a coastal land tile.',
  }],
  ['notre_dame', {
    wonderId: 'notre_dame',
    constraint: { type: 'ADJACENT_RIVER' },
    description: 'Must be placed adjacent to a river.',
  }],
  ['eiffel_tower', {
    wonderId: 'eiffel_tower',
    constraint: { type: 'FLAT_LAND' },
    description: 'Must be placed on flat land (not water, not mountains).',
  }],
  ['statue_of_liberty', {
    wonderId: 'statue_of_liberty',
    constraint: { type: 'ADJACENT_COAST' },
    description: 'Must be placed on a coastal land tile.',
  }],
  // M13 additions
  ['angkor_wat', {
    wonderId: 'angkor_wat',
    constraint: { type: 'ADJACENT_RIVER' },
    description: 'Must be placed adjacent to a River.',
  }],
  ['cristo_redentor', {
    wonderId: 'cristo_redentor',
    constraint: { type: 'ADJACENT_MOUNTAIN' },
    description: 'Must be placed adjacent to a Mountain.',
  }],
  ['sydney_opera_house', {
    wonderId: 'sydney_opera_house',
    constraint: { type: 'COASTAL_LAND' },
    description: 'Must be placed on a Coastal land tile (adjacent to Coast, Ocean or Reef).',
  }],
  ['hagia_sophia', {
    wonderId: 'hagia_sophia',
    constraint: { type: 'ADJACENT_HOLY_SITE' },
    description: 'Must be placed adjacent to a Holy Site district (if any exist).',
  }],
  ['terracotta_army', {
    wonderId: 'terracotta_army',
    constraint: { type: 'IN_CAPITAL_TERRITORY' },
    description: 'Must be placed within the capital city\u2019s territory.',
  }],
  ['great_wall', {
    wonderId: 'great_wall',
    constraint: { type: 'TERRITORY_BORDER' },
    description: 'Must be placed on a tile at the edge of your own territory.',
  }],
  ['brandenburg_gate', {
    wonderId: 'brandenburg_gate',
    constraint: { type: 'UNCONSTRAINED' },
    description: 'May be placed on any land tile within a city.',
  }],
  ['panama_canal', {
    wonderId: 'panama_canal',
    constraint: { type: 'BETWEEN_TWO_WATERS' },
    description: 'Must be placed on a land tile between two separate bodies of water.',
  }],
]);
