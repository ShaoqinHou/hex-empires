import type { GameState, GameAction, CrisisState, CityState } from '../types/GameState';
import type { CrisisEventDef } from '../data/crises/types';

const REVOLUTIONARY_GOVERNMENT_OPTIONS = [
  'revolutionary_republic',
  'revolutionary_authoritarianism',
  'constitutional_monarchy',
] as const;

/**
 * CrisisSystem handles narrative/crisis events.
 *
 * On END_TURN:
 *   1. Checks if any crisis trigger conditions are met for crises not yet triggered; activates them.
 *   2. Advances crisis stage on active crises:
 *      - stage 1 fires at age progress ratio >= 0.33
 *      - stage 2 fires at age progress ratio >= 0.66
 *      - stage 3 fires at age progress ratio >= 1.00
 *      Each stage transition sets pendingResolution = true on the CrisisState.
 *
 * On RESOLVE_CRISIS: applies the chosen effects and marks the crisis as resolved.
 * On FORCE_CRISIS_POLICY: appends a policy id to the player's crisisPolicies list (legacy path).
 * On SLOT_CRISIS_POLICY (X5.2): slots a policy for a named crisis per-player; clears
 *   pendingResolution once the required number of players have slotted their policies.
 */
export function crisisSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'END_TURN': {
      let next = checkCrisisTriggers(state);
      next = advanceCrisisStages(next);
      return next;
    }
    case 'RESOLVE_CRISIS':
      return resolveCrisis(state, action.crisisId, action.choice);
    case 'FORCE_CRISIS_POLICY':
      return forceCrisisPolicy(state, action.policyId);
    case 'SLOT_CRISIS_POLICY':
      return slotCrisisPolicy(state, action.playerId, action.crisisId, action.policyId);
    default:
      return state;
  }
}

/** Check all crisis definitions for unresolved triggers */
function checkCrisisTriggers(state: GameState): GameState {
  const triggeredIds = new Set(state.crises.map(c => c.id));
  const newCrises: CrisisState[] = [];

  // F-04: filter by activeCrisisType when set — only crises matching
  // the seeded crisis type for the current age are eligible to trigger.
  const activeCrisisType = state.age.activeCrisisType;

  for (const def of state.config.crises) {
    if (triggeredIds.has(def.id)) continue;
    if (def.age && def.age !== state.age.currentAge) continue;

    // F-04: if the age system seeded an active crisis type, skip crises
    // that have a different crisisType (crises without crisisType are always eligible)
    if (activeCrisisType && def.crisisType && def.crisisType !== activeCrisisType) continue;

    if (isTriggerMet(state, def)) {
      newCrises.push(crisisFromDef(def, state.turn));
    }
  }

  if (newCrises.length === 0) return state;

  const logEntries = newCrises.map(c => ({
    turn: state.turn,
    playerId: state.currentPlayerId,
    message: `Crisis event: ${c.name}`,
    type: 'crisis' as const,
    severity: 'critical' as const,
    blocksTurn: true as const,
    category: 'crisis' as const,
    panelTarget: 'crisis' as const,
  }));

  return {
    ...state,
    crises: [...state.crises, ...newCrises],
    log: [...state.log, ...logEntries],
  };
}

