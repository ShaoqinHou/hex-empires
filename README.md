# Simulation Playground

This repository keeps the historical `hex-empires` name, but its active purpose
is broader: it is a small laboratory for learning which architectures survive
very different simulation workloads.

The first probes are deliberately unlike one another:

- deterministic turn-based movement on a hex grid;
- dense real-time particles, bullets, and flocking;
- shared-target and multi-agent navigation;
- optional constrained-physics experiments.

None of those genres is the product by itself. The product is a trustworthy way
to build, measure, compare, replay, and discard experiments without turning one
prototype's data model into the next prototype's foundation.

## Current state

The old Civilization-oriented application and its repository-owned agent
workflow were removed from the active tree on purpose. They remain recoverable
from Git history. The replacement starts headless and small. A thin browser
replay/observation probe may proceed beside the headless experiments, but it does
not receive authoritative world access or dictate kernel design.

Read these before adding code:

- [`docs/intent.md`](docs/intent.md) — what this project is for;
- [`docs/architecture.md`](docs/architecture.md) — authority and runtime
  boundaries;
- [`docs/benchmarks/density.md`](docs/benchmarks/density.md) — how storage-layout
  evidence is produced and interpreted;
- [`docs/benchmarks/scale-matrix.md`](docs/benchmarks/scale-matrix.md) — how
  multi-size, occupancy, distribution, and stress curves will be separated;
- [`docs/research.md`](docs/research.md) — retained research and its confidence;
- [`docs/roadmap.md`](docs/roadmap.md) — falsifiable experiment sequence;
- [`docs/legacy.md`](docs/legacy.md) — what was kept from the previous project;
- [`docs/decisions/0001-reset-to-simulation-kernel.md`](docs/decisions/0001-reset-to-simulation-kernel.md)
  — why the reset was chosen;
- [`docs/decisions/0002-density-benchmark-contract.md`](docs/decisions/0002-density-benchmark-contract.md)
  — why layout comparisons use one shared semantic workload.
- [`docs/decisions/0003-scale-time-and-network-planes.md`](docs/decisions/0003-scale-time-and-network-planes.md)
  — why scale, rewind, presentation, and multiplayer are coordinated but
  separate experiment planes.
- [`docs/decisions/0004-theory-backed-spatial-growth.md`](docs/decisions/0004-theory-backed-spatial-growth.md)
  — why algorithmic work counters and academic growth models gate spatial-query
  guidance before elapsed-time comparisons.

## Working rule

Feature count is not progress. A useful increment either proves a boundary,
falsifies an approach, or leaves behind a reusable measured primitive.

## Current experiment packages

- [`packages/scenario-density`](packages/scenario-density) keeps one semantic
  density workload across object, SoA, and hybrid storage, now with explicit
  live-slot and spatial-distribution factors plus a deterministic dense-CSR
  neighbor-query experiment.
- [`packages/benchmark-density`](packages/benchmark-density) owns host timing,
  environment evidence, storage-layout comparisons, and executable
  theory-versus-measurement growth gates.
- [`packages/experiment-timeline`](packages/experiment-timeline) compares
  immutable object history with typed-array keyframe/dirty-page history. It is
  observation history, not an authority checkpoint implementation.
- [`packages/experiment-lockstep`](packages/experiment-lockstep) simulates one
  closed-tick authority and reordered/duplicated delivery without choosing a
  transport, rollback model, or production trust boundary.
