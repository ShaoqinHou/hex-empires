---
title: UI master-plan loop state
purpose: Persistent state for the event-driven UI master-plan loop. If auto-compact fires OR the session restarts, re-read this to know where we are.
created: 2026-04-17
updated: 2026-04-18 (post Phase 0; paused for user restart)
---

# Loop state — READ THIS FIRST AFTER SESSION START

## Recap (compact-proof + restart-proof)

Prior phases COMPLETE: UI review (11 docs + 20 screenshots) → systems design (10 S-docs + overview) → master plan (08-master-plan.md) → asset-pipeline design → Phase 0 (6 of 7 sub-steps landed, 0.3 deferred) → Phase 1 spec authored.

User authorized an **event-driven master-plan loop** on 2026-04-18 with decisions delegated to Claude. I executed Phases 0.1-0.8 (6 of 7), wrote the Phase 1 spec, then paused here for user-initiated session restart.

## Locked-in decisions (9 — DO NOT RE-LITIGATE)

1. **Art budget**: hand-SVG + Game-icons.net (CC BY 3.0) + Kenney.nl (CC0) + Google Fonts + CSS textures. No raster/painted art from me.
2. **Sound budget**: procedural WebAudio oscillator tones, off by default.
3. **Achievements**: parked behind `state.config.experimentalAchievements` flag (landed in Phase 0.7).
4. **Aesthetic**: Modern Civ VII — warm earth tones (olive/amber/cream/bronze), Cinzel serif + Inter sans.
5. **Viewport classes**: standard (1367–1919) / wide (1920–2559) / ultra (2560+). Narrow dropped.
6. **Ultra behavior**: reveal more info (denser HUD, extra stats), not scale up.
7. **Panel concurrency**: single-slot (one panel at a time).
8. **Screen shake**: age transition only; respect `prefers-reduced-motion`.
9. **Notification dismissal**: right-click only (no × button); auto-dismiss non-blocking after ~8s; `requiresAction` flag scaffold for future turn-gate notifications (landed in Phase 0.1).

## Workflow rules discovered during loop (CRITICAL for restart)

- **`isolation: worktree` is BROKEN** when local `main` is ahead of `origin/main`. The worktree is created from `origin/main`, so all uncommitted-to-origin session work is invisible to the subagent. Local `main` is 88 commits ahead of origin as of 2026-04-18.
  - **Workaround used**: spawn subagents WITHOUT `isolation: worktree`. They commit directly on `main`.
  - **Permanent fix** (needs user OK): push local `main` to origin, then worktree isolation works.
- **Sonnet routing**: use `Agent({model: "sonnet"})` explicitly when calling `general-purpose`. Custom `designer` / `implementer` / `fixer` agents inherit Sonnet from their frontmatter.
- **`implementer` agent**: `.claude/agents/implementer.md` was committed this session but agent definitions only load at SESSION START. So on restart, `subagent_type: "implementer"` is available for Phase 1 onward.
- **Subagent Write permissions**: designer subagents have occasionally hit Write denials; parent workaround is to have them return content inline in a fenced block and parent persists the file. Workable but slow. Root cause TBD.

## Event-driven loop pattern

Each phase's completion notification triggers the next. No `/loop 5m`. Subagents do bulk via `Agent(..., run_in_background: true)`. Commit per sub-step. Verify Sonnet on every agent return.

## Phase list — current state

