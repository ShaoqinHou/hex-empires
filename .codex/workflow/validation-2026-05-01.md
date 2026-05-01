# Codex Workflow Validation - 2026-05-01

## Purpose

Validate the Codex-native workflow by running real workflow tasks end to end:
move workflow ownership into `.codex/`, scan GDD/audit state, fix stale tracking,
regenerate generated docs, and verify the workflow gate.

## Task Run

Chosen task: workflow migration plus GDD/audit tracking refresh.

Why this task: it tests the process through workflow migration and tracking
refresh. It exercises the local GDD, audits, tracker, scripts, git branch,
source freshness warning, native path checks, generated-doc checks, and the
game validation loop.

## Agent Use

- Lead session: owned planning, source-version judgment, edits, integration,
  and verification.
- Explorer agents: one audited native migration/framing risks; one audited the
  existing test/e2e setup. No agent edited files.
- Spark worker: not used. The task crossed workflow architecture, generated
  tracking, and validation triage. No workflow script or game test
  automatically requested Spark; future Spark use requires the lead to spawn a
  worker explicitly with the contract in `agent-routing.md`.
- Claude Code runtime: not tested after migration because the live workflow is
  Codex-native. The old workflow is recoverable from git history if a future
  branch wants Claude Code again.

## What The Scan Found

- GDD system docs found: 26.
- Audit docs found: 26.
- Initial tracker state reported only 25 / 26 audits.
- `mementos.md` had an unpopulated Mapping section before regeneration.
- The audit aggregator missed some finding headers whose titles contained
  inline code backticks.
- Local GDD target remains Civ VII patch 1.3.0, while official notes observed on
  2026-05-01 show newer 1.3.2-era updates. This is a source-staleness warning,
  not an automatic target change.

## Fixes Applied

- Made `AGENTS.md` the native Codex entry point.
- Moved GDD, rules, skills, hooks, workflow docs, scripts, and historical notes
  under `.codex/`.
- Removed live Claude Code entry/config files from the working tree. Recovery is
  via git history.
- Added `.codex/scripts/check-workflow.ps1` and
  `.codex/scripts/test-workflow-e2e.ps1`.
- Added `.codex/workflow/e2e-standards.md`.
- Fixed `.codex/scripts/aggregate-audits.py` to parse inline-code titles,
  generate cleaner Mapping status text, and support `--check`.
- Regenerated `.codex/gdd/convergence-tracker.md` and GDD Mapping sections.
- During full game validation, fixed minimum runtime/test blockers discovered by
  the workflow e2e loop. Those changes were validation fallout, not an
  independent gameplay refactor.

## Current Audit Snapshot

After regeneration:

| Metric | Count |
|---|---:|
| Audits completed | 26 / 26 |
| Total findings | 266 |
| MATCH | 22 |
| CLOSE | 44 |
| DIVERGED | 68 |
| MISSING | 115 |
| EXTRA | 17 |
| HIGH severity | 106 |
| MED severity | 105 |
| LOW severity | 45 |
| Unknown severity | 10 |

## Required Verification

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .codex\scripts\test-workflow-e2e.ps1
python .codex\scripts\aggregate-audits.py --check
python -m py_compile .codex\scripts\aggregate-audits.py
```

Expected accepted warning:

- Local Civ VII target is 1.3.0 while `source-target.md` records official drift
  to 1.3.2 notes.

## Process Lessons

- Codex owns `.codex/` directly; no adapter framing remains in active workflow
  docs.
- The lead model owns source freshness, architecture, and final review.
- Spark should be used only after the lead has reduced work to a narrow,
  fully-specified code or text-edit task.
- Workflow E2E must verify process mechanics, generated docs, native path
  hygiene, and browser verification standards.
- Game fixes made during validation should stay narrowly tied to failed gates
  and be called out as workflow-test fallout.
