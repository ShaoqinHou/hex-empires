---
title: Systems-design overview
purpose: Map of the 10 systems-design docs, how they interlock, and the order an implementer follows
created: 2026-04-18
---

# Systems design — overview

The 10 systems docs (S-01 through S-10) define the **layout layer** of the UI: where elements live, how big they are, what's transparent, how they stack on the map, how they dismiss, how they animate, how they're focused, how they respond to interaction, and how multiple surfaces coexist.

They exist BEFORE panel-specific redesigns (Groups A-F in the review docs). That order matters: panels are instances of the system; if the system is unclear, per-panel work reinvents the rules ad-hoc and drift accumulates.

## The 10 systems at a glance

| ID | Title | What it owns | Depends on |
|---|---|---|---|
| [S-01](S-01-layer-and-zindex.md) | Layer & z-index | The complete z-order from map canvas to critical dialogs; 15-rung scale; pointer-events policy per layer | — |
| [S-02](S-02-position-anchoring.md) | Position anchoring | The 4 anchor types (cursor / entity / screen / dock); viewport-class dock behavior; collision priority | S-01 |
| [S-03](S-03-sizing-table.md) | Sizing table | Spacing / type / icon scales; per-element sizing tables across 3 viewport classes; density tokens; click-target minimum | S-01 |
| [S-04](S-04-transparency-semantics.md) | Transparency semantics | 16 semantic opacity tokens; ghost convention; modal backdrop; what may NOT use alpha | — |
| [S-05](S-05-map-entity-stacking.md) | Map entity stacking | The user's flagged case — scout+troop+city+building on one hex. 15-level z within hex, primary/secondary sprite, Tab cycling, right-click context menu, city-wins-default panel rule | S-01, S-02, S-06, S-10 |
| [S-06](S-06-occlusion-and-dismissal.md) | Occlusion & dismissal | Occlusion matrix (who hides whom); ESC precedence chain; auto-dismiss rules per category; click-outside rules | S-01, S-02 |
| [S-07](S-07-motion-and-animation.md) | Motion & animation | 5 duration tokens + 5 easing curves; per-element motion contracts; asymmetric count-up; reduced-motion collapse | S-03, S-04 |
| [S-08](S-08-focus-and-keyboard.md) | Focus & keyboard nav | Complete shortcut map; 3 input modes; focus-ring canonical style; conflict resolutions (Shift-prefix for lower-frequency) | S-06 (ESC chain) |
| [S-09](S-09-state-transitions.md) | State transitions | 9-state canonical set per interactive element; per-element visual spec; loading / success-flash / error-flash feedback | S-04, S-07, S-08 |
| [S-10](S-10-multi-surface-interaction.md) | Multi-surface interaction | Panel+panel by viewport class; modal chain with priority; focus routing; save/restore on modal interrupt | S-01, S-02, S-06, S-08 |

## How they interlock

Imagine a single hex-click interaction — opening a city panel while a tooltip was showing a unit:

1. **S-08** routes the click (was it keyboard or mouse?) and which element receives focus.
2. **S-05** decides which entity becomes selected when the hex has both a city and a unit (city wins by default).
3. **S-10** coordinates: the CityPanel opens as an overlay; any open overlay panel closes first.
4. **S-02** anchors the CityPanel to the right dock, at the width S-03 prescribes for this viewport class.
5. **S-01** assigns z-indexes: tooltip at 70, CityPanel at 50.
6. **S-06** dismisses the tooltip because the panel's opening at the same entity anchor.
7. **S-07** plays the panel-open motion (slide-in 240ms ease-out); the tooltip fades 80ms.
8. **S-04** applies the panel's background opacity (0.96) and darkens the canvas behind.
9. **S-09** transitions the city sprite from `default` to `selected`; the hex shows its selection ring; any button in the panel is in `default` until hovered.