/** Check whether a crisis definition's trigger condition is met */
function isTriggerMet(state: GameState, def: CrisisEventDef): boolean {
  switch (def.triggerCondition) {
    case 'turn_reached':
      return typeof def.triggerValue === 'number' && state.turn >= def.triggerValue;

    case 'tech_researched': {
      // triggerValue is the number of techs required (as number) or a specific tech id (as string)
      const player = state.players.get(state.currentPlayerId);
      if (!player) return false;
      if (typeof def.triggerValue === 'number') {
        return player.researchedTechs.length >= def.triggerValue;
      }
      return player.researchedTechs.includes(def.triggerValue);
    }

    case 'war_declared': {
      // Check if any relation involving current player is at war
      for (const [key, rel] of state.diplomacy.relations) {
        if (key.includes(state.currentPlayerId) && rel.status === 'war') {
          return true;
        }
      }
      return false;
    }

    case 'city_founded': {
      // triggerValue is the number of cities required
      const playerCities = [...state.cities.values()].filter(
        c => c.owner === state.currentPlayerId,
      ).length;
      return typeof def.triggerValue === 'number' && playerCities >= def.triggerValue;
    }

    case 'compound': {
      // All sub-conditions in compoundTrigger must be satisfied
      const cond = def.compoundTrigger;
      if (!cond) return false;

      if (cond.minTurn !== undefined && state.turn < cond.minTurn) return false;

      if (cond.minCityPopulation !== undefined) {
        const playerCities = [...state.cities.values()].filter(
          c => c.owner === state.currentPlayerId,
        );
        const hasLargeEnoughCity = playerCities.some(c => c.population >= cond.minCityPopulation!);
        if (!hasLargeEnoughCity) return false;
      }

      if (cond.minResearchedTechs !== undefined) {
        const player = state.players.get(state.currentPlayerId);
        if (!player) return false;
        if (player.researchedTechs.length < cond.minResearchedTechs) return false;
      }

      return true;
    }

    case 'age_progress': {
      // triggerValue is a threshold in [0, 1] — fires when player.ageProgress / ageThreshold >= threshold
      const player = state.players.get(state.currentPlayerId);
      if (!player) return false;
      if (typeof def.triggerValue !== 'number') return false;
      const { currentAge, ageThresholds } = state.age;
      // Get the threshold for the NEXT age (the one we're working toward)
      const nextAge = currentAge === 'antiquity' ? 'exploration' : currentAge === 'exploration' ? 'modern' : null;
      if (!nextAge) return false; // already in modern, no next age threshold
      const maxProgress = ageThresholds[nextAge];
      if (maxProgress <= 0) return false;
      const ratio = player.ageProgress / maxProgress;
      return ratio >= def.triggerValue;
    }

    default:
      return false;
  }
}

/**
 * X5.2: Advance stage for all active crises based on the current player's age
 * progress ratio.  Stage thresholds (VII-correct):
 *   no stage  → stage 1  at ratio >= 0.33
 *   stage 1   → stage 2  at ratio >= 0.66
 *   stage 2   → stage 3  at ratio >= 1.00
 *
 * Each new stage sets pendingResolution = true on the CrisisState.
 * Stages only advance; resolved crises are skipped.
 *
 * Also keeps the legacy per-player crisisPhase in sync (70%/80%/90% thresholds)
 * so turnSystem.ts's existing policy-slot gate still works.
 */
