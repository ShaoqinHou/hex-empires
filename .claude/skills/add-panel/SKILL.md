---
name: add-panel
description: Step-by-step guide for adding a new UI panel that conforms to the M33 PanelManager + PanelShell pattern
user_invocable: true
---

# /add-panel — Add a New UI Panel

Adding a new panel without drifting from the central pattern. Wraps `PanelShell`, registers in `panelRegistry`, opens through `usePanelManager`, styled from `panel-tokens.css`. Zero local visibility state, zero hand-rolled chrome.

## Purpose

The panel system is governed by three artifacts (`PanelShell`, `PanelManager`, `panelRegistry`) and one stylesheet (`panel-tokens.css`). Every new panel must use all four. This skill walks through the full add-a-panel workflow so you produce a panel that matches the rest of the game on first try — correct close button, correct ESC behavior, correct z-index, correct tokens, correct test ids.

The audit motivating this pattern is at `.claude/workflow/design/panel-manager-audit.md`. The full rule set is `.claude/rules/panels.md`. Read those first if you have not.

## Prerequisites

- Familiarity with `.claude/rules/panels.md` (the rules) and `.claude/rules/tech-conventions.md` (no raw hex).
- You know what `PanelId` you want (kebab-or-camel, unique) and what triggers it (TopBar button, keyboard shortcut, canvas event, or engine predicate).
- You know its priority class:
  - `modal` — must be resolved (age transition, victory, crisis, turn summary)
  - `overlay` — floats over the map, non-blocking (most panels)
  - `info` — non-blocking side column (event log)
- The dev server is runnable: `npm run dev:web` (port 5174).

## Step-by-step

### 1. Pick a `PanelId` and register it

Edit `packages/web/src/ui/panels/panelRegistry.ts`:

a) Add the id to the `PanelId` union.

b) Add an entry to `PANEL_REGISTRY` in registration order:

```typescript
['myPanel', { id: 'myPanel', title: 'My Panel', icon: '🛠️', keyboardShortcut: 'M', priority: 'overlay' }],
```

Fields: `id` (must equal the map key), `title` (shown in shell title bar), `icon` (emoji used in menus and HelpPanel), `keyboardShortcut` (single character, optional), `priority` (`modal` | `overlay` | `info`).

If you skip this step, `openPanel('myPanel')` will not type-check. That is the contract — registry first.

### 2. Create the panel component

Create `packages/web/src/ui/panels/MyPanel.tsx`. Use the starter template below as the skeleton; fill in your own body.

Key invariants enforced by following the template:

- Component takes `{ onClose: () => void }`. Nothing else.
- Wraps body in `<PanelShell id="myPanel" title="My Panel" onClose={onClose} priority="overlay" />`.
- Reads game state via `useGame()` (from `packages/web/src/providers/GameProvider.tsx`).
- Body styling uses `var(--panel-*)` tokens for chrome-adjacent surfaces.

### 3. Mount it conditionally in App.tsx

In `packages/web/src/App.tsx`, find the `<Suspense fallback={null}>` block inside `GameUI`. Add a branch:

```tsx
{activePanel === 'myPanel' && (
  <MyPanel onClose={() => setActivePanel('none')} />
)}
```

(Once GameUI fully migrates to `usePanelManager`, the wrapping changes to `isOpen('myPanel') && <MyPanel onClose={closePanel} />`. Use whichever style App.tsx is currently on — match the surrounding panels.)

Add the `lazy` import alongside the others at the top of App.tsx:

```tsx
const MyPanel = lazy(() => import('./ui/panels/MyPanel').then(m => ({ default: m.MyPanel })));
```

### 4. Wire a TopBar trigger

Edit `packages/web/src/ui/components/TopBar.tsx` (or wherever the trigger lives). Add a button or menu item with the data attribute and a `togglePanel` call:

```tsx
<button
  data-panel-trigger="myPanel"
  onClick={() => togglePanel('myPanel')}
  className="..."
>
  🛠️ My Panel
</button>
```

The `data-panel-trigger="<id>"` attribute is mandatory. Future click-outside-to-close logic uses it to avoid the open/close race the audit caught.

If TopBar does not yet use `usePanelManager` directly and instead receives `onOpenXxx` callbacks from App.tsx, follow the existing pattern for now and add an `onOpenMyPanel` prop. (Migration to direct `usePanelManager` is a separate cycle.)

