# Religion & Pantheons — Design & Implementation Plan

**Status:** DESIGN + TYPE SCAFFOLDING (Cycle A of 5).
**Owner:** engine team.
**Tracks gap:** `gap-analysis-v3.md` — "Religion & Pantheons" row
(category: *missing entirely*), and `rulebook-gaps.md` §M2 / §6.
**Rulebook reference:** none today. This cycle also writes a draft
section `rulebook-religion-section.md` to be merged into
`civ7-rulebook.md` as §18 in a later cycle.

---

## 1. Why change?

### 1.1 Current behavior (pre-cycle)

There is no religion system at all. The `faith` yield exists on
`PlayerState` (`types/GameState.ts:116`) and in `YieldSet`
(`types/Yields.ts:10`) and it accumulates — but it is never spent on
anything. The only content-layer touchpoints are:

- `TownSpecialization` includes `'religious_site'` (+3 faith); no
  downstream mechanic reads it beyond yield.
- A `UnitCategory` value `'religious'` exists — no unit uses it.
- `DistrictType` includes `'holy_site'` — no religious effect runs
  when a Holy Site is placed.
- `GovernorSpecialization` includes `'religious'` — bonuses on the
  governor apply to faith yield, nothing else.
- Rulebook text mentions "God of Healing Pantheon" (§6.9) and
  Altar / Temple happiness buildings (§8), but the system that makes
  those meaningful does not exist.

The net effect today: **Faith is a dead-end yield**. A player can
generate hundreds of Faith per turn and do nothing with it. This
undermines §2.3 (Religious Site specialization — why pick it?), §6.9
(God of Healing — what does "Pantheon" mean?), §8 (why build Temples
beyond happiness?), and the Exploration-age thematic pacing (religion
is the spine of Exploration in Civ VII).

### 1.2 Civ VII behavior (target)

See the companion file `rulebook-religion-section.md` for the
player-facing rules. In summary:

| Tier | Gate | Cost | Effect |
|------|------|------|--------|
| Pantheon | first player to reach Faith threshold | 25 Faith | one empire-wide bonus, permanent |
| Religion founding | Pantheon + Holy Site | 200 Faith | founder + follower belief |
| Religion enhancement | spread to N cities | 400 Faith | enhancer + worship belief |
| Religious units | Exploration + Temple | Faith buy | spread pressure + theological combat |

Religious pressure spreads every turn by proximity and trade route,
adjudicated per-city with `pressure` and `followers` counters.

### 1.3 Scope of this plan

This plan is **one design doc + one rulebook draft + five
sub-cycles**, not one patch. This document (Cycle A) delivers
DESIGN + TYPE SCAFFOLDING only. No behavior changes; no old tests
break. Behavior wiring begins in Cycle C.

Deliverables of Cycle A (this cycle):
1. `design/religion-system.md` (this doc)
2. `design/rulebook-religion-section.md` (draft rulebook §18)
3. `types/Religion.ts` — new types (parallel namespace)
4. `state/__tests__/Religion.types.test.ts` — compile-time type tests

What Cycle A does NOT do:
- No edits to `civ7-rulebook.md` (that merge is a later cycle).
- No edit to `types/index.ts` barrel.
- No `GameState.religion` field.
- No systems, no content, no UI.

---

## 2. Civ VII rules recap (see §18 draft)

Condensed from the draft rulebook section we are producing in
parallel. Numbers tagged [UNCONFIRMED] are research gaps listed in §9.

| Mechanic | Spec |
|----------|------|
| Faith yield | Already in `YieldSet` — source of religion-tier spend |
| Pantheon threshold | 25 Faith [UNCONFIRMED], first-come-first-served |
| Pantheon pool | ~10 entries (God of Healing, Harvest, Forge, War…) |
| Religion founding cost | 200 Faith [UNCONFIRMED] at a Holy Site city |
| Religion slots | ~(player count − 1) [UNCONFIRMED] |
| Belief slots | founder, follower, enhancer, worship (max 4) |
| Religion enhancement | 400 Faith, after spread to ≥5 cities [UNCONFIRMED] |
| Missionary | 3 spread charges [UNCONFIRMED], no combat |
| Apostle | spread + theological combat; charge-based HP |
| Pressure radius | 10 hex linear falloff |
| Pressure channels | Proximity, trade routes, religious units |
| Holy City capture | founder bonuses persist; captor gets city yields only |
| Age persistence | Pantheon + Religion survive age transitions |

