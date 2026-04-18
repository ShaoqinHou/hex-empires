---
schema: design-spec/v1
phase: 4 (panel chrome - PRAGMATIST direction)
author: opus (designer, pragmatist stance)
created: 2026-04-18
---

# Phase 4 chrome - pragmatist direction

## Scope sentence

Upgrade PanelShell, TopBar, and BottomBar chrome to a warm Civ-VII feel via pure CSS token additions and a single shell refactor - no hand-drawn SVG, no per-panel body edits, no new components. Total estimated effort: 2 days, 4-6 commits.

## Stance

This proposal deliberately avoids anything that has ever burned us:

- No border-image SVGs - they require pixel-perfect corner art we do not have, break on non-integer zoom, and have historically regressed.
- No per-panel body changes - 15 panels x N tweaks = 15x the regression surface. Chrome-only wins land once in PanelShell and propagate.
- No motion / entrance animation - that is Phase 7 and requires the motion-token audit to be enforced.
- No new components. SectionHeader, ResourceRow etc. are Phase 1.2 backlog; this phase must not grow them.

The payoff we DO deliver: a visibly more ornate title bar with a gold underline rule, a bronze double-border treatment, a subtle olive parchment gradient, harmonized TopBar/BottomBar chrome that matches, and a resolution for the dropped three-dot menu.

---

## Token additions - 8 new entries, all in panel-tokens.css

All values composed from existing --olive-*, --bronze-*, --amber-*, --cream-* primitives (Phase 1 palette). No raw hex introduced outside repeating known primitive values inside rgba() stops. CSS rgba() does not accept CSS-variable substitution of R/G/B components without color-mix(); we repeat numeric literals that match primitives already defined in palette-tokens.css.

```css
/* Phase 4 chrome tokens (pragmatist) */

/* 1. Title-bar gold underline - imperial rule beneath headings. */
--panel-title-rule:
  linear-gradient(90deg,
    var(--amber-400) 0%,
    var(--amber-300) 40%,
    rgba(251, 191, 36, 0.0) 100%);

/* 2. Title-bar background - faint gold wash over --panel-bg. */
--panel-title-bg:
  linear-gradient(180deg,
    rgba(251, 191, 36, 0.06) 0%,
    rgba(251, 191, 36, 0.02) 100%);

/* 3. Outer bronze bevel - inset shadow: bronze inner edge + amber halo. */
--panel-bevel-shadow:
  inset 0 0 0 1px rgba(184, 134, 58, 0.22),
  inset 0 1px 0 0 rgba(252, 211, 77, 0.08),
  0 8px 32px rgba(0, 0, 0, 0.48),
  0 2px 8px rgba(0, 0, 0, 0.28),
  0 0 0 1px rgba(122, 96, 48, 0.15);

/* 4. Olive parchment body wash - 2-stop radial vignette. */
--panel-body-wash:
  radial-gradient(ellipse at 50% 0%,
    rgba(74, 62, 40, 0.0) 0%,
    rgba(22, 20, 9, 0.35) 100%);

/* 5. Corner ornament - small bronze quatrefoil as inline SVG data-URI. */
--panel-corner-ornament: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 14 14'><path d='M7 1 L9 5 L13 7 L9 9 L7 13 L5 9 L1 7 L5 5 Z' fill='%23d4a85a' opacity='0.55'/></svg>");

/* 6. Chrome-bar surface (TopBar + BottomBar). */
--chrome-bar-bg:
  linear-gradient(180deg,
    rgba(53, 44, 30, 0.98) 0%,
    rgba(37, 30, 20, 0.98) 100%);

/* 7. Chrome-bar edge gold rule - mirrors --panel-title-rule. */
--chrome-bar-rule:
  linear-gradient(90deg,
    rgba(251, 191, 36, 0.0) 0%,
    var(--amber-400) 20%,
    var(--amber-300) 50%,
    var(--amber-400) 80%,
    rgba(251, 191, 36, 0.0) 100%);

/* 8. Backdrop tint - warm black rather than neutral. 55% opacity. */
--panel-backdrop-warm: rgba(26, 21, 16, 0.55);
```

**Budget check:** 8 tokens exactly.

---

## PanelShell chrome updates

Two style objects change; no JSX restructuring.

```tsx
// PanelShell.tsx - containerStyle and titleBarStyle only

const containerStyle = (priority, width) => ({
  position: "absolute",
  background: "var(--panel-body-wash), var(--panel-bg)",  // layered
  borderRadius: "var(--panel-radius)",
  boxShadow: "var(--panel-bevel-shadow)",   // replaces --panel-shadow
  border: "none",                           // bevel IS the border now
  color: "var(--panel-text-color)",
  zIndex: Z_INDEX_VAR[priority],
  display: "flex",
  flexDirection: "column",
  maxHeight: "85vh",
  overflow: "hidden",
  // ... existing position branching preserved
});

const titleBarStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "var(--panel-padding-md) var(--panel-padding-lg)",
  background: "var(--panel-title-bg)",   // NEW gold-wash
  borderBottom: "none",                  // replaced by ::after rule
  position: "relative",                  // host ::after + ::before
  flexShrink: 0,
};
```

