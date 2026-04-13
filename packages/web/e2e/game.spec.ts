import { test, expect } from '@playwright/test';

test.describe('Game loads and renders', () => {
  test('canvas renders with hex grid and UI elements', async ({ page }) => {
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('404') && !msg.text().includes('Manifest')) {
        logs.push(`[${msg.type()}] ${msg.text()}`);
      }
    });

    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 10000 });

    // Canvas exists and has size
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBeGreaterThanOrEqual(1);

    const canvasSize = await page.locator('canvas').first().boundingBox();
    expect(canvasSize!.width).toBeGreaterThan(100);
    expect(canvasSize!.height).toBeGreaterThan(100);

    // TopBar elements
    const body = await page.locator('body').innerText();
    expect(body).toContain('Turn');
    expect(body).toContain('ANTIQUITY');
    expect(body).toContain('End');

    // No game-related console errors
    expect(logs).toEqual([]);
  });

  test('minimap renders as second canvas', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');
    const canvasCount = await page.locator('canvas').count();
    expect(canvasCount).toBe(2);
  });
});

test.describe('Game interactions', () => {
  test('clicking hex shows terrain or unit info in bottom bar', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    // Click near top-right of canvas (likely empty terrain, away from starting units)
    await canvas.click({ position: { x: box!.width * 0.8, y: box!.height * 0.2 } });

    // Bottom bar should show terrain info OR unit info
    const text = await page.locator('body').innerText();
    expect(text).toMatch(/Grassland|Plains|Hills|Desert|Tundra|Forest|Ocean|Settler|Warrior|Scout|Builder|Move/);
  });

  test('pressing Enter advances turn', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');

    // Verify starting at Turn 1
    const before = await page.locator('body').innerText();
    expect(before).toContain('Turn');

    // Press Enter to end turn
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500); // wait for AI turn + transition

    // Should show Turn 2 somewhere (transition overlay or TopBar)
    const after = await page.locator('body').innerText();
    expect(after).toContain('Turn 2') ;
  });

  test('pressing T opens tech tree panel', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas');

    await page.keyboard.press('t');

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

    await page.goto('/');
    await page.waitForSelector('canvas');

    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    // Click a few hexes
    await canvas.click({ position: { x: box!.width * 0.4, y: box!.height * 0.5 } });
    await canvas.click({ position: { x: box!.width * 0.6, y: box!.height * 0.3 } });

    // Open/close panels
    await page.keyboard.press('t'); // tech
    await page.keyboard.press('t'); // close
    await page.keyboard.press('Enter'); // end turn
    await page.waitForTimeout(1000);

    // Dismiss turn transition overlay (it intercepts pointer events)
    const overlay = page.locator('.fixed.inset-0.z-50');
    if (await overlay.count() > 0) {
      await overlay.click({ timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(500);

    // End another turn
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);

    // Dismiss second transition
    if (await overlay.count() > 0) {
      await overlay.click({ timeout: 5000 }).catch(() => {});
    }
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });
});
