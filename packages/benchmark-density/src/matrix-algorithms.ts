import type { DensityWorkload } from "@hex-empires/scenario-density";

import {
  BENCHMARK_CASE_SPECS,
  type BenchmarkOperation,
  type BenchmarkOperationUnit,
  type BenchmarkScope,
} from "./report.js";

/** Matrix-only semantic operation. The legacy v2 report operation set remains unchanged. */
export type MatrixOperation = BenchmarkOperation | "neighbor-pairs";
export type MatrixOperationUnit = BenchmarkOperationUnit | "neighbor-pair-pass";

export const MATRIX_NEIGHBOR_SEMANTIC_SCOPE = "density/fixed-radius-unordered-neighbor-pairs/v1";
export const MATRIX_BRUTE_NEIGHBOR_ALGORITHM = "density/brute-force-neighbor-pairs/v1";
export const MATRIX_GRID_NEIGHBOR_ALGORITHM = "density/uniform-grid-csr-neighbor-pairs/v1";

export type MatrixGrowthFamily = "fixed-density" | "coincident";

export interface MatrixGrowthExpectation {
  readonly family: MatrixGrowthFamily;
  readonly structuralTheta: "n" | "n-squared";
  readonly expectedExponent: 1 | 2;
  readonly conditions: readonly string[];
}

export interface MatrixGrowthModel {
  readonly id: string;
  readonly theorem: string;
  readonly variables: readonly string[];
  readonly sourceReferences: readonly { readonly label: string; readonly url: string }[];
  readonly finiteRangeInterpretation: string;
  readonly structuralMetric: "distance-checks" | "structural-total";
  readonly worstCase: "theta-n-squared" | "theta-n-plus-c-plus-k";
  readonly expectations: readonly MatrixGrowthExpectation[];
}

export interface MatrixAlgorithmSpec {
  readonly operation: MatrixOperation;
  readonly algorithmId: string;
  readonly semanticScopeId: string;
  readonly operationUnit: MatrixOperationUnit;
  readonly scope: BenchmarkScope;
  readonly growthModel: MatrixGrowthModel | null;
}

const BRUTE_GROWTH_MODEL: MatrixGrowthModel = {
  id: "density/growth-model/brute-force/v1",
  theorem: "theta(n^2) unordered candidate comparisons",
  variables: ["n = active particles"],
  sourceReferences: [
    { label: "LAMMPS unbinned neighbor search", url: "https://docs.lammps.org/latest/Developer_notes.html" },
  ],
  finiteRangeInterpretation: "exact distance checks are n(n-1)/2; the full fit is descriptive and the largest three points gate the dominant term",
  structuralMetric: "distance-checks",
  worstCase: "theta-n-squared",
  expectations: [
    {
      family: "fixed-density",
      structuralTheta: "n-squared",
      expectedExponent: 2,
      conditions: ["all active unordered pairs are tested exactly once"],
    },
    {
      family: "coincident",
      structuralTheta: "n-squared",
      expectedExponent: 2,
      conditions: ["all active unordered pairs are tested exactly once"],
    },
  ],
};

const GRID_GROWTH_MODEL: MatrixGrowthModel = {
  id: "density/growth-model/uniform-grid-csr/v1",
  theorem: "theta(n + C + K) for fixed-radius all-particle reporting in fixed dimension",
  variables: [
    "n = active particles",
    "C = addressable dense-grid cells",
    "K = accepted unordered neighbor pairs",
  ],
  sourceReferences: [
    { label: "Bentley Stanat Williams fixed-radius reporting", url: "https://doi.org/10.1016/0020-0190(77)90070-9" },
    { label: "Welling Germano linked-cell analysis", url: "https://arxiv.org/abs/1006.1239" },
    { label: "LAMMPS binned neighbor lists", url: "https://docs.lammps.org/Developer_par_neigh.html" },
    { label: "HOOMD cell-list behavior", url: "https://hoomd-blue.readthedocs.io/en/v5.4.0/hoomd/md/nlist/cell.html" },
  ],
  finiteRangeInterpretation: "all five points remain visible; the largest three gate the dominant exponent so the fixed C term cannot falsely reject correct n-squared degeneration",
  structuralMetric: "structural-total",
  worstCase: "theta-n-plus-c-plus-k",
  expectations: [
    {
      family: "fixed-density",
      structuralTheta: "n",
      expectedExponent: 1,
      conditions: [
        "fixed radius and cell-size ratio",
        "area proportional to active n",
        "bounded expected cell occupancy",
        "uniform position family",
      ],
    },
    {
      family: "coincident",
      structuralTheta: "n-squared",
      expectedExponent: 2,
      conditions: ["K = n(n-1)/2 accepted pairs"],
    },
  ],
};

