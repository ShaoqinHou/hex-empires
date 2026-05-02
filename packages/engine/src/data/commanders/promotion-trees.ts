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

const ASSAULT_ROUT: CommanderPromotionDef = {
  id: 'assault_rout',
  name: 'Rout',
  description: '+2 combat strength to local Infantry (melee) units in radius.',
  tree: 'assault',
  tier: 2,
  prerequisites: ['assault_initiative'],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: 'melee',
    value: 2,
    radius: 1,
    condition: 'attacking',
  },
} as const;

const ASSAULT_STORM: CommanderPromotionDef = {
  id: 'assault_storm',
  name: 'Storm',
  description: '+2 combat strength to friendly ranged units in radius.',
  tree: 'assault',
  tier: 2,
  prerequisites: ['assault_initiative'],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: 'ranged',
    value: 2,
    radius: 1,
    condition: 'attacking',
  },
} as const;

const ASSAULT_SHOCK_TACTICS: CommanderPromotionDef = {
  id: 'assault_shock_tactics',
  name: 'Shock Tactics',
  description: '+3 combat strength to friendly cavalry units in radius.',
  tree: 'assault',
  tier: 3,
  prerequisites: ['assault_rout'],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: 'cavalry',
    value: 3,
    radius: 1,
    condition: 'attacking',
  },
} as const;

const ASSAULT_ENFILADE: CommanderPromotionDef = {
  id: 'assault_enfilade',
  name: 'Enfilade',
  description: '+3 combat strength to friendly siege units in radius.',
  tree: 'assault',
  tier: 3,
  prerequisites: ['assault_storm'],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: 'siege',
    value: 3,
    radius: 1,
    condition: 'attacking',
  },
} as const;

const ASSAULT_ADVANCEMENT: CommanderPromotionDef = {
  id: 'assault_advancement',
  name: 'Advancement',
  description: 'Local melee (Infantry proxy) and cavalry units in radius gain First Strike at full HP.',
  tree: 'assault',
  tier: 4,
  prerequisites: ['assault_shock_tactics', 'assault_enfilade'],
  prerequisiteMode: 'any',
  aura: {
    type: 'AURA_GRANT_ABILITY',
    target: ['melee', 'cavalry'],
    abilityId: 'first_strike',
    radius: 1,
  },
} as const;

// ── Logistics tree (sustain + logistics) ──

const LOGISTICS_QUARTERMASTER: CommanderPromotionDef = {
  id: 'logistics_quartermaster',
  name: 'Quartermaster',
  description: '+1 Gold per packed unit.',
  tree: 'logistics',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_GOLD_PER_PACKED_UNIT',
    value: 1,
  },
} as const;

const LOGISTICS_RECRUITMENT: CommanderPromotionDef = {
  id: 'logistics_recruitment',
  name: 'Recruitment',
  description: '+15% Production toward Land Units while stationed on a District.',
  tree: 'logistics',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_LAND_PRODUCTION_BONUS_WHILE_STATIONED',
    value: 15,
  },
} as const;

const LOGISTICS_REGIMENTS: CommanderPromotionDef = {
  id: 'logistics_regiments',
  name: 'Regiments',
  description: '+2 unit slots and faster reinforcement.',
  tree: 'logistics',
  tier: 2,
  prerequisites: ['logistics_quartermaster', 'logistics_recruitment'],
  prerequisiteMode: 'any',
  aura: {
    type: 'AURA_EXPAND_STACK',
    delta: 2,
    reinforcementSpeed: 1,
  },
} as const;

const LOGISTICS_FIELD_MEDIC: CommanderPromotionDef = {
  id: 'logistics_field_medic',
  name: 'Field Medic',
  description: '+5 Healing for Land Units in enemy/neutral territory.',
  tree: 'logistics',
  tier: 3,
  prerequisites: ['logistics_regiments'],
  aura: {
    type: 'AURA_HEAL_PER_TURN',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    amount: 5,
    radius: 1,
    territoryScope: 'enemy_or_neutral_territory',
  },
} as const;

const LOGISTICS_LOOTING: CommanderPromotionDef = {
  id: 'logistics_looting',
  name: 'Looting',
  description: '+50% yield and HP from pillaging within radius.',
  tree: 'logistics',
  tier: 3,
  prerequisites: ['logistics_regiments'],
  aura: {
    type: 'AURA_PILLAGE_BONUS',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    radius: 1,
    yieldBonusPercent: 50,
    hpBonusPercent: 50,
  },
} as const;

const LOGISTICS_SURVIVAL_TRAINING: CommanderPromotionDef = {
  id: 'logistics_survival_training',
  name: 'Survival Training',
  description:
    'Grants the Commando ability to Land Units; Doubles terrain combat and allows infantry cliff move/attack.',
  tree: 'logistics',
  tier: 4,
  prerequisites: ['logistics_field_medic', 'logistics_looting'],
  prerequisiteMode: 'any',
  aura: {
    type: 'AURA_GRANT_ABILITY',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    abilityId: 'commando',
    radius: 1,
  },
} as const;

// ── Bastion tree (defense) ──

const BASTION_TIER1: CommanderPromotionDef = {
  id: 'bastion_steadfast',
  name: 'Steadfast',
  description: '+2 combat strength to friendly land units in radius when defending.',
  tree: 'bastion',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    value: 2,
    radius: 1,
    condition: 'defending',
  },
} as const;

const BASTION_TIER2: CommanderPromotionDef = {
  id: 'bastion_ranged_cover',
  name: 'Ranged Cover',
  description: '+4 ranged strength to friendly ranged units in radius.',
  tree: 'bastion',
  tier: 2,
  prerequisites: ['bastion_steadfast'],
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
  ASSAULT_ROUT,
  ASSAULT_STORM,
  ASSAULT_SHOCK_TACTICS,
  ASSAULT_ENFILADE,
  ASSAULT_ADVANCEMENT,
  LOGISTICS_QUARTERMASTER,
  LOGISTICS_RECRUITMENT,
  LOGISTICS_REGIMENTS,
  LOGISTICS_FIELD_MEDIC,
  LOGISTICS_LOOTING,
  LOGISTICS_SURVIVAL_TRAINING,
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
