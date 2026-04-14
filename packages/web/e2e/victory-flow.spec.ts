/**
 * Victory-condition pipeline — exercises the engine's victory detection over
 * progressive turn advancement. These tests don't try to *win* (the thresholds
 * are far too high for a short loop); instead they verify the pipeline reports
 * progress monotonically, rejects invalid inputs safely, and never declares a
 * premature winner on seed 2.
 *
 * Relies on window-level test hooks exposed by GameProvider:
 *   __gameState    — current engine state
 *   __gameDispatch — engine action dispatch
 */
import { test, expect, Page } from '@playwright/test';

// ── Helpers (inlined per sub-cycle constraints — no cross-spec imports) ──────

async function startGame(page: Page, seed = 2) {
  await page.goto(`http://localhost:5174/?seed=${seed}`);
  await page.evaluate(() => localStorage.setItem('helpShown', 'true'));
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /start game/i }).click();
  await page.waitForSelector('canvas', { timeout: 10000 });
  const box = await page.locator('canvas').first().boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
}

async function dispatch(page: Page, action: Record<string, any>) {
  // Wait for state hook before dispatching — animation-driven re-renders can
  // temporarily destroy the eval context and clear window.__gameDispatch.
  await page.waitForFunction(() => !!(window as any).__gameDispatch, null, { timeout: 5000 });
  try {
    await page.evaluate((a) => (window as any).__gameDispatch(a), action);
  } catch (err) {
    await page.waitForTimeout(250);
    await page.waitForFunction(() => !!(window as any).__gameDispatch, null, { timeout: 5000 });
    await page.evaluate((a) => (window as any).__gameDispatch(a), action);
  }
  await page.waitForTimeout(180);
}

async function waitForState(page: Page, timeoutMs = 5000) {
  await page.waitForFunction(() => !!(window as any).__gameState, null, { timeout: timeoutMs });
}

async function getVictoryState(page: Page) {
  await waitForState(page);
  return page.evaluate(() => {
    const s = (window as any).__gameState;
    return {
      turn: s.turn,
      victory: {
        winner: s.victory.winner,
        winType: s.victory.winType ?? null,
        progressEntries: [...(s.victory.progress as Map<string, any>).entries()].map(
          ([pid, arr]: [string, any[]]) => ({
            playerId: pid,
            items: arr.map((v) => ({ type: v.type, progress: v.progress, achieved: v.achieved })),
          }),
        ),
      },
      players: [...s.players.entries()].map(([id, p]: [string, any]) => ({
        id,
        isHuman: p.isHuman,
        gold: p.gold,
        score: p.score,
        researchedTechs: [...(p.researchedTechs ?? [])],
      })),
    };
  });
}

async function advanceTurns(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    await dispatch(page, { type: 'END_TURN' });
  }
}

