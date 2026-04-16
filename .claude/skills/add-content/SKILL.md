---
name: add-content
description: Step-by-step procedure for adding new civilizations, leaders, units, technologies, buildings, districts, crises, or other game content as data files. TRIGGER WHEN you are about to create a new file in `packages/engine/src/data/**`, OR the user asks to "add a civ" / "new unit" / "new tech" / "new building" / "new crisis" / similar, OR you need to extend a content registry (civilizations, leaders, units, etc). DO NOT TRIGGER for engine-system changes (read `.claude/rules/architecture.md`), or for UI-facing content changes without data backing.
user_invocable: true
---

# /add-content — Add Game Content

Adding new content requires ZERO changes to engine systems, rendering, or UI.
Content is data-driven via `state.config` — systems read all stats from config maps.

## File Structure

Content lives in `packages/engine/src/data/`:
```
data/
  units/          → antiquity-units.ts, exploration-units.ts, modern-units.ts, promotions.ts
  buildings/      → antiquity-buildings.ts, exploration-buildings.ts, modern-buildings.ts
  technologies/   → antiquity/index.ts, exploration/index.ts, modern/index.ts
  civics/         → antiquity/index.ts, exploration/index.ts, modern/index.ts
  civilizations/  → antiquity-civs.ts, exploration-civs.ts, modern-civs.ts
  leaders/        → all-leaders.ts
  terrains/       → base-terrains.ts, features.ts
  crises/         → all-crises.ts
  resources/      → index.ts
```

Each content type has an `index.ts` barrel that re-exports everything and has an `ALL_*` array.

---

## Adding a Unit

Edit the appropriate age file (e.g., `data/units/antiquity-units.ts`):

```typescript
export const CATAPULT: UnitDef = {
  id: 'catapult',
  name: 'Catapult',
  age: 'antiquity',
  category: 'siege',         // melee|ranged|siege|cavalry|naval|civilian|religious
  cost: 70,                  // production cost
  combat: 8,                 // melee strength
  rangedCombat: 35,          // ranged strength (0 if melee-only)
  range: 2,                  // attack range (0 if melee)
  movement: 2,               // movement points per turn
  sightRange: 2,             // fog of war visibility (scouts=3, default=2)
  requiredTech: 'mathematics', // tech needed to build (null if none)
  upgradesTo: 'bombard',     // unit this upgrades to (null if none)
  abilities: [],             // e.g., ['found_city', 'ignore_terrain_cost', 'anti_cavalry']
} as const;
```

Then add to the `ALL_ANTIQUITY_UNITS` array at the bottom of the same file.
Then add the named export to `data/units/index.ts`.

---

## Adding a Building

Edit the appropriate age file (e.g., `data/buildings/antiquity-buildings.ts`):

```typescript
export const AQUEDUCT: BuildingDef = {
  id: 'aqueduct',
  name: 'Aqueduct',
  age: 'antiquity',
  cost: 100,
  maintenance: 1,
  yields: { food: 2 },    // Partial<YieldSet> — only include non-zero yields
  effects: ['+2 Housing'],
  requiredTech: 'construction',
} as const;
```

Add to `ALL_ANTIQUITY_BUILDINGS` array and `data/buildings/index.ts` barrel.

---

## Adding a Technology

Edit the appropriate age file (e.g., `data/technologies/antiquity/index.ts`):

```typescript
export const PHILOSOPHY: TechnologyDef = {
  id: 'philosophy',
  name: 'Philosophy',
  age: 'antiquity',
  cost: 100,
  prerequisites: ['writing'],
  unlocks: ['university'],
  description: 'Enables University building',
  treePosition: { row: 0, col: 5 },
};
```

Add to `ALL_ANTIQUITY_TECHS` array. Update barrel in `data/technologies/index.ts`.

---

## Adding a Civic

Edit the appropriate age file (e.g., `data/civics/antiquity/index.ts`):

