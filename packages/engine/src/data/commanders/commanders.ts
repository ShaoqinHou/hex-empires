/**
 * Commander unit definitions — Cycle B of the Commander system.
 *
 * These are the first-ever Commander unit archetypes. Each commander
 * has an age, a role (land/naval/air), base cost / combat / movement,
 * an initial command aura radius, and a starting level.
 *
 * Design reference: `.claude/workflow/design/commander-system.md` §2.2
 * and `civ7-rulebook.md` §6.10.
 *
 * Type scoping: `types/Commander.ts` (cycle A) intentionally did NOT
 * define a unit-def interface — §2.2 of the design doc states that
 * each commander is "itself a UnitDef with category: 'commander'",
 * but `UnitCategory` has not yet been extended with 'commander' (that
 * edit is gated for a later cycle per the §10 non-goals list). To
 * avoid touching existing files, this cycle declares a local
 * `CommanderUnitDef` interface that mirrors the shape of `UnitDef`
 * while using an explicit `CommanderRole` discriminator. When the
 * unit-category extension lands in a later cycle, these records can
 * be migrated onto `UnitDef` without data churn.
 */

import type { UnitCategory } from '../../types/GameState';

/**
 * Functional role of a commander — used by the aura/pack system to
 * decide which friendly units can attach to this commander and which
 * categories its auras may target in tree-specific promotions.
 *
 * - `ground`  — land commander (Infantry / Cavalry / Siege).
 * - `naval`   — fleet commander (Naval units).
 * - `air`     — air-wing commander (modern-age only, Aircraft).
 */
export type CommanderRole = 'ground' | 'naval' | 'air';

/**
 * Commander unit archetype. Parallel to `UnitDef` during cycle B.
 *
 * - `category` is reused from the existing `UnitCategory` union purely
 *   for "compat fallback" — e.g. a ground commander is tagged `melee`
 *   so current combat code treats it as melee until the commander
 *   pipeline lands.
 * - `role` is the Commander-native discriminator.
 * - `auraRadius` is the base command radius in hex rings before any
 *   `AURA_EXPAND_RADIUS` picks; matches `COMMANDER_BASE_RADIUS`.
 * - `initialLevel` is the commander's starting level — 1 for ordinary
 *   produced commanders; kept configurable for scenario use.
 */
export interface CommanderUnitDef {
  readonly id: string;
  readonly name: string;
  readonly age: 'antiquity' | 'exploration' | 'modern';
  readonly role: CommanderRole;
  readonly category: UnitCategory;
  readonly cost: number;
  readonly combat: number;
  readonly movement: number;
  readonly auraRadius: number;
  readonly initialLevel: number;
}

// ── Antiquity ──

export const CAPTAIN: CommanderUnitDef = {
  id: 'captain',
  name: 'Captain',
  age: 'antiquity',
  role: 'ground',
  category: 'melee',
  cost: 80,
  combat: 15,
  movement: 2,
  auraRadius: 1,
  initialLevel: 1,
} as const;

// ── Exploration ──

export const GENERAL: CommanderUnitDef = {
  id: 'general',
  name: 'General',
  age: 'exploration',
  role: 'ground',
  category: 'melee',
  cost: 140,
  combat: 25,
  movement: 2,
  auraRadius: 1,
  initialLevel: 1,
} as const;

export const ADMIRAL: CommanderUnitDef = {
  id: 'admiral',
  name: 'Admiral',
  age: 'exploration',
  role: 'naval',
  category: 'naval',
  cost: 160,
  combat: 22,
  movement: 4,
  auraRadius: 1,
  initialLevel: 1,
} as const;

// ── Modern ──

export const MARSHAL: CommanderUnitDef = {
  id: 'marshal',
  name: 'Marshal',
  age: 'modern',
  role: 'ground',
  category: 'melee',
  cost: 220,
  combat: 40,
  movement: 3,
  auraRadius: 1,
  initialLevel: 1,
} as const;

export const FLEET_ADMIRAL: CommanderUnitDef = {
  id: 'fleet_admiral',
  name: 'Fleet Admiral',
  age: 'modern',
  role: 'naval',
  category: 'naval',
  cost: 240,
  combat: 38,
  movement: 5,
  auraRadius: 1,
  initialLevel: 1,
} as const;

/**
 * Modern-era air-wing commander. Added alongside M17's Helicopter and
 * Jet Fighter content so air stacks have a natural commander to attach
 * to. Role is `'air'`; falls back to the `ranged` unit category as
 * compat anchor (matching the Jet Fighter's category) until the
 * dedicated air-unit category lands.
 *
 * [CUSTOM-EXTENSION] — no VII source confirms air commanders (F-06).
 */
export const AIR_GENERAL: CommanderUnitDef = {
  id: 'air_general',
  name: 'Air General',
  age: 'modern',
  role: 'air',
  category: 'ranged',
  cost: 260,
  combat: 28,
  movement: 6,
  auraRadius: 2,
  initialLevel: 1,
} as const;

/**
 * Exploration-era irregular commander — leads partisans and guerilla
 * ground forces. Lower combat than a line General but cheaper to
 * produce; pairs with the `maneuver` promotion tree (Guerilla Tactics)
 * for flanking and extra-movement auras.
 *
 * [CUSTOM-EXTENSION] — no VII source confirms partisan commander subtype (F-10).
 */
export const PARTISAN_LEADER: CommanderUnitDef = {
  id: 'partisan_leader',
  name: 'Partisan Leader',
  age: 'exploration',
  role: 'ground',
  category: 'melee',
  cost: 120,
  combat: 18,
  movement: 3,
  auraRadius: 1,
  initialLevel: 1,
} as const;

/**
 * Catalogue of all Commander archetypes.
 *
 * Kept internal to this cycle — not yet re-exported from the engine
 * barrel. The pipeline wiring and save/load integration land in
 * cycle C (when `commanderPromotionSystem` ships).
 */
export const ALL_COMMANDERS: ReadonlyArray<CommanderUnitDef> = [
  CAPTAIN,
  GENERAL,
  ADMIRAL,
  PARTISAN_LEADER,
  MARSHAL,
  FLEET_ADMIRAL,
  AIR_GENERAL,
] as const;
