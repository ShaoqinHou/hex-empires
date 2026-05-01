# Panel Management Audit + Central-Manager Design

**Status:** Design / audit only — no code changes in this cycle.
**Target worktree:** `.codex/worktrees/agent-aed22427`
**Audit scope:** `packages/web/src/ui/panels/` (16 files) + four panel-adjacent
overlays in `packages/web/src/ui/components/`.
**Central-state-of-the-world:** `packages/web/src/App.tsx` → `GameUI`
component, lines 31–67 (the `Panel` union, `activePanel` state,
`togglePanel`, the ESC/`H` `keydown` handler).

This document is the design predicate for a staged migration — no single
PR refactors everything. The existing `useState<Panel>` pattern stays in
place until every panel has been ported to the new shell, and even then
only the final cycle removes the local state.

---

## 1. Inventory

### 1.1 Panels (`packages/web/src/ui/panels/`)

| Panel | File (lines) | Opened via | Closed via | Style | ESC dismisses? | Wired in App.tsx? |
|---|---|---|---|---|---|---|
| CityPanel | CityPanel.tsx (486) | `onCityClick` → `setActivePanel('city')` (App.tsx:113–116); also `Notifications` click (App.tsx:155–158) | `onClose` prop (`() => setActivePanel('none')`, App.tsx:121) | Mixed — `var(--color-*)` tokens + some Tailwind utility classes | Yes — via GameUI ESC (App.tsx:59) | Yes (lazy, App.tsx:21, 120) |
| TechTreePanel | TechTreePanel.tsx (484) | `togglePanel('tech')` from TopBar + GameCanvas `onToggleTechTree` (App.tsx:101, 117) | `onClose` prop → `setActivePanel('none')` | Tokens + `rgba(12,16,36,0.97)` inline (TechTreePanel.tsx:44) | Yes — via GameUI ESC | Yes (lazy, App.tsx:22, 123) |
| CivicTreePanel | CivicTreePanel.tsx (490) | `togglePanel('civics')` from TopBar (App.tsx:100) | `onClose` prop | Tokens + `rgba(18,10,28,0.97)` + raw `#cc5de8` (CivicTreePanel.tsx:12, 47) | Yes — via GameUI ESC | Yes (lazy, App.tsx:23, 126) |
| DiplomacyPanel | DiplomacyPanel.tsx (285) | `togglePanel('diplomacy')` from TopBar (App.tsx:101) | `onClose` prop; close button glyph is `X` (DiplomacyPanel.tsx:43) | Tokens + raw hex map for relation status (`#4ade80`, `#60a5fa`, `#9ca3af`, `#fb923c`, `#ef4444`, `#dc2626` — DiplomacyPanel.tsx:22–29) | Yes — via GameUI ESC | Yes (lazy, App.tsx:24, 129) |
| EventLogPanel | EventLogPanel.tsx (165) | `togglePanel('log')` from TopBar (App.tsx:102) | `onClose` prop; close button `X` (EventLogPanel.tsx:103) | Tokens + raw hex `#a855f7`, `#eab308` (EventLogPanel.tsx:40, 44) | Yes — via GameUI ESC | Yes (lazy, App.tsx:25, 132) |
| AgeTransitionPanel | AgeTransitionPanel.tsx (198) | `togglePanel('age')` from TopBar (App.tsx:103) | `onClose` prop; close button `✕` (AgeTransitionPanel.tsx:38) | Mixed — `rgba(15,23,42,0.98)` inline AND Tailwind `bg-amber-900/*`, `border-amber-500/40` (AgeTransitionPanel.tsx:25–26, 44) | Yes — via GameUI ESC | Yes (lazy, App.tsx:26, 135) |
| TurnSummaryPanel | TurnSummaryPanel.tsx (191) | `togglePanel('turnSummary')` from TopBar (App.tsx:104) | `onClose` prop + backdrop click (TurnSummaryPanel.tsx:30, 42) | Tokens; uses `fixed inset-0 ... z-50` (TurnSummaryPanel.tsx:28) | Yes — via GameUI ESC (also backdrop click) | Yes (lazy, App.tsx:27, 138) |
| GovernorPanel | GovernorPanel.tsx (220) | `togglePanel('governors')` from TopBar (App.tsx:105) | `onClose` prop; close button `X` (GovernorPanel.tsx:47) | Tokens + raw hex map for specialization (`#fbbf24`, `#ef4444`, `#3b82f6`, `#a855f7`, `#f59e0b`, `#10b981` — GovernorPanel.tsx:17–24) | Yes — via GameUI ESC | Yes (lazy, App.tsx:28, 141) |
| HelpPanel | HelpPanel.tsx (144) | `togglePanel('help')` from TopBar + `H` key (App.tsx:56–58, 106); auto-opens on first run via `localStorage.getItem('helpShown')` (App.tsx:36–42) | `onClose` prop (`✕` button) + backdrop click (HelpPanel.tsx:60, 81) | Tokens + `rgba(0,0,0,0.7)` backdrop + inline `zIndex: 200` (HelpPanel.tsx:59) | Yes — via GameUI ESC | Yes (lazy, App.tsx:29, 144) |
| VictoryPanel | VictoryPanel.tsx (72) | **Auto-mount** when `state.victory.winner` is set (VictoryPanel.tsx:8) | Internal `dismissed` `useState` (`Continue Playing` button) OR `window.location.reload()` (`New Game`) | Tokens + `rgba(0,0,0,0.8)` backdrop + Tailwind `z-50` (VictoryPanel.tsx:13) | **No** — not wired into GameUI ESC handler | Yes — always-mounted (App.tsx:151) |
| VictoryProgressPanel | VictoryProgressPanel.tsx (140) | `setShowVictoryProgress(true)` local to TopBar (TopBar.tsx:177) | `onClose` prop (TopBar-local state) | Tailwind-only — `bg-gradient-to-br from-slate-800 to-slate-900`, `border-amber-500/30`, `bg-black/60`, `z-50` (VictoryProgressPanel.tsx:31–32) | **No** — managed entirely outside GameUI | **No** — rendered by TopBar, not `activePanel` |
| CrisisPanel | CrisisPanel.tsx (74) | **Auto-mount** when `state.crises.find(c => c.active)` returns non-undefined (CrisisPanel.tsx:8) | Side-effect of user picking a choice (`RESOLVE_CRISIS` action) — no explicit close button | Tokens + `rgba(0,0,0,0.8)` backdrop + Tailwind `z-50` (CrisisPanel.tsx:17) | **No** — cannot be dismissed; blocks until resolved | Yes — always-mounted (App.tsx:150) |
| ReligionPanel | ReligionPanel.tsx (279) | — (no trigger exists) | `onClose` prop declared but unreachable | Tokens via `PANEL_STYLE`/`HEADER_STYLE` objects (ReligionPanel.tsx:68–77) — the cleanest panel we have | n/a | **No** (intentional, see file header) |
| GovernmentPanel | GovernmentPanel.tsx (365) | — (no trigger exists) | `onClose` prop declared but unreachable | Same token-driven style object pattern as ReligionPanel | n/a | **No** (intentional, see file header) |
| CommanderPanel | CommanderPanel.tsx (284) | — (no trigger exists) | `onClose` prop declared but unreachable | Same token-driven style object pattern | n/a | **No** (intentional, see file header) |
| SetupScreen | SetupScreen.tsx (376) | Rendered by `AppInner` when `state === null` (App.tsx:185–187) | Start/Load action → `state` becomes non-null → SetupScreen unmounts; no `onClose` at all | Tailwind + tokens mix | No — ESC isn't meaningful (no game to return to) | Yes — sibling of GameUI, not routed via `activePanel` |

