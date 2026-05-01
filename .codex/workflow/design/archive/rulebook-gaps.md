# Civ VII Rulebook Completeness Audit — 2026-04-15

## Method

This audit reviews `civ7-rulebook.md` (920 lines, 17 sections) for completeness against Civilization VII (2025 release). Approach: read the rulebook top-to-bottom; compare each section against commonly documented Civ VII mechanics; cross-reference `gap-analysis-v3.md` (code-vs-rulebook deltas) and `civ7-accuracy-plan.md` (implementation roadmap). The question here is narrower: *does the rulebook itself describe Civ VII correctly and completely, independent of engine state?* Where a mechanic is marked "needs research" I could not confirm detail from the existing rulebook or design docs alone and flag it for external verification rather than speculating. Findings are organized by section, then by whole-section gaps (mechanics never mentioned), then ambiguities, then a priority ranking.

---

## Section-by-section review

### Section 1: Turns, Ages, and Game Flow
**Status:** thin

Gaps:
- 1.2 "Completing Legacy Path milestones grants larger age-progress boosts" — no numbers. How much per milestone? Does each of the 3 tiers give the same? Does completing a full path grant an end-of-age golden age?
- 1.2 "Researching future-era techs/civics ahead of schedule accelerates age progress" — future-era is undefined. Is this "next age's techs" or end-of-age future tech? What's the per-tech age-progress value?
- 1.4 Turn Phases omits: simultaneous-turn handling for AI, the Age Transition screen as its own phase, and crisis-event resolution timing.
- No mention of the one-more-turn option after victory, which Civ VII does include.
- No mention of "simultaneous turns" vs "sequential turns" multiplayer distinction (may be out of scope but worth a note).
- Game-over transition from Age Progress = 100% to "Age End" window (players still get ~10 turns of grace? needs research).

### Section 2: Settlements: Towns and Cities
**Status:** thin

Gaps:
- 2.1 Town "Specialist slots: Yes (1 per tile)" — contradicts the widely understood rule that Towns cannot grow into full urban districts. Does a Town actually have specialists, or only rural population? **Ambiguity #1.**
- 2.1 Town→City conversion cost "scales with existing city count" — no formula. (e.g., is it 100 × city_count × age_multiplier?)
- 2.2 "Researching specific Technologies (4 techs across the tree, +1 each)" — which 4 techs? Same question for civics (36 mentioned, but no list).
- 2.3 Town Specialization requires "population 7" — but 3.1's growth table suggests growth slows dramatically; how reachable is pop 7 before end-of-age?
- 2.3 "Religious Site" specialization listed but Pantheon/Religion section does not exist in the rulebook.
- 2.3 Connected Cities — what does "connected" mean? Trade route? Shared borders? Road network? Not defined anywhere.
- 2.4 "Minimum distance from existing settlements (typically 3-4 tiles)" — exact number? Does it differ by age? By civ ability (Rome could build closer, etc.)?
- 2.4 Settlement founding does not cover: starting population, starting buildings (Palace?), initial territory radius (1 ring? 2?).
- 2.4 Missing: what happens if a Settler attempts to settle on an invalid tile (water, existing territory, too close)?
- No mention of settlement name suggestions / renaming / capital status (which settlement is the capital, can it change).

### Section 3: Population and Growth
**Status:** thin

Gaps:
- 3.1 Formula "X = current population minus starting pop" — what is starting pop? 1? Is it the same for cities founded late in the game?
- 3.2 Growth Rate sources list 4 items but leaves out: Granary bonus, Fresh water, civic/tech bonuses. The list is not exhaustive.
- 3.3 "Rural tile" vs "Urban tile" is introduced for the first time without definition. Urban tiles are tiles with a building on them? A district? This is load-bearing for the whole yield system and needs a diagram or explicit rule.
- 3.3 "Specialists amplify adjacency bonuses of buildings in their tile by +50%" — which adjacency? All building adjacency? Only the specialist's building? If a tile has two buildings (a Quarter), does the specialist amplify both?
- 3.4 Quarters: states *what forms a quarter* but not *what a quarter does beyond "boost adjacency"*. No specific numerical bonus (e.g., "+1 to all adjacent adjacency sources"?), no visual rule (is it a new tile type? a flag?), no upper limit (can 3 buildings form a Super-Quarter?).
- 3.4 Quarters: "same Age or Ageless" — what is an Ageless building? Never defined. Wonders? Palace? Walls? Needs an explicit list.
- No population decay mechanic documented (famine? plague? forced pop loss from disaster?).
- No mention of starvation / negative food consequence beyond "growth doesn't happen".

