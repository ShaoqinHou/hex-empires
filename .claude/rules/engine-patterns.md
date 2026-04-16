---
purpose: Engine-side patterns that have no grep-checkable rule today — immutable state updates, state.config vs global registries, seeded RNG, age transitions.
layer: rule
injected-at: session-start, subagent-start
consumed-by: implementer, reviewer, fixer
last-validated: 2026-04-17
---

# Engine Patterns

The existing `architecture.md` + `import-boundaries.md` cover layering. This doc covers four specific engine patterns that the pre-WF-AUTO-14 workflow had no rule for but that agents routinely got wrong. Most of this was implicit in `inject-rules.sh` comments or only surfaced during Reviewer findings — making it explicit here so both implementer and Reviewer use the same words.

---

## 1. Immutable state updates — new collections, never `.set()`

### The rule

Systems return a new `GameState` object. Every collection nested inside (`units`, `cities`, `players`, etc.) is `ReadonlyMap` / `ReadonlyArray` by type. Call sites that mutate (`.set()`, `.push()`, `.sort()`) are type-violations AND correctness bugs — the previous state is still live in the event log / replay buffer / React prop tree.

### Correct patterns

Replacing one entry in a `ReadonlyMap`:

```typescript
const nextUnits = new Map(state.units);
nextUnits.set(unitId, { ...unit, movementLeft: 0 });
return { ...state, units: nextUnits };
```

Appending to a `ReadonlyArray`:

```typescript
return { ...state, log: [...state.log, newEvent] };
```

Removing from a `ReadonlyMap`:

```typescript
const nextUnits = new Map(state.units);
nextUnits.delete(unitId);
return { ...state, units: nextUnits };
```

Updating one field of a nested object in a map:

```typescript
const unit = state.units.get(unitId);
if (!unit) return state;
const updated: UnitState = { ...unit, hp: unit.hp - damage };
const nextUnits = new Map(state.units);
nextUnits.set(unitId, updated);
return { ...state, units: nextUnits };
```

### Traps

- **`state.units.set(...)` directly** — TypeScript's `ReadonlyMap` type blocks this at compile time; if you see yourself needing it, you're mutating the live state. Make a new Map first.
- **`[...state.log].push(x); return state`** — the spread makes a new array but then you push to it instead of using spread in the return. Still doesn't mutate `state.log` but is confusing; prefer `[...state.log, x]`.
- **Returning a new outer `{ ...state, units: X }` but X is the same reference as `state.units`** — no-op. Either the update is wrong, or you didn't need to return a new state object.

### Reviewer grep patterns

- `state\.\w+\.set\(` inside a system → likely a BLOCK (use `new Map(state.X)` first).
- `state\.\w+\.push\(` → likely a BLOCK.
- `\.sort\(` on `state.X` directly (not on a copy) → likely a BLOCK.

---

## 2. `state.config.X` not `ALL_X` globals

### The rule

Systems look up content via `state.config.units`, `state.config.buildings`, etc. — the `GameConfig` object embedded in `GameState` by `GameConfigFactory`. They do NOT import `ALL_UNITS` / `ALL_BUILDINGS` / etc. directly from `../data/`.

### Why

`state.config` is the injection seam. Tests override it with focused fixtures. Headless simulations override it to restrict the game to a subset. If systems import `ALL_X` directly, tests have to globally stub the registry, breaking parallel test execution and making "what content is visible to this system" invisible at the call site.

### Correct pattern

```typescript
import type { GameState, GameAction } from '../types/GameState';

export function productionSystem(state: GameState, action: GameAction): GameState {
  if (action.type !== 'END_TURN') return state;
  const unitDef = state.config.units.get('warrior');
  if (!unitDef) return state;
  // ... use unitDef.combat, unitDef.cost, etc.
}
```

### Traps

- **`import { ALL_UNITS } from '../data/units/index'`** inside a system file → violates the seam. The `inject-rules.sh` hook has long called this out; `engine-patterns.md` now makes it a first-class rule.
- **`import { ALL_CIVILIZATIONS } from '../data/civilizations/index'`** same class.
- **Reading `ALL_X` at module top-level into a const, then using the const** — same bug in slow motion. The const binds at import time to a specific registry, ignoring `state.config`.

### Reviewer grep patterns

