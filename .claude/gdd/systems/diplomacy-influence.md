# Diplomacy & Influence — Civ VII

**Slug:** `diplomacy-influence`
**Bucket:** `diplomacy`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/diplomacy-influence-trade/ — Firaxis Dev Diary #6: Diplomacy, Influence, and Trade
- https://civilization.fandom.com/wiki/Diplomacy_(Civ7) (403; via search summaries)
- https://civilization.fandom.com/wiki/Influence_(Civ7) (403; via search summaries)
- https://www.thegamer.com/civilization-7-diplomacy-guide/ — TheGamer
- https://www.gamesradar.com/games/strategy/civilization-7-diplomacy/ — GamesRadar
- https://www.pcgamer.com/games/strategy/civilization-7-influence-guide-how-to-make-friends-and-influence-people/ — PC Gamer
- https://game8.co/games/Civ-7/archives/496953 — Game8: Diplomacy
- https://game8.co/games/Civ-7/archives/499718 — Game8: War Weariness and War Support
- https://gamerant.com/civilization-vii-influence-guide-get-more-influence-tips-civ-7/ — Game Rant: Influence
- https://gamerant.com/civilization-7-how-form-alliance/ — Game Rant: Alliance
- https://screenrant.com/civilization-7-how-espionage-works-explainer/ — Screen Rant
- https://www.thegamer.com/civilization-7-civ-espionage-explained-guide/ — TheGamer: Espionage
- https://primagames.com/tips/what-is-war-weariness-in-civilization-7 — Prima Games

**Source conflicts noted:** Endeavor duration — TheGamer cites 15 turns, Game8 cites 7 turns — tagged `[source-conflict]`. Fandom wiki pages 403'd; content reconstructed from search summaries and secondary guides.

---

## Purpose

Diplomacy & Influence is Civ VII's complete redesign of inter-civilization relations. Rather than Civ VI's small-scale resource bartering at a deal table, VII shifts diplomacy to the grand-strategic level: players accumulate **Influence** as a new dedicated yield and spend it on formal Endeavors, Sanctions, Treaties, and Espionage Actions. The system makes diplomacy feel like statecraft rather than a trading minigame. The **War Support** sub-mechanic ties military conflict directly to domestic opinion, coupling combat effectiveness and diplomatic standing in a feedback loop.

---

## Entities

- `PlayerState.influence` — (RW) — stockpile
- `PlayerState.influencePerTurn` — (RW) — net generation
- `PlayerState.relationships` — (RW) — map of leaderId → RelationshipStage + opinion score
- `PlayerState.activeEndeavors` — (RW) — with timer, effect, partner
- `PlayerState.activeSanctions` — (RW)
- `PlayerState.activeTreaties` — (RW)
- `PlayerState.activeEspionageActions` — (RW) — covert actions in progress
- `PlayerState.warSupport` — (RW) — map of enemyPlayerId → warSupportValue
- `PlayerState.suzerainCityStates` — (RW) — set of IP IDs where Suzerain
- `PlayerState.befriendProgress` — (RW) — per-IP befriend points
- `PlayerState.alliances` — (RW) — set of allied leaderIds
- `GameState.wars` — (RW) — active wars with type (formal/surprise)
- `GameState.diplomaticHistory` — (RW) — log for opinion modifier lookups

---

## Triggers

- **On END_TURN** — accumulate `influencePerTurn`; tick timers on active agreements; advance Espionage progress; apply per-turn War Support effects
- **On PROPOSE_ENDEAVOR** — spend Influence; create pending offer
- **On RESPOND_ENDEAVOR** (support/accept/reject) — SUPPORT bilateral full bonus; ACCEPT free for recipient, reduced recipient bonus; REJECT refund proposer, deduct rejection cost
- **On PROPOSE_SANCTION** — spend Influence; target may accept/reject
- **On PROPOSE_TREATY** — spend Influence; bilateral on acceptance
- **On INITIATE_ESPIONAGE** — spend initial cost; begin covert progress
- **On DECLARE_WAR (formal)** — valid at Hostile; no penalty
- **On DECLARE_WAR (surprise)** — any target; massive War Support penalty scaling with prior relationship
- **On PROPOSE_PEACE** — open peace modal; cooldown ~10-15 turns `[INFERRED]`
- **On BEFRIEND_INDEPENDENT_POWER** — spend Influence to add befriend points
- **On LEVY_UNITS** — spend Influence to levy from City-State
- **On INCORPORATE_CITY_STATE** — 240 Influence over 5 turns to absorb
- **On ADD_WAR_SUPPORT** — 180 Influence to boost own War Support
- **On age transition** — Independent Powers respawn at turn 2; agreements beyond age boundary expire `[INFERRED]`

