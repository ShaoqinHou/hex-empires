# Civ VII vs Hex Empires — Gap Analysis

Side-by-side comparison. Each row: what Civ VII does, what we do, what needs fixing.

## SETTLEMENTS

| Mechanic | Civ VII | Hex Empires | Gap |
|----------|---------|-------------|-----|
| Town→City upgrade | Costs gold, specific thresholds | 100g flat | OK (simplified) |
| Settlement cap | 3 free, penalty per extra | 3 free, -3 happiness | OK |
| Initial territory | 6 adjacent tiles claimed | radius-1 (7 tiles) | OK |
| Min distance | 3 tiles between settlements | 4 hex distance | OK |
| Town production | All prod→gold, purchase only | Implemented | OK |
| City pop cap | No hard cap (happiness-limited) | Towns=5, Cities=20 | **Should remove hard cap, use happiness** |
| Fresh water bonus | +3 happiness if near river/lake | Not implemented | **MISSING** |
| Palace building | Capital gets Palace (+5 food/prod/happiness) | isCapital flag only | **MISSING: Palace building** |

## GROWTH

| Mechanic | Civ VII | Hex Empires | Gap |
|----------|---------|-------------|-----|
| Growth formula | Age-dependent: Flat + Scalar*x + x^(Exp/10) | 15 + 8*pop | **Too simple — should vary by age** |
| Food per pop | 2 food consumed per specialist | 2 per pop | OK |
| Growth event | Player assigns citizen to tile | Auto | **MISSING: citizen assignment** |
| Starvation | Pop decreases if food < 0 | Food floors at 0 | **MISSING: starvation** |

## COMBAT

| Mechanic | Civ VII | Hex Empires | Gap |
|----------|---------|-------------|-----|
| Damage formula | ~30 * e^(diff/25) * random(0.75-1.25) | 30 * e^(diff/25), no random | **MISSING: combat randomness** |
| Hills defense | +3 CS | +30% (0.3 multiplier) | Different scaling but OK |
| Forest defense | +2 CS | +25% (0.25 multiplier) | OK |
| River penalty | -5 CS for defenders on river | Not implemented | **MISSING** |
| Fortify bonus | +5 CS | +50% multiplier | Different but OK |
| City defense | Walls +100 HP, +15 CS | Walls building exists but no city combat | **MISSING: city attack/defense** |
| Commanders | Commander units with promotion trees | Individual unit promotions | Different system (OK for our scope) |
| Healing | +20 city, +15 friendly, +10 neutral, +5 enemy | +20/+15/+5 | **Neutral should be +10 not +5** |
| Combat randomness | 0.75-1.25 multiplier | No randomness | **MISSING** |
| Health penalty | -1 CS per 10 HP lost | health/100 multiplier | Similar approach |

## RESEARCH

| Mechanic | Civ VII | Hex Empires | Gap |
|----------|---------|-------------|-----|
| Tech per age | ~15 techs per age | 15/10/10 = 35 total | OK |
| Civic per age | ~8-10 per age, civ-unique | 8 antiquity only | **MISSING: exploration/modern civics** |
| Science sources | Buildings, specialists, adjacency | Pop + buildings | OK (simplified) |
| Culture sources | Buildings, specialists | Pop + buildings (in civicSystem) | Need to verify |
| Mastery system | Tier-2 version of each tech/civic | Not implemented | **MISSING** |
| Future Tech | +10 age progress when tree complete | Not implemented | **MISSING** |

## DIPLOMACY

| Mechanic | Civ VII | Hex Empires | Gap |
|----------|---------|-------------|-----|
| Relationship stages | 5 stages | 5 stages implemented | OK |
| War Support | Tug of war, -50 surprise penalty | Implemented | OK |
| Influence yield | Per-turn yield for diplomatic actions | Implemented (+1/city, +2/alliance) | OK |
| Endeavors | Cooperative actions (research collab, etc) | Not implemented | **MISSING but low priority** |
| Sanctions | Hostile actions (hinder morale, etc) | Not implemented | **MISSING but low priority** |
| Independent Powers | Replace city-states, can suzerain | Not implemented | **MISSING** |
| Trade routes | Merchant units walk to destinations | Not implemented | **MISSING** |

## AGES & VICTORY

| Mechanic | Civ VII | Hex Empires | Gap |
|----------|---------|-------------|-----|
| Age transition | All players simultaneously at 100% | Per-player threshold | **Different — should be simultaneous** |
| Legacy paths | 4 paths, milestones, points | Implemented | OK |
| Golden/Dark age | Complete/fail legacy paths | Not implemented | **MISSING** |
| Victory (Culture) | 15 artifacts + World's Fair | Culture >= 500 | **Too simple** |
| Victory (Science) | 3 space projects | All modern techs | **Too simple** |
| Victory (Economic) | 500 Railroad pts + World Bank | Not implemented | **MISSING** |
| Victory (Military) | 20 Ideology pts + Manhattan Project | Not implemented | **MISSING** |
| Victory (Score) | At turn limit, highest legacy score | Turn 300, basic score | **Should use legacy score** |
| Domination | Eliminate all rivals | Eliminate all rivals | OK |
| Turns per game | ~350-430 total | 300 turn limit | OK |

## RESOURCES

| Mechanic | Civ VII | Hex Empires | Gap |
|----------|---------|-------------|-----|
| Bonus resources | Wheat, cattle, etc (+yields) | resource field on tiles but no data | **MISSING: resource definitions** |
| Strategic resources | Iron, horses, niter, etc | Not implemented | **MISSING** |
| Luxury resources | Provide happiness | Not implemented | **MISSING** |

## UI/VISUAL

| Mechanic | Civ VII | Hex Empires | Gap |
|----------|---------|-------------|-----|
| Unit flags/banners | Colored flag with type icon | Canvas-drawn icons | OK for 2D game |
| Hex grid toggle | Via Lens button | Not toggleable | **MISSING: grid toggle** |
| Resource icons on map | Shown via Lens | Not implemented | **MISSING** |

---

## PRIORITY FIX LIST (by impact)

### HIGH (gameplay-affecting)
1. Add exploration + modern civics (currently only antiquity)
2. Add resource system (bonus/strategic/luxury on map tiles)
3. Add combat randomness (0.75-1.25 multiplier)
4. Add starvation (pop loss when food < 0)
5. Remove hard pop cap, rely on happiness instead
6. Add river combat penalty (-5 CS)
7. Fix neutral territory healing to +10
8. Add Future Tech (repeatable, +10 age progress)

### MEDIUM (completeness)
9. Age-dependent growth formula
10. Add Palace building for capital
11. Golden/Dark age effects on age transition
12. Add city combat (walls provide defense, siege required)
13. Simultaneous age transition for all players

### LOW (polish)
14. Endeavors/Sanctions diplomatic actions
15. Trade route system
16. Resource icons on map
17. Independent Powers (city-states)
