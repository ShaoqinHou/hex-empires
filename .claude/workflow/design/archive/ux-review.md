# UX Review: Hex Empires vs Civilization VII

Comparative analysis of hex-empires UI/UX against Civilization VII's established patterns.
Based on Civ VII research (CivFanatics forums, official dev diaries, patch notes, wiki) and hex-empires source code review.

---

## 1. HUD Layout

### Civilization VII Layout

| Position | Elements |
|----------|----------|
| **Top-left** | Resource counters (gold, influence, science, culture, happiness, city capacity), era score wheel, science/culture progress buttons, government icon, quick-access menu buttons (civics, resources, great works, religion) |
| **Top-right** | Turn counter, notification area, advisor warnings |
| **Bottom-left** | Minimap with Telescope/Lens button above it; lens overlays for yields, resources |
| **Bottom-right** | Selected unit panel (stats + expanded action tray), Next Turn button (large, prominent, gold-accented) |
| **Center** | Clean map view; city banners floating above cities on map; unit flags above units on map |

### Hex Empires Current Layout

| Position | Elements |
|----------|----------|
| **Top bar (full-width strip)** | Left: turn number, age, unit count. Center: resource badges (gold, science, culture, faith). Right: Save, Load, Tech Tree button, End Turn button |
| **Bottom bar (full-width strip)** | Selected unit info OR selected hex info OR instructions text |
| **Bottom-left (overlay)** | Minimap (200x130 canvas) |
| **Right side (overlay panel)** | City panel when a city is clicked |
| **Full overlay** | Tech tree panel, Victory panel |

### Differences to Fix

1. **End Turn button position**: Hex Empires puts it in the top-right as a small button in a row. Civ VII places it in the **bottom-right** as a large, prominent, gold-accented button that demands attention. This is the single most-pressed button in the game and should be visually dominant.
   - **Fix**: Move End Turn to bottom-right corner. Make it larger (48px+ height) with gold/accent styling. It should be visible at all times, not tucked into the top bar.

2. **Resource display location**: Hex Empires places resources in the top-center. Civ VII places them in the **top-left** as global counters with icons, not centered.
   - **Fix**: Move resources to top-left. Add proper icons (not just colored dots). Show per-turn income (e.g., "+5" next to gold).

3. **Top bar is a solid strip consuming vertical space**: Hex Empires uses a 48px opaque bar across the entire top. Civ VII uses transparent/semi-transparent overlays that float over the map, maximizing visible map area.
   - **Fix**: Replace solid top/bottom bars with floating overlay elements positioned at corners. Let the map extend to screen edges.

4. **Bottom bar wastes space for unit info**: Hex Empires puts unit info in a full-width 56px bottom bar. Civ VII shows unit info in a **contained panel at bottom-right** with an expanded action tray.
   - **Fix**: Replace the full-width bottom bar with a bottom-right floating unit panel. Show unit portrait/icon, name, stats (HP, combat strength, movement), and action buttons in a compact card.

5. **No notification/advisor system**: Civ VII has an advisor notification area (top-right) that tells you about pending actions (units needing orders, production choices needed, etc.).
   - **Fix**: Add a notification queue in top-right showing pending decisions.

6. **No quick-access menu buttons**: Civ VII has icon buttons for civics, resources, great works, religion in the top-left area. Hex Empires has no equivalent quick-access to game systems.
   - **Fix**: Add icon buttons below resources for Tech (T), Diplomacy (D), etc.

7. **Age progress not shown**: Civ VII has an age progress wheel in the HUD with crisis pips. Hex Empires shows age as text only.
   - **Fix**: Add a visual age progress indicator near the turn counter.

---

## 2. City Screen

### Civilization VII City Screen

- **City banner on map**: Shows city name, population, current production icon with progress, and growth indicator. Clicking opens city management.
- **City management screen**: Overlays the map. Shows:
  - Settlement demographics (rural vs urban population)
  - Yields with full breakdown (base + adjacency + building bonuses)
  - Building placement on urban tiles (2 building slots per tile)
  - Production menu with base yield, warehouse improvements, adjacency preview
  - Growth bucket with food surplus tracking
  - Connected settlements overview
- **Adjacency system**: UI shows "what you see is what you get" -- yields are pre-calculated and displayed directly.
- **Production queue**: Scrollable list. Shows constructible's base yield, highest adjacency count. Net yield changes previewed on map when placing buildings.

### Hex Empires Current City Screen

