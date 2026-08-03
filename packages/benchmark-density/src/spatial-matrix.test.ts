import { createHash } from "node:crypto";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";

import { canonicalDigest } from "@hex-empires/kernel";
import { describe, expect, it } from "vitest";

import {
  MATRIX_BRUTE_NEIGHBOR_ALGORITHM,
  MATRIX_GRID_NEIGHBOR_ALGORITHM,
  getMatrixAlgorithmSpec,
} from "./matrix-algorithms.js";
import type { MatrixGrowthSeries } from "./matrix-contract.js";
import { createMatrixManifest, executeMatrix, writeMatrixPlan } from "./matrix-runner.js";
import { createMatrixSuite } from "./matrix-suites.js";
import { aggregateMatrix, assessMatrixGrowthSeries, enforceMatrixOutput, validateMatrixOutput } from "./matrix-validator.js";
import {
  assertNeighborDiagnosticsParity,
  measureBenchmarkCell,
  proveNeighborAlgorithmParity,
} from "./measure.js";

function growthSeries(
  metric: MatrixGrowthSeries["metric"],
  expectedExponent: 1 | 2,
  values: readonly number[],
  spread = 0.1,
): MatrixGrowthSeries {
  const xValues = [1, 4, 16, 64, 256];
  const pointIds = xValues.map((value) => `n-${value}`);
  const fullFit = {
    slope: Math.log(values.at(-1)! / values[0]!) / Math.log(256),
    rSquared: 1,
    pointCount: 5,
  };
  return {
    family: "fixture",
    operation: "neighbor-pairs",
    algorithmId: MATRIX_GRID_NEIGHBOR_ALGORITHM,
    semanticScopeId: "fixture-scope",
    layout: "object",
    metric,
    expectedExponent,
    pointIds,
    xValues,
    values,
    logLogOls: fullFit,
    assessmentPointIds: metric === "timing" ? pointIds : pointIds.slice(-3),
    assessmentLogLogOls: metric === "timing" ? fullFit : {
      slope: Math.log(values.at(-1)! / values.at(-3)!) / Math.log(16),
      rSquared: 1,
      pointCount: 3,
    },
    ...(metric === "timing" ? { maximumRoundRelativeSpread: spread } : {}),
  };
}

