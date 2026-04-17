---
name: add-hud-element
description: Step-by-step procedure for adding a new HUD overlay conforming to the HUDManager + TooltipShell pattern. TRIGGER WHEN you are about to create a new hover tooltip, toast notification, validation bubble, hint badge, or any `position: absolute`-style transient UI layer, OR the user asks to "add a tooltip" / "show a toast" / "display a hint" / similar, OR you need to register a new id in `packages/web/src/ui/hud/hudRegistry.ts`. DO NOT TRIGGER for panels (use /add-panel), or for small edits to existing overlays (read `.claude/rules/ui-overlays.md` directly).
user_invocable: true
paths:
  - "packages/web/src/ui/hud/**"
  - "packages/web/src/ui/hud/hudRegistry.ts"
---

# /add-hud-element — Add a New HUD / Overlay Element

Adding a new HUD element (hover tooltip, toast notification, validation bubble, hint badge) without drifting from the central pattern. Wraps `TooltipShell` when tooltip-shaped, registers with `HUDManager` when coordination is needed, styled from `hud-tokens.css` + `panel-tokens.css`, positioned through a shared strategy. Zero ad-hoc `position: absolute`, zero hand-rolled ESC, zero raw hex.

## Purpose

The HUD/overlay system is governed by three artifacts (`HUDManager`, `TooltipShell`, `hudRegistry`) and one stylesheet (`hud-tokens.css`). Every new overlay must use them where applicable. This skill walks through the full workflow so you produce an overlay that matches the rest of the HUD on first try — correct position strategy, correct tier switching, correct cycle behavior, correct tokens, correct test ids.

The full rule set is `.claude/rules/ui-overlays.md`. The audit motivating the pattern is `.claude/workflow/design/hud-ui-audit.md`. Read those first if you have not.

## Prerequisites

- Familiarity with `.claude/rules/ui-overlays.md` (the rules) and `.claude/rules/tech-conventions.md` (no raw hex).
- Familiarity with `.claude/rules/panels.md` — the HUD layer mirrors the panel layer's vocabulary.
- The HUD foundation lives in the tree (shipped across HUD cycles a–k, M-HUD1 → M-HUD3):
  - `packages/web/src/ui/hud/HUDManager.tsx` — context + ESC
  - `packages/web/src/ui/hud/TooltipShell.tsx` — shared tooltip chrome
  - `packages/web/src/ui/hud/hudRegistry.ts` — `HUDElementId` union + metadata
  - `packages/web/src/styles/hud-tokens.css` — HUD-specific design tokens
- You know what overlay type you are adding (see Step 1).
- The dev server is runnable: `npm run dev:web` (port 5174).

## Step-by-step

### 1. Decide the overlay type

| Type | Shape | Shell | Examples |
|------|-------|-------|----------|
| **Hover tooltip** | Floats near cursor / tile anchor | `TooltipShell` with `position="floating"` | Tile info, unit info, building info |
| **Combat preview** | Fixed screen corner, richer body | `TooltipShell` with `position="fixed-corner"` | Pre-attack odds, damage range |
| **Hint / placement overlay** | Stays visible during a parent interaction | `TooltipShell` with `position="side"`, `sticky` | Urban placement scores, adjacency preview |
| **Notification / toast** | Stacked transient messages, not anchored to map | `TooltipShell` with `position="fixed-corner"` and `defaultTimeout` in registry | Save complete, tech unlocked |
| **Validation feedback** | Transient inline bubble near the failing action | `TooltipShell` with `position="fixed-corner"`, `sticky: false`, and `defaultTimeout: 2500` in registry | "Not enough gold", "requires Bronze Working" |

If your overlay does not fit any of these, stop and add it to the audit doc (`hud-ui-audit.md`) as a new type before proceeding. The five types above cover the audit's current catalogue.

### 2. Pick a position strategy

- `floating` — follows the anchor; clamps to viewport; auto-offsets to avoid >30% tile occlusion.
- `fixed-corner` — snaps to a screen corner; used when body would occlude anchor in floating mode.
- `side` — anchored to viewport edge; persistent during parent interaction.

Pick once, at design time. Do not switch positions conditionally inside the component body — if you need both, you have two overlays.

### 3. Register the element in `hudRegistry.ts`

Edit `packages/web/src/ui/hud/hudRegistry.ts`:

a) Add the id to the `HUDElementId` union.

