import type { GameState, GameAction } from '../types/GameState';
import { calculateCityYieldsWithAdjacency } from '../state/CityYieldsWithAdjacency';
import {
  calculateCityHappiness as _calculateCityHappiness,
  calculateSettlementCapPenalty as _calculateSettlementCapPenalty,
  applyHappinessPenalty as _applyHappinessPenalty,
} from '../state/HappinessUtils';

// Re-export happiness helpers so existing callers that import from this
// module continue to work (tests, barrel exports, web UI via @hex/engine).
export {
  calculateEffectiveSettlementCap,
  calculateCityHappiness,
  calculateSettlementCapPenalty,
  applyHappinessPenalty,
} from '../state/HappinessUtils';

/** Threshold (excess happiness) required to trigger the Nth celebration (1-indexed). */
const CELEBRATION_BASE_THRESHOLD = 50;
/** Production bonus percent awarded per active celebration. */
const CELEBRATION_BONUS_PERCENT = 10;
/** Number of turns a celebration bonus lasts. */
const CELEBRATION_DURATION_TURNS = 10;

/**
 * Calculate the next celebration threshold for a player.
 * First celebration: 50. Each subsequent: 50 * (celebrationCount + 1).
 * Capped at the 8th multiplier (celebrationCount 7): threshold stops increasing after 7th celebration.
 */
export function nextCelebrationThreshold(celebrationCount: number): number {
  return CELEBRATION_BASE_THRESHOLD * Math.min(celebrationCount + 1, 8);
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

    // --- Celebration mechanic ---
    let { celebrationCount, celebrationBonus, celebrationTurnsLeft } = player;

    // Decrement celebration timer first
    if (celebrationTurnsLeft > 0) {
      celebrationTurnsLeft -= 1;
      if (celebrationTurnsLeft === 0) {
        celebrationBonus = 0;
      }
    }

    // Check if excess happiness meets the next celebration threshold
    const threshold = nextCelebrationThreshold(celebrationCount);
    if (totalExcessHappiness >= threshold) {
      celebrationCount += 1;
      celebrationBonus = CELEBRATION_BONUS_PERCENT;
      celebrationTurnsLeft = CELEBRATION_DURATION_TURNS;
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
    });
    changed = true;
  }

  if (!changed) return state;
  return { ...state, players: updatedPlayers, cities: updatedCities };
}
