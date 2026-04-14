/**
 * Save/Load round-trip — autosave threshold, Resume fidelity, and corrupt-save
 * resilience. Autosave is wired inside GameProvider and fires for every turn
 * advance where `state.turn >= 2` (turn 1 is skipped so the just-started game
 * does not clobber a previous save the moment the setup screen hands off).
 *
 * Self-contained: no cross-spec imports; helpers are inline.
 */
import { test, expect, Page } from '@playwright/test';

// ── Inline helpers (do NOT import from other specs) ──────────────────────────

/**
 * Land on the setup screen with a clean localStorage, seed=2 (grassland
 * settler start — deterministic), and the help overlay suppressed. Reloads so
 * SetupScreen's useEffect re-reads the now-empty save state.
 */
async function fresh(page: Page, seed = 2) {
  await page.goto(`http://localhost:5174/?seed=${seed}`);
  await page.evaluate(() => {
    localStorage.removeItem('hex-empires-save');
    localStorage.removeItem('hex-empires-save-meta');
    localStorage.setItem('helpShown', 'true');
  });
  await page.reload();
  await page.waitForTimeout(300);
}

async function startNew(page: Page, seed = 2) {
  await fresh(page, seed);
  // After `fresh()` the save keys are cleared, so only one Start Game button
  // exists (the new-game variant is only rendered when a save is present).
  await page.locator('[data-testid="start-game-button"]').click();
  await page.waitForSelector('canvas', { timeout: 15000 });
  const box = await page.locator('canvas').first().boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
  await page.waitForFunction(() => (window as any).__gameState?.turn === 1, { timeout: 15000 });
}

async function dispatch(page: Page, action: Record<string, any>) {
  await page.evaluate((a) => (window as any).__gameDispatch(a), action);
  await page.waitForTimeout(80);
}

async function advanceTurn(page: Page) {
  const before = await page.evaluate(() => (window as any).__gameState.turn);
  await dispatch(page, { type: 'END_TURN' });
  await page.waitForFunction(
    (b) => ((window as any).__gameState?.turn ?? 0) > b,
    before,
    { timeout: 15000 },
  );
}