### Section 4: Happiness
**Status:** thin

Gaps:
- 4.3 "Sources of Happiness" lists 7 positive and 6 negative sources but does not specify:
  - Stacking order (does -100% yield from -50 happiness apply before or after specialist penalty?)
  - Whether building happiness maintenance is local or global
  - Whether Fresh Water gives a fixed +X or scales with settlement size
  - Interaction with Celebration bonuses (can you be in Celebration while some settlements are Unhappy?)
- 4.4 War Weariness — what resets it? Peace treaty ends the penalty instantly? Decays over 10 turns?
- 4.5 "Celebration threshold increases with each subsequent Celebration" — no formula, no starting value. "After the 7th" is a cap but 1→7 progression is not given.
- 4.5 "Government-specific bonus lasting 10 turns" — what if government changes mid-celebration? Does the bonus persist or revert?
- 4.5 Table covers 6 governments; the Government section (14) does not list these 6 explicitly so it's unclear whether all governments are enumerated here or just examples.
- Missing: Golden Age / Dark Age from Happiness collapse (mentioned elsewhere but not tied to Happiness thresholds here).

### Section 5: Production
**Status:** thin

Gaps:
- 5.2 Production Overflow — no cap mentioned. Civ VI capped overflow; does Civ VII?
- 5.3 Gold Purchase "~4x the Production cost" — is it exactly 4x or varies by item? What's the formula for Wonders (which are often unpurchasable)?
- 5.3 Does not list which items cannot be purchased (Wonders, Settlers, Commanders?).
- 5.4 Production bonuses stack how? Additive? Multiplicative? (+10% + +10% = +21% or +20%?)
- No mention of: Project-only production (the Science Victory "Trans-Oceanic Flight" project appears in §12 but production rules for projects are absent here).
- No mention of: Production carryover between ages (if you have a half-built Knight when age ends, what happens?).

### Section 6: Combat
**Status:** thin in specific areas, but overall the strongest section

Gaps:
- 6.2 "+4% exponential per strength point" — formula would be `damage = 30 × 1.04^(attackerCS - defenderCS)` — this is implied but should be explicit.
- 6.3 First Strike "+5 CS bonus when the unit is at full HP" — does this apply to the attacker, defender, both? Is it lost after the unit takes any damage, or only on subsequent turns?
- 6.4 Terrain modifiers table is incomplete vs 6.4 prose. The prose says "Wet, Vegetated, Rough, or River tiles end movement" — what is Wet? Marsh? Is there a wetness terrain?
- 6.5 Fortify "can only be performed once; lasts until the unit moves" — what about being attacked while fortified? Is fortification consumed on attack?
- 6.6 Walls: "bonus halved" for previous-age walls — does this apply to walls built this age that are now outdated, or only to walls carried over from a previous age?
- 6.6 Fortified Districts "CS equals the strongest military unit trained by the empire" — does obsolete/disbanded count? Does it auto-update every turn, or snapshot at build time?
- 6.7 Flanking — the exact CS bonus from flanking is not specified. Civ VI had +2 per adjacent ally; Civ VII?
- 6.7 Battlefront: "Attacks from the side or rear gain flanking bonus" — how is front determined in a hex grid? Last-moved direction? Facing state?
- 6.10 Commander system is critically thin:
  - How do commanders gain XP? Proximity to combat? Kills?
  - Level thresholds (how much XP per promotion)?
  - What does each of the 5 trees specifically grant per tier?
  - Stacking rule: "up to 4 additional units" — does this include civilians? Other commanders?
  - What happens to the commander in combat? Does it fight, or retreat behind its units?
  - Fleet Commander (mentioned only under §9.5 Astronomy) — how does it differ from a land Commander?
  - Commander maintenance, death, re-training cost?
  - **needs research** on: specific Commander promotion tree contents.
- 6.9 Healing at "enemy territory 5 HP/turn" — does a unit in enemy territory heal at all if adjacent to an enemy? What about being *inside* an enemy city (post-conquest)?
- Missing: ranged attack rules — can ranged units attack without line of sight? Hills/forests block ranged LoS? Siege can attack walls only, or units too?
- Missing: unit death — does a killed unit just disappear, or does it leave a corpse / bonus for the killer?
- Missing: Great General / Great Admiral equivalents (Civ VII replaces with Commanders, but this should be stated).
- Missing: naval combat specifics (embark/disembark rules, naval-vs-land combat penalty, amphibious assault).
- Missing: air unit rules (rebasing, intercept, air superiority — needs research).

### Section 7: Units
**Status:** thin

