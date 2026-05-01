# hex-empires Codex Workflow

This file is the Codex-native entry point for the project. The live workflow
state lives under `.codex/`. Claude Code artifacts were removed from the working
tree; recover them from git history if needed.

## Mission

hex-empires targets mechanical parity with Civilization VII. Treat
`.codex/gdd/` as the local spec and tracker store, but do not assume it is
current. Before using a GDD or audit row as authority, check the source target
and scan the current code path.

## Lead vs. Agents

The lead session owns planning, source interpretation, architecture, task
decomposition, integration, review, and commits. Agents are used for bounded
side work only after the lead has made the task explicit.

Use agents when the work can be made self-contained:

- Read-only exploration over a defined file set.
- Independent implementation slices with disjoint write scopes.
- Mechanical code edits after the design, target files, invariants, and tests are
  already specified.
- Verification or adversarial review that can run while the lead continues.

Do not delegate:

- Civ VII source/version decisions.
- Architecture choices spanning multiple systems.
- Planning, prioritization, or tracker ownership.
- Final diff review, conflict resolution, or commit decisions.

## Model Routing

Use `.codex/workflow/agent-routing.md` as the routing table.

- Lead / project lead: strongest available model, preferably GPT-5.5 with high
  or xhigh reasoning for research, planning, parity judgment, integration, and
  review.
- Standard workers: strong coding model for medium implementation slices.
- Spark workers (`gpt-5.3-codex-spark` when available): narrow, guided,
  low-level coding or text-edit tasks only after the lead has supplied the exact
  file scope, intended change, constraints, and tests.

Spark is a throughput tool, not a planner. If a Spark task returns uncertainty,
touches unexpected files, fails tests, or changes behavior outside the brief, the
lead inspects and either tightens the task or reruns it with a stronger model.

## Working Loop

1. Start from a clean git understanding: `git status --short --branch`.
2. Read the relevant `.codex/rules/*.md`, GDD system doc, audit, and tracker
   rows before implementation.
3. Run the source freshness gate in `.codex/workflow/source-target.md` for any
   Civ VII claim that may have changed.
4. Decide whether the task is research, audit, implementation, verification, or
   review. Only bounded implementation/verification parts are agent candidates.
5. For visual assets, follow `.codex/workflow/asset-generation.md`; final
   visual asset sources must be GPT Image 2 (`gpt-image-2`).
6. For code changes, add or update focused tests first when practical.
7. Run narrow tests, then broader build/e2e checks proportional to risk.
8. Update GDD mappings, audit docs, or the convergence tracker when parity
   status changes.
9. Review the diff as lead before staging or committing.

## Required Gates

For workflow changes, run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .codex\scripts\test-workflow-e2e.ps1
```

For generated GDD/audit state, run:

```powershell
python .codex\scripts\aggregate-audits.py --check
```

For UI/browser changes, follow `.codex/workflow/e2e-standards.md` and run the
appropriate Playwright or Browser Use verification before stopping.
