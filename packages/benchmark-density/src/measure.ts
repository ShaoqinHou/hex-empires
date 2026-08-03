import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  canonicalDigest,
  canonicalStringify,
  executeReplay,
  NamedRandomStreams,
  Simulation,
} from "@hex-empires/kernel";
import {
  densityBaselineWorkload,
  densityReplayFixture,
  hybridDensityVariant,
  objectDensityVariant,
  soaDensityVariant,
} from "@hex-empires/scenario-density";
import type {
  DensityCommand,
  DensityGridPreparation,
  DensityNeighborSearchDiagnostics,
  DensityProfile,
  DensityScenario,
  DensitySnapshot,
  DensityVariant,
  DensityWorkload,
} from "@hex-empires/scenario-density";

import {
  MATRIX_BRUTE_NEIGHBOR_ALGORITHM,
  MATRIX_GRID_NEIGHBOR_ALGORITHM,
  MATRIX_NEIGHBOR_SEMANTIC_SCOPE,
  getMatrixAlgorithmSpec,
  type MatrixOperation,
} from "./matrix-algorithms.js";

import { collectBenchmarkEnvironment, collectBenchmarkSource } from "./environment.js";
import {
  BENCHMARK_CASE_SPECS,
  BENCHMARK_OPERATIONS,
  BENCHMARK_REPORT_FORMAT,
  BENCHMARK_VARIANTS,
  assessDensityClaimEligibility,
  benchmarkCaseKey,
  summarizeDurations,
  validateBenchmarkReport,
  type BenchmarkCaseResult,
  type BenchmarkCorrectness,
  type BenchmarkEnvironment,
  type BenchmarkOperation,
  type BenchmarkProcessResult,
  type BenchmarkSource,
  type DensityBenchmarkReport,
  type VariantId,
} from "./report.js";

interface DirectSession {
  readonly world: unknown;
  readonly churnRandom: ReturnType<NamedRandomStreams["stream"]>;
}

interface RuntimeVariant {
  readonly id: VariantId;
  readonly storage: VariantId;
  readonly scenarioId: string;
  readonly schemaVersion: number;
  readonly scenario: DensityScenario<unknown>;
  createDirect(workload: DensityWorkload, profile: DensityProfile): DirectSession;
  update(session: DirectSession): void;
  churn(session: DirectSession): { readonly despawned: number; readonly spawned: number };
  neighborhoodAllPairs(session: DirectSession): number;
  prepareNeighborPairsAllPairs(session: DirectSession): { readonly particleCapacity: number };
  diagnoseNeighborPairsAllPairs(session: DirectSession): DensityNeighborSearchDiagnostics;
  prepareNeighborPairsUniformGrid(session: DirectSession): DensityGridPreparation;
  diagnoseNeighborPairsUniformGrid(session: DirectSession): DensityNeighborSearchDiagnostics;
  materializeSnapshot(session: DirectSession): DensitySnapshot;
}

export interface CellWorkerRequest {
  readonly workload: DensityWorkload;
  readonly operation: MatrixOperation;
  /** Required by dispatch-aware matrix plans; omitted by the legacy v2 report host. */
  readonly algorithmId?: string;
  readonly variantId: VariantId;
  readonly warmupSamples: number;
  readonly measuredSamples: number;
}

export interface CellWorkerResponse {
  readonly pid: number;
  readonly executable: string;
  readonly execArgv: readonly string[];
  readonly node: string;
  readonly v8: string;
  readonly warmupSamples: number;
  readonly samples: readonly { readonly sampleIndex: number; readonly durationNs: number }[];
  readonly correctness: BenchmarkCorrectness;
  /** Dispatch identity and timer-free evidence are present only for matrix algorithm dispatch. */
  readonly operation?: MatrixOperation;
  readonly algorithmId?: string;
  readonly semanticScopeId?: string;
  readonly diagnostics?: DensityNeighborSearchDiagnostics;
}

