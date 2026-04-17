---
title: Master redesign plan — sequenced work order + effort estimates
purpose: Put all the per-surface findings into an executable ordering that respects the system-first principle
created: 2026-04-17
---

# Master plan

## TL;DR

**Don't fix panels one by one.** Build the design system first. Then refactor panels to consume it. Then do the panel-specific polish where it earned its place. Total: 10-14 weeks if all shipped; high-value milestones at 2 and 5 weeks.

## Guiding decisions

From the philosophy doc (`00-philosophy.md`) and principle P11 (system-first):

1. **Design tokens + shared sub-components first.** Everything else inherits.
2. **Group A (always-visible) before Group D (strategic)** — frequency × impact.
3. **Interaction-economics fixes ship as quick wins** regardless of phase — e.g., notification auto-dismiss is 3 hours and improves every turn.
4. **Art/audio budget is a separate concurrent track** — can start on portraits/icons/sound now while code refactors proceed.

## Phase 0 — Quick-win interaction fixes (2-3 days, ship immediately)

High-impact / low-effort items that shouldn't wait for design-system work.

| # | Fix | Effort | Impact |
|---|---|---|---|
| Q1 | **Notification auto-dismiss** (4-5s for ephemeral, press-any-key for topmost) | 3 h | Eliminates 80% of dismiss-click pain |
| Q2 | **Enlarge notification dismiss × target** to 24×24 | 30 min | Reduces precision cost for the remaining 20% |
| Q3 | **Remove redundant bottom-caption tile info** OR **remove floating tile tooltip** (pick one) | 15 min | Kills overlay conflict |
| Q4 | **Remove / repurpose ⋯ button** (duplicates Ages) | 30 min | Kills dead button |
| Q5 | **Hide zero-value resources in TopBar** until first nonzero | 2 h | Reduces visual noise in early game |
| Q6 | **Keyboard-hint badges** on every TopBar + BottomBar button | 2 h | Surfaces the hotkeys |
| Q7 | **End Turn pulse** when idle units exist | 1 h | Visual draw to action |
| Q8 | **Wire Audio test buttons OR remove them** | 2 h | Kills a silent-failure trap |
| Q9 | **AchievementsPanel: finish wiring OR revert** | varies | Kills the dead-shortcut state |

**Total: ~2 days.** Ship as one or two focused commits. No design-token work required.

---

## Phase 1 — Design system foundations (3-4 weeks)

The architectural keystone. Until this exists, all other work is premature.

### 1.1 Token system (1 week)

Expand beyond today's `panel-tokens.css` / `hud-tokens.css`:

- **Semantic colors**: per-resource canonical colors (`--color-food`, `--color-production`, `--color-gold`, `--color-science`, `--color-culture`, `--color-faith`, `--color-influence`), per-panel-category tints (`--stage-strategic-tint`, `--stage-tactical-tint`, `--stage-drama-tint`), validation colors (`--feedback-error`, `--feedback-warn`, `--feedback-success`)
- **Typography scale**: display / heading / body / label / numeric, each as a token (size + weight + line-height + family)
- **Spacing scale**: xs (4) / sm (8) / md (12) / lg (20) / xl (32) / 2xl (48)
- **Motion tokens**: fast (120ms), medium (240ms), slow (400ms); easing curves; entrance / exit transitions
- **Elevation tokens**: z-index scale (canvas / info-panel / overlay / modal / tooltip / toast), shadow layers
- **Border-radius scale**: small (card edges), medium (panels), large (dramatic cards)

### 1.2 Shared sub-components (2 weeks)

Build once, use everywhere:

| Component | Replaces today's | Used by |
|---|---|---|
| `<SectionHeader>` | per-panel heading style | every panel |
| `<ResourceRow>` | bare numbers in CityPanel, chips in TopBar | CityPanel, TopBar, YieldCalculator tooltips |
| `<ProgressBar>` | 3 different styles today | Research, Civic, Growth, AgeProgress |
| `<EmptyState>` | inconsistent empty-state layouts | Commanders, Governors, Trade, Religion, Government, Achievements |
| `<EntityCard>` | per-panel entity rendering | Tech, Civic, Pantheon, Policy, Unit, Building |
| `<ActionPalette>` | ad-hoc button rows | Unit actions, Diplomacy actions, City-panel build grid |
| `<ProgressionRoadmap>` | inline text instructions | Government, Religion, Commander empty states |
| `<RelationshipGauge>` | Diplomacy's bare bar | Diplomacy |
| `<KeyboardHint>` | inline `[B]` text | every button that has a shortcut |
| `<StatChip>` | BottomBar + TopBar resource chips | status chrome |
| `<Portrait>` | future use | Diplomacy, SetupScreen leaders, Commanders (once art lands) |

### 1.3 Iconography (concurrent art track; 2-3 weeks)

Replace OS emoji with a cohesive SVG icon set for UI chrome. Yield icons (🌾🔨💰🔬🎭⛪🤝) get illustrated versions; game-data emoji (unit types) can continue using emoji temporarily but eventually art.

**Minimum icon set for Phase 1:**
- 8 yield icons
- 20 action icons (found city, build, research, fortify, sleep, disband, etc.)
- 10 category icons (tech, civics, religion, government, commanders, governors, trade, diplomacy, victory, age)
- 5 state icons (locked, unlocked, researching, selected, disabled)

### 1.4 Sound cue set (concurrent audio track; 1 week)

Standardized audio hooks by category. Can reuse or commission minimal set:
- UI click / hover tick / navigation
- Resource gain / spend
- Tech/civic complete
- Unit move / attack / death
- City founded / grown / built / captured
- Diplomatic event (positive / negative)
- Crisis warning / triumph chord
- Turn tick / age transition swell / victory fanfare

Wire to existing events via an `AudioManager` hook.

### Phase 1 deliverable

- A Storybook-like showcase of every shared component in the system, in every state
- Token documentation
- Icon + sound sets applied to AT LEAST the TopBar and CityPanel (as proof of the system)

---

## Phase 1.5 — Layout architecture (1 week, parallel to Phase 1)

**Added after review-of-review.** Without this, every Phase 2-6 surface would need retrofitting for responsive behavior later, doubling the work. This is the transverse concern per philosophy P12.

### 1.5.1 Viewport-class detection (1 day)

- `useViewportClass()` hook returning `'narrow' | 'standard' | 'wide' | 'ultra'`
- Listens on `resize` + `orientationchange` with debounce
- Breakpoint tokens added to design system:
  - `--breakpoint-narrow-max: 1366px`
  - `--breakpoint-standard-max: 1919px`
  - `--breakpoint-wide-max: 2559px`
  - (ultra: 2560+)
- All layout-dependent components consume this hook, not raw pixel queries

### 1.5.2 Canvas responsive fill (2 days)

