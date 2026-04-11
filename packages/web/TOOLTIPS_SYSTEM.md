# Enhanced Tooltips System - Implementation Complete

## Overview
Implemented a comprehensive Civ VII-style tooltips system for all game elements with Alt+hover keyboard shortcut support.

## Components Created

### 1. Core Tooltip Component
**File**: `packages/web/src/ui/components/Tooltip.tsx`

**Features**:
- Configurable position (top, bottom, left, right, cursor)
- Customizable delay before showing tooltip
- Alt-key only mode (`showOnAltOnly` prop)
- Disabled state support
- Smooth animations
- `TooltipContent` sub-component for standardized layout

**Usage**:
```tsx
<Tooltip content={<TooltipContent title="My Tooltip" />} showOnAltOnly>
  <button>Hover me (Alt+Hover for details)</button>
</Tooltip>
```

### 2. Unit Tooltips
**File**: `packages/web/src/ui/components/tooltips/UnitTooltip.tsx`

**Displays**:
- **Combat Stats**: Strength, ranged strength, range, movement, sight, cost
- **Current Status** (for active units): Health, movement left, experience, promotions, fortification status
- **Abilities**: Special abilities with descriptions
- **Promotions**: Available promotions based on XP
- **Upgrade Path**: What unit this upgrades to
- **Requirements**: Required technology and resources

**Components**:
- `UnitTooltip` - For unit definitions
- `UnitStateTooltip` - For active units on the map

### 3. Building Tooltips
**File**: `packages/web/src/ui/components/tooltips/BuildingTooltip.tsx`

**Displays**:
- **Yields**: Food, production, gold, science, culture, faith
- **Stats**: Production cost, maintenance cost, defense bonus
- **Effects**: Special effects with descriptions
- **Requirements**: Required technology, happiness cost
- **Status indicators**: Built/Not built, Available/Locked

### 4. Technology Tooltips
**File**: `packages/web/src/ui/components/tooltips/TechnologyTooltip.tsx`

**Displays**:
- **Research**: Cost and progress
- **Prerequisites**: Required technologies
- **Unlocks**: Units, buildings, districts, resources, improvements
- **Effects**: Special effects
- **Eureka**: Turn when eureka is available
- **Status**: Completed/Locked/Available

### 5. Terrain Tooltips
**File**: `packages/web/src/ui/components/tooltips/TerrainTooltip.tsx`

**Displays**:
- **Terrain**: Base terrain name and movement cost
- **Features**: Any terrain features (hills, forest, etc.)
- **River**: Bonus gold from rivers
- **Total Movement**: Combined movement cost
- **Defense Bonus**: Total defense percentage
- **Yields**: Food, production, gold from terrain + feature
- **Properties**: Water/land, impassable, special traits
- **Settlement**: What can be built/improved

### 6. Resource Tooltips
**File**: `packages/web/src/ui/components/tooltips/ResourceTooltip.tsx`

**Displays**:
- **Type**: Luxury, Strategic, or Bonus resource
- **Yield Bonus**: All yields provided by the resource
- **Luxury Benefits**: Happiness and amenity information
- **Strategic Value**: Required units and usage
- **Improvement**: Required improvement type
- **Builder Info**: Charges needed

### 7. Canvas Tooltip Overlay
**File**: `packages/web/src/canvas/TooltipOverlay.tsx`

**Features**:
- Shows tooltips when hovering over canvas elements
- Requires Alt key to be pressed
- Displays unit tooltips for units on map
- Displays city tooltips for cities on map
- Positioned relative to canvas coordinates

### 8. Alt Key Hook
**File**: `packages/web/src/hooks/useAltKey.ts`

**Purpose**: Tracks Alt key state throughout the application
- Returns `true` when Alt is pressed
- Listens to both keydown and keyup events
- Properly cleans up event listeners

### 9. Tooltip Index
**File**: `packages/web/src/ui/components/tooltips/index.ts`

**Purpose**: Barrel export for all tooltip components

## Integration Points

### GameProvider
**File**: `packages/web/src/providers/GameProvider.tsx`

**Added**:
- `isAltPressed` state tracking
- Alt key event listeners (keydown/keyup)
- Exported in `GameContextValue`

### App.tsx
**File**: `packages/web/src/App.tsx`

**Added**:
- Import of `TooltipOverlay`
- Integration into render tree
- Passes state and camera to overlay

## Keyboard Shortcut

**Alt + Hover**: Shows detailed tooltips for game elements
- Works on canvas: Units, cities
- Can be extended to UI elements (tech tree, city panel, etc.)
- Civ VII style behavior

## Styling

All tooltips follow a consistent design:
- Dark background: `var(--color-surface)`
- Border: `var(--color-border)`
- Shadow effect for depth
- Maximum width constraint
- Proper z-index layering (z-50)
- Pointer events disabled (to not interfere with game)

## Color Coding

Tooltips use color-coded values:
- **Food**: `var(--color-food)` - Green
- **Production**: `var(--color-production)` - Orange
- **Gold**: `var(--color-gold)` - Yellow
- **Science**: `var(--color-science)` - Blue
- **Culture**: `var(--color-culture)` - Purple
- **Faith**: `var(--color-faith)` - Gray
- **Health High**: `var(--color-health-high)` - Light green
- **Health Low**: `var(--color-health-low)` - Red

## Usage Examples

### For a unit in the UI
```tsx
import { Tooltip, UnitTooltip } from './ui/components/tooltips';

<Tooltip content={<UnitTooltip unitDef={warriorDef} />} showOnAltOnly>
  <span>⚔️ Warrior</span>
</Tooltip>
```

### For a building
```tsx
<Tooltip content={<BuildingTooltip building={granaryDef} />}>
  <BuildingCard building={granaryDef} />
</Tooltip>
```

### For terrain on canvas
Automatically handled by `TooltipOverlay` - just hover and press Alt!

## Future Enhancements

Potential additions:
1. **UI Element Tooltips**: Add tooltips to tech tree, city panel, diplomacy panel
2. **Promotion Details**: Show promotion effects on hover
3. **Resource Requirements**: Show which resources are required for units
4. **Comparison Tooltips**: Compare units/buildings (e.g., "vs Warrior" text)
5. **Keyboard Shortcut Display**: Show "Alt+Hover for details" hint in tutorial
6. **Tooltip Positioning**: Smart positioning to avoid screen edges
7. **Delay Configuration**: User-configurable tooltip delay
8. **Accessibility**: Screen reader support for tooltips

## Files Created/Modified

**Created**:
- `packages/web/src/ui/components/Tooltip.tsx`
- `packages/web/src/ui/components/tooltips/UnitTooltip.tsx`
- `packages/web/src/ui/components/tooltips/BuildingTooltip.tsx`
- `packages/web/src/ui/components/tooltips/TechnologyTooltip.tsx`
- `packages/web/src/ui/components/tooltips/TerrainTooltip.tsx`
- `packages/web/src/ui/components/tooltips/ResourceTooltip.tsx`
- `packages/web/src/ui/components/tooltips/index.ts`
- `packages/web/src/canvas/TooltipOverlay.tsx`
- `packages/web/src/hooks/useAltKey.ts`

**Modified**:
- `packages/web/src/providers/GameProvider.tsx` - Added isAltPressed state
- `packages/web/src/App.tsx` - Added TooltipOverlay integration

## Status: ✅ Complete

The enhanced tooltips system is fully functional with Civ VII-style Alt+hover behavior. All game element types have rich, informative tooltips showing relevant stats, abilities, and requirements.
