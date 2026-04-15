# Audit: web/providers, web/hooks, web/utils, App.tsx, main.tsx, web/audio

Audited: 2026-04-15
Standards source: `.claude/workflow/design/standards.md`
Scope: `packages/web/src/providers/`, `hooks/`, `utils/`, `audio/`, `App.tsx`, `main.tsx`

---

## Summary table

| File | Grade | Issues |
|---|---|---|
| `providers/GameProvider.tsx` | B | 5 issues (see below) |
| `App.tsx` | B | 2 issues |
| `hooks/useAudio.ts` | A | clean |
| `hooks/useAltKey.ts` | A | clean |
| `utils/hexMath.ts` | A | clean |
| `audio/AudioManager.ts` | B | 3 issues (1 known/tolerated) |
| `audio/SoundGenerator.ts` | B | 2 issues |
| `main.tsx` | A | clean |
| `providers/__tests__/GameProvider.placementMode.test.tsx` | A | clean |

---

## File-by-file findings

---

### `packages/web/src/providers/GameProvider.tsx`

**Grade: B**

#### GP-1 — S-IMPORT-BOUNDARIES violation: provider imports from `canvas/`
```
Line 3: import { AnimationManager } from '../canvas/AnimationManager';
```
`providers/` sits in the `ui/` conceptual layer. The import-boundaries rule says `canvas/` and `ui/` are independent — neither may import from the other. The `AnimationManager` instance is created inside `GameProvider` and its ref is passed outward via context. This is a moderate violation: it makes the provider untestable without a DOM/canvas environment and couples animation sequencing to the data layer.

**Fix direction:** move `AnimationManager` instantiation to `App.tsx` or a dedicated `AnimationProvider`, pass it via context. The engine dispatch logic in `GameProvider` should remain animation-agnostic.

---

#### GP-2 — S-NO-ANY: `window as any` used for E2E test exposure
```
Lines 628–635:
  (window as any).__gameState = state;
  (window as any).__gameDispatch = dispatch;
  (window as any).__selection = { ... };
```
Three `as any` casts. The standard permits `@ts-nocheck` at the file level when justified, but not scattered `as any` in production provider code. The intent (E2E test harness access) is legitimate but the type escape is avoidable.

**Fix direction:** declare a module augmentation:
```typescript
declare global {
  interface Window {
    __gameState?: GameState | null;
    __gameDispatch?: (action: GameAction) => void;
    __selection?: { unitId: string | null; hex: HexCoord | null; cityId: string | null };
  }
}
```
Then assign without `any`.

---

#### GP-3 — S-NO-HARDCODE-COLORS: raw hex in animation dispatch
```
Line 395: '#ff5722',
```
Hard-coded projectile-trail color passed into `AnimationManager.createRangedAttackAnimation`. This is inside the `dispatch` callback, not a CSS file, so CSS token variables cannot be used directly. However, a named constant (`RANGED_PROJECTILE_COLOR`) in a shared constants file or canvas-tokens module would satisfy the spirit of the rule.

**Fix direction:** extract to a named constant in `packages/web/src/canvas/canvasTokens.ts` (or similar).

---

