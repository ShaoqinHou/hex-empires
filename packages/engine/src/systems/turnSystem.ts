import type { GameState, GameAction, PlayerState, CityState } from '../types/GameState';
import { coordToKey } from '../hex/HexMath';

/**
 * TurnSystem manages turn phases and player order.
 *
 * Turn flow:
 * 1. START_TURN → phase goes to 'actions', refresh units
 * 2. Player takes actions (MOVE_UNIT, ATTACK, etc.) during 'actions' phase
 * 3. END_TURN → phase goes to 'end', advance to next player or new turn
 */
export function turnSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'START_TURN':
      return handleStartTurn(state);
    case 'END_TURN':
      return handleEndTurn(state);
    default:
      // Block actions if not in 'actions' phase (except START/END)
      if (state.phase !== 'actions') {
        return state;
      }
      return state;
  }
}

function handleStartTurn(state: GameState): GameState {
  // Collect cities owned by the current player for healing calculations
  const ownedCities: CityState[] = [];
  for (const city of state.cities.values()) {
    if (city.owner === state.currentPlayerId) {
      ownedCities.push(city);
    }
  }

  // Refresh all units' movement for the current player + apply healing
  const updatedUnits = new Map(state.units);
  for (const [id, unit] of updatedUnits) {
    if (unit.owner === state.currentPlayerId) {
      const baseMovement = getBaseMovement(state, unit.typeId);

      // Healing logic: heal damaged units at start of turn
      let health = unit.health;
      if (health < 100) {
        // Skip healing if unit used all movement last turn (attacked)
        const wasExhausted = unit.movementLeft === 0;
        if (!wasExhausted) {
          const healAmount = getHealAmount(unit.position, ownedCities);
          health = Math.min(100, health + healAmount);
        }
      }

      updatedUnits.set(id, {
        ...unit,
        movementLeft: baseMovement,
        fortified: unit.fortified, // keep fortification status
        health,
      });
    }
  }

  return {
    ...state,
    phase: 'actions',
    units: updatedUnits,
    log: [...state.log, {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Turn ${state.turn} started for ${state.currentPlayerId}`,
      type: 'production',
    }],
  };
}

/** Determine healing amount based on unit position relative to owned cities */
function getHealAmount(
  position: { readonly q: number; readonly r: number },
  ownedCities: ReadonlyArray<CityState>,
): number {
  const posKey = coordToKey(position);

  // Check if in a city (unit position matches city position)
  for (const city of ownedCities) {
    if (coordToKey(city.position) === posKey) {
      return 20;
    }
  }

  // Check if in friendly territory (unit position is in any owned city's territory)
  for (const city of ownedCities) {
    if (city.territory.includes(posKey)) {
      return 15;
    }
  }

  // Neutral/enemy territory
  return 5;
}

function handleEndTurn(state: GameState): GameState {
  const playerIds = [...state.players.keys()];
  const currentIndex = playerIds.indexOf(state.currentPlayerId);
  const isLastPlayer = currentIndex === playerIds.length - 1;

  if (isLastPlayer) {
    // All players have gone — advance to next turn
    const nextPlayerId = playerIds[0];
    return {
      ...state,
      turn: state.turn + 1,
      currentPlayerId: nextPlayerId,
      phase: 'start',
      log: [...state.log, {
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: `Turn ${state.turn} ended`,
        type: 'production',
      }],
    };
  } else {
    // Advance to next player in the same turn
    const nextPlayerId = playerIds[currentIndex + 1];
    return {
      ...state,
      currentPlayerId: nextPlayerId,
      phase: 'start',
    };
  }
}

/** Base movement points by unit type — driven by state.config.units */
function getBaseMovement(state: GameState, typeId: string): number {
  return state.config.units.get(typeId)?.movement ?? 2;
}
