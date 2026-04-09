# Phase 1: Terrain & Map Systems Research

Research compiled from Civilization VII game data (post-patch 1.2.5 / 1.3.0). Where Civ VII data was unavailable, Civ VI values are noted.

---

## 1. Terrain System Overview

Civ VII uses a **biome + morphology + feature** system. Every land tile is defined by three layers:

1. **Biome** (5 land + 1 water): Desert, Grassland, Plains, Tropical, Tundra, Marine
2. **Base Morphology** (5 types): Flat, Rough, Vegetated, Wet, Mountainous
3. **Features** (optional overlays): Floodplain, Volcano, Reef, Atoll, Lotus, etc.

This creates a matrix of ~25 land terrain combinations plus water terrains.

---

## 2. All Land Terrain Types with Yields

Each tile produces a total of 3 yield points distributed across Food, Production, Gold, Science, Culture.

### Tundra Biome

| Terrain | Morphology | Display Name | Food | Prod | Gold | Science | Culture | Faith |
|---------|-----------|--------------|------|------|------|---------|---------|-------|
| Tundra | Flat | Flat Tundra | 3 | 0 | 0 | 0 | 0 | 0 |
| Tundra | Rough | Rough Tundra | 0 | 3 | 0 | 0 | 0 | 0 |
| Tundra | Vegetated | Taiga | 0 | 2 | 0 | 0 | 1 | 0 |
| Tundra | Wet | Tundra Bog | 1 | 2 | 0 | 0 | 1 | 0 |
| Tundra | Mountainous | Tundra Mountain | -- impassable -- | | | | | |

### Grassland Biome

| Terrain | Morphology | Display Name | Food | Prod | Gold | Science | Culture | Faith |
|---------|-----------|--------------|------|------|------|---------|---------|-------|
| Grassland | Flat | Flat Grassland | 3 | 0 | 0 | 0 | 0 | 0 |
| Grassland | Rough | Rough Grassland | 1 | 2 | 0 | 0 | 0 | 0 |
| Grassland | Vegetated | Forest | 1 | 2 | 0 | 0 | 0 | 0 |
| Grassland | Wet | Marsh | 2 | 2 | 0 | 0 | 0 | 0 |
| Grassland | Mountainous | Grassland Mountain | -- impassable -- | | | | | |

### Desert Biome

| Terrain | Morphology | Display Name | Food | Prod | Gold | Science | Culture | Faith |
|---------|-----------|--------------|------|------|------|---------|---------|-------|
| Desert | Flat | Flat Desert | 2 | 1 | 0 | 0 | 0 | 0 |
| Desert | Rough | Rough Desert | 0 | 3 | 0 | 0 | 0 | 0 |
| Desert | Vegetated | Sagebrush Steppe | 0 | 2 | 1 | 0 | 0 | 0 |
| Desert | Wet | Oasis | 1 | 2 | 1 | 0 | 0 | 0 |
| Desert | Mountainous | Desert Mountain | -- impassable -- | | | | | |

### Plains Biome

| Terrain | Morphology | Display Name | Food | Prod | Gold | Science | Culture | Faith |
|---------|-----------|--------------|------|------|------|---------|---------|-------|
| Plains | Flat | Flat Plains | 2 | 1 | 0 | 0 | 0 | 0 |
| Plains | Rough | Rough Plains | 0 | 3 | 0 | 0 | 0 | 0 |
| Plains | Vegetated | Savanna Woodland | 0 | 3 | 0 | 0 | 0 | 0 |
| Plains | Wet | Watering Hole | 1 | 3 | 0 | 0 | 0 | 0 |
| Plains | Mountainous | Plains Mountain | -- impassable -- | | | | | |

### Tropical Biome

| Terrain | Morphology | Display Name | Food | Prod | Gold | Science | Culture | Faith |
|---------|-----------|--------------|------|------|------|---------|---------|-------|
| Tropical | Flat | Flat Tropical | 3 | 0 | 0 | 0 | 0 | 0 |
| Tropical | Rough | Rough Tropical | 1 | 2 | 0 | 0 | 0 | 0 |
| Tropical | Vegetated | Rainforest | 0 | 2 | 0 | 1 | 0 | 0 |
| Tropical | Wet | Mangrove | 1 | 2 | 0 | 1 | 0 | 0 |
| Tropical | Mountainous | Tropical Mountain | -- impassable -- | | | | | |

### Yield Pattern Summary

| Morphology | Typical Yield Pattern |
|-----------|----------------------|
| Flat | High Food (2-3), low Production (0-1) |
| Rough | High Production (2-3), low Food (0-1) |
| Vegetated | Medium Production (2-3), bonus specialty yield (Culture/Science/Gold) |
| Wet | Balanced Food+Production, bonus specialty yield |
| Mountainous | Impassable, no workable yields |
---

