# Government & Social Policies — Design & Implementation Plan

**Status:** DESIGN + TYPE SCAFFOLDING (Cycle A of 5).
**Owner:** engine team.
**Tracks gap:** `rulebook-gaps.md` §14 row — "Government & Social Policies
— thin". Closes the "Civ7 parity: Government & Social Policies" item in
the project task list.
**Rulebook reference:** `civ7-rulebook.md` §14 (Governments and Social
Policies), §4.5 (Celebrations), §9 (Civics), §10 (Technology — for
Codex unlocks).
**Sister plans:** `commander-system.md` (same 5-cycle pattern),
`districts-overhaul.md` (parallel-types-during-migration pattern).

---

## 1. Why change?

### 1.1 Current behavior (pre-cycle)

Today the engine has **no government system at all**. Nothing in
`PlayerState` represents the player's government. No data files for
governments or policies exist. `effectSystem` collects active effects
only from civilization, leader, and legacy bonuses (per
`rules/data-driven.md`). There is no `Codex` concept anywhere —
Library/Academy buildings (referenced by rulebook §8) exist in data but
their Codex slots are unused metadata.

As a consequence:

- The "Celebration government bonus" mentioned in §4.5 (10-turn bonus,
  player picks one of two options) has no anchor — there is no
  government to read the bonus from, so Celebrations currently fall
  back to a flat happiness+production bonus.
- The "Social Policies drive empire customization" lever that Civ VII
  leans on heavily is entirely absent. Players currently customize
  their empire only through techs, civics, and leader choice — there
  is no mid-game policy-swap decision layer.
- Civic-tree unlocks in `data/civics/*` reference "Government:
  Republic" etc. in their descriptions but nothing consumes those
  unlocks in systems.

This is the last major omission vs the rulebook (per
`rulebook-gaps.md` §14 — flagged as **thin**).

### 1.2 Civ VII behavior (target)

Per §14 and §4.5:

- Players pick a **Government** early in each Age. The government is
  **locked for the Age** (re-picked on age transition).
- Each government grants: 1 **Policy slot** + 2 **Celebration bonus
  options** (10-turn buffs).
- At least 3 government options per age (§14.1).
- **Social Policies** are slotted into Policy slots. Base 1 slot per
  age; celebrations, Leader Attributes (Diplomatic tier 3), and some
  Civics/Techs add more. Policies swap freely between turns (§14.2).
- **Codices** are placed in buildings with Codex slots (Library: 2,
  Academy: 3, Palace: 4 — §14.3). Each Codex provides bonus Science
  per turn. Codices are unlocked via Tech/Civic Masteries.

Adopting this faithfully touches:

- **PlayerState** — add a `GovernmentState` substructure.
- **Effect system** — slotted policies contribute to the player's
  active effect bag.
- **Celebrations** — the §4.5 government bonus table must be anchored
  on the player's current government.
- **Age transition** — government resets; player picks again.
- **Codex placement** — a building-scoped slot system, parallel to the
  existing `CityState.buildings` list, that stores Codex records.
- **UI** — new Government Panel + Policy swap UI (Cycle E).

### 1.3 Scope of this plan

This plan is **one design doc + 5 sub-cycles**, not one patch. This
document (Cycle A) delivers DESIGN + TYPE SCAFFOLDING only. No behavior
changes; no old tests break. Data files and system wiring land in
Cycles B–E.

---

## 2. Civ VII rules recap

### 2.1 Governments (§14.1)

| Rule | Spec |
|------|------|
| Pick frequency | Once per Age (first turn of each Age) |
| Lock | Locked for the Age; cannot change mid-Age |
| Options per Age | ≥ 3 |
| Grants | 1 Policy slot + 2 Celebration bonus options (10-turn) |
| Extra effects | Per-government legacy bonus (implied — each government has a flavor effect) |

§4.5 enumerates six **example** governments with celebration bonuses
(but does not assign them to ages):