### 5. Wire a keyboard shortcut (optional)

If the registry entry has `keyboardShortcut`, add a branch to App.tsx's keydown handler. Source the key from the registry — do not hard-code it twice:

```tsx
const myShortcut = PANEL_REGISTRY.get('myPanel')?.keyboardShortcut;
if (myShortcut && e.key.toUpperCase() === myShortcut) {
  togglePanel('myPanel');
}
```

Verify the shortcut is not already taken by checking `panelRegistry.ts` and the `keydown` handler.

### 6. Update HelpPanel's controls list

Edit `packages/web/src/ui/panels/HelpPanel.tsx`. Add an entry to the `Controls` section's `items` array:

```tsx
{ key: 'M', label: 'Toggle My Panel' },
```

The help panel is the player's only discoverability surface for shortcuts. If you skip this, the shortcut effectively does not exist.

### 7. Write a smoke test

Create `packages/web/src/ui/panels/__tests__/MyPanel.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PanelManagerProvider } from '../PanelManager';
import { MyPanel } from '../MyPanel';

describe('MyPanel', () => {
  it('renders inside a PanelShell with the registered title', () => {
    render(
      <PanelManagerProvider>
        <MyPanel onClose={() => {}} />
      </PanelManagerProvider>
    );
    expect(screen.getByRole('dialog', { name: 'My Panel' })).toBeInTheDocument();
    expect(screen.getByTestId('panel-shell-myPanel')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <PanelManagerProvider>
        <MyPanel onClose={onClose} />
      </PanelManagerProvider>
    );
    screen.getByTestId('panel-close-myPanel').click();
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

If your panel reads `useGame()`, also wrap in a test `GameProvider` or pass mocked props — see existing panel tests for the pattern your panel needs.

Do **not** re-test the close button glyph, the backdrop, the `aria-label`, or the z-index. Those are covered by `PanelShell.test.tsx`. Re-testing them couples your test to internals.

### 8. Verify

Run the full panel test suite, the build, and an interaction E2E:

```bash
npm run test:web -- panels
npm run build
# optional behavioral check via /verify skill
```

The build must pass before commit. The smoke test must pass. If you added a TopBar trigger or keyboard shortcut, open the dev server and exercise both manually (or add a Playwright spec in `packages/web/src/__tests__/playwright/`).

---

## Example panel (copy-paste starter template)

This is the minimum panel that satisfies every rule. Save as `packages/web/src/ui/panels/MyPanel.tsx`, then customize the body.

```tsx
import type { CSSProperties } from 'react';
import { useGame } from '../../providers/GameProvider';
import { PanelShell } from './PanelShell';

interface MyPanelProps {
  readonly onClose: () => void;
}

const sectionHeaderStyle: CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--panel-muted-color)',
  marginBottom: 'var(--panel-padding-sm)',
  marginTop: 'var(--panel-padding-md)',
};

const emptyStateStyle: CSSProperties = {
  padding: 'var(--panel-padding-lg)',
  textAlign: 'center',
  color: 'var(--panel-muted-color)',
  fontSize: '13px',
  fontStyle: 'italic',
  border: '1px dashed var(--panel-border)',
  borderRadius: 'var(--panel-radius)',
};

