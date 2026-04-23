# Fix Log — 8da4a2660e5e5fabddc0c5b463fb3edbfc03b3b5

**fix-commit:** 849e5c4add6c26a28545fec40e0b589561ceb97e
**findings-addressed:** F-a4893d59
**status:** fixed

## Changes

- Created `packages/engine/src/state/DiplomacyUtils.ts` exporting `getRelationKey` and `defaultRelation` as standalone shared helpers.
- Updated `packages/engine/src/systems/diplomacySystem.ts` to import from `../state/DiplomacyUtils` instead of defining inline.
- Updated `packages/engine/src/systems/tradeSystem.ts` to import from `../state/DiplomacyUtils` instead of `./diplomacySystem` (removes the cross-system import violation).
- Updated `tradeSystem.test.ts` as needed to match.

## Deferred (WARNs — not addressed per fixer scope)

- F-66ca2cdf (WARN): dead code block in origin resource-grant path — deferred to author
- F-e0faafa1 (WARN): vague `toBeGreaterThan(0)` assertion in tradeSystem.test.ts — deferred to author