export interface DensityBenchmarkOptions {
  readonly workload?: DensityWorkload | undefined;
  readonly processRounds?: number | undefined;
  readonly warmupSamplesPerProcess?: number | undefined;
  readonly measuredSamplesPerProcess?: number | undefined;
  readonly operations?: readonly BenchmarkOperation[] | undefined;
  readonly variantIds?: readonly VariantId[] | undefined;
  readonly source?: BenchmarkSource | undefined;
  readonly environment?: BenchmarkEnvironment | undefined;
  readonly generatedAt?: string | undefined;
  /** Test seam; production callers use a fresh child process for every invocation. */
  readonly processRunner?: ((request: CellWorkerRequest) => CellWorkerResponse) | undefined;
}

interface SampleResult {
  readonly durationNs: number;
  readonly correctness: BenchmarkCorrectness;
  readonly diagnostics?: DensityNeighborSearchDiagnostics;
}

function runtimeVariant<World>(variant: DensityVariant<World>): RuntimeVariant {
  const scenario = variant.scenario;
  return {
    id: variant.id,
    storage: variant.storage,
    scenarioId: scenario.id,
    schemaVersion: scenario.schemaVersion,
    scenario: scenario as DensityScenario<unknown>,
    createDirect(workload, profile) {
      const random = new NamedRandomStreams(workload.seed);
      let world = scenario.createWorld({ runSeed: workload.seed, random });
      const command: DensityCommand = { kind: "configure", profile, workload };
      const context = { tick: 0, sequence: 0, random } as const;
      scenario.validateCommand(world, command, context);
      const replacement = scenario.applyCommand(world, command, context);
      if (replacement !== undefined) world = replacement;
      return { world, churnRandom: random.stream("density-churn") };
    },
    update(session) {
      variant.operations.update(session.world as World);
    },
    churn(session) {
      return variant.operations.churn(session.world as World, session.churnRandom);
    },
    neighborhoodAllPairs(session) {
      return variant.operations.countNeighborPairsAllPairs(session.world as World);
    },
    prepareNeighborPairsAllPairs(session) {
      return variant.operations.prepareNeighborPairsAllPairs(session.world as World);
    },
    diagnoseNeighborPairsAllPairs(session) {
      return variant.operations.diagnoseNeighborPairsAllPairs(session.world as World);
    },
    prepareNeighborPairsUniformGrid(session) {
      return variant.operations.prepareNeighborPairsUniformGrid(session.world as World);
    },
    diagnoseNeighborPairsUniformGrid(session) {
      return variant.operations.diagnoseNeighborPairsUniformGrid(session.world as World);
    },
    materializeSnapshot(session) {
      return variant.operations.materializeSnapshot(session.world as World);
    },
  };
}

const variants: readonly RuntimeVariant[] = [
  runtimeVariant(objectDensityVariant),
  runtimeVariant(soaDensityVariant),
  runtimeVariant(hybridDensityVariant),
];

function requireCount(value: number, label: string, minimum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum) {
    throw new Error(`${label} must be a safe integer of at least ${minimum}`);
  }
}

function selectedValues<Value extends string>(
  requested: readonly Value[] | undefined,
  available: readonly Value[],
  label: string,
): readonly Value[] {
  if (requested === undefined) return available;
  if (requested.length === 0) throw new Error(`${label} selection must not be empty`);
  for (const value of requested) {
    if (!available.includes(value)) throw new Error(`unknown ${label}: ${value}`);
  }
  return [...new Set(requested)];
}

function elapsedNanoseconds(start: bigint): number {
  const value = Number(process.hrtime.bigint() - start);
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("timer produced an unsafe duration");
  return value;
}

function snapshotCorrectness(snapshot: DensitySnapshot, evidenceDigest: string | null = null): BenchmarkCorrectness {
  const canonicalSnapshot = canonicalStringify(snapshot);
  return {
    snapshotDigest: canonicalDigest(snapshot),
    canonicalSnapshotBytes: Buffer.byteLength(canonicalSnapshot, "utf8"),
    evidenceDigest,
  };
}

function sameCorrectness(left: BenchmarkCorrectness, right: BenchmarkCorrectness): boolean {
  return (
    left.snapshotDigest === right.snapshotDigest &&
    left.canonicalSnapshotBytes === right.canonicalSnapshotBytes &&
    left.evidenceDigest === right.evidenceDigest
  );
}

