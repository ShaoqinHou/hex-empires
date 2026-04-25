import type { GameState, GameAction, ActiveEffect, PlayerState, PolicySlotType, EffectDef } from '../types/GameState';

/**
 * CivicSystem handles civic research (parallel to tech tree, uses culture).
 * - SET_CIVIC: pick a civic to research
 * - SET_CIVIC_MASTERY: begin mastering an already-researched civic (costs 80% of original, grants +1 culture/turn)
 * - END_TURN: accumulate culture toward current civic/mastery, complete when done
 */
export function civicSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SET_CIVIC':
      return handleSetCivic(state, action.civicId);
    case 'SET_CIVIC_MASTERY':
      return handleSetCivicMastery(state, action.civicId);
    case 'END_TURN':
      return processCivicResearch(state);
    case 'TRANSITION_AGE':
      return clearCivicProgressOnTransition(state);
    default:
      return state;
  }
}

function handleSetCivic(state: GameState, civicId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Can't research already-known civic
  if (player.researchedCivics.includes(civicId)) return state;

  // Civic must exist in config
  const civicDef = state.config.civics.get(civicId);
  if (!civicDef) return state;

  // Civic must belong to the player's current age
  if (civicDef.age !== player.age) return state;

  // Civ-specific civics are only available to the matching civilization
  if (civicDef.civId !== undefined && civicDef.civId !== player.civilizationId) return state;

  // Ideology branch-lock (W2-03 CT F-08):
  // If civic belongs to an ideology branch and the player's ideology is set,
  // civics from the other two branches are locked out.
  if (civicDef.ideologyBranch !== undefined) {
    if (player.ideology == null) {
      // Ideology-branch civics require ideology to be selected first
      return state;
    }
    if (civicDef.ideologyBranch !== player.ideology) {
      // Wrong ideology branch — locked out
      return state;
    }
  }

  // All prerequisites must be researched
  const allPrereqsMet = civicDef.prerequisites.every(
    prereq => player.researchedCivics.includes(prereq)
  );
  if (!allPrereqsMet) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    currentCivic: civicId,
    civicProgress: 0,
  });

  return { ...state, players: updatedPlayers };
}

/**
 * Begin mastering an already-researched civic.
 * Requirements:
 *   - Civic must be in researchedCivics
 *   - Civic must NOT already be in masteredCivics
 *   - No active civic mastery in progress
 */
function handleSetCivicMastery(state: GameState, civicId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  if (!player.researchedCivics.includes(civicId)) return state;
  if (player.masteredCivics.includes(civicId)) return state;
  if (player.currentCivicMastery !== null) return state;

  const civicDef = state.config.civics.get(civicId);
  if (!civicDef) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    currentCivicMastery: civicId,
    civicMasteryProgress: 0,
  });

  return { ...state, players: updatedPlayers };
}

/** Civic mastery costs 80% of the original civic cost, rounded up */
const CIVIC_MASTERY_COST_MULTIPLIER = 0.8;

function processCivicResearch(state: GameState): GameState {
  let next = state;
  next = processNormalCivicResearch(next);
  next = processCivicMasteryResearch(next);
  return next;
}

function processNormalCivicResearch(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player || !player.currentCivic) return state;

  // Calculate culture per turn from cities/buildings
  let culturePerTurn = 0;
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    culturePerTurn += 1; // base 1 culture per city
    for (const buildingId of city.buildings) {
      const buildingDef = state.config.buildings.get(buildingId);
      if (buildingDef?.yields.culture) {
        culturePerTurn += buildingDef.yields.culture;
      }
    }
  }

  // Minimum 1 culture per turn if the player has any cities
  if (culturePerTurn === 0) {
    const hasCities = [...state.cities.values()].some(c => c.owner === player.id);
    if (hasCities) culturePerTurn = 1;
  }

  if (culturePerTurn <= 0) return state;

  const newProgress = player.civicProgress + culturePerTurn;

  // Check if civic is complete
  const civicCost = state.config.civics.get(player.currentCivic)?.cost ?? 100;

  if (newProgress >= civicCost) {
    // Civic complete! Open policy swap window (W2-03 GP F-08)
    // F-02: Carry overflow culture forward instead of discarding it.
    const overflow = newProgress - civicCost;
    const completedCivicId = player.currentCivic;

    // Y2.1: Apply on-completion effects (e.g. GRANT_POLICY_SLOT)
    const completedCivicDef = state.config.civics.get(completedCivicId);
    const updatedSlotCounts = applyCompletionEffects(player, completedCivicDef?.effects);

    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(player.id, {
      ...player,
      researchedCivics: [...player.researchedCivics, completedCivicId],
      // F-13: Append to completedCivics history log (ordered by completion time)
      completedCivics: [...(player.completedCivics ?? []), completedCivicId],
      currentCivic: null,
      civicProgress: overflow,
      // F-13: Removed ageProgress +5 per civic — age progress comes from
      // ageSystem's END_TURN milestone check only.
      policySwapWindowOpen: true,
      // Y2.1: Conditionally update policySlotCounts if civic grants slots
      ...(updatedSlotCounts !== null ? { policySlotCounts: updatedSlotCounts } : {}),
    });

    return {
      ...state,
      players: updatedPlayers,
      log: [...state.log, {
        turn: state.turn,
        playerId: player.id,
        message: `Completed civic: ${player.currentCivic}!`,
        type: 'civic',
        category: 'civic' as const,
        panelTarget: 'civics' as const,
      }],
    };
  }

  // Accumulate progress
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    civicProgress: newProgress,
  });

  return { ...state, players: updatedPlayers };
}

