# Research retained from exploration

## Evidence policy

Research enters the active repository in one of four states:

- **Primary evidence:** a paper, specification, or measured local artifact.
- **Synthesis:** a project-lead interpretation of multiple sources.
- **Hypothesis:** a claim that needs a checked-in experiment.
- **Legacy claim:** material inherited from the prior project or chat and not
  independently recovered or verified.

This file is a routing map, not an algorithm mandate.

## Navigation

- Botea, Müller, and Schaeffer's HPA* work shows the value of abstracting a map
  into clusters for faster near-optimal search. This is a candidate for large
  mostly-static worlds, not a default for small maps.
  [Paper](https://citeseerx.ist.psu.edu/document?doi=b0f0432ba69e4d730b93a75e3d19c8e9d811efac&repid=rep1&type=pdf)
- Koenig and Likhachev's D* Lite reuses earlier search effort when costs change.
  It is a candidate for repeated routes through discovered or dynamic terrain.
  [CMU publication](https://publications.ri.cmu.edu/d-lite)
- Silver's Cooperative A*, HCA*, and windowed HCA* search space-time to prevent
  agents from planning mutually incompatible routes. They are candidates for
  narrow passages and independently assigned goals.
  [AAAI paper](https://ojs.aaai.org/index.php/AIIDE/article/view/18726)
- Goal-directed navigation fields amortize global route work across agents that
  share an objective. They are candidates for crowds and RTS formations, with
  local steering still handled separately.
  [Patil et al.](https://doi.org/10.1109/TVCG.2010.33)
- ORCA constructs locally permitted velocities for reciprocal collision
  avoidance. Its assumptions—holonomic agents, observed velocities, and a local
  horizon—must be explicit in any experiment.
  [UNC paper](https://gamma.cs.unc.edu/ORCA/publications/ORCA.pdf)

**Synthesis:** compare algorithms by request shape. Use individual graph search
for sparse independent goals, reusable fields for shared goals, incremental
search for cost changes, space-time reservations for hard contention, and local
avoidance/steering for continuous motion. These techniques compose; they are not
ranked replacements for one another.

## Dense motion and flocking

Reynolds' original distributed behavioral model is the conceptual baseline for
flocking, while spatial indexing and storage layout determine whether it scales.
[Original paper](https://doi.org/10.1145/37402.37406)

**Hypothesis:** a deterministic fixed-capacity SoA world plus a uniform spatial
grid will provide a useful CPU baseline for bullets and boids. Workers should be
tested only after the single-thread memory-access profile is measured.

## Constrained physics

Vertex Block Descent and Augmented VBD are relevant to robust constrained-body
simulation. They do not replace broad-phase collision detection, game-specific
contact policy, or strategic movement.
[VBD paper](https://arxiv.org/abs/2403.06321) ·
[AVBD paper](https://graphics.cs.utah.edu/research/projects/avbd/Augmented_VBD-SIGGRAPH25.pdf)

**Hypothesis:** AVBD belongs in a standalone deformable/constraint scenario if
we can define a deterministic iteration and convergence policy. It is not kernel
scope.

## GPU compute

WebGPU exposes browser GPU rendering and computation, but an API's availability
does not establish that transfer, synchronization, debugging, or determinism
costs are acceptable. [W3C specification](https://www.w3.org/TR/webgpu/)

**Hypothesis:** GPU compute becomes attractive only for large, regular workloads
whose state remains resident for many steps. Strategic authority stays on the CPU
unless a dedicated replay experiment proves otherwise.

## Multiplayer and temporal state

- Factorio documents deterministic lockstep in which peers run the simulation
  and exchange ordered player inputs rather than continuously transferring the
  full changing world. Its server later became the input-ordering relay.
  [Latency hiding](https://www.factorio.com/blog/post/fff-83) ·
  [Multiplayer rewrite](https://www.factorio.com/blog/post/fff-147)
- The same engineering record exposes the costs that a slogan hides: slow peers
  constrain buffered lockstep, joining still needs a world transfer, and large
  input batches can saturate server upload.
  [Lockstep latency](https://www.factorio.com/blog/post/fff-76) ·
  [Megapacket incident](https://factorio.com/blog/post/fff-302)
- Factorio uses deterministic save/load and state checks for join and desync
  recovery. Its save-size work also demonstrates that context-aware state
  representation can matter more than blindly packing bits before general
  compression.
  [Deterministic save/load](https://www.factorio.com/blog/post/fff-270) ·
  [Context-aware save encoding](https://factorio.com/blog/post/fff-66)
- GGPO is primary implementation evidence for rollback via input prediction and
  speculative execution. It establishes a useful alternative for latency-bound
  small simulations, not proof that whole-world rollback fits a massive world.
  [Repository](https://github.com/pond3r/ggpo)

**Synthesis:** begin with server-arbitrated delayed lockstep and a narrow,
rebuildable latency/presentation state. Keep exact recovery scenario-owned and
measure checkpoint plus command-suffix cost. Test rollback only where the
restorable state and resimulation horizon fit a declared budget.

## Legacy corpus assessment

The removed repository contained 828 Civilization design documents and many
agent-produced audits. Their strongest contribution was methodological: explicit
source hierarchy, uncertainty tags, registry/asset provenance, map-first UI, and
the distinction between a visual baseline and acceptance. Hundreds of files also
contained inference or conflict markers, and primary-source access had failed in
places. The corpus is therefore a historical lead source at Git commit `e4f740e`,
not active truth and not a reason to keep its workflow machinery.

The related ChatGPT project conversation supplied useful synthesis about
navigation, typed arrays, workers, WebGPU, and AVBD. It also described substantial
unpublished code that was never present on GitHub and could not be recovered from
the conversation attachments. Those implementation claims remain **legacy
claims**, not repository evidence.
