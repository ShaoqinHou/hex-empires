# Civic Tree — hex-empires Audit

**System slug:** `civic-tree`
**GDD doc:** [systems/civic-tree.md](../systems/civic-tree.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/systems/civicSystem.ts` (1-230)
- `packages/engine/src/systems/ageSystem.ts` (TRANSITION_AGE handler)
- `packages/engine/src/systems/governmentSystem.ts` (not yet wired)
- `packages/engine/src/types/Civic.ts`
- `packages/engine/src/types/GameState.ts` (PlayerState)
- `packages/engine/src/data/civics/` (barrel + age samples)
- `packages/web/src/ui/panels/CivicTreePanel.tsx`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 6 |
| CLOSE | 7 |
| DIVERGED | 0 |
| MISSING | 0 |
| EXTRA | 0 |

**Total findings:** 13

---

## Detailed findings

### F-01: Culture-per-turn calculation duplicated, bypasses effects pipeline — CLOSE

**Location:** `civicSystem.ts:98-116`, `civicSystem.ts:163-178`
**GDD reference:** `systems/civic-tree.md` § "Culture Accumulation"
**Severity:** MED
**Effort:** M
**VII says:** Culture is generated from tiles, buildings, wonders, social policies, leaders, specialists, events, and mementos.
**Engine does:** `processNormalCivicResearch` and `processCivicMasteryResearch` each compute culture-per-turn inline as `1 base per city + buildingDef.yields.culture` — duplicated, does not consult `player.legacyBonuses` (MODIFY_YIELD culture effects) or any yield-calc utility.
**Gap:** Culture from policies, wonders, tile yields, specialist yields, and leader bonuses excluded from civic progress.
**Recommendation:** Extract shared `computeCulturePerTurn(state, playerId)` that reads `player.legacyBonuses` and uses the shared yield utility. Wire both civic functions.

---

### F-02: Overflow progress carries on civic completion — MATCH

**Location:** `civicSystem.ts:122-145`
**GDD reference:** `systems/civic-tree.md` § "Culture Accumulation"
**Severity:** MED
**Effort:** S
**VII says:** Overflow beyond completed civic cost rolls into the next civic.
**Engine does:** On completion, `civicProgress` is set to `newProgress - civicCost`.
**Gap:** None for overflow carry.
**Recommendation:** Keep overflow behavior covered by civic-system tests.

---

### F-03: TRANSITION_AGE resets active civic state — MATCH

**Location:** `ageSystem.ts` `handleTransition`; `GameEngine.ts` transition pipeline guard
**GDD reference:** `systems/civic-tree.md` § "Age Transition Reset"
**Severity:** HIGH
**Effort:** M
**VII says:** On transition: in-progress research lost, `researchedCivics` resets empty, all standard slotted policies expire, policy slots reset to new age baseline, government requires re-selection. Traditions persist.
**Engine does:** Accepted `TRANSITION_AGE` clears `researchedCivics`, current civic progress, civic mastery progress, civic-granted slot counts, government, slotted policies, and swap windows. `completedCivics`, traditions, and celebration-earned social slots persist separately. The engine runs `ageSystem` first and blocks subsystem transition side effects when validation rejects the transition.
**Gap:** None for active civic tree reset.
**Recommendation:** Keep transition reset ownership in `ageSystem`; do not reset `completedCivics` or `traditions`.

---

### F-04: Policy slot placement is wildcard but slot-count sources remain typed — CLOSE

**Location:** `governmentSystem.ts:148-158`, `GameState.ts:445-446`
**GDD reference:** `systems/civic-tree.md` § "Social Policies and Policy Slots" (cross-cut `government-policies.md` F-01)
**Severity:** MED
**Effort:** M
**VII says:** All policy slots are wildcard — no type-restricted categories.
**Engine does:** `canSlotPolicy` validates only total slot bounds; any policy can occupy any slot. `GovernmentDef.policySlots` and civic slot grants still preserve typed source buckets for counting.
**Gap:** Runtime behavior is wildcard, but the data model still carries Civ VI-style category names that can confuse future work.
**Recommendation:** Collapse slot-count storage to a single total after dependent UI/tests are simplified.

---

### F-05: Civ-unique civic tab present in CivicTreePanel — MATCH

**Location:** `CivicTreePanel.tsx:14-15`
**GDD reference:** `systems/civic-tree.md` § "Civ-Unique Civic Trees" + "UI requirements"
**Severity:** MED
**Effort:** M
**VII says:** Civic Tree panel has tab control: shared age tree + civ-unique tree (3-4 nodes per civ).
**Engine does:** `CivicTreePanel` splits shared and civ-unique civics and renders a tab control when the current civ has unique civics.
**Gap:** None for the tab split. Node art/unique unlock iconography remains general UI polish.
**Recommendation:** Keep tests around shared/unique filtering when panel coverage is broadened.

---

### F-06: Traditions exist but are auto-active rather than slotted cards — CLOSE

**Location:** `GameState.ts`, `Civic.ts`, `Tradition.ts`, `civicSystem.ts`, `EffectUtils.ts`
**GDD reference:** `systems/civic-tree.md` § "Traditions" (cross-cut `ages.md` F-07)
**Severity:** HIGH
**Effort:** L
**VII says:** Traditions are social policies earned via civ-unique civic trees (quill icon). Persist permanently across ages. Must be slotted; never expire; freely re-slottable. Core cross-age cultural identity mechanism.
**Engine does:** `PlayerState.traditions`, `TraditionDef`, `CivicDef.unlocksTradition`, tradition data, unlock-on-civic-completion, and effect application through `EffectUtils` exist. Age transition preserves the pool.
**Gap:** Traditions are applied as owned persistent effects, not as explicitly slotted policy cards in the policy UI.
**Recommendation:** Add tradition cards to the policy-slot UI and require slotting for active effects.

---

### F-07: Government lock per age implemented — MATCH

**Location:** `governmentSystem.ts:194-216`, `ageSystem.ts:75-84`
**GDD reference:** `systems/civic-tree.md` § "Government Selection"
**Severity:** MED
**Effort:** M
**VII says:** Player selects one government per age; locked for remainder of age.
**Engine does:** `canAdoptGovernment` blocks changes when `governmentLockedForAge` is true, `SET_GOVERNMENT` sets the lock, and age transition clears it for the next age. Crisis-forced government choice is the documented exception path.
**Gap:** None for the per-age lock.
**Recommendation:** Preserve the crisis exception tests.

---

### F-08: Ideology branch-lock implemented; second-adopter bonus still pending — CLOSE

**Location:** `civicSystem.ts`, `data/civics/modern/index.ts`
**GDD reference:** `systems/civic-tree.md` § "Ideology Trees (Modern Age Only)"
**Severity:** MED
**Effort:** L
**VII says:** Researching Political Theory presents 3 exclusive ideology choices (Democracy/Fascism/Communism). Choosing permanent; unlocks 3-civic branch; locks out others. Second adopter gains +1 policy slot.
**Engine does:** `SELECT_IDEOLOGY` sets a permanent player ideology, and `civicSystem` blocks civics whose `ideologyBranch` does not match the selected ideology.
**Gap:** The documented second-civilization-to-adopt bonus policy slot is not represented.
**Recommendation:** Add global ideology adoption tracking and grant the second-adopter slot.

---

### F-09: Mastery rewards are data-driven but content still approximate — CLOSE

**Location:** `civicSystem.ts:188-205`
**GDD reference:** `systems/civic-tree.md` § "Mastery Mechanic"
**Severity:** MED
**Effort:** M
**VII says:** Mastery unlocks are specific and varied per civic (Senatus Populusque Romanus → Colosseum + 1 policy slot; Khmer Chakravarti → +3 Codex slots).
**Engine does:** `processCivicMasteryResearch` applies per-civic `masteryUnlocks` when present and only falls back to generic culture when data is absent.
**Gap:** Mastery payloads are still a partial source-verified scaffold rather than complete one-to-one Civ VII content.
**Recommendation:** Verify and fill each civic mastery reward from current game/source data.

---

### F-10: Per-age policy slot baseline exists but values need verification — CLOSE

**Location:** `ageSystem.ts:75-84`, `governmentSystem.ts`
**GDD reference:** `systems/civic-tree.md` § "Social Policies and Policy Slots" (baseline table)
**Severity:** MED
**Effort:** S
**VII says:** Policy slot baselines by age: Antiquity 1, Exploration 2, Modern 3.
**Engine does:** `AGE_POLICY_SLOT_BASELINE` and `effectivePolicySlotCount` enforce an age floor before social/civic/legacy slot additions.
**Gap:** Current values are `2/4/6`, while this GDD audit records `1/2/3`; this needs in-game/source verification before claiming parity.
**Recommendation:** Resolve the baseline source conflict, then adjust constants/tests.

---

### F-11: governmentSystem wired into GameEngine — MATCH

**Location:** `governmentSystem.ts:1-11` (comment)
**GDD reference:** `systems/civic-tree.md` § "Government Selection" + "Triggers"
**Severity:** MED
**Effort:** M
**VII says:** Government selection is a core player action.
**Engine does:** `GameEngine.DEFAULT_SYSTEMS` includes `adaptGovernment`, and government/ideology actions are part of the main action flow.
**Gap:** None for engine wiring.
**Recommendation:** Keep system-wiring tests covering government actions.

---

### F-12: `CivicDef.unlocks` is untyped string array — CLOSE

**Location:** `Civic.ts:7`, `data/civics/antiquity/index.ts`
**GDD reference:** `systems/civic-tree.md` § "Civ-Unique Civic Trees"
**Severity:** LOW
**Effort:** M
**VII says:** Civic unlocks: buildings, units, passives, tradition cards, governments, religion mechanics.
**Engine does:** `unlocks: ReadonlyArray<string>` — flat untyped array. Cannot distinguish building vs tradition vs passive.
**Gap:** Typed payload expression missing.
**Recommendation:** Replace with `ReadonlyArray<CivicUnlockPayload>` discriminated union. Prerequisite for F-06 and F-09.

---

### F-13: Standard civic completion does not grant age progress — MATCH

**Location:** `civicSystem.ts:131`
**GDD reference:** `systems/civic-tree.md` (mechanic not in GDD)
**Severity:** LOW
**Effort:** S
**VII says:** Standard civic research does not grant age progress. Only Future Civic nodes grant +10.
**Engine does:** Standard civic completion no longer awards `ageProgress + 5`; civic age progress should be modeled only through Future Civic-style payloads once implemented.
**Gap:** Future Civic-specific age-progress payloads are not yet modeled.
**Recommendation:** Add explicit Future Civic entries/effects instead of implicit progress on all civics.

---

## Extras to retire

- None currently tracked as live extras. Typed slot-count buckets remain a simplification debt (F-04) but no longer restrict policy placement.

---

## Missing items

1. Tradition slotting UI/effects (F-06) — traditions exist but should be active only when slotted.
2. Second-adopter ideology bonus slot (F-08).
3. Source-verified policy slot baseline values (F-10).
4. Complete source-verified mastery unlock payloads (F-09).
5. Shared culture/yield calculation for civic progress (F-01).

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/civic-tree.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/civicSystem.ts`
- `packages/engine/src/systems/ageSystem.ts` (accepted transition clears active civic tree state — F-03)
- `packages/engine/src/systems/governmentSystem.ts`
- `packages/engine/src/types/Civic.ts`
- `packages/engine/src/data/civics/`
- `packages/web/src/ui/panels/CivicTreePanel.tsx`

**Status:** 6 MATCH / 7 CLOSE / 0 DIVERGED / 0 MISSING / 0 EXTRA

**Highest-severity finding:** F-06 — traditions are present but not yet slotted policy cards; F-10 — policy slot baseline values need verification.

---

## Open questions

1. `governmentSystem` wiring timing (Cycle D)?
2. `PlayerState.policySlots` named field needed, or derived from government config?
3. Difficulty modifier for culture costs in scope?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-08, F-10, F-13 | 1.5d |
| M | F-01, F-04, F-06, F-09, F-12 | ~8d |
| L | F-06 slotting UI/policy integration | ~1w |
| **Total** | 13 | **~2.5w** |

Recommended order: F-10 value verification → F-06 tradition slotting → F-08 second-adopter slot → F-09 mastery payload verification → F-01 shared culture yield path → F-04 slot-count data simplification.

---

<!-- END OF AUDIT -->
