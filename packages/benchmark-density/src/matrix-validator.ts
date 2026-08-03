import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

import { canonicalDigest } from "@hex-empires/kernel";
import type { DensityNeighborSearchDiagnostics } from "@hex-empires/scenario-density";

import {
  MATRIX_BRUTE_NEIGHBOR_ALGORITHM,
  MATRIX_GRID_NEIGHBOR_ALGORITHM,
  getMatrixAlgorithmSpec,
  type MatrixOperation,
} from "./matrix-algorithms.js";

import {
  MATRIX_AGGREGATE_FORMAT,
  MATRIX_CLAIM_POLICY,
  MATRIX_LAYOUTS,
  MATRIX_MANIFEST_FORMAT,
  MATRIX_SHARD_FORMAT,
  MATRIX_TERMINAL_STATUSES,
  type MatrixAdjacentSlope,
  type MatrixAggregate,
  type MatrixAlgorithmRatio,
  type MatrixComparisonBlock,
  type MatrixCompletedInvocation,
  type MatrixCrossoverBracket,
  type MatrixInvocationResult,
  type MatrixLayoutSummary,
  type MatrixManifest,
  type MatrixOlsFit,
  type MatrixRatio,
  type MatrixSeriesAnalysis,
  type MatrixGrowthAssessment,
  type MatrixGrowthSeries,
  type MatrixGrowthTolerance,
  type MatrixShard,
} from "./matrix-contract.js";
import {
  assertMatrixOutputDirectory,
  assertExactMatrixShardMembership,
  createMatrixManifest,
  isSha256,
  loadMatrixManifest,
  operationsPerSample,
  replaceHashedJson,
  sha256File,
  verifyHashedFile,
} from "./matrix-runner.js";
import { createMatrixSuite, validateMatrixSuite } from "./matrix-suites.js";
import {
  BENCHMARK_CASE_SPECS,
  BENCHMARK_OPERATIONS,
  BENCHMARK_VARIANTS,
  summarizeDurations,
  validateBenchmarkReport,
  type BenchmarkCorrectness,
  type BenchmarkStatistics,
  type VariantId,
} from "./report.js";

interface ValidatedArtifacts {
  readonly manifest: MatrixManifest;
  readonly manifestSha256: string;
  readonly shards: readonly MatrixShard[];
  readonly shardSha256: ReadonlyMap<string, string>;
  readonly legacyEligible: boolean;
}

function sameDigest(left: unknown, right: unknown): boolean {
  return canonicalDigest(left) === canonicalDigest(right);
}

function requireRecord(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error(`${label} must be an object`);
  return value as Record<string, unknown>;
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) throw new Error(`${label} must be a non-empty string`);
  return value;
}

function requireInteger(value: unknown, label: string, minimum: number): number {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) throw new Error(`${label} must be a safe integer of at least ${minimum}`);
  return value as number;
}

function requireFinite(value: unknown, label: string, minimum = -Infinity): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) throw new Error(`${label} must be a finite number of at least ${minimum}`);
  return value;
}

function requireSha(value: unknown, label: string): string {
  const result = requireString(value, label);
  if (!isSha256(result)) throw new Error(`${label} must be a lowercase SHA-256 digest`);
  return result;
}

function sameSemanticCorrectness(left: BenchmarkCorrectness, right: BenchmarkCorrectness): boolean {
  return left.snapshotDigest === right.snapshotDigest && left.canonicalSnapshotBytes === right.canonicalSnapshotBytes;
}

export function validateMatrixCorrectnessEvidence(
  operation: MatrixOperation,
  paritySnapshotDigest: string,
  invocations: readonly MatrixCompletedInvocation[],
): void {
  if (invocations.length === 0) return;
  const semanticReference = invocations[0]!.correctness;
  const replayEvidenceByLayout = new Map<VariantId, string>();
  for (const invocation of invocations) {
    const correctness = invocation.correctness;
    if (correctness.snapshotDigest !== paritySnapshotDigest) {
      throw new Error(`matrix child correctness differs from parity reference: ${invocation.invocationId}`);
    }
    if (!sameSemanticCorrectness(correctness, semanticReference)) {
      throw new Error(`matrix cross-layout semantic correctness mismatch: ${invocation.invocationId}`);
    }
    if (operation === "replay") {
      if (correctness.evidenceDigest === null) throw new Error(`matrix replay is missing evidence digest: ${invocation.invocationId}`);
      const previous = replayEvidenceByLayout.get(invocation.layout);
      if (previous !== undefined && previous !== correctness.evidenceDigest) {
        throw new Error(`matrix replay evidence changed within layout ${invocation.layout}`);
      }
      replayEvidenceByLayout.set(invocation.layout, correctness.evidenceDigest);
    } else if (correctness.evidenceDigest !== null) {
      throw new Error(`matrix non-replay invocation must not claim replay evidence: ${invocation.invocationId}`);
    }
  }
}

function expectedCheckpoints(block: MatrixComparisonBlock): number {
  const workload = block.workload;
  if (block.operation === "update" || block.operation === "neighborhood-all-pairs" || block.operation === "churn") {
    return operationsPerSample(workload, block.operation) + 1;
  }
  if (block.operation === "snapshot-materialization") return workload.ticks.snapshot * 3 + 1;
  if (block.operation === "capture") return workload.ticks.snapshot + 1;
  if (block.operation === "neighbor-pairs") return 1;
  return workload.ticks.replay + 2;
}

