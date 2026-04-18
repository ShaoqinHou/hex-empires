# Celebrations — Civ VII

**Slug:** `celebrations`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

Every factual claim MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://civilization.fandom.com/wiki/Celebrations_(Civ7) — Fandom: Celebrations (Civ7) [HTTP 403 at research time; mechanics cross-verified via community sources]
- https://game8.co/games/Civilization-7/archives/493261 — Game8: Celebrations Guide (Civ7)
- https://steamcommunity.com/sharedfiles/filedetails/?id=3455882456 — Steam Community Guide: Happiness and Celebrations thresholds
- https://www.thegamer.com/civilization-7-happiness-guide/ — TheGamer: Happiness Guide (Civ7)
- https://www.gamespot.com/articles/civilization-7-dev-diary-3-empire-management/1100-6528521/ — Firaxis Dev Diary #3: Empire Management
- https://forums.civfanatics.com/threads/happiness-and-celebrations-mechanics.693811/ — CivFanatics: Happiness and Celebrations thread

**Source conflicts noted:** Celebration duration at Standard speed is 10 turns (Steam guide, Game8); TheGamer omits a specific number. Government bonus options documented only for Antiquity governments (Game8); Exploration and Modern bonuses are [INFERRED]. Civil unrest timer value conflicts between community sources.

---

## Purpose

Celebrations replace the Golden Ages mechanic from Civilization V and VI, shifting from a binary toggle to a continuous accumulating happiness meter that triggers escalating rewards. Rather than banking excess happiness until a threshold unlocks a fixed global bonus, players make active governance choices at each Celebration trigger, picking which domain the current celebration amplifies. This design supports the Civ VII philosophy that choices matter throughout the game and directly ties happiness infrastructure investment to meaningful mid-game power spikes, while keeping unhappiness a real threat through the civil unrest system.

---

## Entities

- `PlayerState.globalHappiness` — (RW) — the empire-wide accumulator that fills toward Celebration thresholds; increments each turn based on net happiness from all settlements
- `PlayerState.celebrationCount` — (RW) — integer counting Celebrations triggered this age; determines which threshold is next and how many Social Policy slots have been unlocked
- `PlayerState.activeCelebration` — (RW) — null or { bonusId: string, turnsRemaining: number } indicating current active bonus
- `PlayerState.socialPolicySlots` — (RW) — permanent count of unlocked policy slots; incremented by 1 on each Celebration trigger; persists across age transitions
- `CityState.happinessLocal` — (RW) — per-city happiness balance; positive values contribute to global accumulator; negative values trigger yield penalties and civil unrest
- `CityState.civilUnrestTimer` — (RW) — countdown in turns before a settlement in sustained negative happiness flips allegiance; reset when local happiness returns to zero or above
- `GameState.age` — (R) — determines which threshold table to use (Antiquity, Exploration, or Modern)
- `GameState.gameSpeed` — (R) — scales Celebration duration; threshold values above are for Standard speed

---

## Triggers

- On **END_TURN** (every turn, all players) — happiness accumulator ticks: each city's net local happiness is summed; globalHappiness increments; if it crosses the current threshold, a Celebration triggers
- On **CELEBRATION_TRIGGERED** (when accumulator crosses threshold) — player is presented with a government-gated bonus menu; chosen bonus activates for CELEBRATION_DURATION[gameSpeed] turns; celebrationCount increments; socialPolicySlots increments by 1; threshold index advances (capped at index 6)
- On **CELEBRATION_EXPIRED** (when activeCelebration.turnsRemaining reaches 0) — bonus effect removed; if happiness still exceeds the frozen threshold, another Celebration triggers on the next END_TURN
- On **age transition** — globalHappiness resets to 0; celebrationCount resets to 0; activeCelebration cleared; threshold table switches to the new age; socialPolicySlots carries forward permanently
- On **LOCAL_UNHAPPINESS** (when CityState.happinessLocal < 0 for any city) — per-city yield penalty applies immediately; civilUnrestTimer begins counting down
- On **CIVIL_UNREST_EXPIRY** (when civilUnrestTimer reaches 0 with happiness still negative) — settlement may flip to an Independent Power or become a free city [INFERRED]

---

## Mechanics

### Local vs. Global Happiness

Civ VII uses a two-tier happiness model. **Local Happiness** is tracked per city and measures whether a specific settlement is well-administered. It is affected by specialist maintenance costs, building upkeep, certain tile improvements, and population size. When a city's local happiness is positive, it contributes that amount to the empire-wide **Global Happiness** accumulator each turn. When negative, it imposes yield penalties on that city and starts a civil unrest countdown. Negative local happiness does NOT subtract from the global accumulator — it simply contributes zero.

