# Phase 6d — Workflow Findings from the Phase 6c Blind Eval

Date: 2026-04-16
Follows: Phase 6a/6b (workflow rebuild), Phase 6c (blind eval — 5 Sonnet dev agents, disjoint tasks, no pattern guidance)

## TL;DR

The new enforcement stack (slim rules + `inject-rules.sh` + `check-edited-file.sh` + skills + the commit-review loop) **produced mostly-compliant code from 5/5 blind-eval agents on additive new-file tasks**. That is the supported claim. Broader claims (the loop works end-to-end, the workflow catches drift in general) are not yet supported by the evidence — see "What we still don't know" below.

- 5/5 blind-eval agents produced code that passes `npm run build` and `npm test`.
- One post-hoc Reviewer run against `600662a` (J-shortcut) returned `PASS` with zero `BLOCK` findings, 3 `WARN`s, and 2 `NOTE`s.
- Three workflow bugs were found and fixed this cycle.
- Fixer and Arbiter agents have zero invocations. Their behavior is unproven.

## Supported claim: rule injection steers agents on clean additive tasks

The 5 agents were given feature-level prompts in isolated worktrees with no guidance on hex-empires patterns. The machinery that steered them:

- `.claude/hooks/session-start.sh` — workspace health, counts, branch
- `.claude/hooks/inject-rules.sh` — on subagent start, injects architecture + import-boundaries + testing + tech-conventions + (after P6b) panels.md + ui-overlays.md
- `.claude/hooks/check-edited-file.sh` — grep-level PostToolUse lint for Math.random / cross-system imports / etc.
- `.claude/skills/{add-content,add-panel,add-hud-element}/` — step-by-step guides
- `.claude/rules/*.md` — authoritative patterns

Observed: all 5 agents independently wrapped in `PanelShell` / `TooltipShell`, registered ids in the registries, used tokens instead of raw hex, kept engine pure, produced passing tests. This is the inversion of the pre-P6 audit baseline (~120 pattern violations across ~30 files). On the specific task shape tested, rule injection is doing real work.

## What we still don't know

The eval tested one axis (new-file additive tasks) under one set of conditions (Sonnet agents, clean-ish task scope). Most of the gaps below still stand; the Fixer-path gap closed on 2026-04-16 via the WF-ENF-2 smoke test (see below).

1. **~~The BLOCK path has never fired.~~** **Fixer validated 2026-04-16 via WF-ENF-2 smoke test** (see section below). Arbiter remains unproven because the Fixer had no reason to dispute a clean suggested-fix — the dispute path still awaits a real BLOCK where the suggested fix is wrong, invalid, or structurally impossible.

2. **Legacy drift teaches new agents the antipattern.** Finding F-1196b755 showed the J-shortcut blind agent imitated `ValidationFeedback.tsx`'s `useState<boolean>`-for-visibility antipattern. The rule is documented in `ui-overlays.md`; the sibling file violates it; the agent pattern-matched. Rule injection cannot overpower a contradictory local exemplar. Cleaning `ValidationFeedback.tsx` is a workflow prerequisite, not a polish item — see BACKLOG `UI-C-VF1`.

