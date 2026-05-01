# Mementos — Civ VII

**Slug:** `mementos`
**Bucket:** `legends`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/legends-mementos/ — Firaxis Dev Diary #7: Legends and Mementos (Senior Designer Matt Owens)
- https://civ7.wiki.fextralife.com/Leaders — Fextralife: Leaders (Attribute system)
- https://civ7.wiki.fextralife.com/Attributes — Fextralife: Attributes (six-attribute breakdown)

**Source conflicts noted:** None material. Fandom Memento/Legend pages 403'd. Firaxis dev diary is primary source.

---

## Purpose

Mementos are a **pre-game loadout system** — equippable items attached to the leader before a match begins, providing persistent bonuses that last the entire game. Exclusively unlocked through the **Legends** meta-progression system, which tracks cumulative accomplishments across playthroughs. Together, Legends + Mementos give Civ VII a cross-game reward loop absent from prior entries: finishing a session (even a loss) always advances unlocks, which translate into concrete starting advantages in future games.

Solves three designer-cited problems: (1) making losing a game feel rewarding, especially for new players; (2) providing reasons to finish campaigns rather than quitting early; (3) encouraging experimentation with the broad civ+leader roster by tying unlocks to specific leader playthroughs.

---

## Entities

- `PlayerState.equippedMementos` — (RW) — array of up to 2 Memento IDs attached to leader at game start
- `PlayerState.mementoSlots` — (R) — max = **2** per leader (uniform across all leaders)
- `PlayerState.attributes[attributeId]` — (RW) — six Attribute scores; modified at game start if Memento grants Attribute Points
- `PlayerState.units` — (W) — starting roster; modified if Memento grants free unit
- `PlayerState.gold` / `goldPerTurn` — (W) — modified if Memento grants starting Gold or per-Age bonus
- `LegendsState.foundationXP` — (RW) — Foundation Path (levels 1-50)
- `LegendsState.leaderXP[leaderId]` — (RW) — per-leader Leader Path (levels 1-10 each)
- `LegendsState.unlockedMementos` — (RW) — persistent across games
- `LegendsState.completedChallenges` — (RW) — once-per-challenge XP gate
- `PlayerCard.cosmeticCollectibles` — (RW) — badges, banners, titles, borders, background colors (separate from Mementos)

---

## Triggers

- **GAME_SETUP (pre-game):** equipped Mementos read; effects applied in order (Attribute grants first → unit grants → resource grants)
- **CHALLENGE_COMPLETE (any turn):** Challenge awards XP to relevant Path; completedChallenges updated to prevent double-award
- **LEGEND_LEVEL_UP:** unlock Memento or cosmetic for that level; added to persistent collection
- **GAME_END:** end-of-game Challenges contribute their XP; no separate Memento trigger
- **MULTIPLAYER_SESSION_SETUP:** host may disable Mementos; all players' slots = 0 that session

---

## Mechanics

### Pre-Game Loadout

Flow:
1. Select leader from roster
2. Setup screen shows 2 Memento Slots (uniform all leaders)
3. From unlocked collection, equip any Memento to either slot — **no leader restriction**. Memento earned on Tubman playthrough can go on Ashoka.
4. Empty slots allowed; provide no bonus
5. Confirming setup locks equipped Mementos for the game; cannot be changed mid-game

**Cross-leader flexibility is deliberate.** Dev diary example: Charlemagne's **Joyeuse** ("+Happiness per Cavalry Unit") equipped on Ashoka to synergize with her Food-from-Happiness bonus — cross-civ build-crafting.

### The Legends Meta-Progression

Three components:

1. **Challenges** — Foundation (any leader) + Leader (specific leader). Each completable once for XP.
2. **Paths** — XP tracks:
   - Foundation: levels 1-50, advanced by Foundation Challenges, 1 reward (Memento or cosmetic) per level
   - Leader: levels 1-10 per leader, advanced by that leader's Challenges, 1 reward per level (typically Mementos thematic to that leader)
3. **Rewards** — Mementos (gameplay) + Cosmetics (Badges, Banners, Titles, Borders, Background Colors — player card only)

