---
title: UI review — philosophy
purpose: Establish "game not website" principles for hex-empires specifically, before judging any individual surface
created: 2026-04-17
---

# Philosophy — what makes this feel like a game

Before critiquing, the standard. Every surface in this review is measured against these principles.

## Reference anchor

- **Primary inspiration:** Civilization VII (also the stated anchor in `CLAUDE.md`)
- **Adjacent references:** Civ VI (UI language), Old World (tooltip density), Total War (chrome detail), Shadow Empire (information architecture)
- **NOT a reference:** Material Design, Ant Design, standard admin dashboards, anything that looks like a CRUD app

## The ten principles

### 1. The map is the game; the UI serves the map

The hex grid is the player's world. Everything else — panels, HUD, tooltips — exists to support looking at and manipulating the map. When UI occludes the map for longer than necessary, or demands attention away from a map-anchored decision, it has failed. **Test:** if the player has to look away from the hex they care about to understand the UI, redesign.

### 2. Diegetic first, menu second

Information that can live on the map (unit strength, city pop, tile yields) belongs on the map, attached to the entity. Falling back to a side panel for info that could render in-world is a website habit. **Test:** for each panel, ask "could 70% of this be rendered on the relevant hex instead, with the panel becoming a detail view?"

### 3. Chrome has texture and material

A game world has materiality. Panels should feel like they're made of something — parchment, inlaid wood, stone, brass. The current dark-slate flat-card aesthetic reads as "dashboard", not "empire". Texture doesn't mean kitsch; it means subtle gradients, a warmer neutral base, a slight warm-gold accent on interactive chrome, restrained material cues (inset shadows, beveled edges on key surfaces, never on every surface).

### 4. Information hierarchy by importance, not by layout grid

Websites grid everything equally. Games make the important thing GIGANTIC. The End-Turn button is the most-pressed button in the game; it should probably be the most visible thing on screen after the map. Turn count is a reference, not a headline. Gold/science/culture numbers are glanced every turn; they should be big and readable at peripheral vision. **Test:** squint at the screen — what's the hierarchy? Should match what you do most.

### 5. Respond to every interaction

Games have "juice": click → pop, hover → glow, confirm → chime, damage → shake. Most panels in hex-empires currently render state changes instantly with no motion. That reads as a web app. Every interaction should have a <200ms response: a subtle scale, a color pulse, a sound cue, a number that counts up instead of snapping. Even a 120ms ease makes a UI feel physical. **Test:** click something — did the screen acknowledge you?

### 6. Keyboard-first, mouse-assisted

Strategy-game veterans use keyboard. Single-key shortcuts for every top-level panel (hex-empires has this for most already — H, T, Y, R, G, K, X). But also: space to end turn, enter to confirm modal, 1-6 for unit actions, tab to cycle units, arrow keys to pan. **Test:** can the player beat a turn without touching the mouse? If not, some path is menu-only — find and add a key.

### 7. Sound cues are first-class, not an afterthought

A turn ends with silence → feels like nothing happened. A city grows with no sound → nothing happened. Sound is not "audio polish we add last"; it's the game telling the player what changed. Every state transition that matters needs a sound. There's an `AudioSettingsPanel` and sound framework already — it needs audit to see what's actually wired.

### 8. Panels are stages, not spreadsheets

When the player opens the TechTreePanel, they're choosing a research direction — a dramatic moment. The current render is typically a grid of tech cards with small icons. That's a spreadsheet. A tech tree should show relationships (lines connecting prerequisites), era bands (visual separation of antiquity/exploration/modern), prestige (hovered tech fills the screen with a card showing art + description + quote). A spreadsheet works for data entry; a game needs stages for meaningful choices.

### 9. Modals earn their interruption

The four modal priority panels (AgeTransition, TurnSummary, Crisis, VictoryProgress, Victory) are forced interruptions. They must justify it — with drama, art, anchoring copy, meaningful choice. A modal that pops up, shows a simple text list, and has a generic "Close" button is a website behavior. A game modal has: an anchor image, a headline, a paragraph of flavor text, 1-3 meaningful choices, a close that feels like a deliberate dismissal. **Test:** does the modal feel earned, or does it feel annoying?

### 10. Density is a feature, not a bug

Strategy games are information-dense because they reward expertise. Beginners see noise; veterans see opportunities. Current panels tend to generous padding and whitespace — a web design tendency, not a strategy-game tendency. Dense typography, tighter spacing, more data per square inch, with typographic hierarchy (size + weight + color) doing the work of separation. Grognards want information; they can handle it; give it to them. But density demands excellent typography — tabular numerics, careful leading, no stretched gaps between related fields.

