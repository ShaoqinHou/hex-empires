# Independent Powers - hex-empires Audit

**System slug:** `independent-powers`
**GDD doc:** [systems/independent-powers.md](../systems/independent-powers.md)
**Audit date:** `2026-05-02`
**Auditor:** `codex`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/types/GameState.ts`
- `packages/engine/src/state/IPStateFactory.ts`
- `packages/engine/src/systems/independentPowerSystem.ts`
- `packages/engine/src/systems/ageSystem.ts`
- `packages/engine/src/GameEngine.ts`
- `packages/engine/src/data/independent-powers/`
- `packages/engine/src/data/leaders/all-leaders.ts`
- `packages/web/src/ui/panels/DiplomacyPanel.tsx`
- `packages/web/src/ui/panels/panelRegistry.ts`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 2 |
| CLOSE | 6 |
| DIVERGED | 0 |
| MISSING | 0 |
| EXTRA | 0 |

**Total findings:** 8

---

## Detailed findings

### F-01: Independent Power state and action surface exist -- MATCH

**Location:** `packages/engine/src/types/GameState.ts:425-429,1054-1064,1113,1363-1377`; `packages/engine/src/state/IPStateFactory.ts:10-28`
**GDD reference:** `systems/independent-powers.md` section "Entities"
**Severity:** HIGH
**Effort:** M
**VII says:** `GameState.independentPowers` tracks typed Independent Powers with attitude, befriend progress, suzerain, incorporated state, city-state conversion state, and bonus pool. Player state tracks suzerainties and selected suzerain bonuses. Actions cover befriending, support, raid incitement, suzerain actions, incorporation, dispersal, and bonus selection.
**Engine does:** `IndependentPowerState`, `GameState.independentPowers`, `PlayerState.suzerainties`, `PlayerState.suzerainBonuses`, and the IP action union are present. `createDefaultIPState` now starts entries as `isCityState: false`; `grantSuzerainty` converts them to `isCityState: true`.
**Gap:** None for the local type/action surface.
**Recommendation:** Keep the lifecycle invariant explicit: Independent Power -> befriended city-state -> incorporated settlement.

---

### F-02: Dedicated independentPowerSystem is wired but behavior depth is still partial -- CLOSE

**Location:** `packages/engine/src/systems/independentPowerSystem.ts`; `packages/engine/src/GameEngine.ts:39,112`
**GDD reference:** `systems/independent-powers.md` sections "Triggers" and "Mechanics"
**Severity:** HIGH
**Effort:** L
**VII says:** The IP system owns befriend progress, exclusive suzerainty, suzerain actions, hostile behavior, incorporation, dispersal, and bonus choice.
**Engine does:** `independentPowerSystem` is in `DEFAULT_SYSTEMS` after diplomacy. It handles `BEFRIEND_INDEPENDENT`, `ADD_SUPPORT`, `INCITE_RAID`, `BOLSTER_MILITARY`, `PROMOTE_GROWTH`, `LEVY_UNIT`, `INCORPORATE`, `DISPERSE`, `SUZERAIN_BONUS_SELECTED`, and `END_TURN`. It deducts influence, grants exclusive suzerainty at 60 progress, logs actions, and has focused system tests.
**Gap:** Several actions are still simplified: bolster/promote/levy are log-only, automatic per-turn befriend progress is not modeled, and hostile behavior emits logs instead of units. The system exists and is wired, but not yet mechanically complete.
**Recommendation:** Split remaining behavior into small slices: real suzerain action effects, automatic progress rules, and hostile unit spawning/pathing.

---

### F-03: Age-transition reset removes and reseeds IPs -- MATCH

**Location:** `packages/engine/src/systems/ageSystem.ts:213-239,395`
**GDD reference:** `systems/independent-powers.md` section "Age Transition - Full Reset"
**Severity:** HIGH
**Effort:** S
**VII says:** On age transition, unincorporated IPs and city-states reset; incorporated settlements survive; suzerainties clear; the next age gets a fresh IP set.
**Engine does:** `ageSystem` keeps incorporated IPs, removes non-incorporated entries, reseeds IPs whose config age matches the next age, clears all players' `suzerainties`, and clears `suzerainBonuses`.
**Gap:** None for the local reset model.
**Recommendation:** Keep age reset tests tied to both removal and suzerainty clearing so future transition refactors do not leak old-age city-states.

---

### F-04: Suzerain bonus selection state exists, but bonus effects and selection UX are incomplete -- CLOSE

**Location:** `packages/engine/src/systems/independentPowerSystem.ts:257-283`; `packages/engine/src/types/GameState.ts:425-429,1063`
**GDD reference:** `systems/independent-powers.md` section "Suzerain Status and Bonus Selection"
**Severity:** HIGH
**Effort:** M
**VII says:** On befriending completion, the winning player chooses from a 2-3 option pool tied to city-state type; chosen bonuses deplete the pool and produce gameplay effects, many scaling with same-type suzerain count.
**Engine does:** `bonusPool` exists, `SUZERAIN_BONUS_SELECTED` validates that the player is suzerain, removes the selected bonus from the pool, and stores the selected bonus id on `PlayerState.suzerainBonuses`.
**Gap:** Selected bonus ids are not yet applied as effects, the player-facing choice flow is thin, and same-type scaling is not implemented.
**Recommendation:** Add effect definitions/evaluation for selected suzerain bonuses before adding more bonus content.

---

### F-05: Hostile IP and INCITE_RAID are present, but no real raider units spawn -- CLOSE

**Location:** `packages/engine/src/systems/independentPowerSystem.ts:161-186,287-325`; `packages/engine/src/systems/__tests__/independentPowerSystem.test.ts`
**GDD reference:** `systems/independent-powers.md` sections "Hostile IPs - Military Threat" and "Incite Raid"
**Severity:** HIGH
**Effort:** M
**VII says:** Hostile IPs replace barbarians by spawning military units toward settlements; `INCITE_RAID` spends 30 Influence to weaponize a hostile/neutral IP against a rival for a short duration.
**Engine does:** `INCITE_RAID` costs 30 Influence, rejects incorporated IPs, rejects converted city-states, flips the target IP to hostile, and logs the raid. `END_TURN` emits hostile-IP raid log entries on a three-turn cadence.
**Gap:** There is no spawned unit, raid target state, duration counter, settlement targeting, or pathing behavior. The current implementation is a traceable placeholder rather than a gameplay threat.
**Recommendation:** Add explicit raid state and spawned NPC unit ownership before tuning hostile IP AI.

---

### F-06: Named IP data registry exists but roster and map seeding remain minimal -- CLOSE

**Location:** `packages/engine/src/data/independent-powers/`; `packages/engine/src/types/GameConfig.ts`; `packages/engine/src/state/GameConfigFactory.ts`
**GDD reference:** `systems/independent-powers.md` section "Content flowing through this system"
**Severity:** MED
**Effort:** S skeleton, M full roster
**VII says:** Named factions have type, default attitude, suzerain bonus pool, age, and map seeding data. The roster is broad and age-aware.
**Engine does:** A data directory and registry exist with entries including Carantania, Etelkoz, Kumbi Saleh, Samarkand, Tilantongo, and Zanzibar. Config creation exposes the registry to systems.
**Gap:** The roster is still small, entries use placeholder positions from `createDefaultIPState`, and map generation does not yet place IPs as real settlements/outposts.
**Recommendation:** Add roster content only after map placement and bonus effects have stable mechanics to attach to.

---

### F-07: DiplomacyPanel has an Independent Powers tab, with panel-priority drift -- CLOSE

**Location:** `packages/web/src/ui/panels/DiplomacyPanel.tsx:11,48-52,337-467`; `packages/web/src/ui/panels/panelRegistry.ts:77`
**GDD reference:** `systems/independent-powers.md` section "UI requirements"
**Severity:** MED
**Effort:** S frame, M full
**VII says:** The main leader/diplomacy surface lists discovered Independents and City-States, attitude, befriend progress, and Influence actions.
**Engine does:** `DiplomacyPanel` has an `Ind. Powers` tab that reads `state.independentPowers`, displays non-incorporated entries, and dispatches IP actions such as befriending and suzerain bonus selection. `panelRegistry` classifies diplomacy as `overlay`.
**Gap:** `DiplomacyPanel` still passes `priority="info"` to `PanelShell`, drifting from the registry. Discovery filtering, detailed costs, and full bonus-selection UX remain thin.
**Recommendation:** Align the component priority with the registry, then deepen the tab once bonus effects and raid units exist.

---

### F-08: Pericles no longer has a wrong flat culture effect, but dynamic suzerain scaling is not implemented -- CLOSE

**Location:** `packages/engine/src/data/leaders/all-leaders.ts:79-91`
**GDD reference:** `systems/independent-powers.md` section "Suzerain bonus stacking"
**Severity:** LOW
**Effort:** S
**VII says:** Pericles' Delian League / Surrounded by Glory effect scales culture by number of city-states held as suzerain.
**Engine does:** The former flat `MODIFY_YIELD culture +2` effect has been removed; comments now flag that dynamic `MODIFY_YIELD_PER_SUZERAIN` support is needed before the effect can be represented.
**Gap:** Dynamic per-suzerain yield scaling is still unsupported in the effect engine.
**Recommendation:** Add a dynamic effect shape or leader-specific effect evaluator once suzerainty counts are stable.

---

## Close follow-ups

- F-02: implement real suzerain action effects and automatic progress rules.
- F-04: apply selected suzerain bonus effects and build a proper choice surface.
- F-05: create explicit raid state plus spawned hostile units.
- F-06: expand roster after map placement and bonus effects are stable.
- F-07: align DiplomacyPanel priority with panelRegistry and add discovery filtering.
- F-08: implement dynamic Pericles suzerain-count culture scaling.

---

## Missing items

None as total absences. Remaining work is partial-implementation depth.

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/independent-powers.md` section "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/types/GameState.ts`
- `packages/engine/src/state/IPStateFactory.ts`
- `packages/engine/src/systems/independentPowerSystem.ts`
- `packages/engine/src/systems/ageSystem.ts`
- `packages/engine/src/data/independent-powers/`
- `packages/web/src/ui/panels/DiplomacyPanel.tsx`

**Status:** 2 MATCH / 6 CLOSE / 0 DIVERGED / 0 MISSING / 0 EXTRA

**Highest-severity finding:** F-05 - hostile Independent Powers and `INCITE_RAID` are present but still log-only instead of spawning and directing real units.

---

## Open questions

1. Should IPs be placed by map generation as settlements/outposts, or only instantiated by age seed data first?
2. Should `INCITE_RAID` support neutral IPs only, hostile IPs only, or both before city-state conversion?
3. What effect representation should selected suzerain bonuses use so Pericles and same-type scaling can share it?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-07, F-08 | ~1d |
| M | F-02, F-04, F-05, F-06 | ~8d |
| L | - | 0 |
| **Total** | 6 close follow-ups | **~2w** |

Recommended order: F-07 -> F-04 -> F-08 -> F-05 -> F-02 -> F-06.

---

<!-- END OF AUDIT -->
