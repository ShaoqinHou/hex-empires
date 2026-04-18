import { test, expect, Page } from '@playwright/test';

/** Navigate to the app and click Start Game to get past the setup screen */
async function startGame(page: Page) {
  await page.goto('http://localhost:5174');
  // Suppress auto-help overlay in tests
  await page.evaluate(() => localStorage.setItem('helpShown', 'true'));
  // Wait for setup screen to render
  const startButton = page.locator('[data-testid="start-game-button"]');
  await startButton.waitFor({ timeout: 10000 });
  await startButton.click();
  // Wait for canvas to appear (game started)
  await page.waitForSelector('canvas', { timeout: 10000 });
  // Wait for GameProvider's useEffect to fire — this sets __gameDispatch and
  // guarantees all GameUI useEffects (keyboard handler, etc.) have also run,
  // since React child effects always precede parent effects in the commit phase.
  await page.waitForFunction(() => !!(window as any).__gameDispatch, null, { timeout: 10000 });
  // Park cursor in canvas centre so the camera is stable and Playwright's
  // keyboard events are routed correctly (cursor at 0,0 triggers edge-scroll).
  const canvas = page.locator('canvas').first();
  const box = await canvas.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(100);
}

test.describe('Setup screen', () => {
  test('shows leader and civ selection before game starts', async ({ page }) => {
    await page.goto('http://localhost:5174');
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/leader|civilization|begin your empire/i);
  });
});

test.describe('Game loads and renders', () => {
  test('canvas renders with hex grid and UI elements', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('404') && !msg.text().includes('Manifest')) {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await startGame(page);

    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThanOrEqual(1);

    const canvasSize = await page.locator('canvas').first().boundingBox();
    expect(canvasSize!.width).toBeGreaterThan(100);
    expect(canvasSize!.height).toBeGreaterThan(100);

    const body = await page.locator('body').innerText();
    expect(body).toContain('Turn');
    expect(body).toContain('End');

    expect(logs).toEqual([]);
  });

  test('minimap renders as second canvas', async ({ page }) => {
    await startGame(page);
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBe(2);
  });
});

test.describe('Game interactions', () => {
  test('clicking hex shows terrain or unit info in bottom bar', async ({ page }) => {
    await startGame(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    await canvas.click({ position: { x: box!.width * 0.8, y: box!.height * 0.2 } });

    const text = await page.locator('body').innerText();
    expect(text).toMatch(/Grassland|Plains|Hills|Desert|Tundra|Forest|Ocean|Settler|Warrior|Scout|Builder|Move/);
  });

  test('pressing Enter advances turn', async ({ page }) => {
    await startGame(page);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    const after = await page.locator('body').innerText();
    expect(after).toContain('Turn 2');
  });

  test('pressing T opens tech tree panel', async ({ page }) => {
    await startGame(page);

    await page.keyboard.press('t');
    // TechTreePanel is lazy-loaded — wait for the dynamic chunk to load and mount.
    // Note: waitForFunction(fn, arg?, options?) — pass null as arg so the timeout
    // is correctly placed in the options slot (3rd arg), not the arg slot (2nd).
    await page.waitForFunction(() => /Technology Tree/.test(document.body.innerText), null, { timeout: 10000 });

    const text = await page.locator('body').innerText();
    expect(text).toContain('Technology Tree');
    expect(text).toMatch(/Pottery|Writing|Mining/);
  });
});

test.describe('No runtime errors', () => {
  test('no JS errors during basic gameplay loop', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('404') && !msg.text().includes('Manifest')) {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', err => errors.push(err.message));

    await startGame(page);

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    // Click a few hexes
    await canvas.click({ position: { x: box!.width * 0.4, y: box!.height * 0.5 } });
    await canvas.click({ position: { x: box!.width * 0.6, y: box!.height * 0.3 } });

    // Open/close panels
    await page.keyboard.press('t');
    await page.keyboard.press('t');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Dismiss turn transition overlay
    const overlay = page.locator('.fixed.inset-0.z-50');
    if (await overlay.count() > 0) {
      await overlay.click({ timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(500);

    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    if (await overlay.count() > 0) {
      await overlay.click({ timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
});
