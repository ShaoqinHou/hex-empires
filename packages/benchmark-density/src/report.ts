import { canonicalDigest } from "@hex-empires/kernel";
import {
  densityBaselineWorkload,
  validateDensityWorkload,
  type DensityWorkload,
} from "@hex-empires/scenario-density";

export const BENCHMARK_REPORT_FORMAT = "simulation-playground/density-benchmark-report/v2";
export const CLAIM_GRADE_POLICY = "simulation-playground/density-claim-grade/v1";

export type VariantId = "object" | "soa" | "hybrid";
export type BenchmarkOperation =
  | "update"
  | "neighborhood-all-pairs"
  | "churn"
  | "snapshot-materialization"
  | "capture"
  | "replay";

export type BenchmarkOperationUnit =
  | "update-tick"
  | "all-pairs-pass"
  | "churn-batch"
  | "snapshot-materialization"
  | "capture"
  | "replay";

export interface BenchmarkScope {
  readonly id: string;
  readonly timedPhases: readonly string[];
  readonly setupPhases: readonly string[];
}

export interface BenchmarkCaseSpec {
  readonly operation: BenchmarkOperation;
  readonly operationUnit: BenchmarkOperationUnit;
  readonly scope: BenchmarkScope;
}

export const BENCHMARK_CASE_SPECS: Readonly<Record<BenchmarkOperation, BenchmarkCaseSpec>> = {
  update: {
    operation: "update",
    operationUnit: "update-tick",
    scope: {
      id: "density/direct-motion-update/v1",
      timedPhases: [
        "configured-world-validation",
        "active-slot-scan",
        "motion-integration-with-coordinate-wrap",
        "age-increment",
        "completed-tick-increment",
      ],
      setupPhases: ["fresh-configured-world"],
    },
  },
  "neighborhood-all-pairs": {
    operation: "neighborhood-all-pairs",
    operationUnit: "all-pairs-pass",
    scope: {
      id: "density/direct-neighborhood-all-pairs/v1",
      timedPhases: [
        "configured-world-validation",
        "active-slot-all-pairs-distance-test",
        "neighbor-pair-count-store",
      ],
      setupPhases: ["fresh-configured-world"],
    },
  },
  churn: {
    operation: "churn",
    operationUnit: "churn-batch",
    scope: {
      id: "density/direct-churn/v1",
      timedPhases: [
        "configured-world-validation",
        "stable-order-deactivate",
        "stable-order-activate",
        "spawn-field-initialization",
        "requested-transition-verification",
      ],
      setupPhases: ["fresh-configured-world", "persistent-density-churn-random-stream"],
    },
  },
  "snapshot-materialization": {
    operation: "snapshot-materialization",
    operationUnit: "snapshot-materialization",
    scope: {
      id: "density/scenario-snapshot-materialization/v1",
      timedPhases: ["active-entity-projection", "entity-id-sort", "snapshot-object-construction"],
      setupPhases: ["completed-snapshot-profile-world"],
    },
  },
  capture: {
    operation: "capture",
    operationUnit: "capture",
    scope: {
      id: "kernel/full-capture/v1",
      timedPhases: ["scenario-snapshot-materialization", "canonical-serialization", "canonical-clone", "sha256"],
      setupPhases: ["completed-snapshot-profile-simulation"],
    },
  },
  replay: {
    operation: "replay",
    operationUnit: "replay",
    scope: {
      id: "kernel/execute-replay-end-to-end/v1",
      timedPhases: [
        "scenario-world-construction",
        "random-stream-construction",
        "command-admission",
        "fixed-tick-systems",
        "full-capture",
        "replay-evidence-construction",
        "evidence-sha256",
      ],
      setupPhases: ["fresh-process-cell"],
    },
  },
};

