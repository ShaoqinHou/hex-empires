# Project Status

## Current State
- **Phase:** Civ VII accuracy iterations (A-C complete, D in progress)
- **Last verified:** 2026-04-09
- **Tests:** 236 passing across 21 test files
- **Commits:** 20

## Civ VII Accuracy Plan Progress

### Iteration A: Core Gameplay Accuracy - DONE
- [x] Tech research locked to current age
- [x] Unit healing system (territory-dependent rates)
- [x] Zone of Control (cavalry ignores)
- [x] Yield display toggle (Lens button)
- [x] City banners with production indicator
- [x] Proper territory border rendering

### Iteration B: Town/City & Happiness - DONE
- [x] Settlement types: Towns (gold) and Cities (production)
- [x] Happiness system replacing housing+amenities
- [x] Town gold purchasing (PURCHASE_ITEM action)
- [x] Settlement upgrade (town to city, 100g)
- [x] Settlement cap with happiness penalty
- [x] Population cap (towns=5, cities=20)

### Iteration C: Civic Tree & Legacy Paths - DONE
- [x] Civic tree (parallel to tech, uses Culture yield)
- [x] 8 antiquity civics with prerequisites
- [x] civicSystem with SET_CIVIC action
- [x] CivicTreePanel UI
- [x] 4 Legacy paths (military/economic/science/culture)
- [x] Legacy milestones (kills, gold, techs, civics)
- [x] Legacy points spent on age transition bonuses
- [x] totalKills and totalGoldEarned tracking

### Iteration D: Diplomacy & Trade - IN PROGRESS
- [ ] Influence yield
- [ ] Relationship stages (helpful→hostile)
- [ ] War Support replaces grievances
- [ ] Formal vs Surprise war types
- [ ] Trade routes (future)

### Iteration E: Victory & Polish - PLANNED
- [ ] Modern-age-only victories with projects
- [ ] Unit banners/flags
- [ ] AI diplomacy improvements
- [ ] More exploration/modern civics

## Content Inventory
| Type | Count |
|------|-------|
| Units | 27 (3 ages) |
| Buildings | 19 (3 ages) |
| Technologies | 35 (3 ages) |
| Civics | 8 (antiquity) |
| Civilizations | 16 (3 ages) |
| Leaders | 8 |
| Promotions | 11 (3 tiers) |
| Crisis events | 5 |
| Terrains | 7 + 8 features |
| UI panels | 13 |
| Test files | 21 |

## Architecture
- 20+ pure system functions in pipeline
- Data-driven via GameConfig — zero hardcoded content IDs in systems
- Single source of truth (GameState)
- 236 tests, strict TypeScript, seeded RNG
