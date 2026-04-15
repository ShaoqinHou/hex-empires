# Commander System — Design & Implementation Plan

**Status:** DESIGN + TYPE SCAFFOLDING (Cycle A of 5).
**Owner:** engine team.
**Tracks gap:** `gap-analysis-v3.md` — "Commander system" row in the
INTENTIONALLY SIMPLIFIED table. This plan removes that simplification.
**Rulebook reference:** `civ7-rulebook.md` §6.10, §7.

---

## 1. Why change?

### 1.1 Current behavior (pre-cycle)

Today every combat-capable unit accrues XP and can individually pick
promotions:

- `UnitState` carries `experience: number` and `promotions:
  ReadonlyArray<string>` (see `types/GameState.ts:42-43`).
- `combatSystem` awards XP to attacker and defender on every combat.
- `promotionSystem` handles `PROMOTE_UNIT` actions with a flat
  promotion list keyed by unit category (`melee`, `ranged`, `cavalry`,
  `siege`, `naval`, `all`). Thresholds: 15 / 30 / 60 XP for tiers
  1 / 2 / 3.
- Promotions are consumed: when a promotion is chosen, the threshold
  XP is deducted from the unit's pool (`promotionSystem.ts:44`).
- There is a single pool of promotions defined in
  `data/units/promotions.ts` (Battlecry, Tortoise, Volley, Arrows,
  Charge, Pursuit, Blitz, Logistics, Flanking, Breakthrough, Elite).
- The `Elite` tier-3 promotion has a `HEAL_ON_PROMOTE` effect that
  fully heals the unit.

This is simple, intuitive, and easy to test — but it is **not
Civilization VII**. In Civ VII, almost no unit promotes. Commanders
do.

### 1.2 Civ VII behavior (target)

From §6.10:

> Commanders are **the only units that gain experience and
> promotions** (a major departure from previous Civ games).

Commanders produce an **aura** of combat buffs for nearby friendly
units. Individual line units are interchangeable; the empire's
expertise lives in its commanders. This is a deliberate design
choice by the real game — it removes the per-unit promotion treadmill,
makes commander placement a first-class strategic concern, and makes
commanders valuable enough to persist across ages.

Adopting this faithfully touches:

- **Combat resolution** — auras feed into CS/RS computation.
- **Promotion UI** — the panel should open for a commander, not an
  arbitrary unit.
- **Unit data** — Commander becomes a unit category (or a new kind
  entirely), with per-age Commander definitions (Commander, Fleet
  Commander, eventually Squadron Commander).
- **Save/load** — commander XP and promotions need to persist.
- **Age transitions** — commanders carry over where ordinary units
  do not.

### 1.3 Scope of this plan

This plan is **one design doc + 5 sub-cycles**, not one patch. This
document (Cycle A) delivers DESIGN + TYPE SCAFFOLDING only. No
behavior changes; no old tests break. Behavior replacement begins in
Cycle C.

---

## 2. Civ VII rules recap (§6.10)

Condensed from the rulebook:

| Mechanic | Spec |
|----------|------|
| Who earns XP | Commanders only |
| Command Radius | 1 tile base (range 1 hex ring) |
| Stacking | Commander tile can hold the commander + up to 4 additional units (the "pack") |
| Persistence | Commanders survive age transitions with all XP and promotions |
| Focus Fire | Ranged units in radius may attack together |
| Coordinated Attack | Infantry/Cavalry in radius may attack together |
| Promotion trees | 5 branches: **Bastion** (defense), **Assault** (offense), **Logistics** (healing / supply / movement), **Maneuver** (flanking / repositioning), **Leadership** (radius / stacking / morale) |
| Commander progression effect | Military Academy (Modern) grants "Free Commander Level" |

XP source, exact XP curve, pick-per-level rules, aura magnitudes, and
the tree node layouts are **not specified** at the rulebook granularity
we currently have. These are **research gaps** (see §9 Open Questions).

