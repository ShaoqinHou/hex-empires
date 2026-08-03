# Roadmap

This roadmap is a set of falsifiable experiment tracks, not a feature backlog.
Tracks may proceed in parallel. Integration happens only between probes that
have independently passed their evidence gates.

## 0. Recovery and reset — complete

- Preserve the old reference graph and dirty workflow state offline.
- Keep the previous product tip reachable through normal Git history.
- Remove repository-owned agent orchestration and generated research machinery
  from the active tree.
- Record the current user intent and the clean-slate decision.

**Exit:** the active repository is small, its authority is legible, and recovery
does not depend on a remote backup branch.

## 1. Deterministic kernel — complete for v1

- Implement explicit ticks, command ordering, named seeded random streams, and
  canonical audit captures/digests.
- Prove two dissimilar scenarios can use it without changing kernel domain types:
  a turn-based hex walker and a dense typed-array particle world.
- Add replay fixtures and a clean CI build.

**Exit:** repeated runs match exactly; a new scenario needs registration/import
only in its consumer, not edits to the kernel. Kernel v1 remains a reference
executor, not a checkpoint, networking, or universal-engine claim.

## 2. Measured density — first point complete

- Preserve the accepted single-workload object/SoA/hybrid baseline.
- Keep measurement time, environment inspection, and process control outside
  authoritative packages.

**Exit:** the single-point claims cite checked-in raw samples and remain scoped to
their workload and host. Multi-size/distribution curves are Track 3A.

## 3A. Scale curves and spatial queries

- Preserve the accepted general scale matrix and resource envelopes. Keep
  occupancy, live-slot pattern, spatial distribution, churn intensity, and
  replay length as declared factors rather than hidden sources of variation.
- Shard long runs with explicit environment identity, time/resource limits,
  resumability, atomic artifacts, and recorded terminal failures.
- Run the theory-backed spatial suite as a full algorithm x storage-layout
  experiment: exact quadratic brute work, output-sensitive dense-CSR grid work,
  fixed-density and deliberately degenerate families, and brute-oracle parity.
- Treat structural work as the primary growth gate. Keep elapsed-time growth as
  separate runtime evidence, and require an audit when a high-quality curve
  disagrees with the declared model.
- Keep linear and quadratic stress envelopes separate. A sparse grid, tree, or
  accelerator must earn adoption through another scenario-owned experiment;
  dense CSR is not a universal selection policy.
- Measure memory/GC, construction, churn, audit capture, and replay in addition
  to hot-loop time.

**Exit:** semantic parity and structural-growth assessments are recomputable
from raw shards; timing and crossover statements remain environment-local and
stop at an explicit budget knee.

## 3B. Temporal laboratory

- Compare a bounded observation timeline with exact authority recovery rather
  than calling both snapshots.
- Test object structural sharing and typed-array keyframe/dirty-page strategies
  independently.
- Prove random seek for observations; separately prove exact restore, continued
  future parity, branch isolation, corruption rejection, and retention bounds.

**Exit:** we can state storage cost, horizon, seek/restore latency, and catch-up
factor for named workloads. Until then, capture remains audit evidence and
replay begins at tick zero.

## 3C. Multiplayer protocol laboratory

- Simulate assembled-frame lockstep without transport or rollback first.
- Test authoritative tick/sequence assignment, empty frames, reordering,
  duplication, late/invalid input, stalls, desync hashes, catch-up, and drop
  policy.
- Test server-owned recipient projection separately for scenarios with hidden
  information.

**Exit:** isolated executors converge under a checked-in impairment schedule;
bandwidth, join/resync, recovery, and failure behavior are measured.

## 3D. Navigation laboratory

- Establish common workload descriptions, not a universal runtime API.
- Compare individual A*, hierarchical search, shared-goal fields, incremental
  replanning, cooperative reservations, formations, and local avoidance on the
  request shapes each is intended to solve.
- Record map revision, stable tie-breaking, query deadlines, stale-result policy,
  and whether expensive results are recomputed deterministically or admitted as
  authoritative proposals.

**Exit:** algorithm-selection guidance includes congestion, update frequency,
memory, latency, and failure behavior—not only shortest-path quality.

## 3E. Observable browser host

- Render scenario-owned observations without sharing authoritative state.
- Run the same replay fixtures in Node and the browser.
- Measure total, projected, visible, dirty, uploaded, and submitted work
  separately from simulation cost.
- Publish static builds from `main` with a provider-neutral base path.

**Exit:** the deployed host is inspectable, replay-compatible, and has no kernel
dependency on the browser or hosting service.

## 3F. Deterministic asynchronous jobs

- Submit immutable, revision-tagged jobs with fixed commit ticks and stable
  result keys.
- Randomize completion order and prove stable merges, deadline behavior, and
  deterministic fallback or stall policy.
- Attach workers only after the synthetic contract passes; include transfer,
  scheduling, merge, and missed-deadline cost in evidence.

**Exit:** completion timing cannot select authoritative state.

## 4. Integrate proven pairs

- temporal recovery + late-input protocol -> rollback experiment;
- recipient observation + authoritative replication -> multiplayer visibility;
- asynchronous jobs + navigation -> worker navigation;
- asynchronous jobs + spatial queries -> worker density;
- scale curves + render projection -> large-world display envelope;
- typed-state recovery + scale curves -> measured rewind/rollback horizon.

## 5. Optional accelerators and product probes

Only measured needs may schedule these:

- workers, WASM, or WebGPU behind replaceable experiment backends;
- constrained-body/AVBD experiments;
- persistence or production transport adapters;
- a deeper game assembled from primitives that survived earlier phases.

Accelerator evidence includes boundary transfer, synchronization, merge/readback,
renderer contention, and multiple-device/runtime parity—not just the accelerated
inner loop.
