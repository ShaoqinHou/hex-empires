/**
 * End-to-end coverage for the full building-placement flow (cycle 7).
 *
 * Target flow per `.codex/workflow/design/building-placement-rework.md`:
 *   CityPanel pick
 *   → placement mode launches
 *   → valid tile click → SET_PRODUCTION with locked tile
 *   → accumulate production across N turns
 *   → on completion the building is auto-placed on the locked tile
 *   (or) cancel window handles mid-production bail-outs
 *
 * Relies on the same window-level test hooks as interaction.spec.ts:
 *   __gameState / __gameDispatch / __hexToScreen / __centerCameraOn
 *   __enterPlacementMode / __exitPlacementMode / __placementMode
 *
 * All helpers are inlined — the cycle-7 brief mandates no cross-spec imports.
 */
import { test, expect, Page } from '@playwright/test';

// ── Minimal shapes read off window.__gameState (narrowed from `unknown`). ─────

interface HexCoord {
  readonly q: number;
  readonly r: number;
}

interface ProductionQueueItem {
  readonly type: string;
  readonly id: string;
  readonly lockedTile?: HexCoord;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function startGame(page: Page, seed = 2): Promise<void> {
  await page.goto(`http://localhost:5174/?seed=${seed}`);
  await page.evaluate(() => {
    localStorage.removeItem('hex-empires-save');
    localStorage.removeItem('hex-empires-save-meta');
    localStorage.setItem('helpShown', 'true');
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.locator('[data-testid="start-game-button"]').click();
  await page.waitForSelector('canvas', { timeout: 10000 });
  const box = await page.locator('canvas').first().boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
}

async function dispatch(page: Page, action: Record<string, unknown>): Promise<void> {
  await page.evaluate((a) => (window as unknown as { __gameDispatch: (a: Record<string, unknown>) => void }).__gameDispatch(a), action);
  await page.waitForTimeout(80);
}

/** Dismiss any blocking log events so END_TURN is not gated. */
async function dismissBlockingEvents(page: Page): Promise<void> {
  await page.evaluate(() => {
    const s = (window as unknown as { __gameState?: { currentPlayerId: string; turn: number; log: Array<Record<string, unknown>> } }).__gameState;
    const d = (window as unknown as { __gameDispatch?: (a: Record<string, unknown>) => void }).__gameDispatch;
    if (!s || !d) return;
    const pid = s.currentPlayerId;
    const t = s.turn;
    for (const e of s.log) {
      if (e['blocksTurn'] === true && e['dismissed'] !== true && e['turn'] === t && e['playerId'] === pid) {
        d({ type: 'DISMISS_EVENT', eventMessage: e['message'], eventTurn: e['turn'] });
      }
    }
  });
  await page.waitForTimeout(80);
}

/** Resolve pending growth choices for the active player before advancing turns. */
async function resolvePendingGrowthChoices(page: Page): Promise<void> {
  const hadChoices = await page.evaluate(() => {
    const state = (window as any).__gameState;
    const dispatch = (window as any).__gameDispatch;
    if (!state || !dispatch) return false;

    const pid = state.currentPlayerId;
    const player = state.players?.get(pid);
    const choices = [...((player?.pendingGrowthChoices as Array<{ cityId: string }> | undefined) ?? [])];
    if (choices.length === 0) return false;

    for (const choice of choices) {
      const city = state.cities?.get(choice.cityId);
      if (!city) continue;

      const centerKey = `${city.position.q},${city.position.r}`;
      const territory = [...(city.territory ?? [])]
        .filter((key: string) => key !== centerKey)
        .sort((a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0));

      for (const key of territory) {
        const tile = (window as any).__gameState?.map?.tiles?.get(key);
        if (!tile || tile.improvement || tile.building || city.urbanTiles?.has?.(key)) continue;

        const [q, r] = key.split(',').map(Number);
        if (!Number.isFinite(q) || !Number.isFinite(r)) continue;

        dispatch({ type: 'PLACE_IMPROVEMENT', cityId: choice.cityId, tile: { q, r } });
      }

      if (city.settlementType !== 'town') {
        if (city.specialists < city.population - 1) {
          dispatch({ type: 'ASSIGN_SPECIALIST_FROM_GROWTH', cityId: choice.cityId });
        }
      }
    }
    return true;
  });
  if (hadChoices) {
    await page.waitForFunction(() => {
      const state = (window as any).__gameState;
      const player = state?.players?.get(state.currentPlayerId);
      return ((player?.pendingGrowthChoices as Array<unknown> | undefined) ?? []).length === 0;
    }, null, { timeout: 3000 });
  }
}

async function hexScreen(page: Page, q: number, r: number): Promise<{ x: number; y: number }> {
  await page.evaluate(({ q, r }) => (window as unknown as { __centerCameraOn: (q: number, r: number) => void }).__centerCameraOn(q, r), { q, r });
  const box = await page.locator('canvas').first().boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(60);
  return page.evaluate(({ q, r }) => (window as unknown as { __hexToScreen: (q: number, r: number) => { x: number; y: number } }).__hexToScreen(q, r), { q, r });
}

async function getCurrentPlayerId(page: Page): Promise<string> {
  return page.evaluate(() => {
    const s = (window as unknown as { __gameState: { currentPlayerId: string } }).__gameState;
    return s.currentPlayerId;
  });
}

async function getOwnSettler(page: Page): Promise<{ id: string; position: HexCoord }> {
  const res = await page.evaluate(() => {
    const s = (window as unknown as { __gameState: { currentPlayerId: string; units: Map<string, { id: string; typeId: string; owner: string; position: HexCoord }> } }).__gameState;
    const pid = s.currentPlayerId;
    for (const u of s.units.values()) {
      if (u.owner === pid && u.typeId === 'settler') return { id: u.id, position: u.position };
    }
    return null;
  });
  if (!res) throw new Error('no own settler in starting state');
  return res;
}

/** Found a city on the settler's tile and return the new city id + its tile. */
async function foundCity(page: Page): Promise<{ cityId: string; cityTile: HexCoord } | null> {
  const settler = await getOwnSettler(page);
  const tile: HexCoord = settler.position;
  await dispatch(page, { type: 'FOUND_CITY', unitId: settler.id, name: 'TestCity' });
  const cityId = await page.evaluate(() => {
    const s = (window as unknown as { __gameState: { currentPlayerId: string; cities: Map<string, { id: string; owner: string }> } }).__gameState;
    for (const c of s.cities.values()) {
      if (c.owner === s.currentPlayerId) return c.id;
    }
    return null;
  });
  if (!cityId) return null;
  return { cityId, cityTile: tile };
}

/** Return the head queue item (or null) for the given city. */
async function queueHead(page: Page, cityId: string): Promise<ProductionQueueItem | null> {
  return page.evaluate(({ cityId }) => {
    const s = (window as unknown as { __gameState: { cities: Map<string, { productionQueue: ReadonlyArray<ProductionQueueItem> }> } }).__gameState;
    const city = s.cities.get(cityId);
    if (!city) return null;
    const head = city.productionQueue[0];
    if (!head) return null;
    return { type: head.type, id: head.id, lockedTile: head.lockedTile };
  }, { cityId });
}

/** Return city summary: queue-length + progress + buildings. */
async function citySummary(page: Page, cityId: string): Promise<{
  queueLength: number;
  productionProgress: number;
  buildings: ReadonlyArray<string>;
} | null> {
  return page.evaluate(({ cityId }) => {
    const s = (window as unknown as { __gameState: { cities: Map<string, { productionQueue: ReadonlyArray<unknown>; productionProgress: number; buildings: ReadonlyArray<string> }> } }).__gameState;
    const city = s.cities.get(cityId);
    if (!city) return null;
    return {
      queueLength: city.productionQueue.length,
      productionProgress: city.productionProgress,
      buildings: [...city.buildings],
    };
  }, { cityId });
}

async function tileBuilding(page: Page, tile: HexCoord): Promise<string | null> {
  return page.evaluate(({ tile }) => {
    const s = (window as unknown as { __gameState: { map: { tiles: Map<string, { building?: string | null }> } } }).__gameState;
    const t = s.map.tiles.get(`${tile.q},${tile.r}`);
    if (!t) return null;
    return t.building ?? null;
  }, { tile });
}

async function placementModeActive(page: Page): Promise<boolean> {
  const canvas = page.getByTestId('game-canvas');
  const attr = await canvas.getAttribute('data-placement-mode');
  return attr === 'active';
}

/** Enter placement mode via the test hook (unchanged from cycle 4 helper). */
async function enterPlacement(page: Page, cityId: string, buildingId: string): Promise<void> {
  await page.evaluate(({ cityId, buildingId }) => {
    (window as unknown as { __enterPlacementMode: (cityId: string, buildingId: string) => void }).__enterPlacementMode(cityId, buildingId);
  }, { cityId, buildingId });
  await page.waitForTimeout(100);
}

/** Return a valid tile for the given city+building using the engine helper.
 *  Skips the city-center tile (which already holds the palace). */
async function pickValidTile(page: Page, cityId: string, fallback: HexCoord): Promise<HexCoord> {
  const tile = await page.evaluate(({ cityId, fallback }) => {
    const s = (window as unknown as { __gameState: { cities: Map<string, { territory: ReadonlyArray<string> }> } }).__gameState;
    const city = s.cities.get(cityId);
    if (!city) return fallback;
    const centerKey = `${fallback.q},${fallback.r}`;
    // Prefer a non-center territory tile so we don't collide with the palace.
    for (const key of city.territory) {
      if (key !== centerKey) {
        const [q, r] = key.split(',').map(Number);
        return { q, r };
      }
    }
    // Last resort: use the center tile.
    return fallback;
  }, { cityId, fallback });
  return tile as HexCoord;
}

/** Advance exactly one full player round (state.turn increases by 1). */
async function advanceTurn(page: Page): Promise<void> {
  const before = await page.evaluate(() => (window as unknown as { __gameState: { turn: number } }).__gameState.turn);
  await dismissBlockingEvents(page);
  await resolvePendingGrowthChoices(page);
  await dispatch(page, { type: 'END_TURN' });
  await page.waitForFunction(
    (b) => ((window as unknown as { __gameState?: { turn: number } }).__gameState?.turn ?? 0) > b,
    before,
    { timeout: 15000 },
  );
}

// ── Test suite ──────────────────────────────────────────────────────────────

test.describe('Building placement full flow', () => {
  test('CityPanel build click launches placement mode and closes the panel', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const founded = await foundCity(page);
    if (!founded) test.skip(true, 'founding rejected on this seed');
    const { cityId, cityTile } = founded!;

    // Open the CityPanel by clicking the city tile on the canvas.
    const cityScr = await hexScreen(page, cityTile.q, cityTile.r);
    await page.mouse.click(cityScr.x, cityScr.y, { button: 'left' });
    await page.waitForTimeout(250);

    // Wait for the panel to mount. The shell tags itself with data-panel-id="city".
    const cityPanel = page.locator('[data-panel-id="city"]');
    await expect(cityPanel).toBeVisible({ timeout: 5000 });

    // Click the Monument build entry. Monument has no tech prerequisite, so it
    // appears in the build list on turn 1 in a fresh capital (unlike Granary
    // which gates on Pottery). BuildingCard renders its compact form as a
    // <button>; scope the lookup to the panel so BottomBar/TopBar don't collide.
    const monumentBtn = cityPanel.getByRole('button', { name: /Monument/ }).first();
    await expect(monumentBtn).toBeVisible({ timeout: 5000 });
    await monumentBtn.click();
    await page.waitForTimeout(200);

    // CityPanel closes (onClose → closePanel) and placement mode is active on the canvas.
    await expect(cityPanel).toHaveCount(0);
    expect(await placementModeActive(page)).toBe(true);

    // window.__placementMode reflects the chosen building.
    const pm = await page.evaluate(() => {
      const mode = (window as unknown as { __placementMode: { cityId: string; buildingId: string } | null }).__placementMode;
      return mode ? { cityId: mode.cityId, buildingId: mode.buildingId } : null;
    });
    expect(pm).toEqual({ cityId, buildingId: 'monument' });

    expect(errs).toEqual([]);
  });

  test('valid-tile click in placement mode locks tile on queue and exits mode', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const founded = await foundCity(page);
    if (!founded) test.skip(true, 'founding rejected on this seed');
    const { cityId, cityTile } = founded!;

    await enterPlacement(page, cityId, 'granary');
    expect(await placementModeActive(page)).toBe(true);

    // Pick a valid tile — prefer city centre which is always in territory.
    const tile = await pickValidTile(page, cityId, cityTile);

    const scr = await hexScreen(page, tile.q, tile.r);
    await page.mouse.click(scr.x, scr.y, { button: 'left' });
    await page.waitForTimeout(200);

    // Placement mode exited and the queue now has {granary, lockedTile: tile}.
    expect(await placementModeActive(page)).toBe(false);

    const head = await queueHead(page, cityId);
    expect(head).toEqual({ type: 'building', id: 'granary', lockedTile: tile });

    expect(errs).toEqual([]);
  });

  test('right-click during placement cancels mode without changing production', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const founded = await foundCity(page);
    if (!founded) test.skip(true, 'founding rejected on this seed');
    const { cityId } = founded!;

    const before = await citySummary(page, cityId);
    expect(before).not.toBeNull();

    await enterPlacement(page, cityId, 'granary');
    expect(await placementModeActive(page)).toBe(true);

    const canvas = page.getByTestId('game-canvas');
    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2, { button: 'right' });
    await page.waitForTimeout(150);

    // Placement mode exited; production untouched (deep-equal before/after).
    expect(await placementModeActive(page)).toBe(false);
    const after = await citySummary(page, cityId);
    expect(after).toEqual(before);

    expect(errs).toEqual([]);
  });