### 2.1 Effect integration

Pantheon bonuses and Belief bonuses both reuse the existing
`EffectDef` discriminated union in `types/GameState.ts:178`. This is
deliberate: every other data-driven bonus already flows through
`effectSystem`, and religion bonuses are not spatially scoped (unlike
commander auras), so they slot in identically.

### 2.2 Where religion is NOT like commanders

The Commander plan (`commander-system.md`) introduced a parallel
`AuraEffectDef` because commander bonuses have a **hex radius**.
Religion bonuses do NOT — they apply:
- pantheon: empire-wide to the picking player.
- follower belief: every city with the religion as dominant
  (regardless of owner).
- founder / enhancer belief: empire-wide to the founder.
- worship belief: unlocks a building (`UNLOCK_BUILDING`).

All of these can be expressed with existing `EffectDef` variants.
There is no need for a `ReligionEffectDef` parallel union.

---

## 3. Current state in code

Files in play and their current role:

- `packages/engine/src/types/GameState.ts` — defines
  `PlayerState.faith` (line 116), `UnitCategory = 'religious'` (line
  37), `TownSpecialization = 'religious_site'` (line 61), `EffectDef`
  (line 178).
- `packages/engine/src/types/Yields.ts` — `faith` in `YieldSet`.
- `packages/engine/src/types/District.ts` — `DistrictType = 'holy_site'`
  (line 22).
- `packages/engine/src/types/Governor.ts` — `GovernorSpecialization =
  'religious'` (line 29).
- `packages/engine/src/systems/resourceSystem.ts` — accumulates the
  faith yield into `PlayerState.faith`. This is where the Faith pool
  actually fills up. **No spend path exists.**
- No religion system file.
- No religion data directory.
- No religion UI panel.

Nothing in the current codebase has the concept of "pantheon pick",
"founded religion", "belief slots", or "religious pressure." That is
all new.

---

## 4. Proposed data model

All new types live in a **parallel namespace** (`types/Religion.ts`)
during cycles A–D. A unit is "religious" iff its category is
`'religious'`; a player "has a pantheon" iff
`ReligionState.pantheons.has(player.id)`; a city "follows religion X"
iff `ReligionState.cities.get(cityId).dominant === X`.

### 4.1 `PantheonDef` (content)

```ts
interface PantheonDef {
  readonly id: PantheonId;
  readonly name: string;
  readonly description: string;
  readonly bonus: EffectDef;
  readonly faithCost: number;
}
```

- `bonus` reuses `EffectDef`. Example: God of Healing is
  `{ type: 'MODIFY_COMBAT', target: 'all', value: 2 }` over friendly
  tiles — but "over friendly tiles" has no existing expression in
  `EffectDef`, so the practical first-wave pantheons will be ones
  whose bonuses fit cleanly into current variants
  (`MODIFY_YIELD`, `MODIFY_COMBAT`, `DISCOUNT_PRODUCTION`). Extending
  `EffectDef` to handle terrain-scoped bonuses is a Cycle B concern.
- `faithCost` defaults to `PANTHEON_DEFAULT_FAITH_COST` (25). Some
  pantheons may cost more (gating them to later in Antiquity).

### 4.2 `BeliefDef` (content)

```ts
interface BeliefDef {
  readonly id: BeliefId;
  readonly name: string;
  readonly description: string;
  readonly category: BeliefCategory;
  readonly bonus: EffectDef;
}

type BeliefCategory = 'follower' | 'founder' | 'enhancer' | 'worship';
```

- `category` decides which slot it fills on a religion. A religion
  has at most one belief per category.
- `worship` category uses `UNLOCK_BUILDING` effects; the building it
  unlocks is itself a normal `BuildingDef` in the content registry.

### 4.3 `ReligionDef` (runtime)

```ts
interface ReligionDef {
  readonly id: ReligionId;
  readonly name: string;
  readonly founderId: CivilizationId;
  readonly foundedByPlayer: PlayerId;
  readonly foundedTurn: number;
  readonly holyCityId: CityId;
  readonly beliefs: ReadonlyArray<BeliefId>;
}
```

- ID is generated at founding time: `religion.${playerId}.${slug}`.
- `name` is player-supplied free text.
- `beliefs` is ordered and may have 2 (founded, unenhanced) or 4
  (enhanced) entries.