function validateManifest(manifest: MatrixManifest, output: string): void {
  if (manifest.format !== MATRIX_MANIFEST_FORMAT) throw new Error("unsupported matrix manifest format");
  const date = new Date(manifest.issuedAt);
  if (Number.isNaN(date.valueOf()) || date.toISOString() !== manifest.issuedAt) throw new Error("matrix issuedAt must be a canonical ISO timestamp");
  validateMatrixSuite(manifest.suite);
  requireSha(manifest.suiteDigest, "matrix suite digest");
  requireSha(manifest.sourceDigest, "matrix source digest");
  requireSha(manifest.environmentDigest, "matrix environment digest");
  requireSha(manifest.harnessDigest, "matrix harness digest");
  requireSha(manifest.policyDigest, "matrix policy digest");
  requireSha(manifest.limitsDigest, "matrix limits digest");
  requireSha(manifest.source.worktreeStateSha256, "matrix worktree state digest");
  requireSha(manifest.environment.executableSha256, "matrix executable digest");
  if (typeof manifest.environment.nodeOptions !== "string") throw new Error("matrix NODE_OPTIONS contract must be a string");
  if (manifest.harness.format !== "simulation-playground/density-matrix-harness-identity/v1") throw new Error("unsupported matrix harness identity format");
  for (const file of manifest.harness.files) {
    if (file.path.includes("..") || isAbsolute(file.path)) throw new Error(`matrix harness path traversal: ${file.path}`);
    requireSha(file.sha256, `matrix harness ${file.role} digest`);
  }
  if (canonicalDigest(manifest.harness) !== manifest.harnessDigest) throw new Error("matrix harness digest mismatch");
  if (manifest.source.lockfile.path !== "package-lock.json") throw new Error("matrix lockfile path mismatch");
  requireSha(manifest.source.lockfile.sha256, "matrix lockfile digest");
  if (!sameDigest(manifest.suite, createMatrixSuite(manifest.suite.id))) {
    throw new Error("matrix suite differs from the checked-in suite definition");
  }
  const shardIds = new Set<string>();
  const invocationIds = new Set<string>();
  for (const block of manifest.blocks) {
    if (!/^block-[0-9a-f]{24}$/.test(block.id)) throw new Error(`unsafe matrix block id: ${block.id}`);
    if (shardIds.has(block.id)) throw new Error(`duplicate matrix block: ${block.id}`);
    shardIds.add(block.id);
    if (manifest.executionContract === "algorithm-dispatch/v2") {
      const spec = getMatrixAlgorithmSpec(block.operation, block.algorithmId);
      if (
        block.semanticScopeId !== spec.semanticScopeId ||
        block.operationUnit !== spec.operationUnit ||
        !sameDigest(block.scope, spec.scope) ||
        !sameDigest(block.growthModel, spec.growthModel)
      ) throw new Error(`matrix block algorithm contract mismatch: ${block.id}`);
    }
    if (block.shardPaths.length !== 3 || block.shardPath !== block.shardPaths[0]) throw new Error(`matrix shard attempt plan mismatch: ${block.id}`);
    for (const [attemptIndex, shardPath] of block.shardPaths.entries()) {
      if (shardPath !== `shards/${block.id}.attempt-${attemptIndex}.json` || shardPath.includes("..") || isAbsolute(shardPath)) {
        throw new Error(`matrix shard path traversal: ${shardPath}`);
      }
      const absolute = resolve(output, shardPath);
      const relation = relative(resolve(output, "shards"), absolute);
      if (relation.startsWith("..") || isAbsolute(relation)) throw new Error(`matrix shard escapes output: ${shardPath}`);
    }
    for (const invocation of block.invocations) {
      if (invocationIds.has(invocation.invocationId)) throw new Error(`duplicate matrix invocation id: ${invocation.invocationId}`);
      invocationIds.add(invocation.invocationId);
      if (invocation.attemptInvocationIds.length !== block.shardPaths.length) throw new Error(`matrix invocation attempt plan mismatch: ${invocation.invocationId}`);
      for (const attemptId of invocation.attemptInvocationIds) {
        if (invocationIds.has(attemptId)) throw new Error(`duplicate matrix invocation id: ${attemptId}`);
        invocationIds.add(attemptId);
      }
    }
  }
  const rebuilt = createMatrixManifest({
    suite: manifest.suite,
    source: manifest.source,
    environment: manifest.environment,
    harness: manifest.harness,
    policy: manifest.policy,
    limits: manifest.limits,
    issuedAt: manifest.issuedAt,
    legacyEvidence: manifest.legacyEvidence,
    executionContract: manifest.executionContract ?? "legacy-v1",
  });
  if (!sameDigest(rebuilt, manifest)) throw new Error("matrix manifest does not match its deterministic plan");
}

function validateCorrectness(value: unknown, label: string): BenchmarkCorrectness {
  const record = requireRecord(value, label);
  requireSha(record.snapshotDigest, `${label} snapshotDigest`);
  requireInteger(record.canonicalSnapshotBytes, `${label} canonicalSnapshotBytes`, 1);
  if (record.evidenceDigest !== null) requireSha(record.evidenceDigest, `${label} evidenceDigest`);
  return record as unknown as BenchmarkCorrectness;
}

const DIAGNOSTIC_INTEGER_FIELDS = [
  "activeCount",
  "addressableCells",
  "occupiedCells",
  "maximumOccupancy",
  "slotVisits",
  "cellVisits",
  "stencilVisits",
  "candidateVisits",
  "distanceChecks",
  "acceptedPairs",
  "totalStructuralWork",
  "pairFingerprintXor",
  "pairFingerprintSum",
] as const;

function validateNeighborDiagnostics(
  value: unknown,
  block: MatrixComparisonBlock,
  label: string,
): DensityNeighborSearchDiagnostics {
  const record = requireRecord(value, label);
  const expectedAlgorithm = block.algorithmId === MATRIX_BRUTE_NEIGHBOR_ALGORITHM ? "brute-force" : "uniform-grid";
  if (record.algorithm !== expectedAlgorithm) throw new Error(`${label} algorithm mismatch`);
  for (const field of DIAGNOSTIC_INTEGER_FIELDS) requireInteger(record[field], `${label} ${field}`, 0);
  const calculated = Number(record.slotVisits) + Number(record.cellVisits) + Number(record.stencilVisits) +
    Number(record.candidateVisits) + Number(record.distanceChecks);
  if (record.totalStructuralWork !== calculated) throw new Error(`${label} structural total mismatch`);
  if (record.activeCount !== block.workload.initialActive) throw new Error(`${label} active count mismatch`);
  const activeCount = block.workload.initialActive;
  const maximumPairs = activeCount * (activeCount - 1) / 2;
  if (Number(record.acceptedPairs) > maximumPairs) {
    throw new Error(`${label} accepted pair count is impossible`);
  }
  if (block.algorithmId === MATRIX_BRUTE_NEIGHBOR_ALGORITHM) {
    if (record.slotVisits !== block.workload.capacity || record.candidateVisits !== maximumPairs || record.distanceChecks !== maximumPairs) {
      throw new Error(`${label} brute-force structural identity mismatch`);
    }
    if (record.addressableCells !== 0 || record.occupiedCells !== 0 || record.maximumOccupancy !== 0 || record.cellVisits !== 0 || record.stencilVisits !== 0) {
      throw new Error(`${label} brute-force diagnostics contain grid work`);
    }
  } else {
    const cellWidth = Math.max(1, block.workload.neighborRadius);
    const cellsPerAxis = Math.floor((block.workload.coordinateLimit * 2) / cellWidth) + 1;
    const addressableCells = cellsPerAxis * cellsPerAxis;
    if (record.addressableCells !== addressableCells || record.slotVisits !== block.workload.capacity * 2 || record.stencilVisits !== activeCount * 9) {
      throw new Error(`${label} uniform-grid structural identity mismatch`);
    }
    if (block.workload.initialization.positions === "coincident") {
      const coincidentCell = Math.floor(block.workload.coordinateLimit / cellWidth);
      const validAxisCells = 1 + Number(coincidentCell > 0) + Number(coincidentCell + 1 < cellsPerAxis);
      const expectedCellVisits = addressableCells * 3 + activeCount * validAxisCells * validAxisCells;
      if (
        record.occupiedCells !== 1 ||
        record.maximumOccupancy !== activeCount ||
        record.cellVisits !== expectedCellVisits ||
        record.candidateVisits !== activeCount * activeCount ||
        record.distanceChecks !== maximumPairs ||
        record.acceptedPairs !== maximumPairs
      ) {
        throw new Error(`${label} coincident-grid n/C/K traversal identity mismatch`);
      }
    }
  }
  return record as unknown as DensityNeighborSearchDiagnostics;
}

