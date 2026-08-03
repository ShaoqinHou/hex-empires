# ADR 0003: Coordinate scale, time, presentation, and network as separate planes

- Status: accepted
- Date: 2026-08-03

## Context

The playground targets worlds that may be extreme along several axes: resident
state, active simulation, neighborhood work, AI/path requests, visible objects,
history retention, replay, and multiplayer traffic. Optimizing a single entity
count can move cost into capture, rendering, recovery, or network fan-out.

The kernel currently produces canonical audit captures and can replay from tick
zero. Those artifacts are valuable correctness evidence, but they omit random
stream positions, future queued commands, the sequence cursor, and a restorable
scenario codec. Treating them as checkpoints would make rollback and rewind
claims false. Treating the same full snapshot as a render or network format would
also couple unrelated cost and information boundaries.

## Decision

Use one coordinated experiment program with separate authority planes:

1. The kernel executes already ordered fixed-tick frames.
2. Authority ingress assigns deterministic tick and sequence according to a
   protocol-specific late-input policy.
3. Scenarios own authoritative state, AI/navigation semantics, semantic
   visibility, stable public identities, and exact state codecs.
4. Audit evidence, exact recovery, recipient observations, and render packets
   are separate projections with separate fidelity and cost contracts.
5. Network adapters own transport and replication scheduling, not simulation
   ordering. Renderers own culling, LOD, interpolation, batching, and GPU work,
   never authoritative visibility.
6. Timeline experiments compare scenario-appropriate storage. No generic
   checkpoint/delta interface is extracted until two real scenarios prove the
   same semantics.
7. Scale evidence is a multidimensional, environment-local curve with explicit
   budgets and recorded failure/censoring. Results from different environments
   are compared but never pooled.

The initial multiplayer hypothesis is a server-arbitrated delayed deterministic
lockstep with a narrow rebuildable latency state. This is informed by Factorio's
published design and limitations, not adopted as a universal engine rule.
Rollback remains an optional later integration with an exact recovery probe.

## Evidence gates

A **checkpoint** claim requires arbitrary-tick restore including world, tick,
sequence cursor, pending frames, random state, and protocol/ruleset/codec
identity; continued execution must match an uninterrupted run, branches must be
independent, and corrupt/incompatible artifacts must fail closed.

A **scale** claim names the workload and environment and reports relevant state,
active work, candidate/accepted interactions, memory/GC, presentation counts,
history bytes, replay/restore cost, network bytes/client count, and p95/p99
against an explicit tick or latency budget.

A **network** claim requires isolated executors, an impairment schedule, ordered
empty and non-empty frames, invalid/late-input policy, desync detection,
join/resync behavior, bandwidth, and a threat/information model.

A **presentation** claim separates total, projected, visible, dirty, uploaded,
submitted, and shaded work; redaction is tested before transport and rendering
cannot change replay evidence.

## Consequences

- The current kernel and accepted density baseline remain valid; neither is
  renamed into a stronger claim.
- Scale curves, temporal storage, protocol behavior, and browser observation can
  advance in parallel behind narrow package boundaries.
- A full universal engine, universal timeline, kernel-owned networking, and
  GPU-owned authority remain explicitly out of scope.
- Integration occurs only between proven pairs, which keeps failed experiments
  disposable and makes future sessions able to locate the broken boundary.

## Rejected alternatives

### Store every full canonical snapshot

Rejected as a default because it couples audit materialization cost to display,
history, and network cadence and still does not restore future-affecting state.

### Use command logs without checkpoints

Retained as an exact baseline, but rejected as the only strategy because random
seek and catch-up latency grow with distance from tick zero.

### Add rollback directly to `Simulation`

Rejected until scenario codecs and random/queue/sequence restoration have an
executable proof. The kernel must not promise a generic state model it does not
own.

### Choose one netcode for every scenario

Rejected because public deterministic worlds, hidden-information games, and
small latency-critical action domains have different trust and replication
requirements.
