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

// Pipeline assembled in GameProvider.tsx — order matters
const SYSTEMS: System[] = [
  turnSystem,                 // validates phase, player order
  visibilitySystem,           // fog of war, tile visibility
  effectSystem,               // civ/leader/legacy ability effects
  movementSystem,             // unit movement, pathfinding, ZoC
  citySystem,                 // city founding, territory, upgrade
  combatSystem,               // damage, flanking, first strike, walls
  promotionSystem,            // unit promotion and experience
  fortifySystem,              // unit fortification
  improvementSystem,          // tile improvements (farms, mines, etc.)
  buildingPlacementSystem,    // building placement in cities
  districtSystem,             // district placement, adjacency bonuses
  growthSystem,               // population, food, town specialization
  productionSystem,           // queues, overflow, rush buying
  resourceSystem,             // yields, happiness, celebrations
  researchSystem,             // technology progress, mastery
  civicSystem,                // civic research, civ-unique civics
  ageSystem,                  // age transitions, legacy bonuses
  diplomacySystem,            // relations, war/peace, endeavors, sanctions
  updateDiplomacyCounters,    // diplomacy turn counters
  specialistSystem,           // citizen specialist assignment
  tradeSystem,                // merchant units, trade routes
  governorSystem,             // governor recruitment, assignment, promotion
  crisisSystem,               // crisis events, trigger conditions
  victorySystem,              // win condition checks (7 paths)
];

function applyAction(state: GameState, action: GameAction): GameState {
  let next = state;
  for (const system of SYSTEMS) {
    next = system(next, action);
  }
  return next;
}
```

Note: `aiSystem` (generateAIActions) is NOT in the pipeline — it's a utility function `(state) → GameAction[]` called separately by GameProvider for AI turns.

### GameState (single source of truth)

The entire game is one immutable state object:

```typescript
interface GameState {
  readonly turn: number;
  readonly currentPlayerId: PlayerId;
  readonly phase: TurnPhase;                              // 'start' | 'actions' | 'end'
  readonly players: ReadonlyMap<PlayerId, PlayerState>;
  readonly map: HexMap;
  readonly units: ReadonlyMap<UnitId, UnitState>;
  readonly cities: ReadonlyMap<CityId, CityState>;
  readonly districts: ReadonlyMap<DistrictId, DistrictSlot>;
  readonly governors: ReadonlyMap<GovernorId, Governor>;
  readonly tradeRoutes: ReadonlyMap<string, TradeRoute>;
  readonly diplomacy: DiplomacyState;
  readonly age: AgeState;
  readonly builtWonders: ReadonlyArray<BuildingId>;
  readonly crises: ReadonlyArray<CrisisState>;
  readonly victory: VictoryState;
  readonly log: ReadonlyArray<GameEvent>;
  readonly rng: RngState;                                 // seeded RNG for determinism
  readonly config: GameConfig;                            // embedded content registries
  readonly lastValidation: ValidationResult | null;
}
```

### GameAction (discriminated union)

```typescript
type GameAction =
  // Core turn
  | { type: 'START_TURN' }
  | { type: 'END_TURN' }
  // Units
  | { type: 'MOVE_UNIT'; unitId: UnitId; path: ReadonlyArray<HexCoord> }
  | { type: 'ATTACK_UNIT'; attackerId: UnitId; targetId: UnitId }
  | { type: 'ATTACK_CITY'; attackerId: UnitId; cityId: CityId }
  | { type: 'FORTIFY_UNIT'; unitId: UnitId }
  | { type: 'PROMOTE_UNIT'; unitId: UnitId; promotionId: string }
  // Cities & production
  | { type: 'FOUND_CITY'; unitId: UnitId; name: string }
  | { type: 'SET_PRODUCTION'; cityId: CityId; itemId: string; itemType: ProductionItem['type'] }
  | { type: 'PURCHASE_ITEM'; cityId: CityId; itemId: string; itemType: 'unit' | 'building' }
  | { type: 'PURCHASE_TILE'; cityId: CityId; tile: HexCoord }
  | { type: 'UPGRADE_SETTLEMENT'; cityId: CityId }
  | { type: 'SET_SPECIALIZATION'; cityId: CityId; specialization: TownSpecialization }
  | { type: 'ASSIGN_SPECIALIST'; cityId: CityId }
  | { type: 'UNASSIGN_SPECIALIST'; cityId: CityId }
  // Buildings, districts, improvements
  | { type: 'PLACE_BUILDING'; cityId: CityId; buildingId: BuildingId; tile: HexCoord }
  | { type: 'PLACE_DISTRICT'; cityId: CityId; districtId: DistrictId; tile: HexCoord }
  | { type: 'UPGRADE_DISTRICT'; districtId: DistrictId }
  | { type: 'BUILD_IMPROVEMENT'; unitId: UnitId; tile: HexCoord; improvementId: string }
  // Research & civics
  | { type: 'SET_RESEARCH'; techId: TechnologyId }
  | { type: 'SET_MASTERY'; techId: TechnologyId }
  | { type: 'SET_CIVIC'; civicId: string }
  | { type: 'SET_CIVIC_MASTERY'; civicId: string }
  // Diplomacy
  | { type: 'PROPOSE_DIPLOMACY'; targetId: PlayerId; proposal: DiplomacyProposal }
  | { type: 'DIPLOMATIC_ENDEAVOR'; targetId: PlayerId; endeavorType: string }
  | { type: 'DIPLOMATIC_SANCTION'; targetId: PlayerId; sanctionType: string }
  // Trade
  | { type: 'CREATE_TRADE_ROUTE'; merchantId: UnitId; targetCityId: CityId }
  // Ages & crises
  | { type: 'TRANSITION_AGE'; newCivId: CivilizationId }
  | { type: 'RESOLVE_CRISIS'; crisisId: string; choice: string }
  // Governors
  | { type: 'RECRUIT_GOVERNOR'; governorId: GovernorId }
  | { type: 'ASSIGN_GOVERNOR'; governorId: GovernorId; cityId: CityId }
  | { type: 'UNASSIGN_GOVERNOR'; governorId: GovernorId }
  | { type: 'PROMOTE_GOVERNOR'; governorId: GovernorId; abilityId: string }
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
  state/                — GameState type, YieldCalculator, CombatPreview, SaveLoad, EffectUtils, GameInitializer
  hex/                  — HexCoord, HexGrid, Pathfinding, MapGenerator, TerrainCost
  systems/              — pure function systems (24 systems, one file per system) + aiSystem
  effects/              — EffectDef types, effect evaluation (minimal — most logic in effectSystem)
  registry/             — Generic Registry<T>
  types/                — all TypeScript interfaces (GameState, District, Governor, Improvement, AIPersonality, etc.)
  data/                 — game content (data files only, grouped by age)
    civilizations/      — grouped by age: antiquity-civs.ts, exploration-civs.ts, modern-civs.ts
    leaders/            — all-leaders.ts (single file)
    units/              — grouped by age + promotions.ts
    buildings/          — grouped by age (includes wonders)
    technologies/       — organized by age subdirectories (antiquity/, exploration/, modern/)
    civics/             — organized by age subdirectories
    terrains/           — base-terrains.ts + features.ts
    crises/             — all-crises.ts (single file)
    districts/          — grouped by age
    governors/          — grouped by age
    improvements/       — index.ts (single file)
    resources/          — index.ts (single file)
