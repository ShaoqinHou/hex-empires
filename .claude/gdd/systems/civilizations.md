# Civilizations — Civ VII

**Slug:** civilizations
**Bucket:** leaders-civs
**Status:** draft
**Confidence:** medium
**Last verified:** 2026-04-19
**Authoring model:** claude-sonnet-4-6

---

## Sources

Every factual claim in the sections below MUST trace to one of these, or be tagged [INFERRED] / [LLM-KNOWLEDGE-ONLY].

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/leaders-and-civs/ — Firaxis Dev Diary #2: Leaders and Civs (primary source)
- https://civilization.2k.com/civ-vii/game-guide/dev-diary/ages/ — Firaxis Dev Diary #1: Ages (historical-path unlock rules)
- https://civ7.wiki.fextralife.com/Civilizations — Fextralife: Civilizations list (civ roster by age, unique-ability names)
- https://civfanatics.com/civ7/civ-vii-gameplay-mechanics/civilization-vii-ages/ — CivFanatics: Ages mechanics (historical path examples)
- https://www.thegamer.com/civilization-7-guide-to-the-age-system/ — The Gamer: Age System guide (quest-based unlock examples)
- https://screenrant.com/civilization-7-civ-switching-mechanic-how-it-works/ — Screen Rant: Civ Switching (quest-completion mechanic, UI description)

**Source conflicts noted:** Minor inconsistency on Modern Age roster. Fextralife lists 9 civs (no Britain or Mughal). The Gamer roster index lists 11 (includes Britain and Mughal, suggesting DLC). Used Fextralife 9 as the confirmed vanilla base; Britain and Mughal tagged [INFERRED-DLC]. No other material conflicts found.

---

## Purpose

The Civilization system in Civ VII gives each empire a distinct cultural-historical identity that is age-specific rather than spanning the entire game. By binding civs to the age in which they historically peaked, Firaxis allows both numerically larger roster diversity and tighter thematic tuning (every civ unique component is immediately relevant when you play it). The system solves a chronic Civ-series problem: civs designed for the Ancient era feel stale or irrelevant in the Information Age. The linked age-transition mechanic — where players select a new civ at every age transition while keeping their leader — replaces the single-civ-for-whole-game paradigm from Civ VI and prior entries, and is the structural mechanism behind Civ VII three-act story design.

---

## Entities

- PlayerState.civId — (RW) — the active civilization; changes on every age transition
- PlayerState.civAge — (R) — the age this civ belongs to; must match GameState.currentAge
- PlayerState.unlockedCivIds — (RW) — set of civ IDs the player has unlocked for the upcoming transition, built up during the current age via historical paths, leader guarantees, and gameplay-based quest completions
- PlayerState.traditions — (RW) — Tradition slots populated from completed unique Civic Trees; persist across ages regardless of future civ choice
- PlayerState.leader.attributePoints — (RW) — attribute totals accumulated across ages; persist and are unaffected by civ change (see systems/leaders.md)
- CivRegistryEntry.uniqueAbilityId — (R) — read by the effects system to apply the civ passive bonus
- CivRegistryEntry.uniqueUnits[] — (R) — read by the production system; these units become available for training after the civ is adopted
- CivRegistryEntry.uniqueInfrastructure — (R) — improvement or quarter definition flagged ageless:true; read by city system to allow placement
- CivRegistryEntry.uniqueCivicTreeId — (R) — read by the civic system; determines which Tradition options become unlockable
- CivRegistryEntry.associatedWonderId — (R) — read by the production system; player gets an earlier unlock and production bonus for this wonder (not exclusive to the civ)
- CivRegistryEntry.startingBias — (R) — read by map-gen; geographic preference for starting position when the AI plays this civ
- CivRegistryEntry.playstyleCategories[] — (R) — read by the AI and transition UI to recommend civ/leader pairings

---

## Triggers

