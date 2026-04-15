# Project Status

_Last manually updated: 2026-04-16. This file is a **snapshot** of the project and decays with every commit. For live current-state: (a) `bash .claude/hooks/session-start.sh` prints live counts, (b) `/consistency-audit` regenerates the system map, (c) `git log` is truth for recent activity. Do not treat this doc as authoritative between updates._

## Current State
- **Phase:** Feature-complete Civ-style 4X + active Civ VII gameplay-parity work (M5–M19) · **DEPLOYED at https://rehou.games/hex-empires/**
- **Last verified:** 2026-04-15 (post-M19 autonomous parity loop)
- **Tests:** ~1189 engine + ~156 Playwright E2E = ~1345 total, 0 failures, 0 skips
- **Commits:** 220+ (70+ new since M5 kickoff)
- **Bundle:** 524 kB initial JS (unchanged), 9 lazy-loaded panels
- **AI:** Personality system (9 leaders), fog-of-war, threat assessment, diplomacy, age transitions,
  crisis resolution, civic research, tech/civic mastery, unit promotions, trade routes, varied unit production
- **UI:** Modern-RTS interaction (left=select, right=act), path preview, attack overlay, dynamic cursor,
  city cycling (N), capital jump (C), ESC smart-close, turn-ready pulse, autosave every turn
- **Victory:** Cultural, scientific, domination, economic, diplomatic, military, score + Legacy-Path progress exposed

## Civ VII gameplay parity (M5–M19)

Autonomous loop targeting rulebook parity with Civilization VII mechanics. Output spans rulebook
expansion, new subsystems (some live, some standalone-ready), helper modules, bug fixes, and content.

### Rulebook updates
Rulebook is now **1483 lines** (was ~960).
- **§14 Government & Policies** — full expansion: 8 governments, 15 policies, slot rules, switch cadence
- **§18 Religion** — new section: pantheons, founder/follower beliefs, spread, pressure
- **§19 Wonders** — new section: placement constraints, age-gated cost curve, list of age-specific wonders
- Merged from drafts in `rulebook-religion-section.md` / `rulebook-government-expansion.md` (commit `3a853e0`)

### Types added
- `DistrictOverhaul` — urban vs rural slots, Quarter rule, adjacency shapes
- `Commander` — XP, level, promotion tree, traits, `formation` packing
- `Religion` — pantheon slot, founder/follower beliefs, spread state
- `Government` — active government, slotted policies, switch cooldown

### Systems wired into live pipeline (in `DEFAULT_SYSTEMS`, running in-game)
| System | Commit | Handles |
|---|---|---|
| `religionSystem` | `bb7a83d` + `b894483` | `FOUND_PANTHEON`, `FOUND_RELIGION`, writes `GameState.religion` slot |
| `governmentSystem` | `82f80f3` | `SET_GOVERNMENT`, `SLOT_POLICY`, cooldown tracking |
| `urbanBuildingSystem` | `68d6a65` + `c768666` | tile-level building placement, wonder-placement gating via `BuildingPlacementValidator` |
| `commanderPromotionSystem` | `15a4e30` | Commander XP accrual + `PROMOTE_COMMANDER` |

All four were integrated via `GameProvider` using `DEFAULT_SYSTEMS` (commit `c6f2ffe`, M12).

### Systems standalone (pure, tested, NOT yet wired to pipeline)
| System | Commit | Status |
|---|---|---|
| `wonderPlacementSystem` | `6208d5d` | Civ VII constraint validation; integration waits for UI wonder-placement flow |
| `resourceAssignmentSystem` | `9552f4e` | §13.3 Resource-slot assignment; integration waits for UI slot picker |