```

## Data-Driven Content

### GameConfig Pattern

Content is embedded in `GameState.config` as a `GameConfig` object (built by `GameConfigFactory.ts`). This contains `ReadonlyMap<string, T>` fields for all content types, making content available to systems without global singletons:

```typescript
interface GameConfig {
  readonly units: ReadonlyMap<string, UnitDef>;
  readonly buildings: ReadonlyMap<string, BuildingDef>;
  readonly districts: ReadonlyMap<string, DistrictDef>;
  readonly technologies: ReadonlyMap<string, TechnologyDef>;
  readonly civics: ReadonlyMap<string, CivicDef>;
  readonly terrains: ReadonlyMap<string, TerrainDef>;
  readonly features: ReadonlyMap<string, TerrainFeatureDef>;
  readonly promotions: ReadonlyMap<string, PromotionDef>;
  readonly resources: ReadonlyMap<string, ResourceDef>;
}
```

A generic `Registry<T>` class also exists in `registry/` and is used by GameProvider for unit and resource lookups.

### Adding New Content

**Adding a new civilization requires exactly 2 edits:**
1. Create the entry in the appropriate age file (e.g., add to `antiquity-civs.ts`)
2. Ensure the barrel export `ALL_CIVILIZATIONS` in `civilizations/index.ts` includes it

Zero changes to engine systems, rendering, or UI. The `/add-content` skill has full step-by-step guides.

### Content Type Interfaces

- `CivilizationDef` — id, name, age, uniqueAbility, uniqueUnit, uniqueBuilding, legacyBonus
- `LeaderDef` — id, name, ability, agendas, compatibleAges
- `UnitDef` — id, name, age, category, cost, combat/rangedCombat/movement, requiredTech, upgradesTo
- `BuildingDef` — id, name, age, cost, maintenance, yields, effects, requiredTech, category, isWonder, happinessCost
- `TechnologyDef` — id, name, age, cost, prerequisites, unlocks, description, treePosition
- `TerrainDef` — id, name, movementCost, defenseBonus, baseYields, isPassable, isWater, color
- `CivicDef` — id, name, age, cost, prerequisites, unlocks, description, treePosition
- `DistrictDef` — id, name, type, age, cost, requiredTech, placementConstraints, adjacencyYields
- `GovernorDef` — id, name, title, specialization, abilities
- `ImprovementDef` — id, name, category, cost, requiredTech, yields, modifier
- `ResourceDef` — id, name, type (bonus/strategic/luxury), yields
- `PromotionDef` — id, name, tier, effects, requiredExperience

### Effect System

Abilities are expressed as composable `EffectDef` objects:

```typescript
type EffectDef =
  | { type: 'MODIFY_YIELD'; target: EffectTarget; yield: YieldType; value: number }
  | { type: 'MODIFY_COMBAT'; target: UnitCategory | 'all'; value: number }
  | { type: 'GRANT_UNIT'; unitId: string; count: number }
  | { type: 'UNLOCK_BUILDING'; buildingId: BuildingId }
  | { type: 'DISCOUNT_PRODUCTION'; target: string; percent: number }
  | { type: 'MODIFY_MOVEMENT'; target: UnitCategory | 'all'; value: number }
  | { type: 'FREE_TECH'; techId: TechnologyId }
  | { type: 'CULTURE_BOMB'; range: number }
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
- Multiple paths: domination, science, culture, economic, diplomacy, military, score
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

