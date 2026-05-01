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
| MATCH | 3 |
| CLOSE | 2 |
| DIVERGED | 3 |
| MISSING | 4 |
| EXTRA | 1 |

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

### F-02: Overflow progress discarded on civic completion — DIVERGED

**Location:** `civicSystem.ts:122-145`
**GDD reference:** `systems/civic-tree.md` § "Culture Accumulation"
**Severity:** MED
**Effort:** S
**VII says:** Overflow beyond completed civic cost rolls into the next civic.
**Engine does:** On completion, `civicProgress: 0` unconditionally. Any excess culture is discarded.
**Gap:** Every culture overshoot wasted.
**Recommendation:** Replace `civicProgress: 0` with `civicProgress: newProgress - civicCost`.

---

### F-03: TRANSITION_AGE does not reset civic state — DIVERGED

**Location:** `ageSystem.ts:75-84`
**GDD reference:** `systems/civic-tree.md` § "Age Transition Reset"
**Severity:** HIGH
**Effort:** M
**VII says:** On transition: in-progress research lost, `researchedCivics` resets empty, all standard slotted policies expire, policy slots reset to new age baseline, government requires re-selection. Traditions persist.
**Engine does:** `handleTransition` overwrites only `civilizationId`, `age`, `ageProgress`, `legacyBonuses`, `legacyPoints`, `gold`, `researchedTechs`. Does NOT touch `researchedCivics`, `currentCivic`, `civicProgress`, `masteredCivics`, `currentCivicMastery`, `civicMasteryProgress`, `governmentId`, `slottedPolicies`.
**Gap:** Antiquity civics bleed into Exploration age as already-researched. New age's prerequisite chain appears broken. Slotted policies never expire.
**Recommendation:** Add to player spread: `researchedCivics: []`, `currentCivic: null`, `civicProgress: 0`, `masteredCivics: []`, `currentCivicMastery: null`, `civicMasteryProgress: 0`, `governmentId: null`, `slottedPolicies: new Map()`. Do NOT reset traditions (F-06).

---

### F-04: Policy slot model uses typed categories (Civ VI), not wildcard — DIVERGED

**Location:** `governmentSystem.ts:148-158`, `GameState.ts:445-446`
**GDD reference:** `systems/civic-tree.md` § "Social Policies and Policy Slots" (cross-cut `government-policies.md` F-01)
**Severity:** MED
**Effort:** M
**VII says:** All policy slots are wildcard — no type-restricted categories.
**Engine does:** `governmentSystem.canSlotPolicy` validates `policy.category === category`. `GovernmentDef.policySlots` has `military | economic | diplomatic | wildcard` keys. Three non-wildcard categories restrict placement.
**Gap:** Players cannot slot military into diplomatic slot. VII has no such restriction.
**Recommendation:** Simplify `GovernmentDef.policySlots` to `count: number`. Remove category discriminant from actions.

---

### F-05: Civ-unique civic tab absent from CivicTreePanel — DIVERGED

**Location:** `CivicTreePanel.tsx:14-15`
**GDD reference:** `systems/civic-tree.md` § "Civ-Unique Civic Trees" + "UI requirements"
**Severity:** MED
**Effort:** M
**VII says:** Civic Tree panel has tab control: shared age tree + civ-unique tree (3-4 nodes per civ).
**Engine does:** Filters `c.age === player.age` and passes flat combined list to `<TreeView>`. No tab switch. Civ-unique civics appear mingled with shared.
**Gap:** Civ-unique tab absent.
**Recommendation:** Add tab state (`'shared' | 'unique'`). Split by `c.civId === undefined` vs `c.civId === player.civilizationId`. Render separate `<TreeView>` per tab.

---

### F-06: Traditions — `PlayerState.traditions` and `TraditionCard` type absent — MISSING

**Location:** `GameState.ts` (PlayerState), `Civic.ts`
**GDD reference:** `systems/civic-tree.md` § "Traditions" (cross-cut `ages.md` F-07)
**Severity:** HIGH
**Effort:** L
**VII says:** Traditions are social policies earned via civ-unique civic trees (quill icon). Persist permanently across ages. Must be slotted; never expire; freely re-slottable. Core cross-age cultural identity mechanism.
**Engine does:** `PlayerState` has no `traditions`. `CivicDef` has no `unlocksTradition`. Mastery pushes generic `MODIFY_YIELD culture +1` to `legacyBonuses` — not a tradition pool.
**Gap:** Most distinctive VII civic mechanic entirely absent.
**Recommendation:** Define `TraditionCard` type. Add `unlocksTradition?: TraditionCard` to `CivicDef`. Add `traditions: ReadonlyArray<TraditionCard>` to `PlayerState`. On civ-unique civic completion, append unlocksTradition. In F-03 reset: do NOT reset traditions.

---

### F-07: Government lock per age absent — MISSING

**Location:** `governmentSystem.ts:194-216`, `ageSystem.ts:75-84`
**GDD reference:** `systems/civic-tree.md` § "Government Selection"
**Severity:** MED
**Effort:** M
**VII says:** Player selects one government per age; locked for remainder of age.
**Engine does:** `canAdoptGovernment` checks existence, unlock civic, not-already-on. No per-age lock.
**Gap:** Players can switch governments freely mid-age.
**Recommendation:** Add `governmentLockedForAge?: boolean` to `PlayerState`. Set true on SET_GOVERNMENT success. Clear in F-03 transition.

---

### F-08: Ideology branch-lock absent — MISSING

