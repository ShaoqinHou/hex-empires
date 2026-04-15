/**
 * HUD-layer game-feel invariants — Playwright E2E sweep for the cross-cutting
 * rules in `.claude/rules/ui-overlays.md` ("Testing → Cross-cutting invariants").
 *
 * These assertions only make sense end-to-end (real browser, real renderer,
 * real keyboard wiring): a unit / RTL test can't tell us whether a 5-second
 * mouse sweep produces console errors, whether the tooltip element appears
 * within 200ms of pointer-move, or whether ESC routes through HUDManager
 * before the canvas ESC-deselect handler.
 *
 * Helpers are inlined to mirror the convention in interaction.spec.ts and to
 * keep this spec independently runnable.
 */
import { test, expect, Page } from '@playwright/test';

// ── Helpers (inlined; mirror interaction.spec.ts conventions) ────────────────

async function startGame(page: Page, opts: { seed?: number } = {}) {
  const seed = opts.seed ?? 2;
  await page.goto(`http://localhost:5174/?seed=${seed}`);
  await page.evaluate(() => {
    localStorage.removeItem('hex-empires-save');
    localStorage.removeItem('hex-empires-save-meta');
    localStorage.setItem('helpShown', 'true');
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: /start game/i }).click();
  await page.waitForSelector('canvas', { timeout: 10000 });
  // Wait for the engine to expose its window hooks before the spec proceeds.
  await page.waitForFunction(() => (window as any).__gameState != null, undefined, { timeout: 10000 });

  // Park the cursor in the centre so edge-scroll doesn't drift the camera.
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
}