Gaps:
- Many units use `~` estimates; these should be replaced with confirmed values.
- Antiquity unique units: only 4 listed ("selected"); Civ VII has ~10 Antiquity civs, each with a unique unit. Full enumeration missing.
- Exploration age: zero unique units listed.
- Modern age: only 5 unique units listed.
- 7.1 footnote cases: Chu-Ko-Nu shown as RS 20 — but no mention of its special "attack twice" ability (if it has one in Civ VII).
- No unit upgrade chart (Warrior → Swordsman → Line Infantry → Infantry Company) — implied but never stated.
- No unit maintenance costs (gold per turn per unit).
- No unit promotion paths for non-Commanders — since only Commanders promote (per 6.10), this should be explicitly stated in §7.
- Missing category: "Civilian" (Settler, Builder, Missionary, Merchant, Explorer) — only Settler is listed.
- Missing: Scout's special ability (improved sight? ruins bonus?).
- Missing: Explorer unit (key for Culture Victory per §12.4, but no stats).
- Missing: Merchant unit (key for Trade Routes per §11, but not in table).
- Missing: Missionary unit (implied by Temple "Missionaries" note, but no stats).

### Section 8: Buildings
**Status:** thin (despite being the longest section)

Gaps:
- 8.1 "Maintenance convention" gives a rule but many table entries don't specify maintenance at all. Reader has to infer from the convention. Explicit per-building maintenance would remove ambiguity.
- No "Ageless" building category explicitly shown (Palace, Walls). Walls are referenced in 6.6 but not in any §8 table.
- Palace is never defined as a building — what yields does it provide? What slots? (§14.3 mentions "Palace: 4 codex slots" but Palace is not in §8.)
- Warehouse buildings "purchasable in Towns" — are they also buildable (not just purchasable) in Cities?
- Adjacency bonuses: table shows "+1 Sci/Resource, Wonder" but does not clarify whether this is per-adjacent-tile (stacking) or flat-if-any-adjacent.
- "Codex slots" — what's a codex slot worth? §14.3 says "bonus Science per turn" — how much per codex? Per slot?
- "Relic slot" (Temple) — not defined in the rulebook. What's a Relic, how obtained, what does it yield?
- "Artifact slot" (Museum) — same issue; artifacts tied to Culture Victory in §12 but never mechanically described.
- Wonders: not a single wonder is listed in §8. Referenced inline ("Build 7 Wonders" in §12.2, "Wonder adjacency" in every building entry) but no definition, no cost, no effect, no per-age wonder list.
- "Walls" mechanics live in §6.6 but wall as a building (Ancient Walls, Medieval Walls, Star Fort, Bastion) is not listed in §8. Wall tech prerequisite, cost?
- Unique buildings per civ are never enumerated (vs §1.1 mentioning civ-unique buildings exist).
- No placement rules — which buildings require river, coast, hill adjacency? "on river" is mentioned for Bath but not for any other building.
- No building-overbuild rule (Civ VII allows building over older buildings for production discount — this is a major mechanic entirely missing).

### Section 9: Technology and Civics
**Status:** thin

Gaps:
- 9.1 "Starting Antiquity techs (pick one)" — is this really pick-one, or do you pick one to start *researching* from the three free options?
- 9.1 Tree Depth — "Deeper techs require researching a number of earlier techs" — vague. How many prereqs? Is it always parent techs or any N from the tree?
- 9.2 cost ranges are very wide (Exploration 200-2000); no per-tech cost table.
- 9.2 Mastery "~80% of base" — exact percentage? Do all masteries cost the same ratio, or varies?
- 9.3 Civic tree structure mirrors tech but no civic-specific differences (e.g., do civics have prereqs like techs? same depth rules?).
- 9.4 Antiquity techs table is incomplete vs real Civ VII tech counts (typically 15+ per age). Exploration and Modern tables are explicitly "selected".
- No civic list at all (only tech lists). This is a major omission — civics drive Policies, Governments, and many Wonders.
- No mention of tech/civic "Legacy Points" boost (hitting a tech mastery might give Legacy Path progress?).
- No tech/civic "boost" mechanic equivalent to Civ VI eureka — are masteries the only alternative or are there also situational discovery boosts?

### Section 10: Research and Science
**Status:** thin

Gaps:
- 10.1 Codex-per-turn rate is not given; only "bonus Science per turn" generically.
- 10.2 Overflow: "excess Science carries over" — is it capped? What if overflow would complete the next tech instantly?
- No mention of Science gained from killing units (Civ VI had this; Civ VII?).
- No mention of Science from Research Collaboration endeavor — §11.3 mentions it yields +12/+6 Science but there's no cross-reference or total-science-from-endeavors summary.
- No mention of Great Scientist / Great Engineer equivalents.
- No tech tree branching rules (can you start a tech in depth 3 if you have only 1 depth-1 and 1 depth-2 tech? or do you need all prerequisites?).