1. Each END_TURN: iterate all player-owned cities
2. For each city: compute netLocalHappiness = happinessSources minus happinessDrains
3. If netLocalHappiness > 0: add to globalHappinessDelta
4. If netLocalHappiness < 0: apply yield penalty (see Formulas); start or continue civilUnrestTimer
5. If netLocalHappiness >= 0 and unrest timer was running: reset civilUnrestTimer
6. Add globalHappinessDelta to PlayerState.globalHappiness

### Celebration Thresholds

The accumulator is checked against a table of 7 escalating thresholds per age. Once it crosses a threshold, a Celebration triggers and the next threshold becomes active. The 7th threshold is the final one and does not advance further, enabling a forever-golden state where sustained high happiness triggers rapid successive Celebrations.

| Celebration # | Antiquity | Exploration | Modern |
|---|---|---|---|
| 1 | 200 | 799 | 1,331 |
| 2 | 349 | 1,396 | 2,327 |
| 3 | 569 | 2,275 | 3,791 |
| 4 | 773 | 3,093 | 5,155 |
| 5 | 962 | 3,850 | 6,416 |
| 6 | 1,137 | 4,546 | 7,576 |
| 7 | 1,296 | 5,182 | 8,636 |

(Source: Steam Community Guide; values cross-verified against Game8 forum posts.)

To sustain continuous Celebrations past threshold #7, a player needs approximately 130 / 520 / 864 net happiness per turn in Antiquity / Exploration / Modern respectively. [INFERRED: derived by dividing threshold #7 by a representative late-age turn count; exact sustained rate for continuous triggering is not explicitly stated in sources.]

### Government-Gated Bonus Menu

When a Celebration triggers, the player is presented with 2 bonus options specific to their current government. The bonus activates for a duration scaled by game speed (10 turns at Standard). Each government offers two thematic options — typically one yield-focused and one production-focused — reflecting that government's design philosophy.

Documented Antiquity government bonuses (from Game8):

| Government | Option A | Option B |
|---|---|---|
| Classical Republic | +20% Culture empire-wide | +15% Production toward Wonders |
| Despotism | +20% Science empire-wide | +30% Production toward Infantry units |
| Oligarchy | +20% Food empire-wide | +30% Production toward Buildings |

Exploration and Modern government bonus options follow the same two-option pattern [INFERRED; specific values not sourced for those ages].

### Social Policy Slot Unlock

Every Celebration trigger permanently unlocks one additional Social Policy slot regardless of which bonus was chosen. These slots carry forward across age transitions. A player who triggers all 7 Celebrations across all 3 ages can unlock up to 21 additional policy slots. [INFERRED: 7 times 3 = 21; theoretical maximum; policy system maximum slot count unconfirmed.]

### Unhappiness and Civil Unrest

When a city's local happiness drops below zero, two effects run in parallel:

1. **Yield penalty** — the city's yields are reduced by 2% per point of negative local happiness, capped at -50 local happiness (100% penalty).
2. **Civil unrest countdown** — a timer begins. If local happiness is not restored before the timer expires (~9 turns at Standard speed per community reports), the settlement may rebel and flip to an Independent Power.

The civil unrest mechanic creates urgency: players cannot safely ignore unhappy cities for more than a handful of turns.

### Leader Synergies

Two confirmed leaders interact directly with the Celebrations system:

- **Jose Rizal** — grants +50% happiness generation toward the next Celebration threshold and extends Celebration duration by 50% (from 10 turns to 15 turns at Standard speed). Premier Celebrations leader in Antiquity. (Source: Game8 leader guide.)
- **Ashoka** — during an active Celebration, all settlements receive +10% Food production. Synergizes with population growth strategies. (Source: Game8 leader guide.)

---

## Formulas

```
-- Global happiness tick (per END_TURN)
globalHappinessDelta = SUM over all cities: max(0, city.happinessLocal)
PlayerState.globalHappiness += globalHappinessDelta

-- Celebration threshold check
currentThreshold = THRESHOLDS[age][min(celebrationCount, 6)]
if globalHappiness >= currentThreshold: triggerCelebration()

-- Yield penalty for unhappy city
yieldPenalty(city) = min(1.0, max(0, -city.happinessLocal) * 0.02)
-- caps at 100% penalty when happinessLocal <= -50

-- Celebration duration by game speed
CELEBRATION_DURATION = { online: 5, quick: 10, standard: 10, epic: 15, marathon: 30 }
-- quick and standard both yield 10 turns (Steam community guide)

-- Jose Rizal duration modifier
adjustedDuration = baseDuration * 1.5   -- when Rizal is the active leader
```