function validateNeighborEvidence(
  block: MatrixComparisonBlock,
  parity: MatrixShard["parity"],
  invocations: readonly MatrixCompletedInvocation[],
): void {
  if (block.operation !== "neighbor-pairs") return;
  if (parity === null || parity.diagnostics === undefined) throw new Error(`matrix neighbor parity evidence is missing: ${block.id}`);
  const reference = parity.diagnostics;
  for (const field of ["activeCount", "acceptedPairs", "pairFingerprintXor", "pairFingerprintSum"] as const) {
    requireInteger(reference[field], `matrix parity ${field}`, 0);
  }
  let deterministicDigest: string | undefined;
  for (const invocation of invocations) {
    const diagnostics = validateNeighborDiagnostics(invocation.diagnostics, block, `matrix child diagnostics ${invocation.invocationId}`);
    for (const field of ["activeCount", "acceptedPairs", "pairFingerprintXor", "pairFingerprintSum"] as const) {
      if (diagnostics[field] !== reference[field]) throw new Error(`matrix neighbor parity fingerprint mismatch: ${invocation.invocationId}/${field}`);
    }
    const digest = canonicalDigest(diagnostics);
    deterministicDigest ??= digest;
    if (digest !== deterministicDigest) throw new Error(`matrix neighbor diagnostics changed across invocations: ${block.id}`);
  }
}

function validateCompletedInvocation(
  raw: Record<string, unknown>,
  block: MatrixComparisonBlock,
  manifest: MatrixManifest,
): MatrixCompletedInvocation {
  requireInteger(raw.pid, "matrix child pid", 1);
  if (raw.executable !== manifest.environment.executable) throw new Error("matrix child executable differs from manifest environment");
  if (raw.node !== manifest.environment.node || raw.v8 !== manifest.environment.v8) throw new Error("matrix child runtime differs from manifest environment");
  if (raw.nodeOptions !== manifest.environment.nodeOptions) throw new Error("matrix child NODE_OPTIONS differs from manifest environment");
  const expectedExecArgv = manifest.limits.v8HeapLimitMb === null ? [] : [`--max-old-space-size=${manifest.limits.v8HeapLimitMb}`];
  if (!Array.isArray(raw.execArgv) || !sameDigest(raw.execArgv, expectedExecArgv)) throw new Error("matrix child execArgv differs from policy");
  if (raw.warmupSamples !== manifest.policy.warmupSamplesPerProcess) throw new Error("matrix child warmup count mismatch");
  if (!Array.isArray(raw.samples) || raw.samples.length !== manifest.policy.measuredSamplesPerProcess) {
    throw new Error("matrix child measured sample count mismatch");
  }
  for (const [sampleIndex, sampleValue] of raw.samples.entries()) {
    const sample = requireRecord(sampleValue, `matrix sample ${sampleIndex}`);
    if (sample.sampleIndex !== sampleIndex) throw new Error("matrix sample indexes are not canonical");
    requireInteger(sample.durationNs, `matrix sample ${sampleIndex} duration`, 1);
  }
  const correctness = validateCorrectness(raw.correctness, "matrix child correctness");
  if (block.operation === "replay" && correctness.evidenceDigest === null) throw new Error("matrix replay is missing evidence digest");
  if (block.operation !== "replay" && correctness.evidenceDigest !== null) throw new Error("matrix non-replay invocation must not claim replay evidence");
  if (manifest.executionContract === "algorithm-dispatch/v2") {
    if (raw.operation !== block.operation || raw.algorithmId !== block.algorithmId || raw.semanticScopeId !== block.semanticScopeId) {
      throw new Error("matrix child algorithm identity mismatch");
    }
    if (block.operation === "neighbor-pairs") validateNeighborDiagnostics(raw.diagnostics, block, "matrix child diagnostics");
    else if (raw.diagnostics !== undefined) throw new Error("matrix non-neighbor invocation must not contain neighbor diagnostics");
  }
  return raw as unknown as MatrixCompletedInvocation;
}

function validateShard(
  shard: MatrixShard,
  block: MatrixComparisonBlock,
  manifest: MatrixManifest,
  manifestSha256: string,
  attemptIndex: number,
  previousShardSha256: string | null,
  pendingPlans: readonly MatrixComparisonBlock["invocations"][number][],
  previouslyCompleted: number,
): readonly MatrixComparisonBlock["invocations"][number][] {
  if (shard.format !== MATRIX_SHARD_FORMAT) throw new Error(`unsupported matrix shard format: ${block.id}`);
  for (const [label, actual, expected] of [
    ["manifest hash", shard.manifestSha256, manifestSha256],
    ["manifest id", shard.manifestId, manifest.manifestId],
    ["suite", shard.suiteDigest, manifest.suiteDigest],
    ["source", shard.sourceDigest, manifest.sourceDigest],
    ["environment", shard.environmentDigest, manifest.environmentDigest],
    ["harness", shard.harnessDigest, manifest.harnessDigest],
    ["policy", shard.policyDigest, manifest.policyDigest],
    ["limits", shard.limitsDigest, manifest.limitsDigest],
    ["block", shard.blockId, block.id],
    ["block digest", shard.blockDigest, block.deduplicationDigest],
    ["workload", shard.workloadDigest, block.workloadDigest],
    ["operation", shard.operation, block.operation],
    ["algorithm", shard.algorithmId, block.algorithmId],
  ] as const) {
    if (actual !== expected) throw new Error(`matrix shard ${label} mismatch: ${block.id}`);
  }
  if (shard.attemptIndex !== attemptIndex) throw new Error(`matrix shard attempt index mismatch: ${block.id}`);
  if (shard.previousShardSha256 !== previousShardSha256) throw new Error(`matrix shard continuation hash mismatch: ${block.id}`);
  if (!MATRIX_TERMINAL_STATUSES.includes(shard.status)) throw new Error(`invalid matrix shard status: ${block.id}`);
  if (!Array.isArray(shard.invocations) || shard.invocations.length !== pendingPlans.length) {
    throw new Error(`matrix shard invocation coverage mismatch: ${block.id}`);
  }
  const completed: MatrixCompletedInvocation[] = [];
  const completedPlans: MatrixComparisonBlock["invocations"][number][] = [];
  for (const [index, expected] of pendingPlans.entries()) {
    const raw = requireRecord(shard.invocations[index], `matrix invocation ${block.id}/${index}`);
    const expectedAttemptId = expected.attemptInvocationIds[attemptIndex];
    if (raw.invocationId !== expectedAttemptId || raw.layout !== expected.layout || raw.processRound !== expected.processRound || raw.orderIndex !== expected.orderIndex) {
      throw new Error(`matrix invocation does not match manifest: ${expectedAttemptId ?? expected.invocationId}`);
    }
    if (!MATRIX_TERMINAL_STATUSES.includes(raw.status as MatrixInvocationResult["status"])) {
      throw new Error(`invalid matrix invocation status: ${expected.invocationId}`);
    }
    if (raw.status === "completed") {
      completed.push(validateCompletedInvocation(raw, block, manifest));
      completedPlans.push(expected);
    } else {
      requireString(raw.reason, `matrix invocation ${expected.invocationId} reason`);
      requireFinite(raw.elapsedMs, `matrix invocation ${expected.invocationId} elapsedMs`, 0);
      if ("samples" in raw || "correctness" in raw) throw new Error("failed matrix invocation must not contain latency samples");
    }
  }
  const expectedStatus = previouslyCompleted + completed.length === block.invocations.length
    ? "completed"
    : (["resource-limit", "timeout", "failed", "not-run"] as const).find((status) => shard.invocations.some((entry) => entry.status === status)) ?? "failed";
  if (shard.status !== expectedStatus) throw new Error(`matrix shard terminal status is false: ${block.id}`);
  if (shard.parity === null) {
    if (completed.length > 0) throw new Error(`matrix shard has samples without parity: ${block.id}`);
  } else {
    if (shard.parity.strategy !== "every-tick-and-direct-phase/v1" || shard.parity.operation !== block.operation) {
      throw new Error(`matrix parity reference mismatch: ${block.id}`);
    }
    if (manifest.executionContract === "algorithm-dispatch/v2" && (
      shard.parity.algorithmId !== block.algorithmId ||
      shard.parity.semanticScopeId !== block.semanticScopeId
    )) throw new Error(`matrix parity algorithm identity mismatch: ${block.id}`);
    if (shard.parity.checkpoints !== expectedCheckpoints(block)) throw new Error(`matrix parity checkpoint count mismatch: ${block.id}`);
    requireSha(shard.parity.finalSnapshotDigest, `matrix parity digest ${block.id}`);
    validateMatrixCorrectnessEvidence(block.operation, shard.parity.finalSnapshotDigest, completed);
    validateNeighborEvidence(block, shard.parity, completed);
  }
  return completedPlans;
}