export const BENCHMARK_OPERATIONS = Object.freeze(Object.keys(BENCHMARK_CASE_SPECS) as BenchmarkOperation[]);
export const BENCHMARK_VARIANTS: readonly VariantId[] = ["object", "soa", "hybrid"];

export interface BenchmarkSource {
  readonly revision: string;
  readonly dirty: boolean;
  readonly lockfile: {
    readonly path: string;
    readonly sha256: string;
  };
}

export interface BenchmarkEnvironment {
  readonly platform: string;
  readonly release: string;
  readonly arch: string;
  readonly cpuModel: string;
  readonly logicalCpuCount: number;
  readonly totalMemoryBytes: number;
  readonly node: string;
  readonly v8: string;
}

export interface BenchmarkStatistics {
  readonly medianNsPerOperation: number;
  readonly p95NsPerOperation: number;
  readonly minNsPerOperation: number;
  readonly maxNsPerOperation: number;
}

export interface BenchmarkCorrectness {
  readonly snapshotDigest: string;
  readonly canonicalSnapshotBytes: number;
  readonly evidenceDigest: string | null;
}

export interface BenchmarkProcessResult {
  readonly processRound: number;
  readonly orderIndex: number;
  readonly pid: number;
  readonly executable: string;
  readonly execArgv: readonly string[];
  readonly node: string;
  readonly v8: string;
  readonly warmupSamples: number;
  readonly samples: readonly {
    readonly sampleIndex: number;
    readonly durationNs: number;
  }[];
  readonly correctness: BenchmarkCorrectness;
}

export interface BenchmarkCaseResult {
  readonly operation: BenchmarkOperation;
  readonly scope: BenchmarkScope;
  readonly variant: {
    readonly id: VariantId;
    readonly storage: VariantId;
    readonly scenarioId: string;
    readonly schemaVersion: number;
  };
  readonly operationsPerSample: number;
  readonly operationUnit: BenchmarkOperationUnit;
  readonly processes: readonly BenchmarkProcessResult[];
  readonly statistics: BenchmarkStatistics;
  readonly correctness: BenchmarkCorrectness;
}

export interface DensityBenchmarkReport {
  readonly format: typeof BENCHMARK_REPORT_FORMAT;
  readonly generatedAt: string;
  readonly source: BenchmarkSource;
  readonly environment: BenchmarkEnvironment;
  readonly harness: {
    readonly timer: "process.hrtime.bigint";
    readonly percentileMethod: "nearest-rank";
    readonly processIsolation: "fresh-child-process-per-case-cell-per-round";
    readonly processRounds: number;
    readonly warmupSamplesPerProcess: number;
    readonly measuredSamplesPerProcess: number;
    readonly cellOrder: "operation-major-rotating-variant/v1";
    readonly childInvocation: {
      readonly executable: string;
      readonly execArgv: readonly string[];
      readonly protocol: "stdin-json-single-response/v1";
    };
    readonly roundOrder: readonly {
      readonly processRound: number;
      readonly cells: readonly string[];
    }[];
  };
  readonly workload: {
    readonly classification: "smoke" | "baseline" | "custom";
    readonly digest: string;
    readonly definition: DensityWorkload;
  };
  readonly parity: {
    readonly strategy: "every-tick-and-direct-phase/v1";
    readonly operations: readonly {
      readonly operation: BenchmarkOperation;
      readonly checkpoints: number;
      readonly finalSnapshotDigest: string;
    }[];
  };
  readonly cases: readonly BenchmarkCaseResult[];
  readonly claimEligibility: {
    readonly policy: typeof CLAIM_GRADE_POLICY;
    readonly eligible: boolean;
    readonly reasons: readonly string[];
  };
}

export function benchmarkCaseKey(operation: BenchmarkOperation, variant: VariantId): string {
  return `${operation}/${variant}`;
}

