# Trade Routes — Civ VII

**Slug:** `trade-routes`
**Bucket:** `diplomacy`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

Every factual claim below MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://civilization.fandom.com/wiki/Trade_Route_(Civ7) — Fandom: Trade Route (Civ7) (**403 during fetch; data via search-engine excerpts**)
- https://civilization.fandom.com/wiki/Merchant_(Civ7) — Fandom: Merchant (Civ7) (**403 during fetch; data via search-engine excerpts**)
- https://civilization.2k.com/fr-FR/civ-vii/game-guide/dev-diary/diplomacy-influence-trade/ — Firaxis Dev Diary 6: Diplomacy, Influence and Trade (FR locale, fetched)
- https://game8.co/games/Civ-7/archives/498059 — Game8: How to Send and Make Trade Routes with Merchants
- https://game8.co/games/Civ-7/archives/498591 — Game8: How to Increase Trade Range
- https://gamerant.com/civilization-vii-trade-routes-explained-trader-get-merchant-unit-civ-7/ — GameRant: Trade Routes, Explained
- https://www.gamesradar.com/games/strategy/civilization-7-trade-routes-merchants/ — GamesRadar: How to trade in Civ 7
- https://gameranx.com/features/id/529360/article/civilization-7-how-to-establish-trade-routes/ — Gameranx: How to Establish Trade Routes
- https://screenrant.com/civ-7-how-to-start-trade-routes-merchants/ — Screen Rant: How To Start Trade Routes
- https://www.thegamer.com/civilization-7-civ-merchants-how-to-use-guide/ — The Gamer: Merchants, Explained
- https://gamerblurb.com/articles/how-to-use-merchants-and-trade-routes-in-civ-7 — GamerBlurb: How to Use Merchants and Trade Routes
- https://toxigon.com/civ7-trade-routes — Toxigon: Mastering Civ 7 Trade Routes
- https://aelgames.com/civilization-7-resource-slots-guide-increase-and-allocate-resources-effectively.html — AELGames: Resource Slots Guide
- https://forums.civfanatics.com/threads/beginner-trade-route-question-about-ranges.695919/ — CivFanatics: Beginner trade route range question
- https://forums.civfanatics.com/threads/civ7-live-stream-merchants-and-trade-routes.691981/ — CivFanatics: Merchants and trade routes live-stream thread
- https://steamcommunity.com/app/1295660/discussions/0/598519066984989025/ — Steam Discussion: Trade routes during war

**Source conflicts noted:**
- Merchant minimum relationship: Game8 says Unfriendly or higher; The Gamer says friendly or neutral. Unfriendly is likely the hard floor; tagged where cited.
- War termination: most sources say routes cancel and merchant returns; one Steam discussion says merchant is lost. Tagged `[source-conflict]`.
- Gold per route: Toxigon cites 8–12 gold/turn total per route; Fandom excerpts cite 2/3/4 gold per resource slot per age. Not contradictory (total = slots x rate) but must be reconciled.

---
## Purpose

Trade Routes in Civ VII are the primary mechanism by which players acquire foreign resources and generate diplomacy-adjacent gold flows. Where Civ VI used passive trader units that created perpetual yield streams between two cities, Civ VII redesigns trade as a **manual, mobile, and diplomatic process**: a Merchant unit physically travels to a foreign settlement, establishes a connection, and then becomes a stationary Caravan or Trade Ship that continuously generates gold for the destination civ while providing the origin civ with a copy of the destination’s slotted resources. The system ties trade directly into the diplomacy layer (relationship requirements, Improve Trade Relations treaty) and into the resource-slot economy, making it central to empire management rather than a yield-booster bolted on top.

---

## Entities

- `PlayerState.merchants` — (RW) — list of active Merchant units and their state (in-transit / caravan / trade-ship)
- `PlayerState.activeTradeRoutes` — (RW) — set of established routes; each entry records source settlement, destination settlement, resource being copied, gold-per-turn to destination
- `PlayerState.tradeRouteCapacity` — (RW) — max routes per civ pair; starts at 1, increased by Improve Trade Relations treaty
- `PlayerState.resources` — (RW) — resource pool; populated by trade routes copying destination resources
- `CityState.resourceSlots` — (R) — number of resource slots; determines how many resources the settlement can offer for trade
- `CityState.settlementType` — (R) — `capital | city | town`; affects resource-slot count and resource category restrictions
- `GameState.currentAge` — (R) — governs land/sea range caps, gold-per-resource rate, and whether physical travel is required
- `DiplomacyState.relationships[civA][civB]` — (RW) — relationship tier gates route establishment; war declaration cancels all routes
- `DiplomacyState.treaties[civA][civB]` — (RW) — Improve Trade Relations treaty entry increments tradeRouteCapacity for the pair

