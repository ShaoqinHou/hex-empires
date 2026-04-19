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
| MATCH — code does what VII does | 2 |
| CLOSE — right shape, wrong specifics | 2 |
| DIVERGED — fundamentally different | 1 |
| MISSING — GDD describes, engine lacks | 4 |
| EXTRA — engine has, VII/GDD does not | 1 |

**Total findings:** 10

---

## Detailed findings

### F-01: `pack-unpack-system-absent` — MISSING

**Location:** `packages/engine/src/types/Commander.ts:199-221`
**GDD reference:** `systems/commanders.md` § "Pack / Unpack (Assemble and Deploy Army)"
**Severity:** HIGH
**Effort:** L (week+)
**VII says:** The core commander mechanic: ASSEMBLE_ARMY packs up to 4 adjacent units into a single formation that moves with the commander; DEPLOY_ARMY unpacks them to adjacent tiles with zero remaining movement (unless Initiative promotion active).
**Engine does:** CommanderAction defines PACK_COMMANDER and UNPACK_COMMANDER shapes as types only. Neither action is in GameAction, no system handler exists. commanderPromotionSystem.ts only handles XP gain and promotion picking — pack/unpack absent from the live engine pipeline.
**Gap:** The central VII mechanic — army formation movement — is TypeScript types only. No system function implements it.
**Recommendation:** Create commanderArmySystem.ts handling ASSEMBLE_ARMY / DEPLOY_ARMY. Add both to GameAction. Validate capacity against COMMANDER_BASE_STACK_CAP (4) and AURA_EXPAND_STACK promotion bonus. Deployed units get movementLeft: 0 unless Initiative promotion is present.

---

### F-02: `commander-state-not-in-gamestate` — MISSING

**Location:** `packages/engine/src/types/Commander.ts:163-172`, `packages/engine/src/types/GameState.ts:202-205`
**GDD reference:** `systems/commanders.md` § "Entities" — CommanderState
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Commanders carry dedicated state: xp, level, promotionPoints, promotions, commendations, packedUnits, packedCivilian, commandRadius.
**Engine does:** CommanderState fully defined in types/Commander.ts but NOT wired into GameState. GameState.ts line 202 notes XP and picks live on UnitState fields as a compat shim. GameState has no commanders: ReadonlyMap field.
**Gap:** CommanderState exists but is disconnected. attachedUnits, packed, tree, and commendations are unrepresentable in live state.
**Recommendation:** Add readonly commanders: ReadonlyMap<UnitId, CommanderState> to GameState. Migrate commanderPromotionSystem to read/write it. Prerequisite blocker for F-01, F-07, F-08.

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

### F-04: `xp-level-cap-off-by-one` — CLOSE

**Location:** `packages/engine/src/systems/commanderPromotionSystem.ts:58`
**GDD reference:** `systems/commanders.md` § "XP Accrual"
**Severity:** LOW
**Effort:** S (half-day)
**VII says:** XP thresholds increase progressively; max level is 5.
**Engine does:** LEVEL_THRESHOLDS = [0, 50, 150, 300, 500, 800] — six thresholds allowing level 6. Comment says published cap is level 5 but commanderLevelForXp returns 6 at 800+ XP. No hard cap enforced.
**Gap:** Level-6 threshold exists, contradicting the stated cap. A level-6 commander gains an extra pick with no defined promotion to spend it on.
**Recommendation:** Shorten LEVEL_THRESHOLDS to [0, 50, 150, 300, 500]. Add Math.min(level, 5) clamp in commanderLevelForXp.

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

### F-08: `commander-age-persistence-absent` — MISSING

**Location:** `packages/engine/src/systems/commanderPromotionSystem.ts`
**GDD reference:** `systems/commanders.md` § "Age Transition Persistence"
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Commanders are the ONLY unit type that explicitly survives age transitions with all state intact. Packed units not preserved. Fleet Commanders retain assigned naval units; unassigned ships lost.
**Engine does:** commanderPromotionSystem has no TRANSITION_AGE case. ageSystem has no commander-specific preservation. Without CommanderState in GameState, no persistent record survives an age boundary.
**Gap:** Commanders follow normal unit-loss rules on age transition (likely destroyed). The veteran-general arc across three ages is absent.
**Recommendation:** Add TRANSITION_AGE case preserving CommanderState records, clearing attachedUnits, applying Fleet Commander retention rule. Prerequisite: F-02.

---

### F-09: `panel-not-wired-and-uses-all-global` — CLOSE

**Location:** `packages/web/src/ui/panels/CommanderPanel.tsx:19,27-32`
**GDD reference:** `systems/commanders.md` § "UI requirements"
**Severity:** MED
**Effort:** S (half-day)
**VII says:** Commanders Panel must list all owned commanders with name, type, level, XP, location, packed count. Requires promotion tree screen, command radius HUD overlay, pack/unpack buttons, army composition indicator, reinforce button, respawn counter.
**Engine does:** CommanderPanel renders a read-only roster but is explicitly NOT wired into App.tsx. Also imports ALL_COMMANDERS and ALL_COMMANDER_PROMOTIONS directly (ALL_X-import-in-ui trap) instead of using state.config.
**Gap:** (1) Panel not in panelRegistry and cannot be opened; (2) ALL_X global imports violate the trap registry. Promotion tree graph, HUD overlay, action buttons, reinforce, respawn counter all absent.
**Recommendation:** Register commanders in panelRegistry.ts and wire into App.tsx per /add-panel skill. Replace ALL_X imports with state.config lookups via useGameState(). Defer tree graph and action buttons to later cycle.

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

- Pack/unpack army system (F-01) — the central VII commander mechanic; highest-effort prerequisite.
- CommanderState wired into GameState (F-02) — prerequisite blocker for F-01, F-07, F-08.
- Commendation system (F-03) — 5 named commendations earned by completing promotion trees.
- Commander respawn on defeat (F-07) — 20-turn timer, respawn at capital with all state intact.
- Commander age-transition persistence (F-08) — the only unit class that survives age transitions.

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/commanders.md` section "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/commanderPromotionSystem.ts`
- `packages/engine/src/types/Commander.ts`
- `packages/engine/src/data/commanders/`
- `packages/web/src/ui/panels/CommanderPanel.tsx`

**Status:** 2 MATCH / 2 CLOSE / 1 DIVERGED / 4 MISSING / 1 EXTRA (see `.claude/gdd/audits/commanders.md` for details)

**Highest-severity finding:** F-01 — Pack/unpack system absent (MISSING — the central VII army formation mechanic is TypeScript types only, no system implementation)

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
| S (half-day) | F-04, F-05, F-06, F-09, F-10 | 2.5d |
| M (1-3 days) | F-02, F-03, F-07, F-08 | ~8d |
| L (week+) | F-01 | ~2w |
| **Total** | 10 | **~3w** |

Recommended order: F-02 (GameState wiring, prerequisite blocker), F-09 (panel wire-up + import fix), F-04 (level cap), F-01 (army system, largest), F-07 + F-08 in parallel once F-02 done, F-03 (commendations, last).

---

<!-- END OF AUDIT TEMPLATE -->