export function nearestRank(values: readonly number[], percentile: number): number {
  if (values.length === 0) throw new Error("cannot calculate a percentile without samples");
  if (!Number.isFinite(percentile) || percentile <= 0 || percentile > 1) {
    throw new Error("percentile must be greater than 0 and at most 1");
  }
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.ceil(sorted.length * percentile) - 1] ?? sorted[sorted.length - 1]!;
}

export function summarizeDurations(
  durationsNs: readonly number[],
  operationsPerSample: number,
): BenchmarkStatistics {
  if (!Number.isSafeInteger(operationsPerSample) || operationsPerSample < 1) {
    throw new Error("operationsPerSample must be a positive safe integer");
  }
  if (durationsNs.length === 0 || durationsNs.some((duration) => !Number.isSafeInteger(duration) || duration < 0)) {
    throw new Error("durations must be non-empty non-negative safe integer nanoseconds");
  }
  const normalized = durationsNs.map((duration) => duration / operationsPerSample);
  return {
    medianNsPerOperation: nearestRank(normalized, 0.5),
    p95NsPerOperation: nearestRank(normalized, 0.95),
    minNsPerOperation: Math.min(...normalized),
    maxNsPerOperation: Math.max(...normalized),
  };
}

function sameStatistics(left: BenchmarkStatistics, right: BenchmarkStatistics): boolean {
  return (
    left.medianNsPerOperation === right.medianNsPerOperation &&
    left.p95NsPerOperation === right.p95NsPerOperation &&
    left.minNsPerOperation === right.minNsPerOperation &&
    left.maxNsPerOperation === right.maxNsPerOperation
  );
}