b) Add an entry to `HUD_REGISTRY`:

```typescript
['placementHint', {
  id: 'placementHint',
  priority: 'floating',          // 'floating' | 'fixed' | 'toast'
  // defaultTimeout: 3000,       // optional — omit for cursor-driven overlays
}],
```

Fields:
- `id` — must equal the map key.
- `priority` — one of `'floating'` (cursor-driven, follows anchor), `'fixed'` (snaps to a screen position), or `'toast'` (transient queued message). Controls the z-index tier in `hud-tokens.css`.
- `defaultTimeout` — optional auto-dismiss in ms. Use for toasts and validation feedback; omit for hover-driven overlays.

If you skip this step, TypeScript will immediately catch the wrong field names when you reference the registry, and `HUDManager.register('placementHint', ...)` will not type-check. Registry first.

### 4. Create the overlay component

Create `packages/web/src/ui/hud/PlacementHint.tsx` (or appropriate name). Use the copy-paste template below as the skeleton; fill in your body.

Key invariants enforced by following the template:

- Component wraps body in `<TooltipShell>` (or the appropriate shell for its type) with the matching `id`.
- Reads game state via `useGame()`; reads hover anchor via the appropriate canvas hook (e.g. `useHexHover()`); reads HUD coordination via `useHUDManager()`.
- Body chrome uses `var(--panel-*)` and `var(--hud-*)` tokens only.
- No `useState<boolean>` for visibility — the caller (App.tsx, a canvas component, or a state predicate) decides whether to mount.
- No per-overlay ESC handler.

### 5. Register with `HUDManager` if coordination is needed

Not every overlay needs central registration. Static toasts that appear and fade on their own timer do not. Hover tooltips, cycle-able anchors, and sticky placement hints do.

```tsx
useEffect(() => {
  const unregister = register('placementHint', {
    anchorKey: coordToKey(anchor),
    sticky: true,
  });
  return unregister;
}, [register, anchor]);
```

The `unregister` return is mandatory — overlays that unmount must clean up their registration. The manager will drop stale entries on its own after a grace period, but leaving them around produces "ghost tooltips ESC dismisses nothing" bugs.

### 6. Mount the overlay conditionally

Overlays mount from one of four places:

1. **Canvas-adjacent components** (`HexRenderer`, canvas overlay host) — for tooltips keyed on cursor hover state.
2. **App.tsx** — for overlays driven by top-level game-state predicates (turn transition, validation feedback tied to the last action result).
3. **Panel bodies** — for hints that exist only while a parent panel is open (placement hint tied to `BuildingPlacementPanel`).
4. **Engine-driven auto-show** — for toasts fired from an engine event (save complete, tech unlocked). The dispatch happens in a `useEffect` that watches the relevant state slice.

Match the existing pattern for your overlay type. See `hud-ui-audit.md` for the target placement of each.

### 7. Use only CSS tokens

Panel-tokens for shared chrome; hud-tokens for HUD-specific values:

```tsx
<div style={{
  backgroundColor: 'var(--panel-bg)',
  border: '1px solid var(--panel-border)',
  borderRadius: 'var(--panel-radius)',
  padding: 'var(--panel-padding-sm) var(--panel-padding-md)',
  color: 'var(--panel-text-color)',
  fontSize: 'var(--hud-font-size-compact)',
}}>
```

If you need a value that doesn't exist in either token file, add it to `hud-tokens.css` first, then use the variable. Never a literal.

### 8. Add stack-cycle support if applicable

If the overlay can anchor to multiple entities (e.g. tile with multiple units):

```tsx
const { cycleIndex, advanceCycle } = useHUDManager();
const i = cycleIndex(coordToKey(anchor));
const shown = entities[i % entities.length];

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key === 'Tab' && hovering) {
      e.preventDefault();
      advanceCycle(coordToKey(anchor));
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [advanceCycle, anchor, hovering]);

return (
  <TooltipShell id="tileTooltip" anchor={anchor} position="floating" tier="compact">
    <EntityLine entity={shown} />
    {entities.length > 1 && (
      <span style={{ color: 'var(--panel-muted-color)' }}>
        {i + 1} / {entities.length} — Tab to cycle
      </span>
    )}
  </TooltipShell>
);
```

Never render all stacked entities at once. The M37-B duplicate-content regression test in `packages/web/src/__tests__/playwright/tooltip.spec.ts` will fail if you do.

