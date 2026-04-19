# Ages — hex-empires Audit

**System slug:** `ages`
**GDD doc:** [systems/ages.md](../systems/ages.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4-6`
**Version target:** Firaxis patch 1.3.0 (per commitment.md)


---

## Engine files audited

- `packages/engine/src/systems/ageSystem.ts` (lines 1–317)
- `packages/engine/src/state/LegacyPaths.ts` (lines 1–460)
- `packages/engine/src/state/MilestoneTracker.ts` (lines 1–153)
- `packages/engine/src/types/GameState.ts` (AgeState, PlayerState fields)
- `packages/engine/src/types/Building.ts` (BuildingDef shape)
- `packages/web/src/ui/panels/AgeTransitionPanel.tsx` (lines 1–271)


---

## Summary tally

| Status | Count |
|---|---|
| MATCH — code does what VII does | 4 |
| CLOSE — right shape, wrong specifics | 3 |
| DIVERGED — fundamentally different | 4 |
| MISSING — GDD describes, engine lacks | 4 |
| EXTRA — engine has, VII/GDD doesn't | 1 |

**Total findings:** 16

## Detailed findings


### F-01: `transition-not-simultaneous` — DIVERGED


**Location:** `packages/engine/src/systems/ageSystem.ts:21–112`; `packages/web/src/ui/panels/AgeTransitionPanel.tsx:9–250`
**GDD reference:** `systems/ages.md` § "Age transition flow" → step 5; § "Triggers"
**Severity:** HIGH
**Effort:** L (week+)
**VII says:** All players transition simultaneously — play pauses globally until every human player has completed transition choices.
**Engine does:** Transition is a per-player action (`TRANSITION_AGE` with `state.currentPlayerId`). No global pause; no check that other players are also ready.
**Gap:** Single-player sequential model instead of multi-player simultaneous pause.
**Recommendation:** Add `transitionPhase: 'none' | 'pending' | 'in-progress' | 'complete'` to `GameState`. Block `END_TURN` globally until all players have transitioned. Re-evaluate after multiplayer scope is confirmed.

---



### F-02: `age-progress-turn-based-not-milestone-accelerated` — DIVERGED


**Location:** `packages/engine/src/systems/ageSystem.ts:255–258`
**GDD reference:** `systems/ages.md` § "Age-duration controls" and § "Formulas"
**Severity:** HIGH
**Effort:** M (1–3 days)
**VII says:** `ageEndProgress = sum(legacyMilestonesComplete * milestoneWeight) + ageTurnCount / ageTurnTarget`. Completing milestones early accelerates age-end. Age ends at approximately turn 150–200 at standard speed.
**Engine does:** `ageProgress` increments by exactly +1 per END_TURN call, unconditionally. Milestone completions award `legacyPoints` but do NOT add to `ageProgress`. Threshold is a single static number in `AgeState.ageThresholds`.
**Gap:** Missing the milestone-acceleration component. Ages always run exactly `threshold` turns regardless of player performance.
**Recommendation:** Remove the `legacyPoints`-to-random-yield mechanic (see F-11). Wire milestone completions to add a configurable `milestoneAgeBonus` to `ageProgress`.

---



### F-03: `no-crisis-gate-on-transition` — MISSING


**Location:** `packages/engine/src/systems/ageSystem.ts:21–31`
**GDD reference:** `systems/ages.md` § "Triggers" and § "Age transition flow" → step 1
**Severity:** HIGH
**Effort:** M (1–3 days)
**VII says:** Crisis must resolve before transition can occur.
**Engine does:** The `handleTransition` guard only checks `player.ageProgress >= threshold`. No crisis state is consulted. `RESOLVE_CRISIS` action exists in `GameState.ts:418` but is not checked in `ageSystem`.
**Gap:** Players can transition mid-crisis, skipping the mandatory crisis-resolution gate.
**Recommendation:** Add `crisisPhase` to `AgeState`; require `crisisPhase === 'resolved'` before `handleTransition` proceeds. Wire `crisisSystem` to set that flag.

---



### F-04: `legacy-bonus-selection-missing` — MISSING


**Location:** `packages/engine/src/systems/ageSystem.ts:33–53`; `packages/web/src/ui/panels/AgeTransitionPanel.tsx`
**GDD reference:** `systems/ages.md` § "Age transition flow" → step 4
**Severity:** HIGH
**Effort:** M (1–3 days)
**VII says:** On transition, player chooses which earned legacy bonuses to activate (typically pick 2 of 4). Unchosen bonuses are discarded.
**Engine does:** ALL earned bonuses from `getCivLegacyBonus()` AND all `legacyPoints`-converted effects are automatically applied. No choice UI. No cap.
**Gap:** No player agency over which legacy bonuses carry forward. Unlimited bonuses accumulate with no selection cap.
**Recommendation:** Add a `pendingLegacyBonuses` array to the `TRANSITION_AGE` action. Surface a selection UI in `AgeTransitionPanel` before dispatching. Enforce a per-age cap (VII uses pick 2 of N).
---



### F-05: `no-tech-tree-reset-on-transition` — MISSING


**Location:** `packages/engine/src/systems/ageSystem.ts:75–84`
**GDD reference:** `systems/ages.md` § "Per-age state rebuild" → Resets
**Severity:** HIGH
**Effort:** M (1–3 days)
**VII says:** Tech tree is replaced with the new age tree on transition. Mid-research progress is lost.
**Engine does:** `handleTransition` does NOT clear `researchedTechs`, `currentResearch`, or `researchProgress` on transition.
**Gap:** Full tech persistence across ages instead of reset. The tech-tree-reset is fundamental to VII fresh-start-each-age design.
**Recommendation:** Add `currentResearch: null, researchProgress: 0` to `updatedPlayers.set()` in `handleTransition`. Age-gating techs by `TechnologyDef.age` already exists in the data layer.

---



### F-06: `no-civic-tree-reset-on-transition` — MISSING


**Location:** `packages/engine/src/systems/ageSystem.ts:75–84`
**GDD reference:** `systems/ages.md` § "Per-age state rebuild" → Resets
**Severity:** HIGH
**Effort:** S (half-day)
**VII says:** Civic tree is replaced with the new age tree on transition.
**Engine does:** `handleTransition` does NOT clear `researchedCivics` or any current civic research.
**Gap:** All civics from previous ages persist, granting ongoing effects from old-age civic bonuses into the new age.
**Recommendation:** Clear `researchedCivics` (or at minimum the non-tradition ones) in `handleTransition`. VII keeps traditions as a separate mechanic — these should persist while the civic tree resets (see F-07).

---



### F-07: `traditions-not-implemented` — MISSING


**Location:** N/A (no engine file)
**GDD reference:** `systems/ages.md` § "Entities" → `PlayerState.traditions`; § "Per-age state rebuild" → Persists
**Severity:** MED
**Effort:** M (1–3 days)
**VII says:** Traditions — social policies adopted in past ages — persist as selectable options across future ages.
**Engine does:** No `traditions` field on `PlayerState`. The `governmentSystem` tracks `slottedPolicies` but there is no mechanism for marking old policies as traditions that survive the tree reset.
**Gap:** The traditions carry-forward mechanic is absent entirely. Combined with F-06 (no civic reset), there is nothing to preserve across what would be a reset.
**Recommendation:** Add `traditions: ReadonlyArray<PolicyId>` to `PlayerState`. On transition, copy the current age slotted policies into `traditions`. After the civic tree resets, traditions become re-selectable without requiring re-research.

---



### F-08: `pantheon-not-cleared-on-antiquity-exploration-transition` — DIVERGED


**Location:** `packages/engine/src/systems/ageSystem.ts:21–112`
**GDD reference:** `systems/ages.md` § "Per-age state rebuild" → Resets; § "Age 1" → Religion in Antiquity
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Pantheon does NOT carry to Exploration. This is an explicit VII departure from VI. Religion is a fresh system starting in Exploration.
**Engine does:** `handleTransition` does NOT clear `player.pantheonId`. The pantheon bonus persists indefinitely into Exploration and Modern.
**Gap:** Pantheon effects carry across ages, contradicting the explicit VII design.
**Recommendation:** Add `pantheonId: null` to `updatedPlayers.set()` in `handleTransition` when transitioning from antiquity to exploration. Also clear any active pantheon effects from `legacyBonuses` at that point.
---



### F-09: `no-ageless-building-flag` — DIVERGED


**Location:** `packages/engine/src/types/Building.ts:3–21`
**GDD reference:** `systems/ages.md` § "Per-age state rebuild" → Persists and Resets
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Ageless buildings (Warehouses, Unique Buildings, Wonders) persist across transitions. Non-ageless buildings become obsolete (lose effects, keep base yields).
**Engine does:** `BuildingDef` has no `isAgeless` boolean field. All buildings persist unchanged through transition. (`DistrictOverhaul.ts:88` has `age: Age | ageless` on `QuarterV2` but this does not propagate to `BuildingDef`.)
**Gap:** No mechanism to distinguish ageless from age-specific buildings. All buildings effectively persist forever, trivializing transition economics.
**Recommendation:** Add `readonly isAgeless?: boolean` to `BuildingDef`. Flag Warehouses, Wonders, and civ-unique buildings as `true`. On transition, iterate `city.buildings` and remove non-ageless buildings whose `age !== nextAge`.

---



### F-10: `dark-age-bonuses-inverted` — CLOSE


**Location:** `packages/engine/src/systems/ageSystem.ts:140–220`
**GDD reference:** `systems/ages.md` § "Age transition flow" → step 2
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Completing ALL milestones → Golden Age (bonus). Completing ZERO → Dark Age (penalty only). No silver-lining bonuses on dark ages.
**Engine does:** Golden Age at paths.X === 3; Dark Age at paths.X === 0 — thresholds are correct. However every dark-age branch also grants a positive bonus: military +3 combat, science +5 science, culture +4 culture, economic +2 production.
**Gap:** Dark ages should be pure penalties. The bonus components are custom hex-empires additions that soften the downside.
**Recommendation:** Remove the bonus MODIFY effects from all four dark-age branches. Keep only penalties: military = food penalty, economic = gold loss, science = tech loss, culture = food/culture penalty.

---



### F-11: `legacy-points-converted-to-random-yields` — EXTRA


**Location:** `packages/engine/src/systems/ageSystem.ts:39–49`
**GDD reference:** N/A (no VII equivalent)
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Legacy points tally completed milestones; at transition the player chooses which legacy bonuses to activate. No random yield conversion.
**Engine does:** On transition, each accumulated `legacyPoint` converts to a random +1 yield (randomized over 5 yield types using the seeded RNG). This is purely a hex-empires invention.
**Gap:** Random yield spray is not a VII mechanic. Introduces non-strategic luck at the most important game moment.
**Recommendation:** Remove the `for (let i = 0; i < player.legacyPoints; i++)` loop at lines 41–49. Replace with VII explicit legacy-bonus selection (F-04). The `legacyPoints` field can be repurposed as a score display metric.

---



### F-12: `civ-selection-pool-unfiltered` — CLOSE


**Location:** `packages/web/src/ui/panels/AgeTransitionPanel.tsx:21`
**GDD reference:** `systems/ages.md` § "Age transition flow" → step 3
**Severity:** MED
**Effort:** M (1–3 days)
**VII says:** Civ options are filtered by historical-path unlocks, geographic/resource unlocks, and leader-preferred unlocks. All players can always pick from a base set.
**Engine does:** `availableCivs = [...state.config.civilizations.values()].filter(c => c.age === nextAge)`. All civs of the next age are shown with no path-based filtering.
**Gap:** No historical path unlocks, no geographical unlocks, no leader-preferred recommendations. Civ selection is a flat unfiltered list.
**Recommendation:** Add `historicalUnlocks: ReadonlyArray<CivilizationId>` to `CivilizationDef` and `leaderUnlocks` on `LeaderDef`. In `AgeTransitionPanel`, sort and badge unlocked civs at the top.

---



### F-13: `age-progress-tooltip-hint-wrong` — CLOSE


**Location:** `packages/web/src/ui/panels/AgeTransitionPanel.tsx:89`
**GDD reference:** `systems/ages.md` § "Formulas"
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** Age progress advances from both turn count and milestone completions.
**Engine does:** The UI tooltip reads "Each technology researched grants +5 age progress." This mechanic is NOT present in ageSystem.ts — ageProgress only increments by +1 per turn.
**Gap:** UI tooltip misrepresents the actual engine mechanic. Likely a stale comment from an earlier design iteration.
**Recommendation:** Update the tooltip to accurately describe the current mechanic or implement tech-research progress bonuses to match the tooltip.

---



### F-14: `three-ages` — MATCH


**Location:** `packages/engine/src/types/GameState.ts:341–344`; `packages/engine/src/systems/ageSystem.ts:281–287`
**GDD reference:** `systems/ages.md` § "Purpose" and § "Mechanics"
**Severity:** N/A (confirmed correct)
**Effort:** N/A
**VII says:** Three ages: Antiquity, Exploration, Modern. Modern is the terminal age.
**Engine does:** `type Age = antiquity | exploration | modern`; `getNextAge` returns null for modern. Exactly matches.
**Gap:** None.
**Recommendation:** No action needed.

---



### F-15: `leader-persistence` — MATCH


**Location:** `packages/engine/src/systems/ageSystem.ts:75–84`
**GDD reference:** `systems/ages.md` § "Per-age state rebuild" → Persists
**Severity:** N/A (confirmed correct)
**Effort:** N/A
**VII says:** Leader persists across all ages unchanged.
**Engine does:** `handleTransition` updates `civilizationId` to `newCivId` but does NOT modify `leaderId` or any leader attributes. Correctly implements engine-patterns.md § 4 invariant.
**Gap:** None.
**Recommendation:** No action needed.

---



### F-16: `legacy-bonus-append-invariant` — MATCH


**Location:** `packages/engine/src/systems/ageSystem.ts:35–37`
**GDD reference:** `systems/ages.md` § "Entities" → `PlayerState.legacyBonuses`
**Severity:** N/A (confirmed correct)
**Effort:** N/A
**VII says:** Legacy bonuses accumulate across ages; never replaced or truncated.
**Engine does:** `bonuses = legacyBonus ? [...player.legacyBonuses, legacyBonus] : [...player.legacyBonuses]`. Spread-appends, never replaces. Matches engine-patterns.md § 4 invariant.
**Gap:** None.
**Recommendation:** No action needed.

---



### F-17: `civ-switch-per-age` — MATCH


**Location:** `packages/engine/src/systems/ageSystem.ts:77`; `packages/web/src/ui/panels/AgeTransitionPanel.tsx:161–163`
**GDD reference:** `systems/ages.md` § "Age transition flow" → step 3
**Severity:** N/A (confirmed correct)
**Effort:** N/A
**VII says:** Player picks a new civilization from the next age roster on each transition.
**Engine does:** `civilizationId: newCivId` applied in `handleTransition`; UI filters civs by `c.age === nextAge` and dispatches TRANSITION_AGE with the chosen civ.
**Gap:** None at the core dispatch level (civ-pool filtering gaps are F-12, a CLOSE).
**Recommendation:** No action needed.
---

## Extras to retire

- `ageSystem.ts:39–49` — random `legacyPoints`-to-yield conversion loop. VII has no equivalent; retire in favor of the bonus-selection mechanic (F-04 / F-11).
- Dark-age silver-lining bonuses (military `+3 combat`, science `+5 science`, culture `+4 culture`, economic `+2 production`) — VII dark ages are penalties only. Remove or quarantine as a non-canonical house rule.

---

## Missing items (not yet implemented)

- **Simultaneous global transition** (F-01) — required for VII multi-player clone; single-player acceptable workaround only.
- **Crisis gate on transition** (F-03) — crisisSystem exists, wiring to ageSystem gate is deferred.
- **Legacy bonus selection UI** (F-04) — no pick-N UI; all bonuses auto-apply.
- **Tech + civic tree reset** (F-05, F-06) — fundamental to the three fresh starts design; currently players carry all prior-age knowledge.
- **Traditions** (F-07) — no `PlayerState.traditions` field; the mechanic that would survive the civic reset is absent.
- **Pantheon clear on transition** (F-08) — small scope but violates the explicit VII pantheon-is-Antiquity-only rule.
- **Ageless building flag** (F-09) — `BuildingDef` has no `isAgeless` field; buildings never go obsolete.
- **Historical path + leader unlock filtering** (F-12) — civ selection is a flat unfiltered pool.

---

## Mapping recommendation for GDD system doc

Paste this back into `.claude/gdd/systems/ages.md` § "Mapping to hex-empires":

```markdown
## Mapping to hex-empires

**Engine files:**
- `packages/engine/src/systems/ageSystem.ts`
- `packages/engine/src/state/LegacyPaths.ts`
- `packages/engine/src/state/MilestoneTracker.ts`
- `packages/web/src/ui/panels/AgeTransitionPanel.tsx`

**Status:** 4 MATCH / 3 CLOSE / 4 DIVERGED / 4 MISSING / 1 EXTRA (see `.claude/gdd/audits/ages.md` for details)

**Highest-severity finding:** F-01 — transition-not-simultaneous (HIGH, L); F-02 — age-progress-not-milestone-accelerated (HIGH, M); F-03 — no-crisis-gate (HIGH, M)
```

---

## Open questions for the audit

- **Commander persistence:** GDD confirms commanders persist (VII exception). `handleTransition` never clears any units, so commanders DO persist — but only because ALL units persist. Whether non-commander units should be cleared on transition is unaudited (GDD flags this as `[INFERRED]`). Follow-up: audit `unitSystem`.
- **Exact ageTurnTarget per speed:** `AgeState.ageThresholds` uses static numbers. The game-speed multiplier table from the GDD (Quick=100, Standard=180, Epic=280) is not implemented. Scope: game-speed system audit.
- **Distant Lands reveal:** GDD says the map expands on Antiquity→Exploration. `handleTransition` makes no map calls. Cross-system gap (ageSystem + mapSystem); out of scope for this audit.
- **LegacyPaths.ts vs ageSystem.ts schema divergence:** `LegacyPaths.ts` uses predicate-based milestone checks; `ageSystem.ts` uses integer count fields on `PlayerState.legacyPaths`. These two schemas are not currently wired together. A future sync will be needed.

---

## Effort estimate

| Bucket | Findings | Estimated total effort |
|---|---|---|
| S (half-day) | F-06, F-08, F-09, F-10, F-11, F-13 | 3d |
| M (1–3 days) | F-02, F-03, F-04, F-05, F-07, F-12 | 9–18d |
| L (week+) | F-01 | 1w+ |
| **Total** | | **~3–4 weeks** |

Recommended sequencing (highest severity + lowest effort first): `F-05, F-06` (tech+civic reset, HIGH), `F-08` (pantheon clear, S), `F-09` (ageless flag, S), `F-11` (remove random yield loop, S), `F-13` (fix tooltip, S), `F-03` (crisis gate, M, HIGH), `F-02` (milestone acceleration, M, HIGH), `F-04` (bonus selection, M, HIGH), `F-07` (traditions, M, MED), `F-12` (civ filtering, M, MED), `F-01` (simultaneous transition, L — defer until multiplayer scope confirmed).

---

<!-- END OF AUDIT -->
