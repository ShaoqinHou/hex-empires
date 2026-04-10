# Project Status

## Current State
- **Phase:** Rulebook-aligned — all audit items resolved
- **Last verified:** 2026-04-10 (E2E + re-audit)
- **Tests:** 442 passing across 24 test files
- **Commits:** 42+

## Rulebook Alignment (post-audit, verified 2026-04-10)
- ✓ All 7 critical bugs fixed (river penalty, specialist costs, healing, cap penalty, fortification, HP degradation)
- ✓ All 10 missing systems implemented (settlement cap scaling, research/civic mastery, endeavor/sanction yields, war support CS penalty, building categories/maintenance, cap limits)
- ✓ Unit and building stat corrections applied to match rulebook
- ✓ Intentionally simplified systems documented in `.claude/workflow/design/gap-analysis-v3.md`

## Content Inventory (verified from code 2026-04-10)
| Type | Count | Details |
|------|-------|---------|
| Units | 28 (3 ages) | 11 antiquity, 10 exploration, 7 modern |
| Buildings | 23 (3 ages) | 10 antiquity, 7 exploration, 7 modern (note: ~40% of rulebook buildings missing) |
| Technologies | 35 (3 ages) | 15 antiquity, 10 exploration, 10 modern |
| Civics | 25 (3 ages) | 11 antiquity (3 civ-unique), 8 exploration, 6 modern |
| Civilizations | 16 (3 ages) | 6 antiquity, 6 exploration, 4 modern |
| Leaders | 9 | Augustus, Cleopatra, Pericles, Cyrus, Gandhi, Qin Shi Huang, Alexander, Hatshepsut, Genghis Khan |
| Promotions | 14 (3 tiers) | 7 tier-1, 5 tier-2, 2 tier-3 |
| Crisis events | 7 | Plague, Barbarian Invasion, Golden Age, Trade Opportunity, Natural Disaster, Religious Schism, Trade Disruption |
| Resources | 13 | 4 bonus, 4 strategic, 5 luxury |
| Independent Powers | 3 | Vilnius (scientific), Antananarivo (cultural), Zanzibar (economic) |
| Terrains | 7 + 8 features | |
| UI panels | 13 | |
| Test files | 24 | |

## Systems Implemented
1. turnSystem — turn phases, player order
2. effectSystem — civ/leader/legacy ability effects
3. movementSystem — pathfinding, ZoC
4. citySystem — founding, territory, upgrade
5. combatSystem — damage, flanking, first strike, walls
6. fortifySystem — unit fortification
7. growthSystem — quadratic formula, growth rate modifiers, town specialization, food sharing
8. productionSystem — queues, overflow, rush buying, barracks/workshop bonuses, strategic resources
9. resourceSystem — yields, happiness, celebrations, town gold conversion
10. researchSystem — tech research, mastery
11. civicSystem — civic research, civ-unique civics
12. ageSystem — age transitions, legacy bonuses, golden/dark ages
13. diplomacySystem — relationships, war support, formal/surprise war, endeavors, sanctions
14. victorySystem — domination, science, culture, economic, diplomacy, military, score
15. tradeSystem — merchant unit, trade routes, gold yields
16. specialistSystem — citizen specialist assignment
17. independentSystem — independent powers, envoys, suzerain

## Architecture
- 17 pure system functions in pipeline
- Data-driven via GameConfig — zero hardcoded content IDs in systems
- Single source of truth (GameState)
- 442 tests, strict TypeScript, seeded RNG