### 2.1 Unit categories referenced by auras

§7.1–7.3 enumerate: Infantry, Ranged, Scout/Recon, Civilian, Cavalry,
Siege, Naval, Tank, Aircraft. Our current `UnitCategory` type is
`'melee' | 'ranged' | 'siege' | 'cavalry' | 'naval' | 'civilian' |
'religious'`. The aura target type will reuse these; Tank/Aircraft
extensions are deferred to the Modern content cycle.

### 2.2 Commander unit archetypes (inferred)

- **Antiquity:** "Commander" (land) — covers Infantry/Cavalry/Siege.
- **Exploration:** "Commander" and "Fleet Commander" (naval). The
  rulebook mentions Fleet Commander in §8.1 adjacency unlocks.
- **Modern:** "Commander" persists; likely a "Squadron Commander" or
  air-specific variant around Flight-era techs. We will keep Modern
  as generic Commander unless a rulebook update specifies otherwise.

Each commander unit is itself a `UnitDef` with `category: 'commander'`
(a NEW category we will add in Cycle B).

---

## 3. Current state in code

Files in play and their current role:

- `packages/engine/src/types/GameState.ts` — `UnitState` has
  `experience` and `promotions`. `UnitCategory` does not include
  `'commander'` yet. `GameAction` includes `PROMOTE_UNIT`.
- `packages/engine/src/systems/promotionSystem.ts` — single `if
  (action.type !== 'PROMOTE_UNIT') return state;` pipeline; validates
  the promotion pick against tier + category + XP, mutates
  `unit.promotions` and `unit.experience`, returns new state.
- `packages/engine/src/data/units/promotions.ts` — flat array of 11
  `PromotionDef` entries + `PROMOTION_THRESHOLDS`.
- `combatSystem` awards XP to both participants on combat resolution
  (not opened here — see Cycle C).
- UI: there is a promotion picker panel in `packages/web` that reads
  `unit.experience` and lists promotions — this will also be replaced
  in Cycle E.

Nothing in the current codebase has the concept of "aura" or "nearby
friendly unit lookup from a commander." That is all new.

---

## 4. Proposed data model

All new types live in a **parallel namespace** (`types/Commander.ts`,
not yet merged into `UnitState`). This is a deliberate choice: during
Cycles A–D the old and new systems coexist, so data must not collide.
Cycle C is the point where commander state starts being populated and
old per-unit XP stops; Cycle E removes the old fields.

### 4.1 `CommanderState`

Commander-specific runtime state. Layered on top of a regular
`UnitState` via `UnitId` — not a subclass. A unit is "a commander" iff
there is a `CommanderState` keyed by its `UnitId`.

```ts
interface CommanderState {
  readonly unitId: UnitId;          // the UnitState it decorates
  readonly xp: number;              // cumulative, never decrements
  readonly commanderLevel: number;  // derived from xp; stored for save stability
  readonly unspentPromotionPicks: number;
  readonly promotions: ReadonlyArray<CommanderPromotionId>;
  readonly tree: CommanderTree | null; // picked at first promotion, locked-in
  readonly attachedUnits: ReadonlyArray<UnitId>; // pack: max 4
  readonly packed: boolean;         // true when pack is sealed (moves as one)
}
```

Rationale:

- `xp` is monotonic. `unspentPromotionPicks` is the currency spent on
  promotions, granted on level up. Separating the two simplifies the
  UI ("you have 2 picks available") and the Military Academy bonus
  ("grant 1 pick").
- `tree` locks specialization once picked — consistent with common Civ
  VII multi-tree designs. Keeping it `null` until first pick lets the
  player inspect trees before committing.
- `attachedUnits` enforces the 4-unit stacking rule. Max validated in
  the system, not the type. `packed` is the pack/unpack toggle — when
  `true`, the pack moves as one and cannot be selectively targeted.

### 4.2 `CommanderTree` and `CommanderPromotionDef`

