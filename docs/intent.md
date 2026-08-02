# Intent

## North star

Build an exploration environment for deterministic, performance-sensitive game
simulation. It should make it cheap to ask questions such as:

- Does an object model remain pleasant for a turn-based hex scenario?
- When does a typed-array/SoA kernel materially outperform it?
- Which navigation strategy fits one unit, a formation, a shared destination, or
  a changing map?
- Which work can move to workers or a GPU without surrendering deterministic
  authority?
- Can the same recorded run be reproduced headlessly and in a browser?

The repository exists to answer those questions with executable evidence. A
playable game may emerge, but premature commitment to a genre is not a success
criterion.

## Product values

- **Architecture before accumulation.** Code is disposable; clear boundaries,
  measured results, and replayable evidence are durable.
- **Open-ended, not universal.** Support multiple experiment shapes through a
  narrow kernel contract. Do not invent a general engine in advance.
- **Determinism before spectacle.** A result that cannot be replayed is a demo,
  not evidence.
- **Scale is empirical.** Entity-count claims need workloads and latency or
  throughput distributions, not intuition.
- **Scenario autonomy.** A hex game must not dictate the storage or command model
  for a bullet simulation, and vice versa.
- **Human-owned intent.** Agent proposals and generated research never become
  product requirements merely because they were committed.

## In scope

- a small headless scheduler and replay contract;
- independent scenarios with different state/storage strategies;
- deterministic randomness, snapshots, and cross-runtime replay hashes;
- benchmark fixtures for simulation, navigation, and rendering boundaries;
- a thin browser host once the headless contracts are credible;
- static deployment for observable experiments, followed later by optional
  service adapters when an experiment genuinely needs them.

## Not committed

- a full Civilization VII clone;
- backward compatibility with the removed game state or save format;
- one ECS or one physics model for every scenario;
- networking, persistence services, WebGPU, or worker pools before a measured
  experiment justifies them;
- a large UI framework before there is a stable thing to observe.

## Superseded intent

The previous repository contained a recorded owner commitment to a full
Civilization VII mechanical clone. That was genuine historical intent, not mere
workflow noise. The current project-lead request explicitly reopens the project
as an unconstrained simulation playground, so the clone commitment is retained
as provenance but no longer governs the active tree.
