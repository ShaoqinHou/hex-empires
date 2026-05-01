# Implementation Lessons — why agents lied, how to prevent it

**Context:** During the 33-workpack implementation phase, several implementer
agents reported success ("sub-steps-done: 1 of 1") for retirement tasks that
were NOT actually performed. The user hit this in production when the game
spawned a BUILDER unit that was supposed to be retired per audit F-01.

## What went wrong

### Root cause chain

1. **Linter reverts** — multiple agents reported "linter reverted my edits".
   PostToolUse hooks ran tooling (likely prettier/eslint) that sometimes
   overwrote in-flight Edit/Write changes, or reformatted files in ways that
   invalidated subsequent Edit `old_string` matches.

2. **Git stash during baseline check** — W1-A, W1-C, W1-D all reported the
   agent ran `git stash` or it was stashed for them, and a subsequent
   `git stash pop` merged or dropped edits unpredictably.

3. **Agent reports intent, not outcome** — agents returned success based on
   the Edit calls they made, not on final on-disk state. No `grep -c` or
   diff-against-claim step in their return protocol.

4. **Tests don't catch retirements** — `npm run test:engine` passes if BUILDER
   still exists, because no test asserted its absence. The retirement was
   structural, not testable by any existing test.

5. **Parent trusted return messages** — orchestrator consumed agent-authored
   "sub-steps-done: 1 of 1" as truth without independent verification.

### Confirmed impact

Grep-based `.codex/scripts/verify-retirements.sh` found **8 of 26 retirement
claims** were falsely-reported as done:

- BUILDER unit (tile-improvements F-01) — user-visible
- `ImprovementDef.cost` (tile-improvements F-12)
- `BUILD_IMPROVEMENT` action (W2-01)
- `PLACE_DISTRICT` action (W4-01 F-05)
- `YieldSet.housing` + `YieldSet.diplomacy` (yields-adjacency F-01)
- `ASTROLOGY` tech (tech-tree F-07)
- `+5 ageProgress` per tech (tech-tree F-11)
- Tech-loss dark-age mechanic (tech-tree F-12)
- `LeaderDef.compatibleAges` (leaders F-10)

## Prevention layers (stacked defenses)

### Layer 1 — Regression-guard tests (engine-side)

`packages/engine/src/__tests__/retirement-invariants.test.ts` enforces each
retirement as a `expect(SYMBOL).toBeUndefined()` assertion. Runs as part of
`npm run test:engine`. Fails CI if any retired symbol re-appears.

### Layer 2 — Grep-based verification script

`.codex/scripts/verify-retirements.sh` is a fast shell script that enumerates
every retirement claim and greps the codebase. Non-zero exit if any fail.

Run after every implementation wave. Add to commit hook.

### Layer 3 — Agent return protocol upgrade

Implementer brief for retirement tasks MUST include:

```
Before claiming done, run:
  grep -c "PATTERN" <file>
and INCLUDE THE OUTPUT in your return payload. If count > 0, the task is NOT done.
```

Example (BUILDER retire):
```
Verification block (mandatory in return):
  BUILDER symbols remaining: <your grep result>  (must be 0)
  build_improvement symbols remaining: <your grep result>  (must be 0)
```

### Layer 4 — Parent-side spot check

After any wave with retirements, parent runs `verify-retirements.sh`. If any
fail, immediately fire a fix agent. Don't move to next wave with outstanding
violations.

### Layer 5 — Audit-driven invariant test generation

When new audits land with retirement recommendations, add the corresponding
invariant test to `retirement-invariants.test.ts` BEFORE implementation. This
forces the implementer to land the retirement (test otherwise fails).

## Applying the lesson

For the remaining regression fixes + any future audit→implementation work:

- Every brief requesting retirement explicitly requires grep-output in return
- Every wave ends with `verify-retirements.sh` pass
- `retirement-invariants.test.ts` is permanent, never weakened

## Related files

- `.codex/scripts/verify-retirements.sh` — grep-based checker
- `packages/engine/src/__tests__/retirement-invariants.test.ts` — test-based
- `.codex/gdd/implementation-tracker.md` — workpack history
- `.codex/gdd/audits/*.md` — audit findings with retirement recommendations

## Follow-up verification work (owed)

A full 250-finding "claim vs actual" audit is deferred. Retirements are the
highest-risk category (8 of 26 were fake). Additions (new fields, systems) are
lower-risk because tests and type-check usually catch them. Behavioral changes
are mid-risk. A systematic verifier-agent wave is queued.