---

## Triggers

- On action **MOVE_MERCHANT_TO_DESTINATION** — merchant traverses tiles toward target settlement; enemy units may intercept during transit.
- On action **MAKE_TRADE_ROUTE** — fired when merchant arrives at foreign settlement and player confirms; merchant converts to Caravan (land) or Trade Ship (sea); resources copied to origin; gold accrual begins for destination.
- On **END_TURN** (every turn, all players) — for each active trade route: gold-per-turn is credited to the destination civ treasury.
- On **DECLARE_WAR** — all trade routes between the two warring civs are cancelled immediately; caravan/trade-ship units are lost (see Open questions for source conflict on merchant return).
- On **PLUNDER_TRADE_ROUTE** (military unit action) — enemy military unit standing on a trade route tile can plunder it; route severed; small relationship penalty applied to plundering civ.
- On **AGE_TRANSITION** — existing merchants and routes do NOT carry forward; players must re-unlock the Merchant unit in the new age and establish new routes.

---
## Mechanics

### The Merchant Unit

The Merchant is a **civilian unit** with a nominal HP pool (reported 100 HP) for combat resolution when intercepted. It cannot meaningfully defend itself against military attack.

Key data:
- **Production cost:** 40 Production [Screen Rant]
- **Gold cost (purchase):** approximately 400 Gold [GamerBlurb — approximate; varies by era multipliers]
- **Training location:** any settlement (city or town) once the prerequisite civic/tech is researched
- **Road-building side effect:** in Antiquity and Exploration ages, a Merchant travelling to a foreign settlement builds **roads** along its path, reducing unit movement costs. In Modern, roads upgrade to **railroads** [The Gamer].

Merchants must be **re-unlocked at each age transition** — the unit class does not persist between ages. Unlock prerequisites:

| Age | Prerequisite Research |
|---|---|
| Antiquity | Code of Laws Civic (requires Mysticism + Discipline first) |
| Exploration | Economics Civic |
| Modern | Steam Engine Technology |

### Establishing a Trade Route

The route-establishment flow is manual and physical in Antiquity and Exploration; Modern automates the travel step.

**Antiquity and Exploration:**

1. Train or purchase a Merchant in any of your settlements.
2. Select the Merchant; the UI displays eligible destination settlements (foreign civs at Unfriendly relationship or better; Independent Powers where you are Suzerain) and previews the resources available at each.
3. Move the Merchant toward the destination over multiple turns. During transit it is vulnerable to interception (see Interception section).
4. On arrival at the destination settlement tile, a prompt offers Make Trade Route. Confirm to establish.
5. The Merchant unit converts: land routes produce a **Trade Caravan**; sea routes produce a **Trade Ship**. The converted unit is stationary on the map and represents the live route.

**Modern Age:**

In the Modern Age the travel requirement is removed. The player selects the destination directly from a UI list and the route activates immediately, without the Merchant physically crossing tiles [Firaxis Dev Diary FR mirror]. This is a deliberate design relief in the final age where the map is large.

### Yields — What Each Party Receives

Trade routes in Civ VII are **asymmetric**.

**Origin civ (the civ that sent the Merchant):**

Receives a **copy** of the resources present in the destination settlement’s resource slots. The copy is added to the origin civ’s resource pool and must then be manually allocated to a city or town (see Resource Allocation). The origin civ does NOT pay gold for this — the gold flows the other direction.

**Destination civ (the civ whose settlement was visited):**

Receives **gold per turn** for as long as the route remains active. The gold rate scales with age and the number of resource slots in the destination settlement:

| Age | Gold per resource slot per turn |
|---|---|
| Antiquity | 2 Gold |
| Exploration | 3 Gold |
| Modern | 4 Gold |

