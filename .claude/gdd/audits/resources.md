# Resources -- hex-empires Audit

**System slug:** `resources`
**GDD doc:** [systems/resources.md](../systems/resources.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4-6`
**Version target:** Firaxis patch 1.3.0 (per commitment.md)

---

## Engine files audited

- `packages/engine/src/systems/resourceSystem.ts` (lines 1-196)
- `packages/engine/src/systems/resourceAssignmentSystem.ts` (lines 1-269)
- `packages/engine/src/state/ResourceChangeCalculator.ts` (lines 1-189)
- `packages/engine/src/data/resources/index.ts` (lines 1-144)
- `packages/engine/src/types/Resource.ts` (lines 1-11)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH -- code does what VII does | 1 |
| CLOSE -- right shape, wrong specifics | 2 |
| DIVERGED -- fundamentally different (Civ-VI-ism or custom) | 3 |
| MISSING -- GDD describes, engine lacks | 4 |
| EXTRA -- engine has, VII/GDD does not have | 1 |

**Total findings:** 11

---

## Detailed findings
### F-01: Resource taxonomy uses Civ-VI vocabulary -- DIVERGED

**Location:** `packages/engine/src/types/Resource.ts:6`, `packages/engine/src/data/resources/index.ts` (all entries)
**GDD reference:** `systems/resources.md` section "Resource categories"
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Five categories: City, Bonus, Empire, TreasureFleet, Factory. No "luxury" or "strategic" labels exist in VII.
**Engine does:** `ResourceDef.type` is `'bonus' | 'strategic' | 'luxury'` -- the Civ VI three-way taxonomy. Iron, Horses, Niter, Coal are `strategic`. Silk, Gems, Spices, Wine, Ivory are `luxury`.
**Gap:** `strategic` conflates VII Empire category (combat-bonus, empire-wide, no slot required) with Civ VI "required to build unit" mechanic. `luxury` conflates VII City resources (slot-assigned, settlement-type gated) with Civ VI happiness-giving luxuries. City, TreasureFleet, and Factory categories are entirely absent.
**Recommendation:** Replace `type: 'bonus' | 'strategic' | 'luxury'` with `type: 'bonus' | 'city' | 'empire' | 'treasureFleet' | 'factory'`. Update all 13 existing resource definitions. Add age-keyed bonus tables to replace flat `yieldBonus` and `happinessBonus` fields (see F-02).

---
### F-02: ResourceDef has no per-age bonus table -- DIVERGED

**Location:** `packages/engine/src/types/Resource.ts:7-9`
**GDD reference:** `systems/resources.md` section "Per-age resource unlocks and consistency", Formulas (`cityResourceBonus`)
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** Every resource has a per-age bonus table. Horses yields +1 CS Cavalry in Antiquity/Exploration but +6 Happiness empire-wide in Modern. Spices is a Treasure Fleet trigger in Exploration but gives food/happiness in Modern.
**Engine does:** `ResourceDef` has a single flat `yieldBonus: Partial<YieldSet>` and `happinessBonus: number`. Resources produce identical bonuses in every age.
**Gap:** Age-varying resource effects are the defining VII resource mechanic. Iron losing combat relevance in Modern, Coal gaining Rail Station production bonus, Horses transitioning to happiness -- none representable in the current schema.
**Recommendation:** Replace `yieldBonus` + `happinessBonus` with `bonusTable: Record<'antiquity' | 'exploration' | 'modern', ResourceBonusRow>` where `ResourceBonusRow` captures yield deltas, happiness value, combat strength mods, and special effects (treasure fleet trigger, factory slot eligibility, production percent toward specific building types).

---
### F-03: Empire resources provide no combat strength modifier -- MISSING

**Location:** `packages/engine/src/types/Resource.ts`, `packages/engine/src/systems/resourceSystem.ts`
**GDD reference:** `systems/resources.md` section "Military relevance and the strategic resource function"
**Severity:** HIGH
**Effort:** L (week+)
**VII says:** Empire resources (Horses, Iron, Niter, Oil, Rubber, Coal) provide flat combat strength bonuses to specific unit categories empire-wide once acquired. Iron: +1 CS Infantry (Antiquity). Horses: +1 CS Cavalry + additional +1 vs Infantry (Antiquity).
**Engine does:** IRON, HORSES, NITER, COAL all have `yieldBonus: { production: 1 }` or similar tile yields. No `combatStrengthMod` field on `ResourceDef`, no empire-level modifier accumulation in `resourceSystem.ts`, no resource CS lookup in the combat system.
**Gap:** The primary military output of the resource system is entirely absent. Resources currently only provide tile yields on their hex -- a Civ V tile-working model that VII explicitly retired.
**Recommendation:** Add `combatMod?: { unitCategory: UnitCategory; value: number; versusCategory?: UnitCategory }[]` to `ResourceBonusRow` (F-02 prerequisite). Accumulate Empire-type resource combat mods per player into `player.empireCombatMods` on END_TURN. Wire `combatSystem` to add these mods to unit effective CS during attack resolution.

---
### F-04: No unit production gates exist -- MATCH (VII design intent)

**Location:** `packages/engine/src/systems/resourceSystem.ts`, production pipeline
**GDD reference:** `systems/resources.md` section "Military relevance" (INFERRED note)
**Severity:** LOW (intentional match)
**Effort:** none
**VII says:** No hard resource requirement for unit production. Empire resources are bonuses, not production gates. A Cavalry unit can be trained without Horses, just with lower CS.
**Engine does:** No resource requirement checks in any production or unit-training path.
**Gap:** None -- engine matches VII design intent. Finding recorded to confirm intentional absence rather than oversight.
**Recommendation:** Add a comment in `resourceAssignmentSystem.ts` header documenting the intentional no-gate design to prevent future contributors from adding Civ-VI-style resource requirements.

---
### F-05: resourceAssignmentSystem not wired into GameEngine pipeline -- DIVERGED

**Location:** `packages/engine/src/systems/resourceAssignmentSystem.ts:7-11`
**GDD reference:** `systems/resources.md` section "Triggers" (ASSIGN_RESOURCE, UNASSIGN_RESOURCE)
**Severity:** MEDIUM
**Effort:** S (hours)
**VII says:** ASSIGN_RESOURCE and UNASSIGN_RESOURCE are core player actions; resource bonuses activate and deactivate immediately.
**Engine does:** The system file comment at lines 7-11 explicitly states "NOT wired into the GameEngine pipeline." `ResourceAssignmentAction` is a local action union not part of canonical `GameAction`. `CityState` does not expose `assignedResources` and `PlayerState` does not expose `ownedResources` in canonical types -- the system no-ops when these fields are absent.
**Gap:** Assignment logic exists and is correct in isolation but cannot be triggered through normal gameplay. Schema fields missing, system not wired, bonuses never evaluated.
**Recommendation:** (1) Add `assignedResources: ReadonlyArray<ResourceId>` to `CityState`. (2) Add `ownedResources: ReadonlyArray<ResourceId>` to `PlayerState`. (3) Merge `ResourceAssignmentAction` into canonical `GameAction`. (4) Wire `resourceAssignmentSystem` into `GameEngine`. (5) Add END_TURN bonus evaluation applying yields and happiness from `city.assignedResources`.

---
### F-06: Assigned resource bonuses not applied to city yields -- MISSING

**Location:** `packages/engine/src/state/ResourceChangeCalculator.ts:39-188`, `packages/engine/src/systems/resourceSystem.ts:44-196`
**GDD reference:** `systems/resources.md` section "Slot assignment and caps", Formulas `cityResourceBonus`, `empireResourceBonus`
**Severity:** HIGH
**Effort:** M (1-3 days)
**VII says:** When a City or Bonus resource is assigned to a settlement, its bonuses become active and contribute to the city per-turn yield and happiness output.
**Engine does:** Both `resourceSystem.ts` and `ResourceChangeCalculator.ts` compute city yields via `calculateCityYieldsWithAdjacency` / `calculateCityYields`. Neither reads `city.assignedResources` (field absent on canonical `CityState`). Resource bonuses are entirely absent from yield calculations.
**Gap:** Even with a full content library, no resource bonus reaches any player output. The resource system has no feedback path into yields, happiness, or combat.
**Recommendation:** After resolving F-05, add `calculateResourceBonusYields(city, state)` that iterates `city.assignedResources`, looks up each `ResourceDef` in `state.config.resources`, selects the correct age row, and sums yield contributions. Integrate into `CityYieldsWithAdjacency`. Integrate happiness into `calculateCityHappiness`.

---
### F-07: No resource acquisition trigger on settlement border expansion -- MISSING

**Location:** `packages/engine/src/systems/` (no handler for border-expand + resource tile)
**GDD reference:** `systems/resources.md` section "Triggers" (first bullet: settlement growth onto a resource tile)
**Severity:** MEDIUM
**Effort:** M (1-3 days)
**VII says:** When a settlement expands its borders to include a tile with a resource, that resource is acquired and enters the player unassigned pool (`player.ownedResources`).
**Engine does:** No border-expansion system reacts to newly claimed tiles by reading `tile.resource`. The unassigned pool is never populated through any gameplay path.
**Gap:** Resources are never acquired during normal gameplay. Without F-07 resolved, even a fully wired `resourceAssignmentSystem` (F-05) has nothing to assign.
**Recommendation:** In `growthSystem` or a `borderExpansionSystem`, when a settlement claims a new tile, check `tile.resource`. If non-null and not already in `player.ownedResources`, append it. Emit `RESOURCE_ACQUIRED` notification. Cross-cuts tile-improvements F-02 -- use the same `CITY_POPULATION_GROWTH` event handler for both.

---
### F-08: Treasure Fleet resource category entirely absent -- MISSING

**Location:** `packages/engine/src/data/resources/index.ts`, `packages/engine/src/types/Resource.ts`
**GDD reference:** `systems/resources.md` section "Treasure Fleet Resources", "Treasure Fleet economy"
**Severity:** MED
**Effort:** L (week+, blocked on Exploration Age)
**VII says:** In Exploration Age, Treasure Fleet resources (Gold, Spices, Sugar, Cocoa) connected to coastal Distant Lands cities with Fishing Quay + Cartography + Shipbuilding trigger Treasure Fleet civilian units generating Gold and Treasure Fleet victory points.
**Engine does:** No `treasureFleet` resource type. No Treasure Fleet unit. No coastal + Distant Lands detection. SPICES is `luxury` with `happinessBonus: 1` only.
**Gap:** An entire VII Exploration Age economic subsystem is absent. Expected since Exploration Age is not yet implemented, but the schema must accommodate these resources.
**Recommendation:** Defer Treasure Fleet unit implementation until Exploration Age is scoped. Immediately add `'treasureFleet'` to `ResourceDef.type` union (F-01 prerequisite). Update SPICES classification. Add GOLD (resource), SUGAR, COCOA data entries with age-keyed bonus tables.

---

### F-09: Factory category absent (Modern-age industrial resources) -- MISSING

**Location:** `packages/engine/src/data/resources/index.ts`, `packages/engine/src/types/Resource.ts`
**GDD reference:** `systems/resources.md` section "Factory Resources"
**Severity:** MED
**Effort:** M
**VII says:** Modern age adds Factory resources (e.g. Rubber, Aluminum) slotted into industrial buildings to unlock powerful Modern-age benefits.
**Engine does:** No `factory` resource type. Modern-age resources not represented in the current 13-entry roster.
**Gap:** Another missing VII resource category, blocking Modern-age implementation.
**Recommendation:** Pair with F-01 refactor. Add `'factory'` to `ResourceDef.type` union. Add Modern-age data entries (Rubber, Aluminum at minimum). Add factory-slot requirement check in Modern-age industrial buildings.

---

### F-10: Resource acquisition notification/UI path entirely absent -- MISSING

**Location:** no engine handler; no UI surface
**GDD reference:** `systems/resources.md` section "UI requirements" (resource ledger, assignment interface)
**Severity:** LOW
**Effort:** M
**VII says:** Players need UI surfaces to: (1) see owned (unassigned) resources, (2) assign resources to settlements, (3) see per-city resource slot occupancy, (4) see age-transitioning bonus previews.
**Engine does:** No ResourcePanel, no HUD element showing owned/assigned resource counts, no per-city slot display. `resourceSystem.ts` log events exist but no UI panel subscribes to them.
**Gap:** Even with the engine wiring fixes (F-05, F-06, F-07), players have no way to see or manipulate the resource system.
**Recommendation:** After F-05 is wired, add a `ResourcePanel` via `/add-panel` showing owned pool + per-city assignments with drag-assign affordance. Add a resource-count badge to `TurnSummaryPanel`.

---

### F-11: CityState `assignedResources` / PlayerState `ownedResources` fields absent -- EXTRA

**Location:** `packages/engine/src/types/GameState.ts` (CityState, PlayerState)
**GDD reference:** `systems/resources.md` section "Entities"
**Severity:** LOW
**Effort:** S
**VII says:** Canonical state has `PlayerState.ownedResources: ReadonlyArray<ResourceId>` and `CityState.assignedResources: ReadonlyArray<ResourceId>`.
**Engine does:** These canonical fields are not present in the live type definitions. The disconnected `resourceAssignmentSystem.ts` references them via local type casts. (Flagged as EXTRA because the engine has resource-related code without the backing state — the opposite of the usual EXTRA pattern.)
**Gap:** Schema drift between the disconnected resource-assignment module and the live `CityState` / `PlayerState` shapes.
**Recommendation:** Added as part of F-05. Add `ownedResources: ReadonlyArray<ResourceId>` to `PlayerState` and `assignedResources: ReadonlyArray<ResourceId>` to `CityState` with empty array defaults. Migrate `resourceAssignmentSystem` imports to use canonical types.

---

## Extras to retire

- `resourceAssignmentSystem.ts` in its current disconnected form — once wired into `GameEngine` (F-05), the module becomes a first-class system. Until then, it's dead code.
- `ResourceDef.type = 'strategic' | 'luxury'` — Civ-VI vocabulary (F-01).

---

## Missing items

1. Per-age bonus tables on `ResourceDef` (F-02) — prerequisite for most other resource work.
2. Empire-resource combat strength modifier pipeline (F-03) — depends on F-02.
3. Wired resource-assignment system (F-05, F-06, F-07) — schema + action union + system + state + UI.
4. Treasure Fleet category + related content (F-08) — blocked on Exploration Age.
5. Factory category + Modern-age resources (F-09) — blocked on Modern Age content.
6. Resource UI panel + HUD badges (F-10).
7. Canonical `ownedResources` / `assignedResources` state fields (F-11).

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/resources.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/resourceSystem.ts`
- `packages/engine/src/systems/resourceAssignmentSystem.ts` (disconnected)
- `packages/engine/src/state/ResourceChangeCalculator.ts`
- `packages/engine/src/data/resources/index.ts`
- `packages/engine/src/types/Resource.ts`

**Status:** 1 MATCH / 2 CLOSE / 3 DIVERGED / 4 MISSING / 1 EXTRA

**Highest-severity finding:** F-01 — taxonomy uses Civ-VI `strategic`/`luxury` vocabulary instead of VII's City/Bonus/Empire/TreasureFleet/Factory categories; F-03 — Empire resources provide no combat strength modifier (primary military output of the system is absent).

---

## Open questions

1. Should `strategic` / `luxury` be renamed in place, or is a full schema rewrite (F-01 + F-02 together) the right unit of change?
2. `resourceAssignmentSystem.ts` comment says "NOT yet wired" — is there a design doc for wiring it? Cycle F candidate?
3. Are the per-age bonus tables to be authored in content files, or derived from GDD fact-cards?
4. For F-07, should the trigger be tile-claim (border expansion) or something stronger (tile-improvement placement)?

---

## Effort estimate

| Bucket | Findings | Total effort |
|---|---|---|
| S (half-day) | F-05, F-11 | 1d |
| M (1-3 days) | F-01, F-02, F-06, F-07, F-09, F-10 | ~10d |
| L (week+) | F-03, F-08 | 2w+ |
| **Total** | 11 | **~3-4w** |

Recommended order: F-05 (wire system — prereq), F-11 (add schema fields), F-01 (fix taxonomy), F-02 (add per-age tables), F-06 (assigned yield bonuses), F-07 (acquisition trigger), F-03 (combat strength pipeline), F-10 (UI), F-08 + F-09 (deferred to age-specific work).

---

<!-- END OF AUDIT -->