- `founderId` is the **civilization** that founded the religion, not
  the player. If the player transitions to a new civ in Exploration,
  the religion remains keyed to the Antiquity civ's ID.

### 4.4 `CityReligiousState`

```ts
interface CityReligiousState {
  readonly cityId: CityId;
  readonly dominant: ReligionId | null;
  readonly pressure: ReadonlyMap<ReligionId, number>;
  readonly followers: ReadonlyMap<ReligionId, number>;
}
```

- `pressure` accumulates each turn; bounded below at 0. Resets when
  a follower converts (some of the pressure is "spent" on the
  conversion).
- `followers` is bounded above by `city.population`. When one
  religion has > 50% followers it becomes `dominant`.
- A city without any religion has `dominant: null` and empty maps.

### 4.5 `PlayerReligiousState`

```ts
interface PlayerReligiousState {
  readonly playerId: PlayerId;
  readonly pantheonId: PantheonId | null;
  readonly religionId: ReligionId | null;
  readonly missionaryCharges: number;
}
```

- `pantheonId` is picked once; once non-null never changes.
- `religionId` is null if the player has not founded a religion (all
  slots taken, insufficient faith, etc.).
- `missionaryCharges` is a player-level counter — simpler than
  tracking per-unit charges during the scaffolding cycles; when unit
  support lands in Cycle D, we'll decide whether to keep this pool
  or move charges onto the unit.

### 4.6 `ReligionState` (attaches to GameState in Cycle C)

```ts
interface ReligionState {
  readonly pantheons: ReadonlyMap<PlayerId, PantheonId>;
  readonly religions: ReadonlyMap<ReligionId, ReligionDef>;
  readonly players: ReadonlyMap<PlayerId, PlayerReligiousState>;
  readonly cities: ReadonlyMap<CityId, CityReligiousState>;
  readonly availablePantheonSlots: number;
  readonly availableReligionSlots: number;
}
```

- `pantheons` is the authoritative record of "who picked which
  pantheon." Uniqueness is enforced by `religionSystem`.
- `availablePantheonSlots` starts at `pantheonRegistry.size` and
  decrements each pick. When 0, `ADOPT_PANTHEON` rejects.
- `availableReligionSlots` starts at ~(playerCount − 1); decrements
  on `FOUND_RELIGION`.

### 4.7 Storage on GameState (Cycle C)

```ts
interface GameState {
  // ... existing fields
  readonly religion: ReligionState;
}
```

One field, one object. Keeping the subsystem in its own slice (like
`diplomacy`, `age`, `victory`) keeps the `GameState` shape flat and
save/load straightforward.

---

## 5. Proposed actions

New `GameAction` variants (added in Cycle C, typed here in
`Religion.ts` as `ReligionAction`):

```ts
{ readonly type: 'ADOPT_PANTHEON';
  readonly playerId: PlayerId;
  readonly pantheonId: PantheonId }

{ readonly type: 'FOUND_RELIGION';
  readonly playerId: PlayerId;
  readonly cityId: CityId;
  readonly religionName: string;
  readonly founderBelief: BeliefId;
  readonly followerBelief: BeliefId }

{ readonly type: 'ENHANCE_RELIGION';
  readonly playerId: PlayerId;
  readonly cityId: CityId;
  readonly religionId: ReligionId;
  readonly enhancerBelief: BeliefId;
  readonly worshipBelief: BeliefId }

{ readonly type: 'SPREAD_RELIGION';
  readonly unitId: UnitId;
  readonly targetCityId: CityId }

{ readonly type: 'PROMOTE_RELIGIOUS_UNIT';
  readonly unitId: UnitId;
  readonly promotionId: string }

{ readonly type: 'INITIATE_THEOLOGICAL_COMBAT';
  readonly attackerId: UnitId;
  readonly defenderId: UnitId }
```

### 5.1 Implicit per-turn action

`SPREAD_RELIGION` above is the *active* religious-unit spread. There
is also a **passive** spread computed each turn by `religionSystem`
from city-to-city pressure. Passive spread is not a user action —
it's a system function that mutates `ReligionState.cities` during
`START_TURN` resolution. No `GameAction` is needed; the pattern
matches how `resourceSystem` accumulates yields each turn.

### 5.2 Validation notes per action

- `ADOPT_PANTHEON` — rejects if `playerId` already has a pantheon,
  `pantheonId` not in registry, `pantheonId` already taken, or Faith
  below the pantheon's `faithCost`.
