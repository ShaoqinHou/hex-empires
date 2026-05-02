# Commanders — hex-empires Audit

**System slug:** `commanders`
**GDD doc:** [systems/commanders.md](../systems/commanders.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0 (per commitment.md)

---

## Engine files audited

- `packages/engine/src/systems/commanderPromotionSystem.ts`
- `packages/engine/src/types/Commander.ts`
- `packages/engine/src/data/commanders/commanders.ts`
- `packages/engine/src/data/commanders/promotion-trees.ts`
- `packages/engine/src/data/commanders/index.ts`
- `packages/web/src/ui/panels/CommanderPanel.tsx`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH — code does what VII does | 3 |
| CLOSE — right shape, wrong specifics | 3 |
| DIVERGED — fundamentally different | 1 |
| MISSING — GDD describes, engine lacks | 1 |
| EXTRA — engine has, VII/GDD does not | 2 |

**Total findings:** 10

---

## Detailed findings

### F-01: `pack-unpack-system-present-with-duplicate-paths` — CLOSE

**Location:** `packages/engine/src/systems/commanderArmySystem.ts`; `packages/engine/src/types/GameState.ts`
**GDD reference:** `systems/commanders.md` § "Pack / Unpack (Assemble and Deploy Army)"
**Severity:** HIGH
**Effort:** L (week+)
**VII says:** The core commander mechanic: ASSEMBLE_ARMY packs up to 4 adjacent units into a single formation that moves with the commander; DEPLOY_ARMY unpacks them to adjacent tiles with zero remaining movement (unless Initiative promotion active).
**Engine does:** `commanderArmySystem` handles `ASSEMBLE_ARMY`/`DEPLOY_ARMY` plus legacy `PACK_ARMY`/`UNPACK_ARMY`. Deploy/unpack clears packed flags, places units adjacent to the commander, and sets deployed unit `movementLeft: 0`.
**Gap:** There are still two parallel pack models (`packedInCommanderId` vs removed-unit snapshots), no Initiative/Weather Gage immediate-move exception, and no full formation-order UI.
**Recommendation:** Consolidate onto one pack model, then add promotion exceptions and action-bar UI.

---

### F-02: `commander-state-wired-in-gamestate` — MATCH

**Location:** `packages/engine/src/types/Commander.ts:163-172`, `packages/engine/src/types/GameState.ts:202-205`
**GDD reference:** `systems/commanders.md` § "Entities" — CommanderState
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Commanders carry dedicated state: xp, level, promotionPoints, promotions, commendations, packedUnits, packedCivilian, commandRadius.
**Engine does:** `GameState.commanders` exists, the initializer seeds it, and commander army/combat tests exercise it as live state.
**Gap:** Promotion XP still partly lives on `UnitState` for compatibility, so a final migration remains.
**Recommendation:** Move commander XP/promotions fully into `CommanderState` in the promotion cleanup slice.

---

### F-03: `promotion-trees-wrong-shape` — DIVERGED

**Location:** `packages/engine/src/data/commanders/promotion-trees.ts`, `packages/engine/src/types/Commander.ts:47-52`
**GDD reference:** `systems/commanders.md` § "Promotion System"
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Five independent trees (Bastion/Assault/Logistics/Maneuver/Leadership), each with 6 nodes (30 total). Any-tree picks allowed. Completing a tree earns 1 Commendation Point; 5 named commendations: Valor, Duty, Service, Merit, Order.
**Engine does:** Five trees with 2-3 nodes each (16 total). Generic aura names not GDD-named. Commander.ts enforces single-tree lock via SELECT_COMMANDER_TREE — not a VII rule. Commendation system absent.
**Gap:** Three divergences: (1) 16 nodes vs GDD 30; (2) single-tree lock invented locally; (3) commendation system entirely missing.
**Recommendation:** Remove SELECT_COMMANDER_TREE and single-tree lock. Expand each tree to GDD-named promotions. Add CommendationDef type and commendations to CommanderState. Add EARN_COMMENDATION trigger when all 6 nodes of a tree are picked.

---

### F-04: `xp-level-cap-off-by-one` — MATCH

**Location:** `packages/engine/src/systems/commanderPromotionSystem.ts:58`
**GDD reference:** `systems/commanders.md` § "XP Accrual"
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** XP thresholds increase progressively; max level is 5.
**Engine does:** `LEVEL_THRESHOLDS = [0, 50, 150, 300, 500]` and `commanderLevelForXp` hard-caps at 5.
**Gap:** None for the off-by-one cap.
**Recommendation:** Keep threshold source verification as an open question, but do not reintroduce level 6.

---

### F-05: `commander-as-combat-unit-compat-shim` — MATCH

**Location:** `packages/engine/src/data/commanders/commanders.ts:49-60`
**GDD reference:** `systems/commanders.md` § "VII-specific"
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** Commanders are non-combatants — they do not deal damage. They are a dedicated unit class distinct from military units.
**Engine does:** CommanderUnitDef has combat values (15/25/40) and category: melee|naval|ranged as explicit compat fallback. Code comment calls this temporary until the commander pipeline lands.
**Gap:** Compat shim is intentional and documented. Architecture correctly anticipates the final design. MATCH on intent for cycle C.
**Recommendation:** No immediate action. When cycle D lands, zero out combat values and add noCombat: true to CommanderUnitDef.

---

### F-06: `air-commander-extra` — EXTRA

**Location:** `packages/engine/src/data/commanders/commanders.ts:140-151`
**GDD reference:** `systems/commanders.md` § "Entities" — two commander types only
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** Two commander types: Army Commander (land) and Fleet Commander (naval). Air commanders not confirmed in any source.
**Engine does:** AIR_GENERAL is a modern-era role: air commander with auraRadius: 2 (all others are 1). CommanderRole includes air as a third value.
**Gap:** AIR_GENERAL and the air role have no VII source. Added alongside modern air units (M17) as an inferred extension.
**Recommendation:** Mark AIR_GENERAL and CommanderRole air as [CUSTOM-EXTENSION]. Keep if desired but exclude from VII-parity metrics.

---

### F-07: `commander-respawn-absent` — MISSING

**Location:** `packages/engine/src/types/Commander.ts`, all systems
**GDD reference:** `systems/commanders.md` § "Respawn on Defeat"
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Commanders cannot permanently die. On defeat: removed from map, 20-turn respawn timer, respawn at capital with all promotions and XP retained.
**Engine does:** No respawnTurnsRemaining field in CommanderState. No defeat handler in any commander system. A defeated commander follows normal unit-destruction path and is permanently lost.
**Gap:** Respawn-on-defeat rule entirely unimplemented. Veterans accumulated over multiple wars permanently lost on defeat.
**Recommendation:** Add respawnTurnsRemaining: number | null to CommanderState. Add defeat handler setting respawnTurnsRemaining = 20 and removing from map. Add END_TURN decrement and capital-respawn trigger. Prerequisite: F-02.

---

### F-08: `commander-age-persistence-partial` — CLOSE

**Location:** `packages/engine/src/systems/commanderPromotionSystem.ts`
**GDD reference:** `systems/commanders.md` § "Age Transition Persistence"
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Commanders are the ONLY unit type that explicitly survives age transitions with all state intact. Packed units not preserved. Fleet Commanders retain assigned naval units; unassigned ships lost.
**Engine does:** `ageSystem` does not clear `state.commanders`, so commander records persist across age transitions by default.
**Gap:** Age-transition-specific commander rules are incomplete: attached/packed unit handling and Fleet Commander naval-retention rules are not explicit.
**Recommendation:** Add a commander age-transition cleanup that preserves commanders, clears invalid packed land units, and implements Fleet Commander retention.

---

### F-09: `panel-wired-but-read-only` — CLOSE

**Location:** `packages/web/src/ui/panels/CommanderPanel.tsx:19,27-32`
**GDD reference:** `systems/commanders.md` § "UI requirements"
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Commanders Panel must list all owned commanders with name, type, level, XP, location, packed count. Requires promotion tree screen, command radius HUD overlay, pack/unpack buttons, army composition indicator, reinforce button, respawn counter.
**Engine does:** `CommanderPanel` is registered in `panelRegistry`, opened from `TopBar`, and lazy-wired in `App.tsx`. It remains a read-only roster and imports commander catalogues through the engine barrel.
**Gap:** Promotion tree graph, command radius HUD, pack/unpack buttons, reinforce, respawn counter, and state.config-driven catalog lookups remain incomplete.
**Recommendation:** Move display lookup to `state.config` and add action controls after pack-model consolidation.

---

### F-10: `partisan-leader-extra` — EXTRA

**Location:** `packages/engine/src/data/commanders/commanders.ts:159-170`
**GDD reference:** `systems/commanders.md` — no guerrilla/partisan commander subtype documented
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** Army Commanders single class; Fleet Commanders second class. No partisan sub-type documented.
**Engine does:** PARTISAN_LEADER is an Exploration-era ground commander with lower combat (18 vs General 25) and higher movement (3 vs 2), designed to pair with the maneuver guerrilla promotion branch.
**Gap:** PARTISAN_LEADER and matching guerrilla promotions (maneuver_ambush, maneuver_hit_and_run, maneuver_guerilla_war) are custom extensions with no VII backing.
**Recommendation:** Mark PARTISAN_LEADER as [CUSTOM-EXTENSION]. Acceptable as custom content but exclude from VII-parity metrics.

---

## Extras to retire

- `packages/engine/src/types/Commander.ts` SELECT_COMMANDER_TREE action — single-tree lock not in VII; retire (F-03).
- `packages/engine/src/data/commanders/commanders.ts` AIR_GENERAL — no VII backing; mark as custom extension (F-06).
- `packages/engine/src/data/commanders/commanders.ts` PARTISAN_LEADER — no VII backing; mark as custom extension (F-10).

---

## Missing items

- Commander respawn on defeat (F-07) — 20-turn timer, respawn at capital with all state intact.
- Commendation system (F-03) — 5 named commendations earned by completing promotion trees.
- Commander pack-model consolidation and Initiative/Weather Gage deployment exception (F-01).
- Explicit commander age-transition cleanup, especially Fleet Commander retention rules (F-08).

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/commanders.md` section "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/commanderPromotionSystem.ts`
- `packages/engine/src/systems/commanderArmySystem.ts`
- `packages/engine/src/types/Commander.ts`
- `packages/engine/src/types/GameState.ts`
- `packages/engine/src/data/commanders/`
- `packages/web/src/ui/panels/CommanderPanel.tsx`

**Status:** 3 MATCH / 3 CLOSE / 1 DIVERGED / 1 MISSING / 2 EXTRA (see `.codex/gdd/audits/commanders.md` for details)

**Highest-severity finding:** F-07 — commander respawn on defeat is still absent; F-01 remains a consolidation/polish gap, not an absent system.

---

## Open questions

- Exact XP thresholds per level not published; current [0,50,150,300,500] values are community estimates.
- Discipline civic unlock confirmed; production cost for additional commanders not published.
- Commendation cooldown: Valor and Duty noted as 3 turns inferred; Coordinated Assault cooldown inferred same.
- Happiness reduction formula scope and cap unconfirmed.
- Whether PARTISAN_LEADER should become a civ-unique commander variant rather than a generic archetype.

---

## Effort estimate

| Bucket | Findings | Estimated total effort |
|---|---|---|
| S (half-day) | F-05, F-06, F-09, F-10 | 2d |
| M (1-3 days) | F-01, F-02 cleanup, F-03, F-07, F-08 | ~10d |
| L (week+) | none currently scoped | 0 |
| **Total** | 10 | **~2w** |

Recommended order: F-01 pack-model consolidation → F-08 explicit age-transition commander cleanup → F-07 respawn → F-03 promotion tree/commendations → F-09 action UI/config lookup → F-06/F-10 custom-extension tagging.

---

<!-- END OF AUDIT TEMPLATE -->
