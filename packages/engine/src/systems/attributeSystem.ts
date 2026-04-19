import type { GameState, GameAction, PlayerState } from '../types/GameState';

/**
 * attributeSystem — leader RPG attribute tree (W3-07)
 *
 * Handles EARN_ATTRIBUTE_POINT and SPEND_ATTRIBUTE_POINT actions.
 *
 * Key invariant: attribute points, wildcardAttributePoints, and attributeTree
 * all persist across TRANSITION_AGE — they are the only never-resetting
 * in-game upgrade system. This system does NOT handle TRANSITION_AGE;
 * ageSystem's spread of `...player` naturally preserves these fields.
 */
export function attributeSystem(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'EARN_ATTRIBUTE_POINT':
      return handleEarnPoint(state, action.playerId, action.isWildcard);
    case 'SPEND_ATTRIBUTE_POINT':
      return handleSpendPoint(state, action.playerId, action.nodeId);
    default:
      return state;
  }
}

function handleEarnPoint(state: GameState, playerId: string, isWildcard: boolean): GameState {
  const player = state.players.get(playerId);
  if (!player) return state;

  const updated: PlayerState = isWildcard
    ? { ...player, wildcardAttributePoints: (player.wildcardAttributePoints ?? 0) + 1 }
    : { ...player, attributePoints: (player.attributePoints ?? 0) + 1 };

  const next = new Map(state.players);
  next.set(playerId, updated);
  return { ...state, players: next };
}

function handleSpendPoint(state: GameState, playerId: string, nodeId: string): GameState {
  const player = state.players.get(playerId);
  if (!player) return state;

  const nodeDef = state.config.attributeNodes?.get(nodeId);
  if (!nodeDef) return state;

  // Check total available points (non-wildcard + wildcard)
  const nonWildcard = player.attributePoints ?? 0;
  const wildcard = player.wildcardAttributePoints ?? 0;
  const available = nonWildcard + wildcard;
  if (available < nodeDef.cost) return state;

  // Check all prerequisites are unlocked
  const treeUnlocked: ReadonlyArray<string> = player.attributeTree?.[nodeDef.tree] ?? [];
  for (const prereq of nodeDef.prerequisites) {
    if (!treeUnlocked.includes(prereq)) return state;
  }

  // Check node is not already unlocked
  if (treeUnlocked.includes(nodeId)) return state;

  // Spend points — prefer non-wildcard first
  let spent = nodeDef.cost;
  const nonWildcardSpent = Math.min(spent, nonWildcard);
  spent -= nonWildcardSpent;
  const wildcardSpent = spent; // remainder comes from wildcard pool

  // Update attribute tree: add nodeId to this tree's unlocked list
  const newTree: Record<string, ReadonlyArray<string>> = { ...(player.attributeTree ?? {}) };
  newTree[nodeDef.tree] = [...(newTree[nodeDef.tree] ?? []), nodeId];

  const updated: PlayerState = {
    ...player,
    attributePoints: nonWildcard - nonWildcardSpent,
    wildcardAttributePoints: wildcard - wildcardSpent,
    attributeTree: newTree,
    // Attribute node effects persist permanently via legacyBonuses
    legacyBonuses: [...player.legacyBonuses, { effect: nodeDef.effect, source: `attribute:${nodeId}` }],
  };

  const next = new Map(state.players);
  next.set(playerId, updated);
  return { ...state, players: next };
}