| Government | Option A | Option B |
|---|---|---|
| Classical Republic | +20% Culture | +15% Production toward Wonders |
| Despotism | +20% Science | +30% Production toward Infantry |
| Oligarchy | +20% Food | +30% Production toward Buildings |
| Feudal Monarchy | +20% Food | +30% Production toward Cavalry/Naval |
| Plutocracy | +20% Gold | +30% Production toward Overbuilding |
| Theocracy | +20% Culture | +40% Production toward Civilian/Support |

These map plausibly to Antiquity (Classical Republic, Despotism,
Oligarchy) and Exploration (Feudal Monarchy, Plutocracy, Theocracy)
based on historical flavor. Modern needs ≥ 3 more (Democracy, Fascism,
Communism — standard 4X conventions; see `rulebook-government-
expansion.md` for our full roster).

### 2.2 Social Policies (§14.2)

| Rule | Spec |
|------|------|
| Slot type restriction | None — any policy fits any slot (rulebook-stated) |
| Base slot count | 1 per Age |
| Extra slots | Each Celebration adds 1; Leader Attributes (Diplomatic tier 3); specific Civics and Techs |
| Swap cost | Free between turns (no cost, no cooldown per rulebook) |
| Categories | Not enforced as restrictions but useful for taxonomy: military, economic, diplomatic, wildcard |

The rulebook does **not** enumerate policies. This is a research gap
(see §9 Open Questions). Our proposed roster lives in
`rulebook-government-expansion.md` §2.

### 2.3 Celebrations (§4.5)

Celebrations trigger from excess global Happiness. Each celebration:
1. Unlocks 1 additional Social Policy slot (permanent).
2. Provides a government-specific 10-turn bonus (player picks one of two).

The 10-turn bonus comes from the **current government**. If the player
changes government mid-celebration (only possible at age transition),
the bonus does NOT revert — it expires naturally at turn-end of the
10th turn. This resolves `rulebook-gaps.md` §4.5 open question #3.

### 2.4 Codex System (§14.3)

| Building | Codex slots |
|---|---|
| Library (Antiquity) | 2 |
| Academy (Antiquity) | 3 |
| Palace | 4 |

- Codices are earned by completing **Tech Masteries** or **Civic
  Masteries** — one Codex per mastery.
- Each Codex occupies one slot in a Codex-capable building.
- Each slotted Codex yields **+1 Science per turn** (our convention;
  rulebook says "bonus Science per turn" without a number — resolved
  in §9 Open Questions).
- Codex placement is optional — an unplaced earned Codex goes into the
  player's `unplacedCodices` reservoir.
- Codices persist across ages (they are effectively permanent
  science legacies, matching rulebook §14.3 spirit).

---

## 3. Current state in code

Files in play and their current role:

- `packages/engine/src/types/GameState.ts`
  - `PlayerState` has no government fields.
  - `EffectDef` has no variant for slotted-policy effects (they will
    reuse existing `MODIFY_YIELD`, `MODIFY_COMBAT`, etc. — no new
    variant needed).
  - `GameAction` has no government/policy/codex actions.
- `packages/engine/src/data/` has no `governments/` or `policies/`
  directory.
- `packages/engine/src/systems/` has no `governmentSystem.ts`.
- `data/civics/**.ts` files already reference government-unlocking
  civics in their `description` strings but no machine-readable
  `unlocks` field ties civics to governments.
- `celebrationSystem` / happiness celebration logic in `resourceSystem`
  applies a flat `+10%` bonus — it does not read a government.
- Library and Academy `BuildingDef` entries already carry a
  `codexSlots` field (per `rulebook-gaps.md` note on §8.1) that is
  inert metadata today.

Nothing in the current code has the concept of "a government currently
active for player P" or "a policy slotted by player P". That is all new.

---

## 4. Proposed data model

All new types live in a **parallel namespace** (`types/Government.ts`),
mirroring the commander-system.md pattern. During Cycles A–D the
government state is decorated onto the player by id (a side-map, not a
new field on `PlayerState`), so `PlayerState` stays type-stable. Cycle
C wires the side-map through the pipeline; Cycle E inlines it into
`PlayerState` and retires the side-map.

### 4.1 `GovernmentDef`

