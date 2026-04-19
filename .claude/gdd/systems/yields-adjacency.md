# Yields & Adjacency -- Civ VII

**Slug:** `yields-adjacency`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

Every factual claim in the sections below MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/managing-your-empire/ -- Firaxis Dev Diary #3: Managing Your Empire
- https://civilization.2k.com/civ-vii/glossary/ -- Firaxis Official Glossary (Civ7)
- https://www.thegamer.com/civilization-7-how-adjacency-works/ -- TheGamer: How Adjacency Works in Civ 7
- https://gamerant.com/civilization-7-civ7-adjacency-bonus-guide/ -- GameRant: Adjacency Bonus Guide for Civ 7
- https://forums.civfanatics.com/threads/reference-guide-building-adjacency-and-district-planning.695132/ -- CivFanatics: Building adjacency reference guide
- https://game8.co/games/Civ-7/archives/496513 -- Game8: Civ 7 Adjacency Bonuses
- https://gamerant.com/civilization-vii-increase-science-guide-get-more-science-civ-7-yield/ -- GameRant: Increase Science in Civ 7
- https://gamerant.com/civilization-vii-increase-gold-guide-get-more-gold-income-civ-7-yield/ -- GameRant: Get More Gold in Civ 7
- https://gamerant.com/civilization-vii-civ-7-how-get-more-culture/ -- GameRant: Increase Culture in Civ 7
- https://gamerant.com/civilization-7-increase-happiness-guide-get-more-happiness-civ-7/ -- GameRant: Increase Happiness in Civ 7
- https://www.thegamer.com/civilization-7-civ-happiness-guide-explained/ -- TheGamer: How Happiness Works in Civ 7
- https://gameranx.com/features/id/529168/article/civilization-7-what-is-influence-and-how-to-use-it/ -- Gameranx: What is Influence in Civ 7
- https://forums.civfanatics.com/threads/population-growth-formula.694910/ -- CivFanatics: Population Growth Formula
- https://forums.civfanatics.com/threads/more-tables-for-the-new-growth-formula.697772/ -- CivFanatics: New Growth Formula tables (patch 1.1.2)
- https://gamerant.com/civilization-vii-increase-population-growth-more-food-guide-get-more-city-growth-civ-7/ -- GameRant: Increase Population Growth in Civ 7
- https://screenrant.com/civ-7-city-development-changes-explained/ -- ScreenRant: City Development Changes in Civ 7
- https://steamcommunity.com/app/1295660/discussions/0/598520866459922632/ -- Steam: Town production to gold conversion rate
- https://www.well-of-souls.com/civ/civ7_overview.html -- Well of Souls: Civ VII Analyst Overview

**Source conflicts noted:** The original population growth formula (pre-patch) used a near-cubic exponent (~3.3). Patch 1.1.2 replaced this with a true quadratic formula. No material conflicts on yield type roles or adjacency mechanics.

---

## Purpose

Yields are the statistical lifeblood of every settlement in Civ VII: they drive population growth, production of buildings and units, research speed, civic progression, diplomatic currency, and empire stability. The adjacency bonus system ties building placement directly to the map, rewarding players who align their urban footprint with rivers, coastlines, mountains, natural wonders, resources, and other buildings. Together, yields and adjacency replace the district-placement meta of Civ VI with a more transparent, tile-level system where every urban decision is numerically visible and the correct place for a given building type is legible from the map.

---

## Entities

- `CityState.yields` -- (RW) -- per-turn totals for each yield type after all base, adjacency, and specialist contributions
- `CityState.population` -- (RW) -- current working population; grows via Food accumulation events
- `CityState.foodAccumulated` -- (RW) -- food-bucket that triggers growth events when it meets the per-pop threshold
- `CityState.happiness` -- (RW) -- local Happiness balance; negative values apply per-settlement yield penalties
- `CityState.tiles[].building` -- (RW) -- which buildings occupy the two slots of each urban tile
- `CityState.tiles[].specialist` -- (RW) -- whether a specialist is assigned to an urban tile; affects yield amplification
- `CityState.tiles[].isQuarter` -- (R) -- true when both building slots contain non-obsolete buildings from the current age (or Ageless)
- `CityState.tiles[].improvement` -- (RW) -- rural tile improvement (Farm, Pasture, Mine, etc.)
- `PlayerState.influence` -- (RW) -- empire-wide Influence currency accumulated each turn
- `PlayerState.happiness` -- (RW) -- global empire Happiness, used to evaluate celebration trigger threshold
- `GameState.age` -- (R) -- current age; determines which buildings are non-obsolete for quarter formation and adjacency eligibility