function advanceCrisisStages(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // Compute age progress ratio for the next age threshold
  const { currentAge, ageThresholds } = state.age;
  const nextAge = currentAge === 'antiquity' ? 'exploration' : currentAge === 'exploration' ? 'modern' : null;
  if (!nextAge) return state; // modern — no next threshold
  const maxProgress = ageThresholds[nextAge];
  if (maxProgress <= 0) return state;
  const ratio = player.ageProgress / maxProgress;

  // ── X5.2: advance CrisisState.stage for each active crisis ──
  let crisisesChanged = false;
  const updatedCrises = state.crises.map(crisis => {
    if (!crisis.active) return crisis;
    if (crisis.resolvedBy !== null) return crisis;

    const currentStage = crisis.stage ?? 0;
    let newStage: 1 | 2 | 3 | 0 = currentStage;

    if (currentStage === 0 && ratio >= 0.33) newStage = 1;
    else if (currentStage === 1 && ratio >= 0.66) newStage = 2;
    else if (currentStage === 2 && ratio >= 1.00) newStage = 3;

    if (newStage === currentStage) return crisis;

    crisisesChanged = true;
    return {
      ...crisis,
      stage: newStage as 1 | 2 | 3,
      stageStartedTurn: state.turn,
      pendingResolution: true,
    };
  });

  // ── Legacy: keep per-player crisisPhase in sync (existing turnSystem gate) ──
  const currentPhase = player.crisisPhase ?? 'none';
  let newPhase: 'none' | 'stage1' | 'stage2' | 'stage3' | 'resolved' = currentPhase;
  let newSlots: number = player.crisisPolicySlots ?? 0;

  if (currentPhase !== 'resolved') {
    if (currentPhase === 'none' && ratio >= 0.70) { newPhase = 'stage1'; newSlots = 2; }
    else if (currentPhase === 'stage1' && ratio >= 0.80) { newPhase = 'stage2'; newSlots = 3; }
    else if (currentPhase === 'stage2' && ratio >= 0.90) { newPhase = 'stage3'; newSlots = 4; }
  }

  const phaseChanged = newPhase !== currentPhase;
  const hasActiveRevolutionCrisis = updatedCrises.some(crisis => {
    if (!crisis.active || crisis.resolvedBy !== null) return false;
    const def = state.config.crises.find(d => d.id === crisis.id);
    return def?.crisisType === 'revolution' && def.age === 'exploration';
  });
  const opensRevolutionaryGovernmentChoice =
    state.age.currentAge === 'exploration' &&
    state.age.activeCrisisType === 'revolution' &&
    hasActiveRevolutionCrisis &&
    newPhase === 'stage3' &&
    currentPhase !== 'stage3' &&
    (player.pendingGovernmentChoice ?? null) === null;

  if (!crisisesChanged && !phaseChanged) return state;

  let nextState: GameState = crisisesChanged ? { ...state, crises: updatedCrises } : state;

  if (phaseChanged) {
    const updatedPlayers = new Map(nextState.players);
    updatedPlayers.set(player.id, {
      ...player,
      crisisPhase: newPhase,
      crisisPolicySlots: newSlots,
      crisisPolicies: (player.crisisPolicies ?? []).slice(0, newSlots),
      ...(opensRevolutionaryGovernmentChoice
        ? {
            governmentId: null,
            slottedPolicies: [],
            governmentLockedForAge: false,
            pendingGovernmentChoice: {
              reason: 'revolutions_final_stage' as const,
              sourceCrisisType: 'revolution' as const,
              sourceStage: 3 as const,
              options: [...REVOLUTIONARY_GOVERNMENT_OPTIONS],
            },
          }
        : {}),
    });
    nextState = { ...nextState, players: updatedPlayers };
  }

  const newStageNames = updatedCrises
    .filter((c, i) => crisisesChanged && c !== state.crises[i] && c.active)
    .map(c => `${c.name} → Stage ${c.stage ?? 0}`);

  const logMessages = [
    ...(phaseChanged ? [{
      turn: state.turn,
      playerId: player.id,
      message: `Crisis escalated to ${newPhase} — fill ${newSlots} policy slots before ending your turn.`,
      type: 'crisis' as const,
      severity: 'critical' as const,
      category: 'crisis' as const,
      panelTarget: 'crisis' as const,
    }] : []),
    ...(opensRevolutionaryGovernmentChoice ? [{
      turn: state.turn,
      playerId: player.id,
      message: 'The Revolutions crisis has revoked your government. Choose a revolutionary government.',
      type: 'crisis' as const,
      severity: 'critical' as const,
      category: 'crisis' as const,
      panelTarget: 'crisis' as const,
    }] : []),
    ...newStageNames.map(name => ({
      turn: state.turn,
      playerId: player.id,
      message: `${name} — policies required before turn end.`,
      type: 'crisis' as const,
      severity: 'critical' as const,
      blocksTurn: true as const,
      category: 'crisis' as const,
      panelTarget: 'crisis' as const,
    })),
  ];

  if (logMessages.length === 0) return nextState;

  return { ...nextState, log: [...nextState.log, ...logMessages] };
}

/**
 * Append a policy id to the current player's crisisPolicies list.
 * No-ops if: the player has no active crisis phase, the policy is already
 * present, or the list is already at capacity (crisisPolicySlots).
 */
