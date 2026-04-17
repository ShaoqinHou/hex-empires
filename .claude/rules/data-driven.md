# Data-Driven Content Rules

## The Principle

Game content (civilizations, leaders, units, techs, buildings, terrains, crises) is defined as **data files**, not code. Adding new content requires zero changes to game systems, rendering, or UI.

## Registry Pattern

Every content type uses `Registry<T>`:

```typescript
class Registry<T extends { readonly id: string }> {
  register(item: T): void;
  get(id: string): T | undefined;
  getAll(): ReadonlyArray<T>;
  has(id: string): boolean;
}
```

Content is registered from barrel exports at startup. Systems and UI query registries.

## Adding Content (2-step process)

1. Create a data file: `packages/engine/src/data/{type}/{name}.ts`
2. Add to barrel export: import + add to `ALL_{TYPE}` array in `{type}/index.ts`

**That's it.** Zero code changes elsewhere.

## Data File Rules

- Export a single `const` object conforming to the content type interface
- Use `readonly` properties and `as const` where appropriate
- Only import from `../../types/` for type definitions
- No imports from systems, engine, or other data categories
- No game logic (exception: victory condition check functions are `(state, playerId) => result`)
- All IDs must be unique within their content type
- Referenced IDs must exist in their respective registries (e.g., `requiredTech` must be a valid TechnologyId)

## Effect System

Abilities are expressed as composable `EffectDef` discriminated unions:

```typescript
type EffectDef =
  | { type: 'MODIFY_YIELD'; target: EffectTarget; yield: YieldType; value: number }
  | { type: 'MODIFY_COMBAT'; target: UnitCategory | 'all'; value: number }
  | { type: 'GRANT_UNIT'; unitId: UnitId; count: number }
  // ... extensible
```

Rules:
- New effect types require adding a variant to `EffectDef` AND handling in `effectSystem`
- Existing effect types can be freely composed in data files
- Effects are the bridge between data and systems — data defines WHAT happens, systems define HOW

## Content Checklist

For every new content item:
- [ ] Data file created with correct interface
- [ ] Added to barrel export (ALL_CIVILIZATIONS, ALL_UNITS, etc.)
- [ ] All referenced IDs exist (uniqueUnit, requiredTech, upgradesTo, etc.)
- [ ] ID is unique within its type
- [ ] Age field is correct (antiquity/exploration/modern)
- [ ] Unit test validates the definition (type checks, non-empty fields)
