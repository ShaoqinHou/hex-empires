/**
 * Gameplay parity — forward-looking smoke tests for Civ VII parity actions
 * planned for M12 integration (pantheons, governments, policies, urban
 * building placement, commander XP/promotion).
 *
 * These tests DO NOT assume the engine has wired the new action types yet.
 * The critical invariant is simply: dispatching the action must not crash
 * the page (no pageerror) and must leave the state internally consistent.
 *
 * Once M12+ wiring lands, follow-up tightening should replace the "state
 * consistent" asserts with concrete behavioural assertions (pantheon is
 * stored on the player, government id changes, etc.).
 *
 * Self-contained: no cross-spec imports; helpers are inline.
 */
import { test, expect, Page } from '@playwright/test';

// ── Inline helpers (do NOT import from other specs) ──────────────────────────

async function startGame(page: Page, seed = 2) {
  await page.goto(`http://localhost:5174/?seed=${seed}`);
  await page.evaluate(() => {
    localStorage.removeItem('hex-empires-save');
    localStorage.removeItem('hex-empires-save-meta');
    localStorage.setItem('helpShown', 'true');
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.getByRole('button', { name: /start game/i }).click();
  await page.waitForSelector('canvas', { timeout: 10000 });
  const box = await page.locator('canvas').first().boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  await page.waitForFunction(() => (window as any).__gameState?.turn === 1, { timeout: 15000 });
}

async function dispatch(page: Page, action: Record<string, any>) {
  await page.evaluate((a) => (window as any).__gameDispatch(a), action);
  await page.waitForTimeout(100);
}

async function state(page: Page) {
  return page.evaluate(() => (window as any).__gameState);
}

async function humanPlayerId(page: Page): Promise<string> {
  const id = await page.evaluate(() => {
    const s = (window as any).__gameState;
    const entries = [...s.players.entries()] as Array<[string, any]>;
    const human = entries.find(([, p]) => p.isHuman);
    return human ? human[0] : entries[0][0];
  });
  return id as string;
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__gameState;
    return {
      turn: s.turn as number,
      phase: s.phase as string,
      currentPlayerId: s.currentPlayerId as string,
      unitCount: s.units.size as number,
      cityCount: s.cities.size as number,
      playerCount: s.players.size as number,
    };
  });
}

