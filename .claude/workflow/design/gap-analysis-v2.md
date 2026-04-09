# Gap Analysis v2 — Verified Against Current Code (2026-04-09)

Every item verified by reading actual source code.

## SETTLEMENTS

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| Town vs City types | Towns=gold, Cities=production | `settlementType` field, towns purchase | DONE |
| Settlement cap | 4 free, -5/overage | FREE_SETTLEMENT_CAP=4, PENALTY=5 | DONE |
| Min founding distance | 3-4 tiles | 4 hex distance | DONE |
| Initial territory | 6 adjacent tiles | range(pos, 1) = 7 tiles | DONE |
| Capital Palace | Auto-built, +5 food/prod/happiness | isCapital, Palace building, +15 happiness | DONE |
| Town→City upgrade | Gold cost scales with city count | Flat 100g | PARTIAL (should scale) |
| Town specialization | At pop 7, choose focus | Not implemented | MISSING |
| Town sends food to cities | Excess food distributed | Not implemented | MISSING |
| City defenseHP | 100 base, +100 with walls | defenseHP field, walls +100 | DONE |

## GROWTH

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| Growth formula | Quadratic: Flat + Scalar*X + Exponent*X² | 30+3x+33x², 20+20x+30x², 20+40x+27x² | DONE |
| Food per pop | 2 per specialist | 2 per pop | DONE |
| Starvation | Pop loss when food < 0 | Implemented | DONE |
| Happiness growth cap | Can't grow when unhappy | happiness >= 0 check | DONE |
| Town pop cap | Soft cap | Towns cap at 5 | DONE |
| Border expansion | On growth | +1 tile per growth, best yield | DONE |
| Citizen assignment | Player picks tile | Auto (highest yield) | PARTIAL (no manual assignment) |
| Growth rate modifiers | Buildings reduce threshold | Not implemented | MISSING |

## HAPPINESS

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| -2% yield per negative point | Up to -100% at -50 | `abs(happiness) * 2`% penalty | DONE |
| War weariness | -3/-5 depending on war support | -3 if warSupport<0, -5 if <-30 | DONE |
| Building happiness | Various buildings give happiness | +1 per building with positive yields | DONE |
| Celebrations | Excess happiness → bonuses | Not implemented | MISSING |
| Fresh water bonus | +3 happiness near river | Not implemented | MISSING |
| Specialist happiness cost | -2 per specialist | Not implemented (no specialists) | MISSING |

## PRODUCTION

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| Production queue | Cities build, towns purchase | Implemented | DONE |
| Gold purchase cost | ~4x production cost | getProductionCost * 4 | DONE |
| Production overflow | Excess carries to next | `newProgress - cost` on completion | DONE |
| Barracks +10% military | Category-specific bonus | Checks barracks + military category | DONE |
| Other production bonuses | Shipyard +10% naval, etc | Not implemented | MISSING |
| Cancel/swap retain progress | Returning to item keeps progress | Not implemented (resets to 0) | MISSING |

## COMBAT

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| Damage formula | ~30 * e^(diff/25) * random | 30 * e^(diff/25) * (0.75-1.25) | DONE |
| Terrain: hills +3 CS | Rough terrain bonus | +0.3 multiplier (feature defense) | DONE |
| Terrain: forest +2 CS | Vegetated terrain bonus | +0.25 multiplier | DONE |
| River penalty | -5 CS on river | -0.15 multiplier | DONE |
| Fortify bonus | +5 CS | +50% multiplier | DONE |
| City combat | Walls +100 HP, +15 CS | defenseHP, city defense 10+15 | DONE |
| City retaliation | Range 2 counter-attack | Implemented for melee attackers | DONE |
| Conquest | Melee captures at 0 HP | Implemented | DONE |
| ZoC | Adjacent enemy stops movement | Implemented, cavalry ignores | DONE |
| Healing | +20/+15/+10/+5 by territory | +20/+15/+10/+5 (fixed) | DONE |
| Commanders | Unit with promotion trees | Individual unit promotions instead | DIFFERENT (OK) |
| First Strike | +5 CS at full HP | Not implemented | MISSING |

## RESEARCH

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| Age-locked tech | Only current age | Implemented | DONE |
| Tech prerequisites | Must have prereqs | Implemented | DONE |
| Future Tech | Repeatable, +10 age progress | Implemented, cost 100 | DONE |
| Tech costs | Data-driven | state.config.technologies | DONE |
| Mastery system | Tier-2 of each tech | Not implemented | MISSING |
| Science per building | Data-driven yields | Building science from config | DONE |