### 1.2 Panel-adjacent overlays (`packages/web/src/ui/components/`)

| Overlay | File (lines) | Opened via | Closed via | Style | ESC? | Wired |
|---|---|---|---|---|---|---|
| Notifications | Notifications.tsx (207) | Auto-mount — listens to `state.log` | Auto-dismiss timers inside component | Token-based | No | Always-mounted (App.tsx:155) |
| TurnTransition | TurnTransition.tsx (140) | Auto-mount — fires on `state.turn` change | 600 ms `setTimeout` + click-to-dismiss | Mixed (uses `z-50`, TurnTransition.tsx:49) | No | Always-mounted (App.tsx:154) |
| ValidationFeedback | ValidationFeedback.tsx (110) | `lastValidation` non-null | 3 s `setTimeout` → `onAnimationEnd` | Tailwind gradient map + `z-50`/`z-40` (ValidationFeedback.tsx:58, 79) | No | Always-mounted (App.tsx:160) |
| CombatPreviewPanel | CombatPreviewPanel.tsx (222) | Derived from `selectedUnit` + `hoveredHex` (App.tsx:70–94) | Unmounts when condition false | Tokens + inline `zIndex: 1000` (CombatPreviewPanel.tsx:80) | No | Conditional (App.tsx:163) |

---

