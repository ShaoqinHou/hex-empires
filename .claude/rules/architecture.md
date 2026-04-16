---
purpose: Engine/renderer separation, system pipeline shape, GameState as single source of truth, data-file purity rule. Foundational layering constraints.
---

# Architecture Rules

## Core Principle: Engine/Renderer Separation

The game has two packages with a strict boundary:

- **`packages/engine/`** — Pure TypeScript game logic. ZERO DOM, Canvas, React, or browser dependencies. Must run in Node, browser, Web Worker, or test harness.
- **`packages/web/`** — React app with Canvas renderer and Tailwind UI. Imports from engine. Handles all presentation.

## System Pipeline Pattern

Every game mechanic is a **pure function**:

```typescript
type System = (state: GameState, action: GameAction) => GameState;
```

Rules:
- Systems MUST be pure — same input always produces same output
- Systems MUST NOT have side effects (no DOM, no network, no random without seeded RNG)
- Systems MUST NOT import from each other — they are independent
- Systems process only actions they care about, return state unchanged for others
- The `GameEngine` orchestrator calls systems in sequence

## GameState is the Single Source of Truth

- All game data lives in one immutable `GameState` object
- State is NEVER mutated — systems return new state objects
- Use `ReadonlyMap`, `ReadonlyArray`, `readonly` properties
- UI reads state, dispatches actions, receives new state

## Data Files Are Pure Data

Files in `packages/engine/src/data/` are pure data exports conforming to type interfaces.
- No game logic in data files (exception: victory condition check functions)
- No imports from systems or engine internals
- Only import from `../types/` for type definitions

## Registry Pattern

All game content is registered in typed registries at startup:
- `civRegistry`, `leaderRegistry`, `unitRegistry`, `techRegistry`, `buildingRegistry`, `terrainRegistry`
- Systems and UI query registries — never hardcode content references
- Adding content = new data file + barrel export update

## Canvas Renderer is a Thin View

The Canvas renderer in `packages/web/src/canvas/`:
- ONLY reads engine state — never mutates it
- Handles camera (pan, zoom), tile rendering, unit sprites, animations
- Animations are purely visual interpolations — state is already updated
- Cannot import from `ui/` — renderer and React UI are independent

## React UI Reads State and Dispatches Actions

UI panels in `packages/web/src/ui/`:
- Read state from `GameProvider` context
- Dispatch `GameAction` objects to the engine
- Cannot import from `canvas/` — UI and renderer are independent
- Managed by `UIProvider` — mutually exclusive panels
