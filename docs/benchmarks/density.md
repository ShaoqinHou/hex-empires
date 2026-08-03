# Density benchmark

## Question

When object, structure-of-arrays (SoA), and hybrid worlds implement the same
dense simulation semantics, which costs actually change with storage layout?

This experiment does not rank the three layouts globally. It measures named
operations under a checked-in workload and records enough raw evidence to audit
every summary statistic.

## Valid comparison

The three implementations share:

- stable numeric slots and identical initial values;
- fixed-capacity worlds and the same active population;
- signed integer update and wrap rules;
- one deterministic spawn/despawn schedule;
- one neighborhood definition and traversal order;
- the same system order, command schema, and canonical snapshot schema.

The object layout keeps full slot records as objects. SoA keeps fields in typed
arrays. The hybrid keeps hot numeric fields in typed arrays and cold metadata in
slot-indexed objects. Scenario-specific loops stay separate; the experiment does
not hide all access behind a shared virtual entity API.

Before timing, the harness runs every layout and requires equal semantic
snapshot digests after every authoritative tick or direct phase. Every sample
then materializes correctness evidence outside its timer so changed or discarded
work cannot silently enter the report.

## Reading a report

A report is self-contained and versioned. It embeds the workload and its digest,
the exact source revision and dirty flag, runtime and hardware metadata,
lockfile digest, child executable and Node arguments, measurement scope,
warmup/sample policy, every raw duration, and nearest-rank median and p95.

Interpret the scopes literally:

- **update** directly measures motion integration, age increments, and the
  experiment tick counter;
- **neighborhood-all-pairs** directly measures the deliberately brute-force
  active-slot pair traversal and distance rule; it is not a spatial-index claim;
- **churn** directly measures stable-order deactivate/activate batches,
  deterministic random draws, and spawned-field initialization;
- **snapshot-materialization** measures projection from scenario storage to
  canonical plain data;
- **capture** measures full kernel capture, including materialization,
  canonicalization, cloning, and hashing;
- **replay** measures a fresh end-to-end replay, including command admission,
  ticks, final capture, and evidence construction.

Every `{operation, layout, process round}` cell runs in a fresh child process.
The default claim policy uses three process rounds, five untimed warmups per
process, and ten raw samples per process. Order rotates layouts within each
operation and is preserved in the report. Results from a dirty worktree, a smoke
profile, a partial matrix, a weaker process policy, or failed semantic parity are
explicitly ineligible for architectural guidance. CI never fails because one
machine was slower.

## Running it

Build and show the current CLI contract:

```text
npm run build
node packages/benchmark-density/dist/cli.js --help
```

Run the threshold-free smoke used by verification:

```text
npm run bench:density:smoke
```

Run the full checked-in baseline workload and create a new evidence file:

```text
npm run bench:density -- --output benchmarks/density/results/<unique-name>.json --quiet
```

The baseline has capacity 512 at 75% occupancy. Its fixed sample batches cover
240 direct update ticks, 16 brute-force all-pairs passes, 120 churn batches, a
12-tick state for snapshot materialization and capture, and a 20-tick end-to-end
replay. These sizes establish the harness and one local baseline; larger density
curves remain future evidence. The CLI refuses to overwrite an existing report.

Checked-in baseline reports live under `benchmarks/density/results/`. Each result
is interpreted here only after its source is clean and all required cells pass
semantic validation.

Validate any saved report without rerunning its timings:

```text
npm run bench:density:validate -- benchmarks/density/results/<report>.json
```

## Current guidance

The first accepted report is
[`density-baseline-f9c22f4-win32-node24-i7-12700h.json`](../../benchmarks/density/results/density-baseline-f9c22f4-win32-node24-i7-12700h.json).
It records source `f9c22f4add2b2cc8b64e5d4ed88bbd2243c0d290`, workload
digest `699ab1e66126f8075ca4e2fbf185cbaed6039a92cba54d458ce4020aded9f7c7`,
and report SHA-256
`12bdf358ca5ffc7f0063b2f697fdcd896bdeea83a28f673cd38364d7064d74e8`.
The host was Node 24.15.0 on Windows 11 `10.0.26200`, using a 12th Gen Intel
Core i7-12700H with 20 logical CPUs and about 32 GiB of memory.

Median and p95 are normalized per declared operation. Values below are
microseconds; they remain batch-derived percentiles rather than latency
guarantees.

| Operation | Object median / p95 | SoA median / p95 | Hybrid median / p95 |
| --- | ---: | ---: | ---: |
| Update tick | 13.60 / 19.51 | 3.03 / 4.19 | 4.25 / 6.48 |
| Brute-force all-pairs pass | 283.46 / 379.97 | 298.91 / 508.28 | 366.90 / 628.46 |
| Churn batch | 25.40 / 30.40 | 24.79 / 49.89 | 25.81 / 51.69 |
| Snapshot materialization | 39.70 / 109.50 | 23.60 / 36.40 | 42.00 / 217.50 |
| Full capture | 2,707.70 / 3,798.00 | 2,945.10 / 4,615.00 | 2,669.70 / 3,420.20 |
| End-to-end replay | 10,643.10 / 12,387.70 | 12,800.70 / 17,735.20 | 14,412.60 / 24,848.80 |

For this workload and host:

- SoA reduced the median direct update cost by about 78% versus objects, and the
  concrete hybrid reduced it by about 69%. Dense hot motion is therefore a good
  SoA candidate.
- SoA also had the lowest snapshot-materialization median and p95.
- The object layout was fastest for this brute-force all-pairs traversal and for
  end-to-end replay. Typed storage is not an automatic win when pair traversal,
  canonical projection, and replay overhead dominate.
- Churn medians were within about 3%; the typed layouts had worse p95 in this
  run. There is no useful churn winner yet.
- The tested hybrid did not justify its extra representation for this workload;
  its only median lead was a small full-capture difference, while its update was
  slower than SoA and its all-pairs/replay tails were worst.

This is one 512-capacity, 75%-occupied point on one machine. It establishes the
measurement contract and narrow storage guidance, not a density curve or a
universal layout choice. Correctness smoke results remain non-benchmarks.

The approved multi-size, occupancy, distribution, environment, sharding, and
growth-analysis contract is documented separately in
[`scale-matrix.md`](scale-matrix.md). It preserves this v2 report and accepted
artifact unchanged.