The Challenges Log shows completed + pending challenges by leader and category. Exact UI surface not fully described.

### Challenge Structure & XP

Completing Challenges is the **only** way to earn Legend XP. No base play XP, no in-app purchase.

- **Foundation Challenges:** general gameplay accomplishments (any leader) — found X cities, reach certain Age, win specific victory path
- **Leader Challenges:** leader-specific accomplishments. Leader-path Mementos are thematically coherent (Lantern = Tubman/Underground Railroad; Joyeuse = Charlemagne's sword)

XP values per challenge not published `[INFERRED: varies by difficulty]`

### Memento Effect Categories (4 documented)

1. **Attribute Point grants** — e.g. **Complaint to Ea-nāṣir** (Foundation L2): "+1 Economic Attribute point" spent at game start
2. **Per-turn/per-Age resource bonuses** — e.g. **Sword of Brennus** (Foundation L5): "Gold per Age for every Settlement mercifully returned in Peace Deal"
3. **Free starting units or action-triggered units** — e.g. **Lantern** (Tubman L2): "free Migrant Unit in Capital for every successful undetected Espionage"
4. **Combat/unit-type bonuses** — e.g. **Joyeuse** (Charlemagne): "+Happiness per Cavalry Unit"

`[INFERRED]` — with ~100 Mementos across 40+ leaders + 50 Foundation levels, additional effect types (tile yields, diplomatic, faith, settlement bonuses) almost certainly exist but not enumerated in available sources.

### Attribute Point Interaction

Six Attributes: Cultural / Diplomatic / Economic / Expansionist / Militaristic / Scientific.

Leaders specialize in two (primary attributes). Points spent in primary attributes yield more benefit. Points gained normally: 1 per Age narrative event (3 over full game) + Wonders + victory rewards. Memento granting "+1 Economic" adds to this pool at game start — before first narrative event, creating small but meaningful early advantage.

### Cosmetic Layer

Player Card customization via Badges/Banners/Titles/Borders/Background Colors. Affects only main menu + multiplayer lobby display. Not equipped to Memento Slots. Customize screen serves as trophy-case display.

### Multiplayer

Mementos function normally. Host may set `mementosEnabled: false` during session setup to disable for all players (competitive fairness — players with more playthroughs would otherwise have equipment advantage).

---

## Formulas

```
// Pre-game application order
STEP 1: Apply Attribute Point grants (available turn 1)
STEP 2: Apply starting unit grants
STEP 3: Apply flat resource/Gold grants
// Conditional/ongoing effects remain as rules active for full game

// Path level thresholds [INFERRED — not published]
foundationLevel(xp) = floor(xp / XP_PER_FOUNDATION_LEVEL)
leaderLevel(xp) = floor(xp / XP_PER_LEADER_LEVEL)

// Pool calculations
// Foundation: 50 levels → 50 rewards
// Leader: 10 levels × ~40 leaders → ~400 leader-level rewards
// Total rewards pool: ~450
// Confirmed Mementos: "nearly 100" (dev diary)
// Implies: ~80-85% of path-level rewards are cosmetics [INFERRED ratio]

MEMENTO_SLOTS_PER_LEADER = 2  // uniform
```

XP thresholds unknown; not published by Firaxis or Fandom.

---

## Interactions

- `systems/leaders.md` — Memento sits atop Leaders; leader choice determines active Leader Path but doesn't restrict which Memento can be equipped
- `systems/ages.md` — per-Age Memento bonuses trigger at age transitions; Mementos themselves persist entire game
- `systems/legends.md` — Mementos are the gameplay-effective reward layer; Legends covers XP, paths, challenges, cosmetics
- `systems/diplomacy-influence.md` — Sword of Brennus triggers on peace-deal settlement return
- `systems/combat.md` — Joyeuse triggers on Cavalry unit presence
- `systems/victory-paths.md` — Challenges often mirror victory-path objectives; Mementos can accelerate via early Attribute Points

---

## Content flowing through this system

- [`content/mementos/`](../content/mementos/) — ~100 individual Memento items with ID, source Path/level, effect, associated leader (if Leader-path)
- [`content/leaders/`](../content/leaders/) — each leader's Leader Path (10 levels, ~10 Mementos associated)

---

## VII-specific (how this differs from VI/V)

- **Entirely new concept.** No prior series equivalent. Closest analogs (leader bonuses, civ uniques) were intra-game only, never cross-game equipment.
- **Cross-game persistent rewards** first seen in mainline Civ.
- **Leader-agnostic equipping.** Memento earned as any leader equippable on any leader.
- **Loss is rewarded.** Challenges complete regardless of victory/defeat.
- **No pay-to-unlock.** Dev diary: "exclusively by playing and completing challenges — no purchased options."
- **Slot count uniform at 2** per leader. No leader stacks more slots.
- **Multiplayer opt-out** at host level.

---

## UI requirements

- **Game Setup — Memento Slots panel:** 2 slots per leader; populated from unlocked collection; Memento name, icon, effect summary; empty slots visually distinct
- **Pre-game loadout summary:** before Start Game, list equipped Mementos + effects
- **Challenges Log:** main menu + in-game pause. Foundation / per-leader categories. Each Challenge: objective, status, XP, target Path. Filters by leader and status.
- **Legend Path progress:** Foundation bar (1-50) + Leader rows (one per leader, 1-10). Click reward → preview
- **Rewards notification** on Challenge complete or level-up
- **Customize screen:** Player Card editor for cosmetics only (separate from Memento equip)
- **Multiplayer lobby toggle:** "Disable Mementos for all players"

---

## Edge cases

- Zero Mementos unlocked: both slots present but empty. First Mementos earned via Foundation Challenges.
- Same Memento in both slots: `[INFERRED]` system likely prevents; one-item-not-stackable assumption
- More Mementos than opponent in multiplayer: both still have 2 slots; selection depth differs
- Host disables Mementos mid-lobby: selections preserved in UI but inactive at start `[INFERRED]`
- Memento effect references unit type civ lacks (Joyeuse on no-cavalry civ): valid equip, zero benefit — intended design space
- Conditional Memento + age transition same turn: Gold awarded for completed Age `[INFERRED: processed before age rebuild]`
- Memento grants conflicting starting unit: spawns as equivalent replacement `[INFERRED]`
- Leader Path at level 10 (max): `[INFERRED]` additional challenges track completion cosmetically
- Foundation Path at level 50 (max): undescribed; `[INFERRED]` no further XP significance
- Challenge completed in abandoned session: `[INFERRED]` unclear whether XP awarded at session end or at challenge time

---

## Open questions

- Exact XP thresholds per Foundation Path level (1-50)
- Exact XP thresholds per Leader Path level (1-10)
- Full enumeration of Foundation + Leader Challenges
- Foundation Path level-50 special reward
- Whether abandoned sessions contribute XP
- Duplicate-slot equipping enforcement
- Full Memento effect types (only 4 of ~100 confirmed)
- UI sequencing: Memento equip before or after leader finalize?
- Whether Mementos unlock sequentially within Path or any order
- DLC leader Leader Path availability

---

## Mapping to hex-empires

**Status tally:** 0 MATCH / 0 CLOSE / 0 DIVERGED / 6 MISSING / 0 EXTRA
**Audit:** [.codex/gdd/audits/mementos.md](../audits/mementos.md)
**Highest-severity finding:** F-01 — `MementoDef` type and `MementoId` union absent (MISSING, HIGH)
**Convergence status:** Partial — 6 VII mechanic(s) absent

_(Full details in audit file. 6 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

Primary source: Firaxis Dev Diary #7 (only authoritative first-party source). Fandom pages 403'd — the main research gap. Fextralife Attributes page provided context for Attribute Point Memento effect type.

The "nearly 100 Mementos" + ~450 path-level rewards implies ~80-85% cosmetic ratio — `[INFERRED]`, verify against full Memento list when Fandom becomes accessible.

The 4 named Memento examples cover Attribute grants, per-Age conditional Gold, free-unit-on-espionage, and combat-type happiness — representative but don't cover full ~100-item range.

Write/Bash permissions denied to subagent; parent wrote from fenced-block extraction.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