```ts
interface GovernmentDef {
  readonly id: GovernmentId;                      // e.g., 'classical-republic'
  readonly name: string;
  readonly age: Age;                               // antiquity | exploration | modern
  readonly unlockCivic: string;                   // CivicId gating access
  readonly policySlots: PolicySlotCounts;         // per-category slot counts
  readonly celebrationBonuses: readonly [
    GovernmentCelebrationBonus,
    GovernmentCelebrationBonus
  ];
  readonly legacyBonus: EffectDef | null;          // passive "flavor" effect while in-government
  readonly description: string;
}
```

- `policySlots` is a four-tuple-as-object giving the count of each
  slot category the government exposes. Since the rulebook says "any
  policy fits any slot", categories are **taxonomic only** — the
  count controls how many of each type a government opens. A value of
  0 means "no slot of that kind." Default government shape:
  `{ military: 0, economic: 1, diplomatic: 0, wildcard: 0 }` (the
  base 1 slot).
- `celebrationBonuses` is a fixed-length 2-tuple matching §4.5's "one
  of two options" rule. Each option is a list of `EffectDef` applied
  for a 10-turn window.
- `legacyBonus` is the "flavor" effect the government gives while
  active (e.g., Classical Republic may have `+1 Culture per city`).
  Optional because the rulebook is ambiguous on whether every
  government has one.

### 4.2 `PolicyDef`

```ts
interface PolicyDef {
  readonly id: PolicyId;
  readonly name: string;
  readonly category: PolicyCategory;               // 'military' | 'economic' | 'diplomatic' | 'wildcard'
  readonly age: Age | 'all';                       // age when the policy unlocks; 'all' = available once prereq met
  readonly prerequisiteCivic: string | null;       // CivicId that unlocks this policy
  readonly prerequisiteTech: string | null;        // TechnologyId alternative unlock
  readonly effects: ReadonlyArray<EffectDef>;      // what the policy does while slotted
  readonly description: string;
}
```

- `category` is taxonomy; `GovernmentDef.policySlots` tells you how
  many you can slot.
- `prerequisiteCivic`/`prerequisiteTech` — a policy can be gated
  either way. Most are civic-gated.
- `effects` is a list (not one) because many policies do multiple
  small things (e.g., "+1 Culture per city, +10% Influence").

### 4.3 `PolicySlotCounts` and `PolicyCategory`

```ts
type PolicyCategory = 'military' | 'economic' | 'diplomatic' | 'wildcard';

interface PolicySlotCounts {
  readonly military: number;
  readonly economic: number;
  readonly diplomatic: number;
  readonly wildcard: number;
}
```

### 4.4 `GovernmentCelebrationBonus`

```ts
interface GovernmentCelebrationBonus {
  readonly id: string;                             // stable id, for ui radio selection
  readonly name: string;                           // "Culture Boom"
  readonly description: string;                    // "+20% Culture for 10 turns"
  readonly effects: ReadonlyArray<EffectDef>;
}
```

### 4.5 `GovernmentState` (runtime, per-player)

```ts
interface GovernmentState {
  readonly playerId: PlayerId;
  readonly currentGovernmentId: GovernmentId | null;   // null during first turn of Antiquity
  readonly slottedPolicies: ReadonlyMap<PolicyCategory, ReadonlyArray<PolicyId>>;
  readonly unlockedPolicies: ReadonlyArray<PolicyId>;  // policies the player has unlocked but not necessarily slotted
  readonly unlockedGovernments: ReadonlyArray<GovernmentId>;
  readonly bonusSlotCount: number;                     // +1 per celebration, per Diplomatic attribute tier 3, etc.
  readonly activeCelebrationBonus: ActiveCelebrationBonus | null;
}

interface ActiveCelebrationBonus {
  readonly governmentId: GovernmentId;                 // captured at grant time (stable across gov change)
  readonly bonusId: string;                            // which of the two options was picked
  readonly turnsRemaining: number;                     // 0-10
  readonly effects: ReadonlyArray<EffectDef>;
}
```

Rationale:

- `slottedPolicies` is keyed by category because that's the grain the
  UI operates on ("this government has 2 economic slots — here are
  both"). When the government changes, all slots clear.
- `unlockedPolicies` is monotonic — once unlocked, always available.
- `unlockedGovernments` is monotonic across the game and age-filtered
  at UI time (only show governments whose `age` matches the player's
  current age).
- `bonusSlotCount` applies to the **wildcard** category by convention
  (extra slots are wildcard per rulebook §14.2).
- `activeCelebrationBonus` captures the government at grant time so
  an age transition mid-bonus does not cancel the effect (resolves
  `rulebook-gaps.md` §4.5 Q3).

### 4.6 `CodexDef` and `CodexPlacement`

```ts
interface CodexDef {
  readonly id: CodexId;                            // e.g., 'codex.mastery.writing'
  readonly name: string;                           // "Codex of Writing"
  readonly unlockSource: CodexUnlockSource;        // what mastery unlocked it
  readonly yields: YieldSet;                       // per-turn yields when slotted (default: +1 science)
  readonly description: string;
}

type CodexUnlockSource =
  | { readonly type: 'tech-mastery'; readonly techId: string }
  | { readonly type: 'civic-mastery'; readonly civicId: string };

interface CodexPlacement {
  readonly codexId: CodexId;                       // which codex
  readonly buildingId: BuildingId;                 // which building instance (compound key below)
  readonly cityId: CityId;                         // which city the building is in
  readonly slotIndex: number;                      // 0..codexSlots-1
}
```

Building instance keys: since buildings are currently addressed by
`BuildingId` per-city (CityState.buildings), a placement is uniquely
identified by `(cityId, buildingId, slotIndex)`. The Palace is treated
as a special capital-only pseudo-building with 4 slots.

### 4.7 `CodexInventoryState`

```ts
interface CodexInventoryState {
  readonly playerId: PlayerId;
  readonly ownedCodices: ReadonlyArray<CodexId>;     // all earned, placed or not
  readonly placements: ReadonlyArray<CodexPlacement>;
  readonly unplacedCodices: ReadonlyArray<CodexId>;  // reservoir awaiting placement
}
```

Invariant (validated by the system, not the type): every
`codexId` in `placements` is also in `ownedCodices`, and
`unplacedCodices` is exactly `ownedCodices` minus `placements`' codex
ids.

### 4.8 Side-map storage on GameState (Cycle C)

`GameState` gains (Cycle C, not this cycle):

```ts
readonly governments: ReadonlyMap<PlayerId, GovernmentState>;
readonly codexes: ReadonlyMap<PlayerId, CodexInventoryState>;
```

Keying by `PlayerId` avoids widening `PlayerState` during the
transition cycles.

---

## 5. Proposed actions

New `GameAction` variants (added in Cycle C, typed here as
`GovernmentAction`):

```ts
// Pick or switch government. Legal only at first turn of an Age.
{ readonly type: 'SET_GOVERNMENT';
  readonly playerId: PlayerId;
  readonly governmentId: GovernmentId }

// Slot a policy into the government's slot of the given category.
// Replaces any existing policy in that slot for that category.
{ readonly type: 'SLOT_POLICY';
  readonly playerId: PlayerId;
  readonly category: PolicyCategory;
  readonly slotIndex: number;      // which slot within the category (0..count-1)
  readonly policyId: PolicyId }

// Remove a policy from a slot; slot becomes empty.
{ readonly type: 'UNSLOT_POLICY';
  readonly playerId: PlayerId;
  readonly category: PolicyCategory;
  readonly slotIndex: number }

// Pick option A or B when a celebration triggers.
{ readonly type: 'PICK_CELEBRATION_BONUS';
  readonly playerId: PlayerId;
  readonly bonusId: string }       // matches one of the two GovernmentCelebrationBonus ids

// Codex actions (Codex subsystem — see §6).
{ readonly type: 'PLACE_CODEX';
  readonly playerId: PlayerId;
  readonly codexId: CodexId;
  readonly cityId: CityId;
  readonly buildingId: BuildingId;
  readonly slotIndex: number }

{ readonly type: 'UNPLACE_CODEX';
  readonly playerId: PlayerId;
  readonly codexId: CodexId }
```

The pre-existing `SET_CIVIC` and mastery actions stay as-is; the new
`governmentSystem` observes mastery completion events to grant
Codices.

---

## 6. System changes

### 6.1 New system: `governmentSystem`

A new pure function `(state, action) => state` handling all
government/policy/celebration actions:

- `SET_GOVERNMENT` — validates turn is first turn of an Age (via
  `state.age` and `state.turn`), validates the government is in
  `unlockedGovernments`, clears slotted policies, sets
  `currentGovernmentId`.
- `SLOT_POLICY` / `UNSLOT_POLICY` — validates the policy is unlocked,
  the government has a slot of that category+index, and the policy is
  not already slotted in another slot by this player (no double-slot).
- `PICK_CELEBRATION_BONUS` — consumes a pending pick, installs an
  `ActiveCelebrationBonus` with `turnsRemaining = 10`.
- Turn tick (on `END_TURN`) — decrements
  `activeCelebrationBonus.turnsRemaining` and clears it at 0.

### 6.2 Effect collection hook

`effectSystem` is augmented (Cycle D) to read:

- `currentGovernmentId` → `GovernmentDef.legacyBonus` effect.
- Slotted policies → `PolicyDef.effects` for each.
- `activeCelebrationBonus.effects` for the 10-turn window.
- Slotted codices → `CodexDef.yields` applied as yield bonuses on the
  hosting city.

All fold into the existing `ActiveEffect[]` bag the rest of the
systems already consume. No new `EffectDef` variant is needed.

### 6.3 New system: `codexSystem`

Separate from `governmentSystem` to keep files focused:

- `PLACE_CODEX` / `UNPLACE_CODEX` — validate the building exists in
  the city and has free slots, move the codex between `placements`
  and `unplacedCodices`.
- Mastery hook — when `researchSystem`/`civicSystem` records a
  mastery, `codexSystem` emits a new Codex into `unplacedCodices`.

### 6.4 Pipeline order

```
turnSystem → effectSystem → movementSystem → citySystem →
  combatSystem → fortifySystem → growthSystem → productionSystem →
  resourceSystem → researchSystem → codexSystem → ageSystem →
  diplomacySystem → updateDiplomacyCounters → governmentSystem →
  victorySystem
```

- `codexSystem` slots in after `researchSystem` so mastery completions
  emit codices in the same turn.
- `governmentSystem` is near the end so celebration bonuses tick after
  all yields are computed, and government-change during age
  transition sees the finalized age.

### 6.5 Age transition hook

`ageSystem` is extended (Cycle D) to reset `currentGovernmentId` to
`null` when age advances — forcing the player to re-pick on the first
turn of the new age. Slotted policies persist if their policy's `age`
is `'all'` and are dropped otherwise. `unlockedPolicies` stays.

---

## 7. Codex subsystem — mini-design

The Codex subsystem is worth its own micro-design because it's the
most mechanically interesting part of §14.3.

### 7.1 Principle

A Codex is a **permanent science legacy** that a player earns by
mastering a tech or civic. Codices persist across ages and must be
**placed** in a Codex-capable building slot to activate their yield.

### 7.2 Earning

When `masteredTechs` / `masteredCivics` (in `PlayerState`, already
present in main but not in this worktree yet) gains an entry,
`codexSystem` appends a matching `CodexDef` to that player's
`CodexInventoryState.unplacedCodices`. Each mastery yields exactly one
codex (resolves `rulebook-gaps.md` §14.3 "is it one codex per mastery"
question).

### 7.3 Naming convention for CodexDefs

`codex.<source>.<subject>` where `source` ∈ `{tech, civic}` and
`subject` is the mastered tech/civic id — e.g.,
`codex.tech.writing`, `codex.civic.code-of-laws`. This lets data
files be auto-generated from the tech/civic registries in Cycle B
(one codex per mastery-eligible tech/civic).

### 7.4 Placement constraints

- Only buildings whose `BuildingDef.codexSlots > 0` accept codices.
- The Palace is the only building guaranteed to exist (every capital
  has a Palace in Civ VII). We model the Palace as a pseudo-building
  with a fixed id `building.palace` and 4 codex slots (per §14.3).
- No two codices share the same `(cityId, buildingId, slotIndex)`.
- A codex can be moved freely between turns (consistent with the
  "policies swap freely" spirit of §14.2).

### 7.5 Yield contribution

Each placed codex grants **+1 Science per turn to the hosting city**
(our convention — the rulebook says only "bonus Science per turn"
without a number). Policies or Attributes may later amplify this
per-codex yield (e.g., a Scientific attribute might make each codex
yield +2). That amplification flows through existing `MODIFY_YIELD`
effects — no new variant needed.

### 7.6 Data generation (Cycle B)

Rather than hand-author one codex per tech, Cycle B generates them at
registry-build time from the mastery-eligible techs/civics. Open
question: whether codex-earning is limited to specific "keystone"
masteries or all masteries. We assume all; a keystone filter can be
added as a data flag on the tech/civic def later.

---

## 8. Implementation cycles

Five sub-cycles, each independently commit-able and testable.

### Cycle A — Types & rulebook expansion (THIS CYCLE)
Deliverables:
- `design/government-system.md` (this doc).
- `design/rulebook-government-expansion.md` — draft expanded §14 for
  later merge into the rulebook.
- `types/Government.ts` with `GovernmentDef`, `PolicyDef`,
  `PolicyCategory`, `PolicySlotCounts`, `GovernmentState`,
  `ActiveCelebrationBonus`, `GovernmentCelebrationBonus`, `CodexDef`,
  `CodexPlacement`, `CodexInventoryState`, `GovernmentAction`,
  `GovernmentId`, `PolicyId`, `CodexId`, base constants.
- `state/__tests__/Government.types.test.ts` — compile-time shape
  tests.
- No engine barrel edit, no behavior change. Engine builds and
  existing tests still pass.

### Cycle B — Data files
Deliverables:
- `data/governments/antiquity-governments.ts` — 3 entries
  (Classical Republic, Despotism, Oligarchy).
- `data/governments/exploration-governments.ts` — 3 entries
  (Feudal Monarchy, Plutocracy, Theocracy).
- `data/governments/modern-governments.ts` — 3 entries
  (Democracy, Fascism, Communism).
- `data/governments/index.ts` — barrel `ALL_GOVERNMENTS`.
- `data/policies/{antiquity,exploration,modern}-policies.ts` —
  5–8 policies per age (see rulebook-government-expansion.md §2).
- `data/policies/index.ts` — barrel `ALL_POLICIES`.
- `data/codices/generator.ts` — programmatic codex generator keyed
  off `ALL_TECHNOLOGIES` and `ALL_CIVICS`.
- Content-validation unit tests (references exist, IDs unique, each
  government has its unlockCivic in the civics registry).
- Still no system change: governments and policies are defined but
  unselectable. Registry lookups work.

### Cycle C — GameState wiring + governmentSystem
Deliverables:
- New `systems/governmentSystem.ts` and `systems/codexSystem.ts`.
- `GameState.governments: ReadonlyMap<PlayerId, GovernmentState>`
  and `GameState.codexes: ReadonlyMap<PlayerId, CodexInventoryState>`
  fields added.
- `SaveLoad` handles both new maps.
- `GameAction` discriminated union absorbs the six new action
  variants.
- `GameInitializer` seeds each player with an empty
  `GovernmentState` and `CodexInventoryState`.
- Unit tests per new action (ValidAction + InvalidAction pairs).

### Cycle D — Effect integration + celebration wiring
Deliverables:
- `effectSystem` reads the government/policy/celebration effects.
- `resourceSystem` celebration-bonus branch replaced by reading
  `activeCelebrationBonus`.
- `ageSystem` resets `currentGovernmentId` on age transition.
- `researchSystem` / `civicSystem` hook into `codexSystem` for
  mastery-triggered codex grants.
- Integration tests: slotted policy yields appear on cities;
  celebration 10-turn window ticks and expires; codex yields add
  to city science; government persists through non-age-transition
  turns.

### Cycle E — UI + migration
Deliverables:
- New Government Panel in `packages/web/src/ui/` listing available
  governments, current policies, codex placements.
- Celebration-bonus modal replaces the current flat-bonus toast.
- Save migration: old saves without `governments`/`codexes` get
  empty defaults (no gameplay change for legacy saves).
- Optionally inline `GovernmentState` and `CodexInventoryState` into
  `PlayerState` and retire the side-maps (deferred if risky).

---

## 9. Open questions (research gaps)

These are **unresolved by the current rulebook** and must be pinned
before Cycle C. Flagged here so the next rulebook audit covers them;
parallel to the list in `rulebook-gaps.md` §14 and §4.5.

1. **Exact government roster per age.** §4.5 lists 6 governments
   across the three ages but does not assign them. Our proposed
   mapping is in `rulebook-government-expansion.md` §1.
2. **Modern-age governments.** Rulebook is silent on Modern
   governments. We assume Democracy / Fascism / Communism.
3. **Policy list.** No policies are named in the rulebook. We propose
   5–8 per age; see `rulebook-government-expansion.md` §2.
4. **Slot counts per government.** Rulebook says "1 slot" base per
   government. We propose category-varied slot maps (some govs have
   2 military, some 2 economic). May need rebalancing.
5. **Codex per-turn yield.** "Bonus Science per turn" is vague. We
   assume +1 Science per codex. Subject to rebalancing.
6. **Codex earning rule.** One codex per mastery, or only specific
   "keystone" masteries? We assume all.
7. **Ideologies.** §12.4 implies a Modern-age Government subtype
   called Ideology, gated by Political Theory. Unclear if it's a
   special government or a Modern-only policy track. We model it as
   Modern governments for now.
8. **Tax rate or econ-modifier per government.** §14.1 hints "Any
   other government-differentiating effects? Tax rate?" We model
   per-government flavor via `legacyBonus`.
9. **Government change at age transition.** Are slotted policies
   kept if they are still legal under the new government's slot
   counts, or always cleared? We clear them on gov change.
10. **Celebration bonus and government change.** If the player
    changes government mid-celebration bonus (only possible at age
    transition), does the bonus expire, revert, or continue to the
    10-turn end? We continue — see §2.3.
11. **Policy swap cost.** Free per §14.2, but some 4X conventions
    add a 1-turn anarchy when switching governments. Rulebook
    silent — we use zero cost.
12. **Celebration slot type.** §14.2 says celebrations add slots but
    not which category. We assume wildcard.

Each open question is a blocker for Cycle C or D, not for Cycle A.
Cycle A commits only **types and shapes** — the numbers and rules that
fill them can evolve without forcing a type change if the discriminated
unions and optional fields are chosen well.

---

## 10. Non-goals (for this cycle)

- No system file additions yet.
- No `GameState.governments` or `GameState.codexes` field yet — that
  lands in Cycle C.
- No `GameAction` discriminant extension yet.
- No engine barrel edit. `types/index.ts` is not touched.
- No data files.
- No UI changes.
- No save format bump.
- No edit to `civ7-rulebook.md`. The expanded draft lives in a
  separate file for later merge.

This keeps the cycle mechanical: types land, compile-time tests
confirm shapes, build is green, existing tests untouched.

---

## 11. Acceptance checklist for Cycle A

- [x] `government-system.md` ≥ 400 lines of plan.
- [x] `rulebook-government-expansion.md` — draft expanded §14.
- [x] `types/Government.ts` — all types named, `readonly`, JSDoc,
      strict TS.
- [x] `Government.types.test.ts` — one test per exported type.
- [x] Zero edits to any existing file.
- [x] Commit message matches the spec.

---

## 12. Cross-cycle parity

This plan deliberately mirrors `commander-system.md` structure: five
cycles, A = types + plan only, B = data, C = system + state, D =
effect wiring, E = UI + migration. Teams reviewing one understand the
other by analogy. Shared conventions:

- Parallel-namespace types during migration (side-map on `GameState`,
  inlined in Cycle E if safe).
- No engine barrel edit in Cycle A.
- Compile-time shape tests in `state/__tests__/` that construct a
  minimum-valid literal of every exported type and exercise every
  discriminant.
- Rulebook-expansion draft is a sibling doc to the system plan so the
  rulebook itself stays pristine until a deliberate merge cycle.
