import { coordToKey, neighbors } from '../hex/HexMath';
import type { CommanderState } from '../types/Commander';
import type { GameState, UnitState } from '../types/GameState';

export const COMMANDER_RESPAWN_TURNS_STANDARD = 20 as const;

export function markCommanderDefeated(
  state: GameState,
  defeatedUnit: UnitState,
  currentCommanders: Map<string, CommanderState> | null,
): Map<string, CommanderState> | null {
  const commander = currentCommanders?.get(defeatedUnit.id)
    ?? state.commanders?.get(defeatedUnit.id);
  if (!commander) return currentCommanders;

  const nextCommanders = currentCommanders ?? new Map(state.commanders);
  nextCommanders.set(defeatedUnit.id, {
    ...commander,
    attachedUnits: [],
    packed: false,
    packedUnitStates: [],
    respawnTurnsRemaining: COMMANDER_RESPAWN_TURNS_STANDARD,
    respawnUnitState: {
      ...defeatedUnit,
      health: 100,
      movementLeft: 0,
      fortified: false,
      packedInCommanderId: null,
      facing: undefined,
    },
  });
  return nextCommanders;
}

export function tickCommanderRespawns(state: GameState): GameState {
  if (!state.commanders) return state;

  let nextCommanders: Map<string, CommanderState> | null = null;
  let nextUnits: Map<string, UnitState> | null = null;

  for (const [commanderId, commander] of state.commanders) {
    const turnsRemaining = commander.respawnTurnsRemaining;
    const respawnUnit = commander.respawnUnitState;
    if (turnsRemaining == null || turnsRemaining <= 0 || !respawnUnit) continue;
    if (respawnUnit.owner !== state.currentPlayerId) continue;
    if (state.units.has(commanderId)) continue;

    if (turnsRemaining > 1) {
      if (!nextCommanders) nextCommanders = new Map(state.commanders);
      nextCommanders.set(commanderId, {
        ...commander,
        respawnTurnsRemaining: turnsRemaining - 1,
      });
      continue;
    }

    const respawnPosition = findRespawnPosition(state, respawnUnit.owner);
    if (!respawnPosition) {
      if (!nextCommanders) nextCommanders = new Map(state.commanders);
      nextCommanders.set(commanderId, {
        ...commander,
        respawnTurnsRemaining: 1,
      });
      continue;
    }

    if (!nextCommanders) nextCommanders = new Map(state.commanders);
    if (!nextUnits) nextUnits = new Map(state.units);

    nextUnits.set(commanderId, {
      ...respawnUnit,
      position: respawnPosition,
      health: 100,
      movementLeft: 0,
      fortified: false,
      packedInCommanderId: null,
    });
    nextCommanders.set(commanderId, clearRespawnState(commander));
  }

  if (!nextCommanders && !nextUnits) return state;
  return {
    ...state,
    commanders: nextCommanders ?? state.commanders,
    units: nextUnits ?? state.units,
    lastValidation: null,
  };
}

function findRespawnPosition(state: GameState, owner: string) {
  const ownedCities = [...state.cities.values()].filter((city) => city.owner === owner);
  const anchorCity = ownedCities.find((city) => city.isCapital) ?? ownedCities[0];
  if (!anchorCity) return null;

  const occupied = new Set<string>();
  for (const unit of state.units.values()) {
    occupied.add(coordToKey(unit.position));
  }

  const candidates = [anchorCity.position, ...neighbors(anchorCity.position)];
  for (const candidate of candidates) {
    const key = coordToKey(candidate);
    if (!state.map.tiles.has(key)) continue;
    if (occupied.has(key)) continue;
    return candidate;
  }
  return null;
}

function clearRespawnState(commander: CommanderState): CommanderState {
  const {
    respawnTurnsRemaining: _respawnTurnsRemaining,
    respawnUnitState: _respawnUnitState,
    ...activeCommander
  } = commander;
  return {
    ...activeCommander,
    attachedUnits: [],
    packed: false,
    packedUnitStates: [],
  };
}
