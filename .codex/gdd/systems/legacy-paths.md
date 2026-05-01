# Legacy Paths --- Civ VII

**Slug:** `legacy-paths`
**Bucket:** `ages`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/gameplay/ages-explanation/ --- Firaxis: Ages gameplay explained
- https://civilization.2k.com/civ-vii/game-guide/dev-diary/ages/ --- Firaxis Dev Diary #1: Ages
- https://civilization.2k.com/civ-vii/game-guide/dev-diary/victories-post-launch/ --- Firaxis Dev Diary: Victories (post-launch)
- https://www.newsweek.com/entertainment/video-games/guide-all-dark-age-golden-age-effects-how-get-them-civilization-7-2026569 --- Newsweek: All Dark Age and Golden Age Effects
- https://screenrant.com/how-to-complete-all-legacy-paths-in-civ-7s-antiquity-age/ --- Screen Rant: Antiquity Legacy Paths guide
- https://screenrant.com/civ-7-legacy-paths-explained/ --- Screen Rant: Legacy Paths explained
- https://screenrant.com/civ-7-complete-multiple-legacy-paths-each-age-query/ --- Screen Rant: Completing multiple paths per age
- https://gamerant.com/civilization-7-how-to-complete-great-library-legacy-path/ --- Game Rant: Great Library Legacy Path
- https://comradekaine.com/civilization7/golden-ages-legacy-options-and-rewards-in-civ-7/ --- ComradeKaine: Legacy options and rewards
- https://www.pcgamer.com/games/strategy/civilization-7-victory-legacy-paths-win-conditions-guide/ --- PC Gamer: Victory and Legacy Paths guide
- https://www.pcgamer.com/games/strategy/civilization-7-age-transition-effects/ --- PC Gamer: Age transition effects

**Source conflicts noted:** No material conflict. Newsweek, PC Gamer, and Screen Rant agree on all specific bonus values sourced here.

---

## Purpose

Legacy Paths are Civ VII's explicit per-age achievement system: four parallel tracks of milestones (Economic, Military, Cultural, Scientific) that players pursue within each Age, earning Legacy Points redeemable for bonuses at the transition into the next Age. They replace the era score of Civ VI with a more concrete, category-specific structure that ties short-term milestone objectives to long-term arc advantages and --- in the Modern Age --- to the four main victory conditions. The system also rewards complete path mastery (Golden Age) and acknowledges total path neglect with a compensatory-but-penalizing Dark Age effect, preserving strategic relevance for players who fall behind.

---

## Entities

- `PlayerState.legacyPoints[category]` --- (RW) --- per-category counter of Legacy Points earned this age; category in {economic, military, cultural, scientific}
- `PlayerState.goldenAgePaths[age]` --- (RW) --- set of path categories where the player achieved Golden Age status in a given age
- `PlayerState.darkAgePaths[age]` --- (RW) --- set of path categories where the player earned zero milestones in a given age
- `PlayerState.legacyMilestonesComplete[path]` --- (RW) --- integer 0..3 counting completed milestones per named path (e.g. great-library, silk-roads)
- `PlayerState.activeLegacies` --- (RW) --- list of Legacy entries the player selected at age transition; persists as effects during the new age
- `PlayerState.wildcardLegacyPoints` --- (RW) --- points spendable on any legacy category [INFERRED: separate wildcard pool implied by multiple sources; exact accrual mechanic not confirmed]
- `GameState.legacyMilestoneProgress[playerId][pathId]` --- (RW) --- tracks each player's progress toward each milestone threshold
- `GameState.ageProgressMeter` --- (RW) --- global score incremented by turns and milestone completions; when it reaches the age-end threshold (plus crisis resolution), transition fires
- `CityState.buildings` --- (R) --- Golden Age legacy bonuses may convert specific buildings to Golden Age variants that survive transition with yields intact

---

## Triggers

