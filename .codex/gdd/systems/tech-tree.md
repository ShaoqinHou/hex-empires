# Tech Tree - Civ VII

**Slug:** `tech-tree`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

Every factual claim in the sections below MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://game8.co/games/Civ-7/archives/494919 - Game8: Civ 7 Technologies and Tech Tree
- https://game8.co/games/Civ-7/archives/498554 - Game8: Civ 7 How to Get Codices
- https://game8.co/games/Civ-7/archives/498533 - Game8: Civ 7 Science Victory Guide
- https://game8.co/games/Civ-7/archives/500538 - Game8: Civ 7 Best Tech Research Order
- https://gamerant.com/civilization-vii-increase-science-guide-get-more-science-civ-7-yield/ - GameRant: How to Increase Science
- https://gamerant.com/civilization-vii-civ-7-technologies-tech-trees/ - GameRant: All Techs and Tech Trees
- https://civ7.wiki.fextralife.com/Technologies - Fextralife: Technologies overview
- https://civ7.wiki.fextralife.com/Science+Victory - Fextralife: Science Victory
- https://civ7.wiki.fextralife.com/Future+Tech+-+Antiquity+Technology - Fextralife: Future Tech (Antiquity)
- https://screenrant.com/civ-7-how-to-increase-science/ - Screen Rant: How to Increase Science
- https://screenrant.com/how-to-complete-all-legacy-paths-in-civ-7s-antiquity-age/ - Screen Rant: Antiquity Legacy Paths
- https://www.thegamer.com/civilization-7-vii-science-victory-tips-tricks/ - The Gamer: Science Victory Guide
- https://forums.civfanatics.com/threads/what-happens-if-you-dont-claim-all-tech-when-entering-a-new-age.694203/ - CivFanatics: Unclaimed tech at transition
- https://steamcommunity.com/app/1295660/discussions/0/600774572594226157/ - Steam: Partially-researched technology
- https://civilization.2k.com/civ-vii/game-guide/dev-diary/ages/ - Firaxis Dev Diary #1: Ages
- https://well-of-souls.com/civ/civ7_trees.html - Well of Souls: Civ 7 Trees analyst

**Source conflicts noted:**

- Mastery cost vs base tech: Game8 states Masteries cost the same Science as the base technology; a search aggregate stated ~80% of base cost. `[source-conflict]` flagged in Formulas section.
- Exact tech count per age: Fextralife and Game8 list 15-16 per age (excluding repeatable Future Tech); counts vary by 1-2 due to DLC/patch additions.
- Mid-research progress at transition: one community post says unresearched techs are granted for free; another says they are simply lost. `[source-conflict]` flagged in Edge Cases.

---

## Purpose

Each age in Civ VII has its own standalone technology tree, replacing the cumulative single-tree approach used in Civ V and Civ VI. The tech tree converts the empire’s accumulated Science yield into unlocked buildings, units, improvements, and special abilities — all thematically bound to that age’s historical focus. By resetting the tree at each age transition, Firaxis prevents runaway science leaders from making mid- and late-game competition irrelevant: every player enters each new age on roughly equal technological footing, with only a narrow advantage possible from researching Future Tech before the transition fires.

---

## Entities

- `PlayerState.researchProgress` — (RW) — accumulated science toward the currently-queued technology; resets to 0 on age transition
- `PlayerState.researchQueue` — (RW) — current technology being researched (one at a time); clears on age transition
- `PlayerState.completedTechs` — (RW) — set of researched technology IDs for the current age; clears on age transition
- `PlayerState.completedMasteries` — (RW) — set of completed mastery IDs for the current age; clears on age transition
- `PlayerState.codices` — (RW) — collection of earned Codex great works, each slotted into a building for a science yield bonus
- `PlayerState.codexSlots` — (R) — total available Codex display slots across all buildings
- `CityState.buildings` — (R) — source of codex slots and science yield; science buildings (Library, Academy, Observatory, University, Schoolhouse, Laboratory) provide base science and adjacency bonuses
- `CityState.specialists` — (R) — specialists assigned to Urban Quarters contribute science yield and adjacency bonuses
- `GameState.currentAge` — (R) — determines which tech tree is active; tech trees are not shared across ages
- `GameState.config.technologies` — (R) — registry of technology definitions for the active age, including prerequisites, costs, and unlock effects

