---
purpose: Agent coordination patterns — when to sub-agent, when to parallelize, when to consult multiple for diverse opinions, when to synthesize. Answers "why did I not use sub-agents" and "how do I parallelize safely".
layer: rule
injected-at: session-start, subagent-start
consumed-by: main-agent, orchestrator
last-validated: 2026-04-17
---

# Coordination

When to spawn sub-agents, when to go solo, when to parallelize, when to consult for diverse opinions. These are judgment calls, not hard rules — but the user has historically had to manually say "use sub-agents" or "use agent team" because the default was "do it yourself". This doc makes the decisions visible.

---

## Decision table — should I spawn a sub-agent?

| Situation | Action |
|-----------|--------|
| Trivial / single-step / mechanical edit | Do it yourself. No sub-agent. |
| Research task spanning 5+ files to read | ONE sub-agent with the Agent tool. Returns a synthesized report; your context stays clean. |
| Feature work that can be decomposed into 2+ disjoint file sets | Parallel sub-agents in isolated worktrees via `/spawn-worktree`. |
| Architectural decision with multiple valid approaches | THREE parallel sub-agents with the SAME question, DIFFERENT framings (pragmatist / skeptic / integrator). Synthesize. |
| Verifying a specific claim you're skeptical of | ONE sub-agent with explicit ADVERSARIAL framing — "your job is to find what's wrong, not to agree". |
| Long-running mechanical work (>20 min of file edits) | Delegate to sub-agent to preserve your own context for synthesis / review. |
| Cross-cutting refactor needing consistency | Plan yourself; delegate the mechanical application to sub-agents; review yourself. |
| Review / audit after work lands | Already handled by the commit-review loop — don't duplicate. |

---

## Model selection for sub-agents

| Role | Model | Why |
|------|-------|-----|
| Orchestrator / coordination / YAML parsing / file munging | Sonnet (or Haiku if the SKILL is well-scripted) | Mechanical; judgment isn't the bottleneck |
| Code review / diff analysis | Sonnet | Architectural judgment is the bottleneck; Sonnet is the cost/accuracy sweet spot |
| Fixer / mechanical fix application | Sonnet | Needs to read diff + suggested-fix + rule, produce minimal edit |
| Arbiter / dispute resolution / rule interpretation | Opus | Rare, high-stakes, genuine judgment calls |
| Research / exploration across many files | Sonnet | Token-heavy, Opus expensive |
| Adversarial review / skeptic framing | Sonnet with explicit framing; Opus only if the stakes justify the premium |
| Deep architectural synthesis across 3+ agent reports | Main agent (you), not a sub-agent | You have the context; synthesis is yours to do |

Never use Opus for work where Sonnet would give the same answer — the cost multiplier is 5-10x for diminishing returns.

---

## The consult-three-then-synthesize pattern

For architectural questions where the answer isn't obvious:

1. Phrase the question once; write it down.
2. Spawn three parallel sub-agents with the Agent tool, all same question, three different framings:
   - **Pragmatist:** "What's the MVP? What can we cut?"
   - **Skeptic:** "Rank the top 5 failure modes. What will break?"
   - **Integrator:** "Does the final shape hang together? What's redundant? What's missing?"
3. Wait for all three to return. Read all three reports fully.
4. Synthesize YOURSELF — never just pick one agent's answer. Look for convergence (all three agree? high signal), divergence (disagreement? name the tradeoff explicitly), and novel observations (a specific concrete problem any one agent found that the others missed).
5. Revise your plan based on synthesis. Commit the revision before executing.

Validated uses this session: WF-AUTO-11 commit-review architecture; WF-AUTO-14 self-documentation refactor. Both times the synthesis significantly changed my plan from its initial shape.

---

## Worktree isolation for parallel agents

When spawning ≥2 sub-agents concurrently who will edit code, **always** use `/spawn-worktree` for each. Shared working-tree writes race; the Fixer-writes-to-main bug (WF-AUTO-2b) is the canonical example.

The skill handles:
- `git worktree add -b auto-fix/<name>-<ts> <path>`
- sentinel file for `safe-commit.sh` guard
- cleanup on success / failure

Never ask a sub-agent to do raw `git checkout` into your shared checkout.

---

## Synthesis anti-patterns

- **Picking agent A because they agreed with your draft.** Bias. Prefer the agent who disagreed — they have the signal.
- **Averaging three opinions into mush.** If two say "do X" and one says "don't do X", don't do ½X. Pick a side and say why.
- **Not surfacing disagreement.** If agents diverged, your synthesis should name the tradeoff explicitly — don't hide it.
- **Delegating synthesis.** A fourth sub-agent can validate your synthesis, but they can't produce it — you have the context on why you asked in the first place.

---

## When NOT to sub-agent

- A straightforward edit you already know how to do. Don't burn $0.20 on a sub-agent for a one-line fix.
- A chain of steps where each depends on the previous. Parallel sub-agents produce racing outputs; serialize instead.
- Anything time-sensitive where waiting 3-5 min for a sub-agent is slower than just doing it.
- When the user asked you specifically — not "have an agent do it" — interpret literally.

---

## Continuation directive

Separate from this doc: `workflow/CLAUDE.md` carries the **autonomous-mode** rules — when to keep going through phases, when to pause, etc. Coordination decisions (which sub-agents, which models) are separate from execution cadence (phase stops vs. continuous).
