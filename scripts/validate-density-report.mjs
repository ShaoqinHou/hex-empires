import { readFile } from "node:fs/promises";
import path from "node:path";

import { validateBenchmarkReport } from "../packages/benchmark-density/dist/report.js";

const requestedPath = process.argv[2];
if (requestedPath === undefined) {
  throw new Error("usage: npm run bench:density:validate -- <report.json>");
}

const reportPath = path.resolve(requestedPath);
const report = JSON.parse(await readFile(reportPath, "utf8"));
validateBenchmarkReport(report);

console.log(
  JSON.stringify({
    valid: true,
    claimEligible: report.claimEligibility.eligible,
    reasons: report.claimEligibility.reasons,
    revision: report.source.revision,
    workloadDigest: report.workload.digest,
    cases: report.cases.length,
  }),
);
