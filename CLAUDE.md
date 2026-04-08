# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Hex Empires is a turn-based strategy game inspired by Civilization VII. It's an educational/experimental project exploring game architecture with a focus on modularity and data-driven content.

**Key principles:**
- **Engine/renderer separation** — game logic is pure TypeScript with zero DOM dependencies
- **Data-driven content** — civilizations, leaders, units, techs are data files, not code
- **Composable systems** — each game mechanic is a pure function `(state, action) → newState`
- **Easy migration** — swap Canvas for Phaser/Three.js by replacing only the renderer

## Monorepo Structure

npm workspaces monorepo with two packages:

- **`packages/engine`** — Pure TypeScript game logic. ZERO browser/DOM dependencies. Can run in Node, browser, Web Worker, or test harness.
- **`packages/web`** — React SPA (Vite, port 5174), Canvas hex renderer, Tailwind v4 UI panels.

## Commands

```bash
# Development
npm run dev:all          # Start web (port 5174)
npm run dev:web          # Web only

# Testing
npm test                 # Full suite (engine + web)
npm run test:engine      # Engine tests only
npm run test:web         # Web tests only
bash .claude/hooks/run-tests.sh                    # Full + marker
bash .claude/hooks/run-tests.sh --module engine    # Engine + marker

# Build
npm run build            # Build engine + web
```

No linter/formatter config exists.

## Engine Architecture (packages/engine/src/)

### System Pipeline

The engine is a pipeline of pure functions. Each system processes actions it cares about and passes through the rest:

```typescript
type System = (state: GameState, action: GameAction) => GameState;

const SYSTEMS: System[] = [
  turnSystem,        // validates phase, player order
  movementSystem,    // unit movement, pathfinding
  combatSystem,      // combat resolution
  productionSystem,  // city production queues
  researchSystem,    // technology progress
  growthSystem,      // city population, food
  resourceSystem,    // yield calculation, trade
  diplomacySystem,   // relations, treaties, war/peace
  ageSystem,         // age progress, transitions
  crisisSystem,      // crisis events
  victorySystem,     // win condition checks
  effectSystem,      // triggered abilities
];

function applyAction(state: GameState, action: GameAction): GameState {
  let next = state;
  for (const system of SYSTEMS) {
    next = system(next, action);
  }
  return next;
}
```

### GameState (single source of truth)

The entire game is one immutable state object:

```typescript
interface GameState {
  readonly turn: number;
  readonly currentPlayerId: PlayerId;
  readonly phase: TurnPhase;          // 'start' | 'actions' | 'end'
  readonly players: ReadonlyMap<PlayerId, PlayerState>;
  readonly map: HexMap;
  readonly units: ReadonlyMap<UnitId, UnitState>;
  readonly cities: ReadonlyMap<CityId, CityState>;
  readonly diplomacy: DiplomacyState;
  readonly age: AgeState;
  readonly crises: ReadonlyArray<CrisisState>;
  readonly victory: VictoryState;
  readonly log: ReadonlyArray<GameEvent>;
  readonly rng: RngState;             // seeded RNG for determinism
}
```

### GameAction (discriminated union)

```typescript
type GameAction =
  | { type: 'START_TURN' }
  | { type: 'END_TURN' }
  | { type: 'MOVE_UNIT'; unitId: UnitId; path: ReadonlyArray<HexCoord> }
  | { type: 'ATTACK_UNIT'; attackerId: UnitId; targetId: UnitId }
  | { type: 'FOUND_CITY'; unitId: UnitId; name: string }
  | { type: 'SET_PRODUCTION'; cityId: CityId; itemId: string }
  | { type: 'SET_RESEARCH'; techId: TechnologyId }
  | { type: 'PROPOSE_DIPLOMACY'; targetId: PlayerId; proposal: DiplomacyProposal }
  | { type: 'TRANSITION_AGE'; newCivId: CivilizationId }
  | { type: 'RESOLVE_CRISIS'; crisisId: string; choice: string }
  // ... extensible
```

### Hex Grid (packages/engine/src/hex/)

Axial coordinate system:

```typescript
interface HexCoord {
  readonly q: number;  // column
  readonly r: number;  // row
}
```

Key functions: `neighbors()`, `distance()`, `ring()`, `range()`, `lineDraw()`, `coordToKey()`.

Pathfinding: A* with terrain-cost callbacks. Pure function: `(start, goal, costFn, map) → HexCoord[] | null`.

Map generation: Procedural via seeded noise. Reads terrain definitions from registry.

### File Structure

```
packages/engine/src/
  index.ts              — barrel export
  GameEngine.ts         — system pipeline orchestrator
  state/                — GameState type, immutable update helpers
  hex/                  — HexCoord, HexGrid, Pathfinding, MapGenerator
  systems/              — pure function systems (one file per system)
  effects/              — EffectPipeline, composable ability effects
  registry/             — Generic Registry<T> + content registries
  types/                — all TypeScript interfaces
  data/                 — game content (data files only)
    civilizations/      — one file per civ
    leaders/            — one file per leader
    units/              — one file per unit type
    buildings/          — one file per building
    technologies/       — organized by age (antiquity/, exploration/, modern/)
    terrains/           — terrain definitions
    crises/             — crisis event definitions
```

## Data-Driven Content

### Registry Pattern

Every content type uses a generic typed Registry:

```typescript
class Registry<T extends { readonly id: string }> {
  register(item: T): void;
  get(id: string): T | undefined;
  getAll(): ReadonlyArray<T>;
}
```

Content is registered at startup from barrel exports. Systems and UI query registries at runtime.

### Adding New Content

