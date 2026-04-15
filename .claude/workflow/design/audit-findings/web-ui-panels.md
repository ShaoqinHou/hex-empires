# Audit Findings: packages/web/src/ui/panels/

**Date:** 2026-04-15
**Auditor:** Sonnet 4.6 (read-only)
**Standards checked:** S-PANEL-PATTERN, S-PANEL-REGISTRATION, S-NO-BOOLEAN-PANEL-STATE, S-ESC-OWNERSHIP-PANEL, S-NO-RAW-HEX-CHROME, S-NO-HARDCODE-COLORS, S-DATA-TRIGGER-ATTR, S-PANEL-SHELL-CHROME

---

## Summary

This surface has recently been refactored (M33+). Finding count is very low. All panels use PanelShell, all panel ids are in the registry, no local useState<boolean> for visibility, no per-panel ESC handlers, no hand-rolled position:fixed, and all TopBar triggers carry data-panel-trigger. The only substantive findings are a small number of raw hex literals in panel body content (not chrome), one CrisisPanel integration anomaly, and two panels that are not wired into App.tsx's conditional block.

---

## Grade: A (with minor B-class observations)

---

## Infrastructure: PASS

### PanelManager.tsx
- PASS — single ESC handler in capture phase, checks INPUT/TEXTAREA/SELECT, respects `data-dismissible="false"`, calls stopPropagation
- PASS — `usePanelManager()` throws outside provider (mirrors useGame pattern)
- PASS — single-slot model, openPanel/closePanel/togglePanel/isOpen all correct

### PanelShell.tsx
- PASS — owns title bar, × close button (U+00D7), aria-label, data-testid, role="dialog", z-index from --panel-z-* tokens, context-menu suppression, data-panel-id/priority/width/dismissible attributes
- PASS — backdrop only for modal priority
- PASS — `dismissible=false` drops close button, inerts backdrop click, stamps `data-dismissible="false"` for PanelManager ESC
- NOTE: uses `position: 'absolute'` (not 'fixed') for the shell container, consistent with being inside the game viewport div — correct by design. Backdrop uses `position: 'fixed'` — correct.

### panelRegistry.ts
- PASS — PanelId union: help, city, tech, civics, diplomacy, log, age, turnSummary, governors, religion, government, commanders, victoryProgress, victory, crisis, improvement, audioSettings (17 entries)
- PASS — PANEL_REGISTRY map has exactly 17 entries, one per PanelId
- PASS — pure data file, no React/DOM imports

---

## Panel-by-Panel Results