---

## Mechanics

### Influence as Diplomatic Yield

Influence is the sixth major yield (Food/Production/Science/Culture/Gold/Influence). Exclusive currency of diplomacy. Cannot be traded.

**Key generators by age:**
- Antiquity: Monument (+1), Garden (+1), Villa (+2)
- Exploration: Guildhall (+2), Dungeon (+2)
- Modern: Radio Station (+4), Opera House (+3)
- Social policy Oratory: +2
- Diplomatic Attribute Tree: +1/Age on Palace (cumulative)
- Wonders: Weiyang Palace (+6, Han-only Antiquity), Serpent Mound (+4), Doi Suthep (+4/City-State Suzerain)
- Leaders: Machiavelli +3/Age; Himiko supports Endeavors free
- Town Hub: +2/connected settlement

Base generation at Standard: ~10 Influence/turn starting.

**Critical constraint:** If Influence stockpile reaches 0 at turn start, all in-progress Espionage Actions are immediately cancelled.

### Relationship Stages (5 ordered)

1. **Helpful** — warmest; Alliance eligible; max cooperation
2. **Friendly** — positive; many Endeavors; Sanctions extra penalty
3. **Neutral** — default
4. **Unfriendly** — limited options; Trade Routes still possible
5. **Hostile** — most negative; Formal War eligible; Alliance blocked

Derived from opinion score. Exact thresholds not published.

**Opinion modifiers (partial):**

| Event | Effect |
|---|---|
| Endeavor accepted | +30 |
| Endeavor supported | +60 |
| Sanction accepted | -15 with target |
| Denounce | -60 |
| Espionage revealed | large negative |
| Razing settlement | negative + reduces razer's Influence/turn |
| Conquering | negative + reduces conqueror's Influence/turn |
| Border settling | negative, scaling `[INFERRED]` |
| Trade Route established | positive `[INFERRED]` |
| Agenda alignment/violation | per-leader specific |

### Endeavors

Mutually beneficial agreements. Proposer spends Influence; recipient chooses Support (full bilateral), Accept (free for recipient, reduced bonus), or Reject (pays rejection cost; proposer refunded).

Duration `[source-conflict]`: 7 (Game8) vs 15 (TheGamer) turns.

| Endeavor | Effect |
|---|---|
| Local Festival | +2/+3 Happiness |
| Military Aid | +2/+3 Combat Strength + Gold |
| Reconciliation | +30/+60 opinion |
| Research Partnership | +12-18 Sci |
| Cultural Exchange | +12-18 Cul |

Costs ~60-120 Influence.

### Sanctions

Punitive; proposer spends Influence. Target accept/reject. Accepting triggers -15 opinion.

| Sanction | Effect | Duration |
|---|---|---|
| Hinder Public Morale | -10% Happiness | 10t |
| Hinder Military Production | +20% unit cost | 10t |
| Denounce | -60 opinion | immediate |

Cannot target Allies.

### Treaties

Longer-lasting structural agreements.

| Treaty | Effect | Duration |
|---|---|---|
| Open Borders | Passable territory | 15t |
| Improve Trade Relations | +1 Trade Route slot with partner | Permanent `[INFERRED]` |
| Denounce Military Presence | Border opens | 15t |

### Espionage (No Spy Units!)

Civ VII replaces Spy units with Espionage Actions — Influence-funded covert ops with no unit on the board.

**Process:** initial Influence cost → per-turn drain for several turns → completion with detection roll → reward (Civic/Tech/debuff) or detection (opinion penalty + Influence reduction).

**Actions by Age:**

| Age | Action | Unlock | Effect |
|---|---|---|---|
| Antiquity | Steal Gov Secrets | Code of Laws Mastery | Steals Civic |
| Antiquity | Steal Tech Research | Writing Mastery | Grants Tech |
| Antiquity | Infiltrate Military | `[INFERRED]` | Combat debuff |
| Exploration | Open the Gates | Castles Mastery | Destroys District defenses |
| Exploration | Sabotage Specialist Morale | `[INFERRED]` | Disables Specialists |
| Modern | Infiltrate Positions | `[INFERRED]` | Affects Military Legacy |
| Modern | Spread Fake Artifacts | `[INFERRED]` | Affects Cultural Legacy |
| Modern | Sabotage Shipping | `[INFERRED]` | Affects Economic Legacy |
| Modern | Sabotage Space Program | `[INFERRED]` | Affects Scientific Legacy |

