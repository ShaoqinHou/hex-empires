# Legacy disposition

## Canonical historical point

The previous Civilization-oriented project ends at commit
`e4f740ebb8d420faa18579cf716f70c8f90fef63`. The reboot is a normal descendant
of that commit, so no history rewrite is required to inspect or restore it.

On 2026-08-03 the local repository's complete reference graph was also captured
to a verified offline Git bundle before cleanup. Uncommitted workflow files were
captured separately. Recovery artifacts are intentionally not published inside
this repository.

## Why the active code was not retained

- A roughly 1,600-line central game state and 99 action variants made scenario
  independence implausible.
- Every action traversed dozens of Civ-specific systems; dense updates cloned
  broad collections.
- Initialization, AI, persistence, rendering, and UI authority were coupled to
  the Civilization product shape.
- Pathfinding and rendering had correctness coverage but no representative scale
  contract.
- The clean historical tip passed 2,768 engine tests, 445 web tests, and both
  builds, yet still had three reproducible browser-test failures in building
  placement.
- The tracked workflow/research corpus was larger by file count and bytes than
  the product source and included generated agent memory, hooks, queues, and
  review artifacts.

These facts make the old tree useful reference material, but a poor foundation
for an open-ended real-time and turn-based laboratory.

## What remains worth consulting

Consult the legacy commit selectively for:

- deterministic RNG behavior and test vectors;
- pure hex-coordinate math and property tests;
- behavioral fixtures for map generation or pathfinding;
- camera/input and animation ideas;
- asset registry, fallback, attribution, and lifecycle concepts;
- map-first UI principles and the recorded dislike of precision-click
  notification dismissal;
- Civilization data only if a future optional scenario needs it.

Port behavior with a new test; do not copy central state, action unions, the
system pipeline, the AI monolith, the full renderer, save files, panel registries,
or repository-owned agent workflow.

## Unpublished ChatGPT work

A related ChatGPT project conversation claimed a larger local implementation,
benchmarks, and additional tests. Its remote branch contained only two workflow
files, the named local commit was absent from the repository object graph, and
the generated attachments were not recoverable. The conversation's research
synthesis was reviewed; its implementation claims are not treated as source or
acceptance evidence.
