# Independent Powers -- Civ VII

**Slug:** `independent-powers`
**Bucket:** `diplomacy`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

Every factual claim in the sections below MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://civilization.fandom.com/wiki/Independent_Power_(Civ7) -- Fandom: Independent Power (Civ7) [direct page returned 403; accessed via WebSearch]
- https://civilization.fandom.com/wiki/City-State_(Civ7) -- Fandom: City-State (Civ7) [accessed via WebSearch summary]
- https://civilization.fandom.com/wiki/Suzerain_(Civ7) -- Fandom: Suzerain (Civ7) [accessed via WebSearch summary]
- https://civilization.2k.com/civ-vii/game-guide/dev-diary/diplomacy-influence-trade/ -- Firaxis Dev Diary #6: Diplomacy, Influence, and Trade
- https://gamerant.com/civilization-vii-civ-7-how-incorporate-city-states/ -- Game Rant: Should You Incorporate City-States?
- https://www.thegamer.com/civilization-7-guide-to-independent-powers/ -- TheGamer: Complete Guide to Independent Powers
- https://game8.co/games/Civ-7/archives/498559 -- Game8: How to Interact With Independent Powers
- https://screenrant.com/civ-7-barbarians-independent-powers-city-states-explained/ -- Screen Rant: Barbarians, Independent Powers and City-States Explained
- https://comradekaine.com/civilization7/independent-powers-no-more-barbs-in-civ-vii/ -- ComradeKaine: Independent Powers overview
- https://www.well-of-souls.com/civ/civ7_overview.html -- Well of Souls: Civ VII Overview (suzerain bonus examples)
- https://forums.civfanatics.com/threads/city-states-in-civ7-the-good-the-bad.698718/ -- CivFanatics: City-States in Civ7 (community analysis)
- https://steamcommunity.com/app/1295660/discussions/0/677329371087794188/ -- Steam: What was revealed about Influence and Independent Powers
- https://steamcommunity.com/app/1295660/discussions/0/598520671180449326/ -- Steam: Suzerain Bonus pool discussion

**Source conflicts noted:** Two sources disagree on Befriend project cost: Game8 cites 85 Influence; GameRant cites 170/340/510 per age (85 may be partial-cost or pre-patch). Screen Rant states suzerainty lasts forty turns; post-launch sources frame it as lasting the remainder of the Age. Digital Trends conflates suzerain status and incorporation; other sources clarify they are two distinct steps.

---

## Purpose

Independent Powers are Civilization VII replacement for both Barbarian encampments and city-states from previous entries. Rather than maintaining two separate NPC systems (hostile barbs that spawn units, plus passive city-states offering opt-in bonuses), VII collapses them into a single faction type: minor settlements that start as hostile or neutral, can be converted through diplomatic investment into allied city-states, and disappear entirely at each age transition unless incorporated into the player empire. The system makes Influence a primary diplomatic currency, gives every map faction a dual diplomatic/military identity, and introduces genuine competitive pressure around suzerainty -- there is only one suzerain per city-state, so befriending faster than rivals carries real strategic value.

---

## Entities

- `PlayerState.influence` -- (RW) -- the currency spent on all Independent Power interactions; generated through civics, buildings, and leader abilities
- `PlayerState.suzerainties` -- (RW) -- list of city-state IDs for which this player is current suzerain; drives active bonus application
- `PlayerState.suzerainBonuses` -- (RW) -- the specific bonus(es) selected upon becoming suzerain of each city-state, indexed by city-state ID
- `IndependentPowerState.id` -- (R) -- unique identifier; matches a content entry in `content/independent-powers/`
- `IndependentPowerState.type` -- (R) -- one of `militaristic | cultural | scientific | economic | diplomatic | expansionist`; determines suzerain bonus pool
- `IndependentPowerState.attitude` -- (RW) -- `hostile | neutral | friendly`; set at spawn; shifts as befriend project progresses
- `IndependentPowerState.befriendProgress` -- (RW) -- points accumulated toward suzerainty threshold; incremented each turn the project is active
- `IndependentPowerState.suzerainPlayerId` -- (RW) -- null until befriended; set to first player to complete the Befriend project
- `IndependentPowerState.isIncorporated` -- (RW) -- true once the city-state has been absorbed into a player empire as a settlement
- `IndependentPowerState.isCityState` -- (RW) -- false while still an independent power; true after first player completes Befriend project
- `GameState.independentPowers` -- (RW) -- collection of all active IndependentPowerState entries; cleared and re-seeded on age transition
- `SettlementState.originId` -- (R) -- set to the former independent power ID when a settlement is the product of incorporation; for audit/history

