# Verification A — tile-improvements + ages + legacy-paths

**Verifier:** claude-sonnet-4.6 (agent ad965f56)
**Total findings:** 42 | ✅ 24 | ❌ 9 | ⚠️ 5 | ⏭️ 4

## Top 5 MISSING HIGH

1. **ages F-04** — Legacy bonus selection UI absent; random yield loop at `ageSystem.ts:44-51` auto-applies all bonuses with no pick-N cap
2. **ages F-01** — No simultaneous global transition; per-player sequential only (`ageSystem.ts:16`)
3. **ages F-03** — No crisis gate on transition; `crisisPhase` field exists (GameState.ts:369) but `ageSystem.ts:31-32` ignores it
4. **ages F-02** — Milestone-acceleration absent; flat `+1/turn` at `ageSystem.ts:443`; scoreLegacyPaths not added to ageProgress
5. **legacy-paths F-04** — Golden-age bonuses are flat MODIFY_YIELD; GDD specifies structural effects (GRANT_UNIT_PER_CITY, building retention, city preservation)

## tile-improvements (12 findings)
All 12 ✅ VERIFIED or ⚠️ PARTIAL. No critical MISSING.
- ✅ F-01 BUILDER retired; F-02 PendingGrowthChoice; F-03 derived type; F-05 Quarter catalog; F-06 ageless flags; F-08 specialists spatial; F-09 Farm prereqs; F-10 PLACE_IMPROVEMENT; F-11 ROAD retired
- ⚠️ F-04 legacy districtSystem NOT retired (both in pipeline); F-07/F-12 content thin (GDD docs exist, data files absent)

## ages (17 findings)
4 critical MISSING (F-01-F-04). F-05-F-09, F-14-F-17 ✅. F-10/F-11 PARTIAL (dark-age silver-lining bonuses still present). F-12 (AgeTransitionPanel historical filter) ❌. F-13 (AgeTransitionPanel stale "+5 age progress" tooltip) ❌.

## legacy-paths (13 findings)
Mostly ✅ — F-01 dual schema consolidated, F-02 conquest multiplier, F-05 golden cap, F-07 career total, F-09 per-age counters, F-10 typed points, F-11 global meter all landed. F-04 critical miss. F-03 & F-06 still proxy-based / auto-apply.