- `FOUND_RELIGION` — rejects if player has no pantheon, player already
  founded, city has no Holy Site / Temple, cost > Faith, slots = 0,
  or name is empty.
- `ENHANCE_RELIGION` — rejects if spread under threshold, player did
  not found this religion, religion already enhanced, belief IDs
  invalid or miscategorized.
- `SPREAD_RELIGION` — rejects if unit is not a religious unit, unit
  has 0 charges, target city already dominant for the unit's
  religion, or target is unreachable.
- `PROMOTE_RELIGIOUS_UNIT` — parallel to `PROMOTE_UNIT` in the
  existing `promotionSystem`; cycle D decides whether to fold or
  keep separate.
- `INITIATE_THEOLOGICAL_COMBAT` — rejects if either unit is not an
  Apostle, they are not adjacent, or owner IDs match.

---

## 6. System changes

### 6.1 New `religionSystem`

Lives at `packages/engine/src/systems/religionSystem.ts`. Pure
function: `(state, action) => state`. Handles all `ReligionAction`
variants above plus the passive per-turn pressure step on
`START_TURN`. Delegates to pure helpers in `state/ReligionLogic.ts`
(Cycle C).

### 6.2 Pipeline order

```
turnSystem → visibilitySystem → effectSystem → movementSystem →
  citySystem → combatSystem → promotionSystem → fortifySystem →
  improvementSystem → buildingPlacementSystem → districtSystem →
  growthSystem → productionSystem → resourceSystem → researchSystem →
  civicSystem → ageSystem → diplomacySystem → updateDiplomacyCounters →
  specialistSystem → tradeSystem → governorSystem → crisisSystem →
  religionSystem → victorySystem
```

Inserted after `governorSystem` / `crisisSystem` (so governor faith
bonuses feed into the pool before religion spends) and before
`victorySystem` (so a religious victory condition can read the final
end-of-turn state).

### 6.3 Hooks into other systems

- `resourceSystem` already generates faith — no change needed.
- `effectSystem` needs to pick up pantheon bonuses and founder
  beliefs as `ActiveEffect` entries. Add to the effect-collection
  helper in Cycle C.
- `combatSystem` grows a new branch for theological combat (separate
  damage model).
- `productionSystem` must accept "Faith" as a purchase currency for
  religious units (currently only Gold is supported).
- `ageSystem` must preserve `ReligionState` across age transitions;
  it already preserves the whole `GameState`, so this is free.
- `victorySystem` gains a religious milestone branch for the Legacy
  Path (Cycle E, not C).

### 6.4 Save/load

`ReligionState` consists entirely of maps of plain JSON-serializable
values. The existing `SaveLoad.ts` Map serialization already handles
this shape; add a new branch to the serializer in Cycle C to
register the slice. Version bump not strictly required since older
saves without `religion` can be hydrated to the empty shape.

---

## 7. Migration

Existing saves have no `GameState.religion` slice. At load time the
Cycle-C deserializer:

1. If the save version is old (no `religion` slice), synthesize an
   empty `ReligionState`:
   - `pantheons = new Map()`
   - `religions = new Map()`
   - `players = map with PlayerReligiousState entries for every player,
     all nulled pantheon + religion`
   - `cities = map with empty CityReligiousState for every city`
   - `availablePantheonSlots = pantheonRegistry.size`
   - `availableReligionSlots = max(players.size - 1, 1)`
2. Log an info entry announcing "religion system initialized for
   existing save".

No old data is lost — there is none to lose.

**Compat bump:** save format version increments in Cycle C. We
intentionally do NOT break existing save files; new saves are
strictly additive.

---

## 8. Implementation cycles

Five sub-cycles, each independently commit-able and testable.

### Cycle A — Types (THIS CYCLE)

Deliverables:
- `design/religion-system.md` (this doc)
- `design/rulebook-religion-section.md` (§18 draft)
- `types/Religion.ts`:
  - Branded IDs: `PantheonId`, `ReligionId`, `BeliefId`
  - Enums: `BeliefCategory`
  - Content: `PantheonDef`, `BeliefDef`
  - Runtime: `ReligionDef`, `CityReligiousState`,
    `PlayerReligiousState`, `ReligionState`
  - Actions: `ReligionAction` (union of 6)
  - Constants: `PANTHEON_DEFAULT_FAITH_COST`,
    `RELIGION_FOUND_FAITH_COST`, `RELIGION_ENHANCE_FAITH_COST`,
    `RELIGIOUS_PRESSURE_RADIUS`, `MAX_RELIGION_BELIEFS`
