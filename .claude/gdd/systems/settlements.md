# Settlements (Cities vs Towns) — Civ VII

**Slug:** `settlements`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4.6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/managing-your-empire/ — Firaxis Dev Diary #3: Managing Your Empire
- https://www.pcgamer.com/games/strategy/how-towns-and-cities-work-in-civilization-7/ — PC Gamer: How Towns and Cities Work in Civilization 7
- https://game8.co/games/Civ-7/archives/495205 — Game8: Civ 7 Town Specializations Guide
- https://www.thegamer.com/civilization-7-town-types-guide/ — TheGamer: Complete Guide To Towns
- https://chillplacegaming.com/cities-vs-towns-cilivization-7/ — Chill Place Gaming: Cities vs Towns
- https://comradekaine.com/civilization7/towns-vs-cities-in-civilization-vii-understanding-the-new-settlement-system/ — Comrade Kaine: Towns vs Cities
- https://www.well-of-souls.com/civ/civ7_cities.html — Well of Souls: Civilization VII Analyst (Cities)
- https://gamerblurb.com/articles/how-to-increase-settlement-cap-in-antiquity-exploration-and-modern-age-in-civ-7-civilization-7-guide — GamerBlurb: Settlement Cap Guide
- https://clawsomegamer.com/how-to-upgrade-towns-to-cities-in-civilization-7/ — ClawsomeGamer: Upgrade Towns to Cities
- https://gamerant.com/civilization-vii-should-you-keep-city-raze-cities-choice-razing-effects-civ-7/ — GameRant: Should You Raze Cities?
- https://www.pcgamer.com/games/strategy/civilization-7-age-transition-effects/ — PC Gamer: Age Transition Effects
- https://steamcommunity.com/app/1295660/discussions/0/598519066984992693/ — Steam: Settlement Cap Advice (community)

**Source conflicts noted:** Minor conflict on exact Farming Town / Mining Town bonus values. Game8 and PC Gamer cite "+1" on the relevant tiles; TheGamer cites "+2". The +1 value aligns with two independent sources. TheGamer's value may reflect a patch-era change; tagged `[source-conflict]` in the Mechanics section.

---

## Purpose

The Settlement system is the central empire-building mechanic of Civ VII, governing how players expand across the map, manage cities and towns, and navigate the trade-off between growth and specialization. Civ VII's signature innovation is that every new settlement begins as a **Town**, not a City. Unlike previous entries where every founded city immediately gained full production capability, towns in Civ VII are limited-function settlements that automatically convert production to gold and cannot build units or most buildings directly. This creates a meaningful decision layer throughout every age: when to convert a town to a full city (paying a gold cost), how to specialize towns that remain as towns, and how many settlements to sustain within the empire's Settlement Cap. The system replaces the single "city" abstraction of Civ V and VI with a two-tier settlement hierarchy, reducing late-game micromanagement while adding strategic texture to expansion decisions.

---

## Entities

- `PlayerState.capital` — (RW) — the founding city; always city tier; never reverts to town; changes if player moves capital
- `PlayerState.cities` — (RW) — set of city-tier settlements owned by this player
- `PlayerState.towns` — (RW) — set of town-tier settlements owned by this player
- `PlayerState.settlementCap` — (R) — current maximum settlements before happiness penalty; computed from base + tech/civic/attribute bonuses
- `PlayerState.settlementsOwned` — (R) — count of all owned settlements (cities + towns); compared against cap each turn
- `CityState.tier` — (RW) — `town | city`; set on founding, conversion, and age transition
- `CityState.population` — (RW) — current population; drives tile-claiming, specialist slots, and specialization unlock threshold
- `CityState.focus` — (RW) — `null | growing | fort | urbanCenter | farming | mining | tradeOutpost | religiousSite | hubTown | factoryTown`; locked per age once set (except swap between Growing and the chosen focus)
- `CityState.productionQueue` — (RW) — present only when `tier == city`; absent when `tier == town`
- `CityState.localHappiness` — (RW) — influenced by settlement cap pressure, specialists, buildings; feeds global happiness aggregate
- `GameState.settlementCapBase` — (R) — base cap per age before per-player bonuses
- `Tile.owner` — (RW) — settlements claim adjacent tiles as population grows
- `Tile.improvement` — (RW) — auto-placed when a rural tile is claimed by growing population (no worker units)