### New helper modules (pure, reusable, no pipeline coupling)
| Helper | Commit | Purpose |
|---|---|---|
| `DistrictAdjacency` | `5c738d1` | adjacency + Quarter yield calc |
| `CityYieldsWithAdjacency` | `8365679` + `3c314d0` (now live via resourceSystem) | stacked yields = base + adjacency + quarters |
| `BuildingPlacementValidator` | `13d761e` | ownership + territory + tile cap + wonder gating |
| `UrbanPlacementHints` | `8e5fc03` | AI scoring for building placement |
| `LegacyPaths` | `6fa9eb5` + `7e2886a` | 12 paths × 3 tier milestones per §12; exposed on `VictoryState` |
| `EconomyAnalytics` | `71b0351` | cross-player economic snapshots |
| `CombatAnalytics` | `00220c7` | military strength snapshots |
| `MapAnalytics` | `e62b77a` | terrain/feature/resource stats |

### New content (data-driven, zero engine changes)
| Category | New items | Commits |
|---|---|---|
| Pantheons | **16** total | `ccdcbb9` (11) + `91d05b8` (5) |
| Founder beliefs | **10** total | `b6ea01a` (7) + `91d05b8` (3) |
| Follower beliefs | **14** total | `b6ea01a` (10) + `91d05b8` (4) |
| Governments | **8** | `dabd734` |
| Policies | **15** | `dabd734` |
| Commanders | **5** | `992dcee` |
| Commander promotions | **10** | `992dcee` |
| Wonders | **10** new exploration + modern | `164238c` |
| Units | **+2** missing per §7 (gap-v3 C4) | `9d9db07` |

### Bug fixes from gap-analysis-v3 during M5–M19
| ID | Fix | Commit |
|---|---|---|
| B1–B7 | 7 critical rulebook bugs (river penalty, specialist costs, healing, cap penalty, fortification, HP degradation, misc) | `178e70e` (M7) |
| R64a | Hills flat +3 CS defender | `f8f1363` (M15) |
| R66a | Walls +100 HP on placement | `f8f1363` (M15) |
| R64c | Forest flat +2 CS defender (vegetated terrain §6.4) | `14ce1de` (M16) |
| Data | 26 unit stats aligned with §7 | `20878e3` |
| Data | 10 building stats aligned with §8 | `6549643` |
| Data | Fighter + biplane stats align with M6 parity tests | `c22d27a` |

## Gameplay-parity status matrix

Legend: **live** = in `DEFAULT_SYSTEMS` pipeline, affecting actual gameplay · **helper-ready** = pure
module implemented + tested, not yet wired · **pending** = design only or not started

| Subsystem | Engine | Types | Data | Tests | UI | Status |
|---|---|---|---|---|---|---|
| Religion | `religionSystem` live | ✓ | 16 pantheons + 24 beliefs | parity spec + unit | no panel | **live (engine only)** |
| Government | `governmentSystem` live | ✓ | 8 govs + 15 policies | parity spec + unit | no panel | **live (engine only)** |
| Districts (overhaul) | adjacency helpers + `urbanBuildingSystem` live | ✓ spatial fields on `CityState` | existing | unit + 28-case §6 parity | partial | **live** |
| Commanders | `commanderPromotionSystem` live | ✓ | 5 commanders + 10 promotions | unit | no panel | **live (engine only)** |
| Wonders | `wonderPlacementSystem` standalone | — | 10 new | unit | partial (existing BuildingPlacementPanel gates) | **helper-ready** |
| Adjacency (Quarters, spec) | `CityYieldsWithAdjacency` live via `resourceSystem` | — | — | unit | implicit in yield display | **live** |
| Combat §6 | `combatSystem` (existing) + R64a/R66a/R64c fixes | — | — | 28 §6 parity tests | existing | **live** |
| Legacy Paths (§12) | helper + victory exposure | — | — | unit | — (not in VictoryPanel yet) | **helper-ready** |
| Resource slots (§13.3) | `resourceAssignmentSystem` standalone | — | existing resources | unit | none | **helper-ready** |

## Known remaining work

Be honest: below is what's NOT done yet.

- **UI panels missing** for Religion, Government, Commanders — actions dispatchable but no player-facing UI
- **LegacyPath wiring** — progress is exposed on `VictoryState`, but `VictoryPanel` / `VictoryProgressPanel`
  do not yet render the 12 tier-milestone paths