function assertChurnResult(workload: DensityWorkload, result: ReturnType<RuntimeVariant["churn"]>): void {
  if (result.despawned !== workload.churn.despawnPerTick || result.spawned !== workload.churn.spawnPerTick) {
    throw new Error(
      `direct churn fulfilled ${result.despawned}/${workload.churn.despawnPerTick} despawns and ` +
        `${result.spawned}/${workload.churn.spawnPerTick} spawns`,
    );
  }
}

function runCompositeDirectTick(variant: RuntimeVariant, session: DirectSession, workload: DensityWorkload): void {
  assertChurnResult(workload, variant.churn(session));
  variant.update(session);
  variant.neighborhoodAllPairs(session);
}

function prepareCompletedDirect(
  variant: RuntimeVariant,
  workload: DensityWorkload,
  profile: "snapshot",
): DirectSession {
  const session = variant.createDirect(workload, profile);
  for (let tick = 0; tick < workload.ticks[profile]; tick += 1) {
    runCompositeDirectTick(variant, session, workload);
  }
  return session;
}

function prepareCompletedSimulation(
  variant: RuntimeVariant,
  workload: DensityWorkload,
  profile: "snapshot",
): Simulation<unknown, DensityCommand, DensitySnapshot> {
  const simulation = new Simulation(variant.scenario, workload.seed);
  simulation.enqueueAll(densityReplayFixture(workload, profile).commands);
  simulation.runTicks(workload.ticks[profile] + 1);
  return simulation;
}

function operationCount(workload: DensityWorkload, operation: BenchmarkOperation): number {
  if (operation === "update") return workload.ticks.update;
  if (operation === "neighborhood-all-pairs") return workload.ticks["neighborhood-all-pairs"];
  if (operation === "churn") return workload.ticks.churn;
  return 1;
}

function sameDiagnostics(
  left: DensityNeighborSearchDiagnostics | undefined,
  right: DensityNeighborSearchDiagnostics | undefined,
): boolean {
  return canonicalDigest(left ?? null) === canonicalDigest(right ?? null);
}

function measureOne(
  variant: RuntimeVariant,
  workload: DensityWorkload,
  operation: MatrixOperation,
  algorithmId?: string,
): SampleResult {
  if (operation === "replay") {
    const fixture = densityReplayFixture(workload, "replay");
    const start = process.hrtime.bigint();
    const evidence = executeReplay({ scenario: variant.scenario, ...fixture });
    return {
      durationNs: elapsedNanoseconds(start),
      correctness: {
        snapshotDigest: evidence.snapshotDigest,
        canonicalSnapshotBytes: Buffer.byteLength(evidence.canonicalSnapshot, "utf8"),
        evidenceDigest: evidence.evidenceDigest,
      },
    };
  }
  if (operation === "capture") {
    const simulation = prepareCompletedSimulation(variant, workload, "snapshot");
    const start = process.hrtime.bigint();
    const capture = simulation.capture();
    return {
      durationNs: elapsedNanoseconds(start),
      correctness: {
        snapshotDigest: capture.snapshotDigest,
        canonicalSnapshotBytes: Buffer.byteLength(capture.canonicalSnapshot, "utf8"),
        evidenceDigest: null,
      },
    };
  }
  if (operation === "snapshot-materialization") {
    const session = prepareCompletedDirect(variant, workload, "snapshot");
    const start = process.hrtime.bigint();
    const snapshot = variant.materializeSnapshot(session);
    return { durationNs: elapsedNanoseconds(start), correctness: snapshotCorrectness(snapshot) };
  }

  const profile: DensityProfile = operation === "neighbor-pairs" ? "neighborhood-all-pairs" : operation;
  const session = variant.createDirect(workload, profile);
  const repetitions = operationCount(workload, profile);
  let start: bigint;
  if (operation === "update") {
    start = process.hrtime.bigint();
    for (let index = 0; index < repetitions; index += 1) variant.update(session);
  } else if (operation === "neighborhood-all-pairs") {
    start = process.hrtime.bigint();
    for (let index = 0; index < repetitions; index += 1) variant.neighborhoodAllPairs(session);
  } else if (operation === "neighbor-pairs") {
    if (algorithmId === MATRIX_BRUTE_NEIGHBOR_ALGORITHM) variant.prepareNeighborPairsAllPairs(session);
    else variant.prepareNeighborPairsUniformGrid(session);
    let diagnostics: DensityNeighborSearchDiagnostics | undefined;
    start = process.hrtime.bigint();
    for (let index = 0; index < repetitions; index += 1) {
      diagnostics = algorithmId === MATRIX_BRUTE_NEIGHBOR_ALGORITHM
        ? variant.diagnoseNeighborPairsAllPairs(session)
        : variant.diagnoseNeighborPairsUniformGrid(session);
    }
    const durationNs = elapsedNanoseconds(start);
    return {
      durationNs,
      correctness: snapshotCorrectness(variant.materializeSnapshot(session)),
      diagnostics: diagnostics!,
    };
  } else {
    start = process.hrtime.bigint();
    for (let index = 0; index < repetitions; index += 1) {
      assertChurnResult(workload, variant.churn(session));
    }
  }
  const durationNs = elapsedNanoseconds(start);
  return { durationNs, correctness: snapshotCorrectness(variant.materializeSnapshot(session)) };
}