---

## Triggers

- On **FOUND_SETTLEMENT** (player action) — dispatched by a Founder or Settler unit; creates a new settlement; sets `tier` based on unit type (Founder → `city`, Settler → `town`); increments `settlementsOwned`; claims the center tile; consumes the founding unit
- On **END_TURN** (every turn, all players) — evaluates food accumulation vs. growth threshold; on threshold: increments population, auto-claims adjacent tile and places improvement, or assigns specialist; for town tier: converts all production yield to gold; evaluates `settlementsOwned > settlementCap` → applies happiness penalty if exceeded
- On action **CONVERT_TO_CITY** (player action, towns only) — deducts gold cost (scaled by city count and town population); changes `tier` from town to city; initializes `productionQueue`; removes any active focus
- On action **SET_TOWN_FOCUS** (player action, towns with population ≥ 7) — sets `focus` field; locks for the age; redirects food yield to connected cities (except Growing Town, which retains local food for continued growth)
- On **RAZE_SETTLEMENT** (player action, enemy captured settlement) — enters 12-turn razing countdown; settlement yields zeroed during countdown; on countdown expiry: removes settlement and borders; applies war-support penalty against all opponents; generates grievances with the former owner
- On **age transition** — all non-capital cities downgrade to town tier; town focus fields reset to null; EXCEPTION: if Economic Golden Age legacy was earned in the prior age, all cities retain city tier; capital always retains city tier

---

## Mechanics

### Founding: Founder vs. Settler

Every game begins with a **Founder** unit (not a Settler). The Founder is a one-time unit that cannot be retrained after use. When the Founder uses the **Found City** action, the new settlement is created immediately as a full **City** — this is the player's capital and the only settlement that begins at city tier. The Founder unit is consumed on use.

All subsequent settlements are created by **Settler** units, which are trained normally in cities. When a Settler uses the **Found Town** action, the new settlement begins as a **Town**. The Settler unit is consumed.

A settlement's founding claims the center tile. Adjacent tiles within the first ring are within the settlement's potential border expansion. New citizens claim additional tiles as population grows.

### Towns: Capabilities and Limitations

Towns are restricted-function settlements. Their behavioral rules:

1. **No production queue.** All production yield is automatically converted to gold (conversion described as 1:1 by implication in sources; exact rate `[INFERRED]`).
2. **Gold purchases only.** Limited infrastructure and basic buildings can be purchased with gold; the purchasable range is narrower than in cities.
3. **Cannot train military units.** Towns cannot produce units via production. `[INFERRED from "cities can train units"; the extent of town gold-purchase unit capability is unclear]`
4. **Population and tile-claiming function normally.** Towns grow via food accumulation and claim adjacent tiles. Population growth triggers automatic tile improvements on newly-claimed rural tiles (farms, mines, plantations, etc.) — no worker units required.
5. **Walls only on central district.** Towns can only wall their central district tile, making them significantly easier to capture than cities.
6. **Food forwarding when focused.** Once a town selects a non-Growing specialization, it redirects all food yield to connected cities (connected via road or trade network `[INFERRED: connection type not specified in sources]`). The town's own population growth halts in favor of feeding other cities. If the town has no connection to a city, it continues growing independently.

### Cities: Full Production

A City has all capabilities absent from towns:

1. Full **production queue** — can build buildings, units, districts (Quarters), and Wonders turn-by-turn via hammers.
2. Can train and purchase **military units**.
3. Walls can be built on **multiple urban district tiles**, not only the center. Every Fortified District must be captured independently before the city falls — significantly more defensible than a town.
4. Access to **advanced buildings and Wonders** unavailable to towns.
5. Population growth is unrestricted (until tile limits), with specialist assignment on urban tiles.

The capital city is always a city and never downgrades.

### Town Specialization (Focus System)

When a town reaches **population 7**, it unlocks the **Focus Menu** — a one-time-per-age choice to specialize the town. Choosing a focus is a **permanent decision for the current age** and cannot be changed until the next age transition resets all town focuses.

**Exception:** Players can toggle between the **Growing Town** focus and their chosen specialization (i.e. undo and re-choose Growing, or swap back to the non-Growing focus they already set). They cannot switch between two different non-Growing focuses.

