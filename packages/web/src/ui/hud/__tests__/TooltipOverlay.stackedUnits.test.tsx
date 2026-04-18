// @vitest-environment jsdom

/**
 * Regression test for the "2× military instead of warrior+settler" tooltip bug.
 *
 * M32 allowed a civilian unit (settler, builder) to share a tile with a military
 * unit. The LightweightTooltip used to render the top-of-stack unit with an
 * aggregate `×N` badge counting ALL ownUnits on the tile — so a warrior+settler
 * pair displayed as "Warrior ×2", indistinguishable from a warrior stack and
 * completely hiding the settler.
 *
 * Fix: split ownUnits (and enemyUnits) into military vs civilian groups and
 * render each top entry with its own per-category count. Both names must appear
 * in the rendered DOM when a stack contains one of each class.
 *
 * Preserved across the HUD cycle (c) migration that wrapped the tooltip body
 * in `<TooltipShell>`. The API changed (camera prop → hexToScreen prop) but the
 * body rendering is identical; these assertions still apply.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import type { GameState, UnitState, HexTile } from '@hex/engine';
import { ALL_BASE_TERRAINS, createGameConfig } from '@hex/engine';
import { TooltipOverlay } from '../TooltipOverlay';
import { HUDManagerProvider } from '../HUDManager';

function coordKey(q: number, r: number): string {
  return `${q},${r}`;
}

function makeUnit(overrides: Partial<UnitState> & { id: string; typeId: string }): UnitState {
  return {
    id: overrides.id,
    typeId: overrides.typeId,
    owner: overrides.owner ?? 'p1',
    position: overrides.position ?? { q: 0, r: 0 },
    movementLeft: overrides.movementLeft ?? 2,
    health: overrides.health ?? 100,
    experience: overrides.experience ?? 0,
    promotions: overrides.promotions ?? [],
    fortified: overrides.fortified ?? false,
  };
}

function makeTile(q: number, r: number): HexTile {
  return {
    coord: { q, r },
    terrain: ALL_BASE_TERRAINS[0].id,
    feature: null,
    resource: null,
    improvement: null,
    building: null,
    river: [],
    elevation: 0.5,
    continent: 0,
  };
}

function makeStateWithStackedUnits(units: ReadonlyArray<UnitState>): GameState {
  const tiles = new Map<string, HexTile>();
  tiles.set(coordKey(0, 0), makeTile(0, 0));
  const unitMap = new Map<string, UnitState>();
  for (const u of units) unitMap.set(u.id, u);

  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([
      [
        'p1',
        {
          id: 'p1',
          name: 'Human',
          isHuman: true,
          visibility: new Set([coordKey(0, 0)]),
        },
      ],
    ]),
    map: { width: 1, height: 1, tiles, wrapX: false },
    units: unitMap,
    cities: new Map(),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
    config: createGameConfig(),
  } as unknown as GameState;
}

/** Stub projector — places the hex at a known on-screen position so the shell mounts. */
const stubHexToScreen = (_q: number, _r: number) => ({ x: 400, y: 300 });

afterEach(() => {
  cleanup();
});

