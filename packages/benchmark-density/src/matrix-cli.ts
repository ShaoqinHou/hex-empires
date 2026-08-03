import { existsSync } from "node:fs";
import { resolve } from "node:path";

import type { MatrixLimits, MatrixSamplePolicy, MatrixSuiteId } from "./matrix-contract.js";
import {
  executeMatrix,
  loadMatrixManifest,
  writeMatrixPlan,
} from "./matrix-runner.js";
import { aggregateMatrix, enforceMatrixOutput, validateMatrixOutput } from "./matrix-validator.js";

export const MATRIX_COMMANDS = ["plan", "run", "aggregate", "validate", "enforce"] as const;
export type MatrixCommand = (typeof MATRIX_COMMANDS)[number];

export interface MatrixCliIo {
  readonly stdout: (value: string) => void;
}

interface MatrixCliArguments {
  readonly command: MatrixCommand;
  readonly outputDirectory: string;
  readonly suiteId: MatrixSuiteId;
  readonly suiteExplicit: boolean;
  readonly policy: Partial<MatrixSamplePolicy>;
  readonly limits: Partial<MatrixLimits>;
  readonly legacyReportPath: string | undefined;
  readonly quiet: boolean;
  readonly help: boolean;
}

type MutablePartial<Value> = { -readonly [Key in keyof Value]?: Value[Key] };

export const MATRIX_CLI_HELP = `Density scale matrix v1

Usage:
  benchmark-density plan      --output DIR [matrix options]
  benchmark-density run       --output DIR [matrix options]
  benchmark-density aggregate --output DIR
  benchmark-density validate  --output DIR
  benchmark-density enforce   --output DIR

Suites:
  --suite smoke              Real two-point/two-operation smoke (default)
  --suite claim              Curated one-factor-at-a-time claim suite
  --suite stress-linear      Non-claim linear resource-envelope preset
  --suite stress-quadratic   Non-claim all-pairs resource-envelope preset
  --suite spatial-index      Brute/grid structural and timing growth conformance

Sampling:
  --process-rounds N
  --warmup-per-process N
  --samples-per-process N
  --crossover-threshold R

Budgets and evidence:
  --child-timeout-ms N
  --total-timeout-ms N
  --max-work-per-child N
  --max-work-total N
  --max-output-bytes N
  --v8-heap-limit-mb N       V8 heap limit only; not a total-process memory limit
  --allow-large              Required for stress presets and estimates above normal gates
  --legacy-report PATH       Copy and bind an accepted v2 report for claim eligibility

Run creates a plan only when DIR is empty. Resume validates the immutable manifest,
source, environment, sampling policy, limits, and every existing shard hash. Output
directories refuse unrelated content. Aggregate and validate are offline.
`;

function next(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function integer(value: string, flag: string, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) throw new Error(`${flag} must be a safe integer of at least ${minimum}`);
  return parsed;
}

function ratio(value: string, flag: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed >= 1) throw new Error(`${flag} must be greater than zero and less than one`);
  return parsed;
}

