/**
 * Religion types — parallel namespace for the Religion & Pantheons
 * mechanic. No engine wiring yet; these types exist for design review,
 * compile-time tests, and downstream data-file cycles.
 *
 * Civ VII layers religion in two tiers:
 *
 * 1. **Pantheons** — first-tier, unlocked when a player's Faith pool
 *    crosses a threshold; grants a single passive bonus to all cities
 *    owned by that player. One pantheon per player, permanent for the
 *    rest of the game (it survives age transitions).
 *
 * 2. **Religions** — second-tier, founded by spending Faith at a
 *    specific city (typically the one containing a Holy Site / Temple).
 *    A religion has 1 founding belief, and gains up to 3 more beliefs
 *    over time as followers accumulate. Religions spread to other
 *    cities via Missionary / Apostle units and passive pressure from
 *    neighboring cities and trade routes.
 *
 * None of the existing engine systems touch religion beyond the `faith`
 * yield; the actions and state defined here are picked up in a later
 * cycle. See `.claude/workflow/design/religion-system.md` for the full
 * plan and §18 of the rulebook (merged later) for the in-game rules.
 *
 * Rulebook gap: `.claude/workflow/design/rulebook-gaps.md` §M2, §6.
 */

import type { PlayerId, CityId, UnitId, CivilizationId } from './Ids';
import type { EffectDef } from './GameState';

// ── Branded IDs ──

/**
 * Identifier for a `PantheonDef` entry.
 *
 * Alias of string today; kept nominal so pantheon IDs cannot silently
 * leak into religion / belief code.
 */
export type PantheonId = string;

/**
 * Identifier for a `ReligionDef` entry. Religion IDs are generated at
 * runtime when a player founds a religion (e.g. `religion.p1.buddhism`);
 * the founding player supplies the display name but the ID is stable.
 */
export type ReligionId = string;

/**
 * Identifier for a `BeliefDef` entry. Beliefs are picked from a fixed
 * pool so IDs are content-registered and stable across saves.
 */
export type BeliefId = string;

// ── Belief categories ──

/**
 * Belief slots on a religion. Civ-style 4X conventions categorize
 * beliefs by who the bonus applies to:
 *
 * - `follower`  — applies to every city that follows this religion
 *                 (regardless of owner). Picked at founding.
 * - `founder`   — applies only to the civ that founded the religion,
 *                 globally. Picked at founding.
 * - `enhancer`  — applies to the founding civ once the religion is
 *                 "enhanced" by spending faith a second time.
 * - `worship`   — unlocks a unique worship building the founding civ
 *                 can construct in every city with this religion.
 *
 * These slots are independent: a religion has at most one of each. The
 * exact Civ VII slot names are an open question — see design §9.
 */
export type BeliefCategory = 'follower' | 'founder' | 'enhancer' | 'worship';

// ── Definition types (content) ──

/**
 * A Pantheon is a first-tier bonus picked once per player. Exactly one
 * `bonus` effect applies empire-wide for the rest of the game.
 *
 * `faithCost` is the Faith pool threshold that unlocks the pick. Picks
 * are first-come-first-served: once a pantheon is chosen by one player
 * it is no longer available to others (modelled as "uniqueness" at the
 * system level, not the type level).
 */
export interface PantheonDef {
  readonly id: PantheonId;
  readonly name: string;
  readonly description: string;
  readonly bonus: EffectDef;
  readonly faithCost: number;
}

/**
 * A Belief is an individual selectable bonus slotted into a religion.
 * The `category` determines which slot it fills on a religion; the
 * `bonus` field reuses the core `EffectDef` union so religion bonuses
 * and civ/leader bonuses share evaluation code.
 */
export interface BeliefDef {
  readonly id: BeliefId;
  readonly name: string;
  readonly description: string;
  readonly category: BeliefCategory;
  readonly bonus: EffectDef;
}

