#!/usr/bin/env node

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { densityBaselineWorkload, densitySmokeWorkload } from "@hex-empires/scenario-density";

import { runDensityBenchmark } from "./measure.js";
import { MATRIX_COMMANDS, runMatrixCli } from "./matrix-cli.js";
import { BENCHMARK_OPERATIONS, BENCHMARK_VARIANTS, type BenchmarkOperation, type DensityBenchmarkReport, type VariantId } from "./report.js";

type WorkloadName = "baseline" | "smoke";

export interface CliIo {
  readonly stdout: (value: string) => void;
}

interface ParsedArguments {
  readonly workload: WorkloadName;
  readonly processRounds: number;
  readonly warmupSamplesPerProcess: number;
  readonly measuredSamplesPerProcess: number;
  readonly operations: readonly BenchmarkOperation[] | undefined;
  readonly variantIds: readonly VariantId[] | undefined;
  readonly output: string | undefined;
  readonly quiet: boolean;
  readonly help: boolean;
}

export const CLI_HELP = `Density storage-layout benchmark

Usage:
  npm run bench:density -- [options]

Workloads:
  --workload baseline   Checked-in non-smoke workload (default; claim candidate)
  --workload smoke      Tiny wiring workload; never claim eligible
  --smoke               Shortcut for smoke, 1 process round, 1 warmup, 2 samples

Process policy:
  --process-rounds N          Fresh child-process rounds per case cell (default: 3)
  --warmup-per-process N      Untimed warmups in every child (default: 5)
  --samples-per-process N     Raw timed samples in every child (default: 10)

Selection (repeatable):
  --case NAME       ${BENCHMARK_OPERATIONS.join(", ")}
  --variant NAME    ${BENCHMARK_VARIANTS.join(", ")}

Output:
  --output PATH     Create a JSON report; refuses to overwrite an existing file
  --quiet           Suppress stdout (useful for smoke validation)
  --help            Show this help without running a benchmark

The default is the baseline workload. A report is claim eligible only when the
full matrix and claim-grade process policy run from a clean 40-hex revision with
lockfile, environment, per-phase parity, raw-process, and replay evidence.
`;

function nextArgument(args: readonly string[], index: number, flag: string): string {
  const value = args[index + 1];
  if (value === undefined || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function parseInteger(value: string, flag: string, minimum: number): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${flag} must be a safe integer of at least ${minimum}`);
  }
  return parsed;
}

export function parseArguments(args: readonly string[]): ParsedArguments {
  let workload: WorkloadName = "baseline";
  let processRounds = 3;
  let warmupSamplesPerProcess = 5;
  let measuredSamplesPerProcess = 10;
  let output: string | undefined;
  let quiet = false;
  let help = false;
  let explicitWorkload = false;
  const operations: BenchmarkOperation[] = [];
  const variantIds: VariantId[] = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--help" || argument === "-h") {
      help = true;
    } else if (argument === "--smoke") {
      if (explicitWorkload && workload !== "smoke") throw new Error("--smoke conflicts with --workload baseline");
      workload = "smoke";
      processRounds = 1;
      warmupSamplesPerProcess = 1;
      measuredSamplesPerProcess = 2;
    } else if (argument === "--workload") {
      const value = nextArgument(args, index, argument);
      if (value !== "baseline" && value !== "smoke") throw new Error(`unknown density workload: ${value}`);
      workload = value;
      explicitWorkload = true;
      index += 1;
    } else if (argument === "--quiet") {
      quiet = true;
    } else if (argument === "--process-rounds") {
      processRounds = parseInteger(nextArgument(args, index, argument), argument, 1);
      index += 1;
    } else if (argument === "--warmup-per-process") {
      warmupSamplesPerProcess = parseInteger(nextArgument(args, index, argument), argument, 0);
      index += 1;
    } else if (argument === "--samples-per-process") {
      measuredSamplesPerProcess = parseInteger(nextArgument(args, index, argument), argument, 1);
      index += 1;
    } else if (argument === "--warmup" || argument === "--samples") {
      throw new Error(`${argument} is ambiguous with process isolation; use --warmup-per-process or --samples-per-process`);
    } else if (argument === "--output") {
      output = nextArgument(args, index, argument);
      index += 1;
    } else if (argument === "--case") {
      const operation = nextArgument(args, index, argument) as BenchmarkOperation;
      if (!BENCHMARK_OPERATIONS.includes(operation)) throw new Error(`unknown benchmark case: ${operation}`);
      operations.push(operation);
      index += 1;
    } else if (argument === "--variant") {
      const variant = nextArgument(args, index, argument) as VariantId;
      if (!BENCHMARK_VARIANTS.includes(variant)) throw new Error(`unknown density variant: ${variant}`);
      variantIds.push(variant);
      index += 1;
    } else {
      throw new Error(`unknown argument: ${argument}`);
    }
  }

  return {
    workload,
    processRounds,
    warmupSamplesPerProcess,
    measuredSamplesPerProcess,
    operations: operations.length === 0 ? undefined : operations,
    variantIds: variantIds.length === 0 ? undefined : variantIds,
    output,
    quiet,
    help,
  };
}

export function runCli(
  args: readonly string[],
  io: CliIo = { stdout: (value) => process.stdout.write(value) },
): DensityBenchmarkReport | undefined {
  const parsed = parseArguments(args);
  if (parsed.help) {
    io.stdout(CLI_HELP);
    return undefined;
  }
  const report = runDensityBenchmark({
    workload: parsed.workload === "baseline" ? densityBaselineWorkload : densitySmokeWorkload,
    processRounds: parsed.processRounds,
    warmupSamplesPerProcess: parsed.warmupSamplesPerProcess,
    measuredSamplesPerProcess: parsed.measuredSamplesPerProcess,
    operations: parsed.operations,
    variantIds: parsed.variantIds,
  });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (parsed.output !== undefined) {
    writeFileSync(resolve(parsed.output), json, { encoding: "utf8", flag: "wx" });
  }
  if (!parsed.quiet) io.stdout(json);
  return report;
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && fileURLToPath(import.meta.url) === resolve(entrypoint)) {
  try {
    const args = process.argv.slice(2);
    const matrixArgs = args[0] === "matrix" ? args.slice(1) : args;
    if (MATRIX_COMMANDS.includes(matrixArgs[0] as (typeof MATRIX_COMMANDS)[number])) runMatrixCli(matrixArgs);
    else runCli(args);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
