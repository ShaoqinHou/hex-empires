/**
 * Keyboard shortcuts — covers every key wired in GameCanvas + App (the H key).
 *
 * Every shortcut gets its own focused test, plus a couple of combo tests for the
 * behaviors that span multiple handlers (ESC smart-close, Space skip-fortified).
 *
 * Hooks exposed at runtime (same as other specs — inline helpers, no cross-spec import):
 *   __gameState         — current engine state
 *   __gameDispatch(a)   — dispatch an engine action
 *   __selection         — { unitId, hex, cityId } — current UI selection
 *   __hexToScreen(q,r)  — live hex→screen pixel
 *   __centerCameraOn    — deterministic recenter
 *
 * Seed defaults to 2 (grassland settler start, foundable on-tile) for determinism.
 */
import { test, expect, Page } from '@playwright/test';

// ── Inline helpers (do NOT import from other specs) ──────────────────────────

async function startGame(page: Page, seed = 2) {
  await page.goto(`http://localhost:5174/?seed=${seed}`);
  // Clear any autosave so the SetupScreen's Start Game button is the primary action —
  // autosaved runs promote Resume over Start and would leak state between tests.
  await page.evaluate(() => {
    localStorage.removeItem('hex-empires-save');
    localStorage.removeItem('hex-empires-save-meta');
  });
  await page.evaluate(() => localStorage.setItem('helpShown', 'true'));
  // Re-navigate so SetupScreen re-renders without the Resume button.
  await page.goto(`http://localhost:5174/?seed=${seed}`);
  await page.waitForTimeout(400);
  await page.locator('[data-testid="start-game-button"]').click();
  await page.waitForSelector('canvas', { timeout: 10000 });
  const box = await page.locator('canvas').first().boundingBox();
  // Park cursor in canvas center so Playwright's default (0,0) doesn't trigger
  // the 3px edge-scroll and drift the camera before hexScreen lookups.
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
}

async function getState(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__gameState;
    if (!s) return null;
    return {
      turn: s.turn,
      cityCount: s.cities.size,
      currentPlayerId: s.currentPlayerId,
      units: [...s.units.values()].map((u: any) => ({
        id: u.id, typeId: u.typeId, owner: u.owner, position: u.position,
        movementLeft: u.movementLeft, fortified: u.fortified,
      })),
    };
  });
}

async function getSelection(page: Page) {
  return page.evaluate(() => (window as any).__selection ?? { unitId: null, hex: null, cityId: null });
}

async function dispatch(page: Page, action: Record<string, any>) {
  await page.evaluate((a) => (window as any).__gameDispatch(a), action);
  await page.waitForTimeout(80);
}

async function ownUnit(page: Page, typeId: string) {
  const s = await getState(page);
  const u = s!.units.find(u => u.owner === s!.currentPlayerId && u.typeId === typeId);
  if (!u) throw new Error(`no own ${typeId}`);
  return u;
}

async function hexScreen(page: Page, q: number, r: number) {
  await page.evaluate(({ q, r }) => (window as any).__centerCameraOn(q, r), { q, r });
  const box = await page.locator('canvas').first().boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(60);
  return page.evaluate(({ q, r }) => (window as any).__hexToScreen(q, r), { q, r });
}

async function selectByClick(page: Page, q: number, r: number) {
  const s = await hexScreen(page, q, r);
  await page.mouse.click(s!.x, s!.y, { button: 'left' });
  await page.waitForTimeout(150);
}