A destination city with 4 resource slots earns 8 Gold/turn in Antiquity, 12 in Exploration, 16 in Modern. Community reports cite 8–12 Gold/turn per route as a typical Antiquity-to-Exploration range [Toxigon — cross-check needed against exact slot counts].

**Sea route bonus:** Sea trade routes grant **double** the normal gold yield to the destination [Firaxis Dev Diary FR mirror]. This incentivises naval infrastructure and overseas trading partnerships.

**Note on other yield types:** One secondary source (Toxigon) lists Food, Science, Production, Culture, Amenities, and Diplomatic Favor as route outputs via in-game icon. These may reflect civ leader abilities or building bonuses rather than baseline route mechanics. Primary sources confirm only Gold (to destination) + Resource copy (to origin) as the universal baseline. The additional yields are tagged `[INFERRED]` / `[source-conflict]` and require verification against Fandom wiki direct access.

### Resource Allocation

Resources obtained from a route arrive in the origin civ’s resource pool and must be manually assigned to settlement slots. Resources fall into three categories:

| Type | Can be allocated to |
|---|---|
| Empire Resources | Entire civilization (no settlement assignment needed) |
| City Resources | Cities only (not towns) |
| Bonus Resources | Either cities or towns |

Resources do not auto-assign — the player must manually allocate [Game8; Gameranx]. Factory Resources (Modern age only) additionally require the destination city to have a Factory building and a Railroad connection [AELGames].

**City vs town destination matters:** A route to a city yields City Resources (city-only allocation); a route to a town yields Bonus Resources (any settlement). Towns give flexibility; cities give volume (more slots) but narrower placement options [Game8; multiple sources].
### Distance Rules and Range

Routes are only establishable if the destination is within range of the origin settlement, measured in tiles between city centers:

| Age | Land range | Sea range |
|---|---|---|
| Antiquity | 10 tiles | 30 tiles |
| Exploration | 15 tiles | 45 tiles |
| Modern | 20 tiles | 60 tiles |

A 10-tile range means the destination center is at most 10 tiles from the origin center (at most 9 tiles between them) [CivFanatics range thread]. Sea ranges are 3x the land range at each age [INFERRED from the 30/45/60 pattern in Fandom excerpts].

**Terrain obstacles:**
- Mountains in the direct path block a land route.
- Navigable rivers require bridges; a visually connected path may still fail without a bridge. Only cities (not towns) can construct bridges [CivFanatics range thread].
- Open-ocean sea routes additionally require **Cartography** technology (Exploration age) and a **Fishing Quay** (or equivalent) in a coastal settlement on **both** landmasses [Fandom excerpt via search].

**Extending range:** Founding an intermediate settlement closer to a trading partner, then sending a Merchant from that closer settlement, effectively extends reach [Game8 range guide]. Forming an **Alliance** with a civ grants free merchant passage through their territory [Game8].

### Route Capacity

By default, each civ pair may have **one active trade route at a time** [The Gamer; multiple sources]. To increase the cap:

- Use the **Improve Trade Relations** diplomatic action under Treaties in the diplomacy screen. Both parties must agree. This increments the trade route cap for that specific civ pair.
- Spending Influence Points on a foreign leader portrait can also unlock additional route slots [GamerBlurb].
- Some civ or leader abilities may grant additional route capacity `[INFERRED]` — not confirmed in primary sources for non-Prussia civs.

### Diplomatic Requirements

Trade routes require a minimum diplomatic standing:

- **Minimum relationship: Unfriendly** or better [Screen Rant; Game8]. Hostile leaders cannot be traded with.
- **Independent Powers:** require Suzerain status before a route can be established [Gameranx; The Gamer].
- **Open Borders** is not strictly required for merchant transit but eases passage. Without open borders the player must navigate around closed territory or request an Open Borders treaty [Game8 range guide].
- The destination civ does not need to actively agree once the route is established — gold flows automatically.

### Interception and Plundering

Two categories of route threat:

**During transit (Merchant in-transit):**

The Merchant can be attacked and destroyed by:
- Enemy military units of civs at war with the origin civ.
- Hostile Independent People units (barbarian-equivalent factions).

Losing a Merchant in transit cancels the route-establishment attempt; the Merchant is permanently gone and must be retrained.

**After establishment (Caravan / Trade Ship on map):**

