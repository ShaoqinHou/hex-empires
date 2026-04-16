# Phase 6d — Workflow Findings from the Phase 6c Blind Eval

Date: 2026-04-16
Follows: Phase 6a/6b (workflow rebuild), Phase 6c (blind eval — 5 Sonnet dev agents, disjoint tasks, no pattern guidance)

## TL;DR

The new enforcement stack (slim rules + `inject-rules.sh` + `check-edited-file.sh` + skills + the commit-review loop) produces compliant code on the first pass.
- 5/5 blind-eval agents produced code that passes `npm run build` and `npm test`.
- End-to-end commit-review against the final commit (`600662a`, the J-shortcut) returned `PASS` with zero `BLOCK` findings, 3 `WARN`s, and 2 `NOTE`s.

But the eval exposed three workflow bugs that would have gone undetected if the Reviewer had never fired. All three are fixed or documented in this cycle.

## Signal: the workflow is steering agents

The 5 agents were given feature-level prompts in isolated worktrees with no guidance on hex-empires patterns. The machinery that steered them:

- `.claude/hooks/session-start.sh` — workspace health, counts, branch
- `.claude/hooks/inject-rules.sh` — on subagent start, injects architecture + import-boundaries + testing + tech-conventions + (after P6b) panels.md + ui-overlays.md
- `.claude/hooks/check-edited-file.sh` — grep-level PostToolUse lint for Math.random / cross-system imports / etc.
- `.claude/skills/{add-content,add-panel,add-hud-element}/` — step-by-step guides
- `.claude/rules/*.md` — authoritative patterns

Observed: all 5 agents independently wrapped in `PanelShell` / `TooltipShell`, registered ids in the registries, used tokens instead of raw hex, kept engine pure, produced passing tests. This is the inversion of the audit that kicked off this whole exercise (pre-P6: ~120 pattern violations across ~30 files). Rule injection at subagent start is doing real work.

## Bug 1 — Worktree isolation leak (Phase 6c observation)

Agent 4 (Solar Eclipse crisis) committed directly to `main` instead of its assigned worktree branch. The produced code is fine; the isolation guarantee broke.

**Root cause (hypothesis, not verified since the orchestrating session died):** Worktree spawn passed the agent the main repo path instead of the worktree path; or the agent `cd`'d out of its worktree to run `git status` and committed there; or the worktree existed but the `git commit` resolved `.git` via the shared `.git` directory.

**Mitigation for future parallel batches:**
- Spawn worktrees with absolute paths and never rely on the agent honoring a working directory it cannot see.
- Give agents a guard-rail script: `safe-commit.sh` that refuses to commit unless `git rev-parse --show-toplevel` matches a sentinel file written at worktree creation.
- Add a post-batch check: `git log --oneline origin/main..HEAD` before cherry-picking — should be empty unless an agent leaked.

**Status:** Documented; fix deferred to the next parallel-batch cycle (don't fix in isolation — fix when we're about to fire agents again).

## Bug 2 — Overlapping file sets (Phase 6c observation)

Agents 3 (ResourceTooltip) and 5 (J-shortcut/IdleUnitsToast) both added new entries to `packages/web/src/ui/hud/hudRegistry.ts`. The "disjoint file sets" assumption broke. Cherry-picking the second onto the first produced a trivial additive merge conflict (both entries belong; final file has both). Resolved on 2026-04-16.

**Root cause:** Task authoring assumed each HUD feature lived in isolated files. But every new HUD element mandates a registry entry in one shared file — that's the registry pattern, not a bug. Two HUD-adding tasks *always* conflict on that file.

**Fix (applicable going forward):** When authoring parallel tasks, enumerate **shared-by-design** files (panel registry, hud registry, CLAUDE.md, BACKLOG.md, hud-elements.md) and either (a) serialize tasks that touch any of them, or (b) accept a final conflict-resolution pass as part of the merge protocol. Option (b) is cheaper if conflicts are consistently additive (they were this time).

**Status:** Documented. Task-authoring guidance in the next parallel-batch cycle should call this out.

## Bug 3 — The commit-review hook was dead code (new finding, FIXED)

`.claude/hooks/commit-review.sh` was landed in P6b (commit `634d19a`) but never produced a trigger file across the entire Phase 6c batch (4 cherry-picks before the API outage, plus my 2026-04-16 recovery cherry-pick before the fix).

Three root causes, stacked:

1. **Variable scoping bug.** The node child inside the shell script read `process.env.RAW`, but `RAW` was a local bash variable that was never exported. Every invocation produced `CMD=""`, so the `case "$CMD" in *"git commit"*)` match never fired, and the hook silently exited zero. The whole loop was hollow.

2. **Missed command shape.** Even with a fixed `CMD`, the hook only fired on `*"git commit"*`. Cherry-picks use `git cherry-pick`, which also produces a commit, and a huge fraction of real workflow commits come from rebase / cherry-pick / merge — all silently skipped.