### Section 11: Diplomacy
**Status:** thin

Gaps:
- 11.1 Influence sources lists 7 buildings with per-turn bonuses but no empire-wide base generation source beyond "10 Influence per turn". What is the base source? Palace? Per-settlement?
- 11.2 Relationship Levels — how do relationship points move between levels? Point thresholds? (e.g., 0-50 Neutral, 50-100 Friendly?)
- 11.2 "Hostile" allows Formal War declaration — what about Surprise War at lower relationship levels?
- 11.3 Endeavor Duration: 7 turns for most, 15 for Open Markets — why the difference? Stacking?
- 11.3 "Supported" endeavors give double yields — what makes an endeavor "Supported" vs "Accepted"? Accepting with higher influence? Both parties spending?
- 11.3 Sanctions: "10% Gold per turn" — 10% of what baseline? Of the target's current gold stockpile, or 10% reduction in gold income?
- 11.3 Espionage is listed but marked as simplified in gap-analysis-v3. The rulebook says it exists with specific costs. Needs verification.
- 11.4 War Support: how is War Support gained besides spending 180 Influence? Winning battles? Casus Belli?
- 11.4 Missing: Casus Belli / war justification — does Civ VII have them? (**needs research**)
- 11.5 Conquest penalties are per-turn forever-in-age — is there a way to mitigate (liberate the settlement)?
- 11.6 City-States: only one line ("170 Influence to befriend"). Nothing on: suzerainty, city-state types (militarist, cultural, scientific, etc.), city-state bonuses to suzerain, city-state units, city-state quests, city-state wars.
- Missing: Diplomatic Victory path — mentioned obliquely in §12.4 but no Diplomatic victory condition exists in §12.4 (only Science/Culture/Military/Economic). Is Diplomacy Victory in Civ VII? (**needs research** — likely via Congress / World Council, which is entirely absent.)
- Missing: Trade Routes — mentioned in 2.3 (Trade Outpost specialization) and 5.x indirectly but no rules on how they work, range, yields, merchant unit production, pillaging, protection.

### Section 12: Victory Conditions
**Status:** thin

Gaps:
- 12.1 "Legacy Points spent on Legacies at age transitions" — only this one sentence. Legacy Points economy is the backbone of the game and is not explained: how many per milestone? Per path? Total obtainable per age?
- 12.1 "The player who fully completes a Legacy Path's final condition in the Modern Age first wins" — but 12.4 lists Science/Culture/Military/Economic victories, which are Modern-age-only but separate from legacy paths. Relationship between "Modern-age Legacy Path completion" and "Modern-age victory project chain" is ambiguous. **Ambiguity #2.**
- 12.2-3 Legacy Paths: milestones toward the final condition are not listed. Each path has tier-1, tier-2, tier-3 milestones in Civ VII — only the tier-3 final is given.
- 12.4 Science Victory steps 1-4 are clear. Culture Victory "collect 15 Artifacts via Explorers excavating sites" — Explorer unit is never defined, excavation sites are never defined.
- 12.4 Military Victory: "Manhattan Project → Operation Ivy project" — neither is defined as a buildable/researchable.
- 12.4 Economic Victory: "Railroad Tycoon Points from Factories, Rail Stations, Factory Resources" — per-turn rate not given. Great Banker unit not in §7.
- 12.5 Score Victory — is there a scoring formula? "Most total Legacy Points" is clear, but tie-breakers?
- Missing: Diplomacy Victory (see §11 gap). Major Civ tradition; if absent in Civ VII, the rulebook should state that.
- Missing: One-more-turn option after victory screen.
- Missing: what happens when a rival wins — does the game end immediately, or do losers get a final turn?

### Section 13: Resources
**Status:** thin

Gaps:
- 13.1 Resource categories: 5 types shown, but the distinction between "Bonus" (flat yield to settlement) and "Empire" (passive bonus) is fuzzy. Example: Horses are "Empire" but Cotton is "Bonus" — both are assigned to a settlement. What's the mechanical difference?
- 13.2 Key Resource Effects tables are labeled "examples" — the full list of empire/bonus/city/treasure/factory resources is missing.
- 13.3 "Settlements have limited Resource Slots" — what's the base slot count? Per settlement, or per age?
- 13.4 Age Transitions and Resources: 3 examples given. Is there a full table showing resource type changes across all three ages?
- Missing: resource discovery rules — are strategic resources visible on founding, or require a tech to reveal (Iron needs Bronze Working, etc.)?
- Missing: resource depletion (do resources run out after X uses?).
- Missing: resource trading between civilizations — can you trade a resource in §11 diplomacy actions? If so, how does the slot accounting work?