- **City panel**: Right-side overlay (320px wide), positioned `absolute right-0 top-12 bottom-14`.
- Shows: city name, population, yields grid (6 yields in 3-col layout), growth bar, current production with progress bar, buildings list, build options (units then buildings).
- Build options show only antiquity-age items (hardcoded filter).
- No city banner on the map beyond a circle + name label.

### Differences to Fix

1. **No city banner with production info**: On the map, cities are just colored circles with name text. Civ VII shows a rich city banner floating above the city with population, current production icon, and growth indicator.
   - **Fix**: Add city banner component in HexRenderer that shows: city name bar (colored by owner), population number, small production icon with progress bar, growth arrow indicator.

2. **City panel lacks production turns estimate**: Hex Empires shows "progress/cost (yield/turn)" but not "X turns remaining."
   - **Fix**: Calculate and show turns to completion: `Math.ceil((cost - progress) / production)`.

3. **City panel lacks population breakdown**: Civ VII shows rural vs urban population and specialists.
   - **Fix**: Future concern -- once the district/specialist system is implemented.

4. **Build menu lacks yield previews**: Civ VII shows exactly what each building will provide including adjacency. Hex Empires shows raw cost and flat yields.
   - **Fix**: Show net yield change when hovering/selecting a production item (e.g., "+3 food, +1 production").

5. **City panel hardcodes antiquity age filter**: `availableUnits` and `availableBuildings` filter for `age === 'antiquity'` regardless of current age.
   - **Fix**: Filter by `player.age` instead of hardcoded `'antiquity'`.

6. **No building effects displayed**: Buildings show just their names as chips. Civ VII shows building effects and yield contributions.
   - **Fix**: Show tooltip or inline display of each building's yield contribution.

7. **City panel position blocks map view**: Right-side panel covers 320px of map permanently while open. Civ VII overlays the city management more centrally and provides a clear "back to map" transition.
   - **Fix**: Consider a larger centered overlay for city management (like the tech tree panel) rather than a side panel, to match Civ VII's full city screen approach.

---

## 3. Unit Display

### Civilization VII Unit Display

- **Unit flags**: Colored banner/flag floating above each unit showing unit type icon. Hostile units get a red outline. Unit flags are arrayed horizontally when stacked.
- **Health bars**: Visible below the unit when damaged. Health bars have been increased in weight for visibility. Correctly disappear at full health.
- **Selection**: Clicking a unit selects it. Selected unit shows expanded action tray in bottom-right panel.
- **Action tray**: Expanded by default showing all available actions (move, attack, fortify, etc.). Actions include Move (M), Range Attack (R), Fortify (F), Alert (V), Sleep (Z), Skip Turn (Space).
- **Movement indicators**: Reachable hexes highlighted. Path preview shown before confirming move.
- **Quick Move option**: Toggle to disable movement animations.

### Hex Empires Current Unit Display

- **Unit shape**: Small colored triangle (0.3x hex radius) with player color fill.
- **Health bar**: Thin bar (3px height, 0.5x hex radius width) below unit, only shown when damaged. Green above 50%, red below.
- **Selection highlight**: White stroke (2px) around triangle when selected.
- **Movement overlay**: Blue-tinted hexes for reachable tiles. No path preview line.
- **Unit info**: Shown in bottom bar -- name, HP/100, movement left, combat strength, ranged stats.
- **Action buttons**: "Found City" for settlers, "Fortify" for other units. Shown inline in bottom bar.

### Differences to Fix

1. **No unit type icons/flags**: All units look like identical colored triangles. Civ VII uses distinct unit type icons on flags so you can tell warriors from archers from settlers at a glance.
   - **Fix**: Draw different shapes per unit category: sword icon for melee, bow for ranged, figure for settler, eye for scout. Or use text abbreviations ("W", "A", "S") inside/above the unit shape.

2. **Unit shape too small and generic**: Triangle at 0.3x hex radius is hard to see. Civ VII units are visually prominent 3D models with colored flags.
   - **Fix**: Increase unit size. Use a rectangular flag/banner above the hex center with a unit type icon inside it, similar to Civ VII's flag system.

3. **No path preview**: When you click a reachable hex to move, there is no preview of the path the unit will take. Civ VII shows dotted line path before confirming.
   - **Fix**: On hover over a reachable hex while unit is selected, compute and render the path as a dotted/dashed line from unit to target.

4. **Health bar too small**: 3px height bar is hard to see. Civ VII increased health bar weight specifically for visibility.
   - **Fix**: Increase to 5-6px height. Add a dark outline for contrast. Show health text on hover.