3. **Over-broad cherry-pick skip.** The hook explicitly exits early if `.git/CHERRY_PICK_HEAD` exists. That file vanishes atomically when a clean cherry-pick completes, so a clean cherry-pick *should* trigger the hook — but because of #1 we never got far enough to see it. On a mid-conflict cherry-pick, the skip is correct (nothing to review yet).

**Fix landed 2026-04-16 in `.claude/hooks/commit-review.sh`:**
- `process.env.RAW` → `process.env.CLAUDE_TOOL_INPUT` (single-source read, no local shadowing)
- Command match widened to `git commit | cherry-pick | rebase | merge | revert`
- Added `ORIG_HEAD` vs `HEAD` guard so `--abort` / `--skip` / non-committing variants don't produce false triggers
- Kept the mid-conflict guard (still correct)

**Verified:** Running the fixed hook with `CLAUDE_TOOL_INPUT='{"command":"git commit -m test"}' bash .claude/hooks/commit-review.sh` on HEAD=`600662a` wrote `scratch/pending-review.txt` with the expected sha + file counts. First time the hook has ever produced output.

## What the Reviewer surfaced on `600662a`

All findings are real workflow leakage — the blind-eval agent produced mostly-compliant code but left 5 drift points no cheap check would catch:

| ID | Severity | File | Rule | Lesson about the workflow |
|---|---|---|---|---|
| F-c6155628 | warn | `.claude/workflow/design/hud-elements.md` | ui-overlays § S-HUD-REGISTRATION | Rule mandates updating the human-readable registry; nothing *enforces* it. Doc drifts when code registry changes. |
| F-1196b755 | warn | `IdleUnitsToast.tsx` | ui-overlays § useState-for-visibility antipattern | The sibling `ValidationFeedback.tsx` uses the same antipattern, so the agent pattern-matched on existing drift. Workflow didn't catch the bad precedent. |
| F-3cfd936d | warn | `IdleUnitsToast.test.tsx` | testing § concrete assertions | Vague `.toBeTruthy()` on a `getByTestId` result; `getByTestId` already throws — zero signal. |
| F-dd2174c5 | note | `IdleUnitsToast.tsx` | aria semantics | `TooltipShell` assigns `role="tooltip"` on detailed-tier; body adds `role="status"` for the toast. Redundant and potentially confusing to assistive tech. |
| F-dc002a8f | note | `GameCanvas.tsx` | comment/impl mismatch | Comment references an `idleCycleIdxRef` that doesn't exist in the implementation. Simple stale comment. |

Two of these are **pattern-transmission leaks** (F-c6155628, F-1196b755) — the rule exists but no mechanism forces it. A future workflow tightening should turn those into Tier-4 lint-as-tests:

- `hud-registry-sync.test.ts` — assert every id in `hudRegistry.ts` has a row in `hud-elements.md` (fast, deterministic, runs every CI).
- An ESLint rule banning `useState<boolean>` whose setter is *only* called from a `useEffect` watching a value that could be computed from `HUDManager.isActive()`. Harder to author; lower priority.

Three are **one-off judgment calls** that a human or the Reviewer catches on review (F-3cfd936d, F-dd2174c5, F-dc002a8f). Acceptable for the Reviewer to flag; not worth baking into lint.

## What "Phase 6d done" looks like

- [x] Cherry-pick finished (J-shortcut landed as `600662a`).
- [x] `commit-review.sh` hook bugs fixed; first successful firing verified.
- [x] Commit-review loop end-to-end exercised against a real commit.
- [x] Reviewer produced a structured, concrete, low-variance report.
- [x] Findings documented (this file).
- [ ] (Deferred) Fix the 3 WARN findings on `600662a`. The Fixer agent per design only addresses BLOCKs — WARNs stay open for a human or the next edit pass. That's by design; this backlog is tracked via the review report in `scratch/review-600662a.md`.
- [ ] (Deferred) Build `hud-registry-sync.test.ts` as Tier-4 lint-as-test. Small cost, prevents F-c6155628 class forever.
- [ ] (Deferred) Phase 7: exercise the commit-review loop against BACKLOG items (SYS-D, CNT-D). Next session.

## Trust model after this cycle

- **High confidence:** Rule injection at subagent start steers agents away from big classes of drift.
- **High confidence:** Reviewer agent produces meaningful reports (tight, stable IDs, actionable).
- **Medium confidence:** Worktree isolation and file-set partitioning. Both broke; neither has a machine-enforced guard yet.
- **Medium confidence:** The Fixer/Arbiter legs of the loop. Neither has fired in anger. The Reviewer's `PASS` verdict here didn't call either — we have no evidence they work end-to-end.
- **Low confidence:** Legacy drift *inside* the HUD layer (F-1196b755 showed a sibling component itself violates the rule, so agents learn the drift). A one-time cleanup of the HUD useState antipattern + a lint rule would tighten this.

## Cost

This Phase 6d exercise:
- 1 Sonnet reviewer invocation, 24 tool uses, ~68k tokens, ~5m wall time.
- ~0 fixer / arbiter invocations (no BLOCKs, no disputes).

Extrapolating: for a typical feature commit (1-3 substantive files), a commit-review pass is a few minutes and cents. Scales linearly with commit size.
