# Government & Policies -- Civ VII

**Slug:** `government-policies`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4.6`

---

## Sources

- https://game8.co/games/Civ-7/archives/497975 -- Game8: All Governments in Civ7
- https://gamerant.com/civilization-7-how-get-more-policy-slots/ -- GameRant: How to Get More Policy Slots
- https://gamerant.com/civilization-vii-traditions-guide-how-to-get-tradition-cards-civ-7-social-policy-cards/ -- GameRant: Traditions Guide
- https://gamerant.com/civilization-7-civ-6-governments-compared/ -- GameRant: Civ 7 vs Civ 6 Governments Compared
- https://www.thegamer.com/civilization-7-policy-card-guide/ -- The Gamer: Policy and Crisis Cards Guide
- https://www.thegamer.com/civilization-7-civ-celebrations-explained-guide/ -- The Gamer: Celebrations Explained
- https://www.thegamer.com/civilization-7-vii-all-crisis-crises-guide/ -- The Gamer: All Crisis Types Explained
- https://www.thegamer.com/civilization-7-antiquity-age-guide/ -- The Gamer: Antiquity Age Guide
- https://forums.civfanatics.com/threads/how-do-policies-and-traditions-work.692738/ -- CivFanatics: How Policies and Traditions Work
- https://game8.co/games/Civ-7/archives/497227 -- Game8: Crisis Explained
- https://game8.co/games/Civ-7/archives/499521 -- Game8: Revolutions
- https://primagames.com/tips/how-to-change-social-policies-in-civilization-7 -- Prima Games: How to Change Social Policies
- https://www.well-of-souls.com/civ/civ7_overview.html -- Well of Souls: Civ VII Analyst Overview
- https://steamcommunity.com/app/1295660/discussions/0/591762729907258748/ -- Steam: How Do I Change Social Policies?
- https://game8.co/games/Civ-7/archives/499346 -- Game8: Chiefdom Civic and Effects
- https://game8.co/games/Civ-7/archives/498606 -- Game8: List of Policies

**Source conflicts noted:** Minor disagreement on government celebration duration -- some sources say 10 turns, others say 6 turns for Modern Age governments. Game8 lists 10 turns uniformly; Well of Souls says 6 turns for Modern. Flagged in Edge cases. Prima Games states policies cannot be swapped until new slots are acquired, while a Steam community discussion reports successfully swapping when a new civic is completed. These describe the same mechanic from different angles: swap is triggered by civic unlock, and locked otherwise.

---

## Purpose

The Government and Policies system is Civ VIIs political layer, letting players shape empire-wide strategy through a chosen form of government and a set of slotted policy cards. Governments are locked for the duration of each age and define which celebration bonuses are available; policies are slotted into a small number of wildcard slots and provide ongoing yield bonuses. The key VII change versus Civilization VI is the removal of policy slot categories -- there are no military/economic/diplomatic/wildcard slot types; every slot accepts any policy. This simplification eliminates the VI-era slot-type optimization puzzle and shifts focus toward the absolute value of available policies rather than fitting card types into typed holes. The system also introduces crisis policies -- mandatory negative policies that occupy slots late in each age -- and traditions, which are civilization-specific policies that persist across all three ages.

---

## Entities

- `PlayerState.governmentId` -- (RW) -- active government for this age; locked once chosen
- `PlayerState.policySlots` -- (RW) -- list of currently filled policy slot entries; grows via celebrations and civic research
- `PlayerState.policySlotCount` -- (RW) -- total number of available policy slots at any moment
- `PlayerState.availablePolicies` -- (R) -- pool of unlocked policies available to slot (driven by civic research)
- `PlayerState.traditions` -- (RW) -- list of tradition cards earned from this civ unique civics; persist across age transitions
- `PlayerState.activeCrisisPolicies` -- (RW) -- mandatory crisis policies occupying slots during crisis phase
- `PlayerState.crisisPolicySlotCount` -- (RW) -- grows through crisis stages (2 -> 3 -> 4 slots by final stage)
- `PlayerState.happinessTotal` -- (R) -- read by celebration trigger to determine when next celebration fires
- `GameState.currentAge` -- (R) -- determines which government roster is offered and which policy set is valid
- `GameState.crisisPhase` -- (R) -- when active, forces crisis policy slots; blocks END_TURN if not all filled
- `CityState.happiness` -- (R) -- aggregated across all cities to drive celebration trigger

---

## Triggers

- On **START_OF_AGE** (each age transition, after civ selection): `policySlots` resets -- Exploration Age resets to 2 slots, Modern Age resets to 3 slots [INFERRED: Antiquity starts at approximately 2 initial slots]. Government must be selected before the first turn of the new age. All standard policies from the previous age become obsolete; traditions are retained.
- On action **SELECT_GOVERNMENT**: player picks one government from the age roster. Locked for the remainder of the age. Triggers an initial policy slot allocation (+1 slot).
- On action **COMPLETE_CIVIC**: when a civic finishes research, the player is given a policy-swap window. They may replace existing slotted policies with newly unlocked ones.
- On **CELEBRATION_TRIGGER** (happiness threshold crossed): `policySlotCount` increases by 1. Celebration bonus effects (dictated by active government) activate for 10 turns [INFERRED: duration may differ in Modern Age, see Edge cases].
- On **CRISIS_STAGE_ADVANCE** (age progress milestones): `crisisPolicySlotCount` increments (2 slots at stage 1 -> 3 at stage 2 -> 4 at stage 3). Player must fill all crisis policy slots before END_TURN is allowed.
- On **END_OF_AGE** (age transition): all standard policies become obsolete; crisis policy slots clear; tradition cards persist into the new age.

---

## Mechanics

### Government Selection

At the start of each age, after selecting a new civilization, the player chooses one government from the age roster. Each age offers 3 standard governments selectable by any player, plus additional crisis-unlocked governments that become available only if the age crisis resolves in a particular way (see Crisis Governments below).

The player may choose only ONE government per age. Once chosen, it cannot be changed for the duration of that age -- there is no government-switching mechanic within an age, no anarchy period, and no cost to the initial selection. [INFERRED: The absence of mid-age switching is confirmed by multiple sources.]

Each government grants:
1. **One additional policy slot** added to the player base slot count on selection.
2. **Two celebration effects**: temporary yield bonuses that activate whenever the player triggers a celebration (by crossing the happiness threshold). These effects last for 10 turns per celebration. [Partial conflict: one source says 6 turns for Modern Age -- see Edge cases.]

Governments do not grant passive always-on bonuses beyond these two mechanics. The celebration bonuses are the substantive strategic differentiator between governments.

#### Antiquity Age Governments

| Government | Celebration Effect 1 | Celebration Effect 2 |
|---|---|---|
| **Classical Republic** | +20% Culture for 10 turns | +15% Production toward Wonders for 10 turns |
| **Despotism** | +20% Science for 10 turns | +30% Production toward Infantry Units for 10 turns |
| **Oligarchy** | +20% Food for 10 turns | +30% Production toward Buildings for 10 turns |

All three Antiquity governments are available from the start of the age alongside or shortly after the Chiefdom civic. [INFERRED: the exact unlock trigger is the initial civic selection in the first couple of turns.]

#### Exploration Age Governments (standard -- unlock on reaching Exploration Age)

| Government | Celebration Effect 1 | Celebration Effect 2 |
|---|---|---|
| **Theocracy** | +20% Culture for 10 turns | +40% Production toward Civilian and Support Units for 10 turns |
| **Plutocracy** | +20% Gold for 10 turns | +30% Production toward Overbuilding for 10 turns |
| **Feudal Monarchy** | +20% Food for 10 turns | +30% Production toward Cavalry and Naval Units for 10 turns |

The three Revolutionary governments below are only available if the Revolutions crisis fires during the Exploration Age (see Crisis Governments):

| Government | Celebration Effect 1 | Celebration Effect 2 |
|---|---|---|
| **Revolutionary Republic** | +100% Production toward Military Units | +6 War Support |
| **Revolutionary Authoritarianism** | +20% Culture and Science for 10 turns | +100% Influence toward Sanctions |
| **Constitutional Monarchy** | +40% Gold for 10 turns | +100% Influence toward Diplomatic Endeavors |

#### Modern Age Governments (standard -- unlock on reaching Modern Age)

| Government | Celebration Effect 1 | Celebration Effect 2 |
|---|---|---|
| **Authoritarianism** | +30% Production toward Military Units | +3 Combat Strength for all Units |
| **Bureaucratic Monarchy** | +20% Gold for 10 turns | +30% Relationship change from Endeavors and Sanctions |
| **Elective Republic** | +20% Culture for 10 turns | +20% Science for 10 turns |

Mexico civ-specific government (Modern Age):

| Government | Celebration Effects |
|---|---|
| **Revolucion** | +30% Culture, +50% Influence toward Diplomatic Actions, +30% Science, +40% Production toward Military Units |

---

### Policy Slots and Wildcard System

All policy slots in Civ VII are **wildcard** -- they have no category type (military, economic, diplomatic). Any policy can be placed in any slot. This directly reverses the Civ VI system, where slots were color-coded (red/yellow/green/purple) and only accepted matching card types.

**Slot acquisition sources:**

1. **Government selection**: +1 slot when government is first chosen at age start.
2. **Celebrations**: +1 slot per celebration triggered. Each successive celebration requires more happiness than the previous.
3. **Civic research**: specific civics unlock additional slots --
   - Antiquity: Philosophy civic grants +1 slot
   - Exploration: Bureaucracy and Diplomatic Service civics each grant +1 slot
   - Modern: Political Theory civic grants +1 slot
   - Civ-unique civics: Norman Common Law mastery grants +1 slot; Mexico Planes Politicos Mastery grants +1 slot
4. **Leader Attributes**: the third-tier Diplomatic leader attribute grants +1 slot [INFERRED: confirmed as valuable in late-game].

**Slot reset on age transition**: At the start of a new age, the slot count resets -- Exploration Age resets to 2 base slots; Modern Age resets to 3 base slots. [INFERRED: Antiquity may also start at 2 base slots, based on the first two policy card slots phrasing in sources.] Players re-accumulate additional slots through celebrations and civics within the new age.

---

### Policy Unlocking and Swapping

Policies are unlocked by researching civics in the civic tree. Each completed civic may unlock one or more standard policies, making them available to slot.

**Policy swap trigger**: When the player completes a civic, the game signals readiness for a policy change. At this point, the player may:
- Fill any empty slot with a newly unlocked policy.
- Replace a currently slotted policy with any other unlocked policy (including the new one or a previously unlocked one).

**Outside the civic-completion window**: Policies in filled slots are locked and cannot be swapped. There is no turn-by-turn policy management -- only civic completion and new-slot events open the swap window. This is distinct from Civ VI, where policies could be swapped for a gold cost once per era or during a golden age.

**No gold or production cost**: Sources do not describe any resource cost for policy swaps. The constraint is timing only -- swap opportunities arise at civic completion or new-slot events, not freely at will.

**Standard policies are age-scoped**: when the age ends, all standard policies become obsolete and are removed. Players re-select from the new age policy pool at the start of the next age.

---

### Traditions (Cross-Age Persistence)

Traditions are civilization-specific social policies that persist across all three ages. They represent the cultural legacy of each civilization and carry forward even when the player transitions to a new civilization at age boundaries.

**How traditions are earned**: A civilization unique civic tree includes specialized civics. Completing one of these unique civics unlocks the corresponding tradition card, which becomes permanently available to slot for the rest of the game -- including in all future ages.

**Traditions vs standard policies:**
- Standard policies: unlocked by any civ civic tree; become obsolete at age end.
- Traditions: unlocked by one specific civ unique civics; persist forever once earned.

**Cross-age availability**: If a player plays Rome in Antiquity and earns Rome tradition (Auxilia: +5% Production toward Military Units in the Capital for every Town), that tradition remains slottable in Exploration and Modern even after transitioning to a different civilization.

**Tradition slot mechanics**: Traditions occupy the same wildcard policy slots as standard policies. They compete for slot space with standard policies. [INFERRED: no dedicated tradition slot type exists -- traditions are just policies with age-persistence.]

**Example traditions** (from Game8 policy list and GameRant traditions guide):
- Rome Auxilia: +5% Production toward Military Units in the Capital for every Town
- Aksum Port of Nations: +2 Culture and +2 Gold for every active Trade Route
- Maya Miracles of the Twins: All units gain the Poison ability, +3 Combat Strength against wounded Units

---

### Crisis Policies

Crisis policies are a special category of mandatory Social Policy that activate during the crisis phase near the end of each age (typically beginning around 70% age progress, when `crisisPhase` transitions to active).

**Mandatory nature**: All crisis policy slots must be filled before the player can end their turn. The player cannot opt out of crisis policies.

**Debuff-forward design**: Most crisis policies impose negative yields or production penalties on the empire. Some carry conditional positive effects alongside the debuff -- for example, Prognosis increases Science yield while raising Gold maintenance costs. The player chooses the least-damaging set from the available pool.

**Staged escalation**: The crisis system adds policy slots in stages as age progress increases:
- Stage 1 (initial crisis onset, approximately 70% age progress): 2 crisis policy slots mandatory
- Stage 2 (mid-crisis): 3 crisis policy slots mandatory
- Stage 3 (final stage, age near 100% complete): 4 crisis policy slots mandatory

**Crisis types per age** (one randomly selected per playthrough):
- Antiquity: Plague (infected districts, population loss), Revolt (happiness collapse, city defection risk), Invasion (hostile independent powers spawn between empires)
- Exploration: Plague (advanced; Physician unit mitigates), Revolutions/Uprising (every yield reduced, class-struggle crisis policies), Wars of Religion (religious conversion creates advantages and disadvantages)
- Modern: [INFERRED -- Modern Age crisis types not confirmed by available sources]

**Crisis policies clear at age end**: when the age transitions, all crisis policy slots and their effects are removed. They do not carry into the next age.

---

### Crisis Governments (Revolutions Special Case)

The Revolutions crisis in the Exploration Age has a unique resolution mechanic that interacts directly with government selection. This crisis, themed around bourgeois revolutions and the rise of the merchant class, progresses through escalating stages of class conflict.

**At the final stage of the Revolutions crisis**: the class struggle peaks, and the player existing Exploration Age government is revoked. The player must immediately choose one of three revolutionary governments: Revolutionary Republic, Revolutionary Authoritarianism, or Constitutional Monarchy.

These revolutionary governments are only available via the Revolutions crisis -- they cannot be selected at normal age-start government selection if the Revolutions crisis did not fire.

**Immediate celebration on switch**: Choosing a revolutionary government immediately triggers a celebration, allowing the player to benefit from the revolutionary government bonuses on the very same turn. This makes the Revolutions crisis one of the few scenarios where a mid-age government change occurs.

**Revolutionary government bonuses**: The three revolutionary governments offer significantly stronger celebration bonuses than the three base Exploration Age governments (e.g. Revolutionary Republic grants +100% Production toward Military Units vs Feudal Monarchy +30% toward Cavalry and Naval Units).

---

## Formulas

```
// Policy slot total at any point in the age:
policySlotCount = BASE_SLOTS_FOR_AGE
                + 1                          // from government selection
                + celebrationsTriggered      // +1 per celebration
                + civicSlotBonuses           // from slot-granting civics researched this age
                + leaderAttributeBonus       // 0 or 1 from Diplomatic attribute tier 3

