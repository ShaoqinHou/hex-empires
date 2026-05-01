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
3. Decide whether Spark can handle the final coding step. If yes, provide the
   Spark worker contract from `agent-routing.md`.
4. Lead reviews the worker diff.
5. Add or update focused tests.
6. Run narrow tests, then broader tests/build as risk requires.
7. For UI/browser-facing work, follow `.codex/workflow/e2e-standards.md`.
8. Update audit/GDD/tracker status only if the finding's parity changed.
9. Commit on a `codex/` branch.

## Failure Handling

- If a worker exceeds scope, stop using that output as authoritative.
- If a document and code disagree, current code wins for "what exists"; sourced
  GDD wins for "what should exist".
- If an official source changed after the audit target, do not guess. Record
  source-stale and ask the owner before changing the target snapshot.
