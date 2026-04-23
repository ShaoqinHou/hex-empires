---
name: No-isolation concurrent agent collision
description: When isolation:worktree is NOT set, parallel agents share the same checkout — working-tree edits are visible across sessions and can be picked up by concurrent agent commits
type: feedback
---

In no-isolation mode, all agents share the same working tree. A concurrent agent may commit your working-tree edits (from Edit/Write tool calls) before you commit them yourself.

**Why:** `isolation: worktree` is intentionally disabled for hex-empires subagents because worktrees snapshot from `origin/main` not local `HEAD`. Without isolation, all commits land directly on `main` from the parent checkout. The tradeoff is concurrent agents can see and include each other's uncommitted work.

**How to apply:**
- After any Edit/Write to engine files, immediately check `git diff HEAD --name-only` to see what's staged vs committed.
- If a concurrent commit (e.g. W2-07 implementer) has already picked up your working-tree changes, they appear in that commit — not in your diff. Verify with `git show <sha> -- path/to/file`.
- When tests were passing and then a concurrent commit changes them, check if your code landed in that commit.
- For tests that were appended via `cat >>`: if HEAD's file is larger than what you started with, the concurrent agent may have written over your append. Verify with `wc -l` vs `git show HEAD:file | wc -l`.
