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

const BASTION_STEADFAST: CommanderPromotionDef = {
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

const BASTION_BULWARK: CommanderPromotionDef = {
  id: 'bastion_bulwark',
  name: 'Bulwark',
  description:
    'Friendly land units complete Fortify 1 turn faster in radius.',
  tree: 'bastion',
  tier: 2,
  prerequisites: ['bastion_steadfast'],
  aura: {
    type: 'AURA_FORTIFY_ACTION_TURN_REDUCTION',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    value: 1,
    radius: 1,
  },
} as const;

const BASTION_HOLD_THE_LINE: CommanderPromotionDef = {
  id: 'bastion_hold_the_line',
  name: 'Hold the Line',
  description:
    'Friendly land units gain +2 combat strength in radius while stationed in a District or City Center.',
  tree: 'bastion',
  tier: 2,
  prerequisites: ['bastion_steadfast'],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    value: 2,
    radius: 1,
    requiresDistrict: true,
  },
} as const;

const BASTION_DEFILADE: CommanderPromotionDef = {
  id: 'bastion_defilade',
  name: 'Defilade',
  description:
    'Friendly land units gain +3 combat strength in radius while fortified.',
  tree: 'bastion',
  tier: 3,
  prerequisites: ['bastion_bulwark'],
  aura: {
    type: 'AURA_MODIFY_CS',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    value: 3,
    radius: 1,
    condition: 'defending',
    requiresFortified: true,
  },
} as const;

const BASTION_GARRISON: CommanderPromotionDef = {
  id: 'bastion_garrison',
  name: 'Garrison',
  description: '+10 district HP while defending when this commander is in the city center.',
  tree: 'bastion',
  tier: 3,
  prerequisites: ['bastion_hold_the_line'],
  aura: {
    type: 'AURA_DISTRICT_HP_BONUS',
    value: 10,
    requiresCommanderOnCityCenter: true,
  },
} as const;

const BASTION_RESOLUTE: CommanderPromotionDef = {
  id: 'bastion_resolute',
  name: 'Resolute',
  description: 'Friendly land units in radius heal 5 HP after attacking.',
  tree: 'bastion',
  tier: 4,
  prerequisites: ['bastion_defilade', 'bastion_garrison'],
  prerequisiteMode: 'any',
  aura: {
    type: 'AURA_HEAL_AFTER_ATTACK',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    amount: 5,
    radius: 1,
  },
} as const;

// ── Leadership tree (command effectiveness) ──

const LEADERSHIP_ZEAL: CommanderPromotionDef = {
  id: 'leadership_zeal',
  name: 'Zeal',
  description:
    '+5% yields in a Settlement while this commander is stationed on a District.',
  tree: 'leadership',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_SETTLEMENT_YIELD_BONUS_WHILE_STATIONED',
    value: 5,
    yieldScope: 'all',
    requiresDistrict: true,
    stackable: true,
  },
} as const;

const LEADERSHIP_FIELD_COMMISSION: CommanderPromotionDef = {
  id: 'leadership_field_commission',
  name: 'Field Commission',
  description:
    'Land Units within Command Radius can be upgraded as if in friendly territory and heal 10 HP when upgraded.',
  tree: 'leadership',
  tier: 2,
  prerequisites: ['leadership_zeal'],
  aura: {
    type: 'AURA_UPGRADE_SUPPORT',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    radius: 1,
    healOnUpgrade: 10,
    allowsUpgradeOutsideFriendlyTerritory: true,
  },
} as const;

const LEADERSHIP_OLD_GUARD: CommanderPromotionDef = {
  id: 'leadership_old_guard',
  name: 'Old Guard',
  description: '+10 combat strength for this Commander while defending.',
  tree: 'leadership',
  tier: 3,
  prerequisites: ['leadership_field_commission'],
  aura: {
    type: 'AURA_COMMANDER_SELF_CS',
    value: 10,
    condition: 'defending',
  },
} as const;

const LEADERSHIP_RESILIENCE: CommanderPromotionDef = {
  id: 'leadership_resilience',
  name: 'Resilience',
  description: '+50% reduction in this Commander\'s Recovery Time.',
  tree: 'leadership',
  tier: 3,
  prerequisites: ['leadership_field_commission'],
  aura: {
    type: 'AURA_COMMANDER_RECOVERY_TIME_REDUCTION_PERCENT',
    value: 50,
  },
} as const;

const LEADERSHIP_BARRAGE: CommanderPromotionDef = {
  id: 'leadership_barrage',
  name: 'Barrage',
  description:
    '+5 combat strength for all units attacking using Focus Fire command.',
  tree: 'leadership',
  tier: 4,
  prerequisites: ['leadership_old_guard'],
  aura: {
    type: 'AURA_COMMAND_ACTION_COMBAT_BONUS',
    command: 'focus_fire',
    value: 5,
  },
} as const;