---

## Triggers

- On **END_TURN** (every turn, all players) — each player’s Science yield is accumulated into `researchProgress` for their currently-queued technology. When `researchProgress >= tech.cost`, the technology completes: unlocks are applied, the mastery becomes available, `completedTechs` is updated, and `researchProgress` resets to 0.
- On action **SELECT_TECH** — player (or AI) picks the next technology to research. Switches `researchQueue`. Already-accumulated science progress on the previous tech is retained; the player can switch back later and resume.
- On action **SELECT_MASTERY** — player explicitly queues a Mastery after its parent tech has been researched. Masteries are a second-pass research job using the same science accumulation loop.
- On action **RESEARCH_FUTURE_TECH** — player queues Future Tech after satisfying its prerequisites (Mathematics + Iron Working in Antiquity; analogous end-tree techs in other ages). Effects fire on completion: +1 Wildcard Attribute Point, +10 Age Progress, boost to one starting technology in the next age.
- On **age transition (before new age begins)** — `researchProgress` is discarded, `researchQueue` is cleared, `completedTechs` and `completedMasteries` are cleared, and the active tech tree is replaced with the new age’s tree. Codices persist if slotted in buildings with available slots.

---

## Mechanics

### Per-age tech trees (Antiquity / Exploration / Modern)

Each of the three ages has its own self-contained technology tree. The trees are NOT cumulative — Exploration does not build on Antiquity’s research. The Antiquity tree focuses on foundational and ancient-era themes (agriculture, writing, bronze, iron); the Exploration tree on maritime, mercantile, and early-gunpowder themes (cartography, metallurgy, gunpowder); the Modern tree on industrial and technological themes (steam, electricity, aerodynamics, rocketry).

Technology counts per age (from Fextralife and Game8 — note these may shift with patches and DLC):
- **Antiquity**: ~15 named technologies + Future Tech (repeatable)
- **Exploration**: ~15 named technologies + Future Tech (repeatable)
- **Modern**: ~16 named technologies + Future Tech (repeatable)

Named Antiquity technologies (confirmed from Game8 / Fextralife):
Agriculture, Sailing, Pottery, Animal Husbandry, Writing, Irrigation, Masonry, Currency, Bronze Working, The Wheel, Navigation, Engineering, Military Training, Mathematics, Iron Working.

Named Exploration technologies (confirmed from Game8 / Fextralife):
Machinery, Astronomy, Cartography, Castles, Heraldry, Feudalism, Guilds, Metallurgy, Shipbuilding, Education, Metal Casting, Architecture, Gunpowder, Urban Planning.

Named Modern technologies (confirmed from Game8 / Fextralife):
Academics, Steam Engine, Military Science, Electricity, Urbanization, Combustion, Industrialization, Radio, Flight, Mass Production, Mobilization, Armor, Aerodynamics, Rocketry.

[INFERRED]: The lists above reflect post-launch versions. DLC additions may extend each age’s tree.

### Science accumulation

Science is a per-empire yield generated each turn and applied toward the currently-queued technology. Sources:

- **Science buildings** — the primary source, especially in the early- to mid-game. Each age has two tiers:
  - Antiquity: Library (+2 base Science, +1 per adjacent Resource or Wonder); Academy (+4 base Science, +1 per adjacent Resource or Wonder)
  - Exploration: Observatory (+4 Science, +1 per adjacent Resource or Wonder); University (+5 base Science, +1 per adjacent Resources, Wonders, and Quarters)
  - Modern: Schoolhouse (+5 Science, +1 per adjacent Resource or Wonder); Laboratory (+6 Science, +1 per adjacent Resource, Wonder, or Quarter)
  - Placing two science buildings on the same tile creates an **Urban Quarter**, unlocking specialist placement and adjacency bonuses.