---

## Triggers

- **On START_OF_AGE:** re-seed `GameState.independentPowers` with a fresh set for the new age. Powers not incorporated in the previous age are removed.
- **On DISCOVER_INDEPENDENT:** unlock diplomatic interaction options in the Leader screen; add the power to the player known list.
- **On END_TURN (player with active Befriend project):** increment `befriendProgress` by the project generation rate. If `befriendProgress >= BEFRIEND_THRESHOLD` and no suzerain is set, set `suzerainPlayerId` to this player; convert to city-state; present bonus selection screen.
- **On action BEFRIEND_INDEPENDENT:** deduct `BEFRIEND_INITIATE_COST` Influence; set project active at base generation rate.
- **On action ADD_SUPPORT:** deduct `ADD_SUPPORT_COST` Influence; increment `befriendProgress` by `SUPPORT_BOOST_POINTS`.
- **On action INCITE_RAID:** deduct `INCITE_RAID_COST` Influence; queue the independent to send units toward the target for 1 turn.
- **On action BOLSTER_MILITARY (suzerain only):** deduct `BOLSTER_MILITARY_COST` Influence; generate one military unit in the city-state.
- **On action PROMOTE_GROWTH (suzerain only):** deduct `PROMOTE_GROWTH_COST` Influence; grant +15 Food/turn to city-state for 5 turns.
- **On action LEVY_UNIT (suzerain only):** deduct Influence based on unit type; permanently transfer one city-state unit to the player army.
- **On action INCORPORATE (suzerain only):** deduct `INCORPORATE_COST` Influence; begin a multi-turn project. On completion, convert city-state to Town; disband remaining city-state units; set `isIncorporated = true`.
- **On action DISPERSE (military conquest):** player captures Independent Power main tile; grant `DISPERSE_YIELD` bonus and 25 XP to adjacent Commander; permanently remove the power.

---

## Mechanics

### What Independent Powers Are

Independent Powers are minor NPC factions occupying one or more map tiles. They are not player civilizations and do not compete for victory. They do not advance through ages on their own -- each age transition wipes all surviving unincorporated Independent Powers from the map and spawns fresh ones at the start of the next age.

Each Independent Power has a **type** drawn from five (later six) categories. The type determines which suzerain bonus pool the power offers, and also determines the one-time yield granted when the power is dispersed by military force.

Independent Powers spawn with one of three initial attitudes toward nearby civilizations:

- **Hostile** -- immediately sends military units toward the nearest player territory, functionally identical to Civ VI barbarian camps. Hostile powers continue raiding until defeated or converted.
- **Neutral** -- passive; does not attack but does not welcome contact. Befriending becomes available once discovered.
- **Friendly** -- discovered with a head start on the befriend progress bar. [INFERRED: exact initial point advantage not confirmed; implied by multiple sources describing friendly as easier/faster to befriend]

### Befriending -- The Core Interaction Loop

To convert an Independent Power into a city-state and claim suzerainty, a player runs the **Befriend Independent** project.

1. **Discover** the Independent Power by moving a unit adjacent to its settlement tile.
2. **Initiate** the Befriend project from the Leader screen (heart symbol tab). Costs `BEFRIEND_INITIATE_COST` Influence.
3. **Accumulate befriend points.** The project generates points per turn at a base rate. Multiple players can run competing Befriend projects on the same power simultaneously.
4. **Accelerate** with the repeatable **Add Support** action (costs `ADD_SUPPORT_COST` Influence each use) to increase generation by +1 point per turn.
5. **First player to reach `BEFRIEND_THRESHOLD` total befriend points** wins suzerainty. The power converts to a City-State; that player enters the suzerain bonus selection screen.

