import type { GameState, GameAction, ActiveEffect, EffectDef, LegacyPaths, GameEvent, IndependentPowerState } from '../types/GameState';
import type { YieldType } from '../types/Yields';
import type { CrisisType } from '../data/crises/types';
import { nextRandom } from '../state/SeededRng';
import { scoreLegacyPaths } from '../state/LegacyPaths';
import { createDefaultIPState } from '../state/IPStateFactory';

/**
 * AgeSystem handles age transitions and legacy milestone tracking.
 * - TRANSITION_AGE: pick a new civilization for the next age, get legacy bonus + legacy point bonuses + golden/dark age effects
 * - END_TURN: check and award legacy milestones
 */
export function ageSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'TRANSITION_AGE':
      return handleTransition(state, action.newCivId);
    case 'END_TURN':
      return checkLegacyMilestones(state);
    case 'CHOOSE_LEGACY_BONUSES':
      return handleChooseLegacyBonuses(state, action.picks);
    default:
      return state;
  }
}

function handleTransition(state: GameState, newCivId: string): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  const nextAge = getNextAge(player.age);
  if (!nextAge) return state; // already in modern age

  const threshold = state.age.ageThresholds[nextAge];
  if (player.ageProgress < threshold) return state; // not ready

  // F-03: unresolved crisis blocks transition
  if (player.crisisPhase && player.crisisPhase !== 'none' && player.crisisPhase !== 'resolved') {
    return state;
  }

  // Get legacy bonus from current civ (F-06: uses state.config, not hardcoded table)
  const legacyBonus = getCivLegacyBonus(player.civilizationId, state);

  // Determine golden/dark age effects based on legacy path milestones (max 1 golden age per transition)
  let rng = state.rng;
  const goldenDarkResult = getGoldenDarkAgeEffects(player.legacyPaths, player.age, rng, player.goldenAgeChosen ?? null);
  rng = goldenDarkResult.rng;

  // Dark age effects apply immediately (penalties are not selectable)
  const darkAgeEffects = goldenDarkResult.effects.filter(e => e.source.includes('dark-age'));
  let bonuses: ActiveEffect[] = [...player.legacyBonuses, ...darkAgeEffects];

  // F-04: Collect eligible bonuses for player selection (max 4 shown, max 2 pickable)
  const eligible: Array<{ bonusId: string; axis: string; description: string; effect: EffectDef }> = [];

  if (legacyBonus) {
    eligible.push({
      bonusId: legacyBonus.source,
      axis: 'civ',
      description: `Legacy bonus from ${player.civilizationId}`,
      effect: legacyBonus.effect,
    });
  }

  const yieldTypes: ReadonlyArray<YieldType> = ['food', 'production', 'gold', 'science', 'culture'];
  for (let i = 0; i < player.legacyPoints; i++) {
    const result = nextRandom(rng);
    rng = result.rng;
    const yieldType = yieldTypes[Math.floor(result.value * yieldTypes.length)];
    eligible.push({
      bonusId: `legacy-point:${player.age}:${i}`,
      axis: 'legacy-points',
      description: `+1 ${yieldType} (legacy point)`,
      effect: { type: 'MODIFY_YIELD', target: 'empire', yield: yieldType, value: 1 },
    });
  }

  // Golden age effects are eligible for selection
  const goldenAgeEffects = goldenDarkResult.effects.filter(e => !e.source.includes('dark-age'));
  for (const ge of goldenAgeEffects) {
    const axis = ge.source.includes(':military:') ? 'military'
      : ge.source.includes(':economic:') ? 'economic'
      : ge.source.includes(':science:') ? 'science'
      : 'culture';
    eligible.push({
      bonusId: ge.source,
      axis,
      description: `Golden Age bonus (${axis})`,
      effect: ge.effect,
    });
  }

  const pendingLegacyBonuses = eligible.slice(0, 4);

  const updatedPlayers = new Map(state.players);

  // Apply immediate gold penalty from economic dark age
  let goldAdjustment = 0;
  for (const effect of goldenDarkResult.effects) {
    if (effect.source.includes('dark-age:economic')) {
      // Find the gold penalty marker
      if (effect.effect.type === 'MODIFY_YIELD' && effect.effect.yield === 'gold' && effect.effect.value === -50) {
        goldAdjustment -= 50;
      }
    }
  }

  updatedPlayers.set(player.id, {
    ...player,
    civilizationId: newCivId,
    age: nextAge,
    ageProgress: 0,
    legacyBonuses: bonuses,
    pendingLegacyBonuses: pendingLegacyBonuses.length > 0 ? pendingLegacyBonuses : undefined,
    legacyPoints: 0, // spent all legacy points (reset; totalCareerLegacyPoints is not reset)
    gold: player.gold + goldAdjustment,
    // Reset per-age counters for the new age
    killsThisAge: 0,
    goldenAgeChosen: null,
    // ── Tech tree reset (§16.1 #9) ──
    researchedTechs: player.researchedTechs,
    currentResearch: null,
    researchProgress: 0,
    masteredTechs: [],
    currentMastery: null,
    masteryProgress: 0,
    // ── Civic tree reset (§16.1 #9) ──
    researchedCivics: [],
    currentCivic: null,
    civicProgress: 0,
    masteredCivics: [],
    currentCivicMastery: null,
    civicMasteryProgress: 0,
    // ── Government reset — require re-selection in new age ──
    governmentId: null,
    slottedPolicies: [],
    // Unlock government selection for the new age (W2-03 CT F-07)
    governmentLockedForAge: false,
    // Clear ideology for new age
    ideology: null,
    // ── Religion — pantheon only clears on Antiquity→Exploration (§18) ──
    pantheonId: (state.age.currentAge === 'antiquity') ? null : player.pantheonId,
    // ── Attribute points (W3-07) — award 1 point per age transition ──
    // attributeTree and wildcard/non-wildcard pools are intentionally NOT reset
    // (the only in-game upgrade system that persists across ages).
    attributePoints: (player.attributePoints ?? 0) + 1,
    // ── Celebration reset (W3-03 F-06) ──
    // globalHappiness and celebrationCount reset to 0 on age transition.
    // socialPolicySlots is intentionally PRESERVED (GDD: slots carry across ages).
    // activeCelebrationBonus / pendingCelebrationChoice also cleared.
    globalHappiness: 0,
    celebrationCount: 0,
    activeCelebrationBonus: null,
    celebrationTurnsLeft: 0,
    celebrationBonus: 0,
    pendingCelebrationChoice: null,
  });

  const logEntries: GameEvent[] = [
    {
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: `Transitioned to ${nextAge} age as ${newCivId}`,
      type: 'age',
      category: 'age' as const,
      panelTarget: 'age' as const,
    },
    ...goldenDarkResult.logEntries.map(msg => ({
      turn: state.turn,
      playerId: state.currentPlayerId,
      message: msg,
      type: 'age' as const,
      category: 'age' as const,
      panelTarget: 'age' as const,
    })),
  ];

  // Seed one crisis type from the new age's pool via seeded RNG
  const { activeCrisisType, rng: rngAfterCrisisSeed } = seedAgeCrisis(state.config.crises, nextAge, rng);

  // ── F-03: Independent Powers age-transition reset ──
  // Remove all non-incorporated IPs; clear suzerainties from all players; re-seed for new age.
  let updatedIPMap: ReadonlyMap<string, IndependentPowerState> | undefined;
  if (state.independentPowers !== undefined) {
    const nextIPs = new Map<string, IndependentPowerState>();
    // Keep incorporated IPs (they become towns — survived the transition)
    for (const [id, ip] of state.independentPowers) {
      if (ip.isIncorporated) nextIPs.set(id, ip);
    }
    // Re-seed IPs for the new age from config (if independentPowers config present)
    if (state.config.independentPowers) {
      for (const [, ipDef] of state.config.independentPowers) {
        if (ipDef.age === nextAge && !nextIPs.has(ipDef.id)) {
          nextIPs.set(ipDef.id, createDefaultIPState(ipDef));
        }
      }
    }
    updatedIPMap = nextIPs;
  }

  // Clear suzerainties from all players on age transition
  for (const [pid, p] of updatedPlayers) {
    updatedPlayers.set(pid, {
      ...p,
      suzerainties: [],
      suzerainBonuses: new Map<string, string>(),
    });
  }

  // F-07: Age-transition city downgrade — all non-capital cities revert to towns,
  // productionQueue/productionProgress cleared, specialization reset.
  // Exemption: Economic Golden Age (legacyPaths.economic === 3) skips downgrade.
  const hasEconomicGoldenAge = (player.legacyPaths?.economic ?? 0) === 3;
  let updatedCities = state.cities;
  if (!hasEconomicGoldenAge) {
    const nextCities = new Map(state.cities);
    let citiesChanged = false;
    for (const [cityId, city] of state.cities) {
      if (city.owner !== player.id) continue;
      if (city.isCapital) continue; // capital stays as city
      if (city.settlementType === 'town') continue; // already a town
      nextCities.set(cityId, {
        ...city,
        settlementType: 'town' as const,
        productionQueue: [],
        productionProgress: 0,
        specialization: null,
      });
      citiesChanged = true;
    }
    if (citiesChanged) {
      updatedCities = nextCities;
      logEntries.push({
        turn: state.turn,
        playerId: state.currentPlayerId,
        message: 'Non-capital cities reverted to towns on age transition.',
        type: 'age' as const,
        category: 'age' as const,
        panelTarget: 'age' as const,
      });
    }
  }

  // F-07 (population-specialists): Reset food to 0 for all cities owned by
  // the transitioning player so the growth curve restarts fresh in the new age.
  {
    const nextCities = new Map(updatedCities);
    let foodReset = false;
    for (const [cityId, city] of updatedCities) {
      if (city.owner !== player.id) continue;
      if (city.food === 0) continue;
      nextCities.set(cityId, { ...city, food: 0 });
      foodReset = true;
    }
    if (foodReset) updatedCities = nextCities;
  }

  // W4-04 (F-08): state.commanders is intentionally NOT reset here.
  // Commander state (XP, promotions, packed army) persists across age transitions.
  // The spread `...state` below preserves the commanders map unchanged.
  return {
    ...state,
    players: updatedPlayers,
    cities: updatedCities,
    age: { ...state.age, currentAge: nextAge, activeCrisisType },
    rng: rngAfterCrisisSeed,
    log: [...state.log, ...logEntries],
    ...(updatedIPMap !== undefined ? { independentPowers: updatedIPMap } : {}),
  };
}

