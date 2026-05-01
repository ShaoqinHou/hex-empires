---
name: Pre-commit hook absorbs staged files into other commits
description: When another agent's commit triggers the pre-commit hook, it may include your staged files in their commit
type: feedback
---

When you stage files (git add) but before committing, another agent's commit can trigger the pre-commit hook which runs git stash + unstash internally. If your files are already staged, they may end up committed as part of the other agent's commit rather than yours.

**Why:** The pre-commit hook runs `git stash` (capturing your staged files), runs tests, then `git stash pop` — this absorbs your staged changes into the triggering commit.

**How to apply:** After `git add`, verify with `git diff --cached` that files are staged. If `git commit` fails with "exit code 1" but your files disappear from `git status`, check `git show HEAD --stat` — they may already be committed by the hook. Don't re-apply the changes; just verify HEAD contains them and move on to the next sub-step.

Also: check `git diff HEAD <file>` returning empty = already committed.