function loadValidatedArtifacts(outputDirectory: string): ValidatedArtifacts {
  const output = resolve(outputDirectory);
  assertMatrixOutputDirectory(output, false);
  const { manifest, manifestSha256 } = loadMatrixManifest(output);
  validateManifest(manifest, output);
  assertExactMatrixShardMembership(output, manifest);
  const shards: MatrixShard[] = [];
  const shardSha256 = new Map<string, string>();
  for (const block of manifest.blocks) {
    const completedIds = new Set<string>();
    const completedInvocations: MatrixCompletedInvocation[] = [];
    let previousDigest: string | null = null;
    let parityDigest: string | undefined;
    let paritySnapshotDigest: string | undefined;
    let foundAttempt = false;
    for (const [attemptIndex, shardPath] of block.shardPaths.entries()) {
      const path = resolve(output, shardPath);
      const exists = existsSync(path) || existsSync(`${path}.sha256`);
      if (!exists) {
        if (!foundAttempt) throw new Error(`missing matrix shard: ${block.id}`);
        if (block.shardPaths.slice(attemptIndex + 1).some((entry) => existsSync(resolve(output, entry)) || existsSync(`${resolve(output, entry)}.sha256`))) {
          throw new Error(`matrix continuation shard gap: ${block.id}/attempt-${attemptIndex}`);
        }
        break;
      }
      foundAttempt = true;
      const digest = verifyHashedFile(path);
      const shard = JSON.parse(readFileSync(path, "utf8")) as MatrixShard;
      const pending = block.invocations.filter((entry) => !completedIds.has(entry.invocationId));
      const completed = validateShard(shard, block, manifest, manifestSha256, attemptIndex, previousDigest, pending, completedIds.size);
      completedInvocations.push(...shard.invocations.filter((entry): entry is MatrixCompletedInvocation => entry.status === "completed"));
      if (shard.parity !== null) {
        const currentParityDigest = canonicalDigest(shard.parity);
        if (parityDigest !== undefined && parityDigest !== currentParityDigest) throw new Error(`matrix parity changed across continuation attempts: ${block.id}`);
        parityDigest = currentParityDigest;
        paritySnapshotDigest = shard.parity.finalSnapshotDigest;
      }
      completed.forEach((entry) => completedIds.add(entry.invocationId));
      shards.push(shard);
      shardSha256.set(`${block.id}/${attemptIndex}`, digest);
      previousDigest = digest;
      if (completedIds.size === block.invocations.length) {
        if (block.shardPaths.slice(attemptIndex + 1).some((entry) => existsSync(resolve(output, entry)) || existsSync(`${resolve(output, entry)}.sha256`))) {
          throw new Error(`matrix continuation exists after block completion: ${block.id}`);
        }
        break;
      }
    }
    if (completedInvocations.length > 0) {
      if (paritySnapshotDigest === undefined) throw new Error(`matrix block has samples without a parity reference: ${block.id}`);
      validateMatrixCorrectnessEvidence(block.operation, paritySnapshotDigest, completedInvocations);
      const latestParity = shards.filter((entry) => entry.blockId === block.id && entry.parity !== null).at(-1)?.parity ?? null;
      validateNeighborEvidence(block, latestParity, completedInvocations);
    }
  }
  let legacyEligible = false;
  if (manifest.legacyEvidence !== null) {
    const legacyPath = resolve(output, manifest.legacyEvidence.path);
    if (relative(output, legacyPath).replaceAll("\\", "/") !== manifest.legacyEvidence.path) throw new Error("legacy evidence path traversal");
    if (sha256File(legacyPath) !== manifest.legacyEvidence.sha256) throw new Error("legacy v2 evidence hash mismatch");
    const legacy = JSON.parse(readFileSync(legacyPath, "utf8")) as unknown;
    validateBenchmarkReport(legacy);
    const record = requireRecord(legacy, "legacy v2 report");
    const eligibility = requireRecord(record.claimEligibility, "legacy v2 claim eligibility");
    legacyEligible = eligibility.eligible === true;
  }
  return { manifest, manifestSha256, shards, shardSha256, legacyEligible };
}

function processStatistics(invocation: MatrixCompletedInvocation, perSample: number): BenchmarkStatistics {
  return summarizeDurations(invocation.samples.map((entry) => entry.durationNs), perSample);
}