/**
 * Pick one crisis type from the pool of crises defined for `age` via seeded RNG.
 * Returns the selected crisis type string (or null if the age has no typed crises).
 */
function seedAgeCrisis(
  crises: ReadonlyArray<{ readonly id: string; readonly age?: string; readonly crisisType?: string }>,
  age: string,
  rng: import('../types/GameState').RngState,
): { activeCrisisType: string | null; rng: import('../types/GameState').RngState } {
  // Build a deduplicated pool of crisis types for this age
  const typeSet = new Set<string>();
  for (const def of crises) {
    if (def.age === age && def.crisisType) {
      typeSet.add(def.crisisType);
    }
  }
  const pool = [...typeSet] as CrisisType[];

  if (pool.length === 0) {
    return { activeCrisisType: null, rng };
  }

  const { value, rng: nextRng } = nextRandom(rng);
  const idx = Math.floor(value * pool.length);
  return { activeCrisisType: pool[idx], rng: nextRng };
}

interface GoldenDarkResult {
  readonly effects: ReadonlyArray<ActiveEffect>;
  readonly logEntries: ReadonlyArray<string>;
  readonly rng: import('../types/GameState').RngState;
}

/**
 * Determine golden/dark age effects based on legacy path milestones.
 * For each path:
 *   milestones === 3 -> Golden Age effect (F-05: at most ONE golden age per transition)
 *   milestones === 0 -> Dark Age effect (all dark ages still apply)
 *   otherwise -> Normal (no special effect)
 *
 * Golden age cap: pick the axis named in `goldenAgeChosen` if it has tier 3;
 * otherwise the first tier-3 axis (military → economic → science → culture).
 * Dark ages are uncapped — all tier-0 axes apply.
 */
