---
title: Loop & continuous-mode — native Claude Code mechanisms
purpose: Document the canonical ways to run long / recurring / never-stop tasks in hex-empires. Prefer native mechanisms over custom scripts.
created: 2026-04-18
---

# Loop & continuous mode — native mechanisms

## The three native mechanisms

### 1. `/loop` slash command — interval or self-paced

The canonical native loop.

**Interval mode:**
```
/loop 5m /some-slash-command
/loop 30m run-tests
```
Fires the given prompt / slash command every N (seconds / minutes). Good for polling ("check the deploy every 5 min"), recurring sweeps ("run /consistency-audit weekly"), or heartbeat tasks.

**Self-paced / dynamic mode:**
```
/loop /some-task
```
No interval given → the model decides when to fire the next iteration. The runtime calls the model with the `/loop` prompt; the model does one unit of work; before returning it calls `ScheduleWakeup` with a `delaySeconds` it chose and the SAME `/loop` prompt. When wake-up fires, the runtime re-enters the /loop skill with the prompt, and the model continues.

Omitting `ScheduleWakeup` ends the loop — the dynamic mode's exit condition. That's how you STOP a self-paced loop.

### 2. `ScheduleWakeup` — the mechanism behind self-paced `/loop`

```
ScheduleWakeup({
  delaySeconds: 1200,
  reason: "Waiting for Reviewer on sha abc123",
  prompt: "/loop /commit-review --drain-queue",   // or <<autonomous-loop-dynamic>>
})
```

Key rules:
- Only meaningful INSIDE a self-paced `/loop` iteration. Outside of a loop, it's ignored.
- `delaySeconds` is clamped to [60, 3600]. Pick based on the Anthropic prompt-cache 5-min TTL:
  - Under 5 minutes (60-270s) — cache stays warm. For active work.
  - 300s is **the worst value** — you pay cache miss without amortizing it.
  - 1200-1800s (20-30 min) — default for idle ticks. Cache misses once but you amortize over a long wait.
- `prompt` — pass the SAME `/loop` input verbatim each turn, OR the sentinel `<<autonomous-loop-dynamic>>` for the autonomous variant.
- `reason` — short telemetry string shown in the UI.
- Omitting the call ends the loop.

### 3. `/schedule` / CronCreate — scheduled remote agents

For truly recurring scheduled tasks (e.g. nightly consistency audit, weekly dependency bump):
```
CronCreate({
  name: "nightly-audit",
  cron: "0 2 * * *",
  prompt: "/consistency-audit",
  ...
})
```
These run as SEPARATE sessions on a cron schedule — not in the current chat. Useful for "every night at 2am, run the audit and post results".

See `.claude/skills/schedule/` if present in this project; `CronCreate`, `CronDelete`, `CronList` are the tools.

## When to use which

| Scenario | Mechanism |
|---|---|
| "Check the build every 5 min until it passes" | `/loop 5m <check>` |
| "Process a queue of work; I (the model) decide pacing" | `/loop <task>` + `ScheduleWakeup` per turn |
| "Babysit a PR for review comments" | `/loop 10m /gh-check-pr` |
| "Nightly scheduled job, separate session" | `/schedule` / `CronCreate` |
| "Spawn 10 parallel subagents RIGHT NOW on disjoint docs" | `Agent` tool, multiple calls in one message (not a loop) |
| "One big bounded task with 10 subtasks, commit each" | `TodoWrite` + sequential work (not a loop) |
| "Forever until user says stop" | `/loop <task>` (dynamic) OR `/loop 30m <task>` (interval) |

## Do NOT build custom

Do not:
- Write a bash `while true; do claude -p ...; done` loop
- Write a Stop hook that re-invokes claude forever (infinite-loop risk; hard to interrupt)
- Manually call Agent-spawn in a tight loop

The native mechanisms handle cache-aware pacing, interruption, UI surfacing, and logging. Custom loops miss all of that.

## Example — the hex-empires "never-stop-until-done" pattern

For a multi-phase design → implementation → verify cycle:

```
User: "keep going through the master plan, one phase per iteration"
Model: 
  1. Invoke /loop without interval
  2. Each iteration:
     - Read .claude/workflow/design/ui-review/08-master-plan.md
     - Read .claude/workflow/design/ui-review/systems/_loop-state.md (or equivalent progress file)
     - Do ONE unit of Phase N (e.g. one sub-phase 1.1.1 token sheet)
     - Update the progress file
     - Commit
     - Decide next iteration delay:
       * Waiting on build? 270s (cache warm)
       * Waiting on user decision? 1800s
       * Nothing pending? STOP (omit ScheduleWakeup — loop ends)
  3. When the progress file says "all phases DONE", omit ScheduleWakeup → loop ends cleanly
```

The progress file is the compact-proof state. If auto-compact fires mid-loop, the re-entry reads the file and resumes.

## Example — the Reviewer → Fixer loop (already native)

The existing `commit-review.sh` hook spawns `claude -p /commit-review --drain-queue` as a BACKGROUND session — that's a custom script, not `/loop`. In retrospect, `/loop` with dynamic pacing + `ScheduleWakeup` would be a cleaner native alternative:

```
/loop /commit-review --drain-queue
```

Would re-enter itself when queue has items, pause (ScheduleWakeup 300-1800s) when empty, and exit when user runs `/commit-review --stop` (not yet implemented). Deferred — the existing hook-based spawn works and isn't worth a rewrite right now.

## Rules of thumb

1. **For "keep going until done on a bounded list"** — use `TodoWrite` + sequential work in ONE conversation. No loop needed.
2. **For "keep going forever / until I stop"** — use `/loop <task>` (dynamic) or `/loop INTERVAL <task>`.
3. **For "run this at scheduled intervals, in its own session"** — use `CronCreate`.
4. **Never** write bash / hook-based self-re-entry. The native mechanisms exist; use them.

## Implementation check — do I (Claude) know which to pick?

Self-test questions:

| Question | Answer |
|---|---|
| User says "keep doing X every 5 min until I stop" | `/loop 5m X` |
| User says "keep going until the whole master plan is implemented" | `/loop /continue-master-plan` (self-paced) OR sequential TodoWrite (bounded) depending on scope |
| User says "run the consistency audit every Sunday at 3am" | `CronCreate` with `cron: "0 3 * * 0"` |
| User says "spawn 10 agents now to write 10 docs in parallel" | 10 `Agent` tool calls in one message — NOT a loop |
| Auto-compact fired mid-loop | Native `/loop` re-enters automatically with the same prompt; I read the progress file on disk and resume |
| User hasn't responded for 30 min but I'm waiting on a decision | `ScheduleWakeup(delaySeconds: 1800)` with `reason: "waiting on user decision on Phase 1.1 tokens"` |

## When the current hex-empires workflow needs `/loop`

Good candidates (not yet implemented — deferred until needed):

- **`/loop /commit-review --drain-queue`** — replacement for the current hook-based spawn. Cleaner native mechanism.
- **`/loop 10m /audit-backlog`** — periodic backlog health check during long implementation phases.
- **`/loop /babysit-phase-1`** — during Phase 1 token migration, re-run tests + check for drift every 20-30 min.

None of these are needed today. Add when the specific use case arrives.
