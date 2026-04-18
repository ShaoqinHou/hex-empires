// @vitest-environment jsdom

/**
 * ResourceTooltip — smoke tests.
 *
 * Verifies:
 *   - No render when hoveredHex is null.
 *   - No render when the tile has no resource.
 *   - Resource name, type badge, and yields render for a tile with a resource.
 *   - Happiness bonus renders for luxury resources.
 *   - "Unlocked" status when the player has the required tech.
 *   - "Locked — requires <tech>" status when the player does not have the tech.
 *   - "Always available" for bonus resources whose improvement needs no tech.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import type { GameState, HexTile, PlayerState } from '@hex/engine';
import { createGameConfig } from '@hex/engine';
import { ResourceTooltip } from '../ResourceTooltip';
import { HUDManagerProvider } from '../HUDManager';

// ── Fixtures ──

function coordKey(q: number, r: number): string {
  return `${q},${r}`;
}

function makeTile(q: number, r: number, overrides: Partial<HexTile> = {}): HexTile {
  return {
    coord: { q, r },
    terrain: 'grassland',
    feature: null,
    resource: null,
    improvement: null,
    building: null,
    river: [],
    elevation: 0.5,
    continent: 0,
    ...overrides,
  } as HexTile;
}

function makePlayer(researchedTechs: ReadonlyArray<string> = []): PlayerState {
  return {
    id: 'p1',
    name: 'Human',
    isHuman: true,
    civilizationId: 'rome',
    leaderId: 'augustus',
    age: 'antiquity',
    researchedTechs,
    currentResearch: null,
    researchProgress: 0,
    researchedCivics: [],
    currentCivic: null,
    civicProgress: 0,
    gold: 0,
    science: 0,
    culture: 0,
    faith: 0,
    influence: 0,
    ageProgress: 0,
    legacyBonuses: [],
    legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
    legacyPoints: 0,
    totalGoldEarned: 0,
    totalKills: 0,
    visibility: new Set([coordKey(0, 0)]),
    explored: new Set([coordKey(0, 0)]),
    celebrationCount: 0,
    celebrationBonus: 0,
    celebrationTurnsLeft: 0,
    masteredTechs: [],
    currentMastery: null,
    masteryProgress: 0,
    masteredCivics: [],
    currentCivicMastery: null,
    civicMasteryProgress: 0,
    governors: [],
  } as unknown as PlayerState;
}

function makeState(
  tiles: ReadonlyMap<string, HexTile>,
  researchedTechs: ReadonlyArray<string> = [],
): GameState {
  return {
    turn: 1,
    currentPlayerId: 'p1',
    phase: 'actions',
    players: new Map([['p1', makePlayer(researchedTechs)]]),
    map: { width: 10, height: 10, tiles, wrapX: false },
    units: new Map(),
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

const stubHexToScreen = (_q: number, _r: number) => ({ x: 400, y: 300 });

function renderWithHUD(ui: React.ReactNode) {
  return render(<HUDManagerProvider>{ui}</HUDManagerProvider>);
}

afterEach(() => {
  cleanup();
});

// ── Tests ──

describe('ResourceTooltip', () => {
  it('renders nothing when hoveredHex is null', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'iron' })]]);
    const state = makeState(tiles, ['mining']);

    const { container } = renderWithHUD(
      <ResourceTooltip hexToScreen={stubHexToScreen} hoveredHex={null} state={state} />,
    );

    expect(container.querySelector('[data-hud-id="resourceTooltip"]')).toBeNull();
    expect(container.querySelector('[data-testid="resource-tooltip-body"]')).toBeNull();
  });

  it('renders nothing when the hovered tile has no resource', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0)]]);
    const state = makeState(tiles);

    const { container } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    expect(container.querySelector('[data-testid="resource-tooltip-body"]')).toBeNull();
  });

  it('renders resource name for a tile with iron', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'iron' })]]);
    const state = makeState(tiles, ['mining']);

    const { getByTestId } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    expect(getByTestId('resource-tooltip-name').textContent).toContain('Iron');
  });

  it('renders the resource type badge', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'iron' })]]);
    const state = makeState(tiles, ['mining']);

    const { getByTestId } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    expect(getByTestId('resource-tooltip-type').textContent?.toLowerCase()).toContain('strategic');
  });

  it('renders yield contributions for iron (production +1)', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'iron' })]]);
    const state = makeState(tiles, ['mining']);

    const { getByTestId } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    // Iron gives +1 production
    const yieldsEl = getByTestId('resource-tooltip-yields');
    expect(yieldsEl.textContent).toContain('+1');
  });

  it('shows "Unlocked" when the player has the required tech (mining for iron)', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'iron' })]]);
    const state = makeState(tiles, ['mining']);

    const { getByTestId } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    expect(getByTestId('resource-tooltip-unlock').textContent).toContain('Unlocked');
  });

  it('shows "Locked — requires Mining" when the player lacks the mining tech', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'iron' })]]);
    // Player has NOT researched mining
    const state = makeState(tiles, []);

    const { getByTestId } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    const unlockText = getByTestId('resource-tooltip-unlock').textContent ?? '';
    expect(unlockText.toLowerCase()).toContain('locked');
    expect(unlockText.toLowerCase()).toContain('mining');
  });

  it('shows "Locked — requires Animal Husbandry" for horses without the tech', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'horses' })]]);
    const state = makeState(tiles, []);

    const { getByTestId } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    const unlockText = getByTestId('resource-tooltip-unlock').textContent ?? '';
    expect(unlockText.toLowerCase()).toContain('locked');
    expect(unlockText.toLowerCase()).toContain('animal husbandry');
  });

  it('shows "Always available" for wheat (bonus resource, no required tech)', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'wheat' })]]);
    const state = makeState(tiles, []);

    const { getByTestId } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    const unlockText = getByTestId('resource-tooltip-unlock').textContent ?? '';
    expect(unlockText.toLowerCase()).toContain('always available');
  });

  it('renders the luxury type badge for silk', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'silk' })]]);
    const state = makeState(tiles, []);

    const { getByTestId } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    expect(getByTestId('resource-tooltip-type').textContent?.toLowerCase()).toContain('luxury');
  });

  it('renders happiness bonus for gems (luxury with +2 happiness)', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'gems' })]]);
    const state = makeState(tiles, []);

    const { getByTestId } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    const happinessEl = getByTestId('resource-tooltip-happiness');
    expect(happinessEl.textContent).toContain('+2');
    expect(happinessEl.textContent?.toLowerCase()).toContain('happiness');
  });

  it('does not render happiness element for bonus resources (wheat has 0 happiness)', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'wheat' })]]);
    const state = makeState(tiles, []);

    const { container } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={stubHexToScreen}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    expect(container.querySelector('[data-testid="resource-tooltip-happiness"]')).toBeNull();
  });

  it('renders nothing when hexToScreen returns null (tile off-camera)', () => {
    const tiles = new Map([[coordKey(0, 0), makeTile(0, 0, { resource: 'iron' })]]);
    const state = makeState(tiles, ['mining']);

    const { container } = renderWithHUD(
      <ResourceTooltip
        hexToScreen={() => null}
        hoveredHex={{ q: 0, r: 0 }}
        state={state}
      />,
    );

    // TooltipShell renders a zero-size placeholder when the projector returns
    // null — verify the body itself does not render.
    expect(container.querySelector('[data-testid="resource-tooltip-body"]')).toBeNull();
  });
});