## 2. Current pattern analysis

### 2.1 Where state lives

`packages/web/src/App.tsx:31–67`:

```tsx
type Panel = 'none' | 'city' | 'tech' | 'civics' | 'diplomacy'
           | 'log' | 'age' | 'turnSummary' | 'governors' | 'help';

const [activePanel, setActivePanel] = useState<Panel>(() => {
  if (!localStorage.getItem('helpShown')) {
    localStorage.setItem('helpShown', '1');
    return 'help';
  }
  return 'none';
});
const togglePanel = (panel: Panel) =>
  setActivePanel(prev => prev === panel ? 'none' : panel);
```

The union is hand-maintained. The 10 values cover 9 panels plus `'none'`.
There are three panels the engine knows how to render (Religion,
Government, Commander) that are **not** in the union and therefore
unreachable by any code path.

`VictoryProgressPanel` is managed by a *separate* `useState` inside
`TopBar.tsx` (see `setShowVictoryProgress` on TopBar.tsx:177) — a second
source of truth that sits outside `activePanel`.

### 2.2 Always-mounted vs conditional

* **Conditional (gated by `activePanel === X && <Panel />`):** Help,
  City, Tech, Civics, Diplomacy, Log, Age, TurnSummary, Governors.
  All are `React.lazy` imports (App.tsx:21–29) so their JS loads only
  when opened.
* **Always-mounted:** VictoryPanel, CrisisPanel, Notifications,
  TurnTransition, EnemyActivitySummary, ValidationFeedback. These
  render `null` until their condition triggers, then appear on top.
* **TopBar-owned:** VictoryProgressPanel (rendered inside TopBar with
  its own local boolean).

The reason for the split is partially rational: Crisis and Victory must
*interrupt* whatever panel is open — the player can't dismiss them
just by pressing ESC. Notifications/TurnTransition are transient toasts,
not panels. But the design currently has no concept of *priority*, so
"modal" (Crisis, Victory) and "info toast" (Notifications) are both
implemented as always-mounted components that each invented their own
z-index and backdrop.

### 2.3 Style divergence — three representative snippets

All three of these panels are "right-anchored column" panels with a
surface background and a close button. They should look identical but
don't.

**EventLogPanel — clean token pattern + the occasional raw hex:**
```tsx
// EventLogPanel.tsx:40, 44
diplomacy: '#a855f7',   // purple   ← raw hex
crisis:    '#eab308',   // yellow   ← raw hex
// …then tokens for everything else
```

**DiplomacyPanel — no token-based status colors at all:**
```tsx
// DiplomacyPanel.tsx:22–29
const STATUS_COLORS: Record<DiplomaticStatus, string> = {
  helpful: '#4ade80', friendly: '#60a5fa', neutral: '#9ca3af',
  unfriendly: '#fb923c', hostile: '#ef4444', war: '#dc2626',
};
```

**VictoryProgressPanel — Tailwind-only, zero tokens:**
```tsx
// VictoryProgressPanel.tsx:31–32
<div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
  <div className="bg-gradient-to-br from-slate-800 to-slate-900
                  border border-amber-500/30 rounded-xl p-6 ...">
```

Tech conventions (`.codex/rules/tech-conventions.md`) say "Tailwind
v4 / CSS custom property tokens for all colors. Never hardcode colors —
use token references." VictoryProgressPanel and the raw-hex maps in
Diplomacy/Governor/EventLog violate that rule.

In contrast, the un-wired `ReligionPanel` / `GovernmentPanel` /
`CommanderPanel` use the *right* pattern — extracted style objects:

```tsx
// ReligionPanel.tsx:66–77
const PANEL_CLASSES = 'absolute right-0 top-12 bottom-14 w-80 flex flex-col';
const PANEL_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--color-surface)',
  borderLeft: '1px solid var(--color-border)',
};
const HEADER_CLASSES = 'flex items-center justify-between px-4 py-3 shrink-0';
const HEADER_STYLE: React.CSSProperties = { /* … */ };
```

These three panels are the reference implementation for the shell
pattern we want everywhere.

