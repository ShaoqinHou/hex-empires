---
name: test
description: Test helper API for hex-empires — the createTestState/createTestUnit/createTestPlayer factory functions and their import path. TRIGGER WHEN writing a new test file and you need the test helpers, OR you need the CityState inline construction pattern. For the 4-layer framework and assertion rules, read .codex/rules/testing.md directly (it's always in context).
user_invocable: true
---

# /test — Test Helpers

See `.codex/rules/testing.md` for the 4-layer framework + concrete-assertion rules (always loaded).

This skill covers only the test-helper API (unique content not in the rule doc).

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

## Type-check command
```bash
npx tsc --noEmit -p packages/engine  # Catches type errors without building
```