### 9. Smoke test

Create `packages/web/src/ui/hud/__tests__/PlacementHint.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HUDManagerProvider } from '../HUDManager';
import { PlacementHint } from '../PlacementHint';

describe('PlacementHint', () => {
  it('renders compact body inside a TooltipShell', () => {
    render(
      <HUDManagerProvider>
        <PlacementHint anchor={{ q: 0, r: 0 }} scores={[{ tile: { q: 1, r: 0 }, score: 8 }]} />
      </HUDManagerProvider>
    );
    expect(screen.getByTestId('hud-placementHint')).toBeInTheDocument();
    expect(screen.getByText(/score 8/i)).toBeInTheDocument();
  });
});
```

Do **not** re-test `TooltipShell` chrome (position clamping, pointer-events, context-menu suppression). Do **not** re-test `HUDManager` ESC. Those are covered in the shell / manager tests once.

### 10. Playwright invariant (when applicable)

If your overlay is a new type or changes hover behavior, add a line to `packages/web/src/__tests__/playwright/hud.spec.ts` asserting the game-feel invariant (no pageerror, correct text appears, no duplicate content, no focus theft). Do not add a full new spec file per overlay — the hud.spec is the shared sanity harness.

### 11. Document the new element in `hud-elements.md`

Maintain a running registry of all HUD elements in `.claude/workflow/design/hud-elements.md` (create if missing). One line per element:

```
| placementHint | floating | side | cycles | sticky | BuildingPlacementPanel | ui/hud/PlacementHint.tsx |
```

Columns: id, priority (`floating`/`fixed`/`toast`), position strategy, cycle-supported, sticky, parent/trigger, source file. The audit uses this as the source-of-truth catalogue; reviewers use it to spot drift fast.

### 12. Verify

```bash
npm run test:web -- hud
npm run build
# optional behavioral check via /verify skill
```

The build must pass before commit. The smoke test must pass. If you added a new hover path, open the dev server and exercise it manually (or extend the Playwright hud.spec).

---

## Copy-paste starter template

Minimum overlay that satisfies every rule. Save as `packages/web/src/ui/hud/PlacementHint.tsx`, customize the body.

```tsx
import type { CSSProperties } from 'react';
import { useEffect } from 'react';
import type { HexCoord } from '@hex/engine';
import { coordToKey } from '@hex/engine';
import { TooltipShell } from './TooltipShell';
import { useHUDManager } from './HUDManager';

interface PlacementHintProps {
  readonly anchor: HexCoord;
  readonly scores: ReadonlyArray<{ readonly tile: HexCoord; readonly score: number }>;
  readonly tier?: 'compact' | 'detailed';
}

const listStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--panel-padding-sm)',
  color: 'var(--panel-text-color)',
  fontSize: 'var(--hud-font-size-compact, 13px)',
};

const rowStyle: CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 'var(--panel-padding-md)',
};

const mutedStyle: CSSProperties = {
  color: 'var(--panel-muted-color)',
};

export function PlacementHint({ anchor, scores, tier = 'compact' }: PlacementHintProps) {
  const { register } = useHUDManager();

  useEffect(() => {
    const unregister = register('placementHint', {
      anchorKey: coordToKey(anchor),
      sticky: true,
    });
    return unregister;
  }, [register, anchor]);

  if (scores.length === 0) {
    return null;
  }

  return (
    <TooltipShell
      id="placementHint"
      anchor={anchor}
      position="side"
      tier={tier}
      sticky
    >
      <div style={listStyle}>
        {scores.map(({ tile, score }) => (
          <div key={coordToKey(tile)} style={rowStyle}>
            <span>({tile.q}, {tile.r})</span>
            <span style={mutedStyle}>score {score}</span>
          </div>
        ))}
      </div>
    </TooltipShell>
  );
}
```

### Why this template

- **`TooltipShell` wrapper** — positioning, clamping, `user-select: none`, context-menu suppression, test ids all come from the shell. You write zero of it.
- **`register` in useEffect with `unregister` cleanup** — `HUDManager` knows this overlay exists, coordinates ESC, and cleans up when the parent interaction ends.
- **Token-driven styles** — every color, padding, border, font-size is a `var(--panel-*)` or `var(--hud-*)`.
- **No local visibility state** — the caller decides when to mount. `scores.length === 0` returns `null`, but visibility-over-time is not this component's concern.
- **No per-overlay ESC handler** — `HUDManager` owns ESC.

