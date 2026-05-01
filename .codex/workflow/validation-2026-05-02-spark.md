# Spark Routing Validation - 2026-05-02

## Purpose

Validate and tighten how the Codex-native workflow uses
`GPT-5.3-Codex-Spark` (`gpt-5.3-codex-spark`) before starting the larger game
refactor.

## Research Basis

OpenAI's February 12, 2026 release note describes GPT-5.3-Codex-Spark as an
ultra-fast, text-only, 128k-context model for real-time coding in Codex. It is
optimized for targeted edits and lightweight interactive work, and it does not
automatically run tests unless instructed.

Source: https://openai.com/index/introducing-gpt-5-3-codex-spark/

Workflow implication: Spark is a throughput worker for bounded implementation,
not a planner or source-of-truth model. The lead must supply exact scope,
constraints, validation commands, and a review gate.

## What Was Tested

- Spawned one Spark worker for a mechanical workflow task: create
  `.codex/scripts/check-agent-routing.ps1` and wire it into
  `.codex/scripts/test-workflow-e2e.ps1`.
- The worker stayed inside the assigned `.codex/scripts` write scope.
- The first check failed because `agent-routing.md` said "Spark" but did not
  explicitly name `GPT-5.3-Codex-Spark` / `gpt-5.3-codex-spark`.
- The lead fixed the routing document, reviewed the worker diff, and reran the
  gate.

## Policy Decision

- Workflow scripts, game tests, asset validation, and e2e checks are
  deterministic. They do not spawn Spark or any other model automatically.
- The lead explicitly chooses whether to spawn Spark after reducing work to a
  narrow, mechanical task with a disjoint write scope.
- Spark trouble signals are escalation triggers: repeated repair prompts,
  unexpected files, unclear test failures, mostly-prose output, slow/hang timing
  classification, or uncertainty about the diff.
- On escalation, the lead takes over, splits the task, gives a narrower repair
  prompt, or reroutes to a stronger model.

## Validation Gates Added

- `.codex/scripts/check-agent-routing.ps1` verifies explicit Spark model naming,
  lead-owned review, bounded/disjoint scope, deterministic no-auto-model
  behavior, escalation/takeover language, and absence of legacy model-routing
  aliases in active workflow docs.
- `.codex/scripts/test-workflow-e2e.ps1` now runs the agent-routing check.
- `.codex/scripts/check-workflow.ps1` requires the agent-routing check script to
  exist.

## Asset Workflow Status

The GPT Image asset workflow remains paused. Its documents are retained as
reference material, but the workflow should not generate or integrate new asset
files until the lead explicitly re-enables it.
