# Legacy Paths — hex-empires Audit

**System slug:** `legacy-paths`
**GDD doc:** [systems/legacy-paths.md](../systems/legacy-paths.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/state/LegacyPaths.ts` (1-460)
- `packages/engine/src/state/MilestoneTracker.ts` (1-153)
- `packages/engine/src/systems/victorySystem.ts` (1-269)
- `packages/engine/src/systems/ageSystem.ts` (1-318)
- Cross-reference: `.claude/gdd/audits/ages.md` (F-02, F-04, F-10, F-11)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 2 |
| CLOSE | 3 |
| DIVERGED | 4 |
| MISSING | 3 |
| EXTRA | 1 |

**Total findings:** 13

---

## Detailed findings

### F-01: Dual schema not wired — DIVERGED

**Location:** `LegacyPaths.ts:30-459`, `ageSystem.ts:229-279`
**GDD reference:** `systems/legacy-paths.md` § "Entities"
**Severity:** HIGH
**Effort:** M
**VII says:** `PlayerState.legacyMilestonesComplete` feeds both golden/dark age effects and victory tracking.
**Engine does:** Two separate unconnected schemas: (1) `LegacyPaths.ts` — 12 predicate-based `LegacyMilestone.check()` functions, consumed only by `victorySystem` for UI enrichment; (2) `ageSystem.ts:checkLegacyMilestones()` — 4 independent count formulas (`Math.floor(totalKills/3)`, etc.) writing to `PlayerState.legacyPaths`, actual source for golden/dark age effects. Never reconciled.
**Gap:** Two engines, neither authoritative.
**Recommendation:** Migrate `checkLegacyMilestones()` to call `scoreLegacyPaths()`. Retire count formulas.

---

### F-02: No conquest multiplier — DIVERGED

**Location:** `LegacyPaths.ts:163-186`, `ageSystem.ts:236`
**GDD reference:** `systems/legacy-paths.md` § "Pax Imperatoria"
**Severity:** HIGH
**Effort:** S
**VII says:** Military path tracks settlement-points (conquered = 2, founded = 1). Milestones 6/9/12.
**Engine does:** Both schemas use raw city count with no conquest multiplier. `LegacyPaths.ts`: `ownedCities >= N`. `ageSystem.ts`: `Math.floor(totalKills/3)` (not settlements at all). No provenance tracking on `CityState`.
**Gap:** Aggression incentive absent.
**Recommendation:** Add `foundedBy: PlayerId` + `originalOwner?: PlayerId` to `CityState`. Derive `settlementPoints = sum(conquered ? 2 : 1)`.

---

### F-03: Antiquity science proxy uses wrong object — DIVERGED

**Location:** `LegacyPaths.ts:113-136`
**GDD reference:** `systems/legacy-paths.md` § "Great Library"
**Severity:** MED
**Effort:** S proxy fix; M Codex
**VII says:** Antiquity science milestones gate on displayed Codices (3/6/10).
**Engine does:** Tier 1-2 check `techsResearched >= 4/8`; tier 3 checks `hasBuildingInEveryCity(s, pid, 'library')`. Three tiers use three different dimensions.
**Gap:** Inconsistent proxy dimensions.
**Recommendation:** Standardize on one dimension, or add `codicesDisplayed` field (cross-cut `tech-tree.md` F-08).

---

### F-04: Golden Age wrong mechanics — DIVERGED

**Location:** `ageSystem.ts:140-220`
**GDD reference:** `systems/legacy-paths.md` § "Golden Age legacy bonuses"
**Severity:** HIGH
**Effort:** M
**VII says:** Antiquity→Exploration golden bonuses: Cultural = Amphitheaters retain yields; Economic = Cities don't downgrade to Towns; Military = Free infantry in every conquered settlement; Scientific = Academies retain yields.
**Engine does:** Flat empire-wide yield bonuses: `+5 combat`, `+3 gold/city`, `+3 science/city`, `+3 culture/city`. Generic MODIFY_YIELD — not building retention, not city preservation, not unit grants.
**Gap:** Entire golden age bonus catalog wrong.
**Recommendation:** Blocked on `ages.md` F-09 (ageless flag) + F-05 (tech reset). Design `GRANT_UNIT_PER_CITY` + `PRESERVE_CITY_STATUS` effect types.

---

### F-05: No Golden Age cap (1 per transition) — MISSING

**Location:** `ageSystem.ts:128-220`
**GDD reference:** `systems/legacy-paths.md` § "Legacy Points"
**Severity:** HIGH
**Effort:** S (after `ages.md` F-04)
**VII says:** Only 1 Golden Age Legacy activates per transition. Anti-snowball constraint.
**Engine does:** `getGoldenDarkAgeEffects()` applies all 4 unconditionally when `paths.X === 3`. Player with all-4 Golden Ages gets all 4 bonuses.
**Gap:** Cap absent.
**Recommendation:** Add `goldenAgeChosen: LegacyAxis | null`. Permit at most 1 axis per transition.

---

### F-06: Dark Age not opt-in — CLOSE (cross-ref `ages.md` F-10)

**Location:** `ageSystem.ts:146-219`
**GDD reference:** `systems/legacy-paths.md` § "Dark Age legacy bonuses"
**Severity:** MED
**Effort:** S (after `ages.md` F-04)
**VII says:** Dark ages opt-in at transition. Two-part: compensatory bonus + persistent penalty. E.g. Military Dark = lose armies + settlements, receive 3 full cavalry+siege armies.
**Engine does:** Auto-applies whenever `paths.X === 0`. Specific bonuses don't match: Military `+3 combat` (not free armies), Scientific `+5 science` (not auto-Flight).
**Gap:** Not opt-in; compensatory mechanics flat yields vs specific.
**Recommendation:** Gate behind bonus-selection UI (`ages.md` F-04). Replace generic yields with GDD-specific effects.

---

### F-07: Score uses reset legacy points — DIVERGED

**Location:** `victorySystem.ts:254-268`, `ageSystem.ts:83`
**GDD reference:** `systems/legacy-paths.md` § "Modern Age score victory"
**Severity:** MED
**Effort:** S
**VII says:** Score = cumulative career Legacy Points across all 3 ages.
**Engine does:** `calculateScore()` reads `player.legacyPoints` — reset to 0 at every TRANSITION_AGE. Player with 9+9 points enters Modern with `legacyPoints=0`. Score omits 18 historical points.
**Gap:** Career accumulation absent.
**Recommendation:** Add `totalCareerLegacyPoints: number` to `PlayerState`. Never reset. Use in `calculateScore()`.

---

### F-08: Modern victory conditions wrong — CLOSE

**Location:** `victorySystem.ts:101-228`
**GDD reference:** `systems/legacy-paths.md` § "Modern Age: Victory Conditions"
**Severity:** MED
**Effort:** M
**VII says:** Modern victories: Cultural = World's Fair Wonder; Economic = World Bank branches; Military = Manhattan Project + Operation Ivy; Scientific = Staffed Space Flight + Launch Pad.
**Engine does:** None match. Cross-cut `victory-paths.md` F-01 through F-04.
**Gap:** Blocked on project system.
**Recommendation:** See `victory-paths.md` for detailed recommendations.

---

### F-09: Military kills proxy cross-age bleed — CLOSE

**Location:** `LegacyPaths.ts:164-283`
**GDD reference:** `systems/legacy-paths.md` § "Per-age path names"
**Severity:** MED
**Effort:** S
**VII says:** Each age has its own military path with distinct counters.
**Engine does:** All 3 ages' military checks use `player.totalKills` — single cumulative counter never reset. 15 kills in Antiquity satisfies tier-3 in Exploration. Same affects `totalGoldEarned` + `techsResearched`.
**Gap:** Cross-age bleed.
**Recommendation:** Add per-age snapshots `killsThisAge`, `goldEarnedThisAge`. Reset at TRANSITION_AGE.

---

### F-10: Legacy Points untyped — MISSING

**Location:** `ageSystem.ts:246`, `GameState.ts` (player.legacyPoints: number)
**GDD reference:** `systems/legacy-paths.md` § "Legacy Points"
**Severity:** MED
**Effort:** S
**VII says:** Legacy Points typed by category. Cultural points cannot buy Military options.
**Engine does:** Single untyped integer. All milestone completions increment same counter.
**Gap:** Categorical typing absent.
**Recommendation:** Replace `legacyPoints: number` with `legacyPointsByAxis: Record<LegacyAxis, number>` on `PlayerState`.

---

### F-11: No global age progress meter — MISSING (cross-ref `ages.md` F-02)

**Location:** `ageSystem.ts:255-258`
**GDD reference:** `systems/legacy-paths.md` § "Entities"
**Severity:** HIGH
**Effort:** M
**VII says:** `ageProgressMeter` is GLOBAL shared state. All players' milestone completions add. AI completions also push it. Compression dynamic: opponents' progress shortens your age.
**Engine does:** `player.ageProgress` per-player. Increments +1 per that player's END_TURN only. Milestone completions do not add to ageProgress (`ages.md` F-02).
**Gap:** Compression dynamic absent.
**Recommendation:** Add `ageProgressMeter: number` to `GameState`. On any player's milestone completion, add `MILESTONE_PROGRESS`.

---

### F-12: MilestoneTracker barrel exclusion — CLOSE

**Location:** `MilestoneTracker.ts:24`
**GDD reference:** `systems/legacy-paths.md` § "UI requirements"
**Severity:** LOW
**Effort:** XS
**VII says:** Legacy Path panel needs analytics functions.
**Engine does:** `MilestoneTracker.ts` explicitly excludes itself from engine barrel. 3 functions require direct path imports from `packages/web`. `scoreLegacyPaths` IS barrel-exported (inconsistent).
**Gap:** Import consistency.
**Recommendation:** Add to barrel or document exclusion intent.

---

### F-13: Leaderboard dense-rank correct — MATCH

**Location:** `MilestoneTracker.ts:127-152`
**GDD reference:** `systems/legacy-paths.md` § UI
**Severity:** LOW
**Effort:** —
**VII says:** Dense-rank leaderboard.
**Engine does:** Correct pattern, matches `EconomyAnalytics.playerRanking`.
**Gap:** Caveat — reads from predicate schema (F-01 dual schema), not `PlayerState.legacyPaths`. Resolve F-01 first.
**Recommendation:** No action required beyond F-01 dependency.

---

## Extras to retire

- `checkLegacyMilestones()` count formulas in `ageSystem.ts` — replaced by `scoreLegacyPaths()` call (F-01).

---

## Missing items

1. Global `ageProgressMeter` on `GameState` (F-11).
2. Typed `legacyPointsByAxis` on `PlayerState` (F-10).
3. 1-per-transition Golden Age cap (F-05).
4. `totalCareerLegacyPoints` persistent field (F-07).
5. Per-age counter reset on transition (F-09).
6. CityState conquest/founded provenance (F-02).

---

## Cross-references to ages.md

| ages.md | Overlap |
|---|---|
| F-02 milestone-acceleration | Same root as LP-11 |
| F-04 legacy-bonus-selection | Prerequisite for F-05 and F-06 |
| F-10 dark-age-bonuses-inverted | Same code as F-06 |
| F-11 legacy-points-random-yield | Resolved by F-10 + ages F-04 |

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/legacy-paths.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/state/LegacyPaths.ts` (predicate schema — not wired to effects)
- `packages/engine/src/state/MilestoneTracker.ts`
- `packages/engine/src/systems/victorySystem.ts`
- `packages/engine/src/systems/ageSystem.ts` (count schema — drives effects)

**Status:** 2 MATCH / 3 CLOSE / 4 DIVERGED / 3 MISSING / 1 EXTRA

**Highest-severity finding:** F-01 — dual schema not reconciled (predicates never drive golden/dark age effects); F-04 — golden age bonuses are flat yields vs GDD structural effects; F-11 — global age progress meter absent.

---

## Open questions

1. Dual schema migration — can we consolidate in one commit, or incrementally?
2. Modern Age score — include pending bonus credits, or just completed milestones?
3. `PRESERVE_CITY_STATUS` effect — what happens at next transition?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| XS | F-12 | 0.1d |
| S | F-02, F-03, F-05, F-06, F-07, F-09, F-10 | ~3.5d |
| M | F-01, F-08, F-11 | ~8d |
| L | F-04 | ~1.5w |
| **Total** | 13 | **~3w** |

Recommended order: F-01 (dual schema) → F-10 (typed points) → F-09 (per-age counters) → F-02 (conquest multiplier) → F-05 + F-07 (golden cap + career points) → F-11 (global meter) → F-04 + F-06 (correct bonuses, blocked) → F-08 (Modern victories, blocked).

---

<!-- END OF AUDIT -->
