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

## Phase 2 — Always-visible + canvas viewport (2 weeks)

Unlocks the biggest per-click impact. Depends on Phase 1.

### 2.1 Canvas fills viewport (H-1 fix) — 3 days

- Canvas resize + layout change so hex map occupies the viewport minus TopBar / BottomBar / active-right-column
- Introduce a separately-rendered real minimap (~200×140) docked bottom-right
- Click-drag on minimap to pan, click-teleport, camera-frame indicator

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
Week 1-2:   Phase 0 quick wins + Phase 1 tokens start
Week 3-4:   Phase 1 shared components + art + audio foundations
Week 5-6:   Phase 2 canvas + TopBar + BottomBar
Week 7-8:   Phase 3 tile tooltip + unit dossier + notifications + CityPanel
Week 9-11:  Phase 4 TreeView + strategic panels + Diplomacy
Week 12-14: Phase 5 DramaModal + Setup + AgeTransition + Crisis + Victory
Week 15:    Phase 6 meta chrome
Ongoing:    Phase 7 juice pass
```

**Fastest "looks totally different" milestone:** end of Week 6 (Phase 2 complete). A brand-new player at Week 6 would see a completely different-feeling game, even though most panels still look mid-work.

**Complete redesign milestone:** end of Week 14. Every surface reviewed.

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

## If budget is constrained — top-5 ship list

If only 5 items ship, pick these for maximum perceived quality lift:

1. **Phase 0 quick wins** (notification auto-dismiss, end-turn pulse, etc.) — 2 days
2. **Phase 2.1 canvas fills viewport** — 3 days  
3. **Phase 2.2 TopBar redesign** — 4-5 days
4. **Phase 3.3 notification system** — 3 days
5. **Phase 3.4 CityPanel hero layout** — 4 days

Total: ~3 weeks. The game feels dramatically different. Everything else compounds gradually after.

---

## Open questions / decisions for user

Before committing to work, confirm:

1. **Art budget?** Leader portraits (Diplomacy, Setup) and crisis illustrations are the biggest spend. Can be commissioned, AI-generated, or deferred (keep silhouettes).
2. **Sound budget?** Wiring to CC0 library cheap; bespoke commissioned sound more expensive.
3. **Keep / revert Achievements?** See F.4 — decide before Phase 0.
4. **Civ VII aesthetic** (warm / parchment / bronze) vs **Civ VI aesthetic** (vibrant / illustrated / stylized) vs **Shadow Empire** (hard sci-fi / brutalist) vs something original? Affects token palette choices in Phase 1.
5. **Music system?** Currently silent (based on AudioSettings panel). Phase 7 should wire music per era. Budget it early.
6. **Mobile/touch support?** If yes, interaction-economics rules change (larger targets, no hover). Assume desktop-only for now unless confirmed.

Once those six are decided, Phase 1 starts with zero uncertainty.
