# Import Boundary Rules

## The Rule

Packages and modules have strict import directions. Violations are caught by the PostToolUse hook.

## Package Boundary

```
packages/engine/  CANNOT import from  packages/web/
packages/web/     CAN import from     packages/engine/
```

The engine has ZERO browser dependencies. It must never import:
- `react`, `react-dom`
- DOM APIs (`document`, `window`, `canvas`, `requestAnimationFrame`)
- Any browser-specific module

## Engine Internal Boundaries

### Systems cannot import from each other

```typescript
// FORBIDDEN — systems/CombatSystem.ts importing from MovementSystem
import { getMovementRange } from './MovementSystem';

// CORRECT — shared logic goes in a utility
import { getMovementRange } from '../hex/Pathfinding';
```

### Data files cannot import from systems or engine core

```typescript
// FORBIDDEN — data file importing from a system
import { calculateCombat } from '../../systems/CombatSystem';

// CORRECT — data files only import types
import type { CivilizationDef } from '../../types/Civilization';
```

### Allowed import directions (engine)

```
data/{type}/     -> CAN import from: types/ (type definitions only)
systems/         -> CAN import from: types/, hex/, state/, registry/, effects/
effects/         -> CAN import from: types/, registry/
registry/        -> CAN import from: types/, data/ (for barrel imports)
hex/             -> CAN import from: types/
state/           -> CAN import from: types/
GameEngine.ts    -> CAN import from: systems/, state/, types/
```

## Web Internal Boundaries

### Canvas and UI are independent

```
canvas/    CANNOT import from  ui/
ui/        CANNOT import from  canvas/
```

Both can import from:
- `hooks/` and `providers/`
- `@hex/engine` (engine types and functions)

### Allowed import directions (web)

```
canvas/       -> CAN import from: @hex/engine, hooks/, providers/
ui/           -> CAN import from: @hex/engine, hooks/, providers/
hooks/        -> CAN import from: @hex/engine
providers/    -> CAN import from: @hex/engine, hooks/
```

## Import Aliases

- `@engine/*` -> `packages/engine/src/*`
- `@web/*` -> `packages/web/src/*`
- `@hex/engine` -> `packages/engine/src/index.ts` (barrel)

## Enforcement

The `PostToolUse` hook (`.claude/hooks/check-edited-file.sh`) detects:
- Engine files importing from web
- Cross-system imports
- Data files importing from systems
- Canvas/UI cross-imports