- **AI does not yet dispatch** the new action types: `FOUND_PANTHEON`, `FOUND_RELIGION`, `SET_GOVERNMENT`,
  `SLOT_POLICY`, `PROMOTE_COMMANDER`, `ASSIGN_RESOURCE`. AI personalities / `aiSystem` unchanged.
- **wonderPlacementSystem** not yet in `DEFAULT_SYSTEMS` — wonder placement still uses existing flow;
  the new validator helper is called from `urbanBuildingSystem` but full constraint system not wired
- **resourceAssignmentSystem** not yet in `DEFAULT_SYSTEMS` — no UI slot picker exists
- **Save/load** — religion slot round-trips safely (`5669d06`); government/commander migration paths
  untested on legacy saves (defaults applied, but no migration suite yet)
- **Balance pass** — new content has not been tuned against AI opponents over full games; numbers
  come straight from rulebook §14/§18/§19 without playtest iteration
- **§6 parity spec** (28 tests, commit `a11b169`) documents divergences between current combat and
  Civ VII — those divergences are not all fixed, only R64a/R66a/R64c so far

## Autonomous improvement loop (2026-04-14)
1. Bundle split — `69a3907`
2. Zero-skip E2E + deterministic seed — `d4c7272`
3. Yellow path preview on hover — `867e165`
4. Red attack-target overlay — `0527ef1`
5. Dynamic cursor feedback — `d7cf4db`
6. N key cycles own cities — `5792425`
7. Skip fortified in Space cycle + unmoved count — `a6f7415`
8. End Turn button pulses when 0 units need orders — `9dd54d0`
9. Autosave on every turn advance — `9a9d7d3`
10. ESC smart-close (panel first, then deselect) — `ebdfe99`

## Rulebook Alignment (post-audit, verified 2026-04-10, extended through 2026-04-15)
- ✓ All 7 critical bugs fixed (river penalty, specialist costs, healing, cap penalty, fortification, HP degradation)
- ✓ All 10 missing systems implemented (settlement cap scaling, research/civic mastery, endeavor/sanction yields, war support CS penalty, building categories/maintenance, cap limits)
- ✓ Unit and building stat corrections applied to match rulebook (incl. M5-M19 realignments)
- ✓ §14 Government, §18 Religion, §19 Wonders sections added to rulebook
- ✓ Intentionally simplified systems documented in `.claude/workflow/design/gap-analysis-v3.md`
- ⚠ Civ VII combat parity (§6): 28 tests document behavior; only 3 fixes landed so far (R64a/R66a/R64c)

## Content Inventory (verified from code 2026-04-15)
| Type | Count | Details |
|------|-------|---------|
| Units | 30 (3 ages) | +2 from M5-M19 gap-v3 C4 |
| Buildings | 86 (3 ages) | +10 wonders from M5-M19 |
| Technologies | 41 (3 ages) | 15 antiquity, 12 exploration, 14 modern |
| Civics | 25 (3 ages) | 11 antiquity (3 civ-unique), 8 exploration, 6 modern |
| Civilizations | 16 (3 ages) | 6 antiquity, 6 exploration, 4 modern |
| Leaders | 9 | Augustus, Cleopatra, Pericles, Cyrus, Gandhi, Qin Shi Huang, Alexander, Hatshepsut, Genghis Khan |
| Promotions | 11 (3 tiers) | |
| Commander promotions | 10 | NEW — commander-specific skill tree |
| Commanders | 5 | NEW |
| Pantheons | 16 | NEW |
| Founder beliefs | 10 | NEW |
| Follower beliefs | 14 | NEW |
| Governments | 8 | NEW |
| Policies | 15 | NEW |
| Crisis events | 7 | Plague, Barbarian Invasion, Golden Age, Trade Opportunity, Natural Disaster, Religious Schism, Trade Disruption |
| Resources | 13 | 4 bonus, 4 strategic, 5 luxury |
| Districts | 29 (3 ages) | 10 antiquity, 9 exploration, 10 modern |
| Governors | 18 (3 ages) | 6 per age (governorSystem implemented) |
| Improvements | 7 | Farm, Mine, Pasture, etc. |
| Terrains | 7 + 8 features | |
| UI panels | 13 | (new Religion/Government/Commander panels pending) |
| Test files | 50+ | +18 since M5 |

