import type {
  GameState,
  ActiveEffect,
  DiplomaticActionModifierTarget,
  PlayerActiveCelebrationBonus,
  ProductionItem,
  ProductionModifierTarget,
  UnitCategory,
} from '../types/GameState';

export interface ProductionModifierContext {
  readonly item: ProductionItem;
  readonly unitCategory?: UnitCategory;
  readonly buildingCategory?: string;
  readonly isOverbuilding?: boolean;
}

export function isStructuredActiveCelebrationBonus(value: unknown): value is PlayerActiveCelebrationBonus {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Partial<PlayerActiveCelebrationBonus>;
  return (
    typeof candidate.governmentId === 'string' &&
    typeof candidate.bonusId === 'string' &&
    typeof candidate.turnsRemaining === 'number' &&
    Array.isArray(candidate.effects)
  );
}

/**
 * Collect all active effects for a player from:
 * 1. Current civilization's unique ability
 * 2. Leader's ability (always active)
 * 3. Legacy bonuses (from previous age civs)
 * 4. Adopted traditions (EE1 — civic tree second layer)
 * 5. Active government celebration bonus effects
 */
export function getActiveEffects(state: GameState, playerId: string): ReadonlyArray<ActiveEffect> {
  const player = state.players.get(playerId);
  if (!player) return [];

  const effects: ActiveEffect[] = [];

  // 1. Current civilization ability
  const civ = state.config.civilizations.get(player.civilizationId);
  if (civ) {
    for (const effect of civ.uniqueAbility.effects) {
      effects.push({ source: `civ:${civ.id}`, effect });
    }
  }

  // 2. Leader ability (always active across all ages)
  const leader = state.config.leaders.get(player.leaderId);
  if (leader) {
    for (const effect of leader.ability.effects) {
      effects.push({ source: `leader:${leader.id}`, effect });
    }
  }

  // 3. Legacy bonuses (accumulated from previous age transitions)
  for (const legacy of player.legacyBonuses) {
    effects.push(legacy);
  }

  // 4. Adopted traditions (EE1 — civic tree second layer)
  if (player.traditions && state.config.traditions) {
    for (const traditionId of player.traditions) {
      const tradition = state.config.traditions.get(traditionId);
      if (tradition?.effect) {
        for (const effect of tradition.effect) {
          effects.push({ source: `tradition:${traditionId}`, effect });
        }
      }
    }
  }

  const activeCelebration = isStructuredActiveCelebrationBonus(player.activeCelebrationBonus)
    ? player.activeCelebrationBonus
    : null;
  if (activeCelebration && activeCelebration.turnsRemaining > 0) {
    for (const effect of activeCelebration.effects) {
      effects.push({
        source: `government-celebration:${activeCelebration.governmentId}:${activeCelebration.bonusId}`,
        effect,
      });
    }
  }

  return effects;
}

/**
 * Sum all MODIFY_YIELD effects for the 'empire' target for a specific yield type.
 * Returns the flat bonus to add to each city's yield.
 */
export function getYieldBonus(
  state: GameState,
  playerId: string,
  yieldType: string,
): number {
  const effects = getActiveEffects(state, playerId);
  let bonus = 0;
  for (const active of effects) {
    if (
      active.effect.type === 'MODIFY_YIELD' &&
      active.effect.target === 'empire' &&
      active.effect.yield === yieldType
    ) {
      bonus += active.effect.value;
    }
  }
  return bonus;
}

/**
 * Sum all percent yield modifiers for the empire/city target.
 */
export function getYieldPercentBonus(
  state: GameState,
  playerId: string,
  yieldType: string,
): number {
  const effects = getActiveEffects(state, playerId);
  let percent = 0;
  for (const active of effects) {
    if (
      active.effect.type === 'MODIFY_YIELD_PERCENT' &&
      (active.effect.target === 'empire' || active.effect.target === 'city') &&
      active.effect.yield === yieldType
    ) {
      percent += active.effect.percent;
    }
  }
  return percent;
}

/**
 * Sum all MODIFY_COMBAT effects for a given unit category (or 'all').
 * Returns the flat combat strength bonus.
 */
