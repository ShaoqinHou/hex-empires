import type { GameState, GameAction, PlayerState } from '../types/GameState';

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
  // Refresh all units' movement for the current player
  const updatedUnits = new Map(state.units);
  for (const [id, unit] of updatedUnits) {
    if (unit.owner === state.currentPlayerId) {
      updatedUnits.set(id, {
        ...unit,
        movementLeft: getBaseMovement(unit.typeId),
        fortified: unit.fortified, // keep fortification status
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

/** Base movement points by unit type (will be driven by data later) */
function getBaseMovement(typeId: string): number {
  const movementTable: Record<string, number> = {
    settler: 2,
    builder: 2,
    warrior: 2,
    slinger: 2,
    archer: 2,
    spearman: 2,
    scout: 3,
    chariot: 3,
    horseman: 4,
    cavalry: 5,
  };
  return movementTable[typeId] ?? 2;
}
