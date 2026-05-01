# Ages — Civ VII

**Slug:** `ages`
**Bucket:** `ages`
**Status:** `draft`
**Confidence:** `high`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4.6` (worked example written by parent)

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/ages/ — Firaxis Dev Diary #1: Ages
- https://civilization.2k.com/civ-vii/game-guide/gameplay/ages-explanation/ — Firaxis: Ages gameplay explained
- https://civilization.fandom.com/wiki/Age_(Civ7) — Fandom: Age (Civ7)
- https://www.pcgamer.com/games/strategy/civilization-7-age-transition-effects/ — PC Gamer: Everything that happens in a Civ 7 age transition
- https://www.thegamer.com/civilization-7-guide-to-the-age-system/ — The Gamer: Ages System Guide
- https://civfanatics.com/civ7/civ-vii-gameplay-mechanics/civilization-vii-ages/ — CivFanatics: Civilization VII Ages

**Source conflicts noted:** None material. The sources agree on the headline mechanics (3 ages, simultaneous transition, leader persistence, legacy path carry-forward). Minor disagreement on exact turn counts per age (see Edge cases).

---

## Purpose

Civ VII's Ages system carves a single game into three distinct acts — **Antiquity**, **Exploration**, **Modern** — each with its own civilization roster, tech/civic tree, resource set, map extent, and thematic focus. Ages solve the long-identified "late-game problem" in the Civ series, where technological snowballing and player familiarity made the final third of a game a formality; by forcing every player through simultaneous age transitions with partial state resets, the game re-establishes tension and re-opens strategic space three times per match.

---

## Entities

- `PlayerState.currentCiv` — (RW) — civ changes on every age transition
- `PlayerState.leader` — (R) — persists across all ages
- `PlayerState.legacyPoints` — (RW) — accrued during each age via victory-path milestones
- `PlayerState.goldenAges` — (RW) — per-category record of completed legacy paths
- `PlayerState.darkAges` — (RW) — per-category record of missed legacy paths
- `PlayerState.traditions` — (RW) — social policies from previous ages; persist as selectable options
- `GameState.currentAge` — (RW) — `antiquity | exploration | modern`
- `GameState.ageTurnCount` — (R) — turns elapsed in current age (used by crisis + transition trigger)
- `GameState.crisisPhase` — (RW) — `none | imminent | active | resolved`
- `CityState.buildings` — (RW) — on transition, non-ageless buildings are marked obsolete; ageless (e.g. Warehouses) persist
- `CityState.tiles[].improvement` — (RW) — civ-unique improvements persist as "ageless"; most standard improvements refresh
- `CommanderState.xp` / `.level` / `.promotions` — (R) — persist untouched across transitions
- `Tile.resource` — (RW) — resource layer is partially refreshed (new resources appear per new age)
- `Map.explored` — (R) — exploration state persists; but new map regions ("Distant Lands") are revealed on transition to Exploration

---

## Triggers

- **On END_TURN (every turn):** increment `ageTurnCount`; evaluate whether to enter `crisisPhase = 'imminent'` (typically ~15 turns before projected age end).
- **On crisis end (after player resolution of all crisis events):** progress `crisisPhase` to `resolved`. Crisis resolution gates age transition.
- **On age-end trigger (fired by GameState when crisis is resolved AND age-turn threshold reached):** all players simultaneously enter the age-transition flow. Turns pause until every human player has completed transition choices.
- **On transition completion (all players selected new civ + legacies):** game resumes in the new age; `currentAge` advances; per-age state is rebuilt (see Mechanics § 3).
- **Modern age end:** victory check fires; no further transition — this is the game's natural conclusion.

---

## Mechanics

### Age 1 — Antiquity

The starting age. Players begin with a Settler and a Warrior near a starting position, with a thin resource layer (bonus resources only, some luxuries), a small playable map area (only the "Homelands" region is revealed), and restricted tech/civic trees focused on foundational mechanics: agriculture, masonry, bronze working, and basic governance.

Religion in Antiquity is limited: players may adopt a **Pantheon** (one-time empire-wide bonus bought with 25 Faith), but there is no religion founding, no spread, and no religious units. Pantheons do NOT carry to Exploration. See `systems/religion.md`.

Antiquity ends at approximately turn 150–200 at standard speed.

### Age 2 — Exploration

Triggered by the Antiquity → Exploration age transition (§ 3). On entry:

- The map expands: **Distant Lands** (previously-hidden second region) become reachable via the new **Naval** tech path.
- Resources refresh: new luxury and strategic resources appear on the map.
- Religion becomes central: players can found a **Religion** by investing faith; religions spread to cities and grant per-city bonuses. See `systems/religion.md`.
- Civ rosters change: player selects a new civilization from the Exploration roster (Abbasid, Chola, Spain, etc.).
- A new Civics tree and Tech tree are active, themed around this age's focus: navigation, colonization, printing, banking.

Exploration ends at approximately turn 150–200 in that age.

### Age 3 — Modern

Triggered by the Exploration → Modern age transition. The final age, thematically spanning industrialization through atomic / information era. The game ends at the conclusion of this age via victory condition check. There is no Age 4.

### Age transition flow (the core mechanic)

Age transitions happen **simultaneously for all players** — play pauses globally until every player has made their transition choices. The flow is:

1. **Crisis phase fires** (late in current age, typically ~15 turns before age end): one or more crisis events threaten the empire. Player must choose responses via Crisis Policies. Crisis must resolve before transition can occur. See `systems/crises.md`.
2. **Legacy evaluation:** each of the four victory paths (Economic / Military / Cultural / Scientific) tallies milestones completed this age.
    - Completing ALL milestones of a path → **Golden Age Legacy** for that category in the next age.
    - Completing SOME milestones but not all → neutral (legacy points earned but no golden-age bonus).
    - Completing ZERO milestones of a path → **Dark Age Legacy** for that category in the next age.
3. **Civ selection:** player picks a new civilization from the next age's roster. Options are filtered:
    - **Historical-path unlocks** — e.g. Antiquity Egypt → Exploration Abbasid, Maurya → Chola. These are emphasized/highlighted.
    - **Geographical / resource unlocks** — if the player has certain resources or map positions, they unlock additional civ choices (e.g. controlling a horse-adjacent area unlocks Mongolia).
    - **Leader-preferred unlocks** — the leader's attributes contribute to which civs are recommended.
    - All players can always pick from a base set of "default" civs regardless of path.
4. **Legacy selection:** player chooses which earned Legacy Bonuses to activate in the new age. Typically caps exist (e.g. "pick 2 of 4"). The unchosen bonuses are discarded — they do not persist beyond the transition window.
5. **World evolution:** with all players' choices confirmed, the game transitions: `currentAge` advances, per-age state is rebuilt (see § 5 below), crisis state clears, the map may expand, new resources appear, new tech/civic trees become active.

### Per-age state rebuild — what resets vs persists

The transition is a **partial reset** — the core of Civ VII's design. The exact split:

**Persists across transition:**
- **Leader** — unchanged. All leader attributes, agendas, unique ability.
- **Relationships** (diplomacy) — wars, alliances, opinions with other leaders carry over.
- **Territory** — city borders, settlement positions, claimed tiles unchanged.
- **Cities themselves** — still owned by the same player, still at the same position.
- **Commanders** — military commanders retain XP, levels, and promotions. This is the *only* unit type explicitly confirmed to persist.
- **Ageless buildings** — e.g. Warehouses. Flagged `Ageless: true` in the building data.
- **Civ-unique tile improvements** — flagged as ageless implicitly.
- **Traditions** — social policies adopted in past ages become reusable across future ages.
- **Legacy Points / Golden Ages / Dark Ages** — per-category records build across the full game.
- **Map exploration state** — revealed tiles stay revealed (though new map regions may be added).

**Resets / replaces across transition:**
- **Civilization identity** — new civ chosen by player. All civ uniques (unique unit, unique civic, unique improvement, unique quarter) are replaced by the new civ's.
- **Tech tree** — replaced with the new age's tree. Mid-research progress is lost.
- **Civic tree** — replaced with the new age's tree.
- **Non-ageless buildings** — flagged obsolete; stop producing yields; may be demolished/replaced. Some may grant retroactive bonuses on demolition.
- **Most units** — non-commander units do not reliably persist. (Sources disagree slightly here; some say units persist but are weak against new-age tech; others say units obsolete entirely. Tag `[INFERRED]`: likely units persist but become obsolete combat-wise. Re-verify.)
- **Resource layer (partial)** — some previous resources removed; new age resources seed in.
- **Religion** — Antiquity→Exploration: Pantheon does NOT carry; Exploration→Modern: Religion persists but with different mechanics (less emphasis).
- **Crisis state** — clears to `none`.
- **`ageTurnCount`** — resets to 0.

### Age-duration controls

Age length is modifiable by game-speed settings:

- **Quick** — ~100 turns per age
- **Standard** — ~150–200 turns per age (default, source cites 3–4 hours)
- **Epic** / **Marathon** — longer [INFERRED based on Civ series convention; verify at `systems/map-terrain.md` or game-speed doc]

Players also accelerate age-end by completing legacy milestones early — pushing more milestones to completion accelerates the age-end countdown.

---

## Formulas

```
ageEndProgress = sum(legacyMilestonesComplete * milestoneWeight) + ageTurnCount / ageTurnTarget

