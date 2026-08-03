import type { DensityNeighborSearchDiagnostics, DensityWorkloadV2 } from "@hex-empires/scenario-density";

import type {
  BenchmarkCorrectness,
  BenchmarkEnvironment,
  BenchmarkScope,
  BenchmarkSource,
  BenchmarkStatistics,
  VariantId,
} from "./report.js";
import type {
  MatrixGrowthModel,
  MatrixOperation,
  MatrixOperationUnit,
} from "./matrix-algorithms.js";

export const MATRIX_SUITE_FORMAT = "simulation-playground/density-matrix-suite/v1";
export const MATRIX_MANIFEST_FORMAT = "simulation-playground/density-matrix-manifest/v1";
export const MATRIX_SHARD_FORMAT = "simulation-playground/density-matrix-shard/v1";
export const MATRIX_AGGREGATE_FORMAT = "simulation-playground/density-matrix-aggregate/v2";
export const MATRIX_CLAIM_POLICY = "simulation-playground/density-matrix-claim/v1";

export const MATRIX_LAYOUTS: readonly VariantId[] = ["object", "soa", "hybrid"];
export const MATRIX_MAX_ATTEMPTS = 3;
export const MATRIX_TERMINAL_STATUSES = [
  "completed",
  "timeout",
  "failed",
  "resource-limit",
  "not-run",
] as const;

export type MatrixTerminalStatus = (typeof MATRIX_TERMINAL_STATUSES)[number];
export type MatrixSuiteId = "smoke" | "claim" | "stress-linear" | "stress-quadratic" | "spatial-index" | "spatial-index-steady";
export type MatrixClaimClass = "smoke" | "claim" | "stress-linear" | "stress-quadratic" | "spatial-index" | "spatial-index-steady";
export type MatrixScalar = string | number | boolean;

export interface MatrixFactor {
  readonly name: string;
  readonly kind: "numeric" | "categorical";
  readonly value: number | string;
  readonly unit: string;
}

export interface MatrixControls {
  /** Values deliberately held constant throughout the family. */
  readonly fixed: Readonly<Record<string, MatrixScalar>>;
  /** Named formulas or rules which vary only as a consequence of the factor. */
  readonly derived: Readonly<Record<string, string>>;
}

export interface MatrixOperationSelection {
  readonly operation: MatrixOperation;
  readonly algorithmId: string;
}

export interface MatrixPoint {
  readonly id: string;
  readonly family: string;
  readonly claimClass: MatrixClaimClass;
  readonly factor: MatrixFactor;
  readonly controls: MatrixControls;
  readonly workload: DensityWorkloadV2;
  readonly workloadDigest: string;
  readonly operations: readonly MatrixOperationSelection[];
}

export interface MatrixSuite {
  readonly format: typeof MATRIX_SUITE_FORMAT;
  readonly id: MatrixSuiteId;
  readonly claimClass: MatrixClaimClass;
  readonly description: string;
  readonly points: readonly MatrixPoint[];
}

export interface MatrixSource extends BenchmarkSource {
  /** Digest of tracked changes plus untracked path/content pairs, excluding the output root. */
  readonly worktreeStateSha256: string;
}

export interface MatrixEnvironment extends BenchmarkEnvironment {
  readonly executable: string;
  readonly executableSha256: string;
  readonly execArgv: readonly string[];
  /** Normalized inherited Node runtime flags; empty means NODE_OPTIONS is absent. */
  readonly nodeOptions: string;
}

export interface MatrixHarnessIdentity {
  readonly format: "simulation-playground/density-matrix-harness-identity/v1";
  readonly files: readonly {
    readonly role:
      | "cli"
      | "runner"
      | "validator"
      | "measure"
      | "cell-worker"
      | "parity-worker"
      | "algorithm-registry"
      | "suite-registry"
      | "artifact-contract"
      | "scenario-contract"
      | "scenario-workloads"
      | "scenario-shared"
      | "scenario-grid"
      | "scenario-object"
      | "scenario-soa"
      | "scenario-hybrid";
    readonly path: string;
    readonly sha256: string;
  }[];
}

