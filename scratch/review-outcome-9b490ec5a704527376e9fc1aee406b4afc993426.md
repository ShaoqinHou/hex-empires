---
target-sha: 9b490ec5a704527376e9fc1aee406b4afc993426
final-verdict: PASS
iterations: 2
fix-sha: 5d332a10017046cb90d3974d41647d090dae6612
timestamp: 2026-04-20T00:30:00Z
---

PASS (after fix at 5d332a1).

**BLOCK F-36d8fce8** — clamped per-axis legacy gains to ≥0 in `checkLegacyMilestones`;
stored `clampedPaths` (max of old/new per axis) so `legacyPaths` never regresses within
an age. Career-total-never-decreases invariant restored.

**Open WARNs (for author):**
- F-4a84b534: `killsThisAge ?? totalKills` fallback is dead code post-transition (add clarifying comment)
- F-9281e53f: `totalCareerLegacyPoints` calculation should have monotonicity comment
- F-a9c1f201 (from iter-2): no regression test for TRANSITION_AGE → END_TURN negative-gain scenario