---

## Common pitfalls

1. **Adding `className="absolute top-4 right-4"` or inline `style={{ position: 'absolute', ... }}`.** This is the #1 drift vector. Let the shell position. If the shell's strategies don't fit, the overlay type is wrong for this interaction — revisit Step 1.
2. **Raw hex colors.** Especially in status-colored overlays (validation red, success green). Add to `hud-tokens.css` first.
3. **Forgetting stack-cycle support.** Tile tooltips must cycle. Combat previews on multi-target hexes must cycle. If the overlay can anchor to multiple entities, the body must consume `cycleIndex` from `useHUDManager` and render one entity at a time.
4. **Re-enabling text selection.** Do not set `user-select: text` on an overlay body. The game-feel is "desktop app, not webpage" — text selection breaks the illusion. If a specific surface genuinely needs selectable text (rare), open an issue first.
5. **Rendering the browser's right-click context menu.** `TooltipShell` suppresses it. Do not add `onContextMenu={undefined}` overrides.
6. **Keyboard focus theft.** Don't put `tabIndex={0}` on a hover tooltip. Tab order is panels-only.
7. **Adding a per-overlay `addEventListener('keydown', escClose)`.** `HUDManager` already owns ESC. A second handler will race with the manager and with the panel manager, producing "ESC closes the wrong thing" bugs — exactly what the audit catalogued.
8. **Holding visibility in `useState<boolean>`.** Visibility is a caller concern. The overlay renders when mounted, returns `null` when there's nothing to show, and unmounts when the caller decides.
9. **Skipping the `hud-elements.md` entry.** The catalogue is how reviewers see drift. Forgetting your element means the next audit re-discovers it.
10. **Fixed pixel widths that clip at 1280px.** Use `TooltipShell`'s width tokens or flex sizing. Never a hard `width: 420`.

---

## Verification checklist

Copy this into your PR description or commit message body.

- [ ] `HUDElementId` added to `hudRegistry.ts` union and `HUD_REGISTRY` map (with `priority` and optional `defaultTimeout`)
- [ ] Component wraps body in `<TooltipShell>` with matching `id`
- [ ] Position strategy chosen at design time (floating / fixed-corner / side), not conditionally
- [ ] No local `useState<boolean>` for visibility — caller decides when to mount
- [ ] `HUDManager.register` called in `useEffect` with `unregister` cleanup (if coordination is needed)
- [ ] Body chrome uses only `var(--panel-*)` and `var(--hud-*)` tokens — no raw hex, no Tailwind color utilities
- [ ] Stack-cycle support wired (if the overlay can anchor to multiple entities)
- [ ] No `user-select: text` override; no `onContextMenu` override; no `tabIndex={0}` on non-interactive surfaces
- [ ] No per-overlay ESC handler
- [ ] Smoke test in `packages/web/src/ui/hud/__tests__/<OverlayName>.test.tsx` passes
- [ ] Playwright hud.spec updated if the new overlay introduces a new hover path
- [ ] Entry added to `.claude/workflow/design/hud-elements.md`
- [ ] `npm run build` passes
- [ ] `npm run test:web -- hud` passes
- [ ] Manual or Playwright E2E confirms the overlay appears, dismisses correctly, cycles (if applicable), and does not occlude its anchor

---

## References

- Rules: `.claude/rules/ui-overlays.md`
- Sibling rules (the panel layer this mirrors): `.claude/rules/panels.md`
- Audit / migration plan: `.claude/workflow/design/hud-ui-audit.md`
- Running catalogue: `.claude/workflow/design/hud-elements.md`
- Implementation (in tree):
  - `packages/web/src/ui/hud/HUDManager.tsx`
  - `packages/web/src/ui/hud/TooltipShell.tsx`
  - `packages/web/src/ui/hud/hudRegistry.ts`
  - `packages/web/src/ui/hud/TooltipOverlay.tsx` — reference floating tooltip with stack-cycle + tier
  - `packages/web/src/ui/hud/UrbanPlacementHintBadge.tsx` — reference floating hint badge
  - `packages/web/src/styles/hud-tokens.css`
- Reference for tokens-only chrome discipline: `ReligionPanel.tsx`, `GovernmentPanel.tsx` (same philosophy, panel side).
