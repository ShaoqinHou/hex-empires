# Civic Tree -- Civ VII

**Slug:** `civic-tree`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

Every factual claim must trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://civ7.wiki.fextralife.com/Civics -- Fextralife: Civics (Civ7)
- https://well-of-souls.com/civ/civ7_trees.html -- Well-of-Souls: Civ VII Analyst
- https://screenrant.com/civ-7-all-antiquity-age-civic-trees-how-to-use/ -- Screen Rant: Antiquity Unique Civic Trees
- https://gamerant.com/civilization-vii-traditions-guide-how-to-get-tradition-cards-civ-7-social-policy-cards/ -- Game Rant: Traditions Guide
- https://gamerant.com/civilization-vii-civ-7-how-get-more-culture/ -- Game Rant: How to Increase Culture
- https://gamerant.com/civilization-7-how-get-more-policy-slots/ -- Game Rant: How to Get More Policy Slots
- https://civilization.2k.com/civ-vii/game-guide/dev-diary/ages/ -- Firaxis Dev Diary #1: Ages
- https://www.pcgamer.com/games/strategy/civilization-7-age-transition-effects/ -- PC Gamer: Age Transition Effects
- https://game8.co/games/Civ-7/archives/497975 -- Game8: List of All Governments
- https://game8.co/games/Civ-7/archives/495147 -- Game8: List of Civics
- https://www.thegamer.com/civilization-7-civ-best-civics-culture-research-first/ -- The Gamer: What Civics To Research First
- https://www.thegamer.com/civilization-7-modern-age-complete-guide/ -- The Gamer: Complete Guide to Modern Age
- https://steamcommunity.com/app/1295660/discussions/0/591761879137845834/ -- Steam: Unique civics slotting mechanics
- https://screenrant.com/civ-7-culture-updates-patch-110-explainer/ -- Screen Rant: Patch 1.1.0 Culture Updates

**Source conflicts noted:** Fextralife states mastery costs ~80% of the base civic culture cost; another source states it costs the same. The 80% figure is cited more frequently and may reflect a post-patch state. Tagged `[source-conflict]` in Formulas.
---

## Purpose

The Civic Tree is the culture-driven counterpart to the science-driven Tech Tree. Where technologies unlock military and material capabilities, civics unlock social, political, and governmental capabilities: governments, social policies, ideological commitments, religion access, and empire management tools such as settlement limits. The system forces meaningful triage choices each age -- the tree is larger than any one player can fully exhaust in a typical age, so research direction signals strategic intent. The three-age structure with full tree replacement each age prevents snowball dominance, while the Tradition system -- policies unlocked through civ-unique civics that persist indefinitely -- creates cumulative cultural identity across all three acts. Civ VII simplifies policy slots relative to Civ VI by making all slots wildcard (no type specialization), while adding depth through the novel Tradition and Ideology layers.

---

## Entities

- `PlayerState.culturePerTurn` -- (R) -- total culture generated per turn; drives civic research progress
- `PlayerState.civicProgress` -- (RW) -- running culture total toward the currently-selected civic
- `PlayerState.researchedCivics` -- (RW) -- set of civic IDs completed this age
- `PlayerState.masteredCivics` -- (RW) -- set of civic IDs for which mastery has also been completed
- `PlayerState.activePolicies` -- (RW) -- currently slotted social policies (standard + traditions)
- `PlayerState.traditions` -- (RW) -- all tradition cards earned across all ages; persist permanently
- `PlayerState.policySlots` -- (RW) -- current count of available policy slots
- `PlayerState.currentGovernment` -- (RW) -- selected government type for this age; locked once chosen
- `PlayerState.ideology` -- (RW) -- selected ideology (Modern Age only); `democracy | fascism | communism | null`; locked once chosen
- `PlayerState.currentAge` -- (R) -- determines which civic tree is active
- `GameState.civicTreeConfig` -- (R) -- per-age civic tree: nodes, prerequisites, culture costs, mastery costs, unlock payloads

