import type { GameState, GameAction } from '../types/GameState';
import type { Governor, GovernorDef } from '../types/Governor';

/**
 * GovernorSystem handles governor recruitment, assignment, and promotion.
 *
 * Actions handled:
 * - RECRUIT_GOVERNOR: Recruit a governor from the available pool
 * - ASSIGN_GOVERNOR: Assign a recruited governor to a city
 * - UNASSIGN_GOVERNOR: Remove a governor from a city
 * - PROMOTE_GOVERNOR: Unlock a new ability for a governor
 */

/** Experience needed for a given level. Formula: base * (level ^ 1.5) */
function getExperienceForLevel(level: number, base: number): number {
  return Math.floor(base * Math.pow(level, 1.5));
}

/** Create a new Governor instance from a GovernorDef */
function createGovernor(def: GovernorDef): Governor {
  return {
    id: def.id,
    name: def.name,
    title: def.title,
    specialization: def.specialization,
    level: 1,
    experience: 0,
    experienceToNextLevel: getExperienceForLevel(1, def.baseExperience),
    assignedCity: null,
    abilities: [...def.baseAbilities],
    promotions: [],
  };
}

export function governorSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RECRUIT_GOVERNOR':
      return handleRecruit(state, action.governorId);
    case 'ASSIGN_GOVERNOR':
      return handleAssign(state, action.governorId, action.cityId);
    case 'UNASSIGN_GOVERNOR':
      return handleUnassign(state, action.governorId);
    case 'PROMOTE_GOVERNOR':
      return handlePromote(state, action.governorId, action.abilityId);
    default:
      return state;
  }
}

function handleRecruit(state: GameState, governorId: string): GameState {
  // Already recruited
  if (state.governors.has(governorId)) return state;

  // Look up definition
  const def = state.config.governors.get(governorId);
  if (!def) return state;

  // Check player hasn't exceeded governor limit (max 4 governors per player)
  const playerGovernors = [...state.governors.values()].filter(g => {
    // Governors are owned by the player who recruited them — tracked via player.governors
    const player = state.players.get(state.currentPlayerId);
    return player && player.governors.includes(g.id);
  });
  if (playerGovernors.length >= 4) return state;

  const governor = createGovernor(def);
  const updatedGovernors = new Map(state.governors);
  updatedGovernors.set(governorId, governor);

  // Add governor ID to player's governor list
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(state.currentPlayerId, {
    ...player,
    governors: [...player.governors, governorId],
  });

  return {
    ...state,
    governors: updatedGovernors,
    players: updatedPlayers,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Recruited governor ${def.name}`,
      type: 'production',
    }],
  };
}

function handleAssign(state: GameState, governorId: string, cityId: string): GameState {
  const governor = state.governors.get(governorId);
  if (!governor) return state;

  // Verify the player owns this governor
  const player = state.players.get(state.currentPlayerId);
  if (!player || !player.governors.includes(governorId)) return state;

  // Verify the city exists and belongs to the player
  const city = state.cities.get(cityId);
  if (!city || city.owner !== state.currentPlayerId) return state;

  // Check if another governor is already assigned to this city
  const existingGovernor = [...state.governors.values()].find(
    g => g.assignedCity === cityId && g.id !== governorId
  );

  const updatedGovernors = new Map(state.governors);

  // If another governor is there, unassign them first
  if (existingGovernor) {
    updatedGovernors.set(existingGovernor.id, {
      ...existingGovernor,
      assignedCity: null,
    });
  }

  // Assign the governor
  updatedGovernors.set(governorId, {
    ...governor,
    assignedCity: cityId,
  });

  return {
    ...state,
    governors: updatedGovernors,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Assigned governor ${governor.name} to ${city.name}`,
      type: 'production',
    }],
  };
}

function handleUnassign(state: GameState, governorId: string): GameState {
  const governor = state.governors.get(governorId);
  if (!governor) return state;
  if (governor.assignedCity === null) return state;

  // Verify the player owns this governor
  const player = state.players.get(state.currentPlayerId);
  if (!player || !player.governors.includes(governorId)) return state;

  const updatedGovernors = new Map(state.governors);
  updatedGovernors.set(governorId, {
    ...governor,
    assignedCity: null,
  });

  return {
    ...state,
    governors: updatedGovernors,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Unassigned governor ${governor.name}`,
      type: 'production',
    }],
  };
}

function handlePromote(state: GameState, governorId: string, abilityId: string): GameState {
  const governor = state.governors.get(governorId);
  if (!governor) return state;

  // Verify the player owns this governor
  const player = state.players.get(state.currentPlayerId);
  if (!player || !player.governors.includes(governorId)) return state;

  // Already has this promotion
  if (governor.promotions.includes(abilityId)) return state;

  // Look up the governor definition for unlockable abilities
  const def = state.config.governors.get(governorId);
  if (!def) return state;

  // Find the ability
  const ability = def.unlockableAbilities.find(a => a.id === abilityId);
  if (!ability) return state;

  // Check level requirement
  if (governor.level < ability.requiredLevel) return state;

  const updatedGovernors = new Map(state.governors);
  updatedGovernors.set(governorId, {
    ...governor,
    abilities: [...governor.abilities, ability],
    promotions: [...governor.promotions, abilityId],
  });

  return {
    ...state,
    governors: updatedGovernors,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Governor ${governor.name} unlocked ${ability.name}`,
      type: 'production',
    }],
  };
}
