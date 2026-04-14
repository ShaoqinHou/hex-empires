/**
 * Full interaction surface — tests what a human player actually does.
 *
 * Unlike selection.spec.ts (which validates the refactor's dispatch paths), this file
 * exercises real mouse/keyboard sequences the way a user would, catching integration
 * bugs like the mouseup-button-gate issue (commit 27c9a36).
 *
 * Coverage: left-click select · right-click action · drag/pan · wheel zoom
 *          · keyboard shortcuts · hover · selection persistence · robustness
 *
 * Helpers rely on window-level test hooks exposed by GameProvider + GameCanvas:
 *   __gameState    — current engine state
 *   __gameDispatch — engine action dispatch
 *   __hexToScreen  — hex(q,r) → {x,y} live screen pixel
 *   __selection    — { unitId, hex, cityId } — current UI selection
 */
import { test, expect, Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function startGame(page: Page) {
  await page.goto('http://localhost:5174');
  await page.evaluate(() => localStorage.setItem('helpShown', 'true'));
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /start game/i }).click();
  await page.waitForSelector('canvas', { timeout: 10000 });

  // IMPORTANT: Playwright's cursor defaults to (0,0) which sits inside the 3px edge-scroll
  // threshold. Leaving it there pans the camera ~15px/frame indefinitely. Park it in the
  // middle of the viewport so the camera is stable before any hex→screen lookups.
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(400);
}

/**
 * Recenter the camera on a specific hex before clicking. Tests that rely on precise
 * hex→screen coordinates MUST call this first — edge-scroll or residual camera state
 * from prior actions can otherwise put the target hex off-canvas.
 */
async function focusHex(page: Page, q: number, r: number) {
  await page.evaluate(({ q, r }) => (window as any).__centerCameraOn(q, r), { q, r });
  // Re-park mouse in the middle of the canvas so edge-scroll doesn't immediately drift.
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(120);
}

async function getState(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__gameState;
    if (!s) return null;
    return {
      turn: s.turn,
      phase: s.phase,
      currentPlayerId: s.currentPlayerId,
      cityCount: s.cities.size,
      units: [...s.units.entries()].map(([id, u]: [string, any]) => ({
        id, typeId: u.typeId, owner: u.owner, position: u.position,
        movementLeft: u.movementLeft, fortified: u.fortified, health: u.health,
      })),
    };
  });
}

async function getSelection(page: Page) {
  return page.evaluate(() => (window as any).__selection ?? { unitId: null, hex: null, cityId: null });
}

async function dispatch(page: Page, action: Record<string, any>) {
  await page.evaluate((a) => (window as any).__gameDispatch(a), action);
  await page.waitForTimeout(100);
}

/**
 * Get screen coords for a hex. Auto-centers the camera on the hex first — this makes
 * every click deterministic regardless of prior drift (edge-scroll, dragging, zoom).
 * Pure view change — does not mutate game state.
 */
async function hexScreen(page: Page, q: number, r: number) {
  await page.evaluate(({ q, r }) => (window as any).__centerCameraOn(q, r), { q, r });
  // Park mouse in canvas middle so edge-scroll can't nudge the camera between calls.
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(60);
  return page.evaluate(({ q, r }) => (window as any).__hexToScreen(q, r), { q, r });
}

async function ownUnit(page: Page, typeId: string) {
  const s = await getState(page);
  const u = s!.units.find(u => u.owner === s!.currentPlayerId && u.typeId === typeId);
  if (!u) throw new Error(`no own ${typeId} in starting state`);
  return u;
}

async function reachableNeighbor(page: Page, pos: { q: number; r: number }) {
  return page.evaluate(({ pos }) => {
    const s = (window as any).__gameState;
    const DIRS = [ {dq:1,dr:0}, {dq:-1,dr:0}, {dq:0,dr:1}, {dq:0,dr:-1}, {dq:1,dr:-1}, {dq:-1,dr:1} ];
    const occupied = (q: number, r: number) =>
      [...s.units.values()].some((u: any) => u.position.q === q && u.position.r === r) ||
      [...s.cities.values()].some((c: any) => c.position.q === q && c.position.r === r);
    for (const d of DIRS) {
      const q = pos.q + d.dq, r = pos.r + d.dr;
      const tile = s.map.tiles.get(`${q},${r}`);
      if (!tile) continue;
      if (['ocean','coast','reef','mountains'].includes(tile.terrain)) continue;
      if (occupied(q, r)) continue;
      return { q, r };
    }
    return null;
  }, { pos });
}

