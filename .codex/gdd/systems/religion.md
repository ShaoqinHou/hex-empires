# Religion (Pantheons & Religions) — Civ VII

**Slug:** `religion`
**Bucket:** `empire-mgmt`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

Every factual claim in the sections below MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://www.thegamer.com/civilization-7-how-religion-works-guide/ — TheGamer: How Religion Works in Civilization 7
- https://game8.co/games/Civ-7/archives/499399 — Game8: How to Found Religion and List of Beliefs
- https://gamerant.com/civilization-7-civ-7-how-to-found-a-religion/ — GameRant: How to Found a Religion
- https://gamerant.com/civilization-civ-7-how-missionaries-work-guide/ — GameRant: How Missionaries Work
- https://clawsomegamer.com/how-to-spread-your-religion-faster-in-civilization-7/ — Clawsome Gamer: Spread Religion Faster
- https://primagames.com/tips/how-to-spread-your-religion-in-civilization-7 — Prima Games: Spread Your Religion
- https://screenrant.com/civ-7-religions-improved-civ-6-op-ed/ — Screen Rant: Civ 7 Religion vs Civ 6
- https://screenrant.com/civ-7-all-pantheons-antiquity-age/ — Screen Rant: All Pantheons in Antiquity Age
- https://forums.civfanatics.com/threads/civ7-exploration-age-religion-tactics-and-thoughts.695647/ — CivFanatics: Exploration Age Religion
- https://forums.civfanatics.com/threads/pantheons-in-civ-7.695877/ — CivFanatics: Pantheons in Civ 7
- https://forums.civfanatics.com/threads/what-are-the-conditions-for-getting-the-2nd-and-3rd-founder-belief-for-your-religion.697541/ — CivFanatics: Founder Belief Conditions
- https://civ7.wiki.fextralife.com/Altar+Antiquity+Building — Fextralife: Altar Building
- https://www.digitalphablet.com/gaming/understanding-religions-role-in-civilization-7/ — DigitalPhablet: Understanding Religion
- https://www.thegamer.com/civilization-7-civ-religious-beliefs-tier-list-ranked/ — TheGamer: Religious Beliefs Ranked

**Source conflicts noted:**
- Screen Rant says Civ 7 removed Faith as a separate currency; other sources show missionaries purchased with Gold. Tagged `[INFERRED]` where relevant.
- Screen Rant says no limit to how many Religions can be established; CivFanatics confirms one-per-player with no competition. Consistent.
- Multiple sources confirm no passive pressure spread and no theological combat.

---

## Purpose

Civ VII's religion system is split cleanly across ages: **Pantheons** are a light, civic-gated belief system exclusive to Antiquity that provide empire-wide bonuses via Altar buildings, while full **Religions** are a distinct, active-missionary system exclusive to Exploration that drives the Cultural Legacy Path. The split solves the Civ VI problem where religion either snowballed into dominance or was ignored — in VII it is deliberately scoped: Pantheons add early-game texture without complexity, and Religions become the central Exploration-age mechanic for cultural players before fading in the Modern age. Eliminating passive pressure and theological combat further focuses the system on intentional player decisions (missionary deployment) rather than passive attrition.

---

## Entities

### Antiquity (Pantheon)

- `PlayerState.pantheon` — (RW) — the one Pantheon belief chosen after researching Mysticism; `null` if not yet chosen
- `CityState.hasAltar` — (R) — whether the settlement has an Altar building; Pantheon effects only apply to settlements with an Altar
- `GameState.takenPantheons` — (RW) — set of Pantheon IDs already claimed globally (most Pantheons are unique per game, first-come first-served)

### Exploration (Religion)

- `PlayerState.religion` — (RW) — the founded Religion object: `{ id, name, icon, holyCityId, reliquaryBelief, founderBeliefs[], enhancerBelief }`
- `PlayerState.missionaryChargeBonus` — (RW) — bonus charges beyond BASE_CHARGES from Theology Civic and Zeal belief
- `CityState.religion` — (RW) — which Religion currently holds the city; `null` if unconverted; locked permanently at end of Exploration age
- `CityState.urbanConverted` — (RW) — whether the urban population has been converted in the current missionary visit
- `CityState.ruralConverted` — (RW) — whether the rural population has been converted
- `CityState.isHolyCity` — (R) — true for the city where the first Temple was built; immune to foreign conversion
- `PlayerState.relicCount` — (RW) — total Relics held; contributes to Cultural Legacy Path milestone
- `GameState.religions` — (RW) — map of all founded Religions; one entry per player who founded one

