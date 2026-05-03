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
| CLOSE — right shape, wrong specifics | 4 |
| DIVERGED — fundamentally different | 1 |
| MISSING — GDD describes, engine lacks | 0 |
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
**Engine does:** `commanderArmySystem` now routes `ASSEMBLE_ARMY`/`PACK_ARMY` through one snapshot-based pack model: packed units are removed from `state.units`, stored as `CommanderState.packedUnitStates`, restored by `DEPLOY_ARMY`/`UNPACK_ARMY`, placed adjacent to the commander, and normally set to `movementLeft: 0`. The base pack cap is 4 units, and `AURA_EXPAND_STACK` promotions such as Logistics `logistics_regiments` raise it to 6. `AURA_DEPLOY_WITH_MOVEMENT` preserves remaining movement, and Assault `assault_initiative` provides that effect. Legacy `packedInCommanderId` states still deploy through a compatibility fallback.
**Gap:** The core pack model is consolidated, but the legacy marker remains for saved-state compatibility, there is no Fleet Commander Weather Gage equivalent, no full formation-order UI, and packed snapshots do not refresh while removed from `state.units`.
**Recommendation:** Add Weather Gage after Fleet Commander promotion data is sourced, expose action-bar UI, and retire the legacy `packedInCommanderId` fallback after a save migration decision.

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

**Location:** `packages/engine/src/data/commanders/promotion-trees.ts`, `packages/engine/src/types/Commander.ts`, `packages/engine/src/systems/commanderPromotionSystem.ts`, `packages/engine/src/state/CommanderAura.ts`
**GDD reference:** `systems/commanders.md` § "Promotion System"
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Five independent Army Commander trees use named promotion nodes. Source refresh 2026-05-03: Fandom List_of_promotions_in_Civ7 lists Bastion I Steadfast -> II Bulwark/Hold the Line -> III Defilade/Garrison -> IV Resolute; Assault I Initiative -> II Rout/Storm -> III Shock Tactics/Enfilade -> IV Advancement; Logistics I Quartermaster/Recruitment -> II Regiments -> III Field Medic/Looting -> IV Survival Training; Maneuver I Mobility -> II Harassment/Redeploy -> III Amphibious/Pathfinder -> IV Area Denial; and Leadership I Zeal -> II Field Commission -> III Old Guard/Resilience -> IV Barrage/Onslaught. Completing a tree earns 1 Commendation Point; 5 named commendations: Valor, Duty, Service, Merit, Order. Fandom lists Onslaught as +4 CS with Coordinated Attack, while Game8 lists +5; local data follows Fandom pending a target-patch refresh.
**Engine does:** Five trees are present. Army Assault, Logistics, Bastion, Maneuver, and Leadership now match the refreshed source node shape. `assault_advancement` grants First Strike to the local infantry proxy (`melee`) and cavalry. Bastion Steadfast gives +2 defending CS to local land military categories (`melee`, `ranged`, `cavalry`, `siege`) in Command Radius. Bastion Hold the Line gives +2 CS to land units stationed on a District or city center (local City Center is treated as a district tile) in Command Radius, Bastion Defilade gives +3 defending CS to fortified land units in Command Radius, and Bastion Resolute heals surviving matching land attackers 5 HP after attacking; these affect live combat and combat preview through `CommanderAura`. Logistics Quartermaster grants +1 Gold per packed unit during `resourceSystem` end-turn income. Logistics Recruitment grants +15% production toward land military units while a promoted commander is stationed on the producing city's district, city center, or V2 urban tile through `productionSystem`. Logistics Field Medic adds +5 healing to matching land military units in Command Radius during `turnSystem` START_TURN healing when they are in neutral or enemy territory. Leadership Field Commission lets land units in Command Radius upgrade outside friendly territory and heals 10 HP on upgrade through `movementSystem`. Leadership Resilience reduces commander respawn duration from 20 to 10 turns through `CommanderRespawn`. Bastion Bulwark, Garrison, Looting, Survival Training, most Maneuver effects, and remaining Leadership effects are represented as typed metadata aura variants for later hooks. `logistics_regiments` is wired to the pack-cap path through `AURA_EXPAND_STACK`, so the engine allows 4 packed units by default and 6 only after Regiments. The engine supports `AURA_DEPLOY_WITH_MOVEMENT`, attack/defense conditioned `AURA_MODIFY_CS`, district/fortified combat-aura filters, `AURA_GRANT_ABILITY`, `AURA_HEAL_PER_TURN`, `AURA_EXPAND_STACK`, and OR-style promotion prerequisites. The AI commander picker also honors OR prerequisites.
**Gap:** Army promotion data shape is now canonical, but three broader divergences remain: (1) many metadata-only effects still lack runtime hooks, including Bulwark, Garrison, Looting, Survival Training, Maneuver hooks, and Leadership settlement/command-action hooks; (2) legacy single-tree lock/action shapes are still present; (3) the commendation system is absent.
**Recommendation:** Continue F-03 by wiring typed metadata effects into their owning systems in small slices, remove single-tree-lock remnants, add CommendationDef/CommanderState fields, and earn commendations when a full tree is completed.

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

### F-07: `commander-respawn-base-present` — CLOSE