export function parseMatrixArguments(args: readonly string[]): MatrixCliArguments {
  const command = args[0] as MatrixCommand | undefined;
  if (command === undefined || !MATRIX_COMMANDS.includes(command)) throw new Error(`unknown matrix command: ${command ?? "<missing>"}`);
  let outputDirectory: string | undefined;
  let suiteId: MatrixSuiteId = "smoke";
  let suiteExplicit = false;
  let legacyReportPath: string | undefined;
  let quiet = false;
  let help = false;
  const policy: MutablePartial<MatrixSamplePolicy> = {};
  const limits: MutablePartial<MatrixLimits> = {};
  for (let index = 1; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--help" || argument === "-h") help = true;
    else if (argument === "--quiet") quiet = true;
    else if (argument === "--output") {
      outputDirectory = next(args, index, argument);
      index += 1;
    } else if (argument === "--suite") {
      const value = next(args, index, argument) as MatrixSuiteId;
      if (!["smoke", "claim", "stress-linear", "stress-quadratic", "spatial-index"].includes(value)) throw new Error(`unknown matrix suite: ${value}`);
      suiteId = value;
      suiteExplicit = true;
      index += 1;
    } else if (argument === "--legacy-report") {
      legacyReportPath = next(args, index, argument);
      index += 1;
    } else if (argument === "--process-rounds") {
      policy.processRounds = integer(next(args, index, argument), argument, 1);
      index += 1;
    } else if (argument === "--warmup-per-process") {
      policy.warmupSamplesPerProcess = integer(next(args, index, argument), argument, 0);
      index += 1;
    } else if (argument === "--samples-per-process") {
      policy.measuredSamplesPerProcess = integer(next(args, index, argument), argument, 1);
      index += 1;
    } else if (argument === "--crossover-threshold") {
      policy.crossoverPracticalThreshold = ratio(next(args, index, argument), argument);
      index += 1;
    } else if (argument === "--child-timeout-ms") {
      limits.childTimeoutMs = integer(next(args, index, argument), argument, 1);
      index += 1;
    } else if (argument === "--total-timeout-ms") {
      limits.totalTimeoutMs = integer(next(args, index, argument), argument, 1);
      index += 1;
    } else if (argument === "--max-work-per-child") {
      limits.maxEstimatedWorkPerChild = integer(next(args, index, argument), argument, 1);
      index += 1;
    } else if (argument === "--max-work-total") {
      limits.maxEstimatedWorkTotal = integer(next(args, index, argument), argument, 1);
      index += 1;
    } else if (argument === "--max-output-bytes") {
      limits.maxOutputBytesPerChild = integer(next(args, index, argument), argument, 1);
      index += 1;
    } else if (argument === "--v8-heap-limit-mb") {
      limits.v8HeapLimitMb = integer(next(args, index, argument), argument, 16);
      index += 1;
    } else if (argument === "--allow-large") {
      limits.allowLarge = true;
    } else {
      throw new Error(`unknown matrix argument: ${argument}`);
    }
  }
  if (!help && outputDirectory === undefined) throw new Error("matrix command requires --output DIR");
  return {
    command,
    outputDirectory: resolve(outputDirectory ?? "."),
    suiteId,
    suiteExplicit,
    policy,
    limits,
    legacyReportPath,
    quiet,
    help,
  };
}

function hasPlanningOverrides(parsed: MatrixCliArguments): boolean {
  return parsed.suiteExplicit || Object.keys(parsed.policy).length > 0 || Object.keys(parsed.limits).length > 0 || parsed.legacyReportPath !== undefined;
}

export function runMatrixCli(
  args: readonly string[],
  io: MatrixCliIo = { stdout: (value) => process.stdout.write(value) },
): unknown {
  const parsed = parseMatrixArguments(args);
  if (parsed.help) {
    io.stdout(MATRIX_CLI_HELP);
    return undefined;
  }
  let result: unknown;
  if (parsed.command === "plan") {
    result = writeMatrixPlan({
      outputDirectory: parsed.outputDirectory,
      suiteId: parsed.suiteId,
      policy: parsed.policy,
      limits: parsed.limits,
      legacyReportPath: parsed.legacyReportPath,
    });
  } else if (parsed.command === "run") {
    const manifestPath = resolve(parsed.outputDirectory, "manifest.json");
    if (!existsSync(manifestPath)) {
      writeMatrixPlan({
        outputDirectory: parsed.outputDirectory,
        suiteId: parsed.suiteId,
        policy: parsed.policy,
        limits: parsed.limits,
        legacyReportPath: parsed.legacyReportPath,
      });
    } else if (hasPlanningOverrides(parsed)) {
      const existing = loadMatrixManifest(parsed.outputDirectory).manifest;
      if (parsed.suiteExplicit && existing.suite.id !== parsed.suiteId) throw new Error("matrix resume suite mismatch");
      if (Object.entries(parsed.policy).some(([key, value]) => existing.policy[key as keyof MatrixSamplePolicy] !== value)) {
        throw new Error("matrix resume policy mismatch");
      }
      if (Object.entries(parsed.limits).some(([key, value]) => existing.limits[key as keyof MatrixLimits] !== value)) {
        throw new Error("matrix resume limits mismatch");
      }
      if (parsed.legacyReportPath !== undefined) throw new Error("legacy evidence cannot be changed during matrix resume");
    }
    result = executeMatrix({ outputDirectory: parsed.outputDirectory });
  } else if (parsed.command === "aggregate") {
    result = aggregateMatrix(parsed.outputDirectory);
  } else if (parsed.command === "validate") {
    result = validateMatrixOutput(parsed.outputDirectory);
  } else {
    result = enforceMatrixOutput(parsed.outputDirectory);
  }
  if (!parsed.quiet) io.stdout(`${JSON.stringify(result, null, 2)}\n`);
  return result;
}