---

## Triggers

- **On action `RESEARCH_CIVIC` where civicId = `mysticism`** (Antiquity) — player prompted to choose one Pantheon from global pool. Fires once per player per game.
- **On action `CONSTRUCT_BUILDING` where buildingId = `altar`** (Antiquity) — Pantheon effects become active for that settlement if the player has a Pantheon.
- **On action `RESEARCH_CIVIC` where civicId = `piety`** (Exploration) — unlocks Temple construction. Prerequisite only; religion not founded here.
- **On action `CONSTRUCT_BUILDING` where buildingId = `temple`, first Temple for this player** (Exploration) — triggers religion founding flow; player selects Reliquary Belief and first Founder Belief; city becomes Holy City.
- **On action `RESEARCH_CIVIC` where civicId = `theology`** (Exploration) — player selects Enhancer Belief; Missionary units gain +1 charge.
- **On action `SPREAD_RELIGION`** (Missionary use-charge action) — converts urban or rural population of target settlement; awards Relics on first-time foreign conversions per Reliquary Belief.
- **On condition `PlayerState.relicCount >= RELIC_THRESHOLD`** (Exploration) — Cultural Golden Age legacy milestone achieved. `[INFERRED threshold]`
- **On condition `PlayerState.religion.dominantShareGlobal >= threshold`** `[INFERRED]` — unlocks additional Founder Belief slots (exact thresholds unknown).
- **On age transition `EXPLORATION -> MODERN`** — all city religion affiliations become permanent (`CityState.religion` locked); Religion enters passive phase.
- **On END_TURN** (Antiquity, passive) — Pantheon effects contribute to Altar yields passively; no per-turn faith currency tracked. `[INFERRED]`

---

## Mechanics

### Pantheon (Antiquity Age)

Pantheons are the only religion-adjacent system in Antiquity. A Pantheon is not a religion — it is a single empire-wide passive bonus gated behind the **Mysticism Civic**. Once Mysticism is researched, the player selects one Pantheon belief from the global pool immediately.

There are **16 Pantheon beliefs** in the base game. Except for **Trickster God** and **God of Revelry**, each Pantheon may only be claimed by one civilization per game, first-come-first-served. (Source: community search results, CivFanatics.)

Pantheon effects are **not empire-wide by themselves** — they require an **Altar** building to activate per settlement. The Altar is an Antiquity-age Happiness building (Production cost: 90; Gold purchase: 360; Maintenance: 2 Gold/turn; base yield: +2 Happiness) unlocked via Mysticism. Altars also gain adjacency bonuses from terrain. The chosen Pantheon then further enhances those Altars (e.g., God of the Sun adds "+1 to every yield on the Altar").

**Pantheon beliefs do not carry to the Exploration Age.** Once Antiquity ends, the Pantheon is discarded. Pantheons do not lead to Religion founding — they are a completely separate system. This is an explicit break from Civ VI design.

Known Pantheon beliefs (partial — sources document 10 of 16):

| Pantheon | Bonus |
|---|---|
| City Patron Goddess | Altar grants +3 Influence |
| Earth Goddess | Altar +1 Happiness adjacency to mountains and wonders |
| Fertility Rites | Cities with altar receive 10% growth bonus |
| Goddess of Festivals | +1 Culture to quarters in settlements with altar |
| God of Healing | Units +5 healing on rural tiles |
| Goddess of the Harvest | +1 Food to farms, pastures, plantations with altar |
| God of the Forest | +1 Gold to camps and woodcutters with altar |
| God of the Forge | 10% production bonus toward buildings in cities with altar |
| God of the Sea | +1 Food to fishing boats in settlements |
| God of the Sun | +1 to every yield on the Altar |

The remaining 6 Pantheons are not documented in sources accessed during this research pass.

### Religion Founding (Exploration Age)

Full Religions are available in the **Exploration Age** only. Founding requires two prerequisites:

1. **Research the Piety Civic** — unlocks Temple construction.
2. **Construct a Temple** in any settlement — the first Temple completed triggers the founding prompt.

On the founding prompt, the player:
- Names their religion and selects an icon (cosmetic)
- Selects one **Reliquary Belief** (governs Relic earning)
- Selects one **Founder Belief** (per-settlement bonuses)

The city where the first Temple is built becomes the **Holy City**. Holy Cities are permanently immune to foreign conversion.