- **Tile yields** — tiles with a blue Flask icon generate Science when worked by a city’s population.
- **Specialists** — assigned to Urban Quarters (Districts), specialists contribute science yield directly and grant a +0.5 adjacency yield bonus to surrounding tiles. In the late Exploration and Modern ages, specialists provide up to 70–80% of total science before multipliers. Each specialist costs 2 Food and 2 Happiness per turn.
- **Codices** — displayed Codices grant bonus Science per turn. The exact per-codex value is unconfirmed in sources; the legacy milestone at 6 Codices unlocks “+1 Science for every Codex in the Age of Exploration” as a carry-forward, implying a flat yield per displayed codex in the current age. `[source-conflict, value unclear]`
- **Resources** — Incense grants +10% Science when slotted in cities (Antiquity); Tea provides +3% Science (Modern, requires a Factory).
- **Leader attributes** — e.g., Confucius +2 Science per Specialist; Ben Franklin +1 Science per Age per Endeavor; Himiko +4 Science per Age per Friendly/Helpful leader.
- **Policies** — e.g., Literature: 50% Production toward Science buildings; Scholars: +1 Science on Specialists; Social Science: +2 Science on Specialists; Preservation Societies: +3 Science from Great Works.
- **Research Collaborations** — a diplomatic endeavor; both parties gain 50% more Science for the duration of the deal.
- **Wonders** — some wonders grant Science directly (e.g., Serpent Mound: +3 Science in Exploration Age).

### Tech prerequisites and branching

Technologies have explicit prerequisite chains: you must have researched certain prior technologies before a new one becomes available. Some technologies require two prerequisites. The tree branches into thematic sub-paths. For example, in Antiquity:
- Agriculture starts the food/growth branch (-> Irrigation -> Bronze Working / The Wheel)
- Pottery and Animal Husbandry are optional early starting choices alongside Sailing
- Writing and Masonry are mid-tree targets unlocking foundational buildings (Library, Monument)
- Mathematics and Iron Working are the two prerequisites for Future Tech

The exact shape of the full prerequisite graph is not published in a single canonical source. Community analysis shows the trees have roughly 3–4 depth tiers from starting nodes to Future Tech. There is no confirmed cap on how many techs can be researched before the age ends.

### Mastery mechanic

After a technology is fully researched, a **Mastery** for that technology becomes available. Masteries are an optional second-pass investment of Science — the same queue, same accumulation loop — that unlocks additional bonuses beyond what the base tech provides.

Key properties of Masteries:
- **Optional** — Masteries are never prerequisites for other base technologies or other Masteries. Skipping a Mastery never gates future tech progression.
- **Thematic bonuses** — bonuses deepen the tech’s theme. Examples: Writing Mastery grants +1 Science on all Science buildings, one Codex, and unlocks the “Steal Technology” espionage Advancement. Navigation Mastery grants +3 Combat Strength for Naval Units and one Codex. Mathematics Mastery grants two Codices (the only double-codex mastery confirmed in sources).
- **Cost** — sources conflict: Game8 states Masteries cost the same Science as the base technology; a search aggregate estimated ~80% of base cost. `[source-conflict]` — implement as same-as-base and re-verify from in-game data.
- **Codex output** — most Masteries award one Codex; Mathematics Mastery awards two. Codices are the primary source for the science legacy path.
- **Advancement unlocks** — some Masteries unlock Espionage Advancements. Writing Mastery unlocks “Steal Technology,” which takes 9–15 turns depending on game speed, costs Influence per turn, and is affected by counter-espionage.
- **Other bonuses** — some Masteries provide niche production bonuses to specific building types, improvements, or (in rare cases) +1 Settlement capacity.

Because Masteries are optional and situational, the strategic decision each age is: does the Mastery bonus outperform the opportunity cost of researching the next base tech instead?

