# Codex Agent and Model Routing

The project lead is responsible for task design and integration. Agents are
tools for parallelism and throughput, not substitutes for the lead's judgment.

## Routing Table

| Work type | Agent use | Model guidance | Notes |
|---|---|---|---|
| Civ VII source research | Optional explorer | Strong/high reasoning | Use current sources; cite URLs; no code edits |
| GDD/code audit | Optional explorer or strong reviewer | Strong/high reasoning | One system at a time; output findings, not fixes |
| Architecture or refactor design | Usually no worker | Lead / strongest model, preferably GPT-5.5 xhigh when available | Lead owns tradeoffs and cross-system implications |
| Small mechanical implementation | Worker allowed | GPT-5.3-Codex-Spark (`gpt-5.3-codex-spark`) if fully specified | Exact files, expected diff shape, and tests required |
| Medium implementation slice | Worker allowed | Strong coding model | Disjoint write set; lead reviews diff before commit |
| Large cross-cutting implementation | Split only after design | Strong workers; lead integrates | Do not hand broad architecture to Spark |
| UI/canvas visual verification | Optional verifier | Strong or default | Use browser screenshots and console checks |
| Asset workflow planning | Usually no worker | Lead / strongest model | GPT Image 2 prompts, style, masks, and approval stay with lead |
| Asset manifest/file cleanup | Worker allowed | GPT-5.3-Codex-Spark (`gpt-5.3-codex-spark`) if exact paths supplied | No visual direction or prompt design |
| Commit review | Optional reviewer | Strong/high reasoning | Findings first; lead decides fixes |

## Spark Worker Contract

Workflow scripts do not automatically call Spark or any other model. The lead
must explicitly spawn a worker and choose the model for that worker. Game tests,
asset validation, Playwright, and workflow e2e commands are deterministic
checks; they never request agents by themselves.

Use `GPT-5.3-Codex-Spark` (`gpt-5.3-codex-spark`) as a fast implementation
worker only after the lead has already resolved the plan. Spark gets execution,
not ownership: no research, no source interpretation, no architecture, no
tracker decisions, no visual direction, and no commit authority.

Spark is appropriate when the prompt can be almost procedural:

- One bounded behavior.
- One disjoint write set.
- Known local patterns and examples.
- No external research.
- No ambiguous game-design decision.
- A small test/build command the worker can run.

Do not route to Spark when the task depends on:

- Reading broad history or reconciling conflicting docs.
- Deciding Civ VII target behavior.
- Choosing UI/UX direction or art style.
- Refactoring across shared architectural boundaries.
- Debugging an unknown failure with unclear ownership.
- Any change where the lead cannot name the exact write scope up front.

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

## Spark Trouble Signals

Escalate back to the lead if any of these happen:

- The worker asks a design question.
- The worker needs more than the supplied file scope.
- Tests fail for reasons it cannot explain quickly.
- The diff touches unassigned files.
- The implementation rewrites surrounding architecture.
- The output is mostly prose instead of a concrete patch.
- The same worker needs a second repair prompt for the same bounded task.
- The worker repeats a previously corrected mistake.
- Timing logs classify the worker as `SLOW` or `HANG_SUSPECT`.
- The lead cannot explain the diff in one local review pass.

When escalation is triggered, the lead should inspect the task with the best
available model/reasoning setting before respawning anything. The lead may take
over the implementation directly, communicate a narrower repair prompt to the
same Spark worker, split the task smaller, or move it to a stronger coding
model. Do not keep looping Spark on the same failed brief.

## Runtime Tracking

When a worker is spawned for a substantial task, the lead should record the
spawn and completion in `.codex/workflow/scratch/agent-timing.jsonl` using
`.codex/workflow/scripts/log-agent-timing.sh` where the runtime exposes enough
metadata. The timing report is advisory, not a source of truth; the lead review
gate remains mandatory.

## Lead Review Gate

Every worker result gets a lead pass before staging:

1. Inspect changed files and test output.
2. Confirm the diff matches the brief and does not hide extra behavior.
3. Run at least the narrow validation locally.
4. Update GDD/audit/tracker artifacts when parity status changes.
5. Commit only after the lead can explain the change.
