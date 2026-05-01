import type { Page } from '@playwright/test';

type GameAction = Record<string, unknown>;

interface GrowthResolution {
  readonly action: GameAction | null;
  readonly done: boolean;
  readonly pendingCount: number;
  readonly cityId?: string;
}

export async function dispatchGameAction(page: Page, action: GameAction, settleMs = 80): Promise<void> {
  await page.evaluate((a) => {
    (window as unknown as { __gameDispatch?: (action: unknown) => void }).__gameDispatch?.(a);
  }, action);
  await page.waitForTimeout(settleMs);
}

export async function dismissBlockingEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const s = (window as any).__gameState;
    const d = (window as any).__gameDispatch;
    if (!s || !d) return;

    const pid: string = s.currentPlayerId;
    const t: number = s.turn;

    for (const event of (s.log as Array<Record<string, unknown>>)) {
      if (
        event['blocksTurn'] === true &&
        event['dismissed'] !== true &&
        event['turn'] === t &&
        event['playerId'] === pid
      ) {
        d({ type: 'DISMISS_EVENT', eventMessage: event['message'], eventTurn: event['turn'] });
      }
    }

    const currentPlayer = (s.players as Map<string, Record<string, unknown>>).get(pid);
    if (!currentPlayer) return;

    const crisisPhase = currentPlayer['crisisPhase'] as string | undefined;
    const crisisPolicies = (currentPlayer['crisisPolicies'] as string[] | undefined) ?? [];
    const crisisPolicySlots = (currentPlayer['crisisPolicySlots'] as number | undefined) ?? 0;
    if (crisisPhase && crisisPhase !== 'none' && crisisPhase !== 'resolved' && crisisPolicies.length < crisisPolicySlots) {
      for (let i = crisisPolicies.length; i < crisisPolicySlots; i++) {
        d({ type: 'FORCE_CRISIS_POLICY', policyId: `e2e_auto_policy_${t}_${i}` });
      }
    }

    const crises = (s as { crises?: Array<Record<string, unknown>> }).crises ?? [];
    for (const crisis of crises) {
      if (!crisis['active'] || crisis['resolvedBy'] != null || !crisis['pendingResolution']) continue;
      const crisisId = crisis['id'] as string;
      const slottedPolicies = crisis['slottedPolicies'];
      const already = slottedPolicies instanceof Map ? slottedPolicies.get(pid) ?? [] : [];
      if (already.length === 0) {
        d({ type: 'SLOT_CRISIS_POLICY', playerId: pid, crisisId, policyId: `e2e_auto_slot_${t}_${crisisId}` });
      }
    }

    const celebrationPending = currentPlayer['pendingCelebrationChoice'] as { governmentId?: string } | null | undefined;
    if (celebrationPending) {
      const govId = celebrationPending['governmentId'];
      const govDef = govId ? (s as any).config?.governments?.get?.(govId) : undefined;
      const bonuses = (govDef?.celebrationBonuses as Array<{ id: string }> | undefined) ?? [];
      d({ type: 'PICK_CELEBRATION_BONUS', playerId: pid, bonusId: bonuses[0]?.id ?? 'productivity' });
    }

    const transitionPhase = s['transitionPhase'] as string | undefined;
    const playersReady = (s['playersReadyToTransition'] as string[] | undefined) ?? [];
    if ((transitionPhase === 'pending' || transitionPhase === 'in-progress') && !playersReady.includes(pid)) {
      const playerAge = currentPlayer['age'] as string | undefined;
      const nextAge = playerAge === 'antiquity' ? 'exploration' : playerAge === 'exploration' ? 'modern' : null;
      const civMap = (s as any).config?.civilizations as Map<string, { age: string; id: string }> | undefined;
      if (nextAge && civMap) {
        for (const [, civ] of civMap) {
          if (civ.age === nextAge) {
            d({ type: 'TRANSITION_AGE', newCivId: civ.id });
            break;
          }
        }
      }
    }
  });
  await page.waitForTimeout(120);
}