export function measureBenchmarkCell(request: CellWorkerRequest): CellWorkerResponse {
  requireCount(request.warmupSamples, "warmupSamples", 0);
  requireCount(request.measuredSamples, "measuredSamples", 1);
  const variant = variants.find((candidate) => candidate.id === request.variantId);
  if (variant === undefined) throw new Error(`unknown variant: ${request.variantId}`);
  const algorithmSpec = request.algorithmId === undefined
    ? undefined
    : getMatrixAlgorithmSpec(request.operation, request.algorithmId);
  if (request.operation === "neighbor-pairs" && algorithmSpec === undefined) {
    throw new Error("neighbor-pairs requires an algorithmId");
  }
  if (request.operation !== "neighbor-pairs" && !BENCHMARK_OPERATIONS.includes(request.operation)) {
    throw new Error(`unknown operation: ${request.operation}`);
  }

  let expected: BenchmarkCorrectness | undefined;
  let expectedDiagnostics: DensityNeighborSearchDiagnostics | undefined;
  for (let index = 0; index < request.warmupSamples; index += 1) {
    const sample = measureOne(variant, request.workload, request.operation, request.algorithmId);
    expected ??= sample.correctness;
    if (!sameCorrectness(expected, sample.correctness)) throw new Error("warmup correctness changed within one process");
    expectedDiagnostics ??= sample.diagnostics;
    if (!sameDiagnostics(expectedDiagnostics, sample.diagnostics)) throw new Error("warmup diagnostics changed within one process");
  }
  const samples: { sampleIndex: number; durationNs: number }[] = [];
  for (let sampleIndex = 0; sampleIndex < request.measuredSamples; sampleIndex += 1) {
    const sample = measureOne(variant, request.workload, request.operation, request.algorithmId);
    expected ??= sample.correctness;
    if (!sameCorrectness(expected, sample.correctness)) throw new Error("measured correctness changed within one process");
    expectedDiagnostics ??= sample.diagnostics;
    if (!sameDiagnostics(expectedDiagnostics, sample.diagnostics)) throw new Error("measured diagnostics changed within one process");
    samples.push({ sampleIndex, durationNs: sample.durationNs });
  }
  return {
    pid: process.pid,
    executable: process.execPath,
    execArgv: process.execArgv,
    node: process.version,
    v8: process.versions.v8,
    warmupSamples: request.warmupSamples,
    samples,
    correctness: expected!,
    ...(algorithmSpec === undefined ? {} : {
      operation: request.operation,
      algorithmId: algorithmSpec.algorithmId,
      semanticScopeId: algorithmSpec.semanticScopeId,
      ...(expectedDiagnostics === undefined ? {} : { diagnostics: expectedDiagnostics }),
    }),
  };
}

function runCellInFreshProcess(request: CellWorkerRequest): CellWorkerResponse {
  const workerPath = fileURLToPath(new URL("./worker.js", import.meta.url));
  const child = spawnSync(process.execPath, [workerPath], {
    cwd: process.cwd(),
    input: JSON.stringify(request),
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
  });
  if (child.error !== undefined) throw child.error;
  if (child.status !== 0) {
    throw new Error(`benchmark child failed (${child.status ?? "signal"}): ${child.stderr.trim()}`);
  }
  try {
    return JSON.parse(child.stdout) as CellWorkerResponse;
  } catch (cause) {
    throw new Error("benchmark child emitted invalid JSON", { cause });
  }
}