### 2.4 Close-button shape

| Mechanism | Panels |
|---|---|
| `onClose` prop wired to `setActivePanel('none')` | City, Tech, Civics, Diplomacy, Log, Age, TurnSummary, Governors, Help |
| `onClose` prop declared but never reached | Religion, Government, Commander |
| Internal `useState<boolean>` dismiss | VictoryPanel (`dismissed`) |
| No close at all — only resolves by user input that fires an action | CrisisPanel |
| TopBar-local `useState` | VictoryProgressPanel |
| Auto-dismiss timer | Notifications, TurnTransition, ValidationFeedback |

**Close-glyph divergence:** `DiplomacyPanel`, `EventLogPanel`,
`GovernorPanel` all use `X` (a bare capital X, DiplomacyPanel.tsx:45,
EventLogPanel.tsx:103, GovernorPanel.tsx:49). `AgeTransitionPanel`,
`TurnSummaryPanel`, `HelpPanel` use `✕` (U+2715). Trivial but visible.

### 2.5 ESC handling

Three disjoint cases:

1. **Conditional panels (`activePanel`-controlled):** ESC handled in
   `GameUI`'s `keydown` listener (App.tsx:52–67). Uses capture-phase
   (`addEventListener(…, true)`) and calls `stopPropagation()` so the
   canvas's bubble-phase ESC handler in `GameCanvas.tsx:452` doesn't
   also deselect the unit.
2. **Always-mounted overlays (VictoryPanel, CrisisPanel):** no ESC.
   Victory can only be dismissed by its own `Continue Playing` button;
   Crisis cannot be dismissed at all.
3. **SetupScreen:** no ESC — no meaningful "close".
4. **TopBar-owned VictoryProgressPanel:** no ESC handler anywhere. The
   only close path is its `onClose` button.

So a player who presses ESC while Crisis or Victory is showing gets no
feedback from either overlay; if `activePanel !== 'none'` happens to
also be true (unlikely in practice, since Crisis blocks input), ESC
will silently close the *background* panel. This is a latent bug.

### 2.6 Z-index table

| Value | Location | Component |
|---|---|---|
| `zIndex: 20` (inline) | YieldsToggle.tsx:8 | YieldsToggle |
| `z-40` (Tailwind) | Notifications.tsx:107, EnemyActivitySummary.tsx:48, ValidationFeedback.tsx:79 | Notifications / EnemyActivity / ValidationFeedback shake |
| `z-50` (Tailwind) | VictoryPanel.tsx:13, CrisisPanel.tsx:17, TurnSummaryPanel.tsx:28, VictoryProgressPanel.tsx:31, TurnTransition.tsx:49, ValidationFeedback.tsx:58, TopBar.tsx:111 (dropdowns), ImprovementPanel.tsx:78, BuildingPlacementPanel.tsx:66, Tooltip.tsx:151, ActionButton.tsx:53 | most modals + many tooltips + nav dropdowns |
| `zIndex: 100` (inline) | TopBar.tsx:57, BottomBar.tsx:111 | TopBar / BottomBar |
| `zIndex: 200` (inline) | HelpPanel.tsx:59 | HelpPanel (intentional — above TopBar) |
| `zIndex: 900` (inline) | UrbanPlacementHintBadge.tsx:96 | badge |
| `zIndex: 1000` (inline) | CombatHoverPreview.tsx:49, CombatPreview.tsx:34, CombatPreviewPanel.tsx:80 | combat preview stack |

**Conflicts:** VictoryPanel (`z-50`) + CrisisPanel (`z-50`) can both be
mounted; if so they render in DOM-insertion order (Crisis first in
App.tsx:150, then Victory at :151) — Victory wins on co-equal z-index.
HelpPanel correctly renders above TopBar/BottomBar (`z-200` vs `z-100`)
but no other panel does — TechTreePanel et al. use `absolute inset-x-0
top-12 bottom-14` to carve out around the bars rather than overlaying
them. Two competing patterns.

---

## 3. Concrete inconsistencies

1. **3 built-but-unwired panels.** `ReligionPanel`, `GovernmentPanel`,
   `CommanderPanel` have no entry in the `Panel` union (App.tsx:31), no
   trigger anywhere, and can only be reached by editing App.tsx.
