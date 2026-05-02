# Codex Web Handoff

Use this when starting a Codex Web cloud task for the Civ VII parity refactor.

## Current Baseline

- Branch/main baseline after local handoff: `46d2459`.
- Asset generation is paused. Do not work on assets unless explicitly asked.
- Local GDD target remains Firaxis patch `1.3.0`; `.codex/workflow/source-target.md`
  records official drift to `1.3.2`. Do not silently retarget mechanics.
- Current workflow is incremental: read GDD/audit/tracker, verify against current
  code, implement one bounded slice, update docs/tracker, run gates.

## Codex Web Notes

- Codex Web runs cloud threads in isolated repository clones. Push code to GitHub
  before delegating cloud tasks.
- Use multiple cloud threads for parallelism when slices are disjoint. Do not let
  two cloud threads edit the same files.
- Subagents do not spawn automatically. If subagents are available in that
  surface, explicitly ask for bounded parallel subagent work.
- Codex Cloud currently does not expose direct default-model selection for cloud
  tasks. Phrase model preferences as routing guidance rather than assuming they
  are enforceable.
- Playwright is the required repeatable E2E/regression gate. Browser Use is only
  supplemental visual inspection.

## Starting Prompt

```text
Read AGENTS.md first, then follow .codex/workflow/README.md and
.codex/workflow/process-checklist.md if present.

Goal: continue refactoring hex-empires toward Civilization VII mechanical parity.
Ignore asset generation; it is paused.

Current baseline: start from main at or after commit 46d2459.

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

Recommended next candidates after 46d2459:
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
