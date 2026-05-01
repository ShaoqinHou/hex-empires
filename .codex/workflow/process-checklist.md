# Process Checklist

Use this to test the workflow, not just the documents.

## Audit-Only Workflow

1. Pick exactly one GDD system.
2. Read `.codex/gdd/systems/<slug>.md`.
3. Read `.codex/gdd/audits/<slug>.md`.
4. Read the engine/UI files listed by `.codex/gdd/audits/_engine-file-map.md`.
5. Run the source/version gate in `source-target.md`.
6. Scan current code for whether the audit is still true.
7. If only docs are stale, update the audit mapping/tracker. Do not implement a
   gameplay change.
8. Run `.codex/scripts/aggregate-audits.py`.
9. Run `.codex/scripts/test-workflow-e2e.ps1`.
10. Commit the workflow/doc change.

## Implementation Workflow

1. Pick one tracker finding.
2. Lead writes the implementation plan and file scope.
3. Decide whether `gpt-5.3-codex-spark` can handle the final coding step. Use
   Spark only when the work is narrow, mechanical, fully scoped, and has known
   tests.
4. If Spark is used, spawn it explicitly with the worker contract from
   `agent-routing.md`; deterministic scripts and game tests do not request
   models automatically.
5. Lead reviews the worker diff and trouble signals. If Spark repeats an error,
   exceeds scope, fails unclear tests, or returns uncertainty, the lead takes
   over, splits the task, or reroutes to a stronger model.
6. Add or update focused tests.
7. Run narrow tests, then broader tests/build as risk requires.
8. For UI/browser-facing work, follow `.codex/workflow/e2e-standards.md`. If
   full Playwright or build-smoke specs are in scope, run
   `npm --workspace=packages/web run build:deploy` after any normal build and
   immediately before Playwright.
9. Update audit/GDD/tracker status only if the finding's parity changed.
10. Commit on a `codex/` branch.

## Asset Workflow

Status: paused. Do not generate or integrate new asset files until the lead
explicitly re-enables this workflow.

1. Read `.codex/workflow/asset-generation.md` and
   `.codex/skills/generate-asset/SKILL.md`.
2. Create the manifest entry before generating or integrating files.
3. Use only `gpt-image-2` as the final visual asset source.
4. For the first unit pilot, use an idle villager still set with 8 directions
   and aligned team color masks.
5. Validate scale, camera angle, transparency, anchor point, no text/watermark,
   and team mask alignment before integration.
6. Run `npm run assets:validate --workspace=packages/web` after integration.
7. For UI/canvas-visible assets, follow `.codex/workflow/e2e-standards.md`.

## Failure Handling

- If a worker exceeds scope, stop using that output as authoritative.
- If a document and code disagree, current code wins for "what exists"; sourced
  GDD wins for "what should exist".
- If an official source changed after the audit target, do not guess. Record
  source-stale and ask the owner before changing the target snapshot.
