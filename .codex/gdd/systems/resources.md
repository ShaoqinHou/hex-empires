# Resources — Civ VII

**Slug:** `resources`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

Every factual claim in the sections below MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://civ7.wiki.fextralife.com/Resources — Fextralife: Resources (Civ7) — main overview page
- https://civ7.wiki.fextralife.com/Horses_Resource — Fextralife: Horses Resource — Empire/Bonus example
- https://civ7.wiki.fextralife.com/Iron_Resource — Fextralife: Iron Resource — Empire military example
- https://civ7.wiki.fextralife.com/Coal_Resource — Fextralife: Coal Resource — Modern Empire example
- https://civ7.wiki.fextralife.com/Silk_Resource — Fextralife: Silk Resource — City resource example
- https://civ7.wiki.fextralife.com/Spices_Resource — Fextralife: Spices Resource — Bonus + Treasure Fleet trigger
- https://civ7.wiki.fextralife.com/Gold_Resource — Fextralife: Gold Resource — Treasure Fleet resource type
- https://civ7.wiki.fextralife.com/Niter_Resource — Fextralife: Niter Resource — Empire military (Exploration/Modern)
- https://civ7.wiki.fextralife.com/Oil_Resource — Fextralife: Oil Resource — Modern Empire military
- https://civ7.wiki.fextralife.com/Rubber_Resource — Fextralife: Rubber Resource — Modern Empire military
- https://civ7.wiki.fextralife.com/Salt_Resource — Fextralife: Salt Resource — City (unit production)
- https://civ7.wiki.fextralife.com/Gypsum_Resource — Fextralife: Gypsum Resource — City production
- https://civ7.wiki.fextralife.com/Marble_Resource — Fextralife: Marble Resource — Empire wonder bonus
- https://civ7.wiki.fextralife.com/Kaolin_Resource — Fextralife: Kaolin Resource — City/Factory dual-slot
- https://civ7.wiki.fextralife.com/Furs_Resource — Fextralife: Furs Resource — City happiness
- https://civ7.wiki.fextralife.com/Incense_Resource — Fextralife: Incense Resource — City science/religion
- https://civ7.wiki.fextralife.com/Camels_Resource — Fextralife: Camels Resource — City slot-expansion mechanic
- https://civ7.wiki.fextralife.com/Cocoa_Resource — Fextralife: Cocoa Resource — Factory resource example
- https://civ7.wiki.fextralife.com/Coffee_Resource — Fextralife: Coffee Resource — Factory resource example
- https://civ7.wiki.fextralife.com/Tobacco_Resource — Fextralife: Tobacco Resource — City (Modern, Rail Station conditional)
- https://civ7.wiki.fextralife.com/Truffles_Resource — Fextralife: Truffles Resource — City resource
- https://civ7.wiki.fextralife.com/Pearls_Resource — Fextralife: Pearls Resource — City happiness (Homeland/Distant Land split)
- https://civ7.wiki.fextralife.com/Ivory_Resource — Fextralife: Ivory Resource — Bonus (empire-wide wonder bonus)
- https://civ7.wiki.fextralife.com/Sugar_Resource — Fextralife: Sugar Resource — Bonus + Treasure Fleet trigger
- https://civ7.wiki.fextralife.com/Dates_Resource — Fextralife: Dates Resource — Bonus food/happiness
- https://civ7.wiki.fextralife.com/Whales_Resource — Fextralife: Whales Resource — Bonus production
- https://civ7.wiki.fextralife.com/Treasure+Fleet — Fextralife: Treasure Fleet unit
- https://civ7.wiki.fextralife.com/sitemap.xml — Fextralife sitemap (resource enumeration)
- https://civilization.2k.com/civ-vii/game-guide/dev-diary/managing-your-empire/ — Firaxis Dev Diary #3: Managing Your Empire (settlement slots context)
- https://civilization.2k.com/civ-vii/game-update-notes/ — Firaxis patch notes (resource consistency change in 1.3.0)

