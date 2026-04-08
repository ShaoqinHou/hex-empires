# Project Status

## Current State
- **Phase:** Initial setup
- **Last verified:** N/A
- **Active feature:** Project scaffolding

## Completed
- [x] .claude/ workflow configured (hooks, rules, skills)
- [x] Package structure (engine + web workspaces)

## Phase 1: Foundation
- [ ] HexCoord, HexGrid, neighbor/distance math
- [ ] GameState type definition
- [ ] Registry<T> generic class
- [ ] Terrain data + TerrainRegistry
- [ ] MapGenerator (seeded noise)
- [ ] Canvas HexRenderer (draw hex tiles with terrain colors)
- [ ] Camera (pan, zoom)
- [ ] React app shell wired to canvas

## Phase 2: Core Game Loop
- [ ] TurnSystem (phase management, player order)
- [ ] MovementSystem (unit movement, movement points)
- [ ] Unit data + UnitRegistry
- [ ] Pathfinding (A* on hex grid)
- [ ] Click-to-select, click-to-move flow
- [ ] TopBar + BottomBar UI
- [ ] Unit rendering on canvas

## Phase 3: Cities & Production
- [ ] GrowthSystem (population, food, housing)
- [ ] ProductionSystem (production queue, build units/buildings)
- [ ] ResourceSystem (yield calculation, strategic/luxury resources)
- [ ] City founding (settler → city)
- [ ] CityPanel UI
- [ ] Territory/borders rendering
- [ ] Building data + BuildingRegistry

## Phase 4: Research & Ages
- [ ] ResearchSystem (science points, tech unlocks)
- [ ] Technology data (antiquity/exploration/modern)
- [ ] TechTreePanel UI
- [ ] AgeSystem (progress, transitions)
- [ ] Civilization data + CivRegistry
- [ ] Leader data + LeaderRegistry
- [ ] Legacy bonuses
- [ ] AgeTransitionPanel UI

## Phase 5: Combat & Diplomacy
- [ ] CombatSystem (melee, ranged, siege)
- [ ] DiplomacySystem (relations, treaties, war/peace)
- [ ] AI player (action generation)
- [ ] DiplomacyPanel UI
- [ ] Combat animations

## Phase 6: Victory, Crises, Polish
- [ ] VictorySystem (multiple win conditions)
- [ ] CrisisSystem (event triggers, player choices)
- [ ] Crisis + Victory data
- [ ] Save/load (serialize GameState)
- [ ] Minimap
- [ ] Sound hooks
- [ ] Effect system (civ/leader abilities)

## Workflow Improvements
(none yet)
