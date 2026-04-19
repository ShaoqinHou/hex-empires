# Leaders — Civ VII

**Slug:** `leaders`
**Bucket:** `leaders-civs`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4.6`

---

## Sources

Every factual claim in the sections below MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/leaders-and-civs/ — Firaxis Dev Diary #2: Leaders and Civs
- https://civilization.2k.com/civ-vii/game-guide/dev-diary/diplomacy-influence-trade/ — Firaxis Dev Diary #6: Diplomacy, Influence, and Trade
- https://civilization.2k.com/civ-vii/game-guide/dev-diary/legends-mementos/ — Firaxis Dev Diary #7: Legends and Mementos
- https://civ7.wiki.fextralife.com/Leaders — Fextralife: Leaders (Civ7)
- https://civ7.wiki.fextralife.com/Attributes — Fextralife: Attributes (Civ7)
- https://game8.co/games/Civ-7/archives/494683 — Game8: List of All Leaders
- https://game8.co/games/Civ-7/archives/496953 — Game8: Diplomacy Guide
- https://civfanatics.com/civ7/civilization-vii-civilizations-and-leaders/ — CivFanatics: Leaders page (navigation only; article content not accessible)

**Source conflicts noted:** The Game8 leader roster (21 unique leaders / 26 counting personas) conflicts slightly with Fextralife (30 roster entries). Game8 likely reflects the launch roster; Fextralife may include post-launch DLC additions (Ada Lovelace, Simon Bolivar listed as upcoming in Game8 data). These counts are reconcilable — different points in time. Ibn Battuta's second attribute Wildcard (Fextralife) vs. implied standard attribute: unique to him. Confidence on exact roster totals: low.

---

## Purpose

The Leaders system is Civilization VII's answer to the long-game identity problem: in previous entries the leader and civilization were permanently fused, which meant players carried the same civ from Stone Age through Space Age with no structural narrative arc. In Civ VII the leader and civilization are fully decoupled — the leader is the player's persistent identity across all three ages, while the civilization changes at each age transition. This separation serves two goals simultaneously: it preserves the player's emotional attachment to a named historical figure (the relationship substrate that makes diplomacy feel personal) while enabling the Ages system's dramatic civ-swap mechanic. The leader also anchors the game's RPG-layer: a persistent attribute skill tree that deepens across all three ages, providing the sense of growing a character across the arc of a 10-hour campaign.

---

## Entities

- `PlayerState.leaderId` — (R) — permanent throughout the game; set at game start; never changes on age transition
- `PlayerState.personaId` — (R) — which persona of the leader is active; set at game start; each persona is a distinct mechanical variant
- `PlayerState.attributePoints` — (RW) — unspent attribute points accumulated during the game
- `PlayerState.attributeTree` — (RW) — per-attribute spending record; which nodes are unlocked in each of the 6 trees
- `PlayerState.relationships` — (RW) — map of otherId to RelationshipTier; tiers: Helpful / Friendly / Neutral / Unfriendly / Hostile
- `PlayerState.leaderUniqueAbility` — (R) — the leader's unique ability (static, from content registry); active for the entire game
- `PlayerState.agendaId` — (R) — the leader's agenda (from content registry); governs AI behavior and relationship modifier generation
- `PlayerState.mementoSlots[0..1]` — (R) — equipped mementos; set at game start; max 2 slots per leader
- `GameState.leaderRegistry` — (R) — all registered leader definitions; queried during civ-selection screen and AI pairing

---

## Triggers

- On **game setup** — player selects a leader (and persona if the leader has multiple) before match start; AI players are assigned leader/civ pairings based on historical and geographical affinity.
- On **game setup** — player equips 0–2 mementos in the pre-game loadout screen.
- On **END_TURN** — no direct leader-system tick; attribute point earning is triggered by milestone systems and narrative events.
- On action **EARN_ATTRIBUTE_POINT** (dispatched by victory-path milestones, narrative event rewards, Wonder construction, Civic research) — increment `attributePoints`.
- On action **SPEND_ATTRIBUTE_POINT** — decrement `attributePoints`; unlock the selected node in `attributeTree`; apply the node's bonus to appropriate `PlayerState` fields.
- On **DIPLOMATIC_ACTION** (founding an endeavor, imposing a sanction, declaring war, settling near another leader, creating/destroying a trade route, dispersing an Independent Power) — evaluate all active leaders' agendas and apply relationship deltas to `relationships`.
- On **age transition** — `leaderId`, `personaId`, `attributeTree`, `mementoSlots`, and `relationships` all persist unchanged. The civ changes; the leader does not.

---

## Mechanics

### Leader-Civ Separation

Every leader in Civ VII is independent of any specific civilization. At game start the player picks a leader and a starting civilization separately. During age transitions the player picks a new civilization while retaining the same leader. This decoupling is the defining innovation of the system relative to all prior Civ entries.

The separation exists because:
1. The three-age structure requires civilizations to change — matching a 16th-century Spanish culture to both the Antiquity and Modern ages simultaneously would be historically absurd.
2. Players identify emotionally with their leader's name, not their civ's name — diplomacy and narrative arcs benefit from a stable face at the table.
3. The attribute skill tree requires a persistent entity to invest in; the leader provides that anchor.

The game indicates ideal historical pairings via a small portrait icon on the civilization selection screen — e.g., Augustus with Rome (Antiquity), Hatshepsut with Egypt (Antiquity). Players are free to ignore these pairings. The AI always uses its historically or geographically closest pairing. [Firaxis Dev Diary #2]

### Leader Components

Each leader has the following components:

1. **Unique Ability** — a passive or active mechanical bonus specific to that leader. Persists for the entire game regardless of which civilization the player uses. [Firaxis Dev Diary #2]
2. **Attributes** — two designated attribute affinities out of the six (Economic / Militaristic / Diplomatic / Expansionist / Cultural / Scientific). Leaders earn standard attribute points from any source but receive more powerful and synergistic bonuses when points are allocated to their two designated trees. [Fextralife: Leaders]
3. **Agenda** — governs AI diplomatic behavior and relationship modifier generation. Not all leaders have an agenda. Fextralife explicitly states: not all leaders have an agenda, a starting bias, or unique civs. [Fextralife: Leaders]
4. **Starting Bias** — an optional geographical preference that influences the world-generation starting position. Not all leaders have one. [Fextralife: Leaders]
5. **Persona** — some leaders have multiple personas, each with a distinct unique ability, agenda, outfit, and background. Personas are selected at game start. [INFERRED — no source confirms mid-game persona switching is possible or impossible.]

### Persona System

Five leaders shipped at launch with multiple personas, bringing the launch total from 21 unique leaders to 26 playable options. [Game8: Leader List]

Napoleon is the reference example: **Napoleon (Emperor)** has the Economic and Diplomatic attribute pairing with the Empereur des Français unique ability; **Napoleon (Revolutionary)** has the Militaristic and Cultural pairing with La Grande Armée. Each persona has a distinct outfit, background art, unique ability, and agenda — they are mechanically distinct leaders who share a historical identity. [Firaxis Dev Diary #2; Game8: Leader List]

Personas are NOT unlocked through gameplay — they are pre-existing variants available at game setup. [INFERRED — no source describes a mid-game or progression-gated persona unlock mechanism.]

### Attribute System

The attribute system is the leader's RPG layer — the mechanism through which the leader grows stronger throughout a campaign. It persists fully across age transitions, making it the one progression vector that is never reset.

**Six attribute trees:**

| Attribute | Focus Area | Key Bonuses |
|---|---|---|
| Cultural | Great Works, Wonders, Civic Masteries | Palace / City Hall Great Work slots, civic bonuses |
| Economic | Gold, trade routes, Resource Capacity | Gold from towns and trade routes, resource cap increases |
| Militaristic | Combat, unit production, captured settlements | Combat strength bonuses, removes happiness penalties from captured cities, boosts military unit production |
| Diplomatic | Happiness, Influence, Policy slots, Diplomatic Actions | Happiness in settlements, expanded Influence, additional Social Policy slots, diplomatic action bonuses |
| Expansionist | Population, growth, settlement creation | Population caps, growth rate, food production, Happiness in towns, settlement limit increases |
| Scientific | Science production, building development | Science output, building-related bonuses |

[Fextralife: Attributes]

**Point acquisition:** Attribute points are earned from multiple sources:
- Leader narrative events: 1 point per Age (total: 3 over a full game) [Fextralife: Attributes]
- Civilization narrative events: 3 total across the game [Fextralife: Attributes]
- Wonder construction [Fextralife: Attributes; Firaxis Dev Diary #2]
- Victory Path rewards [Fextralife: Attributes]
- Narrative event rewards [Fextralife: Attributes; Firaxis Dev Diary #2]
- Civic research [Firaxis Dev Diary #2]

**Point spending:** Points can be spent immediately on receipt or banked for later. Spending unlocks nodes in any of the six trees. Unlocking higher tiers within a tree requires prior nodes to be unlocked, similar to technology tree prerequisites. [Fextralife: Attributes]

**Primary attribute synergy:** When a player allocates points to one of their leader's two designated attribute trees, the bonuses received are more powerful and synergistic than points allocated to non-designated trees. [Fextralife: Leaders] The exact multiplier is not published. [INFERRED — likely a flat bonus or higher-tier unlock.]

**Cross-age persistence:** All spent attribute tree progress and all accumulated unspent points persist through age transitions. This is the only upgrading system in the game that never resets. [Firaxis Dev Diary #2]

### Unique Abilities

Each leader has exactly one unique ability, active for the full game regardless of which civilization the player is running. Ability names are confirmed from Game8; mechanical text is reserved for the content layer (`content/leaders/<slug>.md`).

Selected ability names from the confirmed roster (names confirmed [Game8]; mechanical text [LLM-KNOWLEDGE-ONLY]):
- Augustus — Imperium Maius
- Hatshepsut — God's Wife of Amun
- Confucius — Keju
- Ibn Battuta — The Marvels of Traveling
- Harriet Tubman — Combahee Raid
- Napoleon (Emperor) — Empereur des Français
- Napoleon (Revolutionary) — La Grande Armée
- Tecumseh — Nicaakiyakoolaakwe

[Game8: Leader List]

### Agenda System

An agenda defines a leader's specific likes and dislikes and provides both the player and AI observers with a transparent model of what actions a leader rewards or penalizes diplomatically. [Firaxis Dev Diary #6]

**Mechanically:**
- Agenda-driven events monitor gameplay actions across all players.
- When an action matches an agenda's trigger condition, a relationship delta is applied. The dev diary describes these as "big" or "small" changes in either direction. No numeric constants are published. [INFERRED — likely integer deltas in the range of +/-3 to +/-15.]
- Example: Tecumseh's "Suzerain of the World" agenda applies a "big" relationship decrease if the observing player disperses an Independent Power, and a "small" relationship increase if the player has no active Independent Power friendships. [Firaxis Dev Diary #6]
- Agenda effects accumulate over time.

**Visibility:** [INFERRED — sources do not confirm whether agendas are visible to all players or partially hidden as in Civ VI. Dev Diary #6 framing strongly implies visibility is a design goal. Verify before implementing.]

**Not all leaders have agendas.** Fextralife explicitly states this as a design choice. Leaders without agendas have no agenda-driven relationship modifiers. [Fextralife: Leaders]

### Relationship System

Leader-to-leader relationships operate on a five-tier ladder:

| Tier | Diplomatic access |
|---|---|
| Helpful | Full access, including military alliances |
| Friendly | Most diplomatic actions available |
| Neutral | Standard baseline |
| Unfriendly | Limited cooperation; sanctions possible |
| Hostile | War and military confrontation; sanctions active |

[Firaxis Dev Diary #6; Game8: Diplomacy Guide]

**Relationship modifiers include:**
- Agenda trigger events (variable; "big" or "small" per agenda definition) [Firaxis Dev Diary #6]
- Accepting/supporting an endeavor: typically +5 to +12 [Game8: Diplomacy Guide]
- Imposing a sanction: -15 [Game8: Diplomacy Guide]
- Settling near another leader's capital: relationship tension + Influence gain [Game8: Diplomacy Guide]
- Razing a conquered city: reduces Influence gain [Game8: Diplomacy Guide]

**Persistence across ages:** The `systems/ages.md` worked example states that relationships (diplomacy) — wars, alliances, opinions with other leaders carry over through age transitions. [ages.md; Firaxis Dev Diary #2 — leader persistence]

### Mementos and Pre-Game Loadout

Mementos are leader-equippable items unlocked through the Legends system (meta-progression across games). They attach to the leader before the match starts. [Firaxis Dev Diary #7]

**Mechanics:**
- Each leader has exactly 2 memento slots. [Firaxis Dev Diary #7]
- Mementos are NOT leader-restricted — any memento can go into any leader's slots. [Firaxis Dev Diary #7]
- Example: "Complaint to Ea-nāṣir" (Foundation Level 2 reward) grants +1 Economic Attribute point at game start. [Firaxis Dev Diary #7]
- Example: "Lantern" (Harriet Tubman Level 2 reward) grants a free Migrant Unit after successful undetected espionage. [Firaxis Dev Diary #7]
- Mementos persist throughout the game without resetting at age transitions. [INFERRED — consistent with leader-persistence design philosophy; no source describes mementos resetting.]

See `systems/legends.md` for how mementos are earned.

### AI Leader Pairing and Starting Bias

The AI always pairs its leader with the civ that represents the closest historical or geographical fit. The player sees a small portrait icon at game setup suggesting the recommended historical pairing. [Firaxis Dev Diary #2]

Starting bias (when a leader has one) influences where the world generator places that leader's starting position. [INFERRED — Firaxis Dev Diary #2 only states leaders have "occasional Starting Bias" without defining its mechanical effect.]

---

## Formulas

```
attribute_points_per_game (approximate):
  leader_narrative_events   = 3   // 1 per age x 3 ages [Fextralife: Attributes]
  civ_narrative_events      = 3   // total across full game [Fextralife: Attributes]
  wonder_construction       = variable (1 per Wonder [INFERRED])
  victory_path_rewards      = variable (depends on milestones completed)
  narrative_event_rewards   = variable (depends on event outcomes)
  TOTAL_FLOOR = 6            // guaranteed minimum
  TYPICAL_TOTAL = ~10-20     // [INFERRED]

