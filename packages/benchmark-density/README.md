# Density benchmark host

The original command-line options and `density-benchmark-report/v2` validator
remain the single-workload baseline path. Matrix v1 adds a separate, curated
one-factor-at-a-time scale path; it does not reinterpret an existing v2 report.

After building the workspace, a real matrix smoke can be run and validated with:

```powershell
node packages/benchmark-density/dist/cli.js run --suite smoke --output $matrixOutput
node packages/benchmark-density/dist/cli.js aggregate --output $matrixOutput
node packages/benchmark-density/dist/cli.js validate --output $matrixOutput
```

`plan` creates only the immutable manifest. `run` creates the plan when the
directory is empty or resumes exact matching work. It validates the manifest,
current source and environment, and every existing shard hash before scheduling
missing comparison blocks. `aggregate` recomputes process and pooled summaries,
ratios, eligible empirical slopes, log-log fits, and conservative crossover
brackets from raw shards. `validate` independently repeats those checks offline.

The checked-in suites are:

- `smoke`: two capacities by the real update and all-pairs operations;
- `claim`: state scale, occupancy, slot pattern, spatial density and shape,
  churn intensity, and replay length families;
- `stress-linear`: large direct-update probes; and
- `stress-quadratic`: large brute-force all-pairs probes.

Stress plans require `--allow-large`. All plans record child and total time
budgets, conservative work and output estimates, an optional V8 heap limit, and
the fact that a V8 heap limit is not a total-process or typed-array memory limit.
A timeout, failure, resource limit, or unrun invocation is terminal evidence and
never contributes a latency sample.

Manifest-issued invocation IDs identify logical layout/round/attempt work. The
actual runner starts one fresh child for each call, but recorded operating-system
PIDs are diagnostic only: an OS may legitimately reuse a PID after a prior child
has exited, so PID global uniqueness is not an evidence or resume requirement.

Source discovery is anchored to the benchmark module's repository rather than
the caller's current directory. Manifests also bind the Node executable hash,
normalized `NODE_OPTIONS`, and the exact CLI, runner, validator, measurement, and
worker file hashes. Children run from that repository root with precisely the
manifest's `NODE_OPTIONS`; claim plans reject non-empty `NODE_OPTIONS`.

Claim eligibility additionally requires `--legacy-report PATH` at planning time.
That report is copied into the output, hash-bound in the manifest, validated by
the unchanged v2 validator, and must itself be claim eligible. Matrix smoke and
stress output are always claim-ineligible.

The root workflow runs the real smoke path during `npm run verify` and exposes
the persistent `npm run bench:density:matrix -- ...` command. That persistent
path always performs a clean build before invoking this package because matrix
v1 binds the direct harness files but not yet their complete transitive compiled
JavaScript closure. No additional TypeScript alias is needed because this
package exports the matrix API through its existing package entry point.