**Available specializations:**

| Focus | Effect | Source |
|---|---|---|
| Growing Town (default) | +50% growth rate for this town | Game8, TheGamer, PCGamer |
| Farming Town | +1 Food on Farms, Pastures, Plantations, and Fishing Boats `[source-conflict: TheGamer cites +2]` | Game8, PCGamer |
| Mining Town | +1 Production on Camps, Woodcutters, Clay Pits, Mines, and Quarries `[source-conflict: TheGamer cites +2]` | Game8, PCGamer |
| Fort Town | +5 Healing to Units; +25 Health to Walls in this Town | Game8, TheGamer, PCGamer |
| Urban Center | +1 Culture and +1 Science on Quarters in this Town | Game8, TheGamer, PCGamer |
| Trade Outpost | +2 Happiness on each Resource tile in the Town; +5 Trade Route range | Game8, TheGamer |
| Religious Site | +2 Happiness; +1 Relic Slot on Temples in this Town | Game8, TheGamer |
| Hub Town | +2 Influence per Settlement connected to this Town | Game8, TheGamer |
| Factory Town | Gold bonus toward factory building purchase; additional resource slot | Dev Diary, TheGamer (no numeric value confirmed) |
| No Focus | 100% of food forwarded to a connected City; town growth stops | Comrade Kaine |

**Coastal variant:** Farming Towns on coastal tiles automatically become **Fishing Towns** with the same food bonuses applied to Fishing Boats. `[TheGamer]`

**Age-gating of specializations:** Some specializations (Religious Site, Factory Town) appear in age-specific contexts in sources, but it is not confirmed whether they are locked to specific ages. `[INFERRED: likely all specializations available whenever the town reaches population 7, with strategic relevance concentrated in specific ages]`

**Strategic implications:** The specialization choice is irreversible per-age. When a non-Growing focus is selected, the town stops growing locally and forwards all food to connected cities. This makes the choice highly consequential: a Farming Town feeds nearby cities at the cost of the town never growing further that age. Hub Towns in central positions can supply critical Influence throughout the middle ages. The choice must account for terrain, nearby city needs, and the player's active victory path.

### Converting a Town to a City

Any town can be converted to a full city by spending gold via the **Convert to City** action on the town's central tile. No population minimum is required for conversion, though building population first is economically optimal.

**Cost structure:**
- **Observed range:** approximately 200 gold (large, developed town; few existing cities) to 1000 gold (small new town; many cities owned) `[community sources; Firaxis has not published the exact formula]`
- **Scales up** with the number of cities already owned
- **Scales down** with the town's population and development level (more population = lower cost)
- Community guidance: wait until the town reaches maximum tile expansion and 6–10 population before converting, to minimize cost

**Effect of conversion:**
- `tier` changes from town to city
- Production queue becomes available
- Town focus (if set) is removed — the city manages production directly
- Production no longer auto-converts to gold
- Military unit training and advanced building construction become available

**Strategic trade-off:** Converting a town increases management burden (production queue decisions each turn) but unlocks Wonders, advanced buildings, and unit production. Towns with strong specializations (Farming Town feeding a large city; Hub Town generating Influence) are often more valuable remaining as towns. A rough community heuristic: maintain 3–4 cities among 6–8+ total settlements, keeping the remainder as specialized towns.

### Settlement Cap and Happiness Pressure

Civ VII uses a **soft Settlement Cap** as the primary constraint on expansion. The cap governs the total number of settlements (cities + towns combined) a player can own without happiness penalties.

**Base cap by age:**
- Antiquity: 4 settlements `[GamerBlurb, Steam discussions — confirmed]`
- Exploration: approximately 8 `[INFERRED: base increases by ~4 per age transition; sources confirm a "+4 per age advance" pattern]`
- Modern: approximately 12 `[INFERRED]`

**Raising the cap** (each grants +1 Settlement Cap):

*Antiquity Age:*
- Technology: Irrigation
- Civic: Entertainment
- Civic: Organized Military

*Exploration Age:*
- Technology: Feudalism
- Civics: Society Mastery, Colonialism Mastery, Social Class, Sovereignty, Imperialism

*Modern Age:*
- Technologies: Urbanization, Mass Production
- Civics: Nationalism, Globalism, Hegemony

