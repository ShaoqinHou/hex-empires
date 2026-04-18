---
title: UI master-plan loop state
purpose: Persistent state for the event-driven UI master-plan loop. If auto-compact fires OR the session restarts, re-read this to know where we are.
created: 2026-04-17
updated: 2026-04-19 (ALL_X-import-in-ui + chrome-raw-hex-regression trap sweep — all UI panels/HUD clean)
---

# Loop state — READ THIS FIRST AFTER SESSION START

## Current position

**HEAD: `2ad7ee9` (origin synced).** Master plan through **Phase 7 + deployed + wave-3 fixes + trap sweep**. All motion shipped (Phase 6). Phase 7 accessibility complete. Trap sweep: eliminated ALL_X-import-in-ui from all 10 affected files (DiplomacyPanel, AgeTransitionPanel, GovernmentPanel, ReligionPanel, GovernorPanel, CityPanel, TooltipOverlay, ResourceTooltip, ImprovementPanel, BottomBar, TopBar) and chrome-raw-hex-regression from UnitCard, BuildingCard, TooltipOverlay resource dots, SetupScreen buttons + ImprovementPanel/BottomBar. 371/371 web + 1553/1553 engine tests green.

## Recap (compact-proof + restart-proof)

UI review (11 docs + 20 screenshots) → systems design (10 S-docs + overview) → master plan → asset-pipeline design → Phase 0 (6/8 landed, 0.3 deferred, 0.1 inline) → Phase 1 spec authored → Phase 1 (11 commits) → Phase 1.5 (4 commits) → Phase 1.6 (5 commits) → Phase 2 (1 squashed commit) → Phase 3 (5 commits + 1 hook auto-fix `8012b2c` that duplicated 3.1+3.2) → workflow audit + fixes.

## Locked-in decisions (11 — DO NOT RE-LITIGATE)

1. **Art budget**: hand-SVG + Game-icons.net (CC BY 3.0) + Kenney.nl (CC0) + Google Fonts + CSS textures. No raster art from the parent.
2. **Sound budget**: procedural WebAudio oscillator tones, off by default.
3. **Achievements**: parked behind `state.config.experimentalAchievements` flag (landed Phase 0.7).
4. **Aesthetic**: Modern Civ VII — warm earth tones (olive/amber/cream/bronze), Cinzel serif + Inter sans.
5. **Viewport classes**: standard (1367–1919) / wide (1920–2559) / ultra (2560+). Narrow dropped.
6. **Ultra behavior**: reveal more info (denser HUD, extra stats), not scale up.
7. **Panel concurrency**: single-slot.
8. **Screen shake**: age transition only; respect `prefers-reduced-motion`.
9. **Notification dismissal**: right-click only (no × button); auto-dismiss non-blocking after ~8s; `requiresAction` flag scaffold.
10. **Parent-agent model**: Sonnet. Orchestration is Sonnet-grade. Opus only for designer subagent + arbiter role.
11. **Design + architecture**: Opus via `designer.md` (flipped from Sonnet in `bd65ba5`).

## Workflow — hardened protocols (learned this session)

- **`isolation: worktree` snapshots from `origin/main`, not local `HEAD`**. Preflight: `git rev-list --count origin/main..HEAD`. Fix: push per phase. **State D (post-push) is now steady-state**; Write/Edit/Bash all work in subagents.
- **Subagent `Write` state machine** — see `.claude/rules/loop-and-continuous-mode.md` § gotcha #5, 4 states. State D (post-push) = Write works. If regressed: Bash heredoc fallback.
- **Commit-per-sub-step is enforced** — implementer brief counts commits, flags mismatches. Updated in `implementer.md` 2026-04-18.
- **Hook/phase collision**: `commit-review.sh` now checks `.claude/workflow/scratch/.phase-in-flight` and skips review if present. Parent creates the lock before spawning phase-impl, removes after cherry-pick.
- **Sonnet verification**: every subagent return payload has `runtime-model`. Parent stops loop if not Sonnet.
- **HEAD-DIVERGED, not HEAD-MOVED**: ancestry check (`git merge-base HEAD <base>`) not exact equality.
- **Agent teams are NOT production-ready** (3 undocumented corners). Use parallel `Agent(run_in_background: true)` for multi-perspective spawns.
- **Custom agents hot-reload impossible**; mid-session changes require `/exit` + `claude --continue` (context-preserving restart).

## Event-driven loop pattern

Each phase's completion notification triggers the next. No `/loop 5m`. Subagents via `Agent(run_in_background: true)`. Commit per sub-step. Verify Sonnet on every return.

## Phase list — current state

