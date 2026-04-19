# Government & Policies — hex-empires Audit

**System slug:** `government-policies`
**GDD doc:** [systems/government-policies.md](../systems/government-policies.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

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
| MATCH | 0 |
| CLOSE | 2 |
| DIVERGED | 3 |
| MISSING | 3 |
| EXTRA | 0 |

**Total findings:** 8

---

## Detailed findings

### F-01: Typed slot categories retained — all slots should be wildcard — DIVERGED

**Location:** `packages/engine/src/data/governments/governments.ts:14-25`, `packages/engine/src/systems/governmentSystem.ts:149-157`, `packages/web/src/ui/panels/GovernmentPanel.tsx:64-69`
**GDD reference:** `government-policies.md` § "Policy Slots and Wildcard System"
**Severity:** HIGH
**Effort:** M
**VII says:** All policy slots are **wildcard**. There are no military, economic, or diplomatic slot types. Any policy can be placed in any slot. This is explicitly called out as the key VII-vs-VI design change.
**Engine does:** `PolicySlotCounts` defines four separate slot categories: `military`, `economic`, `diplomatic`, `wildcard`. `GovernmentDef` uses this struct to declare per-category slot counts. `canSlotPolicy` enforces category matching (`policy.category !== category`). The panel renders four separate category rows. `DESPOTISM` exposes `{ military: 2, economic: 0, diplomatic: 0, wildcard: 0 }` — a Civ VI typed-slot model.
**Gap:** The entire slot-category system is a Civ VI holdover. VII has no slot categories.
**Recommendation:** Replace `PolicySlotCounts` with a single `readonly total: number`. Replace `slottedPolicies: ReadonlyMap<PolicyCategory, ReadonlyArray<...>>` with `ReadonlyArray<PolicyId | null>` sized to `total`. Remove category-match check from `canSlotPolicy`. Flatten the panel into a single slot row. `PolicyCategory` on `PolicyDef` can remain as a display/sorting hint but must not gate slot placement.

---

### F-02: Chiefdom listed as a VII government — does not exist in VII — DIVERGED

**Location:** `packages/engine/src/data/governments/governments.ts:40-49`
**GDD reference:** `government-policies.md` § "Antiquity Age Governments"
**Severity:** HIGH
**Effort:** S
**VII says:** Antiquity offers exactly three governments: **Classical Republic**, **Despotism**, **Oligarchy**. There is no Chiefdom government in VII.
**Engine does:** `CHIEFDOM` is defined with `age: 'antiquity'` and `unlockCivic: 'code_of_laws'`, making it an Antiquity government the player can select. It exposes `{ wildcard: 1 }` slot.
**Gap:** Chiefdom is an invented starter government. The GDD documents three Antiquity governments; Chiefdom is not among them.
**Recommendation:** Remove `CHIEFDOM` from `ALL_GOVERNMENTS` and from the barrel. Verify no test or UI path depends on `'chiefdom'` as a required starting government.

---

### F-03: Exploration Age government roster wrong — DIVERGED

**Location:** `packages/engine/src/data/governments/governments.ts:86-117`
**GDD reference:** `government-policies.md` § "Exploration Age Governments"
**Severity:** HIGH
**Effort:** M
**VII says:** Exploration Age standard governments are **Theocracy**, **Plutocracy**, **Feudal Monarchy**. Plus three crisis-unlocked revolutionary governments (Revolutionary Republic, Revolutionary Authoritarianism, Constitutional Monarchy) available only if Revolutions crisis fires.
**Engine does:** Exploration Age has `MONARCHY` and `MERCHANT_REPUBLIC` as named governments. `THEOCRACY` is defined for Exploration (correct). `Plutocracy` and `Feudal Monarchy` are absent. No revolutionary governments exist.
**Gap:** `MONARCHY` and `MERCHANT_REPUBLIC` are not VII Exploration Age governments. `Plutocracy` and `Feudal Monarchy` are missing. The three revolutionary crisis governments are entirely absent.
**Recommendation:** Rename `MONARCHY` → `FEUDAL_MONARCHY` (matching VII name). Rename/replace `MERCHANT_REPUBLIC` → `PLUTOCRACY`. Add `REVOLUTIONARY_REPUBLIC`, `REVOLUTIONARY_AUTHORITARIANISM`, `CONSTITUTIONAL_MONARCHY` as crisis-gated governments with a `crisisRequired: 'revolutions'` flag.

---

### F-04: Modern Age government roster incomplete — CLOSE

**Location:** `packages/engine/src/data/governments/governments.ts:121-143`
**GDD reference:** `government-policies.md` § "Modern Age Governments"
**Severity:** MED
**Effort:** S
**VII says:** Modern Age offers three standard governments: **Authoritarianism**, **Bureaucratic Monarchy**, **Elective Republic**. Plus civ-specific Mexico **Revolucion**.
**Engine does:** Only `DEMOCRACY` is defined for `age: 'modern'`. `Democracy` is not in the VII Modern Age government list (it does not exist as a named Modern Age government in VII — the equivalent is `Elective Republic`).
**Gap:** Two of three standard Modern Age governments are missing. `Democracy` is a mislabeled substitute for `Elective Republic`. `Authoritarianism` and `Bureaucratic Monarchy` are absent. `Revolucion` is absent.
**Recommendation:** Rename `DEMOCRACY` → `ELECTIVE_REPUBLIC`. Add `AUTHORITARIANISM` and `BUREAUCRATIC_MONARCHY` for Modern. Add `REVOLUCION` with a `civRequired: 'mexico'` guard.

---

### F-05: Government celebration bonuses missing from GovernmentDef data — MISSING

**Location:** `packages/engine/src/data/governments/governments.ts:27-36` (local `GovernmentDef`)
**GDD reference:** `government-policies.md` § "Government Selection", celebration-bonus tables for all three ages
**Severity:** HIGH
**Effort:** M
**VII says:** Each government grants exactly **two celebration effects** (a 2-tuple) that activate for 10 turns each time the player triggers a celebration by crossing the happiness threshold. These are the primary strategic differentiator between governments — e.g. Classical Republic: +20% Culture / +15% Production toward Wonders; Despotism: +20% Science / +30% Production toward Infantry.
**Engine does:** The local `GovernmentDef` in `governments.ts` (used by the data barrel) has NO `celebrationBonuses` field. The canonical `GovernmentDef` in `types/Government.ts` correctly includes `celebrationBonuses: readonly [GovernmentCelebrationBonus, GovernmentCelebrationBonus]`, but the **data files** (`governments.ts`) still use the old local definition that omits it. `GovernmentState` has `activeCelebrationBonus` and `bonusSlotCount` but no system wires celebration triggers to slot increments.
**Gap:** All eight governments in `ALL_GOVERNMENTS` lack `celebrationBonuses`. The celebration-bonus data for all three ages' governments is entirely unimplemented. The `PICK_CELEBRATION_BONUS` action exists in the type union but is never handled in `governmentSystem.ts`.
**Recommendation:** Remove the duplicate local `GovernmentDef` from `governments.ts`; import the canonical one from `types/Government.ts`. Add `celebrationBonuses` to all government data entries using the GDD tables. Implement `PICK_CELEBRATION_BONUS` handler in `governmentSystem.ts`.

---

### F-06: Government system not wired to celebration slot grants — MISSING

**Location:** `packages/engine/src/systems/governmentSystem.ts` (no CELEBRATION_TRIGGER handler), `packages/engine/src/types/Government.ts:238` (`bonusSlotCount`)
**GDD reference:** `government-policies.md` § "Slot acquisition sources" item 2, § "Triggers" CELEBRATION_TRIGGER
**Severity:** MED
**Effort:** M
**VII says:** Each celebration that fires increases `policySlotCount` by +1. `bonusSlotCount` accumulates from Celebrations + Attributes + Civics.
**Engine does:** `GovernmentState.bonusSlotCount` field exists in the type but is never written. `governmentSystem.ts` handles `SET_GOVERNMENT`, `SLOT_POLICY`, `UNSLOT_POLICY` only. No `CELEBRATION_TRIGGER` action is dispatched or handled anywhere. No civic-completion slot-grant path exists in the system either.
**Gap:** The slot-accumulation mechanic — the core progression loop of the policies layer — is entirely absent. A player who triggers celebrations never gains additional policy slots.
**Recommendation:** Add `CELEBRATION_TRIGGER` handling to `governmentSystem` that increments `bonusSlotCount`. Total available slots = `government.policySlots` total + `bonusSlotCount`. Cross-reference `civicSystem` to add slot-grant civic hooks (Philosophy, Bureaucracy, Diplomatic Service, Political Theory).

---

### F-07: Crisis policy slots entirely absent — MISSING

**Location:** `packages/engine/src/types/Government.ts`, `packages/engine/src/systems/governmentSystem.ts`
**GDD reference:** `government-policies.md` § "Crisis Policies", § "Staged escalation"
**Severity:** MED
**Effort:** M
**VII says:** During crisis phase, 2→3→4 mandatory crisis policy slots must be filled before END_TURN is allowed. Crisis policies impose negative yield penalties. They clear at age end. These are separate from the standard policy slots.
**Engine does:** `GovernmentState` has no `activeCrisisPolicies`, no `crisisPolicySlotCount` field. `governmentSystem.ts` has no crisis-policy handler. `crisisSystem.ts` exists but no coupling between crisis phase and forced policy slots is present.
**Gap:** The entire crisis policy mechanic is absent. No forced negative policies, no turn-end block, no staged escalation.
**Recommendation:** Add `activeCrisisPolicies: ReadonlyArray<PolicyId>` and `crisisPolicySlotCount: number` to `GovernmentState`. Add `FORCE_CRISIS_POLICY` handler in `governmentSystem`. Wire `crisisSystem` stage-advance to dispatch slot-count increments. Add turn-end validation in `turnSystem` to block END_TURN when crisis slots are unfilled.

---

### F-08: Policy swap window not enforced — CLOSE

**Location:** `packages/engine/src/systems/governmentSystem.ts:127-159` (`canSlotPolicy`)
**GDD reference:** `government-policies.md` § "Policy Unlocking and Swapping"
**Severity:** LOW
**Effort:** S
**VII says:** Policies can only be swapped during a civic-completion event window. Outside that window, filled slots are locked. There is no turn-by-turn policy management.
**Engine does:** `canSlotPolicy` validates government existence, policy unlock, category (problematic per F-01), and slot index. It does NOT validate whether the player is in a civic-completion swap window. `SLOT_POLICY` can be dispatched freely at any turn.
**Gap:** The civic-completion gating is absent.
**Recommendation:** Add `policySwapWindowOpen: boolean` to `GovernmentState`. Set `true` in `civicSystem` when a civic completes. `canSlotPolicy` checks this flag. Clear after the swap or at turn end.

---

## Extras to retire

None. (The typed-slot categories in F-01 are technically extras but paired with "needed refactor" rather than deletion.)

---

## Missing items

1. Celebration bonuses on every `GovernmentDef` (F-05) — primary strategic differentiator absent.
2. `CELEBRATION_TRIGGER` handler in `governmentSystem.ts` (F-06) — slot accumulation dead.
3. Crisis policy slots + forced slot handler + turn-end gate (F-07).
4. Civic-completion swap window enforcement (F-08).
5. Missing Exploration governments (Plutocracy, Feudal Monarchy, 3 revolutionary) (F-03).
6. Missing Modern governments (Authoritarianism, Bureaucratic Monarchy, Revolucion) (F-04).

---

## Cross-cuts with other audits

- **`celebrations.md` F-04 (MISSING — socialPolicySlots):** Paired with F-06 here. celebrations system fires a `CELEBRATION_TRIGGER`; government system must handle it to increment `bonusSlotCount`.
- **Age transition:** `GovernmentState` has no age-transition handler. On `TRANSITION_AGE`, standard policies must be cleared, `bonusSlotCount` reset, and `currentGovernmentId` set to null until the player picks. Cross-cut with `ages.md` findings.

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/government-policies.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/governmentSystem.ts`
- `packages/engine/src/types/Government.ts`
- `packages/engine/src/data/governments/governments.ts`
- `packages/web/src/ui/panels/GovernmentPanel.tsx`

**Status:** 0 MATCH / 2 CLOSE / 3 DIVERGED / 3 MISSING / 0 EXTRA

**Highest-severity finding:** F-01 — typed slot categories (Civ-VI-ism) require flattening to wildcard-only; F-05 — celebration bonuses missing from all government data.

---

## Open questions

1. Is `Democracy` intended as a hex-empires-specific name for `Elective Republic`, or a Civ-V/VI holdover?
2. Are the 3 revolutionary crisis governments blocked on `crises` audit landing, or can they be added now with a TODO guard?
3. Does `crisisSystem.ts` already define a `CrisisPhase` state type that we can read to gate crisis policies?
4. Does `civicSystem.ts` currently emit a civic-completion event that `governmentSystem.ts` could listen to for swap-window enforcement?

---

## Effort estimate

| Bucket | Findings | Total effort |
|---|---|---|
| S (half-day) | F-02, F-04, F-08 | 1.5d |
| M (1-3 days) | F-01, F-03, F-05, F-06, F-07 | ~10d |
| L (week+) | — | — |
| **Total** | 8 | **~12d** |

Recommended order: F-01 (flatten slots — prerequisite for correct panel rendering), F-05 (add celebration bonus data), F-06 (wire celebration trigger to slot grant), F-03 + F-04 (correct government rosters), F-07 (crisis policies), F-02 (remove Chiefdom), F-08 (swap window lock).

---

<!-- END OF AUDIT -->