**Location:** `packages/engine/src/types/Commander.ts`, `packages/engine/src/state/CommanderRespawn.ts`, `packages/engine/src/systems/commanderRespawnSystem.ts`, `packages/engine/src/systems/combatSystem.ts`, `packages/engine/src/GameEngine.ts`
**GDD reference:** `systems/commanders.md` § "Respawn on Defeat"
**Severity:** MED
**Effort:** M (1-3 days)
**VII says:** Commanders cannot permanently die. On defeat: removed from map, 20-turn standard-speed recovery, then respawn with all promotions and XP retained. Source refresh 2026-05-03: Fandom Commander_(Civ7) says nearest Settlement after 20 turns; community/player reports and the local GDD say capital; official 2K update notes confirm commanders can be "respawning" and still receive tech abilities.
**Engine does:** Combat now marks defeated commanders with a sanitized `respawnUnitState` instead of losing the commander record. Base recovery is 20 turns, and Leadership Resilience initializes recovery at 10 turns through `CommanderRespawn`. `commanderRespawnSystem` ticks on the owner `START_TURN`, restores the recovered commander at the owned capital (fallback: first owned settlement), and is wired after combat but before visibility so respawns participate in same-turn fog recalculation. Commander XP/level/promotions are retained; live legacy packed units are released, and snapshot-packed units rout onto adjacent free tiles when their commander is defeated.
**Gap:** Base respawn and the Resilience modifier exist, but exact location semantics remain sourced-conflicting (capital vs nearest settlement), game-speed/memento recovery modifiers are absent, the UI has no respawn counter, and routed packed units do not yet model HP loss or destruction when there is insufficient room.
**Recommendation:** Add game-speed and memento recovery-time modifiers once those states exist, expose the respawn counter in the Commander panel/action UI, and resolve packed snapshot deployment during F-01 pack-model consolidation.

---

### F-08: `commander-age-persistence-partial` — CLOSE

**Location:** `packages/engine/src/systems/ageSystem.ts`; `packages/engine/src/systems/__tests__/ageSystem-commander-transition.test.ts`
**GDD reference:** `systems/commanders.md` § "Age Transition Persistence"
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Commanders are the ONLY unit type that explicitly survives age transitions with all state intact. Packed units not preserved. Fleet Commanders retain assigned naval units; unassigned ships lost.
**Engine does:** `ageSystem` preserves commander records and now applies commander-specific transition cleanup for the transitioning player. Ground/non-fleet commanders keep XP, level, promotions, respawn state, and commander units, but enter the next age unpacked with packed ordinary units cleared. Exploration → Modern Fleet Commanders retain only assigned naval packed units as snapshots, drop non-naval packed entries, and unassigned owned naval units are removed while enemy naval units are untouched.
**Gap:** The commander-specific age rule is now explicit, but the broader generic unit obsolescence/upgrade pipeline is still incomplete, fleet retention is snapshot-only with no UI summary, and exact VII distribution/placement behavior after transition remains a future refinement.
**Recommendation:** Add a UI age-transition summary for carried commanders/fleet slots, then address generic unit obsolescence/upgrades in the age-system unit-retirement slice.

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
**Engine does:** PARTISAN_LEADER is an Exploration-era ground commander with lower combat (18 vs General 25) and higher movement (3 vs 2). It remains a local custom archetype after the former custom Maneuver guerrilla-promotion branch was removed.
**Gap:** PARTISAN_LEADER is a custom commander archetype with no VII backing. Its former custom guerrilla-promotion branch was removed when Maneuver was canonicalized to the Civ VII node list.
**Recommendation:** Mark PARTISAN_LEADER as [CUSTOM-EXTENSION]. Acceptable as custom content but exclude from VII-parity metrics.

---

## Extras to retire

- `packages/engine/src/types/Commander.ts` SELECT_COMMANDER_TREE action — single-tree lock not in VII; retire (F-03).
- `packages/engine/src/data/commanders/commanders.ts` AIR_GENERAL — no VII backing; mark as custom extension (F-06).
- `packages/engine/src/data/commanders/commanders.ts` PARTISAN_LEADER — no VII backing; mark as custom extension (F-10).

---

## Missing items

- Remaining commander promotion hooks (F-03) — Bulwark fortify duration, Garrison fortified-district HP, Looting pillage yield/HP, Survival Training terrain/cliff behavior, Maneuver movement/flanking/amphibious/pathfinding/ZoC behavior, and Leadership settlement/command-action behavior.
- Commendation system (F-03) — 5 named commendations earned by completing promotion trees.
- Commander pack-model consolidation and Fleet Commander Weather Gage deployment exception (F-01).
- Commander age-transition follow-ups (F-08) — UI transition summary, exact Fleet Commander retained-unit placement behavior, and the generic unit retirement/upgrade pipeline.

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

**Status:** 3 MATCH / 4 CLOSE / 1 DIVERGED / 0 MISSING / 2 EXTRA (see `.codex/gdd/audits/commanders.md` for details)

**Highest-severity finding:** F-01 — pack/unpack is present but still has duplicate state models and unresolved removed-unit snapshot behavior.

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
| M (1-3 days) | F-01, F-02 cleanup, F-03, F-08 | ~8d |
| L (week+) | none currently scoped | 0 |
| **Total** | 10 | **~2w** |

Recommended order: F-01 pack-model consolidation → F-08 explicit age-transition commander cleanup → F-03 remaining promotion hooks/commendations → F-09 action UI/config lookup → F-06/F-10 custom-extension tagging.

---

<!-- END OF AUDIT TEMPLATE -->