export interface MatrixSamplePolicy {
  readonly processIsolation: "fresh-child-process-per-layout-per-round";
  readonly timer: "process.hrtime.bigint";
  readonly percentileMethod: "nearest-rank";
  readonly processRounds: number;
  readonly warmupSamplesPerProcess: number;
  readonly measuredSamplesPerProcess: number;
  readonly layouts: readonly VariantId[];
  readonly crossoverPracticalThreshold: number;
}

export interface MatrixLimits {
  readonly childTimeoutMs: number;
  readonly totalTimeoutMs: number;
  readonly maxEstimatedWorkPerChild: number;
  readonly maxEstimatedWorkTotal: number;
  readonly maxOutputBytesPerChild: number;
  readonly v8HeapLimitMb: number | null;
  readonly allowLarge: boolean;
}

export interface MatrixWorkEstimate {
  readonly linearScans: number;
  readonly pairCandidates: number;
  readonly transitions: number;
  readonly replayTicks: number;
  readonly outputBytes: number;
  readonly conservativeUnitsPerSample: number;
  readonly conservativeUnitsAllInvocations: number;
}

export interface MatrixInvocationPlan {
  /** Stable logical cell identity; concrete child IDs below are issued by the manifest. */
  readonly invocationId: string;
  readonly attemptInvocationIds: readonly string[];
  readonly layout: VariantId;
  readonly processRound: number;
  readonly orderIndex: number;
}

export interface MatrixComparisonBlock {
  readonly id: string;
  /** Canonical digest used to collapse identical workload/operation/algorithm blocks. */
  readonly deduplicationDigest: string;
  readonly pointIds: readonly string[];
  readonly workload: DensityWorkloadV2;
  readonly workloadDigest: string;
  readonly operation: MatrixOperation;
  readonly algorithmId: string;
  readonly scope: BenchmarkScope;
  /** Present on dispatch-aware plans; absent matrix v1 artifacts remain valid. */
  readonly semanticScopeId?: string;
  readonly operationUnit?: MatrixOperationUnit;
  readonly growthModel?: MatrixGrowthModel | null;
  readonly estimate: MatrixWorkEstimate;
  readonly invocations: readonly MatrixInvocationPlan[];
  readonly shardPaths: readonly string[];
  readonly shardPath: string;
}

export interface MatrixLegacyEvidence {
  readonly path: "legacy-report.json";
  readonly sha256: string;
  readonly reportFormat: "simulation-playground/density-benchmark-report/v2";
}

export interface MatrixManifest {
  readonly format: typeof MATRIX_MANIFEST_FORMAT;
  readonly issuedAt: string;
  readonly manifestId: string;
  /** Optional so immutable matrix-v1 artifacts remain valid and reproducible. */
  readonly executionContract?: "algorithm-dispatch/v2";
  readonly suite: MatrixSuite;
  readonly suiteDigest: string;
  readonly source: MatrixSource;
  readonly sourceDigest: string;
  readonly environment: MatrixEnvironment;
  readonly environmentDigest: string;
  readonly harness: MatrixHarnessIdentity;
  readonly harnessDigest: string;
  readonly policy: MatrixSamplePolicy;
  readonly policyDigest: string;
  readonly limits: MatrixLimits;
  readonly limitsDigest: string;
  readonly legacyEvidence: MatrixLegacyEvidence | null;
  readonly blocks: readonly MatrixComparisonBlock[];
}

export interface MatrixCompletedInvocation {
  readonly invocationId: string;
  readonly layout: VariantId;
  readonly processRound: number;
  readonly orderIndex: number;
  readonly status: "completed";
  readonly pid: number;
  readonly executable: string;
  readonly execArgv: readonly string[];
  readonly node: string;
  readonly v8: string;
  readonly nodeOptions: string;
  readonly warmupSamples: number;
  readonly samples: readonly { readonly sampleIndex: number; readonly durationNs: number }[];
  readonly correctness: BenchmarkCorrectness;
  readonly operation?: MatrixOperation;
  readonly algorithmId?: string;
  readonly semanticScopeId?: string;
  readonly diagnostics?: DensityNeighborSearchDiagnostics;
}

