---
name: add-content
description: Step-by-step guide for adding new civilizations, leaders, units, technologies, buildings
user_invocable: true
---

# /add-content — Add Game Content

The KEY skill for modularity. Adding new content requires ZERO changes to engine systems, rendering, or UI.

## Adding a New Civilization

### Step 1: Create data file

`packages/engine/src/data/civilizations/{name}.ts`:

```typescript
import type { CivilizationDef } from '../../types/Civilization';

export const mongols: CivilizationDef = {
  id: 'civ_mongols',
  name: 'Mongol Empire',
  age: 'exploration',
  uniqueAbility: {
    id: 'ability_great_yasa',
    name: 'Great Yasa',
    description: 'Cavalry units gain +3 combat strength',
    effects: [
      { type: 'MODIFY_COMBAT', target: 'cavalry', value: 3 },
    ],
  },
  uniqueUnit: 'unit_keshig',
  uniqueBuilding: 'building_ordu',
  startingBonuses: [],
  legacyBonus: {
    id: 'legacy_mongol_horsemanship',
    name: 'Mongol Horsemanship',
    effects: [{ type: 'MODIFY_MOVEMENT', target: 'cavalry', value: 1 }],
  },
  flavorText: 'The hooves of Mongol horses echo across the steppe.',
};
```

### Step 2: Add to barrel export

In `packages/engine/src/data/civilizations/index.ts`:
```typescript
import { mongols } from './mongols';
export const ALL_CIVILIZATIONS = [/* ...existing */, mongols] as const;
```

**Done.** Zero code changes to systems, rendering, or UI.

## Adding a New Leader

Same pattern in `packages/engine/src/data/leaders/{name}.ts`:
- Export a `LeaderDef` with id, name, ability (AbilityDef), agendas, compatibleAges
- Add to `ALL_LEADERS` in barrel

## Adding a New Unit

`packages/engine/src/data/units/{name}.ts`:
- Export a `UnitDef` with id, name, age, category, cost, combat stats, requiredTech, upgradesTo
- Add to `ALL_UNITS` in barrel

## Adding a New Technology

`packages/engine/src/data/technologies/{age}/{name}.ts`:
- Export a `TechnologyDef` with id, name, age, cost, prerequisites, unlocks, effects
- Add to `ALL_TECHNOLOGIES` in the age's barrel

## Adding a New Building

`packages/engine/src/data/buildings/{name}.ts`:
- Export a `BuildingDef` with id, name, age, cost, maintenance, yields, effects, requiredTech
- Add to `ALL_BUILDINGS` in barrel

## Adding a New Effect Type

This is the ONE case that requires a code change:
1. Add the new variant to the `EffectDef` discriminated union in `types/Effects.ts`
2. Add handling in `effects/EffectPipeline.ts`
3. Add handling in whichever system evaluates this effect

## Checklist

- [ ] Data file created with correct TypeScript interface
- [ ] Added to barrel export (ALL_CIVILIZATIONS, ALL_UNITS, etc.)
- [ ] ID is unique (prefixed: `civ_`, `unit_`, `building_`, `tech_`)
- [ ] All referenced IDs exist (uniqueUnit, requiredTech, upgradesTo)
- [ ] Age field is correct (antiquity/exploration/modern)
- [ ] Effects use valid EffectDef types
- [ ] Unit test added for content validation