## Systems Implemented (28 in pipeline — was 24)
1. turnSystem — turn phases, player order
2. visibilitySystem — fog of war, tile visibility
3. effectSystem — civ/leader/legacy ability effects
4. movementSystem — pathfinding, ZoC
5. citySystem — founding, territory, upgrade
6. combatSystem — damage, flanking, first strike, walls, Hills/Forest/Walls R64a/R66a/R64c
7. promotionSystem — unit promotion and experience
8. fortifySystem — unit fortification
9. improvementSystem — tile improvements (farms, mines, etc.)
10. buildingPlacementSystem — city building placement
11. districtSystem — district placement, adjacency bonuses
12. growthSystem — quadratic formula, growth rate modifiers, town specialization, food sharing
13. productionSystem — queues, overflow, rush buying, barracks/workshop bonuses, strategic resources
14. resourceSystem — yields + adjacency + Quarter bonuses (via CityYieldsWithAdjacency), happiness, celebrations
15. researchSystem — tech research, mastery
16. civicSystem — civic research, civ-unique civics
17. ageSystem — age transitions, legacy bonuses, golden/dark ages
18. diplomacySystem — relationships, war support, formal/surprise war, endeavors, sanctions
19. updateDiplomacyCounters — diplomacy turn counters
20. specialistSystem — citizen specialist assignment
21. tradeSystem — merchant unit, trade routes, gold yields
22. crisisSystem — crisis events, trigger conditions, player choices
23. governorSystem — governor recruitment, assignment, promotion
24. victorySystem — domination, science, culture, economic, diplomacy, military, score + LegacyPath progress
25. **religionSystem** — NEW: FOUND_PANTHEON, FOUND_RELIGION, GameState.religion slot
26. **governmentSystem** — NEW: SET_GOVERNMENT, SLOT_POLICY, cooldowns
27. **urbanBuildingSystem** — NEW: tile-level building placement + wonder-placement gating
28. **commanderPromotionSystem** — NEW: Commander XP + PROMOTE_COMMANDER

Standalone (pure, not in pipeline): `wonderPlacementSystem`, `resourceAssignmentSystem`.
Also: `aiSystem` (generateAIActions) — utility, called separately for AI turns.

## Architecture
- 28 pure system functions in pipeline (+2 standalone)
- Data-driven via GameConfig — zero hardcoded content IDs in systems
- Single source of truth (GameState) — now includes optional `religion` slot + commander/government fields on PlayerState
- ~1345 tests (1189 engine + 156 Playwright E2E), strict TypeScript, seeded RNG
- Effect utilities in state/EffectUtils.ts (no cross-system imports)
- Helper modules (DistrictAdjacency, CityYieldsWithAdjacency, BuildingPlacementValidator,
  UrbanPlacementHints, LegacyPaths, EconomyAnalytics, CombatAnalytics, MapAnalytics) are pure,
  reusable, and respect system-independence rule (called from systems, not by other systems)
- effectSystem functional: civ/leader/legacy abilities apply yield, combat, and movement bonuses
- Governor UI panel: recruit, assign to cities, promote abilities
- AI personality system: 9 leaders with unique traits (aggression, expansion, science, etc.)
- AI fog-of-war: only acts on visible information (no cheating)
- AI-vs-AI match simulator for testing strategy
- Playwright E2E: setup screen, gameplay, AI behavior, map integrity, parity specs (forward + strict)
- Game setup screen: leader/civ/map/AI picker
- Right-click context menu: move/attack/fortify/delete units
- Territory borders + improvement/district visual rendering
- Production complete notifications
- Edge scrolling at window edges only
- Click-cycling through stacked units
