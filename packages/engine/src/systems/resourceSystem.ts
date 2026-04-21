import type { GameState, GameAction } from '../types/GameState';
import { calculateCityYieldsWithAdjacency } from '../state/CityYieldsWithAdjacency';
import {
  calculateCityHappiness as _calculateCityHappiness,
  calculateSettlementCapPenalty as _calculateSettlementCapPenalty,
  applyHappinessPenalty as _applyHappinessPenalty,
} from '../state/HappinessUtils';
import { celebrationThresholdForCount } from '../state/CelebrationConstants';

// Re-export happiness helpers so existing callers that import from this
// module continue to work (tests, barrel exports, web UI via @hex/engine).
export {
  calculateEffectiveSettlementCap,
  calculateCityHappiness,
  calculateSettlementCapPenalty,
  applyHappinessPenalty,
} from '../state/HappinessUtils';

/**
 * @deprecated Use `celebrationThresholdForCount(age, count)` from CelebrationConstants instead.
 * Kept for backward-compat with existing tests that import this function directly.
 * Returns the old linear formula: first celebration = 50, each subsequent +50.
 */
export function nextCelebrationThreshold(celebrationCount: number): number {
  return 50 * Math.min(celebrationCount + 1, 8);
}

/**
 * ResourceSystem accumulates per-turn yields (gold, science, culture, faith)
 * from all cities at END_TURN. Also updates city happiness and applies
 * happiness penalties to yields. Towns convert production to gold.
 *
 * Celebration mechanic: sum excess happiness (positive happiness only) across
 * all cities. When it meets or exceeds the threshold, a celebration is triggered:
 * +10% production bonus for 10 turns. Bonus is removed when celebrationTurnsLeft
 * reaches 0. The threshold increases with each celebration earned.
 */
