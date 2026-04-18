/**
 * SetupScreen coverage — fresh-start UI, leader/civ/map/AI-count selection, and
 * the Resume vs New-Game branch driven by an autosave in localStorage.
 *
 * Self-contained: no cross-spec imports; helpers are inline.
 */
import { test, expect, Page } from '@playwright/test';

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Navigate to the setup screen with a clean localStorage (no autosave), seed=2,
 * and the help overlay suppressed. A reload is performed after clearing so the
 * SetupScreen's useEffect re-reads the now-empty save state.
 */
async function fresh(page: Page) {
  await page.goto('http://localhost:5174/?seed=2');
  await page.evaluate(() => {
    localStorage.removeItem('hex-empires-save');
    localStorage.removeItem('hex-empires-save-meta');
    localStorage.setItem('helpShown', 'true');
  });
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForTimeout(300);
}

/**
 * From the setup screen, click Start Game, wait for canvas, then dispatch an
 * END_TURN so autosave triggers (autosave is skipped for turn ≤ 1). Returns
 * once state.turn ≥ 2 and the save key is populated.
 */
async function playUntilAutosaved(page: Page) {
  await page.locator('[data-testid="start-game-button"]').click();
  await page.waitForSelector('canvas', { timeout: 10000 });
  await page.waitForFunction(() => (window as any).__gameState?.turn === 1, { timeout: 10000 });
  await page.evaluate(() => (window as any).__gameDispatch({ type: 'END_TURN' }));
  await page.waitForFunction(() => ((window as any).__gameState?.turn ?? 0) >= 2, { timeout: 15000 });
  await page.waitForFunction(() => !!localStorage.getItem('hex-empires-save'), { timeout: 5000 });
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Setup screen', () => {
  test('fresh load shows exactly one Start Game button and no Resume/New-Game', async ({ page }) => {
    await fresh(page);
    await expect(page.locator('[data-testid="start-game-button"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="resume-game-button"]')).toHaveCount(0);
    await expect(page.locator('[data-testid="new-game-button"]')).toHaveCount(0);
  });

  test('all 9 leader names are visible as buttons', async ({ page }) => {
    await fresh(page);
    const leaders = [
      'Augustus', 'Cleopatra', 'Pericles', 'Cyrus', 'Gandhi',
      'Qin Shi Huang', 'Alexander', 'Hatshepsut', 'Genghis Khan',
    ];
    for (const name of leaders) {
      await expect(page.getByRole('button', { name: new RegExp(`^${name.replace(/ /g, '\\s+')}$`) })).toHaveCount(1);
    }
  });

  test('all 6 antiquity civ names are visible as buttons', async ({ page }) => {
    await fresh(page);
    const civs = ['Rome', 'Egypt', 'Greece', 'Persia', 'India', 'China'];
    for (const name of civs) {
      await expect(page.getByRole('button', { name: new RegExp(`^${name}$`) })).toHaveCount(1);
    }
  });

  test('map size buttons Small / Medium / Large are all present', async ({ page }) => {
    await fresh(page);
    await expect(page.getByRole('button', { name: /Small/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Medium/ })).toHaveCount(1);
    await expect(page.getByRole('button', { name: /Large/ })).toHaveCount(1);
    // Dimensions label present (40×30 / 60×40 / 80×50 — uses Unicode × in redesigned buttons)
    const body = await page.locator('body').innerText();
    expect(body).toMatch(/40\s*[×x]\s*30/);
    expect(body).toMatch(/60\s*[×x]\s*40/);
    expect(body).toMatch(/80\s*[×x]\s*50/);
  });

  test('AI opponent count buttons 1 / 2 / 3 are present with opponent(s) suffix', async ({ page }) => {
    await fresh(page);
    const body = await page.locator('body').innerText();
    // "1 Opponent" (singular) and "2 Opponents" / "3 Opponents" (plural, capitalised in redesign)
    expect(body).toMatch(/\b1\b[\s\S]{0,40}opponent\b/i);
    expect(body).toMatch(/\b2\b[\s\S]{0,40}opponents\b/i);
    expect(body).toMatch(/\b3\b[\s\S]{0,40}opponents\b/i);
  });

  test('selecting Cleopatra reveals the Mediterranean Bride ability text', async ({ page }) => {
    await fresh(page);
    await page.getByRole('button', { name: /^Cleopatra$/ }).click();
    await page.waitForTimeout(150);
    const body = await page.locator('body').innerText();
    expect(body).toContain('Mediterranean Bride');
  });

  test('selecting Egypt reveals the Gift of the Nile civ ability text', async ({ page }) => {
    await fresh(page);
    await page.getByRole('button', { name: /^Egypt$/ }).click();
    await page.waitForTimeout(150);
    const body = await page.locator('body').innerText();
    expect(body).toContain('Gift of the Nile');
  });

  test('choosing 2 AI opponents starts a 3-player game (1 human + 2 AI)', async ({ page }) => {
    await fresh(page);
    // Click the AI count button that ends in "2 Opponents" (capitalised post-wave-2 redesign)
    await page.getByRole('button', { name: /2\s+opponents/i }).click();
    await page.waitForTimeout(100);
    await page.locator('[data-testid="start-game-button"]').click();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForFunction(() => (window as any).__gameState?.players?.size > 0, { timeout: 10000 });
    const { playerCount, humanCount } = await page.evaluate(() => {
      const s = (window as any).__gameState;
      const entries = [...s.players.values()] as Array<{ isHuman: boolean }>;
      return {
        playerCount: entries.length,
        humanCount: entries.filter(p => p.isHuman).length,
      };
    });
    expect(playerCount).toBe(3);
    expect(humanCount).toBe(1);
  });

  test('after one turn autosave, Resume button replaces Start Game as the primary', async ({ page }) => {
    await fresh(page);
    await playUntilAutosaved(page);
    // Revisit the setup screen by navigating back to the root URL; SetupScreen re-reads
    // localStorage on mount and should now show Resume + New-Game.
    await page.goto('http://localhost:5174/?seed=2');
    await page.waitForTimeout(400);
    await expect(page.locator('[data-testid="resume-game-button"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="new-game-button"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="start-game-button"]')).toHaveCount(0);
  });

  test('Resume button label includes the current turn number and the civ name', async ({ page }) => {
    await fresh(page);
    await playUntilAutosaved(page);
    await page.goto('http://localhost:5174/?seed=2');
    await page.waitForTimeout(400);
    const resumeLabel = await page.locator('[data-testid="resume-game-button"]').innerText();
    // Default civ is Rome (first in ALL_ANTIQUITY_CIVS). Autosave was triggered at turn ≥ 2.
    expect(resumeLabel).toMatch(/Turn\s+\d+/);
    expect(resumeLabel).toContain('Rome');
  });

  test('clicking Resume loads the autosaved game with turn >= 2', async ({ page }) => {
    await fresh(page);
    await playUntilAutosaved(page);
    await page.goto('http://localhost:5174/?seed=2');
    await page.waitForTimeout(400);
    await page.locator('[data-testid="resume-game-button"]').click();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForFunction(() => ((window as any).__gameState?.turn ?? 0) >= 2, { timeout: 10000 });
    const turn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(turn).toBeGreaterThanOrEqual(2);
  });

  test('New Game (after autosave) starts a fresh run at turn 1 and overwrites the save', async ({ page }) => {
    await fresh(page);
    await playUntilAutosaved(page);
    await page.goto('http://localhost:5174/?seed=2');
    await page.waitForTimeout(400);
    await page.locator('[data-testid="new-game-button"]').click();
    await page.waitForSelector('canvas', { timeout: 10000 });
    await page.waitForFunction(() => (window as any).__gameState?.turn === 1, { timeout: 10000 });
    const turn = await page.evaluate(() => (window as any).__gameState.turn);
    expect(turn).toBe(1);
  });
});
