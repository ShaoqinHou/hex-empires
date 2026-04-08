# 6-Layer Game Content Audit

## Layer 1: REFERENCES — All IDs resolve

### Grep queries
```bash
rg "uniqueUnit.*'" --type ts -l packages/engine/src/data/     # Civ -> unit references
rg "uniqueBuilding.*'" --type ts -l packages/engine/src/data/  # Civ -> building references
rg "requiredTech.*'" --type ts -l packages/engine/src/data/    # Tech prerequisite references
rg "upgradesTo.*'" --type ts -l packages/engine/src/data/      # Unit upgrade chain references
rg "prerequisites.*'" --type ts -l packages/engine/src/data/   # Tech tree prerequisites
```

### What to check
- Every `uniqueUnit` ID exists in unit data files
- Every `uniqueBuilding` ID exists in building data files
- Every `requiredTech` ID exists in technology data files
- Every `upgradesTo` ID exists in unit data files
- No circular prerequisites in tech tree
- No orphaned content (registered but never referenced or unlockable)

## Layer 2: BALANCE — Stats are reasonable

### What to check
- No unit with 0 or negative cost
- No tech with negative science cost
- All combat values are positive for military units
- Movement values are 1-6 range
- Building yields are reasonable (not 999 production)
- Legacy bonuses are modest (not game-breaking)

## Layer 3: COMPLETENESS — Every age has content

### What to check
- Each age (antiquity/exploration/modern) has at least 3 civilizations
- Each age has technologies to research
- Each age has units to build
- Each age has buildings
- All victory conditions are defined
- At least one crisis per age

## Layer 4: CODE — Architecture rules followed

### Grep queries
```bash
rg "import.*from.*react" --type ts packages/engine/     # Engine importing React (FORBIDDEN)
rg "document\.|window\." --type ts packages/engine/     # Engine using DOM (FORBIDDEN)
rg "Math\.random" --type ts packages/engine/            # Non-seeded randomness (FORBIDDEN)
rg "from '\.\/(Turn|Movement|Combat|Production)" --type ts packages/engine/src/systems/  # Cross-system imports
```

### What to check
- Engine has zero browser/DOM dependencies
- Systems don't import from each other
- Data files don't import from systems
- All state properties use `readonly`
- No `any` types

## Layer 5: IMPORT BOUNDARIES — Clean dependency graph

### Grep queries
```bash
rg "from.*canvas/" --type tsx packages/web/src/ui/      # UI importing from canvas
rg "from.*ui/" --type ts packages/web/src/canvas/       # Canvas importing from UI
rg "from.*systems/" --type ts packages/engine/src/data/ # Data importing from systems
```

## Layer 6: TYPES — Type safety

### What to check
- All content conforms to interfaces (CivilizationDef, UnitDef, etc.)
- ReadonlyMap and ReadonlyArray used for state
- No `any` or `as any` casts
- Discriminated unions for GameAction and EffectDef are exhaustive

## Anti-Patterns to Flag

1. **Broken reference** — ID in data file points to nonexistent content
2. **Circular prerequisite** — tech A requires B, B requires A
3. **DOM in engine** — browser API in packages/engine/
4. **Cross-system import** — system importing from another system
5. **Mutable state** — Map/Array instead of ReadonlyMap/ReadonlyArray
6. **Non-seeded random** — Math.random() instead of seeded RNG
7. **Empty age** — an age with no civilizations, techs, or units
8. **Orphaned content** — content registered but impossible to unlock/build
