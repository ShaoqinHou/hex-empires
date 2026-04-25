/**
 * resourceAssignmentSystem — standalone pure system for Resource Slot
 * assignment (rulebook §13.3).
 *
 * This system is NOT wired into the `GameEngine` pipeline. It exists so
 * UI panels and tests can consume Resource Slot assignment logic in
 * isolation while the GameState schema is gradually widened. Wiring and
 * type unification with `GameAction` happen in a later cycle (same
 * precedent as `religionSystem` / `governmentSystem`).
 *
 * Scope (rulebook §13.3):
 *  - `ASSIGN_RESOURCE`   — attach one of the player's owned resources to
 *    a settlement, provided the settlement has a free Resource Slot.
 *  - `UNASSIGN_RESOURCE` — detach a previously-assigned resource from a
 *    settlement.
 *
 * Slot counts (§13.3 base values, ignoring buildings/wonders which are
 * not yet represented on CityState):
 *   - Town: 1 slot
 *   - City: 2 slots
 *
 * Graceful no-op: the current `CityState` schema does NOT yet expose an
 * `assignedResources` field, and `PlayerState` does NOT yet expose an
 * `ownedResources` field. When either is missing the system returns
 * state unchanged rather than throwing. This mirrors the M10
 * `religionSystem` pattern. Tests exercise the happy path by attaching
 * those fields structurally on synthetic CityState / PlayerState records.
 *
 * Import boundaries: only `../types/` — no cross-system imports, no side
 * effects, fully pure.
 */

import type {
  GameState,
  CityState,
  PlayerState,
  SettlementType,
} from '../types/GameState';
import type { CityId, PlayerId, ResourceId } from '../types/Ids';

// ── Local action union ──────────────────────────────────────────────

/**
 * Local-scope actions handled by this system. Not yet part of the
 * canonical `GameAction`; a later cycle will unify them.
 */
export type ResourceAssignmentAction =
  | {
      readonly type: 'ASSIGN_RESOURCE';
      readonly resourceId: ResourceId;
      readonly cityId: CityId;
      readonly playerId: PlayerId;
    }
  | {
      readonly type: 'UNASSIGN_RESOURCE';
      readonly resourceId: ResourceId;
      readonly cityId: CityId;
      readonly playerId: PlayerId;
    };

/**
 * Widened action union accepted by resourceAssignmentSystem. The system
 * accepts any shape with a `type` field and only reacts to the two local
 * action types, mirroring the religionSystem signature pattern.
 */
export type ResourceAssignmentSystemAction =
  | ResourceAssignmentAction
  | { readonly type: string };

// ── Schema extension shapes (optional fields) ───────────────────────

/**
 * Structural extension of `CityState` with the optional
 * `assignedResources` field. Used as a runtime predicate target so the
 * system can no-op gracefully when the field is absent.
 */
interface CityWithAssignments extends CityState {
  readonly assignedResources: ReadonlyArray<ResourceId>;
}

/**
 * Structural extension of `PlayerState` with an optional
 * `ownedResources` field. When present, ownership is validated against
 * this list. When absent the system treats ownership as "unverifiable"
 * and no-ops for safety.
 */
interface PlayerWithOwnedResources extends PlayerState {
  readonly ownedResources: ReadonlyArray<ResourceId>;
}

// ── Runtime predicates ──────────────────────────────────────────────

function hasAssignedResources(city: CityState): city is CityWithAssignments {
  const maybe = (city as Partial<CityWithAssignments>).assignedResources;
  return Array.isArray(maybe);
}

function hasOwnedResources(
  player: PlayerState,
): player is PlayerWithOwnedResources {
  const maybe = (player as Partial<PlayerWithOwnedResources>).ownedResources;
  return Array.isArray(maybe);
}

// ── Slot count helper (exported for UI reuse) ───────────────────────

/**
 * Base Resource Slot capacity for a settlement. §13.3 lists additional
 * slots from buildings (Market +1, Lighthouse +2, Hospital +2, Bazaar
 * +1, Port +1, Department Store +1) and town specializations (Factory
 * Town +1); those are layered on top here based on the settlement's
 * current building list and specialization.
 */
export function getResourceSlotCapacity(city: CityState): number {
  const base = baseSlotsForSettlement(city.settlementType);
  const buildingBonus = slotsFromBuildings(city.buildings);
  const specializationBonus =
    city.specialization === 'factory_town' ? 1 : 0;
  return base + buildingBonus + specializationBonus;
}

function baseSlotsForSettlement(type: SettlementType): number {
  // Rulebook §13.3: Town = 1 slot, City = 2 slots (base).
  return type === 'city' ? 2 : 1;
}

