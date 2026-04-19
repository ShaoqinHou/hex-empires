# Victory Paths — hex-empires Audit

**System slug:** `victory-paths`
**GDD doc:** [systems/victory-paths.md](../systems/victory-paths.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/systems/victorySystem.ts` (1-268)
- `packages/engine/src/state/LegacyPaths.ts` (1-459)
- `packages/engine/src/types/GameState.ts` (VictoryType, VictoryProgress, VictoryState, VictoryLegacyProgressEntry)
- `packages/web/src/ui/panels/VictoryPanel.tsx` (1-139)
- `packages/web/src/ui/panels/VictoryProgressPanel.tsx` (1-232)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 1 |
| CLOSE | 2 |
| DIVERGED | 4 |
| MISSING | 3 |
| EXTRA | 1 |

**Total findings:** 11

---

## Detailed findings

### F-01: Modern Military victory is kills+cities, not Ideology Points + Operation Ivy — DIVERGED

**Location:** `victorySystem.ts:205-227`
**GDD reference:** `systems/victory-paths.md` § "Ideology (Military) → Operation Ivy"
**Severity:** HIGH
**Effort:** L
**VII says:** Accumulate Ideology Points (1/2/3 per conquest by ideology), 20-point threshold unlocks Manhattan Project Wonder, then complete Operation Ivy project.
**Engine does:** `checkMilitary` fires on `totalKills >= 20 AND ownedCities >= 5`. No Ideology Points, no Manhattan Project, no Operation Ivy.
**Gap:** Simplified domination check replaces structured project chain.
**Recommendation:** Add `ideologyPoints: number` to `PlayerState`. Add `COMPLETE_PROJECT` action. Wire conquest to award ideology points. Add Manhattan Project wonder + Operation Ivy project. Terminal: `completedProjects.includes('operation_ivy')`.

---

### F-02: Modern Economic victory is gold threshold, not World Bank office visits — DIVERGED

**Location:** `victorySystem.ts:174-202`
**GDD reference:** `systems/victory-paths.md` § "Railroad Tycoon (Economic) → World Bank"
**Severity:** HIGH
**Effort:** L
**VII says:** 500 Railroad Tycoon Points, then Great Banker visits every rival capital to establish World Bank Office (Gold + Influence cost). Last visit → victory.
**Engine does:** `checkEconomic` fires on `gold >= 500 AND totalGoldEarned >= 1000 AND hasAlliance >= 1`. No Railroad Tycoon, no Great Banker, no capital visit. Alliance requirement invented.
**Gap:** Entire Railroad Tycoon → Great Banker → World Bank chain absent.
**Recommendation:** Add `railroadTycoonPoints: number` to `PlayerState`. Add `ESTABLISH_WORLD_BANK_OFFICE` action. Add Great Banker unit. Terminal: offices remaining === 0.

---

### F-03: Modern Science victory is tech list completion, not Space Race project sequence — DIVERGED

**Location:** `victorySystem.ts:101-127`
**GDD reference:** `systems/victory-paths.md` § "Space Race (Scientific) → First Staffed Space Flight"
**Severity:** HIGH
**Effort:** M
**VII says:** 3 sequential space projects in city with correct buildings: Trans-Oceanic Flight (Flight + Aerodrome), Break Sound Barrier (Aerodynamics), Launch Satellite (Rocketry + Launch Pad). Terminal: First Staffed Space Flight in Launch Pad city.
**Engine does:** `checkScience` fires on all 10 modern techs researched AND `culture >= 100`. No project system, no Launch Pad requirement, no sequential gating.
**Gap:** Project chain absent. Culture≥100 gate invented.
**Recommendation:** Add `spaceMilestonesComplete: 0|1|2|3` to `PlayerState`. Add `COMPLETE_PROJECT` action. Wire each project to tech + building prereqs. Remove culture gate.

---

### F-04: Modern Culture victory is culture/civics threshold, not Artifacts + World's Fair — DIVERGED

**Location:** `victorySystem.ts:130-151`
**GDD reference:** `systems/victory-paths.md` § "Geographic Society (Cultural) → World's Fair"
**Severity:** HIGH
**Effort:** M
**VII says:** Collect 15 Artifacts via Explorer excavation (Exploration age), then build World's Fair Wonder (requires Natural History Civic).
**Engine does:** `checkCulture` fires on `culture >= 300 AND researchedCivics.length >= 5`. No Artifact subsystem, no Explorer excavation, no World's Fair terminal.
**Gap:** Live condition unrelated to VII mechanics.
**Recommendation:** Add `artifactsCollected: number` to `PlayerState`. Add Explorer excavation ability. Add World's Fair wonder with `isTerminalWonder: true`.

---

### F-05: Domination alive-check includes units; VII uses settlements only — CLOSE

**Location:** `victorySystem.ts:76-98`
**GDD reference:** `systems/victory-paths.md` § "Domination Victory"
**Severity:** MED
**Effort:** S
**VII says:** Conquer all rival settlements. Civ without settlements eliminated even if units survive. Independent Powers excluded.
**Engine does:** Treats player as alive if they have cities OR units. Rival stripped of cities but with stray scout blocks domination.
**Gap:** Unit-surviving-as-alive incorrectly blocks win.
**Recommendation:** Change alive predicate to `hasCities` only. Add Independent Powers as non-player type excluded.

---

### F-06: Score Victory uses turn limit (300), not Modern Age 100% progress — CLOSE

**Location:** `victorySystem.ts:229-247`
**GDD reference:** `systems/victory-paths.md` § "Score Victory (Fallback)"
**Severity:** MED
**Effort:** S
**VII says:** Triggers when Modern Age progress reaches 100% with no winner.
**Engine does:** `checkScore` fires at `turn >= 300`. No age-progress field. Score formula (`milestones*100 + legacyPoints*50 + cities*100 + techs*20 + culture`) is a guess.
**Gap:** Turn trigger vs age-progress trigger.
**Recommendation:** Add `ageProgress: number (0-1)` to `AgeState`. Accumulate from Modern-age milestone completions. Trigger when `>= 1.0 AND !victory.winner`.

---

### F-07: Diplomacy victory type has no GDD basis — EXTRA

**Location:** `victorySystem.ts:154-171`, `VictoryProgressPanel.tsx:5-12`
**GDD reference:** `systems/victory-paths.md` (diplomacy NOT listed)
**Severity:** MED
**Effort:** S
**VII says:** 4 victory paths (Cultural, Economic, Military, Scientific) + Domination (bypass) + Score (fallback). No Diplomacy Victory.
**Engine does:** `checkDiplomacy` fires on alliances ≥ 60% of rivals. `VictoryType` includes `'diplomacy'`. Full `VICTORY_CONFIG.diplomacy`.
**Gap:** 7th victory type invented without GDD basis.
**Recommendation:** Remove `'diplomacy'` from `VictoryType`. Remove `checkDiplomacy`. Update tests.

---

### F-08: All 12 Legacy Path milestone checks are proxy counters — DIVERGED

**Location:** `LegacyPaths.ts:113-420`
**GDD reference:** `systems/victory-paths.md` § all milestone tables
**Severity:** HIGH
**Effort:** L
**VII says:** Antiquity Economic tracks Resources assigned (7/14/20). Exploration Military tracks Distant-Land settlement points. Exploration Cultural tracks Relics displayed. Modern Cultural tracks Artifacts in Museums.
**Engine does:** Every path uses proxy: Antiquity Economic = `totalGoldEarned >= 200/500/1000`; Exploration Military = `totalKills >= 6/10/15`; etc. File comments document 12 proxy fallbacks.
**Gap:** No dedicated counter fields (`resourcesAssigned`, `distantLandPoints`, `relicsDisplayed`, `artifactsInMuseums`).
**Recommendation:** Priority order: `artifactsCollected` (Cultural), `ideologyPoints` (Military), `railroadTycoonPoints` (Economic), `spaceMilestonesComplete` (Science). Others can remain proxied.

---

### F-09: VictoryProgressPanel shows static hints; VictoryPanel uses raw rgba — MISSING (UI gaps)

**Location:** `VictoryProgressPanel.tsx:124-131`, `VictoryPanel.tsx:130-137`
**GDD reference:** `systems/victory-paths.md` § "UI requirements"
**Severity:** MED
**Effort:** S
**VII says:** Live counter per path. 80% age-progress Score Warning.
**Engine does:** Static hint strings. No live counters. No warning. `VictoryPanel.getCivColor` uses raw `rgba(120, 53, 15, 0.70)` — chrome-raw-hex-regression trap.
**Gap:** Diplomacy card present (F-07); static strings; raw rgba violations.
**Recommendation:** Remove Diplomacy card. Add live counters after F-08. Move palette to `--panel-civ-color-{n}` tokens.

---

### F-10: Age-transition Legacy Bonus menu not implemented — MISSING

**Location:** `LegacyPaths.ts`, `victorySystem.ts`
**GDD reference:** `systems/victory-paths.md` § all tier-1/2 bonus option tables (cross-cut `ages.md` F-04)
**Severity:** MED
**Effort:** M
**VII says:** Each milestone (tiers 1-2) awards Legacy Bonus from path menu. Tier 3 (Golden Age) awards fixed named bonus (e.g. Amphitheaters retain yields; Cities stay at transition; Free Infantry at Modern start). Primary cross-age acceleration mechanic.
**Engine does:** `LegacyPaths.ts` scores tiers but awards no bonuses. `ageSystem` TRANSITION_AGE has no Golden/Dark evaluation. `legacyBonuses` used in score math but never populated.
**Gap:** Milestone → Legacy Bonus loop absent.
**Recommendation:** Add `pendingLegacyBonus?: LegacyBonusChoice` to `PlayerState`. Set on milestone crossing. `CHOOSE_LEGACY_BONUS` action. Implement 24 named tier-3 Golden Age bonuses.

---

### F-11: Simultaneous terminal victory has no tiebreak — MISSING

**Location:** `victorySystem.ts:39-71`
**GDD reference:** `systems/victory-paths.md` § "Edge cases"
**Severity:** LOW
**Effort:** S
**VII says:** No documented tiebreak — implementation must decide.
**Engine does:** Iterates players in insertion order. First winner = winner.
**Gap:** No tiebreak logic.
**Recommendation:** Collect all winners. If multiple: highest `totalLegacyScore`, then turn order. Add `tied: boolean` to `VictoryState`.

---

## Extras to retire

- `checkDiplomacy` in victorySystem (F-07) — no GDD basis.
- `VICTORY_CONFIG.diplomacy` in `VictoryProgressPanel.tsx` — remove after F-07.
- Culture≥100 gate in `checkScience` — invented (F-03).
- Alliance≥1 gate in `checkEconomic` — invented (F-02).
- Inline `rgba(...)` in `VictoryPanel.getCivColor` — trap (F-09).

---

## Missing items

1. `ideologyPoints`, `railroadTycoonPoints`, `artifactsCollected`, `spaceMilestonesComplete` on `PlayerState` (F-01-F-04, F-08).
2. `COMPLETE_PROJECT` action + project system (F-01, F-03).
3. `ageProgress: number` in `AgeState` (F-06).
4. Legacy Bonus award + choice menu (F-10).
5. Simultaneous-win tiebreak (F-11).

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/victory-paths.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/victorySystem.ts`
- `packages/engine/src/state/LegacyPaths.ts`
- `packages/web/src/ui/panels/VictoryPanel.tsx`
- `packages/web/src/ui/panels/VictoryProgressPanel.tsx`

**Status:** 1 MATCH / 2 CLOSE / 4 DIVERGED / 3 MISSING / 1 EXTRA

**Highest-severity finding:** F-08 — all 12 legacy milestones are proxy counters; dedicated state fields absent, blocking all 4 terminal victories.

---

## Open questions

1. Artifact subsystem — `Explorer.excavate` design spec?
2. Manhattan Project + Operation Ivy — wonder or project data files needed?
3. World Bank office — is it a building, unit-state, or free-standing entity?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-05, F-06, F-07, F-09, F-11 | 2.5d |
| M | F-03, F-04, F-10 | ~7d |
| L | F-01, F-02, F-08 | ~4w |
| **Total** | 11 | **~5.5w** |

Recommended order: F-07 (retire diplomacy) → F-08 (add state fields) → F-03 (Science project seq) → F-04 (Culture Artifacts) → F-01 (Military Ideology/Ivy) → F-02 (Economic Railroad/Bank) → F-06 (age progress) → F-10 (legacy bonuses) → F-05/F-09/F-11.

---

<!-- END OF AUDIT -->