---

## Triggers

- On **END_TURN** (every turn, all players) -- accumulate per-turn yields into resource buckets; apply Food to `foodAccumulated`; evaluate growth events; decrement/increment `happiness` by building/specialist costs; evaluate celebration trigger for global Happiness
- On action **PLACE_BUILDING** -- recalculate adjacency bonuses for the placed tile and all neighboring tiles; evaluate whether the tile now forms a Quarter
- On action **ASSIGN_SPECIALIST** -- recalculate the tile adjacency amplification; apply Food and Happiness upkeep costs
- On action **REMOVE_SPECIALIST** -- reverse upkeep costs; recalculate amplified adjacency
- On action **SET_TOWN_FOCUS** (town reaches population 7) -- redirect Town Production to Gold per-turn conversion; optionally redirect Town Food to connected City
- On **age transition** -- mark age-specific buildings as obsolete; quarter formation re-evaluated for all tiles; adjacency bonuses from obsolete buildings are lost

---

## Mechanics

### Yield Types

Civ VII has eight yield types. Each is generated by tile improvements, buildings, specialists, wonders, resources, and leader/civ/policy bonuses; each is consumed or converted by a specific downstream system.

**Food**
Food accumulates each turn into the settlement growth bucket. When the bucket fills the per-population threshold, a Growth Event fires and the player gains a new Citizen. Food is also consumed by Specialists (upkeep per Specialist per turn). Towns reaching population 7 can become Farming Towns or Fishing Towns, redirecting all their Food output to connected Cities rather than growing the Town further.

**Production**
Production is spent to construct buildings, units, and wonders. In Towns not yet upgraded to City, all Production converts to Gold at a 1:1 rate per turn. Once a Town takes a focus at population 7 or is converted into a City, this automatic conversion changes.

**Gold**
Gold is the purchasing currency: it buys buildings and units instantly, upgrades units, and covers Specialist costs. Gold is also consumed by building and unit maintenance costs each turn. Leaders and civilizations provide Gold multipliers through attributes and social policies. Resources such as Gold, Silver, and Jade can reduce purchase costs by 10-20% when slotted.

**Science**
Science fuels progression through the Technology Tree. Science is generated primarily by science buildings (Library, Academy in Antiquity; Observatory, University in Exploration; Schoolhouse, Laboratory in Modern), Specialists on urban tiles (base 2-3 Science each), and resource slots (e.g. Incense grants +10% Science in Antiquity; Tea grants +3% Science in Modern with a Factory). Tech Masteries also require Science expenditure.

**Culture**
Culture drives progression through the Civic Tree, unlocking new government types, social policies, units, buildings, and traditions each age. Culture is generated by culture buildings (Monument, Amphitheater, etc.), wonders, specialists, certain resources (e.g. Silk), and narrative event rewards. Culture is critical to all victory paths because civics unlock cross-path bonuses and buildings needed for non-cultural victories.

**Happiness**
Happiness is the dual-level yield governing both settlement stability and empire-wide celebrations.

At the local settlement level: each settlement maintains its own Happiness balance. Negative local Happiness applies a -2% penalty to all other yields in that settlement per point of negative Happiness, stacking linearly to a maximum -100% penalty at -50 Happiness. Sufficiently negative Happiness can trigger unrest events, population loss, and eventually revolt. Happiness is drained by Specialist maintenance costs, certain buildings, and War Weariness.

At the global empire level: per-settlement Happiness contributions combine into an empire-wide total. When this total crosses the Celebration threshold, a Celebration triggers -- a time-limited buff (typically 10 turns) to a specific yield type determined by the current Government type. The empire-wide total is used only for celebration evaluation; negative local Happiness does NOT subtract from the global total.

**Influence**
Influence is a new yield in Civ VII that consolidates Civ VI Diplomatic Favor, Envoys, espionage resources, and Trade Route limit management into a single currency. Influence accumulates per turn from buildings, social policies, leader attributes, and world wonders; it is drained by Diplomatic Actions: Endeavors (mutually beneficial agreements), Sanctions (negative actions against rivals), Treaties (long-term agreements), and Espionage (high-risk actions). Influence is also used to interact with Independent Powers. Settling near another civilization capital reduces Influence income as a penalty. There is no published numeric cap on Influence accumulation [INFERRED: likely uncapped, similar to Gold].