export interface MatrixIncompleteInvocation {
  readonly invocationId: string;
  readonly layout: VariantId;
  readonly processRound: number;
  readonly orderIndex: number;
  readonly status: Exclude<MatrixTerminalStatus, "completed">;
  readonly reason: string;
  readonly elapsedMs: number;
}

export type MatrixInvocationResult = MatrixCompletedInvocation | MatrixIncompleteInvocation;

export interface MatrixParityReference {
  readonly strategy: "every-tick-and-direct-phase/v1";
  readonly operation: MatrixOperation;
  readonly algorithmId?: string;
  readonly semanticScopeId?: string;
  readonly checkpoints: number;
  readonly finalSnapshotDigest: string;
  readonly diagnostics?: {
    readonly activeCount: number;
    readonly acceptedPairs: number;
    readonly pairFingerprintXor: number;
    readonly pairFingerprintSum: number;
  };
}

export interface MatrixShard {
  readonly format: typeof MATRIX_SHARD_FORMAT;
  readonly manifestSha256: string;
  readonly manifestId: string;
  readonly suiteDigest: string;
  readonly sourceDigest: string;
  readonly environmentDigest: string;
  readonly harnessDigest: string;
  readonly policyDigest: string;
  readonly limitsDigest: string;
  readonly blockId: string;
  readonly attemptIndex: number;
  readonly previousShardSha256: string | null;
  readonly blockDigest: string;
  readonly workloadDigest: string;
  readonly operation: MatrixOperation;
  readonly algorithmId: string;
  readonly status: MatrixTerminalStatus;
  readonly parity: MatrixParityReference | null;
  readonly invocations: readonly MatrixInvocationResult[];
}

export interface MatrixProcessSummary {
  readonly invocationId: string;
  readonly processRound: number;
  readonly statistics: BenchmarkStatistics;
}

export interface MatrixLayoutSummary {
  readonly blockId: string;
  readonly pointIds: readonly string[];
  readonly operation: MatrixOperation;
  readonly algorithmId: string;
  readonly scopeId: string;
  readonly semanticScopeId?: string;
  readonly layout: VariantId;
  readonly operationsPerSample: number;
  readonly perProcess: readonly MatrixProcessSummary[];
  readonly pooled: BenchmarkStatistics;
  readonly correctness: BenchmarkCorrectness;
  readonly diagnostics?: DensityNeighborSearchDiagnostics;
}

export interface MatrixAlgorithmRatio {
  readonly pointId: string;
  readonly operation: "neighbor-pairs";
  readonly semanticScopeId: string;
  readonly layout: VariantId;
  readonly numeratorAlgorithmId: string;
  readonly denominatorAlgorithmId: string;
  readonly medianRatio: number;
  readonly processRoundRatios: readonly number[];
}

export interface MatrixGrowthSeries {
  readonly family: string;
  readonly operation: "neighbor-pairs";
  readonly algorithmId: string;
  readonly semanticScopeId: string;
  readonly layout: VariantId;
  readonly metric: "distance-checks" | "structural-total" | "timing";
  readonly expectedExponent: 1 | 2;
  readonly pointIds: readonly string[];
  readonly xValues: readonly number[];
  readonly values: readonly number[];
  /** Full-range descriptive fit across every checked-in point. */
  readonly logLogOls: MatrixOlsFit | null;
  /**
   * Fit used by conformance. Structural series use the declared largest-n tail
   * so known lower-order setup terms do not masquerade as an asymptotic defect;
   * timing retains the full-range fit.
   */
  readonly assessmentPointIds: readonly string[];
  readonly assessmentLogLogOls: MatrixOlsFit | null;
  readonly maximumRoundRelativeSpread?: number;
}

