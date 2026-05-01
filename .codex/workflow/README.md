# Codex Workflow

`.codex/` is the live workflow namespace for hex-empires.

## Authoritative Stores

- `.codex/gdd/` - Civ VII GDD, audits, gap matrix, convergence tracker.
- `.codex/rules/` - engineering rules for engine, UI, tests, and imports.
- `.codex/skills/` - task procedures for panels, HUD, content, verification,
  review, and consistency audits.
- `.codex/scripts/` - workflow checks and generated-doc tooling.
- `AGENTS.md` - root Codex playbook.

Claude Code files are no longer part of the live workflow. Recover them from git
history if a future session needs Claude Code again.

## Normal Task Flow

1. **Git preflight** - branch, status, and worktree root must be clear.
2. **Scope preflight** - classify the task as research, audit, implementation,
   UI/browser verification, or review.
3. **Source freshness** - for Civ VII facts, check `source-target.md` and browse
   official/current sources when the fact may have changed.
4. **Local authority** - read the relevant GDD system doc, audit doc,
   convergence tracker rows, and rule files.
5. **Agent routing** - keep hard judgment with the lead; delegate only bounded
   implementation or verification slices.
6. **Implementation** - prefer small, testable changes.
7. **Verification** - run narrow tests first, then build/e2e checks proportional
   to risk.
8. **Tracking** - update GDD mappings, audits, and tracker only when parity state
   actually changes.
9. **Lead review** - inspect the final diff before staging and committing.

## Required Workflow Checks

Run the full workflow e2e check after workflow, GDD, audit, rules, or script
changes:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .codex\scripts\test-workflow-e2e.ps1
```

Run the generated-doc check before committing GDD/audit mapping updates:

```powershell
python .codex\scripts\aggregate-audits.py --check
```

## Recovery

The previous Claude-oriented workflow is recoverable through git history. Do not
keep parallel live workflow trees in the working copy; if a future branch wants
Claude Code back, restore it explicitly from an earlier commit.

