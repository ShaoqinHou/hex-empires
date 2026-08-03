import { describe, expect, it } from "vitest";

import {
  applyOracleChanges,
  changesForTick,
  createInitialDenseState,
  createInitialObjectState,
  DensePagedTimeline,
  denseToObject,
  StrategicObjectTimeline,
  timelineFixtures,
  type SyntheticChange,
  type SyntheticState,
  type TimelineFixture,
} from "./index.js";

describe("separate temporal storage experiments", () => {
  it("shares unchanged strategic leaves while dense history records concrete keyframes and deltas", () => {
    const fixture: TimelineFixture = {
      id: "representation",
      entityCount: 32,
      tickCount: 3,
      changesPerTick: 2,
      keyframeInterval: 4,
      pageSize: 8,
      retention: 4,
    };
    const objectTimeline = new StrategicObjectTimeline(createInitialObjectState(fixture.entityCount), fixture.retention);
    const denseTimeline = createDenseTimeline(fixture);
    const unchangedBefore = objectTimeline.seek(0).state.entities[0];
    for (let tick = 1; tick <= fixture.tickCount; tick += 1) {
      const changes = changesForTick(fixture, tick);
      objectTimeline.append(tick, changes);
      denseTimeline.append(tick, changes);
    }

    expect(objectTimeline.seek(1).state.entities[0]).toBe(unchangedBefore);
    expect(objectTimeline.accounting()).toMatchObject({ keyframeCount: 0, deltaCount: 0 });
    expect(denseTimeline.accounting()).toMatchObject({ keyframeCount: 1, deltaCount: 3 });
  });

  it.each(timelineFixtures)("seeks every retained tick exactly for $id", (fixture) => {
    const objectTimeline = new StrategicObjectTimeline(createInitialObjectState(fixture.entityCount), fixture.retention);
    const denseTimeline = createDenseTimeline(fixture);
    const oracle = buildOracle(fixture);

    for (let tick = 1; tick <= fixture.tickCount; tick += 1) {
      const changes = changesForTick(fixture, tick);
      objectTimeline.append(tick, changes);
      denseTimeline.append(tick, changes);
    }

    for (const [tick, expected] of oracle) {
      expect(objectTimeline.seek(tick).state).toEqual(expected);
      expect(denseToObject(denseTimeline.seek(tick).state)).toEqual(expected);
    }
    expect(objectTimeline.accounting()).toEqual(objectTimeline.accounting());
    expect(denseTimeline.accounting()).toEqual(denseTimeline.accounting());
  });

  it("forks object and dense histories without either branch mutating its parent", () => {
    const fixture = timelineFixtures[0];
    if (fixture === undefined) throw new Error("fixture missing");
    const objectParent = new StrategicObjectTimeline(createInitialObjectState(fixture.entityCount), 8);
    const denseParent = createDenseTimeline({ ...fixture, retention: 8 });
    const oracle = buildOracle({ ...fixture, tickCount: 3 });
    for (let tick = 1; tick <= 3; tick += 1) {
      const changes = changesForTick(fixture, tick);
      objectParent.append(tick, changes);
      denseParent.append(tick, changes);
    }

    const objectBranch = objectParent.forkAt(2);
    const denseBranch = denseParent.forkAt(2);
    const divergent: readonly SyntheticChange[] = [{ entityIndex: 0, influence: 7, supply: 11 }];
    objectBranch.append(3, divergent);
    denseBranch.append(3, divergent);

    expect(objectParent.seek(3).state).toEqual(oracle.get(3));
    expect(denseToObject(denseParent.seek(3).state)).toEqual(oracle.get(3));
    expect(objectBranch.seek(3).state).not.toEqual(objectParent.seek(3).state);
    expect(denseToObject(denseBranch.seek(3).state)).not.toEqual(denseToObject(denseParent.seek(3).state));
    expect(objectParent.retainedRange()).toEqual({ earliestTick: 0, latestTick: 3 });
    expect(denseParent.retainedRange()).toEqual({ earliestTick: 0, latestTick: 3 });
  });

  it("evicts to a strict bound while promoting a dense reconstruction anchor", () => {
    const fixture: TimelineFixture = {
      id: "eviction",
      entityCount: 32,
      tickCount: 6,
      changesPerTick: 3,
      keyframeInterval: 8,
      pageSize: 8,
      retention: 3,
    };
    const objectTimeline = new StrategicObjectTimeline(createInitialObjectState(fixture.entityCount), fixture.retention);
    const denseTimeline = createDenseTimeline(fixture);
    const oracle = buildOracle(fixture);
    for (let tick = 1; tick <= fixture.tickCount; tick += 1) {
      const changes = changesForTick(fixture, tick);
      objectTimeline.append(tick, changes);
      denseTimeline.append(tick, changes);
    }

    expect(objectTimeline.retainedRange()).toEqual({ earliestTick: 4, latestTick: 6 });
    expect(denseTimeline.retainedRange()).toEqual({ earliestTick: 4, latestTick: 6 });
    expect(() => objectTimeline.seek(3)).toThrow("outside retained range 4..6");
    expect(() => denseTimeline.seek(3)).toThrow("outside retained range 4..6");
    for (let tick = 4; tick <= 6; tick += 1) {
      expect(objectTimeline.seek(tick).state).toEqual(oracle.get(tick));
      expect(denseToObject(denseTimeline.seek(tick).state)).toEqual(oracle.get(tick));
    }
    expect(denseTimeline.seek(4).reconstructionSteps).toEqual({
      keyframeTick: 4,
      recordsRead: 1,
      deltaRecordsApplied: 0,
      dirtyPagesApplied: 0,
    });
    expect(objectTimeline.accounting().retainedVersions).toBe(3);
    expect(denseTimeline.accounting().retainedVersions).toBe(3);
  });

  it("reports reconstruction work from the nearest dense keyframe", () => {
    const fixture: TimelineFixture = {
      id: "steps",
      entityCount: 32,
      tickCount: 3,
      changesPerTick: 2,
      keyframeInterval: 4,
      pageSize: 8,
      retention: 4,
    };
    const timeline = createDenseTimeline(fixture);
    for (let tick = 1; tick <= 3; tick += 1) timeline.append(tick, changesForTick(fixture, tick));
    const steps = timeline.seek(3).reconstructionSteps;
    expect(steps.keyframeTick).toBe(0);
    expect(steps.recordsRead).toBe(4);
    expect(steps.deltaRecordsApplied).toBe(3);
    expect(steps.dirtyPagesApplied).toBeGreaterThanOrEqual(3);
  });

  it("shows that full-page change density erases delta storage benefit", () => {
    const fixture = timelineFixtures.find((candidate) => candidate.id === "n32-dense-k8");
    if (fixture === undefined) throw new Error("dense fixture missing");
    const withDeltas = runDense(fixture);
    const everyTickKeyframed = runDense({ ...fixture, keyframeInterval: 1 });
    expect(withDeltas.accounting().payloadBytes).toBe(everyTickKeyframed.accounting().payloadBytes);
    expect(withDeltas.accounting().metadataBytes).toBeGreaterThan(everyTickKeyframed.accounting().metadataBytes);
    expect(withDeltas.accounting().totalBytes).toBeGreaterThan(everyTickKeyframed.accounting().totalBytes);
  });

  it("retains a logical-byte advantage for the sparse dirty-page fixture", () => {
    const fixture = timelineFixtures.find((candidate) => candidate.id === "n128-sparse-k4");
    if (fixture === undefined) throw new Error("sparse fixture missing");
    const withDeltas = runDense(fixture);
    const everyTickKeyframed = runDense({ ...fixture, keyframeInterval: 1 });
    expect(withDeltas.accounting().totalBytes).toBeLessThan(everyTickKeyframed.accounting().totalBytes);
  });

  it("rejects incompatible state, malformed changes, and noncontiguous history", () => {
    expect(() => new StrategicObjectTimeline({ tick: 0, entities: [{ id: 1, influence: 0, supply: 0 }] }, 2))
      .toThrow("IDs must equal");
    expect(() => new DensePagedTimeline(
      { tick: 0, influence: new Uint32Array(2), supply: new Uint32Array(1) },
      { retention: 2, keyframeInterval: 2, pageSize: 1 },
    )).toThrow("equal lengths");
    expect(() => new DensePagedTimeline(createInitialDenseState(2), { retention: 0, keyframeInterval: 2, pageSize: 1 }))
      .toThrow("retention must be");

    const objectTimeline = new StrategicObjectTimeline(createInitialObjectState(2), 2);
    const denseTimeline = new DensePagedTimeline(createInitialDenseState(2), { retention: 2, keyframeInterval: 2, pageSize: 1 });
    const unordered = [
      { entityIndex: 1, influence: 1, supply: 1 },
      { entityIndex: 0, influence: 2, supply: 2 },
    ] as const;
    expect(() => objectTimeline.append(1, unordered)).toThrow("ascending order");
    expect(() => denseTimeline.append(1, unordered)).toThrow("ascending order");
    expect(() => objectTimeline.append(2, [])).toThrow("not contiguous");
    expect(() => denseTimeline.append(2, [])).toThrow("not contiguous");
    expect(() => denseTimeline.append(1, [{ entityIndex: 2, influence: 1, supply: 1 }])).toThrow("outside entity count");
  });

  it("accepts the last safe object tick, then rejects duplicate and unsafe successors", () => {
    const penultimateTick = Number.MAX_SAFE_INTEGER - 1;
    const timeline = new StrategicObjectTimeline(createInitialObjectState(1, penultimateTick), 2);
    const change = [{ entityIndex: 0, influence: 1, supply: 2 }] as const;

    timeline.append(Number.MAX_SAFE_INTEGER, change);
    expect(timeline.seek(Number.MAX_SAFE_INTEGER).state.tick).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => timeline.append(Number.MAX_SAFE_INTEGER, change)).toThrow("cannot append after Number.MAX_SAFE_INTEGER");
    expect(() => timeline.append(Number.MAX_SAFE_INTEGER + 1, change)).toThrow("tick must be a non-negative safe integer");
    expect(timeline.retainedRange().latestTick).toBe(Number.MAX_SAFE_INTEGER);

    const alreadyMaxed = new StrategicObjectTimeline(createInitialObjectState(1, Number.MAX_SAFE_INTEGER), 1);
    expect(() => alreadyMaxed.append(0, change)).toThrow("cannot append after Number.MAX_SAFE_INTEGER");
  });

  it("accepts the last safe dense tick, then rejects duplicate and unsafe successors", () => {
    const penultimateTick = Number.MAX_SAFE_INTEGER - 1;
    const options = { retention: 2, keyframeInterval: 2, pageSize: 1 } as const;
    const timeline = new DensePagedTimeline(createInitialDenseState(1, penultimateTick), options);
    const change = [{ entityIndex: 0, influence: 1, supply: 2 }] as const;

    timeline.append(Number.MAX_SAFE_INTEGER, change);
    expect(timeline.seek(Number.MAX_SAFE_INTEGER).state.tick).toBe(Number.MAX_SAFE_INTEGER);
    expect(() => timeline.append(Number.MAX_SAFE_INTEGER, change)).toThrow("cannot append after Number.MAX_SAFE_INTEGER");
    expect(() => timeline.append(Number.MAX_SAFE_INTEGER + 1, change)).toThrow("tick must be a non-negative safe integer");
    expect(timeline.retainedRange().latestTick).toBe(Number.MAX_SAFE_INTEGER);

    const alreadyMaxed = new DensePagedTimeline(createInitialDenseState(1, Number.MAX_SAFE_INTEGER), options);
    expect(() => alreadyMaxed.append(0, change)).toThrow("cannot append after Number.MAX_SAFE_INTEGER");
  });

  it("generates unique canonical changes at the supported safe-integer maximum", () => {
    const maximumFixture: TimelineFixture = {
      id: "safe-integer-maximum",
      entityCount: Number.MAX_SAFE_INTEGER,
      tickCount: Number.MAX_SAFE_INTEGER,
      changesPerTick: 64,
      keyframeInterval: Number.MAX_SAFE_INTEGER,
      pageSize: Number.MAX_SAFE_INTEGER,
      retention: 1,
    };
    const changes = changesForTick(maximumFixture, Number.MAX_SAFE_INTEGER);
    const indices = changes.map((change) => change.entityIndex);

    expect(indices).toHaveLength(maximumFixture.changesPerTick);
    expect(new Set(indices).size).toBe(maximumFixture.changesPerTick);
    expect(indices.every((index) => Number.isSafeInteger(index) && index >= 0 && index < maximumFixture.entityCount)).toBe(true);
    expect(indices).toEqual([...indices].sort((left, right) => left - right));
  });
});

function createDenseTimeline(fixture: TimelineFixture): DensePagedTimeline {
  return new DensePagedTimeline(createInitialDenseState(fixture.entityCount), {
    retention: fixture.retention,
    keyframeInterval: fixture.keyframeInterval,
    pageSize: fixture.pageSize,
  });
}

function buildOracle(fixture: TimelineFixture): ReadonlyMap<number, SyntheticState> {
  const states = new Map<number, SyntheticState>();
  let state = createInitialObjectState(fixture.entityCount);
  states.set(0, state);
  for (let tick = 1; tick <= fixture.tickCount; tick += 1) {
    state = applyOracleChanges(state, tick, changesForTick(fixture, tick));
    states.set(tick, state);
  }
  return states;
}

function runDense(fixture: TimelineFixture): DensePagedTimeline {
  const timeline = createDenseTimeline(fixture);
  for (let tick = 1; tick <= fixture.tickCount; tick += 1) timeline.append(tick, changesForTick(fixture, tick));
  return timeline;
}
