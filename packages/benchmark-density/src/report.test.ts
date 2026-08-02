import { describe, expect, it } from "vitest";

import { densitySmokeWorkload } from "@hex-empires/scenario-density";

import { CLI_HELP, parseArguments, runCli } from "./cli.js";
import { assertSnapshotParity, measureBenchmarkCell, runDensityBenchmark, type CellWorkerRequest } from "./measure.js";
import { nearestRank, summarizeDurations, validateBenchmarkReport } from "./report.js";

const environment = {
  platform: "test-platform",
  release: "test-release",
  arch: "test-arch",
  cpuModel: "test-cpu",
  logicalCpuCount: 4,
  totalMemoryBytes: 1024,
  node: process.version,
  v8: process.versions.v8,
} as const;

const source = {
  revision: "0123456789abcdef0123456789abcdef01234567",
  dirty: true,
  lockfile: { path: "package-lock.json", sha256: "a".repeat(64) },
} as const;

function isolatedTestRunner() {
  let pid = 100_000;
  return (request: CellWorkerRequest) => ({
    ...measureBenchmarkCell(request),
    pid: pid++,
    executable: process.execPath,
    execArgv: [],
  });
}

function fastClaimPolicyRunner() {
  let pid = 200_000;
  return (request: CellWorkerRequest) => {
    const measured = measureBenchmarkCell({ ...request, warmupSamples: 0, measuredSamples: 1 });
    const durationNs = measured.samples[0]!.durationNs;
    return {
      ...measured,
      pid: pid++,
      executable: process.execPath,
      execArgv: [],
      warmupSamples: request.warmupSamples,
      samples: Array.from({ length: request.measuredSamples }, (_, sampleIndex) => ({
        sampleIndex,
        durationNs,
      })),
    };
  };
}

function smokeReport() {
  return runDensityBenchmark({
    workload: densitySmokeWorkload,
    processRounds: 1,
    warmupSamplesPerProcess: 0,
    measuredSamplesPerProcess: 2,
    source,
    environment,
    generatedAt: "2026-08-03T00:00:00.000Z",
    processRunner: isolatedTestRunner(),
  });
}