2. **2 independent panel-state sources.** `activePanel` in
   `GameUI` (App.tsx:36) vs `showVictoryProgress` in TopBar
   (TopBar.tsx:177). Opening VictoryProgressPanel does not close any
   other panel.
3. **Close-glyph mismatch:** `X` (bare latin) in
   DiplomacyPanel.tsx:45, EventLogPanel.tsx:103, GovernorPanel.tsx:49
   vs `✕` (U+2715) in AgeTransitionPanel.tsx:38,
   TurnSummaryPanel.tsx:44, HelpPanel.tsx:86.
4. **Mixed close-button chrome.** DiplomacyPanel uses
   `className="text-sm px-2 py-1"` — no border, no aria-label. HelpPanel
   (HelpPanel.tsx:81–87) uses a bordered button *with* `aria-label`. No
   other panel has an aria-label on its close control.
5. **Raw-hex color maps bypass tokens.** DiplomacyPanel.tsx:22–29 and
   GovernorPanel.tsx:17–24 each define a private hex-color palette;
   EventLogPanel.tsx:40, 44 falls back to raw hex for `diplomacy` and
   `crisis`. These should be CSS-variable tokens.
6. **VictoryProgressPanel is 100 % Tailwind slate/amber**
   (VictoryProgressPanel.tsx:31–32, continuing through the file), no
   `var(--color-*)` at all — direct violation of
   `tech-conventions.md` "never hardcode colors".
7. **Two different backdrop strategies.** Some panels have a
   semi-opaque backdrop (`rgba(0,0,0,0.7)` on HelpPanel,
   `rgba(0,0,0,0.8)` on VictoryPanel/CrisisPanel,
   Tailwind `bg-black/60` on VictoryProgressPanel,
   `rgba(0,0,0,0.7)` on TurnSummaryPanel); others have no backdrop
   (TechTreePanel, CivicTreePanel, AgeTransitionPanel — these fill
   the inter-bar slab instead).
8. **Two different layout strategies:** "right-anchored column"
   (`absolute right-0 top-12 bottom-14 w-80`, used by EventLog,
   Diplomacy, Governor, and the three un-wired panels) vs. "fill
   inter-bar slab" (`absolute inset-x-0 top-12 bottom-14`, used by
   TechTree, CivicTree, AgeTransition) vs. "centered modal"
   (`fixed inset-0 flex items-center justify-center`, used by Help,
   Victory, VictoryProgress, TurnSummary, Crisis). No guidance on when
   to use which.
9. **ESC cannot dismiss any always-mounted overlay.** The `GameUI`
   keydown handler (App.tsx:59) only acts when `activePanel !== 'none'`
   — so VictoryPanel, VictoryProgressPanel, and (by design) CrisisPanel
   all ignore ESC even when they should accept it (Victory/Progress).
10. **`togglePanel` has a foot-gun.** If two buttons both call
    `togglePanel('tech')` in rapid succession, the second closes the
    panel that the first just opened. An explicit `openPanel` /
    `closePanel` API would eliminate the ambiguity.
11. **Panel open is imperative-spread across callers.** `TopBar`,
    `GameCanvas` (`onToggleTechTree`, App.tsx:117), `Notifications`
    (city click → `setActivePanel('city')`, App.tsx:155), and the `H`
    keyboard handler all bypass a single `openPanel` primitive.
12. **Keyboard shortcuts are scattered.** `H` is wired in
    App.tsx:56–58. `T` opens the tech tree but is handled inside
    `GameCanvas.tsx` (not shown above, but the caller
    `onToggleTechTree` in App.tsx:117 is fired from the canvas input
    handler). There's no single place that says "panel X has shortcut
    Y" — adding `G` for Governors would require touching `TopBar`,
    `GameCanvas`, and GameUI.
13. **Lazy-boundary error state.** `Suspense fallback={null}` in
    App.tsx:119. If a chunk fails to load, the panel silently
    vanishes rather than showing an error. Fine for now, but a single
    shell would give us one place to add a proper ErrorBoundary.
14. **Crisis has no close button and no timeout.** CrisisPanel.tsx
    ships with no `✕`, no backdrop click, no ESC. That is intentional
    (you must answer the crisis) but it's enforced by omission, not
    by an explicit `priority: 'blocking'` flag. A future panel that
    accidentally forgets its `onClose` has the same behavior without
    meaning to.
15. **`'helpShown'` localStorage key is hand-inlined.** App.tsx:38–41
    reads/writes the key directly. If we ever want a "reset tutorial"
    button, it has to be taught about that key separately.