Gold rule + corner ornament need pseudo-elements, so add a scoped stylesheet imported by PanelShell.tsx:

```css
/* packages/web/src/ui/panels/panel-shell.css - new */

[data-testid^="panel-shell-"] > div:first-child::after {
  content: "";
  position: absolute;
  left: var(--panel-padding-lg);
  right: var(--panel-padding-lg);
  bottom: 0;
  height: 1px;
  background: var(--panel-title-rule);
  pointer-events: none;
}

[data-testid^="panel-shell-"] > div:first-child::before {
  content: "";
  position: absolute;
  left: 6px;
  top: 50%;
  width: 12px;
  height: 12px;
  transform: translateY(-50%);
  background: var(--panel-corner-ornament) center / contain no-repeat;
  pointer-events: none;
  opacity: 0.75;
}

[data-testid^="panel-backdrop-"] {
  background-color: var(--panel-backdrop-warm) !important;
}
```

Selector rationale: PanelShell already emits data-testid="panel-shell-{id}" on the root and the title bar is its first child div - no TSX attribute change required. !important overrides the inline backdropStyle - acceptable because the stylesheet is scoped to the same component.

---

## Per-panel impact audit - 15 panels

**Goal:** every panel is chrome-only. Zero body edits in Phase 4.

| Panel | Needs body work? | Notes |
|---|---|---|
| Help | No | Plain text body, inherits cleanly. |
| City | No | Uses var(--panel-*) tokens today; inherits. Spot-check production bar vs new backdrop. |
| Tech | No | Tree nodes use --tech-state-* tokens unchanged. |
| Civics | No | Same as Tech. |
| Diplomacy | No (deferred) | --panel-status-* cold-palette; Phase 4.5 warm-shift. Chrome still wins. |
| Log | No | Text-only. |
| Age (modal) | No | Gets warm backdrop. |
| TurnSummary | No | Gets warm backdrop. |
| Governors | No | --panel-spec-* deferred to 4.5. |
| Religion | No | Inherits text tokens. |
| Government | No | Same. |
| Commanders | No | Same. |
| VictoryProgress | No | Per-path chips use accent tokens, unaffected. |
| Setup | No | Own chrome - Phase 5 work. |
| Crisis | No | Same - Phase 5. |

Net: **zero body edits required.** All 15 panels are chrome-only wins.

---

## TopBar + BottomBar harmonization

Both bars get: --chrome-bar-bg background, --chrome-bar-rule edge rule, and the bronze inner-bevel portion of --panel-bevel-shadow.

TopBar (packages/web/src/ui/TopBar.tsx) - root style:

```tsx
{
  background: "var(--chrome-bar-bg)",
  borderBottom: "none",
  position: "relative",   // host ::after rule
  // ... rest unchanged
}
```

Plus a scoped chrome-bars.css adding ::after (TopBar bottom) / ::before (BottomBar top) for the gold rule. The rule geometry is identical to the panel-title rule - that is the point. Every chrome edge shares one motif.

---

## Dropped three-dot menu resolution

Phase 0.3 and 0.4 deferred the 12-item three-dot menu (save, load, settings, audio, achievements, help, quit) here. Three options:

1. **Keep and restyle.** Low risk; existing dropdown works; re-skin to new chrome tokens.
2. **Redistribute into existing panels.** Save/load to a new Settings panel; audio to AudioSettings; achievements to AchievementsPanel. Higher disruption.
3. **Collapse into a new SystemPanel.** Violates "no new components in Phase 4".

**Recommendation: option 1.** Keep the three-dot menu, re-skin only. Apply new chrome tokens to the dropdown surface. 30-minute diff, zero menu-item edits, unblocks Phase 4 shipping. Redistribution is tracked as a Phase 6 meta-chrome item - needs its own design doc and is not worth blocking a visible Civ-VII upgrade on.

---

## Sub-step breakdown - 4 commits, each independently testable

### Commit 1: token additions (30 min)

- Add the 8 new tokens to panel-tokens.css.
- No consumer change; nothing visually moves yet.
- Test: npm run build succeeds; getComputedStyle of :root resolves --panel-title-rule to non-empty.

### Commit 2: PanelShell chrome refactor (4 h)

- Edit PanelShell.tsx container + titleBar style objects.
- Create panel-shell.css, import from PanelShell.tsx.
- Test: existing PanelShell.test.tsx passes unchanged (no JSX semantic change). /verify - open Help panel, visually confirm gold rule + corner ornament + bronze bevel.
- Playwright snapshot diffs reviewed manually and re-baselined.

