---
title: Systems-design loop state
purpose: Persistent state for the systems-level design loop. If auto-compact fires, re-read this to know where we are.
created: 2026-04-17
---

# Loop state — read this first after any compact

## Context recap (compact-proof)

The user has asked for systems-level UI design docs. Goal: design the LAYOUT LAYER so that future work is mostly asset swaps. Covers positioning, sizing, transparency, z-order, multi-entity stacking (scout + troop + building on same hex), occlusion, motion, focus, state transitions, multi-panel coordination.

Prior phase (UI review) is COMPLETE. See `.claude/workflow/design/ui-review/00-philosophy.md` through `09-asset-pipeline.md` — 11 docs, 20 screenshots, committed.

## Locked-in decisions (from prior session — DO NOT RE-LITIGATE)

1. Art budget: AI-gen now + commission heroes later
2. Sound budget: CC0 SFX + freelance OST
3. Achievements: park (not revert) until Phase 6
4. Aesthetic: Modern Civ VII (olive/amber/cream/bronze, restrained texture, serif for drama + sans for density)
5. Music: wire manager now, real OST later
6. Mobile: desktop-only, drop touch
7. Viewport classes: standard (1367-1919) / wide (1920-2559) / ultra (2560+); narrow dropped
8. Ultra behavior: MORE info visible, not same-info-bigger

## Continuous mode active

User directive: "i want u to do a non stop session/keep going/loop cycles" + "full auto and u as the lead should relys on others".

Meaning: delegate heavily to subagents, write to disk, commit per-doc, don't stop for confirmation between systems docs.

## Task list — 10 systems docs

Each gets a subagent. Each produces a doc in `.claude/workflow/design/ui-review/systems/`. Each committed immediately on completion (Skip-Review trailer since docs-only).

| ID | Title | Status | Commit |
|---|---|---|---|
| S-01 | Layer & z-index system | **DONE** | 8b01c70 |
| S-02 | Position anchoring rules | **DONE** | 436e618 |
| S-03 | Sizing table per element per viewport | **DONE** | 436e618 |
| S-04 | Transparency & opacity semantics | **DONE** | 436e618 |
| S-05 | Map entity stacking (scout + troop + building, etc.) | **DONE** | ca9ca81 |
| S-06 | Occlusion & dismissal rules | **DONE** | 436e618 |
| S-07 | Motion & animation contracts | **DONE** | 436e618 |
| S-08 | Focus & keyboard navigation flow | **DONE** | 436e618 |
| S-09 | State transitions (hover/press/active/disabled/loading) | **DONE** | ca9ca81 |
| S-10 | Multi-surface interaction (panel+panel, panel+modal, HUD+HUD) | **DONE** | b214e35 |
| 00-overview.md | Map + interlock + implementation order | **DONE** | pending |

## After all 10 land

- Write `systems/00-overview.md` summarizing the 10 docs + how they interrelate
- Update `08-master-plan.md` to reference the systems docs as Phase 1 dependencies
- Commit the summary + update
- Report back to user: all done, ready to start Phase 0 work whenever they are

## Subagent prompt template (use for each)

```
You are designing the <S-XX> <title> for hex-empires UI.

CONTEXT TO READ FIRST (in order):
1. .claude/workflow/design/ui-review/00-philosophy.md — the 12 principles incl. responsive + system-first
2. .claude/workflow/design/ui-review/01-holistic-audit.md — holistic violations incl. H-<relevant>
3. .claude/rules/panels.md + ui-overlays.md — existing PanelShell / HUDManager contracts
4. .claude/workflow/design/ui-review/systems/_loop-state.md — the 8 locked decisions
5. Any existing systems docs already written (look in the systems/ dir)
6. The specific surfaces reviewed in .claude/workflow/design/ui-review/02-group-*.md — for real-world grounding
7. packages/web/src/ui/panels/PanelShell.tsx + packages/web/src/ui/hud/ (actual shell code, for constraint awareness)

DELIVERABLE: .claude/workflow/design/ui-review/systems/S-XX-<kebab-title>.md

FORMAT: YAML frontmatter + prose sections. Match the style of existing review docs (02-group-a-always-visible.md is a good reference for structure).

LENGTH: 1500-3500 words. Specific enough that an implementer doesn't need to guess.

REQUIRED SECTIONS:
- Purpose (why this system matters)
- Scope (what it covers, what it doesn't)
- Current state (what's in the codebase today, if anything)
- The system (rules, tables, specs)
- Examples (how surfaces adhere; concrete cases)
- Interaction with other systems (cross-references to other S-XX)
- Implementation phase (which Phase in 08-master-plan.md this lands in)
- Open questions (anything the user needs to decide)

AESTHETIC: Modern Civ VII — warm earth tones (olive, amber, cream, bronze), selective texture, serif headings + sans body, tabular numerics. Don't reinvent; align with what's been decided.

OUTPUT STRATEGY: write the doc in full, don't summarize. When complete, return a ~200-word report: what you wrote, key recommendations, any cross-refs that need to happen.
```

## Next action after compact

If you're reading this fresh (post-compact):
1. Run `git log --oneline -5` to see the most recent commits
2. Look at the "Status" column in the task table above — whatever's not done is next
3. Spawn a subagent with the template above, substituting the next pending S-XX
4. Commit on completion
5. Update this file's status column
6. Continue

Don't ask the user; they've authorized continuous mode. Only stop if a genuinely ambiguous choice arises OR all 10 docs are complete.
