# Canvas Audit Findings — packages/web/src/canvas/

Audited: 2026-04-15
Files: GameCanvas.tsx, HexRenderer.ts, AnimationManager.ts, AnimationRenderer.ts, RenderCache.ts, UnitIcons.ts, Camera.ts, __tests__/AnimationManager.test.ts
Standards applied: S-CANVAS-THIN-VIEW, S-IMPORT-BOUNDARIES, S-NO-ANY, S-NAMED-EXPORTS, S-ESM-ONLY, S-REACT-FUNCTIONAL, S-CONCRETE-ASSERTIONS, S-DETERMINISM, S-NO-HARDCODE-COLORS

---

## Summary

| Class | Count |
|-------|-------|
| A (clean) | 3 |
| B (mild drift) | 3 |
| C (violation) | 4 |

---

## Class C — Violations (must fix)

### C-1: GameCanvas imports from ui/ (S-IMPORT-BOUNDARIES, S-CANVAS-THIN-VIEW)
**Files:** `GameCanvas.tsx` lines 6–7
```
import { CombatHoverPreview } from '../ui/components/CombatHoverPreview';
import { usePanelManager } from '../ui/panels/PanelManager';
```
The rule is absolute: `canvas/` CANNOT import from `ui/`. Two violations.
- `CombatHoverPreview` is a React UI component rendered inside `GameCanvas`'s JSX. It belongs in the App.tsx/GameUI layer, not inside the canvas component. The canvas can expose a `combatPreview` value via the context (which it already does via `setCombatPreview`); App.tsx should conditionally render `<CombatHoverPreview>` alongside `<GameCanvas>`.
- `usePanelManager` is used to open the `improvement` panel when a builder unit is selected. This panel-open logic belongs in App.tsx, triggered by the selected-unit change, not inside the canvas.
**Severity:** Critical. PostToolUse hook should be catching this.

### C-2: Math.random() in AnimationRenderer (S-DETERMINISM / canvas-equivalent)
**File:** `AnimationRenderer.ts` lines 173–174
```typescript
this.ctx.translate(
  (Math.random() - 0.5) * shakeAmount,
  (Math.random() - 0.5) * shakeAmount
);
```
Used in `renderMeleeAttack` to produce a camera-shake effect on the target unit. Animations are visual-only (not engine state), so seeded-RNG is not a strict engine requirement here. However S-DETERMINISM states games must be deterministic and replayable; random shake driven by `Math.random()` means two playthroughs of the same game will differ visually during replays. The shake amount could be derived from `Math.sin(performance.now() / ...)` (deterministic given a fixed clock) or a simple oscillation, eliminating true randomness.
**Severity:** High (violates determinism spirit; visual-only but replay-unfriendly).

### C-3: window.__selection side-channel for city cycling (S-CANVAS-THIN-VIEW)
**File:** `GameCanvas.tsx` line 620–621
```typescript
const selState = (window as any).__selection as { cityId: string | null } | undefined;
const curIdx = selState?.cityId ? ownCities.findIndex(c => c.id === selState.cityId) : -1;
```
The `N` key city-cycle logic reads `window.__selection` — a global side-channel — to determine the currently selected city. This is a state-management leak: selection state is split between the engine state, React context, and an uncontrolled `window` property. The currently selected city should be tracked in `GameProvider` context (e.g. a `selectedCityId` field analogous to `selectedUnit`) and passed as a prop or read from context.
**Severity:** High (architectural smell, not a hard boundary violation but violates thin-view principle of reading only from engine/context state).

### C-4: Test assertions are vague — position checks use toBeDefined() (S-CONCRETE-ASSERTIONS)
**File:** `__tests__/AnimationManager.test.ts` lines 175–188, 203–204
```typescript
expect(pos!.x).toBeDefined();
expect(pos!.y).toBeDefined();
```
The "Unit Movement Animation" describe block checks that `getUnitPosition` returns a non-null object with `x` and `y`, but never asserts their values. Since `hexToPixel` is deterministic for known hex coords (`{q:0,r:0}`, `{q:1,r:0}`, `{q:2,r:0}`), concrete pixel assertions are possible and required by S-CONCRETE-ASSERTIONS.
For example at `t=0` (progress=0), position should equal `hexToPixel({q:0,r:0})`; at `t=1000` it should equal `hexToPixel({q:2,r:0})`. The one concrete assertion that does exist (`expect(pos!.x).toBeGreaterThan(startPos!.x)`) is directionally better but still not exact.
**Severity:** High (violates testing rules; masks regression risk in interpolation math).

---

## Class B — Mild Drift (should fix)

### B-1: (window as any) test hooks pollute global scope (S-NO-ANY, S-CANVAS-THIN-VIEW)
**File:** `GameCanvas.tsx` lines 50–52, 168–193
```typescript
(window as any).__enterPlacementMode = enterPlacementMode;
(window as any).__hexToScreen = (q, r) => { ... };
(window as any).__centerCameraOn = (q, r) => { ... };
(window as any).__cameraState = () => { ... };
```
Multiple `(window as any)` casts to attach E2E test hooks. The `as any` usage violates S-NO-ANY. Preferred pattern: define a typed `interface GameTestHooks` and set `(window as unknown as { __gameTestHooks: GameTestHooks }).__gameTestHooks = { ... }` — one typed assignment, zero `any`. Additionally, hooks that are only needed in test environments should ideally be gated on `import.meta.env.MODE !== 'production'`. The `__hexToScreen` hook is cleaned up on unmount (good); `__enterPlacementMode`, `__centerCameraOn`, and `__cameraState` are not cleaned up (minor leak).
**Severity:** Moderate (6 `as any` usages; missing cleanup for 3 hooks).

