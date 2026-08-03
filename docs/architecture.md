# Architecture

## Authority map

```text
raw input / network
        |
        v
 authority ingress -> ordered tick frames -> kernel executor -> scenario state
                                                    |                 |
                                                    |        +--------+--------+
                                                    |        |        |        |
                                                    v        v        v        v
                                                audit    exact    recipient  render
                                               evidence  codec   observation packet
                                                          |         |         |
                                                          v         v         v
                                                  timeline/recovery network renderer
```

The kernel executor owns tick progression, execution of already ordered command
frames, system ordering, seeded randomness, and replay metadata. Authority
ingress owns player identity, deadlines, late-input policy, and construction of
those frames. A scenario owns everything domain-specific. Hosts own clocks,
transport, rendering, persistence, and deployment.

Audit evidence, exact recovery state, recipient observations, and render packets
are distinct data planes. They may share scenario code, but none is a universal
`snapshot()`: audit data can be expensive and non-restorable, recovery must
contain every future-affecting value, observations may be permission-aware, and
render packets may be lossy and presentation-specific.

## Kernel boundary

The kernel should remain small enough to understand in one sitting. Its initial
contract is:

- advance an opaque scenario world by integer ticks;
- order commands by `(tick, sequence)` and reject ambiguous ordering;
- run a scenario's systems in declared order;
- provide deterministic random streams derived from a run seed;
- record enough metadata to replay the same run;
- expose canonical snapshots and digests for verification.

The current `capture()` contract is an audit capture. It is deliberately **not**
called a checkpoint or authoritative state hash: it does not contain queued
future commands, the command sequence cursor, random-stream cursors, or a
scenario restore codec. `executeReplay()` reconstructs from tick zero. Exact
rewind, rollback, branching, join-in-progress, and resynchronization therefore
remain experiment claims until a restoration probe passes its evidence gate.

The kernel does **not** define a universal `Entity`, `Component`, `Action`, map,
physics body, AI controller, or renderer. Those types belong to scenarios or to
libraries extracted only after two scenarios need them.

## Scenario boundary

A scenario supplies an identity and schema version, a world factory, command
validation/application, an ordered system list, and canonical snapshot logic.
Its world is opaque to the kernel.

This is intentionally compatible with different storage policies:

- immutable or structurally shared objects for low-frequency strategic state;
- mutable object graphs for simple prototypes;
- fixed-capacity typed arrays and structure-of-arrays layouts for dense hot
  loops;
- hybrids with stable handles between strategic and dense state.

Determinism, not immutability, is the cross-scenario rule. A scenario may mutate
its world during a tick, provided replay from the same seed and command log yields
the same canonical digest.

## Time and command semantics

- Authoritative time is an integer tick. Hosts translate wall time to a count of
  ticks but cannot inject fractional or elapsed time into systems.
- Commands target a future or current tick and receive a monotonic sequence at
  the authority boundary.
- Commands and snapshots are canonical plain data. Admission takes ownership by
  copying and freezing the command payload; batch admission is atomic.
- Systems run in a declared stable order. Iteration over unordered collections
  must be normalized before it can affect authoritative results.
- Parallel jobs may read a tick snapshot. Their results are applied at a later
  synchronization point in stable key order.
- Rendering interpolates between observations and is never part of replay
  authority.

Replay evidence owns immutable copies of its command log and snapshot and names
the replay, scheduling, canonicalization, and random-stream protocols that
produced its digest. Canonical copying is an intentional correctness cost at the
authority boundary. A faster trusted path must not be added unless a checked-in
benchmark demonstrates the need and an equivalent ownership proof exists.

## Temporal architecture

There are two temporal products:

1. **Observation timeline:** fast live scrubbing of scenario-owned display or
   inspection data. It may use lossy projections, keyframes, deltas, bounded
   retention, or reconstruction caches. It never resumes authority.
2. **Authority recovery:** exact restoration for branching, rollback,
   join-in-progress, or resynchronization. A valid checkpoint must identify the
   scenario/ruleset/codec protocols and capture the exact world, next tick,
   command sequence cursor, pending frames, random state, and log commitment.

The default hypothesis is periodic scenario-owned checkpoints plus a command-log
suffix. Object scenarios may favor immutable structure sharing; typed-array
scenarios may favor page copies or dirty-page deltas. These are separate
experiments, not implementations of a preselected generic timeline interface.
Measure write cost, retained bytes per tick, random seek, restore, branch cost,
replay/catch-up factor, change density, and eviction behavior. Generic
compression ratios alone are not sufficient evidence.

## Randomness

The run seed is explicit. Randomness comes from named deterministic streams so
adding a cosmetic or unrelated system cannot silently shift another system's
sequence. `Math.random()` and ambient time are forbidden in authoritative code.

## Verification layers

1. **Contract tests:** command ordering, tick progression, stream derivation,
   snapshot canonicalization, and failure behavior.
