/**
 * Runtime robustness — exercises rapid input, long sessions, and camera stress to
 * catch performance/stability regressions that unit tests miss.
 *
 * Every assertion focuses on "zero page errors + state still consistent" rather
 * than perf.now() deltas or frame counts (those are flaky in CI). We also keep
 * turn counts and iteration counts modest so the full suite stays under 2 min.
 *
 * Hooks exposed by GameProvider + GameCanvas (same as other specs):
 *   __gameState, __gameDispatch, __selection, __hexToScreen, __centerCameraOn,
 *   __cameraState
 */
import { test, expect, Page } from '@playwright/test';

// ── Inline helpers (do NOT import from other specs) ──────────────────────────

async function startGame(page: Page, seed = 2, opts: { keepSave?: boolean } = {}) {
  await page.goto(`http://localhost:5174/?seed=${seed}`);
  // Clear any autosave from a prior test in this browser context so every test
  // gets a fresh starting game — unless a test explicitly needs the save
  // (e.g. the reload/resume test sets up then navigates again).
  if (!opts.keepSave) {
    await page.evaluate(() => {
      localStorage.removeItem('hex-empires-save');
      localStorage.removeItem('hex-empires-save-meta');
    });
  }
  await page.evaluate(() => localStorage.setItem('helpShown', 'true'));
  // Re-navigate so the SetupScreen renders without the Resume button covering
  // the fresh Start Game action.
  if (!opts.keepSave) await page.goto(`http://localhost:5174/?seed=${seed}`);
  await page.waitForTimeout(400);
  await page.locator('[data-testid="start-game-button"]').click();
  await page.waitForSelector('canvas', { timeout: 10000 });
  const box = await page.locator('canvas').first().boundingBox();
  if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(300);
}

async function dispatch(page: Page, action: Record<string, any>) {
  await page.evaluate((a) => (window as any).__gameDispatch(a), action);
  await page.waitForTimeout(60);
}

async function dismissBlockingEvents(page: Page) {
  await page.evaluate(() => {
    const s = (window as any).__gameState;
    const d = (window as any).__gameDispatch;
    if (!s || !d) return;
    const pid: string = s.currentPlayerId;
    const t: number = s.turn;
    for (const e of (s.log as Array<Record<string, unknown>>)) {
      if (e['blocksTurn'] === true && e['dismissed'] !== true && e['turn'] === t && e['playerId'] === pid) {
        d({ type: 'DISMISS_EVENT', eventMessage: e['message'], eventTurn: e['turn'] });
      }
    }

    const currentPlayer = (s.players as Map<string, Record<string, unknown>>).get(pid);
    if (currentPlayer) {
      const crisisPhase = currentPlayer['crisisPhase'] as string | undefined;
      const crisisPolicies = (currentPlayer['crisisPolicies'] as string[] | undefined) ?? [];
      const crisisPolicySlots = (currentPlayer['crisisPolicySlots'] as number | undefined) ?? 0;
      if (crisisPhase && crisisPhase !== 'none' && crisisPhase !== 'resolved' && crisisPolicies.length < crisisPolicySlots) {
        for (let i = crisisPolicies.length; i < crisisPolicySlots; i++) {
          d({ type: 'FORCE_CRISIS_POLICY', policyId: `e2e_auto_policy_${t}_${i}` });
        }
      }

      const celebrationPending = currentPlayer['pendingCelebrationChoice'] as { governmentId?: string } | null | undefined;
      if (celebrationPending) {
        const govId = celebrationPending['governmentId'];
        const govDef = govId ? (s as any).config?.governments?.get?.(govId) : undefined;
        const bonuses = (govDef?.celebrationBonuses as Array<{ id: string }> | undefined) ?? [];
        d({ type: 'PICK_CELEBRATION_BONUS', playerId: pid, bonusId: bonuses[0]?.id ?? 'productivity' });
      }

      const transitionPhase = s['transitionPhase'] as string | undefined;
      const playersReady = (s['playersReadyToTransition'] as string[] | undefined) ?? [];
      if ((transitionPhase === 'pending' || transitionPhase === 'in-progress') && !playersReady.includes(pid)) {
        const playerAge = currentPlayer['age'] as string | undefined;
        const nextAge = playerAge === 'antiquity' ? 'exploration' : playerAge === 'exploration' ? 'modern' : null;
        const civMap = (s as any).config?.civilizations as Map<string, { age: string; id: string }> | undefined;
        if (nextAge && civMap) {
          for (const [, civ] of civMap) {
            if (civ.age === nextAge) {
              d({ type: 'TRANSITION_AGE', newCivId: civ.id });
              break;
            }
          }
        }
      }
    }

    const crises = (s as { crises?: Array<Record<string, unknown>> }).crises ?? [];
    for (const crisis of crises) {
      if (!crisis['active'] || crisis['resolvedBy'] != null || !crisis['pendingResolution']) continue;
      const crisisId = crisis['id'] as string;
      const slottedPolicies = crisis['slottedPolicies'];
      const already = slottedPolicies instanceof Map ? slottedPolicies.get(pid) ?? [] : [];
      if (already.length === 0) {
        d({ type: 'SLOT_CRISIS_POLICY', playerId: pid, crisisId, policyId: `e2e_auto_slot_${t}_${crisisId}` });
      }
    }
  });
  await page.waitForTimeout(120);
}