```typescript
export const NEW_CIVIC: CivicDef = {
  id: 'new_civic',
  name: 'New Civic',
  age: 'antiquity',
  cost: 80,
  prerequisites: ['code_of_laws'],
  unlocks: [],
  description: 'Some culture-related benefit',
  treePosition: { row: 2, col: 3 },
};
```

Add to `ALL_ANTIQUITY_CIVICS` array. Update barrel in `data/civics/index.ts`.

---

## Adding a Civilization

Edit the appropriate age file (e.g., `data/civilizations/antiquity-civs.ts`):

```typescript
export const BABYLON: CivilizationDef = {
  id: 'babylon',
  name: 'Babylon',
  age: 'antiquity',
  uniqueAbility: {
    name: 'Enuma Anu Enlil',
    description: '+3 science in all cities',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 3 }],
  },
  uniqueUnit: 'war_cart',
  uniqueBuilding: 'ziggurat',
  legacyBonus: {
    name: 'Babylonian Scholarship',
    description: '+2 science in future ages',
    effect: { type: 'MODIFY_YIELD', target: 'empire', yield: 'science', value: 2 },
  },
  color: '#7b1fa2',
};
```

Add to `ALL_ANTIQUITY_CIVS` and `data/civilizations/index.ts` barrel.

---

## Adding a Leader

Edit `data/leaders/all-leaders.ts`:

```typescript
export const NEW_LEADER: LeaderDef = {
  id: 'new_leader',
  name: 'New Leader',
  ability: {
    name: 'Ability Name',
    description: 'Some bonus',
    effects: [{ type: 'MODIFY_YIELD', target: 'empire', yield: 'gold', value: 2 }],
  },
  agendas: ['builder', 'trader'],
  compatibleAges: ['antiquity', 'exploration', 'modern'],
};
```

Add to `ALL_LEADERS` and `data/leaders/index.ts` barrel.

---

## Adding a Resource

Edit `data/resources/index.ts`:

```typescript
export const COPPER: ResourceDef = {
  id: 'copper',
  name: 'Copper',
  type: 'strategic',
  yieldBonus: { production: 1 },
  validTerrains: ['plains', 'grassland'],
  happinessBonus: 0,
};
```

Add to `ALL_RESOURCES` array in the same file.

---

## Adding a Promotion

Edit `data/units/promotions.ts`:

```typescript
export const NEW_PROMO: PromotionDef = {
  id: 'new_promo',
  name: 'New Promotion',
  description: '+5 combat in open terrain',
  category: 'melee',
  tier: 1,    // 1=15XP, 2=30XP, 3=60XP
  effects: [{ type: 'COMBAT_BONUS', value: 5 }],
};
```

Add to `ALL_PROMOTIONS` array.

---

## Adding a Crisis Event

Edit `data/crises/all-crises.ts`:

```typescript
export const NEW_CRISIS: CrisisEventDef = {
  id: 'new_crisis',
  name: 'New Crisis',
  description: 'Something happens...',
  triggerCondition: 'turn_reached',
  triggerValue: 30,
  choices: [
    { id: 'choice_a', text: 'Do this', effects: [{ type: 'MODIFY_GOLD', target: 'player', value: 50 }] },
    { id: 'choice_b', text: 'Do that', effects: [{ type: 'LOSE_POPULATION', target: 'largest_city', value: 1 }] },
  ],
};
```

Add to `ALL_CRISES` array.

---

## Checklist

- [ ] Data object matches the TypeScript interface exactly
- [ ] Added to the `ALL_*` array in the file
- [ ] Named export added to the barrel `index.ts`
- [ ] ID is unique bare string (e.g., `'warrior'`, not `'unit_warrior'`)
- [ ] All referenced IDs exist (requiredTech, upgradesTo, prerequisites)
- [ ] Age field matches the file's age
- [ ] Run `npm run test:engine` — all tests pass
- [ ] Run `npx tsc --noEmit -p packages/engine` — no type errors

## What you DON'T need to change

- No system files (`systems/*.ts`)
- No UI files (`packages/web/src/*`)
- No type definitions (`types/*.ts`)
- No GameConfig or GameConfigFactory