export function getCombatBonus(
  state: GameState,
  playerId: string,
  unitCategory: string,
): number {
  const effects = getActiveEffects(state, playerId);
  let bonus = 0;
  for (const active of effects) {
    if (active.effect.type === 'MODIFY_COMBAT') {
      if (active.effect.target === 'all' || active.effect.target === unitCategory) {
        bonus += active.effect.value;
      }
    }
  }
  return bonus;
}

/**
 * Sum all MODIFY_MOVEMENT effects for a given unit category (or 'all').
 * Returns the flat movement bonus.
 */
export function getMovementBonus(
  state: GameState,
  playerId: string,
  unitCategory: string,
): number {
  const effects = getActiveEffects(state, playerId);
  let bonus = 0;
  for (const active of effects) {
    if (active.effect.type === 'MODIFY_MOVEMENT') {
      if (active.effect.target === 'all' || active.effect.target === unitCategory) {
        bonus += active.effect.value;
      }
    }
  }
  return bonus;
}

/**
 * Get production discount percentage for a target (e.g., 'wonder').
 */
export function getProductionDiscount(
  state: GameState,
  playerId: string,
  target: string,
): number {
  const effects = getActiveEffects(state, playerId);
  let discount = 0;
  for (const active of effects) {
    if (active.effect.type === 'DISCOUNT_PRODUCTION' && active.effect.target === target) {
      discount += active.effect.percent;
    }
  }
  return discount;
}

export function getProductionPercentBonus(
  state: GameState,
  playerId: string,
  context: ProductionModifierContext,
): number {
  const effects = getActiveEffects(state, playerId);
  let percent = 0;
  for (const active of effects) {
    if (active.effect.type === 'MODIFY_PRODUCTION_PERCENT' && productionTargetMatches(active.effect.target, context)) {
      percent += active.effect.percent;
    }
  }
  return percent;
}

export function getDiplomaticActionPercentBonus(
  state: GameState,
  playerId: string,
  target: DiplomaticActionModifierTarget,
): number {
  const effects = getActiveEffects(state, playerId);
  let percent = 0;
  for (const active of effects) {
    if (active.effect.type !== 'MODIFY_DIPLOMATIC_ACTION_PERCENT') continue;
    if (active.effect.target === target || active.effect.target === 'diplomatic_action') {
      percent += active.effect.percent;
    }
  }
  return percent;
}

export function getRelationshipDeltaPercentBonus(
  state: GameState,
  playerId: string,
  target: 'endeavor' | 'sanction',
): number {
  const effects = getActiveEffects(state, playerId);
  let percent = 0;
  for (const active of effects) {
    if (active.effect.type === 'MODIFY_RELATIONSHIP_DELTA_PERCENT' && active.effect.target === target) {
      percent += active.effect.percent;
    }
  }
  return percent;
}

export function getWarSupportBonus(state: GameState, playerId: string): number {
  const effects = getActiveEffects(state, playerId);
  let value = 0;
  for (const active of effects) {
    if (active.effect.type === 'MODIFY_WAR_SUPPORT') {
      value += active.effect.value;
    }
  }
  return value;
}

function productionTargetMatches(target: ProductionModifierTarget, context: ProductionModifierContext): boolean {
  switch (target.kind) {
    case 'itemType':
      return context.item.type === target.itemType;
    case 'unitCategory':
      return context.item.type === 'unit' && context.unitCategory === target.category;
    case 'unitIds':
      return context.item.type === 'unit' && target.unitIds.includes(context.item.id);
    case 'buildingCategory':
      return (context.item.type === 'building' || context.item.type === 'wonder') && context.buildingCategory === target.category;
    case 'militaryUnit':
      return context.item.type === 'unit' && isMilitaryCategory(context.unitCategory);
    case 'overbuilding':
      return context.isOverbuilding === true;
    default:
      return false;
  }
}

function isMilitaryCategory(category: UnitCategory | undefined): boolean {
  return category !== undefined && category !== 'civilian' && category !== 'religious' && category !== 'support';
}