There is no scarcity limit on Religion founding — every player who meets the prerequisites can found a religion. No first-N-players restriction as in Civ V/VI. (Source: Screen Rant, CivFanatics.)

### Belief System

Each religion holds up to **four beliefs** across three slots:

| Slot | Count | When acquired |
|---|---|---|
| Reliquary | 1 | At religion founding |
| Founder | Up to 2 (possibly 3) | First at founding; additional slots unlock through gameplay |
| Enhancer | 1 | On Theology Civic research |

**Reliquary Beliefs** determine how the religion earns Relics. Known examples:
- **Icons** — +2 Relics per first-time conversion of a City-State (community-rated best)
- **Evangelism** — Relics for converting distant non-City-State settlements
- **Ecclesiasticism** — Relics for converting settlements with 10+ urban population
- **Lay Followers** — Relics for converting settlements with 10+ rural population
- **Reliquaries** — Relics for converting settlements containing Temples or Altars

**Founder Beliefs** provide ongoing yield bonuses per foreign settlement following your religion. Known examples:
- **Interfaith Dialogue** — +4 Science per foreign settlement following your religion
- **Tithe** — +4 Gold per foreign settlement following your religion
- **Desert Faith** — +2 Gold per Desert tile in settlements following your religion

**Enhancer Beliefs** modify spread mechanics (one per religion, via Theology Civic). Known examples:
- **Zeal** — +1 Missionary charge
- **Dawah** — Religion spreads via Trade Routes
- **Conversion** — New Distant Lands towns start with your religion
- **Stella Maris** — +2 movement to Missionaries when embarked; naval/embarked units +1 movement

**How additional Founder Belief slots unlock:** Not confirmed in official sources. Community reports suggest the second slot may unlock when a rival civilization is fully converted, and a third may involve Distant Lands conversion milestones. Poorly understood as of mid-2025 and may be partially bugged. `[source-conflict: community speculation; no official confirmation]`

### Missionary Mechanics

Missionaries are the sole active spread mechanic. There is no passive pressure and no theological combat in Civ VII.

**Availability and cost:**
- Trainable in any settlement with a Temple after researching Piety
- Purchasable directly for approximately 600 Gold (Source: Clawsome Gamer; may scale with game speed)
- Civilian units; cannot engage in or initiate combat; cannot harm enemy Missionaries

**Charges per Missionary:**
- Base: **1** `[INFERRED]`
- +1 on researching Theology Civic (total: 2)
- +1 from Zeal Enhancer Belief (total: 3)
- Maximum confirmed: **4** (Source: Clawsome Gamer)
- Unit is removed when all charges are spent

**Conversion process:**

Settlement conversion tracks **Urban** and **Rural** populations independently.

1. Move Missionary into or adjacent to the target settlement.
2. Use a charge on an **urban district tile** — converts the Urban population.
3. Use a charge on an **improved rural tile** (farm, pasture, quarry, mine, etc.) — converts the Rural population.
4. When both populations are converted, the settlement switches to your religion.

For **unoccupied** settlements (no existing religion): only **1 charge** needed.
For **occupied** settlements (different religion): **2 charges** needed (urban + rural); typically two turns.
(Sources: GameRant missionaries guide, TheGamer.)

The UI prevents charge waste: valid conversion tiles are highlighted; missionaries cannot use charges on already-converted tiles.

**Borders and wartime:** Missionaries do not require open borders. They operate during wars, though military control of territory (walls) may impede access. (Source: CivFanatics.)

**Reconversion dynamics:** If a rival missionary converts your city, you need only 1 charge to re-convert it (partial conversion state is retained). Contested dynamic especially around City-States, which offer high Relic rewards. (Source: CivFanatics.)

### Relics and the Cultural Legacy Path

Relics are the key currency linking religion to victory. They are **progression tokens** for the Cultural Legacy Path, not used to purchase units or buildings.

Relic sources during Exploration:
- **Reliquary Belief activation** — first-time conversions of foreign settlements per chosen Reliquary Belief
- **Wonder construction** — certain Wonders grant Relics `[INFERRED]`
- **Civics/Technologies** — certain research milestones award Relics `[INFERRED]`
- **Narrative Events** — some event choices award Relics (Source: Digitalphablet)

Relics are stored in and displayed from **Temples**, the **Palace**, or specific Wonders. Displayed Relics grant yield bonuses (Culture, Happiness). Collecting **12 Relics** during Exploration achieves the Cultural Golden Age legacy milestone. (Source: Digitalphablet, TheGamer.)