- `state/__tests__/Religion.types.test.ts` — compile-time shape
  tests, one per exported type.
- No engine barrel edit, no behavior change. Engine builds and all
  existing tests still pass.

### Cycle B — Rulebook merge + data files

Deliverables:
- Merge `rulebook-religion-section.md` into `civ7-rulebook.md` as a
  new `## 18. Religion & Pantheons` section. Delete the draft file
  once merged.
- `data/religion/pantheons.ts` — 10 `PantheonDef` entries (God of
  Healing, Harvest, Forge, War, Religious Settlements, Open Sky,
  Stone Circles, Festivals, Craftsmen, Fertility Rites).
- `data/religion/beliefs.ts` — ~24 `BeliefDef` entries across all
  four categories.
- `data/religion/index.ts` — barrel export `ALL_PANTHEONS`,
  `ALL_BELIEFS`.
- `GameConfig` extension: `pantheons: ReadonlyMap<PantheonId, PantheonDef>`
  and `beliefs: ReadonlyMap<BeliefId, BeliefDef>`.
- `GameConfigFactory.ts` registers the new content.
- Content-validation test: every bonus resolves to a valid
  `EffectDef`, IDs unique, category distributions sane (≥3 per
  category).

Still no system change. Players can read panel data but no action
fires yet.

### Cycle C — Wire religionSystem

Deliverables:
- `systems/religionSystem.ts`:
  - Handle 6 `ReligionAction` variants.
  - Implement passive pressure step on `START_TURN` (iterate cities,
    apply proximity + trade-route pressure contributions).
  - Convert pressure to followers at the end-of-turn boundary.
  - Spend Faith for `ADOPT_PANTHEON` / `FOUND_RELIGION` /
    `ENHANCE_RELIGION`.
- `state/ReligionLogic.ts` — pure helpers:
  - `proximityPressure(state, cityId, religionId) → number`
  - `tradeRoutePressure(state, cityId, religionId) → number`
  - `applyFollowerConversion(city, perReligion) → CityReligiousState`
- `GameState.religion: ReligionState` added.
- `SaveLoad` extended (see §7 Migration).
- `GameAction` union extended with `ReligionAction` variants.
- Register `religionSystem` in the pipeline.
- `effectSystem` picks up pantheon + founder beliefs as
  `ActiveEffect`s.
- Unit tests per new action; integration test for a full
  pantheon→found→spread→enhance flow.

### Cycle D — Religious units + theological combat

Deliverables:
- `data/units/religion/` content: `antiquity-missionary.ts` (if
  present in age — Civ VII places Missionaries in Exploration, so
  this may be an Exploration-only file), `exploration-missionary.ts`,
  `exploration-apostle.ts`, `modern-apostle.ts`.
- `data/units/religion-promotions.ts` — Apostle promotion pool
  (Debater, Heathen Conversion, Translator, Orator, etc.).
- `combatSystem` grows a theological branch that consumes
  `INITIATE_THEOLOGICAL_COMBAT`. Damage model: subtract opponent
  strength from own charges.
- `movementSystem` stops charging standard units for adjacency to a
  hostile Apostle (religious units do not exert ZoC).
- `productionSystem` allows Faith as a purchase currency.
- UI: Missionary / Apostle unit cards, belief picker panel at
  `FOUND_RELIGION` time.

### Cycle E — Religious Legacy Path + victory

Deliverables:
- `victorySystem` adds a religious branch: player has "converted" a
  critical mass of cities.
- Exploration-age `LegacyPaths` extended with `religion: number` (or
  the existing `culture` path adopts conversion milestones — TBD).
- Religious crisis event (Schism) data entry in
  `data/crises/all-crises.ts`.
- UI: Legacy Path panel shows religion progress.
- Regression: all existing save files still load. All existing tests
  still green.

---

## 9. Open questions (research gaps)

These are **unresolved by my current Civ VII knowledge** and must be
pinned before Cycle C. Each is a blocker for one of the later
cycles, not for Cycle A.

1. **Exact Pantheon list + effects.** Civ VII's official pantheon
   roster and their bonus magnitudes. The 10 examples in §4 are
   common 4X conventions; the actual game may differ.
