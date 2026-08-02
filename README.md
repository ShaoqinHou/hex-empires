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
from Git history. The replacement starts headless and small; a browser shell will
only be added after the kernel and scenario boundary are proven by dissimilar
experiments.

Read these before adding code:

- [`docs/intent.md`](docs/intent.md) — what this project is for;
- [`docs/architecture.md`](docs/architecture.md) — authority and runtime
  boundaries;
- [`docs/benchmarks/density.md`](docs/benchmarks/density.md) — how storage-layout
  evidence is produced and interpreted;
- [`docs/research.md`](docs/research.md) — retained research and its confidence;
- [`docs/roadmap.md`](docs/roadmap.md) — falsifiable experiment sequence;
- [`docs/legacy.md`](docs/legacy.md) — what was kept from the previous project;
- [`docs/decisions/0001-reset-to-simulation-kernel.md`](docs/decisions/0001-reset-to-simulation-kernel.md)
  — why the reset was chosen;
- [`docs/decisions/0002-density-benchmark-contract.md`](docs/decisions/0002-density-benchmark-contract.md)
  — why layout comparisons use one shared semantic workload.

## Working rule

Feature count is not progress. A useful increment either proves a boundary,
falsifies an approach, or leaves behind a reusable measured primitive.
