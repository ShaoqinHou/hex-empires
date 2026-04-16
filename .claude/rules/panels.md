---
purpose: PanelManager + PanelShell protocol (authoritative spec). Panel visibility, ESC handling, chrome styling, triggers, testing.
---

# Panel Rules

## The Rule

Every UI panel in `packages/web/src/ui/panels/` is managed by a single React context (`PanelManager`), wrapped in a single shared chrome component (`PanelShell`), styled exclusively from the tokens in `packages/web/src/styles/panel-tokens.css`, and registered in `packages/web/src/ui/panels/panelRegistry.ts` before it can be opened. Backdrop, ESC, and close-button behavior belong to the shell and the provider — individual panels never re-implement them.

The historical `useState<Panel>` in `GameUI` (`packages/web/src/App.tsx:39`) is the legacy pattern and is being phased out. New panels must use `PanelManager` from day one.

These rules exist because the panel-manager audit (`.claude/workflow/design/panel-manager-audit.md`, M31) catalogued 15 concrete inconsistencies — three close-glyph variants, three competing layout strategies, two independent panel-state sources, raw-hex color maps in three files, and ESC handlers that silently dismissed the wrong overlay. M33 added the central pattern. Following it keeps that drift from re-accumulating.

---

## PanelManager Context

**Location:** `packages/web/src/ui/panels/PanelManager.tsx`

A single React context owns `activePanel`. Provider mounted once near the top of the React tree by the existing `GameUI` (or its eventual replacement). Single-slot model: at most one panel open at a time. Opening a new panel implicitly closes the current one.

### API

```typescript
interface PanelManagerValue {
  readonly activePanel: PanelId | null;
  readonly openPanel:   (id: PanelId) => void;
  readonly closePanel:  () => void;
  readonly togglePanel: (id: PanelId) => void;   // open if closed, close if same id open
  readonly isOpen:      (id: PanelId) => boolean;
}

const { activePanel, openPanel, closePanel, togglePanel, isOpen } = usePanelManager();
```

`usePanelManager` throws if called outside `PanelManagerProvider` — same pattern as `useGame`. This catches mis-wirings at test time rather than producing silent no-ops.

### ESC

ESC handling lives inside `PanelManagerProvider`, registered on `window` in **capture phase**. It:

- Ignores the keypress when no panel is open.
- Ignores the keypress when focus is in `INPUT`, `TEXTAREA`, or `SELECT` (so text inputs still work normally).
- Calls `setActivePanel(null)` and `e.stopPropagation()` so downstream bubble-phase handlers (notably `GameCanvas`'s ESC-deselect at `packages/web/src/canvas/GameCanvas.tsx`) do not also fire.

Do not add a per-panel ESC handler. There is exactly one ESC handler in the entire web package, and it lives here.

### What the provider does NOT do

The provider holds state and exposes the API. It does **not** render any panel components — that is App.tsx's job (or, in time, a `PanelHost` component). This separation keeps the provider testable in isolation and avoids forcing every panel to be imported by the provider module.

---

## PanelShell Component

**Location:** `packages/web/src/ui/panels/PanelShell.tsx`

The shared chrome wrapper. Every panel renders `<PanelShell>...</PanelShell>` and puts only its body content as children.

### Props

```typescript
interface PanelShellProps {
  readonly id: PanelId;                 // for data-testid + data-panel-id
  readonly title: string;               // shown in title bar
  readonly onClose: () => void;         // wire to closePanel from PanelManager
  readonly priority?: PanelPriority;    // default 'overlay'
  readonly width?: 'narrow' | 'wide' | 'full';   // default 'wide' (320 / 480 / 720 px)
  readonly children: ReactNode;
}
```

### Priority semantics

| Priority | When to use | Behavior |
|----------|-------------|----------|
| `modal` | The player must resolve before continuing — age transition, crisis, victory, turn summary. | Centered, has a backdrop, backdrop click closes via `onClose`. Highest z-index (`var(--panel-z-modal)`, 210). |
| `overlay` | Floats over the map but does not block — city detail, tech tree, civics tree, diplomacy, governors, religion, government, commanders, help. **The default for most panels.** | Right-anchored column between TopBar and BottomBar. No backdrop. z-index `var(--panel-z-overlay)` (110). |
| `info` | Non-blocking side panel — event log. | Same right-anchored column as overlay, but at lower z-index `var(--panel-z-info)` (90), below TopBar dropdowns. |

The shell picks layout, backdrop, and z-index from the priority. Panels never set their own `position`, `zIndex`, or backdrop.

### What the shell handles for you

- Title bar with the panel's title.
- Close button (`×`, U+00D7), with `aria-label={`Close ${title}`}` and `data-testid={`panel-close-${id}`}`.
- Backdrop (modal only), with `data-testid={`panel-backdrop-${id}`}` and `aria-hidden="true"`.
- `role="dialog"` and `aria-label={title}` on the container.
- Z-index per priority, sourced from `--panel-z-*` tokens.
- Context-menu suppression on the chrome surface (so right-click on UI feels like a desktop app; canvas right-click for gameplay is unaffected).
- `data-panel-id` and `data-panel-priority` and `data-panel-width` attributes on the container, used by Playwright specs.

### What the shell does NOT do

- Hold any state. `onClose` is a pure callback.
- Decide *whether* to mount. The caller (App.tsx today, eventually `PanelHost`) does the conditional rendering: `activePanel === '<id>' && <Panel onClose={closePanel} />`.
- Style the body. Children render whatever they want inside the shell's body slot.
- Add document-level click-outside-to-close listeners for `overlay` / `info`. Doing so races with the TopBar trigger that opened the panel; click-outside is intentionally backdrop-only and modal-only.

### Example usage

```tsx
import { PanelShell } from './PanelShell';

interface MyPanelProps {
  readonly onClose: () => void;
}

export function MyPanel({ onClose }: MyPanelProps) {
  return (
    <PanelShell id="myPanel" title="My Panel" onClose={onClose} priority="overlay" width="wide">
      <p style={{ color: 'var(--panel-text-color)' }}>Body content goes here.</p>
    </PanelShell>
  );
}
```

---

## panelRegistry

**Location:** `packages/web/src/ui/panels/panelRegistry.ts`

Single source of truth for every panel id and its metadata. Pure data — no React, no DOM imports. New panels must be added here before any other code change.

### Type

```typescript
export type PanelId =
  | 'help' | 'city' | 'tech' | 'civics' | 'diplomacy'
  | 'log'  | 'age'  | 'turnSummary' | 'governors'
  | 'religion' | 'government' | 'commanders' | 'victoryProgress';

export type PanelPriority = 'modal' | 'overlay' | 'info';

export interface PanelRegistryEntry {
  readonly id: PanelId;
  readonly title: string;                 // displayed in PanelShell title bar
  readonly icon?: string;                 // emoji shorthand for menus
  readonly keyboardShortcut?: string;     // single character, case-insensitive
  readonly priority: PanelPriority;
}

export const PANEL_REGISTRY: ReadonlyMap<PanelId, PanelRegistryEntry>;
export const ALL_PANEL_IDS: ReadonlyArray<PanelId>;
```

### Adding an entry

```typescript
['myPanel', { id: 'myPanel', title: 'My Panel', icon: '🛠️', keyboardShortcut: 'M', priority: 'overlay' }],
```

If you skip the registry entry the `PanelId` type rejects your `openPanel('myPanel')` call at compile time. That is intentional — the registry is the contract.

---

## Styling

The shell already uses `var(--panel-*)` tokens. For body content the rule is:

- **Chrome-adjacent surfaces** (section headers, dividers, empty-state cards, the panel's own scrollable container) → use tokens from `packages/web/src/styles/panel-tokens.css` (`--panel-bg`, `--panel-border`, `--panel-text-color`, `--panel-muted-color`, `--panel-padding-md`, `--panel-padding-lg`, `--panel-accent-gold`, `--panel-radius`).
- **Game-data display** (yield numbers, faction icons, tech-tree nodes) → may use the existing global tokens in `packages/web/src/index.css` (`--color-gold`, `--color-surface`, etc.) or Tailwind utilities for layout. Color values that semantically belong to the panel design system go in `panel-tokens.css`.
- **Never raw hex.** Not in inline styles, not in className utilities like `bg-amber-500/30`, not in lookup tables (`STATUS_COLORS = { war: '#dc2626' }`). The audit logged six panels violating this; do not regress.

If you find yourself reaching for a color that is not in either token set, add it to `panel-tokens.css` first, then use the variable.

```tsx
// GOOD
<div style={{
  backgroundColor: 'var(--panel-bg)',
  borderBottom: '1px solid var(--panel-border)',
  padding: 'var(--panel-padding-md) var(--panel-padding-lg)',
  color: 'var(--panel-muted-color)',
}}>...</div>

// BAD
<div style={{ backgroundColor: '#161b22', borderBottom: '1px solid #30363d', color: '#8b949e' }}>...</div>
<div className="bg-slate-900 border-amber-500/30">...</div>
```

---

## Triggers

There are exactly four ways a panel becomes the active panel. Use one of them.

1. **TopBar button.** The button gets `data-panel-trigger="<id>"` and calls `togglePanel('<id>')` from `usePanelManager`. The data attribute lets future click-outside-to-close logic recognise the trigger and avoid the open/close race the audit documented.
   ```tsx
   <button data-panel-trigger="city" onClick={() => togglePanel('city')}>City</button>
   ```
2. **Keyboard shortcut.** Wired in `App.tsx`'s keydown handler. Source the key from `PANEL_REGISTRY.get(id)?.keyboardShortcut`; do not hard-code letters in the handler.
3. **Canvas event.** Clicking a city on the map opens `CityPanel`. The canvas calls `openPanel('city')` (in time — currently `setActivePanel('city')` in App.tsx); after migration it goes through the manager.
4. **Engine-driven auto-open.** `AgeTransitionPanel` and `CrisisPanel` open when state predicates fire (e.g. `state.age.transitionPending`). The conditional render still goes through `activePanel`/`isOpen` — engine-driven opens just call `openPanel(id)` from a `useEffect` in App.tsx that watches the predicate.

Do **not** props-drill `onOpenCity`, `onOpenTechTree`, etc. through layout components. Any component that needs to open a panel calls `usePanelManager()` directly.

---

## When to Create vs. Extend

### Create a new panel when

- The content is a new top-level UI surface (a new game system gets its own dashboard).
- It has its own keyboard shortcut.
- It needs a distinct lifecycle (modal vs overlay) from anything that exists.

Steps: register in `panelRegistry.ts`, create `<MyPanel>.tsx` wrapping `<PanelShell>`, add the activation branch to App.tsx's `<Suspense>` block, wire a TopBar trigger and (optionally) a keyboard shortcut, update HelpPanel's controls list. The `.claude/skills/add-panel/` skill walks through this with a copy-paste template.

### Extend an existing panel when

- You are adding a tab, a section, or a new piece of data inside an existing surface.
- The new content semantically belongs with what is already there (e.g. a new diplomacy tab inside `DiplomacyPanel`).

Just edit the body. The chrome lives in `PanelShell` and does not need to change.

---

## Anti-Patterns

| Anti-pattern | Why it's wrong | Do this instead |
|--------------|----------------|-----------------|
| `const [open, setOpen] = useState(false)` for panel visibility | Two sources of truth for "what panel is open"; ESC won't close it; opening another panel won't auto-close it. The `VictoryProgressPanel` / `TopBar` pair the audit caught was exactly this. | `usePanelManager()` — the central context owns visibility. |
| Raw hex colors in panel chrome (`'#161b22'`, `bg-slate-900`) | Drifts from the dark-slate aesthetic, breaks future theming, violates `tech-conventions.md`. | `var(--panel-*)` tokens; add new ones to `panel-tokens.css` if needed. |
| Hand-rolled close button (`<button onClick={onClose}>X</button>`) | Three close glyphs in the codebase (`X`, `✕`, `×`); inconsistent aria-labels; missing test ids. | Use `PanelShell`. It owns the `×`, the `aria-label`, and `data-testid={`panel-close-${id}`}`. |
| Local `useEffect(() => addEventListener('keydown', escClose))` per panel | Two ESC handlers fire; race with the canvas deselect handler; capture/bubble ordering matters. | `PanelManagerProvider` already owns ESC in capture phase. |
| Props-drilled `onOpenTechTree`, `onOpenCity`, `onOpenDiplomacy` callbacks through `TopBar`, `BottomBar`, `Notifications`, `GameCanvas` | The audit counted four call sites all bypassing a single primitive. Adding a new trigger touches every layer. | Each component calls `usePanelManager()` directly. |
| Inline `position: fixed; zIndex: 50; inset: 0` on the panel | Z-index conflicts: the audit found seven components co-claiming `z-50`. | Pick a `priority` and let `PanelShell` set z-index from `--panel-z-*`. |
| Panel that forgets to register in `panelRegistry` | TypeScript prevents `openPanel('myPanel')` from compiling, but inline string comparisons (`activePanel === 'myPanel'`) silently work — until the next contributor wonders where the entry is. | Register first, then write the component. |

---

## Testing

### Body tests (per panel)

Smoke tests for a panel's own behavior live next to the panel:

```
packages/web/src/ui/panels/__tests__/<PanelName>.test.tsx
```

Wrap in a `PanelManagerProvider` — the panel will render in isolation but you can still verify open/close interactions if it consumes the hook:

```tsx
import { render, screen } from '@testing-library/react';
import { PanelManagerProvider } from '../PanelManager';
import { MyPanel } from '../MyPanel';

it('renders the panel title', () => {
  render(
    <PanelManagerProvider initialPanel="myPanel">
      <MyPanel onClose={() => {}} />
    </PanelManagerProvider>
  );
  expect(screen.getByRole('dialog', { name: 'My Panel' })).toBeInTheDocument();
});
```

`PanelManagerProvider` accepts an `initialPanel` prop specifically for tests.

### Shell tests (once)

`PanelShell` chrome behavior — close button click, backdrop click for modal, ESC dismissal, z-index per priority — is tested in `packages/web/src/ui/panels/__tests__/PanelShell.test.tsx`. **Do not re-test chrome behavior in every panel's body test.** That couples test files to internals and triples maintenance cost.

### E2E

Playwright specs in `packages/web/src/__tests__/playwright/` use `[data-panel-id="<id>"]` and `[data-testid="panel-close-<id>"]` selectors. Both are guaranteed by `PanelShell` for any panel that wraps it.

---

## References

- **Skill (step-by-step):** `.claude/skills/add-panel/SKILL.md` — invoke as `/add-panel` to add a new panel from scratch.
- **Original audit:** `.claude/workflow/design/panel-manager-audit.md` — the 15 inconsistencies that motivated this pattern.
- **Implementation:**
  - `packages/web/src/ui/panels/PanelShell.tsx` — chrome
  - `packages/web/src/ui/panels/PanelManager.tsx` — context + ESC
  - `packages/web/src/ui/panels/panelRegistry.ts` — id union + metadata
  - `packages/web/src/styles/panel-tokens.css` — design tokens
- **Related rules:**
  - `.claude/rules/architecture.md` — engine/renderer separation
  - `.claude/rules/tech-conventions.md` — "never hardcode colors"
  - `.claude/rules/import-boundaries.md` — `canvas/` and `ui/` cannot cross-import