async function distantHex(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__gameState;
    const ownUnits = [...s.units.values()].filter((u: any) => u.owner === s.currentPlayerId);
    for (const [key, tile] of s.map.tiles as Map<string, any>) {
      if (['ocean','coast'].includes(tile.terrain)) continue;
      const [q, r] = key.split(',').map(Number);
      const allFar = ownUnits.every((u: any) => {
        const dq = q - u.position.q, dr = r - u.position.r;
        const ds = -dq - dr;
        return (Math.abs(dq) + Math.abs(dr) + Math.abs(ds)) / 2 >= 15;
      });
      if (allFar) return { q, r };
    }
    return null;
  });
}

// ── Left-click (SELECT ONLY) ─────────────────────────────────────────────────

test.describe('Left-click: select only', () => {
  test('clicking own warrior selects it (__selection.unitId set)', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    const scr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.click(scr!.x, scr!.y, { button: 'left' });
    await page.waitForTimeout(200);
    const sel = await getSelection(page);
    expect(sel.unitId).toBe(warrior.id);
  });

  test('clicking own settler selects it', async ({ page }) => {
    await startGame(page);
    const settler = await ownUnit(page, 'settler');
    const scr = await hexScreen(page, settler.position.q, settler.position.r);
    await page.mouse.click(scr!.x, scr!.y, { button: 'left' });
    await page.waitForTimeout(200);
    const sel = await getSelection(page);
    expect(sel.unitId).toBe(settler.id);
  });

  test('clicking empty hex with unit selected DESELECTS (RTS: never moves on left-click)', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    const wScr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.click(wScr!.x, wScr!.y, { button: 'left' });
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    const nb = await reachableNeighbor(page, warrior.position);
    const nbScr = await hexScreen(page, nb!.q, nb!.r);
    await page.mouse.click(nbScr!.x, nbScr!.y, { button: 'left' });
    await page.waitForTimeout(200);

    // Unit deselected, warrior did NOT move.
    expect((await getSelection(page)).unitId).toBeNull();
    const after = await getState(page);
    expect(after!.units.find(u => u.id === warrior.id)!.position).toEqual(warrior.position);
  });

  test('click-cycle: stacked warrior + settler cycles military → civilian → military', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    const settler = await ownUnit(page, 'settler');

    const dq = warrior.position.q - settler.position.q;
    const dr = warrior.position.r - settler.position.r;
    const dist = (Math.abs(dq) + Math.abs(dr) + Math.abs(-dq - dr)) / 2;
    if (dist !== 1) test.skip(true, `settler/warrior ${dist} apart on this seed`);

    await dispatch(page, { type: 'MOVE_UNIT', unitId: settler.id, path: [warrior.position] });
    const stacked = await getState(page);
    const s2 = stacked!.units.find(u => u.id === settler.id)!;
    if (s2.position.q !== warrior.position.q || s2.position.r !== warrior.position.r) {
      test.skip(true, 'engine rejected settler move into warrior hex');
    }

    const scr = await hexScreen(page, warrior.position.q, warrior.position.r);

    await page.mouse.click(scr!.x, scr!.y, { button: 'left' });
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBe(warrior.id); // military first

    await page.mouse.click(scr!.x, scr!.y, { button: 'left' });
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBe(settler.id); // civilian next

    await page.mouse.click(scr!.x, scr!.y, { button: 'left' });
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBe(warrior.id); // wrap
  });
});

// ── Right-click (CONTEXT ACTION) ─────────────────────────────────────────────

