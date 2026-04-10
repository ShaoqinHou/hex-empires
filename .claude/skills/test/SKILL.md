---
name: test
description: Testing conventions for game systems
user_invocable: true
---

# /test — Testing Conventions

## File Locations
```
packages/engine/src/systems/__tests__/{systemName}.test.ts
packages/engine/src/hex/__tests__/{module}.test.ts
packages/engine/src/state/__tests__/{module}.test.ts
```

## Test Helper

Located at `packages/engine/src/systems/__tests__/helpers.ts`:

```typescript
import { createTestState, createTestPlayer, createTestUnit, createFlatMap, setTile } from './helpers';

const state = createTestState({ units: new Map([...]), players: new Map([...]) });
const unit = createTestUnit({ id: 'u1', typeId: 'warrior', owner: 'p1', position: { q: 0, r: 0 }, movementLeft: 2 });
const player = createTestPlayer({ id: 'p1', gold: 100, researchedTechs: ['pottery'] });
```

For cities, create inline:
```typescript
const city: CityState = {
  id: 'c1', name: 'Rome', owner: 'p1', position: { q: 3, r: 3 },
  population: 3, food: 0, productionQueue: [], productionProgress: 0,
  buildings: [], territory: [coordToKey({ q: 3, r: 3 })],
  settlementType: 'city', happiness: 10, isCapital: true, defenseHP: 100,
};
```

## Assertion Rules
- Concrete coordinates: `expect(pos).toEqual({ q: 3, r: -1 })`
- Exact values: `expect(gold).toBe(150)`
- State unchanged for invalid actions: `expect(next).toBe(state)`
- Use seeded RNG, never `Math.random()`

## Running Tests
```bash
npm run test:engine      # Engine only
npm test                 # Full suite
npx tsc --noEmit -p packages/engine  # Type-check
```
