# Settlements — hex-empires Audit

**System slug:** `settlements`
**GDD doc:** [systems/settlements.md](../systems/settlements.md)
**Audit date:** `2026-05-02`
**Auditor:** `codex-gpt-5.5-lead`
**Version target:** Firaxis patch 1.3.0 (per source-target.md; official drift flagged there)

---

## Engine files audited

- `packages/engine/src/systems/citySystem.ts`
- `packages/engine/src/systems/productionSystem.ts`
- `packages/engine/src/systems/growthSystem.ts` (supplement)
- `packages/engine/src/systems/ageSystem.ts` (age downgrade/focus reset)
- `packages/engine/src/state/HappinessUtils.ts` (supplement)
- `packages/engine/src/state/GrowthUtils.ts` (supplement)
- `packages/engine/src/state/YieldCalculator.ts` (supplement)
- `packages/engine/src/types/GameState.ts` (type definitions)
- `packages/web/src/ui/panels/CityPanel.tsx`
- `packages/web/src/ui/panels/TurnSummaryPanel.tsx`
- `packages/web/src/ui/layout/TopBar.tsx`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 7 |
| CLOSE | 2 |
| DIVERGED | 0 |
| MISSING | 2 |
| EXTRA | 0 |

**Total findings:** 11

---

## Detailed findings

### F-01: Town/City founding via single action — CLOSE

**Location:** `citySystem.ts:23-25`, `citySystem.ts:78-79`
**GDD reference:** `systems/settlements.md` § "Founding: Founder vs. Settler"
**Severity:** MED
**Effort:** M
**VII says:** Two distinct unit types: a one-time `Founder` that creates the capital as a city, and retrainable `Settler` units that always found Towns. Founding actions are split (`FOUND_CITY` vs `FOUND_TOWN`).
**Engine does:** A single `FOUND_CITY` action handles all founding. Tier is determined by `isFirstCity` detection (first city owned = city tier, all subsequent = town). No separate `FOUND_TOWN` action. No `founder` unit category preventing retraining.
**Gap:** Missing a distinct `FOUND_TOWN` action type. `isFirstCity` heuristic is functionally correct but architecturally diverges from VII's explicit unit-type gate.
**Recommendation:** Add a `foundingType: 'founder' | 'settler'` discriminant on `FOUND_CITY`, or a separate `FOUND_TOWN` action. Add a `founder` unit ability flag that prevents re-training.

---

### F-02: Town population cap — MATCH

**Location:** `growthSystem.ts:88`
**GDD reference:** `systems/settlements.md` § "Towns: Capabilities and Limitations"
**Severity:** MED
**Effort:** S
**VII says:** Towns grow up to population 7 (the specialization unlock threshold). Population cap for towns is effectively 7.
**Engine does:** `growthSystem` caps towns at population 7, matching the specialization unlock threshold.
**Gap:** None for the local cap rule.
**Recommendation:** Keep the regression test title aligned with the cap value.

---

### F-03: Town-to-City conversion cost — MATCH

**Location:** `citySystem.ts:160`
**GDD reference:** `systems/settlements.md` § "Converting a Town to a City" and "Formulas"
**Severity:** MED
**Effort:** M
**VII says:** Conversion cost scales with cities owned (higher → more expensive) and town development (higher pop/dev → cheaper). Observed range: 200–1000 gold.
**Engine does:** `calculateSettlementUpgradeCost` implements `200 + cityCount * 100 - townPopulation * 20`, clamped to [200, 1000]. `UPGRADE_SETTLEMENT` and `CityPanel` share the helper, so UI and engine agree.
**Gap:** No active gap against the local inferred formula.
**Recommendation:** Keep the helper as the only source of truth for conversion cost display and validation.

---

### F-04: Settlement Cap values per age — MATCH

**Location:** `HappinessUtils.ts:16-30`
**GDD reference:** `systems/settlements.md` § "Settlement Cap and Happiness Pressure" and "Formulas"
**Severity:** MED
**Effort:** S
**VII says:** Base cap 4 (Antiquity, confirmed). Exploration ~8, Modern ~12 (inferred: +4 per age advance).
**Engine does:** `calculateEffectiveSettlementCap` returns Antiquity 4, Exploration 8, Modern 12.
**Gap:** None for the local age-base cap.
**Recommendation:** Add tech/civic/attribute cap bonuses in a later content slice.

