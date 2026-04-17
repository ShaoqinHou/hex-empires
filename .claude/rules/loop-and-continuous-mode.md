---
title: Loop & continuous-mode — native Claude Code mechanisms
purpose: Document the canonical ways to run long / recurring / never-stop tasks in hex-empires. Prefer native mechanisms over custom scripts.
created: 2026-04-18
revised: 2026-04-18 — split time-driven vs event-driven; event-driven is the default
---

# Loop & continuous mode — native mechanisms

## The core distinction — event-driven vs time-driven

**Before picking a mechanism, ask: does the next iteration depend on the previous one finishing?**

- **Yes** → event-driven. Use `Agent` / `Bash` with `run_in_background: true`; react to completion notifications. Time-based loops are WRONG here — they have no idea how long your work takes.
- **No** → time-driven. Use `/loop 5m`, `ScheduleWakeup`, or `CronCreate`.

The systems-design loop (spawn 10 subagents, commit each as it finishes) is EVENT-DRIVEN. The interval you'd pick for a time-based loop is meaningless because each agent takes different time. Waiting for completion notifications is free, precise, and cache-efficient.

Most "keep going" tasks in hex-empires are event-driven. Use time-based only for pure polling ("is X ready yet") or scheduled recurrence ("weekly audit").

## Event-driven mechanisms (DEFAULT for chained work)

### 1. `Agent(..., run_in_background: true)` — subagent completion event

```
Agent({
  description: "Design S-01",
  subagent_type: "designer",
  prompt: "...",
  run_in_background: true,
})
```

Delivers a `<task-notification>` when the subagent finishes. The notification lands in my next turn's context. I react, spawn the next one if needed, commit, etc. No polling.

**Parallel fan-out:** multiple `Agent` calls in ONE message → all run concurrently, each delivers its own notification as it finishes. This is how the systems-design loop worked.

**Sequential chain:** spawn agent 1 → wait for its notification → react → spawn agent 2. Each step is event-driven.

### 2. `Bash(..., run_in_background: true)` — command-exit event

Same pattern for shell commands: spawn, wait for exit notification, react. Good for "run tests in background, tell me when done so I can decide what to fix".

### 3. `SendMessage(to: <agent_id>)` — bidirectional message + reply event

When a spawned subagent is still addressable (via its ID or name), `SendMessage` wakes it up with new instructions. Its reply arrives as a notification. Used in the systems-design loop to tell blocked subagents "paste content as text".

### 4. `Monitor` tool — per-line streaming event

For a long-running background command, `Monitor` delivers each stdout line as a separate event. Use when you need to react to mid-process output, not just final exit.

### 5. Stop hook — end-of-turn event

A `Stop` hook in `settings.json` runs when the main agent has nothing more to do in a turn. Can inject a prompt to continue the loop — but **this is the custom-hook territory and risks infinite loops**. Prefer staying in-session with notifications over relying on Stop-hook re-invocation.

## Time-driven mechanisms (only when appropriate)

### 1. `/loop` slash command — interval or self-paced

**Interval mode** (`/loop 5m /check-ci`) — fires every N minutes **regardless of whether the previous iteration finished**. Only correct when iterations are independent polling questions. Examples:
- "Poll the CI server" — each poll is independent; 5 min is fine
- "Check for new emails" — fine
- "Wait for a file to appear" — fine

**NOT correct for:** chained work, multi-step tasks, anything where "did step N finish" matters.

**Self-paced mode** (`/loop /some-task`) — the model calls `ScheduleWakeup` to fire the next iteration. Still time-based (I pick the delay), but I control it. Useful when I'm polling an external event that has no notification hook (e.g., "check if the remote repo has new commits every 20 min").

### 2. `ScheduleWakeup` — self-paced timer

```
ScheduleWakeup({
  delaySeconds: 1800,
  reason: "waiting on user decision for Phase 1.1 tokens",
  prompt: "/loop /continue-master-plan",
})
```

Use for:
- **Idle waits** — waiting for user response, external event with no notification
- **Hybrid timeout** — "wake up in 10 min if the agent hasn't finished"
- **Pacing** — spreading work over time to avoid cache-miss storms

Delay picks:
- 60-270s — cache stays warm; for active polling
- 300s — **worst choice**; pay cache miss without amortizing
- 1200-1800s — default for idle; one cache miss buys 20-30 min of silence
- 3600s — extended idle; rare

### 3. `CronCreate` — scheduled separate-session jobs

```
CronCreate({
  cron: "0 2 * * *",
  prompt: "/consistency-audit",
  ...
})
```

Runs in its own session, independent of any current one. For true recurring jobs that span beyond a single conversation. Examples: nightly audits, weekly dependency checks, monthly stats dumps.

## Hybrid patterns (event + time)

### Pattern A — event with timeout

Spawn a subagent AND schedule a wake-up in case it hangs:

```
Agent({..., run_in_background: true})
ScheduleWakeup({delaySeconds: 600, reason: "timeout for agent X", prompt: "/check-timeout"})
```

If the agent's completion notification arrives first, react to it and the wake-up is harmless (I ignore it). If the wake-up fires first, I check whether the agent is still running and handle the stall.