City-States are the most efficient Relic targets: they yield +2 Relics per conversion (Icons Reliquary Belief) and are typically less defended by rival religions early in the Exploration Age.

Spreading religion to foreign settlements may trigger revolts in those cities. (Source: Prima Games.)

### Modern Age (Reduced Role)

When the Exploration to Modern transition fires:

- All `CityState.religion` assignments are **permanently locked** — no conversion possible in Modern
- Missionary units become unavailable `[INFERRED]`
- Founder Belief bonuses continue applying passively for cities that retained your religion at freeze time
- Enhancer Belief passive effects persist `[INFERRED]`
- Religion is not the central focus in Modern — other systems dominate

The Modern age reflects thematic secularization. Accumulated belief bonuses persist passively; no new religious spread occurs.

---

## Formulas

```
// Pantheon activation per settlement
pantheonEffectActive(settlement) =
  settlement.hasAltar AND player.pantheon != null

// Missionary charge budget
missionaryCharges = BASE_CHARGES + theologyBonus + zealBonus
BASE_CHARGES   = 1     // [INFERRED]
theologyBonus  = 1 if Theology Civic researched, else 0
zealBonus      = 1 if Zeal Enhancer Belief chosen, else 0
MAX_CHARGES    = 4     // source: Clawsome Gamer

// Charges needed to convert a settlement
chargesNeeded(settlement) =
  if settlement.religion == null: 1    // unoccupied
  else: 2                              // occupied by different religion (urban + rural)

// Relic milestone
culturalGoldenAge = player.relicCount >= RELIC_THRESHOLD
RELIC_THRESHOLD = 12     // [INFERRED; needs official confirmation]

// Founder Belief yield
founderYield =
  SUM(belief.yieldPerForeignSettlement FOR EACH belief IN player.religion.founderBeliefs)
  * COUNT(foreignSettlementsFollowingPlayersReligion)
// Example: Tithe +4 Gold x 5 converted foreign settlements = +20 Gold/turn

// Religion freeze at age transition
religionFrozenAtExplorationEnd = true    // source: Screen Rant, web search
```

Where:
- `BASE_CHARGES` = 1 — base Missionary charges; `[INFERRED]`
- `RELIC_THRESHOLD` = 12 — Relics for Cultural Golden Age; `[INFERRED]`
- `MAX_CHARGES` = 4 — maximum Missionary charges; source: Clawsome Gamer
- Missionary Gold purchase cost approximately 600 — source: Clawsome Gamer; may scale with speed

---

## Interactions

- `systems/ages.md` — Pantheon is Antiquity-only, discarded at age transition; Religion is Exploration-only for active spread, freezing at Exploration-to-Modern transition. Ages govern both gate-opens and discards.
- `systems/legacy-paths.md` — Religion relic collection directly feeds the Cultural Legacy Path; reaching RELIC_THRESHOLD during Exploration triggers Cultural Golden Age legacy.
- `systems/civic-tree.md` — Mysticism gates Pantheon adoption; Piety gates Temple and religion founding; Theology gates Enhancer Belief selection and +1 Missionary charge.
- `systems/tech-tree.md` — Mysticism appears as both a civic and a tech in different sources; classification needs verification (see Open questions).
- `systems/buildings-wonders.md` — Altar (Antiquity) and Temple (Exploration) gate system activation per settlement. Wonders are a secondary Relic source.
- `systems/trade-routes.md` — Dawah Enhancer Belief converts settlements via Trade Routes; creates coupling between religion spread and trade.
- `systems/victory-paths.md` — Religion has no standalone victory path; it supports the Cultural Victory via relic-driven Cultural Legacy Path.
- `systems/settlements.md` — Missionary conversion acts on settlement tile structure; urban vs rural district tile distinction is part of the settlement model.
- `systems/narrative-events.md` — Some narrative events award Relics; religion-tagged events may appear in Exploration context.

---

## Content flowing through this system

- [`content/pantheons/`](../content/pantheons/) — 16 Pantheon beliefs (Antiquity-only); one file each
- [`content/religions/`](../content/religions/) — Exploration-age Religion belief pool (Reliquary / Founder / Enhancer options); belief options are data-driven
- [`content/buildings/`](../content/buildings/) — Altar (Antiquity, Mysticism-gated, gates Pantheon effects); Temple (Exploration, Piety-gated, gates religion founding and Missionary training)
- [`content/civics/`](../content/civics/exploration/) — Piety Civic (religion founding prerequisite); Theology Civic (Enhancer Belief + Missionary charge unlock)