- **On END_TURN (every turn, all players):** Evaluate each player's milestone progress against the current threshold for each active path. If a milestone threshold is newly crossed, award legacyPoints[category] += 1, fire a notification, and add a fixed amount to ageProgressMeter. [INFERRED: exact progress meter contribution per milestone not published; community notes suggest each milestone contributes significantly more than a normal turn]
- **On COMPLETE_MILESTONE (triggered internally when threshold is crossed):** Record which milestone was completed; if all milestones in a path are complete and legacyPoints[category] == 3, mark path as Golden Age eligible.
- **On age transition (during transition flow, after crisis resolution):** Open the Legacy Selection screen. For each category: if player has >= 0 legacy points, offer legacy menu options scaled to those points. If player has 0 milestones in a category, offer Dark Age legacy option.
- **On modern age end:** Total Legacy Points accumulated across all three ages contribute to score victory if no specific victory condition is met first.

---

## Mechanics

### Per-age path names and milestone structure

Each Legacy Path is named uniquely per age and shares a theme with that age's content. The structure is consistent: **three milestones per path**, each awarding one Legacy Point. The third milestone simultaneously flags the path as Golden Age completed.

**Antiquity Age (approximate turn range: 0-180 at standard speed):**

| Category | Path Name | Milestone 1 | Milestone 2 | Milestone 3 (Golden Age) |
|---|---|---|---|---|
| Cultural | Wonders of the Ancient World | Build 2 Wonders | Build 4 Wonders | Build 7 Wonders |
| Economic | Silk Roads | Assign 7 Resources | Assign 14 Resources | Assign 20 Resources |
| Military | Pax Imperatoria | Control 6 settlement-points | Control 9 settlement-points | Control 12 settlement-points |
| Scientific | Great Library | Display 3 Codices | Display 6 Codices | Display 10 Codices |

Note: For Pax Imperatoria, conquered settlements count as 2 settlement-points; self-founded settlements count as 1. [comradekaine.com / screenrant.com]

Note: Codices (Scientific path) are special great works unique to Antiquity; must be housed in the Palace, certain Wonders, Academies, or Libraries; each grants +2 Science while displayed. [gamerant.com]

Codices are obtainable via tech masteries (Writing Mastery, Currency Mastery, Mathematics Mastery each grant two), the Literacy Civic, Narrative Events, City-State bonuses, and the Nalanda Wonder. [gamerant.com]

**Exploration Age:**

| Category | Path Name | Theme |
|---|---|---|
| Cultural | Toshakhana | Display Relics in Temples |
| Economic | Treasure Fleets | Unload trade fleets from Distant Lands |
| Military | Non Sufficit Orbis | Control Distant Land settlements |
| Scientific | Enlightenment | Build high-yield specialist tiles |

Specific intermediate milestone thresholds for Exploration paths are not confirmed in available sources. [INFERRED: same 3-milestone structure applies based on consistent pattern from Antiquity paths across all sources]

**Modern Age:**

| Category | Path Name | Theme |
|---|---|---|
| Cultural | Geographic Society | Excavate and display Artifacts in Museums |
| Economic | Railroad Tycoon | Generate Railroad Tycoon Points via Rail infrastructure |
| Military | Ideology | Capture settlements aligned with opposing ideologies |
| Scientific | Space Race | Complete aerospace tech milestones through Rocketry |

Modern Age paths lead directly to victory conditions rather than Golden Age bonuses (there is no fourth age to carry them into). [pcgamer.com]

---

### Legacy Points and the Legacy Selection menu

Each milestone completion awards exactly **1 Legacy Point** of the matching category. A maximum of **3 Legacy Points** per category can be earned per age (one per milestone). [comradekaine.com]

At age transition, the Legacy Selection menu opens and presents a tiered menu per category. Each option has a point cost:

| Legacy Option Type | Cost (Legacy Points) | Notes |
|---|---|---|
| Change Capital | 0 points | Free strategic option; no legacy points required |
| Dark Age Effect | 0 points | Only available if 0 milestones completed in that category; opt-in |
| Leader Legend | 1 point | Tied to the leader's personal identity/lore |
| Attribute Bonus | 1 point | Max 2 Attribute Bonuses per category per transition |
| Legacy Bonus | 2 points | Mid-tier named bonus for that path |
| Golden Age Bonus | 2 points | Only available if path was fully completed (Golden Age eligible) |

