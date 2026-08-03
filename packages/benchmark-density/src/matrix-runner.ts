import { spawnSync, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { basename, dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalDigest } from "@hex-empires/kernel";

import type { CellWorkerRequest, CellWorkerResponse } from "./measure.js";
import { BENCHMARK_CASE_SPECS, type BenchmarkOperation, type BenchmarkSource } from "./report.js";
import {
  getMatrixAlgorithmSpec,
  matrixOperationsPerSample,
  type MatrixOperation,
} from "./matrix-algorithms.js";
import {
  MATRIX_LAYOUTS,
  MATRIX_MANIFEST_FORMAT,
  MATRIX_MAX_ATTEMPTS,
  MATRIX_SHARD_FORMAT,
  type MatrixComparisonBlock,
  type MatrixEnvironment,
  type MatrixHarnessIdentity,
  type MatrixIncompleteInvocation,
  type MatrixInvocationPlan,
  type MatrixInvocationResult,
  type MatrixLegacyEvidence,
  type MatrixLimits,
  type MatrixManifest,
  type MatrixSamplePolicy,
  type MatrixShard,
  type MatrixSource,
  type MatrixSuite,
  type MatrixTerminalStatus,
  type MatrixWorkEstimate,
} from "./matrix-contract.js";
import { createMatrixSuite, validateMatrixSuite } from "./matrix-suites.js";
import { validateBenchmarkReport } from "./report.js";

const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const MATRIX_MODULE_PATH = fileURLToPath(import.meta.url);
const MATRIX_MODULE_DIRECTORY = dirname(MATRIX_MODULE_PATH);

export interface CreateMatrixManifestOptions {
  readonly suite?: MatrixSuite | undefined;
  readonly suiteId?: MatrixSuite["id"] | undefined;
  readonly source?: MatrixSource | undefined;
  readonly environment?: MatrixEnvironment | undefined;
  readonly harness?: MatrixHarnessIdentity | undefined;
  readonly policy?: Partial<MatrixSamplePolicy> | undefined;
  readonly limits?: Partial<MatrixLimits> | undefined;
  readonly issuedAt?: string | undefined;
  readonly legacyEvidence?: MatrixLegacyEvidence | null | undefined;
  /** Validation seam for immutable pre-dispatch artifacts. New plans always use algorithm dispatch. */
  readonly executionContract?: "legacy-v1" | "algorithm-dispatch/v2" | undefined;
}

export interface WriteMatrixPlanOptions extends CreateMatrixManifestOptions {
  readonly outputDirectory: string;
  readonly legacyReportPath?: string | undefined;
}

export interface MatrixCellRunContext {
  readonly invocation: MatrixInvocationPlan;
  readonly limits: MatrixLimits;
  readonly environment: MatrixEnvironment;
}

export type MatrixCellRunner = (
  request: CellWorkerRequest,
  context: MatrixCellRunContext,
) => CellWorkerResponse | MatrixIncompleteInvocation;

export interface MatrixParityRunFailure {
  readonly status: Exclude<MatrixTerminalStatus, "completed">;
  readonly reason: string;
  readonly elapsedMs: number;
}

export type MatrixParityRunner = (
  workload: MatrixComparisonBlock["workload"],
  operation: MatrixOperation,
  algorithmId: string,
  limits: MatrixLimits,
  environment: MatrixEnvironment,
) => Omit<NonNullable<MatrixShard["parity"]>, "strategy"> | MatrixParityRunFailure;

export interface ExecuteMatrixOptions {
  readonly outputDirectory: string;
  readonly manifest?: MatrixManifest | undefined;
  readonly cellRunner?: MatrixCellRunner | undefined;
  readonly parityRunner?: MatrixParityRunner | undefined;
  readonly now?: (() => number) | undefined;
}

function git(args: readonly string[]): string {
  return execFileSync("git", ["-C", MATRIX_MODULE_DIRECTORY, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

export function sha256Bytes(value: string | Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

export function sha256File(path: string): string {
  return sha256Bytes(readFileSync(path));
}

function repositoryRoot(): string {
  const root = resolve(git(["rev-parse", "--show-toplevel"]));
  if (!isWithin(MATRIX_MODULE_PATH, root)) throw new Error("benchmark matrix module is outside its resolved repository");
  return root;
}

function isWithin(candidate: string, root: string): boolean {
  const relation = relative(root, candidate);
  return relation === "" || (!relation.startsWith(`..${sep}`) && relation !== ".." && !isAbsolute(relation));
}

/** Collects an exact dirty-state digest while allowing the matrix output itself to be excluded. */
export function collectMatrixSource(excludedOutputRoot?: string): MatrixSource {
  const root = repositoryRoot();
  const excluded = excludedOutputRoot === undefined ? undefined : resolve(excludedOutputRoot);
  const revision = git(["rev-parse", "HEAD"]);
  const lockfilePath = resolve(root, "package-lock.json");
  const trackedPatch = execFileSync("git", ["diff", "--binary", "HEAD", "--"], {
    cwd: root,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const rawUntracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard", "-z"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  const untracked = rawUntracked.split("\0").filter((entry) => entry.length > 0).sort();
  const stateHash = createHash("sha256").update(trackedPatch);
  let includedUntracked = 0;
  for (const path of untracked) {
    const absolute = resolve(root, path);
    if (excluded !== undefined && isWithin(absolute, excluded)) continue;
    if (!statSync(absolute).isFile()) continue;
    includedUntracked += 1;
    stateHash.update("\0path\0").update(path.replaceAll("\\", "/")).update("\0bytes\0").update(readFileSync(absolute));
  }
  return {
    revision,
    dirty: trackedPatch.length > 0 || includedUntracked > 0,
    lockfile: {
      path: relative(root, lockfilePath).replaceAll("\\", "/"),
      sha256: sha256File(lockfilePath),
    },
    worktreeStateSha256: stateHash.digest("hex"),
  };
}

export function collectMatrixEnvironment(): MatrixEnvironment {
  return {
    platform: platform(),
    release: release(),
    arch: arch(),
    cpuModel: cpus()[0]?.model ?? "unknown",
    logicalCpuCount: cpus().length,
    totalMemoryBytes: totalmem(),
    node: process.version,
    v8: process.versions.v8,
    executable: process.execPath,
    executableSha256: sha256File(process.execPath),
    execArgv: [...process.execArgv],
    nodeOptions: (process.env.NODE_OPTIONS ?? "").trim(),
  };
}

export function collectMatrixHarnessIdentity(): MatrixHarnessIdentity {
  const root = repositoryRoot();
  const extension = MATRIX_MODULE_PATH.endsWith(".ts") ? ".ts" : ".js";
  const scenarioModuleDirectory = resolve(
    MATRIX_MODULE_DIRECTORY,
    "../../scenario-density",
    extension === ".ts" ? "src" : "dist",
  );
  const definitions = [
    ["cli", resolve(MATRIX_MODULE_DIRECTORY, `cli${extension}`)],
    ["runner", resolve(MATRIX_MODULE_DIRECTORY, `matrix-runner${extension}`)],
    ["validator", resolve(MATRIX_MODULE_DIRECTORY, `matrix-validator${extension}`)],
    ["measure", resolve(MATRIX_MODULE_DIRECTORY, `measure${extension}`)],
    ["cell-worker", resolve(MATRIX_MODULE_DIRECTORY, `worker${extension}`)],
    ["parity-worker", resolve(MATRIX_MODULE_DIRECTORY, `matrix-parity-worker${extension}`)],
    ["algorithm-registry", resolve(MATRIX_MODULE_DIRECTORY, `matrix-algorithms${extension}`)],
    ["suite-registry", resolve(MATRIX_MODULE_DIRECTORY, `matrix-suites${extension}`)],
    ["artifact-contract", resolve(MATRIX_MODULE_DIRECTORY, `matrix-contract${extension}`)],
    ["scenario-contract", resolve(scenarioModuleDirectory, `contracts${extension}`)],
    ["scenario-workloads", resolve(scenarioModuleDirectory, `workloads${extension}`)],
    ["scenario-shared", resolve(scenarioModuleDirectory, `shared${extension}`)],
    ["scenario-grid", resolve(scenarioModuleDirectory, `neighbor-grid${extension}`)],
    ["scenario-object", resolve(scenarioModuleDirectory, `object${extension}`)],
    ["scenario-soa", resolve(scenarioModuleDirectory, `soa${extension}`)],
    ["scenario-hybrid", resolve(scenarioModuleDirectory, `hybrid${extension}`)],
  ] as const;
  return {
    format: "simulation-playground/density-matrix-harness-identity/v1",
    files: definitions.map(([role, path]) => {
      if (!isWithin(path, root)) throw new Error(`benchmark harness file escapes repository: ${path}`);
      return { role, path: relative(root, path).replaceAll("\\", "/"), sha256: sha256File(path) };
    }),
  };
}

export function defaultMatrixPolicy(suite: MatrixSuite): MatrixSamplePolicy {
  const claim = suite.id === "claim";
  const spatial = suite.id === "spatial-index";
  return {
    processIsolation: "fresh-child-process-per-layout-per-round",
    timer: "process.hrtime.bigint",
    percentileMethod: "nearest-rank",
    processRounds: claim || spatial ? 3 : 1,
    warmupSamplesPerProcess: claim ? 5 : spatial ? 1 : 0,
    measuredSamplesPerProcess: claim ? 10 : spatial ? 3 : 1,
    layouts: MATRIX_LAYOUTS,
    crossoverPracticalThreshold: 0.05,
  };
}

export function defaultMatrixLimits(suite: MatrixSuite): MatrixLimits {
  const stress = suite.id === "stress-linear" || suite.id === "stress-quadratic";
  const spatial = suite.id === "spatial-index";
  return {
    childTimeoutMs: stress || spatial ? 120_000 : 30_000,
    totalTimeoutMs: stress || spatial ? 30 * 60_000 : 10 * 60_000,
    maxEstimatedWorkPerChild: stress || spatial ? 5_000_000_000 : 1_000_000_000,
    maxEstimatedWorkTotal: stress ? 50_000_000_000 : spatial ? 20_000_000_000 : 20_000_000_000,
    maxOutputBytesPerChild: 16 * 1024 * 1024,
    v8HeapLimitMb: null,
    allowLarge: false,
  };
}

function requireCount(value: number, label: string, minimum: number): void {
  if (!Number.isSafeInteger(value) || value < minimum) throw new Error(`${label} must be a safe integer of at least ${minimum}`);
}

function validatePolicy(policy: MatrixSamplePolicy): void {
  requireCount(policy.processRounds, "matrix processRounds", 1);
  requireCount(policy.warmupSamplesPerProcess, "matrix warmupSamplesPerProcess", 0);
  requireCount(policy.measuredSamplesPerProcess, "matrix measuredSamplesPerProcess", 1);
  if (policy.processIsolation !== "fresh-child-process-per-layout-per-round") throw new Error("invalid matrix process isolation");
  if (policy.timer !== "process.hrtime.bigint" || policy.percentileMethod !== "nearest-rank") {
    throw new Error("unsupported matrix timing policy");
  }
  if (canonicalDigest(policy.layouts) !== canonicalDigest(MATRIX_LAYOUTS)) throw new Error("matrix policy must use all three layouts in canonical order");
  if (!Number.isFinite(policy.crossoverPracticalThreshold) || policy.crossoverPracticalThreshold <= 0 || policy.crossoverPracticalThreshold >= 1) {
    throw new Error("matrix crossover threshold must be between zero and one");
  }
}

function validateLimits(limits: MatrixLimits): void {
  requireCount(limits.childTimeoutMs, "matrix childTimeoutMs", 1);
  requireCount(limits.totalTimeoutMs, "matrix totalTimeoutMs", 1);
  requireCount(limits.maxEstimatedWorkPerChild, "matrix maxEstimatedWorkPerChild", 1);
  requireCount(limits.maxEstimatedWorkTotal, "matrix maxEstimatedWorkTotal", 1);
  requireCount(limits.maxOutputBytesPerChild, "matrix maxOutputBytesPerChild", 1);
  if (limits.v8HeapLimitMb !== null) requireCount(limits.v8HeapLimitMb, "matrix v8HeapLimitMb", 16);
}

export function operationsPerSample(workload: MatrixComparisonBlock["workload"], operation: MatrixOperation): number {
  return matrixOperationsPerSample(workload, operation);
}

function checkedProduct(...values: readonly number[]): number {
  let result = 1;
  for (const value of values) {
    result *= value;
    if (!Number.isSafeInteger(result)) return Number.MAX_SAFE_INTEGER;
  }
  return result;
}

export function estimateMatrixBlock(
  workload: MatrixComparisonBlock["workload"],
  operation: MatrixOperation,
  policy: MatrixSamplePolicy,
  algorithmId?: string,
): MatrixWorkEstimate {
  if (algorithmId !== undefined) getMatrixAlgorithmSpec(operation, algorithmId);
  const pairs = workload.initialActive * (workload.initialActive - 1) / 2;
  const transitionsPerTick = workload.churn.despawnPerTick + workload.churn.spawnPerTick;
  let linearScans = 0;
  let pairCandidates = 0;
  let transitions = 0;
  let replayTicks = 0;
  if (operation === "update") linearScans = checkedProduct(workload.capacity, workload.ticks.update);
  else if (operation === "neighborhood-all-pairs" || operation === "neighbor-pairs") {
    pairCandidates = checkedProduct(pairs, workload.ticks["neighborhood-all-pairs"]);
    if (operation === "neighbor-pairs") {
      const cellWidth = Math.max(1, workload.neighborRadius);
      const cellsPerAxis = Math.ceil((workload.coordinateLimit * 2 + 1) / cellWidth);
      linearScans = checkedProduct(workload.capacity + checkedProduct(cellsPerAxis, cellsPerAxis), workload.ticks["neighborhood-all-pairs"]);
    }
  }
  else if (operation === "churn") {
    linearScans = checkedProduct(workload.capacity, workload.ticks.churn);
    transitions = checkedProduct(transitionsPerTick, workload.ticks.churn);
  } else if (operation === "snapshot-materialization" || operation === "capture") {
    linearScans = checkedProduct(workload.capacity, workload.ticks.snapshot + 1);
    pairCandidates = checkedProduct(pairs, workload.ticks.snapshot);
    transitions = checkedProduct(transitionsPerTick, workload.ticks.snapshot);
  } else {
    replayTicks = workload.ticks.replay;
    linearScans = checkedProduct(workload.capacity, replayTicks + 1);
    pairCandidates = checkedProduct(pairs, replayTicks);
    transitions = checkedProduct(transitionsPerTick, replayTicks);
  }
  const outputBytes = checkedProduct(workload.initialActive, 96) + 4_096;
  const conservativeUnitsPerSample = Math.min(
    Number.MAX_SAFE_INTEGER,
    linearScans + pairCandidates + transitions + outputBytes + replayTicks,
  );
  const sampleExecutions = policy.warmupSamplesPerProcess + policy.measuredSamplesPerProcess;
  const conservativeUnitsAllInvocations = checkedProduct(
    conservativeUnitsPerSample,
    sampleExecutions,
    policy.layouts.length,
    policy.processRounds,
  );
  return {
    linearScans,
    pairCandidates,
    transitions,
    replayTicks,
    outputBytes,
    conservativeUnitsPerSample,
    conservativeUnitsAllInvocations,
  };
}

interface BlockDraft {
  readonly deduplicationDigest: string;
  readonly pointIds: string[];
  readonly workload: MatrixComparisonBlock["workload"];
  readonly workloadDigest: string;
  readonly operation: MatrixOperation;
  readonly algorithmId: string;
}

function createBlockDrafts(suite: MatrixSuite, executionContract: "legacy-v1" | "algorithm-dispatch/v2"): readonly BlockDraft[] {
  const drafts = new Map<string, BlockDraft>();
  for (const point of suite.points) {
    for (const selection of point.operations) {
      const spec = executionContract === "algorithm-dispatch/v2"
        ? getMatrixAlgorithmSpec(selection.operation, selection.algorithmId)
        : undefined;
      const digest = canonicalDigest({
        workload: point.workload,
        operation: selection.operation,
        algorithmId: selection.algorithmId,
        scope: spec?.scope ?? BENCHMARK_CASE_SPECS[selection.operation as BenchmarkOperation].scope,
      });
      const current = drafts.get(digest);
      if (current === undefined) {
        drafts.set(digest, {
          deduplicationDigest: digest,
          pointIds: [point.id],
          workload: point.workload,
          workloadDigest: point.workloadDigest,
          operation: selection.operation,
          algorithmId: selection.algorithmId,
        });
      } else {
        current.pointIds.push(point.id);
      }
    }
  }
  return [...drafts.values()]
    .map((entry) => ({ ...entry, pointIds: [...entry.pointIds].sort() }))
    .sort((left, right) => left.deduplicationDigest.localeCompare(right.deduplicationDigest));
}

export function createMatrixManifest(options: CreateMatrixManifestOptions = {}): MatrixManifest {
  const suite = options.suite ?? createMatrixSuite(options.suiteId ?? "smoke");
  const executionContract = options.executionContract ?? "algorithm-dispatch/v2";
  validateMatrixSuite(suite);
  const policy = { ...defaultMatrixPolicy(suite), ...options.policy };
  const limits = { ...defaultMatrixLimits(suite), ...options.limits };
  validatePolicy(policy);
  validateLimits(limits);
  if ((suite.id === "stress-linear" || suite.id === "stress-quadratic") && !limits.allowLarge) {
    throw new Error("stress matrix presets require explicit allowLarge=true");
  }
  const source = options.source ?? collectMatrixSource();
  const environment = options.environment ?? collectMatrixEnvironment();
  if (suite.id === "claim" && environment.nodeOptions.length > 0) {
    throw new Error("claim matrix requires an empty NODE_OPTIONS environment");
  }
  const harness = options.harness ?? collectMatrixHarnessIdentity();
  const suiteDigest = canonicalDigest(suite);
  const sourceDigest = canonicalDigest(source);
  const environmentDigest = canonicalDigest(environment);
  const harnessDigest = canonicalDigest(harness);
  const policyDigest = canonicalDigest(policy);
  const limitsDigest = canonicalDigest(limits);
  const drafts = createBlockDrafts(suite, executionContract);
  const manifestId = `density-matrix-${canonicalDigest({
    suiteDigest,
    sourceDigest,
    environmentDigest,
    harnessDigest,
    policyDigest,
    limitsDigest,
    ...(executionContract === "algorithm-dispatch/v2" ? { executionContract } : {}),
    blocks: drafts.map((entry) => entry.deduplicationDigest),
  }).slice(0, 32)}`;
  const blockIds = new Set<string>();
  const blocks: MatrixComparisonBlock[] = drafts.map((draft) => {
    const algorithmSpec = executionContract === "algorithm-dispatch/v2"
      ? getMatrixAlgorithmSpec(draft.operation, draft.algorithmId)
      : undefined;
    const id = `block-${draft.deduplicationDigest.slice(0, 24)}`;
    if (blockIds.has(id)) throw new Error(`matrix block id collision: ${id}`);
    blockIds.add(id);
    const invocations: MatrixInvocationPlan[] = [];
    for (let processRound = 0; processRound < policy.processRounds; processRound += 1) {
      for (let orderIndex = 0; orderIndex < policy.layouts.length; orderIndex += 1) {
        const layout = policy.layouts[(orderIndex + processRound) % policy.layouts.length]!;
        invocations.push({
          invocationId: `${manifestId}/${id}/round-${processRound}/${layout}`,
          attemptInvocationIds: Array.from(
            { length: MATRIX_MAX_ATTEMPTS },
            (_, attemptIndex) => `${manifestId}/${id}/round-${processRound}/${layout}/attempt-${attemptIndex}`,
          ),
          layout,
          processRound,
          orderIndex,
        });
      }
    }
    const shardPaths = Array.from(
      { length: MATRIX_MAX_ATTEMPTS },
      (_, attemptIndex) => `shards/${id}.attempt-${attemptIndex}.json`,
    );
    return {
      ...draft,
      id,
      scope: algorithmSpec?.scope ?? BENCHMARK_CASE_SPECS[draft.operation as BenchmarkOperation].scope,
      ...(algorithmSpec === undefined ? {} : {
        semanticScopeId: algorithmSpec.semanticScopeId,
        operationUnit: algorithmSpec.operationUnit,
        growthModel: algorithmSpec.growthModel,
      }),
      estimate: estimateMatrixBlock(draft.workload, draft.operation, policy, draft.algorithmId),
      invocations,
      shardPaths,
      shardPath: shardPaths[0]!,
    };
  });
  const estimatedTotal = blocks.reduce((sum, block) => Math.min(Number.MAX_SAFE_INTEGER, sum + block.estimate.conservativeUnitsAllInvocations), 0);
  if (estimatedTotal > limits.maxEstimatedWorkTotal && !limits.allowLarge) {
    throw new Error(`matrix estimate ${estimatedTotal} exceeds total limit ${limits.maxEstimatedWorkTotal}; use explicit allowLarge`);
  }
  return {
    format: MATRIX_MANIFEST_FORMAT,
    issuedAt: options.issuedAt ?? new Date().toISOString(),
    manifestId,
    ...(executionContract === "algorithm-dispatch/v2" ? { executionContract } : {}),
    suite,
    suiteDigest,
    source,
    sourceDigest,
    environment,
    environmentDigest,
    harness,
    harnessDigest,
    policy,
    policyDigest,
    limits,
    limitsDigest,
    legacyEvidence: options.legacyEvidence ?? null,
    blocks,
  };
}

function atomicWrite(path: string, content: string | Buffer, replace: boolean): void {
  if (!replace && existsSync(path)) throw new Error(`refusing to overwrite immutable artifact: ${path}`);
  mkdirSync(dirname(path), { recursive: true });
  const temporary = resolve(dirname(path), `.${basename(path)}.${process.pid}.${Date.now()}.tmp`);
  writeFileSync(temporary, content, { flag: "wx" });
  try {
    renameSync(temporary, path);
  } catch (error) {
    throw new Error(`could not atomically create ${path}`, { cause: error });
  }
}

function atomicCreate(path: string, content: string | Buffer): void {
  atomicWrite(path, content, false);
}

export function writeHashedJson(path: string, value: unknown): string {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const digest = sha256Bytes(content);
  atomicCreate(path, content);
  atomicCreate(`${path}.sha256`, `${digest}  ${basename(path)}\n`);
  return digest;
}

/** Aggregates are derived and replaceable; manifests and raw shards use writeHashedJson instead. */
export function replaceHashedJson(path: string, value: unknown): string {
  const content = `${JSON.stringify(value, null, 2)}\n`;
  const digest = sha256Bytes(content);
  atomicWrite(path, content, true);
  atomicWrite(`${path}.sha256`, `${digest}  ${basename(path)}\n`, true);
  return digest;
}

export function readExpectedHash(path: string): string {
  const sidecar = readFileSync(`${path}.sha256`, "utf8");
  const match = /^([0-9a-f]{64})  ([^\r\n]+)\r?\n?$/.exec(sidecar);
  if (match === null || match[2] !== basename(path)) throw new Error(`invalid hash sidecar: ${path}.sha256`);
  return match[1]!;
}

export function verifyHashedFile(path: string): string {
  const expected = readExpectedHash(path);
  const actual = sha256File(path);
  if (actual !== expected) throw new Error(`artifact hash mismatch: ${path}`);
  return actual;
}

const ALLOWED_ROOT_FILES = new Set([
  "manifest.json",
  "manifest.json.sha256",
  "legacy-report.json",
  "aggregate.json",
  "aggregate.json.sha256",
]);

export function assertMatrixOutputDirectory(outputDirectory: string, allowEmpty: boolean): void {
  const root = resolve(outputDirectory);
  if (!existsSync(root)) {
    if (!allowEmpty) throw new Error(`matrix output directory does not exist: ${root}`);
    return;
  }
  if (!statSync(root).isDirectory()) throw new Error("matrix output path must be a directory");
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.name === "shards" && entry.isDirectory()) {
      for (const shard of readdirSync(resolve(root, "shards"), { withFileTypes: true })) {
        if (!shard.isFile() || !/^block-[0-9a-f]{24}\.attempt-[0-2]\.json(?:\.sha256)?$/.test(shard.name)) {
          throw new Error(`matrix output contains unrelated shard content: ${shard.name}`);
        }
      }
      continue;
    }
    if (!entry.isFile() || !ALLOWED_ROOT_FILES.has(entry.name)) {
      throw new Error(`matrix output contains unrelated content: ${entry.name}`);
    }
  }
}

export function assertExactMatrixShardMembership(outputDirectory: string, manifest: MatrixManifest): void {
  const shardRoot = resolve(outputDirectory, "shards");
  if (!existsSync(shardRoot) || !statSync(shardRoot).isDirectory()) throw new Error("matrix shard directory is missing");
  const planned = new Set(manifest.blocks.flatMap((block) => block.shardPaths.flatMap((path) => {
    const name = basename(path);
    return [name, `${name}.sha256`];
  })));
  const observed = readdirSync(shardRoot, { withFileTypes: true });
  for (const entry of observed) {
    if (!entry.isFile() || !planned.has(entry.name)) {
      throw new Error(`matrix output contains unplanned shard artifact: ${entry.name}`);
    }
  }
  const observedNames = new Set(observed.map((entry) => entry.name));
  for (const block of manifest.blocks) {
    for (const path of block.shardPaths) {
      const name = basename(path);
      if (observedNames.has(name) !== observedNames.has(`${name}.sha256`)) {
        throw new Error(`matrix shard and hash sidecar membership differ: ${name}`);
      }
    }
  }
}

export function writeMatrixPlan(options: WriteMatrixPlanOptions): { readonly manifest: MatrixManifest; readonly manifestSha256: string } {
  const output = resolve(options.outputDirectory);
  assertMatrixOutputDirectory(output, true);
  if (existsSync(output) && readdirSync(output).length > 0) throw new Error("matrix plan output directory must be empty");
  mkdirSync(output, { recursive: true });
  let legacyEvidence = options.legacyEvidence ?? null;
  let legacyBytes: Buffer | undefined;
  if (options.legacyReportPath !== undefined) {
    legacyBytes = readFileSync(resolve(options.legacyReportPath));
    const report = JSON.parse(legacyBytes.toString("utf8")) as unknown;
    validateBenchmarkReport(report);
    legacyEvidence = {
      path: "legacy-report.json",
      sha256: sha256Bytes(legacyBytes),
      reportFormat: "simulation-playground/density-benchmark-report/v2",
    };
  }
  const manifest = createMatrixManifest({ ...options, legacyEvidence });
  if (legacyBytes !== undefined) atomicCreate(resolve(output, "legacy-report.json"), legacyBytes);
  const manifestSha256 = writeHashedJson(resolve(output, "manifest.json"), manifest);
  mkdirSync(resolve(output, "shards"));
  return { manifest, manifestSha256 };
}

function actualCellRunner(request: CellWorkerRequest, context: MatrixCellRunContext): CellWorkerResponse | MatrixIncompleteInvocation {
  const workerPath = fileURLToPath(new URL("./worker.js", import.meta.url));
  const v8Arguments = context.limits.v8HeapLimitMb === null ? [] : [`--max-old-space-size=${context.limits.v8HeapLimitMb}`];
  const started = Date.now();
  const child = spawnSync(process.execPath, [...v8Arguments, workerPath], {
    cwd: repositoryRoot(),
    env: { ...process.env, NODE_OPTIONS: context.environment.nodeOptions },
    input: JSON.stringify(request),
    encoding: "utf8",
    maxBuffer: context.limits.maxOutputBytesPerChild,
    timeout: context.limits.childTimeoutMs,
    killSignal: "SIGKILL",
    windowsHide: true,
  });
  const elapsedMs = Date.now() - started;
  if (child.error !== undefined) {
    const code = (child.error as NodeJS.ErrnoException).code;
    return {
      ...context.invocation,
      status: code === "ETIMEDOUT" ? "timeout" : code === "ENOBUFS" ? "resource-limit" : "failed",
      reason: `${code ?? "child-error"}: ${child.error.message}`.slice(0, 2_048),
      elapsedMs,
    };
  }
  if (child.status !== 0) {
    return {
      ...context.invocation,
      status: child.signal === "SIGKILL" && elapsedMs >= context.limits.childTimeoutMs ? "timeout" : "failed",
      reason: `child exited ${child.status ?? child.signal ?? "unknown"}: ${child.stderr.trim()}`.slice(0, 2_048),
      elapsedMs,
    };
  }
  try {
    return JSON.parse(child.stdout) as CellWorkerResponse;
  } catch (error) {
    return {
      ...context.invocation,
      status: "failed",
      reason: `child emitted invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      elapsedMs,
    };
  }
}

function actualParityRunner(
  workload: MatrixComparisonBlock["workload"],
  operation: MatrixOperation,
  algorithmId: string,
  limits: MatrixLimits,
  environment: MatrixEnvironment,
): ReturnType<MatrixParityRunner> {
  const workerPath = fileURLToPath(new URL("./matrix-parity-worker.js", import.meta.url));
  const v8Arguments = limits.v8HeapLimitMb === null ? [] : [`--max-old-space-size=${limits.v8HeapLimitMb}`];
  const started = Date.now();
  const child = spawnSync(process.execPath, [...v8Arguments, workerPath], {
    cwd: repositoryRoot(),
    env: { ...process.env, NODE_OPTIONS: environment.nodeOptions },
    input: JSON.stringify({ workload, operation, algorithmId }),
    encoding: "utf8",
    maxBuffer: limits.maxOutputBytesPerChild,
    timeout: limits.childTimeoutMs,
    killSignal: "SIGKILL",
    windowsHide: true,
  });
  const elapsedMs = Date.now() - started;
  if (child.error !== undefined) {
    const code = (child.error as NodeJS.ErrnoException).code;
    return {
      status: code === "ETIMEDOUT" ? "timeout" : code === "ENOBUFS" ? "resource-limit" : "failed",
      reason: `parity ${code ?? "child-error"}: ${child.error.message}`.slice(0, 2_048),
      elapsedMs,
    };
  }
  if (child.status !== 0) {
    return {
      status: child.signal === "SIGKILL" && elapsedMs >= limits.childTimeoutMs ? "timeout" : "failed",
      reason: `parity child exited ${child.status ?? child.signal ?? "unknown"}: ${child.stderr.trim()}`.slice(0, 2_048),
      elapsedMs,
    };
  }
  try {
    return JSON.parse(child.stdout) as Omit<NonNullable<MatrixShard["parity"]>, "strategy">;
  } catch (error) {
    return {
      status: "failed",
      reason: `parity child emitted invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
      elapsedMs,
    };
  }
}

function reduceStatus(results: readonly MatrixInvocationResult[]): MatrixTerminalStatus {
  if (results.every((entry) => entry.status === "completed")) return "completed";
  for (const status of ["resource-limit", "timeout", "failed", "not-run"] as const) {
    if (results.some((entry) => entry.status === status)) return status;
  }
  return "failed";
}

function notRun(invocation: MatrixInvocationPlan, reason: string, status: MatrixIncompleteInvocation["status"] = "not-run"): MatrixIncompleteInvocation {
  return { ...invocation, status, reason, elapsedMs: 0 };
}

function assertSameManifest(current: MatrixManifest, expected: MatrixManifest): void {
  for (const [label, left, right] of [
    ["manifest", current.manifestId, expected.manifestId],
    ["suite", current.suiteDigest, expected.suiteDigest],
    ["source", current.sourceDigest, expected.sourceDigest],
    ["environment", current.environmentDigest, expected.environmentDigest],
    ["harness", current.harnessDigest, expected.harnessDigest],
    ["policy", current.policyDigest, expected.policyDigest],
    ["limits", current.limitsDigest, expected.limitsDigest],
  ] as const) {
    if (left !== right) throw new Error(`matrix resume ${label} mismatch`);
  }
}

export function loadMatrixManifest(outputDirectory: string): { readonly manifest: MatrixManifest; readonly manifestSha256: string } {
  const path = resolve(outputDirectory, "manifest.json");
  const manifestSha256 = verifyHashedFile(path);
  const manifest = JSON.parse(readFileSync(path, "utf8")) as MatrixManifest;
  if (manifest.format !== MATRIX_MANIFEST_FORMAT) throw new Error("unsupported matrix manifest format");
  return { manifest, manifestSha256 };
}

function assertDeterministicMatrixManifest(manifest: MatrixManifest): void {
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
  if (canonicalDigest(rebuilt) !== canonicalDigest(manifest)) {
    throw new Error("matrix resume manifest does not match its deterministic plan");
  }
}

export function executeMatrix(options: ExecuteMatrixOptions): readonly MatrixShard[] {
  const output = resolve(options.outputDirectory);
  assertMatrixOutputDirectory(output, false);
  const loaded = loadMatrixManifest(output);
  assertDeterministicMatrixManifest(loaded.manifest);
  assertExactMatrixShardMembership(output, loaded.manifest);
  if (options.manifest !== undefined) assertSameManifest(loaded.manifest, options.manifest);
  const manifest = loaded.manifest;
  const currentSource = collectMatrixSource(output);
  const currentEnvironment = collectMatrixEnvironment();
  const currentHarness = collectMatrixHarnessIdentity();
  if (canonicalDigest(currentSource) !== manifest.sourceDigest) throw new Error("matrix resume source mismatch");
  if (canonicalDigest(currentEnvironment) !== manifest.environmentDigest) throw new Error("matrix resume environment mismatch");
  if (canonicalDigest(currentHarness) !== manifest.harnessDigest) throw new Error("matrix resume harness identity mismatch");
  const runner = options.cellRunner ?? actualCellRunner;
  const parityRunner = options.parityRunner ?? actualParityRunner;
  const now = options.now ?? Date.now;
  const started = now();
  const wallStarted = Date.now();
  const elapsedTotalMs = (): number => Math.max(0, now() - started, Date.now() - wallStarted);
  const shards: MatrixShard[] = [];

  for (const block of manifest.blocks) {
    const existingShards: MatrixShard[] = [];
    const completedLogicalIds = new Set<string>();
    let previousShardSha256: string | null = null;
    let nextAttemptIndex = 0;
    let parity: MatrixShard["parity"] = null;
    for (const [attemptIndex, relativePath] of block.shardPaths.entries()) {
      const shardPath = resolve(output, relativePath);
      if (!isWithin(shardPath, resolve(output, "shards")) || relative(output, shardPath).replaceAll("\\", "/") !== relativePath) {
        throw new Error(`matrix shard path traversal: ${relativePath}`);
      }
      const hasArtifact = existsSync(shardPath) || existsSync(`${shardPath}.sha256`);
      if (!hasArtifact) {
        if (block.shardPaths.slice(attemptIndex + 1).some((path) => existsSync(resolve(output, path)) || existsSync(`${resolve(output, path)}.sha256`))) {
          throw new Error(`matrix continuation shard gap: ${block.id}/attempt-${attemptIndex}`);
        }
        nextAttemptIndex = attemptIndex;
        break;
      }
      const digest = verifyHashedFile(shardPath);
      const existing = JSON.parse(readFileSync(shardPath, "utf8")) as MatrixShard;
      if (
        existing.manifestSha256 !== loaded.manifestSha256 ||
        existing.manifestId !== manifest.manifestId ||
        existing.suiteDigest !== manifest.suiteDigest ||
        existing.sourceDigest !== manifest.sourceDigest ||
        existing.environmentDigest !== manifest.environmentDigest ||
        existing.harnessDigest !== manifest.harnessDigest ||
        existing.policyDigest !== manifest.policyDigest ||
        existing.limitsDigest !== manifest.limitsDigest ||
        existing.blockId !== block.id ||
        existing.attemptIndex !== attemptIndex ||
        existing.previousShardSha256 !== previousShardSha256
      ) {
        throw new Error(`existing matrix shard does not match manifest or continuation chain: ${block.id}/attempt-${attemptIndex}`);
      }
      const plannedIds = new Map(block.invocations.map((plan) => [plan.attemptInvocationIds[attemptIndex], plan]));
      for (const result of existing.invocations) {
        const plan = plannedIds.get(result.invocationId);
        if (plan === undefined || result.layout !== plan.layout || result.processRound !== plan.processRound || result.orderIndex !== plan.orderIndex) {
          throw new Error(`existing matrix invocation was not issued by manifest: ${result.invocationId}`);
        }
        if (result.status === "completed") completedLogicalIds.add(plan.invocationId);
      }
      if (existing.parity !== null) {
        if (parity !== null && canonicalDigest(parity) !== canonicalDigest(existing.parity)) {
          throw new Error(`matrix parity changed across continuation shards: ${block.id}`);
        }
        parity = existing.parity;
      }
      previousShardSha256 = digest;
      existingShards.push(existing);
      nextAttemptIndex = attemptIndex + 1;
    }
    shards.push(...existingShards);
    if (completedLogicalIds.size === block.invocations.length || nextAttemptIndex >= block.shardPaths.length) continue;

    const shardPath = resolve(output, block.shardPaths[nextAttemptIndex]!);
    const pendingInvocations = block.invocations.filter((entry) => !completedLogicalIds.has(entry.invocationId));

    const results: MatrixInvocationResult[] = [];
    let parityFailure: MatrixParityRunFailure | undefined;
    const remainingTotalMs = manifest.limits.totalTimeoutMs - elapsedTotalMs();
    if (parity !== null) {
      // A validated earlier attempt already established parity for this immutable block.
    } else if (remainingTotalMs <= 0) {
      parityFailure = { status: "not-run", reason: "total matrix time budget exhausted before parity", elapsedMs: 0 };
    } else if (block.estimate.conservativeUnitsPerSample > manifest.limits.maxEstimatedWorkPerChild && !manifest.limits.allowLarge) {
      parityFailure = { status: "resource-limit", reason: "conservative parity work estimate exceeds limit", elapsedMs: 0 };
    } else {
      const effectiveParityTimeoutMs = Math.max(1, Math.floor(Math.min(manifest.limits.childTimeoutMs, remainingTotalMs)));
      const parityStartedAt = elapsedTotalMs();
      const parityResult = parityRunner(block.workload, block.operation, block.algorithmId, {
        ...manifest.limits,
        childTimeoutMs: effectiveParityTimeoutMs,
      }, manifest.environment);
      const parityCompletedAt = elapsedTotalMs();
      if ("status" in parityResult) parityFailure = parityResult;
      else if (
        parityCompletedAt >= manifest.limits.totalTimeoutMs ||
        parityCompletedAt - parityStartedAt > effectiveParityTimeoutMs
      ) {
        parityFailure = {
          status: "timeout",
          reason: "parity completion crossed the effective child or total matrix time budget",
          elapsedMs: parityCompletedAt - parityStartedAt,
        };
      } else parity = {
        strategy: "every-tick-and-direct-phase/v1",
        ...parityResult,
        ...(manifest.executionContract === "algorithm-dispatch/v2" ? {
          algorithmId: block.algorithmId,
          semanticScopeId: block.semanticScopeId!,
        } : {}),
      };
    }

    for (const logicalInvocation of pendingInvocations) {
      const invocation: MatrixInvocationPlan = {
        ...logicalInvocation,
        invocationId: logicalInvocation.attemptInvocationIds[nextAttemptIndex]!,
      };
      if (parityFailure !== undefined) {
        results.push({
          ...invocation,
          status: parityFailure.status,
          reason: parityFailure.reason,
          elapsedMs: parityFailure.elapsedMs,
        });
        continue;
      }
      const remainingBeforeChildMs = manifest.limits.totalTimeoutMs - elapsedTotalMs();
      if (remainingBeforeChildMs <= 0) {
        results.push(notRun(invocation, "total matrix time budget exhausted"));
        continue;
      }
      if (block.estimate.conservativeUnitsPerSample > manifest.limits.maxEstimatedWorkPerChild && !manifest.limits.allowLarge) {
        results.push(notRun(invocation, "conservative child work estimate exceeds limit", "resource-limit"));
        continue;
      }
      const effectiveChildTimeoutMs = Math.max(
        1,
        Math.floor(Math.min(manifest.limits.childTimeoutMs, remainingBeforeChildMs)),
      );
      const childStartedAt = elapsedTotalMs();
      const response = runner({
        workload: block.workload,
        operation: block.operation,
        algorithmId: block.algorithmId,
        variantId: invocation.layout,
        warmupSamples: manifest.policy.warmupSamplesPerProcess,
        measuredSamples: manifest.policy.measuredSamplesPerProcess,
      }, {
        invocation,
        limits: { ...manifest.limits, childTimeoutMs: effectiveChildTimeoutMs },
        environment: manifest.environment,
      });
      if ("status" in response) {
        results.push(response);
      } else {
        if (manifest.executionContract === "algorithm-dispatch/v2" && (
          response.operation !== block.operation ||
          response.algorithmId !== block.algorithmId ||
          response.semanticScopeId !== block.semanticScopeId
        )) {
          throw new Error(`matrix child algorithm identity mismatch: ${block.id}/${invocation.layout}`);
        }
        const childCompletedAt = elapsedTotalMs();
        const maximumReportedSampleMs = Math.max(...response.samples.map((sample) => sample.durationNs / 1_000_000));
        if (
          childCompletedAt >= manifest.limits.totalTimeoutMs ||
          childCompletedAt - childStartedAt > effectiveChildTimeoutMs ||
          maximumReportedSampleMs > effectiveChildTimeoutMs
        ) {
          results.push({
            ...invocation,
            status: "timeout",
            reason: "child completion crossed the effective child or total matrix time budget",
            elapsedMs: Math.max(childCompletedAt - childStartedAt, maximumReportedSampleMs),
          });
        } else {
          results.push({
            ...response,
            ...invocation,
            status: "completed",
            nodeOptions: manifest.environment.nodeOptions,
          });
        }
      }
    }
    const shard: MatrixShard = {
      format: MATRIX_SHARD_FORMAT,
      manifestSha256: loaded.manifestSha256,
      manifestId: manifest.manifestId,
      suiteDigest: manifest.suiteDigest,
      sourceDigest: manifest.sourceDigest,
      environmentDigest: manifest.environmentDigest,
      harnessDigest: manifest.harnessDigest,
      policyDigest: manifest.policyDigest,
      limitsDigest: manifest.limitsDigest,
      blockId: block.id,
      attemptIndex: nextAttemptIndex,
      previousShardSha256,
      blockDigest: block.deduplicationDigest,
      workloadDigest: block.workloadDigest,
      operation: block.operation,
      algorithmId: block.algorithmId,
      status: completedLogicalIds.size + results.filter((entry) => entry.status === "completed").length === block.invocations.length
        ? "completed"
        : reduceStatus(results),
      parity,
      invocations: results,
    };
    writeHashedJson(shardPath, shard);
    shards.push(shard);
  }
  return shards;
}

export function matrixSourceAsBenchmarkSource(source: MatrixSource): BenchmarkSource {
  return { revision: source.revision, dirty: source.dirty, lockfile: source.lockfile };
}

export function isSha256(value: string): boolean {
  return SHA256_PATTERN.test(value);
}