### Codex system

Codexes are a type of Great Work unique to the science domain. Earned primarily through Tech Masteries, they function as a science yield bonus when displayed in buildings with Codex slots.

Codex slots per building (Antiquity Age, confirmed):
- Palace: 1 slot (starting, always available)
- Library: 2 slots
- Academy: 3 slots
- Nalanda Wonder: 2 slots (also grants 1 Codex on completion)

How Codices are obtained (Antiquity Age, confirmed aggregate):
- Tech Masteries: up to 7 total codices (Writing M x1, Currency M x1, The Wheel M x1, Navigation M x1, Engineering M x1, Mathematics M x2)
- Literacy Civic (Civics tree): 1 Codex
- Nalanda Wonder: 1 Codex on completion
- Narrative events: 1–3 Codices depending on choices
- City-state suzerainty (scientific city-state): 1 Codex

Codices must be **displayed** (slotted into a building with available slots) to grant their Science-per-turn bonus. Unslotted Codices do not contribute yields. Codices can be **lost** if a building providing their display slot is pillaged or destroyed by a natural disaster, or if there are insufficient slots at the time of earning.

The science legacy path in Antiquity requires displaying 10 Codices. Intermediary milestones:
- 3 Codices displayed: +1 Legacy Point
- 6 Codices displayed: +1 Legacy Point; unlocks “+1 Science per displayed Codex in the Age of Exploration” carry-forward bonus
- 10 Codices displayed: +1 Legacy Point; Academies retain adjacency bonuses into the Exploration Age (the “Great Library” Golden Age legacy)

### Future Tech

Future Tech is the terminal technology in each age’s tree. Prerequisites:
- Antiquity Future Tech: requires Mathematics AND Iron Working (confirmed, Fextralife)
- Exploration and Modern Future Tech prerequisites: `[INFERRED]` analogous end-tree pair per age

Effects on completion:
- **+10 Age Progress** — advances the current age-end countdown by 10
- **+1 Wildcard Attribute Point** — a free point toward the leader attribute tree
- **Boost for a starting tech in the next age** — the player enters the next age with a head start on one first-tier technology in that age’s tree (boost magnitude not confirmed numerically; see Open Questions)

Future Tech is **repeatable within an age**. Each completion applies the full effect (+10 Age Progress, +1 Wildcard Attribute Point, +1 next-age boost). This creates a genuine trade-off: researching Future Tech multiple times can rush the age transition, potentially catching opponents unprepared.

### Age transition: tech tree wipe

When the age transition fires:
1. `researchProgress` is discarded regardless of how close the player was to completing a tech.
2. `researchQueue` is cleared.
3. `completedTechs` and `completedMasteries` from the previous age are retired. Carry-forward exceptions:
   - Traditions (social policies from civic research) remain available as reusable options.
   - Buildings and improvements marked Ageless persist.
   - Legacy bonuses activated at the transition take effect (e.g., Academies keep adjacency bonuses).
4. The new age’s tech tree becomes active. All players begin each new age with no tech researched in that age’s tree.
5. Codices persist if currently slotted in buildings with available slots; the science bonus from displayed Codices continues.

Uncompleted technologies from the previous age are simply gone. There is no automatic grant of missed techs at transition. `[source-conflict: one community post claims missed techs are granted for free; the more widely-cited reading across multiple sources is that they are lost. The free-grant claim is not supported by Firaxis or well-sourced guides.]`

---

## Formulas

