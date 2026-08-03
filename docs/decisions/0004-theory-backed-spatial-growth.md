# ADR 0004: Make theoretical growth an executable spatial-query contract

- Status: accepted
- Date: 2026-08-03

## Context

Elapsed-time curves alone cannot tell us whether an algorithm, its workload, or
its implementation is behaving as intended. Language runtime, allocation, JIT,
GC, cache, and operating-system effects change constants and can obscure an
exponent over small ranges. Conversely, a plausible timing slope can hide an
implementation that performs the wrong primitive work.

The density experiment already establishes that its brute-force neighborhood
pass grows quadratically. The next experiment needs an independently known
algorithmic model, executable semantic parity, and evidence that distinguishes
mechanical work from host timing.

For fixed-radius reporting, let:

- `n` be active entities;
- `C` be addressable grid cells;
- `K` be accepted unordered neighbor pairs.

A brute-force half list examines exactly `n(n-1)/2` active pairs. A uniform cell
list with fixed dimension and cell width proportional to the cutoff has an
output-sensitive `O(n + C + K)` contract. It is approximately linear in `n`
only when the workload also keeps density, cutoff, and occupancy behavior
bounded. It remains correctly quadratic when `K` is quadratic.

## Decision

1. Algorithm benchmarks bind a theory record containing variables, assumptions,
   source references, expected structural-growth range, and project-specific
   falsification tolerance. The tolerance is not presented as a theorem.
2. Deterministic structural work is the primary growth gate. Neighbor passes
   record slot, cell, stencil, and distance work; accepted pairs; occupancy; and
   order-independent pair fingerprints. Elapsed-time growth is independent
   supporting evidence.
3. The first spatial implementation is a scenario-owned deterministic dense CSR
   uniform grid. It uses pinned workload bounds, `h = max(1, radius)`, a fixed
   2D stencil, stable slot/cell order, and the same exact squared-distance rule
   as the brute-force oracle.
4. Every grid result is checked against the brute-force result. Small adversarial
   fixtures pin hand-counted boundary cases; scale evidence checks count and two
   independently mixed, order-insensitive pair fingerprints without materializing
   all `K` pairs.
5. The matrix contains two distinct growth families:
   - fixed density: area grows with `n`, radius stays fixed, and both `C` and
     expected `K` grow approximately linearly;
   - deliberate degeneration: coincident entities make `K = n(n-1)/2`, so both
     output-sensitive grid work and brute-force work are quadratic.
6. Growth assessment has three results: `consistent`, `audit-required`, and
   `inconclusive`. All five structural points remain visible, while the declared
   largest three points gate the dominant exponent; this prevents the fixed `C`
   term from falsely rejecting correct degeneration. Missing range or incomplete
   factorial coverage is inconclusive. A complete deterministic structural
   mismatch is audit-required; weak or unstable timing remains inconclusive.
7. An audit-required structural result blocks algorithm guidance. A timing-only
   disagreement triggers allocation/runtime/implementation investigation while
   retaining the raw artifact for diagnosis.
8. Resource admission remains worst-case conservative. The dense grid rejects
   an unsafe or impractically large `C`; an expected linear workload never grants
   permission for an unbounded allocation.
9. Both algorithms allocate reusable working storage before timing. Their timed
   steady-state passes include scratch clearing/filling, exact query work, and
   fingerprints. Algorithm ratios remain descriptive until algorithm execution
   is interleaved rather than merely sharing round labels.

## Consequences

- Academic and reference-implementation expectations become falsifiable code,
  not decorative citations.
- Exact semantics, structural work, and time can disagree independently, making
  the likely faulty boundary much easier to locate.
- `enforce` requires all twelve structural assessments to be present and
  consistent. Timing may be inconclusive, but a high-quality timing mismatch
  also blocks guidance.
- Dense CSR has explicit `O(n + C)` index memory and deterministic traversal,
  but is unsuitable for extremely sparse domains where `C` greatly exceeds
  `n`. A sparse grid is a later measured alternative, not an invisible fallback.
- Quadratic clustered behavior does not falsify the grid when quadratic output
  explains it.
- The experiment does not yet choose a universal neighbor structure for every
  scenario, dimension, radius distribution, or moving-world update policy.

## Rejected alternatives

### Infer complexity from elapsed time only

Rejected because host/runtime behavior can mask wrong mechanical work and make
correct work inconclusive over a short interval.

### Claim that a uniform grid is unconditionally linear

Rejected because the honest bound includes `C` and `K`; both can be quadratic
or otherwise dominate under a different workload.

### Copy a third-party implementation as the oracle

Rejected because reference code can contain assumptions or defects that do not
match this scenario. Published bounds and independent brute-force semantics are
the oracle; external implementations are comparison evidence.

### Start with a hash grid

Deferred because expected constant-time hashing would add another assumption to
the first growth claim. It remains a candidate for sparse domains after dense
CSR establishes the contract.
