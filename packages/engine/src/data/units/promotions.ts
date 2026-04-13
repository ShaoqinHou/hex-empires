/**
 * Promotion definitions for unit experience upgrades.
 * Units gain XP from combat and can be promoted at tier thresholds.
 */

export type { PromotionDef } from '../../types/Promotion';
import type { PromotionDef } from '../../types/Promotion';

/** XP thresholds for each promotion tier */
export const PROMOTION_THRESHOLDS: Readonly<Record<1 | 2 | 3, number>> = {
  1: 15,
  2: 30,
  3: 60,
} as const;

// ── Tier 1 (15 XP) ──

export const BATTLECRY: PromotionDef = {
  id: 'battlecry',
  name: 'Battlecry',
  description: '+7 combat strength vs wounded units',
  category: 'melee',
  tier: 1,
  effects: [{ type: 'COMBAT_VS_WOUNDED', value: 7 }],
} as const;

export const TORTOISE: PromotionDef = {
  id: 'tortoise',
  name: 'Tortoise',
  description: '+10 defense when fortified',
  category: 'melee',
  tier: 1,
  effects: [{ type: 'DEFENSE_FORTIFIED', value: 10 }],
} as const;

export const VOLLEY: PromotionDef = {
  id: 'volley',
  name: 'Volley',
  description: '+5 ranged combat vs fortified units',
  category: 'ranged',
  tier: 1,
  effects: [{ type: 'RANGED_VS_FORTIFIED', value: 5 }],
} as const;

export const ARROWS: PromotionDef = {
  id: 'arrows',
  name: 'Arrows',
  description: '+1 range',
  category: 'ranged',
  tier: 1,
  effects: [{ type: 'BONUS_RANGE', value: 1 }],
} as const;

export const CHARGE: PromotionDef = {
  id: 'charge',
  name: 'Charge',
  description: '+10 combat strength when attacking',
  category: 'cavalry',
  tier: 1,
  effects: [{ type: 'COMBAT_ATTACKING', value: 10 }],
} as const;

export const PURSUIT: PromotionDef = {
  id: 'pursuit',
  name: 'Pursuit',
  description: '+1 movement',
  category: 'cavalry',
  tier: 1,
  effects: [{ type: 'BONUS_MOVEMENT', value: 1 }],
} as const;

// ── Tier 2 (30 XP) ──

export const BLITZ: PromotionDef = {
  id: 'blitz',
  name: 'Blitz',
  description: 'Can attack twice per turn',
  category: 'melee',
  tier: 2,
  effects: [{ type: 'EXTRA_ATTACK', value: 1 }],
} as const;

export const LOGISTICS: PromotionDef = {
  id: 'logistics',
  name: 'Logistics',
  description: '+5 ranged combat strength',
  category: 'ranged',
  tier: 2,
  effects: [{ type: 'RANGED_COMBAT', value: 5 }],
} as const;

export const FLANKING: PromotionDef = {
  id: 'flanking',
  name: 'Flanking',
  description: '+7 combat when adjacent to ally',
  category: 'cavalry',
  tier: 2,
  effects: [{ type: 'COMBAT_ADJACENT_ALLY', value: 7 }],
} as const;

export const BREAKTHROUGH: PromotionDef = {
  id: 'breakthrough',
  name: 'Breakthrough',
  description: '+10 combat vs city walls',
  category: 'siege',
  tier: 2,
  effects: [{ type: 'COMBAT_VS_WALLS', value: 10 }],
} as const;

// ── Tier 3 (60 XP) ──

export const ELITE: PromotionDef = {
  id: 'elite',
  name: 'Elite',
  description: '+10 combat, +1 movement, full heal on promotion',
  category: 'all',
  tier: 3,
  effects: [
    { type: 'COMBAT_BONUS', value: 10 },
    { type: 'BONUS_MOVEMENT', value: 1 },
    { type: 'HEAL_ON_PROMOTE', value: 100 },
  ],
} as const;

export const AMBUSH: PromotionDef = {
  id: 'ambush',
  name: 'Ambush',
  description: '+7 combat strength when attacking from forest or jungle tiles',
  category: 'melee',
  tier: 1,
  effects: [{ type: 'COMBAT_IN_FOREST', value: 7 }],
} as const;

export const SUPPRESSION: PromotionDef = {
  id: 'suppression',
  name: 'Suppression',
  description: '+5 ranged combat vs units in the open (no terrain bonus)',
  category: 'ranged',
  tier: 2,
  effects: [{ type: 'RANGED_VS_OPEN', value: 5 }],
} as const;

export const VANGUARD: PromotionDef = {
  id: 'vanguard',
  name: 'Vanguard',
  description: '+10 combat strength, heals 20 HP after killing a unit',
  category: 'all',
  tier: 3,
  effects: [
    { type: 'COMBAT_BONUS', value: 10 },
    { type: 'HEAL_ON_KILL', value: 20 },
  ],
} as const;

export const ALL_PROMOTIONS: ReadonlyArray<PromotionDef> = [
  // Tier 1
  BATTLECRY,
  TORTOISE,
  VOLLEY,
  ARROWS,
  CHARGE,
  PURSUIT,
  AMBUSH,
  // Tier 2
  BLITZ,
  LOGISTICS,
  FLANKING,
  BREAKTHROUGH,
  SUPPRESSION,
  // Tier 3
  ELITE,
  VANGUARD,
] as const;
