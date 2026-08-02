import { NamedRandomStreams, executeReplay } from "@hex-empires/kernel";
import { describe, expect, it } from "vitest";

import { PARTICLE_CAPACITY, particleReplayFixture, particleScenario } from "./index.js";

describe("fixed-capacity typed-array scenario", () => {
  it("owns a dense structure-of-arrays world without kernel storage policy", () => {
    const world = particleScenario.createWorld({
      runSeed: "layout-seed",
      random: new NamedRandomStreams("layout-seed"),
    });
    expect(world.capacity).toBe(PARTICLE_CAPACITY);
    expect(world.active).toBeInstanceOf(Uint8Array);
    expect(world.x).toBeInstanceOf(Int32Array);
    expect(world.velocityY).toBeInstanceOf(Int32Array);
  });

  it("replays to pinned canonical digests and changes with the explicit seed", () => {
    const first = executeReplay({ scenario: particleScenario, ...particleReplayFixture });
    const second = executeReplay({ scenario: particleScenario, ...particleReplayFixture });
    const otherSeed = executeReplay({
      scenario: particleScenario,
      ...particleReplayFixture,
      runSeed: "particle-fixture-other-seed",
    });

    expect(second).toEqual(first);
    expect(first.snapshot.activeCount).toBe(1);
    expect(otherSeed.snapshotDigest).not.toBe(first.snapshotDigest);
    expect(first.snapshotDigest).toBe("49ea610cf7490cfda23347be59cca260a24fb7adcb602015c43f167faa34c53c");
    expect(first.evidenceDigest).toBe("b967b0abfc5e076ec0f1c3567daa4e92f94bd691009c83426973037362218a78");
  });
});