### AgeTransitionPanel.tsx — PASS with B-class finding
- PASS — wraps PanelShell id="age" priority="modal" dismissible={false}
- PASS — no local visibility state, no ESC handler
- PASS — calls onClose only after dispatching TRANSITION_AGE (correct blocking-modal contract)
- B — line 89: `'linear-gradient(to right, var(--panel-accent-gold-soft), #eab308)'` — raw hex `#eab308` in a gradient used on the age-progress bar fill. This is game-data display (gold color on a progress bar), borderline chrome-adjacent.
- B — line 184: `color: '#0f172a'` in the "SELECT" badge background — this is the dark-slate text-on-gold combo, not in any token. Minor.
- NOTE: `getAgeColor()` returns raw hex strings (#a78bfa, #60a5fa, #fbbf24) for age accent colors. These are semantic game-data colors used in content, not chrome — acceptable by the "game-data display" carve-out, but worth tokenizing when hud-tokens.css lands.

### AudioSettingsPanel.tsx — PASS
- PASS — wraps PanelShell id="audioSettings" priority="overlay" width="narrow"
- PASS — all chrome via var(--panel-*) tokens
- PASS — no local visibility state, no ESC handler
- NOTE: has `aria-label` on two toggle buttons — correct (those are interactive controls, not the panel chrome)

### CityPanel.tsx — PASS with B-class findings
- PASS — wraps PanelShell id="city" priority="overlay" width="narrow"
- PASS — no local visibility state, no ESC handler
- B — line 191: `color: '#f59e0b'` (amber) for "NEEDS PLACEMENT" badge
- B — line 212: `border: '1px solid #f59e0b'` on unplaced building row
- B — line 215: `border: '2px solid #fbbf24'` on wonder row
- B — line 237: `color: !isPlaced ? '#f59e0b' : isWonder ? '#fbbf24' : 'var(--color-text)'`
- B — line 242: `color: '#f59e0b'` on "PLACE!" text
- Context: all five are the same amber/gold "needs placement" semantic color used in building rows (body content, not chrome). The pattern is consistent but the color should be a token (e.g. `--color-placement-alert` or `--panel-accent-gold`). Low severity.

### CivicTreePanel.tsx — PASS with B-class findings
- PASS — wraps PanelShell id="civics" priority="overlay" width="full"
- PASS — no local visibility state, no ESC handler
- B — `CULTURE_COLOR = '#cc5de8'` module-level constant used for culture/civic accent throughout. This is a semantic game color for culture yield, not panel chrome, but it's a raw hex. Should be `var(--color-culture)`.
- B — TechCard/CivicCard internal state colors: `#22c55e`, `#86efac`, `#3b82f6`, `#93c5fd`, `#f8fafc`, `#6b7280`, `rgba(...)` — tree-node state colors in body content. These mirror TechTreePanel exactly and represent a shared drift pattern.
- B — SVG line stroke: `stroke="#22c55e"` on fully-researched lines (line 441) — SVG attribute, not CSS style, so var() won't work here directly. Acceptable pattern for SVG.

### CommanderPanel.tsx — PASS with C-class finding
- PASS — wraps PanelShell id="commanders" priority="overlay"
- PASS — no local visibility state, no ESC handler
- PASS — all chrome via var(--color-*) tokens (uses global tokens, not panel-specific, but all are token references)
- C — **NOT integrated into the App.tsx conditional block.** The file header acknowledges: "NOT wired into App.tsx. This panel is intentionally un-integrated — it will slot into a full Commander picker UI in a later cycle." However, `activePanel === 'commanders'` IS present in App.tsx (line 175), and the panel IS lazy-loaded (line 36) and rendered there. The file's own header comment is stale — the panel IS wired. No actual defect.

### CityPanel placement/shell tests exist. PASS.

### CivicTreePanel — duplicate of TechTreePanel findings regarding SVG stroke inline hex. Same B-class issue.

### CrisisPanel.tsx — B-class finding (integration pattern)
- PASS — wraps PanelShell id="crisis" priority="modal"
- PASS — no local visibility state, no ESC handler
- PASS — `dismissible` defaults to `true` — the shell renders the × button, but `handleClose` is a no-op (crisis requires choice). This means the × button shows but does nothing. Not a standards violation, but creates a confusing UX: the button renders without effect. Should use `dismissible={false}` to match AgeTransitionPanel's pattern.
- B — **Integration anomaly:** CrisisPanel is rendered at line 194 in App.tsx as `<CrisisPanel />` (always mounted, reads state internally) rather than through `activePanel === 'crisis'`. It is the only panel not going through the PanelManager conditional. It also does not call `openPanel('crisis')` from App.tsx — it auto-shows based on `state.crises` predicate internally. The result: `activePanel` never becomes `'crisis'`, the ESC handler in PanelManager can't close it (it's not tracked as the active panel), and the `'crisis'` id in panelRegistry is orphaned.
- **Severity: B.** The panel technically "works" because it manages its own visibility via engine state, but it violates S-PANEL-MANAGER. ESC does not close it.

