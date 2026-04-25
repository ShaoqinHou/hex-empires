# hex-empires

Turn-based strategy game inspired by Civilization VII. npm workspaces monorepo.

- **`packages/engine`** — Pure TypeScript game logic. ZERO browser/DOM dependencies.
- **`packages/web`** — React SPA (Vite, port 5174), Canvas hex renderer, Tailwind v4 UI.

## Commands

```bash
npm run dev:web          # Web dev server (port 5174)
npm run build            # Build engine + web
npm test                 # Full suite (engine + web + e2e)
npm run test:engine      # Engine tests only
npm run test:web         # Web tests only
```

## Autonomous mode (survives /compact — this is the project root CLAUDE.md)

When the user's prompt contains "full auto" / "keep going" / "until done" / a numeric
list of tasks / scattered multiple requests: operate in **CONTINUOUS MODE**.

- Do NOT stop after each "phase" to ask "continue?"
- Use TodoWrite to track progress across all items
- Make per-step commits so nothing is lost on interruption
- Pause ONLY for: genuinely ambiguous choices (AskUserQuestion), irreversible actions, runtime blockers
- At natural checkpoints, note progress in TodoWrite and keep going
- When legitimately done with the whole list, summarize all work in one final message

Anti-pattern: stopping mid-list with "Phase 1 done — should I continue?" when the user already specified the whole list.

## Agent coordination

| Situation | Action |
|-----------|--------|
| Trivial / single-step edit | Do it yourself |
| Research spanning 5+ files | 1 Explore subagent |
| Architecture question with multiple valid approaches | 3 parallel agents (pragmatist / skeptic / integrator) → synthesize YOURSELF |
| Feature decomposable into disjoint file sets | Parallel agents via `/spawn-worktree` |
| Verifying a specific claim | 1 agent with adversarial framing |
| Long mechanical work (>20 min) | Delegate to subagent to preserve your context |

Model selection:
- **Parent session**: prefer Sonnet (`claude --model sonnet`). Orchestration — spawning, cherry-picking, test runs, push, status writeups — is Sonnet-grade work. An Opus parent doing orchestration burns ~5× the tokens with no quality gain.
- **Design + architecture subagents**: Opus. `designer.md` is Opus-backed and should be invoked for specs that involve real design judgment (palette systems, grid rules, interaction model, crisis-response choice design). This is where Opus earns its keep.
- **Implementation / fix / review subagents (primary)**: **Sonnet via `Agent({ subagent_type: "implementer" | "fixer" | "reviewer", model: "sonnet" })`**. Default for all bulk implementation work. Native Anthropic — same budget pool as parent, but Sonnet is ~5× cheaper than Opus. Spawn 3-5 in parallel for disjoint workpacks (one Agent message, multiple tool calls). Use `run_in_background: true` for fan-out and react to completion notifications.
- **Implementation / fix / review subagents (escape hatch)**: **GLM via `claude-glm`** — only when worth it: extremely mechanical batch refactors where Sonnet's reasoning is wasted, OR Anthropic budget is exhausted and we want to keep going on Z.ai's separate budget pool. See `~/.claude/docs/glm-delegation.md`. **Concurrency cap: ~3 parallel GLM jobs** (rate-limit floor; sometimes 5 is fine but 3 is the safe default).
- **Dispute resolution**: Opus. `arbiter.md` handles reviewer/fixer conflicts.
- Rule of thumb: Opus only when reasoning is genuinely hard and the output feeds several later phases (rare). Sonnet for the 95% case. GLM only when explicitly warranted.

### Rate-limit recovery — never stop (mandatory in full-auto mode)

If a subagent or Bash spawn returns rate-limit or 429:

1. **Note the failed task** — log which workpack failed in a TodoWrite item or a state file.
2. **Schedule a wakeup** — `ScheduleWakeup({ delaySeconds: 1800, prompt: "<same /loop or task prompt>" , reason: "rate-limit recovery"})`. 1800s (30 min) is a good first probe — pays one cache miss but covers most short-window throttles.
3. **Continue any work that doesn't need the throttled provider** — e.g. if Anthropic is throttled but local tests + grep + Bash are unblocked, run those.
4. **On wakeup**: probe with a tiny call (one `Agent(prompt: "say READY")` or one `claude-glm -p "say READY"`); if recovered, re-fire the failed workpack.
5. **If still throttled**: re-schedule (1800s again, escalate to 3600s after 2 retries).
6. **Never end the turn silently** when work is queued. If everything is blocked AND rate-limited AND no progress can be made, write the state to `.claude/workflow/_loop-state.md` and ScheduleWakeup once more.

### GLM delegation (escape-hatch reference, confirmed 2026-04-20 — 2026-04-25)

Validated pattern: fire ≤3 implementer workpacks in parallel via `claude-glm` in background Bash jobs. Each GLM process is one-shot (zero memory), accepts self-contained briefs, can write files + commit. Return via stdout at end.