ageTurnTarget:
  Quick     -> 100
  Standard  -> 180  // [INFERRED, mid-range of sourced 150-200]
  Epic      -> ~280 // [INFERRED from Civ convention]

crisisTriggerTurn = ageTurnTarget - CRISIS_LEAD_TURNS
CRISIS_LEAD_TURNS = 15  // [INFERRED from "typically ~15 turns before age end"]

transitionReady = ageEndProgress >= 1.0 AND crisisPhase == 'resolved'
```

Where:
- `milestoneWeight` is per victory path and per-age. Firaxis does not publish per-milestone weights; community reverse-engineering suggests all milestones within a path are weighted equally. `[INFERRED]`
- `ageTurnTarget` ranges 150–200 at standard speed per Fandom / Firaxis; the 180 midpoint is a reasonable default for modeling.

---

## Interactions

- `systems/legacy-paths.md` — this system reads legacy-path progress to determine Golden/Dark age bonuses on transition.
- `systems/crises.md` — this system is gated by crisis resolution; transition cannot fire while crisis is active.
- `systems/civilizations.md` — civ-selection step of transition filters the civ roster based on path unlocks.
- `systems/leaders.md` — leader persists untouched; leader attributes influence civ-selection hints.
- `systems/religion.md` — pantheon invalidated at Antiquity→Exploration; religion mechanics change at each transition.
- `systems/tech-tree.md` / `systems/civic-tree.md` — trees swap on transition; mid-research progress lost.
- `systems/commanders.md` — commanders explicitly persist (rare exception among units).
- `systems/map-terrain.md` — map expands on Antiquity→Exploration (Distant Lands reveal).
- `systems/victory-paths.md` — the four paths are what legacy milestones track.
- `systems/narrative-events.md` — narrative events can be "age-tagged" and only fire in specific ages; some carry story threads across ages via tags.

---

## Content flowing through this system

- [`content/civilizations/antiquity/`](../content/civilizations/antiquity/) — 10+ civs available in Antiquity
- [`content/civilizations/exploration/`](../content/civilizations/exploration/) — 10+ civs available in Exploration
- [`content/civilizations/modern/`](../content/civilizations/modern/) — 10+ civs available in Modern
- [`content/crisis-cards/`](../content/crisis-cards/) — crisis content per end-of-age
- [`content/technologies/`](../content/technologies/) — age-gated tech trees (Antiquity/Exploration/Modern sub-folders)
- [`content/civics/`](../content/civics/) — age-gated civic trees

---

## VII-specific (how this differs from VI/V)

- **Three ages with full civ swap per age** — unprecedented in the series. VI had a single civ from start to finish; VII forces a three-civ arc.
- **Simultaneous global transition** — all players transition at once, vs VI's per-player era progression where different players were in different eras simultaneously.
- **Partial state reset** — tech tree + civic tree wipe. In VI these were cumulative.
- **Legacy path as explicit scoring mechanic** — replaces VI's "era score" with a more concrete per-path milestone structure.
- **Crisis as mandatory transition gate** — VI's dark-age/heroic-age system was a passive consequence of era score; VII turns it into an active player-choice flow (crisis policies).
- **Commanders persist explicitly** — VI had no commander class; no comparable persistence mechanic.
- **Pantheon does NOT become a religion** — VI's pantheons seeded religion founding. VII's pantheon is strictly an Antiquity bonus and is discarded at transition; religion is a fresh system in Exploration.

---

## UI requirements

- **Age banner** — persistent top-of-screen indicator showing current age (Antiquity / Exploration / Modern), turns remaining, visible progress bar toward age end.
- **Crisis panel** — activates when `crisisPhase == 'imminent'`. Player resolves crisis policies here. Blocks END_TURN when action required.
- **Age transition modal** — multi-step ceremony: crisis-resolution summary → legacy evaluation (which paths hit Golden / Dark) → civ selection (cards showing each unlockable civ with unique abilities) → legacy bonus selection → world-evolution animation. This is the "big narrative moment" of each transition.
- **Legacy progress HUD** — secondary overlay showing per-path (Economic / Military / Cultural / Scientific) milestone progress. Player can open a panel to see full milestone list.
- **Commander persistence indicator** — at transition screen, show the player their preserved commanders (ego-stroke, reinforces "these carry").
- **New civ unique showcase** — first turn of new age shows the player's new civ's uniques on a popup.

---

## Edge cases

- What if a player is eliminated mid-age? No transition for them; game continues for surviving players; eliminated player locked out of transition flow.
- What if a player refuses to pick a new civ during transition? [INFERRED] Default civ is auto-assigned based on leader preference + geographic unlocks. Sources don't confirm the exact fallback but game cannot stall.
- What if two players have the same pick for "historical path" civ? Both get it — civs are not mutually exclusive across players. (Multiple Romes across multiple players possible.)
- What if player is at war during transition? Wars persist; diplomatic state unchanged.
- What if a commander is mid-movement when transition fires? Transition pauses game; commander stays in place; movement resumes next turn.
- What if an Exploration civ is a "natural descendant" of multiple Antiquity civs (e.g. Inca descendants from pre-Columbian culture)? Multiple path-unlock conditions may apply; player still picks one.
- What if a player completes zero milestones in ALL four legacy paths? Four dark ages simultaneously in next age. Brutal but survivable.
- What happens to religion founders at Exploration→Modern? [INFERRED] Religion persists but with reduced role. Exact mechanic unclear from sources.
- What if the crisis is resolved 50 turns before the age-end turn threshold? Transition waits until turn threshold is also hit. Crisis resolution is a *gate*, not a *trigger*.

---

## Open questions

- Exact `ageTurnTarget` per speed setting — sources cite "150-200" range at standard speed; per-speed table not published.
- Exact milestone weights within a legacy path — community reverse-engineering suggests equal; no official confirmation.
- Whether non-commander units persist across transitions in *any* form (obsolete? deleted? converted?) — sources disagree. Verify before implementing.
- Whether pantheon bonuses have any carry-forward trace (e.g. a Golden Age religious bonus for having adopted a pantheon). Unclear from sources.
- Exact behavior when a player picks an Exploration civ whose uniques conflict with their Antiquity holdings (e.g. replacing a unique unit that was still in production). Likely: in-production unique units are completed-as-old-civ, future production uses new-civ uniques. [INFERRED]
- The full list of "ageless" building types — Warehouse is confirmed, others not explicitly enumerated.
- Whether crises can be skipped entirely (e.g. if the player has resolved enough narrative events, does the crisis weaken?). Unclear.

---

## Mapping to hex-empires

**Status tally:** 4 MATCH / 3 CLOSE / 4 DIVERGED / 5 MISSING / 1 EXTRA
**Audit:** [.codex/gdd/audits/ages.md](../audits/ages.md)
**Highest-severity finding:** F-01 — `transition-not-simultaneous` (DIVERGED, HIGH)
**Convergence status:** Divergent — 4 finding(s) require(s) architectural refactor

_(Full details in audit file. 17 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

Written by the parent session as a worked example showing the target depth and citation discipline for system-level GDD docs. Every mechanical claim here traces to a cited URL or is tagged `[INFERRED]`. The agents writing the other 22 systems should treat this file as the bar — not the floor.

Future agents: if you discover a source that contradicts a non-`[INFERRED]` claim here, flag it in your own doc's `Open questions` and note the URL. The parent reconciles in the cross-reference phase.
