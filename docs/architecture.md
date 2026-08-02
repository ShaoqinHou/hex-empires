# Architecture

## Authority map

```text
host input -> timestamped commands -> deterministic kernel -> scenario state
                                               |                 |
                                               v                 v
                                         replay/checkpoint   observations
                                                                  |
                                                                  v
                                                   renderer / metrics / tools
```

The kernel owns tick progression, command ordering, system ordering, seeded
randomness, and replay metadata. A scenario owns everything domain-specific. A
host owns clocks, input, rendering, persistence, networking, and deployment.

## Kernel boundary

The kernel should remain small enough to understand in one sitting. Its initial
contract is:

- advance an opaque scenario world by integer ticks;
- order commands by `(tick, sequence)` and reject ambiguous ordering;
- run a scenario's systems in declared order;
- provide deterministic random streams derived from a run seed;
- record enough metadata to replay the same run;
- expose canonical snapshots and digests for verification.

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
- Systems run in a declared stable order. Iteration over unordered collections
  must be normalized before it can affect authoritative results.
- Parallel jobs may read a tick snapshot. Their results are applied at a later
  synchronization point in stable key order.
- Rendering interpolates between observations and is never part of replay
  authority.

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