---

## VII-specific (how this differs from VI/V)

- **Pantheon and Religion are fully decoupled.** In Civ VI, a Pantheon was the required first step toward founding a Religion via a Great Prophet. In Civ VII, Pantheons are Antiquity-only, Religion is Exploration-only, and neither leads to the other.
- **Pantheons do NOT persist to Exploration.** In Civ VI and V, Pantheons lasted until the founding religion was eliminated. In Civ VII, Pantheons are discarded at the Antiquity-to-Exploration transition with zero carry-forward.
- **No passive religious pressure.** Civ V and VI featured city-level pressure where each city continuously converted adjacent cities. Civ VII eliminates this entirely — only Missionaries convert settlements.
- **No theological combat.** Civ VI Apostles and Missionaries could fight to expel rivals. Civ VII Missionaries are purely civilian; they cannot harm each other.
- **No standalone Religious Victory.** Civ VI had a dedicated Religious Victory (convert most of every rival civ). Civ VII integrates religion into the Cultural Legacy Path via Relics.
- **No Faith purchasing currency.** Civ VI used Faith to buy units, buildings, and Great People. Civ VII Missionaries are purchased with Gold. `[source-conflict: Screen Rant says Faith removed; not confirmed by other sources]`
- **Holy City is permanently immune to conversion.** In Civ VI, Holy Cities could be converted by overwhelming pressure. In Civ VII, the Holy City is unconditionally immune.
- **No Great Prophets.** Civ VI required accumulating Faith to earn a Great Prophet before founding. Civ VII requires a civic + building — no Great Person intermediary and no inter-player scarcity race.
- **One Religion per player, unlimited total.** Civ VI capped total religions in a game. Civ VII has no such cap — every player completing Piety + Temple founds a religion.

---

## UI requirements

- **Pantheon selection modal** (Antiquity; fires on Mysticism research) — displays global Pantheon pool with claimed entries greyed out; player picks one. Non-blocking (optional).
- **Religion founding modal** (Exploration; fires on first Temple construction) — multi-step: (1) cosmetic name and icon; (2) Reliquary Belief picker; (3) first Founder Belief picker. Modal — permanent one-time decision.
- **Enhancer Belief picker** (Exploration; fires on Theology research) — single Enhancer Belief picker. Modal.
- **Additional Founder Belief picker** (Exploration; fires when unlock condition met) — belief picker for 2nd/3rd Founder Belief. Modal; trigger condition under-documented.
- **ReligionPanel** (persistent overlay; TopBar button or keyboard shortcut R `[INFERRED]`) — shows active religion: name, icon, Holy City, current beliefs, Relic count, which foreign settlements follow the religion. In Antiquity, shows adopted Pantheon instead.
- **Missionary action overlay** — when a Missionary is selected and in range of a target settlement, highlights valid urban and rural conversion tiles; shows charge cost and expected outcome.
- **Relic progress HUD** — persistent Exploration-age indicator showing Relic count vs the 12-Relic Cultural Golden Age milestone.
- **Notification: Rival Pantheon adopted** — toast when another player claims a unique Pantheon; signals reduced pool.
- **Notification: Rival Religion founded** — toast when a foreign player founds a religion.
- **Notification: City converted** — brief notification when one of your cities is converted by a foreign Missionary.
- **Notification: Enhancer Belief available** — fires on Theology Civic research, prompts player to open belief picker.
- **Exploration-end lock notification** — at the Exploration-to-Modern transition screen, show which cities finished following which religion and that affiliations are now permanent.

---

## Edge cases

