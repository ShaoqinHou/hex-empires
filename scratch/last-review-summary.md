# Review Summary — drain-queue

**Run:** 2026-04-20T00:00Z
**Mode:** --drain-queue (queue had 1 entry; 0 already had outcomes; processed 3 commits this run)

## This-run batch

| sha | commit | result | notes |
|-----|--------|--------|-------|
| fce049c8 | fix(engine): truly retire BUILDER unit + build_improvement ability | PASS (auto-fix) | 1 BLOCK fixed by Fixer → iter-2 PASS |
| 8124c278 | fix(engine): true retirement of 7 falsely-claimed items | PASS | Fixer extra commit; iter-1 PASS |
| edc89d99 | fix(review): F-fabdcd9b + F-a0e00781 — retire ImprovementPanel, fix stale JSDoc | PASS | Fixer fix commit; iter-2 PASS |

**Totals:** 3 processed, 3 PASS, 0 STALLED, 0 auto-fix branches pending

## Open WARNs from this run

**fce049c8 / edc89d99:**
- **F-3a9c1b2d** `GameCanvas.tsx:17` — dead `onBuilderSelected`/`onBuilderDeselected` props + `build_improvement` ability check still in GameCanvas; dead `isBuilder`/`availableImprovements` in BottomBar.tsx

**8124c278:**
- **F-5259b3e1** `retirement-invariants.test.ts:69` — `toBeDefined()` on statically-typed array element; use concrete assertion
- **F-0e3682f7** `retirement-invariants.test.ts:114` — `toBeDefined()` on `readonly number` literal; use `toBe(0)`

## Open NOTEs from this run

**fce049c8 / edc89d99:**
- **F-6d21a7e8** `antiquity-buildings.ts:147` — Pyramids wonder still shows +2 Builder charges (retired mechanic)
- **F-c7d44ef1** `App.tsx:172` — `onNoIdleUnits` prop flush-left cosmetic indent break
- **F-e2f8a091** `App.tsx:228` — `audioSettings` branch flush-left cosmetic indent break

**8124c278:**
- **F-25cf592d** `antiquity-districts.ts` lines 42/69/96/123/150/177/231 — JSDoc still says housing after rename to happiness
- **F-f9a53558** `exploration-districts.ts:18` — DOWNTOWN_DISTRICT JSDoc still says housing
- **F-297513c9** `all-leaders.ts` — trailing blank lines in 9 leader objects after compatibleAges removal

---