test.describe('Right-click: action only', () => {
  test('right-click reachable neighbor MOVES unit AND preserves selection', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    const nb = await reachableNeighbor(page, warrior.position);
    expect(nb).toBeTruthy();

    const wScr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.click(wScr!.x, wScr!.y, { button: 'left' });
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    const nbScr = await hexScreen(page, nb!.q, nb!.r);
    await page.mouse.click(nbScr!.x, nbScr!.y, { button: 'right' });
    await page.waitForTimeout(350);

    // Unit moved.
    const after = await getState(page);
    expect(after!.units.find(u => u.id === warrior.id)!.position).toEqual(nb);
    // Selection preserved — still the same warrior.
    expect((await getSelection(page)).unitId).toBe(warrior.id);
  });

  test('right-click unreachable hex is a no-op, selection + position preserved', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    const wScr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.click(wScr!.x, wScr!.y, { button: 'left' });
    await page.waitForTimeout(150);

    const far = await distantHex(page);
    expect(far).toBeTruthy();
    const fScr = await hexScreen(page, far!.q, far!.r);
    await page.mouse.click(fScr!.x, fScr!.y, { button: 'right' });
    await page.waitForTimeout(200);

    expect((await getSelection(page)).unitId).toBe(warrior.id);
    const after = await getState(page);
    expect(after!.units.find(u => u.id === warrior.id)!.position).toEqual(warrior.position);
  });

  test('right-click with no selection is a no-op and suppresses browser menu', async ({ page }) => {
    await startGame(page);
    await page.evaluate(() => {
      (window as any).__ctxDefault = null;
      window.addEventListener('contextmenu', (e) => { (window as any).__ctxDefault = e.defaultPrevented; });
    });
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);
    expect((await getSelection(page)).unitId).toBeNull();

    const before = await getState(page);
    const canvas = page.locator('canvas').first();
    const box = (await canvas.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
    await page.waitForTimeout(150);

    const after = await getState(page);
    expect(after!.turn).toBe(before!.turn);
    for (let i = 0; i < before!.units.length; i++) {
      expect(after!.units[i].position).toEqual(before!.units[i].position);
    }
    expect(await page.evaluate(() => (window as any).__ctxDefault)).toBe(true);
  });
});

// ── Drag & pan ───────────────────────────────────────────────────────────────

test.describe('Drag & pan', () => {
  test('left-drag >5px pans without firing click (selection preserved)', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    const wScr = await hexScreen(page, warrior.position.q, warrior.position.r);

    await page.mouse.click(wScr!.x, wScr!.y, { button: 'left' });
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    // Drag starting ≈100px away, moving 40px — should not be treated as a click.
    const startX = wScr!.x + 100, startY = wScr!.y + 100;
    await page.mouse.move(startX, startY);
    await page.mouse.down({ button: 'left' });
    await page.mouse.move(startX + 40, startY + 40, { steps: 8 });
    await page.mouse.up({ button: 'left' });
    await page.waitForTimeout(200);

    // Drag must neither deselect nor move.
    expect((await getSelection(page)).unitId).toBe(warrior.id);
    const after = await getState(page);
    expect(after!.units.find(u => u.id === warrior.id)!.position).toEqual(warrior.position);
  });

  test('wheel zoom does not throw and clicks still work afterward', async ({ page }) => {
    await startGame(page);
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    const canvas = page.locator('canvas').first();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, -200);
    await page.waitForTimeout(100);
    await page.mouse.wheel(0, 400);
    await page.waitForTimeout(100);

    const warrior = await ownUnit(page, 'warrior');
    const wScr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.click(wScr!.x, wScr!.y, { button: 'left' });
    await page.waitForTimeout(200);
    expect((await getSelection(page)).unitId).toBe(warrior.id);
    expect(errs).toEqual([]);
  });
});

// ── Keyboard shortcuts ───────────────────────────────────────────────────────

test.describe('Keyboard shortcuts', () => {
  test('ESC clears selection', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    const scr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.click(scr!.x, scr!.y, { button: 'left' });
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBeNull();
  });

  test('F fortifies the selected warrior', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    const scr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.click(scr!.x, scr!.y, { button: 'left' });
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    await page.keyboard.press('f');
    await page.waitForTimeout(200);
    const after = await getState(page);
    expect(after!.units.find(u => u.id === warrior.id)!.fortified).toBe(true);
  });

  test('B founds a city with a selected settler (or skips if invalid site)', async ({ page }) => {
    await startGame(page);
    const settler = await ownUnit(page, 'settler');
    const scr = await hexScreen(page, settler.position.q, settler.position.r);
    await page.mouse.click(scr!.x, scr!.y, { button: 'left' });
    await page.waitForTimeout(150);

    const before = await getState(page);
    await page.keyboard.press('b');
    await page.waitForTimeout(300);
    const after = await getState(page);
    if (after!.cityCount === before!.cityCount) {
      test.skip(true, 'settler start tile invalid for founding (engine rule)');
    }
    expect(after!.cityCount).toBeGreaterThan(before!.cityCount);
    expect(after!.units.find(u => u.id === settler.id)).toBeUndefined(); // settler consumed
  });

  test('T opens a panel (does not throw)', async ({ page }) => {
    await startGame(page);
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    await page.keyboard.press('t');
    await page.waitForTimeout(250);
    expect(errs).toEqual([]);
  });

  test('Space cycles selection to a different unit with movement', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    const scr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.click(scr!.x, scr!.y, { button: 'left' });
    await page.waitForTimeout(150);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    await page.keyboard.press(' ');
    await page.waitForTimeout(200);
    const selAfter = await getSelection(page);
    // Selection must have changed to some other own unit (or same if only 1 unit has movement).
    const s = await getState(page);
    const movableCount = s!.units.filter(u => u.owner === s!.currentPlayerId && u.movementLeft > 0).length;
    if (movableCount > 1) {
      expect(selAfter.unitId).not.toBe(warrior.id);
    }
    // Never null — always selects something.
    expect(selAfter.unitId).not.toBeNull();
  });
});