Fixes H-1 + H-15 together. Canvas subscribes to window resize, computes:
```
canvasWidth  = viewport.width − activePanelWidth
canvasHeight = viewport.height − topBarHeight − bottomBarHeight
```
- Min clamps (don't shrink below ~480×320 — if viewport is smaller, panels take over)
- Max clamps (don't grow past 3840px in either dimension — pointless at absurd resolutions)
- Debounced resize to avoid thrashing
- Camera zoom / pan state preserved across resizes (don't reset view)

### 1.5.3 Panel dock behavior rules (2 days)

Implement in `PanelManager` + `PanelShell`:

| Priority | narrow | standard | wide | ultra |
|---|---|---|---|---|
| `overlay` | full-screen takeover | right-anchored 440px overlay | right-docked 480px, pushes canvas left | right-docked 520px, co-visible with one more |
| `info` | hidden until toggled | right-anchored collapsed | permanently docked 320px | permanently docked 380px, default-open |
| `modal` | full-screen always | centered with backdrop (current) | centered with backdrop | centered with backdrop |

Overlay behavior when docking: canvas re-computes its width. Not an absolute-position overlay anymore — flexbox/grid participation.

### 1.5.4 TopBar/BottomBar responsive layouts (1 day)

- At narrow: TopBar collapses Tech/Civics/… into a hamburger; resource chips wrap to 2 rows
- At standard: current horizontal layout
- At wide: TopBar shows inline richer content (per-resource per-turn delta as +2 badge next to each number)
- At ultra: additional strategic ribbon (active crisis, neighbor diplomacy status, turn clock)

BottomBar similarly adapts: at narrow the unit-dossier is a modal sheet; at ultra it's a full sidebar.

### 1.5.5 Playwright specs (1 day)

For each viewport class:
- Zero `pageerror` on start + one full turn
- No element overflows viewport
- No element clips off-screen
- TopBar and BottomBar render without horizontal scroll
- Canvas fills its expected region within ±2px

Run on CI for the 4 classes.

### Phase 1.5 deliverable

- `useViewportClass()` hook and token set
- Canvas that resizes correctly at any viewport
- Panel dock behavior tested at 4 breakpoints
- No surface in the existing build breaks under resize

**Scope note:** Phase 1.5 does NOT redesign any surface. It provides the responsive infrastructure so Phase 2+ can BUILD surfaces responsive-first. Existing panels may look weird between their current design and the new infrastructure — that's expected; they'll be redone in later phases.

---

## Phase 1.6 — Asset pipeline (1 week, parallel to Phases 1 + 1.5)

Full spec lives in **`09-asset-pipeline.md`**. Core idea: placeholder assets (AI-generated portraits, CC0 music, silhouette glyphs) must be **drop-in replaceable** with no code changes when commissioned final assets arrive.

### 1.6.1 Asset registry + loader (1 day)

- `packages/web/src/assets/registry.ts` — single source of truth mapping logical names (LeaderId, YieldType, etc.) → paths + source metadata
- `packages/web/src/assets/loader.ts` — resolve/fallback logic
- Components import from loader, never hardcode paths

### 1.6.2 Directory structure + fallback assets (0.5 day)

- Lay out `packages/web/public/assets/{images,audio}/...` per spec
- Create `_fallback-*` files (silhouette portrait, circle icon, generic glyph, silent OGG) — ships with game forever

### 1.6.3 Validator script (1 day)

- `npm run assets:validate` — checks file existence, dimensions, duration, attribution
- Reports missing/wrong-size/oversized assets
- Integrates with CI — PRs that break the registry fail loudly

### 1.6.4 Batch-workflow scripts (1 day)

- `npm run assets:replace <category> <key> <file>` — auto-convert + place + update registry
- `npm run assets:status` — table of how many placeholders remain per category
- `npm run assets:bulk-mark-source` — for full-category commissions

### 1.6.5 Seed placeholders (1-2 days)

- AI-generate 9 leader portraits (Midjourney/Flux)
- Export 7 yield icons + 30-40 action/category/state icons (Figma/Illustrator/Figma Community)
- 12 civ silhouettes (AI or hand)
- 5 CC0 era music tracks (YouTube Audio Library / Free Music Archive)
- ~50 CC0 SFX (Kenney / Freesound)
- Drop into correct paths, validator passes clean

### Phase 1.6 deliverable

- Assets directory structured per spec
- Every category has at least a fallback
- Validator passes
- Real-enough placeholders so the game stops using emoji for UI chrome
- Replacement workflow documented + scripts working
- Artist/composer collaboration materials ready (registry + spec + reference)

**Scope note:** When commissioned assets arrive months later, the swap is ~3 minutes per asset via `npm run assets:replace`. No code refactor, no path hunting.

---

## Phase 2 — Always-visible + canvas viewport (2 weeks)

Unlocks the biggest per-click impact. Depends on Phase 1.

### 2.1 Canvas fills viewport + minimap split (1-2 days)

**Most of the canvas-resize work is now in Phase 1.5.2.** This step is what's LEFT after Phase 1.5 lands:

- Separately-rendered real minimap (~200×140 at standard, larger at wide+)
- Click-drag on minimap to pan, click-teleport, camera-frame indicator
- Minimap position: bottom-right at standard, potentially pinned into BottomBar at ultra
- Minimap-viewport decoupling from the main canvas

### 2.2 TopBar redesign — 4-5 days

Per `02-group-a-always-visible.md §A.1`:
- Left anchor: Turn + in-world date + era banner (material plaque)
- Middle: resource ledger with canonical colors, animated number transitions, hover-for-breakdown
- Right: End Turn as signature button (shape, glyph, pulse, badge)
- Move Tech/Civics/etc. out of TopBar → into BottomBar panel-access zone

### 2.3 BottomBar two-mode redesign — 4 days

- Default mode: stats + panel-access row + minimap
- Unit-selected mode: full unit dossier + contextual action palette
- Keyboard-reveal layer (hold SHIFT shows hotkeys) replaces ambient hint marquee

### Phase 2 deliverable

A playable game where the map FEELS like the game, the TopBar anchors attention on what matters, and the BottomBar gives contextual action access.

---

## Phase 3 — Tactical + hover UI (2 weeks)

Groups B + C. Mid-frequency but high-impact.

### 3.1 Tile tooltip unification (B.1) — 3 days

- Merge floating-tooltip + bottom-caption into one canonical cursor-anchored tooltip
- Compact tier + Alt-held detailed tier
- Stacked-entity cycle (Tab)
- Resource icons, yield breakdown, unit card on stacked hexes

### 3.2 Unit dossier + action palette (B.2) — 3 days

- Expanded BottomBar unit zone with HP / XP / promotions / action grid
- Settle-quality hint for Settlers
- Contextual action filtering by unit type

### 3.3 Notification system redesign (B.3) — 3 days

- Category-aware toasts (foundational / military / diplomatic / resource / warning)
- Auto-dismiss rules per category
- Sound cue per category
- Click-to-open-relevant-panel

### 3.4 CityPanel hero-layout (C.1) — 4 days

- Production hero with progress + "change production" action
- Compact resource ledger (using ResourceRow from design system)
- City hex-ring preview
- Buildings as slot visualizations

### Phase 3 deliverable

Every mid-frequency interaction feels game-like: hover tells a complete story, selecting a unit shows a proper dossier, founding a city gets a proper toast + sound, managing a city feels like commanding not spreadsheeting.

---

## Phase 4 — Strategic dashboards (3 weeks)

Group D. Low-frequency but each visit matters.

### 4.1 Shared TreeView component (D.1 + D.2) — 4 days

- `<TreeView>` with data-driven nodes, connectors, era-band separation
- Used by both TechTree and CivicsTree
- Zoom-to-fit for Antiquity era (no scroll)
- Hovered-tech detail persistent footer
- Current-research hero header

### 4.2 Government + Religion empty-state pattern (D.3 + D.4) — 3 days

- `<ProgressionRoadmap>` sub-component (from Phase 1.2)
- Pantheon grid for Religion, Policy-slot ghosts for Government
- Clickable "Open Civics Tree" bridges

### 4.3 Diplomacy overhaul (D.5) — 6-7 days

- Leader portraits (art-heavy — concurrent art track needed)
- Relationship gauge with labeled scale
- Recent-history visible per leader
- Sectioned action palette (establish / confront / formalize)
- Trade/deal sub-dialog

### 4.4 VictoryProgress ladders (D.6) — 3 days

- Per-victory-path columns
- Your rank + leading-civ indicator
- Turns-to-victory estimates

### Phase 4 deliverable

Every strategic panel is a dramatic choice-stage, not a spreadsheet. Tech/Civics share infrastructure. Diplomacy has portraits.

---

## Phase 5 — Moment-of-drama modals (2-3 weeks)

Group E. Rare but memorable.

### 5.1 `<DramaModal>` shell (E-architectural) — 3 days

Distinct from `<PanelShell>`. Full-screen (or near) with:
- Background-art slot
- Headline typography
- Scene-setting animations
- Sound-cue hooks

### 5.2 SetupScreen redesign (E.1) — 5 days + art

- Real leader portraits (9 leaders × art budget)
- Real civ glyphs (12 civs × art budget)
- Selected-leader hero card
- Background scene
- Condensed options row

### 5.3 AgeTransition ceremonial modal (E.2) — 4 days + art

- Full DramaModal treatment
- Era background / transition animation
- Legacy bonus visualization
- 3-card civ-choice reveal

### 5.4 Crisis cards (E.3) — 4 days + art

- Per-crisis illustration (plague, invasion, disaster, golden age, trade op)
- Headline + flavor paragraph
- Choice cards with visible consequences

### 5.5 TurnSummary dockable panel (E.4) — 3 days

- Shift from modal to slide-in dockable
- Category grouping
- Click-log-entry-to-pan-camera

### 5.6 VictoryPanel ceremony (E.5) — 5 days + art

- Win/lose headline
- Civ-banner + portrait
- Scoring breakdown
- Timeline of memorable moments
- Background celebratory/somber

### Phase 5 deliverable

Every dramatic interruption earns its place. A player WILL screenshot the VictoryPanel.

---

## Phase 6 — Meta chrome cleanup (1 week)

Group F. Last because it's lowest frequency.

- Help panel: Reference + Tips modes + in-context ? jumps (3 days)
- AudioSettings: wire test buttons + 5-category sliders (1-2 days)
- EventLog: filters + search + click-to-pan (3 days)
- AchievementsPanel: finish wiring OR revert (depends on roadmap decision)

---

## Phase 7 — Systems polish / juice pass (ongoing, 2+ weeks)

After functional redesign is done, the pass that adds the feel:

- Animation curves across every panel entry/exit
- Sound-cue wiring audit (every state change has audio)
- Hover/focus states on every interactive element
- Loading states on async actions (AI turn)
- Error states when network/save fails
- Accessibility pass (focus rings, aria, keyboard coverage)

---

## Sequence at a glance

```
Week 1:     Phase 0 quick wins + Phase 1 tokens start + Phase 1.5 start + Phase 1.6 registry
Week 2-3:   Phase 1 shared components (main) + Phase 1.5 layout arch + Phase 1.6 pipeline (all parallel)
Week 4:     Phase 1/1.5/1.6 all wrap; seed placeholder assets in place
Week 5-6:   Phase 2 canvas (simpler now, builds on 1.5) + TopBar + BottomBar
Week 7-8:   Phase 3 tile tooltip + unit dossier + notifications + CityPanel
Week 9-11:  Phase 4 TreeView + strategic panels + Diplomacy (portraits drop in via 1.6)
Week 12-14: Phase 5 DramaModal + Setup + AgeTransition + Crisis + Victory (art drops via 1.6)
Week 15:    Phase 6 meta chrome
Ongoing:    Phase 7 juice pass + asset swaps as commissioned work arrives
```

**Net effect of Phase 1.5 + 1.6:** Phase 2 is slightly shorter (responsive infra already done) and every subsequent surface just-works with placeholder assets. Total timeline still ~14-15 weeks.

**Fastest "looks totally different" milestone:** end of Week 6 (Phase 2 complete), and this time it works at ANY viewport AND uses real icons/portraits instead of emoji.

**Complete redesign milestone:** end of Week 14-15. Every surface reviewed, every surface adapts to narrow/standard/wide/ultra viewports, every asset is either final or placeholder-with-clear-upgrade-path.

**Asset swap timeline (concurrent, unblocked by code work):**
- Any week after Phase 1.6 completes (end of Week 4), commissioned assets can land via `npm run assets:replace` with zero code changes. The game's LOOK progressively upgrades during Weeks 5-14 as final assets arrive — even if the art commissions take months to complete.

---

## Risks and mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Art budget slips (portraits, icons, backgrounds) | High | Concurrent art track from Day 1; Phase 1 Section 1.3 isn't blocked on code |
| Design-system scope creeps | Medium | Hold Phase 1 to the ~10 sub-components listed. Additions queue for later |
| Phase 2 viewport fix breaks existing canvas hover | Low | Layer on top; run `/verify` after each change |
| Redesigns break accessibility | Medium | Phase 7 accessibility pass catches; in the meantime, keep existing aria patterns |
| Players hate the new look | Medium-low | Ship behind a feature flag / legacy-UI toggle; keep current as fallback for 1-2 versions |

---

## If budget is constrained — top-6 ship list

If only 6 items ship, pick these for maximum perceived quality lift:

1. **Phase 0 quick wins** (notification auto-dismiss, end-turn pulse, etc.) — 2 days
2. **Phase 1.5 layout architecture** (viewport-class detection + responsive canvas + panel dock rules) — 1 week
3. **Phase 1.6 asset pipeline** (registry + loader + validator + seed placeholders) — 1 week
4. **Phase 2.2 TopBar redesign** (responsive-first, using new asset loader) — 4-5 days
5. **Phase 3.3 notification system** — 3 days
6. **Phase 3.4 CityPanel hero layout** (responsive-first) — 4 days

Total: ~4-5 weeks. The game feels dramatically different **at every viewport size, with real icons instead of emoji, and every future asset upgrade is drop-in**. Everything else compounds gradually after.

**Why Phase 1.6 is in the top-6:** without it, every later upgrade (commissioned portraits, bespoke music, icon set) requires hunting through code to replace paths. Phase 1.6 pays off for the entire life of the project. Cheap if done upfront, costly to retrofit.

**Important change vs earlier top-5:** the old list had "canvas fills viewport" as a standalone 3-day item. With Phase 1.5 as the foundation, canvas-fills-viewport is already done (Phase 1.5.2). Phase 1.6 added because asset-pipeline-as-a-retrofit is painful; as-a-foundation is trivial.

---

## Open questions / decisions for user

Before committing to work, confirm:

1. **Art budget?** Leader portraits (Diplomacy, Setup) and crisis illustrations are the biggest spend. Can be commissioned, AI-generated, or deferred (keep silhouettes).
2. **Sound budget?** Wiring to CC0 library cheap; bespoke commissioned sound more expensive.
3. **Keep / revert Achievements?** See F.4 — decide before Phase 0.
4. **Civ VII aesthetic** (warm / parchment / bronze) vs **Civ VI aesthetic** (vibrant / illustrated / stylized) vs **Shadow Empire** (hard sci-fi / brutalist) vs something original? Affects token palette choices in Phase 1.
5. **Music system?** Currently silent (based on AudioSettings panel). Phase 7 should wire music per era. Budget it early.
6. **Mobile/touch support?** If yes, interaction-economics rules change (larger targets, no hover). Assume desktop-only for now unless confirmed.
7. **Target viewport classes?** I've proposed 4 (narrow/standard/wide/ultra). If you want to drop narrow (≤1366 — rare on modern desktops) that simplifies Phase 1.5 by ~20%. If you want portrait / mobile added, Phase 1.5 roughly doubles in scope.
8. **Do high-end viewports (ultra, 2560+) get "more info visible" or just "same things bigger"?** My recommendation is MORE info (a persistent EventLog, permanent unit dossier, strategic ribbon in TopBar) but that's more work. The cheaper path is same-layout-but-scaled, which the user has already implicitly rejected ("looks better but still bad").

Once those eight are decided, Phase 1 + 1.5 start with zero uncertainty.