/**
 * A founded religion. Unlike pantheons, religions are created by a
 * player at runtime, so `ReligionDef` here is the runtime
 * "definition-plus-state" shape — the data-file equivalent would only
 * hold the founding mechanics, not `founderId` / `foundedTurn`.
 *
 * - `founderId`  — the civ that founded it; persists even after age
 *                  transitions (the civ may no longer be that player's
 *                  active civ by then).
 * - `holyCityId` — the city where it was founded; receives passive
 *                  Faith pressure bonuses. If captured, ownership moves
 *                  but the founder bonuses stay with `founderId`.
 * - `beliefs`    — ordered: [founder, follower, enhancer?, worship?].
 *                  Enhancer and worship slots may be null until the
 *                  religion is enhanced.
 */
export interface ReligionDef {
  readonly id: ReligionId;
  readonly name: string;
  readonly founderId: CivilizationId;
  readonly foundedByPlayer: PlayerId;
  readonly foundedTurn: number;
  readonly holyCityId: CityId;
  readonly beliefs: ReadonlyArray<BeliefId>;
}

// ── Per-city dominant religion tracking ──

/**
 * A city's religious census. Pressure accumulates each turn from
 * neighboring cities, trade routes, and visiting religious units; the
 * religion with highest pressure becomes `dominant`.
 *
 * - `dominant`   — the religion with the most followers; null if the
 *                  city has no majority religion yet.
 * - `pressure`   — per-religion pressure counter. Converted to
 *                  followers at the end of each turn.
 * - `followers`  — per-religion follower count; bounded by city pop.
 */
export interface CityReligiousState {
  readonly cityId: CityId;
  readonly dominant: ReligionId | null;
  readonly pressure: ReadonlyMap<ReligionId, number>;
  readonly followers: ReadonlyMap<ReligionId, number>;
}

// ── Player-level religious state ──

/**
 * Per-player religious state. The global `faith` yield lives on
 * `PlayerState.faith` already; this record layers pantheon/religion
 * choices on top.
 *
 * - `pantheonId`  — null until picked. Picked once, never changed.
 * - `religionId`  — null if this player has not founded a religion.
 *                   Multiple players may end up with null if religion
 *                   slots are exhausted before they could afford the
 *                   founding cost.
 * - `missionaryCharges` — reserved for cycle C; tracks how many spread
 *                   uses a player's outstanding Missionary/Apostle
 *                   units have left. Kept on the player rather than
 *                   the unit so Apostle-vs-Apostle theological combat
 *                   can drain charges symmetrically.
 */
export interface PlayerReligiousState {
  readonly playerId: PlayerId;
  readonly pantheonId: PantheonId | null;
  readonly religionId: ReligionId | null;
  readonly missionaryCharges: number;
}

// ── Top-level ReligionState (attaches to GameState in a later cycle) ──

/**
 * Top-level religion slice of game state. Not yet attached to
 * `GameState`; landed in the system-wiring cycle.
 *
 * - `pantheons`    — every pantheon pick made in the game, keyed by
 *                    picking player. At most one entry per player.
 * - `religions`    — every founded religion, keyed by religion ID.
 * - `players`      — per-player pantheon/religion references + unit
 *                    charge counter.
 * - `cities`       — per-city pressure and follower census.
 * - `availablePantheonSlots` — how many pantheon slots remain; bounded
 *                    by `PantheonDef` registry size. When it hits 0
 *                    no more players may adopt a pantheon.
 * - `availableReligionSlots` — same for religions; Civ VII bounds this
 *                    at ~(player count − 1) by default.
 */
export interface ReligionState {
  readonly pantheons: ReadonlyMap<PlayerId, PantheonId>;
  readonly religions: ReadonlyMap<ReligionId, ReligionDef>;
  readonly players: ReadonlyMap<PlayerId, PlayerReligiousState>;
  readonly cities: ReadonlyMap<CityId, CityReligiousState>;
  readonly availablePantheonSlots: number;
  readonly availableReligionSlots: number;
}

// ── Religion-scoped actions (not yet in GameAction; wired in cycle C) ──

/**
 * Action payload shapes for religion-scoped actions. These are not yet
 * added to `GameAction` — they live here as types until the system
 * file lands.
 *
 * `SPREAD_RELIGION` is notionally emitted by the system each turn
 * (not a player action), but typing it here keeps the dispatch surface
 * uniform and simplifies tests.
 */