Spawn shape:
```bash
claude-glm --add-dir /c/Users/housh/Documents/monoWeb/hex-empires -p '<SELF_CONTAINED_BRIEF>' 2>&1 | tail -30
```
Use `run_in_background: true` for parallelism. No task-notification system (unlike Anthropic Agent); poll output file or wait for Bash completion event.

Note (2026-04-25): user prefers Sonnet workers for quality/budget reasons. GLM is escape-hatch only. Concurrency cap ~3, sometimes 5; 429s mean concurrency-limited not request-count-limited.

Good fit: 90% of W1–Y5 workpacks (typed refactors, action additions, data cleanup, UI scaffolds).
Bad fit: tasks requiring access to this conversation's memory, web_search, or the PanelManager/HUDManager hot-reload magic.

### Subagent workflow gotchas (confirmed 2026-04-18)

These bit the loop this session. Full details in `.claude/rules/loop-and-continuous-mode.md` § "Subagent workflow gotchas".

- **Subagents only read `.claude/settings.json`, not `settings.local.json`** ([#18950](https://github.com/anthropics/claude-code/issues/18950)). Permissions that must apply to subagents (Write, Bash, Edit, Agent) live in the checked-in `settings.json` `permissions.allow` block. Silent `Write permission denied` is the symptom.
- **Custom `.claude/agents/*.md` definitions only load at session start.** Adding a new agent file mid-session: the new `subagent_type` is NOT callable until restart. Workaround: `/exit` then `claude --continue` preserves conversation context while re-scanning the registry. Pragmatic alternative: `Agent({ subagent_type: "general-purpose", model: "sonnet" })` — needs no reload.
- **`isolation: worktree` creates worktrees from `origin/main`, not local `HEAD`.** If local main is ahead of origin/main (pre-push state), the worktree is stale and cannot see recent commits. Preflight: `git rev-list --count origin/main..HEAD` — nonzero = divergence = don't use isolation. Fix: push main to origin first, OR spawn without isolation (commits land directly on main).
- **Sonnet verification is convention, not enforcement.** Every subagent brief requires `runtime-model` in the return payload; parent stops the loop if it's anything other than Sonnet. No hook enforces this yet — relies on brief discipline.
- **Subagent `Write`/`Edit` only works after the permission-fix commit has been pushed to `origin/main`.** The fix (`permissions.allow` in `settings.json`) is required first, then a session restart to refresh the cached permission list, then a push so worktree-isolated subagents see the fix (worktrees snapshot from `origin/main` per gotcha #3). In that state D, `Write` works. Before that: use `Bash` heredoc (`cat > file <<'EOF' ... EOF`) for file creation — it routes through the shell process and bypasses the permission layer. `git commit` from `Bash` also works. Full state table in `.claude/rules/loop-and-continuous-mode.md` § 5.
- **Agent teams (`TeamCreate`) are not production-ready yet.** Per-teammate model, per-teammate worktree isolation, and auto-compact survival are all undocumented. Use parallel `Agent(run_in_background: true)` spawns for multi-perspective design instead — three calls in one message, three completion notifications, parent synthesizes.

## Key invariants (always in context — .claude/rules/ auto-loads the full docs)

**Engine:**
1. Engine is DOM-free. No react, no document, no canvas, no `Math.random()`.
2. Immutable state. Systems return new objects; never `.set()` on `state.X`. See `engine-patterns.md`.
3. Content via `state.config.X`, never `ALL_X` globals from `data/`.

**UI:**
4. Panels wrap `<PanelShell>`, registered in `panelRegistry`. Never `useState<boolean>` for visibility — use `usePanelManager()`.
5. HUD overlays wrap `<TooltipShell>`, registered in `hudRegistry`. Never `useState<boolean>` for visibility — use `useHUDManager().isActive()`.
6. Token-only chrome. Raw hex (`#xxxxxx`) in panel/HUD chrome is a BLOCK. Use `var(--panel-*)` / `var(--hud-*)`.

After any Canvas or UI change, run `/verify` before stopping.

## Trap registry (recurring drift patterns — cite by name in reviews)

| Trap | Fix |
|------|-----|
| UI-useState-visibility | Derive from `HUDManager.isActive()` or `usePanelManager()` |
| registry-doc-desync | `hud-registry-sync.test.ts` catches it; update `hud-elements.md` |
| var-hex-alpha-interpolation | Use `color-mix(in srgb, ${color} N%, transparent)` |
| chrome-raw-hex-regression | Finish tokenization in the same commit; don't leave siblings |
| ALL_X-import-in-system | Use `state.config.X` not `ALL_*` globals |
| ALL_X-import-in-ui | UI panels reading `ALL_*` globals directly — use `state.config.X` via `useGameState()` |
| orphan-TODO-stale | Remove TODOs that are already done in the same commit |
| dead-constant | A `const` / `let` declared but never read (found by TS with `noUnusedLocals`) — delete at introduction, not later |
| id-casing-mismatch-in-registry | Content registry keys diverge from engine canonical IDs (e.g. `qin-shi-huang` vs `qin_shi_huang`) — silent runtime fallback to placeholder; always cross-check both directions of lookup |

## Skills (invoke by name when the task matches)

- **ALWAYS invoke `/add-panel`** when creating a new `*Panel.tsx`
- **ALWAYS invoke `/add-hud-element`** when creating a new tooltip/toast/hint
- **ALWAYS invoke `/add-content`** when creating new civs/units/buildings/techs
- `/verify` — E2E browser check after UI changes
- `/commit-review` — manual review loop trigger (also runs automatically on every commit via hook)
- `/spawn-worktree` — isolated worktree for parallel agents
- `/consistency-audit` — full-tree content sweep
- `/build`, `/test` — command references

## Development process

1. **Design** — write a brief design doc or describe the approach
2. **Implement** — write code following rules in `.claude/rules/`; engine systems are pure functions `(state, action) → newState`
3. **Test** — L1 unit for systems, L2 integration for multi-system, L3 browser for UI. Concrete assertions — never `.toBeDefined()`.
4. **Verify** — `/verify` for UI changes
5. **Review** — automatic via commit-review hook (Reviewer → Fixer → Arbiter loop)

Bug-fix fast path: regression test → fix → run tests → `/verify` if visual.

## Asset + theme swapping

All color/font/chrome/image/audio swaps go through tokens + registry — never hardcoded in components. Single authoritative reference: **`.claude/workflow/design/asset-and-theme-swap-guide.md`**. Read it before any visual swap; the swap surface is exactly 11 files (9 CSS token files + `assets/registry.ts` + `assets/loader.ts`).

## Subagent timing + hang detection (mandatory for every spawn)

Every subagent spawn logs a **spawn event** + **complete event**. This catches the hang pattern where a run elapses normally but produces ~no tokens (Phase 4 integrator: 18min / 52 tokens = dead) AND lets the parent see wall-clock overlap / parallelism / idle-gap shape.

**Note**: the optional file-size sampler (`sample-agent-output.sh`) is kept in the tree but currently non-viable — Claude Code's task output file is a 0-byte placeholder throughout execution on this runtime. Rely on spawn/complete events + the completion classifier instead.

Protocol:

1. **On spawn** — log the spawn event immediately after the Agent tool returns:
   ```bash
   bash .claude/workflow/scripts/log-agent-timing.sh \
     --event spawn --phase "<phase>" --agent-id "<id>" --subagent "<type>"
   ```

2. **On return (task-notification)** — log the completion row from the `<usage>` block:
   ```bash
   bash .claude/workflow/scripts/log-agent-timing.sh \
     --event complete --phase "<phase>" --agent-id "<id>" --subagent "<type>" \
     --duration-ms <duration_ms> --tokens <total_tokens> --status completed \
     [--notes "<one-liner>"]
   ```
   Classifies: `tokens_per_min < 1000 AND duration > 1min` = HANG_SUSPECT; `< 5000 AND > 5min` = SLOW; else HEALTHY.

3. **Reports:**
   ```bash
   bash .claude/workflow/scripts/agent-timing-report.sh             # completion summary
   bash .claude/workflow/scripts/agent-timing-report.sh <id>        # per-agent events
   bash .claude/workflow/scripts/agent-timing-report.sh --hangs     # hang-suspects
   bash .claude/workflow/scripts/agent-timing-report.sh --timeline  # Gantt + overlap stats
   bash .claude/workflow/scripts/agent-timing-report.sh --now       # currently running
   ```

**Healthy rates (observed 2026-04-18 session):** implementer 18k-21k tpm, designer 8k-11k tpm. Sustained sub-1k tpm = hang; investigate, don't just wait.

**Watchdog fallback (no live sampler):** check `--now` periodically during long-running work. If an agent exceeds 25 minutes elapsed, consider manual `TaskStop` and respawn — the integrator case showed a 18-min full-hang is possible and won't self-resolve.

## Rules (auto-loaded from `.claude/rules/`)

Full rule docs are auto-loaded at every session start from `.claude/rules/*.md`. Read them when working in their area:

- `architecture.md` — engine/renderer separation, system pipeline
- `import-boundaries.md` — import direction constraints
- `data-driven.md` — registry pattern, content rules
- `engine-patterns.md` — state mutation, `state.config`, seeded RNG, age transitions
- `panels.md` — PanelShell / PanelManager protocol
- `ui-overlays.md` — TooltipShell / HUDManager protocol
- `tech-conventions.md` — TypeScript, Windows/MINGW64, ports
- `testing.md` — 4-layer test depth + concrete assertions

## Prerequisites

- Node.js, npm (workspaces support)
- Windows MINGW64 — use `python` not `python3`
- Use `node -e` for JSON parsing (jq may not be available)
- `MSYS_NO_PATHCONV=1` before commands with `--base /path/` on Git Bash
