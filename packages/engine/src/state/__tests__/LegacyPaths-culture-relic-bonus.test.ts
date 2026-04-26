import { describe, it, expect } from 'vitest';
import { scoreLegacyPaths } from '../../state/LegacyPaths';
import { createTestState, createTestPlayer } from '../../systems/__tests__/helpers';

// ======================================================================
// LegacyPaths -- exploration culture tiers (KK2 / F-09)
//
// LegacyPaths checks relicsDisplayedCount first (if defined), then falls
// back to relics.length, then to culture proxy.
// Tiers: tier 1 >= 4, tier 2 >= 8, tier 3 >= 12.
// ======================================================================

// Player with relics but no relicsDisplayedCount (forces relics.length fallback).
function stateWithRelics(relicIds: ReadonlyArray<string>) {
  return createTestState({
    players: new Map([
      // Do NOT set relicsDisplayedCount -- leave undefined so relics.length path fires.
      ["p1", createTestPlayer({ id: "p1", relics: relicIds })],
    ]),
  });
}

// Player with relicsDisplayedCount set (primary path).
function stateWithDisplayedRelics(count: number) {
  return createTestState({
    players: new Map([
      ["p1", createTestPlayer({ id: "p1", relicsDisplayedCount: count })],
    ]),
  });
}

describe("LegacyPaths -- exploration culture tiers (relic count)", () => {
  it("player with 0 relics has exploration culture tier 0", () => {
    const state = stateWithRelics([]);
    const paths = scoreLegacyPaths("p1", state);
    const ec = paths.find((p) => p.axis === "culture" && p.age === "exploration");
    expect(ec).toBeDefined();
    expect(ec!.tiersCompleted).toBe(0);
  });

  it("player with 3 relics has exploration culture tier 0 (below threshold 4)", () => {
    const state = stateWithRelics(["r1", "r2", "r3"]);
    const paths = scoreLegacyPaths("p1", state);
    const ec = paths.find((p) => p.axis === "culture" && p.age === "exploration");
    expect(ec!.tiersCompleted).toBe(0);
  });

  it("player with 4 relics has exploration culture tier 1 (relics.length fallback)", () => {
    const state = stateWithRelics(["r1", "r2", "r3", "r4"]);
    const paths = scoreLegacyPaths("p1", state);
    const ec = paths.find((p) => p.axis === "culture" && p.age === "exploration");
    expect(ec!.tiersCompleted).toBe(1);
  });

  it("player with 5 relics has exploration culture tier 1 (between thresholds 4 and 8)", () => {
    const state = stateWithRelics(["r1", "r2", "r3", "r4", "r5"]);
    const paths = scoreLegacyPaths("p1", state);
    const ec = paths.find((p) => p.axis === "culture" && p.age === "exploration");
    expect(ec!.tiersCompleted).toBe(1);
  });

  it("player with relicsDisplayedCount=8 has exploration culture tier 2 (primary path)", () => {
    const state = stateWithDisplayedRelics(8);
    const paths = scoreLegacyPaths("p1", state);
    const ec = paths.find((p) => p.axis === "culture" && p.age === "exploration");
    expect(ec!.tiersCompleted).toBe(2);
  });
});