```ts
type CommanderTree =
  | 'bastion' | 'assault' | 'logistics' | 'maneuver' | 'leadership';

interface CommanderPromotionDef {
  readonly id: CommanderPromotionId;    // branded string
  readonly name: string;
  readonly description: string;
  readonly tree: CommanderTree;
  readonly tier: 1 | 2 | 3;
  readonly prerequisites: ReadonlyArray<CommanderPromotionId>;
  readonly aura: AuraEffectDef;
}
```

Distinct from `PromotionDef` — there is no `category` field because a
commander is not category-bound, and there is no HP-on-promote side
effect (healing is an aura, not a one-shot).

### 4.3 `AuraEffectDef`

Discriminated union, parallel to `EffectDef` but scoped to aura
semantics:

```ts
type AuraEffectDef =
  | { readonly type: 'AURA_MODIFY_CS';
      readonly target: UnitCategory | 'all';
      readonly value: number;
      readonly radius: number; }
  | { readonly type: 'AURA_MODIFY_RS';
      readonly target: UnitCategory | 'all';
      readonly value: number;
      readonly radius: number; }
  | { readonly type: 'AURA_HEAL_PER_TURN';
      readonly target: UnitCategory | 'all';
      readonly amount: number;
      readonly radius: number; }
  | { readonly type: 'AURA_EXTRA_MOVEMENT';
      readonly target: UnitCategory | 'all';
      readonly value: number;
      readonly radius: number; }
  | { readonly type: 'AURA_EXPAND_RADIUS';
      readonly delta: number; }            // Leadership tree
  | { readonly type: 'AURA_EXPAND_STACK';
      readonly delta: number; }            // Leadership tree
  | { readonly type: 'AURA_FORTIFY_BONUS';
      readonly target: UnitCategory | 'all';
      readonly value: number;
      readonly radius: number; };
```

The `AURA_EXPAND_RADIUS` and `AURA_EXPAND_STACK` variants act on the
commander's own capability — they modify the effective radius or
attached-unit cap of the commander, not buffs projected onto line
units.

### 4.4 Aura evaluation

Pure function, lives in `state/CommanderAura.ts` (created in Cycle D):

```ts
interface AuraBonus {
  readonly source: UnitId;           // which commander
  readonly promotionId: CommanderPromotionId;
  readonly type: AuraEffectDef['type'];
  readonly value: number;
}

function getAuraBonuses(
  state: GameState,
  unitId: UnitId
): ReadonlyArray<AuraBonus>;
```

Returns all bonuses active on a given unit from all nearby commanders
the unit's owner controls. Stacks linearly (sum all AURA_MODIFY_CS
into one CS delta). This is consumed by `combatSystem` in Cycle D.

Stacking rule when multiple commanders overlap: **additive**. Two
commanders with +2 Assault each = +4 CS for a unit in both radii.
This matches how ActiveEffects already stack.

### 4.5 Commander state storage on GameState

`GameState` gains (Cycle C):

```ts
readonly commanders: ReadonlyMap<UnitId, CommanderState>;
```

Keying by `UnitId` means we don't need a new ID type: a `CommanderId`
is just the `UnitId` of the commander unit.

---

## 5. Proposed actions

New `GameAction` variants (added in Cycle C, typed here):

```ts
// Spend a promotion pick on the commander's chosen tree.
{ readonly type: 'PROMOTE_COMMANDER';
  readonly commanderId: UnitId;
  readonly promotionId: CommanderPromotionId }

// First-pick-only: choose which tree this commander specializes in.
{ readonly type: 'SELECT_COMMANDER_TREE';
  readonly commanderId: UnitId;
  readonly tree: CommanderTree }

// Attach a friendly unit on the commander's tile to the pack.
{ readonly type: 'ATTACH_UNIT_TO_COMMANDER';
  readonly commanderId: UnitId;
  readonly unitId: UnitId }

// Remove a unit from the pack. Pack auto-detaches on commander death.
{ readonly type: 'DETACH_UNIT_FROM_COMMANDER';
  readonly commanderId: UnitId;
  readonly unitId: UnitId }

// Seal/unseal the pack for simultaneous movement.
{ readonly type: 'PACK_COMMANDER'; readonly commanderId: UnitId }
{ readonly type: 'UNPACK_COMMANDER'; readonly commanderId: UnitId }
```

