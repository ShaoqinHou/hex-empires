# Government & Policies — hex-empires Audit

**System slug:** `government-policies`
**GDD doc:** [systems/government-policies.md](../systems/government-policies.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0
**Current-code refresh:** `2026-05-02` by Codex against branch `codex/civ7-refactor-cycle`

---

## Engine files audited

- `packages/engine/src/systems/governmentSystem.ts`
- `packages/engine/src/data/governments/governments.ts`
- `packages/engine/src/types/Government.ts`
- `packages/web/src/ui/panels/GovernmentPanel.tsx`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 3 |
| CLOSE | 5 |
| DIVERGED | 0 |
| MISSING | 0 |
| EXTRA | 0 |

**Total findings:** 8

---

## Detailed findings

### F-01: Typed slot categories retained -- all slots should be wildcard -- MATCH

**Location:** `packages/engine/src/data/governments/governments.ts`, `packages/engine/src/systems/governmentSystem.ts`, `packages/web/src/ui/panels/GovernmentPanel.tsx`
**GDD reference:** `government-policies.md` § "Policy Slots and Wildcard System"
**Severity:** HIGH
**Effort:** S
**VII says:** All policy slots are **wildcard**. There are no military, economic, or diplomatic slot types. Any policy can be placed in any slot. This is explicitly called out as the key VII-vs-VI design change.
**Engine does:** `PolicySlotCounts` now exposes a single `total`, `PlayerState.slottedPolicies` is a flat array, `SLOT_POLICY` uses `slotIndex`, `canSlotPolicy` no longer category-checks, and the Government panel renders one Wildcard slot list.
**Gap:** None for the typed-slot retirement.
**Recommendation:** Keep `PolicyCategory` only as metadata for display/sorting; do not reintroduce category-gated slotting.

---

### F-02: Chiefdom listed as a VII government -- does not exist in VII -- MATCH

**Location:** `packages/engine/src/data/governments/governments.ts`
**GDD reference:** `government-policies.md` § "Antiquity Age Governments"
**Severity:** HIGH
**Effort:** S
**VII says:** Antiquity offers exactly three governments: **Classical Republic**, **Despotism**, **Oligarchy**. There is no Chiefdom government in VII.
**Engine does:** `CHIEFDOM` is no longer defined or exported in `ALL_GOVERNMENTS`.
**Gap:** None.
**Recommendation:** Keep retirement coverage so `chiefdom` does not re-enter government content.

---

### F-03: Exploration Age government roster wrong -- CLOSE

**Location:** `packages/engine/src/data/governments/governments.ts`, `packages/engine/src/systems/governmentSystem.ts`
**GDD reference:** `government-policies.md` § "Exploration Age Governments"
**Severity:** HIGH
**Effort:** M
**VII says:** Exploration Age standard governments are **Theocracy**, **Plutocracy**, **Feudal Monarchy**. Plus three crisis-unlocked revolutionary governments (Revolutionary Republic, Revolutionary Authoritarianism, Constitutional Monarchy) available only if Revolutions crisis fires.
**Engine does:** Exploration Age data now includes `THEOCRACY`, `PLUTOCRACY`, `FEUDAL_MONARCHY`, `REVOLUTIONARY_REPUBLIC`, `REVOLUTIONARY_AUTHORITARIANISM`, and `CONSTITUTIONAL_MONARCHY`.
**Gap:** The revolutionary governments are data-present but are not actually gated by a Revolutions crisis outcome; `unlockCivic: 'nationalism'` is only a proxy.
**Recommendation:** Add an explicit crisis requirement field and enforce it in `canAdoptGovernment`, including the forced revolutionary replacement flow when the Revolutions crisis reaches its final stage.

---

### F-04: Modern Age government roster incomplete -- MATCH

**Location:** `packages/engine/src/data/governments/governments.ts`, `packages/engine/src/systems/governmentSystem.ts`
**GDD reference:** `government-policies.md` § "Modern Age Governments"
**Severity:** MED
**Effort:** S
**VII says:** Modern Age offers three standard governments: **Authoritarianism**, **Bureaucratic Monarchy**, **Elective Republic**. Plus civ-specific Mexico **Revolucion**.
**Engine does:** Modern Age data now includes `AUTHORITARIANISM`, `BUREAUCRATIC_MONARCHY`, `ELECTIVE_REPUBLIC`, and `REVOLUCION` with `civRequired: 'mexico'`. `canAdoptGovernment` enforces the current player's civilization id, `SET_GOVERNMENT` rejects non-Mexico adoption, and AI government selection does not emit invalid civ-specific choices.
**Gap:** None for the Modern government roster and Mexico-only `REVOLUCION` gate.
**Recommendation:** Keep `civRequired` as the government data gate unless future age-transition work proves that historical civ lineage should also qualify.

---

### F-05: Government celebration bonuses missing from GovernmentDef data -- CLOSE

**Location:** `packages/engine/src/data/governments/governments.ts`, `packages/engine/src/systems/governmentSystem.ts`
**GDD reference:** `government-policies.md` § "Government Selection", celebration-bonus tables for all three ages
**Severity:** HIGH
**Effort:** M
**VII says:** Each government grants exactly **two celebration effects** (a 2-tuple) that activate for 10 turns each time the player triggers a celebration by crossing the happiness threshold. These are the primary strategic differentiator between governments — e.g. Classical Republic: +20% Culture / +15% Production toward Wonders; Despotism: +20% Science / +30% Production toward Infantry.
**Engine does:** Every government in `ALL_GOVERNMENTS` now has a two-item `celebrationBonuses` tuple matching the local GDD names, and `governmentSystem` handles `PICK_CELEBRATION_BONUS`.
**Gap:** Bonus entries are still text/id records, not canonical effect-bearing structures, and the data module still carries a local `GovernmentDef` shape instead of importing the canonical type.
**Recommendation:** Promote government content to the canonical `types/Government.ts` shape and encode each celebration bonus as structured effects so `effectSystem` can apply them without string interpretation.

---

### F-06: Government system not wired to celebration slot grants -- MATCH

**Location:** `packages/engine/src/state/PolicySlotUtils.ts`, `packages/engine/src/systems/governmentSystem.ts`, `packages/engine/src/systems/civicSystem.ts`, `packages/engine/src/state/YieldCalculator.ts`, `packages/web/src/ui/panels/GovernmentPanel.tsx`
**GDD reference:** `government-policies.md` § "Slot acquisition sources" item 2, § "Triggers" CELEBRATION_TRIGGER
**Severity:** MED
**Effort:** S
**VII says:** Each celebration that fires increases `policySlotCount` by +1. `bonusSlotCount` accumulates from Celebrations + Attributes + Civics.
**Engine does:** `effectivePolicySlotCount` derives total slots from age baseline + government + `socialPolicySlots` + summed civic `policySlotCounts` + legacy `GRANT_POLICY_SLOT` effects. Government adoption, slot validation, slot/unslot reducers, celebration choice, civic completion slot grants, yield calculation, and the Government panel all use or respect that effective total. Fresh players initialize government slot fields, migrated players with a valid government can rebuild missing slot arrays on slotting, and overlong hidden policy arrays are ignored by yield calculation.
**Gap:** None for effective slot-count wiring.
**Recommendation:** Keep `PolicySlotUtils` as the shared source of truth and add future slot-grant sources as `GRANT_POLICY_SLOT` effects rather than bespoke counters.

---

### F-07: Crisis policy slots entirely absent -- CLOSE

**Location:** `packages/engine/src/types/GameState.ts`, `packages/engine/src/systems/crisisSystem.ts`, `packages/engine/src/systems/turnSystem.ts`
**GDD reference:** `government-policies.md` § "Crisis Policies", § "Staged escalation"
**Severity:** MED
**Effort:** M
**VII says:** During crisis phase, 2→3→4 mandatory crisis policy slots must be filled before END_TURN is allowed. Crisis policies impose negative yield penalties. They clear at age end. These are separate from the standard policy slots.
**Engine does:** `PlayerState.crisisPolicySlots` / `crisisPolicies`, per-crisis `slottedPolicies`, `FORCE_CRISIS_POLICY`, `SLOT_CRISIS_POLICY`, stage slot counts, and END_TURN gates now exist.
**Gap:** There are two parallel crisis policy paths: legacy player-level `crisisPolicies` with 2/3/4 slot counts, and per-crisis `SLOT_CRISIS_POLICY` that clears `pendingResolution` once each human has at least one policy. The model is not yet one coherent 2/3/4 forced-slot implementation.
**Recommendation:** Collapse crisis policy state to one action/model, require the stage-specific number of slots in that model, and ensure age transition clears crisis policies.

---

### F-08: Policy swap window not enforced -- CLOSE

**Location:** `packages/engine/src/systems/governmentSystem.ts:127-159` (`canSlotPolicy`)
**GDD reference:** `government-policies.md` § "Policy Unlocking and Swapping"
**Severity:** LOW
**Effort:** S
**VII says:** Policies can only be swapped during a civic-completion event window. Outside that window, filled slots are locked. There is no turn-by-turn policy management.
**Engine does:** `canSlotPolicy` requires `policySwapWindowOpen`, `SLOT_POLICY` consumes the window, and civic completion paths open it.
**Gap:** The lifecycle is still approximate: a single slot action consumes the full window, and turn-end clearing is not explicit.
**Recommendation:** Model a policy-change session that lets the player fill/swap all allowed slots during the window, then explicitly closes on confirm or turn end.

---

## Extras to retire

None. (The typed-slot categories in F-01 are technically extras but paired with "needed refactor" rather than deletion.)

---

## Missing items

1. Revolutionary Exploration governments need explicit Revolutions-crisis gating and forced switch behavior (F-03).
2. Celebration bonuses need canonical structured effects, not only id/name/description text (F-05).
3. Crisis policy state should collapse to one coherent 2/3/4 forced-slot model (F-07).
4. Policy swap windows need a complete confirm/turn-end lifecycle (F-08).

---

## Cross-cuts with other audits

- **`celebrations.md` F-04 (MISSING — socialPolicySlots):** `socialPolicySlots` now increments on `PICK_CELEBRATION_BONUS` and participates in the shared effective-slot formula used by validation and UI.
- **Age transition:** Current code clears government/slotted policies and preserves `socialPolicySlots`; the next government adoption normalizes slots from the shared effective-slot formula.

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/government-policies.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/governmentSystem.ts`
- `packages/engine/src/types/Government.ts`
- `packages/engine/src/data/governments/governments.ts`
- `packages/web/src/ui/panels/GovernmentPanel.tsx`

**Status:** 4 MATCH / 4 CLOSE / 0 DIVERGED / 0 MISSING / 0 EXTRA

**Highest-severity active findings:** F-03 — revolutionary Exploration governments are data-present but not Revolutions-gated; F-05 — celebration bonuses are data-present but not structured as canonical effects.

---

## Open questions

1. What exact state flag should gate the three revolutionary Exploration governments after a Revolutions crisis?
2. Should government celebration bonuses use a generic `EffectDef[]` tuple, or a dedicated `GovernmentCelebrationEffect` type with production-target categories?
3. Should a policy swap window allow multiple slot changes before explicit confirmation, or auto-close at end turn after any number of changes?

---

## Effort estimate

| Bucket | Findings | Total effort |
|---|---|---|
| S (half-day) | F-08 | 0.5d |
| M (1-3 days) | F-03, F-05, F-07 | ~5-7d |
| L (week+) | — | — |
| **Remaining active work** | 4 | **~5.5-7.5d** |

Recommended order: F-03 (Revolutions gating/forced switch), F-05 (structured effects), F-07 (unified crisis policy model), F-08 (complete swap-window lifecycle).

---

<!-- END OF AUDIT -->