export function MyPanel({ onClose }: MyPanelProps) {
  const { state } = useGame();
  const player = state.players.get(state.currentPlayerId);

  if (!player) {
    return (
      <PanelShell id="myPanel" title="My Panel" onClose={onClose} priority="overlay" width="wide">
        <div style={emptyStateStyle}>No active player.</div>
      </PanelShell>
    );
  }

  return (
    <PanelShell id="myPanel" title="My Panel" onClose={onClose} priority="overlay" width="wide">
      <h3 style={sectionHeaderStyle}>Overview</h3>
      <p style={{ color: 'var(--panel-text-color)', fontSize: '14px', lineHeight: 1.5 }}>
        {player.name} — Turn {state.turn}
      </p>

      <h3 style={sectionHeaderStyle}>Details</h3>
      <p style={{ color: 'var(--panel-text-color)', fontSize: '13px' }}>
        Replace this with your actual panel body.
      </p>
    </PanelShell>
  );
}
```

### Why this template

- **`PanelShell` wrapper** — chrome, close button, backdrop (if modal), z-index, `role="dialog"`, test ids all come from the shell. You write zero of it.
- **`onClose` prop only** — no local visibility state, no callbacks for sub-panels. The parent (App.tsx via `PanelManager`) decides when to render.
- **Token-driven styles** — `var(--panel-text-color)`, `var(--panel-muted-color)`, `var(--panel-border)`, `var(--panel-padding-*)`. No raw hex, no Tailwind color utilities for chrome.
- **Style objects extracted** — matches the `ReligionPanel` / `GovernmentPanel` reference style (the audit's "cleanest panel we have"). Easier to refactor; clearer at the call site.
- **`useGame` for state, never `useState` for visibility** — visibility is a panel-system concern, not a per-panel concern.

---

## Common pitfalls

1. **Forgetting the registry entry.** The `PanelId` union is the source of truth. Without it, `openPanel('myPanel')` does not compile and `<PanelShell id="myPanel" ...>` has no metadata to source title/icon from for menus.
2. **Local `useState<boolean>` for visibility.** This was the entire reason the audit was written. Use `usePanelManager`. If you find yourself wanting "this panel can also be opened from inside another panel", call `openPanel('myPanel')` from there — do not invent a second state source.
3. **Hand-rolled close button.** Three different glyphs (`X`, `✕`, `×`) exist in the legacy panels. `PanelShell` standardises on `×` (U+00D7) with `aria-label={`Close ${title}`}`. Do not add your own.
4. **Raw hex colors.** Especially in lookup tables like `STATUS_COLORS = { war: '#dc2626' }`. Add the value to `panel-tokens.css` (or the global tokens in `index.css` if it is a game-data color, not a chrome color), then reference the variable.
5. **Adding a document-level keydown handler.** The `PanelManagerProvider` already owns ESC in capture phase. A second handler will fight it.
6. **Adding a click-outside listener for an `overlay` panel.** This races with the TopBar trigger that opens the panel — the same click bubbles to your listener and immediately closes what you just opened. Click-outside is intentionally backdrop-only and modal-only.
7. **Setting `position: fixed`, `inset: 0`, or `zIndex: 50` on the panel.** The shell handles all positioning and z-index. Setting them on the body container produces conflicts; the audit found seven components co-claiming `z-50`.
8. **Skipping the HelpPanel update.** Your shortcut works but no one knows about it. Add it.
9. **Re-testing chrome in your smoke test.** Close button, backdrop, ESC, z-index → tested once in `PanelShell.test.tsx`. Your test verifies your body.

---

## Verification checklist

Copy this into your PR description or commit message body.

- [ ] `PanelId` added to `panelRegistry.ts` union and `PANEL_REGISTRY` map (with title, optional icon, optional keyboardShortcut, priority)
- [ ] Component wraps body in `<PanelShell>` with matching `id` and `title`
- [ ] No local `useState` for visibility; component receives `onClose` prop only
- [ ] Panel chrome styles use `var(--panel-*)` tokens — no raw hex, no Tailwind color utilities for chrome
- [ ] App.tsx renders the panel conditionally inside the `<Suspense>` block, with `lazy()` import
- [ ] TopBar (or other) trigger has `data-panel-trigger="<id>"` attribute and calls `togglePanel('<id>')`
- [ ] Keyboard shortcut (if any) wired in App.tsx and added to HelpPanel controls list
- [ ] Smoke test in `packages/web/src/ui/panels/__tests__/<PanelName>.test.tsx` passes
- [ ] `npm run build` passes
- [ ] Manual or Playwright E2E confirms the panel opens, closes via X, closes via ESC, (modal only) closes via backdrop click

---

## References

- Rules: `.claude/rules/panels.md`
- Audit (15 inconsistencies that motivated the pattern): `.claude/workflow/design/panel-manager-audit.md`
- Implementation:
  - `packages/web/src/ui/panels/PanelShell.tsx`
  - `packages/web/src/ui/panels/PanelManager.tsx`
  - `packages/web/src/ui/panels/panelRegistry.ts`
  - `packages/web/src/styles/panel-tokens.css`
- Reference panels (good examples): `ReligionPanel.tsx`, `GovernmentPanel.tsx`, `CommanderPanel.tsx` (token-driven, extracted style objects).