**Source conflicts noted:** The Fextralife wiki uses a five-category taxonomy (City / Bonus / Empire / Treasure Fleet / Factory) that does not map directly onto the traditional Civ "bonus / luxury / strategic" vocabulary still referenced in some community guides. See the "Resource Categories" mechanic section for reconciliation. The "strategic resource" framing from Civ VI does not appear as an explicit in-game label in Civ VII sources; the combat-boosting Empire resources (Horses, Iron, Niter, Oil, Rubber) are the functional equivalent.

---

## Purpose

The resource system in Civilization VII serves two related goals: providing strategic differentiation between city sites (a city near Iron or Horses is categorically more militarily capable than one without) and giving the empire-management layer a concrete payoff loop (explore map, grow settlement, unlock and assign resource, receive yield or combat bonus). Compared to Civilization VI, the system is fundamentally restructured around **assignment** rather than **tile-working**: resources are not passively extracted by a citizen assigned to a tile, but are instead actively slotted into a settlement resource inventory, where they provide flat bonuses. This shifts the player decision from "which tiles do I work?" to "which settlement gets this resource, and does that settlement have open slots?" The VII system also introduces age-layered resources — many resources either did not exist in previous ages or provide different bonuses depending on which age is currently active, giving resource geography a dynamic character across the game three acts.

---

## Entities

- `TileState.resource` — (R) — the resource type on the tile, if any; determines which settlement can claim it on growth
- `SettlementState.resourceSlots` — (RW) — the settlement available resource-assignment slots (count varies by settlement type and buildings)
- `SettlementState.assignedResources[]` — (RW) — which resources are currently slotted into this settlement
- `PlayerState.empireBonuses` — (RW) — aggregate of all active Empire-type resource effects (combat strength modifiers, wonder production bonuses, etc.)
- `PlayerState.acquiredResources[]` — (RW) — list of resources the player has acquired but not yet assigned (held in an unassigned pool) [INFERRED: existence of such a pool is implied by the assignment mechanic; exact state representation unconfirmed]
- `GameState.currentAge` — (R) — determines which bonus row each resource uses when evaluating its effect
- `CityState.hasRailStation` — (R) — certain Modern City resources (Tobacco, Furs) change their bonus based on whether a Rail Station exists in the city
- `CityState.hasFactory` — (R) — Factory resources only activate when the city has researched Industrialization and built a Factory
- `CityState.isCoastal` — (R) — Treasure Fleet resources (Spices, Sugar, Cocoa, Gold) require a coastal settlement to generate Treasure Fleets

---

## Triggers

- On **settlement growth onto a resource tile** — the settlement border expands to include the tile; the resource becomes "acquired" and enters the unassigned pool. [INFERRED: exact trigger is border expansion]
- On **ASSIGN_RESOURCE action** — player slots an acquired resource into an open slot in a target settlement; the resource bonuses become active for that settlement (City/Bonus resources) or empire-wide (Empire resources).
- On **UNASSIGN_RESOURCE action** — player removes a resource from a slot, returning it to the unassigned pool; its bonuses deactivate. [INFERRED: whether reassignment is free or costs anything is unknown from sources]
- On **END_TURN** — Empire resources combat bonuses are evaluated; they apply passively to all relevant units in the empire.
- On **age transition** — resource effects are re-evaluated using the new age bonus row. Per patch 1.3.0, resources not generated in a prior age will not suddenly appear, and resources present in prior ages will not disappear.
- On **researching Industrialization** (Modern Age technology) — Factory resource slots unlock in cities that have (or subsequently build) a Factory building; Factory resources can now be slotted.
- On **Treasure Fleet unit completing a return voyage** — Treasure Fleet resources connected to coastal settlements generate Gold and Treasure Fleet points.

---

## Mechanics

### Resource categories

Civilization VII uses a five-category taxonomy that replaces the traditional Civ "bonus / luxury / strategic" vocabulary.

**1. Bonus Resources**

Bonus Resources are the most flexible category. They can be placed in any Town or City slot. Their bonuses typically provide flat yields (food, production, happiness) or small conditional bonuses. Examples: Wool (+2 Production, +2 Happiness in Antiquity), Dates (+2 Food, +2 Happiness in Antiquity; +3/+3 in Exploration), Whales (+5 Production in Exploration; +6 in Modern), Spices (Treasure Fleet trigger in Exploration; +4 Food, +4 Happiness in Modern), Sugar (Treasure Fleet trigger in Exploration; +6 Food in Modern), Ivory (wonder production bonus in Antiquity; mixed stats in later ages).

