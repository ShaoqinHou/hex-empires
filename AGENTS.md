# Project contract

This repository is an exploration laboratory for deterministic game and
simulation systems. It is not committed to being a Civilization clone, an RTS,
or a bullet hell. Those are experiment shapes used to expose different
architectural and performance constraints.

The current user request has authority over this file. Durable intent belongs in
`docs/intent.md`; architectural decisions belong in `docs/decisions/`. Tool,
model, delegation, hook, and review-queue instructions do not belong in the
product repository.

## Invariants

1. The kernel is headless TypeScript with no DOM, renderer, storage, or network
   dependency.
2. Authoritative simulation advances in explicit fixed ticks. Wall-clock time,
   `Math.random()`, and iteration-order accidents must not affect results.
3. A scenario owns its commands, state schema, storage layout, systems, and
   serialization. Adding a scenario must not widen a central action or entity
   union.
4. Mutation policy is scenario-owned. Object state and typed-array/SoA state are
   both legitimate; determinism is the shared contract.
5. Presentation observes simulation output. It never becomes authoritative game
   state.
6. Parallel work may compute independently, but authoritative merges use a
   documented stable order.
7. Performance statements require a checked-in workload, environment metadata,
   and measured percentiles. A passing correctness test is not a benchmark.
8. Research notes distinguish primary evidence, synthesis, hypotheses, and
   legacy claims.

## Change discipline

- Prefer the smallest experiment that can falsify an architectural claim.
- Add concrete deterministic tests for kernel behavior and scenario boundaries.
- Keep scenario-specific policy out of the kernel.
- Do not add an abstraction until two real experiments need the same contract.
- Do not recreate the removed agent workflow or generated research corpus.
- A browser host, when introduced, must be independently deployable and must run
  the same replay fixtures as the headless runtime.