describe("density benchmark report", () => {
  it("uses nearest-rank median and p95 statistics over raw durations", () => {
    expect(nearestRank([50, 10, 40, 20], 0.5)).toBe(20);
    expect(nearestRank([50, 10, 40, 20], 0.95)).toBe(50);
    expect(summarizeDurations([100, 40, 80], 2)).toEqual({
      medianNsPerOperation: 40,
      p95NsPerOperation: 50,
      minNsPerOperation: 20,
      maxNsPerOperation: 50,
    });
  });

  it("aborts parity proof when any storage layout disagrees", () => {
    expect(() => assertSnapshotParity("update", ["same", "same", "different"])).toThrow(
      "cross-layout semantic parity failed",
    );
    expect(() => assertSnapshotParity("update", ["same", "same"])).toThrow(
      "cross-layout semantic parity failed",
    );
  });

  it("emits the full six-operation matrix with isolated raw process samples and truthful scopes", () => {
    const report = smokeReport();

    expect(report.cases).toHaveLength(18);
    expect(new Set(report.cases.map((result) => result.operation))).toEqual(
      new Set(["update", "neighborhood-all-pairs", "churn", "snapshot-materialization", "capture", "replay"]),
    );
    expect(report.cases.every((result) => result.processes.length === 1)).toBe(true);
    expect(report.cases.every((result) => result.processes[0]?.samples.length === 2)).toBe(true);
    expect(report.harness).toMatchObject({
      processIsolation: "fresh-child-process-per-case-cell-per-round",
      processRounds: 1,
      warmupSamplesPerProcess: 0,
      measuredSamplesPerProcess: 2,
      childInvocation: {
        executable: process.execPath,
        execArgv: [],
        protocol: "stdin-json-single-response/v1",
      },
    });
    expect(report.cases.find((result) => result.operation === "neighborhood-all-pairs")?.scope.id).toContain(
      "all-pairs",
    );
    expect(report.cases.find((result) => result.operation === "snapshot-materialization")?.scope.timedPhases).not.toContain(
      "canonical-serialization",
    );
    expect(report.cases.find((result) => result.operation === "capture")?.scope.timedPhases).toContain(
      "canonical-serialization",
    );
    expect(report.claimEligibility).toMatchObject({ eligible: false });
    expect(report.claimEligibility.reasons).toContain("workload is not the checked-in density baseline");
    expect(() => validateBenchmarkReport(report)).not.toThrow();
  });

  it("accepts a complete baseline only when every claim-grade evidence gate is satisfied", () => {
    const report = runDensityBenchmark({
      source: { ...source, dirty: false },
      environment,
      generatedAt: "2026-08-03T00:00:00.000Z",
      processRunner: fastClaimPolicyRunner(),
    });

    expect(report.workload.classification).toBe("baseline");
    expect(report.cases).toHaveLength(18);
    expect(report.claimEligibility).toEqual({
      policy: "simulation-playground/density-claim-grade/v1",
      eligible: true,
      reasons: [],
    });
  });

  it("rejects tampered raw statistics, duplicate cells, false scopes, and missing replay evidence", () => {
    const report = smokeReport();
    const first = report.cases[0]!;
    expect(() =>
      validateBenchmarkReport({
        ...report,
        cases: report.cases.map((result, index) =>
          index === 0
            ? { ...result, statistics: { ...result.statistics, medianNsPerOperation: result.statistics.medianNsPerOperation + 1 } }
            : result,
        ),
      }),
    ).toThrow("statistics do not match raw durations");
    expect(() => validateBenchmarkReport({ ...report, cases: [...report.cases, first] })).toThrow(
      "duplicate benchmark case",
    );
    expect(() =>
      validateBenchmarkReport({
        ...report,
        cases: report.cases.map((result, index) =>
          index === 0 ? { ...result, scope: { ...result.scope, id: "false/scope" } } : result,
        ),
      }),
    ).toThrow("invalid scope id");
    expect(() =>
      validateBenchmarkReport({
        ...report,
        cases: report.cases.map((result) =>
          result.operation === "replay"
            ? {
                ...result,
                correctness: { ...result.correctness, evidenceDigest: null },
                processes: result.processes.map((entry) => ({
                  ...entry,
                  correctness: { ...entry.correctness, evidenceDigest: null },
                })),
              }
            : result,
        ),
      }),
    ).toThrow("replay evidence digest");
    expect(() =>
      validateBenchmarkReport({
        ...report,
        parity: {
          ...report.parity,
          operations: report.parity.operations.map((entry, index) =>
            index === 0 ? { ...entry, checkpoints: entry.checkpoints + 1 } : entry,
          ),
        },
      }),
    ).toThrow("does not prove every required tick or phase");
    expect(() =>
      validateBenchmarkReport({
        ...report,
        cases: report.cases.map((result, index) =>
          index === 0 ? { ...result, operationsPerSample: result.operationsPerSample + 1 } : result,
        ),
      }),
    ).toThrow("operationsPerSample does not match the workload");
  });

  it("rejects reused child identities and claim metadata that is not evidence-derived", () => {
    const report = smokeReport();
    const reusedPid = report.cases[0]!.processes[0]!.pid;
    expect(() =>
      validateBenchmarkReport({
        ...report,
        cases: report.cases.map((result, index) =>
          index === 1
            ? { ...result, processes: result.processes.map((entry) => ({ ...entry, pid: reusedPid })) }
            : result,
        ),
      }),
    ).toThrow("was reused across case cells");
    expect(() =>
      validateBenchmarkReport({
        ...report,
        claimEligibility: { ...report.claimEligibility, eligible: true, reasons: [] },
      }),
    ).toThrow("claim eligibility metadata does not match");
    expect(() =>
      validateBenchmarkReport({
        ...report,
        cases: report.cases.map((result, index) =>
          index === 0
            ? {
                ...result,
                processes: result.processes.map((entry) => ({ ...entry, execArgv: ["--jitless"] })),
              }
            : result,
        ),
      }),
    ).toThrow("child execArgv differs from the declared invocation");
  });

  it("documents and selects the baseline by default while keeping smoke explicit", () => {
    expect(parseArguments([]).workload).toBe("baseline");
    expect(parseArguments(["--smoke"])).toMatchObject({
      workload: "smoke",
      processRounds: 1,
      warmupSamplesPerProcess: 1,
      measuredSamplesPerProcess: 2,
    });
    expect(() => parseArguments(["--case", "neighborhood"])).toThrow("unknown benchmark case");
    expect(() => parseArguments(["--samples", "2"])).toThrow("ambiguous with process isolation");
    let stdout = "";
    expect(runCli(["--help"], { stdout: (value) => { stdout += value; } })).toBeUndefined();
    expect(stdout).toBe(CLI_HELP);
    expect(stdout).toContain("Checked-in non-smoke workload");
    expect(stdout).toContain("refuses to overwrite");
  });
});