---

## Triggers

- On **END_TURN** -- add `culturePerTurn` to `civicProgress`. If `civicProgress >= civicCost(selectedCivic)`, the civic is researched: add to `researchedCivics`, reset `civicProgress` to overflow (if any), fire unlock payload.
- On action **SELECT_CIVIC** -- player selects next civic to research; valid targets are unresearched civics whose prerequisites are all in `researchedCivics`.
- On action **RESEARCH_MASTERY** -- player invests culture to research mastery of a completed civic; adds to `masteredCivics`; fires mastery unlock payload.
- On action **SELECT_GOVERNMENT** -- player picks a government type (valid at age start or when a new government becomes available); locks `currentGovernment` for the age.
- On action **SELECT_IDEOLOGY** -- player selects an ideology (valid only after `POLITICAL_THEORY` civic researched in Modern Age); locks `ideology`; unlocks ideology civic branch.
- On action **SLOT_POLICY** -- player slots a social policy or tradition into an available policy slot.
- On action **UNSLOT_POLICY** -- player removes a standard policy from a slot; traditions returned to permanent pool, never discarded.
- On **age transition** -- civic tree resets; standard policies expire; traditions persist (see Age Transition Reset section).

---

## Mechanics

### Culture Accumulation

Culture is generated per turn from tiles (improved tundra, resources such as Silk), buildings (Monument, Amphitheater, Temple, Kiln, Pavilion, Museums in the Modern Age), wonders (Oracle, Colosseum), social policies (the Charismatic Leader policy from the first Antiquity civic), leader attributes, specialists in the Modern Age, cultural festivals (a production-to-culture project), narrative events, and mementos. Each turn the total culture-per-turn is added to progress toward the current civic. Civics are researched one at a time -- the player selects the next target, and culture accumulates until the cost threshold is met.

Culture accumulates without cap -- overflow beyond a completed civic cost rolls into the next civic (or holds as partial progress if no target is selected). There is no explicit culture-banking mechanic; accumulation is purely additive. [Source: Game Rant culture guide; Fextralife]

### Civic Tree Structure (per age)

Each age exposes a fresh civic tree. The three trees share no nodes; completing an Antiquity civic grants no access to Exploration civics. The tree is a directed acyclic graph with prerequisite relationships; a civic cannot be researched until all its predecessors are complete. [Source: Game Rant Traditions guide]

**Antiquity:** foundational governance and society civics. Entry node is `Chiefdom` (very low cost). Key civics include `Mysticism` (unlocks pantheon founding), `Discipline` (unlocks Army Commander production), `Code of Laws` (unlocks Merchant units and trade access), `Philosophy` (+1 policy slot), `Citizenship` (culture-building production bonuses), `Tactics`, `Organized Military` (+1 settlement limit). Cost range: ~90--1000 culture. [Source: Fextralife; The Gamer]

**Exploration:** naval, colonial, and diplomatic civics. Entry ~700 culture; upper-tier ~3000. Key civics include `Piety` (gates religion mechanics), `Economics`, `Authority`, `Imperialism`, `Bureaucracy` (+1 policy slot), `Diplomatic Service` (+1 policy slot), `Theology` (unlocks Theology sub-branch and Reformation). The `Theology` node unlocks a short religion-focused sub-branch; its only documented follow-up is `Reformation`. [Source: Fextralife; Well-of-Souls]

**Modern:** industrialization, nationalism, and ideology civics. Entry ~1600 culture; upper-tier ~8000. The critical gating node is `Political Theory`, which requires `Social Question`, `Modernization`, and `Natural History`. Completing `Political Theory` presents the ideology branch-lock (see Ideology Trees section). Other key civics: `Natural History` (unlocks Museum and artifact collection), `Hegemony` (doubles artifact finds; restructured in patch 1.1.0 to require `Nationalism` and `Globalism`). Cost range: ~1600--8000 culture. [Source: Fextralife; Screen Rant patch notes]