```
// Science accumulation toward currently-queued tech
researchProgress(t+1) = researchProgress(t) + scienceYieldPerTurn(player)

// Tech completion condition
techCompleted = researchProgress >= tech.scienceCost

// Science yield per turn (simplified model)
sciencePerTurn = sum(buildingScience) + sum(tileScience) + sum(specialistScience)
              + sum(codexBonusScience) + resourceMultiplier + policyMultiplier

// Mastery cost [DISPUTED - two source readings]
//   Reading A (Game8): masteryCost = tech.scienceCost
//   Reading B (search aggregate): masteryCost = tech.scienceCost * 0.80
// Use Reading A as the default; re-verify from in-game data.

// Future Tech: repeatable per-age terminal
futureTechEffect = { +10 ageProgress, +1 wildcardAttributePoint, +1 nextAgeStartingTechBoost }
// Can be researched multiple times in same age; each completion re-applies all three effects.

// Codex legacy carry-forward (at 6 Codices displayed, Antiquity science path)
codexCarryForwardBonus = +1 sciencePerTurn per displayed Codex (active in Exploration Age)
```

Where:
- `tech.scienceCost` = cost in Science points; specific per-tech values not published in sources `[INFERRED: costs scale with tree depth/tier, consistent with Civ series convention]`
- `buildingScience` = base Science + adjacency bonuses: Library 2 base; Academy 4 base; Observatory 4 base; University 5 base; Schoolhouse 5 base; Laboratory 6 base; adjacency +1 per adjacent Resource/Wonder (University/Laboratory also +1 per adjacent Quarter)
- `specialistScience` = base specialist contribution (typically 2–3 Science per specialist, grows with tile base yields) + 0.5 adjacency bonus per surrounding tile
- `codexBonusScience` = per-codex bonus value per turn when displayed `[not confirmed numerically; see Open Questions]`
- `resourceMultiplier` = percentage bonus from resources (Incense +10%; Tea +3%)
- `policyMultiplier` = sum of percentage bonuses from active social policies
- `ageProgress` = age-end counter; see `systems/ages.md` for full formula

No numeric formula for per-tier tech cost scaling is available from sources. `[INFERRED: later-tier techs cost more Science, consistent with series convention.]`

---

## Interactions

- `systems/ages.md` — age transition fires the tech tree wipe; Future Tech’s +10 Age Progress feeds directly into the `ageEndProgress` formula in ages.md.
- `systems/civic-tree.md` — the Civic tree runs in parallel, using Culture instead of Science but sharing the same per-turn accumulation and Mastery structure. The Literacy Civic grants a Codex; some Tech Masteries unlock Advancements that interact with diplomacy.
- `systems/legacy-paths.md` — the Science legacy path (Antiquity: 10 Codices; Exploration: five 40-yield tiles; Modern: three space race projects) is tracked by Codex output and tech unlocks from this system.
- `systems/buildings-wonders.md` — science buildings are unlocked by technologies and host Codex slots. Wonders (Nalanda, Great Library) provide Codex slots and/or Codices directly.
- `systems/diplomacy-influence.md` — Research Collaborations grant both parties +50% Science. The “Steal Technology” espionage Advancement (Writing Mastery) costs Influence per turn.
- `systems/government-policies.md` — social policies (Literature, Scholars, Social Science) multiply science input to the tech tree.
- `systems/victory-paths.md` — the Science victory path requires tech tree milestones per age; Rocketry tech directly unlocks the Modern age satellite launch project needed for Science Victory.
- `systems/narrative-events.md` — some narrative events award Codices, supplementing the Mastery-sourced Codex pipeline.

---

## Content flowing through this system

- [`content/technologies/antiquity/`](../content/technologies/antiquity/) — ~15 Antiquity technologies + Future Tech
- [`content/technologies/exploration/`](../content/technologies/exploration/) — ~15 Exploration technologies + Future Tech
- [`content/technologies/modern/`](../content/technologies/modern/) — ~16 Modern technologies + Future Tech

Each technology entry (detail level 4) records: ID, age, prerequisites, science cost, base unlock (buildings/units), mastery bonus, mastery codex count, and any Advancement unlock.

---

## VII-specific (how this differs from VI/V)