function rewriteHashedJson(path: string, mutate: (value: Record<string, unknown>) => void): void {
  const value = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
  mutate(value);
  const content = `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(path, content);
  writeFileSync(`${path}.sha256`, `${createHash("sha256").update(content).digest("hex")}  ${basename(path)}\n`);
}

describe("spatial-index matrix contract", () => {
  it("pins five geometric points in both families and dispatches both algorithms through every layout", () => {
    const suite = createMatrixSuite("spatial-index");
    expect(suite.points.filter((point) => point.family === "spatial-fixed-density")).toHaveLength(5);
    expect(suite.points.filter((point) => point.family === "spatial-coincident")).toHaveLength(5);
    expect(suite.points.every((point) => point.operations.map((entry) => entry.algorithmId).join() ===
      [MATRIX_BRUTE_NEIGHBOR_ALGORITHM, MATRIX_GRID_NEIGHBOR_ALGORITHM].join())).toBe(true);

    const manifest = createMatrixManifest({ suite, issuedAt: "2026-08-03T00:00:00.000Z" });
    expect(manifest.executionContract).toBe("algorithm-dispatch/v2");
    expect(manifest.blocks).toHaveLength(20);
    expect(manifest.blocks.every((block) => block.invocations.length === 9)).toBe(true);
    expect(manifest.blocks.every((block) => block.semanticScopeId === manifest.blocks[0]!.semanticScopeId)).toBe(true);
  });

  it("times reusable-grid clearing plus CSR rebuild/query while keeping allocation in setup", () => {
    const scope = getMatrixAlgorithmSpec("neighbor-pairs", MATRIX_GRID_NEIGHBOR_ALGORITHM).scope;
    expect(scope.setupPhases).toContain("one-time-uniform-grid-scratch-allocation");
    expect(scope.timedPhases).toContain("deterministic-reusable-grid-buffer-clear");
    expect(scope.timedPhases).toContain("uniform-grid-csr-count-prefix-fill-rebuild");
  });

  it("executes the selected implementation and records deterministic diagnostics", () => {
    const workload = createMatrixSuite("spatial-index").points[0]!.workload;
    const brute = measureBenchmarkCell({
      workload,
      operation: "neighbor-pairs",
      algorithmId: MATRIX_BRUTE_NEIGHBOR_ALGORITHM,
      variantId: "object",
      warmupSamples: 0,
      measuredSamples: 2,
    });
    const grid = measureBenchmarkCell({
      workload,
      operation: "neighbor-pairs",
      algorithmId: MATRIX_GRID_NEIGHBOR_ALGORITHM,
      variantId: "object",
      warmupSamples: 0,
      measuredSamples: 2,
    });
    expect(brute.diagnostics?.algorithm).toBe("brute-force");
    expect(grid.diagnostics?.algorithm).toBe("uniform-grid");
    assertNeighborDiagnosticsParity(brute.diagnostics!, grid.diagnostics!);
    expect(() => measureBenchmarkCell({
      workload,
      operation: "update",
      algorithmId: MATRIX_GRID_NEIGHBOR_ALGORITHM,
      variantId: "object",
      warmupSamples: 0,
      measuredSamples: 1,
    })).toThrow("incompatible");
  });

  it("proves grid fingerprints against brute and rejects an injected faulty fingerprint", () => {
    const workload = createMatrixSuite("spatial-index").points[0]!.workload;
    const proof = proveNeighborAlgorithmParity(workload, MATRIX_GRID_NEIGHBOR_ALGORITHM);
    expect(proof.diagnostics.activeCount).toBe(workload.initialActive);
    const brute = measureBenchmarkCell({
      workload,
      operation: "neighbor-pairs",
      algorithmId: MATRIX_BRUTE_NEIGHBOR_ALGORITHM,
      variantId: "soa",
      warmupSamples: 0,
      measuredSamples: 1,
    }).diagnostics!;
    expect(() => assertNeighborDiagnosticsParity(brute, {
      ...brute,
      algorithm: "uniform-grid",
      pairFingerprintXor: (brute.pairFingerprintXor ^ 1) >>> 0,
    }, "faulty-grid")).toThrow("pairFingerprintXor");
  });

  it("makes structural mismatches auditable while leaving low-quality timing inconclusive", () => {
    const linear = [10, 40, 160, 640, 2_560];
    const quadratic = [10, 160, 2_560, 40_960, 655_360];
    const assessments = assessMatrixGrowthSeries([
      growthSeries("structural-total", 1, linear),
      growthSeries("structural-total", 1, quadratic),
      {
        ...growthSeries("timing", 1, quadratic, 0.9),
        logLogOls: { slope: 2, rSquared: 0.4, pointCount: 5 },
        assessmentLogLogOls: { slope: 2, rSquared: 0.4, pointCount: 5 },
      },
    ]);
    expect(assessments.map((entry) => entry.status)).toEqual(["consistent", "audit-required", "inconclusive"]);
  });

  it("keeps the full structural fit while assessing the dominant tail above fixed grid overhead", () => {
    const pointIds = [32, 128, 512, 2_048, 8_192].map((value) => `n-${value}`);
    const series: MatrixGrowthSeries = {
      family: "spatial-coincident",
      operation: "neighbor-pairs",
      algorithmId: MATRIX_GRID_NEIGHBOR_ALGORITHM,
      semanticScopeId: "fixture-scope",
      layout: "soa",
      metric: "structural-total",
      expectedExponent: 2,
      pointIds,
      xValues: [32, 128, 512, 2_048, 8_192],
      values: [5_427, 30_339, 406_467, 6_334_659, 100_826_307],
      logLogOls: { slope: 1.8034332481049689, rSquared: 0.991, pointCount: 5 },
      assessmentPointIds: pointIds.slice(-3),
      assessmentLogLogOls: { slope: 1.9886295409070034, rSquared: 0.9999, pointCount: 3 },
    };
    expect(assessMatrixGrowthSeries([series])[0]).toMatchObject({
      status: "consistent",
      observedExponent: 1.9886295409070034,
    });
  });

  it("never promotes incomplete structural coverage to consistency", () => {
    const incomplete = growthSeries("structural-total", 1, [10, 40, 160, 640, 2_560]);
    const pointIds = incomplete.pointIds.slice(-2);
    expect(assessMatrixGrowthSeries([{
      ...incomplete,
      pointIds,
      xValues: incomplete.xValues.slice(-2),
      values: incomplete.values.slice(-2),
      logLogOls: { slope: 1, rSquared: 1, pointCount: 2 },
      assessmentPointIds: pointIds,
      assessmentLogLogOls: { slope: 1, rSquared: 1, pointCount: 2 },
    }])[0]?.status).toBe("inconclusive");
  });

  it("rejects hash-consistent growth-model, raw-diagnostic, and derived-aggregate tampering", () => {
    const fixtureRoot = mkdtempSync(join(tmpdir(), "density-spatial-matrix-"));
    try {
      const base = join(fixtureRoot, "base");
      const plan = writeMatrixPlan({
        outputDirectory: base,
        suiteId: "spatial-index",
        issuedAt: "2026-08-03T00:00:00.000Z",
        policy: { processRounds: 1, warmupSamplesPerProcess: 0, measuredSamplesPerProcess: 1 },
      });
      let pid = 970_000;
      const evidence = (workload: (typeof plan.manifest.blocks)[number]["workload"]) => {
        const n = workload.initialActive;
        const pairs = n * (n - 1) / 2;
        const coincident = workload.initialization.positions === "coincident";
        return { n, pairs, acceptedPairs: coincident ? pairs : 0, digest: canonicalDigest(workload) };
      };
      executeMatrix({
        outputDirectory: base,
        parityRunner: (workload, operation, algorithmId) => {
          const item = evidence(workload);
          return {
            operation,
            algorithmId,
            semanticScopeId: getMatrixAlgorithmSpec(operation, algorithmId).semanticScopeId,
            checkpoints: 1,
            finalSnapshotDigest: item.digest,
            diagnostics: { activeCount: item.n, acceptedPairs: item.acceptedPairs, pairFingerprintXor: 0, pairFingerprintSum: 0 },
          };
        },
        cellRunner: (request) => {
          const workload = request.workload as (typeof plan.manifest.blocks)[number]["workload"];
          const item = evidence(workload);
          const brute = request.algorithmId === MATRIX_BRUTE_NEIGHBOR_ALGORITHM;
          const addressableCells = brute ? 0 : (Math.floor((workload.coordinateLimit * 2) / workload.neighborRadius) + 1) ** 2;
          const coincident = workload.initialization.positions === "coincident";
          const candidateVisits = brute ? item.pairs : coincident ? item.n * item.n : item.n;
          const slotVisits = brute ? item.n : item.n * 2;
          const cellVisits = brute ? 0 : addressableCells * 3 + (coincident ? item.n * 9 : 0);
          const stencilVisits = brute ? 0 : item.n * 9;
          const distanceChecks = brute || coincident ? item.pairs : item.n;
          const totalStructuralWork = slotVisits + cellVisits + stencilVisits + candidateVisits + distanceChecks;
          const spec = getMatrixAlgorithmSpec(request.operation, request.algorithmId!);
          return {
            pid: pid++,
            executable: process.execPath,
            execArgv: [],
            node: process.version,
            v8: process.versions.v8,
            warmupSamples: 0,
            samples: [{ sampleIndex: 0, durationNs: brute ? Math.max(1, item.pairs) : Math.max(1, totalStructuralWork) }],
            correctness: { snapshotDigest: item.digest, canonicalSnapshotBytes: 1, evidenceDigest: null },
            operation: request.operation,
            algorithmId: request.algorithmId!,
            semanticScopeId: spec.semanticScopeId,
            diagnostics: {
              algorithm: brute ? "brute-force" as const : "uniform-grid" as const,
              activeCount: item.n,
              addressableCells,
              occupiedCells: brute ? 0 : coincident ? 1 : Math.min(item.n, addressableCells),
              maximumOccupancy: brute ? 0 : workload.initialization.positions === "coincident" ? item.n : 1,
              slotVisits,
              cellVisits,
              stencilVisits,
              candidateVisits,
              distanceChecks,
              acceptedPairs: item.acceptedPairs,
              totalStructuralWork,
              pairFingerprintXor: 0,
              pairFingerprintSum: 0,
            },
          };
        },
      });
      aggregateMatrix(base, "2026-08-03T00:00:01.000Z");
      expect(validateMatrixOutput(base)?.growthAssessments?.some((entry) => entry.status === "audit-required")).toBe(false);
      expect(enforceMatrixOutput(base).growthAssessments?.filter((entry) => entry.dimension === "structural"))
        .toHaveLength(12);

      const model = join(fixtureRoot, "model");
      cpSync(base, model, { recursive: true });
      rewriteHashedJson(join(model, "manifest.json"), (value) => {
        const blocks = value.blocks as { growthModel: { theorem: string } }[];
        blocks[0]!.growthModel.theorem = "tampered theorem";
      });
      expect(() => validateMatrixOutput(model)).toThrow("algorithm contract mismatch");

      const diagnostics = join(fixtureRoot, "diagnostics");
      cpSync(base, diagnostics, { recursive: true });
      const shardPath = (plan.manifest.blocks[0]!.shardPath);
      rewriteHashedJson(join(diagnostics, shardPath), (value) => {
        const invocations = value.invocations as { diagnostics: { totalStructuralWork: number } }[];
        invocations[0]!.diagnostics.totalStructuralWork += 1;
      });
      expect(() => validateMatrixOutput(diagnostics)).toThrow("structural total mismatch");

      const aggregate = join(fixtureRoot, "aggregate");
      cpSync(base, aggregate, { recursive: true });
      rewriteHashedJson(join(aggregate, "aggregate.json"), (value) => {
        const ratios = value.algorithmRatios as { medianRatio: number }[];
        ratios[0]!.medianRatio += 1;
      });
      expect(() => validateMatrixOutput(aggregate)).toThrow("statistics or analysis do not match raw shards");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