export function assertSnapshotParity(operation: BenchmarkOperation, digests: readonly string[]): void {
  const expected = digests[0];
  if (expected === undefined || digests.length !== variants.length || digests.some((digest) => digest !== expected)) {
    throw new Error(`cross-layout semantic parity failed for ${operation}`);
  }
}

function checkpointDirectSessions(operation: BenchmarkOperation, sessions: readonly DirectSession[]): string {
  const digests = variants.map((variant, index) =>
    canonicalDigest(variant.materializeSnapshot(sessions[index]!)),
  );
  assertSnapshotParity(operation, digests);
  return digests[0]!;
}

function proveDirectParity(workload: DensityWorkload, operation: "update" | "neighborhood-all-pairs" | "churn") {
  const sessions = variants.map((variant) => variant.createDirect(workload, operation));
  let digest = checkpointDirectSessions(operation, sessions);
  let checkpoints = 1;
  const repetitions = operationCount(workload, operation);
  for (let index = 0; index < repetitions; index += 1) {
    variants.forEach((variant, variantIndex) => {
      const session = sessions[variantIndex]!;
      if (operation === "update") variant.update(session);
      else if (operation === "neighborhood-all-pairs") variant.neighborhoodAllPairs(session);
      else assertChurnResult(workload, variant.churn(session));
    });
    digest = checkpointDirectSessions(operation, sessions);
    checkpoints += 1;
  }
  return { operation, checkpoints, finalSnapshotDigest: digest } as const;
}

function proveSnapshotMaterializationParity(workload: DensityWorkload) {
  const operation = "snapshot-materialization" as const;
  const sessions = variants.map((variant) => variant.createDirect(workload, "snapshot"));
  let digest = checkpointDirectSessions(operation, sessions);
  let checkpoints = 1;
  for (let tick = 0; tick < workload.ticks.snapshot; tick += 1) {
    variants.forEach((variant, index) => assertChurnResult(workload, variant.churn(sessions[index]!)));
    digest = checkpointDirectSessions(operation, sessions);
    checkpoints += 1;
    variants.forEach((variant, index) => variant.update(sessions[index]!));
    digest = checkpointDirectSessions(operation, sessions);
    checkpoints += 1;
    variants.forEach((variant, index) => variant.neighborhoodAllPairs(sessions[index]!));
    digest = checkpointDirectSessions(operation, sessions);
    checkpoints += 1;
  }
  return { operation, checkpoints, finalSnapshotDigest: digest } as const;
}

function proveSimulationParity(workload: DensityWorkload, operation: "capture" | "replay") {
  const profile: DensityProfile = operation === "capture" ? "snapshot" : "replay";
  const fixture = densityReplayFixture(workload, profile);
  const simulations = variants.map((variant) => {
    const simulation = new Simulation(variant.scenario, workload.seed);
    simulation.enqueueAll(fixture.commands);
    return simulation;
  });
  let digest = "";
  for (let tick = 0; tick < fixture.tickCount; tick += 1) {
    const captures = simulations.map((simulation) => {
      simulation.runTicks(1);
      return simulation.capture();
    });
    assertSnapshotParity(operation, captures.map((capture) => capture.snapshotDigest));
    digest = captures[0]!.snapshotDigest;
  }
  if (operation === "replay") {
    const evidence = variants.map((variant) => executeReplay({ scenario: variant.scenario, ...fixture }));
    assertSnapshotParity(operation, evidence.map((entry) => entry.snapshotDigest));
    digest = evidence[0]!.snapshotDigest;
  }
  return { operation, checkpoints: fixture.tickCount + (operation === "replay" ? 1 : 0), finalSnapshotDigest: digest } as const;
}

export function proveBenchmarkParity(workload: DensityWorkload, operations: readonly BenchmarkOperation[]) {
  return operations.map((operation) => {
    if (operation === "update" || operation === "neighborhood-all-pairs" || operation === "churn") {
      return proveDirectParity(workload, operation);
    }
    if (operation === "snapshot-materialization") return proveSnapshotMaterializationParity(workload);
    return proveSimulationParity(workload, operation);
  });
}