Additional cap sources: leader Attributes (Expansion/Militaristic type), certain civilization unique abilities, City-State suzerainty bonuses. `[Steam discussions, GamerBlurb]`

**Independent Powers exemption:** Captured or befriended Independent Power settlements do not count toward the Settlement Cap. `[GamerBlurb]`

**Penalty for exceeding the cap:**
- Each settlement over the cap applies **-5 Happiness** to **every** settlement in the empire (not just the excess ones)
- The penalty is empire-wide and stacks per excess settlement
- **Maximum total penalty: -35 Happiness** (caps at 7 excess settlements)
- This is a soft limit — exceeding it is possible but degrades global Happiness

**Happiness dual-role:** Happiness functions both locally (required to support Specialists and maintain Buildings in each settlement) and globally (accumulated empire-wide to trigger Celebrations, which grant empire-wide buffs and policy slots). Settlement cap pressure therefore has cascading downstream effects on Celebrations and specialist-powered yields.

### Age Transition Effects on Settlements

Age transitions apply a settlement-tier reset that is one of Civ VII's most distinctive mechanics:

1. **Capital is exempt.** The capital always retains city tier.
2. **All other cities revert to towns.** Every non-capital city downgrades to town tier at the start of the new age. `[PCGamer transition article; multiple Steam discussions confirm]`
3. **Capital switching creates two cities.** If the player moves their capital before the age ends, both the new and old capital retain city tier through the transition — entering the new age with two guaranteed cities. `[PCGamer transition article]`
4. **Economic Golden Age legacy preserves cities.** Completing the Economic legacy path in a given age earns the Economic Golden Age, which allows all current cities to retain city tier into the next age. This is a primary incentive for pursuing the Economic legacy path aggressively. `[PCGamer transition article]`
5. **Town focuses reset.** All town specializations are cleared at age transition. Towns must reach population 7 again in the new age to re-specialize.
6. **Ageless buildings persist.** Buildings flagged Ageless (e.g. Warehouses) retain their yields across transitions regardless of tier changes.
7. **Settlement cap resets to the new age base** plus per-player bonuses earned in the new age's tech/civic tree. `[INFERRED]`

### Razing Captured Settlements

When capturing an enemy settlement, the player may choose to **raze** it.

**Process:**
1. Player selects Raze on the captured settlement.
2. The settlement enters a **12-turn razing countdown**. No yields are earned from the settlement during this period.
3. After 12 turns, the settlement and its borders are removed from the map. Tiles become unowned and available for normal expansion.

**Penalties:**
- **War support:** Each razed settlement generates **-1 permanent War Support** against the player for every opponent. Duration is `[source-conflict]` — some sources say "for the rest of the game," others suggest it resets at age transition.
- **Grievances:** Razing generates large grievances with the former owner, damaging diplomatic relations.
- **Religion home city exception:** A settlement that is the home city of a religion cannot be razed. `[Steam discussion — noted as undocumented in game Civilopedia]`

**Re-founding:** No source confirms a mechanic for re-founding a previously razed site. Tiles appear to simply become open for normal settler expansion. `[INFERRED: no re-founding mechanic]`

**When razing is justified:**
- At the Settlement Cap with critically low Happiness and no ability to absorb the new settlement
- When the settlement blocks natural border expansion
- When the player has sufficient war support to absorb the penalty

Community guidance strongly advises keeping captured settlements in most cases due to the permanent diplomatic cost of razing.

---

## Formulas

```
-- Settlement Cap --
settlementCap(player) =
  BASE_CAP_FOR_AGE
  + sum(tech_cap_bonuses)
  + sum(civic_cap_bonuses)
  + leader_attribute_bonuses
  + civ_ability_bonuses
  + suzerainty_bonuses

BASE_CAP_FOR_AGE:
  Antiquity   -> 4  (confirmed)
  Exploration -> ~8  [INFERRED: base 4 + ~4 per age advance]
  Modern      -> ~12 [INFERRED]

-- Settlement Cap Happiness Penalty --
exceedBy = max(0, settlementsOwned - settlementCap)
happinessPenalty = min(35, 5 * exceedBy)   -- applied as -happinessPenalty to every settlement
                                           -- maximum penalty: -35 (at 7 excess settlements)

-- Town-to-City Conversion Cost (qualitative model) --
conversionCost = f(cityCount, townDevelopment)
  where:
    cityCount higher       -> cost increases
    townDevelopment higher -> cost decreases
    observed range: 200 gold (max-pop town, few cities)
                 to 1000 gold (new town, many cities)
  [INFERRED model; Firaxis has not published the exact formula]

-- Production to Gold (towns) --
goldYield = productionYield * PROD_TO_GOLD_RATE
  PROD_TO_GOLD_RATE = 1  [INFERRED: 1:1 implied by sources; exact rate unconfirmed]
```

