# Celebrations -- hex-empires Audit

**System slug:** `celebrations`
**GDD doc:** [systems/celebrations.md](../systems/celebrations.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/systems/resourceSystem.ts` lines 18-196 (celebration mechanic)
- `packages/engine/src/state/HappinessUtils.ts` lines 1-121 (local happiness calc)
- `packages/engine/src/types/GameState.ts` lines 173-177 (PlayerState fields)
- `packages/engine/src/state/GameInitializer.ts` lines 64-66 (initial values)
- Grep: "celebration" across `packages/engine/src/` -- 28 hits in 7 files

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 1 |
| CLOSE | 3 |
| DIVERGED | 4 |
| MISSING | 5 |
| EXTRA | 0 |

**Total findings:** 13

---

## Detailed findings

### F-01: Celebration trigger uses per-turn excess happiness sum, not global accumulator -- DIVERGED

**Location:** `packages/engine/src/systems/resourceSystem.ts:61-77,158-174`
**GDD reference:** `systems/celebrations.md` -- Entities, Formulas, Mechanics "Local vs. Global Happiness"
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** The engine maintains a persistent `PlayerState.globalHappiness` accumulator that grows turn over turn. Crossing a threshold (e.g., Antiquity Celebration 1 = 200) triggers a Celebration. The accumulator does NOT reset on Celebration trigger; it keeps climbing toward the next threshold.
**Engine does:** Every END_TURN, resourceSystem sums positive `cityHappiness` values into a local variable `totalExcessHappiness` (ephemeral, not persisted). If this single-turn snapshot meets `CELEBRATION_BASE_THRESHOLD * (count+1)` (50, 100, 150...), a Celebration fires. There is no persistent accumulator; `globalHappiness` does not exist on PlayerState.
**Gap:** The VII model rewards sustained multi-turn happiness investment. The engine model rewards a single turn of excess happiness. A player who briefly dips below 50 never accumulates toward a Celebration; VII players who sustain 130/turn eventually cross the 1,296 Antiquity-7 threshold.
**Recommendation:** Add `globalHappiness: number` to `PlayerState`. Each END_TURN: add `max(0, totalExcessHappiness)` to the accumulator. Check against the THRESHOLDS table (not a linear formula) per F-02. Do not reset the accumulator on Celebration trigger -- just advance the threshold index.

---

### F-02: Threshold formula is custom linear, not VII age-specific table -- DIVERGED

**Location:** `packages/engine/src/systems/resourceSystem.ts:18-32`
**GDD reference:** `systems/celebrations.md` -- Mechanics "Celebration Thresholds", threshold table
**Severity:** HIGH
**Effort:** S (half-day)
**VII says:** 7 thresholds per age, escalating non-linearly. Antiquity: 200, 349, 569, 773, 962, 1137, 1296. Exploration: 799, 1396, 2275, 3093, 3850, 4546, 5182. Modern: 1331, 2327, 3791, 5155, 6416, 7576, 8636. Once celebrationCount >= 6 (7th celebration), threshold is frozen at index 6.
**Engine does:** `nextCelebrationThreshold(count) = 50 * min(count+1, 8)`. Sequence: 50, 100, 150, 200, 250, 300, 350, 400. No age awareness. No non-linear escalation. The cap is at the 8th multiplier (count=7), not the 7th.
**Gap:** Engine thresholds are 4x-26x lower than VII values. They are age-blind (same values in Antiquity and Modern). The escalation curve is linear not exponential. At 50 excess happiness per turn, an engine player hits Celebration #1 immediately (single turn); a VII player needs a multi-turn build.
**Recommendation:** Replace `CELEBRATION_BASE_THRESHOLD` / linear formula with a `CELEBRATION_THRESHOLDS: Record<Age, ReadonlyArray<number>>` lookup table matching GDD values. Index by `min(celebrationCount, 6)`. Reference `state.currentAge` (or `player.age`) to choose the table.

---

### F-03: Celebration grants fixed production bonus only, not government-gated choice menu -- DIVERGED

**Location:** `packages/engine/src/systems/resourceSystem.ts:20-22,171-173`
**GDD reference:** `systems/celebrations.md` -- Mechanics "Government-Gated Bonus Menu", UI requirements
**Severity:** HIGH
**Effort:** L (week+)
**VII says:** Celebration trigger pauses and presents the player a menu of 2 government-specific bonus options (e.g., Classical Republic: +20% Culture OR +15% Wonder production). Player must choose before turn ends. This is a player-agency moment, not an automatic effect.
**Engine does:** Celebration automatically grants `celebrationBonus = 10` (10% flat production bonus), no player input. There is no bonus menu, no government gating, no choice. The bonus is always the same regardless of government type.
**Gap:** The entire government-gated choice mechanic is absent. The engine collapses VII nuanced per-government options into a single hard-coded constant. The `CELEBRATION_TRIGGERED` action type does not exist; there is no pause-for-choice flow.
**Recommendation:** Prerequisites: government system wired (M12 partial integration exists via `player.governmentId`). Need: (1) CELEBRATION_TRIGGERED action in GameAction union; (2) a pending-player-choice state field; (3) government-keyed bonus option data in content files; (4) a Celebration modal panel (priority: modal). Mark as a Phase-2 depth concern after the accumulator (F-01) and threshold table (F-02) fixes land.

---

### F-04: Social Policy Slot unlock is absent -- MISSING

**Location:** `packages/engine/src/types/GameState.ts` (PlayerState), `packages/engine/src/systems/resourceSystem.ts`
**GDD reference:** `systems/celebrations.md` -- Mechanics "Social Policy Slot Unlock", Entities `PlayerState.socialPolicySlots`
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Every Celebration trigger permanently unlocks one additional Social Policy slot. `PlayerState.socialPolicySlots` increments by 1. Slots carry forward across age transitions (never reset). A player who triggers all 7 Celebrations across 3 ages unlocks up to 21 additional slots.
**Engine does:** `PlayerState` has no `socialPolicySlots` field. The `celebrationCount` increment in resourceSystem (line 171) does not touch any policy-slot state. The government system (M12 partial) uses `player.slottedPolicies` but has no mechanism to add slots dynamically from Celebrations.
**Gap:** The permanent structural reward of Celebrations -- slot accumulation -- is entirely absent. Players who chase Celebrations gain nothing but a temporary production boost; the compounding governance advantage of VII does not exist.
**Recommendation:** Add `readonly socialPolicySlots: number` to `PlayerState` (default 0). In resourceSystem on Celebration trigger: `socialPolicySlots += 1`. In ageSystem `TRANSITION_AGE` handler: carry `socialPolicySlots` forward (do NOT reset). In governmentSystem: incorporate `socialPolicySlots` into the available slot count.

---

### F-05: Civil unrest timer and settlement-flip mechanic are absent -- MISSING

**Location:** `packages/engine/src/types/GameState.ts` (CityState), `packages/engine/src/state/HappinessUtils.ts`
**GDD reference:** `systems/celebrations.md` -- Entities `CityState.civilUnrestTimer`, Mechanics "Unhappiness and Civil Unrest"
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** When a city's local happiness < 0: (1) yields penalized at 2% per negative point (capped at -50 = 100% penalty); (2) `civilUnrestTimer` begins counting down. If timer reaches 0 with happiness still negative, settlement may flip to an Independent Power. Timer resets when happiness returns to >= 0.
**Engine does:** `applyHappinessPenalty` correctly implements the 2% per point yield reduction (MATCH for yield penalty). However, `CityState` has no `civilUnrestTimer` field. No countdown or settlement-flip mechanic exists anywhere in the engine.
**Gap:** The failure-state half of the unhappiness system is missing. Players can leave cities permanently unhappy with no consequence beyond yield penalties; the "city rebellion and defection" threat that makes unhappiness urgent in VII does not exist.
**Recommendation:** Add `readonly civilUnrestTimer: number` (default 0) to `CityState`. In resourceSystem END_TURN: if `cityHappiness < 0`, decrement timer (start at ~9 turns per community reports); if timer reaches 0, dispatch or queue a `CIVIL_UNREST_EXPIRY` event.

---

### F-06: Happiness accumulator and active-bonus state not reset on age transition -- DIVERGED

**Location:** `packages/engine/src/systems/ageSystem.ts`
**GDD reference:** `systems/celebrations.md` -- Triggers "On age transition"
**Severity:** MED
**Effort:** S (half-day)
**VII says:** On age transition: `globalHappiness` resets to 0; `celebrationCount` resets to 0; `activeCelebration` cleared. Threshold table switches to the new age. `socialPolicySlots` carries forward.
**Engine does:** ageSystem's `TRANSITION_AGE` handler does not touch `celebrationCount`, `celebrationBonus`, or `celebrationTurnsLeft`. A player entering Exploration carries their Antiquity celebration count forward.
**Gap:** Without a per-age reset, celebration counts and bonuses bleed across ages. When F-01 and F-02 are fixed (adding globalHappiness + proper threshold table), the age reset becomes critical for correctness.
**Recommendation:** In ageSystem's `TRANSITION_AGE` handler, add: `celebrationCount: 0`, `celebrationBonus: 0`, `celebrationTurnsLeft: 0`, `globalHappiness: 0` (once F-01 adds this field). Carry `socialPolicySlots` forward (as required by F-04).

---

### F-07: Global happiness accumulator absent from PlayerState -- MISSING

**Location:** `packages/engine/src/types/GameState.ts` lines 173-176
**GDD reference:** `systems/celebrations.md` -- Entities `PlayerState.globalHappiness`
**Severity:** HIGH
**Effort:** S (half-day)
**VII says:** `PlayerState.globalHappiness` is a persisted accumulator, the central running tally of the Celebrations system. It grows each turn and is the value checked against celebration thresholds.
**Engine does:** No `globalHappiness` field exists on PlayerState. The equivalent computation is a local variable `totalExcessHappiness` computed and discarded each turn in resourceSystem. Saves, replays, and UI cannot access a current celebration progress value.
**Gap:** This is the root structural gap for the entire Celebrations system -- without a persisted accumulator, no other VII-parity feature can be correctly implemented. Every other fix in this audit depends on this field existing.
**Recommendation:** Add `readonly globalHappiness: number` to `PlayerState` (initialized to 0). Update `GameInitializer` initial player state. Update all test helpers (`createTestPlayer`). Persist and restore in save/load. This is prerequisite to F-01, F-02, and F-06.

---

### F-08: Active celebration stored as bonus%+timer, not { bonusId, turnsRemaining } struct -- CLOSE

**Location:** `packages/engine/src/types/GameState.ts` lines 175-176
**GDD reference:** `systems/celebrations.md` -- Entities `PlayerState.activeCelebration`
**Severity:** MED
**Effort:** S (half-day)
**VII says:** `PlayerState.activeCelebration` is `null | { bonusId: string, turnsRemaining: number }` -- a typed struct that names which bonus is active. This supports government-specific bonuses with different `bonusId` values.
**Engine does:** Two flat scalar fields: `celebrationBonus: number` (always 10) and `celebrationTurnsLeft: number`. The flat shape cannot represent named bonuses.
**Gap:** The struct shape is required once the government-gated bonus menu (F-03) is implemented. With only one possible bonus value today, the flat shape works functionally but is the wrong abstraction.
**Recommendation:** Defer the structural change until F-03 (bonus menu) is addressed. When F-03 lands, migrate to `activeCelebration: { bonusId: string; turnsRemaining: number } | null`.

---

### F-09: Yield penalty correctly implemented -- MATCH

**Location:** `packages/engine/src/state/HappinessUtils.ts:112-120`
**GDD reference:** `systems/celebrations.md` -- Formulas "Yield penalty for unhappy city"
**Severity:** LOW
**Effort:** S
**VII says:** `yieldPenalty(city) = min(1.0, max(0, -city.happinessLocal) * 0.02)`. Caps at 100% penalty when happinessLocal <= -50.
**Engine does:** `applyHappinessPenalty(value, happiness)`: if happiness < 0, `penaltyPct = min(100, abs(happiness) * 2)`, returns `floor(value * (100 - penaltyPct) / 100)`. Identical formula.
**Gap:** None.
**Recommendation:** No action needed.

---

### F-10: Fresh-water happiness bonus is an engine addition not in VII GDD -- CLOSE

**Location:** `packages/engine/src/state/HappinessUtils.ts:70-74`
**GDD reference:** `systems/celebrations.md` -- Entities `CityState.happinessLocal` (supply side)
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** Happiness sources are: building upkeep, specialist costs, population penalties, luxury resources. Fresh water / rivers are not listed as happiness sources.
**Engine does:** `calculateCityHappiness` includes `freshWaterBonus = 3` if the city center tile has rivers. Not in VII design documentation.
**Gap:** Minor divergence: an extra happiness source not in VII. Not harmful to gameplay.
**Recommendation:** Either source this from VII documentation or flag as intentional hex-empires custom feature. LOW priority.

---

### F-11: Celebration duration ignores game speed -- CLOSE

**Location:** `packages/engine/src/systems/resourceSystem.ts:23`
**GDD reference:** `systems/celebrations.md` -- Formulas "Celebration duration by game speed"
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** `CELEBRATION_DURATION = { online: 5, quick: 10, standard: 10, epic: 15, marathon: 30 }`. Duration scales with game speed.
**Engine does:** `CELEBRATION_DURATION_TURNS = 10` (constant). `GameState.gameSpeed` field exists but resourceSystem ignores it for celebration duration.
**Gap:** Single game speed only. Marathon/Epic players get the same 10-turn celebration as Online players.
**Recommendation:** Replace constant with `CELEBRATION_DURATION[state.gameSpeed] ?? 10`. Ensure `GameState.gameSpeed` type covers all speed variants.

---

### F-12: Leader synergies (Jose Rizal, Ashoka) not implemented -- MISSING

**Location:** `packages/engine/src/systems/resourceSystem.ts` (no leader-ability hooks)
**GDD reference:** `systems/celebrations.md` -- Mechanics "Leader Synergies"
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Jose Rizal: +50% happiness generation toward next threshold; Celebration duration +50% (10 -> 15 turns at Standard). Ashoka: +10% Food in all settlements during active Celebration.
**Engine does:** No leader-ability hooks exist in the celebration code path. `celebrationTurnsLeft` is always set to 10 regardless of active leader.
**Gap:** Two documented leader synergies are absent. Leader selection has no mechanical impact on Celebrations.
**Recommendation:** Defer until F-01 (accumulator) and F-02 (threshold table) are complete. Add `MODIFY_CELEBRATION_DURATION` and `MODIFY_HAPPINESS_GENERATION` effect types. Wire Jose Rizal and Ashoka leader data to these effects.

---

### F-13: Celebrations UI -- HUD, modal, and active badge all absent -- MISSING

**Location:** `packages/web/src/ui/panels/`, `packages/web/src/ui/hud/`
**GDD reference:** `systems/celebrations.md` -- UI requirements
**Severity:** MED
**Effort:** L (week+)
**VII says:** Required UI: (1) always-visible HUD element showing globalHappiness vs. next threshold (e.g., "847 / 962"); (2) Celebration trigger modal for bonus choice; (3) active Celebration badge with turns remaining; (4) per-city happiness breakdown in CityPanel; (5) Social Policy slot counter in Government panel.
**Engine does:** No HUD element for celebrations. No Celebration modal. The active `celebrationBonus` and `celebrationTurnsLeft` are in state but no UI surfaces them. `hudRegistry` and `panelRegistry` have no celebration-related entries.
**Gap:** The Celebrations system is mechanically invisible to the player. Even the partially-working engine logic (production bonus, turn countdown) produces no observable UI feedback.
**Recommendation:** Phase 1: add `HappinessHUD` element showing happiness/threshold progress bar (low complexity, no bonus-choice required) via `/add-hud-element` skill. Phase 2: add Celebration trigger modal after F-03 lands, via `/add-panel` skill. Phase 3: active bonus badge.

---

## Extras to retire

None. The partial celebrations implementation (resourceSystem, PlayerState fields, tests) is a stub worth extending rather than retiring.

---

## Missing items

1. `PlayerState.globalHappiness` persisted accumulator (F-07) -- root prerequisite for all other fixes
2. Age-specific threshold table replacing linear formula (F-02) -- required for VII-parity celebration timing
3. `CityState.civilUnrestTimer` and settlement-flip mechanic (F-05) -- absent failure state
4. `PlayerState.socialPolicySlots` and Celebration-unlock coupling (F-04) -- absent structural reward
5. Government-gated bonus choice menu (F-03) -- absent player-agency moment at Celebration trigger
6. Game-speed-aware Celebration duration (F-11) -- simple gap, low effort
7. Leader synergy hooks for Rizal and Ashoka (F-12) -- post-accumulator work
8. Celebrations UI -- HUD element, modal, active badge (F-13)
9. Age-transition reset of celebration fields in ageSystem (F-06) -- needed once F-07 lands

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/celebrations.md` section "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/resourceSystem.ts` -- celebration logic (partial stub)
- `packages/engine/src/state/HappinessUtils.ts` -- local happiness calc + yield penalty (MATCH for penalty formula)
- `packages/engine/src/types/GameState.ts` -- PlayerState celebration fields (stub: no globalHappiness, no socialPolicySlots, no civilUnrestTimer)

**Status:** 1 MATCH / 3 CLOSE / 4 DIVERGED / 5 MISSING / 0 EXTRA (see `.claude/gdd/audits/celebrations.md`)

**Highest-severity finding:** F-07 -- `globalHappiness` accumulator absent from PlayerState (root structural gap; all other fixes depend on it)

---

## Open questions

1. Does `GameState.gameSpeed` currently distinguish Online/Quick/Epic/Marathon? Required for F-11.
2. Is the government system (M12 integration) stable enough to gate F-03 on? `player.governmentId` exists as optional; end-to-end behavior unconfirmed.
3. What is the intended civil unrest defection target? GDD says "Independent Power or free city" [INFERRED]; clarify before implementing F-05.
4. Does `ageSystem.ts` currently touch any PlayerState happiness fields on TRANSITION_AGE? Grep confirms fields are untouched; whether ageSystem has a reset list that should be extended needs a full handler read.
5. Is there a UI design spec for the Celebration bonus choice modal? No panel design doc found in `.claude/workflow/design/`. A designer pass may be needed before F-03 UI work starts.

---

## Effort estimate

| Bucket | Findings | Estimated total effort |
|---|---|---|
| S (half-day) | F-02, F-06, F-07, F-10, F-11 | 2.5d |
| M (1-3 days) | F-01, F-04, F-05, F-08 (deferred), F-12 | ~8d |
| L (week+) | F-03, F-13 | ~3w |
| **Total** | 13 | **~5w** |

Recommended order: F-07 (add globalHappiness field -- prerequisite), F-02 (threshold table), F-01 (accumulator logic), F-06 (age reset), F-04 (socialPolicySlots), F-05 (civilUnrestTimer), F-11 (game speed), F-13 Phase 1 HUD, F-12 leader hooks, F-03 + F-13 Phase 2-3.

---

<!-- END OF AUDIT -->