## CIVICS

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| Separate civic tree | Culture-driven | civicSystem, CivicTreePanel | DONE |
| Age-locked civics | Only current age | Implemented | DONE |
| 3 ages of civics | Per-age trees | 8+8+6 = 22 civics | DONE |
| Civ-unique civic tree | Each civ has unique civics | Not implemented | MISSING |

## DIPLOMACY

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| Relationship stages | 5 stages (-100 to +100) | helpful/friendly/neutral/unfriendly/hostile | DONE |
| War Support | -100 to +100, decays | Implemented, ±5/turn decay | DONE |
| Formal vs Surprise war | Formal needs hostile, surprise = -50 WS | Implemented | DONE |
| Alliance requires helpful | relationship > 60 | Implemented | DONE |
| Influence yield | Per-turn resource | +1/city, +2/alliance | DONE |
| Endeavors | Cooperative diplomatic actions | Not implemented | MISSING |
| Sanctions | Hostile diplomatic actions | Not implemented | MISSING |
| Trade routes | Merchant units, resource sharing | Not implemented | MISSING |
| Independent Powers | City-states with suzerainty | Not implemented | MISSING |

## AGES & LEGACY

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| 4 Legacy paths | Military/Economic/Science/Culture | Implemented with milestones | DONE |
| Legacy points | Earned from milestones | +1 per new milestone | DONE |
| Golden Age | 3/3 milestones = powerful bonus | Implemented per path | DONE |
| Dark Age | 0/3 milestones = penalty + small bonus | Implemented per path | DONE |
| Simultaneous transition | All players at once at 100% | Per-player threshold | DIFFERENT |
| Age progress | +1/turn base in Civ VII | +5/tech, +5/civic only | PARTIAL (no per-turn base) |

## VICTORY

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| Domination | Eliminate all rivals | Implemented | DONE |
| Science | All modern techs + culture >= 100 | Implemented | DONE |
| Culture | Culture >= 300 + 5 civics | Implemented | DONE |
| Economic | Gold >= 500 + totalGold >= 1000 + alliance | Implemented | DONE |
| Military | 20 kills + 5 cities | Implemented | DONE |
| Score | Legacy-based at turn 300 | Implemented | DONE |
| Modern-age-only | Victories only in Modern (except domination) | Not enforced | MISSING |

## RESOURCES

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| Resource definitions | 10 types defined | ResourceDef, ALL_RESOURCES | DONE |
| Resources on map tiles | Placed during map gen | resource field on HexTile, but no spawning | PARTIAL |
| Resource yield bonuses | Worked tiles get bonus | Not applied in yield calculation | MISSING |
| Strategic requirements | Iron for swordsman, etc | requiredTech only, no resource req | MISSING |
| Luxury happiness | Luxury resources give happiness | happinessBonus defined but not applied | MISSING |

## UI

| Feature | Civ VII | Our Code | Status |
|---------|---------|----------|--------|
| Yield lens toggle | Hidden by default | YieldsToggle component | DONE |
| City banners | [Pop] [Name] nameplate | Implemented with production indicator | DONE |
| Territory borders | Boundary edges only | Implemented with fill | DONE |
| Unit type icons | Distinct per category | Canvas icons per type | DONE |
| Unit/building cards | Detailed info | UnitCard, BuildingCard components | DONE |
| Grid toggle | Via Lens | Not implemented | MISSING |
| Resource icons on map | Via Lens | Not implemented | MISSING |

---

## STILL MISSING FEATURES (sorted by priority)

### HIGH (affects gameplay significantly)
1. Resources applied to yields (resources exist but don't affect gameplay)
2. Modern-age-only victory enforcement
3. Age progress per-turn base (+1/turn, not just from tech/civic)
4. First Strike combat bonus (+5 CS at full HP)

### MEDIUM (depth features)
5. Resource spawning during map generation
6. Luxury resources providing happiness
7. Strategic resource requirements for units
8. Growth rate modifiers from buildings
9. Town specialization at pop 7
10. Celebrations from excess happiness
11. Fresh water happiness bonus
12. Cancel/swap production retains progress
13. Other production category bonuses (shipyard, amphitheatre)

### LOW (nice to have)
14. Endeavors/Sanctions diplomatic actions
15. Trade routes with merchant units
16. Independent Powers (city-states)
17. Mastery system for techs/civics
18. Civ-unique civic trees
19. Grid toggle lens
20. Resource icons on map tiles
21. Town sends excess food to connected cities
22. Simultaneous age transition
23. Specialist citizen management
