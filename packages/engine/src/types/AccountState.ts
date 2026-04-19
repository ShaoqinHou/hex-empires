/**
 * AccountState — cross-session meta-progression data.
 *
 * Lives OUTSIDE GameState. The web layer owns persistence (localStorage/cloud).
 * The engine reads it at game-start to apply memento effects and determine
 * slot counts. legendsSystem returns AccountStateDelta on END_TURN; the
 * web layer merges deltas into the stored AccountState.
 */

export interface AccountState {
  /** Cumulative Foundation XP across all games */
  readonly foundationXP: number;
  /** Derived Foundation Level 1-50 */
  readonly foundationLevel: number;
  /** XP earned per leader (leaderId → xp) */
  readonly leaderXP: ReadonlyMap<string, number>;
  /** Derived leader level per leader (leaderId → level 1-10) */
  readonly leaderLevels: ReadonlyMap<string, number>;
  /** Memento IDs the player has unlocked (earned, not necessarily equipped) */
  readonly unlockedMementos: ReadonlyArray<string>;
  /** Per-leader attribute nodes unlocked via leader XP (leaderId → nodeIds[]) */
  readonly unlockedAttributeNodes: ReadonlyMap<string, ReadonlyArray<string>>;
  /** Legacy card IDs unlocked via Foundation / leader level-up (leaderId → cardIds[]) */
  readonly unlockedLegacyCards: ReadonlyMap<string, ReadonlyArray<string>>;
  /** Challenge IDs that have been completed across all games */
  readonly completedChallenges: ReadonlyArray<string>;
}

/**
 * A delta produced by legendsSystem at the end of a game turn.
 * The web layer merges this into the stored AccountState and re-derives levels.
 */
export interface AccountStateDelta {
  readonly foundationXPGained: number;
  readonly leaderXPGained: ReadonlyMap<string, number>;
  readonly newlyCompletedChallenges: ReadonlyArray<string>;
  readonly newlyUnlockedMementos: ReadonlyArray<string>;
}

/** Returns an empty AccountState suitable for new accounts. */
export function createDefaultAccountState(): AccountState {
  return {
    foundationXP: 0,
    foundationLevel: 1,
    leaderXP: new Map(),
    leaderLevels: new Map(),
    unlockedMementos: [],
    unlockedAttributeNodes: new Map(),
    unlockedLegacyCards: new Map(),
    completedChallenges: [],
  };
}

/**
 * XP required to reach each Foundation Level (cumulative totals).
 * Level 1 = 0 XP (starting point). Level 50 requires 50_000 XP total.
 */
export function foundationXPForLevel(level: number): number {
  if (level <= 1) return 0;
  // Each level costs level * 100 XP cumulatively
  // Level 2 = 200, Level 3 = 600, ... (triangular: level*(level-1)/2 * 200)
  return Math.floor(level * (level - 1) * 100);
}

/**
 * Derive Foundation Level from cumulative XP.
 * Returns a value between 1 and 50.
 */
export function foundationLevelForXP(xp: number): number {
  let level = 1;
  while (level < 50 && foundationXPForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

/**
 * How many Foundation Memento slots the player has unlocked.
 * Level 1: 0 slots, Level 2-4: 1 slot, Level 5+: 2 slots.
 */
export function foundationMementoSlots(level: number): number {
  if (level >= 5) return 2;
  if (level >= 2) return 1;
  return 0;
}

/**
 * XP required to reach each Leader Level (cumulative totals).
 * Leader Level 1 = 0 XP. Level 10 requires 4_500 XP total.
 */
export function leaderXPForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(level * (level - 1) * 50);
}

/**
 * Derive Leader Level from cumulative XP (capped at 10).
 */
export function leaderLevelForXP(xp: number): number {
  let level = 1;
  while (level < 10 && leaderXPForLevel(level + 1) <= xp) {
    level++;
  }
  return level;
}

/**
 * Merge an AccountStateDelta into an existing AccountState.
 * Re-derives levels from updated XP totals.
 */
export function applyAccountDelta(
  account: AccountState,
  delta: AccountStateDelta,
): AccountState {
  const newFoundationXP = account.foundationXP + delta.foundationXPGained;
  const newFoundationLevel = foundationLevelForXP(newFoundationXP);

  // Merge leader XP
  const newLeaderXP = new Map(account.leaderXP);
  for (const [leaderId, xpGained] of delta.leaderXPGained) {
    newLeaderXP.set(leaderId, (newLeaderXP.get(leaderId) ?? 0) + xpGained);
  }

  // Re-derive leader levels
  const newLeaderLevels = new Map(account.leaderLevels);
  for (const [leaderId, totalXP] of newLeaderXP) {
    newLeaderLevels.set(leaderId, leaderLevelForXP(totalXP));
  }

  const newCompleted = [
    ...account.completedChallenges,
    ...delta.newlyCompletedChallenges.filter(id => !account.completedChallenges.includes(id)),
  ];

  const newUnlocked = [
    ...account.unlockedMementos,
    ...delta.newlyUnlockedMementos.filter(id => !account.unlockedMementos.includes(id)),
  ];

  return {
    ...account,
    foundationXP: newFoundationXP,
    foundationLevel: newFoundationLevel,
    leaderXP: newLeaderXP,
    leaderLevels: newLeaderLevels,
    completedChallenges: newCompleted,
    unlockedMementos: newUnlocked,
  };
}