function forceCrisisPolicy(state: GameState, policyId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  const phase = player.crisisPhase ?? 'none';
  if (phase === 'none' || phase === 'resolved') return state;

  const existing = player.crisisPolicies ?? [];
  const maxSlots = player.crisisPolicySlots ?? 0;

  if (existing.includes(policyId)) return state;
  if (existing.length >= maxSlots) return state;

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    crisisPolicies: [...existing, policyId],
  });

  return { ...state, players: updatedPlayers };
}

/**
 * X5.2: SLOT_CRISIS_POLICY handler.
 *
 * Appends policyId to the named crisis's per-player slottedPolicies map.
 * Clears pendingResolution on the crisis once the required minimum is met
 * (at least 1 policy slotted per active player per stage).
 *
 * No-ops if:
 * - Crisis not found or not active
 * - Player has already slotted this policy for this crisis
 */
function slotCrisisPolicy(state: GameState, playerId: string, crisisId: string, policyId: string): GameState {
  const crisisIndex = state.crises.findIndex(c => c.id === crisisId && c.active);
  if (crisisIndex === -1) return state;

  const crisis = state.crises[crisisIndex];

  // Build new slottedPolicies map
  const currentSlottedPolicies = crisis.slottedPolicies ?? new Map<string, ReadonlyArray<string>>();
  const playerPolicies = currentSlottedPolicies.get(playerId) ?? [];

  // Deduplicate — policy already slotted
  if (playerPolicies.includes(policyId)) return state;

  const newPlayerPolicies: ReadonlyArray<string> = [...playerPolicies, policyId];
  const newSlottedPolicies = new Map(currentSlottedPolicies);
  newSlottedPolicies.set(playerId, newPlayerPolicies);

  // Check if all active human players have slotted at least one policy for this crisis
  // (pendingResolution clears when every active player has >= 1 policy slotted)
  const activePlayers = [...state.players.values()].filter(p => p.isHuman);
  const allSlotted = activePlayers.every(p => {
    const slots = newSlottedPolicies.get(p.id);
    return slots && slots.length > 0;
  });

  const updatedCrisis: CrisisState = {
    ...crisis,
    slottedPolicies: newSlottedPolicies,
    pendingResolution: allSlotted ? false : crisis.pendingResolution,
  };

  const updatedCrises = [...state.crises];
  updatedCrises[crisisIndex] = updatedCrisis;

  return { ...state, crises: updatedCrises };
}

/** Convert a CrisisEventDef to a CrisisState */
function crisisFromDef(def: CrisisEventDef, turn: number): CrisisState {
  return {
    id: def.id,
    name: def.name,
    active: true,
    turn,
    choices: def.choices.map(c => ({
      id: c.id,
      text: c.text,
      effects: c.effects.map(e => {
        // Map crisis effect types to EffectDef compatible types
        // For effects that don't map to EffectDef directly, we use MODIFY_YIELD as a carrier
        if (e.type === 'MODIFY_YIELD' && e.yield) {
          return {
            type: 'MODIFY_YIELD' as const,
            target: e.target as 'city' | 'empire' | 'unit' | 'tile',
            yield: e.yield as 'food' | 'production' | 'gold' | 'science' | 'culture' | 'faith',
            value: e.value,
          };
        }
        // For MODIFY_GOLD, LOSE_POPULATION, SPAWN_ENEMIES — use MODIFY_YIELD as a proxy
        // The actual effect handling is done in resolveCrisis
        return {
          type: 'MODIFY_YIELD' as const,
          target: 'empire' as const,
          yield: 'gold' as const,
          value: 0,
        };
      }),
    })),
    resolvedBy: null,
    choiceMade: null,
  };
}