Some Bonus resources are simultaneously classified as having empire-wide effects — Ivory is listed as "Bonus/Empire" — meaning the bonus can be assigned to any slot but applies empire-wide once slotted. [source-conflict: Ivory dual classification is ambiguous in sources]

**2. City Resources**

City Resources can only be placed in City Slots. Towns cannot hold them. They tend to provide percentage-based bonuses to yields or unit production, or provide culture/science/happiness bonuses scaled to whether the city is a Capital, Homeland city, or Distant Land city. This scaling is a mechanic specific to Civ VII geography split across ages (Distant Lands unlock in Exploration Age; see `systems/ages.md`).

Examples:
- Silk: +10% Culture in Antiquity/Exploration; in Modern, +6 Culture in Capital and +3 Culture to any other City.
- Pearls: +2 Happiness to Capital / +4 Happiness to other Cities in Antiquity; scales to Homeland/Distant Land split in Exploration.
- Salt: +20% Production to training Units (Antiquity). Strong early military accelerant.
- Gypsum: +2/+4 Production across city types in Antiquity; +3/+6 Production Homeland/Distant Land in Exploration.
- Incense: +10% Science in Antiquity; +100% Production to Missionaries and Temples in Exploration (religious acceleration).
- Camels: +2 to the number of Resources that can be assigned to a City (Exploration only). This is the only known resource that directly increases slot capacity.
- Truffles: +20% Production to training Units in Exploration; transitions to food bonuses in Modern.
- Furs: +3 Happiness in Capital / +10% Gold during Celebration in Exploration; +6 Happiness in a City with Rail Station / +3 Happiness elsewhere in Modern.
- Tobacco: +6 Production in a City with a Rail Station / +3 Production to any other City (Modern).

**3. Empire Resources**

Empire Resources are not assigned to a specific settlement slot. Once acquired (by settling onto the tile), their bonuses apply across the entire empire — most commonly as flat combat strength modifiers to specific unit types. They represent the functional equivalent of "strategic resources" in earlier Civ games, though Civ VII does not use that label.

Examples:
- Horses: +1 Combat Strength to Cavalry Units in Antiquity (additional +1 vs Infantry); +1 CS Cavalry in Exploration (additional +1 vs Infantry and Ranged); transitions to +6 Happiness empire-wide in Modern.
- Iron: +1 CS Infantry Units in Antiquity; +1 CS Infantry and Ranged in Exploration.
- Marble: +10% Production to Wonders on Grassland/Tundra/Marine tiles in Antiquity; +10% Wonder Production broadly in Exploration and Modern.
- Niter: +1 CS Siege and Naval Units in Exploration; +1 CS Ranged and Siege (additional +1 vs Cavalry) in Modern.
- Oil: +1 CS Heavy Naval and Cavalry Units in Modern (additional +1 vs Infantry).
- Rubber: +1 CS Infantry and Air Units in Modern.
- Coal: +100% Production toward building Rail Stations; +1 CS Light Naval Units (Modern).

The Empire resource pattern establishes a clear progression arc: early-game Empire resources boost the unit classes dominant in Antiquity (cavalry from Horses, infantry from Iron); Exploration-age resources shift to siege, ranged, and naval (Niter); Modern resources expand to air and industrial-era unit types (Rubber, Oil, Coal).

**4. Treasure Fleet Resources**

Treasure Fleet Resources are exclusively obtainable during the Exploration Age by using Treasure Fleet units. They do not occupy standard City or Town slots. These resources trigger Treasure Fleet generation when connected to a coastal settlement; the Treasure Fleet unit then carries riches back to friendly territory for Gold and Treasure Fleet points.

Requirements for Treasure Fleet activation: the technologies Cartography AND Shipbuilding (both Exploration Age techs) must be researched, and a Fishing Quay must be built in the settlement. A Treasure Fleet unit is granted periodically when a settlement is built on a different continent AND Treasure Resources are available within city limits AND a Fishing Quay is present.