Nine systems participating in one click. When they agree, it feels seamless. When they disagree (today's state), it feels buggy.

## Implementation order (cross-reference to master plan)

The 10 docs mostly land in Phases 1.1-1.5 of `08-master-plan.md`:

### Phase 1.1 — Design-system foundations

Lands the token sheets. Dependencies flow:
- `layer-tokens.css` (S-01) first — has no dependency
- `spacing-tokens.css` + `type-tokens.css` + `icon-tokens.css` + `density-tokens.css` (S-03) — no deps
- `opacity-tokens.css` (S-04) — no deps
- `motion-tokens.css` (S-07) — no deps
- `state-tokens.css` (S-09) — consumes S-04 (opacity) + S-07 (motion) + S-08 (focus-ring)
- `focus-tokens.css` (S-08) — no deps

Order in Phase 1.1: S-01, S-03, S-04, S-07, S-08 in parallel (independent); S-09 after S-04+S-07+S-08.

### Phase 1.5 — Layout architecture

Lands the responsive layer and dismissal infrastructure:
- Viewport-class hook (S-02 + `08-master-plan.md` 1.5.1)
- Canvas responsive fill (S-02 1.5.2)
- Panel dock behavior + multi-slot extension (S-02 + S-10)
- OverlayCoordinator + ESC chain (S-06)
- PanelManager extended for multi-panel at wide+ (S-10)

Order: S-02 first (foundation for everything positional), S-06 second (needs S-02), S-10 third (needs S-02 + S-06).

### Phase 2.1 — Canvas rendering

Lands the map-rendering side of S-05:
- Layered-hex rendering (15-level z within hex)
- Primary/secondary sprite slots
- Stack-count badges
- State-overlay badges
- Selection ring atop

### Phase 3.1 — Tile tooltip + HUD coordination

Lands the HUD side of S-05 + integrates with S-06 dismissal:
- TooltipShell compact/detailed tiers
- Tab cycling via HUDManager.advanceCycle
- Stack summary line
- tileContextMenu HUD for right-click (new hudRegistry entry)

### Phase 3 onward — apply systems to each panel

Once the tokens + responsive layer + rendering primitives exist, each panel redesign (Group A through F in the review docs) consumes them. No new per-panel systems invented.

## Cross-ref matrix (who references whom)

| From | References |
|---|---|
| S-01 | — |
| S-02 | S-01 (z-index), S-03 (sizes at anchors), S-06 (anchor-based dismissal) |
| S-03 | S-01 (no impact on z), S-04 (opacity doesn't change size), S-07 (motion doesn't resize), S-09 (states don't affect layout) |
| S-04 | S-01 (orthogonal), S-09 (transitions between opacity states) |
| S-05 | S-01 (z-stack), S-02 (tooltip anchor), S-04 (fog + hint alpha), S-06 (tooltip dismiss), S-07 (cycle-advance motion), S-08 (Tab routing), S-09 (hover+select states), S-10 (panel-opening) |
| S-06 | S-01 (layer-based suppression), S-02 (same-anchor conflicts), S-07 (dismiss animations), S-10 (modal-over-panel) |
| S-07 | S-01 (no z-change mid-anim), S-02 (no re-anchor), S-03 (static dims), S-04 (endpoint opacity), S-05 (cycle crossfade), S-06 (dismiss timing), S-08 (focus-ring motion), S-09 (transition durations), S-10 (orchestration staggers) |
| S-08 | S-06 (ESC chain), S-07 (focus-ring motion), S-09 (focus-visible state), S-10 (focus routing) |
| S-09 | S-04 (disabled opacity), S-07 (timing), S-08 (focus-visible), S-10 (loading precedence) |
| S-10 | S-01 (z-layers), S-02 (dock behavior), S-06 (dismiss chain), S-08 (focus routing) |

S-07 has the most outbound references (9) — motion touches everything. S-01 has the most inbound (7) — layering is foundational. S-02 sits in the middle, with both inbound and outbound references.

## Aggregate stats

- **10 docs**, ~280 KB total, ~42,000 words
- **~130 tokens proposed** across layer, spacing, typography, icon, opacity, motion, focus, state, and density
- **~20 new or extended sub-components** referenced (SectionHeader, ResourceRow, ProgressBar, EmptyState, EntityCard, ActionPalette, ProgressionRoadmap, RelationshipGauge, KeyboardHint, StatChip, Portrait, TreeView, DramaModal, AssetRegistry, loader, OverlayCoordinator, ModalBackdrop, Button, Card, Toggle, Slider, Tab)
- **~80 open questions** flagged for user decision across the 10 docs
- **Implementation estimate**: ~8-10 weeks concentrated in Phases 1.1-1.5, then fan-out across Phases 2-7 of the master plan

## What the user decides before Phase 1 starts

Beyond the 8 decisions in `08-master-plan.md §Open questions`, the systems docs surface these (not exhaustive — see each doc's Open Questions section):

**Immediate (block Phase 1.1):**

1. **S-01** — Merge existing `panel-z-*` and `hud-z-*` under one scale, or keep them as namespaced aliases? (Recommendation: aliases.)
2. **S-03** — Confirm narrow viewport dropped + Inter + Cormorant Garamond OFL fonts acceptable. (Recommendation: yes.)
3. **S-04** — Tint calibration: 0.08 vs 0.10 vs 0.12 for panel-tint against the warm-earth palette. Needs a visual sample.
4. **S-07** — Reduced-motion default on / off; screen-shake on / off by default.
5. **S-08** — Bindings for A key: Attack vs Achievements. (Recommendation: Attack; achievements = Shift+A.)
6. **S-09** — Click-target minimum: hard 32x32 enforcement level.

**Soon (before Phase 1.5):**

7. **S-05** — Primary-entity rule: city-wins-default vs unit-wins-default on city hexes. Major UX debate.
8. **S-05** — Right-click convention: context menu or direct-attack. Check current bindings.
9. **S-10** — Modal queue vs interrupt policy. (Recommendation: critical interrupts, others queue.)

**Deferred (before Phase 2):**

10. **S-05** — Wonder rendering at city-hex: replace city art vs integrate.
11. **S-02** — Multi-monitor seam handling at ultra-wide. (Defer until hardware testing.)

Answers to 1-6 unblock Phase 1.1 (tokens). Answers to 7-9 unblock Phase 1.5 (layout arch). 10-11 can wait.

## After all 10 systems are implemented

The game's layout layer is deterministic. Any new panel:
1. Declares its priority (overlay / info / modal / drama)
2. Declares its anchor (dock / entity / screen)
3. Consumes sizing / opacity / motion / state tokens
4. Gets correct behavior across viewport classes for free
5. Has predictable focus/keyboard, ESC, dismissal, stacking

The next ten panels / HUDs / crises take ~60% less time than the first ten, because the system does the boring work.

The **asset swap** guarantee (`09-asset-pipeline.md`) combined with the **systems layer** (these 10 docs) means:
- Replacing a leader portrait: 3 minutes (pipeline)
- Changing a panel's internal layout: token-swap (systems)
- Adding a new panel type: ~1 day using primitives (systems)

That's the goal state. The work between here and there is `08-master-plan.md`.
