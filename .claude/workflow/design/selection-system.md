# Unified Selection & Hover System — Design Doc

## Problem

Tile selection and hover logic is scattered across 5+ files with duplicated implementations of "what's on this tile?":
- `GameCanvas.tsx` — click handler, hover handler (6+ lookups)
- `TooltipOverlay.tsx` — Alt+hover tooltip
- `App.tsx` — combat preview target
- `CombatPreviewPanel.tsx` — render-time lookup
- `EnhancedTooltip.tsx` — dead code with `// @ts-nocheck`

Each implementation has slight differences (some use `coordToKey`, some use raw string templates, some check owner, some don't). Priority orders are hardcoded inconsistently.

**Concrete bugs:**
1. **`ATTACK_CITY` never dispatched** — clicking an enemy city with a military unit silently deselects
2. Districts are invisible in click logic
3. Tooltip shows only ONE entity (unit OR city, never both)
4. Hover requires Alt to see info (industry standard is always-on)
5. Right-click context menu duplicates BottomBar actions (Warlock anti-pattern)
6. Enemy city inflates cycle count without being a selectable slot
7. `selectedCityId` lives in `App.tsx` local state — not accessible to canvas or other panels
8. Dead code `EnhancedTooltip.tsx` never mounted

## Solution

### Core abstraction: `getTileContents(state, hex, playerId)` → `TileContents`

Single source of truth for "what's on this tile?". Located in `packages/engine/src/state/TileContents.ts`.

```typescript
export interface TileContents {
  readonly hex: HexCoord;
  readonly tile: HexTile | null;                    // base terrain data
  readonly ownUnits: ReadonlyArray<UnitState>;      // sorted: military first, then civilian
  readonly enemyUnits: ReadonlyArray<UnitState>;    // visible enemies only (fog of war)
  readonly city: CityState | null;                  // any owner
  readonly district: DistrictSlot | null;
  readonly improvement: ImprovementId | null;
}

export function getTileContents(
  state: GameState,
  hex: HexCoord,
  viewerPlayerId: string,
): TileContents;
```

**Priority rules (built in):**
- `ownUnits` are sorted military → civilian (so first cycling = military)
- `enemyUnits` respects fog of war (only visible ones)
- `city` includes any owner (caller checks ownership)

### Unified selection state in GameProvider

Move `selectedCityId` out of `App.tsx` into `GameProvider`:

```typescript
interface GameContextValue {
  // ... existing fields ...
  selectedUnit: UnitState | null;           // existing
  selectedCity: CityState | null;           // NEW — derived from selectedCityId
  selectedHex: HexCoord | null;             // existing
  hoveredHex: HexCoord | null;              // existing
  selectCity: (cityId: CityId | null) => void;  // NEW
}
```

### Hover tooltip — unified, always-on

Refactor `TooltipOverlay.tsx` to use `getTileContents`:

```
Always shown on hover (no Alt required):
  ┌─────────────────────────────┐
  │ Grassland + Forest          │  ← terrain header
  │ 🍖 2  ⚙️ 1                   │  ← compact yields
  │ Rome (Pop 5) — friendly     │  ← city if present
  │ ⚔️ Warrior (100hp) ×3         │  ← top entity + count
  │   [W][W][S]                  │  ← icon strip if 3+ entities
  └─────────────────────────────┘

Alt hold expands:
  + terrain detailed (movement cost, defense)
  + full unit list with individual stats
  + yield breakdown per source
  + combat preview if enemy
```

### Click selection — formalized priority

```
onTileClick(hex):
  const c = getTileContents(state, hex, playerId);
  const selected = currentSelection;
  
  # 1. Enemy attack takes priority (no selection change)
  if (selected.unit && c.enemyUnits.length > 0 && canAttackUnit(selected.unit, c.enemyUnits[0])):
    dispatch(ATTACK_UNIT, target = best enemy)
    return
  
  # 2. Attack enemy city (NEW — fixes bug)
  if (selected.unit && c.city && c.city.owner !== playerId && canAttackCity(selected.unit, c.city)):
    dispatch(ATTACK_CITY, target = c.city)
    return
  
  # 3. Select/cycle own entities on this tile
  if (c.ownUnits.length > 0 || (c.city && c.city.owner === playerId)):
    const entities = [...c.ownUnits, ...(c.city?.owner === playerId ? [c.city] : [])]
    if (selected is in entities):
      select next in cycle
    else:
      select first (ownUnits[0] = top military unit)
    return
  
  # 4. Move selected unit to empty reachable hex
  if (selected.unit && hex is reachable):
    dispatch(MOVE_UNIT, path)
    return
  
  # 5. Deselect + show terrain info
  select hex (for tile info), clear unit/city selection
```

### Right-click — remove context menu

Right-click becomes pure "move/attack/deselect":
- Enemy in range → ATTACK
- Reachable empty hex → MOVE
- Otherwise → deselect

**Remove `UnitContextMenu` component entirely.** All unit actions (fortify, found city, skip, delete, upgrade) live in BottomBar, which is already visible when a unit is selected.

### Stack picker — BottomBar strip

When selected tile has 2+ entities, BottomBar shows a portrait strip:

```
┌──────────────────────────────────────────┐
│ [Warrior*] [Scout] [Settler] [Rome]      │  ← clickable portraits
│ *selected                                │
│                                          │
│ Warrior details...                       │
└──────────────────────────────────────────┘
```

Clicking a portrait changes selection directly (no need to cycle via map clicks).

## Implementation Plan

### Phase A — Engine utility (pure, testable)
1. Create `packages/engine/src/state/TileContents.ts` with `TileContents` type + `getTileContents` function
2. Export from engine barrel
3. Unit tests: empty tile, 1 unit, 3 units, city, city+units, enemy unit (fog of war filter)
4. **Success criterion:** 10+ unit tests pass

### Phase B — GameProvider selection state
1. Add `selectedCityId`, `selectedCity`, `selectCity` to context
2. Remove `selectedCityId` from `App.tsx` local state
3. Update `onCityClick` → `selectCity`

### Phase C — Refactor click logic
1. Replace `handleClick` in GameCanvas with unified priority-based dispatcher using `getTileContents`
2. Add `ATTACK_CITY` dispatch (fixes the bug)
3. Remove `UnitContextMenu` and its `showContextMenu` state
4. Simplify `handleContextMenu` to just move/attack/deselect

### Phase D — Refactor hover tooltip
1. Rewrite `TooltipOverlay` to use `getTileContents`
2. Show always-on lightweight tooltip (terrain + top entity + yields)
3. Alt key expands to full details
4. Delete `EnhancedTooltip.tsx` (dead code)

### Phase E — Stack picker in BottomBar
1. When selected hex has 2+ entities, show portrait strip
2. Each portrait: click to select that entity

### Phase F — Tests & verify
1. Unit tests for `getTileContents` (10+)
2. E2E tests for all selection scenarios
3. Playwright verify: no regressions

## Non-goals
- Multi-unit select (select multiple units at once) — not needed for this game
- Army stacks like Civ VII commanders — scope for later
- Selection memory across turns — selection resets on turn end (current behavior)

## Data model — no changes needed

All the data already exists: `state.units`, `state.cities`, `state.districts`, `state.map.tiles`. We're just adding a unified accessor.

## Success criteria

1. Zero duplicate `[...state.units.values()].filter(u => coordToKey(u.position) === key)` patterns in web code
2. `ATTACK_CITY` action dispatches from left-click on enemy city
3. Tooltip always shown on hover (no Alt required for basic info)
4. Clicking an empty tile deselects unit and shows terrain
5. Clicking a tile with 3 units cycles through all 3 on repeated clicks
6. Stack picker portraits let you jump to any entity in one click
7. `UnitContextMenu` component removed
8. All engine tests pass, all E2E tests pass
9. No TypeScript errors, no `as any` introduced

## File changes

| File | Change |
|------|--------|
| `packages/engine/src/state/TileContents.ts` | **NEW** — core utility |
| `packages/engine/src/state/__tests__/TileContents.test.ts` | **NEW** — tests |
| `packages/engine/src/index.ts` | Export `getTileContents`, `TileContents` |
| `packages/web/src/providers/GameProvider.tsx` | Add `selectedCity` state |
| `packages/web/src/canvas/GameCanvas.tsx` | Rewrite click handlers using `getTileContents` |
| `packages/web/src/canvas/TooltipOverlay.tsx` | Rewrite using `getTileContents` |
| `packages/web/src/App.tsx` | Remove `selectedCityId`, use `selectedCity` from context |
| `packages/web/src/ui/components/UnitContextMenu.tsx` | **DELETE** |
| `packages/web/src/ui/components/EnhancedTooltip.tsx` | **DELETE** |
| `packages/web/src/ui/components/CombatPreviewPanel.tsx` | Use `getTileContents` instead of own lookup |
| `packages/web/src/ui/layout/BottomBar.tsx` | Add stack picker portrait strip |