/** Apply the chosen crisis effects and mark as resolved */
function resolveCrisis(state: GameState, crisisId: string, choiceId: string): GameState {
  const crisisIndex = state.crises.findIndex(c => c.id === crisisId && c.active);
  if (crisisIndex === -1) return state;

  const crisis = state.crises[crisisIndex];

  // Find the original def for full effect info
  const def = state.config.crises.find(d => d.id === crisisId);
  if (!def) return state;

  const choiceDef = def.choices.find(c => c.id === choiceId);
  if (!choiceDef) return state;

  // Apply effects
  let nextState = state;
  for (const effect of choiceDef.effects) {
    nextState = applyCrisisEffect(nextState, effect);
  }

  // Mark crisis as resolved
  const updatedCrises = [...nextState.crises];
  updatedCrises[crisisIndex] = {
    ...crisis,
    active: false,
    resolvedBy: nextState.currentPlayerId,
    choiceMade: choiceId,
  };

  return {
    ...nextState,
    crises: updatedCrises,
    log: [...nextState.log, {
      turn: nextState.turn,
      playerId: nextState.currentPlayerId,
      message: `Crisis "${crisis.name}" resolved: chose "${choiceDef.text}"`,
      type: 'crisis' as const,
      category: 'crisis' as const,
    }],
  };
}

/** Apply a single crisis effect to the game state */
function applyCrisisEffect(
  state: GameState,
  effect: { readonly type: string; readonly target: string; readonly yield?: string; readonly value: number; readonly probability?: number },
): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  switch (effect.type) {
    case 'MODIFY_GOLD': {
      const updatedPlayers = new Map(state.players);
      updatedPlayers.set(state.currentPlayerId, {
        ...player,
        gold: Math.max(0, player.gold + effect.value),
      });
      return { ...state, players: updatedPlayers };
    }

    case 'MODIFY_YIELD': {
      if (!effect.yield) return state;
      const updatedPlayers = new Map(state.players);
      const yieldKey = effect.yield as 'gold' | 'science' | 'culture' | 'faith';
      if (yieldKey in player) {
        updatedPlayers.set(state.currentPlayerId, {
          ...player,
          [yieldKey]: Math.max(0, (player[yieldKey] as number) + effect.value),
        });
        return { ...state, players: updatedPlayers };
      }
      // For food/production — logged but not directly on player
      return state;
    }

    case 'LOSE_POPULATION': {
      const playerCities = [...state.cities.entries()]
        .filter(([, c]) => c.owner === state.currentPlayerId);

      if (playerCities.length === 0) return state;

      let targetCity: [string, CityState];
      if (effect.target === 'largest_city') {
        targetCity = playerCities.reduce((a, b) => a[1].population > b[1].population ? a : b);
      } else {
        // random_city — use first city (deterministic without RNG for simplicity)
        targetCity = playerCities[0];
      }

      const [cityId, city] = targetCity;
      if (city.population <= 1) return state; // don't kill the city

      const updatedCities = new Map(state.cities);
      updatedCities.set(cityId, {
        ...city,
        population: city.population - effect.value,
      });
      return { ...state, cities: updatedCities };
    }

    case 'SPAWN_ENEMIES': {
      // Log the spawn — actual unit spawning would need more infrastructure
      return {
        ...state,
        log: [...state.log, {
          turn: state.turn,
          playerId: state.currentPlayerId,
          message: `${effect.value} enemy warriors appear near your borders!`,
          type: 'crisis' as const,
        }],
      };
    }

    case 'REDUCE_CITY_HAPPINESS': {
      // Probabilistic happiness reduction for all player cities.
      // Uses the seeded RNG counter so the outcome is deterministic and replayable.
      const probability = effect.probability ?? 1.0;
      // Derive a pseudo-random value from the seeded RNG state (deterministic).
      const rngValue = ((state.rng.seed * 1664525 + state.rng.counter * 22695477 + 1013904223) >>> 0) / 0xFFFFFFFF;
      if (rngValue > probability) return state;

      const playerCities = [...state.cities.entries()].filter(
        ([, c]) => c.owner === state.currentPlayerId,
      );
      if (playerCities.length === 0) return state;

      const updatedCities = new Map(state.cities);
      for (const [cityId, city] of playerCities) {
        updatedCities.set(cityId, {
          ...city,
          happiness: Math.max(0, city.happiness + effect.value), // effect.value is negative (e.g. -1)
        });
      }
      return {
        ...state,
        cities: updatedCities,
        rng: { ...state.rng, counter: state.rng.counter + 1 },
      };
    }

    default:
      return state;
  }
}