function processCivicMasteryResearch(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player || !player.currentCivicMastery) return state;

  let culturePerTurn = 0;
  for (const city of state.cities.values()) {
    if (city.owner !== player.id) continue;
    culturePerTurn += 1;
    for (const buildingId of city.buildings) {
      const buildingDef = state.config.buildings.get(buildingId);
      if (buildingDef?.yields.culture) {
        culturePerTurn += buildingDef.yields.culture;
      }
    }
  }

  if (culturePerTurn === 0) {
    const hasCities = [...state.cities.values()].some(c => c.owner === player.id);
    if (hasCities) culturePerTurn = 1;
  }

  if (culturePerTurn <= 0) return state;

  const civicDef = state.config.civics.get(player.currentCivicMastery);
  const civicBaseCost = civicDef?.cost ?? 100;
  const masteryCost = Math.ceil(civicBaseCost * CIVIC_MASTERY_COST_MULTIPLIER);

  const newProgress = player.civicMasteryProgress + culturePerTurn;

  if (newProgress >= masteryCost) {
    // F-09: Apply per-civic masteryUnlocks, or fall back to generic +1 culture
    const masteryEffects: ReadonlyArray<ActiveEffect> = civicDef?.masteryUnlocks
      ? civicDef.masteryUnlocks.map(effect => ({
          source: `civic_mastery:${player.currentCivicMastery}`,
          effect,
        }))
      : [{
          source: `civic_mastery:${player.currentCivicMastery}`,
          effect: {
            type: 'MODIFY_YIELD' as const,
            target: 'empire' as const,
            yield: 'culture' as const,
            value: 1,
          },
        }];

    const updatedPlayers = new Map(state.players);
    updatedPlayers.set(player.id, {
      ...player,
      masteredCivics: [...player.masteredCivics, player.currentCivicMastery],
      currentCivicMastery: null,
      civicMasteryProgress: 0,
      legacyBonuses: [...player.legacyBonuses, ...masteryEffects],
    });

    // Build a human-readable summary of effects
    const effectSummary = masteryEffects
      .map(e => {
        if (e.effect.type === 'MODIFY_YIELD') return `+${e.effect.value} ${e.effect.yield}`;
        if (e.effect.type === 'MODIFY_COMBAT') return `+${e.effect.value} combat (${e.effect.target})`;
        if (e.effect.type === 'MODIFY_MOVEMENT') return `+${e.effect.value} movement (${e.effect.target})`;
        return e.effect.type;
      })
      .join(', ');

    return {
      ...state,
      players: updatedPlayers,
      log: [...state.log, {
        turn: state.turn,
        playerId: player.id,
        message: `Mastered civic: ${civicDef?.name ?? player.currentCivicMastery}! (${effectSummary})`,
        type: 'civic',
        category: 'civic' as const,
        panelTarget: 'civics' as const,
      }],
    };
  }

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    civicMasteryProgress: newProgress,
  });

  return { ...state, players: updatedPlayers };
}

/**
 * On TRANSITION_AGE: reset in-progress civic research and mastery for the
 * transitioning player. Completed civics (researchedCivics) and mastered
 * civics (masteredCivics) are permanent records that persist across ages.
 *
 * Note: ageSystem also resets these fields in its TRANSITION_AGE handler.
 * This handler exists as defense-in-depth — the same pattern as researchSystem
 * clearing techProgressMap — so civicSystem is self-consistent and testable
 * in isolation regardless of pipeline ordering.
 */
function clearCivicProgressOnTransition(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Nothing to reset if no civic research or mastery is in progress
  const hasProgress = player.currentCivic !== null
    || player.civicProgress > 0
    || player.currentCivicMastery !== null
    || player.civicMasteryProgress > 0;
  if (!hasProgress) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    // Reset in-progress civic research
    currentCivic: null,
    civicProgress: 0,
    // Reset in-progress civic mastery
    currentCivicMastery: null,
    civicMasteryProgress: 0,
    // researchedCivics and masteredCivics are NOT reset — they persist as a
    // permanent historical record across ages (X1.3 / F-14).
  });

  return { ...state, players: updatedPlayers };
}

/**
 * Y2.1: Apply on-completion civic effects to a player's policy slot counts.
 * Returns updated policySlotCounts if any GRANT_POLICY_SLOT effects are
 * present; null if no slot-granting effects exist (caller omits the field).
 */
function applyCompletionEffects(
  player: PlayerState,
  effects?: ReadonlyArray<EffectDef>,
): { readonly military: number; readonly economic: number; readonly diplomatic: number; readonly wildcard: number } | null {
  if (!effects || effects.length === 0) return null;

  let hasSlotEffect = false;
  const current = player.policySlotCounts ?? { military: 0, economic: 0, diplomatic: 0, wildcard: 0 };
  let military = current.military;
  let economic = current.economic;
  let diplomatic = current.diplomatic;
  let wildcard = current.wildcard;

  for (const effect of effects) {
    if (effect.type === 'GRANT_POLICY_SLOT') {
      hasSlotEffect = true;
      const slotType = effect.slotType as PolicySlotType;
      if (slotType === 'military') military++;
      else if (slotType === 'economic') economic++;
      else if (slotType === 'diplomatic') diplomatic++;
      else if (slotType === 'wildcard') wildcard++;
    }
  }

  if (!hasSlotEffect) return null;
  return { military, economic, diplomatic, wildcard };
}
