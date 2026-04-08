# Testing Rules

## Testing Depth Framework (adapted for games)

### Layer 1: Unit Tests (System Logic)

Test pure system functions with concrete game states.

**When required:** Any change to a system, hex math, pathfinding, or state utility.

```typescript
// GOOD: concrete state, concrete action, concrete assertion
it('moves unit to target hex', () => {
  const state = createMinimalState({
    units: new Map([['u1', { id: 'u1', position: { q: 0, r: 0 }, movement: 3 }]]),
  });
  const action = { type: 'MOVE_UNIT', unitId: 'u1', path: [{ q: 1, r: 0 }] };
  const next = movementSystem(state, action);
  expect(next.units.get('u1')!.position).toEqual({ q: 1, r: 0 });
});

// BAD: vague assertion
expect(next.units.get('u1')!.position).toBeDefined();
```

**Key areas to test:**
- Each system function with valid and invalid actions
- Hex math: neighbors, distance, pathfinding (known grids)
- Effect calculations: MODIFY_YIELD, MODIFY_COMBAT applied correctly
- Age transitions: legacy bonuses carry forward
- Victory conditions: correct detection

### Layer 2: Integration Tests (Multi-System)

Test that multiple systems work together in the pipeline.

**When required:** Features involving multiple systems (e.g., combat triggers resource changes).

```typescript
it('founding a city consumes the settler and creates a city', () => {
  const state = stateWithSettler('u1', { q: 2, r: 3 });
  const next = applyAction(state, { type: 'FOUND_CITY', unitId: 'u1', name: 'Rome' });
  expect(next.units.has('u1')).toBe(false);  // settler consumed
  expect(next.cities.size).toBe(1);
  const city = [...next.cities.values()][0];
  expect(city.position).toEqual({ q: 2, r: 3 });
  expect(city.name).toBe('Rome');
});
```

### Layer 3: Behavioral (Browser)

Test user interactions via chrome-devtools MCP.

**When required:** New UI panels, canvas interactions, game flow.

- Click hex → verify selection highlight appears
- Click unit → verify action panel shows movement/attack options
- End turn → verify turn counter increments
- Open tech tree → verify techs for current age displayed

### Layer 4: Output Verification

Test that game state serializes/deserializes correctly.

**When required:** Save/load, replay, AI decision output.

```typescript
it('serializes and deserializes game state without data loss', () => {
  const state = createFullGameState();
  const json = serializeState(state);
  const restored = deserializeState(json);
  expect(restored).toEqual(state);
});
```

## File Locations

```
packages/engine/src/systems/__tests__/{System}.test.ts
packages/engine/src/hex/__tests__/{Module}.test.ts
packages/engine/src/registry/__tests__/{Registry}.test.ts
packages/engine/src/data/__tests__/content-validation.test.ts
packages/web/src/__tests__/{Component}.test.tsx
```

## Running Tests

```bash
npm run test:engine                        # Engine tests
npm run test:web                           # Web tests
npm test                                   # All tests
bash .claude/hooks/run-tests.sh            # Full + marker
bash .claude/hooks/run-tests.sh --module engine  # Engine + marker
```

## Assertion Rules

- **Concrete coordinates:** `expect(pos).toEqual({ q: 3, r: -1 })` not `expect(pos).toBeDefined()`
- **Exact resource amounts:** `expect(gold).toBe(150)` not `expect(gold).toBeGreaterThan(0)`
- **State transitions:** assert both the changed AND unchanged parts of state
- **Determinism:** tests must use seeded RNG, never `Math.random()`
