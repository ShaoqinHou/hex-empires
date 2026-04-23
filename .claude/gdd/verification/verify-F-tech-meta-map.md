# Verification F — tech-tree + crises + narrative-events + victory-paths + mementos + legends + map-terrain

**Verifier:** claude-sonnet-4.6 (agent a05ebfde)
**Total findings:** 68 | ✅ 44 (65%) | ⚠️ 14 | ❌ 11

## Per-audit breakdown

| Audit | ✅ | ⚠️ | ❌ | Total |
|---|---|---|---|---|
| tech-tree | 8 | 4 | 2 | 14 |
| crises | 6 | 1 | 3 | 10 |
| **narrative-events** | **7** | 0 | 0 | 7 |
| victory-paths | 6 | 3 | 3 | 11 (2 deferred = W5-01 project system NOW exists) |
| **mementos** | **6** | 0 | 0 | 6 |
| legends | 6 | 2 | 0 | 8 |
| map-terrain | 5 | 4 | 3 | 12 |

**Narrative Events + Mementos fully resolved.** Legends nearly complete.

## Top 8 MISSING (recommended fix order)

1. **tech-tree F-10** — `TechTreePanel.tsx` dispatches only `SET_RESEARCH`; `SET_MASTERY` engine action has no UI entry — engine complete, UI orphaned
2. **crises F-04** — Age-specific crisis pool + seeded RNG selection absent; `all-crises.ts` flat catalog with no `age`/`crisisType` fields
3. **crises F-06** — `CrisisPanel` still wraps `DramaModal`; 3-stage persistent slot policy UI not built
4. **victory-paths F-10** — Legacy Bonus choice menu absent; milestone tiers score but never award via `CHOOSE_LEGACY_BONUS`
5. **victory-paths F-06** — Score Victory fires at turn 300 not Modern Age 100%; `AgeState` lacks normalized progress ratio
6. **map-terrain F-03** — Binary deplete-all movement absent; `TerrainCost.ts` still additive fractional — tactically wrong for Rough/Vegetated/Wet
7. **map-terrain F-08** — Defense format inconsistency: JUNGLE/MARSH use multiplicative float; Hills/Forest use flat int; river defender penalty missing
8. **tech-tree F-13** — Future Tech remains magic constant, not per-age registry entries; Exploration/Modern Future Tech prerequisites undefined