function buildSummaries(manifest: MatrixManifest, shards: readonly MatrixShard[]): readonly MatrixLayoutSummary[] {
  const summaries: MatrixLayoutSummary[] = [];
  for (const block of manifest.blocks) {
    const blockShards = shards.filter((entry) => entry.blockId === block.id);
    for (const layout of MATRIX_LAYOUTS) {
      const invocations = blockShards.flatMap((shard) => shard.invocations).filter((entry): entry is MatrixCompletedInvocation => entry.status === "completed" && entry.layout === layout);
      if (invocations.length !== manifest.policy.processRounds) continue;
      const perSample = operationsPerSample(block.workload, block.operation);
      const correctness = invocations[0]!.correctness;
      validateMatrixCorrectnessEvidence(block.operation, correctness.snapshotDigest, invocations);
      summaries.push({
        blockId: block.id,
        pointIds: block.pointIds,
        operation: block.operation,
        algorithmId: block.algorithmId,
        scopeId: block.scope.id,
        ...(block.semanticScopeId === undefined ? {} : { semanticScopeId: block.semanticScopeId }),
        layout,
        operationsPerSample: perSample,
        perProcess: invocations.map((entry) => ({
          invocationId: entry.invocationId,
          processRound: entry.processRound,
          statistics: processStatistics(entry, perSample),
        })),
        pooled: summarizeDurations(invocations.flatMap((entry) => entry.samples.map((sample) => sample.durationNs)), perSample),
        correctness,
        ...(invocations[0]!.diagnostics === undefined ? {} : { diagnostics: invocations[0]!.diagnostics }),
      });
    }
  }
  return summaries;
}

function summaryKey(blockId: string, layout: VariantId): string {
  return `${blockId}/${layout}`;
}

const RATIO_PAIRS: readonly (readonly [VariantId, VariantId])[] = [
  ["soa", "object"],
  ["hybrid", "object"],
  ["hybrid", "soa"],
];

function buildRatios(manifest: MatrixManifest, summaries: readonly MatrixLayoutSummary[]): readonly MatrixRatio[] {
  const byKey = new Map(summaries.map((entry) => [summaryKey(entry.blockId, entry.layout), entry]));
  const ratios: MatrixRatio[] = [];
  for (const block of manifest.blocks) {
    for (const pointId of block.pointIds) {
      for (const [numeratorLayout, denominatorLayout] of RATIO_PAIRS) {
        const numerator = byKey.get(summaryKey(block.id, numeratorLayout));
        const denominator = byKey.get(summaryKey(block.id, denominatorLayout));
        if (numerator === undefined || denominator === undefined) continue;
        const denominatorRounds = new Map(denominator.perProcess.map((entry) => [entry.processRound, entry.statistics.medianNsPerOperation]));
        ratios.push({
          pointId,
          operation: block.operation,
          algorithmId: block.algorithmId,
          scopeId: block.scope.id,
          numeratorLayout,
          denominatorLayout,
          medianRatio: numerator.pooled.medianNsPerOperation / denominator.pooled.medianNsPerOperation,
          processRoundRatios: numerator.perProcess.map((entry) => entry.statistics.medianNsPerOperation / denominatorRounds.get(entry.processRound)!),
        });
      }
    }
  }
  return ratios;
}

function buildAlgorithmRatios(
  manifest: MatrixManifest,
  summaries: readonly MatrixLayoutSummary[],
): { readonly ratios: readonly MatrixAlgorithmRatio[]; readonly limitations: readonly string[] } {
  const ratios: MatrixAlgorithmRatio[] = [];
  const limitations: string[] = [
    "algorithm blocks are separate immutable shards; matching round labels do not interleave brute and grid execution, so timing ratios can include temporal drift and are descriptive only",
  ];
  for (const point of manifest.suite.points) {
    for (const layout of MATRIX_LAYOUTS) {
      const candidates = summaries.filter((summary) => summary.pointIds.includes(point.id) && summary.layout === layout && summary.operation === "neighbor-pairs");
      const brute = candidates.find((entry) => entry.algorithmId === MATRIX_BRUTE_NEIGHBOR_ALGORITHM);
      const grid = candidates.find((entry) => entry.algorithmId === MATRIX_GRID_NEIGHBOR_ALGORITHM);
      if (brute === undefined || grid === undefined) {
        limitations.push(`${point.id}/${layout}: missing separate brute or grid timing execution`);
        continue;
      }
      if (brute.semanticScopeId === undefined || brute.semanticScopeId !== grid.semanticScopeId) {
        limitations.push(`${point.id}/${layout}: algorithms do not share a bound semantic scope`);
        continue;
      }
      const bruteRounds = new Map(brute.perProcess.map((entry) => [entry.processRound, entry.statistics.medianNsPerOperation]));
      if (grid.perProcess.some((entry) => !bruteRounds.has(entry.processRound))) {
        limitations.push(`${point.id}/${layout}: process rounds do not align`);
        continue;
      }
      ratios.push({
        pointId: point.id,
        operation: "neighbor-pairs",
        semanticScopeId: brute.semanticScopeId,
        layout,
        numeratorAlgorithmId: MATRIX_GRID_NEIGHBOR_ALGORITHM,
        denominatorAlgorithmId: MATRIX_BRUTE_NEIGHBOR_ALGORITHM,
        medianRatio: grid.pooled.medianNsPerOperation / brute.pooled.medianNsPerOperation,
        processRoundRatios: grid.perProcess.map((entry) => entry.statistics.medianNsPerOperation / bruteRounds.get(entry.processRound)!),
      });
    }
  }
  return { ratios, limitations };
}

function geometric(values: readonly number[]): boolean {
  if (values.length < 4 || values.some((value) => value <= 0)) return false;
  const ratios = values.slice(1).map((value, index) => value / values[index]!);
  return ratios.every((value) => Math.abs(value / ratios[0]! - 1) <= 1e-9);
}

function olsLogLog(x: readonly number[], y: readonly number[]): MatrixOlsFit {
  const lx = x.map(Math.log);
  const ly = y.map(Math.log);
  const meanX = lx.reduce((sum, value) => sum + value, 0) / lx.length;
  const meanY = ly.reduce((sum, value) => sum + value, 0) / ly.length;
  const covariance = lx.reduce((sum, value, index) => sum + (value - meanX) * (ly[index]! - meanY), 0);
  const varianceX = lx.reduce((sum, value) => sum + (value - meanX) ** 2, 0);
  const slope = covariance / varianceX;
  const intercept = meanY - slope * meanX;
  const residual = lx.reduce((sum, value, index) => sum + (ly[index]! - (intercept + slope * value)) ** 2, 0);
  const total = ly.reduce((sum, value) => sum + (value - meanY) ** 2, 0);
  return { slope, rSquared: total === 0 ? 1 : 1 - residual / total, pointCount: x.length };
}

export const MATRIX_SPATIAL_GROWTH_TOLERANCE: MatrixGrowthTolerance = {
  id: "density/spatial-growth-tolerance/v1",
  structuralExponentAbsoluteError: 0.15,
  structuralAssessmentTailPointCount: 3,
  structuralMinimumTotalPointCount: 5,
  structuralMinimumTailInputSpan: 16,
  timingExponentAbsoluteError: 0.35,
  timingMinimumRSquared: 0.9,
  timingMinimumPointCount: 5,
  timingMinimumInputSpan: 16,
  timingMaximumRoundRelativeSpread: 0.5,
};

function relativeSpread(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const median = sorted[Math.floor(sorted.length / 2)]!;
  return median === 0 ? (sorted.at(-1) === 0 ? 0 : Infinity) : (sorted.at(-1)! - sorted[0]!) / median;
}

