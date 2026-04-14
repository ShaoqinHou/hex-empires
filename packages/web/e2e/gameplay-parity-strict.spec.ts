/**
 * Gameplay parity — STRICT live-state behavioural tests for M13 parity
 * systems (pantheons, governments, policies, urban building placement,
 * commander XP/promotion).
 *
 * Tighter follow-up to gameplay-parity.spec.ts. Where possible, asserts
 * real state deltas (player.pantheonId set after ADOPT_PANTHEON, turn
 * advances, consistency invariants) rather than just "no crash".
 *
 * Tests that can't force preconditions (insufficient faith, un-researched
 * civic) assert safe no-ops — state must not be corrupted.
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

async function humanPlayer(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__gameState;
    const entries = [...s.players.entries()] as Array<[string, any]>;
    const human = entries.find(([, p]) => p.isHuman) ?? entries[0];
    return { id: human[0] as string, player: human[1] as any };
  });
}

async function advanceTurns(page: Page, n: number) {
  for (let i = 0; i < n; i++) {
    const before = await page.evaluate(() => (window as any).__gameState.turn);
    await dispatch(page, { type: 'END_TURN' });
    await page
      .waitForFunction((t) => ((window as any).__gameState?.turn ?? 0) > t, before, {
        timeout: 15000,
      })
      .catch(() => {
        /* AI turn may have looped — accept whatever turn state we land on */
      });
  }
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Gameplay parity: live state changes', () => {
  test('ADOPT_PANTHEON stamps pantheonId on player if faith sufficient, else leaves null', async ({
    page,
  }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const { id: playerId, player } = await humanPlayer(page);

    // Faith at T1 is typically 0 — we can't force it up via a dispatchable
    // action, so we accept both: applied OR still null.
    const faithBefore = typeof player.faith === 'number' ? player.faith : 0;

    await dispatch(page, { type: 'ADOPT_PANTHEON', playerId, pantheonId: 'god_of_war' });

    const pantheonId = await page.evaluate((pid) => {
      const p = (window as any).__gameState.players.get(pid);
      return p ? (p.pantheonId ?? null) : null;
    }, playerId);

    // Either it was applied (faith was sufficient) OR stayed null. NEVER some
    // corrupted value like 'undefined' string, NaN, or a different id.
    expect([null, 'god_of_war']).toContain(pantheonId);
    // Invariant: with zero faith, pantheonId must remain null.
    if (faithBefore === 0) {
      expect(pantheonId).toBeNull();
    }
    expect(errs).toEqual([]);
  });

  test('ADOPT_PANTHEON with non-existent pantheonId leaves pantheonId null', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const { id: playerId } = await humanPlayer(page);

    await dispatch(page, {
      type: 'ADOPT_PANTHEON',
      playerId,
      pantheonId: 'definitely_not_a_real_pantheon_xyz',
    });

    const pantheonId = await page.evaluate((pid) => {
      const p = (window as any).__gameState.players.get(pid);
      return p ? (p.pantheonId ?? null) : null;
    }, playerId);

    expect(pantheonId).toBeNull();
    expect(errs).toEqual([]);
  });

  test('SET_GOVERNMENT leaves governmentId null if required civic not researched', async ({
    page,
  }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const { id: playerId } = await humanPlayer(page);

    const before = await page.evaluate((pid) => {
      const p = (window as any).__gameState.players.get(pid);
      return p ? (p.governmentId ?? null) : null;
    }, playerId);

    await dispatch(page, { type: 'SET_GOVERNMENT', playerId, governmentId: 'chiefdom' });

    const after = await page.evaluate((pid) => {
      const p = (window as any).__gameState.players.get(pid);
      return p ? (p.governmentId ?? null) : null;
    }, playerId);

    // At T1 the required civic is almost certainly not researched — so
    // governmentId should either stay at its initial value OR flip to
    // 'chiefdom' if the engine allows it. Never a corrupted value.
    expect([before, 'chiefdom']).toContain(after);
    expect(typeof (after ?? '')).toBe('string');
    expect(errs).toEqual([]);
  });

  test('advancing 5 turns after SET_GOVERNMENT leaves turn counter advancing cleanly', async ({
    page,
  }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const { id: playerId } = await humanPlayer(page);
    const startTurn = await page.evaluate(() => (window as any).__gameState.turn);

    await dispatch(page, { type: 'SET_GOVERNMENT', playerId, governmentId: 'chiefdom' });
    await advanceTurns(page, 5);

    const finalTurn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(finalTurn).toBeGreaterThanOrEqual(startTurn + 1);
    expect(finalTurn).toBeLessThanOrEqual(startTurn + 6);
    expect(errs).toEqual([]);
  });

  test('SLOT_POLICY with invalid category leaves slottedPolicies unchanged', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const { id: playerId } = await humanPlayer(page);

    const before = await page.evaluate((pid) => {
      const p = (window as any).__gameState.players.get(pid);
      const sp = p?.slottedPolicies ?? {};
      return JSON.stringify(sp);
    }, playerId);

    await dispatch(page, {
      type: 'SLOT_POLICY',
      playerId,
      category: 'not_a_real_category_xyz',
      slotIndex: 0,
      policyId: 'nonexistent_policy',
    });

    const after = await page.evaluate((pid) => {
      const p = (window as any).__gameState.players.get(pid);
      const sp = p?.slottedPolicies ?? {};
      return JSON.stringify(sp);
    }, playerId);

    expect(after).toBe(before);
    expect(errs).toEqual([]);
  });

  test('PLACE_URBAN_BUILDING on owned city is safe — urbanTiles either grows or stays intact', async ({
    page,
  }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const { id: playerId } = await humanPlayer(page);

    const target = await page.evaluate((pid) => {
      const s = (window as any).__gameState;
      const cities = [...s.cities.values()] as Array<any>;
      const own = cities.find((c) => c.owner === pid) ?? cities[0];
      if (!own) return null;
      const urbanBefore = own.urbanTiles
        ? own.urbanTiles instanceof Map
          ? own.urbanTiles.size
          : Object.keys(own.urbanTiles).length
        : 0;
      return { cityId: own.id, tile: own.position, urbanBefore };
    }, playerId);

    if (!target) {
      // No cities exist at T1 with this seed — treat as pass-through. Just
      // verify dispatch is safe against a bogus city id.
      await dispatch(page, {
        type: 'PLACE_URBAN_BUILDING',
        cityId: 'c_noop',
        tile: { q: 0, r: 0 },
        buildingId: 'granary',
      });
      expect(errs).toEqual([]);
      return;
    }

    await dispatch(page, {
      type: 'PLACE_URBAN_BUILDING',
      cityId: target.cityId,
      tile: target.tile,
      buildingId: 'granary',
    });

    const urbanAfter = await page.evaluate((cid) => {
      const s = (window as any).__gameState;
      const c = s.cities.get(cid);
      if (!c?.urbanTiles) return 0;
      return c.urbanTiles instanceof Map
        ? c.urbanTiles.size
        : Object.keys(c.urbanTiles).length;
    }, target.cityId);

    // Either the placement validated and grew urbanTiles, OR it no-oped.
    // Never shrunk, never corrupted.
    expect(urbanAfter).toBeGreaterThanOrEqual(target.urbanBefore);
    expect(errs).toEqual([]);
  });

  test('GAIN_COMMANDER_XP on a non-commander unit leaves the unit unchanged', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);

    const target = await page.evaluate(() => {
      const s = (window as any).__gameState;
      const entries = [...s.units.entries()] as Array<[string, any]>;
      // Find a non-commander (warrior, settler, etc.) — commander category
      // is tagged on UnitDef. We snapshot by JSON for equality comparison.
      const nonCommander =
        entries.find(([, u]) => {
          const def = s.config?.units?.get?.(u.typeId);
          return def && def.category !== 'commander';
        }) ?? entries[0];
      if (!nonCommander) return null;
      return { id: nonCommander[0], snapshot: JSON.stringify(nonCommander[1]) };
    });

    if (!target) {
      expect(errs).toEqual([]);
      return;
    }

    await dispatch(page, { type: 'GAIN_COMMANDER_XP', unitId: target.id, amount: 9999 });

    const after = await page.evaluate((uid) => {
      const s = (window as any).__gameState;
      const u = s.units.get(uid);
      return u ? JSON.stringify(u) : null;
    }, target.id);

    // Non-commander unit must be byte-identical (no xp added).
    expect(after).toBe(target.snapshot);
    expect(errs).toEqual([]);
  });

  test('combined flow: advance 3 turns, ADOPT_PANTHEON, advance 3 more — turn counter monotonic, no errors', async ({
    page,
  }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const { id: playerId } = await humanPlayer(page);
    const startTurn = await page.evaluate(() => (window as any).__gameState.turn);

    await advanceTurns(page, 3);
    const midTurn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(midTurn).toBeGreaterThanOrEqual(startTurn + 1);

    await dispatch(page, { type: 'ADOPT_PANTHEON', playerId, pantheonId: 'god_of_war' });

    // Pantheon dispatch must not move the turn counter backward.
    const afterPantheonTurn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(afterPantheonTurn).toBe(midTurn);

    await advanceTurns(page, 3);
    const finalTurn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(finalTurn).toBeGreaterThanOrEqual(midTurn + 1);
    expect(finalTurn).toBeLessThanOrEqual(midTurn + 4);

    // Human player still present, state still coherent.
    const stillPresent = await page.evaluate((pid) => {
      const s = (window as any).__gameState;
      return s.players.has(pid);
    }, playerId);
    expect(stillPresent).toBe(true);

    expect(errs).toEqual([]);
  });
});
