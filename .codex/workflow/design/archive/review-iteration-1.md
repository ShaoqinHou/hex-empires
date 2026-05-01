# Review Iteration 1 — Quality Pass

## Critical Bugs (FIXED)
1. **Camera pan direction inverted** — Dragging moved viewport same direction as mouse instead of opposite (grab-to-drag). Fixed in GameCanvas.tsx.
2. **Module-level mutable counters** — `cityCounter` and `unitIdCounter` in citySystem/productionSystem were non-deterministic. Fixed to derive IDs from state.
3. **All units rendered as identical triangles** — Created UnitIcons.ts with distinct canvas-drawn icons per unit category (shield/warrior, bow/ranged, diamond/scout, house/settler, hammer/builder, etc.)

## Architecture Issues Found

### Systems hardcode data instead of reading from registries
This is the **biggest violation** of the data-driven pattern. Systems should read stats from registries, not hardcoded lookup tables.

**Files with hardcoded lookup tables that should use registry:**
- `movementSystem.ts` — terrain costs hardcoded (lines 68-85)
- `combatSystem.ts` — unit combat stats hardcoded (lines 113-140), unit ranges hardcoded (lines 142-153), terrain defense bonuses hardcoded (lines 155-170)
- `turnSystem.ts` — base movement points hardcoded (lines 72-84)
- `researchSystem.ts` — tech costs hardcoded (lines 65-80)
- `productionSystem.ts` — production costs hardcoded (lines 92-112)
- `growthSystem.ts` — terrain yields hardcoded (lines 68-86)

**Fix plan:** Systems should receive registries as parameters or query them from a shared context. However, the architecture says systems are pure functions `(state, action) => state` with no external dependencies. Options:
1. Embed registry references in GameState
2. Pass registries through a context parameter
3. Accept the duplication (simpler but maintenance burden)

### GameState missing features
- No `rng` usage in systems (counter never advances)
- Cities don't have districts
- No trade routes
- No war weariness
- No unit promotions detail
- No great people

### Domination victory logic wrong
Currently triggers when opponent has 0 cities. Should require controlling all *capitals*.

## UX Issues

### Missing UI panels
- No DiplomacyPanel
- No game event log viewer
- No attack action button (how to attack enemies?)
- No age transition selection UI (shows when??)

### Canvas rendering gaps  
- Tech tree doesn't show connection lines between prereqs
- No fog of war visualization
- Minimap doesn't show camera viewport rectangle
- City names overlap at zoom levels

### Interaction issues
- selectedUnit stale reference after move (should re-fetch from state)
- No right-click context menu
- No edge-of-screen scrolling (Civ standard)
- No WASD camera movement

## Prioritized Fix Plan

### P0 — Must fix (gameplay broken)
1. Fix selectedUnit sync after move/combat
2. Add attack interaction (click enemy unit when own unit selected)
3. Fix domination victory condition

### P1 — Should fix (usability)
4. Add edge-of-screen camera scrolling  
5. Add WASD camera movement
6. Show unit type name on hover/select in BottomBar
7. Tech tree prereq connection lines
8. Minimap camera viewport indicator

### P2 — Polish
9. Move hardcoded stats to registry lookups
10. Add DiplomacyPanel
11. Add event log panel
12. Fog of war rendering
