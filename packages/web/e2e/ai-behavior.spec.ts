/**
 * AI Behavior E2E — tracks AI players over turn progression.
 *
 * Scope: research starts, units move, visibility grows, multi-AI independent play,
 * no runtime errors, gold stays non-negative.
 *
 * All assertions are concrete (toBe / toBeGreaterThan / toEqual) — no vague truthy checks.
 */
import { test, expect, Page } from '@playwright/test';

async function startGame(page: Page, seed = 2) {
  await page.goto(`http://localhost:5174/?seed=${seed}`);
  await page.evaluate(() => localStorage.setItem('helpShown', 'true'));
  await page.waitForTimeout(400);
  await page.locator('[data-testid="start-game-button"]').click();
  await page.waitForSelector('canvas', { timeout: 10000 });
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
}

async function dispatch(page: Page, action: Record<string, any>) {
  await page.evaluate((a) => (window as any).__gameDispatch(a), action);
  await page.waitForTimeout(80);
}

async function dismissBlockingEvents(page: Page) {
  await page.evaluate(() => {
    const s = (window as any).__gameState;
    const d = (window as any).__gameDispatch;
    if (!s || !d) return;
    const pid: string = s.currentPlayerId;
    const t: number = s.turn;
    for (const e of (s.log as Array<Record<string, unknown>>)) {
      if (e['blocksTurn'] === true && e['dismissed'] !== true && e['turn'] === t && e['playerId'] === pid) {
        d({ type: 'DISMISS_EVENT', eventMessage: e['message'], eventTurn: e['turn'] });
      }
    }

    const currentPlayer = (s.players as Map<string, Record<string, unknown>>).get(pid);
    if (currentPlayer) {
      const crisisPhase = currentPlayer['crisisPhase'] as string | undefined;
      const crisisPolicies = (currentPlayer['crisisPolicies'] as string[] | undefined) ?? [];
      const crisisPolicySlots = (currentPlayer['crisisPolicySlots'] as number | undefined) ?? 0;
      if (crisisPhase && crisisPhase !== 'none' && crisisPhase !== 'resolved' && crisisPolicies.length < crisisPolicySlots) {
        for (let i = crisisPolicies.length; i < crisisPolicySlots; i++) {
          d({ type: 'FORCE_CRISIS_POLICY', policyId: `e2e_auto_policy_${t}_${i}` });
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
  });
  await page.waitForTimeout(120);
}

async function advanceTurns(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const before = await page.evaluate(() => (window as any).__gameState.turn);
    await dismissBlockingEvents(page);
    await dispatch(page, { type: 'END_TURN' });
    await page.waitForFunction(
      (b) => ((window as any).__gameState?.turn ?? 0) > b,
      before,
      { timeout: 15000 },
    );
  }
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__gameState;
    return {
      turn: s.turn,
      players: [...s.players.entries()].map(([id, p]: [string, any]) => ({
        id, isHuman: p.isHuman, gold: p.gold, science: p.science, culture: p.culture,
        currentResearch: p.currentResearch,
        researchedTechs: [...(p.researchedTechs ?? [])],
        visibility: (p.visibility ? (p.visibility as Set<string>).size : 0),
      })),
      unitCount: s.units.size,
      cityCount: s.cities.size,
      unitsByOwner: [...s.units.values()].reduce((acc: Record<string, number>, u: any) => {
        acc[u.owner] = (acc[u.owner] ?? 0) + 1;
        return acc;
      }, {}),
      unitPositions: [...s.units.entries()].map(([id, u]: [string, any]) => ({ id, owner: u.owner, pos: u.position })),
    };
  });
}