// Collects pageerror + error console messages — tests that assert "no-throw"
// rely on this instead of scraping DOM state.
function attachErrorCollector(page: Page) {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${String(e)}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    // Known benign React dev-mode warnings unrelated to keyboard handlers.
    if (/Encountered two children with the same key/i.test(text)) return;
    if (/Warning: validateDOMNesting/i.test(text)) return;
    errs.push(`console: ${text}`);
  });
  return errs;
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Keyboard shortcuts', () => {
  test('T toggles the tech tree panel (lazy — content appears)', async ({ page }) => {
    await startGame(page);
    // Initially the tech tree content must not be mounted.
    await expect(page.getByText(/Age Technology Tree/)).toHaveCount(0);

    await page.keyboard.press('t');
    // Lazy-loaded chunk — wait for its heading to render.
    await page.waitForFunction(
      () => /Age Technology Tree/.test(document.body.innerText),
      { timeout: 5000 },
    );
    expect(await page.getByText(/Age Technology Tree/).count()).toBeGreaterThan(0);

    // Second press should close the panel (togglePanel behavior in App.tsx is panel-local,
    // but T dispatches onToggleTechTree which flips activePanel between 'tech' and 'none').
    await page.keyboard.press('t');
    await page.waitForTimeout(200);
    await expect(page.getByText(/Age Technology Tree/)).toHaveCount(0);
  });

  test('Y toggles the yields overlay without throwing', async ({ page }) => {
    const errs = attachErrorCollector(page);
    await startGame(page);
    const turnBefore = (await getState(page))!.turn;

    await page.keyboard.press('y');
    await page.waitForTimeout(150);
    await page.keyboard.press('y');
    await page.waitForTimeout(150);

    // Y is a pure view toggle — no state mutation and no console errors.
    const turnAfter = (await getState(page))!.turn;
    expect(turnAfter).toBe(turnBefore);
    expect(errs, errs.join('\n')).toHaveLength(0);
  });

  test('F fortifies the selected military unit', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    expect(warrior.fortified).toBe(false);

    await selectByClick(page, warrior.position.q, warrior.position.r);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    await page.keyboard.press('f');
    await page.waitForTimeout(200);

    const after = await getState(page);
    expect(after!.units.find(u => u.id === warrior.id)!.fortified).toBe(true);
  });

  test('B founds a city with the selected settler (cityCount +1, settler consumed)', async ({ page }) => {
    await startGame(page, 2);
    const settler = await ownUnit(page, 'settler');

    await selectByClick(page, settler.position.q, settler.position.r);
    expect((await getSelection(page)).unitId).toBe(settler.id);

    const before = await getState(page);
    await page.keyboard.press('b');
    await page.waitForTimeout(300);
    const after = await getState(page);

    expect(after!.cityCount).toBe(before!.cityCount + 1);
    expect(after!.units.find(u => u.id === settler.id)).toBeUndefined();
  });

  test('U on a unit with no upgrade path is a no-throw no-op', async ({ page }) => {
    // U requires: a unit with upgradesTo + sufficient gold + the prereq tech.
    // On the default seed the starting warrior usually has no path yet (no Bronze Working),
    // so we only assert no-throw + no state change. The key wiring is what's under test.
    const errs = attachErrorCollector(page);
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    await selectByClick(page, warrior.position.q, warrior.position.r);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    const before = await getState(page);
    await page.keyboard.press('u');
    await page.waitForTimeout(200);
    const after = await getState(page);

    // Same unit, same type — no upgrade applied and no crash.
    expect(after!.units.find(u => u.id === warrior.id)?.typeId).toBe(warrior.typeId);
    expect(errs, errs.join('\n')).toHaveLength(0);
  });

  test('N cycles to an own city (opens city panel + selection.cityId set)', async ({ page }) => {
    await startGame(page, 2);

    // Found a city first — N needs ≥1 own city to cycle to.
    const settler = await ownUnit(page, 'settler');
    await selectByClick(page, settler.position.q, settler.position.r);
    await page.keyboard.press('b');
    await page.waitForTimeout(300);
    const mid = await getState(page);
    expect(mid!.cityCount).toBe(1);

    // Clear selection first so N starts from a clean baseline.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);

    await page.keyboard.press('n');
    await page.waitForTimeout(200);

    const sel = await getSelection(page);
    expect(sel.cityId).not.toBeNull();
  });

  test('C jumps to the capital once one exists', async ({ page }) => {
    await startGame(page, 2);

    // Before any city exists C is a no-op (tested by the lack of thrown errors).
    const errs = attachErrorCollector(page);
    await page.keyboard.press('c');
    await page.waitForTimeout(150);
    expect(errs, errs.join('\n')).toHaveLength(0);
    expect((await getSelection(page)).cityId).toBeNull();

    // Found a city, then C should pick it (capital by default for the first city).
    const settler = await ownUnit(page, 'settler');
    await selectByClick(page, settler.position.q, settler.position.r);
    await page.keyboard.press('b');
    await page.waitForTimeout(300);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    await page.keyboard.press('c');
    await page.waitForTimeout(200);

    const sel = await getSelection(page);
    expect(sel.cityId).not.toBeNull();
  });

  test('Space cycles to an own unit that still has moves', async ({ page }) => {
    await startGame(page);

    // Clear any incidental selection so Space must pick a unit on its own.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);
    expect((await getSelection(page)).unitId).toBeNull();

    await page.keyboard.press(' ');
    await page.waitForTimeout(200);

    const sel = await getSelection(page);
    expect(sel.unitId).not.toBeNull();

    // And the unit Space picked must belong to the current player with movement remaining.
    const state = await getState(page);
    const picked = state!.units.find(u => u.id === sel.unitId);
    expect(picked).toBeDefined();
    expect(picked!.owner).toBe(state!.currentPlayerId);
    expect(picked!.movementLeft).toBeGreaterThan(0);
    expect(picked!.fortified).toBe(false);
  });

  test('Enter ends the turn (turn counter increments)', async ({ page }) => {
    await startGame(page);
    const before = (await getState(page))!.turn;
    await page.keyboard.press('Enter');
    // End-turn runs the AI pipeline; give it generous time to settle back to the human turn.
    await page.waitForFunction(
      (t0) => (window as any).__gameState?.turn > t0,
      before,
      { timeout: 15000 },
    );
    const after = (await getState(page))!.turn;
    expect(after).toBeGreaterThan(before);
  });

  test('Escape clears unit selection when no panel is open', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    await selectByClick(page, warrior.position.q, warrior.position.r);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBeNull();
  });

  test('H toggles the help panel', async ({ page }) => {
    await startGame(page);
    await expect(page.getByText(/Help & Tutorial/)).toHaveCount(0);

    await page.keyboard.press('h');
    await page.waitForFunction(
      () => /Help & Tutorial/.test(document.body.innerText),
      { timeout: 5000 },
    );
    expect(await page.getByText(/Help & Tutorial/).count()).toBeGreaterThan(0);

    await page.keyboard.press('h');
    await page.waitForTimeout(200);
    await expect(page.getByText(/Help & Tutorial/)).toHaveCount(0);
  });

  // ── Combo tests ────────────────────────────────────────────────────────────

  test('ESC smart-close: first press closes panel, second clears selection', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    await selectByClick(page, warrior.position.q, warrior.position.r);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    // Open the tech tree panel.
    await page.keyboard.press('t');
    await page.waitForFunction(
      () => /Age Technology Tree/.test(document.body.innerText),
      { timeout: 5000 },
    );

    // First ESC — panel closes, selection is preserved.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
    await expect(page.getByText(/Age Technology Tree/)).toHaveCount(0);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    // Second ESC — no panel open, so GameCanvas handler runs and deselects.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBeNull();
  });

  test('Space skips fortified units', async ({ page }) => {
    await startGame(page);

    // Fortify the warrior directly — only military units (non-civilian) can fortify,
    // so this is the one unambiguous way to put an own unit into the "skip" state.
    const warrior = await ownUnit(page, 'warrior');
    await dispatch(page, { type: 'FORTIFY_UNIT', unitId: warrior.id });
    const midState = await getState(page);
    expect(midState!.units.find(u => u.id === warrior.id)!.fortified).toBe(true);

    // Baseline: there must be at least one non-fortified own unit with movement left,
    // otherwise Space has nothing to pick and the test would be vacuous.
    const otherCandidates = midState!.units.filter(
      u => u.owner === midState!.currentPlayerId
        && u.id !== warrior.id
        && u.movementLeft > 0
        && !u.fortified,
    );
    expect(otherCandidates.length).toBeGreaterThan(0);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);

    // Tap Space up to N times (once per own unit) — the fortified warrior must never
    // be chosen, because the cycle list filters it out entirely.
    const ownCount = midState!.units.filter(u => u.owner === midState!.currentPlayerId).length;
    for (let i = 0; i < ownCount + 1; i++) {
      await page.keyboard.press(' ');
      await page.waitForTimeout(150);
      const sel = await getSelection(page);
      expect(sel.unitId).not.toBe(warrior.id);
      expect(sel.unitId).not.toBeNull();
    }
  });
});
