import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { measureBenchmarkCell } from "./measure.js";
import { proveBenchmarkParity } from "./measure.js";
import { aggregateMatrix, validateMatrixCorrectnessEvidence, validateMatrixOutput } from "./matrix-validator.js";
import { collectMatrixSource, createMatrixManifest, executeMatrix, writeMatrixPlan } from "./matrix-runner.js";
import { createMatrixSuite } from "./matrix-suites.js";
import type { MatrixCompletedInvocation } from "./matrix-contract.js";
import type { CellWorkerResponse } from "./measure.js";
import type { VariantId } from "./report.js";

let fixtureRoot = "";
let baseOutput = "";

function rewriteHashedJson(path: string, mutate: (value: Record<string, unknown>) => void): void {
  const value = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  mutate(value);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const digest = createHash("sha256").update(content).digest("hex");
  writeFileSync(path, content);
  writeFileSync(`${path}.sha256`, `${digest}  ${basename(path)}\n`);
}

function cloneFixture(name: string): string {
  const target = join(fixtureRoot, name);
  cpSync(baseOutput, target, { recursive: true });
  return target;
}

function completedInvocation(
  response: CellWorkerResponse,
  layout: VariantId,
  processRound: number,
): MatrixCompletedInvocation {
  return {
    ...response,
    invocationId: `replay-regression/${layout}/round-${processRound}`,
    layout,
    processRound,
    orderIndex: 0,
    status: "completed",
    nodeOptions: (process.env.NODE_OPTIONS ?? "").trim(),
  };
}

beforeAll(() => {
  fixtureRoot = mkdtempSync(join(tmpdir(), "density-matrix-tests-"));
  baseOutput = join(fixtureRoot, "base");
  writeMatrixPlan({
    outputDirectory: baseOutput,
    suiteId: "smoke",
    issuedAt: "2026-08-03T00:00:00.000Z",
  });
  let pid = 900_000;
  executeMatrix({
    outputDirectory: baseOutput,
    parityRunner: (workload, operation) => proveBenchmarkParity(workload, [operation])[0]!,
    cellRunner: (request) => ({
      ...measureBenchmarkCell(request),
      pid: pid++,
      executable: process.execPath,
      execArgv: [],
    }),
  });
  aggregateMatrix(baseOutput, "2026-08-03T00:00:01.000Z");
});

afterAll(() => {
  rmSync(fixtureRoot, { recursive: true, force: true });
});