function buildGrowthSeries(manifest: MatrixManifest, summaries: readonly MatrixLayoutSummary[]): readonly MatrixGrowthSeries[] {
  const pointById = new Map(manifest.suite.points.map((point) => [point.id, point]));
  const results: MatrixGrowthSeries[] = [];
  for (const algorithmId of [MATRIX_BRUTE_NEIGHBOR_ALGORITHM, MATRIX_GRID_NEIGHBOR_ALGORITHM]) {
    for (const family of ["spatial-fixed-density", "spatial-coincident"] as const) {
      const familyName = family === "spatial-fixed-density" ? "fixed-density" : "coincident";
      for (const layout of MATRIX_LAYOUTS) {
        const entries = summaries
          .filter((summary) => summary.operation === "neighbor-pairs" && summary.algorithmId === algorithmId && summary.layout === layout)
          .flatMap((summary) => summary.pointIds.map((pointId) => ({ summary, point: pointById.get(pointId)! })))
          .filter((entry) => entry.point.family === family)
          .sort((left, right) => Number(left.point.factor.value) - Number(right.point.factor.value));
        if (entries.length === 0) continue;
        const block = manifest.blocks.find((candidate) => candidate.algorithmId === algorithmId && candidate.pointIds.includes(entries[0]!.point.id))!;
        const expectation = block.growthModel?.expectations.find((entry) => entry.family === familyName);
        if (expectation === undefined || block.semanticScopeId === undefined) continue;
        const metric = block.growthModel!.structuralMetric;
        const xValues = entries.map((entry) => Number(entry.point.factor.value));
        const structuralValues = entries.map((entry) => {
          if (entry.summary.diagnostics === undefined) return 0;
          return metric === "distance-checks" ? entry.summary.diagnostics.distanceChecks : entry.summary.diagnostics.totalStructuralWork;
        });
        const structuralAssessmentEntries = entries.slice(-MATRIX_SPATIAL_GROWTH_TOLERANCE.structuralAssessmentTailPointCount);
        const structuralAssessmentX = structuralAssessmentEntries.map((entry) => Number(entry.point.factor.value));
        const structuralAssessmentValues = structuralValues.slice(-structuralAssessmentEntries.length);
        results.push({
          family,
          operation: "neighbor-pairs",
          algorithmId,
          semanticScopeId: block.semanticScopeId,
          layout,
          metric,
          expectedExponent: expectation.expectedExponent,
          pointIds: entries.map((entry) => entry.point.id),
          xValues,
          values: structuralValues,
          logLogOls: xValues.length >= 2 && structuralValues.every((value) => value > 0) ? olsLogLog(xValues, structuralValues) : null,
          assessmentPointIds: structuralAssessmentEntries.map((entry) => entry.point.id),
          assessmentLogLogOls: structuralAssessmentX.length >= 2 && structuralAssessmentValues.every((value) => value > 0)
            ? olsLogLog(structuralAssessmentX, structuralAssessmentValues)
            : null,
        });
        const timingValues = entries.map((entry) => entry.summary.pooled.medianNsPerOperation);
        results.push({
          family,
          operation: "neighbor-pairs",
          algorithmId,
          semanticScopeId: block.semanticScopeId,
          layout,
          metric: "timing",
          expectedExponent: expectation.expectedExponent,
          pointIds: entries.map((entry) => entry.point.id),
          xValues,
          values: timingValues,
          logLogOls: xValues.length >= 2 && timingValues.every((value) => value > 0) ? olsLogLog(xValues, timingValues) : null,
          assessmentPointIds: entries.map((entry) => entry.point.id),
          assessmentLogLogOls: xValues.length >= 2 && timingValues.every((value) => value > 0) ? olsLogLog(xValues, timingValues) : null,
          maximumRoundRelativeSpread: Math.max(...entries.map((entry) => relativeSpread(entry.summary.perProcess.map((process) => process.statistics.medianNsPerOperation)))),
        });
      }
    }
  }
  return results;
}

export function assessMatrixGrowthSeries(
  series: readonly MatrixGrowthSeries[],
  tolerance: MatrixGrowthTolerance = MATRIX_SPATIAL_GROWTH_TOLERANCE,
): readonly MatrixGrowthAssessment[] {
  return series.map((entry) => {
    const fit = entry.assessmentLogLogOls;
    const reasons: string[] = [];
    let status: MatrixGrowthAssessment["status"];
    if (entry.metric !== "timing") {
      const assessmentIndexes = entry.assessmentPointIds.map((pointId) => entry.pointIds.indexOf(pointId));
      const assessmentX = assessmentIndexes.map((index) => index < 0 ? 0 : entry.xValues[index]!);
      const span = assessmentX.length === 0 || assessmentX[0] === 0 ? 0 : assessmentX.at(-1)! / assessmentX[0]!;
      if (entry.xValues.length < tolerance.structuralMinimumTotalPointCount) reasons.push("structural series has too few total points");
      if (entry.assessmentPointIds.length < tolerance.structuralAssessmentTailPointCount) reasons.push("structural assessment tail has too few points");
      if (span < tolerance.structuralMinimumTailInputSpan) reasons.push("structural assessment tail input span is too narrow");
      if (fit === null) reasons.push("structural assessment tail has no positive log-log fit");
      if (reasons.length > 0) status = "inconclusive";
      else {
        if (Math.abs(fit!.slope - entry.expectedExponent) > tolerance.structuralExponentAbsoluteError) reasons.push("structural tail slope differs from project tolerance");
        if (fit!.rSquared < 0.99) reasons.push("structural tail is not sufficiently power-law consistent");
        status = reasons.length === 0 ? "consistent" : "audit-required";
      }
    } else {
      const span = entry.xValues.length === 0 ? 0 : entry.xValues.at(-1)! / entry.xValues[0]!;
      if (entry.xValues.length < tolerance.timingMinimumPointCount) reasons.push("timing series has too few points");
      if (span < tolerance.timingMinimumInputSpan) reasons.push("timing series input span is too narrow");
      if (fit === null || fit.rSquared < tolerance.timingMinimumRSquared) reasons.push("timing fit quality is below threshold");
      if ((entry.maximumRoundRelativeSpread ?? Infinity) > tolerance.timingMaximumRoundRelativeSpread) reasons.push("timing rounds disagree beyond threshold");
      if (reasons.length > 0) status = "inconclusive";
      else if (Math.abs(fit!.slope - entry.expectedExponent) > tolerance.timingExponentAbsoluteError) {
        reasons.push("timing slope differs from project tolerance after quality gates");
        status = "audit-required";
      } else status = "consistent";
    }
    return {
      family: entry.family,
      algorithmId: entry.algorithmId,
      layout: entry.layout,
      dimension: entry.metric === "timing" ? "timing" : "structural",
      status,
      expectedExponent: entry.expectedExponent,
      observedExponent: fit?.slope ?? null,
      rSquared: fit?.rSquared ?? null,
      reasons,
    };
  });
}

