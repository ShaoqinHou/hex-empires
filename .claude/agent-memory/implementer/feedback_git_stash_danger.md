---
name: git stash danger in parallel agent workflows
description: Using git stash in a parallel-agent session captures other agents' unstaged changes, causing confusion on pop
type: feedback
---

Never use `git stash` to test baseline test counts when other agents may have unstaged changes in the working tree. The stash will capture ALL unstaged changes including those from parallel agents working on other files.

**Why:** Parallel agents working on disjoint file sets leave unstaged changes in the working tree. `git stash` vacuums all of them up. When you pop, you get those files back, which may introduce failures in test files for those other components.

**How to apply:** To verify pre-existing failures, instead check `git log --oneline` to see if the relevant test files are already committed. Use `git diff HEAD -- <specific-file>` to check if specific files were modified. Do NOT run `git stash` as a testing mechanism mid-session.
