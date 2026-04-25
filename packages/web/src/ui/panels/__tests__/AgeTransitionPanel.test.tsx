// @vitest-environment jsdom

/**
 * AgeTransitionPanel — tests for F-04 pick-2 legacy bonus UI.
 *
 * Covers:
 * - Panel shows pending legacy bonuses when player.pendingLegacyBonuses has entries.
 * - Selecting 2 bonuses and clicking confirm dispatches CHOOSE_LEGACY_BONUSES.
 */

import { describe, it, expect, afterEach, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/react";
import type { GameState } from "@hex/engine";

const mockRef: { state: GameState | null; dispatch: ReturnType<typeof vi.fn> } = {
  state: null,
  dispatch: vi.fn(),
};

vi.mock("../../../providers/GameProvider", () => ({
  useGameState: () => {
    if (mockRef.state === null) {
      throw new Error("AgeTransitionPanel.test: mock state not set");
    }
    return { state: mockRef.state, dispatch: mockRef.dispatch };
  },
}));

vi.mock("../../../hooks/useViewportClass", () => ({
  useViewportClass: () => "standard",
}));

vi.mock("../../../hooks/useReducedMotion", () => ({
  useReducedMotion: () => false,
}));

import { AgeTransitionPanel } from "../AgeTransitionPanel";

function makePlayer(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    name: "Player 1",
    isHuman: true,
    civilizationId: "rome",
    leaderId: "augustus",
    age: "antiquity",
    researchedTechs: [],
    currentResearch: null,
    researchProgress: 0,
    researchedCivics: [],
    currentCivic: null,
    civicProgress: 0,
    gold: 100,
    science: 0,
    culture: 0,
    faith: 0,
    influence: 0,
    ageProgress: 50,
    legacyBonuses: [],
    legacyPaths: { military: 0, economic: 0, science: 0, culture: 0 },
    legacyPoints: 0,
    totalGoldEarned: 0,
    totalKills: 0,
    visibility: new Set(),
    explored: new Set(),
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
    ...overrides,
  };
}

function makeStateWithPendingBonuses(bonusCount = 4): GameState {
  const pending = Array.from({ length: bonusCount }, (_, i) => ({
    bonusId: `bonus_${i}`,
    axis: ["military", "economic", "science", "culture"][i % 4],
    description: `Bonus description ${i}`,
    effect: { type: "MODIFY_YIELD" as const, target: "empire" as const, yield: "gold" as const, value: i + 1 },
  }));

  return {
    turn: 10,
    currentPlayerId: "p1",
    phase: "actions",
    players: new Map([["p1", makePlayer({ ageProgress: 50, pendingLegacyBonuses: pending })]]),
    map: { width: 1, height: 1, tiles: new Map(), wrapX: false },
    units: new Map(),
    cities: new Map(),
    districts: new Map(),
    governors: new Map(),
    tradeRoutes: new Map(),
    builtWonders: [],
    crises: [],
    log: [],
    age: {
      currentAge: "antiquity",
      ageThresholds: { exploration: 50, modern: 100 },
    },
    config: {
      civilizations: new Map(),
    } as unknown as GameState["config"],
    diplomacy: { relations: new Map() },
    victory: { winner: null, winType: null, progress: new Map() },
    rng: { seed: 1, counter: 0 },
    independentPowers: new Map(),
  } as unknown as GameState;
}

afterEach(() => {
  cleanup();
  mockRef.state = null;
  mockRef.dispatch = vi.fn();
});

describe("AgeTransitionPanel — F-04 pick-2 legacy bonus UI", () => {
  it("shows all 4 pending legacy bonuses when player.pendingLegacyBonuses has entries", () => {
    mockRef.state = makeStateWithPendingBonuses(4);
    const { getAllByText } = render(<AgeTransitionPanel onResolve={() => {}} />);
    // Each bonus has a description like "Bonus description N"
    const bonusDescriptions = Array.from({ length: 4 }, (_, i) => `Bonus description ${i}`);
    bonusDescriptions.forEach(desc => {
      expect(getAllByText(desc).length).toBeGreaterThanOrEqual(1);
    });
  });

  it("selecting 2 bonuses and clicking confirm dispatches CHOOSE_LEGACY_BONUSES", () => {
    mockRef.state = makeStateWithPendingBonuses(4);
    const dispatch = vi.fn();
    mockRef.dispatch = dispatch;

    const { getByText, getByTestId } = render(<AgeTransitionPanel onResolve={() => {}} />);

    // Select first two bonuses
    fireEvent.click(getByText("Bonus description 0"));
    fireEvent.click(getByText("Bonus description 1"));

    // Confirm button should now say "Confirm Legacy Bonuses"
    const confirmBtn = getByTestId("confirm-legacy-bonuses");
    expect(confirmBtn.textContent).toContain("Confirm");

    fireEvent.click(confirmBtn);

    expect(dispatch).toHaveBeenCalledWith({
      type: "CHOOSE_LEGACY_BONUSES",
      picks: ["bonus_0", "bonus_1"],
    });
  });
});