---

## 4. Proposed central-manager design

### 4.1 `PanelManager` context

One React context, one provider, one hook. Replaces the `useState<Panel>`
in GameUI and absorbs VictoryProgressPanel's TopBar-local state.

```tsx
// packages/web/src/providers/PanelManager.tsx (new)
type PanelId =
  | 'city' | 'tech' | 'civics' | 'diplomacy' | 'log' | 'age'
  | 'turnSummary' | 'governors' | 'help' | 'religion' | 'government'
  | 'commander' | 'victoryProgress'
  | 'victory' | 'crisis' | 'ageTransitionRequired';

interface PanelManagerAPI {
  readonly activePanel: PanelId | null;
  openPanel: (id: PanelId) => void;       // closes any current
  closePanel: () => void;                 // closes whatever's open
  togglePanel: (id: PanelId) => void;     // convenience wrapper
  isOpen: (id: PanelId) => boolean;
}
```

The manager is priority-aware (see §4.2): modal panels preempt normal
panels. `openPanel('crisis')` while `activePanel === 'tech'` sets
`activePanel === 'crisis'` and remembers `tech` on a shallow stack so
that `closePanel()` restores it after the crisis resolves.

Migration shim: in **Cycle 1** the manager simply wraps the existing
`useState<Panel>` — no priority, no stack, just a more structured API.
We keep the old `Panel` union type-aliased to `PanelId` for one cycle so
nothing breaks.

### 4.2 `<PanelShell>` wrapper

Every panel wraps in one shell. Shell owns: chrome, close button glyph,
backdrop, ESC behavior, mount/unmount animation, z-index selection,
aria-labelling.

```tsx
// packages/web/src/ui/panels/PanelShell.tsx (new)
interface PanelShellProps {
  readonly id: PanelId;
  readonly title: string;
  readonly onClose?: () => void;          // omit → non-dismissable (Crisis)
  readonly priority?: 'info' | 'overlay' | 'modal';  // default 'overlay'
  readonly layout?: 'column' | 'slab' | 'centered';  // default 'column'
  readonly children: React.ReactNode;
}
```

Priority mapping → z-index tokens (defined once in §4.4):

```
'info'    → z-index: var(--z-panel-info)    /* 40  — toast layer */
'overlay' → z-index: var(--z-panel-overlay) /* 50  — standard panel */
'modal'   → z-index: var(--z-panel-modal)   /* 60  — Crisis/Victory */
```

Layout mapping → classes:

```
'column'   → absolute right-0 top-12 bottom-14 w-80
'slab'     → absolute inset-x-0 top-12 bottom-14
'centered' → fixed inset-0 flex items-center justify-center
             (backdrop: rgba(0,0,0,0.7))
```

The shell renders the close `✕` (single glyph) with an `aria-label` of
`title`. If `onClose` is undefined, no button is rendered and ESC is
ignored — that's how Crisis expresses "blocking".

### 4.3 `panelRegistry`

One file, one constant, one source of "what panels exist, what do
they look like in the UI chrome".

```ts
// packages/web/src/ui/panels/panelRegistry.ts (new)
export const PANEL_REGISTRY = {
  city:            { title: 'City',             icon: '🏰', shortcut: null },
  tech:            { title: 'Technology',       icon: '🔬', shortcut: 't' },
  civics:          { title: 'Civics',           icon: '📜', shortcut: null },
  diplomacy:       { title: 'Diplomacy',        icon: '🤝', shortcut: null },
  log:             { title: 'Event Log',        icon: '📖', shortcut: null },
  age:             { title: 'Age Transition',   icon: '⚡', shortcut: null },
  turnSummary:     { title: 'Turn Summary',     icon: '📋', shortcut: null },
  governors:       { title: 'Governors',        icon: '👑', shortcut: null },
  help:            { title: 'Help & Tutorial',  icon: '❓', shortcut: 'h' },
  religion:        { title: 'Religion',         icon: '⛪', shortcut: null },
  government:      { title: 'Government',       icon: '🏛️', shortcut: null },
  commander:       { title: 'Commanders',       icon: '⚔️', shortcut: null },
  victoryProgress: { title: 'Victory Progress', icon: '🏆', shortcut: null },
  victory:         { title: 'Victory!',         icon: '🏆', shortcut: null },
  crisis:          { title: 'Crisis',           icon: '⚠️', shortcut: null },
} as const;
```

