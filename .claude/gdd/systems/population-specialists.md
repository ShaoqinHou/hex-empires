# Population & Specialists — Civ VII

**Slug:** `population-specialists`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4.6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/managing-your-empire/ — Firaxis Dev Diary #3
- https://civilization.fandom.com/wiki/Population_(Civ7) (403; recovered via search summaries, last wiki edit ~Sep 2025)
- https://civilization.fandom.com/wiki/Specialists_(Civ7) (403; recovered via search summaries)
- https://civilization.fandom.com/wiki/Food_(Civ7) (403)
- https://civilization.fandom.com/wiki/Settlement_(Civ7) (403)
- https://forums.civfanatics.com/threads/population-growth-formula.694910/ — CivFanatics: Population Growth Formula thread
- https://forums.civfanatics.com/threads/more-tables-for-the-new-growth-formula.697772/ — CivFanatics: patch 1.1.2 constants
- https://steamcommunity.com/sharedfiles/filedetails/?id=3433321457 — Steam: Specialists and Population Formula
- https://www.well-of-souls.com/civ/civ7_cities.html — Well of Souls analyst
- https://game8.co/games/Civ-7/archives/498399 — Game8: Rural and Urban Districts
- https://gamerant.com/civilization-7-quarter-district-rural-urban-explained/ — Game Rant: Districts and Quarters
- https://www.pcgamer.com/games/strategy/how-towns-and-cities-work-in-civilization-7/ — PC Gamer
- https://gamerblurb.com/articles/how-to-increase-settlement-cap-in-antiquity-exploration-and-modern-age-in-civ-7-civilization-7-guide — GamerBlurb
- https://screenrant.com/civ-7-builder-units-population-growth-changes/ — Screen Rant

**Source conflicts noted:** CivFanatics thread documents two formula versions. Original release formula replaced in patch 1.1.2 by quadratic. All data here reflects patch 1.1.2. Specialist adjacency coefficient described as "+0.5 adjacency bonus per specialist" (Game8) or amplification of existing bonus (Steam) — likely same mechanic framed differently.

---

## Purpose

Population is the central resource linking food production to physical city development. Because Civ VII removes Builder units entirely, every tile improvement is gated behind population growth: a city cannot construct a Farm externally — it must grow a new Citizen first, who gets assigned to the tile, triggering auto-improvement. Specialists are the high-value alternative: instead of claiming an undeveloped tile, a Citizen slots into an Urban district to amplify building yields and deliver Science/Culture at the cost of Food/Happiness. This creates continuous tension between wide rural growth and tall specialist stacking. Also replaces Civ VI's Housing mechanic with Settlement Cap as the primary soft brake.

---

## Entities

- `SettlementState.population` — (RW) — total (rural + urban)
- `SettlementState.ruralPopulation` — (RW) — citizens on tile improvements
- `SettlementState.urbanPopulation` — (RW) — citizens auto-added on building completion; does not trigger new growth events
- `SettlementState.foodBucket` — (RW) — accumulated food toward next growth event
- `SettlementState.foodBucketThreshold` — (RW) — recalculated on each growth per formula
- `SettlementState.growthEventCount` — (RW) — X in formula; resets to 0 on age transition
- `SettlementState.specialists` — (RW) — map of urbanTileId → Specialist; Cities only
- `SettlementState.specialistCapPerTile` — (R) — starts at 1; increases with techs/civics
- `SettlementState.focus` — (RW) — Town Focus at pop 7 (null for Cities)
- `TileState.districtType` — (R) — `rural | urban | none`
- `TileState.improvement` — (RW) — auto-set when rural Citizen placed
- `PlayerState.settlementCap` — (RW) — starts at 4
- `GameState.currentAge` — (R) — selects formula constants

---

## Triggers

- **On END_TURN** — add net food to `foodBucket`; if ≥ threshold, fire Growth Event
- **On Growth Event** — increment `ruralPopulation` by 1; present assignment choice; recalculate threshold
- **On BUILD_COMPLETE (in City)** — increment `urbanPopulation` by 1; does NOT fire Growth Event or increment `growthEventCount`
- **On ASSIGN_SPECIALIST** — place Specialist on tile; -2 Food, -2 Happiness; +2 Sci, +2 Cul
- **On PLACE_RURAL** — assign Citizen to tile; auto-place improvement based on terrain/resource; extend borders
- **On SET_TOWN_FOCUS** — lock Town Focus for age
- **On age transition** — reset `growthEventCount` to 0 all settlements; apply new-age formula constants; convert non-capital Cities to Towns (lose specialists); towns lose Focus
- **On UPGRADE_TOWN_TO_CITY** — gain production queue; specialist slots available

---

## Mechanics

### Food bucket and growth events

Each settlement has a food bucket. Every turn, net Food is added. When bucket ≥ threshold:
1. `foodBucket` resets to 0
2. `growthEventCount` increments by 1
3. `ruralPopulation` increments by 1
4. New threshold computed per current age formula
5. Player presented with assignment choice (rural tile or, in Cities, Specialist)

