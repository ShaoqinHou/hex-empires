#!/usr/bin/env node

import type { DensityWorkload } from "@hex-empires/scenario-density";

import { proveBenchmarkParity, proveNeighborAlgorithmParity } from "./measure.js";
import type { MatrixOperation } from "./matrix-algorithms.js";

interface MatrixParityWorkerRequest {
  readonly workload: DensityWorkload;
  readonly operation: MatrixOperation;
  readonly algorithmId: string;
}

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const request = JSON.parse(input) as MatrixParityWorkerRequest;
    const result = request.operation === "neighbor-pairs"
      ? proveNeighborAlgorithmParity(request.workload, request.algorithmId)
      : proveBenchmarkParity(request.workload, [request.operation])[0];
    process.stdout.write(JSON.stringify(result));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
});
