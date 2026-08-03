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

### Theory-backed spatial growth

The `spatial-index-steady` suite is separate from the accepted general claim matrix. It
crosses two algorithms with all three layouts over five geometric counts from 32
through 8,192 in each of two families:

| Family | Brute expectation | Dense-CSR grid expectation |
| --- | --- | --- |
| Fixed density, fixed radius | exact `n(n-1)/2`, quadratic | output-sensitive `n + C + K`, approximately linear here |
| Coincident positions | exact `n(n-1)/2`, quadratic | quadratic because `K = n(n-1)/2` |

The validator checks brute structural identities and the coincident grid's exact
`n`, `C`, and `K` relations in every raw invocation. It retains the full
five-point log-log fit, but assesses the dominant structural exponent over the
largest three points (a 16x input span). This finite-range rule is explicit
because fixed grid traversal cost dominates the smallest coincident cases even
when the implementation is correct.

`validate` checks artifact integrity and recomputes all results without deleting
a mismatch. `enforce` is the guidance gate: all twelve structural assessments
(two families x two algorithms x three layouts) must be present and consistent,
and no high-quality timing assessment may require audit. Inconclusive timing is
retained but does not pretend to confirm a complexity class.

Grid/brute timing ratios are descriptive within-run evidence. Matching process
round numbers do not temporally interleave separate immutable algorithm shards,
so the aggregate records that drift limitation and the ratios are not selection
policy.

The steady-state policy uses three fresh-process rounds, five warmups, and ten
measured samples. Counts 32, 128, 512, 2,048, and 8,192 execute respectively 64,
16, 4, 1, and 1 complete query passes per sample; duration is divided by that
declared operation count. This makes light-load cells exercise the same hot code
meaningfully without removing grid clearing, CSR rebuilding, exact filtering, or
fingerprinting from the timer. Cold/first-call latency is a separate experiment.
The worst-case estimator charges every grid pass as all-pairs work and admits
this suite under a pinned 21-billion-unit limit, not a generic large-run bypass.

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

Run and enforce the spatial suite with the same persistent command:

```text
npm run bench:density:matrix -- plan --suite spatial-index-steady --output benchmarks/density/runs/my-spatial-run
npm run bench:density:matrix -- run --output benchmarks/density/runs/my-spatial-run
npm run bench:density:matrix -- aggregate --output benchmarks/density/runs/my-spatial-run
npm run bench:density:matrix -- validate --output benchmarks/density/runs/my-spatial-run
npm run bench:density:matrix -- enforce --output benchmarks/density/runs/my-spatial-run
```

The persistent root command deliberately performs `tsc -b --clean` before the
build. The manifest hashes the host, workers, suite/contract definitions, and
the direct density workload/grid/layout implementation files. It does not hash
every transitive kernel or third-party module, so the forced clean build and
whole-worktree source identity remain required evidence controls.

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

## First resource envelopes: 87c33a8

Two checked-in stress runs bind the same clean revision
`87c33a86ce964a1e0c5e497169412f0712070f54` and environment as the accepted
matrix host:

- [`stress-linear`](../../benchmarks/density/results/density-stress-linear-87c33a8-win32-node24-i7-12700h/aggregate.json)
  measured direct update at 2,048, 8,192, and 32,768 slots;
- [`stress-quadratic`](../../benchmarks/density/results/density-stress-quadratic-87c33a8-win32-node24-i7-12700h/aggregate.json)
  measured brute-force all-pairs at 2,048, 4,096, and 8,192 slots.

All six comparison blocks completed with parity and no timeout or resource
failure. At the largest point, the one-shot per-operation measurements were:

| Envelope | Object | SoA | Hybrid |
| --- | ---: | ---: | ---: |
| Direct update, 32,768 slots | 1.347 ms | 0.308 ms | 0.403 ms |
| Brute-force all-pairs, 8,192 slots | 75.753 ms | 84.327 ms | 115.734 ms |

These runs intentionally use one process, no warmup, and one measured sample.
They locate a resource envelope; they have no p95 and are claim-ineligible. The
linear result justifies a replicated large-count update curve. The quadratic
result is already above a 16.67 ms frame on every layout and kills brute-force
all-pairs as the large-world neighbor strategy before any renderer, AI, history,
or network cost is added. Track 3A should next compare a spatial index against
the same all-pairs oracle as a full algorithm-by-layout experiment.

## Spatial timing audit: c7c30ff

The first spatial artifact is retained at
[`density-spatial-audit-c7c30ff-win32-node24-i7-12700h`](../../benchmarks/density/results/density-spatial-audit-c7c30ff-win32-node24-i7-12700h/aggregate.json).
Its 20 blocks and 180 child invocations completed, and offline validation passes.
Structural conformance passed in all twelve cells: brute tail exponents were
`2.0007`, fixed-density grid was `0.9957`, and coincident grid was `1.9886`.

Enforcement correctly rejected the artifact's timing guidance. The run used only
one warmup, three samples, and one pass per sample; the smallest cells took about
50–95 microseconds. V8 tiering and fixed call cost produced smooth but
pre-asymptotic full-range slopes of `0.51–0.58` for the fixed-density grid and
`1.26` for hybrid brute force. Exact work and tail behavior ruled out an
algorithm or semantic defect. The artifact therefore records the falsified
sampling policy; the higher-intensity steady-state policy above replaces it.

## Accepted steady-state spatial conformance: 26fbe5c

The replacement artifact is checked in at
[`density-spatial-steady-26fbe5c-win32-node24-i7-12700h`](../../benchmarks/density/results/density-spatial-steady-26fbe5c-win32-node24-i7-12700h/aggregate.json).
It binds the clean source revision `26fbe5c0addd4a2c0f20e8ff8c88cecaf400eddc`,
Node 24.15.0/V8 13.6, Windows `10.0.26200`, an i7-12700H, empty
`NODE_OPTIONS`, 20 blocks, and 180 fresh child invocations. Every block completed;
offline validation and the separate spatial `enforce` gate both pass.

All twelve structural assessments are consistent:

| Family and algorithm | Expected exponent | Observed tail exponent |
| --- | ---: | ---: |
| Fixed-density brute | 2 | 2.0007 |
| Coincident brute | 2 | 2.0007 |
| Fixed-density dense CSR | 1 | 0.9957 |
| Coincident dense CSR | 2 | 1.9886 |

Nine of twelve timing assessments are consistent. Three are inconclusive—not
failed—because process-round spread exceeds the declared threshold: coincident
brute in object and SoA storage, and fixed-density grid in SoA storage. No timing
assessment is `audit-required`.

At 8,192 active entities, per-pass pooled medians / p95s were:

| Workload | Brute force | Dense CSR grid |
| --- | ---: | ---: |
| Fixed density | 72.847–81.178 / 87.089–120.019 ms | 1.125–1.354 / 1.796–2.165 ms |
| Coincident degeneration | 181.896–196.730 / 247.084–291.946 ms | 286.239–360.350 / 381.102–472.309 ms |

The fixed-density grid performs 383,943 recorded structural work units versus
67,108,864 for brute force and is descriptively about 54–70 times faster on this
host. In the coincident family, both correctly become quadratic and the grid is
about 1.6–1.8 times slower. Those timing ratios are not selection policy because
the two algorithm shards were not temporally interleaved. The defensible result
is narrower: dense CSR is the baseline for bounded-domain, fixed-radius,
fixed-density queries, while clustered output and sparse address spaces require
separate algorithms or policies.
