---
name: Tooling can revert edits mid-session
description: Some editor/tooling states have reverted TypeScript file edits immediately after they were applied, showing the old version in system reminders. Verify edits before testing.
type: feedback
---

Editing tools may have their changes reverted by the linter in some session states. Symptoms:
- System-reminder after a tool call shows the OLD file content, not the patched version
- Grep for changed symbols returns empty results after a successful Edit
- Tests still fail on the behavior you just added

**Why:** The linter post-processes files in the background and can reset them. This is session-state dependent (not always reproducible).

**How to apply:** On any Y-wave or later implementation phase:
1. Use Edit tool first
2. After edit, grep for a changed symbol to verify
3. If empty result, reapply the patch and verify again before running tests.

Note: The system-reminder saying "this change was intentional" can be MISLEADING — it may show the linter's revert, not your change. Always verify with grep after edits.
