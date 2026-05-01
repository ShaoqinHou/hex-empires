# UI Cleanup — Remaining (2026-04-15)

Final sweep after M31–M37 panel refactor and M-HUD1..4 overlay refactor. This
doc inventories rule violations that still exist in `packages/web/src/` and
classifies each as:

- **(A)** Legitimate shell-internal usage (`TooltipShell` / `PanelShell` /
  `PanelManager` / `HUDManager` themselves reaching for primitives tokens
  wrap). OK by rule.
- **(B)** Game-data display (faction/player colors, yield-dot palette,
  tech-tree researched-vs-locked state, victory-type accents). Per
  `.codex/rules/panels.md` and `.codex/rules/ui-overlays.md`, acceptable.
- **(C)** Genuine rule violation still in the codebase — target for
  follow-up cycles.

Only (C) findings are listed below; (A) and (B) are summarised at the end
so future audits don't re-flag them.

## Summary

- 13 Category (C) findings across 7 files.
- 0 fixed in this commit (all non-trivial — each touches >10 LOC or
  couples into a subsystem migration).
- Panel-manager core wiring is clean: 0 prop-drilled `onOpenX` callbacks,
  0 hand-rolled ESC handlers inside panels, all TopBar triggers carry
  `data-panel-trigger`, 0 panels hold `useState<boolean>` for visibility
  except `VictoryPanel`'s "dismissed" flag (see C3).
- HUD-manager core wiring is clean: every `TooltipShell` consumer is an
  id in `hudRegistry.ts`, no ad-hoc tooltip positioning survives in
  migrated overlays, every migrated overlay routes ESC through
  `HUDManager`.
- Residual drift is concentrated in three surfaces: (1) `ImprovementPanel`
  never migrated to `PanelShell`/registry at all, (2) `TopBar.tsx` holds
  two local overlays (audio-settings popover, save toast) that should be
  panels or HUD elements, (3) panel *bodies* (not chrome) still reach for
  Tailwind color utilities in `TooltipOverlay`, `AgeTransitionPanel`, and
  a few accent-color literals in `GovernorPanel` / `DiplomacyPanel` /
  `TopBar`.

## Findings