### DiplomacyPanel.tsx — PASS with B-class findings
- PASS — wraps PanelShell id="diplomacy" **priority="info"** (non-blocking side column — correct for the panel's role)
- PASS — no local visibility state, no ESC handler
- B — `STATUS_COLORS` lookup uses `var(--panel-status-*)` tokens — PASS (correctly tokenized)
- B — `ActionButton` color prop receives raw hex literals from the call sites: `color="#dc2626"`, `color="#f97316"`, `color="#4ade80"`, `color="#60a5fa"`, `color="#fb923c"`. These are war/peace/action semantic colors passed as props to a helper component — body content, not chrome. Should be tokenized.
- B — `RelationshipBar` and `WarSupportBar` inline color lookups: `'#4ade80'`, `'#60a5fa'`, `'#9ca3af'`, `'#fb923c'`, `'#ef4444'`. Same issue.

### EventLogPanel.tsx — PASS with B-class findings
- PASS — wraps PanelShell id="log" priority="info"
- PASS — no local visibility state, no ESC handler
- B — `EVENT_COLOR` map: `diplomacy: '#a855f7'` and `crisis: '#eab308'` — two raw hex entries among otherwise token-using entries. Should be `var(--color-culture)` or a dedicated token.

### GovernmentPanel.tsx — PASS
- PASS — wraps PanelShell id="government" priority="overlay"
- PASS — no local visibility state, no ESC handler
- PASS — all content styling uses var(--color-*) tokens only

### GovernorPanel.tsx — PASS with B-class finding
- PASS — wraps PanelShell id="governors" priority="info"
- PASS — no local visibility state, no ESC handler
- B — line 98: `color: '#000'` on Recruit button text (contrast over success-bright background). Trivial — a fixed black text-on-bright-button pattern.

### HelpPanel.tsx — PASS
- PASS — wraps PanelShell id="help" priority="overlay"
- PASS — all content via var(--color-*) tokens
- PASS — no local state, no ESC handler

### ImprovementPanel.tsx — PASS
- PASS — wraps PanelShell id="improvement" priority="overlay" width="wide"
- PASS — no local visibility state (migration note in header confirms conversion from useState<boolean>)
- PASS — no ESC handler
- NOTE: `rgba(244, 67, 54, 0.1)` and `rgba(255, 213, 79, 0.1)` used for warning card backgrounds — rgba with raw values, borderline. Low severity.

### ReligionPanel.tsx — PASS
- PASS — wraps PanelShell id="religion" priority="overlay"
- PASS — no local visibility state, no ESC handler
- PASS — all content via var(--color-*) tokens

### SetupScreen.tsx — OUT OF SCOPE (not a game panel)
- SetupScreen is the pre-game setup flow, not an in-game panel. It does not use PanelShell, is not in panelRegistry, and is never opened via PanelManager. This is correct — it replaces the entire App render, not a floating overlay. Not a finding.

### TechTreePanel.tsx — PASS with B-class findings
- PASS — wraps PanelShell id="tech" priority="overlay" width="full"
- PASS — no local visibility state, no ESC handler
- B — TechCard state colors hardcoded: `#22c55e` (researched green), `#86efac` (name), `#3b82f6` (active blue), `#93c5fd` (name), `#f8fafc` (available white), `#6b7280` (locked gray), and rgba variants. These are tree-node semantic states, not chrome, but they duplicate across TechTreePanel and CivicTreePanel rather than coming from tokens.
- B — LegendItem `color` prop is raw hex at call sites (`"#22c55e"`, `"#3b82f6"`, etc.) — same pattern
- B — SVG stroke `"#22c55e"` on researched lines — SVG attribute, acceptable since var() doesn't work in SVG stroke
- NOTE: module-level `document.createElement('style')` injection for keyframes — technically a DOM side effect at module load, not a system/engine concern. Web-only, acceptable for animation keyframes that Tailwind v4 can't generate.

### TurnSummaryPanel.tsx — PASS
- PASS — wraps PanelShell id="turnSummary" priority="overlay" (note: registered as `modal` in panelRegistry but rendered as `overlay` in component — see finding below)
- B — **Priority mismatch:** panelRegistry registers `turnSummary` as `priority: 'modal'`, but `TurnSummaryPanel` passes `priority="overlay"` to `PanelShell`. The PanelShell prop wins at render time, so the panel behaves as overlay. The registry entry is misleading. Should align to `overlay` in registry.
- PASS — no local visibility state, no ESC handler

### VictoryPanel.tsx — PASS
- PASS — wraps PanelShell id="victory" priority="modal"
- PASS — auto-opens via useEffect in App.tsx watching `state.victory.winner`
- PASS — no local visibility state, no ESC handler

### VictoryProgressPanel.tsx — PASS with B-class findings
- PASS — wraps PanelShell id="victoryProgress" priority="overlay" width="full"
- PASS — no local visibility state, no ESC handler
- B — line 57: `borderColor: vp.achieved ? '#22c55e' : 'var(--panel-border)'` — raw hex for achieved-state green. TODO comment in file acknowledges this (#133: "TODO: swap '#fbbf24' (amber-400) → --panel-accent-gold")
- B — line 69: `color: '#22c55e'` for "VICTORY ACHIEVED" text
- B — line 90: `backgroundColor: vp.achieved ? '#22c55e' : config.color` — double raw hex exposure

---

## TopBar Trigger Audit: PASS

All TopBar `PanelButton` and `MenuButton` components:
- Call `togglePanel(id)` or `openFromMenu(id)` (which calls `togglePanel`)
- Carry `data-panel-trigger={panelId}` attribute (lines 195, 214 in TopBar.tsx)
- All ids match panelRegistry entries

Panels triggered from TopBar: tech, civics, diplomacy, age (via PanelButton), governors, religion, government, commanders, log, turnSummary, victoryProgress, audioSettings, help (via MenuButton)

---

## Registry Completeness Check

PanelId union (17): help, city, tech, civics, diplomacy, log, age, turnSummary, governors, religion, government, commanders, victoryProgress, victory, crisis, improvement, audioSettings

Panels rendered in App.tsx via `activePanel ===` conditional: city, tech, civics, diplomacy, log, age, turnSummary, governors, help, religion, government, commanders, victoryProgress, improvement, audioSettings, victory (16)

Panels NOT in `activePanel ===` conditional:
- `crisis` — rendered always-mounted as `<CrisisPanel />` (B-class finding above)

All panel tsx files have corresponding registry entries. No orphan files.

---

## Tests Coverage

Test files found in `__tests__/`:
- PanelShell.test.tsx, PanelShell.migration.test.tsx — chrome behavior
- PanelManager.test.tsx — manager state + ESC
- CityPanel.placement.test.tsx, CityPanel.shell.test.tsx
- CivicTreePanel.click.test.tsx
- CommanderPanel.test.tsx
- CrisisPanel.shell.test.tsx
- DiplomacyPanel.test.tsx
- EventLogPanel.shell.test.tsx
- GovernmentPanel.test.tsx
- GovernorPanel.test.tsx
- HelpPanel.shell.test.tsx
- ReligionPanel.test.tsx
- TechTreePanel.click.test.tsx
- TurnSummaryPanel.shell.test.tsx
- VictoryPanel.shell.test.tsx

Missing test files: AgeTransitionPanel, VictoryProgressPanel, ImprovementPanel, AudioSettingsPanel — no smoke tests found for these four panels. Low severity since PanelShell chrome tests cover close/ESC/backdrop behavior generically.

---

## Consolidated Findings

### A-class (critical): None

### B-class (high)

| ID | File | Standard | Description |
|----|------|----------|-------------|
| B1 | CrisisPanel.tsx | S-PANEL-MANAGER | Always-mounted outside activePanel conditional; PanelManager ESC cannot close it; 'crisis' registry entry orphaned |
| B2 | CrisisPanel.tsx | S-PANEL-SHELL-CHROME | dismissible defaults to true but onClose is a no-op — × renders but does nothing; should use dismissible={false} |
| B3 | TurnSummaryPanel.tsx | S-PANEL-REGISTRATION | Registry lists priority='modal'; component passes priority='overlay' — mismatch |
| B4 | TechTreePanel.tsx + CivicTreePanel.tsx | S-NO-HARDCODE-COLORS | Tree-node state colors (#22c55e, #3b82f6, #86efac, #93c5fd, #f8fafc, #6b7280 + rgba) hardcoded in TechCard/CivicCard and LegendItem. Duplicated across both files. Should be CSS tokens. |
| B5 | DiplomacyPanel.tsx | S-NO-HARDCODE-COLORS | ActionButton color prop receives raw hex at call sites; RelationshipBar/WarSupportBar inline hex color lookups |
| B6 | AgeTransitionPanel.tsx | S-NO-HARDCODE-COLORS | #eab308 in progress bar gradient; #0f172a in SELECT badge |
| B7 | VictoryProgressPanel.tsx | S-NO-HARDCODE-COLORS | #22c55e used 3× for achieved-state (TODO comment present acknowledges) |
| B8 | CityPanel.tsx | S-NO-HARDCODE-COLORS | #f59e0b / #fbbf24 used 5× for placement-alert semantic across building rows |
| B9 | EventLogPanel.tsx | S-NO-HARDCODE-COLORS | diplomacy: '#a855f7', crisis: '#eab308' in EVENT_COLOR map |

### C-class (low / informational)

| ID | File | Standard | Description |
|----|------|----------|-------------|
| C1 | GovernorPanel.tsx | S-NO-HARDCODE-COLORS | color: '#000' on Recruit button |
| C2 | CivicTreePanel.tsx | S-NO-HARDCODE-COLORS | CULTURE_COLOR = '#cc5de8' should be var(--color-culture) |
| C3 | ImprovementPanel.tsx | S-NO-HARDCODE-COLORS | rgba(244,67,54,0.1) / rgba(255,213,79,0.1) warning card backgrounds |
| C4 | AgeTransitionPanel.tsx | S-NO-HARDCODE-COLORS | getAgeColor() returns raw hex for age accent colors — game-data carve-out applies but should tokenize |
| C5 | — | S-TESTS-L3 | AgeTransitionPanel, VictoryProgressPanel, ImprovementPanel, AudioSettingsPanel have no body smoke tests |

---

## Verdict

The refactor (M33+) succeeded: the hard structural requirements are all met. Every panel wraps PanelShell. No local visibility state. No per-panel ESC. No hand-rolled position:fixed or z-index. TopBar triggers carry data-panel-trigger. The single-slot PanelManager is correctly wired throughout.

The remaining work is concentrated in two areas:
1. **CrisisPanel integration pattern** (B1/B2) — the only panel that bypasses PanelManager, should be converted to the standard `activePanel === 'crisis'` pattern with `dismissible={false}`.
2. **Raw hex color literals in body content** (B4–B9, C1–C4) — widespread but low-impact; these are semantic game colors (gold, green-achieved, culture-purple, war-red) that should move to CSS tokens as `hud-tokens.css` / new `panel-tokens.css` entries land.