**Faith**
Faith is the religion-system currency generated by Altars (Antiquity), Temples (Exploration), and certain improvements. In Antiquity, Faith is spent to found a Pantheon (requires Mysticism civic). In Exploration, Faith is spent to found a Religion (requires Piety civic and a Temple) and to train Missionaries. In the Modern age, Religion plays a reduced mechanical role and Faith becomes primarily a legacy-path scoring resource. Precise numeric costs for founding a Pantheon or Religion are not documented in sources consulted [INFERRED values not provided].

### Adjacency Bonus System

Adjacency bonuses are yield bonuses granted to individual buildings based on what shares a side with their tile. This is building-level, not district-level as in Civ VI: each building in each slot of an urban tile receives its own adjacency calculation independently.

The base rule is +1 yield per qualifying neighboring tile or structure. Qualifying neighbor types are categorized by yield family:

| Yield | Qualifying Adjacency Triggers |
|---|---|
| Food | Coastal terrain, Navigable Rivers, Wonders |
| Gold | Coastal terrain, Navigable Rivers, Wonders |
| Production | Resources, Wonders |
| Science | Resources, Wonders |
| Culture | Mountains, Natural Wonders, Wonders |
| Happiness | Mountains, Natural Wonders, Wonders |

Food and Gold buildings share water-adjacent triggers; Production and Science share resource-adjacent triggers; Culture and Happiness share mountain/natural wonder triggers. All building types gain +1 from each adjacent built Wonder.

Palace bonus: The capital Palace provides +1 Culture and +1 Science to every adjacent District [TheGamer adjacency guide].

Civ-specific adjacency overrides: Han China gives Science Buildings an additional adjacency bonus from adjacent Quarters; Charlemagne civilization gives Military and Science Buildings a Happiness adjacency for Quarters [CivFanatics reference guide].

Warehouse Buildings are a special Ageless category that do NOT receive adjacency bonuses. Instead they gain a bonus for each Tile Improvement of the same type within the settlement (e.g. the Granary provides +1 Food for each Farm, Pasture, and Plantation in the settlement). Warehouse tiles should be placed where they do not block adjacency for other building types.

---

### Quarters and Specialist Amplification

A **Quarter** is formed when both building slots on a single urban tile are occupied by non-obsolete buildings from the current age, or Ageless buildings. Quarters are required for Specialist placement. Quarters containing any obsolete building do not count as Quarters.

When a Specialist is assigned to a Quarter tile, two effects occur:
1. The Specialist provides base yields: Science and Culture (approximately 2-3 of each per Specialist per turn [INFERRED from multiple guides]).
2. The Specialist amplifies the tile adjacency bonuses by +50 percent of their base value. CivFanatics reference guide: each specialist adds 50 percent of their value to adjacency. A tile adjacent to 2 mountains (+2 Happiness base) gains +1 more Happiness with a Specialist present.

Specialists have maintenance costs: each Specialist consumes Food and Happiness per turn. Specialists cannot be placed in Towns (only Cities).

A Unique Quarter forms when a civilization two Unique Buildings are placed on the same tile, providing enhanced combined benefits and a distinctive visual appearance.

---

### Overbuilding and Age Transitions

When the game transitions to a new age, all buildings from the previous age become obsolete. Obsolete buildings:
- Lose their adjacency bonuses
- No longer count toward Quarter formation
- Can be overbuilt: a new-age building of the same yield type can replace the obsolete building

The overbuilding mechanic preserves district layout investment across ages. Overbuilding an Altar with a Temple may trigger a narrative event and award a Relic.

Ageless buildings (Granary, Fishing Quay, Wonders, civ Unique Buildings) never become obsolete, cannot be overbuilt, and always contribute to Quarter formation and yield output. Warehouse buildings are also Ageless and cannot be overbuilt -- a Warehouse in a high-adjacency location permanently blocks that slot from future age-specific buildings.

---

### Town Production-to-Gold Conversion

Towns (settlements below City status) convert 100 percent of their Production to Gold at a 1:1 rate per turn. This conversion stops when a Town: (a) is upgraded to a City, or (b) takes a Town Focus at population 7. The 1:1 ratio is the base; civilization bonuses can modify total Gold output (e.g. Britain gains +5 Gold per building in Towns; Carthage provides +20 percent to all Gold Towns produce).

---

## Formulas