export interface MatrixGrowthAssessment {
  readonly family: string;
  readonly algorithmId: string;
  readonly layout: VariantId;
  readonly dimension: "structural" | "timing";
  readonly status: "consistent" | "audit-required" | "inconclusive";
  readonly expectedExponent: 1 | 2;
  readonly observedExponent: number | null;
  readonly rSquared: number | null;
  readonly reasons: readonly string[];
}

export interface MatrixGrowthTolerance {
  readonly id: "density/spatial-growth-tolerance/v1";
  readonly structuralExponentAbsoluteError: number;
  readonly structuralAssessmentTailPointCount: number;
  readonly structuralMinimumTotalPointCount: number;
  readonly structuralMinimumTailInputSpan: number;
  readonly timingExponentAbsoluteError: number;
  readonly timingMinimumRSquared: number;
  readonly timingMinimumPointCount: number;
  readonly timingMinimumInputSpan: number;
  readonly timingMaximumRoundRelativeSpread: number;
}

export interface MatrixRatio {
  readonly pointId: string;
  readonly operation: MatrixOperation;
  readonly algorithmId: string;
  readonly scopeId: string;
  readonly numeratorLayout: VariantId;
  readonly denominatorLayout: VariantId;
  readonly medianRatio: number;
  readonly processRoundRatios: readonly number[];
}

export interface MatrixAdjacentSlope {
  readonly lowerPointId: string;
  readonly upperPointId: string;
  readonly lowerX: number;
  readonly upperX: number;
  readonly alpha: number;
}

export interface MatrixOlsFit {
  readonly slope: number;
  readonly rSquared: number;
  readonly pointCount: number;
}

export interface MatrixCrossoverBracket {
  readonly family: string;
  readonly factorName: string;
  readonly operation: MatrixOperation;
  readonly algorithmId: string;
  readonly scopeId: string;
  readonly numeratorLayout: VariantId;
  readonly denominatorLayout: VariantId;
  readonly lowerPointId: string;
  readonly upperPointId: string;
  readonly lowerX: number;
  readonly upperX: number;
  readonly lowerWinner: VariantId;
  readonly upperWinner: VariantId;
  readonly practicalThreshold: number;
}

export interface MatrixSeriesAnalysis {
  readonly family: string;
  readonly factorName: string;
  readonly factorKind: "numeric" | "categorical";
  readonly operation: MatrixOperation;
  readonly algorithmId: string;
  readonly scopeId: string;
  readonly layout: VariantId;
  readonly pointIds: readonly string[];
  readonly xValues: readonly (number | string)[];
  readonly pooledMediansNsPerOperation: readonly number[];
  readonly adjacentSlopes: readonly MatrixAdjacentSlope[];
  readonly logLogOls: MatrixOlsFit | null;
}

export interface MatrixAggregate {
  readonly format: typeof MATRIX_AGGREGATE_FORMAT;
  readonly generatedAt: string;
  readonly manifestSha256: string;
  readonly manifestId: string;
  readonly suiteDigest: string;
  readonly sourceDigest: string;
  readonly environmentDigest: string;
  readonly harnessDigest: string;
  readonly policyDigest: string;
  readonly shardReferences: readonly {
    readonly blockId: string;
    readonly attemptIndex: number;
    readonly path: string;
    readonly sha256: string;
    readonly status: MatrixTerminalStatus;
  }[];
  readonly summaries: readonly MatrixLayoutSummary[];
  readonly ratios: readonly MatrixRatio[];
  readonly series: readonly MatrixSeriesAnalysis[];
  readonly crossovers: readonly MatrixCrossoverBracket[];
  /** Present only for the dispatch-aware spatial-index suite. */
  readonly algorithmRatios?: readonly MatrixAlgorithmRatio[];
  readonly growthSeries?: readonly MatrixGrowthSeries[];
  readonly growthAssessments?: readonly MatrixGrowthAssessment[];
  readonly growthTolerance?: MatrixGrowthTolerance;
  readonly ratioLimitations?: readonly string[];
  readonly claimEligibility: {
    readonly policy: typeof MATRIX_CLAIM_POLICY;
    readonly eligible: boolean;
    readonly reasons: readonly string[];
  };
}
