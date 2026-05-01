---
name: In-flight work collision pattern (hex-empires subagent sessions)
description: Other work packages may have modified files before this agent runs; failing tests from unrelated WIP are not scope regressions
type: project
---

When git stash pop shows modified files like DistrictOverhaul.ts, urbanBuildingSystem.ts, growthSystem.ts, specialistSystem.ts — these represent other parallel work packages (W3-01, W3-02, W3-08, etc.) that are in-flight in the working tree but not yet committed by the time this agent runs.

Test failures from those files (e.g. CityYieldsWithAdjacency, urbanBuildingSystem) are NOT regressions from this agent's changes.

**Why:** The no-isolation mode means all agents share the same working tree. When one agent's linter auto-commits a file (e.g. GameState.ts), the changes land in HEAD. When another agent checks out, stashes, and pops, they may discover pre-existing WIP failures.

**How to apply:**
1. Run git stash first to check baseline — if test X fails without your changes, it's pre-existing.
2. Don't git stash in concurrent sessions (see feedback_git_stash_danger.md) — use direct git diff HEAD instead.
3. When reporting to parent: list pre-existing failures explicitly, distinguish from scope regressions.
4. A field added to GameState.ts by this agent may already appear in HEAD if another agent committed a change to that file concurrently.
