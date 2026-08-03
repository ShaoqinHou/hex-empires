# Closed-tick lockstep experiment

This package is a small protocol laboratory around the existing headless
`Simulation`. It models one logical authority and any number of isolated
replicas without choosing a transport.

The authority deduplicates canonical `(clientId, requestId)` requests, assigns
global sequences in acceptance order, and schedules every accepted command at
`nextTickToClose + inputLeadTicks`. Closing produces a canonical, immutable
frame even when the tick has no commands. Once closed, a tick cannot be
rewritten.

Every authority and replica must be constructed with the same explicit,
non-empty caller-supplied `rulesetId` and `inputLeadTicks`. Session identity
binds those values alongside the lockstep and kernel protocol ids, canonical
format, scenario id/schema, and run-seed digest. The caller must change the
ruleset identity whenever authoritative rules or content change; this package
does not discover or hash external content.

The authority establishes order but deliberately does not mirror scenario
world state. Scenario command validation therefore occurs in each replica's
`Simulation` when the assigned tick executes; invalid commands fail through the
kernel's deterministic failure contract.

A replica accepts reordered frames, retains their canonical representation,
ignores identical duplicates, rejects conflicting duplicates or session and
digest mismatches, and advances its `Simulation` only through the contiguous
closed-tick prefix. Command sequences must form the exact global sequence
`0, 1, 2, ...` across those frames. A conflict, sequence discontinuity, or
kernel execution failure puts the replica into an explicit terminal state;
later receives and captures fail with the same terminal error. Empty frames
therefore carry authoritative progress rather than being inferred from silence.

The authority's request, schedule, and closed-frame maps retain all history.
The replica likewise retains accepted frames and permits arbitrarily distant
future ticks to accumulate while a gap remains. These intentionally unbounded
lab structures are not resource-safe and must not be used as a production
networking implementation.

## Deliberately out of scope

- authentication, authorization, and hostile-client defenses
- sockets, packet formats, retransmission, and transport deadlines
- wall-clock tick closure or leader election
- rollback, prediction, checkpoint/resync, and history compaction
- hidden-state or per-client replication
- persistence, failover, and multi-authority consensus

Those concerns need separate experiments and must not be inferred from this
package's deterministic in-process tests.