### Section 14: Governments and Social Policies
**Status:** thin

Gaps:
- 14.1 "At least 3 Government options per Age" — what are they? The 4.5 table lists 6 governments but doesn't tie them to Ages.
- 14.1 "Each Government provides: 1 Policy slot + 2 Celebration bonus options" — are there any other government-differentiating effects? Tax rate? Policy slot type restrictions?
- 14.2 "Base slots: 1 per Age" — and 4.5 says Celebrations add slots. Is the total slot count tracked per age or cumulative?
- 14.2 "Policies can be swapped freely between turns" — is there a cost? Cooldown? Can you swap during war?
- 14.3 Codex System: Codex slot counts given for 3 buildings; per-slot yield not specified ("bonus Science per turn" is vague).
- 14.3 "Codices unlocked through Tech/Civic Masteries" — which masteries unlock codices? Is it one codex per mastery, or specific ones?
- Missing: list of Social Policies. Policies are central to empire customization (dozens exist in Civ VII) — none are named.
- Missing: Ideologies — §12.4 Military Victory requires adopting an Ideology (via Political Theory Civic). Ideologies are never defined in §14. Are they a government subtype? A separate Policy? (**needs research**; likely a Modern-age Government.)

### Section 15: Leader Attributes
**Status:** thin

Gaps:
- 15.x: 4 attribute trees named but no specific attributes/nodes listed. Each tree has multiple tiers in Civ VII — tier names, per-tier bonuses, point costs are missing.
- "Earn points from Legacy Paths and other achievements" — what other achievements?
- "Leaders persist across all three Ages" — are attribute points retained across ages? (Implied yes, but should be explicit.)
- No mention of leader-specific Agendas (Civ VI concept; may or may not be in Civ VII — **needs research**).
- No list of leaders. Civ VII has ~20+ at launch and DLC; none enumerated.

### Section 16: Age Transitions
**Status:** thin

Gaps:
- 16.1 step 5: "Previous civilization's Legacy Bonus becomes a permanent active effect" — every civilization has a defined legacyBonus? Is it the same as the civ's unique ability, or a separate field?
- 16.1 step 8: "Existing buildings/units may become obsolete or auto-upgrade" — criteria not given. Age-gated? Tech-gated? What's the replacement chain?
- 16.1 step 9: "Tech/Civic trees reset" — what happens to in-progress research?
- 16.2 Legacy Costs: "Golden Age Legacies: Expensive" — no numerical cost.
- Missing: Dark Ages — §12.4/civ7-accuracy-plan mention Dark Ages but §16 doesn't. Dark Age triggers, penalties, recovery (**needs research**).
- Missing: Age Transition choice — if a player could pick from multiple next-age civs, how are choices filtered (historical affinity, leader compatibility, attributes, conquest-unlocked)?
- Missing: inventory carryover — do wonders persist? City names? Unit positions?
- Missing: map changes at transition — does the map expand? Does fog reset?

### Section 17: Crises
**Status:** missing-parts (almost entirely absent)