The existing `PROMOTE_UNIT` action is kept through Cycle D for
regression safety and removed in Cycle E.

---

## 6. System changes

### 6.1 Rename and rewire

- `promotionSystem.ts` → `commanderPromotionSystem.ts`. The new
  file only handles commander actions.
- `combatSystem` stops awarding XP to non-commander units. Instead,
  on each combat involving a unit inside a commander's radius, the
  commander gains XP. XP formula: TBD (see §9); placeholder +1 per
  resolved combat where an attached/nearby unit participated.
- `combatSystem` consults `getAuraBonuses(state, unit)` when
  computing CS/RS.
- Movement/fortify systems grow minor hooks to respect pack
  movement if the commander is packed (Cycle B only stubs this).

### 6.2 Pipeline order

```
turnSystem → effectSystem → movementSystem → citySystem →
  combatSystem → fortifySystem → growthSystem → productionSystem →
  resourceSystem → researchSystem → ageSystem → diplomacySystem →
  updateDiplomacyCounters → commanderPromotionSystem → victorySystem
```

`commanderPromotionSystem` slots in after combat resolution so a
commander can apply their new pick before the turn ends; before
victory so any kill-count-based victory conditions see the post-combat
state.

---

## 7. Migration

Existing save files contain:

- `UnitState.experience` — numeric, possibly > 0 for many units.
- `UnitState.promotions` — arrays of promotion IDs from the old flat
  list.

**Policy: drop on load.** At load time the new `SaveLoad`
deserializer:

1. Coerces every non-commander unit's `experience` to `0` and
   `promotions` to `[]`. A one-time log entry announces the reset.
2. Auto-grants each player **one free Commander unit** on their
   capital tile at load time, provided the current age supports
   commanders. This softens the loss — veteran units become aura
   fodder for a fresh commander.

We intentionally do NOT try to migrate old promotions onto the new
commander: the old per-category promotions (e.g., Charge for cavalry)
do not translate cleanly to aura effects, and faking the mapping
would yield surprising balance.

Compatibility bump: save format version increments. Older saves
without `commanders` are accepted and treated as "no commanders yet."

---

## 8. Implementation cycles

Five sub-cycles, each independently commit-able and testable.

### Cycle A — Types (THIS CYCLE)
Deliverables:
- `design/commander-system.md` (this doc).
- `types/Commander.ts` with `CommanderState`, `CommanderTree`,
  `CommanderPromotionDef`, `AuraEffectDef`, `AuraBonus`,
  `CommanderPromotionId`.
- `state/__tests__/Commander.types.test.ts` — compile-time shape
  tests.
- No engine barrel edit, no behavior change. Engine builds and
  all existing tests still pass.

### Cycle B — Data files
Deliverables:
- Add `'commander'` to `UnitCategory` (enum union extension).
- `data/units/commanders/antiquity-commander.ts`,
  `exploration-commander.ts`, `fleet-commander.ts`,
  `modern-commander.ts`.
- `data/commander-promotions/` — one file per tree (bastion,
  assault, logistics, maneuver, leadership), each exporting 5–7
  `CommanderPromotionDef` items.
- Barrel export `ALL_COMMANDER_PROMOTIONS`.
- Content-validation unit test (references exist, IDs unique).
- Still no system change: commander units can be produced after
  this cycle but they behave exactly like any other unit.

### Cycle C — Replace promotionSystem
Deliverables:
- New `systems/commanderPromotionSystem.ts`; delete
  `promotionSystem.ts`.