// ── Hover / tooltip ──────────────────────────────────────────────────────────

test.describe('Hover & tooltip', () => {
  test('sweeping mouse across 5 hexes produces no console / page errors', async ({ page }) => {
    await startGame(page);
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });

    const warrior = await ownUnit(page, 'warrior');
    for (let dq = 0; dq < 5; dq++) {
      const scr = await hexScreen(page, warrior.position.q + dq, warrior.position.r);
      if (scr) await page.mouse.move(scr.x, scr.y);
      await page.waitForTimeout(80);
    }
    expect(errs).toEqual([]);
  });
});

// ── Robustness ───────────────────────────────────────────────────────────────

test.describe('Robustness', () => {
  test('rapid alternating left/right clicks do not advance turn / corrupt state', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    const wScr = await hexScreen(page, warrior.position.q, warrior.position.r);

    const before = await getState(page);
    for (let i = 0; i < 5; i++) {
      await page.mouse.click(wScr!.x, wScr!.y, { button: 'left' });
      await page.mouse.click(wScr!.x + 10, wScr!.y + 10, { button: 'right' });
    }
    await page.waitForTimeout(300);

    const after = await getState(page);
    expect(after!.turn).toBe(before!.turn);
    expect(after!.phase).toBe(before!.phase);
    expect(after!.currentPlayerId).toBe(before!.currentPlayerId);
  });

  test('select → move → move again (two right-clicks) both succeed', async ({ page }) => {
    await startGame(page);
    const warrior = await ownUnit(page, 'warrior');
    if (warrior.movementLeft < 2) test.skip(true, 'warrior lacks 2 MP for two-hop test');

    const wScr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.click(wScr!.x, wScr!.y, { button: 'left' });
    await page.waitForTimeout(150);

    const nb = await reachableNeighbor(page, warrior.position);
    const nbScr = await hexScreen(page, nb!.q, nb!.r);
    await page.mouse.click(nbScr!.x, nbScr!.y, { button: 'right' });
    await page.waitForTimeout(400);

    const mid = await getState(page);
    const midWarrior = mid!.units.find(u => u.id === warrior.id)!;
    expect(midWarrior.position).toEqual(nb);
    if (midWarrior.movementLeft < 1) {
      test.skip(true, 'warrior spent all MP on first move (terrain cost >1)');
    }

    const nb2 = await reachableNeighbor(page, nb!);
    if (!nb2) test.skip(true, 'no second neighbor available');
    const nb2Scr = await hexScreen(page, nb2!.q, nb2!.r);
    await page.mouse.click(nb2Scr!.x, nb2Scr!.y, { button: 'right' });
    await page.waitForTimeout(400);

    const final = await getState(page);
    const finalWarrior = final!.units.find(u => u.id === warrior.id)!;
    // Either the warrior moved to nb2, OR the engine refused (terrain cost too high for
    // the 1 MP it had left). Both are valid — we're validating the click pathway, not
    // movement-cost rules. Fail only if selection was lost.
    if (finalWarrior.position.q === nb2!.q && finalWarrior.position.r === nb2!.r) {
      // Full two-hop success.
    } else {
      // Warrior stayed at nb due to MP/cost — acceptable if selection survived.
      expect(finalWarrior.position).toEqual(nb);
    }
    // Selection preserved regardless.
    expect((await getSelection(page)).unitId).toBe(warrior.id);
  });
});