Where:
- `BASE_CAP_FOR_AGE` = starting cap before bonuses; Antiquity value of 4 is confirmed
- `5` = happiness penalty per excess settlement (applied empire-wide)
- `35` = maximum total penalty (7 excess settlements × 5)
- `PROD_TO_GOLD_RATE` = implied 1:1 from source descriptions; exact rate not published

---

## Interactions

- `systems/ages.md` — age transitions reset all non-capital cities to town tier; Economic Golden Age legacy overrides this; settlement cap base resets per age
- `systems/legacy-paths.md` — Economic legacy path completion is the prerequisite to preserve cities through transitions; directly couples settlement tier preservation to the legacy scoring system
- `systems/yields-adjacency.md` — town production auto-converts to gold (yield routing); town food forwarding to connected cities is a yield-routing mechanic; specialization bonuses modify tile yields
- `systems/population-specialists.md` — population growth drives tile-claiming and unlocks the specialization threshold (pop 7); specialists require local Happiness; both systems operate on the same food-accumulation and population model
- `systems/buildings-wonders.md` — buildings can only be fully produced in cities (towns use limited gold purchases); Ageless buildings persist across tier changes at age transition; Wonders require city tier
- `systems/trade-routes.md` — Trade Outpost specialization grants +5 Trade Route range; towns are valid trade route nodes when connected
- `systems/diplomacy-influence.md` — Hub Town specialization generates Influence per connected settlement; razing creates grievances and war support penalties affecting diplomatic state
- `systems/combat.md` — Fort Town provides unit healing and wall health bonuses; town walls limited to central district vs. city multi-district fortification; settlement capture triggers the raze-or-keep decision
- `systems/victory-paths.md` — Economic legacy path preserves cities at transition; settlement count and quality affect all victory-path yields (Production, Science, Culture, Gold)
- `systems/celebrations.md` — settlement cap pressure degrades global Happiness, directly suppressing Celebration triggers (which require sustained high Happiness)
- `systems/independent-powers.md` — Independent Powers do not count against the Settlement Cap; suzerainty can grant +1 Settlement Cap bonuses

---

## Content flowing through this system

- [`content/buildings/`](../content/buildings/) — buildings that require city tier for production; Ageless buildings that survive tier changes at age transition
- [`content/units/`](../content/units/) — Founder unit (founds capital as city); Settler unit (founds towns); military units trainable only in cities
- [`content/technologies/`](../content/technologies/) — technologies that raise Settlement Cap per age: Irrigation (Antiquity), Feudalism (Exploration), Urbanization and Mass Production (Modern)
- [`content/civics/`](../content/civics/) — civics that raise Settlement Cap per age: Entertainment and Organized Military (Antiquity); Society Mastery, Colonialism Mastery, Social Class, Sovereignty, Imperialism (Exploration); Nationalism, Globalism, Hegemony (Modern)
- [`content/resources/`](../content/resources/) — resource tiles in town territory gain bonuses from Trade Outpost specialization; resources must be slotted in settlements for the Economic legacy path milestone

---

## VII-specific (how this differs from VI/V)