---

### F-05: Town specialization mechanics — MATCH

**Location:** `growthSystem.ts:10-36`, `types/GameState.ts:58-67`, `YieldCalculator.ts:79-92`
**GDD reference:** `systems/settlements.md` § "Town Specialization (Focus System)"
**Severity:** LOW
**Effort:** S
**VII says:** At pop 7, one-time Focus choice from 9 specializations. Permanent per age. All 9 types with defined bonuses.
**Engine does:** All 9 specializations are typed (`TownSpecialization` union). Pop-7 threshold is enforced. `lockedTownSpecialization` locks the first non-Growing focus per age while allowing Growing Town toggles. `getSpecializationYields` maps all 9 types; Growing Town threshold reduction (-33%) matches the +50% growth-rate description; Fort Town grants active defense HP without stacking across toggles or resets.
**Gap:** Core focus choice and lock behavior exists. Food forwarding for non-Growing towns remains absent and is tracked separately in F-11.
**Recommendation:** Keep specialization lifecycle tests with `growthSystem`, `citySystem`, and `ageSystem`.

---

### F-06: Production-to-gold conversion for towns — MATCH

**Location:** `CityPanel.tsx:97-98`, `productionSystem.ts:110`, `productionSystem.ts:322`, `resourceSystem.ts:85-106`
**GDD reference:** `systems/settlements.md` § "Towns: Capabilities and Limitations"
**Severity:** LOW
**Effort:** S
**VII says:** Towns have no production queue; all production yield auto-converts to gold.
**Engine does:** `productionSystem` skips towns on queue processing. `handleSetProduction` rejects towns. CityPanel folds town production into the gold ledger. ResourceSystem similarly routes production to gold for towns.
**Gap:** No gap. Production → gold conversion is correctly implemented across engine and UI.
**Recommendation:** None.

---

### F-07: Age transition — cities do NOT revert to towns — CLOSE

**Location:** `ageSystem.ts:21-111`
**GDD reference:** `systems/settlements.md` § "Age Transition Effects on Settlements"
**Severity:** HIGH
**Effort:** M
**VII says:** On age transition: all non-capital cities downgrade to town tier. Capital always retains city tier. Economic Golden Age legacy exempts all current cities. Town specializations reset to null.
**Engine does:** `ageSystem` downgrades non-capital player cities to towns, clears queues/progress, clears town specialization locks, and exempts cities when `legacyPaths.economic === 3`. `citySystem` mirrors the tier/focus reset as defense-in-depth.
**Gap:** The downgrade currently resets non-capital city population to 1, which is not clearly authorized by the settlements GDD/source snapshot.
**Recommendation:** Decide whether population reset is intentional. If not, preserve population during age downgrade.

---

### F-08: Raze settlement mechanic — MISSING

**Location:** `citySystem.ts` (no `RAZE_SETTLEMENT` handler)
**GDD reference:** `systems/settlements.md` § "Razing Captured Settlements"
**Severity:** HIGH
**Effort:** L
**VII says:** Player may raze a captured settlement. 12-turn countdown; zero yields during countdown. On expiry: settlement removed, borders cleared. Applies -1 permanent War Support vs all opponents; creates grievances. Religion home city cannot be razed.
**Engine does:** No `RAZE_SETTLEMENT` action. No `razingCountdown` state on `CityState`. No raze UI in `CityPanel` or `TurnSummaryPanel`.
**Gap:** Entire raze mechanic is absent — action, countdown state, yield-zeroing, removal, war-support penalty, religion guard.
**Recommendation:** Add `razingCountdown: number | null` to `CityState`. Add `RAZE_SETTLEMENT` action. In `turnSystem`/`resourceSystem`, zero yields for razing cities and decrement counter. On 0: remove city, apply diplomacy effects. Add religion-home-city guard.

---

### F-09: Settlement Cap UI indicator — MATCH