**Location:** `civicSystem.ts`, `data/civics/modern/index.ts`
**GDD reference:** `systems/civic-tree.md` § "Ideology Trees (Modern Age Only)"
**Severity:** MED
**Effort:** L
**VII says:** Researching Political Theory presents 3 exclusive ideology choices (Democracy/Fascism/Communism). Choosing permanent; unlocks 3-civic branch; locks out others. Second adopter gains +1 policy slot.
**Engine does:** No `SELECT_IDEOLOGY` action. No `ideology` on `PlayerState`. Modern civics barrel exports `IDEOLOGY`, `TOTALITARIANISM`, `SUFFRAGE`, `CLASS_STRUGGLE` — all researchable simultaneously.
**Gap:** Ideology selection doesn't exist.
**Recommendation:** Add `ideology?: 'democracy'|'fascism'|'communism'` to `PlayerState`. Add `SELECT_IDEOLOGY` action. On Political Theory completion, require selection. Filter available civics.

---

### F-09: Mastery reward hardcoded as +1 culture/turn, not per-tech — DIVERGED

**Location:** `civicSystem.ts:188-205`
**GDD reference:** `systems/civic-tree.md` § "Mastery Mechanic"
**Severity:** MED
**Effort:** M
**VII says:** Mastery unlocks are specific and varied per civic (Senatus Populusque Romanus → Colosseum + 1 policy slot; Khmer Chakravarti → +3 Codex slots).
**Engine does:** `processCivicMasteryResearch` always awards `MODIFY_YIELD culture +1`.
**Gap:** Every mastery gives same reward.
**Recommendation:** Add `masteryUnlocks?: ReadonlyArray<EffectDef>` to `CivicDef`. Apply per-civic.

---

### F-10: Per-age policy slot baseline not enforced — MISSING

**Location:** `ageSystem.ts:75-84`, `governmentSystem.ts`
**GDD reference:** `systems/civic-tree.md` § "Social Policies and Policy Slots" (baseline table)
**Severity:** MED
**Effort:** S
**VII says:** Policy slot baselines by age: Antiquity 1, Exploration 2, Modern 3.
**Engine does:** No per-age baseline. Derived entirely from `GovernmentDef.policySlots`.
**Gap:** Age-scaled slot baseline absent.
**Recommendation:** Add helper `ageBasePolicySlots(age): number`. Include in slot count calc. Reset in F-03.

---

### F-11: governmentSystem not wired into GameEngine — CLOSE

**Location:** `governmentSystem.ts:1-11` (comment)
**GDD reference:** `systems/civic-tree.md` § "Government Selection" + "Triggers"
**Severity:** MED
**Effort:** M
**VII says:** Government selection is a core player action.
**Engine does:** `governmentSystem` well-implemented but comment: "This system is NOT yet wired into the GameEngine pipeline." `GovernmentAction` separate from main `GameAction` union.
**Gap:** Government mechanics architecturally isolated.
**Recommendation:** Merge `GovernmentAction` into `GameAction`. Wire system into engine pipeline. Prerequisite for F-03, F-04, F-07.

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

### F-13: Hardcoded +5 ageProgress per civic completion — EXTRA

**Location:** `civicSystem.ts:131`
**GDD reference:** `systems/civic-tree.md` (mechanic not in GDD)
**Severity:** LOW
**Effort:** S
**VII says:** Standard civic research does not grant age progress. Only Future Civic nodes grant +10.
**Engine does:** Every civic completion awards `ageProgress + 5`.
**Gap:** Not a VII mechanic.
**Recommendation:** Remove `ageProgress + 5`. Add age-progress as typed unlock payload if Future Civics need it.

---

## Extras to retire

- `civicSystem.ts:131` `+5 ageProgress` per civic (F-13).
- Typed policy category model in `governmentSystem.ts` (F-04) — replace with wildcard pool.

---

## Missing items

1. `PlayerState.traditions` + `TraditionCard` type (F-06) — core mechanic.
2. Civic tree reset in `ageSystem.handleTransition` (F-03).
3. Per-age government lock (F-07).
4. Ideology branch-lock (F-08).
5. Per-age policy slot baseline (F-10).
6. Per-civic mastery unlock payloads (F-09).

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/civic-tree.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/civicSystem.ts`
- `packages/engine/src/systems/ageSystem.ts` (missing civic reset — F-03)
- `packages/engine/src/systems/governmentSystem.ts` (not yet wired)
- `packages/engine/src/types/Civic.ts`
- `packages/engine/src/data/civics/`
- `packages/web/src/ui/panels/CivicTreePanel.tsx` (missing tab — F-05)

**Status:** 3 MATCH / 2 CLOSE / 3 DIVERGED / 4 MISSING / 1 EXTRA

**Highest-severity finding:** F-03 — TRANSITION_AGE does not reset civic state; F-06 — traditions entirely absent.

---

## Open questions

1. `governmentSystem` wiring timing (Cycle D)?
2. `PlayerState.policySlots` named field needed, or derived from government config?
3. Difficulty modifier for culture costs in scope?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-02, F-10, F-13 | 1.5d |
| M | F-01, F-03, F-04, F-05, F-07, F-09, F-11, F-12 | ~16d |
| L | F-06, F-08 | ~3w |
| **Total** | 13 | **~5w** |

Recommended order: F-03 → F-11 → F-06 → F-02 → F-13 → F-04 → F-07 → F-08 → F-05/F-09/F-12.

---

<!-- END OF AUDIT -->