- **Three separate trees, not one cumulative tree.** Civ VI and V used a single tech tree spanning the full game; science snowballing determined final-era dominance. VII’s per-age trees cap how far ahead a science leader can get; the lead resets at each transition.
- **Mastery mechanic replaces the pure linear unlock.** Civ VI’s Eureka system cut research cost by ~50% on meeting a one-time condition. VII’s Mastery is a second full-cost research pass unlocking a different set of bonuses. Masteries are never prerequisites, making them a strategic optional spend.
- **No Eurekas / Inspirations.** Civ VI’s mechanic of halving a specific tech’s remaining cost via an in-game action has no confirmed equivalent in Civ VII. Research shortcuts exist via Research Collaborations (+50% Science for both parties) and Future Tech next-age boosts, but no single-tech 50%-off boost was found in any source. `[LLM-KNOWLEDGE-ONLY — absence of Eurekas in all reviewed Civ VII sources strongly implies removal, but no Firaxis statement was found explicitly confirming this.]`
- **Codex as Great Work tied to the tech tree.** Civ VI Great Works belonged to the Culture system. Civ VII’s Codices are a Tech-Mastery byproduct that directly feeds the Science legacy path — linking tech research, Great Works, and legacy systems into one loop.
- **Future Tech actively races the age transition.** In Civ VI, Future Tech was a post-tree filler with minor incremental bonuses. In VII, each Future Tech completion pushes +10 Age Progress, making it a tool to rush the age end and catch opponents unprepared.
- **Tech tree wipe on every transition.** Civ V and VI: tech progress was always cumulative, never wiped. VII’s per-age wipe is a fundamental structural break from series convention.
- **Research Collaboration as a formal diplomatic system.** Civ VI had research agreements providing a flat one-time bonus. VII’s Research Collaboration is a continuous +50% science yield for both parties for the deal’s duration.

---

## UI requirements

- **Tech Tree panel** — full-screen or large overlay showing the active age’s tech tree as a directed acyclic graph. Nodes show: tech name, icon, science cost, current research progress (fill bar), unlock summary (building/unit icons), and whether a Mastery is available or completed. Prerequisite edges are drawn as lines between nodes. Researched techs are highlighted; locked techs are grayed; the currently-queued tech shows animated fill progress. Keyboard shortcut: T `[INFERRED from Civ VI convention]`.
- **Science yield HUD** — per-turn Science shown in the top resource bar. Clicking it opens an expanded breakdown of all Science sources (buildings, tiles, specialists, codices, modifiers).
- **Mastery sub-panel** — after a tech is researched, its Mastery tier appears within the same tech node (or as a distinct node directly beneath it). Player queues Mastery exactly like a base tech.
- **Codex / Great Works screen** — shows all earned Codices, which buildings they are slotted in, which slots are empty, and the total Science bonus from displayed Codices. Accessible from the tech panel or a dedicated Great Works button.
- **Future Tech notification** — HUD notification when Future Tech becomes researchable (prerequisites met). On completion: brief toast showing “+10 Age Progress” and “+1 Wildcard Attribute Point”.
- **Age-transition tech summary** — during the age-transition modal, a screen shows which technologies (and Masteries) were researched this age vs. missed, and confirms the next-age boost tech granted by Future Tech (if earned).
- **Research Collaboration indicator** — when a Research Collaboration deal is active, a small “+50% Science” badge appears on the Science yield HUD element.

---

## Edge cases