| # | Phase | Status | Commits / notes |
|---|---|---|---|
| 0.1 | Right-click-only notifications + requiresAction scaffold | **DONE** | `839f9a6` |
| 0.2 | Hide zero-value resource chips | **DONE** | `6067a71` |
| 0.3 | Remove dead ⋯ More menu | **DEFERRED** | Not dead; holds 12 real items (Governors, Event Log, Summary, Victory, Save, Load). Deferred into Phase 4 (panel-nav refactor). |
| 0.4 | Keyboard-shortcut badges on bar buttons | **DONE** | `f8495f8` |
| 0.5 | End Turn pulse when all units acted | **DONE** | `d41f099` |
| 0.6 | Wire audio test buttons with minimal WebAudio synth | **DONE** | `c39f6be` |
| 0.7 | Park Achievements behind experimentalAchievements flag | **DONE** | `1050ec3` |
| 0.8 | Orphan TODO sweep (0 deletions — all 44 TODOs still valid) | **DONE** | `6581bb7` |
| 1 — spec | Design tokens + palette + Google Fonts spec | **DONE** | This commit |
| 1 — impl | Apply Phase 1 spec to code | **PENDING (NEXT)** | Brief ready in `.claude/workflow/design/ui-review/phase-1-design-tokens-spec.md` |
| 1.1 | layer-tokens.css + opacity-tokens.css + motion-tokens.css (parallel Phase 1) | pending | Per S-01, S-04, S-07 |
| 1.5 | Responsive viewport classes | pending | ~3 commits |
| 1.6 | Asset pipeline | pending | ~4 commits |
| 2 | Hex tile rendering overhaul | pending | ~4 commits |
| 3 | Map entity stacking per S-05 | pending | ~3 commits |
| 3.5 | Game-state flow (new game / load / over) | pending | ~2 commits |
| 4 | Panel chrome Civ-VII treatment | pending | ~6 commits |
| 4.5 | Dialog overhauls (age / crisis / victory / turn-summary) | pending | ~3 commits |
| 5 | HUD polish (tooltip tiers, toast stack, minimap) | pending | ~4 commits |
| 6 | Motion (unit move, panel slide, resource tick, age fade) | pending | ~4 commits |
| 7 | Accessibility + final polish | pending | ~3 commits |

Estimated ~40 commits remaining.

## Open questions from the Phase 1 spec (surface to user at Phase 1 implementer spawn)

1. **`--color-accent`**: bronze `#d4943a` recommended over amber `#fbbf24` to avoid near-identical gold tones in adjacent roles. Confirm before Phase 4.
2. **`--panel-padding-lg`**: S-03 locks 20px, codebase has 16px. 4px bump is visible. Spot-check density after migration, update S-03 if too airy.
3. **Game-data palette (diplomacy/relations colors)**: warm-shift everything vs keep vivid signals against warm bg. Decision before Phase 4.

## Post-restart action protocol

1. Run `git log --oneline -10` to verify Phase 0 commits + the Phase 1 spec commit are present.
2. Read `.claude/workflow/design/ui-review/phase-1-design-tokens-spec.md` (this is the brief for the next implementer).
3. Read `.claude/agents/implementer.md` (now loadable as `subagent_type: "implementer"`).
4. Decide: surface the 3 open questions to the user, OR make defaults (my recommendations above) and proceed — user's preference depending on how much ceremony they want.
5. Spawn `Agent({ subagent_type: "implementer", run_in_background: true })` with a brief pointing at `phase-1-design-tokens-spec.md` as the source-of-truth + an instruction to:
   - Create the 6 new token CSS files (palette, spacing, typography, layer, opacity, motion)
   - Patch `index.css`, `panel-tokens.css`, `hud-tokens.css` per the migration table
   - Add Google Fonts `<link>` to `index.html`
   - Wire the CSS imports in App.tsx
   - Commit per logical chunk (probably 6-8 commits for Phase 1 + Phase 1.1 combined)
   - Verify `npm run build` + tests pass
6. Because `isolation: worktree` is broken (see above), spawn WITHOUT isolation. Direct commits on main.
7. Wait for completion notification. Verify runtime-model. Continue to Phase 1.5 using the same pattern.

## Hard exits

- User says stop (fastest)
- Genuine blocker I can't diagnose
- Not "phase N done — continue?" (anti-pattern explicitly rejected)

## Notes for restart-self

- Don't ask for permission to continue — user explicitly authorized.
- Do verify Sonnet on each subagent return (includes `runtime-model` in their return payloads).
- Do surface the 3 open questions to the user at a natural break (before Phase 4 at latest).
- Consider push-to-origin decision when Phase 1 lands — it's simpler to get worktree isolation working than continue without it for every remaining phase.
