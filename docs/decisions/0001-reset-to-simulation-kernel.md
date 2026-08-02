# ADR 0001: Reset to a scenario-owned simulation kernel

- Status: accepted
- Date: 2026-08-03

## Context

The repository began as a Civilization-inspired game and later accumulated a
direct commitment to a full Civilization VII mechanical clone. It also amassed a
large repository-owned agent workflow, generated research corpus, review logs,
and many recovery branches.

The current owner request reframes it as an open-ended exploration project that
may test turn-based strategy, RTS formations, dense bullets, flocking, mass AI,
pathfinding, constrained physics, and deployment. Maintainable authority and
architecture matter more than preserving functioning code.

Independent audits found that the old engine's central state/action model,
synchronous system traversal, Civ-specific initialization and AI, renderer, and
save model would make those experiments inherit the wrong constraints.

## Decision

Use the existing `main` history, but replace its active tree with a small headless
kernel whose world and domain types are owned by independent scenarios. Retain
the old tip as the parent/history reference and preserve all refs offline.

Remove the inherited `.codex` workflow, generated GDD, scratch review output,
and old product packages from the active tree. Curate only durable intent,
research routes, architecture, and recovery provenance into ordinary project
documents.

## Alternatives considered

### Rehabilitate the old engine

Rejected because compatibility with the Civ state/action/UI model would dominate
the kernel design and conceal the cost of dense real-time workloads.

### Salvage a broad shared framework

Rejected for the first iteration. Utilities may be ported when a new scenario has
a concrete need, but copying renderer, panel, persistence, or engine frameworks
would preserve assumptions before they are tested.

### Start an orphan repository

Rejected because a normal descendant keeps provenance and recovery simple. The
active GitHub surface can still have one branch without deleting historical
commits from object reachability.

## Consequences

- The repository temporarily has less game functionality and much clearer
  authority.
- Previous saves and APIs are intentionally incompatible.
- Scenario authors choose storage and mutation models; the kernel enforces only
  deterministic execution and replay contracts.
- Browser UI and deployment wait until headless evidence exists.
- Legacy material is available by commit or offline recovery bundle rather than
  by active branches and workflow folders.
