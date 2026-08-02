# Roadmap

This roadmap is a sequence of falsifiable questions, not a feature backlog.

## 0. Recovery and reset

- Preserve the complete old reference graph and dirty workflow state offline.
- Keep the previous product tip reachable through normal Git history.
- Remove repository-owned agent orchestration and generated review/research
  machinery from the active tree.
- Record the current user intent and the clean-slate decision.

**Exit:** the active repository is small, its authority is legible, and recovery
does not depend on a remote backup branch.

## 1. Deterministic kernel

- Implement explicit ticks, command ordering, named seeded random streams, and
  canonical snapshots/digests.
- Prove two dissimilar scenarios can use it without changing kernel domain types:
  a turn-based hex walker and a dense typed-array particle world.
- Add replay fixtures and a clean CI build.

**Exit:** repeated runs match exactly; a new scenario needs registration/import
only in its consumer, not edits to the kernel.

## 2. Measured density

**Status:** first claim-eligible baseline accepted; multi-size and distribution
curves remain open.

- Add a reproducible benchmark harness with environment metadata.
- Measure update, neighborhood, spawn/despawn, snapshot, and replay workloads.
- Compare object, SoA, and hybrid layouts where the same workload can be stated
  fairly.

**Exit:** performance claims cite checked-in workloads and median/p95 results;
storage guidance is evidence-based.

## 3. Navigation laboratory

- Establish a common map/workload description, not a universal runtime API.
- Compare individual A*, hierarchical search, shared-goal fields, incremental
  replanning, cooperative reservations, formations, and local avoidance on the
  request shapes each is intended to solve.

**Exit:** algorithm-selection guidance includes congestion, update frequency,
memory, latency, and failure behavior—not only shortest-path quality.

## 4. Observable browser host

- Render scenario observations without sharing authoritative state.
- Run the same replay fixtures in Node and the browser.
- Measure visible/dirty rendering cost separately from simulation cost.
- Publish static builds from `main` with a provider-neutral base path.

**Exit:** the deployed host is inspectable, replay-compatible, and has no kernel
dependency on the browser or hosting service.

## 5. Optional advanced probes

Only measured needs may schedule these:

- deterministic worker jobs and stable result merging;
- WebGPU-resident dense compute;
- constrained-body/AVBD experiments;
- persistence, services, or multiplayer adapters;
- a deeper game assembled from primitives that survived earlier phases.