**Adding a new civilization requires exactly 2 edits:**
1. Create `packages/engine/src/data/civilizations/mongols.ts` with a `CivilizationDef` export
2. Add the import + entry to `ALL_CIVILIZATIONS` in `civilizations/index.ts`

Zero changes to engine systems, rendering, or UI. The `/add-content` skill has full step-by-step guides.

### Content Type Interfaces

- `CivilizationDef` — id, name, age, uniqueAbility, uniqueUnit, uniqueBuilding, legacyBonus
- `LeaderDef` — id, name, ability, agendas, compatibleAges
- `UnitDef` — id, name, age, category, cost, combat/rangedCombat/movement, requiredTech, upgradesTo
- `BuildingDef` — id, name, age, cost, maintenance, yields, effects, requiredTech
- `TechnologyDef` — id, name, age, cost, prerequisites, unlocks, effects, tree position
- `TerrainDef` — id, name, movementCost, defenseBonus, baseYields, isPassable

### Effect System

Abilities are expressed as composable `EffectDef` objects:

```typescript
type EffectDef =
  | { type: 'MODIFY_YIELD'; target: EffectTarget; yield: YieldType; value: number }
  | { type: 'MODIFY_COMBAT'; target: UnitCategory | 'all'; value: number }
  | { type: 'GRANT_UNIT'; unitId: UnitId; count: number }
  | { type: 'UNLOCK_BUILDING'; buildingId: BuildingId }
  | { type: 'DISCOUNT_PRODUCTION'; target: string; percent: number }
  // ... extensible discriminated union
```

Effects are evaluated by the `effectSystem` which collects active effects from the player's civ, leader, and legacy bonuses. Other systems query active effects to modify their calculations.

## Civ VII Mechanics

### Ages System
- Three ages: Antiquity → Exploration → Modern
- Each age has its own civilizations, technologies, units, buildings
- Age progress earned via milestones (techs researched, wonders built, etc.)
- On transition: player picks a new civilization from the next age, keeps their leader

### Leader-Civilization Separation
- Leaders are independent from civilizations
- A leader persists across all ages; civilizations change on age transition
- Leader ability is always active; civ ability is active only during that civ's age
- Game setup: pick leader first, then starting civilization

### Legacy Bonuses
- When transitioning ages, old civ's `legacyBonus` becomes a permanent `ActiveEffect`
- Effects stack across ages (Modern player has bonuses from Antiquity + Exploration civs)

### Crisis Events
- Data-driven events with trigger conditions (turn reached, tech researched, war declared)
- Present narrative text and player choices
- Each choice has effects (EffectDef)

### Victory Conditions
- Multiple paths: domination, science, culture, diplomacy, score
- Each condition is a function `(state, playerId) → { achieved, progress }`
- Checked by `victorySystem` at end of each turn

## Rendering Layer (packages/web/src/)

### Canvas Renderer
- Thin read-only view of engine state — NEVER mutates state
- `HexRenderer` draws hex grid, terrain, units, overlays
- `Camera` handles pan (drag/arrow keys) and zoom (scroll wheel)
- `AnimationManager` interpolates visual transitions (unit movement, combat)
- Animations are purely visual — state is already updated when animation starts

### UI Panels (React + Tailwind)
- `TopBar` — turn counter, age, resources, end turn button
- `BottomBar` — selected unit/city info, unit actions
- `Minimap` — map overview with camera viewport
- `TechTreePanel` — tech tree for current age
- `CityPanel` — city detail: population, yields, production, buildings
- `DiplomacyPanel` — relations, trade, war/peace
- `AgeTransitionPanel` — pick new civ on age change
- `VictoryPanel` — progress toward victory conditions

Panels managed by `UIProvider` — mutually exclusive (one open at a time).

### State Flow

```
1. Canvas click → camera.screenToHex(x, y) → HexCoord
2. UI determines intent → creates GameAction
3. GameProvider.dispatch(action) → engine.applyAction(state, action) → newState
4. React state update → UI panels re-render
5. State diff → AnimationManager queues visual transitions
6. requestAnimationFrame loop → HexRenderer.render(state) + animations
```

No traditional game loop tick. This is turn-based — the loop is: wait for input → process → render.

## Import Boundaries (STRICT)

- `packages/engine/` CANNOT import from `packages/web/` or any DOM/browser API
- `systems/` files CANNOT import from each other — each system is independent
- `data/` files are pure data exports — no logic (except victory condition check functions)
- `packages/web/` CAN import from `packages/engine/`
- `canvas/` CANNOT import from `ui/` (renderer and UI are independent)

See `.claude/rules/import-boundaries.md` for full rules.

## TDD Workflow

See `.claude/workflow/CLAUDE.md` for the full 6-phase TDD process.

Key skills: `/verify` (E2E browser), `/build` (dev commands), `/test` (testing conventions), `/add-content` (add civs/leaders/units/techs), `/consistency-audit` (content consistency).

## Prerequisites

- Node.js, npm (workspaces support)
- Windows MINGW64 — use `python` not `python3`
- Use `node -e` for JSON parsing (jq may not be available)

## Implementation Phases

1. **Foundation** — hex math, GameState type, MapGenerator, Canvas renderer
2. **Core loop** — TurnSystem, MovementSystem, pathfinding, click-to-move
3. **Cities & production** — GrowthSystem, ProductionSystem, ResourceSystem
4. **Research & ages** — ResearchSystem, AgeSystem, tech tree UI
5. **Combat & diplomacy** — CombatSystem, DiplomacySystem, AI players
6. **Victory & polish** — VictorySystem, CrisisSystem, save/load, animations
