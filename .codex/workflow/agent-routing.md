# Codex Agent and Model Routing

The project lead is responsible for task design and integration. Agents are
tools for parallelism and throughput, not substitutes for the lead's judgment.

## Routing Table

| Work type | Agent use | Model guidance | Notes |
|---|---|---|---|
| Civ VII source research | Optional explorer | Strong/high reasoning | Use current sources; cite URLs; no code edits |
| GDD/code audit | Optional explorer or strong reviewer | Strong/high reasoning | One system at a time; output findings, not fixes |
| Architecture or refactor design | Usually no worker | Lead / strongest model, preferably GPT-5.5 xhigh when available | Lead owns tradeoffs and cross-system implications |
| Small mechanical implementation | Worker allowed | Spark if fully specified | Exact files, expected diff shape, and tests required |
| Medium implementation slice | Worker allowed | Strong coding model | Disjoint write set; lead reviews diff before commit |
| Large cross-cutting implementation | Split only after design | Strong workers; lead integrates | Do not hand broad architecture to Spark |
| UI/canvas visual verification | Optional verifier | Strong or default | Use browser screenshots and console checks |
| Commit review | Optional reviewer | Strong/high reasoning | Findings first; lead decides fixes |

## Spark Worker Contract

Spark is appropriate when the prompt can be almost procedural:

- One bounded behavior.
- One disjoint write set.
- Known local patterns and examples.
- No external research.
- No ambiguous game-design decision.
- A small test/build command the worker can run.

Spark prompt shape:

```text
Task: <one exact change>
Write scope: <files or directory>
Do not edit outside this scope.
Context already decided:
- <invariant 1>
- <invariant 2>
Implementation steps:
1. <step>
2. <step>
Validation:
- <test command>
Return:
- files changed
- tests run and result
- any uncertainty
```

Escalate back to the lead if any of these happen:

- The worker asks a design question.
- The worker needs more than the supplied file scope.
- Tests fail for reasons it cannot explain quickly.
- The diff touches unassigned files.
- The implementation rewrites surrounding architecture.
- The output is mostly prose instead of a concrete patch.

When escalation is triggered, the lead should inspect the task with the best
available model/reasoning setting before respawning anything. The normal fix is
to split the task smaller, supply a stricter write scope, or move it from Spark
to a stronger coding model.

## Lead Review Gate

Every worker result gets a lead pass before staging:

1. Inspect changed files and test output.
2. Confirm the diff matches the brief and does not hide extra behavior.
3. Run at least the narrow validation locally.
4. Update GDD/audit/tracker artifacts when parity status changes.
5. Commit only after the lead can explain the change.
