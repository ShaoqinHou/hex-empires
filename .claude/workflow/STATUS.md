# Project Status

## Current State
- **Phase:** Feature-complete — playable Civ-style 4X with victory conditions · **DEPLOYED at https://rehou.games/hex-empires/**
- **Last verified:** 2026-04-14 (autonomous loop, 10 improvement cycles)
- **Tests:** 638 engine + 79 Playwright E2E = 717 total, 0 failures, 0 skips
- **Commits:** 150+
- **Bundle:** 524 kB initial JS (down from 602), 9 lazy-loaded panels
- **AI:** Personality system (9 leaders), fog-of-war, threat assessment, diplomacy, age transitions,
  crisis resolution, civic research, tech/civic mastery, unit promotions, trade routes, varied unit production
- **UI:** Modern-RTS interaction (left=select, right=act), path preview, attack overlay, dynamic cursor,
  city cycling (N), ESC smart-close, turn-ready pulse, autosave every turn
- **Victory:** Cultural, scientific, domination, economic, diplomatic, military, and score victories all functional

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

## Rulebook Alignment (post-audit, verified 2026-04-10)
- ✓ All 7 critical bugs fixed (river penalty, specialist costs, healing, cap penalty, fortification, HP degradation)
- ✓ All 10 missing systems implemented (settlement cap scaling, research/civic mastery, endeavor/sanction yields, war support CS penalty, building categories/maintenance, cap limits)
- ✓ Unit and building stat corrections applied to match rulebook
- ✓ Intentionally simplified systems documented in `.claude/workflow/design/gap-analysis-v3.md`

## Content Inventory (verified from code 2026-04-10)
| Type | Count | Details |
|------|-------|---------|
| Units | 28 (3 ages) | 11 antiquity, 10 exploration, 7 modern |
| Buildings | 76 (3 ages) | 23 antiquity, 27 exploration, 26 modern (includes wonders) |
| Technologies | 41 (3 ages) | 15 antiquity, 12 exploration, 14 modern |
| Civics | 25 (3 ages) | 11 antiquity (3 civ-unique), 8 exploration, 6 modern |
| Civilizations | 16 (3 ages) | 6 antiquity, 6 exploration, 4 modern |
| Leaders | 9 | Augustus, Cleopatra, Pericles, Cyrus, Gandhi, Qin Shi Huang, Alexander, Hatshepsut, Genghis Khan |
| Promotions | 11 (3 tiers) | |
| Crisis events | 7 | Plague, Barbarian Invasion, Golden Age, Trade Opportunity, Natural Disaster, Religious Schism, Trade Disruption |
| Resources | 13 | 4 bonus, 4 strategic, 5 luxury |
| Districts | 29 (3 ages) | 10 antiquity, 9 exploration, 10 modern |
| Governors | 18 (3 ages) | 6 per age (governorSystem implemented) |
| Improvements | 7 | Farm, Mine, Pasture, etc. |
| Terrains | 7 + 8 features | |
| UI panels | 13 | |
| Test files | 32 | |

## Systems Implemented (24 in pipeline order)
1. turnSystem — turn phases, player order
2. visibilitySystem — fog of war, tile visibility
3. effectSystem — civ/leader/legacy ability effects
4. movementSystem — pathfinding, ZoC
5. citySystem — founding, territory, upgrade
6. combatSystem — damage, flanking, first strike, walls
7. promotionSystem — unit promotion and experience
8. fortifySystem — unit fortification
9. improvementSystem — tile improvements (farms, mines, etc.)
10. buildingPlacementSystem — building placement in cities
11. districtSystem — district placement, adjacency bonuses
12. growthSystem — quadratic formula, growth rate modifiers, town specialization, food sharing
13. productionSystem — queues, overflow, rush buying, barracks/workshop bonuses, strategic resources
14. resourceSystem — yields, happiness, celebrations, town gold conversion
15. researchSystem — tech research, mastery
16. civicSystem — civic research, civ-unique civics
17. ageSystem — age transitions, legacy bonuses, golden/dark ages
18. diplomacySystem — relationships, war support, formal/surprise war, endeavors, sanctions
19. updateDiplomacyCounters — diplomacy turn counters
20. specialistSystem — citizen specialist assignment
21. tradeSystem — merchant unit, trade routes, gold yields
22. crisisSystem — crisis events, trigger conditions, player choices
23. governorSystem — governor recruitment, assignment, promotion
24. victorySystem — domination, science, culture, economic, diplomacy, military, score

Also: `aiSystem` (generateAIActions) — not a pipeline system, called separately for AI turns.

## Architecture
- 24 pure system functions in pipeline
- Data-driven via GameConfig — zero hardcoded content IDs in systems
- Single source of truth (GameState)
- 664+ tests (616 engine + 48 Playwright E2E), strict TypeScript, seeded RNG
- Effect utilities moved to state/EffectUtils.ts (no cross-system imports)
- effectSystem functional: civ/leader/legacy abilities apply yield, combat, and movement bonuses
- Governor UI panel: recruit, assign to cities, promote abilities
- AI personality system: 9 leaders with unique traits (aggression, expansion, science, etc.)
- AI fog-of-war: only acts on visible information (no cheating)
- AI-vs-AI match simulator for testing strategy
- Playwright E2E: setup screen, gameplay, AI behavior, map integrity
- Game setup screen: leader/civ/map/AI picker
- Right-click context menu: move/attack/fortify/delete units
- Territory borders + improvement/district visual rendering
- Production complete notifications
- Edge scrolling at window edges only
- Click-cycling through stacked units