The befriend threshold is reported by community sources as 60 points with base generation at 2 points per turn, implying approximately 30 turns at standard speed -- consistent with GameRant citing a 30-turn project on Standard speed. [INFERRED: exact threshold and generation rates not confirmed from Firaxis; 60-threshold / 2-pt-per-turn / 30-turn project is internally consistent and multiply-attested at community level]

Hostile Independent Powers require more time to befriend. [source: Steam community preview] Whether this is a higher threshold, lower base generation rate, or a locked-out early window is unclear from available sources.

### Suzerain Status and Bonus Selection

On completing the Befriend project, the player becomes **Suzerain** of the newly-created City-State. Suzerainty is **exclusive** -- only one player can hold it at a time. There is no diplomatic mechanism to contest it; only military conquest can flip control.

Immediately upon becoming Suzerain, the player is shown a **bonus selection screen** offering 2-3 options drawn from the city-state type-specific bonus pool for the current age. The player picks one; it activates for the remainder of the age. The chosen bonus is removed from the pool, preventing future players who suzerain the same city-state type from selecting the same option. [source: Steam bonus-selection discussion]

**Bonus pools by type (illustrative examples; actual pool varies per game and age):**

| Type | Example Antiquity Bonuses | Stacking Mechanic |
|---|---|---|
| Militaristic | +1 Combat Strength to Ranged/Siege per Militaristic CS suzerainty; OR unlock Foederati unique unit; OR unlock Hillfort; OR unlock Shore Battery | Many bonuses scale per Militaristic CS count |
| Cultural | +N Culture on Temples per Cultural CS suzerainty; OR free Social Policy slot; OR free Civic; OR unlock Stone Head | Some bonuses scale per CS count |
| Scientific | Unlock Institute improvement (high Science yield); OR free Technology; OR Science bonuses | [INFERRED: mirrors Cultural structure] |
| Economic | Gold yield bonuses; OR trade route slots; OR resource access bonuses | [INFERRED: mirrors other types] |
| Diplomatic | Influence generation bonuses; OR Happiness bonuses; OR Diplomatic Action bonuses | Added post-launch as 5th type |
| Expansionist | Food bonuses; OR border growth acceleration; OR settlement founding advantages | Added post-launch as 6th type |

**Stacking mechanic:** many bonuses scale with the count of city-states of the same type you hold suzerainty over. Consolidating multiple city-states of the same type is a valid strategy. A September 2025 balance patch reduced the power of percentage bonuses, free Tech/Civic grants, and building-yield bonuses because stacking was too strong. [source: Sep 30 2025 patch notes summary]

### Suzerain Actions (Ongoing)

As Suzerain, the player gains access to four diplomatic actions on the city-state, all costing Influence.

**Bolster Military** -- Cost: 60 Influence (Antiquity; [INFERRED: scales ~2x per age]). Immediately generates one military unit in the city-state territory.

**Promote Growth** -- Cost: unconfirmed exact figure (Game8 shows 15 Influence as sample). Grants +15 Food/turn to the city-state for 5 turns, expanding its border toward nearby resources. [source: Game8]

