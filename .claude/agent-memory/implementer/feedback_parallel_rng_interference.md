---
name: Parallel state machine RNG interference in engine systems
description: Two parallel state machines sharing state.rng can interfere with each other's determinism
type: feedback
---

When extending an existing system with a parallel state machine (e.g. Z4 espionage alongside Y5 scaffold), both machines share `state.rng`. If the new machine makes extra RNG draws per turn, it shifts the seed for the existing machine's subsequent draws, breaking deterministic tests.

**Why:** Tests use seeded RNG (e.g. seed=42). If a new code path consumes RNG draws that weren't there before, subsequent draws return different values.

**How to apply:** Gate the new state machine behind a discriminant that won't fire in existing tests. For espionage Z4 vs Y5 scaffold: gate Z4 ops on `influenceSpent >= 10` (Y5 tests use influenceSpent=5). This keeps the two paths independent. Always run the existing test suite after wiring a new state machine into an existing system to catch RNG interference immediately.