## Rubric (applied to each surface)

Each review entry scores against these 10 principles (-2 strongly violates, -1 violates, 0 neutral, +1 supports, +2 exemplifies). A surface scoring below 0 in aggregate needs redesign; below -5 needs rewrite.

## What's NOT in scope for this review

- Game-balance or tuning changes (numbers, costs, yields)
- Adding new features; this is about the look/feel/interaction of what exists
- Art assets / sprite redesign (separate artistic direction exercise)
- Accessibility audit (WCAG contrast etc.) — future pass

## Assumption I'm making

The existing engine-side feature set stays. I'm NOT proposing we cut panels or features. I'm proposing how to present what exists so it feels like a turn-based strategy game in the Civ VII lineage, not a React admin dashboard with a hex map embedded in it.

## P11 (architectural) — System-first, panel-specific only when justified

This principle mirrors the codebase's engine/renderer separation and the panels.md / ui-overlays.md pattern of a single shared shell.

Every visual decision has two places it can land:

1. **Design system (global tokens + shared components)** — applies across ALL surfaces. Panel backgrounds, typography scale, spacing, iconography, animation curves, sound cues, empty-state layout, section-header style, button variants, resource-color mapping, modal chrome pattern, tooltip chrome pattern. When it changes, every panel changes with it. This is where ~80% of the visual identity should live.

2. **Panel-specific overrides** — applied only to ONE panel, justified by that panel's unique need. Diplomacy's portrait-heavy layout. Tech/Civics' tree visualization. AgeTransition's ceremonial edge treatment. When a panel legitimately needs something no other panel needs, it can override — but the override earns its place.

### Current state — the pattern is NOT followed

Looking at the codebase: `panels.md` + `PanelShell` + `panel-tokens.css` form the correct skeleton. But every individual panel (CityPanel, TechTreePanel, GovernmentPanel, ...) reinvents its internal layout, section-header style, empty-state copy, and action-button look. There are **no shared sub-components** for "section header", "resource row", "progress bar with label", "empty-state illustration", "action button palette". Each panel rolls its own.

As a result:
- The "empty state" pattern looks different in Commanders vs Trade Routes vs Religion vs Government
- "Current state + available actions + future unlocks" structure is reinvented per panel
- Section headings vary in typography (UPPERCASE vs Title Case vs Bold)
- The "progress bar" component appears in 5 places with 3 different styles

Fixing these 1-off isn't the right path — **we'd fix the same thing 20 times**. The right path is:

### A. Extend the design system FIRST

Before any panel-specific redesign, build out:
- **Shared sub-components**: `<SectionHeader>`, `<ResourceRow>`, `<ProgressBar>`, `<EmptyState>`, `<ActionPalette>`, `<EntityCard>`, `<ProgressionRoadmap>`, `<RelationshipGauge>`
- **Token system**: semantic color tokens (not just panel-bg but `--stage-foundational-accent`, `--stage-military-accent`, `--stage-diplomatic-accent`); typography tokens with a real type scale (display / heading / body / label / numeric); spacing scale (xs/sm/md/lg/xl with consistent px values); motion tokens (fast/medium/slow + curves)
- **Shared illustrations / iconography** — a proper icon set (SVG sprite) replacing emoji for UI chrome; emoji reserved for in-world-data markers only
- **Shared sound cue set** — standardized audio hooks keyed to categories (foundational / military / diplomatic / validation-fail / etc.)

### B. Refactor panels to consume the system

Each panel then becomes: a `<PanelShell>` + composed `<SectionHeader>` / `<EmptyState>` / `<ProgressBar>` / etc. The per-panel code drops to ~60% of current size. Consistency is automatic.

### C. Panel-specific overrides only when justified

- TechTree/CivicsTree need a shared `<TreeView>` component (their own) because no other panel has that shape
- DiplomacyPanel needs a `<LeaderPortraitCard>` because no other panel has portraits
- SetupScreen / AgeTransition / Crisis / Victory modals need a `<DramaModal>` wrapper on top of PanelShell because they earn the extra chrome

These per-panel components get their OWN token + sub-components but are still built from system primitives (colors, typography, spacing).

### Implications for the master plan

Work order flips from "fix panels one by one" to:

1. **Design system foundations** (tokens, sub-components, icon set, sound set)
2. **Panel-type shells** (DramaModal for moments; maybe a sub-shell for Group D's dashboards)
3. **Panel refactors** (each panel reduced to system-consumption)
4. **Panel-specific polish** (only for panels that earned their overrides)

This is MORE work up-front but lands as a coherent product; the alternative (one-off fixes) accumulates drift and costs more over time.