3. **Tasks were structurally easy.** All five added new files. None required modifying shared infrastructure (the SYSTEMS pipeline, `GameState` type, `App.tsx`'s keydown handler, cross-cutting registries). Real architectural drift lives in modifications, not additions. A harder eval with 2+ agents each editing shared files would tell us whether the workflow survives real conflict.

4. **Worktree isolation has no machine guard.** Agent 4 (Solar Eclipse) committed directly to `main`. The fix is documented (`safe-commit.sh` + sentinel-file guard) but not built. Next parallel batch can repeat the leak unless the guard ships first.

5. **`inject-rules.sh` is text, not enforcement.** Both `ValidationFeedback.tsx` (live) and `IdleUnitsToast.tsx` (blind-eval output) violate the HUD `useState`-visibility antipattern. Neither got a BLOCK — they got a WARN. The injected rules set the expectation; they don't *catch* the violation. Tier-4 lint-as-tests and Tier-2 ESLint are what actually prevent the class. The new `hud-registry-sync.test.ts` (this cycle) is an instance of the right pattern; more such tests are needed before the next batch.

The rule of thumb: **rule injection prevents the violations an agent would make reluctantly; it does not prevent the violations an agent would make confidently by imitating the existing tree**. Tightening the latter is the open work.

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

## WF-ENF-2 — Fixer smoke test (2026-04-16, post-UI-C-VF1 + WF-GUARD-1)

Exercise: hand a known BLOCK-producing review report to a fresh Fixer subagent and observe whether it addresses the finding per spec.

**Setup:**
- Worktree `test/wf-enf-2-synthetic` spawned off main at `387e4d2` (the WF-GUARD-1 commit).
- Dropped the sentinel file `.claude/worktree-sentinel` inside the worktree — **first live use of WF-GUARD-1 in a subagent's bash invocations.**
- Created `packages/web/src/ui/panels/__synthetic__/SyntheticFixturePanel.tsx` with two deliberate BLOCK violations of `.claude/rules/panels.md`: raw hex `#161b22` for chrome bg, raw hex `#30363d` for chrome border.
- Committed the fixture in the worktree (passed the safe-commit guard because sentinel matched the worktree toplevel).
- Hand-authored a synthetic review report at `.claude/workflow/scratch/review-0cfff70.md` with both findings as BLOCK.

**Result:**
- Fixer subagent read `fixer-prompt.md`, read the review report, read the fixture file.
- Produced a surgical 2-line edit — `'#161b22'` → `'var(--panel-bg)'`, `'#30363d'` → `'var(--panel-border)'` — exactly matching the suggested-fix.
- Ran tests (`npm run test`) — 1748 unit/integration tests passed. Playwright specs failed with a pre-existing version mismatch unrelated to the fix; Fixer correctly identified this and did not deflect.
- Staged both lines + committed inside the worktree with message `fix(review): F-synth0001, F-synth0002` (commit `ea2fcba`).
- Wrote a valid fix log at `.claude/workflow/scratch/fix-log-0cfff70.md` per the contract's YAML schema.
- Total: 13 tool calls, 64527 tokens, ~5m wall time.

**What this proves:**
- Fixer correctly parses `review-<sha>.md` per the yaml front-matter + findings format.
- Fixer respects the "only BLOCK findings this iteration" constraint (the synthetic report had no WARN/NOTE to accidentally address).
- Fixer keeps edits surgical — touched only the two lines named in the findings.
- Fixer runs tests before committing.
- Fixer writes a structurally valid fix log.
- WF-GUARD-1 sentinel is transparent in the happy path — no false blocks on the Fixer's commit inside the worktree.

**What it doesn't prove:**
- **Arbiter still unproven.** The Fixer had no reason to dispute; synthetic finding + matching fix = no dispute block. Arbiter invocation path (Opus rule on fixer-correct / reviewer-correct / escalate-human) has yet to fire.
- **Multi-iteration loop unproven.** The loop design says a second Reviewer run should follow the Fixer commit to confirm clean. That second run was not executed in this exercise; the prescribed flow assumes the orchestrator kicks it off. Validating the iteration protocol is a separate future smoke test.
- **Off-the-happy-path Fixer behavior.** Invalid suggested-fixes, type-breaking edits, test regressions, finding-references-to-non-existent-lines — none tested yet.

**Cleanup:** worktree + branch removed after the exercise. Synthetic fixture file did NOT land on main (it lives only in the deleted branch). The fix log + review report were in the gitignored worktree scratch dir and removed with the directory.

## What "Phase 6d done" looks like

- [x] Cherry-pick finished (J-shortcut landed as `600662a`).
- [x] `commit-review.sh` + `log-bash-failure.sh` hook bugs fixed; first successful firing verified.
- [x] Reviewer leg of the commit-review loop exercised against a real commit (PASS, 3 WARN, 2 NOTE).
- [x] Reviewer produced a structured, concrete, low-variance report.
- [x] F-3cfd936d fixed in place (`IdleUnitsToast.test.tsx` vague `.toBeTruthy()` → concrete content assertion).
- [x] F-c6155628 fixed in place (`hud-elements.md` now has rows for `idleUnitsToast` + the pre-existing missing `yieldsToggle` entry).
- [x] `hud-registry-sync.test.ts` shipped as Tier-4 lint-as-test — permanently prevents the F-c6155638 drift class.
- [x] Findings documented (this file).
- [x] UI-C-VF1: `ValidationFeedback.tsx` + `IdleUnitsToast.tsx` now derive visibility from `HUDManager.isActive()`; the useState-for-visibility exemplar is gone. Commit `b92e8e9`. Closes F-1196b755.
- [x] WF-GUARD-1: `safe-commit.sh` + spawn-worktree skill + settings wiring. Commit `387e4d2`. Validated on live subagent bash in the WF-ENF-2 exercise.
- [x] WF-ENF-2: Fixer smoke test (see section above). First live Fixer validation; Arbiter still unproven.
- [ ] (Deferred) Fix F-dd2174c5 (aria-role overlap) + F-dc002a8f (stale comment). Judgment calls; do on a later cleanup pass.
- [ ] (Deferred) Arbiter dispute-path smoke test. Needs a BLOCK where the suggested-fix is structurally invalid — handcrafted fixture required.
- [ ] (Deferred) Multi-iteration loop smoke test. Commit → Reviewer → Fixer → Reviewer-2 → PASS. Needs the orchestrator-side invocation glue (the hook writes a trigger file but doesn't spawn the next iteration automatically).
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