Examples: Gold Resource (Exploration only, Treasure Fleet trigger), Spices (Exploration: Treasure Fleet trigger; Modern: +4 Food, +4 Happiness), Sugar (Exploration: Treasure Fleet trigger; Modern: +6 Food), Cocoa (Exploration: Treasure Fleet trigger AND classified as a Factory resource; its Treasure Fleet function in Exploration is a conditional secondary effect).

[INFERRED: The exact mechanic of "connected to a coastal settlement" is ambiguous — it likely means the resource must fall within the territory of a coastal settlement, but the precise assignment rule for Treasure Fleet resources vs standard slot resources is not fully documented]

**5. Factory Resources**

Factory Resources can only be slotted into Factories once the Industrialization technology has been researched (Modern Age). They represent industrial-era commodities and provide production efficiency bonuses.

Examples:
- Cocoa (Factory): +3% Happiness empire-wide in Modern.
- Coffee (Factory): +5% Production to constructing Buildings and Wonders in Modern.
- Kaolin: City or Factory resource; +2/+4 Food across city types in Antiquity; +3/+6 Food (Homeland/Distant Land) in Exploration; +3% Culture in Modern (Factory slot in Modern).

Some resources like Kaolin span multiple categories across ages — City resource in Antiquity/Exploration, Factory resource in Modern. [source-conflict: this dual-category-across-age pattern is not fully explained in the wiki; partly inferred]

### Slot assignment and caps

Resources are not automatically active when their tile falls within a settlement territory. The player must explicitly assign the acquired resource to an available slot in a settlement. Slot availability varies by:

- **Settlement type** — Bonus Resources can go in any Town or City slot; City Resources require a City slot; Factory Resources require a Factory in the city.
- **Building bonuses** — The Camels resource adds +2 to the number of Resources assignable to a City, functioning as a slot-expansion item.
- **Factory Towns** — Per Dev Diary #3, a Factory Town focus adds "an additional Resource Slot," providing a second factory-grade slot for industrial resources.

[INFERRED: The base number of resource slots per city/town is not explicitly stated in any accessible source. The Camels resource "+2 Resource Slots" is described relative to an existing cap, implying cities start with a limited number — possibly 1 to 3 slots — that can be expanded. Exact baseline cap is unknown.]

### Per-age resource unlocks and consistency

Resources are age-gated. New resources appear when a new age begins. As of patch 1.3.0, the following consistency rules apply:

- A resource that was not generated in a prior age will not suddenly appear in a later age.
- A resource that was present in a prior age will not disappear and then reappear.
- The map guarantees a minimum of 3 different Coastal Resources (with a chance for more) — standardized in the 1.3.0 Tides of Power update.
- At least 1 new Resource is introduced per age transition.

The practical effect is that map resource layouts are more predictable than at launch: if Silk was present in a region in Antiquity, it will remain in Exploration and Modern (with updated bonus rows). This matters for long-term city planning — a Silk city in Antiquity will remain a Silk city throughout the game, scaling differently as ages advance.

### Military relevance and the strategic resource function

In Civilization VI, Strategic Resources (Horses, Iron, Coal, Oil, Aluminum, Niter) were hard requirements for unit production — a Knight literally could not be built without Horses in territory. Civilization VII eliminates mandatory resource requirements for unit production. Instead, Empire resources provide combat strength bonuses to unit types. A Cavalry unit can be produced without Horses; it simply fights with lower Combat Strength than a Cavalry unit in a Horses-endowed empire. This is a significant design shift: resource scarcity never blocks a production queue, but resource access meaningfully widens the combat gap between empires.

[INFERRED: The above claim — that resource access is a bonus rather than a hard gate — is based on all military Empire resources being described as "+1 Combat Strength to X" rather than "required to produce X." No source explicitly confirms zero production gates. Verify before implementing the production queue.]

The Empire resources with military relevance, by unit type and age:

| Resource | Type | Ages | Military Effect |
|---|---|---|---|
| Horses | Empire/Bonus | Antiquity to Modern | +1 CS Cavalry (Ant/Exp); +1 vs Infantry (Ant); +1 vs Infantry+Ranged (Exp); Happiness in Modern |
| Iron | Empire | Antiquity to Exploration | +1 CS Infantry; +1 CS Infantry+Ranged (Exp) |
| Niter | Empire | Exploration to Modern | +1 CS Siege+Naval (Exp); +1 CS Ranged+Siege (Mod); +1 vs Cavalry (Mod) |
| Oil | Empire | Modern | +1 CS Heavy Naval+Cavalry; +1 vs Infantry |
| Rubber | Empire | Modern | +1 CS Infantry+Air |
| Coal | Empire | Modern | +1 CS Light Naval; +100% Rail Station production |

### Treasure Fleet economy

The Treasure Fleet is a secondary economic system layered on top of resource assignment. It activates only in the Exploration Age and specifically with Treasure-Fleet-triggering resources (Gold, Spices, Sugar, Cocoa in Exploration) connected to coastal settlements. The loop:

1. Player settles a coastal city on a different continent (Distant Lands).
2. The Distant Land city has Treasure Resource tiles within its borders AND has built a Fishing Quay.
3. The required technologies (Cartography + Shipbuilding) are researched.
4. A Treasure Fleet civilian unit is periodically granted to the player.
5. The Treasure Fleet unit travels to friendly coastal waters and returns riches, generating Gold and Treasure Fleet points.
6. Spain (Exploration Age civ) has civilization-specific synergies with this mechanic.

Treasure Fleet resources shift to standard yield bonuses in the Modern Age (Spices: +4 Food +4 Happiness; Sugar: +6 Food), so they remain relevant after the Exploration Age ends even though Treasure Fleet units are no longer generated.

### Resource trading and diplomacy

