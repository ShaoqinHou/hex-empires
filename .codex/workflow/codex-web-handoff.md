# Codex Web Handoff

Use this when starting a Codex Web cloud task for the Civ VII parity refactor.
This is a temporary handoff file, not permanent workflow policy.

## Current Baseline

- Branch/main baseline after local handoff: `36544b8`.
- Asset generation is paused. Do not work on assets unless explicitly asked.
- Local GDD target remains Firaxis patch `1.3.0`; `.codex/workflow/source-target.md`
  records official drift to `1.3.2`. Do not silently retarget mechanics.
- Current workflow is incremental: read GDD/audit/tracker, verify against current
  code, implement one bounded slice, update docs/tracker, run gates.

## Codex Web Notes

- Codex Web runs cloud threads in isolated repository clones. Push code to GitHub
  before delegating cloud tasks.
- Codex cloud tasks create a container, check out the selected branch/commit,
  run setup, then let the agent run terminal commands and validate its work.
  The default cloud image is not this Windows desktop environment, so run
  workflow preflight in the cloud before any feature work.
- Use multiple cloud threads for parallelism when slices are disjoint. Do not let
  two cloud threads edit the same files.
- Subagents do not spawn automatically. If subagents are available in that
  surface, explicitly ask for bounded parallel subagent work.
- Codex Cloud currently does not expose direct default-model selection for cloud
  tasks. Phrase model preferences as routing guidance rather than assuming they
  are enforceable.
- Playwright is the required repeatable E2E/regression gate. Browser Use is only
  supplemental visual inspection.

## Self-Destruct Requirement

After reading this file and copying the useful prompt/context into the task,
the Codex Web agent must delete `.codex/workflow/codex-web-handoff.md` in its
own working branch. The deletion should be included in its first commit/PR unless
the task is read-only. If the task is read-only, delete it locally and report
that no commit was made.

Do not leave this file behind as durable project guidance. The durable sources
are `AGENTS.md`, `.codex/workflow/*.md`, `.codex/rules/*.md`, and `.codex/gdd/*`.

## Cloud Environment Preflight

Before choosing or implementing a parity slice, validate that the workflow works
inside Codex Web's cloud environment:

1. Confirm branch and cleanliness:
   - `git status --short --branch`
   - `git rev-parse --short HEAD`
2. Confirm runtime availability:
   - `node --version`
   - `npm --version`
   - `python --version` or `python3 --version`
3. Install dependencies if the cloud setup did not already do it:
   - `npm ci`
4. Run generated tracking checks:
   - `python .codex/scripts/aggregate-audits.py --check`
5. Run workflow E2E. Try the project command first:
   - `powershell -NoProfile -ExecutionPolicy Bypass -File .codex/scripts/test-workflow-e2e.ps1`
   If `powershell` is unavailable in the cloud container, try:
   - `pwsh -NoProfile -ExecutionPolicy Bypass -File .codex/scripts/test-workflow-e2e.ps1`
6. If neither PowerShell command is available, stop feature work and fix/report
   the workflow portability gap first. Preferred fix: add a small cross-platform
   wrapper or equivalent checker that covers the same gates, update the workflow
   docs, and run it in the cloud.
7. Run baseline build/test before feature work:
   - `npm run build`
   - `npm run test --workspace=packages/engine`
   - `npm run test --workspace=packages/web`
8. For any UI/browser slice, additionally validate Playwright in the cloud:
   - run the relevant `npm run test:e2e --workspace=packages/web -- ...`
   - if full Playwright includes build-smoke specs, follow
     `.codex/workflow/e2e-standards.md` and run `build:deploy` immediately
     before Playwright.

If any preflight command fails because the cloud environment differs from local,
fix the workflow/environment issue before changing game behavior. Record exactly
what failed and what was changed.

## Starting Prompt

```text
Read AGENTS.md first, then follow .codex/workflow/README.md and
.codex/workflow/process-checklist.md if present.

Goal: continue refactoring hex-empires toward Civilization VII mechanical parity.
Ignore asset generation; it is paused.

Current baseline: start from main at or after commit 36544b8.

First: read .codex/workflow/codex-web-handoff.md, copy the useful context into
your working notes, then delete that file in this branch. It is temporary handoff
state and must not remain as durable project documentation.

Before feature work, run the cloud preflight from that file:
- git status --short --branch
- node --version; npm --version; python --version or python3 --version
- npm ci if dependencies are not already installed
- python .codex/scripts/aggregate-audits.py --check
- powershell -NoProfile -ExecutionPolicy Bypass -File .codex/scripts/test-workflow-e2e.ps1
  or pwsh -NoProfile -ExecutionPolicy Bypass -File .codex/scripts/test-workflow-e2e.ps1
- npm run build
- npm run test --workspace=packages/engine
- npm run test --workspace=packages/web

If PowerShell is not available, fix or report the workflow portability gap before
changing game behavior. If UI/browser work is chosen, also validate the relevant
Playwright flow in the cloud.

Do not trust existing tracking blindly. First inspect:
- .codex/gdd/convergence-tracker.md
- the relevant .codex/gdd/systems/<system>.md
- the relevant .codex/gdd/audits/<system>.md
- .codex/workflow/source-target.md
- current code paths for the chosen system

Use the workflow:
1. Choose one bounded, high-ROI parity slice from the tracker.
2. Confirm the audit row against current code before using it as authority.
3. If the slice is parallelizable, split into disjoint file scopes. Use parallel
   cloud threads or subagents only for bounded side work; the lead owns planning,
   integration, docs, review, and commit decisions.
4. Prefer strong reasoning for source interpretation, architecture, review, and
   integration. Use Spark/fast workers only for narrow, fully specified,
   low-level implementation or text edits after design is settled.
5. Add/update focused tests with the implementation.
6. Run focused tests, then broader build/test gates proportional to risk.
7. Update the relevant audit, GDD mapping, and convergence tracker when parity
   status changes. Run `python .codex/scripts/aggregate-audits.py --check`.
8. For workflow changes, run:
   `powershell -NoProfile -ExecutionPolicy Bypass -File .codex/scripts/test-workflow-e2e.ps1`
9. For UI/browser changes, follow .codex/workflow/e2e-standards.md. Playwright
   is the required repeatable gate; Browser Use is supplemental.
10. Review the diff as lead before committing.

Recommended next candidates after 36544b8:
- buildings-wonders F-11: implement DEMOLISH_BUILDING handler for V2 urban
  building slots.
- narrative-events F-06: unify discovery tile consumption/reward handling with
  narrative event resolution.
- narrative-events F-04: add the next one-shot trigger hook after TECH_RESEARCHED.

Before stopping, provide:
- changed files
- tests/builds run and results
- audit/tracker rows updated
- any remaining risks or skipped checks
```