async function getState(page: Page) {
  return page.evaluate(() => {
    const s = (window as any).__gameState;
    if (!s) return null;
    return {
      turn: s.turn,
      currentPlayerId: s.currentPlayerId,
      cityCount: s.cities.size,
      units: [...s.units.entries()].map(([id, u]: [string, any]) => ({
        id, typeId: u.typeId, owner: u.owner, position: u.position,
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

async function ownUnit(page: Page, typeId: string) {
  const s = await getState(page);
  const u = s!.units.find(u => u.owner === s!.currentPlayerId && u.typeId === typeId);
  if (!u) throw new Error(`no own ${typeId} in starting state`);
  return u;
}

async function hexScreen(page: Page, q: number, r: number) {
  await page.evaluate(({ q, r }) => (window as any).__centerCameraOn(q, r), { q, r });
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(60);
  return page.evaluate(({ q, r }) => (window as any).__hexToScreen(q, r), { q, r });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('HUD invariants — game-feel', () => {
  test('zero pageerror under a 5s hover sweep across the visible map', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(`pageerror: ${String(e)}`));
    page.on('console', (m) => { if (m.type() === 'error') errs.push(`console: ${m.text()}`); });

    await startGame(page);

    const canvas = page.locator('canvas').first();
    const box = (await canvas.boundingBox())!;

    // Sweep a grid of points across the visible canvas for ~5s. 6×5 grid =
    // 30 anchor points; 170ms dwell each ≈ 5.1s real time.
    const cols = 6;
    const rows = 5;
    for (let cy = 0; cy < rows; cy++) {
      for (let cx = 0; cx < cols; cx++) {
        const x = box.x + (box.width  * (cx + 0.5)) / cols;
        const y = box.y + (box.height * (cy + 0.5)) / rows;
        await page.mouse.move(x, y, { steps: 4 });
        await page.waitForTimeout(170);
      }
    }

    expect(errs, `unexpected errors during hover sweep:\n${errs.join('\n')}`).toEqual([]);
  });

  test('tile tooltip text appears within 200ms of hover (terrain name visible)', async ({ page }) => {
    await startGame(page);
    // Hover a known own-unit tile — the tooltip will at minimum surface the
    // terrain and the unit. Terrain is always one of the engine's base set.
    const warrior = await ownUnit(page, 'warrior');
    const scr = await hexScreen(page, warrior.position.q, warrior.position.r);

    // Move the mouse off the tile first so the next move triggers a fresh
    // hover event, then move onto the tile and start the 200ms timer.
    const canvas = page.locator('canvas').first();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.waitForTimeout(120);

    await page.mouse.move(scr!.x, scr!.y);
    const tooltip = page.locator('[data-hud-id="tileTooltip"]');
    await expect(tooltip).toContainText(
      /Grassland|Plains|Forest|Desert|Tundra|Snow|Mountain|Coast|Ocean|Hills|Tropical|Savanna|Lake/i,
      { timeout: 200 },
    );
  });

  test('duplicate-content guard: stacked warrior + settler renders each unit name once with a cycle pill', async ({ page }) => {
    // Engine permits 1 military + 1 civilian on a tile (M32 stacking rule).
    // The M37-B regression: the tooltip used to render "Warrior ×2" and hide
    // the settler. The fix splits ownUnits per category. We assert:
    //   (a) each unit name appears exactly once in the body,
    //   (b) the cycle pill ("1 / 2 — Tab to cycle") is shown,
    //   (c) Tab advances the displayed cycle index and wraps back.
    await startGame(page, { seed: 2 });
    const warrior = await ownUnit(page, 'warrior');
    const settler = await ownUnit(page, 'settler');

    // Walk the settler onto the warrior's tile (only works if adjacent and
    // the warrior is military / settler is civilian — which they are).
    const dq = warrior.position.q - settler.position.q;
    const dr = warrior.position.r - settler.position.r;
    const dist = (Math.abs(dq) + Math.abs(dr) + Math.abs(-dq - dr)) / 2;
    if (dist !== 1) {
      test.skip(true, `settler ${dist} from warrior on this seed — multi-hop stacking not supported in this test`);
    }
    await dispatch(page, {
      type: 'MOVE_UNIT',
      unitId: settler.id,
      path: [warrior.position],
    });
    const after = await getState(page);
    const settlerAfter = after!.units.find(u => u.id === settler.id);
    if (
      !settlerAfter ||
      settlerAfter.position.q !== warrior.position.q ||
      settlerAfter.position.r !== warrior.position.r
    ) {
      test.skip(true, 'engine rejected settler→warrior stack on this seed');
    }

    const scr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.move(scr!.x, scr!.y);

    const tooltip = page.locator('[data-hud-id="tileTooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 1000 });

    // Body content: each name appears, no "×2" since each category has one unit.
    const text = (await tooltip.textContent()) ?? '';
    expect(text).toContain('Warrior');
    expect(text).toContain('Settler');
    expect(text).not.toMatch(/Warrior\s*×\s*2/);
    expect(text).not.toMatch(/Settler\s*×\s*2/);

    // Cycle pill present, one-indexed "1 / 2".
    const pill = tooltip.locator('[data-testid="tooltip-cycle-pill"]');
    await expect(pill).toBeVisible();
    await expect(pill).toContainText(/1\s*\/\s*2/);

    // Tab advances; cursor must stay on the canvas / off form fields so the
    // HUDManager Tab handler runs (it bails when an INPUT/TEXTAREA is focused).
    await page.keyboard.press('Tab');
    await page.waitForTimeout(80);
    await expect(pill).toContainText(/2\s*\/\s*2/);

    // Wrap-around: third Tab returns to "1 / 2" (displayIndex = (i % stackSize) + 1).
    await page.keyboard.press('Tab');
    await page.waitForTimeout(80);
    await expect(pill).toContainText(/1\s*\/\s*2/);
  });

  test('ESC with sticky validation feedback visible does not clear canvas selection', async ({ page }) => {
    // Per ui-overlays.md: ESC routes through HUDManager (capture phase). When
    // a sticky overlay is registered, HUDManager dismisses *that* and stops
    // propagation so the canvas' bubble-phase ESC-deselect handler does NOT
    // fire. The unit selected before ESC must remain selected after.
    //
    // ValidationFeedback now registers with HUDManager as sticky (batch 3C),
    // so ESC routes through HUDManager's capture-phase handler which dismisses
    // the sticky overlay and stops propagation — the canvas deselect handler
    // does not fire.

    await startGame(page);

    const warrior = await ownUnit(page, 'warrior');
    const wScr = await hexScreen(page, warrior.position.q, warrior.position.r);
    await page.mouse.click(wScr!.x, wScr!.y, { button: 'left' });
    await page.waitForTimeout(200);
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    // Trigger validation feedback by dispatching an obviously-invalid action:
    // move the unit to a hex 99 away. The engine returns a validation error;
    // GameProvider records `lastValidation`, which renders the feedback toast
    // through TooltipShell as a sticky `fixed-corner` overlay (see
    // ValidationFeedback.tsx).
    await dispatch(page, {
      type: 'MOVE_UNIT',
      unitId: warrior.id,
      path: [{ q: warrior.position.q + 99, r: warrior.position.r + 99 }],
    });

    const feedback = page.locator('[data-testid="validation-feedback-bubble"]');
    await expect(feedback).toBeVisible({ timeout: 1500 });
    expect((await getSelection(page)).unitId).toBe(warrior.id);

    // Press ESC. The HUDManager's capture-phase handler should dismiss the
    // sticky registration and stop propagation; canvas handler must NOT fire.
    await page.keyboard.press('Escape');
    await page.waitForTimeout(120);

    expect((await getSelection(page)).unitId).toBe(warrior.id);
  });

  test('user-select on .game-app is "none"', async ({ page }) => {
    await startGame(page);
    const userSelect = await page.evaluate(() => {
      const el = document.querySelector('.game-app') as HTMLElement | null;
      if (!el) return null;
      return getComputedStyle(el).userSelect;
    });
    expect(userSelect).toBe('none');
  });

  test('tooltip does not occlude the focal hex (overlap < 30%)', async ({ page }) => {
    // Per ui-overlays.md positioning rule #2: the tooltip must offset enough
    // to keep the hovered tile visible — overlap with the hex's screen rect
    // must stay under ~30%. A naive `top: 0; left: 0` overlay would fail.
    await startGame(page);

    const warrior = await ownUnit(page, 'warrior');
    const scr = await hexScreen(page, warrior.position.q, warrior.position.r);

    // Park the cursor briefly off-tile so hovering on creates a fresh event.
    const canvas = page.locator('canvas').first();
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 8, box.y + 8);
    await page.waitForTimeout(120);

    await page.mouse.move(scr!.x, scr!.y);
    const tooltip = page.locator('[data-hud-id="tileTooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 1000 });

    // Approximate the hex's bounding box with a square centred on the hex
    // pixel. Hexes are ~64px wide at default zoom; using 60px for the AABB
    // is well within the inscribed square so the test remains conservative.
    const HEX_HALF = 30;
    const hex = {
      left: scr!.x - HEX_HALF,
      top: scr!.y - HEX_HALF,
      right: scr!.x + HEX_HALF,
      bottom: scr!.y + HEX_HALF,
    };

    const tipRect = await tooltip.evaluate((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    });

    const overlapW = Math.max(0, Math.min(tipRect.right,  hex.right)  - Math.max(tipRect.left, hex.left));
    const overlapH = Math.max(0, Math.min(tipRect.bottom, hex.bottom) - Math.max(tipRect.top,  hex.top));
    const overlap  = overlapW * overlapH;
    const hexArea  = (hex.right - hex.left) * (hex.bottom - hex.top);
    const ratio    = overlap / hexArea;

    expect(
      ratio,
      `tooltip rect (${JSON.stringify(tipRect)}) overlaps focal hex (${JSON.stringify(hex)}) by ${(ratio * 100).toFixed(1)}%; rule cap is 30%`,
    ).toBeLessThan(0.3);
  });
});
