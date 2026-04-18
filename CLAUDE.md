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
- **Implementation / fix / review subagents**: Sonnet. `implementer.md`, `fixer.md`, `reviewer.md` are Sonnet-backed. Bulk mechanical or rule-bounded work.
- **Dispute resolution**: Opus. `arbiter.md` handles reviewer/fixer conflicts.
- Rule of thumb: Opus enters only when a decision is genuinely hard and the output will be used for several later phases. Never Opus for work Sonnet handles equally.

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
| orphan-TODO-stale | Remove TODOs that are already done in the same commit |

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
