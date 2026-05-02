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
| MATCH — code does what VII does | 11 |
| CLOSE — right shape, wrong specifics | 5 |
| DIVERGED — fundamentally different | 1 |
| MISSING — GDD describes, engine lacks | 0 |
| EXTRA — engine has, VII/GDD doesn't | 0 |

**Total findings:** 17

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



### F-02: `age-progress-milestone-accelerated-but-simplified` — CLOSE


**Location:** `packages/engine/src/systems/ageSystem.ts:255–258`
**GDD reference:** `systems/ages.md` § "Age-duration controls" and § "Formulas"
**Severity:** HIGH
**Effort:** M (1–3 days)
**VII says:** `ageEndProgress = sum(legacyMilestonesComplete * milestoneWeight) + ageTurnCount / ageTurnTarget`. Completing milestones early accelerates age-end. Age ends at approximately turn 150–200 at standard speed.
**Engine does:** `ageProgress` still increments naturally by +1, and newly completed legacy milestones add age progress and feed a global `ageProgressMeter` compression shortcut.
**Gap:** The implementation is still a simplified threshold model rather than the full `ageTurnTarget + weighted milestone sum` formula by game speed.
**Recommendation:** Keep the milestone acceleration path, then move thresholds/weights into game-speed config.

---



### F-03: `crisis-gate-on-transition` — MATCH


**Location:** `packages/engine/src/systems/ageSystem.ts:21–31`
**GDD reference:** `systems/ages.md` § "Triggers" and § "Age transition flow" → step 1
**Severity:** HIGH
**Effort:** M (1–3 days)
**VII says:** Crisis must resolve before transition can occur.
**Engine does:** `handleTransition` rejects transition while `player.crisisPhase` is set to an unresolved phase; resolved/no-crisis states can proceed.
**Gap:** None for the transition gate.
**Recommendation:** Keep crisis-state regression tests around transition acceptance.

---



### F-04: `legacy-bonus-selection-partial-ui` — CLOSE


**Location:** `packages/engine/src/systems/ageSystem.ts:33–53`; `packages/web/src/ui/panels/AgeTransitionPanel.tsx`
**GDD reference:** `systems/ages.md` § "Age transition flow" → step 4
**Severity:** HIGH
**Effort:** M (1–3 days)
**VII says:** On transition, player chooses which earned legacy bonuses to activate (typically pick 2 of 4). Unchosen bonuses are discarded.
**Engine does:** `handleTransition` creates `pendingLegacyBonuses`, `CHOOSE_LEGACY_BONUSES` applies up to two picks, and `AgeTransitionPanel` renders a pick-2 section when pending bonuses exist.
**Gap:** The panel currently dispatches `TRANSITION_AGE` and resolves immediately, so the pick-2 UX needs an end-to-end flow check to ensure the player sees pending choices at the correct point.
**Recommendation:** Rework the age-transition modal into explicit phases: civ choice, legacy bonus choice, confirmation.
---



### F-05: `no-tech-tree-reset-on-transition` — MATCH


**Location:** `packages/engine/src/systems/ageSystem.ts`
**GDD reference:** `systems/ages.md` § "Per-age state rebuild" → Resets
**Severity:** HIGH
**Effort:** M (1–3 days)
**VII says:** Tech tree is replaced with the new age tree on transition. Mid-research progress is lost.
**Engine does:** `handleTransition` clears `researchedTechs`, `currentResearch`, `researchProgress`, `masteredTechs`, `currentMastery`, `masteryProgress`, and `techProgressMap` for the transitioning player. `researchSystem` also clears the active tech tree state on `TRANSITION_AGE` when tested in isolation.
**Gap:** None for active tech-tree reset. Persistent non-tree state such as codices, attribute points, and future tech boost scaffolding remains outside the reset list.
**Recommendation:** Keep active tree fields age-local. Do not reintroduce researched/mastered tech persistence; model cross-age benefits through explicit carry-forward fields.

