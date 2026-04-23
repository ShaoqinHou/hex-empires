---
name: Prior session may have already committed brief work
description: Check git log carefully before implementing — another agent session may have committed the brief's work as part of a different commit
type: feedback
---

Check `git log --oneline` and `git show HEAD --stat` before implementing. Prior agent sessions (W3-03) have been observed bundling W3-02 work into their own commit along with their own changes. The files I edited all showed 0 diff vs HEAD because the work was already done.

**Why:** No-isolation agents land commits directly on main. A concurrent or sequential agent doing W3-03 may have read the W3-02 files as part of its context, applied those changes, and committed them in its own commit.

**How to apply:** After the HEAD-ancestry check, run `git show HEAD --stat` and check if any of the brief's target files are in the diff. If they all are, verify tests pass and report "already implemented in HEAD" rather than re-implementing. Check `git show HEAD --format="" -- <file>` for each key file to confirm content matches brief.
