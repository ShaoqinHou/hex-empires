---
title: UI master-plan loop state
purpose: Persistent state for the event-driven UI master-plan loop. If auto-compact fires, re-read this to know where we are.
created: 2026-04-17
updated: 2026-04-18
---

# Loop state — read this first after any compact

## Context recap (compact-proof)

Prior phase (UI review + systems design) is COMPLETE. 11 ui-review docs + 10 systems docs + 00-overview + 08-master-plan — all committed.

User authorized an **event-driven** master-plan loop on 2026-04-18 with explicit decisions delegated to Claude. I am now executing Phases 0 → 7.

## Locked-in decisions (from prior session + 2026-04-18 brief — DO NOT RE-LITIGATE)

1. **Art budget**: hand-SVG + Game-icons.net (CC BY 3.0) + Kenney.nl (CC0) + Google Fonts + CSS textures. No raster/painted art from me. Pipeline is ready for user to drop in PNGs later.
2. **Sound budget**: procedural WebAudio oscillator tones, off by default, stubs for later replacement.
3. **Achievements**: park behind `state.config.experimentalAchievements` flag, hidden by default.
4. **Aesthetic**: Modern Civ VII — warm earth tones (olive, amber, cream, bronze), Cinzel serif + Inter sans.
5. **Viewport classes**: standard (1367–1919) / wide (1920–2559) / ultra (2560+). Narrow dropped.
6. **Ultra behavior**: reveal more info (denser HUD, extra stats), not scale up.
7. **Panel concurrency**: single-slot (one panel at a time).
8. **Screen shake**: age transition only; respect `prefers-reduced-motion`.
9. **Notification dismissal**: right-click only (no X button), auto-dismiss non-blocking after ~8s, `blocking` flag for future turn-gate notifications.

## Event-driven loop — how this works

Each phase's completion notification triggers the next. No `/loop 5m`, no time-sliced agents. Subagents do bulk work via `Agent(..., run_in_background: true)` when scope justifies; small edits I do inline. Commit per sub-step so interruption costs ≤ 1 step.

## Phase list

| # | Phase | Status | Notes |
|---|---|---|---|
| 0.1 | Right-click-only notifications + blocking flag | **in_progress** | removing X button; add blocking field |
| 0.2 | Hide zero-value resource chips | pending | |
| 0.3 | Remove dead ⋯ More menu | pending | |
| 0.4 | Keyboard-shortcut badges on bar buttons | pending | |
| 0.5 | End Turn pulse when all units acted | pending | |
| 0.6 | Wire or remove audio test buttons | pending | |
| 0.7 | Park Achievements behind experimentalAchievements flag | pending | |
| 0.8 | Orphan TODO sweep | pending | |
| 1 | Design tokens (spacing/type/z-index/opacity/motion) + palette + Google Fonts | pending | ~4 commits |
| 1.5 | Responsive viewport classes | pending | ~3 commits |
| 1.6 | Asset pipeline | pending | ~4 commits |
| 2 | Hex tile rendering overhaul | pending | ~4 commits |
| 3 | Map entity stacking per S-05 | pending | ~3 commits |
| 3.5 | Game-state flow (new game/load/over) | pending | ~2 commits |
| 4 | Panel chrome Civ-VII treatment | pending | ~6 commits |
| 4.5 | Dialog overhauls (age/crisis/victory/turn-summary) | pending | ~3 commits |
| 5 | HUD polish (tooltip tiers, toast stack, minimap) | pending | ~4 commits |
| 6 | Motion | pending | ~4 commits |
| 7 | Accessibility + final polish | pending | ~3 commits |

Estimated ~45-55 commits total.

## Checkpoints where to ping user

- End of Phase 0 — verify feel (right-click dismiss especially)
- End of Phase 1 — new visual baseline
- End of Phase 1.5 — resize window, check layout shifts
- End of Phase 3 — concrete scout+troop+building answer
- End of Phase 3.5 — new-game / save-load flow (gameplay-critical)
- End of Phase 4.5 — age-transition flow (gameplay-critical)
- Any decision my defaults don't cover

## Hard exits

- User says stop
- Genuine blocker I can't diagnose (pause + ask, don't end)
- Not "phase N done — continue?" (anti-pattern explicitly rejected)

## Next action after compact

1. Run `git log --oneline -10` to see what's landed
2. Check this file's status table — work the next pending item
3. Commit per sub-step
4. Update this table
5. Continue

Don't ask. User authorized. Only stop on genuine blocker or completion.
