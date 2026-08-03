#!/usr/bin/env node

import type { DensityWorkload } from "@hex-empires/scenario-density";

import { proveBenchmarkParity } from "./measure.js";
import type { BenchmarkOperation } from "./report.js";

interface MatrixParityWorkerRequest {
  readonly workload: DensityWorkload;
  readonly operation: BenchmarkOperation;
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const request = JSON.parse(input) as MatrixParityWorkerRequest;
    process.stdout.write(JSON.stringify(proveBenchmarkParity(request.workload, [request.operation])[0]));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
});