BASE_SLOTS_FOR_AGE:
  Antiquity   -> 2  [INFERRED from the first two policy card slots phrasing]
  Exploration -> 2  [confirmed: resets to two in Exploration Age]
  Modern      -> 3  [confirmed: resets to three in Modern Age]

// Crisis policy slots at stage N:
crisisPolicySlotCount(stage) = 1 + stage
  // stage 1 -> 2 slots, stage 2 -> 3 slots, stage 3 -> 4 slots

// Celebration threshold (qualitative model):
celebrationThreshold(n) = BASE_CELEBRATION_HAPPINESS * CELEBRATION_COST_MULTIPLIER ^ (n - 1)
  where n = celebration number (1st, 2nd, 3rd ...)
  BASE_CELEBRATION_HAPPINESS = [not published; tuned per balance]
  CELEBRATION_COST_MULTIPLIER = [not published; successive celebrations require more happiness]
```

Where:
- `BASE_SLOTS_FOR_AGE` is the slot floor after a transition reset
- `CELEBRATION_COST_MULTIPLIER` is the factor making each successive celebration harder to trigger; exact value not published by Firaxis
- `celebrationsTriggered` is bounded by happiness generation over the age

No numeric formula for swap costs -- policy swapping is constraint-based (timing window only), not resource-cost based.

---

## Interactions

- `systems/ages.md` -- age transitions reset standard policies and slot counts; government selection happens during the transition flow after civ selection.
- `systems/crises.md` -- crisis phase activation forces crisis policy slots; Revolutions crisis triggers forced government replacement; crisis resolution is required before age end.
- `systems/civic-tree.md` -- civic research is the primary mechanism for unlocking new policies and triggering swap windows; some civics directly grant additional policy slots.
- `systems/celebrations.md` -- each celebration grants +1 policy slot and activates the government two celebration effects for 10 turns.
- `systems/leaders.md` -- leader Diplomatic attribute tree grants +1 policy slot at tier 3.
- `systems/civilizations.md` -- civ-unique civics unlock tradition cards; tradition availability is tied to which civs the player has played across ages.
- `systems/victory-paths.md` -- policies that boost specific yields (Culture, Science, Gold, Military Production) feed directly into victory path milestone progression.
- `systems/yields-adjacency.md` -- most standard policies modify yield types (Food, Production, Culture, Science, Gold, Influence); they write to the yield calculation pipeline.

---

## Content flowing through this system

- [`content/governments/`](../content/governments/) -- all government entries (3 per age base + crisis-unlocked variants + civ-specific)
- [`content/policies/`](../content/policies/) -- all social policies (standard and unique/tradition); crisis policies are a sub-category here
- [`content/civics/`](../content/civics/) -- civic research that unlocks policies and traditions

---

## VII-specific (how this differs from VI/V)

- **All slots are wildcard**: Civ VI had four slot types (military red, economic yellow, diplomatic green, wildcard purple). Civ VII removes all slot types -- every slot accepts any card.
- **One government per age, locked**: Civ VI allowed government switching mid-game with an anarchy period or gold cost. Civ VII governments are permanent for the age.
- **Governments provide celebration bonuses, not always-on bonuses**: Civ VI governments gave always-active passive bonuses. Civ VII government bonuses are conditional on celebrations.
- **Traditions persist across all ages**: Civ VI had no cross-era policy persistence. Civ VII traditions from old civs remain slottable in future ages.
- **Crisis policies are a forced mandatory mechanic**: Civ VI dark-age system was passive. Civ VII crisis policies are explicit, mandatory negative-policy slots escalating to 4 slots by age end.
- **The Revolutions crisis can forcibly replace a government mid-age**: unprecedented in the series.
- **Policy swap window tied to civic completion**: Civ VI allowed once-per-era free swaps with gold cost. Civ VII ties swap windows to completing civics only.

---

## UI requirements

- **Government selection screen** (modal): appears at age start after civ selection. Shows 3 to 6 government options as cards, each displaying name, both celebration effects, and the +1 slot grant.
- **Policy panel** (overlay): accessed from TopBar or keyboard shortcut. Shows all policy slots as card slots, all unlocked policies as a card pool (with tradition cards visually distinguished), and active crisis policy slots when in crisis phase.
- **Policy swap notification**: banner or toast shown when a civic completes, indicating the player may now swap policies.
- **Celebration panel or toast**: appears when happiness threshold crossed. Shows the two government-specific celebration effects activating with turn countdown, and the newly unlocked policy slot.
- **Crisis policy overlay**: during crisis phase, crisis policy slots are highlighted. Turn-end is blocked if any crisis slot is empty.
- **Government status HUD element**: small persistent indicator showing active government name and current celebration bonus countdown (turns remaining).
- **Tradition card visual distinction**: tradition cards in the policy panel should be visually distinguished from standard policies so players know which policies persist past the next age transition.
- **Keyboard shortcut**: [INFERRED -- no confirmed shortcut for Government/Policy panel]

---

## Edge cases

- **Player triggers 0 celebrations in an age**: The government grants only +1 slot from selection and no celebration bonuses are activated.
- **Crisis policy slots vs standard policy slots sharing space**: [INFERRED: Crisis slots are likely separate from standard policy slots. If they share the same pool, a 4-slot final-crisis player would have no room for standard policies. Verify before implementing.]
- **Revolutions crisis fires and player prefers their existing Exploration government**: The forced government replacement at the crisis final stage is non-optional.
- **Player transitions ages without filling available policy slots**: Unfilled slots carry no benefit. Slot count resets on transition regardless.
- **Celebration duration conflict**: Game8 lists 10-turn celebration effects; Well of Souls lists 6 turns for Modern Age governments. [source-conflict]
- **Civ-specific government (Revolucion for Mexico) encountered by non-Mexico players**: Non-Mexico players presumably cannot select it. [INFERRED: civ-requirement filter on the government entry.]
- **Two policies providing the same yield bonus**: [INFERRED: they stack additively per standard Civ series convention.]
- **Player has no available policies to fill a newly-opened slot after a celebration**: The slot remains empty until a policy is unlocked via civic research.
- **Player carries traditions from multiple past civs**: Both traditions remain slottable in subsequent ages, competing for the same wildcard slot pool.
- **Government state before the first civic is completed**: [INFERRED: a default no-government state with base slots only.]

---

## Open questions

- Exact number of initial policy slots at Antiquity game start before any government is selected or civic researched.
- Whether crisis policy slots are separate from or share the same pool as standard policy slots -- mechanically critical.
- Exact trigger for initial Antiquity government selection -- Game8 shows Chiefdom civic unlocks two initial policies but does not confirm it triggers government selection.
- Celebration duration in Modern Age: 10 turns (Game8) or 6 turns (Well of Souls)? [source-conflict]
- Complete exhaustive list of standard policies per age -- Fandom wiki pages returned 403 during research.
- Complete list of crisis policies per crisis type and age -- partial list only from secondary sources.
- Whether France unique ability (select any government celebration effects in Modern Age) is a leader attribute, a unique tradition, or a special government entry.
- Modern Age crisis types -- not confirmed by available sources.

---

## Mapping to hex-empires

**Status tally:** 4 MATCH / 4 CLOSE / 0 DIVERGED / 0 MISSING / 0 EXTRA
**Audit:** [.codex/gdd/audits/government-policies.md](../audits/government-policies.md)
**Highest-severity finding:** F-03 — Exploration Age government roster wrong (CLOSE, HIGH)
**Convergence status:** Close — 4 numeric/detail adjustment(s) pending

_(Full details in audit file. 8 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

The Fandom Civ7 wiki pages for Government, List of Governments, and Policy all returned HTTP 403 during research. Content is assembled from Game8, GameRant, The Gamer, CivFanatics forums, Prima Games, Steam Community discussions, and the Civilization VII community analyst site (well-of-souls.com). Confidence is medium rather than high due to the 403 failures on primary wiki sources.

The policy swap mechanic has a surface-level source conflict: Prima Games says policies cannot be swapped until new slots are acquired; a Steam community member reports successfully swapping by clicking after a civic completes. The most coherent reading is that policies are only swappable during civic-completion events; at all other times slots are locked.

<!-- END OF TEMPLATE -- do not add sections after this line. -->
