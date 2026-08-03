import {
  hexTurnScenario,
  type HexTurnSnapshot,
  type HexTurnWorld,
  type MoveCommand,
} from "@hex-empires/scenario-hex-turns";
import { describe, expect, it } from "vitest";

import {
  ClosedTickAuthority,
  ClosedTickReplica,
  CommandSequenceMismatchError,
  FrameConflictError,
  LockstepConfigurationError,
  ProtocolMismatchError,
  RequestConflictError,
  createClientRequest,
} from "./index.js";
import { createClosedTickFrame } from "./frame.js";

const runSeed = "lockstep-test-seed/v1";
const rulesetId = "hex-turn-rules/content-sha256:test-fixture-v1";

function authority(inputLeadTicks: number): ClosedTickAuthority<HexTurnWorld, MoveCommand, HexTurnSnapshot> {
  return new ClosedTickAuthority({
    scenario: hexTurnScenario,
    runSeed,
    rulesetId,
    inputLead: { inputLeadTicks },
  });
}

function replica(inputLeadTicks = 0): ClosedTickReplica<HexTurnWorld, MoveCommand, HexTurnSnapshot> {
  return new ClosedTickReplica({
    scenario: hexTurnScenario,
    runSeed,
    rulesetId,
    inputLead: { inputLeadTicks },
  });
}

function move(unitId: string, q: number, r: number): MoveCommand {
  return { kind: "move", unitId, destination: { q, r } };
}

describe("closed-tick authority", () => {
  it("makes canonical request retries idempotent without consuming another sequence", () => {
    const source = authority(1);
    const firstRequest = createClientRequest(source.session, "client-a", "request-1", move("alpha", 0, 0));

    const first = source.accept(firstRequest);
    const retry = source.accept(firstRequest);
    const second = source.accept(
      createClientRequest(source.session, "client-a", "request-2", move("bravo", 0, 0)),
    );

    expect(retry).toBe(first);
    expect(first).toMatchObject({ tick: 1, sequence: 0 });
    expect(second).toMatchObject({ tick: 1, sequence: 1 });

    expect(() =>
      source.accept(
        createClientRequest(source.session, "client-a", "request-1", move("alpha", -1, 1)),
      ),
    ).toThrow(RequestConflictError);
  });

  it("uses the current open tick plus explicit input lead for late arrivals", () => {
    const source = authority(2);
    const early = source.accept(
      createClientRequest(source.session, "client-a", "early", move("alpha", 0, 0)),
    );
    const frame0 = source.closeNextTick();
    const later = source.accept(
      createClientRequest(source.session, "client-a", "later", move("bravo", 0, 0)),
    );
    const frame1 = source.closeNextTick();
    const frame2 = source.closeNextTick();
    const latest = source.accept(
      createClientRequest(source.session, "client-a", "latest", move("alpha", 0, 1)),
    );

    expect([early.tick, later.tick, latest.tick]).toEqual([2, 3, 5]);
    expect(frame0.commands).toEqual([]);
    expect(frame1.commands).toEqual([]);
    expect(frame2.commands.map(({ sequence }) => sequence)).toEqual([0]);
    expect(source.closedFrame(2)).toBe(frame2);
    expect(Object.isFrozen(frame2)).toBe(true);
    expect(Object.isFrozen(frame2.commands)).toBe(true);
    expect(Object.isFrozen(frame2.commands[0]?.command)).toBe(true);
  });

  it("binds caller ruleset provenance and input-lead policy into session identity", () => {
    const baseline = authority(1);
    const changedRules = new ClosedTickAuthority({
      scenario: hexTurnScenario,
      runSeed,
      rulesetId: "hex-turn-rules/content-sha256:changed",
      inputLead: { inputLeadTicks: 1 },
    });
    const changedPolicy = authority(2);
    const wrongRulesReplica = new ClosedTickReplica({
      scenario: hexTurnScenario,
      runSeed,
      rulesetId: changedRules.session.rulesetId,
      inputLead: { inputLeadTicks: 1 },
    });

    expect(changedRules.session.sessionDigest).not.toBe(baseline.session.sessionDigest);
    expect(changedPolicy.session.sessionDigest).not.toBe(baseline.session.sessionDigest);
    expect(() =>
      new ClosedTickAuthority({
        scenario: hexTurnScenario,
        runSeed,
        rulesetId: "",
        inputLead: { inputLeadTicks: 1 },
      }),
    ).toThrow(LockstepConfigurationError);
    const baselineFrame = baseline.closeNextTick();
    expect(() => replica(2).receive(baselineFrame)).toThrow(ProtocolMismatchError);
    expect(() => wrongRulesReplica.receive(baselineFrame)).toThrow(ProtocolMismatchError);
  });
});