- What if the player’s currently-queued tech would complete the same turn the age transition fires? `[INFERRED]` Transition takes priority and the science progress is lost. Safest implementation: transition fires first (per ages.md trigger order), tech completion event is discarded.
- What if the player has earned a Codex but has zero available codex slots? Codex is lost per confirmed source rule. Implementation should warn the player when codex slots are full before a Mastery that would award a Codex completes.
- What if a building providing Codex slots is pillaged mid-age? Codices displayed in that building are lost. The displayed-Codex count drops, which may drop the player below a legacy-path milestone threshold — though legacy points already awarded are not retroactively removed. `[INFERRED]`
- What if the player researches Future Tech multiple times before the age ends? Each completion applies the full effect. Sources confirm it is repeatable with no stated cap. Whether multiple boosts apply to the same starting tech in the next age is unconfirmed. `[INFERRED: likely only one boost tech is applicable per transition]`
- What if a player is eliminated mid-age? Research state is irrelevant; player object is removed. No special tech handling needed.
- What if a Mastery and a base tech would complete on the same turn? `[INFERRED]` Queue processes one item per turn; second item held until next turn’s science accumulation cycle.
- What if two players both research the same tech? Both receive the tech independently; there is no tech exclusivity in VII. `[INFERRED — confirmed by absence of any first-to-research exclusivity mechanic in sources]`
- What if a player has very low science yield? Science accumulation simply takes more turns; no time-based tech lock-out. Low-science players may simply fail to complete many techs before the age ends. `[INFERRED]`
- What if a new civ picked at age transition has unique units/buildings requiring a tech that does not exist in the previous age’s tree? `[INFERRED]` Not a conflict: new-age civs are designed against the new age’s tech tree. Cross-age prerequisite conflicts should not arise by design.
- What if a Codex earned via narrative event fires when there are no available slots? Lost per the stated loss condition. No auto-slot or inventory-hold mechanic is confirmed.

---

## Open questions

- **Per-codex science bonus value** — all sources confirm codices grant Science per turn when displayed, but no source gives the numeric value. Checked Game8, Fextralife, GameRant, The Gamer — all state the effect without quantifying it. Re-verify from in-game tooltips or data files.
- **Mastery cost: same as base or 80%?** — Game8 states same-as-base; a search aggregate gave ~80%. Neither links to a primary in-game value. Re-verify.
- **Exact science costs per technology** — no source publishes a per-tech cost table. `[INFERRED: costs scale with tree tier.]` Game data files are the authoritative source.
- **Exploration and Modern Future Tech prerequisites** — Antiquity confirmed (Mathematics + Iron Working). Exploration and Modern prerequisites are `[INFERRED]` as analogous end-tree pairs; not confirmed in sources.
- **Whether mid-research progress is truly lost at age transition** — community sources conflict. Firaxis has not published an authoritative statement. Checked CivFanatics forum, Steam discussions, and PCGamer — none settle this definitively.
- **Confirmed absence of Eurekas/Inspirations** — no source states Civ VII removed Eurekas. The absence of any Eureka mention across all reviewed sources is the evidence. A Firaxis statement explicitly confirming removal would harden this claim.
- **Full prerequisite graph** — no single source maps the complete prerequisite chains for all ~46 technologies across three ages. A comprehensive table should be built from in-game data files.
- **Future Tech boost magnitude** — sources say “boost” to a starting tech in the next age without quantifying it (50%? full unlock? fixed science credit?). Checked Game8, Fextralife, GameRant — all use “boost” without a number.

---

## Mapping to hex-empires

**Status tally:** 1 MATCH / 3 CLOSE / 4 DIVERGED / 4 MISSING / 2 EXTRA
**Audit:** [.codex/gdd/audits/tech-tree.md](../audits/tech-tree.md)
**Highest-severity finding:** F-01 — Age transition does NOT wipe research state (DIVERGED, HIGH)
**Convergence status:** Divergent — 4 finding(s) require(s) architectural refactor

_(Full details in audit file. 14 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

The two Fandom wiki pages (Technology_(Civ7) and Tech_Tree_(Civ7)) both returned HTTP 403 during research. All content was sourced from Game8, Fextralife, GameRant, Screen Rant, The Gamer, CivFanatics forums, Steam discussions, and PCGamer. Coverage is medium-confidence — the Fandom wiki likely has more numeric detail (per-tech science costs, exact mastery bonuses) that could not be accessed. The tech count lists from Game8/Fextralife are plausible but should be cross-checked against the Fandom wiki once access is available.

Mastery cost conflict is the most implementation-critical open question. Recommend resolving this before coding the tech system in hex-empires.

---

<!-- END OF TEMPLATE - do not add sections after this line. -->
