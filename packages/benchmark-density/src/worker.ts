#!/usr/bin/env node

import { measureBenchmarkCell, type CellWorkerRequest } from "./measure.js";

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk: string) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const request = JSON.parse(input) as CellWorkerRequest;
    process.stdout.write(JSON.stringify(measureBenchmarkCell(request)));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
});