### B-2: Hardcoded color arrays duplicated across HexRenderer and AnimationRenderer (S-NO-HARDCODE-COLORS)
**Files:** `HexRenderer.ts` line 714; `AnimationRenderer.ts` line 38
```typescript
// HexRenderer.ts
const playerColors = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];

// AnimationRenderer.ts
const PLAYER_COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#ff6f00'];
```
The same six player-color hex literals appear in two files with different variable names. Note: the rule S-NEVER-HARDCODE-COLORS-CHROME applies to React chrome overlays (panel/HUD), not to canvas game-data pixels. Canvas game-data colors (terrain fills, player colors, unit shields) are an explicit exception. However duplicating this array creates a consistency risk: changing one palette doesn't change the other. The correct fix is to extract it to a shared `canvas/playerColors.ts` constant, not to route it through CSS tokens (which are React-DOM constructs unavailable in canvas).
**Severity:** Low-Moderate (not a standards violation per the chrome exception, but a DRY and consistency issue).

### B-3: HexRenderer and AnimationRenderer both import hexToPixel from HexRenderer — circular-ish coupling
**Files:** `AnimationManager.ts` line 14, `AnimationRenderer.ts` line 36, `RenderCache.ts` line 5
```typescript
import { hexToPixel } from './HexRenderer';  // AnimationManager.ts
import { hexToPixel, HEX_SIZE } from './HexRenderer';  // AnimationRenderer.ts
import { HEX_SIZE, hexToPixel } from './HexRenderer';  // RenderCache.ts (via import)
```
`hexToPixel` and `HEX_SIZE` are coordinate-math utilities that have no rendering logic. They are defined in `HexRenderer.ts` but re-exported from there only because that was convenient. `AnimationManager`, `AnimationRenderer`, and `RenderCache` all depend on `HexRenderer` purely for these two symbols. The real home for these is the existing `src/utils/hexMath.ts` (which `HexRenderer.ts` already imports them from at line 9 and re-exports). Fixing this means changing the import in the three consumer files from `'./HexRenderer'` to `'../utils/hexMath'` — eliminating the structural awkwardness of a renderer module being a utility provider.
**Severity:** Low (not a boundary violation since all are within `canvas/`, but is an organizational smell).

---

## Class A — Clean

### A-1: No engine state mutation
No file in `canvas/` mutates any engine state object. All systems read state via `GameProvider` context and dispatch actions via `dispatch`. The `Camera` class mutates only its own internal fields (pan position, zoom), which is correct — camera is a presentation concern, not engine state. S-CANVAS-THIN-VIEW satisfied for mutation.

### A-2: Named exports, ESM-only, no class components
All files use named exports only. No `export default` found. All imports use ESM `import/export`. No `require()` calls. No React class components. S-NAMED-EXPORTS, S-ESM-ONLY, S-REACT-FUNCTIONAL all satisfied.

### A-3: Animation state/visual separation is correct
`AnimationManager` stores animation metadata (start time, path, unit IDs) without ever touching engine state. `AnimationRenderer` reads `AnimationManager.getActive()` and draws visual interpolations only. The comment in `AnimationManager.ts` line 4 is accurate: "Animations are PURELY VISUAL — game state is already updated when animations start." S-ANIMATIONS-ARE-VISUAL satisfied.

---

## Finding Index

| ID   | File | Line(s) | Standard | Severity |
|------|------|---------|----------|----------|
| C-1  | GameCanvas.tsx | 6–7 | S-IMPORT-BOUNDARIES | Critical |
| C-2  | AnimationRenderer.ts | 173–174 | S-DETERMINISM | High |
| C-3  | GameCanvas.tsx | 620–621 | S-CANVAS-THIN-VIEW | High |
| C-4  | AnimationManager.test.ts | 175–188, 203–204 | S-CONCRETE-ASSERTIONS | High |
| B-1  | GameCanvas.tsx | 50–52, 168–193 | S-NO-ANY | Moderate |
| B-2  | HexRenderer.ts + AnimationRenderer.ts | 714, 38 | DRY (not standards violation) | Low |
| B-3  | AnimationManager.ts, AnimationRenderer.ts, RenderCache.ts | various | Organizational | Low |

---

## Recommended Fix Order

1. **C-1** — Move `CombatHoverPreview` render and `usePanelManager` call out of `GameCanvas` into App.tsx. This is the only critical boundary violation.
2. **C-4** — Replace `toBeDefined()` position checks with concrete `toEqual` against `hexToPixel` output.
3. **C-3** — Add `selectedCityId` to `GameProvider` context; remove `window.__selection` side-channel.
4. **C-2** — Replace `Math.random()` shake with `Math.sin(performance.now() / N)` oscillation.
5. **B-1** — Type the window test-hook interface; add missing cleanup for 3 hooks.
6. **B-3** — Re-point `AnimationManager`, `AnimationRenderer`, `RenderCache` imports to `../utils/hexMath`.
7. **B-2** — Extract shared `canvas/playerColors.ts`.