export interface NeighborParityEvidence {
  readonly algorithmId: string;
  readonly semanticScopeId: typeof MATRIX_NEIGHBOR_SEMANTIC_SCOPE;
  readonly checkpoints: number;
  readonly finalSnapshotDigest: string;
  readonly diagnostics: {
    readonly activeCount: number;
    readonly acceptedPairs: number;
    readonly pairFingerprintXor: number;
    readonly pairFingerprintSum: number;
  };
}

export function assertNeighborDiagnosticsParity(
  reference: DensityNeighborSearchDiagnostics,
  candidate: DensityNeighborSearchDiagnostics,
  label = "neighbor-pairs",
): void {
  for (const field of ["activeCount", "acceptedPairs", "pairFingerprintXor", "pairFingerprintSum"] as const) {
    if (candidate[field] !== reference[field]) {
      throw new Error(`${label} parity mismatch for ${field}: ${candidate[field]} != ${reference[field]}`);
    }
  }
}

/**
 * Proves the selected implementation against the brute oracle independently in
 * every layout, then proves the oracle result and snapshot agree across layouts.
 */
export function proveNeighborAlgorithmParity(
  workload: DensityWorkload,
  algorithmId: string,
): NeighborParityEvidence & { readonly operation: "neighbor-pairs" } {
  const spec = getMatrixAlgorithmSpec("neighbor-pairs", algorithmId);
  const snapshots: string[] = [];
  const references: DensityNeighborSearchDiagnostics[] = [];
  for (const variant of variants) {
    const session = variant.createDirect(workload, "neighborhood-all-pairs");
    variant.prepareNeighborPairsAllPairs(session);
    const reference = variant.diagnoseNeighborPairsAllPairs(session);
    if (algorithmId === MATRIX_GRID_NEIGHBOR_ALGORITHM) variant.prepareNeighborPairsUniformGrid(session);
    const candidate = algorithmId === MATRIX_BRUTE_NEIGHBOR_ALGORITHM
      ? variant.diagnoseNeighborPairsAllPairs(session)
      : variant.diagnoseNeighborPairsUniformGrid(session);
    assertNeighborDiagnosticsParity(reference, candidate, `${variant.id}/${algorithmId}`);
    references.push(reference);
    snapshots.push(canonicalDigest(variant.materializeSnapshot(session)));
  }
  assertSnapshotParity("neighborhood-all-pairs", snapshots);
  for (const diagnostic of references.slice(1)) {
    assertNeighborDiagnosticsParity(references[0]!, diagnostic, `cross-layout/${algorithmId}`);
  }
  const reference = references[0]!;
  return {
    operation: "neighbor-pairs",
    algorithmId: spec.algorithmId,
    semanticScopeId: MATRIX_NEIGHBOR_SEMANTIC_SCOPE,
    checkpoints: 1,
    finalSnapshotDigest: snapshots[0]!,
    diagnostics: {
      activeCount: reference.activeCount,
      acceptedPairs: reference.acceptedPairs,
      pairFingerprintXor: reference.pairFingerprintXor,
      pairFingerprintSum: reference.pairFingerprintSum,
    },
  };
}

function classifyWorkload(workload: DensityWorkload): "smoke" | "baseline" | "custom" {
  if (canonicalDigest(workload) === canonicalDigest(densityBaselineWorkload)) return "baseline";
  return workload.id === "density-smoke-v1" ? "smoke" : "custom";
}

function roundCells(
  operations: readonly BenchmarkOperation[],
  variantIds: readonly VariantId[],
  processRound: number,
): readonly { readonly operation: BenchmarkOperation; readonly variantId: VariantId }[] {
  return operations.flatMap((operation, operationIndex) =>
    variantIds.map((_, offset) => ({
      operation,
      variantId: variantIds[(offset + operationIndex + processRound) % variantIds.length]!,
    })),
  );
}