### C1 — `ImprovementPanel` is a modal panel that bypasses the entire panel system
- **File:** `packages/web/src/ui/components/ImprovementPanel.tsx:78,107`
- **Offender:** Full `fixed top-1/2 left-1/2 ... z-50` modal implementation with
  its own close button, shadow, padding, rounded corners — zero use of
  `PanelShell`. Not registered in `panelRegistry.ts`. Managed by
  `showImprovementPanel: useState<boolean>` in `canvas/GameCanvas.tsx:56`
  (a raw visibility flag, violating `panels.md`'s anti-pattern table).
- **Proposed fix:** Add `improvement` id to `panelRegistry`, wrap body in
  `<PanelShell priority="modal">`, move open trigger from GameCanvas
  local state to `usePanelManager().openPanel('improvement')`.
- **Est. LOC:** 40–60 (rename file to `ui/panels/ImprovementPanel.tsx`,
  delete duplicate modal chrome, update GameCanvas call site, add
  registry entry, add stale test id selectors).

### C2 — `TopBar` audio-settings popover is a hand-rolled panel
- **File:** `packages/web/src/ui/layout/TopBar.tsx:14,164`
- **Offender:** `const [showAudioSettings, setShowAudioSettings] = useState(false)`
  drives a `fixed top-14 right-4 w-80 ... z-50` popover with its own close
  `✕` button. Neither a panel (not in registry, no shell) nor a HUD
  element. Two-source-of-truth anti-pattern (panel-manager owns one set
  of UI state; this owns another).
- **Proposed fix:** Register `audio` panel id, wrap `<AudioSettings />`
  in `<PanelShell priority="overlay" width="narrow">`, route toggle
  through `togglePanel('audio')`.
- **Est. LOC:** 25–35.

### C3 — `VictoryPanel` holds its own dismissed flag
- **File:** `packages/web/src/ui/panels/VictoryPanel.tsx:13`
- **Offender:** `const [dismissed, setDismissed] = useState(false)` is
  the panel's own visibility gate — not routed through
  `PanelManager`. `VictoryPanel` already reuses the `victoryProgress`
  registry id and is always-mounted (not driven by `activePanel`). The
  dismissed flag is technically correct, but splits the "is the victory
  UI visible" signal across two sources.
- **Proposed fix:** Either (a) render `VictoryPanel` conditionally from
  `App.tsx` based on `state.victory.winner && activePanel !== 'victoryProgress'`
  and migrate `dismissed` → `closePanel()`, or (b) give it its own
  registry id `victory` so open/close goes through the manager.
- **Est. LOC:** 15–20.

### C4 — Save toast in `TopBar` is a hand-rolled overlay (not a HUD element)
- **File:** `packages/web/src/ui/layout/TopBar.tsx:149`
- **Offender:** `absolute top-14 right-4 px-4 py-2 rounded-lg z-50` with
  raw hex `backgroundColor: '#22c55e'`. Should be a notification through
  the `notification` HUD element.
- **Proposed fix:** Call `pushNotification({ text: 'Game saved', tone: 'success' })`
  through the existing `Notifications` component; remove the `saveToast`
  local state and JSX.
- **Est. LOC:** ~12.

### C5 — `YieldsToggle` uses magic z-index and left-absolute positioning
- **File:** `packages/web/src/ui/components/YieldsToggle.tsx:8`
- **Offender:** `className="absolute left-2" style={{ bottom: '14rem', zIndex: 20 }}`.
  The `14rem` bottom offset is magic, and `zIndex: 20` is not a token.
- **Proposed fix:** Use a new HUD token `--hud-z-map-controls` (or an
  existing panel token) and move the component under `ui/hud/` with a
  registry id `mapControls`. Or inline-mount inside a new HUD anchor
  container in `GameUI` so z-index stays implicit.
- **Est. LOC:** ~15.

### C6 — `TopBar` more-menu dropdown uses `z-50` and `absolute right-0 top-9`
- **File:** `packages/web/src/ui/layout/TopBar.tsx:107`
- **Offender:** `className="absolute right-0 top-9 ... z-50"` — the
  overflow menu popover is a hand-rolled dropdown with magic z-index.
- **Proposed fix:** Extract a shared `Dropdown` primitive in `ui/` using
  `var(--panel-z-overlay)` and no magic offsets, or make the overflow
  menu a mini `overlay`-priority panel with id `moreMenu`.
- **Est. LOC:** ~20.

### C7 — `ActionButton` tooltip uses `z-50` and raw chrome
- **File:** `packages/web/src/ui/components/ActionButton.tsx:53`
- **Offender:** Disabled-state tooltip renders an `absolute ... z-50`
  bubble with hand-rolled border-triangle pseudo-element via
  `border-t-health-low`. The whole component duplicates what
  `TooltipShell` + `tooltip` registry id are meant to provide.
- **Proposed fix:** Replace inline tooltip JSX with `<TooltipShell id="tooltip" anchor={{ kind: 'screen', ... }} position="floating" tier="compact" />`
  or fall back to the `Tooltip` primitive (`ui/components/Tooltip.tsx`)
  which already exists and is HUD-adjacent.
- **Est. LOC:** ~25.

### C8 — `Tooltip` primitive in `components/` duplicates `TooltipShell`
- **File:** `packages/web/src/ui/components/Tooltip.tsx:58,152`
- **Offender:** Registers its own `window.addEventListener('keydown', ...)`
  for Alt-tracking (duplicating `hooks/useAltKey.ts`), and renders a
  `fixed z-50 pointer-events-none` body with its own position math. Both
  responsibilities belong to `TooltipShell` + `HUDManager`.
- **Proposed fix:** Port `Tooltip` callers (`ActionButton`, etc.) to
  `TooltipShell` with `id="tooltip"` (already in `hudRegistry.ts`) and
  delete this file.
- **Est. LOC:** ~50 (cross-cutting — touches every `<Tooltip>` call
  site). Deferred pending a dedicated HUD cycle.

### C9 — `TooltipOverlay` body still uses Tailwind color utilities
- **File:** `packages/web/src/ui/hud/TooltipOverlay.tsx:228–643`
- **Offender:** ~50 Tailwind chrome-color utilities inside the tooltip
  body (`text-slate-300`, `text-amber-400`, `text-red-400`, `border-slate-700`,
  `text-purple-300`, `text-blue-300`, etc.). These are semantically
  game-data in places (faction colors, yield palette) but mostly chrome.
  The shell is now tokenised; the body drifted.
- **Proposed fix:** Replace chrome-intent utilities
  (`text-slate-*`, `border-slate-*`, `bg-slate-*`) with `var(--panel-*)`
  tokens. Leave semantically-colored items (red for enemy, gold for
  resources, purple for districts) as tokens or as new HUD-accent tokens
  in `hud-tokens.css`.
- **Est. LOC:** ~80 — mechanical but large; deferred.

### C10 — `AgeTransitionPanel` body uses Tailwind color utilities
- **File:** `packages/web/src/ui/panels/AgeTransitionPanel.tsx:41–177`
- **Offender:** ~40 Tailwind chrome-color utilities
  (`text-slate-*`, `border-slate-*`, `bg-slate-800/50`, `bg-purple-900/20`,
  etc.). Same pattern as C9 — the shell is fine, the body drifted.
- **Proposed fix:** Mechanical swap to `var(--panel-*)` tokens; keep
  the gold/purple accents via new panel tokens
  (`--panel-accent-gold`, `--panel-accent-purple-glow`). A
  `VictoryProgressPanel` already has a TODO noting the same need
  (`VictoryProgressPanel.tsx:133` — "swap '#fbbf24' (amber-400) →
  --panel-accent-gold once panel token covers this hue").
- **Est. LOC:** ~60.

### C11 — `GovernorPanel` uses raw-hex accents for promotion highlights
- **File:** `packages/web/src/ui/panels/GovernorPanel.tsx:98,160,192,201`
- **Offender:** `backgroundColor: '#22c55e'`, `'#ef444433'`, `color: '#fbbf24'`,
  etc. These are chrome accents (Recruit button green, Recall button red,
  promotion amber) — not game data — and should be tokens.
- **Proposed fix:** Add `--panel-accent-success`, `--panel-accent-danger`,
  `--panel-accent-warning` to `panel-tokens.css`, or reuse existing
  `--color-food` / `--color-health-low` / `--color-gold` global tokens.
- **Est. LOC:** ~10.

### C12 — `DiplomacyPanel` uses raw-hex accents for relation states
- **File:** `packages/web/src/ui/panels/DiplomacyPanel.tsx:88,94`
- **Offender:** `color: '#60a5fa'` (ally blue), `color: '#4ade80'` (peace
  green). Chrome-intent accents, should be tokens.
- **Proposed fix:** Same as C11 — either add panel tokens for
  success/info/danger, or reuse the global color tokens already in
  `index.css`.
- **Est. LOC:** ~6.

### C13 — `TechTreePanel` / `CivicTreePanel` use researched/available raw hexes
- **Files:** `packages/web/src/ui/panels/TechTreePanel.tsx:282,332,339`,
  `packages/web/src/ui/panels/CivicTreePanel.tsx:288,345`
- **Offender:** `color: '#22c55e'`, `color: '#93c5fd'`,
  `backgroundColor: '#3b82f6'`, `color: '#e599f7'` — these mark node
  state (researched, selected, locked).
- **Proposed fix:** This lives on the boundary between chrome and
  game-data. Recommend treating as game-data but *still* extracting to
  named constants (`TECH_STATE_COLORS`) and adding a one-line comment
  flagging them as game-data exceptions. Or mint tokens
  `--tech-researched`, `--tech-selected`, `--tech-locked`.
- **Est. LOC:** ~15.

## Fixed in this commit

None — every finding touches >10 LOC or couples into a follow-up
migration (panel registration, body-wide token swap, or HUD extension).
Deferring in a coherent cycle beats scattering partial fixes.

## Known-acceptable (B) exceptions

These are **intentionally** not fixed and should not be re-flagged:

- **Game-data palettes**
  - `VictoryProgressPanel.tsx:6–12` — `VICTORY_CONDITIONS` object uses
    raw hex per victory type. Each victory type's color is game data,
    not chrome; tokens would indirect without benefit. Already has a
    TODO comment on amber accent.
  - `panels/TechTreePanel.tsx` + `panels/CivicTreePanel.tsx` internal
    researched/selected node coloring (C13 above is a borderline case
    documented for cycle discretion).
  - `canvas/` — yield dots, faction player colors, terrain palette.
    These live outside `ui/` and are canvas rendering primitives.
- **Shell-internal literals**
  - `TooltipShell.tsx:178–185` — tokenised chrome values with literal
    fallbacks (`rgba(22, 27, 34, 0.96)`, etc.) that only apply when
    both `--hud-*` and `--panel-*` resolve to nothing. By design per
    the shell-migration doc.
  - `PanelShell.tsx:107` — `zIndex: 'var(--panel-z-modal)' as unknown as number`
    type cast; the shell is the only place this should happen.
  - `Minimap.tsx:166`, `ValidationFeedback.tsx:117`, `TurnTransition.tsx:84`
    — `zIndex: 'var(--hud-z-*)' as unknown as number` in already-migrated
    HUD components; they're using tokens, TS just needs the cast.
- **Index CSS escape hatches**
  - `index.css:119–122` — `.game-app .selectable, input, textarea`
    re-enables `user-select: text` for form fields. Required for text
    inputs to work; this is the documented escape hatch.
- **Non-UI event listeners**
  - `hooks/useAudio.ts`, `hooks/useAltKey.ts`, `providers/GameProvider.tsx`
    `addEventListener('keydown', ...)` — these are non-panel concerns
    (audio unlock on first interaction, Alt tracking, save shortcut).
    Not a per-panel ESC handler.
- **Panel internal z-index: 0**
  - `TechTreePanel.tsx:405`, `CivicTreePanel.tsx:411` — SVG connectors
    explicitly layered below node tiles *within the same panel body*.
    Scoped to the panel, not competing with the HUD stack.
- **EventLogPanel sticky header**
  - `EventLogPanel.tsx:110` — `sticky top-0 z-10` on the per-turn
    header is internal-to-scroll-container layering, not a global
    overlay.

## Follow-up cycle sketch

Two small cycles bag ~75% of the drift with low risk:

1. **C4 + C11 + C12 + C13 (token-accent cycle)** — add
   `--panel-accent-success`, `--panel-accent-danger`,
   `--panel-accent-warning`, `--tech-researched`, `--tech-selected`,
   `--tech-locked`; swap raw hex → var references across the five
   files. Then delete the save-toast from TopBar in favor of
   `Notifications`. ~45 LOC total.
2. **C1 + C2 (missing-panel-registration cycle)** — register
   `improvement` and `audio` panel ids, migrate both to `PanelShell`.
   ~60 LOC total.

C7–C10 and C3 are their own cycles; each touches multiple call sites
or is tangled with the `Tooltip`/`TooltipShell` consolidation.

## References

- `.codex/rules/panels.md`
- `.codex/rules/ui-overlays.md`
- `.codex/workflow/design/panel-manager-audit.md`
- `.codex/workflow/design/hud-ui-audit.md`
- `packages/web/src/ui/panels/panelRegistry.ts`
- `packages/web/src/ui/hud/hudRegistry.ts`
