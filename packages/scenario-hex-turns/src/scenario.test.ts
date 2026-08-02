import { executeReplay } from "@hex-empires/kernel";
import { describe, expect, it } from "vitest";

import { hexTurnReplayFixture, hexTurnScenario } from "./index.js";

describe("turn-based object scenario", () => {
  it("resolves same-destination moves by authoritative sequence", () => {
    const evidence = executeReplay({ scenario: hexTurnScenario, ...hexTurnReplayFixture });
    expect(evidence.snapshot).toMatchObject({
      turn: 3,
      units: [
        { id: "alpha", position: { q: 0, r: 1 } },
        { id: "bravo", position: { q: 0, r: 0 } },
      ],
      lastOutcomes: [{ sequence: 3, unitId: "bravo", result: "moved" }],
    });
  });

  it("replays to pinned canonical snapshot and evidence digests", () => {
    const first = executeReplay({ scenario: hexTurnScenario, ...hexTurnReplayFixture });
    const second = executeReplay({ scenario: hexTurnScenario, ...hexTurnReplayFixture });
    expect(second).toEqual(first);
    expect(first.snapshotDigest).toBe("f7bc238fcfe3aa12b83c275cfd7bfdb8e2e39d33ccfda037b24f90d17d8672a8");
    expect(first.evidenceDigest).toBe("d8b52cbdc45b025751101093b8865a57008df59c510f4b238928430d5567b6be");
  });
});