export function runDensityBenchmark(options: DensityBenchmarkOptions = {}): DensityBenchmarkReport {
  const workload = options.workload ?? densityBaselineWorkload;
  const processRounds = options.processRounds ?? 3;
  const warmupSamplesPerProcess = options.warmupSamplesPerProcess ?? 5;
  const measuredSamplesPerProcess = options.measuredSamplesPerProcess ?? 10;
  requireCount(processRounds, "processRounds", 1);
  requireCount(warmupSamplesPerProcess, "warmupSamplesPerProcess", 0);
  requireCount(measuredSamplesPerProcess, "measuredSamplesPerProcess", 1);
  const operations = selectedValues(options.operations, BENCHMARK_OPERATIONS, "operation");
  const variantIds = selectedValues(options.variantIds, BENCHMARK_VARIANTS, "variant");
  const measuredVariants = variantIds.map((id) => variants.find((variant) => variant.id === id)!);
  const parityOperations = proveBenchmarkParity(workload, operations);
  const expectedDigests = new Map(parityOperations.map((entry) => [entry.operation, entry.finalSnapshotDigest]));
  const processRunner = options.processRunner ?? runCellInFreshProcess;
  const collected = new Map<string, BenchmarkProcessResult[]>();
  const roundOrder: { processRound: number; cells: string[] }[] = [];

  for (let processRound = 0; processRound < processRounds; processRound += 1) {
    const cells = roundCells(operations, variantIds, processRound);
    roundOrder.push({ processRound, cells: cells.map((cell) => benchmarkCaseKey(cell.operation, cell.variantId)) });
    for (const [orderIndex, cell] of cells.entries()) {
      const response = processRunner({
        workload,
        operation: cell.operation,
        variantId: cell.variantId,
        warmupSamples: warmupSamplesPerProcess,
        measuredSamples: measuredSamplesPerProcess,
      });
      if (response.correctness.snapshotDigest !== expectedDigests.get(cell.operation)) {
        throw new Error(`child correctness failed parity for ${benchmarkCaseKey(cell.operation, cell.variantId)}`);
      }
      const key = benchmarkCaseKey(cell.operation, cell.variantId);
      const results = collected.get(key) ?? [];
      results.push({ ...response, processRound, orderIndex });
      collected.set(key, results);
    }
  }

  const cases: BenchmarkCaseResult[] = [];
  for (const operation of operations) {
    for (const variant of measuredVariants) {
      const key = benchmarkCaseKey(operation, variant.id);
      const processes = collected.get(key);
      if (processes === undefined || processes.length === 0) throw new Error(`benchmark cell was not measured: ${key}`);
      const correctness = processes[0]!.correctness;
      if (processes.some((entry) => !sameCorrectness(entry.correctness, correctness))) {
        throw new Error(`correctness changed across process rounds for ${key}`);
      }
      const durations = processes.flatMap((entry) => entry.samples.map((sample) => sample.durationNs));
      const spec = BENCHMARK_CASE_SPECS[operation];
      const operationsPerSample = operationCount(workload, operation);
      cases.push({
        operation,
        scope: spec.scope,
        variant: {
          id: variant.id,
          storage: variant.storage,
          scenarioId: variant.scenarioId,
          schemaVersion: variant.schemaVersion,
        },
        operationsPerSample,
        operationUnit: spec.operationUnit,
        processes,
        statistics: summarizeDurations(durations, operationsPerSample),
        correctness,
      });
    }
  }

  const reportWithoutClaim: Omit<DensityBenchmarkReport, "claimEligibility"> = {
    format: BENCHMARK_REPORT_FORMAT,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    source: options.source ?? collectBenchmarkSource(),
    environment: options.environment ?? collectBenchmarkEnvironment(),
    harness: {
      timer: "process.hrtime.bigint",
      percentileMethod: "nearest-rank",
      processIsolation: "fresh-child-process-per-case-cell-per-round",
      processRounds,
      warmupSamplesPerProcess,
      measuredSamplesPerProcess,
      cellOrder: "operation-major-rotating-variant/v1",
      childInvocation: {
        executable: process.execPath,
        execArgv: [],
        protocol: "stdin-json-single-response/v1",
      },
      roundOrder,
    },
    workload: { classification: classifyWorkload(workload), digest: canonicalDigest(workload), definition: workload },
    parity: { strategy: "every-tick-and-direct-phase/v1", operations: parityOperations },
    cases,
  };
  const report: DensityBenchmarkReport = {
    ...reportWithoutClaim,
    claimEligibility: assessDensityClaimEligibility(reportWithoutClaim),
  };
  validateBenchmarkReport(report);
  return report;
}