// Known benign React dev-mode warnings that appear in the current build but
// are unrelated to robustness (pre-existing log-panel duplicate-key issue).
// We still surface real JS page errors — those are always fatal here.
const BENIGN_CONSOLE = [
  /Encountered two children with the same key/i,
  /Warning: validateDOMNesting/i,
];

function attachErrorCollector(page: Page) {
  const errs: string[] = [];
  page.on('pageerror', (e) => errs.push(`pageerror: ${String(e)}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const text = m.text();
    if (BENIGN_CONSOLE.some((re) => re.test(text))) return;
    errs.push(`console: ${text}`);
  });
  return errs;
}

// ── Tests ────────────────────────────────────────────────────────────────────

test.describe('Runtime robustness', () => {
  test('rapid hover across canvas does not error and does not advance turn', async ({ page }) => {
    const errs = attachErrorCollector(page);
    await startGame(page);
    const box = await page.locator('canvas').first().boundingBox();
    expect(box).not.toBeNull();

    // 20 different positions spread across the canvas. Small pauses between
    // moves give React/animation loop a chance to tick.
    for (let i = 0; i < 20; i++) {
      const x = box!.x + ((box!.width * (i + 1)) / 21);
      const y = box!.y + ((box!.height * ((i * 7) % 20 + 1)) / 21);
      await page.mouse.move(x, y);
      await page.waitForTimeout(40);
    }

    const turn = await page.evaluate(() => (window as any).__gameState?.turn);
    expect(turn).toBe(1);
    expect(errs, errs.join('\n')).toHaveLength(0);
  });

  test('wheel zoom spam leaves unit selection still functional', async ({ page }) => {
    const errs = attachErrorCollector(page);
    await startGame(page);
    const box = await page.locator('canvas').first().boundingBox();
    expect(box).not.toBeNull();
    const cx = box!.x + box!.width / 2;
    const cy = box!.y + box!.height / 2;

    await page.mouse.move(cx, cy);
    // 10 zoom-in + 10 zoom-out bursts over ~2s total.
    for (let i = 0; i < 10; i++) {
      await page.mouse.wheel(0, -200);
      await page.waitForTimeout(50);
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(50);
    }

    // Re-center on a friendly warrior and click it — selection should still work.
    const warrior = await page.evaluate(() => {
      const s = (window as any).__gameState;
      if (!s) return null;
      const u = [...s.units.values()].find(
        (u: any) => u.owner === s.currentPlayerId && u.typeId === 'warrior'
      ) as any;
      return u ? { id: u.id, q: u.position.q, r: u.position.r } : null;
    });
    expect(warrior).not.toBeNull();

    await page.evaluate(
      ({ q, r }) => (window as any).__centerCameraOn(q, r),
      { q: warrior!.q, r: warrior!.r }
    );
    await page.waitForTimeout(120);
    const scr = await page.evaluate(
      ({ q, r }) => (window as any).__hexToScreen(q, r),
      { q: warrior!.q, r: warrior!.r }
    );
    expect(scr).not.toBeNull();
    await page.mouse.click(scr!.x, scr!.y, { button: 'left' });
    await page.waitForTimeout(200);

    const sel = await page.evaluate(() => (window as any).__selection);
    expect(sel?.unitId).toBe(warrior!.id);
    expect(errs, errs.join('\n')).toHaveLength(0);
  });

  test('END_TURN dispatch spam settles cleanly and advances turns', async ({ page }) => {
    test.setTimeout(60000);
    const errs = attachErrorCollector(page);
    await startGame(page);

    // Fire 20 END_TURNs back-to-back with no wait. Some will be rejected (AI
    // phase, already transitioning) — the engine/provider must stay consistent.
    await page.evaluate(() => {
      const d = (window as any).__gameDispatch;
      for (let i = 0; i < 20; i++) d({ type: 'END_TURN' });
    });

    // Engine should eventually settle at turn >= 10 (AI loop folds multiple
    // END_TURNs into advancing turns for the human player).
    await page.waitForFunction(
      () => ((window as any).__gameState?.turn ?? 0) >= 10,
      null,
      { timeout: 25000 }
    );

    const turn = await page.evaluate(() => (window as any).__gameState?.turn);
    expect(turn).toBeGreaterThanOrEqual(10);
    expect(errs, errs.join('\n')).toHaveLength(0);
  });

  test('long auto-advance session: state stays valid, human keeps units', async ({ page }) => {
    // Per-turn playwright.waitForFunction + AI processing is ~0.5–1s on this
    // map, so 20 turns fits comfortably inside the 60s per-test budget below.
    test.setTimeout(90000);
    const errs = attachErrorCollector(page);
    await startGame(page);

    const humanId = await page.evaluate(() => (window as any).__gameState?.currentPlayerId);
    expect(humanId).toBeTruthy();

    const TURNS = 20;
    for (let i = 0; i < TURNS; i++) {
      const before = await page.evaluate(() => (window as any).__gameState?.turn ?? 0);
      await dismissBlockingEvents(page);
      await dispatch(page, { type: 'END_TURN' });
      await page.waitForFunction(
        (b) => ((window as any).__gameState?.turn ?? 0) > (b as number),
        before,
        { timeout: 15000 }
      );
    }

    const final = await page.evaluate((hId) => {
      const s = (window as any).__gameState;
      const humanUnits = [...s.units.values()].filter((u: any) => u.owner === hId);
      return { turn: s.turn, humanUnitCount: humanUnits.length };
    }, humanId);

    expect(final.turn).toBe(1 + TURNS);
    expect(final.humanUnitCount).toBeGreaterThan(0);
    expect(errs, errs.join('\n')).toHaveLength(0);
  });

  test('autosave survives page reload — Resume button restores turn >= 6', async ({ page }) => {
    test.setTimeout(60000);
    const errs = attachErrorCollector(page);
    await startGame(page);

    for (let i = 0; i < 5; i++) {
      const before = await page.evaluate(() => (window as any).__gameState?.turn ?? 0);
      await dismissBlockingEvents(page);
      await dispatch(page, { type: 'END_TURN' });
      await page.waitForFunction(
        (b) => ((window as any).__gameState?.turn ?? 0) > (b as number),
        before,
        { timeout: 15000 }
      );
    }

    await page.reload();
    await page.waitForTimeout(400);

    const resume = page.getByTestId('resume-game-button');
    await expect(resume).toBeVisible({ timeout: 8000 });
    await resume.click();
    await page.waitForSelector('canvas', { timeout: 10000 });

    await page.waitForFunction(
      () => ((window as any).__gameState?.turn ?? 0) >= 6,
      null,
      { timeout: 10000 }
    );
    const turn = await page.evaluate(() => (window as any).__gameState?.turn);
    expect(turn).toBeGreaterThanOrEqual(6);
    expect(errs, errs.join('\n')).toHaveLength(0);
  });

  test('camera re-centering stress: 50 random hexes leaves camera state valid', async ({ page }) => {
    const errs = attachErrorCollector(page);
    await startGame(page);

    // Pick 50 random in-bounds hexes from the live map (so we never center on
    // a tile that doesn't exist).
    const hexes = await page.evaluate(() => {
      const s = (window as any).__gameState;
      const keys = [...s.map.tiles.keys()] as string[];
      const out: Array<{ q: number; r: number }> = [];
      // Deterministic stride — avoids Math.random noise in the spec.
      const step = Math.max(1, Math.floor(keys.length / 50));
      for (let i = 0; i < 50; i++) {
        const k = keys[(i * step) % keys.length];
        const [q, r] = k.split(',').map(Number);
        out.push({ q, r });
      }
      return out;
    });
    expect(hexes.length).toBe(50);

    for (const h of hexes) {
      await page.evaluate(({ q, r }) => (window as any).__centerCameraOn(q, r), h);
    }
    await page.waitForTimeout(120);

    const cam = await page.evaluate(() => (window as any).__cameraState());
    expect(cam).not.toBeNull();
    expect(Number.isFinite(cam.x)).toBe(true);
    expect(Number.isFinite(cam.y)).toBe(true);
    expect(Number.isFinite(cam.zoom)).toBe(true);
    expect(cam.zoom).toBeGreaterThan(0);
    expect(errs, errs.join('\n')).toHaveLength(0);
  });

  test('invalid-action resilience: alternating valid/invalid dispatches keep state serializable', async ({ page }) => {
    const errs = attachErrorCollector(page);
    await startGame(page);

    const warrior = await page.evaluate(() => {
      const s = (window as any).__gameState;
      if (!s) return null;
      const u = [...s.units.values()].find(
        (u: any) => u.owner === s.currentPlayerId && u.typeId === 'warrior'
      ) as any;
      return u ? { id: u.id } : null;
    });
    expect(warrior).not.toBeNull();

    // 50 alternating dispatches. FORTIFY_UNIT is valid once then idempotent;
    // the other is an unknown action type the engine must ignore gracefully.
    for (let i = 0; i < 50; i++) {
      if (i % 2 === 0) {
        await page.evaluate(
          (id) => (window as any).__gameDispatch({ type: 'FORTIFY_UNIT', unitId: id }),
          warrior!.id
        );
      } else {
        await page.evaluate(() =>
          (window as any).__gameDispatch({ type: '__INVALID_ACTION__', bogus: true })
        );
      }
    }
    await page.waitForTimeout(200);

    // State must remain present and serializable.
    const check = await page.evaluate(() => {
      const s = (window as any).__gameState;
      if (!s) return { ok: false, size: 0 };
      const unitObj: Record<string, any> = {};
      for (const [id, u] of s.units) unitObj[id] = u;
      const json = JSON.stringify(unitObj);
      return { ok: true, size: json.length };
    });
    expect(check.ok).toBe(true);
    expect(check.size).toBeGreaterThan(0);
    expect(errs, errs.join('\n')).toHaveLength(0);
  });
});