export function resourceSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'END_TURN') return state;

  const updatedPlayers = new Map(state.players);
  const updatedCities = new Map(state.cities);
  let changed = false;

  for (const [playerId, player] of state.players) {
    if (playerId !== state.currentPlayerId) continue;

    const settlementCapPenalty = _calculateSettlementCapPenalty(state, playerId);

    let totalGold = 0;
    let totalScience = 0;
    let totalCulture = 0;
    let totalFaith = 0;
    let cityCount = 0;
    let totalExcessHappiness = 0;

    for (const city of state.cities.values()) {
      if (city.owner !== playerId) continue;
      cityCount++;
      const yields = calculateCityYieldsWithAdjacency(city, state);

      // Update happiness for this city
      const cityHappiness = _calculateCityHappiness(city, state) - settlementCapPenalty;
      if (cityHappiness !== city.happiness) {
        updatedCities.set(city.id, { ...city, happiness: cityHappiness });
      }

      // Accumulate excess happiness (only positive values contribute to celebrations)
      if (cityHappiness > 0) {
        totalExcessHappiness += cityHappiness;
      }

      // Towns convert all production to gold
      let goldFromCity = yields.gold;
      let scienceFromCity = yields.science;
      let cultureFromCity = yields.culture;
      let faithFromCity = yields.faith;

      if (city.settlementType === 'town') {
        goldFromCity += yields.production; // production -> gold conversion
      }

      // Apply happiness penalty to yields
      goldFromCity = _applyHappinessPenalty(goldFromCity, cityHappiness);
      scienceFromCity = _applyHappinessPenalty(scienceFromCity, cityHappiness);
      cultureFromCity = _applyHappinessPenalty(cultureFromCity, cityHappiness);
      faithFromCity = _applyHappinessPenalty(faithFromCity, cityHappiness);

      totalGold += goldFromCity;
      totalScience += scienceFromCity;
      totalCulture += cultureFromCity;
      totalFaith += faithFromCity;
    }

    // Endeavor bonuses: +2 gold and +2 science per active endeavor involving this player
    // Both the initiator and the target benefit from active endeavors.
    let endeavorGold = 0;
    let endeavorScience = 0;
    for (const [key, rel] of state.diplomacy.relations) {
      if (!key.includes(playerId)) continue;
      endeavorGold += rel.activeEndeavors.length * 2;
      endeavorScience += rel.activeEndeavors.length * 2;
    }
    totalGold += endeavorGold;
    totalScience += endeavorScience;

    // Sanction penalties: -3 gold per active sanction whose targetId is this player
    let sanctionGoldPenalty = 0;
    for (const [key, rel] of state.diplomacy.relations) {
      if (!key.includes(playerId)) continue;
      for (const sanction of rel.activeSanctions) {
        if (sanction.targetId === playerId) {
          sanctionGoldPenalty += 3;
        }
      }
    }
    totalGold -= sanctionGoldPenalty;

    // Calculate influence (§11.1):
    //   Base +10 per turn once the player has founded their first city
    //   (this represents the civilization's baseline diplomatic presence).
    //   +1 per additional city, +2 per alliance.
    // Rulebook minimum: a 1-city player must net ≥ 10 Influence / turn.
    const playerHasCities = cityCount > 0;
    let totalInfluence = 0;
    if (playerHasCities) {
      totalInfluence += 10; // Standard-speed base generation.
      totalInfluence += cityCount; // per-city contribution (capital + additional).
    }
    for (const [key, rel] of state.diplomacy.relations) {
      if (key.includes(playerId) && rel.hasAlliance) {
        totalInfluence += 2;
      }
    }

    // Unit maintenance (1 gold per military unit).
    // No maintenance is charged before the player has founded their first city —
    // units in the pre-founding phase are considered "starting forces" and free.
    let maintenance = 0;
    if (playerHasCities) {
      for (const unit of state.units.values()) {
        if (unit.owner === playerId) {
          const isCivilian = state.config.units.get(unit.typeId)?.category === 'civilian';
          if (!isCivilian) maintenance += 1;
        }
      }
    }

    const netGold = totalGold - maintenance;

    // --- Celebration mechanic (W3-03: globalHappiness accumulator + age-specific thresholds) ---
    let { celebrationCount, celebrationBonus, celebrationTurnsLeft } = player;

    // Decrement celebration timer first
    if (celebrationTurnsLeft > 0) {
      celebrationTurnsLeft -= 1;
      if (celebrationTurnsLeft === 0) {
        celebrationBonus = 0;
      }
    }

    // Accumulate global happiness (F-01): add this turn's excess to the running total.
    // globalHappiness is NOT reset when a celebration triggers — it persists as a
    // monotonically-increasing counter so the next threshold check works correctly.
    const prevGlobalHappiness = player.globalHappiness ?? 0;
    const newGlobalHappiness = prevGlobalHappiness + totalExcessHappiness;

    // F-02: age-specific threshold table (not linear formula)
    const threshold = celebrationThresholdForCount(player.age, celebrationCount);

    // Only trigger a new celebration if:
    //  - the new global happiness value crosses the threshold
    //  - no celebration is currently pending resolution (avoid double-trigger)
    const alreadyPending = (player.pendingCelebrationChoice ?? null) !== null;

    let pendingCelebrationChoice = player.pendingCelebrationChoice ?? null;
    if (!alreadyPending && newGlobalHappiness >= threshold) {
      // F-03: instead of auto-applying a +10% bonus, set a pending choice for the player.
      // The player must dispatch PICK_CELEBRATION_BONUS to resolve it.
      // governmentSystem handles PICK_CELEBRATION_BONUS → applies bonus + increments counts.
      const governmentId = (player.governmentId ?? null) as string | null;
      if (governmentId !== null) {
        // Government-gated: only trigger the menu if the player has a government.
        pendingCelebrationChoice = { governmentId };
      }
      // If player has no government, fall through without triggering (rare early-game edge case).
    }

    // Gold floor: gold cannot go below 0 (bankrupt players can't spiral into
    // unlimited negative debt; the UI should warn when gold income is negative).
    const newGold = Math.max(0, player.gold + netGold);
    updatedPlayers.set(playerId, {
      ...player,
      gold: newGold,
      science: player.science + totalScience,
      culture: player.culture + totalCulture,
      faith: player.faith + totalFaith,
      influence: player.influence + totalInfluence,
      totalGoldEarned: player.totalGoldEarned + Math.max(0, netGold),
      celebrationCount,
      celebrationBonus,
      celebrationTurnsLeft,
      globalHappiness: newGlobalHappiness,
      pendingCelebrationChoice,
    });
    changed = true;
  }

  if (!changed) return state;
  return { ...state, players: updatedPlayers, cities: updatedCities };
}