async function snap(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__gameState;
    return {
      turn: s.turn as number,
      currentPlayerId: s.currentPlayerId as string,
      unitCount: s.units.size as number,
      cityCount: s.cities.size as number,
      humanGold: ([...s.players.values()] as Array<any>).find((p) => p.isHuman)?.gold ?? 0,
      humanScience: ([...s.players.values()] as Array<any>).find((p) => p.isHuman)?.science ?? 0,
      unitPositions: ([...s.units.entries()] as Array<[string, any]>)
        .map(([id, u]) => ({ id, q: u.position.q, r: u.position.r, owner: u.owner }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    };
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Save/Load round-trip', () => {
  test('autosave fires at turn >= 2 with Autosave meta label', async ({ page }) => {
    await startNew(page);
    // Turn 1: autosave is intentionally skipped. Advance one turn so we cross
    // the threshold and autosave writes at turn 2.
    await advanceTurn(page);
    await page.waitForFunction(() => !!localStorage.getItem('hex-empires-save'), { timeout: 5000 });

    const saveJson = await page.evaluate(() => localStorage.getItem('hex-empires-save'));
    expect(saveJson).not.toBeNull();
    expect(typeof saveJson).toBe('string');
    expect((saveJson as string).length).toBeGreaterThan(100);

    // Parses as JSON without throwing.
    const parsed = await page.evaluate((j) => {
      try { JSON.parse(j as string); return true; } catch { return false; }
    }, saveJson);
    expect(parsed).toBe(true);

    const meta = await page.evaluate(() => localStorage.getItem('hex-empires-save-meta'));
    expect(meta).toMatch(/Autosave/i);
    expect(meta).toMatch(/T[2-9]/);
  });

  test('autosave does NOT fire at turn 1 (fresh start, no END_TURN)', async ({ page }) => {
    await startNew(page);
    // Confirm we are at turn 1 and the autosave key is still null — the turn-1
    // skip inside GameProvider.useEffect should have prevented any write.
    const turn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(turn).toBe(1);
    const saveJson = await page.evaluate(() => localStorage.getItem('hex-empires-save'));
    const meta = await page.evaluate(() => localStorage.getItem('hex-empires-save-meta'));
    // Either the key is unset entirely, or (defensively) the meta does not
    // advertise a T2+ autosave. In practice on a fresh startNew() it is null.
    expect(saveJson).toBeNull();
    expect(meta).toBeNull();
  });

  test('round-trip equality: reload + Resume reproduces the snapshot', async ({ page }) => {
    await startNew(page);
    await advanceTurn(page); // -> T2 autosave
    await advanceTurn(page); // -> T3 autosave (overwrites)
    const before = await snap(page);
    expect(before.turn).toBeGreaterThanOrEqual(3);

    // Navigate away and back so SetupScreen re-reads the save. A full reload
    // is closer to the real user flow (tab closed, reopened) than soft nav.
    await page.goto('http://localhost:5174/?seed=2');
    await page.waitForTimeout(400);
    await expect(page.locator('[data-testid="resume-game-button"]')).toHaveCount(1);
    await page.locator('[data-testid="resume-game-button"]').click();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForFunction(() => ((window as any).__gameState?.turn ?? 0) >= 3, { timeout: 10000 });

    const after = await snap(page);
    expect(after.turn).toBe(before.turn);
    expect(after.currentPlayerId).toBe(before.currentPlayerId);
    expect(after.unitCount).toBe(before.unitCount);
    expect(after.cityCount).toBe(before.cityCount);
    expect(after.humanGold).toBe(before.humanGold);
    expect(after.humanScience).toBe(before.humanScience);
    expect(after.unitPositions).toEqual(before.unitPositions);
  });

  test('Resume preserves currentPlayerId across reload', async ({ page }) => {
    await startNew(page);
    await advanceTurn(page);
    const beforePlayer = await page.evaluate(() => (window as any).__gameState.currentPlayerId);
    expect(typeof beforePlayer).toBe('string');

    await page.goto('http://localhost:5174/?seed=2');
    await page.waitForTimeout(400);
    await page.locator('[data-testid="resume-game-button"]').click();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForFunction(() => !!(window as any).__gameState, { timeout: 10000 });

    const afterPlayer = await page.evaluate(() => (window as any).__gameState.currentPlayerId);
    expect(afterPlayer).toBe(beforePlayer);
  });

  test('Resume preserves every unit position (q, r) identically', async ({ page }) => {
    await startNew(page);
    await advanceTurn(page);
    const before = await snap(page);
    expect(before.unitCount).toBeGreaterThan(0);

    await page.goto('http://localhost:5174/?seed=2');
    await page.waitForTimeout(400);
    await page.locator('[data-testid="resume-game-button"]').click();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForFunction(() => ((window as any).__gameState?.turn ?? 0) >= 2, { timeout: 10000 });

    const after = await snap(page);
    expect(after.unitCount).toBe(before.unitCount);
    expect(after.unitPositions.length).toBe(before.unitPositions.length);
    for (let i = 0; i < before.unitPositions.length; i++) {
      expect(after.unitPositions[i].id).toBe(before.unitPositions[i].id);
      expect(after.unitPositions[i].q).toBe(before.unitPositions[i].q);
      expect(after.unitPositions[i].r).toBe(before.unitPositions[i].r);
      expect(after.unitPositions[i].owner).toBe(before.unitPositions[i].owner);
    }
  });

  test('post-resume END_TURN advances the turn counter correctly', async ({ page }) => {
    await startNew(page);
    await advanceTurn(page); // T2

    await page.goto('http://localhost:5174/?seed=2');
    await page.waitForTimeout(400);
    await page.locator('[data-testid="resume-game-button"]').click();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForFunction(() => ((window as any).__gameState?.turn ?? 0) >= 2, { timeout: 10000 });

    const resumedTurn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(resumedTurn).toBeGreaterThanOrEqual(2);

    await advanceTurn(page);
    const after = await page.evaluate(() => (window as any).__gameState.turn);
    expect(after).toBe(resumedTurn + 1);
  });

  test('New Game (after autosave) overwrites save and resets to turn 1', async ({ page }) => {
    await startNew(page);
    await advanceTurn(page); // T2
    await advanceTurn(page); // T3

    const beforeSave = await page.evaluate(() => localStorage.getItem('hex-empires-save'));
    expect(beforeSave).not.toBeNull();

    await page.goto('http://localhost:5174/?seed=2');
    await page.waitForTimeout(400);
    await expect(page.locator('[data-testid="new-game-button"]')).toHaveCount(1);
    await page.locator('[data-testid="new-game-button"]').click();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForFunction(() => (window as any).__gameState?.turn === 1, { timeout: 10000 });

    const turn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(turn).toBe(1);

    // After a new run starts at T1, the prior autosave has NOT yet been
    // overwritten (autosave is turn-change-driven and T1 is skipped). End a
    // turn so the new run autosaves, then verify the contents changed.
    await advanceTurn(page);
    const afterSave = await page.evaluate(() => localStorage.getItem('hex-empires-save'));
    expect(afterSave).not.toBeNull();
    // The fresh run replayed from seed=2 starts at T1 → T2; the prior save
    // was taken at T3, so the stringified payloads must differ.
    expect(afterSave).not.toBe(beforeSave);
  });

  test('corrupt save does not crash the setup screen', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    // Seed a broken payload that will fail JSON.parse or deserializeState.
    await page.goto('http://localhost:5174/?seed=2');
    await page.evaluate(() => {
      localStorage.setItem('hex-empires-save', '{ this is not valid json');
      localStorage.setItem('hex-empires-save-meta', 'Autosave · T5 · broken');
      localStorage.setItem('helpShown', 'true');
    });
    await page.reload();
    await page.waitForTimeout(600);

    // Setup screen must render — either Resume (if meta was preserved and
    // the broken blob is only noticed on click) or Start Game (if the
    // SetupScreen already rejected it). Both are acceptable; the only hard
    // requirement is that no uncaught JS error fires during mount.
    const setupVisible = await page.evaluate(() => {
      const hasStart = !!document.querySelector('[data-testid="start-game-button"]');
      const hasResume = !!document.querySelector('[data-testid="resume-game-button"]');
      return hasStart || hasResume;
    });
    expect(setupVisible).toBe(true);
    expect(errors).toEqual([]);
  });

  test('autosave payload round-trips through JSON.parse with Map envelopes intact', async ({ page }) => {
    await startNew(page);
    await advanceTurn(page); // T2

    // The engine's serializeState encodes Maps as { __type: 'Map', entries: [...] }.
    // Verifying the envelope is present in the save blob catches silent regressions
    // in the (de)serialization contract that powers Resume.
    const payload = await page.evaluate(() => {
      const raw = localStorage.getItem('hex-empires-save');
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      // Count Map envelopes anywhere in the tree.
      let mapEnvelopes = 0;
      const walk = (v: any) => {
        if (v && typeof v === 'object') {
          if (v.__type === 'Map' && Array.isArray(v.entries)) mapEnvelopes++;
          for (const key of Object.keys(v)) walk(v[key]);
        }
      };
      walk(parsed);
      return {
        hasTurn: typeof parsed.turn === 'number',
        turnValue: parsed.turn,
        mapEnvelopes,
      };
    });
    expect(payload).not.toBeNull();
    expect(payload!.hasTurn).toBe(true);
    expect(payload!.turnValue).toBeGreaterThanOrEqual(2);
    // At minimum: players, units, cities, districts, governors, tradeRoutes → 6 Maps.
    expect(payload!.mapEnvelopes).toBeGreaterThan(3);
  });
});