## 3. Water Terrain Types

### Marine Biome

| Terrain | Food | Prod | Gold | Science | Culture | Movement | Notes |
|---------|------|------|------|---------|---------|----------|-------|
| Coast | 1 | 0 | 1 | 0 | 0 | 1 | Adjacent to land. *Note: Civ VII exact coast yields not fully documented; values here from Civ VI. Civ VII coast likely similar.* |
| Ocean | 1 | 0 | 3 | 0 | 0 | Ends movement | Deep water. Workable in Modern Age. Inaccessible in Antiquity. |
| Lake | 1 | 0 | 1 | 0 | 0 | 1 | Inland fresh water. Provides fresh water to adjacent settlements. |
| Navigable River | 1 | 0 | 1 | 0 | 0 | Special | Wide rivers through hex centers (not edges). Naval units can traverse. |

### Water Features

| Feature | Appears On | Yields/Effect | Notes |
|---------|-----------|---------------|-------|
| Reef | Coast | Bonus Food and Production (exact TBD) | Aquatic feature, coastal only (not lakes) |
| Atoll | Ocean | Stops movement, defense bonus | Strategic chokepoints in deep ocean |
| Lotus | Lake | Replaces reef in lakes | Added in patch 1.3.0 |

---

## 4. Movement Costs

Civ VII uses a simplified binary movement system:

| Terrain Type | Movement Cost | Notes |
|-------------|--------------|-------|
| **Flat** (any biome) | 1 MP | Standard traversal |
| **Rough** (any biome) | Ends movement | Unit stops immediately upon entering |
| **Vegetated** (any biome) | Ends movement | Unit stops immediately upon entering |
| **Wet** (any biome) | Ends movement | Unit stops immediately upon entering |
| **Mountainous** | Impassable | Cannot enter (exception: Inca in Modern Age) |
| **Coast** | 1 MP | Requires Sailing technology |
| **Ocean** | Ends movement | Requires Exploration Age; attrition damage until tech unlocks |
| **Navigable River** | Special | Naval units traverse; land units must embark |
| **Minor River** | Ends movement | Crossing ends movement; -5 Combat Strength penalty |
| **Road (any terrain)** | 1 MP | Overrides all terrain penalties |

### Movement Exceptions

- **Scouts**: Can traverse Rough, Vegetated, and Wet terrain without movement penalty
- **Army Commanders with Mobility promotion**: Ignore difficult terrain when packed
- **Bridges** (on Navigable Rivers): Allow land units to cross without penalty

---

## 5. Terrain Defense / Combat Bonuses

| Terrain Modifier | Combat Strength Effect | Notes |
|-----------------|----------------------|-------|
| **Rough terrain** | +3 CS (defender) | Hills / rough morphology |
| **Vegetated terrain** | +2 CS (defender) | Forest, Rainforest, Taiga, etc. |
| **Minor River** | -5 CS (defender on tile) | Penalty for defending ON the river tile |
| **River crossing** | -2 CS | Penalty for attacking from/defending on river |
| **Flat terrain** | +0 CS | No combat bonus |
| **Wet terrain** | +0 CS (estimated) | *Exact Civ VII value not confirmed; likely no bonus* |

### Line of Sight / Vision Blocking

| Terrain | Blocks Vision? | Notes |
|---------|---------------|-------|
| Mountainous | Yes | First mountain in line of sight is visible; blocks tiles behind |
| Vegetated | Yes | Blocks tiles behind regardless of elevation |
| Flat | No | Open visibility |
| Rough | No | Does not block vision (provides combat bonus but not LOS block) |

---

## 6. Sight Range (Fog of War)

### Three Visibility States

1. **Unexplored** (black): Never seen. Completely hidden terrain.
2. **Explored / Fog** (shrouded): Previously seen. Terrain visible but unit movements hidden. Shows last-known state.
3. **Visible** (clear): Currently within a units sight range. All activity visible in real-time.

### Unit Sight Ranges

| Sight Range | Unit Types |
|------------|-----------|
| 1 hex | Settlers, Missionaries, Great People, tiles within your borders |
| 2 hexes | Standard Land and Naval Units, Commanders, Scouts, Explorers, Merchants, Migrants |
| 3 hexes | Certain Unique Units, Modern Age Siege Units |

### Vision Rules

- Adjacent tiles (distance 1) are always visible regardless of terrain
- At distance 2+, Mountainous and Vegetated terrain block line of sight to tiles behind them
- Scouts and certain unique units may ignore terrain obstruction for vision
- Units on Rough terrain gain elevation advantage for ranged attacks