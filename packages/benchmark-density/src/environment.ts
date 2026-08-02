import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { arch, cpus, platform, release, totalmem } from "node:os";
import { relative, resolve } from "node:path";

import type { BenchmarkEnvironment, BenchmarkSource } from "./report.js";

function git(args: readonly string[]): string {
  return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

export function collectBenchmarkSource(): BenchmarkSource {
  const revision = git(["rev-parse", "HEAD"]);
  if (revision.length === 0) throw new Error("could not resolve the benchmark source revision");
  const repositoryRoot = git(["rev-parse", "--show-toplevel"]);
  const lockfilePath = resolve(repositoryRoot, "package-lock.json");
  const lockfileDigest = createHash("sha256").update(readFileSync(lockfilePath)).digest("hex");
  return {
    revision,
    dirty: git(["status", "--porcelain"]).length > 0,
    lockfile: { path: relative(repositoryRoot, lockfilePath).replaceAll("\\", "/"), sha256: lockfileDigest },
  };
}

export function collectBenchmarkEnvironment(): BenchmarkEnvironment {
  return {
    platform: platform(),
    release: release(),
    arch: arch(),
    cpuModel: cpus()[0]?.model ?? "unknown",
    logicalCpuCount: cpus().length,
    totalMemoryBytes: totalmem(),
    node: process.version,
    v8: process.versions.v8,
  };
}