The Caravan or Trade Ship unit sits on the map and can be targeted by:
- Enemy military units in wartime.
- Any military unit (even in peacetime) using the **Plunder Trade Route** action on a non-allied route. Peacetime plundering incurs a **relationship penalty** with the route-owning civ [Fandom excerpt; CivFanatics live-stream thread]. This is a cold-war economic disruption tool.
- Hostile Independent People if the route passes through their territory [GameRant].

**Strategic mitigation:** Game8 and GamesRadar both recommend posting military escort units along trade corridors, particularly through contested territory or near hostile Independent People.

### Route Termination

A trade route ends under any of the following conditions:

1. **War declaration** — all routes between the two parties immediately cancel. Whether the Merchant/Caravan is returned or permanently lost is `[source-conflict]`: most guides say the Merchant returns; one Steam discussion says it is destroyed. **Exception:** the Prussian civilization does not lose trade routes with civs it goes to war with — a unique civ ability [Fandom excerpt via search].
2. **Caravan/Trade Ship destroyed** — plundered in peacetime or killed in combat during war.
3. **Age transition** — all routes and Merchant units are removed; re-establishment required in new age.
4. **Relationship drops to Hostile mid-game** — `[INFERRED]` route likely cancels; not confirmed explicitly.
5. **Destination settlement captured** — `[INFERRED]` route presumably cancels since destination owner changed; not explicitly confirmed.

### No Internal Trade

Civ VII does **not** have internal trade routes. A Merchant cannot target its owner’s own settlements. All routes must go to a foreign civ’s settlement or to a suzerained Independent Power [CivFanatics live-stream thread; multiple guides]. This is a deliberate departure from Civ VI, where internal routes distributed food and production within your own empire.

### Age Behavior at Transition

When an age transition occurs:
- All active Caravan and Trade Ship units are removed from the map.
- All in-transit Merchants are removed.
- The Merchant unit class becomes unavailable until the new age unlock prerequisite is researched.
- No route yields carry forward; routes must be re-established from scratch.
- **Modern-age exception:** once Merchants are re-unlocked in Modern, routes can be established without physical travel — select destination from UI [Firaxis Dev Diary FR mirror].

---
## Formulas

```
gold_per_turn_to_destination =
  resource_slots_in_destination * gold_rate_per_slot * sea_multiplier

gold_rate_per_slot:
  Antiquity   -> 2
  Exploration -> 3
  Modern      -> 4

sea_multiplier:
  land route  -> 1
  sea route   -> 2

land_range_tiles:
  Antiquity   -> 10
  Exploration -> 15
  Modern      -> 20

sea_range_tiles = land_range_tiles * 3
  Antiquity   -> 30
  Exploration -> 45
  Modern      -> 60

route_active =
    (relationship >= UNFRIENDLY)
  AND (distance_tiles <= range_for_age_and_type)
  AND (active_routes_for_pair < tradeRouteCapacity[civA][civB])
  AND NOT at_war(civA, civB)

tradeRouteCapacity[civA][civB] =
  1 + improve_trade_relations_stack + civ_ability_bonus
```

Where:
- `resource_slots_in_destination` = determined by settlement type (capital > city > town), population, and buildings (Market, Lighthouse, Camel resource adds +2 slots; Camel unavailable in Modern) [AELGames]
- `gold_rate_per_slot` = confirmed: 2/3/4 per age [Fandom excerpts; Game8]
- `sea_multiplier = 2` = confirmed by Firaxis Dev Diary FR mirror
- `improve_trade_relations_stack` = incremented per agreed ITR treaty (both parties) [The Gamer; multiple sources]
- `civ_ability_bonus` = 0 for most civs `[INFERRED]`; Prussia confirmed exception to war-cancellation rule, not to base capacity
- Merchant production cost: 40 Production [Screen Rant]; purchase cost approx. 400 Gold [GamerBlurb]

---

## Interactions