export type ReligionAction =
  | {
      readonly type: 'ADOPT_PANTHEON';
      readonly playerId: PlayerId;
      readonly pantheonId: PantheonId;
    }
  | {
      readonly type: 'FOUND_RELIGION';
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly religionName: string;
      readonly founderBelief: BeliefId;
      readonly followerBelief: BeliefId;
    }
  | {
      readonly type: 'ENHANCE_RELIGION';
      readonly playerId: PlayerId;
      readonly cityId: CityId;
      readonly religionId: ReligionId;
      readonly enhancerBelief: BeliefId;
      readonly worshipBelief: BeliefId;
    }
  | {
      readonly type: 'SPREAD_RELIGION';
      readonly unitId: UnitId;
      readonly targetCityId: CityId;
    }
  | {
      readonly type: 'PROMOTE_RELIGIOUS_UNIT';
      readonly unitId: UnitId;
      readonly promotionId: string;
    }
  | {
      readonly type: 'INITIATE_THEOLOGICAL_COMBAT';
      readonly attackerId: UnitId;
      readonly defenderId: UnitId;
    };

// ── Constants ──

/**
 * Default Faith threshold to unlock the pantheon pick. Individual
 * `PantheonDef.faithCost` entries override this if non-zero; the
 * constant is the fallback for early-game balance. Exact Civ VII
 * number is an open question — see design §9.
 */
export const PANTHEON_DEFAULT_FAITH_COST = 25 as const;

/**
 * Default Faith cost to found a religion. Actual value may scale by
 * game speed or age; see design §9.
 */
export const RELIGION_FOUND_FAITH_COST = 200 as const;

/**
 * Default Faith cost to enhance a founded religion (adds enhancer +
 * worship beliefs).
 */
export const RELIGION_ENHANCE_FAITH_COST = 400 as const;

/**
 * Base hex range at which a city contributes religious pressure to
 * neighbors every turn.
 */
export const RELIGIOUS_PRESSURE_RADIUS = 10 as const;

/**
 * Maximum belief slots on an enhanced religion:
 * founder + follower + enhancer + worship = 4.
 */
export const MAX_RELIGION_BELIEFS = 4 as const;

// ── Religion cycle D — runtime record for founded religions ──

/**
 * Lightweight runtime record stored in `ReligionState` (or on a
 * synthetic `state.religion` slot, see religionSystem.ts) once a player
 * successfully dispatches `FOUND_RELIGION`.
 *
 * This is a narrower shape than `ReligionDef` (no `founderId` civ
 * dependency, no `foundedByPlayer`/`foundedTurn` split) so the
 * FOUND_RELIGION handler can emit it without pulling civ-id bookkeeping
 * in from elsewhere. Once `GameState.religion` is widened this type may
 * be folded into or replaced by `ReligionDef` proper.
 *
 * Uniqueness: at most one record may use a given `founderBeliefId`, and
 * at most one may use a given `followerBeliefId` — enforced by the
 * system, not the type.
 */
export interface ReligionRecord {
  readonly id: string;
  readonly name: string;
  readonly founderPlayerId: PlayerId;
  readonly founderBeliefId: string;
  readonly followerBeliefId: string;
  readonly holyCityId: CityId;
  readonly foundedOnTurn: number;
}

// ── Religion cycle E — runtime slot attached to GameState.religion ──

/**
 * The runtime shape of the optional `GameState.religion` slot.
 *
 * This is deliberately narrower than the full M16 design-target
 * `ReligionState` above — it carries only what the current
 * religionSystem actually writes: the append-only list of founded
 * religions, and an optional map tracking unique pantheon claims. Later
 * cycles will grow the slot toward the full design shape.
 *
 * Kept additive alongside `ReligionState` so the design-target types
 * and their unit tests are unaffected while the system ramps up.
 *
 * Uniqueness of founder/follower beliefs is enforced by religionSystem
 * via linear scan of `religions`; `pantheonClaims` records the same
 * uniqueness for pantheons once ADOPT_PANTHEON wires through.
 */
export interface ReligionSlotState {
  readonly religions: ReadonlyArray<ReligionRecord>;
  readonly pantheonClaims?: ReadonlyMap<PantheonId, PlayerId>;
}