function buildSeries(manifest: MatrixManifest, summaries: readonly MatrixLayoutSummary[]): readonly MatrixSeriesAnalysis[] {
  const pointById = new Map(manifest.suite.points.map((entry, index) => [entry.id, { point: entry, index }]));
  const groups = new Map<string, { family: string; operation: MatrixOperation; algorithmId: string; scopeId: string; layout: VariantId; values: { pointId: string; x: number | string; index: number; y: number }[] }>();
  for (const summary of summaries) {
    for (const pointId of summary.pointIds) {
      const pointEntry = pointById.get(pointId)!;
      const key = canonicalDigest({
        family: pointEntry.point.family,
        operation: summary.operation,
        algorithmId: summary.algorithmId,
        scopeId: summary.scopeId,
        layout: summary.layout,
        fixed: pointEntry.point.controls.fixed,
        derived: pointEntry.point.controls.derived,
        factorName: pointEntry.point.factor.name,
        factorKind: pointEntry.point.factor.kind,
      });
      const group = groups.get(key) ?? {
        family: pointEntry.point.family,
        operation: summary.operation,
        algorithmId: summary.algorithmId,
        scopeId: summary.scopeId,
        layout: summary.layout,
        values: [],
      };
      group.values.push({ pointId, x: pointEntry.point.factor.value, index: pointEntry.index, y: summary.pooled.medianNsPerOperation });
      groups.set(key, group);
    }
  }
  return [...groups.values()].map((group) => {
    const firstPoint = pointById.get(group.values[0]!.pointId)!.point;
    const values = [...group.values].sort((left, right) => firstPoint.factor.kind === "numeric"
      ? (left.x as number) - (right.x as number)
      : left.index - right.index);
    const adjacentSlopes: MatrixAdjacentSlope[] = [];
    if (firstPoint.factor.kind === "numeric") {
      for (let index = 1; index < values.length; index += 1) {
        const lower = values[index - 1]!;
        const upper = values[index]!;
        const lowerX = lower.x as number;
        const upperX = upper.x as number;
        if (lowerX > 0 && upperX > lowerX && lower.y > 0 && upper.y > 0) {
          adjacentSlopes.push({
            lowerPointId: lower.pointId,
            upperPointId: upper.pointId,
            lowerX,
            upperX,
            alpha: Math.log(upper.y / lower.y) / Math.log(upperX / lowerX),
          });
        }
      }
    }
    const numericX = firstPoint.factor.kind === "numeric" ? values.map((entry) => entry.x as number) : [];
    const y = values.map((entry) => entry.y);
    return {
      family: group.family,
      factorName: firstPoint.factor.name,
      factorKind: firstPoint.factor.kind,
      operation: group.operation,
      algorithmId: group.algorithmId,
      scopeId: group.scopeId,
      layout: group.layout,
      pointIds: values.map((entry) => entry.pointId),
      xValues: values.map((entry) => entry.x),
      pooledMediansNsPerOperation: y,
      adjacentSlopes,
      logLogOls: geometric(numericX) && y.every((value) => value > 0) ? olsLogLog(numericX, y) : null,
    };
  }).sort((left, right) => canonicalDigest(left).localeCompare(canonicalDigest(right)));
}

function winner(ratio: number, numerator: VariantId, denominator: VariantId): VariantId {
  return ratio < 1 ? numerator : denominator;
}

function consistentDirection(values: readonly number[], pooled: number): boolean {
  const direction = Math.sign(pooled - 1);
  return direction !== 0 && values.length > 0 && values.every((value) => Math.sign(value - 1) === direction);
}

export function buildMatrixCrossovers(manifest: MatrixManifest, ratios: readonly MatrixRatio[]): readonly MatrixCrossoverBracket[] {
  const pointById = new Map(manifest.suite.points.map((entry) => [entry.id, entry]));
  const groups = new Map<string, MatrixRatio[]>();
  for (const ratio of ratios) {
    const point = pointById.get(ratio.pointId)!;
    if (point.factor.kind !== "numeric") continue;
    const key = canonicalDigest({
      family: point.family,
      factor: point.factor.name,
      numerator: ratio.numeratorLayout,
      denominator: ratio.denominatorLayout,
      operation: ratio.operation,
      algorithm: ratio.algorithmId,
      scope: ratio.scopeId,
      fixed: point.controls.fixed,
      derived: point.controls.derived,
    });
    const entries = groups.get(key) ?? [];
    entries.push(ratio);
    groups.set(key, entries);
  }
  const result: MatrixCrossoverBracket[] = [];
  for (const entries of groups.values()) {
    entries.sort((left, right) => (pointById.get(left.pointId)!.factor.value as number) - (pointById.get(right.pointId)!.factor.value as number));
    for (let index = 1; index < entries.length; index += 1) {
      const lower = entries[index - 1]!;
      const upper = entries[index]!;
      const lowerPoint = pointById.get(lower.pointId)!;
      const threshold = manifest.policy.crossoverPracticalThreshold;
      if (Math.sign(lower.medianRatio - 1) === Math.sign(upper.medianRatio - 1)) continue;
      if (Math.abs(lower.medianRatio - 1) < threshold || Math.abs(upper.medianRatio - 1) < threshold) continue;
      if (!consistentDirection(lower.processRoundRatios, lower.medianRatio) || !consistentDirection(upper.processRoundRatios, upper.medianRatio)) continue;
      result.push({
        family: lowerPoint.family,
        factorName: lowerPoint.factor.name,
        operation: lower.operation,
        algorithmId: lower.algorithmId,
        scopeId: lower.scopeId,
        numeratorLayout: lower.numeratorLayout,
        denominatorLayout: lower.denominatorLayout,
        lowerPointId: lower.pointId,
        upperPointId: upper.pointId,
        lowerX: lowerPoint.factor.value as number,
        upperX: pointById.get(upper.pointId)!.factor.value as number,
        lowerWinner: winner(lower.medianRatio, lower.numeratorLayout, lower.denominatorLayout),
        upperWinner: winner(upper.medianRatio, upper.numeratorLayout, upper.denominatorLayout),
        practicalThreshold: threshold,
      });
    }
  }
  return result.sort((left, right) => canonicalDigest(left).localeCompare(canonicalDigest(right)));
}