**Layout:** `TopBar`, `BottomBar`

**Panels (mutually exclusive via `activePanel` state in `GameUI` component):**
- `TechTreePanel` — tech tree for current age
- `CivicTreePanel` — civic tree for current age
- `CityPanel` — city detail: population, yields, production, buildings
- `DiplomacyPanel` — relations, trade, war/peace
- `AgeTransitionPanel` — pick new civ on age change
- `EventLogPanel` — game event history
- `TurnSummaryPanel` — end-of-turn summary

**Always-mounted overlays:**
- `VictoryPanel` / `VictoryProgressPanel` — victory conditions
- `CrisisPanel` — crisis event choices
- `Minimap` — map overview with camera viewport
- `Notifications` — game notifications
- `TurnTransition` — animated turn transition
- `EnemyActivitySummary` — post-AI-turn summary
- `ValidationFeedback` — action validation errors

**Components:** `CombatHoverPreview`, `BuildingPlacementPanel`, `ImprovementPanel`, `UnitCard`, `BuildingCard`, `AudioSettings`, tooltip system

Panel state is managed by plain `useState<Panel>` in the `GameUI` component in `App.tsx` — no UIProvider exists. (This local-state pattern is being phased out — see panel conventions below.)

### Panel Conventions (M33+)

Every panel in `packages/web/src/ui/panels/` follows one shared pattern. Adding or modifying a panel without following it produces visual drift, ESC inconsistencies, and z-index conflicts.

- **Location:** all panels live in `packages/web/src/ui/panels/`. Their body is wrapped in `<PanelShell>` (`packages/web/src/ui/panels/PanelShell.tsx`), which owns the title bar, close button, backdrop (modal only), z-index, context-menu suppression, and `role="dialog"` semantics. Do not hand-roll any of those.
- **Registration:** every panel id and its metadata (title, optional icon, optional keyboard shortcut, priority class) lives in `packages/web/src/ui/panels/panelRegistry.ts`. New panels must register here first — the `PanelId` union is the source of truth.
- **Activation:** panel open/close goes through `usePanelManager()` from `packages/web/src/ui/panels/PanelManager.tsx`. The hook exposes `openPanel(id)`, `closePanel()`, `togglePanel(id)`, `isOpen(id)`, and `activePanel`. Do not hold local `useState<boolean>` for a new panel's visibility; do not props-drill `onOpenXxx` callbacks. ESC handling is owned by the provider in capture phase.
- **Priority classes:** `modal` blocks the map and gets a backdrop (e.g. age transition, turn summary, victory progress). `overlay` floats over the map non-blocking (most panels — city, tech, diplomacy). `info` is a non-blocking side column (event log).
- **Styling:** panel chrome uses only the CSS custom properties from `packages/web/src/styles/panel-tokens.css` (`var(--panel-bg)`, `var(--panel-border)`, `var(--panel-z-modal)`, etc.). Never raw hex values, never hard-coded Tailwind color utilities for chrome. Panel body content can use whatever styling is appropriate, but prefer tokens for consistency.
- **Triggers:** TopBar buttons that open a panel get `data-panel-trigger="<id>"` and call `togglePanel('<id>')`. Keyboard shortcuts are wired in `App.tsx`'s keydown handler from the registry.

See `.claude/rules/panels.md` for the authoritative rule set and `.claude/skills/add-panel/` for a step-by-step guide when creating a new panel.

### State Flow

```
1. Canvas click → camera.screenToWorld(x, y) → pixelToHex(worldX, worldY) → HexCoord
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
