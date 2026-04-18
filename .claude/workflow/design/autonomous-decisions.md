# Autonomous Decisions Log

> **Purpose:** Full-auto mode was activated by the user on 2026-04-19. This document records every design or implementation decision made without user input. Review on return and edit anything you disagree with — none of these decisions are irreversible.

---

## Session context

User review of the live game (2026-04-19) identified 7 issues from a screenshot + remaining master plan phases. User stated: _"go full auto please, i won't be here to answer anything, if u think u should ask certain questions, just answer them for me and record them somewhere"_.

---

## Decision log

### D-01: Fog of war — real-time update triggers

**Question:** Should fog of war update only on `START_TURN`, or also on mid-turn unit movements?

**My answer:** Also on `MOVE_UNIT` and `COMBAT_RESOLVE`. The current system only recalculates visibility on `START_TURN`, meaning units you move this turn don't reveal new tiles until the next turn starts. This is clearly a bug — every strategy game expectation is that moving a unit immediately reveals the tiles around its new position.

**Implementation:** `visibilitySystem` now also handles `MOVE_UNIT` (recalculate for the moved unit's new position) and `COMBAT_RESOLVE` (units that win combat may advance). `FOUND_CITY` also triggers it since a new city provides sight.

---

### D-02: Custom scrollbars — style scope

**Question:** Where should scrollbars be styled — globally or scoped to specific elements?

**My answer:** Global baseline (`::-webkit-scrollbar` on root) with warm-earth palette. The game rarely shows scrollbars (the game canvas area is `overflow: hidden`), but when they do appear (SetupScreen, panel content areas, tech tree) they should match the Civ VII warm-earth aesthetic: bronze/amber track, olive-brown thumb.

**Colors chosen:**
- Track: `var(--color-bg-elevated)` (~`#1e1a14`) — nearly invisible, matching panel bg
- Thumb: `var(--color-accent)` (`#d4943a` bronze) at 60% opacity, hover at 90%
- Width: 6px thin scrollbar

---

### D-03: Map edge clipping — root cause diagnosis

**Question:** Why are upper-right and bottom-left of the map cut off?

**My answer (diagnosed from code):** Two issues:
1. Camera starts centered on the player's first unit (`landTiles[0]`), which is near the upper-left of the map (q ≈ 0.25 * width, r > rowMargin). This leaves the lower-right invisible on first load.
2. The canvas `clearRect` gives a black/transparent background — map edges where no hex tiles exist show as black void.

**Fix:**
- Center camera on the _map center_ at game start (computed from `mapWidth`/`mapHeight`), not on the first unit. The player can scroll to find their starting location naturally.
- Add a background fill (`--color-bg`) before drawing so empty canvas areas show the game's background color, not transparent.

---

### D-04: City name / entity stacking — display approach

**Question:** How should co-located entities (city + civilian + military unit) be displayed? What should the banner positioning be?

**My answer:**
- **City banner**: Move banner higher — from `y - HEX_SIZE * 0.85` to `y - HEX_SIZE * 1.1` so it clears the hex selection highlight ring. The selection highlight is a 3px stroke at `HEX_SIZE` radius which intersects the old banner.
- **Unit stacking indicator**: When a tile has a city + 1 or more units, the unit icons use the existing S-05 offset logic (primary CENTER, secondary BOTTOM-RIGHT). But also add a small "city present" indicator on the tile (a small castle icon or star dot at the TOP of the hex, not competing with units at CENTER).
- Keep the stacking approach already implemented (S-05 unit layering). The user's complaint is likely the banner/highlight overlap, not the unit-unit stacking which already has logic.

---

### D-05: City territory visibility — enhancement

**Question:** How much more visible should city territory markers be?

**My answer:** Increase from 10% opacity fill to **18% fill**, increase border from 70% to **90%**, and add a **subtle city-specific hatch pattern** in the territory fill (so you can distinguish overlapping territories at a glance). The border stroke increases from 3px to **3.5px**.

---

### D-06: Art assets — approach for "simple icons"

**Question:** The user said "i expected simple icons... try that" — what does this mean given the art budget rules?

**My answer:** Create **inline SVG data URIs** for each entity type, embedded directly in the renderer. No external files needed. The icons are:
- **City**: Castle/tower icon (▲ with battlements, or a simple tower shape)  
- **Military unit**: Sword/shield icon (crossed swords outline)
- **Civilian unit**: Settler wagon / person with tools outline
- **Scout/recon**: Eye or compass outline

These are simple geometric shapes drawn via Canvas path operations (not SVG files) to keep the build simple and avoid asset pipeline dependencies for these core entities.

**Icon vs text toggle**: Add a `showIcons` boolean to `GameUI` state (default `true`). When `false`, fall back to text labels (current emoji system). Expose via a small button in the BottomBar or map controls area.

---

### D-07: SetupScreen redesign — approach

**Question:** How much to redesign the SetupScreen / main menu?

**My answer:** Full redesign to match the Civ VII aesthetic. The current design is functional but plain. The redesign:
- Full-screen background with a warm radial gradient + subtle hex tessellation pattern (CSS)
- "HEX EMPIRES" title in Cinzel font, large, with amber glow
- Civilizations shown as clickable cards with the civ's color accent
- Map size shown as visual size indicators (small/medium/large hex grid icons)
- "New Game" primary CTA + "Load Game" secondary, both properly styled
- Animated hex pattern in the background (CSS only, no JS animation needed)

---

### D-08: Canvas background color

**Question:** What color should the canvas background be (the void around map edges)?

**My answer:** Match `--color-ocean` (`#2a4a5e` approx) — same as ocean tiles. This makes the canvas edges blend with ocean water, giving the impression of a world floating in ocean rather than black void.

---

### D-09: Phase 7 accessibility — scope

**Question:** What does "final polish + accessibility" mean concretely?

**My answer (planned scope for Phase 7):**
1. **Keyboard navigation**: Tab order through TopBar buttons → BottomBar → active panel
2. **ARIA labels**: `role="toolbar"` on TopBar, `aria-label` on all icon-only buttons
3. **Focus rings**: Visible 2px amber focus ring on all interactive elements (currently hidden by `outline: none` in some places)
4. **Contrast**: Verify all text meets WCAG AA (4.5:1 for normal, 3:1 for large)
5. **Screen reader**: Panel open/close announces via `aria-live` or `role="dialog"`
6. **Reduced motion**: Already handled (Phase 6.6); verify all animations respect it

---

## Decisions still open (low priority — implement based on these answers)

| # | Question | Autonomous answer | Confidence |
|---|----------|-------------------|-----------|
| Q-1 | Should AI turns auto-advance after a short delay or wait for player click? | Wait for player click (current behavior) — auto-advance would be confusing | High |
| Q-2 | What map size should be the default? | Medium (60×40) — already the default | High |
| Q-3 | Should the production queue show item names or icons? | Names for now (no raster art budget) | High |
| Q-4 | Should the SetupScreen show a preview of the civ's bonuses? | Yes, one-line bonus summary below the civ name | Medium |
| Q-5 | Tech tree — should researched techs be greyed out or hidden? | Greyed out (show progress) | High |