2. **Faith threshold curve.** Is 25 correct for the first pantheon
   pick? Does it scale by game speed or by pick count (first pick
   25, second pick 35, etc.)?
3. **Religion founding cost.** 200 Faith is Civ VI convention; Civ
   VII may use a different number.
4. **Religion slot count.** Civ VI used floor((playerCount+1)/2);
   Civ VII rules unclear.
5. **Belief categories.** The four-way split (follower / founder /
   enhancer / worship) is Civ VI. Civ VII may collapse enhancer +
   worship, or add a fifth "Reformation" category.
6. **Enhancement threshold.** "Spread to 5 cities" is Civ VI.
7. **Pressure formula.** Exact proximity falloff, trade-route
   multiplier, and unit-spread one-shot magnitudes.
8. **Apostle promotion list.** The Civ VII Apostle promotion pool is
   not documented at rulebook granularity; §18.5 / §18.7 both leave
   exact promotion names unspecified.
9. **Theological combat formula.** Damage = opponent strength? Flat
   charge loss? Is there HP at all or only charges?
10. **Holy City capture effects.** Does founder strength decrease on
    Holy City capture? Does the conqueror get a combat bonus against
    the founder?
11. **Religious Legacy Path existence.** Does Civ VII actually have
    one, or was religion rolled into the Culture Legacy Path in
    Exploration?
12. **Religion + Age Transition.** Does enhancement carry over? Does
    the Faith pool reset? Do religious units survive?

Each open question will be answered by a rulebook audit between
Cycle B and Cycle C. Cycle A commits only **types and shapes** — the
numbers that fill them can evolve without forcing a type change if
the discriminated unions above are chosen well.

---

## 10. Non-goals (for this cycle)

- No edits to `civ7-rulebook.md`. (Draft section lives alongside as
  `rulebook-religion-section.md`.)
- No `GameState.religion` field.
- No engine barrel edit. `types/index.ts` is not touched.
- No content data files.
- No system file.
- No UI changes.
- No save format bump.

This keeps the cycle mechanical: types land, compile-time tests
confirm shapes, build is green, existing tests untouched.

---

## 11. Acceptance checklist for Cycle A

- [x] `religion-system.md` ≥ 400 lines of plan.
- [x] `rulebook-religion-section.md` 100–200 lines.
- [x] `types/Religion.ts` — all types named, `readonly`, JSDoc,
      named exports.
- [x] `Religion.types.test.ts` — one test per exported type /
      variant family.
- [x] `npm run build` passes.
- [x] `npm run test:engine` passes.
- [x] Zero edits to any existing file.

---

## 12. Relationship to other parity cycles

Religion touches or is touched by several other parity efforts:

- **Districts overhaul** (`districts-overhaul.md`): the `holy_site`
  district is the Faith-generating district that also unlocks
  religion founding at its city. Cycle B of religion depends on
  the district system being mature enough that "has a holy_site in
  city X" is a cheap query. If districts-overhaul is still in
  flight, religion can fall back on the `has Temple building` check
  as a proxy.
- **Commander system** (`commander-system.md`): no direct
  interaction. Commanders do not buff religious units; religious
  units do not pack into a commander's stack. Keep these orthogonal.
- **Government & Social Policies** (parity task #27, no doc yet):
  likely has a Theocracy government whose bonus is a religion
  multiplier. Will compose via `EffectDef` — no new interface work.
- **Per-tile specialist slots** (parity task #29): worship buildings
  add specialist slots. Content layer only.
- **AI Overhaul** (`ai-overhaul.md`): the AI needs religion heuristics
  (pick a pantheon whose bonus matches your civ's strength; spread
  to your neighbors; enhance when spread is healthy). Added in
  Cycle D / E alongside the unit content.

The critical sequencing is: **Cycle A (this) → Cycle B (rulebook
merge + content) → rulebook audit to close §9 questions → Cycle C
(wiring)**. Cycles D and E can proceed in parallel with the
Government/Legacy work above.

---

## 13. Summary

Religion & Pantheons is missing from Hex Empires entirely, even
though the `faith` yield, `religious` unit category, and `holy_site`
district shell already exist. This plan scaffolds the types in a
parallel namespace (`types/Religion.ts`) and drafts a rulebook
section so the Civ VII rules get captured alongside the code. No
engine behavior changes this cycle; the full behavior lands across
four more sub-cycles with a rulebook audit in between. The Cycle A
deliverables are self-contained, additive, and do not risk any
existing test.