- `systems/diplomacy-influence.md` — trade route capacity is gated by relationship tier; Improve Trade Relations is a diplomatic treaty action; plundering creates relationship penalties. Trade is a sub-system of the broader diplomacy layer.
- `systems/independent-powers.md` — players can trade with Independent Powers only after Suzerain status via influence investment; trade integrates with the suzerainty reward structure.
- `systems/settlements.md` — resource-slot count per settlement type (city vs town vs capital) directly controls yield to destination and the resource category origin civs receive.
- `systems/resources.md` — trade routes primary output is resources; resource type (Empire/City/Bonus/Factory) determines allocation. The resource system feeds buildings, yields, and victory conditions.
- `systems/ages.md` — route capacity, gold rate, range caps, and physical-travel requirement all change at age transitions; routes reset entirely at each transition.
- `systems/tech-tree.md` — Cartography technology (Exploration age) unlocks open-ocean sea routes.
- `systems/civic-tree.md` — Code of Laws (Antiquity) and Economics (Exploration) unlock the Merchant unit; the civic tree gates trade access in the first two ages.
- `systems/combat.md` — enemy military units can intercept in-transit Merchants or plunder established Caravans/Trade Ships; Plunder Trade Route is a combat system interaction.
- `systems/victory-paths.md` — trade routes contribute to the Economic Victory path in Modern via Rail Connections and Factory Resources [The Gamer]; trade route count or gold likely feeds Economic legacy milestones.

---

## Content flowing through this system

- [`content/civilizations/`](../content/civilizations/) — civ unique abilities (Prussia war-trade exemption confirmed; others likely modify trade route count, resource bonuses, or gold multipliers)
- [`content/buildings/`](../content/buildings/) — Markets, Lighthouses, Fishing Quays and similar buildings affect slot count and sea-route eligibility
- [`content/resources/`](../content/resources/) — all resource types (Bonus, Luxury, Strategic, Factory) flow through trade routes
- [`content/technologies/antiquity/`](../content/technologies/antiquity/) — Code of Laws Civic (unlocks Merchant in Antiquity)
- [`content/technologies/exploration/`](../content/technologies/exploration/) — Economics Civic (unlocks Merchant in Exploration), Cartography Technology (unlocks sea routes)
- [`content/technologies/modern/`](../content/technologies/modern/) — Steam Engine Technology (unlocks Merchant in Modern and enables Railroad roads)
- [`content/independent-powers/`](../content/independent-powers/) — tradeable after suzerainty; provide unique resources to the origin civ

---
## VII-specific (how this differs from VI/V)

- **No internal trade routes.** Civ VI traders could target your own cities to move food or production. Civ VII restricts all routes to foreign destinations, making trade inherently diplomatic.
- **Physical merchant travel (Antiquity + Exploration).** In Civ VI traders moved automatically once assigned. In Civ VII merchants manually traverse the map in two of three ages, creating logistics and escort decisions.
- **Resources (not yields) as primary output for origin.** Civ VI routes provided flat Food/Production/Gold yields per turn. Civ VII routes copy destination resource slots, tying trade to the resource-slot economy rather than raw yield numbers.
- **Asymmetric payoff.** Civ VI both parties typically gained yield benefits. Civ VII origin civ gains resources while destination civ gains gold — explicitly asymmetric, incentivising both exporting (hosting foreign merchants) and importing (sending your own).
- **Route capacity via diplomacy.** Civ VI had a fixed per-civ slot count based on buildings. Civ VII uses Improve Trade Relations treaty to expand per-civ-pair capacity.
- **Age-gated ranges.** Trade range scales with age (10 to 15 to 20 tiles land), so early-game trade is local and late-game trade is continental or oceanic.
- **Modern age removes physical travel.** A late-game QoL concession not present in prior games.
- **Sea routes double gold.** Civ VI had no special sea-route multiplier; VII uses 2x to reward naval investment.
- **Plundering in peacetime allowed.** Civ VI only allowed pillaging routes in wartime. Civ VII allows plundering any non-allied route at the cost of a relationship hit — a cold-war economic disruption tool.
- **Merchants re-unlocked each age.** In VI the Trader unit persisted; in VII merchants are lost at every age transition and the unit must be re-researched.

---

## UI requirements

- **Merchant unit selection UI** — when a Merchant is selected, overlay highlights eligible destination settlements on the map with a preview: resources available, gold-per-turn the destination would earn, and resource category (City/Bonus).
- **Route establishment prompt** — appears when Merchant reaches destination tile; confirm/cancel with route summary.
- **Active trade routes panel** — accessible from diplomacy or resource screen; lists all active routes (source to destination, resources received, gold flowing out per turn), with option to cancel manually.
- **Resource allocation screen** — after route establishment, player assigns newly obtained resources to settlement slots; shows Empire/City/Bonus categorization.
- **Diplomacy screen — Improve Trade Relations** — treaty action entry showing current route capacity with target civ and what the ITR treaty would increase it to.
- **HUD notification** — toast when a Merchant establishes a route; alert when a Caravan/Trade Ship is plundered or destroyed.
- **Plunder Trade Route action** — appears in action bar of eligible military units standing on a Caravan/Trade Ship tile belonging to a non-allied civ.