function getPlayerProgress(vs: Awaited<ReturnType<typeof getVictoryState>>, playerId: string, type: string) {
  const entry = vs.victory.progressEntries.find((e) => e.playerId === playerId);
  if (!entry) return null;
  return entry.items.find((i) => i.type === type) ?? null;
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Victory-condition pipeline', () => {
  test('at game start, no winner is declared and no progress entries exist', async ({ page }) => {
    await startGame(page);
    const vs = await getVictoryState(page);
    expect(vs.victory.winner).toBe(null);
    expect(vs.victory.winType).toBe(null);
    // Before any END_TURN fires victorySystem, the progress map is empty.
    expect(vs.victory.progressEntries.length).toBe(0);
    expect(vs.turn).toBe(1);
  });

  test('after 5 turns, score-victory progress is non-negative and matches turn/300 ratio', async ({ page }) => {
    await startGame(page);
    await advanceTurns(page, 5);

    const vs = await getVictoryState(page);
    const human = vs.players.find((p) => p.isHuman);
    expect(human).not.toBe(undefined);

    // After 5 END_TURNs victorySystem must have recorded progress for every player.
    expect(vs.victory.progressEntries.length).toBeGreaterThanOrEqual(vs.players.length);

    const scoreProg = getPlayerProgress(vs, human!.id, 'score');
    expect(scoreProg).not.toBe(null);
    // checkScore() derives progress as min(1, turn/300). With turn in [6, 20] range
    // (human starts at turn 1, +5 ENDs, AI-turns bump further), progress must be small
    // and bounded. Upper bound 0.1 covers any plausible 15-turn advancement.
    expect(scoreProg!.progress).toBeGreaterThan(0);
    expect(scoreProg!.progress).toBeLessThan(0.1);
    // Score victory triggers only at turn-limit (300); must not be achieved yet.
    expect(scoreProg!.achieved).toBe(false);
    // progress should be proportional to turn count (progress = min(1, turn/300)).
    // Allow a small tolerance — the progress map is written at end of the last
    // player's END_TURN, so the recorded turn may lag vs.turn by up to 1.
    const expectedProgress = vs.turn / 300;
    expect(scoreProg!.progress).toBeGreaterThan(expectedProgress - 0.01);
    expect(scoreProg!.progress).toBeLessThan(expectedProgress + 0.01);
  });

  test('engine safely rejects ATTACK_CITY against a non-existent city id (no crash, no winner)', async ({ page }) => {
    await startGame(page);
    const before = await getVictoryState(page);

    // Capture uncaught page errors — any crash inside the system pipeline would surface here.
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(String(err)));

    // Dispatch a deliberately malformed action: nonexistent attacker AND city.
    await dispatch(page, { type: 'ATTACK_CITY', attackerId: 'bogus-unit-id', cityId: 'bogus-city-id' });

    const after = await getVictoryState(page);
    expect(after.victory.winner).toBe(null);
    expect(after.turn).toBe(before.turn);
    expect(errors).toEqual([]);
  });

  test('turn counter strictly increases over 8 END_TURNs', async ({ page }) => {
    await startGame(page);
    const turns: number[] = [];
    const initial = await getVictoryState(page);
    turns.push(initial.turn);

    for (let i = 0; i < 8; i++) {
      await dispatch(page, { type: 'END_TURN' });
      const vs = await getVictoryState(page);
      turns.push(vs.turn);
    }

    // Each recorded turn must be strictly greater than the previous one.
    for (let i = 1; i < turns.length; i++) {
      expect(turns[i]).toBeGreaterThan(turns[i - 1]);
    }
    // End value must equal start + 8.
    expect(turns[turns.length - 1]).toBe(turns[0] + 8);
  });

  test('economic-victory progress over 10 turns is monotonic non-decreasing when gold does not drop', async ({ page }) => {
    await startGame(page);

    // Advance one turn first so the progress map is populated.
    await advanceTurns(page, 1);
    const baseline = await getVictoryState(page);
    const human = baseline.players.find((p) => p.isHuman)!;
    const humanId = human.id;

    const econStart = getPlayerProgress(baseline, humanId, 'economic')!;
    expect(econStart).not.toBe(null);
    expect(econStart.progress).toBeGreaterThanOrEqual(0);
    expect(econStart.progress).toBeLessThanOrEqual(1);

    await advanceTurns(page, 10);
    const vsEnd = await getVictoryState(page);
    const econEnd = getPlayerProgress(vsEnd, humanId, 'economic')!;
    expect(econEnd).not.toBe(null);

    // Economic progress blends gold + totalGoldEarned + alliance. The totalGoldEarned
    // leg is monotonic (cumulative), and gold rarely drops in the first 10 turns on
    // seed 2 (no wars, no rush-buys). Allow a small epsilon for floating-point noise.
    expect(econEnd.progress).toBeGreaterThanOrEqual(econStart.progress - 0.01);
    expect(econEnd.progress).toBeLessThanOrEqual(1);
    expect(econEnd.achieved).toBe(false);
  });

  test('no premature victory is declared across 15 turns on seed 2', async ({ page }) => {
    await startGame(page);
    await advanceTurns(page, 15);

    const vs = await getVictoryState(page);
    expect(vs.victory.winner).toBe(null);
    expect(vs.victory.winType).toBe(null);
    // Every player should have all 7 victory-type progress entries, none achieved.
    for (const entry of vs.victory.progressEntries) {
      const types = entry.items.map((i) => i.type).sort();
      expect(types).toEqual(
        ['culture', 'diplomacy', 'domination', 'economic', 'military', 'science', 'score'].sort(),
      );
      for (const item of entry.items) {
        expect(item.achieved).toBe(false);
        expect(item.progress).toBeGreaterThanOrEqual(0);
        expect(item.progress).toBeLessThanOrEqual(1);
      }
    }
  });
});