function getGoldenDarkAgeEffects(
  paths: LegacyPaths,
  age: string,
  rng: import('../types/GameState').RngState,
  goldenAgeChosen: 'military' | 'economic' | 'science' | 'culture' | null,
): GoldenDarkResult {
  const effects: ActiveEffect[] = [];
  const logEntries: string[] = [];
  let currentRng = rng;

  // F-05: Determine the single allowed golden age axis.
  const axes: ReadonlyArray<'military' | 'economic' | 'science' | 'culture'> = ['military', 'economic', 'science', 'culture'];
  let goldenAxisGranted: 'military' | 'economic' | 'science' | 'culture' | null = null;
  if (goldenAgeChosen != null && paths[goldenAgeChosen] === 3) {
    goldenAxisGranted = goldenAgeChosen;
  } else {
    for (const ax of axes) {
      if (paths[ax] === 3) {
        goldenAxisGranted = ax;
        break;
      }
    }
  }

  // Military path
  if (paths.military === 3 && goldenAxisGranted === 'military') {
    effects.push({
      source: `golden-age:military:${age}`,
      effect: { type: 'MODIFY_COMBAT', target: 'all', value: 5 },
    });
    logEntries.push('Military Golden Age! +5 combat strength for all units permanently.');
  } else if (paths.military === 0) {
    effects.push({
      source: `dark-age:military:${age}`,
      effect: { type: 'MODIFY_COMBAT', target: 'all', value: 3 },
    });
    effects.push({
      source: `dark-age:military:${age}:penalty`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: -2 },
    });
    logEntries.push('Military Dark Age! +3 combat but -2 happiness in all cities.');
  }

  // Economic path
  if (paths.economic === 3 && goldenAxisGranted === 'economic') {
    effects.push({
      source: `golden-age:economic:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: 3 },
    });
    logEntries.push('Economic Golden Age! +3 gold in all cities permanently.');
  } else if (paths.economic === 0) {
    effects.push({
      source: `dark-age:economic:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'gold', value: -50 },
    });
    effects.push({
      source: `dark-age:economic:${age}:bonus`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'production', value: 2 },
    });
    logEntries.push('Economic Dark Age! -50 gold immediately but +2 production permanently.');
  }

  // Science path
  if (paths.science === 3 && goldenAxisGranted === 'science') {
    effects.push({
      source: `golden-age:science:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 3 },
    });
    logEntries.push('Science Golden Age! +3 science in all cities permanently.');
  } else if (paths.science === 0) {
    // Science Dark Age: -2 science per city for the next age (yield penalty via legacy bonus)
    effects.push({
      source: `dark-age:science:${age}:penalty`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: -2 },
    });
    effects.push({
      source: `dark-age:science:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'science', value: 5 },
    });
    logEntries.push('Science Dark Age! -2 science per city but +5 science permanently.');
  }

  // Culture path
  if (paths.culture === 3 && goldenAxisGranted === 'culture') {
    effects.push({
      source: `golden-age:culture:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 3 },
    });
    logEntries.push('Culture Golden Age! +3 culture in all cities permanently.');
  } else if (paths.culture === 0) {
    effects.push({
      source: `dark-age:culture:${age}:penalty`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'food', value: -2 },
    });
    effects.push({
      source: `dark-age:culture:${age}`,
      effect: { type: 'MODIFY_YIELD', target: 'city', yield: 'culture', value: 4 },
    });
    logEntries.push('Culture Dark Age! -2 happiness but +4 culture permanently.');
  }

  return { effects, logEntries, rng: currentRng };
}

/**
 * Check and award legacy milestones on END_TURN (F-01 consolidation).
 *
 * Single source of truth: calls scoreLegacyPaths() from LegacyPaths.ts to
 * derive the current tier counts per axis.  The old ad-hoc formulas
 * (totalKills/3, totalGoldEarned/100, etc.) are removed — the predicate-based
 * system in LegacyPaths.ts is authoritative.
 *
 * Awards:
 *   - `legacyPoints`          — total (reset at age transition; used for spend-on-transition)
 *   - `legacyPointsByAxis`    — typed per-axis breakdown (F-10)
 *   - `totalCareerLegacyPoints` — never reset; used by score victory (F-07)
 */
function checkLegacyMilestones(state: GameState): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;

  // F-01: derive path progress from the predicate-driven scoring function
  const progressList = scoreLegacyPaths(state.currentPlayerId, state);

  // Build updated LegacyPaths from scored tiers (take max across all ages per axis)
  const axisTiers: Record<string, number> = { military: 0, economic: 0, science: 0, culture: 0 };
  for (const entry of progressList) {
    if (entry.tiersCompleted > axisTiers[entry.axis]) {
      axisTiers[entry.axis] = entry.tiersCompleted;
    }
  }

  const newPaths: LegacyPaths = {
    military: Math.min(3, axisTiers['military']) as 0 | 1 | 2 | 3,
    economic: Math.min(3, axisTiers['economic']) as 0 | 1 | 2 | 3,
    science:  Math.min(3, axisTiers['science'])  as 0 | 1 | 2 | 3,
    culture:  Math.min(3, axisTiers['culture'])  as 0 | 1 | 2 | 3,
  };

  const oldPaths = player.legacyPaths;
  const oldByAxis = player.legacyPointsByAxis ?? { military: 0, economic: 0, science: 0, culture: 0 };

  // Per-axis gains clamped ≥0 (F-36d8fce8): after TRANSITION_AGE resets
  // killsThisAge=0, scoreLegacyPaths() can return a lower tier than the stored
  // oldPaths value, producing a negative delta that would silently decrement
  // legacyPoints, legacyPointsByAxis, and totalCareerLegacyPoints.
  const militaryGain = Math.max(0, newPaths.military - oldPaths.military);
  const economicGain = Math.max(0, newPaths.economic - oldPaths.economic);
  const scienceGain  = Math.max(0, newPaths.science  - oldPaths.science);
  const cultureGain  = Math.max(0, newPaths.culture  - oldPaths.culture);
  const totalGain = militaryGain + economicGain + scienceGain + cultureGain;

  // Stored legacyPaths also never regresses within an age: take max of old and new.
  const clampedPaths: LegacyPaths = {
    military: Math.max(oldPaths.military, newPaths.military) as 0 | 1 | 2 | 3,
    economic: Math.max(oldPaths.economic, newPaths.economic) as 0 | 1 | 2 | 3,
    science:  Math.max(oldPaths.science,  newPaths.science)  as 0 | 1 | 2 | 3,
    culture:  Math.max(oldPaths.culture,  newPaths.culture)  as 0 | 1 | 2 | 3,
  };

  const newByAxis: Record<'military' | 'economic' | 'science' | 'culture', number> = {
    military: oldByAxis.military + militaryGain,
    economic: oldByAxis.economic + economicGain,
    science:  oldByAxis.science  + scienceGain,
    culture:  oldByAxis.culture  + cultureGain,
  };

  // F-07: career total never resets
  const newCareerTotal = (player.totalCareerLegacyPoints ?? 0) + totalGain;

  // Always increment ageProgress by +1 per turn (natural age advancement)
  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    legacyPaths: clampedPaths,
    legacyPoints: player.legacyPoints + totalGain,
    legacyPointsByAxis: newByAxis,
    totalCareerLegacyPoints: newCareerTotal,
    // F-02: +1 base per turn + milestone acceleration (+10 per newly completed milestone)
    ageProgress: player.ageProgress + 1 + totalGain * 10,
  });

  const logEntries = [...state.log];
  if (totalGain > 0) {
    logEntries.push({
      turn: state.turn,
      playerId: player.id,
      message: `Earned ${totalGain} legacy point(s)!`,
      type: 'legacy',
    });
  }

  return {
    ...state,
    players: updatedPlayers,
    log: logEntries,
  };
}

/**
 * F-04: Handle CHOOSE_LEGACY_BONUSES — player picks up to 2 bonuses
 * from pendingLegacyBonuses. Chosen effects are appended to legacyBonuses;
 * pendingLegacyBonuses is cleared.
 */
function handleChooseLegacyBonuses(state: GameState, picks: readonly string[]): GameState {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return state;
  const pending = player.pendingLegacyBonuses;
  if (!pending || pending.length === 0) return state;

  // Max 2 picks
  const selectedPicks = Array.from(picks).slice(0, 2);
  const chosen = pending.filter(p => selectedPicks.includes(p.bonusId));
  if (chosen.length === 0) return state;

  const newBonuses: ReadonlyArray<ActiveEffect> = chosen.map(p => ({
    source: p.bonusId,
    effect: p.effect,
  }));

  const updatedPlayers = new Map(state.players);
  updatedPlayers.set(player.id, {
    ...player,
    legacyBonuses: [...player.legacyBonuses, ...newBonuses],
    pendingLegacyBonuses: undefined,
  });

  return {
    ...state,
    players: updatedPlayers,
    log: [...state.log, {
      turn: state.turn,
      playerId: player.id,
      message: `Selected ${chosen.length} legacy bonus(es).`,
      type: 'legacy' as const,
    }],
  };
}

function getNextAge(current: string): 'exploration' | 'modern' | null {
  switch (current) {
    case 'antiquity': return 'exploration';
    case 'exploration': return 'modern';
    default: return null;
  }
}

/**
 * F-06: Data-driven legacy bonus lookup. Reads the civilization's
 * legacyBonus from state.config.civilizations instead of a hardcoded
 * switch/table. Every civ with a legacyBonus in the registry is covered
 * automatically — no code change needed when adding new civs.
 */
function getCivLegacyBonus(civId: string, state: GameState): ActiveEffect | null {
  const civDef = state.config.civilizations.get(civId);
  if (!civDef?.legacyBonus) return null;
  return { effect: civDef.legacyBonus.effect, source: `civ:${civId}:legacyBonus` };
}