The player is unlikely to complete every standard civic in a single age at typical culture rates -- strategic prioritization is expected. Future Civic nodes at the end of each tree grant +10 Age Progress and a culture/science headstart in the next age. [Source: PCGamer; WebSearch]

### Civ-Unique Civic Trees

Each civilization has a separate exclusive civic tree tab in the civic screen containing three to four unique civics that only that civilization can research. [Source: Fextralife; Screen Rant; WebSearch]

Civ-unique civics resolve as one of two unlock types:

1. **Passive bonuses** (marked with a + icon) -- automatically activate when the civic is researched; no slotting required. Example: Greece Ekklesia Tier 2 grants increased culture per turn for active Endeavors. [Source: Steam discussion]
2. **Tradition cards** (marked with a quill icon) -- become available in the tradition pool when researched; must be explicitly slotted into a policy slot to take effect. Example: Rome Senatus Populusque Romanus tradition grants units +1 Combat Strength per tradition equipped. [Source: Steam discussion; Screen Rant]

Civ-unique civics also commonly unlock civ-specific structures: wonders, unique buildings, unique quarters, and unique improvements. Examples: Han `Junzi` mastery unlocks the Weiyang Palace Wonder and Great Wall improvement; Egypt `Light of Amun-Ra` unlocks the Necropolis Quarter. [Source: Screen Rant Antiquity unique civics]

Because each player fields three civilizations across three ages, one game yields three complete civ-unique civic sets, each leaving traditions in the permanent pool.

### Mastery Mechanic

Most civics -- both shared-tree and civ-unique -- have an associated **Mastery**, a second research tier unlocked after the civic is complete. Masteries are optional and do not serve as prerequisites for any other civic or mastery. [Source: WebSearch; Fextralife]

Mastery culture cost: approximately 80% of the base civic culture cost. `[source-conflict]` -- one source claims it equals the base cost; 80% is cited more consistently.

Mastery unlock examples:
- `Senatus Populusque Romanus` mastery (Rome): +1 Social Policy slot + unlocks Colosseum Wonder. [Source: Screen Rant]
- `Citizenship` mastery: unlocks additional policies and the Wonder Construction Endeavor. [Source: The Gamer]
- `Khmer Chakravarti` mastery: +3 Codex slots in the Palace. [Source: Screen Rant]

### Social Policies and Policy Slots

Social policies are the in-game bonuses that civics unlock access to. They are slotted into **policy slots**; their effects are active while slotted. Standard social policies are **age-specific**: on age transition they expire and cannot be re-slotted. The new age civic tree provides access to that age policy set.

**Policy slot baselines by age:**
- Antiquity: 1 slot. [Source: Game Rant policy slots]
- Exploration: 2 slots. [Source: Game Rant policy slots; WebSearch]
- Modern: 3 slots. [Source: WebSearch]

**Additional slot sources:**
- Specific civics: `Philosophy` (Antiquity), `Bureaucracy` and `Diplomatic Service` (Exploration), `Political Theory` (Modern), and select civ-unique civics (e.g. `Common Law` for Normans, `Planes Politicos` mastery for Mexico). [Source: Game Rant policy slots]
- Triggering Celebrations in the empire. [Source: Game Rant policy slots]
- Third-tier Diplomatic leader attribute (+1 slot). [Source: Game Rant policy slots]
- Being the second civilization to adopt a given ideology in the Modern Age (+1 slot). [Source: WebSearch]

All policy slots in Civ VII are **wildcard** -- there are no type-restricted slot categories unlike Civ VI economic/military/diplomatic/wildcard categories. Any policy can go in any slot. `[INFERRED]` based on multiple secondary sources; verify against official documentation.

Standard policies can be swapped freely between turns. Tradition cards occupy policy slots when slotted but are never lost -- unslotting returns the tradition to the permanent pool.

### Traditions

