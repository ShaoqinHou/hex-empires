---
name: commit-review
description: Codex-native checklist for reviewing one or more commits with optional reviewer/fixer subagents.
---

# Commit Review

Use this workflow when the user asks to review a commit, when the lead wants a
second read before staging/committing, or when `.codex/workflow/scratch/` has a
queued review marker from an optional helper script.

## Modes

- `HEAD`: review the latest commit.
- `<sha>`: review one commit.
- `range`: review commits in chronological order.
- `queue`: read `.codex/workflow/scratch/review-queue.txt`.

## Lead Preflight

1. Resolve the target sha or range.
2. Run `git show --stat --summary <sha>`.
3. Inspect the touched diff enough to define the review scope.
4. Decide whether to review locally or delegate a bounded read-only reviewer.

## Reviewer Delegation

Use a Codex `explorer` or strong default subagent only for read-only review.
Prompt it with:

```text
Audit commit <sha>.
Read git diff <sha>~1..<sha> and the touched files.
Use .codex/rules/ plus relevant GDD/audit docs.
Return findings first with severity, file, line, issue, and fix.
Do not edit files.
```

The lead owns the verdict. A reviewer finding is evidence, not an automatic
command.

## Fixing Findings

For block-severity findings, either fix locally or use a Codex `worker` with a
strict write scope:

```text
Fix only these block findings: <ids/text>.
Write scope: <files>.
Do not edit outside scope.
Run: <tests>.
Return changed files, tests, and any dispute.
```

The lead reviews the worker diff before staging.

## Principle Gaps

If a real issue does not fit an existing `.codex/rules/` document, append a
`[PRINCIPLE-GAP]` entry to `.codex/workflow/issues.md` with the timestamp,
commit, and one-line pattern. Promote repeated patterns through
`.codex/rules/emerging-traps.md`.

## Exit Criteria

- No unresolved block-severity findings.
- Narrow tests rerun after fixes.
- Outcome recorded in the final response or in
  `.codex/workflow/scratch/review-outcome-<sha>.md` when processing a queue.