[comradekaine.com / WebSearch synthesis from multiple sources]

The player may select **at most 1 Golden Age Legacy Option** per transition --- even if they have Golden Age status in multiple categories, only one Golden Age effect activates. This is an explicit anti-snowball constraint. [Multiple community sources; not in a single Firaxis statement but consistent across all found sources]

Legacy Points are typed by category; a Cultural point cannot buy a Military legacy option. [INFERRED: consistent with the wildcard pool described separately; categorical typing is stated behavior]

---

### Golden Age legacy bonuses

Completing all 3 milestones in a path unlocks a Golden Age Legacy for that category. The specific bonus depends on the age and category:

**Antiquity --- Golden Age effects (active in Exploration):**

- **Cultural (Wonders of the Ancient World):** Amphitheaters retain their yields, effects, and adjacency bonuses into the Exploration Age. [Newsweek]
- **Economic (Silk Roads):** All of the player's Cities from Antiquity remain Cities in Exploration (rather than most downgrading to Towns at transition). [Newsweek]
- **Military (Pax Imperatoria):** Gain one free Infantry unit in every settlement the player conquered during Antiquity. [Newsweek]
- **Scientific (Great Library):** Academies retain their yields, effects, and adjacency bonuses into the Exploration Age. [Newsweek]

**Exploration --- Golden Age effects (active in Modern):**

- **Cultural (Toshakhana):** Keep Religious Founder Beliefs --- the player's founded religion's special beliefs remain active in the Modern Age. [Newsweek]
- **Economic (Treasure Fleets):** All Cities remain Cities (no Town downgrade); all Distant Lands Cities gain +2 population. [Newsweek]
- **Military (Non Sufficit Orbis):** Gain one free Infantry unit and one free Ranged unit in all Distant Land settlements. [Newsweek]
- **Scientific (Enlightenment):** Universities retain their yields, effects, and adjacency bonuses into the Modern Age. [Newsweek]

The unifying pattern for building-retention bonuses (Cultural and Scientific in both Antiquity and Exploration) is that they preserve the existing infrastructure of the previous age rather than having it reset or lose adjacency yields on transition. This is architecturally significant because the age transition normally strips non-ageless buildings of their yields. [INFERRED synthesis: consistent with multiple sources and with the ageless-buildings mechanic in ages.md]

---

### Dark Age legacy bonuses

A Dark Age is triggered when a player completes **zero milestones** in a given Legacy Path category during that age. The player may choose to activate the Dark Age bonus at transition or leave that category slot empty. [pcgamer.com]

Dark Age bonuses follow a two-part structure: a compensatory mechanic providing an unusual advantage (often bypassing normal tech or growth gates), paired with a persistent structural penalty in the following age.

**Antiquity --- Dark Age effects (active in Exploration):**

- **Cultural Dark Age:** Missionaries gain +1 charge and +1 movement; BUT -3 Happiness in all settlements after founding a religion, and -6 Happiness in settlements not following the player's religion. [Newsweek]
- **Economic Dark Age:** Naval Commanders gain settlement-creation charges every two levels; BUT +100% Settler production cost. [Newsweek]
- **Military Dark Age:** Lose all armies and all settlements except the Capital; receive three full armies with cavalry and siege units as compensation. [Newsweek]
- **Scientific Dark Age:** Receive a random technology Boost every five turns; BUT -50% Science output. [Newsweek]

**Exploration --- Dark Age effects (active in Modern):**

- **Cultural Dark Age:** Explorers gain +1 movement and +50% excavation speed; BUT -50% Influence. [Newsweek]
- **Economic Dark Age:** +100% Production and Gold toward building or purchasing Rail Stations and Ports; +1 Resource Capacity in all settlements; BUT -25% Culture. [Newsweek]
- **Military Dark Age:** All current Commanders gain 2 levels; new Commanders start with 2 levels; BUT +25% military unit production cost. [Newsweek]
- **Scientific Dark Age:** Flight technology unlocks automatically when Combustion tech is researched; BUT +50% airplane production cost. [Newsweek]