**Tiers:** Secret (base reward), Top Secret (+Migrant unit).

**Counterespionage:** Authority Civic (Exploration). 20-turn active. 80 Influence (Expl), 120 (Mod). Triples enemy espionage time + detection chance.

**Harriet Tubman:** ~half Influence cost for Espionage.

### War Declarations

**Formal War:** Hostile prerequisite; no War Support penalty.

**Surprise War:** Any target; massive War Support penalty scaling with prior relationship. Attacking Helpful is far worse than attacking Unfriendly.

No Casus Belli confirmed.

### War Support

Per-war score; positive favors player, negative disfavors.

**Sources (+):**
- Military Attribute node: +1 on all Wars
- 180 Influence purchase: increases in an active war
- Militaristic City-State Suzerain: +1 on all Wars
- Gate of All Nations Wonder: +2
- Harriet Tubman: +5 `[potentially patch-flagged]`
- Being defender in Surprise War

**War Weariness (low-War-Support side):**
- Happiness: -3 founded / -5 pre-war acquired / -7 captured during current war
- Combat Strength: -1 per negative point, max -20

Only way to reduce War Weariness: end wars.

Third parties can spend Influence to add War Support to either side.

### Peace Deals

Initiated via Diplomacy screen. Cooldown ~10-15 turns `[INFERRED]`.

**Deal scope heavily simplified.** Only settlement transfers available. NO gold (one-time/per-turn), NO resources, NO agreements, NO alliance commitments. Confirmed across multiple sources.

### Alliances

Requires Helpful relationship. Exact Influence cost unconfirmed `[INFERRED zero/nominal]`.

**Benefits:**
- Open Borders: free for both
- Shared Visibility
- Mutual Defense (must join or break)
- Sanction immunity (Espionage still allowed)
- No Denouncements
- Diplomatic Attribute capstone: **+3 to all yields per Alliance (repeatable)**

**Obligations:** Allied war declaration forces choice (join or break).