test.describe('AI behavior over turn progression', () => {
  test('AI player starts researching within 10 turns', async ({ page }) => {
    await startGame(page, 2);
    const initial = await snapshot(page);
    const aiAtStart = initial.players.filter((p) => !p.isHuman);
    expect(aiAtStart.length).toBeGreaterThan(0);

    await advanceTurns(page, 10);

    const after = await snapshot(page);
    const ais = after.players.filter((p) => !p.isHuman);
    expect(ais.length).toBeGreaterThan(0);

    const researching = ais.filter(
      (p) => p.currentResearch !== null || p.researchedTechs.length > 0,
    );
    expect(researching.length).toBeGreaterThan(0);
  });

  test('AI units change position over 15 turns', async ({ page }) => {
    await startGame(page, 2);
    const t1 = await snapshot(page);
    const aiPlayers = t1.players.filter((p) => !p.isHuman).map((p) => p.id);
    expect(aiPlayers.length).toBeGreaterThan(0);

    // Build a lookup of AI unit starting positions.
    const startPositions = new Map<string, { q: number; r: number }>();
    for (const u of t1.unitPositions) {
      if (aiPlayers.includes(u.owner)) startPositions.set(u.id, u.pos);
    }
    expect(startPositions.size).toBeGreaterThan(0);

    await advanceTurns(page, 15);

    const t2 = await snapshot(page);
    // Count units that either moved or disappeared (died/consumed in founding).
    let moved = 0;
    const endPositions = new Map<string, { q: number; r: number }>();
    for (const u of t2.unitPositions) {
      if (aiPlayers.includes(u.owner)) endPositions.set(u.id, u.pos);
    }
    for (const [id, startPos] of startPositions.entries()) {
      const endPos = endPositions.get(id);
      if (!endPos) {
        moved++; // removed (e.g., settler founded a city) counts as activity
        continue;
      }
      if (endPos.q !== startPos.q || endPos.r !== startPos.r) moved++;
    }
    expect(moved).toBeGreaterThan(0);
  });

  test('AI visibility grows over 10 turns', async ({ page }) => {
    await startGame(page, 2);
    const t1 = await snapshot(page);
    const aiStart = t1.players.find((p) => !p.isHuman);
    expect(aiStart).toBeDefined();
    const startVis = aiStart!.visibility;

    await advanceTurns(page, 10);

    const t2 = await snapshot(page);
    const aiEnd = t2.players.find((p) => p.id === aiStart!.id);
    expect(aiEnd).toBeDefined();
    expect(aiEnd!.visibility).toBeGreaterThan(startVis);
  });

  test('no page or console errors across 20 turns', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        // Ignore benign network/devtools noise; keep real errors.
        if (!/favicon|DevTools|Failed to load resource/i.test(text)) {
          consoleErrors.push(text);
        }
      }
    });

    await startGame(page, 2);
    await advanceTurns(page, 20);

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });

  test('with 2 AI opponents, each AI keeps at least one unit through turn 10', async ({ page }) => {
    await page.goto(`http://localhost:5174/?seed=2`);
    await page.evaluate(() => localStorage.setItem('helpShown', 'true'));
    await page.waitForTimeout(400);
    // Bump AI opponent count to 2 before starting.
    await page.getByRole('button', { name: /^2\s*opponents?$/i }).click();
    await page.waitForTimeout(150);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.waitForSelector('canvas', { timeout: 10000 });
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(300);

    const t1 = await snapshot(page);
    const aiIds = t1.players.filter((p) => !p.isHuman).map((p) => p.id);
    expect(aiIds.length).toBe(2);
    for (const id of aiIds) {
      expect((t1.unitsByOwner[id] ?? 0)).toBeGreaterThan(0);
    }

    await advanceTurns(page, 10);

    const t2 = await snapshot(page);
    for (const id of aiIds) {
      expect((t2.unitsByOwner[id] ?? 0)).toBeGreaterThan(0);
    }
  });

  test('AI gold remains non-negative across 10 turns', async ({ page }) => {
    await startGame(page, 2);

    // Track every AI player's gold at each turn; gold must never go negative.
    const minGoldByPlayer = new Map<string, number>();
    const recordMin = async () => {
      const snap = await snapshot(page);
      for (const p of snap.players) {
        if (p.isHuman) continue;
        const prev = minGoldByPlayer.get(p.id);
        if (prev === undefined || p.gold < prev) minGoldByPlayer.set(p.id, p.gold);
      }
    };
    await recordMin();

    for (let i = 0; i < 10; i++) {
      await advanceTurns(page, 1);
      await recordMin();
    }

    expect(minGoldByPlayer.size).toBeGreaterThan(0);
    for (const [, minGold] of minGoldByPlayer.entries()) {
      expect(minGold).toBeGreaterThan(-1); // i.e., >= 0
    }
  });

  test('turn counter advances exactly N turns after N END_TURN dispatches', async ({ page }) => {
    await startGame(page, 2);
    const startTurn = (await snapshot(page)).turn;

    await advanceTurns(page, 5);

    const endTurn = (await snapshot(page)).turn;
    expect(endTurn).toBe(startTurn + 5);
  });
});
