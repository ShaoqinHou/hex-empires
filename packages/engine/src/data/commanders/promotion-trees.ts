/**
 * Commander promotion-tree content — Cycle B of the Commander system.
 *
 * Each promotion is a `CommanderPromotionDef` carrying exactly one
 * `AuraEffectDef`. Trees are DAGs bottom-up: tier-2 nodes list their
 * tier-1 prerequisites, tier-3 their tier-2 prerequisites. No cross-
 * tree prerequisites by convention (see rulebook §6.10 and
 * `commander-system.md` §4.2).
 *
 * Cost is expressed in XP. Magnitudes here are placeholder values
 * chosen to be internally consistent; the real numbers are pinned
 * when the XP curve lands (see design §9 open question #2 and #5).
 * The shapes are what cycle D will consume.
 */

import type { CommanderPromotionDef } from '../../types/Commander';

/**
 * XP cost per tier — mirrors `PROMOTION_THRESHOLDS` in
 * `data/units/promotions.ts` for interim parity. The commander
 * pipeline may diverge once the Civ VII XP curve is pinned.
 */
export const COMMANDER_PROMOTION_XP_COST: Readonly<Record<1 | 2 | 3 | 4, number>> = {
  1: 15,
  2: 30,
  3: 60,
  4: 100,
} as const;

/** A promotion plus the XP required to pick it. */
export interface CommanderPromotionEntry {
  readonly def: CommanderPromotionDef;
  readonly xpCost: number;
}

// ── Assault tree (combat-flavor) ──

const ASSAULT_INITIATIVE: CommanderPromotionDef = {
  id: 'assault_initiative',
  name: 'Initiative',
  description: 'Units can move after unpacking from this commander.',
  tree: 'assault',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_DEPLOY_WITH_MOVEMENT',
  },
} as const;

const ASSAULT_TIER1: CommanderPromotionDef = {
  id: 'assault_battle_cry',
  name: 'Battle Cry',
  description: '+3 combat strength to all friendly units in radius.',
  tree: 'assault',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: 'all',
    value: 3,
    radius: 1,
  },
} as const;

const ASSAULT_TIER2: CommanderPromotionDef = {
  id: 'assault_press_attack',
  name: 'Press the Attack',
  description: '+5 melee combat strength to friendly melee units.',
  tree: 'assault',
  tier: 2,
  prerequisites: ['assault_battle_cry'],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: 'melee',
    value: 5,
    radius: 1,
  },
} as const;

const ASSAULT_TIER3: CommanderPromotionDef = {
  id: 'assault_overwhelming_force',
  name: 'Overwhelming Force',
  description: '+8 combat strength to all friendly units in radius.',
  tree: 'assault',
  tier: 3,
  prerequisites: ['assault_press_attack'],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: 'all',
    value: 8,
    radius: 1,
  },
} as const;

const ASSAULT_ADVANCEMENT: CommanderPromotionDef = {
  id: 'assault_advancement',
  name: 'Advancement',
  description: 'Melee and cavalry units in radius gain First Strike at full HP.',
  tree: 'assault',
  tier: 4,
  prerequisites: ['assault_overwhelming_force'],
  aura: {
    type: 'AURA_GRANT_ABILITY',
    target: ['melee', 'cavalry'],
    abilityId: 'first_strike',
    radius: 1,
  },
} as const;

// ── Logistics tree (movement + healing) ──

const LOGISTICS_TIER1: CommanderPromotionDef = {
  id: 'logistics_forced_march',
  name: 'Forced March',
  description: '+1 movement to all friendly units in radius.',
  tree: 'logistics',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_EXTRA_MOVEMENT',
    target: 'all',
    value: 1,
    radius: 1,
  },
} as const;

const LOGISTICS_TIER2: CommanderPromotionDef = {
  id: 'logistics_field_medic',
  name: 'Field Medic',
  description: 'Heal 5 HP per turn to friendly units in radius.',
  tree: 'logistics',
  tier: 2,
  prerequisites: ['logistics_forced_march'],
  aura: {
    type: 'AURA_HEAL_PER_TURN',
    target: 'all',
    amount: 5,
    radius: 1,
  },
} as const;

const LOGISTICS_TIER3: CommanderPromotionDef = {
  id: 'logistics_supply_lines',
  name: 'Supply Lines',
  description: 'Heal 10 HP per turn to friendly units in radius.',
  tree: 'logistics',
  tier: 3,
  prerequisites: ['logistics_field_medic'],
  aura: {
    type: 'AURA_HEAL_PER_TURN',
    target: 'all',
    amount: 10,
    radius: 1,
  },
} as const;

// ── Bastion tree (defense) ──

const BASTION_TIER1: CommanderPromotionDef = {
  id: 'bastion_shield_wall',
  name: 'Shield Wall',
  description: '+4 fortification strength to friendly units in radius.',
  tree: 'bastion',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_FORTIFY_BONUS',
    target: 'all',
    value: 4,
    radius: 1,
  },
} as const;

const BASTION_TIER2: CommanderPromotionDef = {
  id: 'bastion_ranged_cover',
  name: 'Ranged Cover',
  description: '+4 ranged strength to friendly ranged units in radius.',
  tree: 'bastion',
  tier: 2,
  prerequisites: ['bastion_shield_wall'],
  aura: {
    type: 'AURA_MODIFY_RS',
    target: 'ranged',
    value: 4,
    radius: 1,
  },
} as const;

