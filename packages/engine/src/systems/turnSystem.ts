import type { GameState, GameAction, CityState, GameEvent, UnitState } from '../types/GameState';
import { coordToKey, distance } from '../hex/HexMath';
import { getMovementBonus } from '../state/EffectUtils';

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
    case 'DISMISS_EVENT':
      return handleDismissEvent(state, action.eventMessage, action.eventTurn);
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
      const unitDef = state.config.units.get(unit.typeId);
      const category = unitDef?.category ?? 'melee';
      const baseMovement = getBaseMovement(state, unit.typeId) + getMovementBonus(state, unit.owner, category);

      // Healing logic: heal damaged units at start of turn
      let health = unit.health;
      if (health < 100) {
        // Skip healing if unit used all movement last turn (attacked)
        const wasExhausted = unit.movementLeft === 0;
        if (!wasExhausted) {
          const healAmount = getHealAmount(unit.position, ownedCities, unit.owner, state, unit.typeId);
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

  // Only log turn start for human players — AI turn starts are noise
  const currentPlayer = state.players.get(state.currentPlayerId);
  const isHuman = currentPlayer?.isHuman ?? true;
  const newLog: GameEvent[] = isHuman
    ? [...state.log, {
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: `Turn ${state.turn} — your turn`,
        type: 'production' as const,
        severity: 'info' as const,
      }]
    : [...state.log];

  // Check for enemy units within 2 tiles of any of the human player's capital cities
  if (isHuman) {
    const capitalCities = ownedCities.filter(c => c.isCapital);
    for (const capital of capitalCities) {
      for (const unit of state.units.values()) {
        if (unit.owner === state.currentPlayerId) continue; // skip own units
        const dist = distance(capital.position, unit.position);
        if (dist <= 2) {
          const alreadyWarned = newLog.some(
            e => e.turn === state.turn &&
                 e.message.includes('near your capital') &&
                 e.message.includes(capital.name),
          );
          if (!alreadyWarned) {
            newLog.push({
              turn: state.turn,
              playerId: state.currentPlayerId,
              message: `Enemy ${unit.typeId} is ${dist} tile${dist === 1 ? '' : 's'} from your capital ${capital.name}!`,
              type: 'combat' as const,
              severity: 'critical' as const,
              blocksTurn: true as const,
            });
          }
          break; // one warning per capital per turn is enough
        }
      }
    }
  }

  return {
    ...state,
    phase: 'actions',
    units: updatedUnits,
    log: newLog,
    lastValidation: null,
  };
}

/**
 * Determine healing amount based on unit position relative to owned cities
 * and diplomacy, plus rulebook §6.9 "Boosting healing" additive bonuses:
 *   - Fort Town specialization (+5 on any tile owned by a fort_town city)
 *   - Partisan unique unit (+10 for units with typeId 'partisan')
 * Cap of 100 HP is enforced by the caller (see handleStartTurn).
 */
function getHealAmount(
  position: { readonly q: number; readonly r: number },
  ownedCities: ReadonlyArray<CityState>,
  unitOwner: string,
  state: GameState,
  typeId: string,
): number {
  const posKey = coordToKey(position);

  let base = 10; // Neutral territory default

  // Check if in a city (unit position matches city position)
  let cityTileMatch = false;
  for (const city of ownedCities) {
    if (coordToKey(city.position) === posKey) {
      base = 20;
      cityTileMatch = true;
      break;
    }
  }

  // Check if in friendly territory (unit position is in any owned city's territory)
  if (!cityTileMatch) {
    for (const city of ownedCities) {
      if (city.territory.includes(posKey)) {
        base = 15;
        break;
      }
    }
  }

  // Check if in enemy territory (owned by a player at war with the unit owner).
  // Only override if the base is still the neutral default (10): a tile inside
  // one of the unit owner's own cities/territories is never "enemy" territory.
  if (base === 10) {
    for (const city of state.cities.values()) {
      if (city.owner === unitOwner) continue; // skip own cities (already handled above)
      if (!city.territory.includes(posKey)) continue;
      // This tile belongs to another player — check if at war
      const enemyId = city.owner;
      for (const [key, rel] of state.diplomacy.relations) {
        if (rel.status === 'war' && key.includes(unitOwner) && key.includes(enemyId)) {
          base = 5; // enemy territory gives only 5 HP/turn
          break;
        }
      }
      if (base === 5) break;
    }
  }

  // Additive §6.9 bonuses.
  let bonus = 0;

  // H8 — Fort Town specialization: +5 HP/turn on tiles belonging to a
  // fort_town city owned by the unit owner (center or territory).
  for (const city of ownedCities) {
    if (city.specialization !== 'fort_town') continue;
    if (coordToKey(city.position) === posKey || city.territory.includes(posKey)) {
      bonus += 5;
      break;
    }
  }

  // H9 — Partisan unique unit: +10 HP/turn regardless of territory tier.
  if (typeId === 'partisan') {
    bonus += 10;
  }

  return base + bonus;
}

/**
 * F-05: Deep Ocean attrition — apply 1 HP damage per turn to any unit owned
 * by the current player that is resting on a deep ocean tile without
 * Shipbuilding mastery. This runs at END_TURN (units that survive the turn
 * in deep ocean are penalised). Cannot reduce HP below 1.
 */
function applyDeepOceanAttrition(state: GameState): GameState {
  const currentPlayer = state.players.get(state.currentPlayerId);
  const hasShipbuildingMastery = currentPlayer?.masteredTechs?.includes('shipbuilding') ?? false;
  if (hasShipbuildingMastery) return state;

  let updatedUnits: Map<string, UnitState> | null = null;
  const attritionLog: GameEvent[] = [];

  for (const [id, unit] of state.units) {
    if (unit.owner !== state.currentPlayerId) continue;
    const tile = state.map.tiles.get(coordToKey(unit.position));
    if (!tile) continue;
    const terrainDef = state.config.terrains.get(tile.terrain);
    if (!terrainDef?.isDeepOcean) continue;

    const newHp = Math.max(1, unit.health - 1);
    if (newHp === unit.health) continue; // already at min (shouldn't happen with HP > 1 condition)

    if (!updatedUnits) updatedUnits = new Map(state.units);
    updatedUnits.set(id, { ...unit, health: newHp });
    attritionLog.push({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `${unit.typeId} took 1 HP deep ocean attrition`,
      type: 'move' as const,
    });
  }

  if (!updatedUnits) return state;
  return {
    ...state,
    units: updatedUnits,
    log: [...state.log, ...attritionLog],
  };
}

function handleEndTurn(state: GameState): GameState {
  // F-01: Block END_TURN if an age transition is in progress (waiting for all players)
  if (state.transitionPhase === 'pending' || state.transitionPhase === 'in-progress') {
    return {
      ...state,
      lastValidation: {
        valid: false,
        reason: 'Cannot end turn while age transition is in progress.',
        category: 'general',
      },
    };
  }

  // Block END_TURN if the human player has any unacknowledged critical events this turn.
  // AI players bypass this check — they auto-dismiss all events.
  const currentPlayer = state.players.get(state.currentPlayerId);
  const isHuman = currentPlayer?.isHuman ?? true;
  if (isHuman) {
    if ((currentPlayer?.pendingGrowthChoices?.length ?? 0) > 0) {
      return {
        ...state,
        lastValidation: {
          valid: false,
          reason: 'Resolve pending city growth choices before ending your turn.',
          category: 'general',
        },
      };
    }

    const hasBlockingEvent = state.log.some(
      e => e.turn === state.turn &&
           e.playerId === state.currentPlayerId &&
           e.blocksTurn === true &&
           e.dismissed !== true,
    );
    if (hasBlockingEvent) {
      return {
        ...state,
        lastValidation: {
          valid: false,
          reason: 'You must acknowledge all critical alerts before ending your turn.',
          category: 'general',
        },
      };
    }

    // Block END_TURN if the player has an active crisis phase with unfilled policy slots.
    const crisisPhase = currentPlayer?.crisisPhase;
    if (crisisPhase && crisisPhase !== 'none' && crisisPhase !== 'resolved') {
      const filled = (currentPlayer.crisisPolicies ?? []).length;
      const required = currentPlayer.crisisPolicySlots ?? 0;
      if (filled < required) {
        return {
          ...state,
          lastValidation: {
            valid: false,
            reason: `Must fill all crisis policy slots before ending turn (${filled}/${required} filled).`,
            category: 'general',
          },
        };
      }
    }

    // X5.2: Block END_TURN if any active crisis has pendingResolution for this player.
    // pendingResolution is set when a crisis advances to a new stage; cleared by SLOT_CRISIS_POLICY.
    const hasPendingCrisis = state.crises.some(crisis => {
      if (!crisis.active || crisis.resolvedBy !== null) return false;
      if (!crisis.pendingResolution) return false;
      // Only block if this player has not yet slotted a policy for this stage
      const slotted = crisis.slottedPolicies?.get(state.currentPlayerId) ?? [];
      return slotted.length === 0;
    });
    if (hasPendingCrisis) {
      return {
        ...state,
        lastValidation: {
          valid: false,
          reason: 'A crisis requires your policy response before ending your turn.',
          category: 'general',
        },
      };
    }
  }

  // F-05: Apply deep ocean attrition before advancing turn order.
  const stateAfterAttrition = applyDeepOceanAttrition(state);

  const playerIds = [...stateAfterAttrition.players.keys()];
  const currentIndex = playerIds.indexOf(stateAfterAttrition.currentPlayerId);
  const isLastPlayer = currentIndex === playerIds.length - 1;

  if (isLastPlayer) {
    // All players have gone — advance to next turn (no log entry, it's just noise)
    const nextPlayerId = playerIds[0];
    return {
      ...stateAfterAttrition,
      turn: stateAfterAttrition.turn + 1,
      currentPlayerId: nextPlayerId,
      phase: 'start',
      lastValidation: null,
    };
  } else {
    // Advance to next player in the same turn
    const nextPlayerId = playerIds[currentIndex + 1];
    return {
      ...stateAfterAttrition,
      currentPlayerId: nextPlayerId,
      phase: 'start',
      lastValidation: null,
    };
  }
}

/**
 * Mark a specific log event as dismissed so it no longer blocks END_TURN.
 * Matched by (eventTurn, eventMessage) — the pair is unique enough for gameplay purposes.
 */
function handleDismissEvent(state: GameState, eventMessage: string, eventTurn: number): GameState {
  let changed = false;
  const newLog = state.log.map(e => {
    if (e.turn === eventTurn && e.message === eventMessage && e.dismissed !== true) {
      changed = true;
      return { ...e, dismissed: true as const };
    }
    return e;
  });
  if (!changed) return state;
  return { ...state, log: newLog };
}

/** Base movement points by unit type — driven by state.config.units */
function getBaseMovement(state: GameState, typeId: string): number {
  return state.config.units.get(typeId)?.movement ?? 2;
}