| # | Phase | Status | Commits |
|---|---|---|---|
| 0.1 | Right-click-only notifications + requiresAction scaffold | **DONE** | `839f9a6` (parent inline — Opus; not to be repeated) |
| 0.2 | Hide zero-value resource chips | **DONE** | `6067a71` |
| 0.3 | Remove dead ⋯ menu | **DEFERRED to Phase 4** | Not dead; holds 12 real items |
| 0.4 | Keyboard-shortcut badges on bar buttons | **DONE** | `f8495f8` |
| 0.5 | End Turn pulse when all units acted | **DONE** | `d41f099` |
| 0.6 | Audio test buttons wired (minimal WebAudio synth) | **DONE** | `c39f6be` |
| 0.7 | Park Achievements behind `experimentalAchievements` flag | **DONE** | `1050ec3` |
| 0.8 | Orphan TODO sweep (0 deletions, 44 TODOs all still valid) | **DONE** | `6581bb7` |
| 1-spec | Design tokens + palette + Google Fonts spec (3600 words) | **DONE** | `579990b` (designer — Sonnet at the time; now Opus) |
| 1.0–1.10 | Design tokens implementation | **DONE** | `438ed92..a42b44c` (11 commits) |
| 1-autofix | Hook-landed raw-hex BLOCKs + GameState type hole | **DONE** | `d92ec7a` |
| 1.5.0–1.5.3 | Responsive viewport classes | **DONE** | `a729345..f7b3396` (4 commits) |
| 1.6.1–1.6-smoketest | Asset pipeline | **DONE** | `4a2597b..dda9f4a` (5 commits) |
| 1.6-autofix | Leader-key mismatch fix | **DONE** | `e14ab07` |
| 2 | Hex tile rendering overhaul | **DONE (squashed)** | `79dbc78` (1 commit — violated commit-per-sub-step; tightened rule afterward) |
| 3.1–3.2 | S-05 layered unit rendering | **DONE via hook auto-fix** | `8012b2c` (hook fixer shipped while implementer was running in parallel — duplicated work; `.phase-in-flight` lock now prevents this) |
| 3.3 | Compact tooltip stack summary line | **DONE** | `44b22d6` |
| 3.4 | Cycle marker ">" prefix on active entity | **DONE** | `5b6283d` |
| 3.5+3.6 | Stack-summary + Tab-cycle wrap tests | **DONE** | `bfb4cd1` |
| audit-1 | Subagent permission fix (settings.json) + 5 gotcha docs | **DONE** | `54a71a4` |
| audit-2 | Accept subagent-Write limitation + gotcha #6 + implementer no-isolation | **DONE** | `ee63d5a` |
| audit-3 | Designer → Opus + gotcha #5 rewrite + teams gotcha + CLAUDE.md model rule | **DONE** | `bd65ba5` |
| audit-4 | vitest/playwright separate + phase-in-flight lock + implementer brief tightening + _loop-state refresh + trap promotions | **DONE** | `2c90f73` |
| 3.5 | SetupScreen/VictoryPanel palette-token cleanup (workflow smoke) | **DONE** | `006267e`, `3cf5978`, `83af56a` |
| 4-design | Phase 4 designer deliberation (pragmatist + skeptic; integrator timed out) | **DONE** | `0ed04f5` |
| 4 | Panel chrome Civ-VII treatment (5 sub-steps, synthesized from pragmatist∩skeptic) | **DONE** | `6569587`, `565e5a5`, `be8cdd0`, `d1eb311` (4 real commits; 4.5 verification-only was dropped as empty; ⋯ resolution deferred per both designers' vote — leave to Phase 0 Q4 retirement) |
| 4.5-design | DramaModal shell spec (Opus designer, inline return) | **DONE** | (spec in `ui-review/phase-4.5-drama-modal-spec.md`) |
| 4.5 | DramaModal shell + 4 ceremony panel migrations | **DONE** | `a655e7b`, `0708e85`, `f88869f`, `0368eac`, `ac03184`, `4b7f9e0` |
| workflow-infra | Asset-swap guide + designer bash-escape fix + subagent timing tracker | **DONE** | `6734ce3`, `2a5468a` |
| 5-design | Notification system redesign spec | **DONE** | `82b91ff` (designer on disk — `phase-5-notifications-spec.md`) |
| 5 | Notification system redesign (category registry + click-to-panel + auto-dismiss policy + requiresAction) | **DONE** | `cf229a3`, `0e0bac0`, `840daff`, `0fee3d4` |
| timing-v2 | Spawn-event tracking + timeline reporter + sampler limitation doc | **DONE** | `b84178d`, `82b91ff` |
| 6-design | Motion spec (Opus designer, 2000 words, 27-row motion palette) | **DONE** | `fb3feca` |
| 6.1 | Motion tokens (--motion-shake + --motion-modal-stagger) | **DONE** | `593dbb5` |
| 6.3 | DramaModal reveal=fade + useReducedMotion hook | **DONE** | `0817e0f` |
| 6.5 + 6.4 | Canvas motion + TopBar count-up (fused by concurrent-worktree race; all work landed) | **DONE** | `ee60d52` |
| 6.2 | PanelShell transitions + motion-token sweep (Notifications + TooltipShell + buttons) | **DONE** | `91f82a4` |
| 6.6 | Age-transition screen shake + reduced-motion flash fallback | **DONE** | `48b2298` |
| 3.4 | CityPanel hero redesign (hero production block + ledger + territory summary) | **DONE** | `dc46f65`, `f076e50`, `d683715` |
| topbar-hex | Raw-hex cleanup in TopBar | **DONE** | `f911c4e` |
| wave-1 | Fog of war + canvas edge + scrollbars + city stacking + territory | **DONE** | `8f89ee2` |
| wave-2 | SetupScreen redesign + labels toggle + camera centering | **DONE** | `af8c1b6`, `71da502`, `9761160` |
| 7.1 | ARIA labels on icon-only buttons (TopBar + BottomBar) | **DONE** | `46de270` |
| 7.2 | Focus rings via :focus-visible | **DONE** | `125f749` |
| 7.3 | role=toolbar on TopBar + BottomBar | **DONE** | `ca2305d` |
| 7.4 | aria-modal on PanelShell + aria-live on Notifications | **DONE** | `1a80ff8` |
| 7.5 | Skip nav link + sr-only utility | **DONE** | `2eb7662` |
| deploy | Production build + nginx block + scp to server | **DONE** | https://cv.rehou.games/hex-empires/ |
| wave-3 | Edge-scroll camera drift + movement overlay z-order + TS seed fix | **DONE** | `078c707`, `4a527f8`, `c5751db` |
| trap-1 | ALL_X-import-in-ui: DiplomacyPanel + AgeTransitionPanel + GovernmentPanel + ReligionPanel + GovernorPanel (+ raw hex in same files) + new `--panel-accent-gold-dark` token + GovernorPanel var-hex-alpha-interpolation fix | **DONE** | `3b05dc8` |
| trap-2 | ALL_X-import-in-ui: CityPanel + TooltipOverlay + ResourceTooltip; test mock configs → createGameConfig() | **DONE** | `0b17b4a` |
| trap-3 | ALL_X-import-in-ui: ImprovementPanel + BottomBar + TopBar; raw hex in BottomBar | **DONE** | `ed02c05`, `2ad7ee9` |
| trap-4 | chrome-raw-hex-regression: UnitCard CATEGORY_COLORS table + BuildingCard wonder colors + TooltipOverlay resource-type dots + SetupScreen button gradients; add --panel-unit-* + --hud-resource-* + --panel-text-bright + --panel-setup-* tokens | **DONE** | `6f1bc27` |

## Open questions from Phase 1 spec (surface to user before Phase 4)

1. `--color-accent` bronze `#d4943a` vs amber `#fbbf24` — designer recommended bronze (avoid gold-tone clash).
2. `--panel-padding-lg` 16→20px bump — S-03 locks 20px but visual density changes; spot-check.
3. Game-data palette (diplomacy status colors) — warm-shift vs keep-vivid.

Parent applied defaults (bronze / 20px / warm-shift) per user's "u call" authorization. Confirm or iterate before Phase 4 chrome overhaul.

## Post-reboot action protocol

1. Run `git log --oneline -10`. Verify tip matches the status table.
2. Read this file (you just did).
3. Check `.claude/workflow/scratch/.phase-in-flight` — if it exists, a phase was in-flight when the session ended. Either resume it or remove the lock manually.
4. Pick next action based on user's direction. Default: Phase 3.5 (game-state flow) is the next sequential phase. Phase 4 (chrome) is more visually interesting and could use parallel designer spawns (Opus) for multi-perspective direction.
5. Spawn next phase's subagent:
   - Parent creates `.phase-in-flight` lock with commit-hash context
   - `Agent({ subagent_type: "implementer", run_in_background: true, prompt: <brief> })` — `implementer.md` is now properly set up with enforcement rules and Opus-designer handoff patterns
   - Wait for notification
   - Verify `runtime-model` in return
   - Cherry-pick branch commits (or direct if no-isolation)
   - Run tests, push to origin, REMOVE `.phase-in-flight` lock
6. Update THIS file's phase table after every phase close.

## Hard exits

- User says stop
- Genuine blocker I can't diagnose
- NOT "phase N done — continue?" (anti-pattern explicitly rejected)

## Notes for restart-self

- User explicitly authorized continuous mode. Don't ask permission to continue.
- Parent should be Sonnet (`claude --model sonnet`). If running as Opus, note it but don't stop.
- Sonnet verification every spawn (every return has `runtime-model`).
- Push per phase — keeps worktree isolation working.
- Designer is now Opus. Use for architecture/design specs. Don't use for trivial content writeups.