relationship_tier_thresholds (inferred from published modifier values):
  Helpful      >= +30   [INFERRED]
  Friendly     +10 to +29   [INFERRED]
  Neutral      -9 to +9   (baseline = 0)
  Unfriendly   -10 to -29   [INFERRED]
  Hostile      <= -30   [INFERRED]

  Sanction modifier:      -15   [Game8: Diplomacy Guide]
  Endeavor accepted:      +5 to +12   [Game8: Diplomacy Guide]
  Agenda trigger:         variable ("big" or "small"); specifics not published
```

Where:
- Relationship tier thresholds are `[INFERRED]` from observed modifier magnitudes. Game8 cites -15 for sanctions and +5 to +12 for diplomatic actions; for 2-3 sanctions to reach Hostile from Neutral, the threshold must be roughly <= -30. Verify against game data before implementing.
- Attribute point totals are estimates; exact counts from Wonder and victory-path sources are not published.
- No numeric formulas apply to the attribute skill tree itself — the system is node-unlock-based, not multiplicative.

---

## Interactions

- `systems/ages.md` — leader persists through age transitions that swap the civ; `leaderId`, `attributeTree`, and `relationships` all carry over unchanged.
- `systems/civilizations.md` — the civilization is the other half of the leader/civ pair; civ provides unique units, buildings, improvements, and bonuses while leader provides unique ability, attributes, and agenda.
- `systems/legacy-paths.md` — victory path milestones are one of the primary sources of attribute points.
- `systems/narrative-events.md` — narrative events are a source of attribute points; leader identity can trigger leader-specific narrative event branches.
- `systems/diplomacy-influence.md` — the relationship system and agenda trigger mechanisms belong to diplomacy; leaders are the subjects of that system.
- `systems/mementos.md` — mementos occupy slots on the leader; earned via Legends meta-progression and equipped pre-game.
- `systems/legends.md` — meta-progression system that unlocks mementos via Foundation and Leader-specific paths.
- `systems/independent-powers.md` — Independent Power interactions are a source of agenda trigger events.
- `systems/victory-paths.md` — the four victory paths (Economic / Military / Cultural / Scientific) map to four of the six attribute trees; attribute synergies reinforce a leader's preferred victory arc.

---

## Content flowing through this system

- [`content/leaders/`](../content/leaders/) — the ~21–30 individual leader definitions (unique ability text, attribute designations, agenda definition, starting bias, persona variants)
- [`content/mementos/`](../content/mementos/) — equippable leader items (Foundation rewards and leader-specific rewards from the Legends system)

---

## VII-specific (how this differs from VI/V)

- **Leader-civ decoupling** — the defining innovation. In VI the leader was inseparable from the civ: Cleopatra was Egypt, Gandhi was India. In VII any leader can run any civ in any age.
- **Leader persists across all ages, civ does not** — in VI there was one civ per game. VII introduces a three-civ arc under a single stable leader identity.
- **Attribute skill tree is a new RPG layer** — VI had no equivalent growing-leader mechanic within a single game. VI leader abilities were fixed static bonuses from turn 1.
- **Persona variants are first-class** — VI had single-persona leaders (with limited alt-leader DLC in New Frontier Pass). VII builds personas into the base game: 5 of 21 base leaders have 2 personas, each mechanically distinct.
- **Agenda system may be more legible** — VI introduced hidden agendas (discoverable via espionage) alongside a public agenda. VII's dev diary frames agendas as the player's guide to what actions to take — implying visibility is a design goal. [INFERRED]
- **Mementos add a pre-game loadout step** — VI had no equivalent equipment slot on the leader.
- **Relationships are leader-to-leader, not civ-to-civ** — in VI a denouncement came from Cleopatra-Egypt as an inseparable unit. In VII Hatshepsut's relationship with Confucius carries regardless of which civ she plays in the current age.
- **AI always uses historical pairing; player can diverge freely** — VII formalizes the ideal pairing as a visible recommendation with zero mechanical penalty for ignoring it.

---

## UI requirements

- **Pre-game leader selection screen** — grid of leader cards showing portrait, name, attribute icons (two per leader), unique ability description, and agenda. Persona selection appears here for multi-persona leaders. Recommended civ pairings indicated by a portrait icon on the civ selection screen.
- **Pre-game memento loadout screen** — shows the leader's two memento slots with equipped items and a browsable collection of unlocked mementos.
- **Attribute panel** — accessible during the game; shows all six attribute trees, unlocked nodes, locked nodes, cost to unlock next node, and current unspent attribute point total.
- **Diplomacy panel** — shows the relationship tier (Helpful / Friendly / Neutral / Unfriendly / Hostile) for every living leader, current active modifiers, and the leader's agenda (visibility TBD — see Open questions #1).
- **Age transition screen** — shows the leader portrait prominently during civ selection; reinforces visual continuity of the persistent leader across the civ swap.
- **Notification** — when an attribute point is earned; prompt to visit the attribute panel if points are banked.
- **HUD indicator** — current unspent attribute points (number badge); visible throughout gameplay.

---

## Edge cases

- What if a player picks a non-historical leader/civ pairing? No mechanical penalty — the game recommends historical pairings but does not enforce them.
- What if a leader has no agenda? The agenda trigger step for that leader is a no-op. Not all leaders have agendas; this is an expected state. [Fextralife: Leaders]
- What if both personas of the same leader are in the same game? [INFERRED — likely allowed but should be treated as two distinct leaders for relationship purposes.]
- What if a player exhausts all attribute point sources before the end of the game? No new points arrive — the tree stops growing.
- What if a memento grants +1 Economic Attribute point at game start — does it count toward tree-unlock prerequisites? [INFERRED — yes; the point enters `attributePoints` and is functionally identical to earned points.]
- What if a player is eliminated mid-game? Their leader exits the relationship map; remaining players no longer receive agenda triggers from the eliminated leader.
- What if the player invests all attribute points in a non-primary attribute tree? Valid — no lock preventing this. The player simply misses the synergistic bonus from their designated primary trees.
- What if an agenda-sensitive action occurs during the age transition flow? [INFERRED — the action fires during a real game turn; agenda triggers should resolve normally.]
- What if a memento affects a system that does not exist until a later age? [INFERRED — likely the bonus is inactive until the relevant system activates.]

---

## Open questions

- **Are agendas visible to all players, or are there hidden agendas?** — checked Firaxis Dev Diary #2 and #6, Fextralife, Game8 diplomacy guide. Dev Diary #6 strongly implies visibility but whether VII dropped the Civ VI hidden-agenda system is not confirmed. [Priority: high]
- **Exact attribute tree tier structure and node contents** — checked Fextralife Attributes. Confirms tiers exist with tech-tree-style prerequisites but does not enumerate tier count, node names, or per-node bonuses.
- **Exact relationship tier thresholds** — checked Game8 diplomacy guide. Individual modifier values known (+5/+12/-15) but tier transition breakpoints not published. `[INFERRED]` thresholds need in-game verification.
- **Exact agenda modifier magnitudes** — checked Firaxis Dev Diary #6. Only "big" and "small" descriptors used; no integer values published.
- **Full unique ability text for all leaders** — Fandom wiki pages (primary source for this) returned 403. Unique ability names confirmed from Game8; mechanical effect text is not sourced. Needs content-phase research.
- **Ibn Battuta's Wildcard attribute** — Fextralife lists his second attribute as Wildcard rather than one of the six standard types. Mechanical meaning unknown from any source examined.
- **Relationship persistence across ages (direct citation)** — ages.md (worked example by parent) explicitly states relationships persist. Treat ages.md as the current authority; a direct Dev Diary citation would strengthen the claim.

---

## Mapping to hex-empires

**Status tally:** 1 MATCH / 1CLOSE / 2 DIVERGED / 5 MISSING / 0 EXTRA
**Audit:** [.claude/gdd/audits/leaders.md](../audits/leaders.md)
**Highest-severity finding:** F-02 — Attribute system (6-tree RPG layer) absent (MISSING, HIGH)
**Convergence status:** Divergent — 2 finding(s) require(s) architectural refactor

_(Full details in audit file. 9 total finding(s). Regenerated by `.claude/scripts/aggregate-audits.py`.)_

## Author notes

The two primary Fandom wiki URLs in the brief both returned 403 during this session. This is the main quality gap: Fandom is the most comprehensive per-leader mechanical reference and was inaccessible. Firaxis Dev Diary #2 was accessible and is the highest-authority source for design intent. Fextralife filled in attribute tree content details. Game8 provided the leader roster with attribute designations, unique ability names, and relationship-modifier values. The relationship-tier numeric thresholds in the Formulas section are inferred estimates requiring in-game verification before use in implementation. Confidence is rated medium (not high) primarily due to the 403 failures and the absence of sourced agenda-modifier constants and unique ability text.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
