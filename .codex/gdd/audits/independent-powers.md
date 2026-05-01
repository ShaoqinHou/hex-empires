# Independent Powers — hex-empires Audit

**System slug:** `independent-powers`
**GDD doc:** [systems/independent-powers.md](../systems/independent-powers.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/types/GameState.ts` (no IP fields)
- `packages/engine/src/systems/diplomacySystem.ts` (no IP handlers)
- `packages/engine/src/data/leaders/all-leaders.ts` (Pericles ability diverged)
- `packages/engine/src/data/` (no `independent-powers/` directory)
- `packages/web/src/ui/panels/DiplomacyPanel.tsx`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 1 |
| CLOSE | 1 |
| DIVERGED | 1 |
| MISSING | 5 |
| EXTRA | 0 |

**Total findings:** 8

---

## Detailed findings

### F-01: `IndependentPowerState` entity absent — MISSING

**Location:** `types/GameState.ts`
**GDD reference:** `systems/independent-powers.md` § "Entities"
**Severity:** HIGH
**Effort:** M
**VII says:** `GameState.independentPowers: ReadonlyMap<id, IndependentPowerState>`. Each entry: `{ id, type, attitude, befriendProgress, suzerainPlayerId, isIncorporated, isCityState }`. 6 type categories: militaristic/cultural/scientific/economic/diplomatic/expansionist.
**Engine does:** No `independentPowers` field on `GameState`. No `IndependentPowerState` interface. `GameAction` union has no BEFRIEND_INDEPENDENT, ADD_SUPPORT, INCITE_RAID, BOLSTER_MILITARY, PROMOTE_GROWTH, LEVY_UNIT, INCORPORATE, or DISPERSE. `PlayerState` has no `suzerainties` or `suzerainBonuses`.
**Gap:** Zero engine representation.
**Recommendation:** Add `IndependentPowerState` type. Add `GameState.independentPowers` Map. Add 7 IP actions to `GameAction` union. Create `data/independent-powers/` content directory.

---

### F-02: `independentPowerSystem.ts` absent — MISSING

**Location:** `systems/` (no file)
**GDD reference:** `systems/independent-powers.md` § "Triggers", "Mechanics"
**Severity:** HIGH
**Effort:** L
**VII says:** Handles 9 triggers: START_OF_AGE re-seed, END_TURN befriend-progress increment, 7 player actions. Befriend threshold = 60 points at 2 pts/turn base; first player to threshold wins exclusive suzerainty.
**Engine does:** No system file. `diplomacySystem.ts` handles only inter-player relations. No NPC faction pipeline slot.
**Gap:** Largest single Influence-spend category (Incorporate 240/480/720 vs Endeavor 50) has no pipeline.
**Recommendation:** Create `independentPowerSystem.ts`. Register in `GameEngine` pipeline after `diplomacySystem`. Wire START_OF_AGE to `ageSystem`.

---

### F-03: Age-transition IP reset absent — MISSING

**Location:** `systems/ageSystem.ts`
**GDD reference:** `systems/independent-powers.md` § "Age Transition — Full Reset"
**Severity:** HIGH
**Effort:** S (after F-01/F-02)
**VII says:** On TRANSITION_AGE: all unincorporated IPs + non-incorporated city-states removed; `independentPowers` cleared + re-seeded for new age; all `suzerainties` cleared. Incorporated settlements survive as Towns.
**Engine does:** `ageSystem.ts` has no code touching `independentPowers` (field doesn't exist).
**Gap:** Sharpest divergence from Civ VI city-states (VII age-reset) absent.
**Recommendation:** After F-01: remove non-incorporated entries, clear `suzerainties`, seed fresh set via seeded-RNG from config.

---

### F-04: Suzerain bonus selection absent — MISSING

**Location:** `types/GameState.ts` (PlayerState), `web/src/ui/panels/`
**GDD reference:** `systems/independent-powers.md` § "Suzerain Status and Bonus Selection"
**Severity:** HIGH
**Effort:** M
**VII says:** On Befriend completion, winning player chooses from 2-3 option pool tied to city-state type. Chosen bonus removed from pool; later same-type suzerains get smaller selection. Many bonuses scale with same-type suzerain count.
**Engine does:** `PlayerState` has no `suzerainties`/`suzerainBonuses`. Pericles ability description says "5% culture per city-state you are suzerain of" but `EffectDef` is flat `MODIFY_YIELD culture +2` (description/impl decoupled).
**Gap:** Pool + selection UI + depletion absent.
**Recommendation:** Add `suzerainties: ReadonlyArray<string>` and `suzerainBonuses: Map<string, string>` to `PlayerState`. Add `IndependentPowerState.bonusPool`. Add `SUZERAIN_BONUS_SELECTED` action. Fix Pericles.

---

### F-05: Hostile Independent Powers (Barbarian analog) absent — MISSING

**Location:** `systems/` (no NPC spawning)
**GDD reference:** `systems/independent-powers.md` § "Hostile IPs — Military Threat", "Incite Raid"
**Severity:** HIGH
**Effort:** M
**VII says:** Hostile IPs spawn military units each turn toward nearest player settlement. Replaces all Civ VI barbarian functionality. `INCITE_RAID` (30 Influence) lets players weaponize hostile/neutral IP against rival for 1 turn.
**Engine does:** No hostile-IP spawning. No NPC AI loop. `aiSystem.ts` controls player-owned AIs only. Comment in `GameState.ts` mentions `'barbarian near capital'` severity — dead hint with no emitter.
**Gap:** Early-game military threat + proxy-raider mechanic absent.
**Recommendation:** Add NPC-faction turn after all player turns. Hostile IPs spawn one unit per N turns (seeded RNG). INCITE_RAID redirects IP unit toward incite target.

---

### F-06: Data content registry (named IP factions) absent — MISSING

**Location:** `data/` (no directory)
**GDD reference:** `systems/independent-powers.md` § "Content flowing through this system"
**Severity:** MED
**Effort:** S skeleton, M full roster
**VII says:** Named factions with per-entry data: type, default attitude, suzerain bonus pool (age-specific), tile seeding. ~20+ named factions. Confirmed: Kumbi Saleh/Soninke, Carantania/Slav, Tilantongo/Mixtec, Etelkoz/Magyar.
**Engine does:** No `data/independent-powers/`, no `IndependentPowerDef`, no barrel.
**Gap:** Zero content.
**Recommendation:** Create `data/independent-powers/{name}.ts` + `ALL_INDEPENDENT_POWERS` barrel + `GameConfig.independentPowers` registry. Minimum viable: 3 IPs per age.

---

### F-07: DiplomacyPanel IP tab absent — MISSING

**Location:** `DiplomacyPanel.tsx` (1-327)
**GDD reference:** `systems/independent-powers.md` § "UI requirements"
**Severity:** MED
**Effort:** S frame, M full
**VII says:** Primary IP interaction surface: "Independents and City-States" tab in Leader screen. Lists discovered IPs with attitude, befriend progress bar, Influence cost per action.
**Engine does:** Panel renders `state.players` only. IPs wouldn't appear even if they existed. Panel priority `info` (cross-cut `diplomacy-influence.md` F-15).
**Gap:** Entire IP interaction absent.
**Recommendation:** Add 2nd section to `DiplomacyPanel` or create `IndependentPowersPanel.tsx` reading `state.independentPowers`. Change panel priority `info` → `overlay`.

---

### F-08: Pericles suzerain-count scaling data bug — DIVERGED

**Location:** `data/leaders/all-leaders.ts:27-37`
**GDD reference:** `systems/independent-powers.md` § "Suzerain bonus stacking"
**Severity:** LOW
**Effort:** S (after F-04)
**VII says:** Pericles' "Surrounded by Glory" scales with city-states held as suzerain.
**Engine does:** Effect is flat `MODIFY_YIELD culture +2`. Description text accurate; `effects` array wrong.
**Gap:** Description/implementation decoupled.
**Recommendation:** Once F-04's `suzerainties` exists, change effect to dynamic multiplier. Interim: add comment flag.

---

## Extras to retire

None.

---

## Missing items

1. `IndependentPowerState` + `independentPowers` Map on GameState (F-01).
2. `independentPowerSystem.ts` (F-02).
3. Age-transition IP reset (F-03).
4. Suzerain bonus pool + `PlayerState.suzerainties` (F-04).
5. Hostile IP spawning + `INCITE_RAID` (F-05).
6. Data content registry (F-06).
7. DiplomacyPanel IP tab / IndependentPowersPanel (F-07).

---

## Cross-audit note

`diplomacy-influence.md` F-07 already flagged this system gap HIGH. That entry is superseded by this audit. When planning, use this as authoritative.

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/independent-powers.md` § "Mapping to hex-empires":

**Engine files:**
- Currently: no dedicated IP files.
- Closest analog: `diplomacySystem.ts` (covers player-player only).
- To add: `types/IndependentPower.ts`, `data/independent-powers/`, `systems/independentPowerSystem.ts`, UI tab or `IndependentPowersPanel.tsx`.

**Status:** 1 MATCH / 1 CLOSE / 1 DIVERGED / 5 MISSING / 0 EXTRA

**Highest-severity finding:** F-01 / F-02 — entire system architecturally absent. F-05 — hostile IPs (barbarian replacement) absent.

---

## Open questions

1. IP spawning — on map at age init, or via narrative/exploration triggers?
2. Incorporation mechanic — does it convert IP tile to Town, or require separate founding?
3. Same-type stacking formula — linear, diminishing, or step-function?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-03, F-06, F-07, F-08 | 2d |
| M | F-01, F-04, F-05 | ~7d |
| L | F-02 | ~1.5w |
| **Total** | 8 | **~3.5w** |

Recommended order: F-01 (type layer) → F-06 (data skeleton) → F-02 (system) → F-03 (age reset) → F-04 (bonus selection) → F-05 (hostile units) → F-07 (UI tab) → F-08 (Pericles fix). F-01-F-03 in single commit.

---

<!-- END OF AUDIT -->