### Pattern B — event-driven main, time-driven health check

Main loop is event-driven (subagent completions). Separate `/loop 30m /audit-backlog` checks invariants independently. Two loops, one event-driven, one time-driven.

## Decision table — what to use when

| Scenario | Mechanism |
|---|---|
| Spawn 10 agents in parallel, commit each as it finishes | `Agent` × 10 (run_in_background) + react to notifications |
| Chain of "agent 1 → react → agent 2 → react → ..." | Sequential `Agent` calls, each event-driven |
| "Keep going through the master plan, one phase per iteration" | Event-driven: each phase spawn → notification → next phase |
| Poll CI every 5 min | `/loop 5m /check-ci` |
| Run audit weekly | `CronCreate` |
| Wait 30 min for user decision | `ScheduleWakeup(1800s)` |
| Watch a long-running process line-by-line | `Monitor` |
| Timeout a background agent at 10 min | Event + `ScheduleWakeup(600s)` hybrid |
| Bounded task list, 10 items, I do them in sequence | `TodoWrite` + sequential work — not a loop |

## Anti-patterns

- **Writing a custom bash while-true loop.** Native mechanisms handle cache-aware pacing, UI surfacing, auto-compact resume, and interrupt — custom loops miss all of that.
- **Stop-hook re-invocation for "never stop".** Risks infinite loops; hard to interrupt; Claude Code's native mechanisms already support this.
- **Using `/loop 5m` for chained work.** Wrong tool: intervals don't wait for iteration N to finish.
- **Using event-driven for pure polling.** Spawning an Agent just to check "is file X present" is overkill; use `/loop 30s` or `ScheduleWakeup`.
- **Polling the subagent's output file with `cat | grep`.** The Agent tool explicitly warns: "Do NOT Read or Bash tail this file." Use notifications, not polling.

## Implementation check — do I (Claude) know which to pick?

Self-test questions:

| Question | Answer |
|---|---|
| "Do these 10 tasks in parallel, each produces a doc" | `Agent` × 10 with `run_in_background: true`; react to each completion notification; event-driven |
| "Keep working through the plan one phase at a time until done" | Sequential `Agent` calls, each phase triggered by the previous's completion notification; event-driven |
| "Check the deploy every 5 min" | `/loop 5m /check-deploy`; time-driven |
| "Run audit every Sunday 3am" | `CronCreate`; scheduled |
| "Spawn an agent but kill it if it hangs 10 min" | Agent + `ScheduleWakeup(600s)`; hybrid |
| Auto-compact fires mid-chain | Native event-driven: notifications keep arriving; I re-read progress state file + resume |
| User hasn't answered in 30 min, I'm idle | `ScheduleWakeup(1800s)`; time-driven idle wait |
| Long-running subagent with variable duration | Event-driven only; intervals are wrong |

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

## Example — the hex-empires "never-stop-until-done" pattern (event-driven)

For a multi-phase design → implementation → verify cycle:

```
User: "keep going through the master plan, one phase per iteration"

Model (event-driven):
  1. Read .claude/workflow/design/ui-review/08-master-plan.md + progress file
  2. Identify next pending phase
  3. Agent({ subagent_type: "designer" or "fixer" or ..., run_in_background: true })
     — spawns work for this phase
  4. Wait for completion notification (native, no polling)
  5. On notification: verify output on disk, commit, update progress file
  6. If more phases remain → loop back to step 2 (spawn next)
  7. If all done → summarize and END (no ScheduleWakeup)

If auto-compact fires mid-chain: the progress file persists; completion
notifications continue arriving; on wake the model re-reads progress state
and resumes. Event-driven chains are compact-safe as long as the progress
file exists.
```

No `/loop` needed. The "loop" is the natural sequencing of spawn → notification → next spawn. Claude Code handles the plumbing.

## Example — hybrid with timeout

```
1. Agent({ run_in_background: true })  // expected duration ~3 min
2. ScheduleWakeup({
     delaySeconds: 600,                  // 10-min timeout
     reason: "timeout guard for design agent X",
     prompt: "<<autonomous-loop-dynamic>>"
   })
3. If completion arrives first → handle; the wake-up fires and I ignore (state check says "already done")
4. If wake-up fires first → check state, if still running, kill + retry or escalate
```

## Rules of thumb

1. **Event-driven is the default** for chained agent or background work. Completion notifications are free and precise.
2. **Time-based is right only for pure polling or scheduled recurrence** — not for "wait for this thing to finish".
3. **For bounded lists** (do these 10 things in order) — `TodoWrite` + sequential work. No loop framework needed.
4. **Never** write bash while-true loops, Stop-hook self-re-entry, or file-polling. The native event-driven primitives exist; use them.

## When the current hex-empires workflow could use each

- **commit-review hook → spawned claude -p** — today a custom script. Could be replaced by event-driven `Agent` calls from a skill, removing the bash spawn entirely. Deferred; works today.
- **Polling for build completion** — would use `/loop 30s /check-build` if implemented.
- **Nightly consistency audit** — `CronCreate` candidate.
- **Continue through master plan** — event-driven chain (what we should have done for the systems-design loop, and what I'd do now for Phase 1).