TopBar buttons derive their title/icon from this registry — adding a
new panel then only touches the registry + a data file for the new
panel component, not every TopBar button prop.

### 4.4 Style tokens

Consolidate into `packages/web/src/styles/panel-tokens.css` (new):

```css
:root {
  --z-panel-info:    40;
  --z-panel-overlay: 50;
  --z-panel-modal:   60;

  --panel-backdrop:           rgba(0, 0, 0, 0.7);
  --panel-backdrop-modal:     rgba(0, 0, 0, 0.85);

  /* Status / category tokens — deduplicate the raw-hex maps flagged
     in §3 items 5 and 6. */
  --color-diplo-helpful:      #4ade80;
  --color-diplo-friendly:     #60a5fa;
  --color-diplo-neutral:      #9ca3af;
  --color-diplo-unfriendly:   #fb923c;
  --color-diplo-hostile:      #ef4444;
  --color-diplo-war:          #dc2626;

  --color-governor-economic:  #fbbf24;
  --color-governor-military:  #ef4444;
  --color-governor-scientific:#3b82f6;
  --color-governor-cultural:  #a855f7;
  --color-governor-religious: #f59e0b;
  --color-governor-diplomatic:#10b981;
}
```

Eventually these replace every raw-hex site listed in §3.5. That happens
inside each panel's own migration cycle, not in a sweeping rename — the
tokens can exist unused for a cycle without hurting anyone.

### 4.5 Migration shim

Cycle 1 ships `PanelManagerProvider` as a drop-in around the existing
`useState<Panel>`:

```tsx
// Inside GameUI, replace `useState<Panel>` call with:
const { activePanel, openPanel, closePanel, togglePanel } = usePanelManager();
```

Existing callsites keep working because `togglePanel('tech')` maps 1:1.
No panel file is edited. `<PanelShell>` does not exist yet. The only
visible change is a new context provider wrapped around `<GameUI />`.

Then each subsequent cycle migrates exactly one panel (or a small
batch) to use `<PanelShell>`. Panels that haven't migrated still read
their `onClose` prop and keep their inline chrome. No dual-state
hazard — every panel, migrated or not, gets `open/close/toggle` from
the same source.

---

## 5. Migration plan (10 sub-cycles)

Ordered lowest-risk first. `Y → X` in **Depends on** means cycle Y must
ship before cycle X.

| # | Cycle | Goal | Touched files | Depends on |
|---|---|---|---|---|
| 1 | PanelManager context + registry | Introduce `usePanelManager` and `PANEL_REGISTRY`; rewire `GameUI` to consume them. No panel migrates. | `providers/PanelManager.tsx` (new), `ui/panels/panelRegistry.ts` (new), `App.tsx` | — |
| 2 | PanelShell + CSS tokens | Add `<PanelShell>` and `panel-tokens.css`. Tested in isolation (render shell with dummy children, assert close button + ESC + z-index token applied). | `ui/panels/PanelShell.tsx` (new), `styles/panel-tokens.css` (new), `styles/index.css` (import) | 1 |
| 3 | Migrate HelpPanel | Simplest centered panel → first real user of shell. Validates the `centered` layout + backdrop + ESC wiring. | `ui/panels/HelpPanel.tsx` | 2 |
| 4 | Migrate EventLogPanel + TurnSummaryPanel | Simple data lists — validates `column` and `centered` layouts side by side. Drops raw hex for `diplomacy` / `crisis` in EventLog in favor of tokens. | `ui/panels/EventLogPanel.tsx`, `ui/panels/TurnSummaryPanel.tsx` | 3 |
| 5 | Wire + migrate Religion/Government/Commander | Flips three "built but unwired" panels from §3.1 to fully integrated. Extends `PanelId` + `PANEL_REGISTRY` + `TopBar` with three new buttons. Uses the shell from day one. | `ui/panels/ReligionPanel.tsx`, `ui/panels/GovernmentPanel.tsx`, `ui/panels/CommanderPanel.tsx`, `ui/layout/TopBar.tsx`, `ui/panels/panelRegistry.ts`, `providers/PanelManager.tsx` | 2 |
| 6 | Migrate DiplomacyPanel + GovernorPanel | Replace `STATUS_COLORS` + `SPECIALIZATION_COLORS` hex maps with `--color-diplo-*` / `--color-governor-*` tokens. Switch close-glyph to `✕`. | `ui/panels/DiplomacyPanel.tsx`, `ui/panels/GovernorPanel.tsx` | 4 |
| 7 | Migrate TechTreePanel + CivicTreePanel | Bigger. Introduces `layout="slab"` users. Keeps their SVG connector canvas logic untouched. | `ui/panels/TechTreePanel.tsx`, `ui/panels/CivicTreePanel.tsx` | 4 |
| 8 | Migrate CityPanel | Largest (486 lines). Inline `BuildingPlacementPanel` overlay stays as-is; only the outer chrome moves to the shell. | `ui/panels/CityPanel.tsx` | 4 |
| 9 | Migrate always-mounted modals (Victory, Crisis, AgeTransition) | Move these into `PanelManager` as `priority: 'modal'`. Manager auto-preempts any open `overlay` panel when `state.victory.winner` or `state.crises.find(c=>c.active)` becomes truthy. Also folds `VictoryProgressPanel` out of TopBar-local state and into the registry. Keeps Crisis non-dismissable (no `onClose`). | `ui/panels/VictoryPanel.tsx`, `ui/panels/VictoryProgressPanel.tsx`, `ui/panels/CrisisPanel.tsx`, `ui/panels/AgeTransitionPanel.tsx`, `ui/layout/TopBar.tsx`, `providers/PanelManager.tsx`, `App.tsx` | 3, 5 |
| 10 | Retire legacy | Delete the local `keydown` handler from `GameUI` (§2.5 case 1) — PanelShell owns ESC. Delete the hand-maintained `Panel` type alias. Remove every panel's local `onClose` prop in favor of `usePanelManager().closePanel`. | `App.tsx`, every migrated panel file | 3–9 |