- On START_GAME: initial civ is selected from the Antiquity roster. Each human player picks one; the AI auto-selects based on historical/geographic ties to its leader.
- On AGE_TRANSITION_BEGIN (fired by the ages system when crisis resolves and age-end threshold is met): the transition UI opens; PlayerState.unlockedCivIds is evaluated to build the available-civ pick list for the next age. Human player must pick; AI auto-picks from its available set.
- On SELECT_CIV (dispatched by the player or AI during AGE_TRANSITION_BEGIN flow): PlayerState.civId is replaced with the chosen civ ID; the outgoing civ unique units are removed or obsoleted; the new civ unique units become trainable; the new civ unique infrastructure becomes buildable; the new civic tree becomes active.
- During any age (per turn): the civic system evaluates CivRegistryEntry.uniqueCivicTreeId each turn to determine whether a Tradition unlock threshold has been reached. When it has, a new Tradition is added to PlayerState.traditions.
- On QUEST_COMPLETE (gameplay-based unlock trigger): specific quest completions add a civ ID to PlayerState.unlockedCivIds. The unlock is for the next age, not the current one.
- On END_GAME: no civ transition; the Modern age civ is held until victory resolution.

---

## Mechanics

### Civilization identity — what a civ is

A civilization in Civ VII is a data bundle of six components, always tied to exactly one age. The six components are (per Firaxis Dev Diary #2):

1. **Unique Ability** — a passive empire-wide bonus that defines the civ strategic identity. Named in the registry and implemented in the effects system. Examples: Egypt Gifts of Osiris (Cultural/Economic), Rome Twelve Tables (Cultural/Militaristic).
2. **Unique Infrastructure** — either a unique improvement placed on the map (Han China: Great Wall) or a unique quarter built in a city (Rome: Forum, which combines the Temple of Jupiter and Basilica buildings into one slot). Infrastructure is flagged ageless:true, meaning it persists to subsequent ages even after the player transitions to a new civ. [INFERRED: ageless means the improvement/quarter already placed remains functional, but the new civ cannot build additional copies going forward.]
3. **Unique Civic Tree** — a civ-specific branch of the Civic research system. Completing milestones within it unlocks Traditions (see Traditions section below). The civic tree is replaced when the player transitions to a new civ, but unlocked Traditions persist.
4. **Associated Wonder** — a world wonder that the civ can unlock earlier than other civs via its unique Civic Tree, and receives a production bonus when building. The wonder is not exclusive — other civs can build it, just at standard cost and timing. [INFERRED: the earlier unlock means the wonder appears in the build queue before it is available to civs without this association.]
5. **Unique Units** — both a civilian variant and a military variant. Examples from Dev Diary #2: Han China Shi Dafu (a civilian mini Great People unit that provides one-time escalating-cost rewards); Maya Jaguar Slayer (a military scout replacement that leaves invisible traps on vegetated tiles). Unique units are specific to the age the civ belongs to.
6. **Starting Bias** — a geographic preference applied during map generation, affecting where the AI is seeded when playing this civ. Human players are not constrained by starting bias. [INFERRED: starting bias applies at game start for the initial Antiquity civ only; it has no meaning at transition since the empire position is already fixed.]

Each civ also carries **Playstyle Categories**: Military, Diplomacy, Expansion, Science, Culture, or Economy (each civ has two). These inform the transition UI pairing recommendations and the AI matching logic.

### Age-gated civ rosters

The game ships with three age-specific rosters (vanilla counts from Fextralife; DLC civs counted separately):

**Antiquity (10 vanilla):**
Aksum, Egypt, Greece, Han China, Khmer, Maurya India, Maya, Mississippian, Persia, Rome

**Exploration (11 vanilla):**
Abbasid, Chola, Hawaiʻi, Inca, Majapahit, Ming China, Mongolia, Norman, Shawnee, Songhai, Spain

**Modern (9 vanilla + at least 2 DLC-tagged):**
America, Buganda, French Empire, Meiji Japan, Mexico, Prussia, Qing China, Russia, Siam
[INFERRED-DLC]: Britain, Mughal (appear in some roster lists but not Fextralife; unconfirmed vanilla vs. DLC status)

No civilization appears in more than one age. [INFERRED: a Modern play of the same cultural lineage (e.g. Ming China to Qing China) requires the player to explicitly select the Exploration age civ and then the Modern age civ; the connection is player-driven, not automatic.]

### Civ-per-age switching — the core mechanic

At every age transition, each player replaces their civilization. Their leader persists unchanged. This produces the game three-act arc: the player is simultaneously one coherent narrative identity (the leader) and a series of civilizations that that leader shaped or was shaped by.

The transition civ-pick step is part of the broader age-transition flow defined in systems/ages.md. Within that flow, the civ-selection step:

1. Evaluates PlayerState.unlockedCivIds to build the pick list.
2. Filters the next age roster to only civs that appear in unlockedCivIds OR are in the default-available set (see Unlock rules section below).
3. Presents the filtered list to the human player via the transition UI. Each civ card shows: civ name, unique ability summary, playstyle categories, and a recommendation indicator if the civ pairs well with the current leader.
4. The player selects one civ. AI players auto-select by prioritizing historical-path civs (per Firaxis Dev Diary #1), then falling back to leader playstyle match.
5. The selected civ components immediately replace the outgoing civs (unique ability, unique units, unique civic tree, associated wonder). The outgoing civ unique infrastructure remains (it is ageless). Outgoing unique units currently in production: [INFERRED] likely complete as the old-civ variant; no source confirms.

The developers explicitly note that the design allows non-historical transitions — Egypt turning into Mongolia is achievable and intentional — to support What if? strategies (Firaxis Dev Diary #1).

### Unlock rules — three pathways

Three independent mechanisms add civ IDs to PlayerState.unlockedCivIds:

**1. Historical-path unlock (civ-based):**
Each civilization in a given age unlocks at least one civilization in the next age via a predefined historical or geographic connection. This is guaranteed — once the player plays a civ for an age, the connected next-age civ is added to their unlock set at transition time.

Confirmed examples (Firaxis Dev Diary #1 + CivFanatics):
- Antiquity Egypt unlocks Exploration Abbasid
- Antiquity Maurya India unlocks Exploration Chola India

The full table of all historical-path connections is not published in any accessible source and may require in-game data extraction to enumerate completely (see Open questions).

**2. Leader-based unlock (leader-guaranteed):**
Each leader guarantees at least one civ across the game regardless of which civs the player chose. This is a permanent unlock, not conditional on gameplay.

Confirmed examples:
- Leader Himiko (either persona) always unlocks Modern Meiji Japan (Firaxis Dev Diary #1)
- Leader Napoleon always unlocks Modern French Empire (CivFanatics)

The full leader-unlock table is not published. [INFERRED: every leader likely has one leader-guaranteed unlock for each of the two age transitions (Antiquity to Exploration and Exploration to Modern), though this cadence is unconfirmed.]

**3. Gameplay/quest-based unlock (achievement-based):**
Specific in-game actions completed during an age add a civ to the unlock set for the following age. These represent the non-historical What if? design intent.

Confirmed examples:
- Obtaining enough Horse resources in Antiquity unlocks Exploration Mongolia (CivFanatics)
- Settling three cities adjacent to mountains unlocks Exploration Inca (Screen Rant / The Gamer)

The full list of quest-based unlocks is not published.

**Default availability (baseline):**
[INFERRED from design intent] Even without any historical-path, leader, or quest-based unlocks, some minimum set of next-age civs must be available to every player to prevent situations where the player has zero choices. The exact composition of this default set is not documented in any accessible source.

### Traditions — the cross-age persistence of civic work

Each civ unique Civic Tree, when completed to specific milestones, unlocks **Traditions**. Traditions are social-policy-slot items that persist in PlayerState.traditions regardless of which civ the player adopts in future ages. They represent the lasting cultural legacy of having played a particular civilization.

Example from Firaxis Dev Diary #2: completing the Han China unique Civic Tree progressively unlocks the Guanxi, Jin Qing, and Tianxia Traditions. If the player transitions from Han China to Ming China (or any other Exploration civ), those three Han Traditions remain available as social policy options.

This means a player who played Han China in Antiquity carries forward three Traditions into Exploration and Modern ages — a concrete mechanical reward for civic investment independent of civ choice, and a mild form of historical continuity within the new-civ-each-age system.

[INFERRED: Traditions occupy one or more social policy slots. The number of slots is capped, creating a strategic choice about which earned Traditions to actually slot. The mechanic description in Dev Diary #2 does not enumerate slot counts.]

### Infrastructure persistence — ageless uniques across transitions

Unique infrastructure (unique improvements and unique quarters) is flagged ageless, meaning:
- Improvements/quarters already placed in the world or in cities remain in place and remain functional after the player transitions to a new civ.
- The new civ cannot build additional copies of the previous civ ageless infrastructure (those definitions are no longer in the active civ config).
- The new civ may add its own ageless infrastructure, which in turn persists into further ages.

This creates a cumulative layer of physical empire identity across ages: a player who played Han China (Great Wall), then Ming China, then Qing China would have visible infrastructure from all three eras in their empire at game end.

[INFERRED: ageless applies to unique infrastructure specifically, not to standard buildings or standard improvements, which reset or become obsolete at transition as documented in systems/ages.md.]

### Leader-civ decoupling and pairing logic

In Civ VI and prior entries, leader and civilization were a package deal (Cleopatra was Egypt; playing Egypt meant playing Cleopatra). In Civ VII they are fully independent selections. Any leader can be paired with any civilization.

The AI always pairs leaders with civs determined by historical ties or geographical ties (Firaxis Dev Diary #2). For human players, a portrait icon on the civ-selection card indicates a recommended pairing with the current leader, but the recommendation is purely advisory.

The strategic-optimization rule (from Dev Diary #2): match a leader playstyle categories (from the attribute system) to the civ playstyle categories for best synergy. Mixing a Militaristic leader with a Science-focused civ is valid but sub-optimal.

This decoupling also enables the personas system: leaders with personas (e.g. Napoleon as Emperor vs. Napoleon as Revolutionary) function as distinct leaders with distinct abilities that can be paired with different civs. Each persona has its own guaranteed civ unlock.

### The height-of-power design principle

The explicit Firaxis design intent (Dev Diary #2) is that every civilization in its roster age is competing at the height of its power. This means:
- Civ unique components (units, infrastructure, civic tree) are tuned to be competitive in the age they appear in, not globally balanced across all ages.
- A unique unit from Antiquity should be strong in Antiquity combat; the fact that it would be obsolete in Modern combat is irrelevant because the unit cannot exist in the Modern age under normal play.
- This allows Firaxis to include civs like Aksum and Maurya India that had no meaningful global presence outside their peak period — historically accurate framing without the gameplay penalty of being weak in the late game.

---

## Formulas



Where:
- defaultCivSet(age_n) = the minimum set always available; exact composition is [INFERRED], not published
- historicalPathUnlocks(civId, age_n) = static table mapping (current-age-civId, next-age) to Set<civId>; full table not publicly enumerated
- leaderUnlocks(leaderId, age_n) = static table mapping (leaderId, next-age) to Set<civId>; partial examples confirmed (Himiko to Meiji Japan; Napoleon to French Empire)
- questCompletionUnlocks(quests, age_n) = computed from which age-n quest conditions the player satisfied during the current age; full conditions not publicly documented
- traditionMilestone(civId, traditionId) = civic research threshold, per-civ; values not published

No numeric formulas apply to the civ-identity system itself (the unique ability values are per-civ constants in the civ registry, not computed). Numeric tuning lives in per-civ data files, not in this system.

---

## Interactions

- systems/ages.md — the age-transition flow owns the top-level sequence; the civ-selection step (SELECT_CIV) is called during AGE_TRANSITION_BEGIN. This system produces the new civId that the ages system consumes to rebuild per-age state.
- systems/leaders.md — leaders persist across civ transitions; the leader attributePoints are unaffected by civ change. The leader leaderUnlocks set is evaluated here to determine available civs at transition.
- systems/civic-tree.md — the civic system reads CivRegistryEntry.uniqueCivicTreeId each turn to track Tradition unlock progress. When civic milestones are reached, Traditions are added to PlayerState.traditions. The civic tree resets (new civ tree goes active) when SELECT_CIV fires.
- systems/tech-tree.md — tech trees are age-specific and reset at transition independently of this system. The civ does not change the tech tree structure, though [INFERRED] some civ abilities may reduce tech costs within the relevant age.
- systems/government-policies.md — Traditions produced by this system occupy policy slots managed by the government/policies system. The interaction point is PlayerState.traditions.
- systems/combat.md — unique unit definitions from CivRegistryEntry.uniqueUnits[] are deployed via the combat and production systems. Unique units go in/out of availability as the civ changes.
- systems/tile-improvements.md — unique infrastructure from CivRegistryEntry.uniqueInfrastructure is placed via the improvement system, which respects the ageless flag on transition.
- systems/buildings-wonders.md — the associated-wonder bonus (earlier unlock + production bonus) is read by the building/wonder system.
- systems/victory-paths.md — legacy milestones completed per age are not civ-specific, but some civ unique abilities may buff specific victory paths. The Victory system reads civId to look up ability effects.
- systems/narrative-events.md — narrative events can be tagged to specific civs (civId) and only fire if the player is currently playing that civ. Some events may also contribute to quest-based civ unlocks.

---

## Content flowing through this system

- content/civilizations/antiquity/ — 10+ Antiquity civs; each file holds the civ unique ensemble (ability, units, infrastructure, civic tree, wonder, starting bias, playstyle, historical-path connections)
- content/civilizations/exploration/ — 11+ Exploration civs
- content/civilizations/modern/ — 9+ Modern civs
- content/units/ — unique units per civ cross-referenced here; civ-unique unit slugs prefixed by civ name (e.g. egypt-medjay, han-shi-dafu)
- content/civics/ — unique civic trees referenced by CivRegistryEntry.uniqueCivicTreeId; Tradition items produced by completion
- content/wonders/ — associated wonder per civ; flagged with early-unlock and production-bonus data

---

## VII-specific (how this differs from VI/V)

- **One civ per age, not one civ per game.** The fundamental break from every prior Civ entry. In VI, the player chose Egypt at game start and remained Egypt until the game ended. In VII, the player chooses a new civ at each of the two age transitions, producing a three-civ arc.
- **Leaders and civs are fully decoupled.** In VI, leader and civ were a single package — playing Egypt meant playing Cleopatra. In VII, any leader can be paired with any civ, and the AI matches them by historical/geographic logic by default but players ignore this freely.
- **Age-specific rosters, not a universal list.** In VI, all civs competed on the same tech tree from Ancient to Future Era. VII three separate rosters mean civs only appear at their historical peak and are never weak in the late game.
- **Unique infrastructure is ageless and cumulative.** In VI, civ-unique improvements were tied to the single civ for the whole game. In VII, unique infrastructure built during past ages persists as physical layering across the empire.
- **Traditions persist the civic legacy.** In VI, switching civs would erase unique advantages entirely. In VII, the Traditions system ensures civic investment in one civ tree carries forward as policy options in future ages, softening the lose-everything feeling of transition.
- **Historical paths are a guided unlock system, not forced.** In VI, historical/geographic flavor was expressed only through starting bias and AI behavior. In VII, completing a civ in its age explicitly unlocks a historically-rooted choice for the next age.
- **Personas enable leader-within-leader diversity.** VI had no personas mechanic; each leader had one ability set. VII personas allow one historical figure (e.g., Napoleon) to appear as multiple distinct strategic variants, each with their own civ-unlock guarantees.

---

## UI requirements

- **Age Transition Modal — Civ Selection step:** a card-gallery view of available next-age civs filtered by the unlock set. Each card shows: civ name, art, playstyle categories (two icons), unique ability summary, recommended-pairing indicator. Player clicks a card to select; a Confirm button advances to the next transition step.
- **Civ Selection Filter indicator:** a tooltip or badge on each card indicating why that civ is available (historical path from [previous civ], leader guarantee from [leader name], quest completion: [quest name], or always available).
- **Traditions unlock notification:** when the player completes a unique Civic Tree milestone and a Tradition unlocks, a non-blocking toast notification fires (e.g. Han Tradition unlocked: Guanxi — now available in Social Policies).
- **Social Policy panel — Traditions section:** a dedicated section within the government/policies panel listing available Traditions inherited from past-age civs. Slotted vs. unslotted state visible.
- **Current Civ HUD badge:** the TopBar or side-panel shows the current civ icon and name at all times. On hover or click, shows the full unique ensemble (ability, units, infrastructure, civic tree snapshot, associated wonder).
- **Civ unique showcase popup:** at the start of the first turn of a new age, a modal shows the new civ full unique ensemble as a visual introduction. Dismissible.
- **Infrastructure ageless marker:** in city view and the map, ageless improvements/quarters have a visual marker indicating they came from a previous-age civ. [INFERRED: exact UI treatment not documented in any source.]
- **Pairing recommendation icon:** on the civ-selection card and in the main menu pre-game setup, the recommended-pairing portrait icon signals the historical/geographic fit between the current leader and the civ. Non-blocking.

---

## Edge cases

- **Player has zero quest-based unlocks and zero historical-path unlocks** — the default-available-civ set must always contain at least one civ so the player can advance. What that minimum set is, and which civ the player gets if they somehow pick nothing, is undocumented. [INFERRED]: at minimum the player sees the same civs the AI default path would use.
- **Two human players pick the same civ at transition** — civs are NOT mutually exclusive across players. Multiple players can adopt Rome, Abbasid, or any civ simultaneously. UI should show this is permitted, not a conflict.
- **AI player historical-path civ was already claimed by another AI** — not an issue; civs are freely duplicated per above.
- **Player tries to SELECT_CIV while a previous civ unique unit is mid-production** — [INFERRED] production completes as the old-civ unit; future productions use new civ units. No source confirms the exact rule.
- **Unique infrastructure of the previous civ was never built** — the player simply loses access to it; the new civ infrastructure becomes available. No retroactive placement.
- **Player triggers a quest-based unlock for a civ already in their unlock set** — harmless; duplicate IDs in unlockedCivIds are idempotent (set semantics).
- **Leader persona switch mid-game** — [INFERRED] not possible mid-game; persona is chosen at game start. If persona carries a leader-unlock guarantee, that guarantee applies at the relevant transition.
- **Traditions fill all available policy slots** — with three traditions from a prior age and a full policy slate, the player must decide which to equip. Overflow traditions remain in PlayerState.traditions as available but unslotted. No source documents whether there is a cap on the number of traditions that can accumulate vs. the number that can be slotted simultaneously.
- **Player is eliminated mid-age** — no transition for them. Their unique infrastructure on the map persists as neutral/unclaimed tiles (consistent with city/tile ownership behavior for eliminated players). Their unlocked civs are irrelevant.
- **A DLC civ appears as a historical-path unlock for a vanilla civ** — [INFERRED] a vanilla player who does not own the DLC would see this civ as locked/greyed in the transition UI, potentially breaking the always-available guarantee. Likely handled by Firaxis with a fallback civ. Unconfirmed.

---

## Open questions

- **Full historical-path unlock table** — the complete mapping of (Antiquity-civ to Exploration-civ) and (Exploration-civ to Modern-civ) is not published in any accessible source. The Firaxis Dev Diary #1 confirms the mechanic and provides Egypt to Abbasid and Maurya to Chola as examples; the complete table requires in-game data extraction or a community resource (Fandom wiki returned 403 for all civ-specific pages during this research pass).
- **Full gameplay/quest unlock conditions** — two examples confirmed (Horses to Mongolia; three mountain-adjacent cities to Inca). The complete list is not published.
- **Full leader-unlock table** — two confirmed (Himiko to Meiji Japan; Napoleon to French Empire). The complete table is not published.
- **Composition of the default available civ set** — which civs are available to every player regardless of paths/leaders/quests is not documented. Could be 1 civ (just one fallback), could be 3-4. Checked all sources; none enumerate it.
- **Tradition slot count / cap mechanics** — the number of Tradition slots in the policy system is not enumerated in any accessible source. Whether there is a cap on how many Traditions can accumulate is unknown.
- **Exact behavior of unique units in production at transition** — do they complete? Are they cancelled? Are they converted to a standard unit? No source confirms.
- **Modern Age vanilla roster size discrepancy** — Fextralife confirms 9 (no Britain, no Mughal); The Gamer roster index lists 11 (includes Britain and Mughal). Whether these are DLC or vanilla additions is unconfirmed from accessible sources as of 2026-04-19.
- **Whether each leader is guaranteed exactly one unlock per age transition, or a variable number** — the examples confirm at least one, but the invariant is not documented.

---

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._

---

## Author notes

The Fandom wiki (both Civilization_(Civ7) and Civilizations_(Civ7)) returned HTTP 403 for all requests during this research pass — these were the primary planned sources for civ-by-civ unique ensemble details. The Firaxis Dev Diary #2 page was accessible and is comprehensive on system mechanics. Fextralife provided the age-organized roster with unique-ability names. CivFanatics provided historical-path examples. The main gap is the complete historical-path connection table and per-civ unique ensemble details (unique unit names, improvement/quarter names, ability numeric values) — this information exists in the game data but was not accessible via public web sources in this pass.

The [INFERRED] tags are used conservatively. Mechanics that follow obviously from the system design (e.g. duplicate civ picks are harmless, overflow traditions are unslotted) are tagged [INFERRED] even when the inference is near-certain, because the distinction between obvious inference and confirmed fact matters for implementation fidelity.

<!-- END OF TEMPLATE — do not add sections after this line. -->