describe("closed-tick replica", () => {
  it("advances through explicit empty frames", () => {
    const source = authority(0);
    const executor = replica();
    const frame = source.closeNextTick();

    expect(frame.commands).toEqual([]);
    expect(executor.receive(frame)).toEqual({ disposition: "advanced", advancedTicks: 1, nextTick: 1 });
    expect(executor.capture().snapshot.turn).toBe(1);
  });

  it("stalls at gaps and advances only when the prefix becomes contiguous", () => {
    const source = authority(0);
    const frame0 = source.closeNextTick();
    const frame1 = source.closeNextTick();
    const executor = replica();

    expect(executor.receive(frame1)).toEqual({ disposition: "buffered", advancedTicks: 0, nextTick: 0 });
    expect(executor.bufferedTicks).toEqual([1]);
    expect(executor.capture().snapshot.turn).toBe(0);

    expect(executor.receive(frame0)).toEqual({ disposition: "advanced", advancedTicks: 2, nextTick: 2 });
    expect(executor.bufferedTicks).toEqual([]);
    expect(executor.capture().snapshot.turn).toBe(2);
  });

  it("ignores identical duplicates and rejects a conflicting closed tick", () => {
    const source = authority(0);
    const frame0 = source.closeNextTick();
    const executor = replica();

    executor.receive(frame0);
    expect(executor.receive(frame0)).toEqual({ disposition: "duplicate", advancedTicks: 0, nextTick: 1 });

    const conflict = createClosedTickFrame(source.session, 0, [
      { tick: 0, sequence: 0, command: move("alpha", 0, 0) },
    ]);
    expect(() => executor.receive(conflict)).toThrow(FrameConflictError);
    expect(executor.terminalFailure).toBeInstanceOf(FrameConflictError);
    expect(() => executor.receive(frame0)).toThrow(FrameConflictError);
  });

  it("rejects frames from a different run session", () => {
    const other = new ClosedTickAuthority({
      scenario: hexTurnScenario,
      runSeed: "different-seed",
      rulesetId,
      inputLead: { inputLeadTicks: 0 },
    });
    expect(() => replica().receive(other.closeNextTick())).toThrow(ProtocolMismatchError);
  });

  it("requires the first global command sequence to be zero and then fails closed", () => {
    const source = authority(0);
    const missingFirst = createClosedTickFrame(source.session, 0, [
      { tick: 0, sequence: 1, command: move("alpha", 0, 0) },
    ]);
    const later = createClosedTickFrame<MoveCommand>(source.session, 1, []);
    const executor = replica();

    expect(() => executor.receive(missingFirst)).toThrow(CommandSequenceMismatchError);
    const failure = executor.terminalFailure;
    expect(failure).toBeInstanceOf(CommandSequenceMismatchError);
    expect(executor.bufferedTicks).toEqual([0]);
    try {
      executor.receive(later);
      throw new Error("expected terminal replica failure");
    } catch (cause) {
      expect(cause).toBe(failure);
    }
    expect(executor.bufferedTicks).toEqual([0]);
  });

  it("rejects an exact global sequence gap across adjacent frames", () => {
    const source = authority(0);
    const frame0 = createClosedTickFrame(source.session, 0, [
      { tick: 0, sequence: 0, command: move("alpha", 0, 0) },
    ]);
    const frame1WithGap = createClosedTickFrame(source.session, 1, [
      { tick: 1, sequence: 2, command: move("alpha", 0, 1) },
    ]);
    const executor = replica();

    expect(executor.receive(frame0)).toMatchObject({ disposition: "advanced", nextTick: 1 });
    expect(() => executor.receive(frame1WithGap)).toThrow(CommandSequenceMismatchError);
    expect(executor.terminalFailure).toMatchObject({ failedAtTick: 1 });
  });
});

describe("impairment schedule", () => {
  it("converges two isolated executors despite frame reordering and duplication", () => {
    const source = authority(2);
    source.accept(createClientRequest(source.session, "a", "1", move("alpha", 0, 0)));
    source.accept(createClientRequest(source.session, "b", "1", move("bravo", 0, 0)));
    const frame0 = source.closeNextTick();
    source.accept(createClientRequest(source.session, "a", "2", move("alpha", 0, 1)));
    const frame1 = source.closeNextTick();
    const frame2 = source.closeNextTick();
    source.accept(createClientRequest(source.session, "b", "2", move("bravo", 0, 0)));
    const frame3 = source.closeNextTick();
    const frame4 = source.closeNextTick();
    const frame5 = source.closeNextTick();

    const left = replica(2);
    const right = replica(2);
    for (const frame of [frame2, frame0, frame0, frame1, frame4, frame3, frame5]) left.receive(frame);
    for (const frame of [frame5, frame3, frame1, frame2, frame2, frame0, frame4]) right.receive(frame);

    const leftCapture = left.capture();
    const rightCapture = right.capture();
    expect(left.nextTick).toBe(6);
    expect(right.nextTick).toBe(6);
    expect(rightCapture).toEqual(leftCapture);
    expect(leftCapture.snapshot).toMatchObject({
      turn: 6,
      units: [
        { id: "alpha", position: { q: 0, r: 1 } },
        { id: "bravo", position: { q: 0, r: 0 } },
      ],
      lastOutcomes: [{ sequence: 3, unitId: "bravo", result: "moved" }],
    });
  });
});
