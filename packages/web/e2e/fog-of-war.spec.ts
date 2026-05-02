import { expect, test, type Page } from '@playwright/test';

async function startGame(page: Page) {
  await page.addInitScript(() => {
    localStorage.removeItem('hex-empires-save');
    localStorage.removeItem('hex-empires-save-meta');
    localStorage.setItem('helpShown', 'true');
  });
  await page.goto('http://localhost:5174/?seed=42', { waitUntil: 'domcontentloaded' });
  await page.locator('[data-testid="start-game-button"]').click();
  await page.waitForSelector('[data-testid="game-canvas"]', { timeout: 10000 });
  await page.waitForFunction(() => !!(window as any).__gameDispatch, null, { timeout: 10000 });

  const canvas = page.locator('[data-testid="game-canvas"]');
  const box = await canvas.boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
}

async function dispatch(page: Page, action: Record<string, unknown>) {
  await page.evaluate((nextAction) => (window as any).__gameDispatch(nextAction), action);
}

async function waitForScoutAt(page: Page, coord: { q: number; r: number }) {
  await page.waitForFunction(
    ({ q, r }) => {
      const unit = (window as any).__gameState?.units?.get('scout1');
      return unit?.position?.q === q && unit?.position?.r === r;
    },
    coord,
    { timeout: 5000 },
  );
}

async function waitForHumanTurn(page: Page, minTurn: number) {
  await page.waitForFunction(
    (turn) => {
      const state = (window as any).__gameState;
      return state?.currentPlayerId === 'player1' && state?.phase === 'actions' && state?.turn >= turn;
    },
    minTurn,
    { timeout: 5000 },
  );
}

async function sampleHexPixel(page: Page, coord: { q: number; r: number }) {
  await page.evaluate(({ q, r }) => (window as any).__centerCameraOn(q, r), coord);
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.evaluate(() => new Promise(requestAnimationFrame));

  return page.evaluate(({ q, r }) => {
    const screen = (window as any).__hexToScreen(q, r);
    const canvas = document.querySelector('[data-testid="game-canvas"]') as HTMLCanvasElement | null;
    const ctx = canvas?.getContext('2d');
    if (!screen || !canvas || !ctx) return null;

    const rect = canvas.getBoundingClientRect();
    const pixel = ctx.getImageData(
      Math.round(screen.x - rect.left),
      Math.round(screen.y - rect.top),
      1,
      1,
    ).data;

    return { r: pixel[0], g: pixel[1], b: pixel[2], a: pixel[3] };
  }, coord);
}

function maxPixelDelta(
  before: { r: number; g: number; b: number; a: number } | null,
  after: { r: number; g: number; b: number; a: number } | null,
) {
  if (!before || !after) return Number.POSITIVE_INFINITY;
  return Math.max(
    Math.abs(before.r - after.r),
    Math.abs(before.g - after.g),
    Math.abs(before.b - after.b),
    Math.abs(before.a - after.a),
  );
}

test.describe('fog of war', () => {
  test('initializes at game start and updates immediately after later-turn movement', async ({ page }) => {
    await startGame(page);

    const initial = await page.evaluate(() => {
      const state = (window as any).__gameState;
      const player = state.players.get('player1');
      const scout = state.units.get('scout1');
      return {
        scoutPosition: scout.position,
        visibilityCount: player.visibility.size,
        exploredCount: player.explored.size,
      };
    });

    expect(initial.visibilityCount).toBeGreaterThan(0);
    expect(initial.exploredCount).toBeGreaterThan(0);

    const firstStep = { q: initial.scoutPosition.q + 1, r: initial.scoutPosition.r };
    await dispatch(page, { type: 'MOVE_UNIT', unitId: 'scout1', path: [firstStep] });
    await waitForScoutAt(page, firstStep);

    await dispatch(page, { type: 'END_TURN' });
    await waitForHumanTurn(page, 2);

    const beforeSecondMove = await page.evaluate(() => {
      const state = (window as any).__gameState;
      const scout = state.units.get('scout1');
      const player = state.players.get('player1');
      return {
        scoutPosition: scout.position,
        visibility: [...player.visibility],
      };
    });

    const revealTarget = { q: 1, r: 5 };
    const beforeTarget = await page.evaluate(({ q, r }) => {
      const player = (window as any).__gameState.players.get('player1');
      const key = `${q},${r}`;
      return {
        visible: player.visibility.has(key),
        explored: player.explored.has(key),
      };
    }, revealTarget);
    const beforePixel = await sampleHexPixel(page, revealTarget);

    expect(beforeTarget).toEqual({ visible: false, explored: false });
    expect(beforePixel).not.toBeNull();

    const secondStep = {
      q: beforeSecondMove.scoutPosition.q + 1,
      r: beforeSecondMove.scoutPosition.r,
    };
    await dispatch(page, { type: 'MOVE_UNIT', unitId: 'scout1', path: [secondStep] });
    await waitForScoutAt(page, secondStep);

    const afterTarget = await page.evaluate(({ q, r, beforeVisibility }) => {
      const player = (window as any).__gameState.players.get('player1');
      const key = `${q},${r}`;
      const previousVisibility = new Set(beforeVisibility);
      return {
        visible: player.visibility.has(key),
        explored: player.explored.has(key),
        newlyVisible: player.visibility.has(key) && !previousVisibility.has(key),
      };
    }, { ...revealTarget, beforeVisibility: beforeSecondMove.visibility });
    const afterPixel = await sampleHexPixel(page, revealTarget);

    expect(afterTarget).toEqual({ visible: true, explored: true, newlyVisible: true });
    expect(afterPixel).not.toBeNull();
    expect(maxPixelDelta(beforePixel, afterPixel)).toBeGreaterThan(20);
  });
});