Single Alliance type (not VI's four). City-States (Suzerained IPs) are permanent allies.

### Independent Powers

See `systems/independent-powers.md` for full detail. Key integration points:

**Milestones:** 0 hostile / 30 neutral / 45 small reward / 60 Suzerain.

**Costs (Standard):**

| Age | Initial | Per Support |
|---|---|---|
| Antiquity | 170 | 100, +10/subsequent |
| Exploration | 340 | 200, +20 |
| Modern | 510 | 300, +30 |

Multiple players can compete; ties broken by Influence spend.

**Suzerain actions:** Levy Unit (varies), Incorporate City-State (240 Influence over 5 turns).

### Diplomatic Attribute Tree

Notable nodes: +1 Happiness/Age on Palace/City Halls; +1 Influence/Age on Palace; +50% Befriend Influence; +25% Influence for diplomatic actions; +50% Celebration Length; +2 Sci/Cul per Suzerain; +1 Social Policy Slot; Unlock Military Sabotage Espionage; **+3 to all yields per Alliance (repeatable capstone — most powerful)**.

---

## Formulas

```
// Influence flow
influence_next = influence + influencePerTurn

// Espionage cancellation
if influence == 0 at turn_start: cancel all active espionage

// War Weariness happiness (low-support side)
settlement.happiness -= 3 if founded
                      -= 5 if acquired before war
                      -= 7 if captured during war

// War Weariness combat penalty
unit.combatStrengthModifier = max(-20, warSupportValue)

// Befriend cost scaling
befriendInitial(age) = 170 * ageMultiplier
    // Antiquity=1, Exploration=2, Modern=3
additionalSupport(age, n) = baseSupport(age) + (n * 10 * ageMultiplier)
    // baseSupport: Ant=100, Expl=200, Mod=300
suzerainAt = 60 befriend points

// War Support purchase
war_support_purchase = 180 Influence  // exact delta [INFERRED: +1]
```

---

## Interactions

- `systems/ages.md` — relationships persist; IPs respawn at turn 2 of new age
- `systems/trade-routes.md` — Trade Routes gated by relationship (Hostile/at-war block)
- `systems/independent-powers.md` — this system drives all IP interaction
- `systems/legacy-paths.md` — Modern Espionage directly attacks opponent Legacy progress
- `systems/combat.md` — War Support modifies combat strength (-1/point, max -20)
- `systems/government-policies.md` — policies like Oratory grant Influence; Diplomatic tree adds slots
- `systems/yields-adjacency.md` — Influence is the sixth yield; capstone boosts all yields per Alliance
- `systems/leaders.md` — agendas define opinion modifiers; abilities (Tubman, Himiko, Machiavelli) directly modify diplomacy
- `systems/victory-paths.md` — Modern espionage targets victory paths

---

## Content flowing through this system

- [`content/leaders/`](../content/leaders/) — agendas + unique abilities
- [`content/policies/`](../content/policies/) — Oratory, alliance-scaling policies
- [`content/independent-powers/`](../content/independent-powers/) — all NPC factions
- [`content/wonders/`](../content/wonders/) — Weiyang Palace, Serpent Mound, Doi Suthep, Gate of All Nations
- [`content/buildings/`](../content/buildings/) — Influence generators

---

## VII-specific (how this differs from VI/V)

- **Influence as dedicated yield** — VI had no Influence resource; diplomacy used Gold, Favor, resource trades
- **No Spy units** — VI had produced/levelled/lost Spy units; VII uses abstract Actions paid in Influence
- **Four typed categories** (Endeavors/Sanctions/Treaties/Espionage) — VI had a deal table
- **War Support replaces Warmonger penalties** — symmetrical tug-of-war affecting aggressor's combat
- **Peace deals settlements-only** — VI allowed gold/resource/agreement exchanges
- **Independent Powers replace City-States** — VI had permanent city-states; VII has dynamic 3-stage IPs per age
- **Single Alliance type with bundled benefits** — VI had 4 types
- **No Casus Belli** — binary Formal/Surprise distinction

---

## UI requirements

- **Diplomacy Panel** — all leaders, relationship stage, inbox, available actions, active agreements, War Support
- **Leader portrait HUD** — relationship indicator, outstanding proposals
- **Influence HUD element** — stockpile + per-turn rate
- **War Support HUD** — visible during active wars
- **Independent Powers map overlay** — befriend progress bars, suzerainty status
- **Befriend panel** — milestones (0/30/45/60), cost, competing players
- **Espionage panel** — actions with cost/duration/detection risk
- **Peace Deal modal** — settlement transfers
- **Alliance war-join notification** — blocking prompt
- **Agenda tooltip** — on leader portrait hover

---

## Edge cases

- Influence stockpile = 0 at turn start: Espionage cancelled; can't initiate new
- Surprise War on Helpful leader: max War Support penalty
- Two players competing for IP: loser's points discarded on opponent's Suzerainty
- Incorporate City-State during alliance war: auto-war-join lost `[INFERRED]`
- Out of Influence at war: compounding feedback loop
- Sanction active when war declared next turn: unclear interaction `[INFERRED]`
- Counterespionage expires mid-enemy-action: reverts to normal `[INFERRED]`
- Peace deal with no valid settlement + at cap: stalemate `[INFERRED]`
- Trade Route with target decaying to Hostile: likely terminates `[INFERRED]`

---

## Open questions

- Exact opinion thresholds per Relationship Stage
- Endeavor duration: 7 vs 15 turns (source conflict)
- Surprise War penalty magnitude formula
- Whether Befriend progress resets on age transition for non-Suzerain powers
- Whether formal Alliances survive age transition
- Full list of opinion modifiers with numeric values
- Peace deal cooldown exact turns
- Same-type Endeavor stacking on one target from multiple proposers
- Trade Routes at war declaration: terminate or persist?
- Per-action Espionage Influence costs (only counterespionage confirmed: 80/120)

---

## Mapping to hex-empires

_Populated during implementation, not GDD authoring._

---

## Author notes

Fandom wiki pages 403'd; Firaxis Dev Diary URL corrected (/diplomacy-influence-trade/ not /diplomacy/). Content reconstructed from search summaries + 8+ secondary guides. Biggest uncertainties: opinion thresholds, Endeavor duration, Surprise War penalty formula. Peace deals being settlement-only is a notable VII design divergence confirmed by multiple sources.

Write/Bash permissions denied to subagent; parent wrote from fenced-block extraction.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
