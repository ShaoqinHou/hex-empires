import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  aggregateMatrix,
  executeMatrix,
  validateMatrixOutput,
  writeMatrixPlan,
} from "../packages/benchmark-density/dist/index.js";

const outputDirectory = mkdtempSync(join(tmpdir(), "hex-empires-density-matrix-smoke-"));

try {
  const { manifest } = writeMatrixPlan({ outputDirectory, suiteId: "smoke" });
  const shards = executeMatrix({ outputDirectory });
  const aggregate = aggregateMatrix(outputDirectory);
  const validated = validateMatrixOutput(outputDirectory);

  const completed = shards.every((shard) => shard.status === "completed");
  const processIds = new Set(
    shards.flatMap((shard) =>
      shard.invocations
        .filter((invocation) => invocation.status === "completed")
        .map((invocation) => invocation.pid),
    ),
  );
  if (!completed) throw new Error("matrix smoke produced an incomplete shard");
  if (manifest.blocks.length !== 4) throw new Error("matrix smoke did not plan four comparison blocks");
  if (aggregate.summaries.length !== 12 || validated.summaries.length !== 12) {
    throw new Error("matrix smoke did not produce twelve layout summaries");
  }
  if (processIds.size !== 12) throw new Error("matrix smoke did not use twelve distinct child processes");
  if (validated.claimEligibility.eligible) throw new Error("matrix smoke must never be claim eligible");

  console.log(
    `density matrix smoke passed: ${manifest.suite.points.length} points, ${manifest.blocks.length} blocks, ${processIds.size} fresh child processes`,
  );
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}