describe('TooltipOverlay — civilian + military stack (M32 regression)', () => {
  it('renders BOTH warrior and settler names when they share a tile (not 2× military)', () => {
    const warrior = makeUnit({ id: 'w1', typeId: 'warrior', position: { q: 0, r: 0 } });
    const settler = makeUnit({ id: 's1', typeId: 'settler', position: { q: 0, r: 0 } });
    const state = makeStateWithStackedUnits([warrior, settler]);

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    const text = container.textContent ?? '';
    // Confirm BOTH unit names appear in the tooltip body.
    expect(text).toContain('Warrior');
    expect(text).toContain('Settler');

    // Confirm the previous "×2" bug is gone: there must not be a "Warrior ×2" or
    // "Warrior × 2" substring (single military + single civilian ⇒ no multiplier).
    expect(text).not.toMatch(/Warrior\s*×\s*2/);
    expect(text).not.toMatch(/Settler\s*×\s*2/);
  });

  it('shows per-category counts when multiple military stack with a civilian', () => {
    // Two warriors + one settler → "Warrior ×2" AND "Settler" should both appear
    // (counts are per-category, no longer the combined length of ownUnits).
    const w1 = makeUnit({ id: 'w1', typeId: 'warrior', position: { q: 0, r: 0 } });
    const w2 = makeUnit({ id: 'w2', typeId: 'warrior', position: { q: 0, r: 0 } });
    const settler = makeUnit({ id: 's1', typeId: 'settler', position: { q: 0, r: 0 } });
    const state = makeStateWithStackedUnits([w1, w2, settler]);

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    const text = container.textContent ?? '';
    expect(text).toContain('Warrior');
    expect(text).toContain('Settler');
    // Military count is 2 — must render ×2 on the military line.
    expect(text).toMatch(/Warrior[^×]*×\s*2/);
    // But the settler (only one) must NOT get a ×3 from the total ownUnits.
    expect(text).not.toMatch(/Settler\s*×\s*3/);
    expect(text).not.toMatch(/Warrior\s*×\s*3/);
  });

  it('wraps the body in TooltipShell with id="tileTooltip"', () => {
    const warrior = makeUnit({ id: 'w1', typeId: 'warrior', position: { q: 0, r: 0 } });
    const state = makeStateWithStackedUnits([warrior]);

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    // The shell applies its own data attributes — verifies cycle (c) migration.
    const shell = container.querySelector('[data-testid="tooltip-shell"]');
    expect(shell).not.toBeNull();
    expect(shell?.getAttribute('data-hud-id')).toBe('tileTooltip');
    expect(shell?.getAttribute('data-position')).toBe('floating');
    expect(shell?.getAttribute('data-tier')).toBe('compact');
  });

  // ── Stack-cycle pill (cycle d) ────────────────────────────────────────

  it('does NOT render the stack-cycle pill when only one entity sits on the tile', () => {
    const warrior = makeUnit({ id: 'w1', typeId: 'warrior', position: { q: 0, r: 0 } });
    const state = makeStateWithStackedUnits([warrior]);

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    expect(container.querySelector('[data-testid="tooltip-cycle-pill"]')).toBeNull();
  });

  it('renders the stack-cycle pill in the exact "1 / N — Tab to cycle" format when stack > 1', () => {
    // 2 warriors + 1 settler = 3 entities total → pill reads "(1 / 3 — Tab to cycle)".
    const w1 = makeUnit({ id: 'w1', typeId: 'warrior', position: { q: 0, r: 0 } });
    const w2 = makeUnit({ id: 'w2', typeId: 'warrior', position: { q: 0, r: 0 } });
    const settler = makeUnit({ id: 's1', typeId: 'settler', position: { q: 0, r: 0 } });
    const state = makeStateWithStackedUnits([w1, w2, settler]);

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    const pill = container.querySelector('[data-testid="tooltip-cycle-pill"]');
    expect(pill).not.toBeNull();
    expect(pill?.textContent).toBe('(1 / 3 — Tab to cycle)');
  });

  // ── Phase 3.3: Stack summary line ────────────────────────────────────────

  it('does NOT render stack summary when only one entity on tile', () => {
    const warrior = makeUnit({ id: 'w1', typeId: 'warrior', position: { q: 0, r: 0 } });
    const state = makeStateWithStackedUnits([warrior]);

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    expect(container.querySelector('[data-testid="tooltip-stack-summary"]')).toBeNull();
  });

  it('does NOT render stack summary when only units are on the tile (no city/improvement to summarize)', () => {
    // Stack summary line is only shown when there are multiple distinct
    // entity types — a tile with only own units has a single "category"
    // and the summary adds no information over the per-unit lines.
    const warrior = makeUnit({ id: 'w1', typeId: 'warrior', position: { q: 0, r: 0 } });
    const settler = makeUnit({ id: 's1', typeId: 'settler', position: { q: 0, r: 0 } });
    const state = makeStateWithStackedUnits([warrior, settler]);

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    // Two units, no city, no improvement → only 1 summary part → no summary line.
    expect(container.querySelector('[data-testid="tooltip-stack-summary"]')).toBeNull();
  });

  // ── Phase 3.5: Tab cycling wrap-around (modulo semantics) ──────────────────
  //
  // The HUDManager.cycleIndex increments monotonically; callers wrap via
  // `cycleIndex % stackSize`. The cycle pill renders `(displayIndex / N)`
  // where displayIndex = (cycleIndex % stackSize) + 1.
  //
  // This test verifies that re-rendering with a cycleIndex of 2 and
  // stackSize of 2 gives displayIndex = (2 % 2) + 1 = 1 (wrap-around).
  // The pill must read "(1 / 2 — Tab to cycle)" not "(3 / 2 — Tab to cycle)".

  it('cycle pill displayIndex wraps correctly — two Tab presses on a 2-entity stack wrap back to "1 / 2"', () => {
    // warrior + settler = stackSize 2 (own military + own civilian).
    // HUDManager.cycleIndex increments monotonically; displayIndex = (idx % stackSize) + 1.
    // After 2 Tabs: cycleIndex=2 → displayIndex = (2 % 2) + 1 = 1, pill reads "(1 / 2 — Tab to cycle)".
    const warrior = makeUnit({ id: 'w1', typeId: 'warrior', position: { q: 0, r: 0 } });
    const settler = makeUnit({ id: 's1', typeId: 'settler', position: { q: 0, r: 0 } });
    const state = makeStateWithStackedUnits([warrior, settler]);

    const { container } = render(
      <HUDManagerProvider>
        <TooltipOverlay
          hexToScreen={stubHexToScreen}
          hoveredHex={{ q: 0, r: 0 }}
          isAltPressed={false}
          state={state}
        />
      </HUDManagerProvider>,
    );

    // cycleIndex starts at 0 → pill shows "(1 / 2 — Tab to cycle)".
    expect(container.querySelector('[data-testid="tooltip-cycle-pill"]')?.textContent)
      .toBe('(1 / 2 — Tab to cycle)');

    // Tab once → cycleIndex=1 → displayIndex=2
    act(() => { fireEvent.keyDown(window, { key: 'Tab' }); });
    expect(container.querySelector('[data-testid="tooltip-cycle-pill"]')?.textContent)
      .toBe('(2 / 2 — Tab to cycle)');

    // Tab again → cycleIndex=2 → displayIndex = (2 % 2) + 1 = 1 (wraps)
    act(() => { fireEvent.keyDown(window, { key: 'Tab' }); });
    expect(container.querySelector('[data-testid="tooltip-cycle-pill"]')?.textContent)
      .toBe('(1 / 2 — Tab to cycle)');
  });
});