Dark Ages can be intentionally pursued when the compensatory bonus outweighs the penalty for a particular playstyle. [INFERRED strategic interpretation, consistent with PC Gamer and Screen Rant descriptions]

---

### Legacy Paths as age-progression accelerators

Milestone completion is the primary variable that accelerates age transition speed beyond base turn accumulation. The Firaxis Dev Diary states that milestones contribute larger amounts to the Age Progress meter than standard turn-based progression. [Firaxis: ages-explanation]

The mechanic creates an inherent tension: every milestone any player completes pushes the global age-end meter forward for everyone. Players pursuing all four paths simultaneously on standard speed risk running out of age-turns before finishing any single path to Golden Age status, because both their own milestone completions and those of AI opponents collectively compress the timeline. [screenrant.com]

The practical community guidance suggests focusing on 1-2 paths per age to reliably achieve Golden Age status, while also completing partial milestones on secondary paths for the legacy point income. [screenrant.com / comradekaine.com]

An important implication for implementation: the ageProgressMeter must be a shared global state (not per-player), and milestone completions by AI players must also increment it.

---

### Modern Age: Legacy Paths as Victory Conditions

In the Modern Age, the Legacy Path system shifts from earning a bonus for the next age to racing to complete a chosen victory. Each of the four Modern Age paths leads to a specific instant-victory condition:

- **Cultural (Geographic Society to World's Fair):** Complete the World's Fair Wonder in any city. [pcgamer.com]
- **Economic (Railroad Tycoon to World Bank):** Spawn a Great Banker unit in the Capital and establish World Bank branches in all opponent Capitals. [Firaxis: Victories]
- **Military (Ideology to Operation Ivy):** Complete the Manhattan Project Wonder, then complete the Operation Ivy technology project (the first hydrogen fusion bomb). [Firaxis: Victories]
- **Scientific (Space Race to First Staffed Space Flight):** Complete the Staffed Space Flight Project in a city with a Launch Pad. [Firaxis: Victories]

Legacy Points accumulated across all three ages speed up these final victory projects. Science Legacy Points accelerate the Staffed Space Flight Project; Economic Legacy Points reduce Gold/Influence costs for establishing World Bank branches. [Firaxis: Victories]

The first civilization to complete its chosen path wins. All four victories can be pursued in parallel, creating a race. Opponents may pivot to cut off a leader by racing the same victory condition faster. [screenrant.com]

A **score victory** (most total Legacy Points accumulated across all three ages) activates if no player achieves a specific victory condition before the Modern Age ends. [pcgamer.com]

---

### Interaction with Crisis

The age transition is gated by crisis resolution, but legacy path milestone completion continues to advance the Age Progress meter regardless of crisis state:

- Milestones completed during the crisis phase count toward legacy paths and accumulate legacy points normally.
- The actual transition (and Legacy Selection screen) does not open until the crisis is resolved, per the ages.md crisis gate mechanic.
- Players who complete paths fully during or shortly before crisis have the same Golden Age eligibility as those who completed them earlier.

[INFERRED: consistent with the crisis-gates-transition mechanic documented in ages.md and the Firaxis description of crisis as a transition gate, not a pause on all progress]

---

## Formulas

```
legacyPointsEarned[category] = count of milestones completed in that path category this age
  max 3 per category per age (one per milestone)

goldenAgeEligible[category] = (legacyMilestonesComplete[category] == MILESTONES_PER_PATH)
  MILESTONES_PER_PATH = 3  // confirmed across all Antiquity paths; [INFERRED] same for Exploration and Modern

darkAgeEligible[category] = (legacyMilestonesComplete[category] == 0)

legacyCost:
  change_capital    -> 0
  dark_age_effect   -> 0   // only if darkAgeEligible == true for that category
  leader_legend     -> 1
  attribute_bonus   -> 1   // max 2 per category per transition
  legacy_bonus      -> 2
  golden_age_bonus  -> 2   // only if goldenAgeEligible == true for that category

maxGoldenAgeLegaciesPerTransition = 1
  // selecting one Golden Age bonus locks all other Golden Age options, even if eligible in multiple categories

ageProgressContribution per event:
  base_turn  -> BASE_TURN_PROGRESS    // 1 unit per turn [INFERRED placeholder]
  milestone  -> MILESTONE_PROGRESS    // substantially > BASE_TURN_PROGRESS [INFERRED: exact value not published]

ageTransitionReady = ageProgressMeter >= ageProgressTarget AND crisisPhase == resolved
```

Where:
- MILESTONES_PER_PATH = 3 --- confirmed from gamerant.com, comradekaine.com, screenrant.com for all four Antiquity paths; [INFERRED] same structure in Exploration and Modern
- legacyCost values --- sourced from comradekaine.com, corroborated by WebSearch synthesis
- MILESTONE_PROGRESS --- exact numeric contribution not published by Firaxis; known to be substantial relative to a base turn
- maxGoldenAgeLegaciesPerTransition = 1 --- stated by multiple community sources [INFERRED high confidence]

---

## Interactions

- `systems/ages.md` --- age transition triggers the Legacy Selection screen and consumes legacy points; the age progress meter read by ages.md is written by this system's milestone completion events
- `systems/crises.md` --- crisis resolution gates the Legacy Selection screen; milestone progress still accumulates during crisis phase
- `systems/victory-paths.md` --- Modern Age legacy paths are the victory conditions; this system and victory-paths are deeply intertwined in the Modern Age
- `systems/buildings-wonders.md` --- Cultural and Scientific Golden Age bonuses preserve building yields across transitions; Wonders are required milestones for the Cultural path in Antiquity and Modern
- `systems/religion.md` --- Cultural Golden Age (Exploration: Toshakhana) preserves Founder Beliefs; the only legacy that directly carries a religion system state forward across a transition
- `systems/settlements.md` --- Economic Golden Age preserves City status vs downgrade to Town; Military Dark Age can strip settlements; Military path tracks settlement-control counts
- `systems/tech-tree.md` --- Codices (Scientific Antiquity path) obtained via tech masteries; Scientific Dark Age in Exploration unlocks Flight via Combustion automatically; Space Race path in Modern requires aerospace techs
- `systems/commanders.md` --- Military Dark Age (Exploration) grants free commander levels to all existing commanders; Military paths track settlement-control which involves military commanders
- `systems/leaders.md` --- Leader Legend legacy options cost 1 legacy point; leader attributes can be purchased via Attribute Bonus options at transition
- `systems/map-terrain.md` --- Economic path (Exploration: Treasure Fleets) requires access to Distant Lands; Military path (Exploration: Non Sufficit Orbis) tracks Distant Land settlement control

---

## Content flowing through this system

- [`content/crisis-cards/`](../content/crisis-cards/) --- crisis cards interact with legacy path timing (crisis fires near age-end, milestone progress continues during crisis phase)
- [`content/buildings/`](../content/buildings/) --- Amphitheaters, Academies, and Universities are named targets of Cultural/Scientific Golden Age bonuses
- [`content/wonders/`](../content/wonders/) --- Wonders are the milestone objects for the Cultural path in Antiquity (requires 7 Wonders) and for the Cultural victory in Modern (World's Fair Wonder)
- [`content/units/`](../content/units/) --- Infantry and Ranged units are awarded as Military Golden Age bonuses; Explorers are the relevant unit for the Cultural Dark Age in Exploration
- [`content/resources/`](../content/resources/) --- Resource assignment is the core mechanic of the Economic path in Antiquity (Silk Roads) and contributes to Modern Age Railroad Tycoon Points via Factory Resources
- [`content/technologies/`](../content/technologies/) --- Codices obtained via Writing/Currency/Mathematics tech masteries; Space Race path involves Rocketry and aerospace techs; Scientific Dark Age auto-unlocks Flight via Combustion

---

## VII-specific (how this differs from VI/V)

- **No Civ V/VI analogue for per-path milestone tracks.** Civ VI had era scores that accumulated as a single global number; no per-category milestone structure. Civ V had social policy trees and research but no milestone-to-legacy-bonus system.
- **Golden Age is not a global empire mode.** In Civ VI/V, a Golden Age was a broad empire-wide buff (usually happiness or yields) triggered by era score thresholds. In Civ VII a Golden Age is per-path and grants one specific structural bonus (building retention, free units, city preservation) --- not a wide yield multiplier.
- **Dark Ages are opt-in at transition, not automatic consequences.** In Civ VI, falling below the era score threshold automatically triggered a Dark Age mode. In Civ VII, a Dark Age requires zero milestone completion AND the player must actively select the Dark Age option at the Legacy Selection screen. It is never forced.
- **Legacy Points as explicit typed currency.** Civ VII introduces a per-category typed currency (3 max per path per age) spent in a menu with multiple tier options. Prior games had no equivalent spendable resource to activate era bonuses.
- **Mutually exclusive Golden Age selection.** Players can earn Golden Age eligibility in multiple categories but can only activate one Golden Age Legacy per transition. This is a deliberate anti-snowball constraint with no analogue in prior titles.
- **Modern Age paths are terminal victory conditions.** Civ VI victories were parallel independent systems (science, culture, domination, religion, score). Civ VII binds all four into the legacy path framework, making the three-age arc a coherent progression toward a single chosen win condition.
- **Age compression via milestone completion.** Milestones globally accelerate age end for all players; pursuing multiple paths risks triggering the transition before any path is complete. No such mechanic existed in prior titles where era progression was purely turn-based.

---

## UI requirements

- **Legacy Path panel / progress bar:** Persistent element visible during each age. Shows all four paths as vertical tracks with per-milestone progress indicators. Each path shows: path name, current milestone threshold, count toward next threshold, and current Legacy Point total. Full panel view shows intermediate reward options at each milestone.
- **Milestone completion notification:** HUD notification fires when a milestone threshold is crossed. Shows: path name, milestone label, legacy points now held, and updated path status (e.g. Silk Roads: 2/3 milestones --- 2 Economic Legacy Points).
- **Age Progress meter:** Top-bar or persistent HUD element showing global progress toward age transition, with milestone completions visibly contributing (not just turn count).
- **Legacy Selection screen (age transition modal):** Multi-step modal that opens during age transition, after civilization selection. Shows four category columns; each column lists available legacy options with their point costs. Options greyed out if unaffordable or ineligible. Golden Age options highlighted distinctly. Dark Age options appear only for categories with zero milestones. Player confirms before proceeding.
- **Golden Age / Dark Age status badge per category:** At the Legacy Selection screen, a per-column badge showing: Golden Age (eligible), Partial (1-2 milestones), or Dark Age (0 milestones eligible).
- **Victory race tracker (Modern Age):** HUD or panel element showing how close each civilization is to completing their chosen victory path. Critical for the race dynamic in multiplayer.
- **Score victory indicator:** End-of-game summary showing accumulated legacy points per player, used as tiebreaker if no specific victory condition fires.

---

## Edge cases

- What if a player completes zero milestones across ALL four paths in one age? All four categories are Dark Age eligible. Whether multiple Dark Age effects can be simultaneously selected is unconfirmed --- only the max 1 Golden Age constraint is explicitly stated. If the player selects zero legacies, they enter the next age with no legacy bonuses at all.
- What if the Age transition fires before a player reaches the third milestone of a path they were close to completing? Legacy Points earned so far are kept and spendable at transition; but Golden Age eligibility is not granted for an incomplete path. No partial Golden Age.
- What if two players both achieve Golden Age in the same path category? Both independently receive Golden Age eligibility in their own Legacy Selection menus. Legacies are per-player, not exclusive across players.
- What if the player picks Military Dark Age in Exploration (lose all settlements except capital, receive free armies) while also having Economic Golden Age (all Cities remain Cities)? [INFERRED: both effects apply at transition; interaction order unconfirmed by sources and would be an engine-implementation decision.]
- What if the player never founded a religion in Exploration but has the Cultural Golden Age (Keep your Religious Founder Beliefs)? The bonus is vacuous --- there are no Founder Beliefs to retain. [INFERRED: bonus does nothing; no compensation given.]
- What if the player pursues Silk Roads but loses settlements mid-age, causing previously assigned Resources to be unassigned? [INFERRED: the milestone counter may track currently assigned vs ever assigned; sources do not confirm the counter semantics.]
- What if a player achieves Golden Age in the Cultural path for Antiquity but built no Amphitheaters? The bonus is vacuous --- no Amphitheaters carry over. The path was completed through Wonder-building regardless of building coverage.
- What if no player achieves a specific victory condition before the Modern Age ends? Score victory activates --- the player with the most total Legacy Points wins. [pcgamer.com]
- What if a player is eliminated mid-age before the Legacy Selection screen? [INFERRED: eliminated players do not participate in the transition flow; their legacy state is discarded with their game presence.]

---

## Open questions

- Exact per-milestone Age Progress meter contribution values --- Firaxis has not published specific numbers. Community data confirms milestones contribute materially more than a base turn but exact weighting unknown. Checked ages-explanation, dev-diary/ages; not addressed numerically.
- Exploration Age milestone thresholds --- path names confirmed; specific intermediate counts (e.g. display 4 Relics for milestone 1 of Toshakhana) not found in available sources. Checked pcgamer.com, screenrant.com.
- Modern Age milestone thresholds --- same gap as Exploration. Path names and victory conditions confirmed; intermediate milestone requirements not enumerated. Checked pcgamer.com.
- Whether multiple Dark Age effects can be selected at one transition (e.g. Military AND Economic Dark Age simultaneously)? Only the Golden Age cap (max 1) is explicitly stated. Dark Age stacking cap unconfirmed. Checked pcgamer.com, newsweek.com.
- Wildcard Legacy Point accrual --- how are wildcard points earned? Are they a separate pool or a conversion option? Sources acknowledge their existence but do not detail acquisition. Checked comradekaine.com, ages-explanation.
- Whether Dark Age selection is mandatory if the player has zero milestones, or purely optional. Sources phrase it as optional but this implies it can be skipped entirely. Checked pcgamer.com/age-transition-effects.
- Interaction order between simultaneous Dark Age and Golden Age effects at transition (e.g. Military Dark Age strips settlements vs Economic Golden Age preserves cities). Unconfirmed. Checked pcgamer.com/age-transition-effects.

---

## Mapping to hex-empires

**Status tally:** 1 MATCH / 3 CLOSE / 5 DIVERGED / 2 MISSING / 0 EXTRA
**Audit:** [.codex/gdd/audits/legacy-paths.md](../audits/legacy-paths.md)
**Highest-severity finding:** F-01 — Dual schema not wired (DIVERGED, HIGH)
**Convergence status:** Divergent — 5 finding(s) require(s) architectural refactor

_(Full details in audit file. 11 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

Primary sources used: Firaxis Dev Diary #1 (Ages) and Firaxis Victories dev diary for Modern Age victory mechanics. Fandom wiki pages for Legacy_Path_(Civ7) and Age_(Civ7) both returned HTTP 403 errors from WebFetch and could not be accessed directly; their content was partially recovered via WebSearch summaries and cross-referenced against Newsweek, PC Gamer, Screen Rant, Game Rant, and comradekaine.com. All major mechanical claims are corroborated by at least two independent sources.

The Antiquity milestone table is the most completely sourced section: all four paths have confirmed thresholds from comradekaine.com, gamerant.com, and screenrant.com in cross-reference. Exploration and Modern Age intermediate milestone thresholds remain a gap; flagged in Open Questions.

Failed URLs: https://civilization.fandom.com/wiki/Legacy_Path_(Civ7) (HTTP 403), https://civilization.fandom.com/wiki/Age_(Civ7) (HTTP 403).

<!-- END OF TEMPLATE - do not add sections after this line. -->