// ── Leadership tree (radius / stack) ──

const LEADERSHIP_TIER1: CommanderPromotionDef = {
  id: 'leadership_commanding_presence',
  name: 'Commanding Presence',
  description: "Expands this commander's aura radius by 1.",
  tree: 'leadership',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_EXPAND_RADIUS',
    delta: 1,
  },
} as const;

const LEADERSHIP_TIER2: CommanderPromotionDef = {
  id: 'leadership_grand_retinue',
  name: 'Grand Retinue',
  description: "Raises this commander's pack capacity by 2 units.",
  tree: 'leadership',
  tier: 2,
  prerequisites: ['leadership_commanding_presence'],
  aura: {
    type: 'AURA_EXPAND_STACK',
    delta: 2,
  },
} as const;

// ── Maneuver tree / Guerilla Tactics branch ──
// Seeds the previously-reserved `maneuver` tree with a full three-tier
// spine matching the Partisan Leader commander archetype.

const MANEUVER_TIER1: CommanderPromotionDef = {
  id: 'maneuver_ambush',
  name: 'Ambush',
  description: '+3 combat strength to friendly cavalry units in radius.',
  tree: 'maneuver',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: 'cavalry',
    value: 3,
    radius: 1,
  },
} as const;

const MANEUVER_TIER2: CommanderPromotionDef = {
  id: 'maneuver_hit_and_run',
  name: 'Hit and Run',
  description: '+1 movement to all friendly units in radius.',
  tree: 'maneuver',
  tier: 2,
  prerequisites: ['maneuver_ambush'],
  aura: {
    type: 'AURA_EXTRA_MOVEMENT',
    target: 'all',
    value: 1,
    radius: 1,
  },
} as const;

const MANEUVER_TIER3: CommanderPromotionDef = {
  id: 'maneuver_guerilla_war',
  name: 'Guerilla War',
  description: '+6 combat strength to all friendly units in radius.',
  tree: 'maneuver',
  tier: 3,
  prerequisites: ['maneuver_hit_and_run'],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: 'all',
    value: 6,
    radius: 1,
  },
} as const;

// ── Leadership tree / Air Superiority branch ──
// Side branch off `leadership_commanding_presence`, aimed at the Air
// General commander. Emphasises reach (AURA_EXPAND_RADIUS) and
// interception firepower (AURA_MODIFY_RS on ranged units).

const LEADERSHIP_AIR_SUPERIORITY: CommanderPromotionDef = {
  id: 'leadership_air_superiority',
  name: 'Air Superiority',
  description: '+4 ranged strength to friendly ranged units in radius.',
  tree: 'leadership',
  tier: 2,
  prerequisites: ['leadership_commanding_presence'],
  aura: {
    type: 'AURA_MODIFY_RS',
    target: 'ranged',
    value: 4,
    radius: 1,
  },
} as const;

const LEADERSHIP_LONG_RANGE: CommanderPromotionDef = {
  id: 'leadership_long_range',
  name: 'Long Range Patrols',
  description: "Expands this commander's aura radius by a further 1.",
  tree: 'leadership',
  tier: 3,
  prerequisites: ['leadership_air_superiority'],
  aura: {
    type: 'AURA_EXPAND_RADIUS',
    delta: 1,
  },
} as const;

// ── Bastion tree / Naval Engineering branch ──
// Adds a tier-3 capstone to the existing bastion spine so naval
// commanders (Admiral, Fleet Admiral) have a top-end fortification
// pick. Descends from `bastion_ranged_cover` to respect the DAG.

const BASTION_NAVAL_ENGINEERING: CommanderPromotionDef = {
  id: 'bastion_naval_engineering',
  name: 'Naval Engineering',
  description: '+6 fortification strength to friendly naval units in radius.',
  tree: 'bastion',
  tier: 3,
  prerequisites: ['bastion_ranged_cover'],
  aura: {
    type: 'AURA_FORTIFY_BONUS',
    target: 'naval',
    value: 6,
    radius: 1,
  },
} as const;

/**
 * All commander promotions, ordered by (tree, tier).
 *
 * Kept internal to this cycle. Engine barrel wiring, registry
 * registration, and system consumption all land with
 * `commanderPromotionSystem` in cycle C.
 */
export const ALL_COMMANDER_PROMOTIONS: ReadonlyArray<CommanderPromotionDef> = [
  ASSAULT_INITIATIVE,
  ASSAULT_TIER1,
  ASSAULT_TIER2,
  ASSAULT_TIER3,
  ASSAULT_ADVANCEMENT,
  LOGISTICS_TIER1,
  LOGISTICS_TIER2,
  LOGISTICS_TIER3,
  BASTION_TIER1,
  BASTION_TIER2,
  BASTION_NAVAL_ENGINEERING,
  LEADERSHIP_TIER1,
  LEADERSHIP_TIER2,
  LEADERSHIP_AIR_SUPERIORITY,
  LEADERSHIP_LONG_RANGE,
  MANEUVER_TIER1,
  MANEUVER_TIER2,
  MANEUVER_TIER3,
] as const;