describe("density scale matrix", () => {
  it("defines the curated claim families, a true 2x2 smoke, deterministic deduplication, and gated stress presets", () => {
    const smoke = createMatrixManifest({ suiteId: "smoke", issuedAt: "2026-08-03T00:00:00.000Z" });
    expect(smoke.suite.points).toHaveLength(2);
    expect(smoke.suite.points.every((point) => point.operations.length === 2)).toBe(true);
    expect(smoke.blocks).toHaveLength(4);
    expect(smoke.blocks.every((block) => block.invocations.length === 3)).toBe(true);

    const claim = createMatrixManifest({ suiteId: "claim", issuedAt: "2026-08-03T00:00:00.000Z" });
    expect(new Set(claim.suite.points.map((point) => point.family))).toEqual(new Set([
      "state-scale",
      "slot-occupancy",
      "slot-pattern",
      "spatial-density",
      "spatial-shape",
      "churn-intensity",
      "replay-length",
    ]));
    expect(claim.suite.points.filter((point) => point.family === "state-scale").map((point) => point.factor.value)).toEqual([128, 256, 512, 1_024]);
    expect(claim.suite.points.reduce((total, point) => total + point.operations.length, 0)).toBeGreaterThan(claim.blocks.length);
    expect(createMatrixManifest({ suite: createMatrixSuite("claim"), issuedAt: claim.issuedAt }).blocks.map((block) => block.id)).toEqual(
      claim.blocks.map((block) => block.id),
    );
    expect(() => createMatrixManifest({ suiteId: "stress-quadratic" })).toThrow("explicit allowLarge=true");
  });

  it("recomputes a complete smoke aggregate from raw per-process samples and accepts an exact resume", () => {
    const aggregate = validateMatrixOutput(baseOutput)!;
    expect(aggregate.shardReferences).toHaveLength(4);
    expect(aggregate.shardReferences.every((entry) => entry.status === "completed")).toBe(true);
    expect(aggregate.summaries).toHaveLength(12);
    expect(aggregate.ratios).toHaveLength(12);
    expect(aggregate.series).toHaveLength(6);
    expect(aggregate.claimEligibility.eligible).toBe(false);
    const before = aggregate.shardReferences.map((entry) => entry.sha256);
    executeMatrix({ outputDirectory: baseOutput, cellRunner: () => { throw new Error("completed shards must not rerun"); } });
    expect(validateMatrixOutput(baseOutput)!.shardReferences.map((entry) => entry.sha256)).toEqual(before);
  });

  it("resumes only incomplete logical cells through immutable manifest-issued continuation shards", () => {
    const output = join(fixtureRoot, "continuation");
    writeMatrixPlan({ outputDirectory: output, suiteId: "smoke", issuedAt: "2026-08-03T00:00:02.000Z" });
    let firstCompleted = 0;
    executeMatrix({
      outputDirectory: output,
      parityRunner: (workload, operation) => proveBenchmarkParity(workload, [operation])[0]!,
      cellRunner: (request, context) => {
        if (request.variantId === "object") return { ...context.invocation, status: "timeout", reason: "test timeout", elapsedMs: 1 };
        firstCompleted += 1;
        return { ...measureBenchmarkCell(request), pid: 910_000 + firstCompleted, executable: process.execPath, execArgv: [] };
      },
    });
    expect(firstCompleted).toBe(8);
    let resumed = 0;
    executeMatrix({
      outputDirectory: output,
      parityRunner: () => { throw new Error("validated parity must be reused"); },
      cellRunner: (request) => {
        resumed += 1;
        return { ...measureBenchmarkCell(request), pid: 920_000 + resumed, executable: process.execPath, execArgv: [] };
      },
    });
    expect(resumed).toBe(4);
    aggregateMatrix(output, "2026-08-03T00:00:03.000Z");
    const aggregate = validateMatrixOutput(output)!;
    expect(aggregate.shardReferences).toHaveLength(8);
    expect(aggregate.summaries).toHaveLength(12);
    expect(aggregate.shardReferences.filter((entry) => entry.attemptIndex === 0).every((entry) => entry.status === "timeout")).toBe(true);
    expect(aggregate.shardReferences.filter((entry) => entry.attemptIndex === 1).every((entry) => entry.status === "completed")).toBe(true);
  });

  it("caps the auditor's 10ms total / 1000ms child counterexample and censors a crossing completion", () => {
    const output = join(fixtureRoot, "total-budget");
    const plan = writeMatrixPlan({
      outputDirectory: output,
      suiteId: "smoke",
      issuedAt: "2026-08-03T00:00:04.000Z",
      limits: { totalTimeoutMs: 10, childTimeoutMs: 1_000 },
    });
    const parity = new Map(plan.manifest.blocks.map((block) => [
      `${block.workload.id}/${block.operation}`,
      proveBenchmarkParity(block.workload, [block.operation])[0]!,
    ]));
    let virtualNow = 0;
    let childCalls = 0;
    const effectiveTimeouts: number[] = [];
    executeMatrix({
      outputDirectory: output,
      now: () => virtualNow,
      parityRunner: (workload, operation) => parity.get(`${workload.id}/${operation}`)!,
      cellRunner: (_request, context) => {
        childCalls += 1;
        effectiveTimeouts.push(context.limits.childTimeoutMs);
        virtualNow = 11;
        return {
          pid: 930_000,
          executable: process.execPath,
          execArgv: [],
          node: process.version,
          v8: process.versions.v8,
          warmupSamples: 0,
          samples: [{ sampleIndex: 0, durationNs: 1 }],
          correctness: { snapshotDigest: "a".repeat(64), canonicalSnapshotBytes: 1, evidenceDigest: null },
        };
      },
    });
    expect(childCalls).toBe(1);
    expect(effectiveTimeouts[0]).toBeLessThanOrEqual(10);
    const firstShard = JSON.parse(readFileSync(join(output, plan.manifest.blocks[0]!.shardPath), "utf8")) as {
      invocations: { status: string; samples?: unknown }[];
    };
    expect(firstShard.invocations.map((entry) => entry.status)).toEqual(["timeout", "not-run", "not-run"]);
    expect(firstShard.invocations.every((entry) => entry.samples === undefined)).toBe(true);
    aggregateMatrix(output, "2026-08-03T00:00:05.000Z");
    expect(() => validateMatrixOutput(output)).not.toThrow();
  });

  it("anchors absolute compiled CLI provenance to hex-empires when invoked from a foreign clean Git repository", () => {
    const foreignRoot = join(fixtureRoot, "foreign-repository");
    mkdirSync(foreignRoot);
    execFileSync("git", ["init", "--quiet"], { cwd: foreignRoot });
    writeFileSync(join(foreignRoot, "package-lock.json"), "{}\n");
    writeFileSync(join(foreignRoot, "foreign.txt"), "foreign repository\n");
    execFileSync("git", ["add", "."], { cwd: foreignRoot });
    execFileSync("git", ["-c", "user.name=Matrix Test", "-c", "user.email=matrix@example.invalid", "commit", "--quiet", "-m", "foreign"], { cwd: foreignRoot });
    const output = join(foreignRoot, "matrix-output");
    const cliPath = fileURLToPath(new URL("../dist/cli.js", import.meta.url));
    const child = spawnSync(process.execPath, [cliPath, "plan", "--suite", "smoke", "--output", output, "--quiet"], {
      cwd: foreignRoot,
      encoding: "utf8",
      windowsHide: true,
    });
    expect(child.status, child.stderr).toBe(0);
    const manifest = JSON.parse(readFileSync(join(output, "manifest.json"), "utf8")) as ReturnType<typeof createMatrixManifest>;
    const expectedSource = collectMatrixSource(output);
    const foreignRevision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: foreignRoot, encoding: "utf8" }).trim();
    expect(manifest.source).toEqual(expectedSource);
    expect(manifest.source.revision).not.toBe(foreignRevision);
    expect(manifest.source.lockfile.path).toBe("package-lock.json");
    expect(manifest.harness.files.every((file) => file.path.startsWith("packages/benchmark-density/dist/"))).toBe(true);
    expect(manifest.environment.executableSha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("binds NODE_OPTIONS across plan, continuation, validation, and claim admission", () => {
    const previous = process.env.NODE_OPTIONS;
    process.env.NODE_OPTIONS = "--jitless";
    try {
      expect(() => executeMatrix({ outputDirectory: baseOutput })).toThrow("resume environment mismatch");
      expect(() => validateMatrixOutput(baseOutput)).not.toThrow();
      expect(() => createMatrixManifest({ suiteId: "claim" })).toThrow("requires an empty NODE_OPTIONS");
    } finally {
      if (previous === undefined) delete process.env.NODE_OPTIONS;
      else process.env.NODE_OPTIONS = previous;
    }
  });

  it("keeps cap-512 replay-20 semantic parity while treating replay evidence as layout-local provenance", () => {
    const replayPoint = createMatrixSuite("claim").points.find((point) => point.id === "replay-length-20")!;
    const layouts = ["object", "soa", "hybrid"] as const;
    const firstRound = layouts.map((layout) => completedInvocation(measureBenchmarkCell({
      workload: replayPoint.workload,
      operation: "replay",
      variantId: layout,
      warmupSamples: 0,
      measuredSamples: 1,
    }), layout, 0));
    const parityDigest = firstRound[0]!.correctness.snapshotDigest;

    expect(new Set(firstRound.map((entry) => entry.correctness.snapshotDigest)).size).toBe(1);
    expect(new Set(firstRound.map((entry) => entry.correctness.canonicalSnapshotBytes)).size).toBe(1);
    expect(new Set(firstRound.map((entry) => entry.correctness.evidenceDigest)).size).toBe(3);
    const repeatedRounds = firstRound.flatMap((entry) => [
      entry,
      { ...entry, invocationId: `${entry.invocationId}/continuation`, processRound: 1 },
    ]);
    expect(() => validateMatrixCorrectnessEvidence("replay", parityDigest, repeatedRounds)).not.toThrow();

    expect(() => validateMatrixCorrectnessEvidence("replay", parityDigest, repeatedRounds.map((entry, index) =>
      index === 0 ? { ...entry, correctness: { ...entry.correctness, evidenceDigest: null } } : entry,
    ))).toThrow("missing evidence digest");
    expect(() => validateMatrixCorrectnessEvidence("replay", parityDigest, repeatedRounds.map((entry, index) =>
      index === 1 ? { ...entry, correctness: { ...entry.correctness, evidenceDigest: "f".repeat(64) } } : entry,
    ))).toThrow("evidence changed within layout object");
    expect(() => validateMatrixCorrectnessEvidence("replay", parityDigest, repeatedRounds.map((entry, index) =>
      index === 2 ? { ...entry, correctness: { ...entry.correctness, canonicalSnapshotBytes: entry.correctness.canonicalSnapshotBytes + 1 } } : entry,
    ))).toThrow("semantic correctness mismatch");
    expect(() => validateMatrixCorrectnessEvidence("update", parityDigest, [
      { ...firstRound[0]!, correctness: { ...firstRound[0]!.correctness, evidenceDigest: "e".repeat(64) } },
    ])).toThrow("non-replay invocation must not claim replay evidence");
  });

  it("rejects raw tampering, missing shards, mixed environments, aggregate tampering, traversal, duplicates, and unrelated content", () => {
    const rawTamper = cloneFixture("raw-tamper");
    const rawManifest = JSON.parse(readFileSync(join(rawTamper, "manifest.json"), "utf8")) as { blocks: { shardPath: string }[] };
    const rawShard = join(rawTamper, rawManifest.blocks[0]!.shardPath);
    writeFileSync(rawShard, `${readFileSync(rawShard, "utf8")} `);
    expect(() => validateMatrixOutput(rawTamper)).toThrow("artifact hash mismatch");

    const missing = cloneFixture("missing");
    const missingManifest = JSON.parse(readFileSync(join(missing, "manifest.json"), "utf8")) as { blocks: { shardPath: string }[] };
    const missingPath = join(missing, missingManifest.blocks[0]!.shardPath);
    unlinkSync(missingPath);
    unlinkSync(`${missingPath}.sha256`);
    expect(() => validateMatrixOutput(missing)).toThrow("missing matrix shard");

    const mixed = cloneFixture("mixed");
    const mixedManifest = JSON.parse(readFileSync(join(mixed, "manifest.json"), "utf8")) as { blocks: { shardPath: string }[] };
    rewriteHashedJson(join(mixed, mixedManifest.blocks[0]!.shardPath), (value) => { value.environmentDigest = "b".repeat(64); });
    expect(() => validateMatrixOutput(mixed)).toThrow("environment mismatch");

    const aggregateTamper = cloneFixture("aggregate-tamper");
    rewriteHashedJson(join(aggregateTamper, "aggregate.json"), (value) => {
      const summaries = value.summaries as { pooled: { medianNsPerOperation: number } }[];
      summaries[0]!.pooled.medianNsPerOperation += 1;
    });
    expect(() => validateMatrixOutput(aggregateTamper)).toThrow("statistics or analysis do not match raw shards");

    const traversal = cloneFixture("traversal");
    rewriteHashedJson(join(traversal, "manifest.json"), (value) => {
      const blocks = value.blocks as { shardPath: string; shardPaths: string[] }[];
      blocks[0]!.shardPath = "../escape.json";
      blocks[0]!.shardPaths[0] = "../escape.json";
    });
    expect(() => validateMatrixOutput(traversal)).toThrow("path traversal");

    const duplicate = cloneFixture("duplicate");
    rewriteHashedJson(join(duplicate, "manifest.json"), (value) => {
      const blocks = value.blocks as unknown[];
      blocks.push(blocks[0]);
    });
    expect(() => validateMatrixOutput(duplicate)).toThrow("duplicate matrix block");

    const unrelated = cloneFixture("unrelated");
    writeFileSync(join(unrelated, "notes.txt"), "not part of the matrix");
    expect(() => validateMatrixOutput(unrelated)).toThrow("unrelated content");

    const unplanned = cloneFixture("unplanned-shaped-shard");
    const unplannedManifest = JSON.parse(readFileSync(join(unplanned, "manifest.json"), "utf8")) as { blocks: { shardPath: string }[] };
    const plannedShard = join(unplanned, unplannedManifest.blocks[0]!.shardPath);
    const orphan = join(unplanned, "shards", "block-000000000000000000000000.attempt-0.json");
    cpSync(plannedShard, orphan);
    cpSync(`${plannedShard}.sha256`, `${orphan}.sha256`);
    expect(() => executeMatrix({ outputDirectory: unplanned })).toThrow("unplanned shard artifact");
    expect(() => validateMatrixOutput(unplanned)).toThrow("unplanned shard artifact");
  });
});