export const MATRIX_DEFAULT_ALGORITHM_IDS: Readonly<Record<BenchmarkOperation, string>> = {
  update: "density/direct-motion-update/v1",
  "neighborhood-all-pairs": "density/brute-force-all-pairs/v1",
  churn: "density/stable-slot-churn/v1",
  "snapshot-materialization": "density/sorted-snapshot-materialization/v1",
  capture: "kernel/canonical-full-capture/v1",
  replay: "kernel/execute-replay-end-to-end/v1",
};

const LEGACY_SPECS: readonly MatrixAlgorithmSpec[] = (
  Object.keys(MATRIX_DEFAULT_ALGORITHM_IDS) as BenchmarkOperation[]
).map((operation) => ({
  operation,
  algorithmId: MATRIX_DEFAULT_ALGORITHM_IDS[operation],
  semanticScopeId: BENCHMARK_CASE_SPECS[operation].scope.id,
  operationUnit: BENCHMARK_CASE_SPECS[operation].operationUnit,
  scope: BENCHMARK_CASE_SPECS[operation].scope,
  growthModel: operation === "neighborhood-all-pairs" ? BRUTE_GROWTH_MODEL : null,
}));

const NEIGHBOR_SPECS: readonly MatrixAlgorithmSpec[] = [
  {
    operation: "neighbor-pairs",
    algorithmId: MATRIX_BRUTE_NEIGHBOR_ALGORITHM,
    semanticScopeId: MATRIX_NEIGHBOR_SEMANTIC_SCOPE,
    operationUnit: "neighbor-pair-pass",
    scope: {
      id: "density/neighbor-pairs/brute-force-query/v1",
      timedPhases: [
        "active-slot-unordered-pair-query",
        "exact-fixed-radius-test",
        "accepted-pair-fingerprints",
      ],
      setupPhases: ["fresh-configured-world", "one-time-active-id-scratch-allocation"],
    },
    growthModel: BRUTE_GROWTH_MODEL,
  },
  {
    operation: "neighbor-pairs",
    algorithmId: MATRIX_GRID_NEIGHBOR_ALGORITHM,
    semanticScopeId: MATRIX_NEIGHBOR_SEMANTIC_SCOPE,
    operationUnit: "neighbor-pair-pass",
    scope: {
      id: "density/neighbor-pairs/uniform-grid-csr-build-query/v1",
      timedPhases: [
        "deterministic-reusable-grid-buffer-clear",
        "uniform-grid-csr-count-prefix-fill-rebuild",
        "fixed-half-stencil-query",
        "exact-fixed-radius-test",
        "accepted-pair-fingerprints",
      ],
      setupPhases: ["fresh-configured-world", "one-time-uniform-grid-scratch-allocation"],
    },
    growthModel: GRID_GROWTH_MODEL,
  },
];

export const MATRIX_ALGORITHM_REGISTRY: readonly MatrixAlgorithmSpec[] = [
  ...LEGACY_SPECS,
  ...NEIGHBOR_SPECS,
];

export function matrixAlgorithmKey(operation: MatrixOperation, algorithmId: string): string {
  return `${operation}\u0000${algorithmId}`;
}

const SPEC_BY_KEY = new Map(
  MATRIX_ALGORITHM_REGISTRY.map((spec) => [matrixAlgorithmKey(spec.operation, spec.algorithmId), spec]),
);

export function getMatrixAlgorithmSpec(
  operation: MatrixOperation,
  algorithmId: string,
): MatrixAlgorithmSpec {
  const spec = SPEC_BY_KEY.get(matrixAlgorithmKey(operation, algorithmId));
  if (spec !== undefined) return spec;
  if (MATRIX_ALGORITHM_REGISTRY.some((candidate) => candidate.algorithmId === algorithmId)) {
    throw new Error(`matrix algorithm is incompatible with operation: ${operation}/${algorithmId}`);
  }
  throw new Error(`unknown matrix algorithm: ${algorithmId}`);
}

export function defaultMatrixAlgorithmId(operation: BenchmarkOperation): string {
  return MATRIX_DEFAULT_ALGORITHM_IDS[operation];
}

export function matrixOperationsPerSample(workload: DensityWorkload, operation: MatrixOperation): number {
  if (operation === "update") return workload.ticks.update;
  if (operation === "neighborhood-all-pairs" || operation === "neighbor-pairs") {
    return workload.ticks["neighborhood-all-pairs"];
  }
  if (operation === "churn") return workload.ticks.churn;
  return 1;
}