Growth Events fire only from food. Building construction adds Urban Population separately.

### Tile assignment (rural Citizens)

When a Citizen is assigned to a rural tile:
1. Must be within settlement borders
2. Must be unimproved and non-Ocean
3. Must be adjacent to at least one existing Improvement, Building, or Wonder
4. Tile becomes `rural` district
5. **Improvement auto-placed** based on terrain/resources: Grassland/Plains → Farm; Forest → Woodcutter; Mountain/Hills with ore → Mine; Coast/River with fish → Fishing Boat; luxury → improvement
6. Tile contributes yields from next turn
7. Borders expand by one tile

Rural Citizens can be freed (and reassigned as Specialists) only if a Building is later constructed on their tile.

### Specialist assignment (Cities only)

Specialists placed on urban tiles:
1. Cost -2 Food/turn
2. Cost -2 Happiness/turn
3. Produce +2 Science, +2 Culture
4. **Amplify adjacency bonuses** — exact coefficient `[INFERRED]`
5. Building-specific extras (e.g. University grants +1 extra Sci per specialist)

Towns cannot host specialists.

**Capacity starts at 1/tile**, raised by:
- Techs: Currency, Education, Urban Planning, Electricity, Capitalism (+1 each, global)
- Wonders (e.g. Angkor Wat +1 in its settlement)
- Civ abilities (e.g. Majapahit's Negara: +1 in non-capital cities during Exploration)

Quarters (two-building urban tiles) are highest-value specialist targets — adjacency amplification applies to both buildings.

### Building population

Building completion in City increments `urbanPopulation` by 1. Does **not** fire Growth Event or increment `growthEventCount`. If the building tile had a rural Citizen, that Citizen is displaced and returned to the player for reassignment.

### Town vs city rules

| Mechanic | Town | City |
|---|---|---|
| Food bucket growth | Yes, same formula | Yes, same formula |
| Rural assignment | Yes | Yes |
| Specialist assignment | No | Yes |
| Production queue | No (auto → Gold) | Yes |
| Building construction | Limited | Full |
| Town Focus at pop 7 | Yes | N/A |
| Food forwarding when specialized | Yes, to connected City | N/A |

**Town Focus options** (at pop 7, locked until next age): Growing Town (+50% growth), Farming/Fishing Town, Mining Town, Trade Outpost, Fort Town, Religious Site, Hub Town, Urban Center, Factory Town.

Specialized towns (non-Growing) stop local growth; forward food to connected Cities. Urban Center Focus is specialist-like — +1 Culture +1 Science on each Quarter.

### Settlement cap + happiness

- Starting cap: 4
- Penalty: -5 Happiness per excess settlement, applied empire-wide. Max: -35 (at 7+ excess).
- Increases: techs/civics per age (see Formulas).
- Exception: Independent Powers don't count.

Local Happiness must stay ≥ 0 for Specialists and Buildings to operate normally. Global Happiness accumulates to trigger Celebrations.

### Age transition effects

1. **All non-capital Cities revert to Towns.** Capital keeps City.
2. **Specialists dismissed.**
3. **Town Focuses cleared.**
4. **`growthEventCount` resets to 0.** New age's formula starts fresh — early food is cheap.
5. **`specialistCapPerTile` base resets** `[INFERRED]`.

Major constraint: each age begins with only Capital hosting specialists. Must upgrade towns back to cities.

---

## Formulas

### Growth food threshold (post-patch 1.1.2, quadratic)

```
foodBucketThreshold(X) = Flat + (Scalar * X) + (Exponent * X^2)
```

Where X = growthEventCount (0 for first event of new age).

| Age | Flat | Scalar | Exponent |
|---|---|---|---|
| Antiquity | 5 | 20 | 4 |
| Exploration | 30 | 50 | 5 |
| Modern | 60 | 60 | 6 |

Sample Antiquity thresholds:
```
X=0: 5 food
X=1: 29
X=2: 61
X=3: 101
X=5: 205
X=10: 605
```

Cumulative X=0..3: 196 total food (matches CivFanatics' "191 total food to reach pop 5", within rounding).

### Growth Rate modifier

```
effectiveThreshold = foodBucketThreshold(X) * (1 - growthRateModifier)
```

`growthRateModifier` is a summed fraction (Hospital +15% = 0.15, Cannery +10%, Confucius -20%, etc.).

### Settlement cap happiness penalty

```
happinessPenaltyPerSettlement = min(35, max(0, (settlementCount - settlementCap) * 5))
```

Global, per-settlement.

### Specialist economics

```
specialistYield  = +2 Sci, +2 Cul (+ building bonus)
specialistUpkeep = -2 Food, -2 Happiness per specialist/turn
adjacencyEffect  = baseTileAdjacency * amplificationFactor  [INFERRED coefficient]
```

### Settlement cap sources

**Antiquity (+1):** Tech Irrigation; Civic Entertainment; Civic Organized Military
**Exploration (+1):** Tech Feudalism; Civic Mastery Colonialism; Civics Social Class, Sovereignty, Imperialism
**Modern (+1):** Techs Urbanization, Mass Production; Civics Nationalism, Globalism, Hegemony

---

## Interactions

- `systems/settlements.md` — city vs town type; upgrade path; specialist availability derives from settlement type
- `systems/yields-adjacency.md` — specialist adjacency amplification; food yield drives bucket fill
- `systems/buildings-wonders.md` — building construction increments urban population; provides tiles for specialists; Ageless survive transitions
- `systems/tech-tree.md` — techs increase specialist capacity and settlement cap
- `systems/civic-tree.md` — civics raise settlement cap and unlock Town Focuses
- `systems/ages.md` — age transitions reset counter, convert Cities to Towns, dismiss specialists
- `systems/celebrations.md` — global Happiness triggers Celebrations
- `systems/leaders.md` — leader abilities modify growth rate (Confucius -20%)
- `systems/civilizations.md` — civ uniques affect growth or specialists (Majapahit Negara; Inca +15% near mountains)
- `systems/trade-routes.md` — trade routes can deliver food between settlements

---

## Content flowing through this system

- [`content/buildings/`](../content/buildings/)
- [`content/technologies/`](../content/technologies/)
- [`content/civics/`](../content/civics/)
- [`content/tile-improvements/`](../content/tile-improvements/)
- [`content/civilizations/`](../content/civilizations/)
- [`content/leaders/`](../content/leaders/)
- [`content/wonders/`](../content/wonders/)

---

## VII-specific (how this differs from VI/V)

- **No Builder units.** Every improvement is a consequence of a growth event; auto-placed based on tile.
- **Building population separate from growth population.** Buildings don't count toward growth curve exponent.
- **Specialists are City-only.** VI had specialists in any District.
- **Housing mechanic removed.** Replaced by Settlement Cap.
- **Quadratic growth curve** (post-patch 1.1.2). Launch formula was cubic.
- **Town food forwarding.** Specialized towns feed connected Cities.
- **Age transition demotes Cities.** Resets growth counter.
- **Improvement type is automatic.** Player picks tile, not improvement.

---

## UI requirements

- **Growth event prompt** — presents eligible tile slots and specialist option (Cities only); yield preview
- **City population counter** — shows population + food bucket progress
- **Specialist assignment UI** — urban tiles with slots show "Slot Specialist" action; hover shows deltas
- **Settlement cap indicator** — HUD element "current/cap"; overages flagged
- **Town Focus menu** — available at Town pop 7; lists options with lock-confirmation
- **Food forwarding display** — specialized town shows food being forwarded to connected Cities
- **Happiness breakdown tooltip** — itemizes specialist costs, cap penalty, sources
- **"New Citizen" notification** on each Growth Event (non-blocking if deferred)
- **Age transition warning** — cities will revert to towns, specialists dismissed

---

## Edge cases

- No valid rural tile at Growth Event: Citizen pending `[INFERRED]`
- Town with severed City connection: food forwarding behavior unconfirmed
- Building on last rural tile in Town: freed Citizen has no destination `[INFERRED]`
- Age transition with active specialists: all dismissed, freed points not preserved
- Settlement cap at 7+ excess: -35 hard cap
- Negative local Happiness: yields suffer penalties; no auto-dismiss
- Growth Rate approaching 100%: likely threshold floor of 1 `[INFERRED]`
- Independent Power integration: cap status changes `[INFERRED]`
- Specialist capacity reset at age transition: `[INFERRED]`

---

## Open questions

- Exact specialist adjacency coefficient — "+0.5" (Game8) vs multiplier (Steam), no precise value
- Specialist Sci/Cul yield scope (local vs empire-wide)
- Growth Event with no valid assignment (Town) — queue/auto/discard?
- Whether partial food bucket persists across age transition
- Full list of capacity-increasing technologies (5 currently known)
- Growth Rate modifier timing (pre/post formula evaluation)
- Town food forwarding — gross or surplus?

---

## Mapping to hex-empires

**Status tally:** 0 MATCH / 2CLOSE / 2 DIVERGED / 5 MISSING / 0 EXTRA
**Audit:** [.claude/gdd/audits/population-specialists.md](../audits/population-specialists.md)
**Highest-severity finding:** F-01 — Growth formula constants diverge from GDD (quadratic constants mismatch) (CLOSE, HIGH)
**Convergence status:** Divergent — 2 finding(s) require(s) architectural refactor

_(Full details in audit file. 9 total finding(s). Regenerated by `.claude/scripts/aggregate-audits.py`.)_

## Author notes

Fandom URLs 403'd; content recovered via search summaries. Firaxis Dev Diary accessible at corrected URL. Growth formula section highest confidence (CivFanatics patch 1.1.2 thread). Specialist mechanics medium confidence (base yields confirmed; adjacency coefficient ambiguous). Most significant gap: full Fandom wiki content would likely confirm edge cases.

Write/Bash permissions denied to subagent; parent wrote from fenced-block extraction.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
