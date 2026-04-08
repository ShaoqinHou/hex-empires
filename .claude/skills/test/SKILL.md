---
name: test
description: Testing conventions for game systems
user_invocable: true
---

# /test — Testing Conventions

## File Locations
```
packages/engine/src/systems/__tests__/{System}.test.ts
packages/engine/src/hex/__tests__/{Module}.test.ts
packages/engine/src/registry/__tests__/{Registry}.test.ts
packages/engine/src/data/__tests__/content-validation.test.ts
packages/web/src/__tests__/{Component}.test.tsx
```

## Engine Test Pattern

Systems are pure functions — test with concrete states:

```typescript
import { describe, it, expect } from 'vitest';
import { movementSystem } from '../MovementSystem';
import { createMinimalState } from '../../state/TestHelpers';

describe('MovementSystem', () => {
  it('moves unit to adjacent hex', () => {
    const state = createMinimalState({
      units: new Map([['u1', {
        id: 'u1', defId: 'unit_warrior',
        ownerId: 'p1', position: { q: 0, r: 0 },
        movementLeft: 2, health: 100,
      }]]),
    });
    const action = { type: 'MOVE_UNIT' as const, unitId: 'u1', path: [{ q: 1, r: 0 }] };
    const next = movementSystem(state, action);
    expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
    expect(next.units.get('u1')!.movementLeft).toBe(1);
  });

  it('rejects move beyond movement range', () => {
    // ... test that state is unchanged for invalid moves
  });
});
```

## Assertion Rules
- **Concrete coordinates:** `expect(pos).toEqual({ q: 3, r: -1 })`
- **Exact resources:** `expect(gold).toBe(150)` not `expect(gold).toBeGreaterThan(0)`
- **State immutability:** verify original state was not mutated
- **Determinism:** use seeded RNG, never `Math.random()`

## Running Tests
```bash
npm run test:engine      # Engine only
npm run test:web         # Web only
npm test                 # Full suite
bash .claude/hooks/run-tests.sh --module engine  # With marker
```