Food growth threshold (post-patch 1.1.2 -- quadratic):
FoodThreshold(X) = Flat + (Scalar x X) + (Exponent x X^2), where X = number of prior growth events (0-indexed).
Age constants -- Antiquity: Flat=5, Scalar=20, Exponent=4; Exploration: Flat=30, Scalar=50, Exponent=5; Modern: Flat=60, Scalar=60, Exponent=6.
Example Antiquity sequence: X=0 gives 5; X=1 gives 29; X=2 gives 61; X=3 gives 101; X=4 gives 149. Cumulative ~345 food for 5 pops.

Unhappiness yield penalty (per settlement):
YieldMultiplier = 1.0 minus (max(0, -localHappiness) x 0.02). Minimum = 0.0 at -50 Happiness. Applies to all yields in that settlement.

Adjacency bonus per building (base):
BuildingAdjacency = sum of +1 per qualifying neighboring tile or structure (see yield-type table in Mechanics section).

Specialist adjacency amplification:
AmplifiedAdjacency = BuildingAdjacency x 1.5. Specialist adds 50 percent of base adjacency to that tile.

Town Production-to-Gold conversion:
TownGoldPerTurn = TownProductionPerTurn x 1.0 x CivGoldModifier. Base 1:1 ratio; CivGoldModifier >= 1.0.

Where:
- `X` = number of prior growth events (buildings add pseudo-population that does NOT count as growth events; true growth events = displayed population minus number of buildings, excluding walls/wonders/unique improvements)
- `localHappiness` = net Happiness balance of the individual settlement (positive = stable, negative = penalized)
- `CivGoldModifier` = civilization-specific multiplier for Town gold output (base = 1.0; Carthage = 1.20, etc.)
- `BuildingAdjacency` = integer count of qualifying adjacent tiles/structures; each distinct trigger adds +1 per occurrence
- Exact `Flat`, `Scalar`, `Exponent` constants from CivFanatics community reverse-engineering of patch 1.1.2; not officially published by Firaxis

---

## Interactions

- `systems/settlements.md` -- cities vs towns are the primary consumers of yield calculations; Town-to-City upgrade is driven by Gold; Town Food redirect at specialization is a yield-routing decision
- `systems/buildings-wonders.md` -- buildings are the primary yield generators and adjacency holders; ageless vs age-specific status is set in building data and drives overbuilding eligibility
- `systems/population-specialists.md` -- specialist assignment is the mechanism that amplifies adjacency; Food and Happiness upkeep for specialists comes from this system
- `systems/tile-improvements.md` -- rural improvements produce tile yields that feed Food and Production income; Warehouse bonuses scale with improvement counts
- `systems/resources.md` -- resources slotted into cities modify Science, Gold, and other yield rates; also serve as adjacency triggers for Science/Production buildings
- `systems/tech-tree.md` -- Science yield drives tech research speed and is consumed by Tech Masteries
- `systems/civic-tree.md` -- Culture yield drives civic research speed; certain civics unlock buildings that produce yields
- `systems/diplomacy-influence.md` -- Influence yield is the currency for all diplomatic actions; this system generates it, diplomacy-influence consumes it
- `systems/religion.md` -- Faith yield is generated here and consumed by religion mechanics (pantheon founding, religion founding, missionaries)
- `systems/celebrations.md` -- global Happiness crossing the celebration threshold triggers celebrations; celebrations produce time-limited yield multipliers
- `systems/government-policies.md` -- social policies modify yield multipliers empire-wide
- `systems/victory-paths.md` -- Science (Science victory), Culture (Cultural victory), Gold (Economic victory) are the primary yield drivers of three of the four victory paths
- `systems/ages.md` -- age transition marks buildings obsolete, breaking quarter formation and adjacency; overbuilding mechanic is the recovery path

---

## Content flowing through this system

- [`content/buildings/` ](../content/buildings/) -- every building has base yield values, yield type (determines adjacency trigger category), age (determines obsolescence), and Ageless/Warehouse flags
- [`content/tile-improvements/` ](../content/tile-improvements/) -- rural improvements have yield values that feed Food, Production, Gold; also serve as Warehouse bonus triggers
- [`content/resources/` ](../content/resources/) -- slotted resources modify yield percentages; also serve as adjacency triggers for Science/Production buildings
- [`content/wonders/` ](../content/wonders/) -- wonders are Ageless yield sources; also serve as universal adjacency triggers for all building types
- [`content/terrains-features/` ](../content/terrains-features/) -- Coastal terrain, Navigable Rivers, Mountains, and Natural Wonders are the map-side adjacency triggers
- [`content/civics/` ](../content/civics/) -- certain civics unlock yield-modifying social policies; Mysticism (pantheon), Piety (religion/temple) are Faith sinks
- [`content/technologies/` ](../content/technologies/) -- tech tree research speed is a direct function of Science yield

