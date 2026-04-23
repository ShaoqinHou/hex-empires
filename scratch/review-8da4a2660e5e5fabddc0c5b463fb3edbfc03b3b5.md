---
schema: review-report/v1
commit: 8da4a2660e5e5fabddc0c5b463fb3edbfc03b3b5
iteration: 1
reviewer: sonnet
timestamp: 2026-04-19T11:45:04Z
verdict: FAIL
summary: { BLOCK: 1, WARN: 3, NOTE: 1 }
---

## Summary

Trade system rewrite is substantial and well-structured: immutable update patterns are correct throughout (all `.set()`/`.delete()` operate on local copies, not `state.X` directly), no `Math.random()`, no `ALL_X` globals, and age-transition invariants (legacy bonuses spread-appended, `leaderId` untouched) are respected by ageSystem. One BLOCK: `tradeSystem.ts` in the committed snapshot imports `getRelationKey`/`defaultRelation` directly from `./diplomacySystem` — a peer system — violating the cross-system import prohibition. The test file mirrors the same violation. Three WARNs and one NOTE.

## Findings

### F-8df9967b
- **severity:** block
- **file:** `packages/engine/src/systems/tradeSystem.ts`
- **line:** 4
- **rule:** `import-boundaries.md` § "Systems cannot import from each other"
- **offender:** `import { getRelationKey, defaultRelation } from './diplomacySystem';`
- **message:** `tradeSystem` imports utility functions directly from `diplomacySystem` (a peer system), which is explicitly forbidden. These helpers already live in `state/DiplomacyUtils.ts` and are merely re-exported by `diplomacySystem`. The working tree already has this fix applied (`../state/DiplomacyUtils`), confirming the correct path.
- **suggested-fix:** Change to `import { getRelationKey, defaultRelation } from '../state/DiplomacyUtils';`
- **state:** open

### F-43616d4c
- **severity:** warn
- **file:** `packages/engine/src/systems/tradeSystem.ts`
- **line:** 206
- **rule:** `CLAUDE.md` trap-registry § "dead-constant"
- **offender:** `void originPlayer; // silence unused-variable check`
- **message:** The entire origin-resource block (lines 206-213) is a no-op — `originPlayer` is fetched, immediately voided, and no state is changed. Misleads readers into thinking resource transfer to origin is partially wired when it is entirely absent.
- **suggested-fix:** Remove the dead block entirely, or emit a concrete log event so downstream systems have a signal.
- **state:** open

### F-d133c2ad
- **severity:** warn
- **file:** `packages/engine/src/systems/__tests__/tradeSystem.test.ts`
- **line:** 5
- **rule:** `import-boundaries.md` § "Systems cannot import from each other"
- **offender:** `import { getRelationKey } from '../diplomacySystem';`
- **message:** Test file imports from a sibling system; if `diplomacySystem`'s exports change, `tradeSystem` tests will break unexpectedly.
- **suggested-fix:** Change to `import { getRelationKey } from '../../state/DiplomacyUtils';`
- **state:** open

### F-194d5f36
- **severity:** warn
- **file:** `packages/engine/src/systems/__tests__/tradeSystem.test.ts`
- **line:** 569
- **rule:** `testing.md` § "Assertion Rules — Concrete assertions"
- **offender:** `expect(next.log.length).toBeGreaterThan(0);`
- **message:** Vague quantity assertion; the test state begins with an empty log so the exact post-action count is known.
- **suggested-fix:** Replace with `expect(next.log.length).toBe(1)` and optionally assert `next.log[0].message` contains 'permanent'.
- **state:** open

### F-80f60ee2
- **severity:** note
- **file:** `packages/engine/src/systems/tradeSystem.ts`
- **line:** 216
- **rule:** `engine-patterns.md` § "Immutable state" (design coherence)
- **offender:** `const resourceSlots = targetCity.assignedResources ? targetCity.assignedResources.length : 0;`
- **message:** Gold calculation reads live `targetCity.assignedResources` each `END_TURN` tick, while origin-resource yield uses the frozen `route.resources` snapshot from route creation — two different staleness semantics within the same mechanic.
- **suggested-fix:** Document the intentional split explicitly or unify by deriving gold from `route.resources.length` as well.
- **state:** open