Where:
- `THRESHOLDS[age][n]` = threshold table above, 0-indexed (n=0 for Celebration #1, n=6 for Celebration #7)
- `yieldPenalty` = fraction multiplied against base city yields (0.02 per point = 2% per point below zero)
- `baseDuration` = CELEBRATION_DURATION[gameSpeed] in turns
- Threshold values above are for Standard speed; Online/Marathon scaling is [INFERRED] but not explicitly sourced

---

## Interactions

- `systems/government-policies.md` — government type gates the bonus menu at Celebration; switching government changes available bonuses; Social Policy slot unlocks interact directly with the policies system
- `systems/settlements.md` — city population, specialists, and building maintenance drive local happiness; city growth and local happiness form a bidirectional feedback loop
- `systems/yields-adjacency.md` — yield penalties from unhappiness reduce outputs computed by the yields system; Celebration bonuses are modifiers applied on top of yields-adjacency calculations
- `systems/ages.md` — age transitions reset the accumulator and switch threshold tables; permanent Social Policy slots carry forward into subsequent ages
- `systems/leaders.md` — Jose Rizal and Ashoka have direct Celebrations synergy abilities; leader selection is the primary balancing lever for optimizing this system
- `systems/buildings-wonders.md` — Celebration bonus options include Wonder production bonuses; happiness-producing buildings are the supply side of the happiness economy
- `systems/diplomacy-influence.md` — [INFERRED] civil unrest events may generate diplomatic notifications or create windows for rival interference actions
- `systems/independent-powers.md` — civil unrest expiry can cause a city to defect to an Independent Power; the catastrophic failure state of the unhappiness system
- `systems/legacy-paths.md` — [INFERRED] one or more legacy paths may reward total Celebration count or total happiness accumulated over an age
- `systems/victory-paths.md` — [INFERRED] Culture or Diplomatic victory paths may have Celebration-count checkpoints

---

## Content flowing through this system

- [`content/governments/`](../content/governments/) — 12 government types, each with 2 Celebration bonus options per age; primary content input for the bonus menu
- [`content/leaders/`](../content/leaders/) — Rizal and Ashoka have abilities keyed to this system; other leaders may have passive synergies
- [`content/buildings/`](../content/buildings/) — entertainment-type buildings and improvements that generate local happiness; the supply chain for the accumulator
- [`content/social-policies/`](../content/social-policies/) — permanent Social Policy slot unlocks from each Celebration gate the available policy count

---

## VII-specific (how this differs from VI/V)

- **Accumulator replaces flip toggle** — Civ V/VI Golden Ages triggered as a one-off bonus when excess happiness hit a threshold; Civ VII's accumulator keeps filling and can trigger multiple Celebrations per age, rewarding sustained investment
- **Per-city local happiness** — Civ VI used a global happiness pool; Civ VII splits into local (per-city) and global (accumulator), making city-level mismanagement punish that city without poisoning the whole empire
- **Government-gated bonus choice** — previous games gave fixed Golden Age effects; Civ VII offers a government-specific menu, tying Celebrations to the player's governance style and making government selection strategically relevant to happiness
- **Permanent policy slots** — Civ VI Golden Ages gave temporary yield bonuses; Civ VII's permanent Social Policy slot unlocks mean Celebrations have lasting structural consequences beyond the 10-turn window
- **Civil unrest as a distinct failure state** — unhappiness in prior games reduced yields globally or prevented growth; Civ VII's unrest timer leading to settlement defection is a sharper, more immediate threat with a clear countdown
- **No happiness resource stockpile** — Civ VI had luxury resources directly granting +4 Amenities each; Civ VII's happiness is derived primarily from buildings, specialists, and government choices rather than map resources
- **Age-scoped reset** — accumulator and Celebration count reset each age transition, ensuring Celebrations remain relevant across all three ages rather than being solved once in Antiquity

---

## UI requirements

- **Happiness HUD element** — always-visible indicator on the main HUD showing current global happiness value and next Celebration threshold (e.g., 847 / 962 toward Celebration #5)
- **Celebration trigger modal** — when threshold is crossed, a modal (priority: modal) presents 2 government-specific bonus options with descriptions; player must choose before completing the next turn
- **Active Celebration indicator** — while a Celebration is active, a HUD badge shows the active bonus and remaining turns
- **Per-city happiness display** — in the City panel, local happiness shown as a signed integer with sources and drains itemized; civil unrest countdown visible when timer is running
- **Social Policy slot counter** — in the Government/Policies panel, unlocked slot count from Celebrations displayed separately from base slots
- **Notification trigger** — notify player when Celebration triggers (bonus selection prompt), when Celebration expires, and when city civil unrest timer reaches critical low (e.g., 2 turns remaining)
- **Threshold progress bar** — in the Happiness or Government panel, a visual bar spanning previous threshold to next with current accumulator position marked
- **Keyboard shortcut** — no canonical key documented; [INFERRED] likely accessible via Empire menu or a dedicated happiness/government shortcut

---

## Edge cases

- What if the player has no government selected at Celebration trigger? — The bonus menu cannot be presented; [INFERRED] either a default no-government bonus set is used or the Celebration is queued until a government is selected
- What if celebrationCount is already 6 (past Celebration #7) and happiness keeps accumulating? — Threshold freezes at index 6; each turn the accumulator exceeds it triggers another Celebration, creating a rapid-succession loop [INFERRED from community analysis]
- What if the player switches government during an active Celebration? — The already-active bonus continues until its timer expires; the new government's options apply only to the next Celebration [INFERRED]
- What if Jose Rizal is replaced at age transition? — Rizal's +50% duration and generation bonuses are lost at transition; the new leader's abilities apply going forward
- What if a city with negative local happiness is captured by an enemy? — The civil unrest timer is irrelevant once the city is no longer player-owned; the capturing player inherits the city's happiness state [INFERRED]
- What if multiple cities simultaneously reach civil unrest expiry? — Each city resolves independently; all could flip on the same turn [INFERRED]
- What if a Celebration bonus is active when the age transitions? — The active Celebration is cleared on age transition; the bonus effect ends immediately regardless of remaining turns
- What if globalHappiness somehow decreases below a previously crossed threshold? — Celebration count does not decrement; already-triggered Celebrations are not revoked; the next Celebration still requires the next higher threshold [INFERRED]
- What if the player triggers Celebration #7 many times in a high-happiness empire? — Each trigger still unlocks a Social Policy slot and presents a bonus choice; there is no documented cap on total slot accumulation [INFERRED]

---

## Open questions

- **Exact happiness values per building and improvement** — Game8 and Steam guide confirm the mechanic but do not enumerate all per-building +X happiness values; checked Game8 happiness guide, found only category-level descriptions
- **Civil unrest timer exact value** — Community reports say approximately 9 turns at Standard; checked TheGamer (says a few turns) and CivFanatics thread (says ~9 turns); no official source confirms and no game-speed scaling formula found
- **Exploration and Modern government bonus options** — Checked Game8 Celebrations guide; only Antiquity governments documented; six Exploration and three Modern government bonus menus are unsourced
- **Threshold scaling by game speed** — Steam guide documents Standard-speed thresholds only; checked CivFanatics thread; no per-speed threshold table found; whether Online/Marathon values are proportionally scaled is unconfirmed
- **Whether global happiness accumulator can decrease** — All sources describe only upward movement; checked Firaxis Dev Diary #3 and CivFanatics; luxury resource loss reducing the accumulator is undocumented
- **Maximum Social Policy slots from Celebrations** — Theoretical max is 21 across all three ages; unclear if the policies system has a hard slot cap; checked government-policies sources, no cap number found
- **Ashoka Food bonus exact scope** — Game8 states +10% Food in all settlements during Celebration; unclear whether this includes allied or Independent Power cities or only player-owned settlements
- **Legacy Path and Victory Path connections** — No source explicitly linked a victory or legacy condition to Celebration count; checked Firaxis Dev Diary #3 and legacy-paths sources; connection is [INFERRED]
- **Rival exploitation of civil unrest** — CivFanatics thread mentions rivals can exploit unrest but the mechanism (Influence action, military incitement, or automatic) is not documented

---

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._

---

## Author notes

Fandom wiki returned HTTP 403 at research time; core mechanics were reconstructed from Game8, TheGamer, the Steam community guide, and CivFanatics threads, then cross-verified. The 7-threshold table values are the most reliable part of this document — they appear verbatim in multiple independent community sources. The government bonus tables are the weakest part — only three Antiquity governments were documented; Exploration and Modern bonuses are [INFERRED] and should be verified before implementation. The civil unrest timer (~9 turns) and forever-golden happiness rate calculations are community-derived estimates that should be confirmed against patch notes or a data-mine before relying on them in engine formulas.

---

<!-- END OF TEMPLATE -- do not add sections after this line. -->