function sameStrings(left: readonly string[], right: readonly string[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`);
  return value;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function requireInteger(value: unknown, label: string, minimum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) {
    throw new Error(`${label} must be a safe integer of at least ${minimum}`);
  }
  return value as number;
}

function requireSha256(value: unknown, label: string): string {
  const digest = requireString(value, label);
  if (!/^[0-9a-f]{64}$/.test(digest)) throw new Error(`${label} must be a lowercase SHA-256 digest`);
  return digest;
}

function classifyWorkload(workload: DensityWorkload): "smoke" | "baseline" | "custom" {
  const digest = canonicalDigest(workload);
  if (digest === canonicalDigest(densityBaselineWorkload)) return "baseline";
  return workload.id === "density-smoke-v1" ? "smoke" : "custom";
}

function expectedFullMatrix(): Set<string> {
  return new Set(BENCHMARK_OPERATIONS.flatMap((operation) => BENCHMARK_VARIANTS.map((variant) => benchmarkCaseKey(operation, variant))));
}

function expectedOperationsPerSample(workload: DensityWorkload, operation: BenchmarkOperation): number {
  if (operation === "update") return workload.ticks.update;
  if (operation === "neighborhood-all-pairs") return workload.ticks["neighborhood-all-pairs"];
  if (operation === "churn") return workload.ticks.churn;
  return 1;
}

function expectedParityCheckpoints(workload: DensityWorkload, operation: BenchmarkOperation): number {
  if (operation === "update" || operation === "neighborhood-all-pairs" || operation === "churn") {
    return expectedOperationsPerSample(workload, operation) + 1;
  }
  if (operation === "snapshot-materialization") return workload.ticks.snapshot * 3 + 1;
  if (operation === "capture") return workload.ticks.snapshot + 1;
  return workload.ticks.replay + 2;
}

export function assessDensityClaimEligibility(
  report: Omit<DensityBenchmarkReport, "claimEligibility"> | DensityBenchmarkReport,
): DensityBenchmarkReport["claimEligibility"] {
  const reasons: string[] = [];
  if (report.workload.classification !== "baseline" || report.workload.digest !== canonicalDigest(densityBaselineWorkload)) {
    reasons.push("workload is not the checked-in density baseline");
  }
  if (!/^[0-9a-f]{40}$/.test(report.source.revision)) reasons.push("source revision is not a full 40-hex commit id");
  if (report.source.dirty) reasons.push("source worktree is dirty");
  if (report.source.lockfile.path !== "package-lock.json" || !/^[0-9a-f]{64}$/.test(report.source.lockfile.sha256)) {
    reasons.push("package-lock.json digest is missing or invalid");
  }
  const actualMatrix = new Set(report.cases.map((result) => benchmarkCaseKey(result.operation, result.variant.id)));
  const fullMatrix = expectedFullMatrix();
  if (actualMatrix.size !== fullMatrix.size || [...fullMatrix].some((key) => !actualMatrix.has(key))) {
    reasons.push("full unique operation and storage-layout matrix is missing");
  }
  if (report.harness.processRounds < 3) reasons.push("claim grade requires at least 3 process rounds");
  if (report.harness.warmupSamplesPerProcess < 5) reasons.push("claim grade requires at least 5 warmups per process");
  if (report.harness.measuredSamplesPerProcess < 10) reasons.push("claim grade requires at least 10 samples per process");
  if (report.parity.operations.length !== BENCHMARK_OPERATIONS.length) {
    reasons.push("every operation requires tick-or-phase parity evidence");
  }
  return { policy: CLAIM_GRADE_POLICY, eligible: reasons.length === 0, reasons };
}

export function validateBenchmarkReport(value: unknown): asserts value is DensityBenchmarkReport {
  const report = requireRecord(value, "benchmark report");
  if (report.format !== BENCHMARK_REPORT_FORMAT) throw new Error("unsupported benchmark report format");
  const generatedAt = requireString(report.generatedAt, "generatedAt");
  const parsedDate = new Date(generatedAt);
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString() !== generatedAt) {
    throw new Error("generatedAt must be a canonical ISO timestamp");
  }

  const source = requireRecord(report.source, "source");
  requireString(source.revision, "source revision");
  if (typeof source.dirty !== "boolean") throw new Error("source dirty must be boolean");
  const lockfile = requireRecord(source.lockfile, "source lockfile");
  requireString(lockfile.path, "source lockfile path");
  requireSha256(lockfile.sha256, "source lockfile sha256");

  const environment = requireRecord(report.environment, "environment");
  for (const field of ["platform", "release", "arch", "cpuModel", "node", "v8"] as const) {
    requireString(environment[field], `environment ${field}`);
  }
  requireInteger(environment.logicalCpuCount, "environment logicalCpuCount", 1);
  requireInteger(environment.totalMemoryBytes, "environment totalMemoryBytes", 1);

  const harness = requireRecord(report.harness, "harness");
  if (harness.timer !== "process.hrtime.bigint") throw new Error("unsupported benchmark timer");
  if (harness.percentileMethod !== "nearest-rank") throw new Error("unsupported percentile method");
  if (harness.processIsolation !== "fresh-child-process-per-case-cell-per-round") {
    throw new Error("invalid process isolation policy");
  }
  if (harness.cellOrder !== "operation-major-rotating-variant/v1") throw new Error("invalid cell order policy");
  const childInvocation = requireRecord(harness.childInvocation, "child invocation");
  const childExecutable = requireString(childInvocation.executable, "child executable");
  if (!Array.isArray(childInvocation.execArgv) || childInvocation.execArgv.some((value) => typeof value !== "string")) {
    throw new Error("child execArgv must be an array of strings");
  }
  if (childInvocation.protocol !== "stdin-json-single-response/v1") {
    throw new Error("invalid child invocation protocol");
  }
  const childExecArgv = childInvocation.execArgv as string[];
  const processRounds = requireInteger(harness.processRounds, "processRounds", 1);
  const warmups = requireInteger(harness.warmupSamplesPerProcess, "warmupSamplesPerProcess", 0);
  const measured = requireInteger(harness.measuredSamplesPerProcess, "measuredSamplesPerProcess", 1);

  const workload = requireRecord(report.workload, "workload");
  if (workload.classification !== "smoke" && workload.classification !== "baseline" && workload.classification !== "custom") {
    throw new Error("invalid workload classification");
  }
  const workloadDefinition = workload.definition as DensityWorkload;
  validateDensityWorkload(workloadDefinition);
  const workloadDigest = requireSha256(workload.digest, "workload digest");
  if (canonicalDigest(workloadDefinition) !== workloadDigest) throw new Error("workload digest does not match its definition");
  if (classifyWorkload(workloadDefinition) !== workload.classification) throw new Error("workload classification is false");

  const cases = report.cases;
  if (!Array.isArray(cases) || cases.length === 0) throw new Error("benchmark report must contain cases");
  const caseKeys = new Set<string>();
  const allProcessIds = new Set<number>();
  const parityDigests = new Map<BenchmarkOperation, string>();

  const parity = requireRecord(report.parity, "parity");
  if (parity.strategy !== "every-tick-and-direct-phase/v1") throw new Error("invalid parity strategy");
  if (!Array.isArray(parity.operations) || parity.operations.length === 0) throw new Error("parity operations must not be empty");
  for (const [index, rawEntry] of parity.operations.entries()) {
    const entry = requireRecord(rawEntry, `parity operation ${index}`);
    const operation = requireString(entry.operation, `parity operation ${index} id`) as BenchmarkOperation;
    if (!BENCHMARK_OPERATIONS.includes(operation)) throw new Error(`unknown parity operation: ${operation}`);
    if (parityDigests.has(operation)) throw new Error(`duplicate parity operation: ${operation}`);
    const checkpoints = requireInteger(entry.checkpoints, `parity ${operation} checkpoints`, 1);
    if (checkpoints !== expectedParityCheckpoints(workloadDefinition, operation)) {
      throw new Error(`parity ${operation} does not prove every required tick or phase`);
    }
    parityDigests.set(operation, requireSha256(entry.finalSnapshotDigest, `parity ${operation} digest`));
  }

  for (const [caseIndex, rawResult] of cases.entries()) {
    const result = requireRecord(rawResult, `case ${caseIndex}`);
    const operation = requireString(result.operation, `case ${caseIndex} operation`) as BenchmarkOperation;
    if (!BENCHMARK_OPERATIONS.includes(operation)) throw new Error(`unknown benchmark operation: ${operation}`);
    const spec = BENCHMARK_CASE_SPECS[operation];
    const variant = requireRecord(result.variant, `case ${operation} variant`);
    const variantId = requireString(variant.id, `case ${operation} variant id`) as VariantId;
    if (!BENCHMARK_VARIANTS.includes(variantId)) throw new Error(`unknown benchmark variant: ${variantId}`);
    if (variant.storage !== variantId) throw new Error(`case ${operation}/${variantId} storage metadata is false`);
    const expectedScenarioId = `density-${variantId}`;
    if (variant.scenarioId !== expectedScenarioId) throw new Error(`case ${operation}/${variantId} scenario metadata is false`);
    if (variant.schemaVersion !== 1) throw new Error(`case ${operation}/${variantId} schema metadata is false`);
    const key = benchmarkCaseKey(operation, variantId);
    if (caseKeys.has(key)) throw new Error(`duplicate benchmark case: ${key}`);
    caseKeys.add(key);

    if (result.operationUnit !== spec.operationUnit) throw new Error(`case ${key} has an invalid operation unit`);
    const scope = requireRecord(result.scope, `case ${key} scope`);
    if (scope.id !== spec.scope.id) throw new Error(`case ${key} has an invalid scope id`);
    if (!Array.isArray(scope.timedPhases) || !sameStrings(scope.timedPhases as string[], spec.scope.timedPhases)) {
      throw new Error(`case ${key} has invalid timed phases`);
    }
    if (!Array.isArray(scope.setupPhases) || !sameStrings(scope.setupPhases as string[], spec.scope.setupPhases)) {
      throw new Error(`case ${key} has invalid setup phases`);
    }
    const operationsPerSample = requireInteger(result.operationsPerSample, `case ${key} operationsPerSample`, 1);
    if (operationsPerSample !== expectedOperationsPerSample(workloadDefinition, operation)) {
      throw new Error(`case ${key} operationsPerSample does not match the workload`);
    }
    if (!Array.isArray(result.processes) || result.processes.length !== processRounds) {
      throw new Error(`case ${key} has the wrong process-round count`);
    }
    const durations: number[] = [];
    let aggregateCorrectness: BenchmarkCorrectness | undefined;
    for (const [processIndex, rawProcess] of result.processes.entries()) {
      const processResult = requireRecord(rawProcess, `case ${key} process ${processIndex}`);
      const processRound = requireInteger(processResult.processRound, `case ${key} process round`, 0);
      if (processRound !== processIndex) throw new Error(`case ${key} process rounds are not canonical`);
      requireInteger(processResult.orderIndex, `case ${key} process order`, 0);
      const pid = requireInteger(processResult.pid, `case ${key} pid`, 1);
      if (allProcessIds.has(pid)) throw new Error(`child process id ${pid} was reused across case cells`);
      allProcessIds.add(pid);
      if (processResult.executable !== childExecutable) {
        throw new Error(`case ${key} child executable differs from the declared invocation`);
      }
      if (!Array.isArray(processResult.execArgv) || !sameStrings(processResult.execArgv as string[], childExecArgv)) {
        throw new Error(`case ${key} child execArgv differs from the declared invocation`);
      }
      if (processResult.node !== environment.node || processResult.v8 !== environment.v8) {
        throw new Error(`case ${key} child runtime metadata differs from the report environment`);
      }
      if (processResult.warmupSamples !== warmups) throw new Error(`case ${key} has the wrong warmup policy`);
      if (!Array.isArray(processResult.samples) || processResult.samples.length !== measured) {
        throw new Error(`case ${key} has the wrong measured sample count`);
      }
      for (const [sampleIndex, rawSample] of processResult.samples.entries()) {
        const sample = requireRecord(rawSample, `case ${key} sample ${sampleIndex}`);
        if (sample.sampleIndex !== sampleIndex) throw new Error(`case ${key} sample indices are not canonical`);
        durations.push(requireInteger(sample.durationNs, `case ${key} sample duration`, 0));
      }
      const correctness = validateCorrectness(processResult.correctness, operation, `case ${key} process correctness`);
      if (aggregateCorrectness === undefined) aggregateCorrectness = correctness;
      else if (JSON.stringify(aggregateCorrectness) !== JSON.stringify(correctness)) {
        throw new Error(`case ${key} correctness differs across child processes`);
      }
    }
    const reportedCorrectness = validateCorrectness(result.correctness, operation, `case ${key} correctness`);
    if (JSON.stringify(aggregateCorrectness) !== JSON.stringify(reportedCorrectness)) {
      throw new Error(`case ${key} aggregate correctness does not match child evidence`);
    }
    if (parityDigests.get(operation) !== reportedCorrectness.snapshotDigest) {
      throw new Error(`case ${key} does not match parity evidence`);
    }
    const statistics = requireRecord(result.statistics, `case ${key} statistics`) as unknown as BenchmarkStatistics;
    for (const field of ["medianNsPerOperation", "p95NsPerOperation", "minNsPerOperation", "maxNsPerOperation"] as const) {
      if (!Number.isFinite(statistics[field]) || statistics[field] < 0) throw new Error(`case ${key} has invalid statistics`);
    }
    if (!sameStatistics(statistics, summarizeDurations(durations, operationsPerSample))) {
      throw new Error(`case ${key} statistics do not match raw durations`);
    }
  }

  if (!Array.isArray(harness.roundOrder) || harness.roundOrder.length !== processRounds) {
    throw new Error("harness round order does not match process rounds");
  }
  const selectedOperations = BENCHMARK_OPERATIONS.filter((operation) =>
    [...caseKeys].some((key) => key.startsWith(`${operation}/`)),
  );
  const selectedVariants = BENCHMARK_VARIANTS.filter((variant) =>
    [...caseKeys].some((key) => key.endsWith(`/${variant}`)),
  );
  const expectedSelectedMatrix = new Set(
    selectedOperations.flatMap((operation) =>
      selectedVariants.map((variant) => benchmarkCaseKey(operation, variant)),
    ),
  );
  if (expectedSelectedMatrix.size !== caseKeys.size || [...expectedSelectedMatrix].some((key) => !caseKeys.has(key))) {
    throw new Error("benchmark cases are not a complete rectangular selection");
  }
  if (
    parityDigests.size !== selectedOperations.length ||
    selectedOperations.some((operation) => !parityDigests.has(operation))
  ) {
    throw new Error("parity evidence does not exactly match selected operations");
  }
  for (const [round, rawRoundOrder] of harness.roundOrder.entries()) {
    const roundOrder = requireRecord(rawRoundOrder, `round order ${round}`);
    if (roundOrder.processRound !== round) throw new Error("round order indices are not canonical");
    if (!Array.isArray(roundOrder.cells) || roundOrder.cells.length !== cases.length) {
      throw new Error(`round ${round} does not list every case cell`);
    }
    const listed = new Set(roundOrder.cells);
    if (listed.size !== caseKeys.size || [...caseKeys].some((key) => !listed.has(key))) {
      throw new Error(`round ${round} case order is not a unique complete selection`);
    }
    const expectedCells = selectedOperations.flatMap((operation, operationIndex) =>
      selectedVariants.map((_, offset) =>
        benchmarkCaseKey(
          operation,
          selectedVariants[(offset + operationIndex + round) % selectedVariants.length]!,
        ),
      ),
    );
    if (!sameStrings(roundOrder.cells as string[], expectedCells)) {
      throw new Error(`round ${round} does not follow the declared cell order policy`);
    }
    for (const [orderIndex, key] of (roundOrder.cells as string[]).entries()) {
      const matching = (cases as unknown as BenchmarkCaseResult[]).find(
        (result) => benchmarkCaseKey(result.operation, result.variant.id) === key,
      );
      if (matching?.processes[round]?.orderIndex !== orderIndex) throw new Error(`round ${round} order metadata is false`);
    }
  }

  const claim = requireRecord(report.claimEligibility, "claimEligibility");
  if (claim.policy !== CLAIM_GRADE_POLICY || typeof claim.eligible !== "boolean" || !Array.isArray(claim.reasons)) {
    throw new Error("claim eligibility metadata is malformed");
  }
  const expectedClaim = assessDensityClaimEligibility(value as DensityBenchmarkReport);
  if (claim.eligible !== expectedClaim.eligible || !sameStrings(claim.reasons as string[], expectedClaim.reasons)) {
    throw new Error("claim eligibility metadata does not match the report evidence");
  }
}

function validateCorrectness(value: unknown, operation: BenchmarkOperation, label: string): BenchmarkCorrectness {
  const correctness = requireRecord(value, label);
  const snapshotDigest = requireSha256(correctness.snapshotDigest, `${label} snapshot digest`);
  const canonicalSnapshotBytes = requireInteger(correctness.canonicalSnapshotBytes, `${label} snapshot bytes`, 1);
  const evidenceDigest = correctness.evidenceDigest;
  if (operation === "replay") requireSha256(evidenceDigest, `${label} replay evidence digest`);
  else if (evidenceDigest !== null) throw new Error(`${label} must not claim replay evidence`);
  return { snapshotDigest, canonicalSnapshotBytes, evidenceDigest: evidenceDigest as string | null };
}