Dependency notes:

* Cycle 5 can run in parallel with cycle 4 (they touch disjoint panels).
* Cycle 9 **cannot** run before cycle 3 because Victory/Crisis modals
  need to preempt an open regular panel — and to test that, at least
  one regular panel must already be using the shell.
* Cycle 10 is the only cycle that touches *every* migrated panel — it
  should ship after all previous cycles are merged and exercised by
  the browser E2E in `/verify`.

---

## 6. Non-goals

This refactor explicitly does **not**:

* Redesign any panel's content, layout, or visuals. The 486-line
  CityPanel remains a 486-line CityPanel; only its outer shell changes.
* Replace Tailwind with another system. Panels keep using Tailwind
  classes where they already do — we only move *colors* to CSS
  variable tokens.
* Add or remove any GameAction. Panels dispatch the same actions to
  `GameProvider` before and after.
* Touch the canvas renderer, the engine, or any system. Import
  boundaries (`.codex/rules/import-boundaries.md`) say `ui/` cannot
  import from `canvas/` and vice versa; nothing in this plan crosses
  that line.
* Introduce a router (React Router, etc.). Panels are modal overlays,
  not routes — URL reflection is out of scope for now.
* Add animations beyond what `<PanelShell>` provides out of the box
  (simple fade-in). Bespoke animations stay in the panel bodies.
* Rewrite `Notifications`, `TurnTransition`, `EnemyActivitySummary`,
  or `ValidationFeedback`. These are toasts, not panels; the shell
  does not claim them.
* Add a save-game slot for "which panel was open". Panels always
  close on reload — no persistence requirement.
* Refactor the `H` / `T` keyboard shortcut wiring — those remain
  per-shortcut `keydown` handlers until cycle 10 picks them up.

---

## 7. Summary

We have 16 panel components, 4 always-mounted overlays, two
independent React `useState`s acting as "which panel is open",
three built-but-unwired panels, six distinct z-index values, three
distinct layout strategies, two distinct close glyphs, and at least
three raw-hex color maps that bypass the CSS-token system.

A single `PanelManager` context + `<PanelShell>` + `panelRegistry`
makes panel management the single source of truth required by the user
feedback, without touching any panel's contents. Migration is ten
sub-cycles, each small, each shippable on its own.

The highest-signal first migration is **HelpPanel** (cycle 3): it's
already the cleanest, it's the panel the user sees on first run, and
it exercises the `centered` layout + backdrop + ESC + keyboard
shortcut branches of the shell in one go. If Help renders correctly
through the shell, every subsequent migration is a mechanical edit.
