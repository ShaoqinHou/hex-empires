---
name: git stash danger in parallel agent workflows
description: Using git stash in a parallel-agent session captures and can destroy other agents unstaged changes
type: feedback
---

NEVER use git stash in a parallel-agent workflow. NEVER.

**Why:** (1) git stash captures ALL unstaged changes including those from parallel agents on other files. (2) If you git stash drop (accidentally), other agents WIP is PERMANENTLY LOST and unrecoverable. (3) git stash pop can conflict with your own working-tree changes, forcing drop/abort paths that lose data. Incident: X1 agent stashed X5 working-tree changes, dropped the stash, lost X5 victorySystem.ts implementation permanently.

**How to apply:** To verify pre-existing test failures, use git show HEAD:<file> | wc -c to compare file sizes, or git diff HEAD -- <file> to check specific changes. Run tests with git stash only if you absolutely must and NEVER drop the stash. Prefer always running tests on the full working tree state.