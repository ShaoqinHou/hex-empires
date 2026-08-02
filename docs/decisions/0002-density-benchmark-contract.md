# ADR 0002: Compare storage layouts through one semantic density experiment

- Status: accepted
- Date: 2026-08-03

## Context

The deterministic kernel is compatible with both ordinary-object and
typed-array scenario state, but that does not establish when either layout is a
better choice. The existing hex-turn and particle scenarios cannot answer that
question: they differ in rules, scale, mutation policy, random use, and snapshot
shape. Timing them against one another would attribute all of those differences
to storage.

The benchmark also needs authority boundaries different from simulation code.
Reading the host clock and machine metadata is necessary for measurement, but is
forbidden in authoritative scenarios. Performance evidence must remain useful
after summary prose becomes stale or misleading.

## Decision

Create two experiment-owned workspaces without widening the kernel:

- `scenario-density` defines one versioned workload, command, and canonical
  snapshot contract with object, structure-of-arrays (SoA), and concrete hybrid
  storage implementations;
- `benchmark-density` is a Node-only measurement host that owns clocks,
  environment inspection, sample scheduling, statistics, and report output.

All layouts receive the same resolved input, capacity, active slots, integer
arithmetic, command schedule, system order, neighborhood rule, and snapshot
schema. Their hot loops remain separate so a universal accessor layer does not
become the thing being measured. The hybrid layout is specifically hot numeric
fields in typed arrays with cold slot metadata in objects.

The workload definition travels through replay authority as canonical command
data. A replay can therefore explain its own configuration without adding a
scenario-configuration field to the kernel.

Semantic parity is a hard gate, not a later diagnostic. The harness must prove
that all layouts produce the same canonical snapshot digest before it emits
timing results. It preserves raw samples and reports nearest-rank median and p95
with the complete workload, source revision and dirtiness, runtime, operating
system, CPU, memory, timer, warmup, sample count, and measured scope.

Measurements are named by what they include. Direct update, neighborhood, and
churn work must not be confused with kernel tick cost; snapshot materialization
must not be confused with full capture and canonical hashing; replay means the
complete `executeReplay` path unless a report says otherwise. CI runs correctness
and smoke validation without performance thresholds. Claim-bearing baselines
are checked-in artifacts from a clean source revision.

## Alternatives considered

### Compare the existing hex and particle scenarios

Rejected because storage is not the only independent variable. Any conclusion
would be confounded by unrelated scenario semantics.

### Put timers and benchmark hooks in the kernel

Rejected because host time is not simulation authority and a benchmark-specific
hook would enlarge the kernel around one experiment.

### Introduce a general entity or benchmark framework

Rejected until another real experiment needs the same abstraction. The density
adapter and report schema remain local to this experiment.

### Start with different neighborhood algorithms per layout

Rejected for the storage comparison. Algorithm and layout may be crossed as two
explicit factors later, but changing both at once cannot support a layout claim.

## Consequences

- The repository can issue narrow, reproducible guidance such as “SoA improved
  this update workload on this environment,” but not universal storage claims.
- Canonical snapshot work may dominate some measurements; those costs remain
  visible rather than being misattributed to update throughput.
- Dirty-tree reports are useful during development but are not eligible as
  project guidance.
- A future navigation or rendering benchmark may reuse ideas from this harness,
  but shared infrastructure will be extracted only after that second consumer
  exists.
