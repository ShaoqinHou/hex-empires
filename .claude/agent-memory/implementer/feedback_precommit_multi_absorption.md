---
name: Pre-commit hook absorbs staged files from other parallel agents
description: When multiple agents stage files simultaneously, pre-commit hook may absorb them all into one commit with mismatched message
type: feedback
---

Pre-commit hook runs after `git add` is done; if other parallel agents also staged files in the same window, those files get swept into the commit. The commit message belongs to whoever ran `git commit` but the diff may contain changes from multiple agents.

**Why:** pre-commit hook calls `npm run test:engine` and then apparently runs `git commit` automatically with the staged files. Other agents' staged files are in the index at the same time.

**How to apply:**
1. After `git add <specific-files>`, verify with `git diff --cached --name-only` before committing.
2. If other files appear staged, `git restore --staged <other-files>` before committing.
3. After commit fails or succeeds, verify your code IS in the tree with `git show HEAD:path/to/file | grep <your_marker>`.
4. If your code landed in another agent's commit, it's still committed — accept it and don't re-commit.
5. Even if your commit fails (exit 1), check `git log` — the hook may have committed on your behalf under a different commit SHA with other agents' work mixed in.