Gaps:
- Only 5 short bullets. No list of crisis types.
- No trigger-condition schema (how is a crisis scheduled per age?).
- No crisis-outcome examples.
- No mention of specific crises: Barbarian Invasion, Plague, Economic Collapse, Religious Schism, Revolts, Climate Disaster, etc. (Civ VII has ~5-7 named crisis types — **needs research** for full list.)
- "Crisis Policies: Sometimes forced policy changes that reduce Happiness" — single sentence, no example.
- "Revolts Crisis" is referenced in §4.2 but its mechanics (what's the trigger, who spawns, what territory is lost) are not defined.
- No mention of Age-End Crises being mandatory (Civ VII gates Age progress at the end with a forced crisis — **needs research**).

---

## Missing sections (not in rulebook at all)

These Civ VII systems have NO dedicated section. Each deserves its own section or a substantial addition to an existing section.

### M1. Districts (as a spatial mechanic)
Quarters are mentioned in §3.4 but Districts as a concept — the urban plot, the rural plot, the distinction between working tiles and city-center tiles — is never introduced. Civ VII has a hex-level district system (smaller-scale than Civ VI's district system but still spatial). The section should cover: Urban District (where buildings are placed), Rural District (where improvements are placed), District placement rules, max buildings per district, Quarter formation in detail, visual representation, and interaction with specialists.

### M2. Religion and Pantheons
§6.9 references "God of Healing Pantheon"; §2.3 references "Religious Site"; §4.3 references "Pantheons and religion"; §8 references "Temple ... Missionaries"; §1 Exploration age is the historical Age of Religion. Yet no section covers: pantheon selection trigger (first to build an Altar?), pantheon bonus list, religion founding (Exploration-age-only? requires Great Prophet?), religion spread mechanics, missionary unit stats, religious combat (theological combat in Civ VI), religious victory (does it exist in VII? **needs research**), religious buildings, religious pressure.

### M3. Commander Detail
§6.10 is thin (see section review). A full section would cover: per-tree promotion list (Bastion, Assault, Logistics, Maneuver, Leadership), XP gain formula, per-level thresholds, aura stack rules, interaction with unique units, Fleet Commander vs land Commander, commander death consequences, commander retirement.

### M4. Independent Powers (City-States) Detail
§11.6 has one line. A full section: types of Independent Powers (Militarist, Cultural, Scientific, etc.), suzerain bonuses, quest system, siege mechanics (can you conquer them?), bonuses for being the first to meet them, interaction with age transitions (do they persist?), their own units and attacks on players.

### M5. Wonders
Mentioned inline everywhere but no dedicated section. Should cover: wonder list per age (Antiquity has ~10, Exploration ~10, Modern ~10), cost table, adjacency/placement restrictions, wonder-specific bonuses, being-first-to-build bonuses, wonder obsolescence, wonder competition (two civs building at once), one-per-game rule.

### M6. Great People / Great Works
Civ VII changes Great People handling significantly — Great Scientist, Great Artist, etc. may not exist as discrete units, but Great Works (Artifacts, Relics, Codices, Great Works of Writing/Art/Music) clearly do (Museum artifact slots §8, Library codex slots §9). Section should cover: how Great Works are earned, Great Work types, slot placement rules, tourism/culture yield, theming bonuses, interaction with Culture Victory (15 Artifacts).

### M7. Map Features and Natural Wonders
Terrain features like Woods, Rainforest, Sage Brush are mentioned in §6.4 but never enumerated. Natural Wonders are mentioned as an adjacency source for Monument/Amphitheatre (§8) but never listed — Civ VII has ~10 Natural Wonders (Everest, Giant's Causeway, etc.) each with unique bonuses. Section should cover: terrain types, feature types, natural wonder list, discovery bonuses, placement rules on map gen, interaction with improvements.

### M8. Independent Unit (Barbarian) Progression
Civ VII replaces Barbarians with Independent Powers (which can be befriended into city-states or wiped out for bonuses). But actual hostile wandering independent units (scouts, raiders) are not addressed. Section should cover: spawn rules, encampment mechanics, unit progression over time (do they stay Warriors forever, or age up?), pillage behavior, conversion to city-state trigger.

### M9. Espionage Detail
§11.3 lists espionage actions with costs, but the system around it — Spy unit? Intrigue? Counterintelligence? Spy cover levels? — is not covered. If Civ VII's espionage is indeed just "spend influence, wait turns" (simplified), the rulebook should state that explicitly. Otherwise **needs research**.

### M10. Disasters and Environment
§17 mentions crises generically, but disasters specifically (floods, volcanic eruptions, storms, climate change, sea level rise) are not mentioned. Civ VI's Gathering Storm DLC introduced many; Civ VII's treatment **needs research**. Section should cover: disaster types, trigger conditions, damage/benefit duality (flooded floodplains → yield bonus), climate change phases in Modern age.

### M11. Trade Routes
Referenced in §2.3 (Trade Outpost), §11 (Open Markets endeavor) but never defined. Section: Merchant unit stats, trade route range, yield per route, max routes per city, pillaging, interaction with roads/rivers, international vs domestic routes.

### M12. Improvements
Farms, Pastures, Plantations, Fishing Boats, Mines, Quarries, Clay Pits, Camps, Woodcutters are all mentioned (§2.3, §8) but never defined in a table. Section: per-improvement cost, builder unit (does Civ VII use Builders or auto-improve?), yield, required tech, required terrain/resource, upgrade chain.

### M13. Roads and Infrastructure
Referenced in §6.4 ("Roads negate difficult-terrain movement stop") but never defined. Civ VII road mechanics (Ancient Road, Medieval Road, Railroad — traders lay roads? builders? age-gated?) are absent.

---

## Ambiguities / contradictions

1. **Town specialists** (§2.1 vs §3.3): Town table says "Specialist slots: Yes (1 per tile)"; §3.3 ties specialists to Urban tiles; Towns are implicitly not fully urbanized. Are Town specialists a thing, or only City specialists?

2. **Legacy Path completion vs Modern Victory project** (§12.1 vs §12.4): §12.1 says "the player who fully completes a Legacy Path's final condition in the Modern Age first wins"; §12.4 describes 4 distinct Modern-age victory projects (Science/Culture/Military/Economic) that look like separate achievement chains, not Legacy Path completions. Which is it? Maybe the Modern Legacy Paths ARE the victory projects — if so, that should be stated.

3. **Specialist effect numbers** (§3.3): "+2 Science, +2 Culture" per specialist; "cost -2 Food and -2 Happiness each"; "amplify adjacency of buildings in their tile by +50%". Does the +50% apply to the tile's building(s) or to building adjacencies computed elsewhere? And is a specialist's +2 Sci/Cult the base (amplifiable) or on top of whatever adjacency?

4. **Warehouse building category** (§8): Description says warehouses are "purchasable in Towns" with "no maintenance". §5.3 says "Items in Towns can ONLY be purchased with Gold". If warehouses can be built in Cities too, do they cost Gold maintenance there? The convention in §8.1 ("Warehouse/Happiness/Gold buildings exempt from one [maintenance]") implies exemption applies only to one of the two maintenance types, but the tables show warehouse buildings as having no maintenance at all.

5. **First Strike** (§6.3): "+5 CS bonus when the unit is at full (100) HP." Does this apply to both attacker and defender when both are at full HP? If so, they cancel. Probably attacker-only, but not stated.

6. **Walls in previous age** (§6.6): "Walls from a previous age have their bonus halved." Does this mean the age in which the wall was built, or the age that introduced that wall's tier? Antiquity Walls built in Antiquity — are they still full strength in Antiquity and halved in Exploration?

7. **Flanking requires "2+ friendly units" or "2+ friendly units including attacker"?** (§6.7): Ambiguous phrasing — does the attacker count toward the 2?

8. **Age progress boost from milestones** (§1.2 vs §12.1): §1.2 says milestones grant "larger age-progress boosts"; §12.1 says Legacy Points are what's earned. Are milestones granting BOTH age progress AND Legacy Points, or are they separate?

9. **Celebration threshold scaling with speed and count** (§4.5): "Celebration thresholds increase with each subsequent Celebration. After the 7th Celebration the threshold stops increasing. Thresholds scale with game speed." Two scaling axes (count × speed) — are they multiplicative?

10. **Settlement cap from overage penalty** (§2.2): "Maximum penalty: -35 Happiness (capped at 7 settlements over the limit)." Gap-analysis-v3 flagged a code bug where this is applied differently than intended. The rulebook says "-5 per settlement per overage" which for 7 overages × many settlements would be far worse than -35. The cap "at 7 settlements over" should be restated as "multiplier caps at 7" not "total penalty caps at 35" (or vice versa).

11. **Influence scaling by age** (§11.3): "Base costs are multiplied by the current Age number (x1, x2, x3)." Applied to ALL diplomatic actions in §11.3, or just some? The endeavors table gives flat numbers that presumably are already at-age base.

12. **Crises and revolts** (§4.2 vs §17): §4.2 says revolts happen "during a Revolts Crisis"; §17 describes crises generically. Are revolts a specific named Crisis, or a consequence of any Happiness-related crisis? If specific, what triggers it?

---

## Top-10 priority gaps for gameplay parity

Ranked by impact on *feeling like Civ VII*. Complexity estimates: S = 1-2 day design + engine work, M = 3-7 days, L = 2+ weeks.

### 1. Wonders (full section) — Complexity: L
**What's missing:** Entire wonder catalog (30+ wonders across 3 ages), placement rules, cost/benefit, one-per-game enforcement, obsolescence.
**Why it matters:** Wonders are the signature Civ bragging-rights mechanic. Every age has milestone wonders that shape player strategy. "Build 7 Wonders" is the Antiquity Cultural Legacy Path (§12.2). Without wonders there's no Cultural victory identity.

### 2. Legacy Points economy + milestone tiers — Complexity: M
**What's missing:** How many points per milestone, per path, per age; what each Legacy Point can purchase at transition; Golden/Dark Age thresholds.
**Why it matters:** Legacy Points are the *explicit* reward-loop between ages — the thing that makes each age feel like it matters to the next. §12 only names the final tier-3 milestone per path. Without the full ladder the game has no mid-game strategic goals.

### 3. Civic list + Government list + Ideology — Complexity: M
**What's missing:** Concrete civic list per age (the rulebook has tech lists but zero civic lists); governments per age and their non-celebration effects; Ideology system for Modern.
**Why it matters:** Civics drive Policies, which drive empire customization. Governments gate Celebration bonus choices. Ideology is a Military-Victory gate. All three are central loops. §14 is the thinnest high-impact section.

### 4. Commander full spec (promotion trees, XP, auras) — Complexity: M
**What's missing:** 5 trees × 3-4 tiers each of specific promotion effects; XP formula; aura stacking; fleet-vs-land distinction.
**Why it matters:** Commanders are Civ VII's biggest combat-loop departure. §6.10 gives only tree names. Building an AI that uses commanders, or a UI that shows promotion choices, requires the full tree data.

### 5. Districts + Quarters spatial rules — Complexity: L
**What's missing:** Urban/Rural district distinction, placement rules on hex, building-per-tile limits, Quarter bonus specifics, Specialist × Quarter interaction.
**Why it matters:** Tile placement is what turns the game from "list of buildings" into "map puzzle". gap-analysis-v3 marks this as intentionally simplified; if parity is the goal, this must un-simplify. Affects adjacency, specialists, city planning UX.

### 6. Religion & Pantheons — Complexity: L
**What's missing:** Pantheon selection trigger + full list; religion founding; missionaries; religious spread; interaction with Exploration age; Religious Site specialization.
**Why it matters:** Exploration Age thematically centers on religion. §2.3 Religious Site specialization and §8 Temple references are dead ends without this system. Currently simplified per gap-analysis; parity requires re-adding.

### 7. Great Works (Artifacts, Relics, Codices) — Complexity: M
**What's missing:** How each is earned, slot placement rules, theming bonuses, Culture Victory artifact mechanic (15 Artifacts via Explorers), tourism equivalent.
**Why it matters:** Blocks Culture Victory (§12.4 step 1), blocks Codex/Relic/Artifact slot building effects (§8), blocks Cultural Legacy Paths (§12.2 Codices, §12.3 Relics).

### 8. Trade Routes + Merchant unit — Complexity: M
**What's missing:** Merchant unit stats, route range, yield per route, max routes, protection/pillaging rules.
**Why it matters:** §2.3 Trade Outpost and §11.3 Open Markets endeavor both assume a trade-route system exists. Railroad Tycoon Points for Economic Victory depend on infrastructure routes. Currently unimplemented entirely.

### 9. Natural Wonders + full terrain feature list — Complexity: S
**What's missing:** Named list of ~10 Natural Wonders with per-wonder bonuses; full terrain feature enumeration (Woods, Rainforest, Sage Brush, Floodplains, Oasis, Reef, etc.); placement rules.
**Why it matters:** Adjacency bonuses (§8 Monument/Amphitheatre reference "Natural Wonder" adjacency) are currently dangling references. Map generation needs the full feature set to feel varied. Low-complexity because these are almost entirely data files.

### 10. Crisis system detail (age-end mandatory crisis + named crisis types) — Complexity: M
**What's missing:** Enumerated crisis types (Revolts, Plague, Invasion, Schism, etc.), trigger conditions per age, age-end mandatory crisis rule (Civ VII gates age completion behind a crisis event), crisis-policy effect list.
**Why it matters:** §17 is 5 bullets. Crises are a defining Civ VII pacing mechanic — they enforce mid-late-age drama. Without them the end of each age feels like a whimper, not a bang.

---

## Sources consulted

- `.codex/workflow/design/civ7-rulebook.md` (full read, 920 lines)
- `.codex/workflow/design/civ7-accuracy-plan.md` (full read, 127 lines)
- `.codex/workflow/design/gap-analysis-v3.md` (full read, 96 lines)
- `.codex/workflow/design/gap-analysis-v2.md` (skim, cross-reference)
- `.codex/workflow/design/gap-analysis.md` (skim)
- `.codex/workflow/design/ai-overhaul.md` (skim for context)
- `.codex/workflow/design/phase1-terrain-map.md` (skim for context)
- `.codex/workflow/design/review-iteration-1.md` (skim)
- `.codex/workflow/design/selection-system.md` (skim)
- `.codex/workflow/design/ux-review.md` (skim)
- Task list #24-#30 (Civ7 parity roadmap items)
- `CLAUDE.md` (project rules + engine architecture)

Items marked **needs research** were not resolvable from the above and require external Civ VII source verification (wiki, dev diaries, game files) before being promoted to concrete rulebook additions. Specifically: full Commander promotion trees, Ideology system details, Casus Belli mechanics, religious victory existence, specific disaster types, age-end crisis rules, one-more-turn option, barbarian/independent unit progression, Dark Age triggers, and leader Agendas.