- What if a player never researches Mysticism? No Pantheon for Antiquity — valid play; costs Altar-boosted yields.
- What if a player researches Mysticism but only the two non-unique Pantheons remain? They may still claim Trickster God or God of Revelry. If all 16 are claimed `[INFERRED]`, the player gets no Pantheon.
- What if a player reaches Exploration without researching Piety? Religion founding is blocked; no exclusion cost since there is no first-come scarcity.
- What if the Holy City is captured militarily? The city cannot be converted, but it can be captured. Whether military capture changes Holy City immunity is unclear from sources. `[INFERRED: immunity is tied to the city object; capture does not destroy the religion]`
- What if a Missionary runs out of charges mid-conversion (rural done, unit destroyed before urban)? `[INFERRED]` Rural population remains converted but city is not fully converted; Founder Belief bonuses require full conversion.
- What if two Missionaries from the same player target the same settlement on the same turn? `[INFERRED]` The second finds no valid targets once the first completes conversion; UI prevents charge waste.
- What if the Dawah Enhancer Belief is active and the trade route partner already follows your religion? Conversion trigger would be a no-op. `[INFERRED]`
- What if a City-State is conquered and annexed? Its religion affiliation is preserved `[INFERRED]`; but it is no longer a City-State, potentially affecting future Relic opportunities.
- What if the Exploration Age ends while a Missionary is mid-conversion? `[INFERRED]` The partial conversion freezes; the city follows whichever religion was dominant at that moment.
- What if the player reaches the 12-Relic threshold well before Exploration ends? Cultural Golden Age secured; additional Relics provide display yield bonuses but do not stack another legacy milestone.
- What if a player skips religion entirely in Exploration? They forgo Relics from conversion and miss the Cultural Golden Age. Other three Legacy Paths remain available.

---

## Open questions

- **Exact faith-currency status** — Screen Rant explicitly states Faith removed as separate currency; no other source directly confirms this. Needs Firaxis Dev Diary or Fandom wiki to resolve.
- **Missionary charge base** — Clawsome Gamer says max 4 charges; base implied as 1 (Theology +1 = 2; Zeal +1 = 3; fourth stacking source unnamed).
- **Conditions for 2nd and 3rd Founder Belief** — CivFanatics thread (May 2025) concludes these are not reliably understood. Suspected triggers: fully converting a rival civilization, Distant Lands conversion milestone. Unverified.
- **Mysticism: Civic or Tech?** — TheGamer calls it a Civic; Fextralife Altar page lists it as a technology. Correct classification matters for engine pipeline.
- **Pantheon effects without an Altar** — Do Pantheon effects require an Altar per settlement, or do some (e.g., God of Healing unit healing) apply empire-wide regardless of Altar presence?
- **Holy City military capture behavior** — No source addresses whether capturing the Holy City changes conversion immunity or religion system consequences.
- **Belief bonuses in Modern age** — Sources say Founder Belief bonuses persist passively. Whether spread-dependent Enhancer effects (e.g., Dawah trade route conversion) continue firing in Modern is not documented.
- **Fandom wiki 403** — Both https://civilization.fandom.com/wiki/Religion_(Civ7) and https://civilization.fandom.com/wiki/Pantheon_(Civ7) returned HTTP 403 during this research pass (Rank-2 canonical sources per README). All content reconstructed from secondary sources. A future research pass should re-attempt these pages.
- **Complete Pantheon list** — Only 10 of 16 Pantheons documented in accessible sources; 6 remain missing.
- **Complete Belief list** — Full Founder, Enhancer, and Reliquary lists are partially documented. Fandom Belief page (https://civilization.fandom.com/wiki/Belief_(Civ7)) was not directly accessed.

---

## Mapping to hex-empires

**Status tally:** 2 MATCH / 1 CLOSE / 3 DIVERGED / 3 MISSING / 1 EXTRA
**Audit:** [.codex/gdd/audits/religion.md](../audits/religion.md)
**Highest-severity finding:** F-01 — Pantheon missing Mysticism Civic prerequisite (DIVERGED, HIGH)
**Convergence status:** Divergent — 3 finding(s) require(s) architectural refactor

_(Full details in audit file. 10 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

The two primary Fandom wiki pages (Religion_Civ7, Pantheon_Civ7) returned HTTP 403 during this research session. This draft relies on secondary sources: TheGamer, GameRant, Game8, Screen Rant, CivFanatics, Clawsome Gamer, Prima Games, Fextralife, Digitalphablet. Mechanics are consistent across these sources, but numeric constants (charge base, Relic threshold, Gold cost for Missionaries) should be verified against the Fandom wiki when access is restored.

The religion system in Civ VII is notably simpler than in VI: no faith currency, no Great Prophets, no passive pressure, no theological combat. This makes it tractable to implement in hex-empires — it is a civic-gated unit (Missionary) performing a two-step conversion action that feeds a relic counter connecting to the cultural legacy path. The Pantheon subsystem is even simpler: a one-time choice after Mysticism research that buffs Altar buildings for the duration of Antiquity.

<!-- END OF TEMPLATE — do not add sections after this line. -->