---
## Edge cases

- What if a Merchant is mid-transit when war is declared? The Merchant is destroyed or returned [source-conflict]; route-establishment attempt cancels.
- What if the destination settlement resource slots are all full when a Merchant arrives? The route may establish but yield zero resources to origin until a slot frees up [INFERRED — not confirmed].
- What if both civs simultaneously send Merchants to each other? Each route is independent; both can be active as long as capacity allows. Gold and resource flows are separate on each side.
- What if a city with an active Caravan route is captured by a third-party civ? The route presumably cancels since the destination owner changed [INFERRED — not confirmed].
- What if the Improve Trade Relations treaty expires? If it expires the capacity cap would drop, potentially orphaning excess active routes [INFERRED — ITR duration not confirmed].
- What if an Independent Power is incorporated into your empire? The trade route presumably terminates since the destination would become your own settlement (no internal routes) [INFERRED].
- What if the destination has a Camel resource (+2 slots, but Camel occupies 1, net +1 effective)? The Camel bonus is unavailable in Modern; routes established in Exploration leveraging it may shift after the Exploration-to-Modern transition.
- What if a route is plundered by a civ allied with the destination civ? The Plunder action is blocked for allied civ pairs — alliances protect routes from peacetime plunder [Fandom: plunder trade routes between non-Allied civilizations].
- What if the player has no settlement within range of a foreign civ? The route cannot be established; the fix is to found an intermediate settlement closer to the target.
- What if a Modern-age Merchant establishes a route without travelling? Physical road-building likely does not occur when travel is skipped [INFERRED — not confirmed].

---

## Open questions

- **Merchant loss on war declaration:** Most guides say the merchant returns to your nearest settlement; one Steam discussion says it is permanently destroyed. Needs in-game verification or direct Fandom wiki access. Affects the DECLARE_WAR handler.
- **Improve Trade Relations duration:** Is ITR a permanent treaty or does it expire after N turns? Sources confirm both parties must agree but do not state duration. If it expires, capacity tracking needs a timer.
- **Additional yield types (Science, Culture, Amenities, etc.):** Toxigon lists these as outputs; primary sources only confirm Gold (destination) and Resources (origin). Are these baseline, civ-specific, or building-gated? Needs disambiguation against Fandom.
- **Exact resource-slot counts per settlement type and population threshold:** AELGames gives approximate ranges (3-5 for cities, 1-3 for towns). Precise per-tier numbers would sharpen the gold formula.
- **Route cancellation on mid-route relationship deterioration to Hostile:** Unfriendly is the establishment floor; whether an existing active route survives if relations drop to Hostile mid-game is unconfirmed.
- **Modern-age road/railroad building side effect:** Whether skipping travel in Modern also skips the road-building ability. Not confirmed.
- **Unique civ trade abilities beyond Prussia:** Only Prussia war-trade exemption was found explicitly. Other civs likely modify trade. Not catalogued here — covered in content/civilizations/.
- **Fandom wiki access:** Trade Route (Civ7) and Merchant (Civ7) pages both returned 403 during this session. A future fetch would upgrade search-engine excerpt data to direct numeric tables.

---

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._

---

## Author notes

Fandom wiki pages (highest-priority source for numeric constants) returned 403 on both fetch attempts. All numeric data was sourced via search-engine excerpt snippets referencing those pages, plus secondary guides (Game8, GameRant, GamesRadar, The Gamer, GamerBlurb, Screen Rant, CivFanatics forums, Steam Discussions). The gold-per-slot rates (2/3/4 per age) and distance ranges (10/15/20 land, 30/45/60 sea) appeared consistently across multiple independent search results, giving medium confidence. The sea-route 2x multiplier came from the Firaxis Dev Diary FR mirror and is high-confidence. Yield types beyond Gold and Resources are low-confidence and tagged. A follow-up Fandom fetch would upgrade several [INFERRED] items to sourced status.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->