- **All new settlements begin as Towns, not Cities.** In Civ V and VI, every settler-founded settlement was a full city with a production queue from day one. In VII, only the capital starts as a city; all others are towns requiring a gold investment to convert.
- **Production auto-converts to gold in towns.** No analogous mechanic in previous entries. Every settlement in V and VI produced hammers toward a queue. VII eliminates the queue entirely for unfocused towns.
- **Town Specialization (Focus system) replaces tile-worked micromanagement.** In VI, the player manually worked tiles or assigned Governors. In VII, towns self-specialize via the Focus Menu, trading direct tile control for a predefined-bonus model with a one-time-per-age choice constraint.
- **No worker units for tile improvements.** Improvements are auto-placed when population claims new rural tiles. Worker units as a class are removed from the game.
- **Settlement Cap as a soft happiness constraint.** Civ V used per-city unhappiness; Civ VI used Housing and Amenities. Civ VII uses a cap-based system where exceeding a total settlement count applies a flat -5 Happiness per excess settlement empire-wide (max -35).
- **Cities revert to towns at every age transition (except capital and Economic Golden Age preservation).** In V and VI, cities were permanent and cumulative.
- **Two-unit founding system (Founder vs. Settler).** V and VI used a single Settler for all settlements. VII adds a distinct Founder unit that founds the capital as a city; Settlers found only towns.
- **Asymmetric defense between towns and cities.** Towns can only wall their central district; cities can fortify multiple district tiles.

---

## UI requirements

- **Settlement tier badge** — on every settlement icon on the map: small City/Town badge distinguishing tier at a glance
- **Found City / Found Town action** — on Founder/Settler unit selection; distinct action button for each unit type
- **Focus Menu panel** — activates when selecting a town with population ≥ 7 that has not yet been specialized
- **Convert to City button** — visible on town selection screen; shows the current gold cost
- **Settlement Cap indicator** — in the top HUD bar or empire summary screen; shows `current / cap` count
- **Raze / Keep modal** — appears when a captured settlement is selected; shows war support cost of razing
- **Age transition settlement panel** — during the age transition ceremony: shows which cities will revert to towns
- **Ageless building badge** — on building cards and in city production screens
- **Razing countdown indicator** — visible on a settlement being razed

---

## Edge cases

- **What if the player attempts to Convert to City when at the Settlement Cap?** Conversion is a tier change, not a new settlement — `settlementsOwned` does not increase. `[INFERRED]`
- **What if a town is set to a non-Growing focus and then converted to a city?** The focus is removed at conversion; the city manages production directly.
- **What if population never reaches 7 in the current age?** The Focus Menu never unlocks. The town remains at Growing Town (default). `[INFERRED]`
- **What if a focused town has no road connection to any city?** Food-forwarding is suspended; the town continues growing independently. `[Comrade Kaine]`
- **What if the capital is captured?** `[LLM-KNOWLEDGE-ONLY: in prior Civ entries, the capital relocated to the next-largest city; verify for Civ VII]`
- **What if the player moves capital just before an age transition?** Both old and new capital retain city tier through the transition.
- **What if a Trade Outpost town is razed mid-trade-route?** Active trade routes relying on the outpost's range extension presumably lose that range extension. `[INFERRED]`
- **What if the player is at the Settlement Cap and captures an enemy settlement?** Captured settlement counts against the cap immediately.
- **What if Happiness drops very low from cap pressure?** At critically low Happiness, Specialist slots may become non-functional. `[INFERRED]`
- **What if the settlement count exceeds 7 over the cap?** The -35 penalty is the ceiling.
- **What if a town selected for Raze is the home city of a religion?** The Raze option is blocked.
- **What if a player earns Economic Golden Age but then loses cities before the transition?** Legacy option applies only to cities still owned at transition. `[INFERRED]`

---

## Open questions

- Exact conversion cost formula — approximate range (200–1000 gold) confirmed, exact formula not published
- Production-to-gold conversion rate — 1:1 assumed but not explicitly stated
- Road/connection requirement for food forwarding — connection type not specified in sources
- Factory Town exact bonus value — no numeric source
- War support penalty duration — source conflict
- Re-founding razed sites — not confirmed
- Settlement Cap base values for Exploration and Modern
- Farming Town / Mining Town bonus value — source conflict between +1 and +2
- Whether specializations are age-gated
- Fort Town "+25 Health to Walls" interaction with base Wall "+100 HP"

---

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._

---

## Author notes

All four primary Fandom wiki URLs (Settlement, Town, City) returned HTTP 403, and the originally-briefed Firaxis dev diary URL returned 404. Research redirected to PC Gamer, Game8, TheGamer, GamerBlurb, Chill Place Gaming, Comrade Kaine, Well of Souls, ClawsomeGamer, GameRant, and Steam community discussions. Firaxis Dev Diary accessible at corrected URL.

Write and Bash tool permissions were denied to this subagent; the parent session persisted the document content via fenced-block extraction.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