- `^import.*ALL_[A-Z_]+.*from.*data/` inside `packages/engine/src/systems/*.ts` → BLOCK.
- `^import.*ALL_[A-Z_]+.*from.*data/` inside `packages/engine/src/state/*.ts` → WARN (state utilities occasionally have legitimate reasons; check whether a `state.config` seam exists for the call).

---

## 3. Seeded RNG — never `Math.random()`

### The rule

Games must be reproducible from seed. Every randomness draw goes through `state.rng`, which threads through the system pipeline. `Math.random()` in engine code is a BLOCK.

### Correct pattern

```typescript
import { nextRandom, randomInt } from '../state/SeededRng';

// Single draw
const { value, rng } = nextRandom(state.rng);
return { ...state, rng };

// Integer in range
const { value: roll, rng: nextRng } = randomInt(state.rng, 1, 6);
return { ...state, rng: nextRng };
```

The pattern of destructuring `{ value, rng }` and threading the new rng back through the returned state is mandatory — otherwise successive draws in the same system return the same number.

### Tests

Tests fabricate an `RngState` via `createRng(seed)`:

```typescript
import { createRng } from '@hex/engine';

const state = createMinimalState({ rng: createRng(12345) });
```

Same seed → same draws → deterministic test. Never `Math.random()` inside test setup.

### Traps

- **`Math.random()` anywhere in `packages/engine/`** → BLOCK. The existing PostToolUse hook (`check-edited-file.sh`) already greps for this.
- **Destructuring `{ value }` but not the new `rng`** → the next draw returns the same value because `state.rng` never advanced.
- **`Date.now()` used as RNG seed** → non-deterministic across machines, breaks reproducibility. If a system legitimately needs wall-clock time (rare), it should accept it as an action payload, not call it directly.

### Reviewer grep patterns

- `Math\.random\(\)` anywhere under `packages/engine/` → BLOCK.
- `nextRandom\(state\.rng\)` without the returned `rng` being used in the state update → WARN (forgotten advance).
- `createRng\(Date\.now\(\)\)` → BLOCK in tests, WARN otherwise.

---

## 4. Age transition invariants

### The rule

`TRANSITION_AGE` is the most delicate action in the pipeline. On transition:
- The player's civilization changes (they pick from the next age's roster).
- The player's leader persists.
- The previous civ's `legacyBonus` is appended to `player.legacyBonuses`. **Legacy bonuses accumulate across ages — they never get replaced or truncated.**
- Some systems reset their state (e.g. `researchProgress` resets to 0 if the new age invalidates the previous research); others persist (cities, units, victory progress, diplomatic relations).

### The rule's three invariants

1. **Legacy bonuses only append.** Never overwrite `player.legacyBonuses` — always spread-append: `[...player.legacyBonuses, newBonus]`.
2. **Leader persists.** Never change `player.leaderId` in a TRANSITION_AGE handler.
3. **State you don't own stays alone.** If `civicSystem` doesn't care about the transition, `civicSystem` returns state unchanged. Don't defensively touch unrelated fields.

### Reference implementation

`packages/engine/src/systems/ageSystem.ts` lines 30-80. Read it before adding a new system that reacts to `TRANSITION_AGE`.

### Traps

- **`legacyBonuses: [legacyBonus]`** → wipes previous ages' bonuses. BLOCK.
- **Changing `leaderId` on age transition** → BLOCK.
- **`researchProgress: 0` unconditionally** → may be correct for the new age's techs but only if the age actually invalidated the current research. Conditional on `isCurrentResearchValidInNewAge`.

### Reviewer grep patterns

- `case 'TRANSITION_AGE'` handler in a system that writes `legacyBonuses: ` not prefixed with spread → BLOCK.
- `case 'TRANSITION_AGE'` handler that writes `leaderId:` → BLOCK.

---

## How to use this doc

- **Implementer** reads this before touching a system or state utility. Catches ~40% of Reviewer-flaggable issues at write time.
- **Reviewer** uses the grep patterns above as structured checks, plus the prose as judgment backup.
- **Fixer** references the "Correct pattern" code blocks verbatim in BLOCK fixes.
- **When Reviewer finds a novel engine-side trap**, log a `[PRINCIPLE-GAP]` entry in `issues.md` with the pattern; periodically a human (or the audit-workflow skill) promotes repeat gaps into this doc.
