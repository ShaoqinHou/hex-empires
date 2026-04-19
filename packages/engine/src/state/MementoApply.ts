/**
 * MementoApply — applies equipped memento effects to GameState at game start.
 *
 * Mementos with MODIFY_YIELD / MODIFY_COMBAT effects are injected as
 * legacyBonuses on the human player (using source 'memento:<id>').
 * This means getActiveEffects() will pick them up transparently alongside
 * civ, leader, and legacy-path bonuses.
 */

import type { GameState, ActiveEffect } from '../types/GameState';
import type { AccountState } from '../types/AccountState';
import { ALL_MEMENTOS } from '../data/mementos';

/**
 * Apply each equipped memento's effect to the human player as a legacyBonus.
 *
 * @param state - the initial GameState (post createInitialState, pre-return)
 * @param humanPlayerId - the player to apply mementos to
 * @param account - the player's AccountState (holds unlocked + slot count info)
 * @param equippedMementoIds - which memento IDs are equipped for this game
 */
export function applyEquippedMementos(
  state: GameState,
  humanPlayerId: string,
  equippedMementoIds: ReadonlyArray<string>,
): GameState {
  if (equippedMementoIds.length === 0) return state;

  const player = state.players.get(humanPlayerId);
  if (!player) return state;

  // Build a lookup for quick access
  const mementoById = new Map(ALL_MEMENTOS.map(m => [m.id, m]));

  const newEffects: ActiveEffect[] = [];
  for (const mementoId of equippedMementoIds) {
    const def = mementoById.get(mementoId);
    if (!def) continue;
    newEffects.push({ source: `memento:${mementoId}`, effect: def.effect });
  }

  if (newEffects.length === 0) return state;

  const updatedPlayer = {
    ...player,
    legacyBonuses: [...player.legacyBonuses, ...newEffects],
    equippedMementos: [...(player.equippedMementos ?? []), ...equippedMementoIds],
  };

  const nextPlayers = new Map(state.players);
  nextPlayers.set(humanPlayerId, updatedPlayer);

  return { ...state, players: nextPlayers };
}

/**
 * Validates that all equipped memento IDs exist in the registry
 * and that the player's account has them unlocked.
 *
 * Returns a list of valid IDs (silently drops unknown or locked ones).
 */
export function filterValidMementos(
  equippedIds: ReadonlyArray<string>,
  account: AccountState,
): ReadonlyArray<string> {
  const knownIds = new Set(ALL_MEMENTOS.map(m => m.id));
  const unlockedIds = new Set(account.unlockedMementos);
  return equippedIds.filter(id => knownIds.has(id) && unlockedIds.has(id));
}