**Location:** `CityPanel.tsx`, `TurnSummaryPanel.tsx`
**GDD reference:** `systems/settlements.md` § "UI requirements"
**Severity:** MED
**Effort:** S
**VII says:** Settlement Cap indicator shows `current / cap` count in top HUD or empire summary.
**Engine does:** `TopBar` shows a settlement cap chip (`current / cap`) and `TurnSummaryPanel` includes settlement cap count with warning color when over cap.
**Gap:** None for basic cap visibility.
**Recommendation:** Keep `TopBar.settlementCap.test.tsx` as the UI invariant.

---

### F-10: Growing Town ↔ Focus toggle — MATCH

**Location:** `growthSystem.ts:19-36`
**GDD reference:** `systems/settlements.md` § "Town Specialization (Focus System)"
**Severity:** LOW
**Effort:** S
**VII says:** Players can toggle between Growing Town and their chosen non-Growing specialization. Cannot switch between two non-Growing specializations.
**Engine does:** `SET_SPECIALIZATION` locks the first non-Growing specialization in `lockedTownSpecialization`, allows toggling to `growing_town`, allows toggling back to the locked focus, and rejects a different non-Growing focus. `CityPanel` dispatches `SET_SPECIALIZATION` through the 9-option town specialization selector.
**Gap:** None for the Growing Town toggle rule.
**Recommendation:** Do not reintroduce the retired free-form `townFocus` overlay.

---

### F-11: Food forwarding from specialized towns — MISSING

**Location:** `growthSystem.ts`, `resourceSystem.ts`
**GDD reference:** `systems/settlements.md` § "Towns: Capabilities and Limitations" (food forwarding)
**Severity:** LOW
**Effort:** L
**VII says:** When a town selects any non-Growing specialization, it forwards all food yield to connected cities. The town's own growth halts. If unconnected, it continues growing independently.
**Engine does:** No food forwarding. Specialized town food is consumed locally. Growth continues as normal regardless of specialization.
**Gap:** The food-forwarding loop is unimplemented. Without it, Farming Towns and other specialized settlements don't fulfill their VII role of feeding nearby cities.
**Recommendation:** In `growthSystem` END_TURN pass, for each specialized non-Growing town: skip local growth, calculate food surplus, find connected cities (trade route graph or proximity heuristic), add surplus to connected city `food` accumulator.

---

## Extras to retire

### E-01: Specialist section (UI) correctly gates to cities only — no action needed

**Location:** `CityPanel.tsx:327`
UI shows specialist section only for `!isTown`. Engine-level `CityState.specialists` exists on all settlements but is not actively problematic. No action required.

---

## Missing items

| # | GDD Feature | Gap | Effort |
|---|---|---|---|
| M-01 | Raze settlement 12-turn countdown | No `RAZE_SETTLEMENT` action or countdown state | L |
| M-02 | Food forwarding from specialized towns | No yield routing from towns to connected cities | L |
| M-03 | Age downgrade population behavior | Non-capital city downgrade resets population to 1; source intent unclear | S |

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/settlements.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/citySystem.ts`
- `packages/engine/src/systems/productionSystem.ts`
- `packages/engine/src/systems/growthSystem.ts`
- `packages/engine/src/state/HappinessUtils.ts`
- `packages/web/src/ui/panels/CityPanel.tsx`

**Status:** 7 MATCH / 2 CLOSE / 0 DIVERGED / 2 MISSING / 0 EXTRA (see `.codex/gdd/audits/settlements.md`)

**Highest-severity finding:** F-08 — raze settlement mechanic absent (HIGH)

---

## Open questions

1. Should age-transition city downgrade preserve population instead of resetting non-capitals to population 1?
2. Does the age-transition downgrade fire immediately in `TRANSITION_AGE`, or at the start of the next age's first turn?
3. For Economic Golden Age exemption: is `legacyPaths.economic === 3` the right signal, or does the engine need an explicit boolean flag on `PlayerState`?
4. Food forwarding connection model: is hex-proximity an acceptable approximation, or does a formal road/trade-route graph need to be checked?
5. Raze + religion interaction: does `state.religions` currently track each religion's founding city? Needs cross-check before implementing the raze guard.

---

## Effort estimate

| Priority | Finding | Effort |
|---|---|---|
| P1 | F-08: Raze settlement | L (~2 days) |
| P2 | F-11: Food forwarding | L (~1 day) |
| P3 | F-01: FOUND_TOWN action split | M (~2 hours) |

---

<!-- END OF AUDIT -->