Traditions are a special subtype of social policy that **persist permanently across all age transitions**. They are earned exclusively through civ-unique civic trees and marked with a quill icon. A tradition earned in Antiquity remains available in the Modern Age. [Source: Game Rant Traditions; Firaxis Dev Diary #1]

Key properties:
- Available in the tradition pool from the turn they are unlocked until the end of the game.
- Must be actively slotted into a policy slot to have effect; they are not auto-applied.
- Can be unslotted and re-slotted freely, but never expire or disappear.
- In the Modern Age a player who has collected traditions from all three ages can fill every policy slot with traditions. [Source: PCGamer; Firaxis Dev Diary]
- Traditions are distinguished from standard policies in the UI by the quill icon; civ-unique passives use a + icon. [Source: Steam discussion]

Traditions are the primary mechanism by which civ-unique civic investment from past ages remains relevant in later acts, representing the cultural memory of civilizations the player has led.

### Government Selection

Governments unlock by age progression and each provide:
- One additional policy slot.
- Two distinct Celebration Effects (bonuses lasting 10 turns when a Celebration is triggered).

The player selects one government per age; the choice is **locked for the remainder of the age** -- it cannot be changed mid-age. [Source: Game8 governments list]

**Antiquity governments** (unlock mechanism: sources conflict on whether these require `Chiefdom` civic or are simply available at age start -- `[source-conflict]`):
- Classic Republic: +20% Culture, +15% Wonder Production during Celebrations.
- Despotism: +20% Science, +30% Infantry Training during Celebrations.
- Oligarchy: +20% Food, +30% Building Construction during Celebrations.

**Exploration governments** (three base + three crisis-unlocked):
- Theocracy, Plutocracy, Feudal Monarchy -- available on Exploration age entry.
- Revolutionary Republic (+100% Military Training, +6 War Support), Revolutionary Authoritarianism (+20% Culture/Science, +100% Diplomatic Sanctions), Constitutional Monarchy (+40% Gold, +100% Diplomatic Endeavors) -- unlocked by specific Bourgeoisie Crisis response choices. [Source: Game8 governments list]

**Modern governments:**
- Authoritarianism (+30% Military Training, +3 Combat Strength), Bureaucratic Monarchy (+20% Gold, +30% Relationship Changes), Elective Republic (+20% Culture, +20% Science) -- available on Modern age entry.
- Revolucion (Mexico-unique; +30% Culture/Science/Diplomatic Actions, +40% Military) -- requires specific civics. [Source: Game8 governments list]

Government type does not directly set the number of base policy slots -- slots come from civic research, celebrations, and leader attributes. [Source: Game Rant policy slots; WebSearch]

### Ideology Trees (Modern Age Only)

Researching `Political Theory` (which requires `Social Question`, `Modernization`, and `Natural History`) presents three mutually exclusive ideology options: **Democracy**, **Fascism**, or **Communism**. [Source: Well-of-Souls; Screen Rant ideology; The Gamer Modern Age guide]

Choosing an ideology is **permanent** -- switching is not allowed after selection. It unlocks a dedicated ideology civic branch (3 civics per ideology) and locks out the other two branches.

Ideology-specific bonuses:
- **Democracy**: culture and happiness emphasis -- Cultural boosts from Specialists, extra Culture from displayed Great Works.
- **Fascism**: military and production emphasis -- Production/Gold boosts for Specialists, production scaling with Militaristic Attribute.
- **Communism**: science and food emphasis -- Science boosts for Specialists, enhanced defensive military bonuses.

Being the second civilization (among all players including AI) to adopt a given ideology grants +1 bonus policy slot. [Source: WebSearch]

### Age Transition Reset

The civic tree undergoes a **full reset** on every age transition:

1. The current age shared civic tree is discarded. In-progress civic research is lost if not complete.
2. The new age civic tree becomes active, starting fresh with its own entry nodes.
3. **Standard social policies expire**: all currently-slotted standard (non-tradition) policies become inactive and unavailable in the new age.
4. **Policy slots reset to the new age baseline** (2 for Exploration, 3 for Modern) before additions from new civics.
5. **Traditions persist**: all earned traditions remain in the permanent pool and remain slottable in the new age.
6. **The civ-unique civic tree refreshes**: the new civilization provides a fresh 3--4 node unique tree. The previous civ unique civics are no longer researchable.
7. **Government re-selection**: a new government is chosen from the new age roster; the prior government does not carry over.
8. **Ideology** carries no reset burden -- it is a one-time Modern Age choice and there is no subsequent age.

**Future Civics**: `Future Civic` nodes at the end of each age tree grant +10 Age Progress (accelerating age end) and a culture boost headstart in the next age -- the only civic carry-forward benefit beyond traditions. [Source: WebSearch; Well-of-Souls]

---

## Formulas

```
// Culture accumulation per turn
civicProgress_next = civicProgress + culturePerTurn

// Civic completion condition
civicComplete  ->  civicProgress >= civicCost

// Overflow rolls into next civic
nextCivicProgress = civicProgress - civicCost   // when positive

// Mastery cost multiplier [source-conflict: some sources say 1.00x]
masteryCost = 0.80 * civicCost

// Culture cost ranges by age  (Fextralife)
civicCost_Antiquity:    90 to 1000
civicCost_Exploration: 700 to 3000
civicCost_Modern:     1600 to 8000

// Deity difficulty modifier -- player only; AI unaffected
civicCostDeity = civicCost * 1.40

// Policy slot baselines by age -- before any additions
policySlots_Antiquity   = 1
policySlots_Exploration = 2
policySlots_Modern      = 3
```

Where:
- civicCost -- specific culture cost per node; the ranges above are age-wide bounds, not uniform step values
- 0.80 -- mastery cost multiplier from Fextralife; [source-conflict] one source says 1.00x; use 0.80 as working estimate
- 1.40 -- Deity cost multiplier; sourced from WebSearch
- Policy slot baselines are per-age starting values before civic additions, celebration bonuses, or leader attributes

## Interactions

- `systems/ages.md` -- age transitions reset the civic tree; mid-research progress is lost; this is the primary system the age transition interrupts in the culture domain.
- `systems/tech-tree.md` -- runs in parallel; culture vs science resource allocation tradeoff per turn; mastery mechanic mirrors tech mastery.
- `systems/government-policies.md` -- civics are the primary unlock gate for governments and social policies; policy slots flow from civic research.
- `systems/religion.md` -- `Theology` and `Piety` civics gate religious mechanics (religion founding, Reformation); pantheon founding is gated by the Antiquity `Mysticism` civic.
- `systems/legacy-paths.md` -- the Cultural legacy path requires civic-driven goals; in the Modern Age `Natural History` unlocks Museum and artifact collection.
- `systems/victory-paths.md` -- cultural victory depends on civics: `Natural History` unlocks the artifact path; `Hegemony` doubles artifact finds.
- `systems/civilizations.md` -- each civ unique civic tree is part of civ identity; on age transition the new civ introduces its fresh tree.
- `systems/leaders.md` -- the third-tier Diplomatic leader attribute adds +1 policy slot; direct coupling between leader development and civic capacity.
- `systems/celebrations.md` -- triggering Celebrations grants +1 policy slot and activates government celebration bonuses.
- `systems/crises.md` -- the Bourgeoisie Crisis (end of Exploration) can unlock additional governments unavailable through normal civic research.
- `systems/commanders.md` -- `Discipline` civic in Antiquity unlocks Army Commander production; civic research gates commander access.

---

## Content flowing through this system

- [`content/civics/antiquity/`](../content/civics/antiquity/) -- shared civics for the Antiquity Age (~20+ nodes)
- [`content/civics/exploration/`](../content/civics/exploration/) -- shared civics for the Exploration Age including Theology sub-branch (~20+ nodes)
- [`content/civics/modern/`](../content/civics/modern/) -- shared civics for the Modern Age including ideology branches (~20+ nodes)
- [`content/governments/`](../content/governments/) -- government types by age
- [`content/policies/`](../content/policies/) -- social policies unlocked by civics (age-specific, expire on transition)
- [`content/civilizations/antiquity/`](../content/civilizations/antiquity/) -- each Antiquity civ contributes a 3--4 node unique civic tree
- [`content/civilizations/exploration/`](../content/civilizations/exploration/) -- each Exploration civ contributes a 3--4 node unique civic tree
- [`content/civilizations/modern/`](../content/civilizations/modern/) -- each Modern civ contributes a 3--4 node unique civic tree

---

## VII-specific (how this differs from VI/V)

- **Full tree replacement each age** -- Civ VI civics accumulated on one continuous tree across the whole game. Civ VII replaces the entire tree at each age transition.
- **Traditions as the cross-age carry mechanic** -- Civ VI had no equivalent; all social policies expired with the era. Civ VII traditions create persistent cultural identity compounding across three acts.
- **All policy slots are wildcard** -- Civ VI divided slots into type categories (Economic, Military, Diplomatic, Wildcard). Civ VII removes type restrictions. `[INFERRED]`
- **Civ-unique civic tree is a first-class UI feature** -- Civ VI had unique leader abilities but no separate per-civ civic tree tab. Civ VII formalizes this with 3--4 dedicated nodes per civ per age.
- **Government selection is locked per age** -- Civ VI allowed government changes mid-game with an anarchy penalty. Civ VII binds the player to one government for the full age.
- **Ideology is a permanent Modern Age branch-lock** -- Civ V had Ideologies; Civ VI removed them. Civ VII reintroduces them as a dedicated Modern Age civic branch with permanent commitment semantics.
- **Policy slots start small and grow by age** -- Civ VI often gave players many slots by mid-game. Civ VII enforces scarcity (1 slot in Antiquity) and expands capacity across ages.
- **Mastery as a second research tier** -- Civ VI had no mastery concept for civics. Civ VII adds a discrete optional second tier to most civics at ~80% additional cost.

---

## UI requirements

- **Civic Tree Panel** -- full-screen or large overlay showing the current age shared civic tree as a node graph; prerequisite arrows connecting nodes; each node shows name, remaining culture cost, unlock description, mastery cost and description. A tab control switches between shared tree and civ-unique tree. Accessible by TopBar button and keyboard shortcut.
- **Active Civic Progress HUD** -- persistent indicator showing: current civic being researched, remaining culture cost, estimated turns to completion (cost / culturePerTurn).
- **Policy Slot UI** -- accessible from a government/policy panel; shows all policy slots with slotted cards; allows selecting available standard policies and traditions. Clearly distinguishes traditions (quill icon, persists across ages) from standard policies (age-expiry marker).
- **Government Selection Screen** -- triggered on age start; presents available government cards with their bonuses; once confirmed, locked for the age.
- **Ideology Selection Screen** -- triggered on `Political Theory` civic completion; presents three ideology cards with full policy sub-trees; permanent commitment warning.
- **Tradition Pool** -- section within the policy UI listing all earned traditions from past and present ages; shows quill icon, source civ name, and effect description.
- **Notification: Civic Researched** -- toast when a civic completes; shows name, key unlock, and prompt if the unlock requires a player decision (e.g. government selection).
- **Notification: Mastery Available** -- indicator on completed civic nodes when mastery can be started.
- **Future Civic Indicator** -- end-of-tree nodes are visually distinct to communicate the bonus end-of-tree research opportunity.

---

## Edge cases

- What if the player does not select a civic to research? `[INFERRED]` Culture accumulated without a selected target is likely lost or auto-routed to the cheapest available civic. Exact behavior unconfirmed.
- What if the player is eliminated mid-age? Their tradition pool is irrelevant; eliminated players do not participate in further turns or age transitions.
- What if in-progress civic research is interrupted by the age transition? Partial progress is lost; no partial-credit mechanism is documented. [Source: PCGamer]
- What if the government unlock depends on a specific crisis response? The three crisis-unlocked Exploration governments require specific Bourgeoisie Crisis choices; a different resolution leaves those governments unavailable. `[INFERRED]` from Game8 unlock conditions.
- What if all civic tree nodes are researched before the age ends? The player researches `Future Civic` repeatable nodes for +10 Age Progress and next-age research boosts.
- What if the player earns a tradition but has no open policy slots? `[INFERRED]` The tradition enters the pool and can be slotted when a slot opens. Traditions are never auto-discarded.
- What if two players select the same government or ideology? Both receive their individual effects; governments and ideologies are not mutually exclusive across players.
- What if the player wants to switch ideology after selection? Explicitly not allowed; ideology is permanently locked. [Source: The Gamer Modern Age guide; Screen Rant ideology]
- What if a civ-unique civic unlocks a wonder already built by another player? `[INFERRED]` The civic is still researchable and its passive or tradition is still granted; only the wonder build is blocked by standard wonder exclusivity.
- What happens to slotted standard policies at age transition? All standard (non-tradition) policies become obsolete and are removed from slots. [Source: Game Rant Traditions guide; PCGamer]
- What if the player does not select an ideology before the Modern Age ends? `[INFERRED]` The ideology branch remains unresearched; no forced auto-selection mechanism is documented.

---

## Open questions

- **Exact total civic count per age** -- sources name individual civics but provide no definitive total count per age. Needed for `GameConfig` tree sizing. Checked Fextralife, Game8, The Gamer -- no explicit total found.
- **Government unlock mechanism** -- Game8 lists Antiquity governments as unlocked via `Chiefdom` civic; other sources imply available at age start. `[source-conflict]`. Needs in-game verification.
- **Mastery cost 80% vs 100%** -- Fextralife cites 80%; one source claims equal to base cost. Unresolved `[source-conflict]`.
- **Wildcard slot official confirmation** -- the wildcard characterization comes from secondary sources; Firaxis dev diaries do not explicitly use the term. `[INFERRED]`.
- **Theology sub-tree full size** -- sources document only two nodes (`Theology` and `Reformation`). Whether this is the complete sub-tree is unconfirmed.
- **Unique civ civic count (3 vs 4)** -- sources say three to four per civ but never specify which civs have which count.
- **Future Civic exact culture cost** -- not documented in any accessible source. `[INFERRED]` scales with the age cost range.
- **Culture overflow behavior** -- the overflow-rolling mechanic is standard Civ series design but not explicitly confirmed for Civ VII. `[INFERRED]`.
- **Policy slot count at Antiquity start** -- most sources say 1 slot; verify in-game before implementing.

---

## Mapping to hex-empires

**Status tally:** 0 MATCH / 3 CLOSE / 5 DIVERGED / 4 MISSING / 1 EXTRA
**Audit:** [.codex/gdd/audits/civic-tree.md](../audits/civic-tree.md)
**Highest-severity finding:** F-03 — TRANSITION_AGE does not reset civic state (DIVERGED, HIGH)
**Convergence status:** Divergent — 5 finding(s) require(s) architectural refactor

_(Full details in audit file. 13 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

The two Fandom wiki URLs (Civics and List of civics) both returned HTTP 403 during research. All Fandom-attributed information was gathered via WebSearch summaries referencing those pages, supplemented by Fextralife, Game8, and gaming-press sources. Content quality is good but depth on specific prerequisite graphs and exact per-civic costs is shallower than direct Fandom access would provide.

The governments section relies on Game8 structured table data, which appears reliable and detailed. The ideology section is well-sourced across three independent sources. The traditions mechanic is among the best-sourced sections (Game Rant Traditions guide is comprehensive and specific).

The mastery cost discrepancy is a genuine source conflict that should be resolved by in-game verification before implementation.

<!-- END OF TEMPLATE -- do not add sections after this line. -->