### Commit 3: TopBar + BottomBar chrome (3 h)

- Edit TopBar.tsx + BottomBar.tsx root style.
- Add chrome-bars.css with ::after/::before gold rule.
- Test: /verify - gold rule appears under TopBar, above BottomBar, matching panel titles.

### Commit 4: three-dot menu re-skin + warm backdrop (2 h)

- Apply --chrome-bar-bg + bronze-bevel to the three-dot dropdown.
- Confirm --panel-backdrop-warm overrides backdrop on AgeTransition / TurnSummary / Crisis.
- Test: /verify - open Age Transition, confirm warm backdrop.

Optional **commit 5** (buffer): tweak ornament opacity / rule brightness if review demands.

---

## Explicitly out of scope

- Motion / entrance animations (Phase 7 juice pass; needs S-07 motion-token audit).
- DramaModal / hero-modal treatment for AgeTransition, Crisis, Victory (Phase 5).
- Redistribution of the 12 three-dot menu items into categorized panels (Phase 6).
- Warm-shift of --panel-status-*, --panel-spec-*, --panel-accent-success/danger/info - Phase 4.5 per Phase 1 open question #3.
- New shared components (SectionHeader, ResourceRow, ProgressBar) - Phase 1.2 backlog.
- Icon replacement (emoji to SVG) - Phase 1.3 art track.
- Typography changes beyond Phase 1.
- Per-panel body padding / density adjustments - Phase 4.5 if spot-checks show issues.
- Per-viewport-class chrome variance beyond what tokens already handle - Phase 1.5 territory.

---

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Corner-ornament SVG looks cheap at 12x12 | Medium | Start at opacity 0.55; if review hates it, drop to 0 via token edit (rest still ships). |
| Bronze bevel too subtle on dark olive | Low | Token-only tweak of inset rgba values; 5-minute fix. |
| ::after selector brittle if PanelShell JSX reorders | Low | Document dependency in panel-shell.css header; any JSX change must update selector - caught by snapshot diff. |
| Warm backdrop reads too brown vs neutral | Low | Single token revalue without touching code. |
| TopBar gold rule clashes with resource-chip amber | Medium | Visual check in Commit 3 /verify; reduce rule opacity via buffer commit if needed. |

---

## Acceptance criteria

1. All 15 panels render with: new title-bar gold rule, bronze bevel, warm body wash, corner ornament - no per-panel edits required. Visually confirmed via /verify.
2. TopBar and BottomBar share the exact same gold rule as panel titles.
3. Modal backdrops render warm-black not neutral.
4. Three-dot menu dropdown surface matches new chrome tokens.
5. npm test + npm run build pass. Every Playwright snapshot diff reviewed manually.
6. Zero raw hex introduced in .tsx files (chrome-raw-hex-regression trap clean).
7. Zero new components added (Phase 1.2 backlog untouched).
8. Chrome renders correctly at standard / wide / ultra viewport classes.

---

## Open questions

Two open questions flagged for parent-agent decision before commit 1:

1. **Three-dot menu: option 1 (re-skin only) vs option 2 (redistribute).** Recommendation above is option 1 for shipping speed; option 2 is the cleaner eventual state. Parent picks based on whether Phase 6 meta-chrome cleanup is imminent or distant.
2. **Corner ornament opacity and whether to include it at all.** The small bronze quatrefoil is the one ornamental element in an otherwise restrained system. At 0.55 opacity it reads decorative without being twee. User may prefer to drop it entirely (token opacity 0) for a cleaner modern look and let the gold rule be the only flourish. Flag for visual review after commit 2 lands.

---

## Cross-refs

- .claude/workflow/design/ui-review/08-master-plan.md - Phase 4 (strategic dashboards) and Phase 6 (meta chrome cleanup); this spec bundles the chrome portion of both into Phase 4 per loop-state.
- .claude/workflow/design/ui-review/phase-1-design-tokens-spec.md - source of --olive-*, --amber-*, --bronze-*, --cream-* primitives.
- packages/web/src/styles/panel-tokens.css - where the 8 new tokens land.
- packages/web/src/styles/palette-tokens.css - primitive palette this proposal assumes is shipped.
- packages/web/src/ui/panels/PanelShell.tsx - the one component that gets a real diff.
- .claude/rules/panels.md - token-only chrome rule; chrome-raw-hex-regression trap.
- .claude/rules/ui-overlays.md - sibling HUD chrome would benefit from the same tokens in a future hud-tokens.css follow-up (noted, not scoped).

**Sibling docs that should reference this doc:**
- systems/S-01-layer-and-zindex.md - note that Phase 4 chrome does not change z-order.
- Phase 4 skeptic and integrator docs (parallel spawns) will synthesize against this pragmatist proposal.