/**
 * Sum of slot bonuses from buildings listed in the city's
 * `buildings` array. Unknown building ids contribute 0.
 */
function slotsFromBuildings(
  buildings: ReadonlyArray<string>,
): number {
  let total = 0;
  for (const id of buildings) {
    total += SLOT_BONUS_BY_BUILDING[id] ?? 0;
  }
  return total;
}

/**
 * Building → Resource Slot bonus table from §13.3 / the buildings
 * tables. Kept as a small module-local lookup to avoid cross-data
 * imports; all known slot-granting buildings are enumerated here.
 */
const SLOT_BONUS_BY_BUILDING: Readonly<Record<string, number>> = {
  market: 1,
  lighthouse: 2,
  bazaar: 1,
  port: 1,
  department_store: 1,
  hospital: 2,
  factory: 1,
};

// ── Main system function ────────────────────────────────────────────

/**
 * resourceAssignmentSystem — pure function, no mutation, no side
 * effects.
 *
 * Returns the input state unchanged for actions the system does not
 * handle, for invalid dispatches (unknown ids, missing ownership,
 * exceeded slot capacity), and for graceful no-ops when the optional
 * schema fields are absent.
 */
export function resourceAssignmentSystem(
  state: GameState,
  action: ResourceAssignmentSystemAction,
): GameState {
  if (action.type === 'ASSIGN_RESOURCE') {
    return handleAssign(state, action as Extract<
      ResourceAssignmentAction,
      { type: 'ASSIGN_RESOURCE' }
    >);
  }
  if (action.type === 'UNASSIGN_RESOURCE') {
    return handleUnassign(state, action as Extract<
      ResourceAssignmentAction,
      { type: 'UNASSIGN_RESOURCE' }
    >);
  }
  return state;
}

// ── ASSIGN_RESOURCE ─────────────────────────────────────────────────

function handleAssign(
  state: GameState,
  action: Extract<ResourceAssignmentAction, { type: 'ASSIGN_RESOURCE' }>,
): GameState {
  const { resourceId, cityId, playerId } = action;

  // Resource must exist in the content registry.
  if (!state.config.resources.has(resourceId)) return state;

  // City must exist and be owned by the requesting player.
  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== playerId) return state;

  // Player must exist.
  const player = state.players.get(playerId);
  if (!player) return state;

  // Ownership verification: if the player schema exposes
  // `ownedResources`, require the id to be listed. If the field is
  // absent, we cannot verify ownership — no-op.
  if (!hasOwnedResources(player)) return state;
  if (!player.ownedResources.includes(resourceId)) return state;

  // Slot storage: if the city schema does not yet carry
  // `assignedResources`, no-op gracefully.
  if (!hasAssignedResources(city)) return state;

  // Refuse duplicate assignments (same resource twice in one city).
  if (city.assignedResources.includes(resourceId)) return state;

  // Enforce slot capacity (§13.3).
  const capacity = getResourceSlotCapacity(city);
  if (city.assignedResources.length >= capacity) return state;

  // Apply: append to the city's assignedResources list.
  const updatedCity: CityWithAssignments = {
    ...city,
    assignedResources: [...city.assignedResources, resourceId],
  };
  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, updatedCity);

  // Z3.3: Increment resourcesAssigned counter on the player
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(playerId, {
    ...player,
    resourcesAssigned: (player.resourcesAssigned ?? 0) + 1,
  });

  return {
    ...state,
    cities: updatedCities,
    players: updatedPlayers,
  };
}

// ── UNASSIGN_RESOURCE ───────────────────────────────────────────────

function handleUnassign(
  state: GameState,
  action: Extract<
    ResourceAssignmentAction,
    { type: 'UNASSIGN_RESOURCE' }
  >,
): GameState {
  const { resourceId, cityId, playerId } = action;

  const city = state.cities.get(cityId);
  if (!city) return state;
  if (city.owner !== playerId) return state;

  // If the slot field is absent, no-op.
  if (!hasAssignedResources(city)) return state;

  // Nothing to remove.
  if (!city.assignedResources.includes(resourceId)) return state;

  const updatedCity: CityWithAssignments = {
    ...city,
    assignedResources: city.assignedResources.filter((r) => r !== resourceId),
  };
  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, updatedCity);

  // Z3.3: Decrement resourcesAssigned counter on the player (clamp at 0)
  const unassignPlayer = state.players.get(playerId);
  if (unassignPlayer) {
    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(playerId, {
      ...unassignPlayer,
      resourcesAssigned: Math.max(0, (unassignPlayer.resourcesAssigned ?? 0) - 1),
    });
    return {
      ...state,
      cities: updatedCities,
      players: updatedPlayers,
    };
  }

  return {
    ...state,
    cities: updatedCities,
  };
}
