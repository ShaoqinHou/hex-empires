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

## Current guidance

No storage guidance is recorded until the first clean, checked-in v2 baseline is
accepted. Correctness evidence from the smoke profile is not a benchmark, and
the first baseline will not justify a universal “SoA is faster” claim.
