# Narrative Events — Civ VII

**Slug:** `narrative-events`
**Bucket:** `narrative`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/emergent-narrative/ — Firaxis Dev Diary #4: Emergent Narrative (fetched twice; authoritative)
- https://civilization.fandom.com/wiki/Narrative_Event_(Civ7) — Fandom: Narrative Event (Civ7) — **returned HTTP 403; could not be read**
- https://civilization.fandom.com/wiki/List_of_narrative_events_in_Civ7 — Fandom: List of narrative events — **returned HTTP 403; could not be read**
- https://civilization.2k.com/civ-vii/game-guide/dev-diary/ages/ — Firaxis Dev Diary #1: Ages (cross-reference for crisis/age interaction)

**Source conflicts noted:** None among accessible sources. The two Fandom pages (which likely contain the densest mechanic detail, event list, and exact tag enumeration) were inaccessible at research time. Claims not covered by the Firaxis dev diary are tagged `[INFERRED]` or `[LLM-KNOWLEDGE-ONLY]`.

---

## Purpose

The Narrative Events system gives Civilization VII’s mechanical progression an emergent story layer without scripting a fixed plot. Rather than predetermined cutscenes or linear quest chains, it fires context-sensitive text events based on what the player has already done — their leader, their civ, their wars, their research, their prior choices — and records those choices as durable tags that can influence events in later ages. The system serves two distinct functions simultaneously: **atmospheric** (making the world feel alive and inhabited by real actors) and **mechanical** (delivering bounded gameplay bonuses that feel earned by the player’s story, not random luck). It replaces Civ VI’s passive Gossip system, which only reported distant events, and it replaces Civ V/VI’s “Goody Huts” (renamed Discoveries in VII) with a player-agency variant that lets the player choose their own reward.

---

## Entities