**Levy Unit** -- Cost: variable, scales by unit type and age. One city-state military unit is permanently transferred to the player army. Unlike Civ VI where levied units returned, Civ VII levied units are permanent acquisitions. [source: Firaxis Dev Diary #6; well-of-souls overview]

**Incorporate** -- see dedicated sub-section below.

### Non-Suzerain Interaction: Incite Raid

Any player can spend Influence on an Independent Power that has **not yet become a city-state** to **Incite Raid** against a chosen neighboring civilization. Cost: 30 Influence. Duration: 1 turn. The Independent Power sends its units toward the targeted civilization for that turn. [source: Game8]

This replaces Civ VI barbarian-manipulation mechanics and allows players to weaponize hostile independents against rivals without first befriending them. A persistently hostile independent can be perpetually incited -- effectively a proxy raider for whoever pays the Influence cost each turn.

### Hostile Independent Powers -- Military Threat

Hostile Independent Powers spawn military units and send them toward nearby player settlements. On higher difficulty settings this poses significant early-game risk, potentially attacking city districts. [source: TheGamer guide]

Players have three options against hostile independents:

1. **Ignore and defend** -- fortify cities and units; the independent continues raiding every few turns.
2. **Befriend** -- run the Befriend project; hostile attacks cease once the attitude shifts. [INFERRED: exact turn when attacks stop not confirmed; likely ceases once some befriend-point threshold is crossed]
3. **Disperse** -- send military units to capture the independent main settlement tile.

### Dispersing an Independent Power

If a player does not want to spend Influence on befriending, they can eliminate an Independent Power by military force via the **Disperse** action.

1. Move military units to the Independent Power main settlement tile.
2. Overcome the settlement defenders in combat.
3. Once the tile is captured, trigger the Disperse action.
4. **Reward:** a one-time yield bonus of **125 yields** in the power focus type (e.g. 125 Gold for an Economic power, 125 Culture for a Cultural power). [source: Fandom WebSearch summary]
5. **Reward:** +25 XP to any adjacent Commander. [source: Fandom WebSearch summary]
6. The Independent Power is permanently removed from the game; its tile becomes unoccupied.

**Diplomatic penalty:** certain leaders (e.g. Tecumseh) apply a relationship penalty when a player disperses an Independent Power. [source: well-of-souls.com] This is the primary cost of the military approach.

Dispersing is strategically correct when: the Influence budget is tight; the power suzerain bonus is unattractive; or the power location would give a rival a dangerous forward position.

### Incorporating a City-State

After becoming Suzerain, a player may choose to **Incorporate** the city-state, converting it into a permanent settlement. This is the highest-investment option and the only way to preserve a position past the age transition.

**Cost and duration:**

| Age | Incorporate Cost (Influence) | Duration (Standard speed) |
|---|---|---|
| Antiquity | 240 | 5-10 turns [source conflict] |
| Exploration | 480 | [INFERRED: scales proportionally] |
| Modern | 720 | [INFERRED: scales proportionally] |

[source-conflict: Game8 cites 5 turns; GameRant cites 10 turns at Standard speed. One may be outdated or from a different patch.]

**On completion:**
- The city-state becomes a **Town** in the player empire.
- The city-state remaining military units are **disbanded** and lost.
- The settlement persists through all future age transitions as a standard player settlement.
- The player retains the territory and any resources attached to it.

**Strategic decision:** incorporation is expensive but permanent. Repeated befriending across three ages costs 3 * BEFRIEND_INITIATE_COST plus ongoing Add Support expenditures, while a single incorporation preserves the position indefinitely. For a well-positioned city-state, incorporate-once is often cheaper than befriend-three-times. [source: GameRant]

Some players prefer not to incorporate and instead bank on high-value suzerain bonuses (free Techs, stacking Combat Strength) only available during the age-based befriend window. Incorporating removes that city-state slot from the suzerain-bonus economy and converts it to a standard settlement slot.

### Age Transition -- Full Reset

This is the sharpest divergence from Civ VI city-state design. At every age transition:

- **All surviving Independent Powers** (both unbefiended independents and non-incorporated city-states) are **removed from the map**. Their tiles become empty. [source: Steam preview discussion; well-of-souls.com]
- A fresh set of Independent Powers is seeded at the start of the new age, positioned on the new age map (which may have expanded to Distant Lands in Exploration).
- All **suzerain bonuses** from the previous age expire. The player suzerainties list is cleared.
- **Incorporated settlements** survive normally as player towns -- they are no longer linked to the independent powers system.

The strategic implication: players must choose each age whether to re-invest Influence to re-establish suzerainties, or whether prior incorporations have already locked in key positions permanently.

Suzerain bonuses from the previous age do NOT carry forward in any form. [INFERRED: no source explicitly confirms bonus carry-forward; universal description of suzerainty reset implies bonus reset]

---

## Formulas

```
// Befriending
BEFRIEND_THRESHOLD = 60  // community-sourced; not Firaxis-confirmed; consistent with ~30-turn project
BEFRIEND_BASE_RATE = 2   // befriend points per turn while project is active
                         // [INFERRED from 60 threshold / 30 turns = 2 pt/turn]

BEFRIEND_INITIATE_COST (Influence):
  Source A (Game8):    85 Influence  // may be Antiquity only or pre-patch
  Source B (GameRant): Antiquity 170 / Exploration 340 / Modern 510
  // Source conflict unresolved; use GameRant values as conservative baseline for age-scaling

// Add Support (repeatable acceleration)
ADD_SUPPORT_COST    = 10-30 Influence depending on age  // GameRant
SUPPORT_BOOST_RATE  = +1 befriend point per turn        // Fandom WebSearch summary

// Incite Raid
INCITE_RAID_COST    = 30 Influence  // Game8
INCITE_DURATION     = 1 turn

// Bolster Military
BOLSTER_MILITARY_COST = 60 Influence (Antiquity)  // Game8
// generates 1 military unit; cost likely scales ~2x/3x per age [INFERRED]

// Disperse (military conquest reward)
DISPERSE_YIELD        = 125 yields of the power focus type  // Fandom WebSearch summary
DISPERSE_COMMANDER_XP = 25 XP to adjacent Commander         // Fandom WebSearch summary

// Incorporate
INCORPORATE_COST (Influence):
  Antiquity   -> 240
  Exploration -> 480
  Modern      -> 720
  // source: GameRant; clean 1x/2x/3x scaling pattern

INCORPORATE_DURATION (Standard speed):
  5 turns [Game8]  vs  10 turns [GameRant]  -- source conflict; verify in-game
```

Where:
- `BEFRIEND_THRESHOLD` = 60 [community-sourced; treat as approximate; may have been rebalanced by Sept 2025 patch]
- `BEFRIEND_BASE_RATE` = 2 points/turn [inferred; consistent with stated ~30-turn project duration]
- `ADD_SUPPORT_COST` = 10-30 Influence per use scaling by age [GameRant]
- Incorporate costs follow a clean 1x/2x/3x pattern (240/480/720) suggesting formula: BASE_INCORPORATE_COST * AGE_MULTIPLIER where BASE = 240 and multiplier = 1/2/3

---

## Interactions

- `systems/diplomacy-influence.md` -- Independent Powers are the primary consumer of the Influence currency. Generating enough Influence to maintain suzerainties while also spending it on inter-civ diplomacy is a core resource management tension.
- `systems/ages.md` -- age transitions are the single most impactful event for this system. Independent Powers reset completely; incorporated city-states survive as towns. Transition timing affects how long players have to decide whether to incorporate.
- `systems/combat.md` -- hostile Independent Powers are a military threat; dispersing requires combat resolution; levied units enter the military pipeline.
- `systems/commanders.md` -- Disperse grants 25 XP to adjacent commanders. Commanders are also used to capture hostile independent settlements.
- `systems/victory-paths.md` -- suzerain bonus types (Militaristic, Cultural, Scientific, Economic) map onto the four victory path categories. Pursuing a specific victory path often means prioritizing same-type city-states.
- `systems/settlements.md` -- incorporation converts a city-state into a Town; the settlement system governs what a newly-incorporated town can do.
- `systems/trade-routes.md` -- as Suzerain, the player can establish trade routes with the city-state; an additional Influence-gated benefit beyond the suzerain bonus.
- `systems/leaders.md` -- certain leader agendas react to this system (e.g. Tecumseh penalizes dispersing Independent Powers; Lakshmibai gets a bonus toward initiating the Incorporate action).

---

## Content flowing through this system

- [`content/independent-powers/`](../content/independent-powers/) -- the named independent power factions (Kumbi Saleh / Soninke, Carantania / Slav, Tilantongo / Mixtec, Etelkoz / Magyar, and 20+ others). Each entry carries: type, default attitude, suzerain bonus pool (age-specific), tile seeding rules, and cultural identity. Full confirmed list not available due to Fandom 403 errors; content agent should fetch https://civilization.fandom.com/wiki/List_of_Independent_Powers_in_Civ7 directly.

---

## VII-specific (how this differs from VI/V)

- **Single unified system, not two separate systems.** Civ VI had Barbarian Camps (purely hostile) and City-States (purely diplomatic, no hostile initial phase). VII merges them: every minor faction starts with an attitude and can shift from hostile to allied, or be militarily removed.
- **Age transition full-reset of all unincorporated city-states.** In Civ VI, city-states persisted through the entire game. In VII, every age transition wipes the slate unless the player incorporated before the transition. City-states become age-scoped diplomatic opportunities rather than permanent map features.
- **Exclusive suzerainty with no mid-age diplomatic contest.** Civ VI had a suzerain competition where players could outspend each other to flip control. In VII, the first player to complete the Befriend project wins suzerainty; there is no diplomatic mechanism to contest it afterward. Only military conquest can flip control.
- **Levy units are permanent acquisitions.** In Civ VI, levied units were temporary and eventually returned to the city-state. In VII, levying permanently transfers the unit to the player army.
- **Influence is a new, dedicated currency.** Civ VI had no Influence resource. Civ VII introduces it as the currency for all Independent Power interactions and much of inter-civ diplomacy. Managing Influence supply vs. demand is the meta-resource challenge of the diplomatic game.
- **Bonus selection from a typed pool, not fixed per city-state.** In Civ VI, each city-state had a single fixed suzerain bonus. In VII, when you become suzerain you choose one bonus from a pool tied to the city-state type; the chosen bonus is removed from the pool.
- **Five or six power types rather than named unique city-states.** Civ VI had ~30 named city-states each with unique identities. Civ VII city-states are still named factions but their mechanical identity derives from a categorical type rather than per-faction unique effects.

---

## UI requirements

- **Leader screen -- Independents and City-States tab:** primary interaction point; lists all discovered Independent Powers and current City-States; shows attitude, befriend progress bar, available actions, and Influence cost of each action. Accessed via heart symbol icon. [source: Game8]
- **Befriend project progress indicator:** visible on the power entry in the Leader screen and by clicking its tile on the map. Shows current befriend points vs. threshold; ideally indicates if a rival is also running a competing project. [INFERRED: competitive pressure implies the player needs to know they are in a race]
- **Suzerain bonus selection screen:** modal that appears immediately after completing the Befriend project. Shows 2-3 bonus options with descriptions categorized by city-state type. One-time choice; cannot be changed after selection.
- **Suzerain actions panel:** clicking a City-State the player is suzerain of shows available actions (Bolster Military, Promote Growth, Levy Unit, Incorporate) with Influence costs and turn-count estimates.
- **Hostile independent threat indicator:** when a hostile Independent Power exists near player settlements, some HUD element warns that military units are incoming. [INFERRED: sources describe attacks as inevitable; implies the game communicates the threat before it arrives]
- **Incorporate progress bar:** visible during the multi-turn incorporation project, showing turns remaining until the city-state becomes a town.
- **Age transition summary -- lost city-states:** the age transition screen displays which city-states are being lost (not incorporated) and which incorporated settlements are being preserved. [INFERRED: consistent with transition screen described in ages.md]
- **Active suzerain bonuses indicator:** persistent HUD element listing currently active suzerain bonuses (type, specific bonus, city-state name). [INFERRED]
- **Notification -- rival befriends first:** when a rival completes a Befriend project on an Independent Power, the player is notified, especially if they had a competing project running on the same power.

---

## Edge cases

- What if two players complete the Befriend project on the same turn? [INFERRED] First player in turn-resolution order wins suzerainty; this is the standard Civ tiebreaker.
- What if the Suzerain player is eliminated mid-age? [INFERRED] The city-state likely reverts to an independent/neutral state and becomes re-befriendable by surviving players. Exact behavior not confirmed.
- What if a hostile Independent Power is incited by Player A against Player B while Player B is mid-Befriend-project on that power? [INFERRED] The incite executes its 1-turn effect; the Befriend project continues independently. Once the power converts to a city-state, incite eligibility ceases.
- What if a player tries to Incorporate a city-state in the final turns of an age? If the age ends before completion, the project likely fails and the Influence cost is lost. [INFERRED: sources confirm non-incorporated city-states are lost at age end; mid-project behavior not confirmed]
- What if a player holds suzerain status on a city-state that another player then militarily conquers? The conqueror can only raze or keep; there is no liberate-and-return-to-original-suzerain option. [source: CivFanatics community analysis]
- What if the same player befriends multiple city-states of the same type in the same age? The bonus pool is depleted with each selection; later suzerainties of the same type offer a smaller pool. [source: Steam bonus-selection discussion; INFERRED as the pool-depletion mechanism]
- What if a City-State is conquered by a non-suzerain player? The conquering player must choose to raze or keep; the original suzerain loses their bonus immediately; no diplomatic recourse exists.
- What if an Independent Power is seeded on a tile that a player border expansion later claims? [INFERRED] Seeding logic likely prevents this via exclusion zones, or triggers a forced early-interaction option when surrounded.
- What if a player has zero Influence and a rival initiates Befriend on a contested city-state? The player cannot counter-invest without Influence, creating a hard resource-starvation scenario. Influence generation must be actively managed.
- What if the suzerainty-lasts-40-turns interpretation is correct? This would mean suzerainty could expire mid-age and the city-state becomes re-befriendable -- a significantly different competitive structure. The 40-turn claim appears to be pre-release material and should be treated as incorrect unless in-game evidence surfaces.

---

## Open questions

- **Exact `BEFRIEND_INITIATE_COST` per age** -- Game8 cites 85 Influence; GameRant cites 170/340/510. Could reflect different patch versions or different aspects of the same project. Needs in-game verification.
- **Exact `BEFRIEND_THRESHOLD` and base generation rate** -- community-sourced as 60 points / 2 pts-per-turn / ~30-turn project at Standard speed. Not confirmed from a Firaxis source.
- **Incorporate duration discrepancy** -- Game8 says 5 turns, GameRant says 10 turns at Standard speed. Needs disambiguation against current patch.
- **When hostile attacks cease during the Befriend project** -- sources confirm attacks eventually stop; the exact befriend-point threshold at which the power shifts attitude is not specified.
- **Whether suzerain bonus selection is strictly one-time per age** -- sources agree the initial pick is binding; whether additional Influence expenditure can unlock a second bonus option is not confirmed.
- **Full confirmed list of Independent Power types** -- early game had 4 types; post-launch patches reportedly added Diplomatic and Expansionist. Confirmation and exact bonuses need verification against current patch state.
- **The 40-turn suzerainty duration claim** -- one pre-release source frames suzerainty as a 40-turn exclusive window; all post-launch sources frame it as lasting the remainder of the age. Needs disambiguation.
- **Full list of named Independent Powers per age** -- Fandom list page returned 403 during research. Only a handful of names confirmed (Kumbi Saleh, Carantania, Tilantongo, Etelkoz). Complete roster with types, attitudes, and per-age availability is unverified.
- **Whether befriend progress bars are visible to competing players** -- strategically important for competitive decision-making; not confirmed from sources.
- **Levied units and age transition** -- if a player levies a unit from a city-state and the city-state then age-resets (not incorporated), the levied unit should survive in the player army. Not explicitly confirmed but follows from the levy-is-permanent rule.

---

## Mapping to hex-empires

**Status tally:** 2 MATCH / 6 CLOSE / 0 DIVERGED / 0 MISSING / 0 EXTRA
**Audit:** [.codex/gdd/audits/independent-powers.md](../audits/independent-powers.md)
**Highest-severity finding:** F-02 — Dedicated independentPowerSystem is wired but behavior depth is still partial (CLOSE, HIGH)
**Convergence status:** Close — 6 numeric/detail adjustment(s) pending

_(Full details in audit file. 8 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

The Fandom wiki pages for Independent_Power_(Civ7), City-State_(Civ7), Suzerain_(Civ7), and List_of_Independent_Powers_in_Civ7 all returned HTTP 403 on direct fetch. All Fandom content was accessed via WebSearch summary excerpts, which provide structured overviews but not full tables or complete bonus lists. This is the primary quality gap in this doc -- the complete named independent powers roster and exhaustive suzerain bonus tables are unverified.

The system has been balance-patched multiple times since launch (February 2025); the September 30, 2025 patch specifically reduced suzerain bonus power. Numeric constants cited here may differ from the latest in-game values and should be treated as approximate baselines requiring in-game verification.

The core mechanic loop -- befriend via Influence, win exclusive suzerainty, choose a bonus from a typed pool, maintain via ongoing Influence actions, decide whether to incorporate before age-end -- is well-attested across at least 8 independent sources and carries medium-to-high confidence despite specific numeric uncertainty.

<!-- END OF TEMPLATE -- do not add sections after this line. -->