  test('multi-turn auto-place: locked building finalises on the tile it was assigned', async ({ page }) => {
    // Granary costs 55 production. At a typical 2-4 prod/turn for a fresh city
    // this needs ~15-30 turns. Cap at 40 round-trip turns to keep the test
    // terminating even on slow seeds.
    test.setTimeout(120_000);

    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const founded = await foundCity(page);
    if (!founded) test.skip(true, 'founding rejected on this seed');
    const { cityId, cityTile } = founded!;

    await enterPlacement(page, cityId, 'granary');
    const tile = await pickValidTile(page, cityId, cityTile);
    const scr = await hexScreen(page, tile.q, tile.r);
    await page.mouse.click(scr.x, scr.y, { button: 'left' });
    await page.waitForTimeout(150);

    // Confirm locked-tile is set before we start cranking turns.
    const head = await queueHead(page, cityId);
    expect(head?.lockedTile).toEqual(tile);

    const MAX_TURNS = 40;
    let completed = false;
    for (let i = 0; i < MAX_TURNS; i++) {
      await advanceTurn(page);
      const summary = await citySummary(page, cityId);
      if (summary && summary.buildings.includes('granary')) {
        completed = true;
        break;
      }
    }
    expect(completed).toBe(true);

    // Engine writes the map-tile building field on auto-placement.
    const onTile = await tileBuilding(page, tile);
    expect(onTile).toBe('granary');

    // Head of queue no longer carries the locked granary.
    const finalHead = await queueHead(page, cityId);
    if (finalHead) {
      // Overflow may have picked up a next item, but the granary entry is gone.
      expect(!(finalHead.id === 'granary' && finalHead.lockedTile && finalHead.lockedTile.q === tile.q && finalHead.lockedTile.r === tile.r)).toBe(true);
    }

    expect(errs).toEqual([]);
  });