- `GameState.commanders` added; `SaveLoad` handles it.
- New `GameAction` variants wired through the pipeline.
- `combatSystem` stops awarding XP to non-commanders and starts
  awarding to commanders in radius.
- Migration step (drop existing per-unit promotions on load).
- Unit tests per new action.

### Cycle D — Wire aura into combatSystem
Deliverables:
- `state/CommanderAura.ts` — `getAuraBonuses()` pure helper.
- `combatSystem` consumes aura bonuses in CS/RS computation.
- Integration tests: attack with and without aura, multiple
  commanders stack, radius boundary inclusive/exclusive.

### Cycle E — Remove individual unit promotion UI
Deliverables:
- Delete `PROMOTE_UNIT` action + UI panel.
- Remove `experience` and `promotions` fields from `UnitState`
  (or keep deprecated for one version with a migration note).
- Promotion panel replaced by a Commander Panel showing the
  commander's tree, XP, pack list, aura preview.
- Regression pass: full test matrix green, save/load round-trips
  mixed old/new states.

---

## 9. Open questions (research gaps)

These are **unresolved by the current rulebook** and must be pinned
before Cycle C. Flagged here so the next rulebook audit covers them.

1. **XP formula.** How much XP per combat? Per kill? Scaled by tile
   radius? Does the commander need to survive? We currently have
   "placeholder +1 per combat involving a nearby friendly"; real
   Civ VII appears to grade by opponent strength.
2. **Level curve.** What XP totals trigger level 2, 3, 4…? Civ VII
   uses a steep curve; we do not have numbers.
3. **Promotion picks per level.** Is it always 1 pick per level?
   Does reaching a cap grant an extra pick? The Military Academy
   "free Commander Level" bonus implies levels are the gating
   resource.
4. **Tree unlock rules.** Can commanders mix trees or is the first
   pick locking? We assume locking in §4.1; this may be wrong.
5. **Exact aura magnitudes and radii.** Are radii always 1? Does
   Leadership extend radius to 2? Magnitudes of +CS are unknown.
6. **Pack/unpack turn cost.** Is there a movement penalty for
   packing or unpacking mid-move?
7. **Pack composition limits.** Can a commander pack only land
   units? Must unit categories match the commander type (Fleet
   Commander = only naval)?
8. **Multiple commanders, same tile.** Can two commanders share a
   hex? If so, do their packs merge, remain separate, or reject?
9. **Death of a commander.** Does the pack survive? Lose XP?
   Scatter across adjacent tiles?
10. **Age transition commander cap.** The rulebook says commanders
    persist across ages. Is there a per-player cap that resets?
11. **Promotion retraining.** Can a player respec a tree? Cost?
12. **Special abilities (Focus Fire / Coordinated Attack).** Are
    these tree-unlocked auras or base commander capabilities? Do
    they consume the units' attacks?

Each open question is a blocker for one of the later cycles, not for
Cycle A. Cycle A commits only **types and shapes** — the numbers and
rules that fill them can evolve without forcing a type change if
the discriminated unions above are chosen well.

---

## 10. Non-goals (for this cycle)

- No system file renames yet.
- No `GameState.commanders` field yet — that lands in Cycle C.
- No `UnitCategory` extension yet — that lands in Cycle B.
- No engine barrel edit. `types/index.ts` is not touched.
- No UI changes.
- No save format bump.

This keeps the cycle mechanical: types land, compile-time tests
confirm shapes, build is green, existing tests untouched.

---

## 11. Acceptance checklist for Cycle A

- [x] `commander-system.md` ≥ 300 lines of plan.
- [x] `types/Commander.ts` — all types named, `readonly`, JSDoc.
- [x] `Commander.types.test.ts` — one test per exported type.
- [x] `npm run build` passes.
- [x] `npm run test:engine` passes.
- [x] Zero edits to any existing file.
- [x] Commit message matches the spec.
