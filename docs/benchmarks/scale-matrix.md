# Scale matrix contract

## Question

Where do operation, storage-layout, distribution, and environment costs change
growth behavior or cross a practical budget? This extends the accepted density
baseline; it does not rewrite or weaken the v2 single-workload report.

The suite is curated rather than a Cartesian product. Each family changes one
factor while declaring all fixed or derived controls. Identical point/operation
blocks are deduplicated by workload digest.

## Claim families

| Family | Points | Operations | Controlled question |
| --- | --- | --- | --- |
| State scale | capacity 128, 256, 512, 1,024 at 75% occupancy | all six density operations | Layout and operation growth with roughly fixed spatial density and churn fraction |
| Slot occupancy | capacity 1,024; 25%, 50%, 75%, 100% active | update, all-pairs | Sparse-scan cost at fixed capacity |
| Slot pattern | packed prefix versus evenly spaced at 1,024/256 | update, all-pairs | Branch/scan sensitivity to live-slot placement |
| Spatial density | coordinate limits 2,048, 4,096, 8,192 at 512/384 | all-pairs | Neighbor-hit density without changing pair count |
| Spatial shape | uniform square versus deterministic four-cluster | all-pairs | Distribution shape at fixed bounds and count |
| Churn intensity | 0, 8, 32, 96 symmetric transitions at 512/384 | churn | Transition-rate scaling |
| Replay length | 5, 20, 80 ticks at 512/384 | replay | Fixed versus per-tick end-to-end cost |

The first state-scale curve uses coordinate limits 2,048, 2,896, 4,096, and
5,793 with churn 8, 16, 32, and 64. These derived values keep the intended
density and churn ratios approximately controlled as count grows.

CI runs only a two-point/two-operation matrix smoke with no time threshold. A
claim run uses the complete checked-in suite. Larger linear and quadratic stress
profiles are separate, require explicit resource limits, and are never
claim-eligible.

## Evidence layout

Long runs are planned and sharded. A manifest binds source, lockfile, executable,
runtime/environment, suite digest, limits, ordered workloads, algorithm IDs, and
expected shard IDs. Each shard is one comparison block with independent fresh
processes per storage layout and terminal state `completed`, `timeout`, `failed`,
`resource-limit`, or `not-run`.

Raw shards are immutable. Resume validates the manifest and existing shard hashes
and never overwrites completed work. The aggregate contains compact summaries and
references raw artifacts by relative path and SHA-256. Invocation IDs, rather
than globally unique operating-system PIDs, identify child runs.

One aggregate represents exactly one environment. Reports from different CPU,
OS, Node/V8, runtime flags, browser, or GPU environments may be displayed beside
one another only when source, lockfile, suite, scopes, algorithms, and sampling
policy match. Samples and percentiles are never pooled across environments.

## Growth analysis

Every numeric series reports raw x values, per-process medians, pooled median and
p95, and storage-layout ratios. Adjacent empirical slopes use:

```text
alpha = ln(y2 / y1) / ln(x2 / x1)
```

With at least four positive geometric points, the aggregate may also report a
log-log least-squares slope and R-squared. These are empirical exponents over the
measured interval, not Big-O proofs.

A crossover is reported only as a bracket between adjacent tested points. Its
direction must agree across process-round medians and exceed a declared practical
threshold at both ends; otherwise it is unresolved. Layout crossovers keep the
algorithm fixed. Algorithm crossovers keep the layout fixed and require a full
layout × algorithm factorial.

Categorical factors such as slot pattern and spatial shape receive ratios, not
invented exponents.

## Failure and scale discipline

Before scheduling, the runner estimates linear scans, pair candidates, replay
work, and output size. Oversized plans require an explicit stress opt-in. Child
and total run budgets are recorded. A V8 heap flag is described only as a V8 heap
limit because typed-array/external memory may lie outside it.

A timeout or resource failure is part of the envelope. It is never converted to
a latency sample and never silently removed from a curve. "Extremely large" is
earned only by a named operation and environment reaching a declared budget;
unrelated entity, AI, rendering, history, and network axes keep separate claims.

## Claim-grade gate

A claim-grade aggregate requires:

1. the accepted v2 baseline still validates unchanged;
2. a clean 40-hex source revision and matching lockfile/suite digests;
3. exact family factors and complete expected coverage;
4. independent fresh-process layout cells with the declared sample policy;
5. semantic parity for every required tick or direct phase;
6. no timeout, failure, resource-limit, or censored sample in the claim suite;
7. recomputable statistics, ratios, slopes, and crossover brackets;
8. no comparison across source, environment, algorithm, scope, or workload-family
   boundaries; and
9. an independent offline validator that rejects missing, duplicated, tampered,
   traversing, or mixed-environment artifacts.

Smoke and stress outputs remain structurally useful and always claim-ineligible.

## Running it

The root verification suite runs a real two-point/two-operation smoke through 12
fresh child processes in a temporary directory, validates it, and removes the
temporary evidence:

```text
npm run bench:density:matrix:smoke
```

Plan, run/resume, aggregate, and independently validate a persistent matrix:

```text
npm run bench:density:matrix -- plan --suite claim --output benchmarks/density/runs/my-run --legacy-report benchmarks/density/results/density-baseline-f9c22f4-win32-node24-i7-12700h.json
npm run bench:density:matrix -- run --output benchmarks/density/runs/my-run
npm run bench:density:matrix -- aggregate --output benchmarks/density/runs/my-run
npm run bench:density:matrix -- validate --output benchmarks/density/runs/my-run
```

The persistent root command deliberately performs `tsc -b --clean` before the
build. The v1 manifest hashes the direct matrix harness and worker files, but not
yet the complete transitive compiled-JavaScript closure, so a forced clean build
is a required claim-run mitigation. Expanding that digest is tracked as a future
evidence-hardening improvement.

Each logical layout/round cell has one initial attempt and two hash-linked,
immutable continuation attempts. Completed cells are never rerun; failed or
timed-out evidence remains in the chain. Exhausting the bounded attempts is a
recorded limit, not silent retry.

## Accepted matrix: 75be7cd on the i7-12700H host

The first accepted matrix is checked in at
[`benchmarks/density/results/density-matrix-75be7cd-win32-node24-i7-12700h`](../../benchmarks/density/results/density-matrix-75be7cd-win32-node24-i7-12700h/aggregate.json).
It binds clean source revision `75be7cd7e2a373e8da725b75f05bb2096d6985f9`,
Node 24.15.0/V8 13.6, Windows `10.0.26200`, an i7-12700H, an empty
`NODE_OPTIONS`, the accepted legacy v2 baseline, 22 points, 44 deduplicated
blocks, and 132 layout summaries. All 44 first-attempt shards completed and the
offline validator reports claim eligibility with no reasons.

The table below is the 1,024-slot, 768-active state-scale point. Each value is
pooled median / p95; update is in microseconds and the other rows are in
milliseconds.

| Operation | Object | SoA | Hybrid |
| --- | ---: | ---: | ---: |
| Direct update (µs) | 30.96 / 37.35 | 6.80 / 7.83 | 9.80 / 21.63 |
| Brute-force all-pairs (ms) | 1.200 / 1.564 | 1.248 / 1.458 | 1.721 / 1.985 |
| Full audit capture (ms) | 6.245 / 9.947 | 5.839 / 10.567 | 5.629 / 7.555 |
| 20-tick end-to-end replay (ms) | 36.378 / 40.527 | 37.347 / 45.588 | 46.644 / 54.966 |

Within the tested 128–1,024 interval, the log-log fitted exponents were
1.93–2.08 for brute-force all-pairs, 0.88–0.98 for full audit capture, and
1.27–1.39 for end-to-end replay. These are measured interval shapes, not
complexity proofs. They justify prioritizing a spatial-index experiment and
keeping audit capture out of the live timeline path.

The aggregate also contains three conservative candidate crossover brackets:
object/SoA capture between 128 and 256 slots, SoA/object churn between 256 and
512, and object/hybrid snapshot materialization between 256 and 512. They pass
the within-run round-consistency and 5% practical gates, but need an independent
session before becoming selection policy. This is positive evidence for keeping
mutation and storage scenario-owned rather than choosing one repository-wide
layout.

This accepted suite stops at 1,024 slots. It validates the curve machinery and
the named interval; it is not an "extremely large" capacity claim. The separate
linear and quadratic stress suites are the next resource-envelope evidence and
remain claim-ineligible by design.