---



### F-06: `no-civic-tree-reset-on-transition` — MATCH


**Location:** `packages/engine/src/systems/ageSystem.ts`
**GDD reference:** `systems/ages.md` § "Per-age state rebuild" → Resets
**Severity:** HIGH
**Effort:** S (half-day)
**VII says:** Civic tree is replaced with the new age tree on transition.
**Engine does:** `handleTransition` clears `researchedCivics`, `currentCivic`, `civicProgress`, `masteredCivics`, `currentCivicMastery`, `civicMasteryProgress`, civic-granted `policySlotCounts`, and the policy swap window. `civicSystem` mirrors the active civic-tree reset for isolated-system coverage. `completedCivics`, `traditions`, and celebration-earned `socialPolicySlots` persist separately.
**Gap:** None for active civic-tree reset. Full tradition content remains tracked under F-07.
**Recommendation:** Keep researched/mastered civics age-local; preserve cross-age cultural carry-forward only through `traditions` and non-mechanical history.

---



### F-07: `traditions-present-but-not-slotted` — CLOSE


**Location:** `packages/engine/src/types/GameState.ts`; `packages/engine/src/types/Tradition.ts`; `packages/engine/src/systems/civicSystem.ts`; `packages/engine/src/state/EffectUtils.ts`
**GDD reference:** `systems/ages.md` § "Entities" → `PlayerState.traditions`; § "Per-age state rebuild" → Persists
**Severity:** MED
**Effort:** M (1–3 days)
**VII says:** Traditions — social policies adopted in past ages — persist as selectable options across future ages.
**Engine does:** Players have a persistent `traditions` pool; civics can unlock traditions; `EffectUtils` applies tradition effects; age transition preserves the pool.
**Gap:** Traditions are auto-active once owned rather than explicitly slotted as policy cards.
**Recommendation:** Add tradition cards to policy slotting and apply effects only while slotted.

---



### F-08: `pantheon-cleared-on-antiquity-exploration-transition` — MATCH


**Location:** `packages/engine/src/systems/ageSystem.ts:21–112`
**GDD reference:** `systems/ages.md` § "Per-age state rebuild" → Resets; § "Age 1" → Religion in Antiquity
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Pantheon does NOT carry to Exploration. This is an explicit VII departure from VI. Religion is a fresh system starting in Exploration.
**Engine does:** `handleTransition` clears `pantheonId` when leaving Antiquity and drops the pantheon claims slot from religion state.
**Gap:** None for pantheon clearing.
**Recommendation:** Keep pantheon persistence tests split from founded religion persistence.
---



### F-09: `ageless-building-flag-and-obsolescence` — MATCH


**Location:** `packages/engine/src/types/Building.ts:3–21`
**GDD reference:** `systems/ages.md` § "Per-age state rebuild" → Persists and Resets
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Ageless buildings (Warehouses, Unique Buildings, Wonders) persist across transitions. Non-ageless buildings become obsolete (lose effects, keep base yields).
**Engine does:** `BuildingDef.isAgeless` exists and `ageSystem` removes older-age non-ageless buildings while preserving ageless/wonder-style entries.
**Gap:** Building data still needs source verification to ensure every Warehouse, Wonder, and unique building is flagged correctly.
**Recommendation:** Continue data audits by building category.

---



### F-10: `dark-age-penalties-only` — MATCH


**Location:** `packages/engine/src/systems/ageSystem.ts:140–220`
**GDD reference:** `systems/ages.md` § "Age transition flow" → step 2
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Completing ALL milestones → Golden Age (bonus). Completing ZERO → Dark Age (penalty only). No silver-lining bonuses on dark ages.
**Engine does:** Dark-age branches apply penalty effects only (for example combat/yield penalties and economic gold loss) with no compensating positive bonuses.
**Gap:** Exact penalty values remain a source-verification task.
**Recommendation:** Keep dark-age effects penalty-only; verify values against current game data.

