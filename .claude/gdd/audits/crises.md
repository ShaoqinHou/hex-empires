# Crises — hex-empires Audit

**System slug:** `crises`
**GDD doc:** [systems/crises.md](../systems/crises.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/systems/crisisSystem.ts` (1-298)
- `packages/engine/src/data/crises/all-crises.ts` (1-204)
- `packages/engine/src/data/crises/expansion-crises.ts` (1-215)
- `packages/engine/src/data/crises/types.ts` (1-33)
- `packages/engine/src/types/GameState.ts` (CrisisState, PlayerState)
- `packages/web/src/ui/panels/CrisisPanel.tsx` (1-85)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 1 |
| CLOSE | 1 |
| DIVERGED | 3 |
| MISSING | 4 |
| EXTRA | 1 |

**Total findings:** 10

---

## Detailed findings

### F-01: Crisis is a one-shot narrative event, not persistent age-phase system — DIVERGED

**Location:** `crisisSystem.ts:13-22`, `data/crises/all-crises.ts`
**GDD reference:** `systems/crises.md` § "Triggers", "Crisis stages"
**Severity:** HIGH
**Effort:** L
**VII says:** One crisis type randomly selected at age init runs as 3-stage mandatory policy-slotting system at `ageProgress` 70%/80%/90%. Persistent mechanical layer blocking END_TURN until slots filled. All slotted policies stack cumulatively.
**Engine does:** `crisisSystem` treats crises as one-shot narrative events. Each `CrisisEventDef` fires once when condition met, shows 2-3 choices, marked `active: false` after. No stage progression, no slotting, no multi-turn accumulation.
**Gap:** Fundamental VII crisis architecture absent.
**Recommendation:** Redesign around `CrisisPhase` state with stage transitions, policy slotting, END_TURN gating.

---

### F-02: `ageProgress`-based stage triggers absent — MISSING

**Location:** `crisisSystem.ts:58-116`
**GDD reference:** `systems/crises.md` "Formulas": stage1=0.70, stage2=0.80, stage3=0.90
**Severity:** HIGH
**Effort:** M
**VII says:** All 3 stage transitions key off `ageProgress` percentage.
**Engine does:** `CrisisTriggerCondition` supports `turn_reached`, `tech_researched`, etc. No `age_progress`. Existing data uses hard-coded absolute turn numbers (breaks at Marathon/Epic speeds).
**Gap:** Add `age_progress` trigger variant + handler.
**Recommendation:** Add to `CrisisTriggerCondition` union. Branch in `isTriggerMet`. Migrate VII-mapped definitions.

---

### F-03: No crisis policy slots or END_TURN gating — MISSING

**Location:** `types/GameState.ts` (PlayerState), `crisisSystem.ts`
**GDD reference:** `systems/crises.md` § "Triggers" (END_TURN blocked when slots unfilled)
**Severity:** HIGH
**Effort:** M
**VII says:** `PlayerState` has `crisisPolicies` (max 4) + `crisisPolicySlots` (required for current stage). END_TURN refuses advance while slots unfilled.
**Engine does:** `CrisisState` has no policy slot fields. `PlayerState` has no `crisisPolicies`/`crisisPolicySlots`/`crisisPhase`. `crisisSystem` END_TURN never blocks. `blocksTurn: true` logged but unenforced.
**Gap:** Both the slot model + END_TURN enforcement are absent.
**Recommendation:** Add `crisisPolicies: ReadonlyArray<PolicyId>`, `crisisPolicySlots: number`, `crisisPhase` to `PlayerState`. Add `FORCE_CRISIS_POLICY` + END_TURN gate.

---

### F-04: Age-specific crisis pools with seeded random selection absent — DIVERGED

**Location:** `data/crises/all-crises.ts:194-204`, `crisisSystem.ts:29`
**GDD reference:** `systems/crises.md` § "Crisis selection"
**Severity:** HIGH
**Effort:** M
**VII says:** ONE crisis type selected via seeded RNG from 3-option age-specific pool. Only that type's policies available that age. Antiquity: {Plague, Revolt, Invasion}. Exploration: {Plague, Revolution, Wars of Religion}. Modern: none.
**Engine does:** `ALL_CRISES` is flat 14-entry array with no `age` or `crisisType`. All 14 evaluated every END_TURN; any matching condition fires simultaneously. No pool selection, no RNG draw, no age gating.
**Gap:** One-random-themed-crisis-per-age replaced with flat always-active catalog.
**Recommendation:** Add `age: Age` + `crisisType` to `CrisisEventDef`. Age-init selection in `ageSystem` using `state.rng`.

---

### F-05: `ALL_CRISES` direct import — DIVERGED (import-boundary violation)

**Location:** `crisisSystem.ts:3`
**GDD reference:** `.claude/rules/engine-patterns.md` § "state.config.X not ALL_X globals"
**Severity:** MED
**Effort:** S
**VII says:** Engine rule: systems read content from `state.config.X`.
**Engine does:** `crisisSystem` directly imports `ALL_CRISES` and uses in `checkCrisisTriggers` + `resolveCrisis`. Tests can't override via `state.config`.
**Gap:** Import-boundary violation.
**Recommendation:** Replace with `state.config.crises`. Add `crises: ReadonlyArray<CrisisEventDef>` to `GameConfig`.

---

### F-06: CrisisPanel is a one-shot DramaModal, not persistent policy UI — DIVERGED

**Location:** `CrisisPanel.tsx:49-60`
**GDD reference:** `systems/crises.md` § "UI requirements"
**Severity:** MED
**Effort:** M
**VII says:** Persistent panel visible from 70% age progress to transition. Shows: crisis name, stage (1/2/3), required vs filled slots, policy card grid, slotted policies. Persists across turns.
**Engine does:** `CrisisPanel` renders `DramaModal` — single-turn popup, one-click choice list. `onResolve()` closes permanently. No stage indicator, no slot count, no card grid, no persistence.
**Gap:** Panel must be rebuilt as persistent multi-turn policy screen.
**Recommendation:** Replace `DramaModal` with persistent modal panel showing stage + slot grid + card selection.

---

### F-07: Crisis legacy bonus and `crisisLegacyUnlocked` absent — MISSING

**Location:** `types/GameState.ts` (PlayerState), `crisisSystem.ts`
**GDD reference:** `systems/crises.md` § "Crisis legacy bonuses"
**Severity:** MED
**Effort:** M
**VII says:** Surviving crisis sets `crisisLegacyUnlocked = true`. Special legacy bonus category at transition, selectable for 2 legacy points.
**Engine does:** `PlayerState` has no `crisisLegacyUnlocked`. `crisisSystem` never evaluates crisis survival at transition. No special row in transition screen.
**Gap:** Add field + transition handler + UI row.
**Recommendation:** Add `crisisLegacyUnlocked: boolean` to `PlayerState`. Check in `TRANSITION_AGE` handler. Surface in age transition panel.

---

### F-08: Empire-size scaling for crisis penalties absent — MISSING

**Location:** `crisisSystem.ts:198-298` (`applyCrisisEffect`)
**GDD reference:** `systems/crises.md` "Formulas": `crisisPenalty = basePenalty * empireScalingFactor(settlementsOwned)`
**Severity:** MED
**Effort:** M
**VII says:** Crisis policy severity scales with empire size; inverts wide-empire advantage.
**Engine does:** `applyCrisisEffect` applies flat `effect.value` with no scaling. 1-city and 15-city empires get identical penalty magnitudes.
**Gap:** Empire-size scaling absent.
**Recommendation:** Add `empireScalingFactor(state, playerId)` utility; apply in `applyCrisisEffect`.

---

### F-09: Golden Age and Trade Opportunity are positive events misclassified as crises — EXTRA

**Location:** `data/crises/all-crises.ts:44-82`
**GDD reference:** `systems/crises.md` § "Crisis selection" — all VII crises are adversity
**Severity:** LOW
**Effort:** S
**VII says:** All 6 VII crisis types are negative-leaning adversity events with mandatory costs.
**Engine does:** `ALL_CRISES` includes `GOLDEN_AGE` (pure reward) and `TRADE_OPPORTUNITY` (pure reward). Fire through crisis system; appear in crisis log.
**Gap:** Misclassified as crises.
**Recommendation:** Move to separate narrative-events data file and system.

---

### F-10: Plague city infection model (`CityState.infected`) absent — MISSING

**Location:** `types/GameState.ts` (CityState), `data/crises/all-crises.ts:4-21`
**GDD reference:** `systems/crises.md` § "Plague crisis"
**Severity:** MED
**Effort:** M
**VII says:** `CityState.infected` tracks settlement plague. Per-turn yield loss; spread to neighbors. Exploration Plague introduces Physician civilian unit.
**Engine does:** `CityState` has no `infected` field. `PLAGUE` crisis offers 2 one-shot choices. No per-turn degradation, spread, or Physician unit.
**Gap:** Plague mechanic is a choice popup, not a persistent infection system.
**Recommendation:** Add `infected: boolean` to `CityState`. Per-turn yield penalty + neighbor spread in crisisSystem END_TURN when Plague active. Add Physician to Exploration units.

---

## Extras to retire

- `GOLDEN_AGE` and `TRADE_OPPORTUNITY` in `all-crises.ts` — not crises (F-09). Move to narrative-events system.

---

## Missing items

1. `age_progress` trigger condition + handler (F-02).
2. `crisisPolicies`, `crisisPolicySlots`, `crisisPhase` on `PlayerState` + END_TURN gate (F-03).
3. `crisisLegacyUnlocked` + transition handler (F-07).
4. Per-age crisis pool with seeded RNG at age init (F-04).
5. `state.config.crises` injection seam (F-05).
6. Empire-size scaling factor (F-08).
7. `CityState.infected` + Physician unit (F-10).

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/crises.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/crisisSystem.ts` (one-shot model, not staged phase)
- `packages/engine/src/data/crises/all-crises.ts` (flat catalog)
- `packages/engine/src/data/crises/types.ts`
- `packages/web/src/ui/panels/CrisisPanel.tsx` (DramaModal wrapper, not persistent UI)

**Status:** 1 MATCH / 1 CLOSE / 3 DIVERGED / 4 MISSING / 1 EXTRA

**Highest-severity finding:** F-01 — crisis architecture fundamentally diverges (one-shot events vs staged phase with policy slots).

---

## Open questions

1. Is `crisisSystem` rewrite scheduled, or incremental patches preferred?
2. `empireScalingFactor` exact formula — linear, quadratic, or thresholded?
3. Physician unit abilities — infection-clear only, or broader civilian role?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-05, F-09 | 1d |
| M | F-02, F-03, F-04, F-06, F-07, F-08, F-10 | ~14d |
| L | F-01 | ~2w |
| **Total** | 10 | **~4w** |

Recommended order: F-05 (import seam) → F-02 (age-progress trigger) → F-03 (policy slots + gate) → F-04 (pool + RNG) → F-01 (full phase arch) → F-07 → F-08 → F-10 → F-06 (panel rebuild). F-09 is low-effort independent.

---

<!-- END OF AUDIT -->