---

## VII-specific (how this differs from VI/V)

- **Adjacency is per-building, not per-district.** Civ VI tied adjacency bonuses to entire district types; in VII every individual building calculates its own adjacency, making fine-grained tile choice meaningful even within the same district-equivalent area.
- **Uniform +1 per qualifying neighbor.** Civ VI used fractional adjacency values (half vs. full adjacency, complex tables per district type). VII normalizes to +1 per qualifying tile for each applicable category, making adjacency legible at a glance.
- **Influence is a new yield type with no VI equivalent.** Civ VI split diplomatic resources across Diplomatic Favor, Envoys, espionage resources, and Trade Route limits. VII consolidates all of this into a single spendable Influence yield.
- **Happiness is local-and-global simultaneously.** Civ VI had a complex happiness system with separate city/empire tracking. VII gives each settlement its own Happiness balance (with a local yield penalty), while also summing to a global celebration trigger.
- **Towns convert Production to Gold automatically.** There is no direct equivalent in VI; all cities produced Production identically. The Town mechanic creates a natural economic division where non-upgraded settlements subsidize Gold income.
- **Specialists amplify adjacency by 50 percent.** Civ VI had district yields from improvements placed by Builders. VII removes Builders entirely and routes tile amplification through Specialists, making population assignment the strategic lever for yield maximization.
- **Growth formula is per-settlement, quadratic post-patch.** Civ VI used a consistent exponential formula empire-wide. VII applies age-specific constants and a quadratic model, and distinguishes true growth events from pseudo-population granted by buildings.
- **Faith has no Religious Victory path.** Faith in VII is a civic-era progression currency (Pantheon in Antiquity, Religion in Exploration) with reduced significance in Modern, rather than a persistent separate victory track as in VI.

---

## UI requirements

- **Yield summary bar / panel**: per-settlement view showing all eight yield types, per-turn totals, and breakdown by source (base tile, adjacency, specialist, resource, policy). The Firaxis dev diary notes all calculations are directly integrated into the UI for transparency.
- **Adjacency preview**: when hovering over a tile before placing a building, the UI shows the projected adjacency bonus the building would receive at that location, including which neighbors are contributing.
- **Quarter indicator**: visual indicator on tiles that have formed a Quarter (both slots filled with non-obsolete buildings) -- distinct icon or border to signal Specialist eligibility.
- **Specialist assignment UI**: once a Quarter exists, the player can assign/remove a Specialist from a tile with a click; the UI shows the Specialist upkeep cost and the resulting yield change (base + amplified adjacency).
- **Happiness local/global display**: local Happiness shown per-settlement with its yield-penalty bar (0 to -100 percent); global Happiness shown at empire level with a celebration progress bar.
- **Growth bar**: per-city Food accumulation bar showing current Food / threshold for next growth event, labeled with the projected growth cost.
- **Town production-to-Gold indicator**: Towns should show that their Production is being converted to Gold, surfacing the 1:1 conversion rate.
- **Overbuilding notification**: when a building slot contains an obsolete building, indicate it visually and show the option to overbuild with the current-age equivalent.
- **Obsolete building warning**: quarter tiles with an obsolete building that no longer count as Quarters should have a clear broken-quarter indicator.

---

## Edge cases