5. **Limited action buttons**: Only "Found City" and "Fortify" exist. Civ VII has Move (M), Range Attack (R), Fortify (F), Alert (V), Sleep (Z), Skip Turn (Space), and context-specific actions.
   - **Fix**: Add keyboard shortcuts (F for fortify, Space for skip, Z for sleep). Show all available actions in the unit panel with hotkey labels.

6. **No unit movement counter on map**: You can only see movement remaining in the bottom bar text. Civ VII shows movement pips on the unit flag.
   - **Fix**: Show small movement dots or number near the unit on the map.

7. **No attack interaction**: No visual indicator for attackable enemy units. Civ VII highlights hostile units with red outlines. No attack cursor or combat preview.
   - **Fix**: When a unit is selected, show red highlight on enemy units within attack range. Show combat preview (predicted outcome) before confirming attack.

---

## 4. Interaction Model

### Civilization VII Interaction Model

- **Camera pan**: WASD keys + arrow keys. Middle-mouse drag. NO edge-scroll in Civ VII (removed from Civ VI).
- **Camera zoom**: Mouse scroll wheel. Pinch on trackpad.
- **Unit selection**: Left-click on unit. Clicking empty ground deselects.
- **Unit movement**: Select unit, then left-click destination. Path is previewed before click.
- **Attack**: Select unit, click enemy unit/city within range. Combat preview shown before confirming.
- **City management**: Click on city banner to open city screen.
- **Tech tree**: Keyboard shortcut T opens tech tree.
- **Culture tree**: Keyboard shortcut C opens culture/civics tree.
- **End turn**: Large button bottom-right. Also Enter key.
- **Hotkeys**: Comprehensive set (see controls section above) -- M for move, R for ranged attack, F for fortify, G for grid toggle, Y for yield icons toggle, etc.

### Hex Empires Current Interaction Model

- **Camera pan**: Mouse drag on canvas. Arrow keys (no WASD).
- **Camera zoom**: Mouse scroll wheel.
- **Unit selection**: Click on unit. Click empty hex to deselect (but also selects the hex).
- **Unit movement**: Click reachable blue hex while unit selected. No path preview.
- **Attack**: Not implemented visually (combat system exists in engine but no UI for targeting).
- **City management**: Click city hex to open side panel.
- **Tech tree**: Click "Tech Tree" button in top bar.
- **End turn**: Click button in top bar.
- **Hotkeys**: Only arrow keys for pan and Escape for deselect.

### Differences to Fix

1. **No WASD camera pan**: Most strategy game players expect WASD. Civ VII uses WASD as primary pan.
   - **Fix**: Add WASD support in the keyboard handler alongside arrow keys.

2. **No keyboard shortcuts for game actions**: Civ VII has T for tech, C for civics, Enter for end turn, Space for skip unit, F for fortify, etc.
   - **Fix**: Add comprehensive hotkeys:
     - `T` -- open tech tree
     - `Enter` -- end turn
     - `Space` -- skip/next unit
     - `F` -- fortify selected unit
     - `G` -- toggle grid
     - `Y` -- toggle yield icons
     - `Escape` -- close panel/deselect (already exists)

3. **No attack cursor/interaction**: Cannot attack enemy units through the UI even though combat system exists in engine.
   - **Fix**: When selected unit is adjacent to an enemy, show red highlight on enemy hex. Clicking the enemy hex dispatches ATTACK_UNIT action. Show combat strength comparison tooltip.

4. **No unit cycling**: Civ VII auto-selects the next unit needing orders. Hex Empires requires manual clicking each unit.
   - **Fix**: After a unit completes its action (or on new turn), auto-select the next unit that has movement remaining.

5. **Click-to-deselect also selects hex**: Clicking empty ground to deselect a unit simultaneously selects that hex and shows hex info. This is confusing -- deselection should be clean.
   - **Fix**: If a unit was selected and you click elsewhere (not on a reachable hex, unit, or city), deselect the unit and show hex info. But consider adding Escape as the primary deselect method and making empty-click just show hex info without the unit deselect side effect.

6. **No minimap click-to-navigate**: The minimap shows the map but clicking it does not move the camera.
   - **Fix**: Add click handler on minimap canvas that converts click position to world coordinates and calls `camera.centerOn()`.

7. **No right-click context menu**: Civ games traditionally use right-click for movement confirmation and context actions.
   - **Fix**: Consider right-click to move (while left-click selects) as an alternative interaction mode.

---

## 5. Tech Tree

### Civilization VII Tech Tree

