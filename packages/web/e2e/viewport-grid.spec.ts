/**
 * viewport-grid.spec.ts — Phase 1.5.1 grid template verification.
 *
 * Verifies that the .game-app CSS grid adapts correctly to each of the
 * three viewport classes (standard / wide / ultra) by:
 *   1. Setting the viewport to a size representative of the class.
 *   2. Navigating to the game.
 *   3. Asserting that .game-app has display:grid and the chrome bar
 *      heights match the layout-tokens.css values for that class.
 *
 * NOTE: These specs run against a live dev server (port 5174).
 * They will be skipped if the server is not running — which is expected
 * in CI-only environments without a running game server.
 */

import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'standard', width: 1600, height: 900,  topbarHeight: 56, bottombarHeight: 48 },
  { name: 'wide',     width: 2100, height: 1200, topbarHeight: 64, bottombarHeight: 56 },
  { name: 'ultra',    width: 2880, height: 1620, topbarHeight: 72, bottombarHeight: 64 },
];

for (const vp of VIEWPORTS) {
  test(`game-app grid adapts for ${vp.name} viewport (${vp.width}x${vp.height})`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });

    await page.goto('http://localhost:5174/');
    // Dismiss help and start a game so GameUI mounts.
    await page.evaluate(() => {
      localStorage.setItem('helpShown', 'true');
      localStorage.removeItem('hex-empires-save');
      localStorage.removeItem('hex-empires-save-meta');
    });
    await page.goto(`http://localhost:5174/?seed=42`);
    // Wait for the game UI to mount.
    await page.waitForSelector('.game-app', { timeout: 10_000 });
    // Skip the setup screen by starting a new game if needed.
    const startBtn = page.locator('button', { hasText: /start new game/i });
    if (await startBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await startBtn.click();
      await page.waitForSelector('[data-testid="end-turn-button"]', { timeout: 10_000 });
    }

    // Assert .game-app uses CSS grid.
    const display = await page.evaluate(() => {
      const el = document.querySelector('.game-app');
      return el ? window.getComputedStyle(el).display : null;
    });
    expect(display).toBe('grid');

    // Assert TopBar height matches the token value for this viewport class.
    const topbarHeight = await page.evaluate(() => {
      const el = document.querySelector('.game-app > .layout-chrome-bar:first-child');
      return el ? el.getBoundingClientRect().height : null;
    });
    expect(topbarHeight).toBe(vp.topbarHeight);

    // Assert BottomBar height matches the token value for this viewport class.
    const bottombarHeight = await page.evaluate(() => {
      const el = document.querySelector('.game-app > .layout-chrome-bar:last-child');
      return el ? el.getBoundingClientRect().height : null;
    });
    expect(bottombarHeight).toBe(vp.bottombarHeight);
  });
}
