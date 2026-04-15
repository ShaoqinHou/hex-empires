# Gap Analysis v2 — Updated 2026-04-10

Verified against current code. Each item marked with task type for cheaper models.

## Legend
- **DONE** = Implemented and tested
- **CONTENT-ONLY** = Just add data files (follow /add-content skill)
- **NEEDS-SYSTEM** = Requires new system code (see design notes at bottom)

---

## SETTLEMENTS (7/9 DONE)

| Feature | Status | Task Type |
|---------|--------|-----------|
| Town vs City types | DONE | |
| Settlement cap (4 free, -5/overage) | DONE | |
| Min distance (4 hex) | DONE | |
| Initial territory (radius 1) | DONE | |
| Capital Palace (+5/+5/+5) | DONE | |
| Town→City upgrade (100g) | DONE | |
| City defenseHP + walls | DONE | |
| Town specialization at pop 7 | NEEDS-SYSTEM | Design #1 |
| Town food sharing | NEEDS-SYSTEM | Design #2 |

## GROWTH (5/7 DONE)

| Feature | Status | Task Type |
|---------|--------|-----------|
| Quadratic growth formula | DONE | |
| Food per pop (2/pop) | DONE | |
| Starvation | DONE | |
| Happiness growth cap | DONE | |
| Border expansion on growth | DONE | |
| Growth rate modifiers | NEEDS-SYSTEM | Design #3 |
| Citizen assignment | NEEDS-SYSTEM | Design #4 |

## HAPPINESS (5/7 DONE)

| Feature | Status | Task Type |
|---------|--------|-----------|
| -2% yield per negative point | DONE | |
| War weariness (-3/-5) | DONE | |
| Building happiness | DONE | |
| Fresh water bonus (+3) | DONE | |
| Luxury resource happiness | DONE | |
| Celebrations | NEEDS-SYSTEM | Design #5 |
| Specialist happiness cost | NEEDS-SYSTEM | Needs specialist system |

## PRODUCTION (5/6 DONE)

| Feature | Status | Task Type |
|---------|--------|-----------|
| Queue (cities) / purchase (towns) | DONE | |
| Gold purchase cost (4x) | DONE | |
| Production overflow | DONE | |
| Barracks +10% military | DONE | |
| Progress retained on switch | DONE | |
| More production bonuses | CONTENT-ONLY | Add buildings with effects |

## COMBAT (12/13 DONE)

| Feature | Status | Task Type |
|---------|--------|-----------|
| Damage formula + randomness | DONE | |
| Terrain defense bonuses | DONE | |
| River penalty | DONE | |
| Fortification | DONE | |
| City combat + conquest | DONE | |
| ZoC (cavalry ignores) | DONE | |
| Healing (+20/+15/+10) | DONE | |
| First Strike (+5 at full HP) | DONE | |
| 11 promotions | DONE | |
| XP + kill tracking | DONE | |
| Flanking bonus | NEEDS-SYSTEM | Currently stub (returns 0) |

## RESEARCH (4/5 DONE)

| Feature | Status | Task Type |
|---------|--------|-----------|
| Age-locked tech | DONE | |
| Prerequisites | DONE | |
| Future Tech | DONE | |
| Science from buildings | DONE | |
| Mastery system | NEEDS-SYSTEM | Design #6 |

## CIVICS (3/4 DONE)

| Feature | Status | Task Type |
|---------|--------|-----------|
| Separate civic tree | DONE | |
| Age-locked civics | DONE | |
| 22 civics (3 ages) | DONE | |
| Civ-unique civic trees | NEEDS-SYSTEM | Design #7 |

## DIPLOMACY (5/9 DONE)

| Feature | Status | Task Type |
|---------|--------|-----------|
| Relationship stages | DONE | |
| War Support | DONE | |
| Formal/Surprise war | DONE | |
| Alliance/Friendship | DONE | |
| Influence yield | DONE | |
| Endeavors | NEEDS-SYSTEM | Design #8 |
| Sanctions | NEEDS-SYSTEM | Design #8 |
| Trade routes | NEEDS-SYSTEM | Design #9 |
| Independent Powers | NEEDS-SYSTEM | Design #10 |

## AGES & LEGACY (5/5 DONE) - 100%

## VICTORY (7/7 DONE) - 100%

## RESOURCES (4/5 DONE)

| Feature | Status | Task Type |
|---------|--------|-----------|
| 10 definitions | DONE | |
| Spawn on map | DONE | |
| Yield bonuses | DONE | |
| Luxury happiness | DONE | |
| Strategic requirements | CONTENT-ONLY | Add field to UnitDef |

## CONTENT GAPS (can be done by cheaper models)

These only need data file additions — no system code:

| Task | File to Edit | What to Add |
|------|-------------|-------------|
| More exploration buildings | buildings/exploration-buildings.ts | Shipyard, Cathedral, etc |
| More modern buildings | buildings/modern-buildings.ts | Hospital, Airport, etc |
| More leaders | leaders/all-leaders.ts | More leader definitions |
| More crisis events | crises/all-crises.ts | More narrative events |
| More resources | resources/index.ts | More bonus/strategic/luxury |
| More promotions | units/promotions.ts | More combat bonuses |
| Unit icon mappings | web: canvas/UnitIcons.ts | Add draw functions for new units |

---

## OVERALL: 67/84 = 80% complete

---

## DESIGN NOTES (for features needing new system code)

### #1: Town Specialization
**File:** `growthSystem.ts` or new `townSystem.ts`
**New field:** `CityState.specialization: string | null`
**New action:** `SET_SPECIALIZATION { cityId, specialization }`
**Logic:** At pop 7, lock in a specialization. Each grants different yield modifiers. Data-driven: define specialization types as a record. Options: 'growing_town' (+50% growth), 'farming_town' (+1 food on farms), 'mining_town' (+1 prod on mines), 'trade_outpost' (+2 happiness on resources), 'fort_town' (+5 healing), etc.

### #2: Town Food Sharing
**File:** `growthSystem.ts`
**Logic:** On END_TURN, for each town with food surplus, add the surplus to the nearest owned city's food. Simple function after the existing growth loop.

### #3: Growth Rate Modifiers
**File:** `growthSystem.ts` + `BuildingDef`
**New field:** `BuildingDef.growthRateBonus: number` (0-1, e.g., 0.1 = +10%)
**Logic:** In `getGrowthThreshold()`, multiply result by `(1 - totalGrowthRate)` where totalGrowthRate is sum of building bonuses.

### #4: Citizen Assignment
**File:** New `specialistSystem.ts` + `CityPanel.tsx`
**New fields:** `CityState.workedTiles: string[]`, `CityState.specialists: number`
**New action:** `ASSIGN_CITIZEN { cityId, tileKey | 'specialist' }`
**Logic:** Each pop works a tile or becomes a specialist. Specialists: +2 sci, +2 culture, -2 food, -2 happiness. UI: checkbox list of tiles in CityPanel.

### #5: Celebrations
**File:** `resourceSystem.ts`
**New fields:** `PlayerState.celebrationCount: number`, `PlayerState.celebrationBonus: number`, `PlayerState.celebrationTurnsLeft: number`
**Logic:** Sum excess happiness across cities. When total crosses threshold (50, then increasing), increment celebration. Each celebration: +10% production for 10 turns. Decrement turns on END_TURN.

### #6: Mastery System
**File:** `researchSystem.ts` + data
**New field:** `PlayerState.masteredTechs: string[]`
**Logic:** After researching a tech, its mastery becomes available at 80% cost. Completing mastery grants a small bonus (e.g., +1 yield). Add `SET_MASTERY` action or reuse `SET_RESEARCH` with a flag.

### #7: Civ-Unique Civics
**File:** Civic data + `civicSystem.ts`
**New field:** `CivicDef.civId: string | null` (null = universal)
**Logic:** Filter available civics by `civId === null || civId === player.civilizationId`.

### #8: Endeavors & Sanctions
**File:** `diplomacySystem.ts`
**New actions:** `DIPLOMATIC_ENDEAVOR { targetId, type }`, `DIPLOMATIC_SANCTION { targetId, type }`
**New fields on DiplomacyRelation:** `activeEndeavors: string[]`, `activeSanctions: string[]`
**Logic:** Each costs Influence. Endeavors improve relationship and yield bonuses. Sanctions hurt the target's yields. Both last N turns and expire.

### #9: Trade Routes
**File:** New `tradeSystem.ts`
**New type:** `TradeRoute { from: CityId, to: CityId, turnsRemaining: number, yields: YieldSet }`
**New field:** `GameState.tradeRoutes: Map<string, TradeRoute>`
**New unit:** Merchant (civilian, ability: 'create_trade_route')
**New action:** `CREATE_TRADE_ROUTE { merchantId, targetCityId }`
**Logic:** Merchant walks to foreign city, creates route, merchant consumed. Route yields gold per turn for both parties.

### #10: Independent Powers
**File:** New `independentSystem.ts`
**New type:** `IndependentPower { id, name, position, type, suzerain: PlayerId | null, influence: Map<PlayerId, number> }`
**New field:** `GameState.independentPowers: Map<string, IndependentPower>`
**Logic:** Spawn on map during generation. Players spend Influence to gain favor. Highest influence = suzerain (gets bonuses, can levy units). Complex — save for last.

### #11: Resource Icons on Map
**File:** `HexRenderer.ts`
**Logic:** In `drawTerrain()`, after yield dots, if `tile.resource && rc.showYields`, draw a small icon or text label for the resource. Use first letter or emoji.