- What if a building is placed in the only free slot adjacent to a mountain but the other slot is already a Warehouse? The Warehouse cannot be overbuilt, so the adjacency-eligible building occupies the remaining slot. Quarter formation is possible since both buildings would be Ageless. But the Warehouse itself never gains an adjacency bonus regardless.
- What if both slots of a tile are filled with Ageless buildings from different yield types (e.g. Granary + Fishing Quay)? Both buildings independently calculate adjacency for their respective yield types. The tile forms a Quarter for Specialist purposes since both buildings are Ageless (non-obsolete).
- What if a settlement local Happiness reaches -50 exactly? The YieldMultiplier is 0.0 -- all yields in that settlement produce zero. The settlement is functionally paralyzed until the Happiness deficit is addressed.
- What if a Specialist is assigned and the city then loses enough Happiness that it can no longer afford the upkeep? [INFERRED] The Specialist likely remains assigned but the settlement Happiness goes further negative, compounding the penalty. The player must manually remove Specialists or the cascade continues. Sources do not confirm auto-removal.
- What if a town has a Farming Town focus and its connected City becomes a different player (e.g. captured)? [INFERRED] Food routing is likely city-ownership-dependent; the Town would stop redirecting Food to the captured city. Exact behavior unconfirmed.
- What if a building is overbuilt mid-turn (before END_TURN processes adjacency)? [INFERRED] Adjacency recalculation likely occurs immediately on placement, not deferred to END_TURN. Sources describe the adjacency UI as live.
- What if Faith is generated but the player never researches Mysticism or Piety? Faith accumulates but cannot be spent; it contributes to the Faith per-turn total. There is no overflow penalty documented for unspent Faith [INFERRED: no overflow cap, similar to Gold].
- What if a Unique Quarter is split by age transition (one Unique Building is Antiquity-age, the other is Ageless)? If the Antiquity-age Unique Building becomes obsolete, the quarter formation breaks. The Unique Quarter bonus is lost until the obsolete slot is overbuilt. [INFERRED; sources note civ Unique Buildings are generally Ageless, so this may not occur in practice.]
- What if the player has no Navigable Rivers or Coastline in their starting area? Food and Gold buildings gain zero adjacency from water tiles. The player must rely more heavily on Wonders placed in the city. The design does not guarantee adjacency opportunity.
- What if two identical buildings occupy the same urban tile (two Libraries)? [INFERRED] Likely prevented by the building system -- a building type can only occupy one slot per tile. Placing a second would trigger the overbuilding mechanic rather than creating a duplicate.

---

## Open questions

- Exact Faith costs for founding a Pantheon and founding a Religion -- all sources describe the civic prerequisites (Mysticism, Piety) but no numeric Faith threshold is published as of April 2026.
- Exact Specialist base yield values -- sources describe base Science and Culture yields from Specialists but vary on amounts (2-3 Science/Culture cited; precise per-age values not found).
- Whether the Specialist +50 percent adjacency amplification applies to all adjacency types equally, or only to the building primary yield type. The CivFanatics source states each specialist adds 50 percent of their value without specifying scope.
- Whether Influence has a per-turn cap or an accumulation ceiling -- no source mentions one, and Gold has no such cap either, but Influence is new enough that edge-case accumulation behavior may not be documented.
- The exact Celebration threshold for global Happiness -- multiple sources confirm celebrations trigger from surplus global Happiness but no numeric threshold is published.
- How Growth Rate percentage bonuses interact with the quadratic formula post-patch 1.1.2 -- the CivFanatics growth formula thread noted this was asked but not answered. The glossary says Growth Rate reduces the Food threshold rather than increasing Food income, but the exact reduction formula is undocumented.
- Whether the Happiness-to-Food conversion (+1 Food per 5 excess Happiness) applies at empire level or per-settlement -- the well-of-souls source implies per-city but this is not confirmed.
- The full list of buildings that drain Happiness (beyond Specialist maintenance) -- several buildings are noted to consume Happiness but a comprehensive list per age was not located.

---

## Mapping to hex-empires

**Status tally:** 1 MATCH / 2CLOSE / 1 DIVERGED / 4 MISSING / 1 EXTRA
**Audit:** [.claude/gdd/audits/yields-adjacency.md](../audits/yields-adjacency.md)
**Highest-severity finding:** F-02 — Adjacency triggers cover only 2 of 6 GDD categories (CLOSE, HIGH)
**Convergence status:** Divergent — 1 finding(s) require(s) architectural refactor

_(Full details in audit file. 9 total finding(s). Regenerated by `.claude/scripts/aggregate-audits.py`.)_

## Author notes

Fandom wiki pages for Yield_(Civ7) and Adjacency_Bonus_(Civ7) returned HTTP 403 at time of writing. Fextralife pages for these topics returned 404. Research was conducted via Firaxis official sources (Dev Diary #3, official Glossary), GameRant guides, TheGamer guides, Game8 guides, CivFanatics forums, and community analysis. The population growth formula constants come from CivFanatics community reverse-engineering of patch 1.1.2 (April 2025); Firaxis has not published these officially. Faith numeric costs are genuinely unconfirmed in all sources consulted.

The Happiness penalty formula (-2 percent per point of negative Happiness, max -100 percent at -50) is widely cited across multiple independent guides and is considered high-confidence despite not appearing in an official Firaxis document.

The Town Production-to-Gold 1:1 ratio is confirmed by a Steam community discussion thread with multiple independent players verifying the base rate.

---

<!-- END OF TEMPLATE -- do not add sections after this line. -->