const LEADERSHIP_ONSLAUGHT: CommanderPromotionDef = {
  id: 'leadership_onslaught',
  name: 'Onslaught',
  description:
    '+4 combat strength for all units attacking using Coordinated Attack command.',
  tree: 'leadership',
  tier: 4,
  prerequisites: ['leadership_resilience'],
  aura: {
    type: 'AURA_COMMAND_ACTION_COMBAT_BONUS',
    command: 'coordinated_attack',
    value: 4,
  },
} as const;

// ── Maneuver tree / terrain + positioning ──

const MANEUVER_MOBILITY: CommanderPromotionDef = {
  id: 'maneuver_mobility',
  name: 'Mobility',
  description:
    'Commander has +1 Movement while on land and ignores Terrain movement restrictions when packed.',
  tree: 'maneuver',
  tier: 1,
  prerequisites: [],
  aura: {
    type: 'AURA_COMMANDER_MOBILITY',
    value: 1,
    terrainRestrictionScope: 'packed_land',
  },
} as const;

const MANEUVER_HARASSMENT: CommanderPromotionDef = {
  id: 'maneuver_harassment',
  name: 'Harassment',
  description:
    'Land Units within Command Radius have +2 flanking bonus when attacking.',
  tree: 'maneuver',
  tier: 2,
  prerequisites: ['maneuver_mobility'],
  aura: {
    type: 'AURA_FLANKING_BONUS',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    value: 2,
    radius: 1,
    appliesTo: 'friendly_attacking',
  },
} as const;

const MANEUVER_REDEPLOY: CommanderPromotionDef = {
  id: 'maneuver_redeploy',
  name: 'Redeploy',
  description:
    'Opponents have -2 flanking bonuses when attacking Land Units within Command Radius.',
  tree: 'maneuver',
  tier: 2,
  prerequisites: ['maneuver_mobility'],
  aura: {
    type: 'AURA_FLANKING_BONUS',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    value: -2,
    radius: 1,
    appliesTo: 'enemy_attacking',
  },
} as const;

const MANEUVER_AMPHIBIOUS: CommanderPromotionDef = {
  id: 'maneuver_amphibious',
  name: 'Amphibious',
  description:
    'Land Units within Command Radius suffer no combat penalties while embarked; embark/disembark costs 1 Movement.',
  tree: 'maneuver',
  tier: 3,
  prerequisites: ['maneuver_harassment'],
  aura: {
    type: 'AURA_AMPHIBIOUS_OPERATIONS',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    radius: 1,
    embarkDisembarkMovementCost: 1,
    ignoresEmbarkedAttackPenalty: true,
  },
} as const;

const MANEUVER_PATHFINDER: CommanderPromotionDef = {
  id: 'maneuver_pathfinder',
  name: 'Pathfinder',
  description: 'Land Units within Command Radius ignore Terrain movement restrictions.',
  tree: 'maneuver',
  tier: 3,
  prerequisites: ['maneuver_redeploy'],
  aura: {
    type: 'AURA_IGNORE_TERRAIN_MOVEMENT_RESTRICTIONS',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    radius: 1,
  },
} as const;

const MANEUVER_AREA_DENIAL: CommanderPromotionDef = {
  id: 'maneuver_area_denial',
  name: 'Area Denial',
  description: 'Command Radius applies Zone of Control to enemy Land Units.',
  tree: 'maneuver',
  tier: 4,
  prerequisites: ['maneuver_amphibious', 'maneuver_pathfinder'],
  prerequisiteMode: 'any',
  aura: {
    type: 'AURA_ZONE_OF_CONTROL',
    target: ['melee', 'ranged', 'cavalry', 'siege'],
    radius: 1,
    appliesTo: 'enemy',
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
  BASTION_STEADFAST,
  BASTION_BULWARK,
  BASTION_HOLD_THE_LINE,
  BASTION_DEFILADE,
  BASTION_GARRISON,
  BASTION_RESOLUTE,
  LEADERSHIP_ZEAL,
  LEADERSHIP_FIELD_COMMISSION,
  LEADERSHIP_OLD_GUARD,
  LEADERSHIP_RESILIENCE,
  LEADERSHIP_BARRAGE,
  LEADERSHIP_ONSLAUGHT,
  MANEUVER_MOBILITY,
  MANEUVER_HARASSMENT,
  MANEUVER_REDEPLOY,
  MANEUVER_AMPHIBIOUS,
  MANEUVER_PATHFINDER,
  MANEUVER_AREA_DENIAL,
] as const;