- `PlayerState.leader` — (R) — leader identity is a primary trigger condition; many events are leader-specific
- `PlayerState.currentCiv` — (R) — civ identity gates civ-specific event chains
- `PlayerState.narrativeTags` — (RW) — persistent set of string tags accumulated from event choices; read by future event requirement checks; written when an event choice applies a tag [INFERRED: field name; confirmed to exist conceptually by Dev Diary #4]
- `PlayerState.yields` — (W) — events may grant one-off yield bonuses (gold, food, production, science, culture, happiness, influence)
- `PlayerState.activePolicies` — (W) — some events unlock or enable policy choices [INFERRED from crisis policies framing in Dev Diary #1; exact mechanism unclear]
- `UnitState` — (W) — some events spawn units or grant combat buffs to existing units
- `GameState.currentAge` — (R) — age gates which events are eligible; tags from Antiquity can trigger events in Exploration or Modern
- `GameState.crisisPhase` — (R/W) — systemic crisis events are wrapped in narrative framing; crisis policies are announced through event-like UI [INFERRED: exact coupling; see systems/crises.md]
- `Tile.feature` / `Tile.terrain` — (R) — some triggers are tile-adjacent (weather events, resource discoveries, war damage to tiles) [INFERRED from Dev Diary #4 mention of weather events and war damage]
- `GameState.eventHistory` — (RW) — record of which events have already fired this game; prevents re-triggering the same event in the same campaign [INFERRED: field name; confirmed conceptually — events appear as subsets per campaign]

---

## Triggers

- On **END_TURN (every turn):** the game evaluates the full pool of eligible narrative events against the current game state. Events whose requirement sets are satisfied enter a candidate queue. The system selects from the queue each turn, capped to avoid overwhelming the player. [INFERRED: per-turn evaluation; confirmed: events respond to gameplay moments]
- On **battle resolution** — combat trigger: an event may fire after a significant engagement (victory, defeat, war declaration, war peace). Dev Diary #4 explicitly lists battles.
- On **technology research completion** — tech trigger: events fire on specific tech unlocks; the event flavors the discovery. Dev Diary #4 lists technological advancements.
- On **major achievement** — milestone trigger: completing a legacy path milestone or reaching a big achievement can trigger an event. Dev Diary #4 lists big achievements.
- On **Golden Age activation with active Traditions** — state trigger: Dev Diary #4 explicitly calls out Golden Ages with active Traditions as a trigger condition.
- On **religion belief selection** — religion trigger: Dev Diary #4 explicitly lists this; event fires when player selects a pantheon belief or founds a religion with specific beliefs.
- On **weather event** — environmental trigger: Dev Diary #4 explicitly lists weather events as triggers; likely tied to map features.
- On **war damage to tiles** — terrain trigger: Dev Diary #4 explicitly lists this; fires after combat damages city or tile.
- On **Discovery tile exploration** — map trigger: player unit moves onto a Discovery tile; fires the Discoveries subsystem (a specialized narrative-event variant, see Mechanics § Discoveries).
- On **Independent Power gift** — diplomatic trigger: Dev Diary #4 notes that gifts from Independent Powers are wrapped in systemic events with narrative framing.
- On **narrative tag check (cross-age callback)** — tag trigger: events with a requiresTag condition fire when a previously-applied tag is present in PlayerState.narrativeTags. This is the primary cross-age narrative mechanism.
- On **leader-specific condition** — identity trigger: many events are authored specifically for a leader (Augustus, Benjamin Franklin explicitly named in Dev Diary #4) and will only fire if that leader is active.
- On **age transition** — transition trigger: some narrative events are tagged to specific ages; on entering a new age, age-gated events join the eligible pool. [INFERRED from age-tagged events in systems/ages.md]

---

## Mechanics

### Event presentation

A narrative event is a text popup — a short vignette (typically 1–3 paragraphs of flavored prose) describing a moment in the empire’s story. It is presented as a notification that pauses play softly: it does not block the end-turn button but is drawn to the player’s attention before the next turn resolves. [INFERRED: exact UI behavior; confirmed that events offer choices the player must resolve]

Each event offers **two to three choice options** (Dev Diary #4). Options are labeled with brief descriptions of their values and priorities. The choice options are designed to be **approximately equal in gameplay value** — Firaxis explicitly states this design goal to avoid guide-dependent play where players feel they must look up the optimal choice.

**Reward transparency:** Most events display the reward before the player commits to a choice (e.g., +30 Gold on one option, +15 Production for 5 turns on another). Occasionally, some events withhold exact outcomes for mystery or flavor, showing only a hint. [INFERRED: the exact ratio of revealed vs hidden rewards; confirmed that both modes exist per Dev Diary #4]

### Trigger requirement system

Each narrative event carries a **requirements set** — a collection of conditions evaluated against game state. The system is described as a modifier system combining requirements and effects. Requirements can include:

1. **Leader identity** — leaderId matches a specific leader
2. **Civ identity** — civId matches a specific civilization [INFERRED; Dev Diary #4 confirms civilization-based triggers]
3. **Tag presence** — narrativeTags contains a specific tag string (example tag names are [INFERRED])
4. **Age** — currentAge matches a specific age
5. **Gameplay state** — recently completed a specific tech, won a battle, suffered war damage, selected a religion belief
6. **Tile/terrain proximity** — [INFERRED from weather events and war damage triggers mentioned]
7. **Not-already-fired** — eventHistory does NOT contain this eventId

Multiple requirements combine with AND logic within a single event. A player who does not meet all requirements simply never sees that event in their campaign. [INFERRED: AND vs OR logic]

### Effect application

When the player selects a choice, one or more effects are applied immediately. Effect categories confirmed or inferred:

| Effect type | Source |
|---|---|
| Yield bonus (one-off) — e.g., +50 Gold, +30 Food | Dev Diary #4 (yields) |
| Yield bonus (duration) — e.g., +2 Production for 10 turns | Dev Diary #4 (yields); duration is [INFERRED] |
| Combat buff — e.g., +5 Combat Strength for X units | Dev Diary #4 (combat buffs) |
| Unit spawn — a free unit is granted | [INFERRED from rewards commensurate with rarity] |
| Policy unlock/enable — a crisis policy option becomes available | [INFERRED from crisis/event coupling] |
| Narrative tag applied — narrativeTags receives a new tag string | Dev Diary #4 (applying a narrative tag in some cases) |
| No mechanical effect (atmosphere only) | Dev Diary #4 (events have narrative flavor with no explicit reward) |

Effects are scaled to the rarity/difficulty of the triggering condition: a leader-specific event tied to a rare historical scenario grants a larger reward than a generic flavor event. Dev Diary #4: rewards commensurate with the difficulty or rarity of the triggers.

### The tag system

The tag system is the most architecturally distinctive feature of the Narrative Events mechanic. When the player makes certain choices in narrative events, one or more **tags** are written to `PlayerState.narrativeTags`. Tags are string identifiers that persist across age transitions as part of PlayerState — they do not reset at age transition even though civs, tech trees, and other state does.

Tags enable two patterns:

1. **Callback events:** A later event has a requiresTag condition in its requirements. The event prose explicitly references the earlier choice. Dev Diary #4 explicitly describes this: we are actually able to trigger narrative events that call back to things that happened in past Ages.

2. **Character-arc framing:** Tags accumulate to describe a player’s overall disposition. Later events can check for tag count or pattern to match the macro character arc. Dev Diary #4 gives the example of tracking a leader who was a warmonger in the Antiquity Age, but has been peaceful ever since then — this requires multiple tags across time. [INFERRED: exact counting or threshold mechanic; confirmed: the conceptual cross-age arc is real]

Tags are authored alongside event data files and are not player-visible; they function as invisible state that enriches the narrative layer without requiring the player to manage them.

### Discoveries subsystem

Discoveries are a specialized subset of the Narrative Events system. They replace the Goody Hut mechanic from previous Civ games. Dev Diary #4 is explicit: Discoveries replace previous goody huts.

Mechanic:

1. Discoveries appear as map objects on unexplored or lightly-explored tiles.
2. When a player unit moves onto a Discovery tile, the Discoveries popup fires: a short narrative vignette explaining what the exploration party found.
3. The player is presented with two or more choices for how to handle the discovery. Each choice offers a different bonus.
4. The player’s choice grants the corresponding bonus and the Discovery tile is consumed (no repeat visits).
5. Dev Diary #4: providing some influence over your early-game boosts.

Discoveries differ from narrative events in that they are map-triggered (require physical exploration) rather than condition-triggered. They are mechanically simpler — no tag application, no crisis framing, purely early-game content.

### Systemic events (crises and Independent Power framing)

A third category distinct from narrative events and Discoveries is **systemic events**: recurring mechanical moments that receive narrative wrapping without being fully authored story events. Dev Diary #4 names two examples: crisis events and Independent Power gifts.

- **Crisis events:** When the crisis phase activates, the crisis policies presented to the player are wrapped in a narrative frame giving personality and context. The player still chooses crisis policies through the same mechanic as always, but the event popup provides thematic framing. Dev Diary #4: these serve an informative rather than narrative function. They do not apply tags. See systems/crises.md for full crisis mechanics.
- **Independent Power gifts:** When an Independent Power sends a gift or makes a diplomatic offer, the offer is wrapped in flavor text from that IP’s cultural identity. No choice is offered — the gift arrives as a notification. [INFERRED: no choice presented; confirmed that it uses narrative framing]

### Event pool management and campaign variability

Dev Diary #4 confirms that the full event database contains **over 1,000 narrative events** at launch. In any single campaign, only a **subset** of these fire. This is a design feature — Firaxis explicitly states the intent is to ensure unique playthroughs.

The selection mechanism [INFERRED: most details below]:
- Events are eligible only when all requirements are met.
- Among eligible events, one fires per turn (or per opportunity) — not all simultaneous.
- Some events may be mutually exclusive: choosing one branch closes off its alternative branch’s events.
- Age-gated events expire if the age ends before they fire (the trigger window closes).

This means two players who both play as Augustus may see some of the same leader-specific events but will diverge based on their other gameplay choices, producing different narrative arcs even with the same leader.

### Atmospheric vs mechanical weighting

Dev Diary #4 describes a deliberate spectrum:

- **High mechanical weight** events: direct gameplay bonuses (yields, combat buffs, unit grants), clearly labeled rewards, comparable to a minor legacy milestone in terms of tangible benefit.
- **Low mechanical weight / atmospheric** events: story vignettes that may offer no reward, or offer a token reward. Their value is flavor — they make the world feel like a lived-in civilization with real inhabitants. Dev Diary #4 cites historical events (ancient discoveries, prisoner escapes, artistic feuds) as examples.
- **What-if scenarios**: alternate-history vignettes that pose what if X had done the opposite? These are atmospheric, often attaching to a leader’s known biography, and appear when the player’s leader is in a situation that mirrors the historical divergence point.

---

## Formulas

```
No numeric formulas — this system is rule-based only.
```

Where yield-bonus values are concerned:
- Exact yield amounts are content data authored per event, not computed by a formula.
- The design principle is: rewardMagnitude is proportional to triggerRarity — rarer trigger conditions (leader-specific + age-specific + tag-required) yield larger rewards. No public formula; balance is editorial.
- Dev Diary #4 states rewards should be commensurate with the difficulty or rarity of the triggers.

---

## Interactions

- `systems/ages.md` — age is a primary gate on events; tags persist across transitions and enable cross-age callbacks.
- `systems/crises.md` — crisis events are systemic events with narrative framing; there may be narrative events seeding crisis policies. [INFERRED: tag to crisis policy coupling]
- `systems/leaders.md` — leader identity is the single most common trigger condition; leader persistence across ages means leader-tagged events span the full game.
- `systems/civilizations.md` — civ identity gates civ-specific event chains; on age transition the civ changes, potentially unlocking a new civ’s event pool.
- `systems/religion.md` — religion belief selection is an explicit trigger condition; some events fire specifically after pantheon or religion belief choice.
- `systems/tech-tree.md` — tech research completion is an explicit trigger condition; flavor events mark major discoveries.
- `systems/diplomacy-influence.md` — Independent Power gift events are systemic events with narrative framing; war declarations and peaces are triggers for battle-category events.
- `systems/map-terrain.md` — weather events and tile-based triggers read terrain/feature data; Discoveries are map objects on specific tile types.
- `systems/victory-paths.md` — completing a major milestone is a trigger for narrative callbacks; choice of victory path may influence which event chains are reachable.

---

## Content flowing through this system

- [`content/narrative-events/`](../content/narrative-events/) — the full event database: 1,000+ authored events, each with requirements set, prose (vignette + 2-3 choice labels), per-choice effect list, and optional tag output
- [`content/crisis-cards/`](../content/crisis-cards/) — crisis cards use the same narrative framing infrastructure as systemic events, though they have their own mechanical path
- [`content/independent-powers/`](../content/independent-powers/) — each IP’s gift events are authored content using the systemic-event wrapper

---

## VII-specific (how this differs from VI/V)

- **Tag-based cross-age memory** — no equivalent in VI/V. The tag system enables narrative continuity across civ swaps and partial state resets, which would not have been meaningful in a game without age transitions.
- **Replaces Goody Huts with player-choice Discoveries** — VI/V goody huts were random fixed rewards; VII Discoveries give the player two or more choice options, converting a luck mechanic into a player-agency moment.
- **1,000+ events vs. VI’s Eureka/Inspiration prompts** — not directly comparable systems, but the order-of-magnitude difference indicates narrative events are a first-class feature rather than a flavoring layer.
- **Choices are mechanically balanced intentionally** — VII’s narrative choices are explicitly designed so neither option is wrong, avoiding guide-dependency.
- **Character-arc framing across the full campaign** — VI had no way to express that a player was a warmonger in the ancient era but became peaceful. The tag system creates that arc without requiring the player to manage it.
- **Atmospheric events are deliberately low-reward** — VII explicitly includes events with near-zero mechanical value to serve world-building, treating the game’s fiction as a first-class feature.
- **Systemic events (crises, gifts) get narrative wrapping** — VI’s crisis/dark-age system was a purely mechanical notification. VII wraps every recurring moment in prose.
- **Leader-specific event arcs** — VII authors specific events for individual leaders (Augustus, Franklin named in Dev Diary #4), creating a personalized narrative for each leader.

---

## UI requirements

- **Event popup** — modal or soft-pause card appearing mid-turn, showing: event title, short vignette prose (1-3 paragraphs), 2-3 choice buttons each labeled with the choice description and (usually) the reward. Should support reveal-reward vs hidden-reward states per-choice.
- **Choice confirmation** — player taps/clicks a choice button; the popup updates to show the selected choice and its effect applied (brief confirmation state before dismiss). [INFERRED: confirmation sub-step]
- **Discoveries tile marker** — a map object icon distinct from terrain; visible when the tile is within sight range; triggered by unit movement onto tile.
- **Discoveries popup** — same UI structure as narrative event popup but simpler: flavor text + 2 choice buttons + reward labels.
- **Systemic event banner** — for crises and IP gifts: lighter-weight notification card (not a full popup) with flavor prose + a View Details link to the crisis/diplomacy screen. Does not block gameplay.
- **Event log / history panel** — player should be able to review past event choices. [INFERRED: existence of this panel; consistent with the game’s emphasis on narrative persistence]
- **No dedicated Event button in TopBar** — events are push-delivered, not pulled by the player. They fire when conditions are met. [INFERRED]

---

## Edge cases

- What if two narrative events have overlapping requirements and both become eligible on the same turn? Only one fires. Priority or tiebreaking rule [INFERRED: deterministic queue with authored priority weights; exact rule unknown].
- What if the player ends their turn without resolving an event popup? [INFERRED: the event soft-pauses the transition and must be resolved before END_TURN completes, similar to crisis event resolution].
- What if a tag-triggered callback event fires but the player has no memory of the original choice? The event prose must be self-contained enough to be meaningful without recalling the specific original event. This is an authoring constraint, not an engine constraint.
- What if a leader-specific event fires for a player who does not historically know the leader? Event prose must work for players who know and do not know the history. Authoring constraint.
- What if the player is eliminated before a cross-age tag callback fires? The callback event is simply never seen; no negative consequence. Tags in eliminated player state are discarded.
- What if a Discovery tile is blocked by another unit? [INFERRED: the Discovery does not fire until a unit actually ends its movement on the tile].
- What if an event’s reward would overflow a capped resource? [INFERRED: reward is applied up to cap, or cap is temporarily lifted. Exact behavior unknown.]
- What if the player does not pick a choice (auto-dismiss)? [INFERRED: default choice is applied — either the first option or a neutral no-reward outcome. Sources do not confirm auto-dismiss behavior.]
- What if a civ-specific event fires for a player who switched away from that civ at age transition? The event is age-gated and civ-gated; if the civ is no longer active, the event is ineligible. [INFERRED]
- What if the same leader-specific event is eligible both in Antiquity and Modern? The event carries an age-gate to prevent re-firing. If no explicit age-gate is authored, the not-already-fired check in GameState.eventHistory prevents repetition. [INFERRED]

---

## Open questions

- **Exact tag vocabulary** — the tag system is confirmed to exist but no public list of tag identifiers has been found. The Fandom wiki list page (HTTP 403) likely contains this. What tags exist? Are they standardized (e.g., warmonger, diplomat, scientist) or event-specific arbitrary strings?
- **Tag persistence across games (Legends/Mementos link?)** — do any narrative tags carry into the meta-progression system (systems/legends.md)? Dev Diary #4 does not mention this.
- **Per-turn event rate cap** — how many narrative events can fire per turn? Is there a per-age cap or a per-game density target? Dev Diary #4 says events appear as subsets per campaign but gives no rate.
- **Mutually exclusive event chains** — are there event trees where choosing option A closes off a branch accessible from option B? Dev Diary #4 does not confirm or deny. Architecturally important for implementation.
- **Exact Discovery count** — how many Discovery tiles appear per map? Is count a function of map size?
- **Whether events can grant policy unlocks directly** — Dev Diary #4 confirms yields and combat buffs. Whether a narrative event can unlock a government policy or crisis policy option is [INFERRED].
- **Unit-spawn events** — whether any narrative events spawn units is [INFERRED] from rewards commensurate with rarity. No specific unit-spawn event was named in accessible sources.
- **Narrative event UI specifics** — does the popup pause the game (blocking END_TURN) or is it a soft notification? Cannot confirm without accessing the Fandom detail pages.
- **Codex / event journal** — whether Civ VII has a browsable in-game Codex of past events could not be confirmed from accessible sources.
- **Whether atmospheric (zero-reward) events can still apply tags** — Design intent suggests yes (they serve as state-setters for future callbacks) but this is [INFERRED].

---

## Mapping to hex-empires

**Status tally:** 3 MATCH / 4 CLOSE / 0 DIVERGED / 0 MISSING / 0 EXTRA
**Audit:** [.codex/gdd/audits/narrative-events.md](../audits/narrative-events.md)
**Highest-severity finding:** F-01 — `NarrativeEventDef` type and content database exist at starter scale (CLOSE, HIGH)
**Convergence status:** Close — 4 numeric/detail adjustment(s) pending

_(Full details in audit file. 7 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

Primary source was Firaxis Dev Diary #4 (Emergent Narrative), fetched successfully twice. Both Fandom pages (the two highest-value sources for event list and tag vocabulary) returned HTTP 403. The Fextralife wiki returned 404 for narrative-specific pages. As a result, this document is stronger on system architecture and design philosophy than on specific event examples, exact tag names, or per-event effect values.

Confidence is `medium` rather than `high` because the inaccessible Fandom pages almost certainly contain mechanic details (exact trigger conditions, complete tag vocabulary, event categories with counts, per-event effect values) that could correct or extend the [INFERRED] claims here. A follow-up research pass specifically targeting the Fandom list page when it becomes accessible would improve this to `high`.

The cross-age tag system and Discoveries subsystem are the two highest-confidence sections (both explicitly detailed in the Dev Diary). The trigger requirement logic, per-turn rate caps, and UI specifics are the lowest-confidence sections.