function claimEligibility(artifacts: ValidatedArtifacts, summaries: readonly MatrixLayoutSummary[]): MatrixAggregate["claimEligibility"] {
  const { manifest, shards, legacyEligible } = artifacts;
  const reasons: string[] = [];
  if (manifest.suite.id !== "claim" || manifest.suiteDigest !== canonicalDigest(createMatrixSuite("claim"))) reasons.push("suite is not the complete checked-in claim matrix");
  if (!legacyEligible) reasons.push("an accepted claim-eligible legacy v2 report is not bound to the manifest");
  if (!/^[0-9a-f]{40}$/.test(manifest.source.revision)) reasons.push("source revision is not a full 40-hex commit id");
  if (manifest.source.dirty) reasons.push("source worktree is dirty");
  if (manifest.source.lockfile.path !== "package-lock.json" || !isSha256(manifest.source.lockfile.sha256)) reasons.push("package-lock.json digest is missing or invalid");
  if (manifest.policy.processRounds < 3) reasons.push("claim matrix requires at least 3 process rounds");
  if (manifest.policy.warmupSamplesPerProcess < 5) reasons.push("claim matrix requires at least 5 warmups per process");
  if (manifest.policy.measuredSamplesPerProcess < 10) reasons.push("claim matrix requires at least 10 samples per process");
  if (!sameDigest(manifest.policy.layouts, MATRIX_LAYOUTS)) reasons.push("claim matrix requires all layouts in canonical order");
  const latestShards = manifest.blocks.map((block) => shards.filter((entry) => entry.blockId === block.id).at(-1)!);
  if (shards.some((entry) => entry.status !== "completed") || latestShards.some((entry) => entry.status !== "completed")) {
    reasons.push("claim matrix contains incomplete, failed, timed-out, or resource-limited attempts");
  }
  if (shards.some((entry) => entry.parity === null)) reasons.push("claim matrix is missing parity references");
  if (summaries.length !== manifest.blocks.length * MATRIX_LAYOUTS.length) reasons.push("claim matrix summary coverage is incomplete");
  return { policy: MATRIX_CLAIM_POLICY, eligible: reasons.length === 0, reasons };
}

function buildAggregateFromArtifacts(artifacts: ValidatedArtifacts, generatedAt: string): MatrixAggregate {
  const summaries = buildSummaries(artifacts.manifest, artifacts.shards);
  const ratios = buildRatios(artifacts.manifest, summaries);
  const series = buildSeries(artifacts.manifest, summaries);
  const spatial = artifacts.manifest.suite.id === "spatial-index" || artifacts.manifest.suite.id === "spatial-index-steady";
  const algorithmComparisons = spatial ? buildAlgorithmRatios(artifacts.manifest, summaries) : undefined;
  const growthSeries = spatial ? buildGrowthSeries(artifacts.manifest, summaries) : undefined;
  const spatialFields = algorithmComparisons === undefined || growthSeries === undefined ? {} : {
    algorithmRatios: algorithmComparisons.ratios,
    ratioLimitations: algorithmComparisons.limitations,
    growthSeries,
    growthAssessments: assessMatrixGrowthSeries(growthSeries),
    growthTolerance: MATRIX_SPATIAL_GROWTH_TOLERANCE,
  };
  return {
    format: MATRIX_AGGREGATE_FORMAT,
    generatedAt,
    manifestSha256: artifacts.manifestSha256,
    manifestId: artifacts.manifest.manifestId,
    suiteDigest: artifacts.manifest.suiteDigest,
    sourceDigest: artifacts.manifest.sourceDigest,
    environmentDigest: artifacts.manifest.environmentDigest,
    harnessDigest: artifacts.manifest.harnessDigest,
    policyDigest: artifacts.manifest.policyDigest,
    shardReferences: artifacts.shards.map((shard) => {
      const block = artifacts.manifest.blocks.find((entry) => entry.id === shard.blockId)!;
      return {
        blockId: block.id,
        attemptIndex: shard.attemptIndex,
        path: block.shardPaths[shard.attemptIndex]!,
        sha256: artifacts.shardSha256.get(`${block.id}/${shard.attemptIndex}`)!,
        status: shard.status,
      };
    }),
    summaries,
    ratios,
    series,
    crossovers: buildMatrixCrossovers(artifacts.manifest, ratios),
    ...spatialFields,
    claimEligibility: claimEligibility(artifacts, summaries),
  };
}

export function aggregateMatrix(outputDirectory: string, generatedAt = new Date().toISOString()): MatrixAggregate {
  const output = resolve(outputDirectory);
  const artifacts = loadValidatedArtifacts(output);
  const aggregate = buildAggregateFromArtifacts(artifacts, generatedAt);
  replaceHashedJson(resolve(output, "aggregate.json"), aggregate);
  return aggregate;
}

export function validateMatrixOutput(outputDirectory: string, requireAggregate = true): MatrixAggregate | undefined {
  const output = resolve(outputDirectory);
  const artifacts = loadValidatedArtifacts(output);
  const aggregatePath = resolve(output, "aggregate.json");
  if (!existsSync(aggregatePath)) {
    if (requireAggregate) throw new Error("matrix aggregate is missing");
    return undefined;
  }
  verifyHashedFile(aggregatePath);
  const aggregate = JSON.parse(readFileSync(aggregatePath, "utf8")) as MatrixAggregate;
  if (aggregate.format !== MATRIX_AGGREGATE_FORMAT) throw new Error("unsupported matrix aggregate format");
  const date = new Date(aggregate.generatedAt);
  if (Number.isNaN(date.valueOf()) || date.toISOString() !== aggregate.generatedAt) throw new Error("matrix aggregate generatedAt must be canonical ISO");
  const recomputed = buildAggregateFromArtifacts(artifacts, aggregate.generatedAt);
  if (!sameDigest(aggregate, recomputed)) throw new Error("matrix aggregate statistics or analysis do not match raw shards");
  return aggregate;
}

/** Validation accepts audit artifacts; enforcement is the opt-in failing policy gate. */
export function enforceMatrixOutput(outputDirectory: string): MatrixAggregate {
  const aggregate = validateMatrixOutput(outputDirectory, true)!;
  const assessments = aggregate.growthAssessments;
  if (assessments === undefined) throw new Error("matrix growth enforcement requires a spatial-index aggregate");
  const structural = assessments.filter((entry) => entry.dimension === "structural");
  const expectedStructuralAssessments = 2 * 2 * MATRIX_LAYOUTS.length;
  const unacceptable = assessments.filter((entry) =>
    entry.status === "audit-required" || (entry.dimension === "structural" && entry.status !== "consistent"),
  );
  if (structural.length !== expectedStructuralAssessments || unacceptable.length > 0) {
    const reasons = [
      ...(structural.length === expectedStructuralAssessments
        ? []
        : [`structural assessment coverage is ${structural.length}/${expectedStructuralAssessments}`]),
      ...unacceptable.map((entry) => `${entry.family}/${entry.algorithmId}/${entry.layout}/${entry.dimension}/${entry.status}`),
    ];
    throw new Error(`matrix growth enforcement failed: ${reasons.join(", ")}`);
  }
  return aggregate;
}

export function validateStandaloneMatrixManifest(value: unknown): MatrixManifest {
  const record = requireRecord(value, "matrix manifest");
  if (record.format !== MATRIX_MANIFEST_FORMAT) throw new Error("unsupported matrix manifest format");
  const manifest = value as MatrixManifest;
  validateManifest(manifest, resolve("."));
  return manifest;
}

export const MATRIX_VALIDATED_OPERATIONS = BENCHMARK_OPERATIONS;
export const MATRIX_VALIDATED_VARIANTS = BENCHMARK_VARIANTS;
export const MATRIX_VALIDATED_SCOPES = BENCHMARK_CASE_SPECS;
