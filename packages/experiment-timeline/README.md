# Timeline storage experiment

This small package asks one narrow question: how do two scenario-local temporal storage strategies behave as state shape, change density, keyframe interval, and retention change? It deliberately keeps two concrete implementations rather than inventing a shared timeline interface:

- `StrategicObjectTimeline` stores immutable version roots whose unchanged entity leaves are structurally shared. It represents comparatively cold strategic object state.
- `DensePagedTimeline` stores periodic full typed-array keyframes and complete dirty-page deltas in stable page-index order. It represents dense state with index-stable fields.

Both implementations retain a bounded number of exact experiment states, seek only inside that retained range, and create an independent branch at a retained tick. They are synthetic probes, not kernel services, scenario codecs, persistence formats, benchmarks, or recommendations for every game state.

## Observation timeline, not authority recovery

The package models a player-facing observation/inspection timeline: bounded live scrubbing over an already-produced projection. Its `forkAt` operation proves only that the experiment's synthetic data structures can diverge without mutation leakage. It does **not** prove that a running simulation can be restored, resumed, rolled back, joined, or resynchronized.

The current kernel still lacks the complete authority state and contracts needed for recovery:

- an exact scenario-owned world restore codec, including every future-affecting value rather than an audit projection;
- random-stream cursor/state restoration for every named stream;
- the last accepted command-sequence cursor;
- queued future command frames and their stable ordering;
- a recovery record that binds the run seed, next tick, scenario/ruleset identity, schema and codec versions, and compatibility rules;
- a committed canonical command-log suffix (or equivalent commitment) from the checkpoint to the resume point; and
- admission/host state such as authoritative player identity, deadlines, late-input policy, and the contiguous frame prefix when those affect future authority.

`Simulation.capture()` supplies an audit snapshot and next tick, and replay can start again from tick zero. Neither is an exact recovery checkpoint.

## Workload and oracle

`timelineFixtures` checks multiple entity counts, sparse/intermediate/full change densities, and keyframe intervals. Changes are generated from integer tick and entity index only, then normalized into ascending unique entity order. Tests build an independent full-state object oracle for every tick and compare both strategies against it. No wall clock, ambient randomness, kernel state, renderer state, or sibling scenario is involved.

The checked fixtures are correctness and logical-storage probes, not time benchmarks. They make the falsifier explicit: at full-page change density, delta payload equals full-keyframe payload and delta page descriptors make the delta strategy larger. A sparse fixture verifies the opposite can occur. No compression library or JS heap estimate is used.

## Byte accounting

Accounting is deterministic logical storage, not allocated memory, resident set size, serialized file size, or a claim about V8 object overhead.

`logical-object-graph-v1` counts each unique retained immutable entity leaf once as 12 payload bytes (`id`, `influence`, and `supply` as three logical uint32 values). Each retained root contributes 12 metadata bytes (logical uint64 tick plus uint32 entity count) and one 4-byte logical leaf reference per entity. Evicted leaves disappear from the count when no retained root references them.

`logical-dense-pages-v1` counts the actual typed-array `byteLength` of retained keyframe fields and delta page fields as payload. Each record contributes a 16-byte logical header (uint64 tick, uint8 kind, three reserved bytes, and uint32 entity/page count). Each dirty page contributes an 8-byte descriptor (uint32 page index and uint32 element count). Keyframe count, delta count, dirty-page count, and seek reconstruction work are reported separately.

These two accounting models describe different data structures and are stable enough to compare fixture variants within a strategy. They are not interchangeable wire formats. The package intentionally has no deserializer, persistence format, compression dependency, or generic codec; constructors and append paths reject incompatible shapes, invalid options, malformed updates, and noncontiguous ticks.

## Running independently

From the repository root:

```powershell
npm run build --prefix packages/experiment-timeline
npm run test --prefix packages/experiment-timeline
```

Kill or replace this package if the synthetic workload stops answering a concrete architecture question. Extraction is justified only after real scenario consumers demonstrate the same semantics and repeat these proofs with scenario-owned authority state.