[LLM-KNOWLEDGE-ONLY: No accessible source in the research session explicitly described a per-resource diplomatic trade mechanic (the classic deal screen from prior Civ games). The Firaxis Dev Diary #6 (Diplomacy, Influence, Trade) was inaccessible (socket error). The Fextralife Trade Routes and Trade pages returned 404. The absence of an explicit resource-trade mechanic in any accessible source — combined with the shift from tile-worked resources to assignment-based bonuses — suggests the per-resource diplomatic trade may not exist in VII in its classic form, or may operate differently. This section requires verification against Dev Diary #6 or Fextralife diplomacy pages before implementation.]

What IS confirmed: trade routes exist as a distinct system (see `systems/trade-routes.md`). Resource assignment to settlements can affect trade route yields [INFERRED from Dev Diary #3 mention of "Trade Outposts" providing "Bonus Happiness on resource tiles"]. Whether resources themselves can be diplomatically transferred between players in VII is an open question.

---

## Formulas

```
-- Active bonus for a City Resource assigned to city C in age A:
cityResourceBonus(resource, C, A) =
  resource.bonusTable[A][cityClass(C)]
  where cityClass(C) = capital | homeland | distantLand

-- Active bonus for an Empire Resource acquired in age A:
empireResourceBonus(resource, A) =
  resource.bonusTable[A]  -- applies to all affected units empire-wide

-- Active bonus for a Factory Resource in city C, age A:
factoryResourceBonus(resource, C, A) =
  IF cityHasFactory(C) AND techResearched(Industrialization) THEN
    resource.bonusTable[A]
  ELSE 0

-- Treasure Fleet trigger condition:
treasureFleetTrigger(resource, settlement) =
  resource.type == TreasureFleet
  AND settlement.isCoastal
  AND settlement.isOnDifferentContinent   -- Distant Lands
  AND settlement.hasFishingQuay
  AND techResearched(Cartography)
  AND techResearched(Shipbuilding)

-- Slot availability (simplified):
slotsAvailable(settlement) =
  settlement.baseSlots
  + settlement.buildingSlotBonuses        -- e.g. Factory Town adds 1 Factory slot
  + sum(assignedResources of type Camels) * 2  -- Camels: +2 slots per Camels resource
```

Where:
- `bonusTable` = per-resource age-keyed lookup (Antiquity / Exploration / Modern rows)
- `cityClass` = function mapping city identity to capital, homeland, or Distant Land classification (see `systems/settlements.md`)
- `settlement.baseSlots` = baseline resource slot count per settlement type; exact value not confirmed from sources [INFERRED: likely 1 to 3]
- Coal bonus: "+100% Production toward building Rail Stations" is a multiplicative modifier applied to Rail Station production queue in Modern Age

No separate numeric combat formula is required: Empire resource combat bonuses are additive flat modifiers to a unit base Combat Strength (e.g. +1 CS from Horses, +1 CS from Iron = +2 CS to an Infantry unit in an empire with both). The combat resolution formula is in `systems/combat.md`.

---

## Interactions

- `systems/settlements.md` — settlement type (City vs Town) determines slot eligibility; city upgrades and building construction add Factory slots or Town-type bonuses. The City/Town distinction maps directly onto the "City Resource vs Bonus Resource" placement rules.
- `systems/ages.md` — resource bonus rows are indexed by age; age transitions trigger re-evaluation of all active resource effects. The age transition also seeds new resources on the map (at least 1 new resource per transition per 1.3.0 patch notes).
- `systems/combat.md` — Empire resources combat strength bonuses are consumed by the combat resolution system; they are the resource system primary military output.
- `systems/trade-routes.md` — Trade Outpost town focus provides "Bonus Happiness on resource tiles," coupling resource location to trade-route-adjacent yields. Treasure Fleet resources interact with the naval trade economy in the Exploration Age.
- `systems/buildings-wonders.md` — Industrialization (technology) unlocks Factory buildings; Factory buildings enable Factory resource slots. Marble and Ivory provide percentage bonuses to Wonder production. Salt and Truffles provide percentage bonuses to unit training production.
- `systems/tech-tree.md` — Cartography and Shipbuilding must be researched before Treasure Fleet units are available. Industrialization must be researched before Factory resource slots unlock.
- `systems/religion.md` — Incense provides a +100% Production bonus to Missionaries and Temples in the Exploration Age, directly boosting religious infrastructure production.
- `systems/diplomacy-influence.md` — Whether resources can be diplomatically traded is an open question. Influence is described in sources as its own currency; the extent to which resources participate in diplomatic exchanges is unconfirmed.
- `systems/map-terrain.md` — Resource tiles exist on specific terrain types; different terrain biomes have characteristic resources. Marble has terrain-conditional wonder bonuses (Grassland, Tundra, Marine terrain in Antiquity). The 1.3.0 patch guarantees a minimum of 3 Coastal Resources per map.
- `systems/victory-paths.md` — [INFERRED] Economic victory conditions likely involve resource acquisition, trade volume, or luxury coverage. Specific resource-victory interactions unconfirmed.

---

## Content flowing through this system

- [`content/resources/`](../content/resources/) — the full list of ~37 confirmed vanilla resources (plus any DLC additions), each tagged with type, age availability, bonuses, and slot class.

---

## VII-specific (how this differs from VI/V)

- **No hard production requirements.** In VI, building a Knight required 1 unit of Horses; building a Musketman required 1 Niter. In VII, Empire resources provide flat combat bonuses but do not gate production. [INFERRED: verify before implementing the production queue]
- **No tile-working.** In VI, a Luxury or Strategic resource needed a citizen assigned to its tile or an improvement built on it (Pasture for Horses, Mine for Iron). In VII, resources are slotted directly into settlement inventories without any tile-assignment or citizen-worker step.
- **Assignment is an explicit player choice.** In VI, once an improvement was built on a resource tile, the resource was automatically "connected" empire-wide. In VII, the player must explicitly slot the resource into a settlement. An acquired resource in the unassigned pool provides zero benefit.
- **Five categories, not three.** VI had Bonus / Luxury / Strategic. VII uses City / Bonus / Empire / Treasure Fleet / Factory — a richer taxonomy that ties resource behavior to settlement type, age mechanics (Treasure Fleet is Exploration-only), and technology gates (Factory requires Industrialization).
- **Age-varying bonuses.** In VI, resources had fixed effects (Horses always gave +1 CS to Mounted units). In VII, every resource has a per-age bonus table; the same resource can provide a combat bonus in Antiquity and a happiness bonus in Modern, reflecting the changing economic importance of that commodity across history.
- **No road-network connection requirement.** In VI, resources had to be "connected" to the capital by a road or trade network; a disconnected city did not benefit from your Silk. In VII, Empire resources apply globally once acquired (no network requirement), while City and Bonus resources are local to the settlement they are assigned to. [INFERRED: the network-connection requirement is not mentioned in any VII source, implying its elimination; verify]
- **Treasure Fleet resources are a new category.** No equivalent in VI or V — the concept of a Distant Lands naval trading economy generating a special resource type via dedicated civilian units is entirely new in VII.
- **Slot expansion via a resource.** The Camels resource adds +2 resource slots to a city. This self-referential mechanic (a resource that makes room for more resources) has no equivalent in prior Civ games.

---

## UI requirements

- **Resource assignment panel** — accessible from the settlement management screen; shows available resource slots, currently assigned resources, and the player unassigned resource pool. Clicking an open slot shows valid resources that can be assigned there. Likely a sub-tab of the City Panel or a dedicated Resource Panel. [INFERRED: exact panel location not confirmed from sources]
- **Resource tooltip / tile hover** — when hovering over a tile with a resource, display: resource type, current assignment status (assigned to which settlement or unassigned), and the bonus it provides in the current age.
- **Empire resource HUD indicator** — since Empire resources apply civilization-wide, players need a persistent view of active combat bonuses (e.g., "+1 CS Cavalry" from Horses, "+1 CS Infantry" from Iron). Could be part of the military advisor overlay or a HUD badge showing active empire modifiers.
- **Unassigned resource notification** — when a settlement grows onto a resource tile, a notification or HUD indicator should appear: new resource acquired, not yet assigned.
- **Factory slot lock visual** — Factory resource slots should appear visually locked until Industrialization is researched; clicking them before then should display a "Requires Industrialization" message.
- **Age transition resource re-evaluation** — at age transition, the resource panel should show players that their assigned resources now use new bonus rows. A summary of changed resource effects is useful UX at transition time.
- **Treasure Fleet resource coastal indicator** — Treasure Fleet resources in coastal cities should display the Treasure Fleet generation condition and current status (met / unmet).

---

## Edge cases

- What if a City Resource is acquired but the player has no Cities (all settlements are Towns)? The resource cannot be assigned and sits in the unassigned pool indefinitely, providing no benefit. [INFERRED]
- What if a settlement is razed or captured by an enemy? Resources assigned to a razed settlement likely return to the unassigned pool; if a city is captured, the enemy gains access to the resource on that tile. [INFERRED: exact mechanic on settlement conquest is unconfirmed]
- What if a player assigns a resource to a Town and then the Town converts to a City? The resource assignment likely persists; Bonus resources are valid in both Town and City slots so no conflict arises. [INFERRED]
- What if Industrialization is researched but no Factory has been built yet? Factory resource slots are presumably not available until both the technology AND the building exist in the specific city. [INFERRED]
- What if a Treasure Fleet resource (e.g. Spices) is assigned to a non-coastal settlement? The Treasure Fleet trigger does not fire, but the resource remains validly assigned and will provide its Modern Age food/happiness bonus regardless of coastal status. [INFERRED]
- What if two copies of the same Empire resource are acquired (e.g. two separate Horses tiles within one player territory)? [INFERRED: likely both provide their bonuses for doubled effect — two Horses = +2 CS Cavalry — but this is unconfirmed. The "limited quantities" phrasing in the Fextralife overview implies scarcity design but does not cap per-player holdings.]
- What if a resource has no bonus row for the current age (e.g. Incense, documented for Antiquity and Exploration but not Modern)? The resource presumably provides zero effect while assigned in that age. [INFERRED]
- What if Camels is assigned and unlocks extra slots, those slots are filled, and then Camels is unassigned? The game must either auto-eject the overflow resources or prevent Camels unassignment while slots are in use. This is a concrete UI edge case with no confirmed resolution. [INFERRED]
- What if multiple Treasure Fleet-triggering resources (e.g. both Spices and Sugar) are both assigned to the same coastal Distant Lands city? [INFERRED: likely generates Treasure Fleet points faster or grants one fleet per resource; exact stacking behavior unknown]
- What if a city with Homeland/Distant Land scaled City Resources changes its continent classification? If the city classification changes, the active bonus row should update accordingly on the next END_TURN evaluation. [INFERRED]

---

## Open questions

- **Diplomatic resource trading** — Does Civ VII have a mechanic to trade resources between players via diplomacy? Dev Diary #6 was inaccessible (https://civilization.2k.com/civ-vii/game-guide/dev-diary/diplomacy-influence-and-trade/ — socket error). Fextralife Trade Routes and Trade pages returned 404. High priority: verify before implementing the diplomacy panel.
- **Base slot counts per settlement type** — How many resource slots does a base Town have vs a base City? The Camels "+2 slots" and Factory Town "+1 Factory slot" are documented, but the baseline is not stated. Affects UI slot-count display and assignment cap logic. Check Fextralife Town/City pages when accessible.
- **Hard production requirements** — Is there truly no hard requirement for any unit type? The "bonus rather than gate" interpretation is inferred from all military Empire resources being framed as "+1 CS to X" not "required to produce X." No source explicitly confirms zero production gates. Verify in the unit production docs or by checking Unit pages on Fextralife.
- **Unassigned resource pool behavior** — Is there an explicit UI inventory screen for unassigned resources? Can resources be traded or gifted when unassigned? Is there a per-empire cap on unassigned resources? Not confirmed from accessible sources.
- **Stacking behavior** — If two Empire resources both provide "+1 CS Infantry" (e.g. both Iron and Rubber), does the player receive +2 CS Infantry total? Almost certainly additive [INFERRED], but stacking rules need confirmation.
- **Resource reassignment cost** — Is reassigning a resource from one settlement to another free, or does it cost gold, actions, or a cooldown? Not mentioned in any source.
- **Coastal resource minimum guarantee scope** — The 1.3.0 patch guarantees "a minimum of 3 different Coastal Resources" — is this per player coastal territory, per map total, or per contiguous coastline? Phrasing is ambiguous.
- **DLC resources** — The Fextralife sitemap listed ~37 resources as of March 2026. The Tides of Power update added new ocean resources (Cowrie, Crabs, Turtles mentioned in one patch note summary). The exact post-DLC count and any DLC-exclusive mechanics are not confirmed. The `content/resources/` folder should be verified against a current source when the content phase runs.
- **Horses cross-age category behavior** — Horses is documented as "Empire/Bonus" with combat bonuses in Antiquity/Exploration but "+6 Happiness" in Modern. Does a Horses resource in Modern still require assignment to a slot (as a Bonus resource), or does it remain Empire-wide? The category behavior across ages is ambiguous.

---

## Mapping to hex-empires

**Status tally:** 0 MATCH / 0 CLOSE / 3 DIVERGED / 6 MISSING / 1 EXTRA
**Audit:** [.codex/gdd/audits/resources.md](../audits/resources.md)
**Highest-severity finding:** F-01 — Resource taxonomy uses Civ-VI vocabulary (DIVERGED, HIGH)
**Convergence status:** Divergent — 3 finding(s) require(s) architectural refactor

_(Full details in audit file. 10 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

Both canonical Fandom URLs (https://civilization.fandom.com/wiki/Resource_(Civ7) and https://civilization.fandom.com/wiki/List_of_resources_in_Civ7) returned HTTP 403 throughout the research session. The Fextralife wiki was the primary source for individual resource data; its main Resources page was accessible and 25+ individual resource pages were queried. The Firaxis Dev Diary #6 (Diplomacy) was inaccessible (socket error). The Fextralife Trade Routes and Trade pages returned 404. As a result, the diplomacy/trading section is the weakest part of this doc and carries the most uncertainty tags.

The five-category taxonomy (City / Bonus / Empire / Treasure Fleet / Factory) is the most concrete finding from this research — it differs substantially from the Civ V/VI "bonus / luxury / strategic" vocabulary and should inform hex-empires resource data schema design. The combat-bonus vs production-gate distinction is a high-confidence inference (all military Empire resources are documented as "+1 CS to X," none as "required to produce X"), but requires explicit verification before implementing the production queue in hex-empires.

---

<!-- END OF TEMPLATE -- do not add sections after this line. -->
