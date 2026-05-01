# Settlements — hex-empires Audit

**System slug:** `settlements`
**GDD doc:** [systems/settlements.md](../systems/settlements.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/systems/citySystem.ts`
- `packages/engine/src/systems/productionSystem.ts`
- `packages/engine/src/systems/growthSystem.ts` (supplement)
- `packages/engine/src/state/HappinessUtils.ts` (supplement)
- `packages/engine/src/state/GrowthUtils.ts` (supplement)
- `packages/engine/src/state/YieldCalculator.ts` (supplement)
- `packages/engine/src/types/GameState.ts` (type definitions)
- `packages/web/src/ui/panels/CityPanel.tsx`
- `packages/web/src/ui/panels/TurnSummaryPanel.tsx`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 3 |
| CLOSE | 3 |
| DIVERGED | 0 |
| MISSING | 4 |
| EXTRA | 1 |

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

### F-02: Town population cap — CLOSE

**Location:** `growthSystem.ts:88`
**GDD reference:** `systems/settlements.md` § "Towns: Capabilities and Limitations"
**Severity:** MED
**Effort:** S
**VII says:** Towns grow up to population 7 (the specialization unlock threshold). Population cap for towns is effectively 7.
**Engine does:** `const townCap = city.settlementType === 'town' ? 5 : Infinity;` — hard-cap at population 5, not 7.
**Gap:** Cap is 5 instead of 7. The constant `SPECIALIZATION_POP_MINIMUM = 7` in `growthSystem.ts:10` is unreachable for towns — they stop at 5 and can never specialize.
**Recommendation:** Change the town cap to `7`. This also unblocks the entire specialization system.

---

### F-03: Town-to-City conversion cost — CLOSE

**Location:** `citySystem.ts:160`
**GDD reference:** `systems/settlements.md` § "Converting a Town to a City" and "Formulas"
**Severity:** MED
**Effort:** M
**VII says:** Conversion cost scales with cities owned (higher → more expensive) and town development (higher pop/dev → cheaper). Observed range: 200–1000 gold.
**Engine does:** Fixed cost of `100 gold`. No scaling.
**Gap:** Static 100g is far below the confirmed lower bound of ~200g. No scaling removes the strategic trade-off.
**Recommendation:** Implement dynamic formula: `200 + cityCount * 100 - townPopulation * 20`, clamped to [200, 1000].

---

### F-04: Settlement Cap values per age — CLOSE

**Location:** `HappinessUtils.ts:16-30`
**GDD reference:** `systems/settlements.md` § "Settlement Cap and Happiness Pressure" and "Formulas"
**Severity:** MED
**Effort:** S
**VII says:** Base cap 4 (Antiquity, confirmed). Exploration ~8, Modern ~12 (inferred: +4 per age advance).
**Engine does:** Antiquity: 4 (matches). Exploration: +1 → 5. Modern: +2 → 6.
**Gap:** Engine increments (+1, +2) are far below the GDD-inferred progression (+4 per age). Resulting caps (5, 6) vs estimates (8, 12) mean settlement pressure is significantly harsher than VII.
**Recommendation:** Increase to Exploration +4 (→ 8), Modern +8 (→ 12) if targeting VII fidelity, or document the tighter caps as a deliberate design divergence.

---

### F-05: Town specialization mechanics — MATCH

**Location:** `growthSystem.ts:10-36`, `types/GameState.ts:58-67`, `YieldCalculator.ts:79-92`
**GDD reference:** `systems/settlements.md` § "Town Specialization (Focus System)"
**Severity:** LOW
**Effort:** S
**VII says:** At pop 7, one-time Focus choice from 9 specializations. Permanent per age. All 9 types with defined bonuses.
**Engine does:** All 9 specializations typed (`TownSpecialization` union). Pop-7 threshold enforced. Once-per-age lock enforced. `getSpecializationYields` maps all 9 types correctly. Growing Town threshold reduction (-33%) matches VII's +50% growth rate description. Fort Town grants immediate defense HP.
**Gap:** Core mechanic fully implemented and structurally sound. Blocked only by F-02 (pop cap 5 prevents reaching threshold) and F-10 (no Growing↔focused toggle). Specialization reset on age transition absent (F-07).
**Recommendation:** Fix F-02 to make this mechanic reachable.

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

### F-07: Age transition — cities do NOT revert to towns — MISSING

**Location:** `ageSystem.ts:21-111`
**GDD reference:** `systems/settlements.md` § "Age Transition Effects on Settlements"
**Severity:** HIGH
**Effort:** M
**VII says:** On age transition: all non-capital cities downgrade to town tier. Capital always retains city tier. Economic Golden Age legacy exempts all current cities. Town specializations reset to null.
**Engine does:** `handleTransition` updates civ, age, legacy bonuses, gold, techs. No code downgrades city tier, no code clears `specialization` fields, no Economic Golden Age exemption check.
**Gap:** Entire settlement-tier reset at age transition is absent. This is Civ VII's most distinctive settlement mechanic. After transition, all cities remain as full cities — a fundamental violation of the two-tier design.
**Recommendation:** Add `downgradeCitiesAtTransition(state, playerId)` called inside `handleTransition` that (1) sets non-capital cities to `settlementType: 'town'`, clears `productionQueue`/`productionProgress`, (2) clears all `specialization` fields, (3) exempts cities if `legacyPaths.economic === 3`.

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

### F-09: Settlement Cap UI indicator — MISSING

**Location:** `CityPanel.tsx`, `TurnSummaryPanel.tsx`
**GDD reference:** `systems/settlements.md` § "UI requirements"
**Severity:** MED
**Effort:** S
**VII says:** Settlement Cap indicator shows `current / cap` count in top HUD or empire summary.
**Engine does:** `calculateSettlementCapPenalty` and `calculateEffectiveSettlementCap` are computed. `CityPanel` shows the happiness penalty value but not the cap count. `TurnSummaryPanel` shows city count (line 69) but not the cap. No `X / Y` settlement cap display exists in either panel.
**Gap:** Settlement cap headroom is invisible to the player. The penalty (happiness number) is visible; the cause (cap pressure) is opaque.
**Recommendation:** Add `SettlementCapBadge` (or inline row) to `TurnSummaryPanel`'s stats grid showing `Settlements: X / Y`. Reuse `calculateEffectiveSettlementCap` + city count. This is an `/add-hud-element` candidate.

---

### F-10: Growing Town ↔ Focus toggle — MISSING

**Location:** `growthSystem.ts:19-36`
**GDD reference:** `systems/settlements.md` § "Town Specialization (Focus System)"
**Severity:** LOW
**Effort:** S
**VII says:** Players can toggle between Growing Town and their chosen non-Growing specialization. Cannot switch between two non-Growing specializations.
**Engine does:** `if (city.specialization !== null) return state` — once set, any specialization is fully and permanently locked. No re-set path.
**Gap:** Engine is stricter than VII — it does not allow the Growing ↔ non-Growing toggle. Players who choose Growing Town cannot ever specialize, and players who specialize cannot ever revert.
**Recommendation:** Modify `handleSetSpecialization` to: (a) allow setting any focus if `specialization === null`, (b) allow switching TO `growing_town` from any current non-null focus, (c) allow switching FROM `growing_town` back to the last non-Growing focus. May require adding `priorSpecialization: TownSpecialization | null` to `CityState`.

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
| M-01 | Age transition city downgrade | `ageSystem.handleTransition` has no tier reset | M |
| M-02 | Raze settlement 12-turn countdown | No `RAZE_SETTLEMENT` action or countdown state | L |
| M-03 | Food forwarding from specialized towns | No yield routing from towns to connected cities | L |
| M-04 | Settlement Cap UI indicator | No `current / cap` display in HUD or panels | S |

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/settlements.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/citySystem.ts`
- `packages/engine/src/systems/productionSystem.ts`
- `packages/engine/src/systems/growthSystem.ts`
- `packages/engine/src/state/HappinessUtils.ts`
- `packages/web/src/ui/panels/CityPanel.tsx`

**Status:** 3 MATCH / 3 CLOSE / 0 DIVERGED / 4 MISSING / 1 EXTRA (see `.codex/gdd/audits/settlements.md`)

**Highest-severity finding:** F-07 — age transition city downgrade absent (HIGH) — VII's most distinctive settlement mechanic is entirely unimplemented.

---

## Open questions

1. Is the 5-pop town cap intentional for hex-empires? If so, `SPECIALIZATION_POP_MINIMUM = 7` is dead code — lower it or remove.
2. Does the age-transition downgrade fire immediately in `TRANSITION_AGE`, or at the start of the next age's first turn?
3. For Economic Golden Age exemption: is `legacyPaths.economic === 3` the right signal, or does the engine need an explicit boolean flag on `PlayerState`?
4. Food forwarding connection model: is hex-proximity an acceptable approximation, or does a formal road/trade-route graph need to be checked?
5. Raze + religion interaction: does `state.religions` currently track each religion's founding city? Needs cross-check before implementing the raze guard.

---

## Effort estimate

| Priority | Finding | Effort |
|---|---|---|
| P0 | F-07: Age transition city downgrade | M (~1 day) |
| P0 | F-02: Town pop cap 5 → 7 | S (1 line) |
| P1 | F-03: Upgrade cost scaling | S (~30 min) |
| P1 | F-08: Raze settlement | L (~2 days) |
| P2 | F-11: Food forwarding | L (~1 day) |
| P2 | F-04: Cap values per age | S (30 min + design decision) |
| P3 | F-10: Growing Town toggle | S (~1 hour) |
| P3 | F-09: Cap UI indicator | S (~1 hour) |
| P3 | F-01: FOUND_TOWN action split | M (~2 hours) |

---

<!-- END OF AUDIT -->