- Separate tech tree per age (Antiquity, Exploration, Modern) -- no connections between ages.
- Horizontal scrolling node layout with prerequisite connections shown as lines.
- Each node shows: tech name, icon, cost, what it unlocks.
- Mastery system: after researching a tech, a tier-2 "mastery" version becomes available for additional bonuses.
- Researched techs visually distinct (filled/highlighted). Current research shows progress.
- Opened via keyboard shortcut `T`.

### Hex Empires Current Tech Tree

- Full-screen overlay panel with header showing current age and research status.
- CSS Grid layout using `treePosition.col` and `treePosition.row` from tech data.
- Grid cells are 180px wide, 90px tall with 12px gaps.
- Each TechCard shows: name, cost, unlocks list or description, status (RESEARCHED / IN PROGRESS).
- Visual states: researched (blue border + blue bg), active (yellow border + yellow bg), available (normal border), locked (dimmed 0.4 opacity).
- No connection lines between prerequisite techs.
- No mastery system.

### Differences to Fix

1. **No connection lines between techs**: Civ VII draws lines/arrows between prerequisite nodes to show dependencies. Hex Empires relies on opacity to indicate availability but shows no visual tree structure.
   - **Fix**: Draw SVG or Canvas lines between prerequisite techs and their dependents. Use arrows or flowing lines.

2. **No keyboard shortcut to open**: Must click "Tech Tree" button.
   - **Fix**: Add `T` hotkey.

3. **Tech cards lack icons**: Plain text only. Civ VII uses distinctive icons per tech.
   - **Fix**: Future enhancement -- add tech category icons (military, economic, cultural, etc.).

4. **No research queue**: Can only research one tech at a time with no queue.
   - **Fix**: Future enhancement -- allow queuing next research.

5. **No turns-to-complete display**: Shows raw cost but not estimated turns.
   - **Fix**: Show "X turns" based on current science output.

---

## 6. Priority Fixes (Ranked by Impact)

### High Priority (Core UX patterns that feel wrong)

1. **Move End Turn button to bottom-right** -- most important button, currently buried in top bar
2. **Add WASD camera pan** -- expected by virtually all strategy game players
3. **Add keyboard shortcuts** (T for tech, Enter for end turn, Space for skip, F for fortify)
4. **Replace full-width bars with floating overlays** -- maximize map visibility
5. **Add unit type visual distinction** -- all units look identical currently

### Medium Priority (Polish and information architecture)

6. **Add city banners on map** with population and production progress
7. **Add path preview line** when hovering reachable hex
8. **Add connection lines in tech tree** between prerequisites
9. **Add combat interaction UI** (attack targeting, combat preview)
10. **Add unit cycling** (auto-select next unit needing orders)
11. **Move resources to top-left** with proper icons and per-turn display
12. **Add minimap click-to-navigate**
13. **Fix hardcoded antiquity filter** in city panel production menu

### Lower Priority (Nice-to-have)

14. Add notification/advisor system for pending actions
15. Add age progress visual indicator
16. Add building yield previews in city panel
17. Add turns-to-complete estimates in production and research
18. Add right-click context menu support
19. Add yield icon toggle (Y key)
20. Add grid overlay toggle (G key)

---

## Sources

- [CivFanatics User Interface Thread](https://forums.civfanatics.com/threads/user-interface.691341/)
- [CivFanatics Top-Left UI Discussion](https://forums.civfanatics.com/threads/the-top-left-of-the-ui.692478/)
- [Civilization VII Dev Diary: Managing Your Empire](https://civilization.2k.com/civ-vii/game-guide/dev-diary/managing-your-empire/)
- [Civilization VII Beginners Guide](https://civilization.2k.com/civ-vii/news/civilization-vii-beginners-guide/)
- [Civilization VII Game Update Notes](https://civilization.2k.com/civ-vii/game-update-notes/)
- [Civilization VII Controls Wiki](https://civ7.wiki.fextralife.com/Controls)
- [Civilization VII Tech Tree Analysis](https://civfanatics.com/civ7/civ-vii-gameplay-mechanics/civilization-vii-the-tech-tree/)
- [Civilization VII UI Fixes Article (PCGamesN)](https://www.pcgamesn.com/civilization-vii/ui-fixes)
- [CivFanatics UI Mods](https://forums.civfanatics.com/resources/categories/civ-7-ui-mods.190/)
- [Civilization VII March 2025 Patch Notes](https://support.civilization.com/hc/en-us/articles/39719857984531-Civilization-VII-Patch-Notes-March-25-2025)