  test('CANCEL_BUILDING_PLACEMENT refunds progress and empties the queue head', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const founded = await foundCity(page);
    if (!founded) test.skip(true, 'founding rejected on this seed');
    const { cityId, cityTile } = founded!;

    // Queue a granary with a locked tile via placement mode.
    await enterPlacement(page, cityId, 'granary');
    const tile = await pickValidTile(page, cityId, cityTile);
    const scr = await hexScreen(page, tile.q, tile.r);
    await page.mouse.click(scr.x, scr.y, { button: 'left' });
    await page.waitForTimeout(150);

    const beforeCancel = await citySummary(page, cityId);
    expect(beforeCancel?.queueLength).toBe(1);

    // Cancel BEFORE advancing any turn so productionProgress is still 0 —
    // comfortably inside the cancel window (max(10, floor(0.5 * ppT))).
    await dispatch(page, { type: 'CANCEL_BUILDING_PLACEMENT', cityId });

    const afterCancel = await citySummary(page, cityId);
    expect(afterCancel?.queueLength).toBe(0);
    expect(afterCancel?.productionProgress).toBe(0);
    expect(afterCancel?.buildings ?? []).not.toContain('granary');

    expect(errs).toEqual([]);
  });

  test('invalid-tile click exits placement mode without mutating the queue (documents canvas behaviour)', async ({ page }) => {
    const errs: string[] = [];
    page.on('pageerror', (e) => errs.push(String(e)));

    await startGame(page);
    const founded = await foundCity(page);
    if (!founded) test.skip(true, 'founding rejected on this seed');
    const { cityId, cityTile } = founded!;

    const before = await citySummary(page, cityId);
    expect(before).not.toBeNull();

    await enterPlacement(page, cityId, 'granary');
    expect(await placementModeActive(page)).toBe(true);

    // Pick a tile deliberately far from the city territory (outside any city's
    // footprint). Distance 30 is well beyond the city-3 working radius on any
    // seed. The canvas may or may not map this to a real tile key, but either
    // way the click must NOT pass BuildingPlacementValidator, so no
    // SET_PRODUCTION should fire.
    const farTile: HexCoord = { q: cityTile.q + 30, r: cityTile.r };
    const scr = await hexScreen(page, farTile.q, farTile.r);
    await page.mouse.click(scr.x, scr.y, { button: 'left' });
    await page.waitForTimeout(200);

    // Per GameCanvas.handleClick (cycle 4 routing, M34): invalid-tile clicks
    // silently exit placement mode. Production queue must remain untouched.
    const after = await citySummary(page, cityId);
    expect(after).toEqual(before);
    expect(await placementModeActive(page)).toBe(false);

    expect(errs).toEqual([]);
  });
});