export async function resolvePendingGrowthChoices(page: Page): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const resolution = await nextGrowthResolution(page);
    if (resolution.done) return;
    if (!resolution.action) {
      throw new Error(
        `Unable to resolve ${resolution.pendingCount} pending growth choice(s)` +
        (resolution.cityId ? ` for city ${resolution.cityId}` : ''),
      );
    }
    await dispatchGameAction(page, resolution.action);
  }

  throw new Error('Pending growth choices did not clear after 30 resolution attempts');
}

export async function prepareForEndTurn(page: Page): Promise<void> {
  await dismissBlockingEvents(page);
  await resolvePendingGrowthChoices(page);
}

export async function endTurnAndWait(page: Page, timeout = 15_000): Promise<void> {
  const before = await page.evaluate(() => {
    return (window as unknown as { __gameState?: { turn?: number } }).__gameState?.turn ?? 0;
  });
  await prepareForEndTurn(page);
  await dispatchGameAction(page, { type: 'END_TURN' });
  await page.waitForFunction(
    (previousTurn) => ((window as unknown as { __gameState?: { turn?: number } }).__gameState?.turn ?? 0) > previousTurn,
    before,
    { timeout },
  );
}

export async function advanceTurns(page: Page, turns: number, timeout = 15_000): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await endTurnAndWait(page, timeout);
  }
}

async function nextGrowthResolution(page: Page): Promise<GrowthResolution> {
  return page.evaluate(() => {
    const state = (window as any).__gameState;
    if (!state) {
      return { action: null, done: true, pendingCount: 0 };
    }

    const currentPlayer = state.players?.get(state.currentPlayerId);
    const choices = [...((currentPlayer?.pendingGrowthChoices as Array<{ cityId: string }> | undefined) ?? [])];
    if (choices.length === 0) {
      return { action: null, done: true, pendingCount: 0 };
    }

    const choice = choices[0];
    const city = state.cities?.get(choice.cityId);
    if (!city) {
      return { action: null, done: false, pendingCount: choices.length, cityId: choice.cityId };
    }

    if (city.settlementType !== 'town' && (city.specialists ?? 0) < Math.max(0, (city.population ?? 0) - 1)) {
      return {
        action: { type: 'ASSIGN_SPECIALIST_FROM_GROWTH', cityId: choice.cityId },
        done: false,
        pendingCount: choices.length,
        cityId: choice.cityId,
      };
    }

    const centerKey = `${city.position.q},${city.position.r}`;
    const territory = [...(city.territory ?? [])]
      .filter((key: string) => key !== centerKey)
      .sort((a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0));

    for (const key of territory) {
      const tile = state.map?.tiles?.get(key);
      if (!tile || tile.improvement || tile.building || city.urbanTiles?.has?.(key)) continue;
      if (!canDeriveImprovement(tile)) continue;

      const [q, r] = key.split(',').map(Number);
      if (!Number.isFinite(q) || !Number.isFinite(r)) continue;

      return {
        action: { type: 'PLACE_IMPROVEMENT', cityId: choice.cityId, tile: { q, r } },
        done: false,
        pendingCount: choices.length,
        cityId: choice.cityId,
      };
    }

    return { action: null, done: false, pendingCount: choices.length, cityId: choice.cityId };

    function canDeriveImprovement(tile: { resource?: string; feature?: string; terrain?: string }): boolean {
      if (tile.resource) {
        return [
          'wheat',
          'cattle',
          'horses',
          'stone',
          'iron',
          'niter',
          'coal',
          'gems',
          'silk',
          'spices',
          'wine',
          'ivory',
          'whales',
          'oil',
        ].includes(tile.resource);
      }

      if (tile.feature === 'forest' || tile.feature === 'jungle' || tile.terrain === 'rainforest') return true;
      if (tile.feature === 'marsh' || tile.terrain === 'mangrove') return true;
      if (tile.feature === 'hills') return true;
      if (tile.feature === 'mountains') return false;
      return tile.terrain === 'grassland' || tile.terrain === 'plains' || tile.terrain === 'tropical';
    }
  });
}