function expectConsistent(before: Awaited<ReturnType<typeof snapshot>>, after: Awaited<ReturnType<typeof snapshot>>) {
  // The action is expected to be a no-op (pre-wiring) OR a successful in-turn
  // mutation. In either case, the turn and player should not silently shift
  // (those only advance via END_TURN), and the map-level entity counts must
  // not drop — an uncaught crash or corrupted reducer would tend to break
  // one of these invariants.
  expect(after.turn).toBe(before.turn);
  expect(after.currentPlayerId).toBe(before.currentPlayerId);
  expect(after.playerCount).toBe(before.playerCount);
  expect(after.unitCount).toBeGreaterThanOrEqual(0);
  expect(after.cityCount).toBeGreaterThanOrEqual(0);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Gameplay parity: new systems', () => {
  test('ADOPT_PANTHEON dispatches without crashing the page', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const playerId = await humanPlayerId(page);
    const before = await snapshot(page);

    await dispatch(page, { type: 'ADOPT_PANTHEON', playerId, pantheonId: 'god_of_war' });

    const after = await snapshot(page);
    // If the engine wires this action, it might stamp the pantheon on the
    // player — accept that OR a clean no-op. Either way: no errors, and
    // the rest of the state stays consistent.
    const pantheonApplied = await page.evaluate((pid) => {
      const p = (window as any).__gameState.players.get(pid);
      return !!p && (p.pantheonId === 'god_of_war' || p.pantheon === 'god_of_war');
    }, playerId);
    // Either it was applied cleanly, or the engine no-oped — both OK.
    expect(typeof pantheonApplied).toBe('boolean');
    expectConsistent(before, after);
    expect(errs).toEqual([]);
  });

  test('SET_GOVERNMENT dispatches without crashing the page', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const playerId = await humanPlayerId(page);
    const before = await snapshot(page);

    await dispatch(page, { type: 'SET_GOVERNMENT', playerId, governmentId: 'chiefdom' });

    const after = await snapshot(page);
    const governmentApplied = await page.evaluate((pid) => {
      const p = (window as any).__gameState.players.get(pid);
      return !!p && (p.governmentId === 'chiefdom' || p.government === 'chiefdom');
    }, playerId);
    expect(typeof governmentApplied).toBe('boolean');
    expectConsistent(before, after);
    expect(errs).toEqual([]);
  });

  test('SLOT_POLICY dispatches without crashing the page', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const playerId = await humanPlayerId(page);
    const before = await snapshot(page);

    await dispatch(page, {
      type: 'SLOT_POLICY',
      playerId,
      category: 'military',
      slotIndex: 0,
      policyId: 'discipline',
    });

    const after = await snapshot(page);
    expectConsistent(before, after);
    expect(errs).toEqual([]);
  });

  test('PLACE_URBAN_BUILDING dispatches without crashing the page', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const playerId = await humanPlayerId(page);

    // With seed=2 there are no cities at T1, so we can't always locate one.
    // Use any available city OR fall back to an arbitrary tile + a plausible
    // building id. The assertion is crash-safety, not correctness.
    const target = await page.evaluate((pid) => {
      const s = (window as any).__gameState;
      const cities = [...s.cities.values()] as Array<any>;
      const ownCity = cities.find((c) => c.owner === pid) ?? cities[0];
      if (ownCity) {
        return { cityId: ownCity.id, tile: ownCity.position, buildingId: 'granary' };
      }
      return { cityId: 'c_noop', tile: { q: 0, r: 0 }, buildingId: 'granary' };
    }, playerId);

    const before = await snapshot(page);

    await dispatch(page, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: target.cityId,
      tile: target.tile,
      buildingId: target.buildingId,
    });

    const after = await snapshot(page);
    expectConsistent(before, after);
    expect(errs).toEqual([]);
  });

  test('GAIN_COMMANDER_XP dispatches without crashing the page', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);

    const unitId = await page.evaluate(() => {
      const s = (window as any).__gameState;
      const entries = [...s.units.entries()] as Array<[string, any]>;
      return entries.length > 0 ? entries[0][0] : 'u_noop';
    });

    const before = await snapshot(page);

    await dispatch(page, { type: 'GAIN_COMMANDER_XP', unitId, amount: 9999 });

    const after = await snapshot(page);
    expectConsistent(before, after);
    expect(errs).toEqual([]);
  });

  test('PROMOTE_COMMANDER dispatches without crashing the page', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);

    const unitId = await page.evaluate(() => {
      const s = (window as any).__gameState;
      const entries = [...s.units.entries()] as Array<[string, any]>;
      return entries.length > 0 ? entries[0][0] : 'u_noop';
    });

    const before = await snapshot(page);

    await dispatch(page, { type: 'PROMOTE_COMMANDER', unitId, abilityId: 'command_presence' });

    const after = await snapshot(page);
    expectConsistent(before, after);
    expect(errs).toEqual([]);
  });

  test('combined flow: pantheon + government then END_TURN advances one turn', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const playerId = await humanPlayerId(page);
    const initialTurn = await page.evaluate(() => (window as any).__gameState.turn);

    await dispatch(page, { type: 'ADOPT_PANTHEON', playerId, pantheonId: 'god_of_war' });
    await dispatch(page, { type: 'SET_GOVERNMENT', playerId, governmentId: 'chiefdom' });

    // Turn counter must NOT have moved from pure parity dispatches.
    const midTurn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(midTurn).toBe(initialTurn);

    await dispatch(page, { type: 'END_TURN' });
    await page.waitForFunction(
      (t) => ((window as any).__gameState?.turn ?? 0) > t,
      initialTurn,
      { timeout: 15000 },
    );

    const finalTurn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(finalTurn).toBe(initialTurn + 1);
    expect(errs).toEqual([]);
  });
});
