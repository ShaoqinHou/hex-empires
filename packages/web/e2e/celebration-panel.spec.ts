import { test, expect, Page } from '@playwright/test';

async function startGame(page: Page): Promise<void> {
  await page.goto('http://localhost:5174');
  await page.evaluate(() => {
    localStorage.removeItem('hex-empires-save');
    localStorage.removeItem('hex-empires-save-meta');
    localStorage.setItem('helpShown', 'true');
  });
  await page.locator('[data-testid="start-game-button"]').click();
  await page.waitForSelector('canvas', { timeout: 10_000 });
  await page.waitForFunction(() => !!(window as any).__gameDispatch, null, { timeout: 10_000 });
}

test.describe('Celebration bonus flow', () => {
  test('pending celebration choice auto-opens the panel and stores the picked structured bonus', async ({ page }) => {
    await startGame(page);

    await page.evaluate(() => {
      const w = window as any;
      const state = w.__gameState;
      const playerId = state.currentPlayerId as string;
      const player = state.players.get(playerId);
      state.players.set(playerId, {
        ...player,
        governmentId: 'classical_republic',
        slottedPolicies: player.slottedPolicies ?? [null, null],
        pendingCelebrationChoice: { governmentId: 'classical_republic' },
      });
      w.__gameDispatch({ type: 'SET_RESEARCH', techId: 'pottery' });
    });

    await expect(page.getByText(/Celebration!/)).toBeVisible();
    await page.getByRole('button', { name: /\+20% Culture/ }).click();

    const result = await page.evaluate(() => {
      const state = (window as any).__gameState;
      const player = state.players.get(state.currentPlayerId);
      return {
        pending: player.pendingCelebrationChoice ?? null,
        active: player.activeCelebrationBonus ?? null,
      };
    });

    expect(result.pending).toBeNull();
    expect(result.active).toMatchObject({
      governmentId: 'classical_republic',
      bonusId: 'classical-rep-culture',
      turnsRemaining: 10,
      effects: [
        { type: 'MODIFY_YIELD_PERCENT', target: 'empire', yield: 'culture', percent: 20 },
      ],
    });
  });
});
