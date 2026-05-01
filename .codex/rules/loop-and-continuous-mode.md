---
title: Loop and continuous work - Codex-native mechanisms
purpose: Define how hex-empires uses Codex agents, background checks, and follow-up automations without hidden runtime hooks.
created: 2026-04-18
revised: 2026-05-01 - converted to Codex-native workflow
---

# Loop and continuous mode

## Core Rule

Use event-driven work for chained implementation and verification. Use
time-driven automation only for independent polling or scheduled reminders.

The project lead owns the loop. Agents and automations are helpers; they do not
own planning, tracker state, final review, staging, or commits.

## Event-Driven Work

Use Codex subagents only when the task is bounded and can run without blocking
the lead's immediate next step.

- Use `explorer` for read-only codebase questions.
- Use `worker` for scoped implementation or verification.
- Give workers a disjoint write scope and tell them they are not alone in the
  codebase.
- Keep hard judgment with the lead: architecture, Civ VII source decisions,
  tracker interpretation, and final diff review.

The lead should keep working on non-overlapping tasks while an agent runs. Wait
only when the next critical-path step needs the result.

## Model Routing

Follow `.codex/workflow/agent-routing.md`.

- Strongest available model for lead planning, source research, parity
  judgment, integration, and review.
- Strong coding model for medium implementation slices.
- Spark only for narrow, guided, low-level edits where the exact files,
  invariants, and tests are already known.

If a Spark worker returns uncertainty, changes unassigned files, or fails tests,
the lead inspects with a stronger model before respawning.

## Time-Driven Work

Use Codex automations only when time is the real trigger:

- follow up later in this thread,
- poll an external status,
- run a scheduled audit,
- remind the lead to revisit a stale source target.

Do not use a timed loop to sequence implementation work. If step N depends on
step N-1, keep it event-driven in the current session.

## Review Loop

Substantive commits need an explicit lead-run review gate:

1. Inspect `git show --stat --summary HEAD`.
2. Inspect the diff for the touched files.
3. Delegate a reviewer only when a second read is worth the overhead.
4. Fix blocking findings.
5. Rerun the narrow verification locally.

The optional scripts under `.codex/hooks/` may queue review state or run checks,
but they must not spawn hidden background model sessions.

## Worktree Guard

When a worker is assigned an isolated worktree, write
`.codex/worktree-sentinel` at that worktree root with the expected absolute
path. Before commit, verify:

```bash
git rev-parse --show-toplevel
```

The resolved path must match the sentinel. If it does not, stop and investigate
instead of committing from the wrong checkout.

## Stop Conditions

Stop and return to the lead when:

- source facts are stale or contradictory,
- a task needs files outside its assigned write scope,
- tests fail for unclear reasons,
- tracker state and code disagree in a way that changes parity interpretation,
- a worker result cannot be explained from the brief.
