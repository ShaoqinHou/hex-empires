# Workflow Gates

Codex uses explicit lead-run gates instead of hidden editor hooks. The scripts in
`.codex/hooks/` are retained as reusable utilities, but the workflow does not
depend on automatic hook execution.

## Session Start Gate

Run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .codex\scripts\check-workflow.ps1
git status --short --branch
```

This surfaces branch, `node_modules`, dev-server status on port 5174, review
queue state, audit coverage, blank mappings, and source-target warnings.

## Pre-Commit Gate

Before any commit-producing command:

```powershell
git rev-parse --show-toplevel
git status --short
```

For manual worktrees, use the sentinel protocol from
`.codex/skills/spawn-worktree/SKILL.md` and verify the toplevel equals the
assigned worktree path.

## Post-Edit Gate

After TS/TSX edits:

- Run the relevant grep patterns from `.codex/rules/import-boundaries.md`.
- For engine edits, explicitly search touched files for `Math.random()` and
  wall-clock randomness such as `Date.now()` unless the value arrives through an
  action payload.
- For large edits, run `npm run build` or targeted TypeScript checks.

## GDD/Audit Gate

After GDD, audit, or mapping changes:

```powershell
python .codex\scripts\aggregate-audits.py --check
```

Use `python .codex\scripts\aggregate-audits.py` only when intentionally
regenerating tracker and mapping sections.

## Post-Commit Review Gate

For substantive code commits:

1. Lead reviews `git show --stat --summary HEAD` and the touched diff.
2. Delegate a reviewer agent only if the diff is large enough to benefit from a
   second read.
3. Findings lead; summaries are secondary.
4. Fix blocking issues before merging or pushing.

## Test Utility

`.codex/hooks/run-tests.sh` is a reusable test helper. Codex can run it directly,
or use the npm scripts from `package.json`.