#### GP-4 — S-NO-USESTATE-BOOLEAN-FOR-PANEL (indirect): `isAltPressed` duplicates `useAltKey`
```
Line 219: const [isAltPressed, setIsAltPressed] = useState(false);
Lines 243–263: useEffect tracking Alt keydown/keyup.
```
`useAltKey.ts` was added precisely to de-duplicate this pattern (the hook's own JSDoc says "this hook exists as the standalone primitive… new HUD consumers should prefer this hook over prop-drilling from GameProvider"). `GameProvider` still carries its own Alt-key `useState` + `useEffect` pair. This means two separate window listeners fire on every Alt key event, and the state lives in two places (provider context vs hook return). The `isAltPressed` in context is then prop-drilled to `TooltipOverlay`.

This is not a `useState<boolean>` for panel visibility (S-NO-BOOLEAN-PANEL-STATE), so the exact standard is S-HUD-PATTERN / prop-drill concern rather than panel concern. Still a quality B issue because the hook exists for exactly this purpose.

**Fix direction:** remove `isAltPressed` state + useEffect from `GameProvider`, remove it from `GameContextValue`. Have `App.tsx` call `useAltKey()` directly and pass it as a prop to `TooltipOverlay` — or have `TooltipOverlay` call `useAltKey()` itself (the cleaner option).

---

#### GP-5 — S-ESC-OWNERSHIP-PANEL adjacent: GameProvider registers its own capture-phase ESC handler
```
Lines 272–284: window.addEventListener('keydown', handleKeyDownCapture, true) for Escape.
```
The `PanelManagerProvider` owns the canonical ESC handler in capture phase. `GameProvider` registers a second capture-phase ESC handler for placement mode cancellation. The comment acknowledges this ("`stopPropagation` so the player's ESC only cancels placement without also closing the CityPanel"). The ordering is not guaranteed — `GameProvider` mounts before `PanelManagerProvider` (it is the outer provider), so its capture listener fires first, which is the correct behavior for this use case. This is intentional and documented but still technically a second capture-phase ESC listener.

**Classification:** tolerated by design with comment. No immediate fix needed, but worth tracking as a potential ESC-race source if future providers add more handlers.

---

### `packages/web/src/App.tsx`

**Grade: B**

#### APP-1 — S-NO-USESTATE-BOOLEAN-FOR-PANEL (adjacent): `showYields` is a boolean useState
```
Line 45: const [showYields, setShowYields] = useState(false);
```
This controls a yields overlay toggle (`YieldsToggle`), not a panel visibility. The exact S-NO-BOOLEAN-PANEL-STATE rule targets panel visibility only. However, `showYields` is UI overlay state that arguably belongs in the HUD layer (S-HUD-PATTERN) or at minimum in a dedicated context. Currently it is local to `GameUI` and threaded as props to both `GameCanvas` (`showYields`) and `YieldsToggle`. This is mild prop-drilling.

**Classification:** B — tolerated for now; yields overlay is simple enough. When HUDManager lands, it should own this flag.

---

#### APP-2 — Keyboard shortcut handler hardcodes key letters (S-DATA-TRIGGER-ATTR partial violation)
```
Lines 78–91 in App.tsx keydown handler:
  if (e.key === 'h' || e.key === 'H') togglePanel('help');
  if (e.key === 'r' || e.key === 'R') togglePanel('religion');
  if (e.key === 'g' || e.key === 'G') togglePanel('government');
  if (e.key === 'k' || e.key === 'K') togglePanel('commanders');
```
S-DATA-TRIGGER-ATTR says: "Keyboard shortcuts are wired in App.tsx keydown handler sourced from PANEL_REGISTRY — not hard-coded letters." The shortcuts are hard-coded here rather than read from `PANEL_REGISTRY.get(id)?.keyboardShortcut`. If a shortcut changes in the registry, App.tsx will not pick it up.

**Fix direction:**
```typescript
// Desired pattern
for (const [id, entry] of PANEL_REGISTRY) {
  const key = entry.keyboardShortcut;
  if (key && (e.key === key.toLowerCase() || e.key === key.toUpperCase())) {
    togglePanel(id);
  }
}
```

---

### `packages/web/src/hooks/useAudio.ts`

**Grade: A**

- Named export only. ESM only. No `any`. No `require`. No cross-boundary imports.
- `useEffect` correctly handles audio lifecycle (not game state dispatch). Appropriate use.
- The `isInitialized` flag and config state are correct UI/audio state (not game state), so no S-NO-USEEFFECT-FOR-GAME-STATE concern.
- Minor observation: the `updateConfig` function is defined inside the `useEffect` but never called — dead code. Not a standards violation but a cleanup opportunity.

---

### `packages/web/src/hooks/useAltKey.ts`

**Grade: A**

- Named export only. ESM only. No `any`. No `require`. No cross-boundary imports.
- Clean, minimal, well-documented.
- The blur-reset behavior (clears `alt` on window blur) is a good game-feel detail not present in the duplicate `GameProvider` implementation.

---

### `packages/web/src/utils/hexMath.ts`

**Grade: A**

- Named exports only. ESM only. No `any`. No `require`. No cross-boundary imports.
- Imports only from `@hex/engine` for types — correct.
- Pure math functions. No DOM, no React.
- `hexRound` is unexported (internal helper) — intentional and clean.

---

### `packages/web/src/audio/AudioManager.ts`

**Grade: B** (1 known tolerated issue + 2 new issues)

#### AM-1 — `@ts-nocheck` (KNOWN / TOLERATED)
Line 1: `// @ts-nocheck`
Listed in the audit brief as a known exception. The file uses Web Audio API with `window.AudioContext || window.webkitAudioContext`, which requires vendor-prefix escape. Tolerated.

#### AM-2 — `SoundGenerator` constructor API mismatch
```typescript
// AudioManager.ts line 201:
this.soundGenerator = new SoundGenerator(this.audioContext);

// SoundGenerator.ts line 9:
constructor() {   // no parameter
```
`AudioManager` passes `this.audioContext` to `SoundGenerator`'s constructor, but `SoundGenerator` declares `constructor()` with no parameters (and then creates its own `AudioContext`). Under `@ts-nocheck` this compiles silently, but at runtime `SoundGenerator` ignores the passed context and creates a second `AudioContext` — a browser resource leak. This is a correctness bug, not just a style issue.

**Fix direction:** `SoundGenerator` constructor should accept an optional `AudioContext` parameter and use it rather than creating a second one.

#### AM-3 — S-NAMED-EXPORTS: `AudioManager` is a class exported with `export class` — fine. But `getAudioManager` and `saveAudioSettings` are module-level functions — also fine (named exports). No default exports. Clean on this standard.

#### AM-4 — `getAudioManager` uses `localStorage` at module level on first call
The global singleton pattern (`let globalAudioManager: AudioManager | null = null`) is fine, but `localStorage.getItem('audioSettings')` and `JSON.parse(savedSettings)` run in the `getAudioManager` factory with no try/catch around the `JSON.parse`. If localStorage holds malformed JSON, the entire audio system throws uncaught. Low risk but worth a defensive wrap.

---

### `packages/web/src/audio/SoundGenerator.ts`

**Grade: B**

#### SG-1 — S-NAMED-EXPORTS violation: `export class SoundGenerator` — actually fine (named class export). No default export.

#### SG-2 — Dead `playClick`, `playConfirm`, `playSelect`, `playError` methods vs internal usage
`AudioManager.playSynthesizedSound` calls `soundGenerator.click()`, `soundGenerator.confirm()`, `soundGenerator.error()`, `soundGenerator.unitMove()`, `soundGenerator.attack()`, `soundGenerator.death()`, `soundGenerator.cityFound()`, `soundGenerator.victory()`, `soundGenerator.defeat()`. But `SoundGenerator` only defines `playTone`, `playClick`, `playConfirm`, `playSelect`, `playError`. The methods `AudioManager` calls (`click`, `confirm`, `unitMove`, `attack`, `death`, `cityFound`, `victory`, `defeat`) do not exist on `SoundGenerator`. Under `@ts-nocheck` in AudioManager this compiles; at runtime these calls are no-ops (method not found, no error in JS). The fallback synthesized audio is entirely broken.

This is a correctness bug. The method names were refactored in one file and not the other.

**Fix direction:** align `SoundGenerator` method names with what `AudioManager` calls (`click`, `confirm`, `error`, `unitMove`, `attack`, `death`, `cityFound`, `victory`, `defeat`), or update `AudioManager.playSynthesizedSound` to call the existing method names.

#### SG-3 — `SoundGenerator` creates its own `AudioContext` (see AM-2 above). Second issue of the same root-cause pair.

---

### `packages/web/src/main.tsx`

**Grade: A**

- Named export `App`. ESM only. Clean entry point.
- No issues.

---

## Issue registry (migration backlog)

| ID | File | Standard | Severity | Description |
|---|---|---|---|---|
| GP-1 | GameProvider.tsx | S-IMPORT-BOUNDARIES | high | Provider imports `AnimationManager` from `canvas/` — cross-boundary |
| GP-2 | GameProvider.tsx | S-NO-ANY | medium | Three `window as any` casts for E2E test helpers |
| GP-3 | GameProvider.tsx | S-NO-HARDCODE-COLORS | low | `'#ff5722'` hardcoded projectile color in dispatch |
| GP-4 | GameProvider.tsx | S-HUD-PATTERN / prop-drill | medium | `isAltPressed` state duplicates `useAltKey` hook; prop-drilled to tooltip |
| GP-5 | GameProvider.tsx | S-ESC-OWNERSHIP-PANEL | info | Second capture-phase ESC handler (placement mode); intentional but fragile |
| APP-1 | App.tsx | S-HUD-PATTERN | low | `showYields` boolean useState in GameUI; should move to HUDManager |
| APP-2 | App.tsx | S-DATA-TRIGGER-ATTR | medium | Keyboard shortcuts hardcoded rather than read from PANEL_REGISTRY |
| AM-2 | AudioManager.ts | correctness | high | Passes AudioContext to SoundGenerator but SG ignores it → double context |
| AM-4 | AudioManager.ts | correctness | low | `JSON.parse` in `getAudioManager` has no try/catch |
| SG-2 | SoundGenerator.ts | correctness | high | Method names don't match what AudioManager calls → synthesized fallback broken |

---

## Tests coverage assessment

| Test file | Coverage |
|---|---|
| `providers/__tests__/GameProvider.placementMode.test.tsx` | Good — covers all 5 placement-mode state transitions including ESC |
| `hooks/useAudio.ts` | No tests — audio hooks untested |
| `hooks/useAltKey.ts` | No tests — simple enough but blur-reset behavior is untested |
| `utils/hexMath.ts` | No tests found in scope (may exist elsewhere) |
| `audio/AudioManager.ts` | No tests |
| `audio/SoundGenerator.ts` | No tests |

The two correctness bugs in SG-2 and AM-2 would be caught immediately by unit tests. Their absence explains why the method-name mismatch went undetected.