---



### F-11: `legacy-points-not-random-yields` — MATCH


**Location:** `packages/engine/src/systems/ageSystem.ts:39–49`
**GDD reference:** N/A (no VII equivalent)
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Legacy points tally completed milestones; at transition the player chooses which legacy bonuses to activate. No random yield conversion.
**Engine does:** The random legacy-points-to-yields loop is gone. Legacy points are reset/spent through explicit transition bonus selection.
**Gap:** None for retiring the random yield extra.
**Recommendation:** Keep seeded RNG out of legacy-bonus selection except for documented random effects.

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

- None currently tracked as live extras. The prior random legacy yield conversion and dark-age silver-lining bonuses were retired.

---

## Missing items (not yet implemented)

- **Simultaneous global transition** (F-01) — required for VII multi-player clone; single-player acceptable workaround only.
- **Legacy bonus selection UX** (F-04) — engine pieces exist, but the modal flow needs a full phase-based UX pass.
- **Tradition slotting** (F-07) — tradition pool exists, but traditions are not yet slotted cards.
- **Historical path + leader unlock filtering** (F-12) — civ selection is sorted by historical pair but not fully filtered/locked.
- **Age-progress formula/game-speed config** (F-02) — milestone acceleration exists but remains simplified.

---

## Mapping recommendation for GDD system doc

Paste this back into `.codex/gdd/systems/ages.md` § "Mapping to hex-empires":

```markdown
## Mapping to hex-empires

**Engine files:**
- `packages/engine/src/systems/ageSystem.ts`
- `packages/engine/src/state/LegacyPaths.ts`
- `packages/engine/src/state/MilestoneTracker.ts`
- `packages/web/src/ui/panels/AgeTransitionPanel.tsx`

**Status:** 11 MATCH / 5 CLOSE / 1 DIVERGED / 0 MISSING / 0 EXTRA (see `.codex/gdd/audits/ages.md` for details)

**Highest-severity finding:** F-01 — transition-not-simultaneous (HIGH, L); F-04 — legacy-bonus selection UX is only partially integrated (HIGH, M)
```

---

## Open questions for the audit

- **Commander persistence:** GDD confirms commanders persist (VII exception). `handleTransition` now has a commander-specific cleanup: commander records persist, non-fleet packed ordinary units are cleared, Exploration→Modern Fleet Commanders retain assigned naval snapshots, and unassigned owned naval units are removed. Broader non-commander unit transition policy is still source-conflicting and unaudited outside the commander/fleet rule. Follow-up: audit `unitSystem`.
- **Exact ageTurnTarget per speed:** `AgeState.ageThresholds` uses static numbers. The game-speed multiplier table from the GDD (Quick=100, Standard=180, Epic=280) is not implemented. Scope: game-speed system audit.
- **Distant Lands reveal:** GDD says the map expands on Antiquity→Exploration. `handleTransition` makes no map calls. Cross-system gap (ageSystem + mapSystem); out of scope for this audit.
- **LegacyPaths.ts vs ageSystem.ts schema divergence:** `LegacyPaths.ts` uses predicate-based milestone checks; `ageSystem.ts` uses integer count fields on `PlayerState.legacyPaths`. These two schemas are not currently wired together. A future sync will be needed.

---

## Effort estimate

| Bucket | Findings | Estimated total effort |
|---|---|---|
| S (half-day) | F-12, F-13 | 1d |
| M (1–3 days) | F-02, F-04, F-07 | 4–9d |
| L (week+) | F-01 | 1w+ |
| **Total** | | **~2–3 weeks** |

Recommended sequencing: `F-04` (phase-based legacy bonus UX), `F-13` (age-progress tooltip copy), `F-07` (tradition slotting), `F-02` (game-speed/weight config), `F-12` (civ filtering), `F-01` (true global simultaneous transition; defer until multiplayer scope confirmed).

---

<!-- END OF AUDIT -->
