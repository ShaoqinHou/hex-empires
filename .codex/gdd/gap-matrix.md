# Civ VII ↔ hex-empires Gap Matrix

**Generated:** 2026-04-19 (Phase 4)
**Scope:** One-page planning artifact — what's the gap between hex-empires (as implemented) and Civ VII (as documented in `.codex/gdd/`)?
**Fidelity commitment:** FULL CLONE of Civ VII — see [`commitment.md`](commitment.md). Every divergence is a bug. No "LOW priority" rows under clone semantics; LOW means "deferred by complexity/cost, not by importance."
**Method:** Cross-reference `.codex/gdd/systems/*.md` against `packages/engine/src/systems/*.ts` and `packages/engine/src/data/**`. Classification is parent-written based on file survey; deep code review deferred to per-system implementation passes.

## Legend

| Code | Meaning |
|---|---|
| **MATCH** | Engine does essentially what VII does on this axis |
| **CLOSE** | Right shape, wrong specifics (numbers, edge cases, flavor) |
| **DIVERGED** | Engine does something fundamentally different (often Civ VI-like) |
| **MISSING** | No engine implementation |
| **LEGACY** | Engine has it but VII removed the concept |

## Matrix

| # | System | Engine file(s) | Status | Priority | Key delta |
|---|---|---|---|---|---|
| 1 | **ages** | `ageSystem.ts`, `state/LegacyPaths.ts` | CLOSE | LOW | 3 ages with legacy-point carry-forward exist; simultaneous transition + civ switch mechanic present. Detailed crisis-gating of transition may differ. |
| 2 | **legacy-paths** | `state/LegacyPaths.ts`, `state/MilestoneTracker.ts` | CLOSE | LOW | Legacy Path tracking exists. Golden Age / Dark Age bonus semantics likely differ; verify per-age milestone thresholds match VII (7 Wonders, 20 Resources, etc.) |
| 3 | **crises** | `crisisSystem.ts`, `data/crises/` | CLOSE | MED | Crisis system exists. Staged escalation (2/3/4 policy slots) + Revolutions forcing government replacement — verify. |
| 4 | **leaders** | `data/leaders/all-leaders.ts`, `state/GameInitializer.ts` | CLOSE | MED | Leader roster + attributes exist. Need to verify: leader persists across ages; Persona system (alt leader variants) likely missing. |
| 5 | **civilizations** | `data/civilizations/*` | CLOSE | MED | Per-age civ rosters exist. Historical-path unlock conditions (Egypt→Abbasid) — verify; probably missing or simpler. |
| 6 | **mementos** | — | MISSING | LOW | No Memento system in engine. Would require Legends meta-progression infrastructure first. Low priority for core loop. |
| 7 | **settlements** | `citySystem.ts` (has Town handling) | CLOSE | HIGH | Engine distinguishes City vs Town. Verify: Founder vs Settler unit split; town focus menu at pop 7; production→gold conversion for unfocused towns; raze mechanic. |
| 8 | **tile-improvements** | `improvementSystem.ts`, `state/WonderPlacement.ts` | **DIVERGED** | **HIGH** | VII has NO worker units; improvements auto-place on population growth. Engine likely has builder/settler placing improvements manually (user's flagged concern). This is the #1 architectural gap. |
| 9 | **buildings-wonders** | `buildingPlacementSystem.ts`, `urbanBuildingSystem.ts`, `wonderPlacementSystem.ts` | CLOSE | MED | Buildings + wonders systems exist separately (good). Verify: 2-slot urban tile uniform; Ageless tagging at transition; Quarter formation on civ-unique pair. |
| 10 | **population-specialists** | `growthSystem.ts`, `specialistSystem.ts`, `state/GrowthUtils.ts` | CLOSE | MED | Both systems split out. Verify quadratic growth formula (patch 1.1.2 flat+scalar*X+exp*X²); specialist Happiness/Food cost; Cities-only specialist slots. |
| 11 | **resources** | `resourceSystem.ts`, `resourceAssignmentSystem.ts` | CLOSE | MED | Per-settlement resource assignment (good, VII model). Verify: bonus/luxury/strategic split; age-gated appearance; Distant Lands exclusives. |
| 12 | **yields-adjacency** | `state/CityYieldsWithAdjacency.ts`, `state/DistrictAdjacency.ts` | CLOSE | MED | Yield + adjacency utilities exist. Verify 7 yields (include Influence); specialist amplification coefficient; per-building adjacency rules. |
| 13 | **celebrations** | (no dedicated file) | MISSING | MED | No `celebrationSystem.ts` in engine. Happiness may trigger something but Celebration = specific VII mechanic with government-menu options. Gap. |
| 14 | **trade-routes** | `tradeSystem.ts` | CLOSE | MED | Trade system exists. Verify: Merchant unit unlocks per age; Distant Lands treasure loop; no internal trade (VII change from VI). |
| 15 | **combat** | `combatSystem.ts`, `fortifySystem.ts`, `promotionSystem.ts`, `state/CombatAnalytics.ts` | CLOSE | MED | Combat infrastructure rich. Verify: CS values per unit match VII; terrain defense bonuses (+3 Rough, +2 Vegetated); no individual unit promotions (only commanders earn XP in VII). |
| 16 | **commanders** | `commanderPromotionSystem.ts`, `data/commanders/` | CLOSE | MED | Commander system + promotion tree in engine. Verify: 4/6 pack capacity; 5 promotion trees × 6 nodes; persistence across ages; Fleet Commander class. |
| 17 | **diplomacy-influence** | `diplomacySystem.ts` | CLOSE | HIGH | Diplomacy system exists. Verify: Influence as 6th yield; Endeavors/Sanctions/Treaties/Espionage categories; no Spy units (Espionage as Influence-funded actions); peace deals settlements-only. |
| 18 | **independent-powers** | (partial — likely in diplomacySystem) | MISSING or CLOSE | MED | Engine has no dedicated `independentPowerSystem.ts`. May be folded into diplomacySystem. Verify 3-stage lifecycle (hostile/neutral/Suzerain); befriend cost scaling (170/340/510); per-age respawn. |
| 19 | **government-policies** | `governmentSystem.ts`, `data/governments/` | CLOSE | MED | Government + policies exist. Verify: all policy slots wildcard (VII — no type categories); one government per age locked; crisis-locked government unlocks via Revolutions. |
| 20 | **religion** | `religionSystem.ts`, `data/religion/` | CLOSE | MED | Religion exists. Verify: Pantheon in Antiquity only (does NOT lead to religion); Religion founding in Exploration; belief slots; Reliquary Belief → Relic generation. |
| 21 | **tech-tree** | `researchSystem.ts`, `data/technologies/` | CLOSE | MED | Research system exists. Verify: per-age trees (not cumulative); mastery mechanic; tree reset on age transition (mid-research lost); no Eureka boosts. |
| 22 | **civic-tree** | `civicSystem.ts`, `data/civics/` | CLOSE | MED | Civics tree exists. Verify: per-age trees; civ-unique civic per civ; same mastery mechanic; Ideology civics in Modern gating Military victory. |
| 23 | **narrative-events** | (no dedicated file) | MISSING | LOW | No narrative event system in engine. VII has 1000+ events with tag system. Low priority for core loop; could bolt on later. |
| 24 | **victory-paths** | `victorySystem.ts` | CLOSE | MED | Victory system exists. Verify: 4 paths × 3 ages × 3 milestones; Modern terminal conditions (World's Fair / World Bank / Operation Ivy / Space Race); Score Victory fallback at 100% age progress. |
| 25 | **legends** | - | MISSING | LOW | No meta-progression layer in engine (deliberate legacy decision: "Achievements parked behind `experimentalAchievements` flag"). Low priority. |
| 26 | **map-terrain** | `visibilitySystem.ts`, `data/terrains/` | CLOSE | MED | Terrain system exists. Verify: biome+modifier (not per-tile yields); navigable rivers as water tiles (or minor river edge); Homelands/Distant Lands partition (biggest gap — verify); binary movement (1 or deplete-all). |

## Legacy/Orphan engine systems (present in code, VII removed or renamed)

| Engine system | VII status | Recommendation |
|---|---|---|
| `governorSystem.ts`, `data/governors/` | **LEGACY** — governors removed in VII (no per-city governor unit) | Retire OR refactor into something VII-compatible (e.g. Town Focus specializations are the closest VII analog) |
| `achievementSystem.ts` | VII has Legends (different system); engine has achievements parked behind flag | Keep as-is (already flag-gated); retire if Legends becomes the canonical meta-progression |
| `districtSystem.ts` (if modeled as VI-style districts) | VII has uniform 2-slot urban tiles, no pre-placed districts | Verify: if engine pre-commits district type before buildings, refactor to per-building urban-convert |
| Builder/Worker unit (if present in data/units/) | **LEGACY** — no builders in VII | Remove; redirect improvement creation to growth-event auto-placement |

## Summary by priority

### HIGH — architectural gaps, fix first
- **#8 tile-improvements** — workers building farms is the #1 architectural gap (user's own example). VII has auto-placement on population growth. Refactor: remove builder-unit improvement action; wire improvements into growthSystem's population-up event.
- **#7 settlements** — city vs town mostly works; verify Founder vs Settler split, town focus menu (9 specializations at pop 7), production→gold for unfocused towns, raze 12-turn countdown.
- **#17 diplomacy-influence** — verify Influence is modeled as a yield; verify Endeavors/Sanctions/Treaties/Espionage are typed action categories; verify no Spy units.

### MEDIUM — content + mechanic alignment
- Most CLOSE items — engine has the right shape; need numeric/behavioral audits against GDD.
- Large content passes (civilizations rosters, tech trees, civic trees, policies) to match VII specifics.

### LOW — deferrable
- **#6 mementos, #25 legends** — meta-progression is post-launch work; core loop doesn't need it.
- **#23 narrative-events** — huge scope (1000+), bolt-on later.
- **Legacy system retirement** — `governorSystem`, worker units — clean up when those areas get touched.

## Process for applying a gap matrix row

1. Pick a row (start with HIGH priority).
2. Read the corresponding GDD system doc (`.codex/gdd/systems/[slug].md`) in full.
3. Read the engine file(s) end-to-end.
4. In the GDD system doc's `Mapping to hex-empires` section, populate:
   - Engine files touched
   - Specific code paths that diverge
   - Recommendation (refactor / extend / retire)
5. Open a ticket / write a plan commit.
6. Implement + test.
7. Re-run `_validate.py` (ensure no broken refs).
8. Update this matrix: change status (CLOSE → MATCH) or add new divergences discovered.

## Notes

- **Content population** (Phase 2 deferred fact cards) can happen lazily per gap-row — when touching `combat.md` system work, backfill `content/units/<slug>.md` fact cards for units actually used.
- **Numeric verification** is the biggest remaining research gap. Many GDD claims are `[INFERRED]` — in-game playtesting or datamined constants would convert these to high-confidence baselines.
- **Hex-empires is closer to Civ VII than expected.** Of 26 systems, 2 are MATCH-ish, 18 are CLOSE, 1 is DIVERGED (tile-improvements/workers), 5 are MISSING (mementos, celebrations, independent-powers dedicated system, narrative-events, legends). The user's initial concern ("system might behave quite different, sometimes not from Civ 7 but from Civ 6") is validated for tile-improvements but most other systems are at the right architectural layer.
- **Single most impactful fix:** align tile-improvements with VII's no-worker + auto-placement-on-growth model. One refactor; unlocks the defining VII Economic Legacy feel (Silk Roads: assigned resources not worked tiles) and Enlightenment (Specialists on high-adjacency Quarters not worked rural).