2. **Scenario replay fixtures:** fixed seeds and commands with checked digests.
3. **Cross-runtime checks:** the same fixtures in Node and the browser host.
4. **Benchmarks:** checked-in workloads with warmup, sample count, environment
   metadata, and median/p95 results.
5. **Visual verification:** only after a renderer exists; screenshots do not
   replace replay or benchmark evidence.

## Performance strategy

Do not optimize the kernel around an imagined maximum. Establish workload
families and measure them separately:

- entity update throughput at several active counts;
- neighbor queries at controlled density distributions;
- bullet spawn/update/despawn churn;
- path requests split by shared versus independent goals;
- dirty/visible rendering cost versus total world size;
- snapshot size and replay throughput.

Every benchmark records hardware/runtime metadata and percentiles. Budgets are
set after a baseline exists, then tightened only when a real host needs them.

"Extremely large" is an envelope, not a single count. Every capacity statement
must name the relevant resident slots/bytes, active work per tick,
candidate/accepted interactions, events/churn, AI or path requests,
visible/dirty instances, timeline bytes and horizon, replay/restore latency,
replicated bytes/client count, target tick rate, and p95/p99 budget. Curves run
until a declared budget knee or recorded resource limit; censored runs remain
failure evidence rather than disappearing from a report.

Environment is an explicit factor. Results from different CPU, OS, Node/V8,
runtime flags, browser, or GPU environments are never pooled into one percentile.
Growth rates are empirical over tested intervals, not asymptotic proofs.

## Observation and rendering

Scenario-owned observation projection is separate from audit capture. Semantic
visibility, fog, remembered knowledge, and stable public identity are
authoritative scenario concerns. Recipient redaction happens before data leaves
the server. Frustum/occlusion culling, LOD, interpolation, batching, and GPU work
are presentation-only and cannot feed simulation or AI truth.

Rendering evidence separates total authoritative population from projected,
visible, dirty, uploaded, submitted, and actually shaded work. A million dormant
authoritative records and a million visible moving sprites are different claims.

## Multiplayer and authority ingress

The first multiplayer hypothesis is server-arbitrated delayed deterministic
lockstep: the authority assigns ticks and stable sequences, publishes even empty
frames, and clients advance only over a contiguous authoritative prefix. A narrow
non-authoritative latency state may predict local presentation, but it must be
rebuildable from sacred state plus pending local actions.

This resembles the approach documented by Factorio: deterministic peers exchange
inputs rather than the full changing world, while the server arbitrates order;
the same sources also expose slow-peer, join-state, and bandwidth limitations.
It is a reference for experiments, not a mandate for every scenario.

Protocol probes precede sockets. They must model reordering, jitter, loss,
duplication, invalid or late input, empty frames, deliberate desync, hash cadence,
catch-up, drop policy, join/resync bytes, and client count. Exact recovery uses a
checkpoint plus command suffix only after the temporal evidence gate passes.
Whole-world rollback is not the default for huge worlds; it may be tested for a
small responsive subdomain if measured restore/resimulation budgets permit it.

Full deterministic client simulation is also not a solution for secret state.
A scenario with hidden authoritative information needs server-side observation
and replication semantics as a separate protocol experiment.

## Navigation stack

Navigation is a pipeline, not one algorithm:

1. strategic routing chooses regions, portals, or cost fields;
2. formation logic assigns group shape and slots;
3. local steering chooses preferred velocity;
4. collision avoidance or space-time reservation resolves contention;
5. presentation interpolates the authoritative result.

Single-agent A*, hierarchical routing, shared-target fields, cooperative
space-time search, and reciprocal local avoidance solve different layers. They
should be compared behind experiment-owned adapters, not hidden behind a single
premature `Pathfinder` abstraction.

## Physics and GPU boundary

AVBD/PBD-style solvers are candidates for constrained-body experiments, not the
project's collision engine or general simulation model. Likewise, WebGPU is a
candidate for large regular workloads that can remain GPU-resident. Neither is
allowed to become authoritative infrastructure until a deterministic measured
probe demonstrates the value and the replay boundary is explicit.

## Deployment

The first deliverable is headless and runs in CI. The first browser host should be
a separate workspace that consumes scenario observations and replay fixtures. It
can be deployed as static assets from `main`; the kernel must not know the public
base path or hosting provider. Server functions, databases, and multiplayer are
separate adapters introduced only by experiments that require them.

## Experiment package contract

Every experiment package leaves a compact local record of:

- the falsifiable question and why the package exists;
- authority it owns and authority explicitly outside its boundary;
- scenario/library dependencies and the semantic oracle;
- workload factors, environment requirements, and evidence artifacts;
- current claim status and limitations; and
- the condition that would kill, replace, or justify extracting the experiment.

New experiments do not widen a central domain union or depend on sibling
scenarios. Shared libraries are extracted only after two real consumers prove
the same semantics and the extraction reproduces both sets of fixtures.
