# Legends — Civ VII

**Slug:** `legends`
**Bucket:** `legends`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/legends-mementos/ — Firaxis Dev Diary #7: Legends & Mementos
- https://gamerant.com/civilization-vii-civ-7-how-level-up-leader-foundation/ — Game Rant: How to Level Up the Foundation Path and Leaders
- https://gamerant.com/civilization-7-civ7-legend-unlocks-explained/ — Game Rant: How Legend Unlocks Work in Civilization 7
- https://screenrant.com/civ-7-legends-mementos-explained/ — Screen Rant: Legends & Mementos, Explained
- https://screenrant.com/civ-7-all-attribute-tree-legend-unlocks/ — Screen Rant: All Attribute Tree Legend Unlocks
- https://www.thegamer.com/civilization-7-legend-unlocks-cards-nodes-guide/ — The Gamer: Legend Unlocks guide
- https://gameranx.com/features/id/532499/article/civilization-7-all-mementos-and-how-to-unlock-them/ — Gameranx: All Mementos
- https://forums.civfanatics.com/threads/a-guide-to-attribute-points-how-to-get-more-of-them.698260/ — CivFanatics: Attribute Points Guide
- https://steamcommunity.com/app/1295660/discussions/0/598519514348393349/ — Steam: Level 10 Leader progression

**Source conflicts noted:** None material. Exact XP-per-level thresholds not published by Firaxis and not found in any source.

---

## Purpose

Legends is Civ VII's cross-game meta-progression layer — a persistent achievement system that rewards players for playing the same leaders repeatedly and pursuing a wide range of in-game feats across multiple campaigns. It solves a problem the Civ series has carried since Civilization II: once a player has mastered the game, successive campaigns offer no reward differentiation between a narrow specialist and a broad explorer. Legends creates explicit, cumulative incentives to try different leaders, complete all four legacy paths, and replay the game with the same leader for deepening mechanical unlocks. It is entirely new in VII; no equivalent meta-progression layer exists in any prior Civ installment. By design, it has no time limits, no Battle Pass, and no real-money shortcut — all unlocks are earned purely by playing.

---

## Entities

- `AccountState.foundationLevel` — (RW) — current Foundation Path level (1–50); persists across all campaigns, tied to the player's 2K account
- `AccountState.foundationXP` — (RW) — cumulative Foundation XP earned toward the next Foundation level
- `AccountState.leaderLevels` — (RW) — `Map<LeaderId, 1..10>` — per-leader level; persists across all campaigns
- `AccountState.leaderXP` — (RW) — `Map<LeaderId, number>` — per-leader cumulative XP
- `AccountState.challengesCompleted` — (RW) — set of completed challenge IDs (Foundation + Leader)
- `AccountState.unlockedMementos` — (RW) — set of unlocked Memento IDs; built up over all campaigns, usable by any leader once unlocked
- `AccountState.unlockedAttributeNodes` — (RW) — `Map<LeaderId, AttributeNodeId[]>` — per-leader attribute nodes made selectable in future games
- `AccountState.unlockedLegacyCards` — (RW) — `Map<LeaderId, LegacyCardId[]>` — per-leader Legacy Cards
- `AccountState.cosmetics` — (RW) — set of unlocked badges, banners, titles, borders, background colors
- `PlayerState.equippedMementos` — (RW) — array of 0–2 Memento IDs selected at campaign setup
- `PlayerState.mementoSlotCount` — (R) — number of usable Memento slots; 0 if Foundation level 1, 1 if level 2–4, 2 if level 5+
- `GameState.currentLeaderId` — (R) — determines which Leader Path receives XP from completed Leader Challenges

---

## Triggers

- **On challenge completion:** evaluate whether a Foundation or Leader Challenge has been satisfied; if yes, award the appropriate XP once.
- **On XP award:** check whether `foundationXP` or `leaderXP[leaderId]` crossed the next level threshold; if yes, increment level and award reward.
- **On Foundation level increment:** unlock the corresponding reward (Memento, cosmetic, or Memento slot).
- **On Leader level increment:** unlock the corresponding reward (Memento, Attribute Node, Legacy Card, or cosmetic).
- **On campaign setup:** player selects 0–`mementoSlotCount` Mementos from `unlockedMementos`.
- **On age transition:** available Legacy Cards are expanded by any `unlockedLegacyCards` for the current leader.
- **On attribute tree selection in-game:** attribute nodes in `unlockedAttributeNodes[leaderId]` are selectable; others locked.

---

## Mechanics

### Path types

**Foundation Path** is shared across all leaders. 50 levels, advanced by Foundation Challenges (any leader). 265 Foundation Challenges total, designed to exactly reach level 50.

**Leader Paths** are per-leader. 10 levels each, advanced by leader-specific challenges. 57 challenges per base-game leader (51 per DLC persona), 1,446 challenges total.

These two paths are fully independent.

### Challenge structure

Challenges are the sole source of Legend XP. No passive gains, no time-limited events. A challenge is permanently marked complete on first completion.

**Foundation Challenge categories (265 total):**

| Category | Count | Description |
|---|---|---|
| Tutorials | 16 | Basic gameplay objectives |
| Wonders | 32 | Building each civilization's unique wonder |
| Civ Victories | 32 | Completing Legacy Paths with each civilization |
| Milestones | 151 | Cumulative metrics (turns played, ages completed, etc.) |
| Accomplishments | 34 | Complex in-game feats |

**XP values per challenge:**
- Tutorial: 10 XP each `[INFERRED]`
- Milestone: 25–75 XP each
- Wonder/Civ Victory/Accomplishment: 25–100 XP each `[INFERRED range]`
- Special capstone ("Wondrous"): 100 XP

### Foundation Path reward schedule

Rewards at every level 2 through 50. First 6 Mementos (levels 2–4) each grant +1 to one of the six Attribute types.

Memento slot unlocks at levels 2 and 5.

**Confirmed Foundation Path Memento unlocks:**

| Level | Reward |
|---|---|
| 2 | Inscribed Sling Bullet (+1 Military Attribute) |
| 2 | Complaint to Ea-nasir (+1 Economic Attribute) |
| 2 | Memento Slot 1 |
| 3 | Treaty of Kadesh (+1 Diplomatic Attribute) |
| 3 | Groma (+1 Expansionist Attribute) |
| 4 | Shakokidogu (+1 Cultural Attribute) |
| 4 | Antikythera Mechanism (+1 Scientific Attribute) |
| 5 | Sword of Brennus (+400 Gold per returned Settlement in Peace) |
| 5 | Memento Slot 2 |
| 6 | Lydian Lion (+200 Gold per Age at age start) |
| 7 | Imago Mundi (+3 Sight for Scout Search/Lookout) |
| 8 | Corpus Juris Civilis (+1 Social Policy Slot) |
| 9 | The Travels of Marco Polo (+50 Gold per 100 tiles explored) |
| 14 | Equestrian Figure (−50% Commander Recovery Time) |
| 19 | Pochteca Backpack (+5 Trade Route Range) |
| 24 | Colada & Tizona (+2 CS adjacent to 2+ enemy units) |
| 29 | Shisa Necklace (+100 Influence on Suzerain) |
| 34 | Agincourt Arrowhead (+1 Movement for Ranged Units) |
| 39 | Garuda Statue (+1 Pop to smallest Settlement on Celebration) |
| 44 | The Art of War (Commander XP bonus) |
| 49 | Royal Game of Ur (Science/Culture catch-up bonus) |

Levels not listed unlock cosmetic rewards (Badges, Banners, Titles, Borders, Background Colors). **Total Foundation Path Mementos: 18.**

### Leader Path reward schedule

Each leader has a fixed 10-level schedule.

| Level | Reward type |
|---|---|
| 2 | Memento (leader-specific) |
| 3 | Attribute Node unlock (leader's primary attribute) |
| 4 | Legacy Card unlock (Exploration-age transition) |
| 5 | Memento (leader-specific) |
| 6 | Cosmetic |
| 7 | Attribute Node unlock (leader's secondary attribute) |
| 8 | Legacy Card unlock (Modern-age transition) |
| 9 | Memento (leader-specific) |
| 10 | Cosmetic |

Each leader contributes 3 Mementos, 2 Attribute Nodes, 2 Legacy Cards, 2 cosmetics. With ~25 base-game leaders, this yields ~75 leader-specific Mementos. Combined with 18 Foundation Mementos: ~84 unique Mementos (Firaxis says "nearly 100", difference likely DLC).

**Example leader attribute node unlocks:**

| Leader | Level 3 | Level 7 |
|---|---|---|
| Catherine the Great | Cultural | Scientific |
| Confucius | Scientific | [INFERRED] |
| Benjamin Franklin | Scientific | [INFERRED] |
| Augustus | Expansionist | [INFERRED] |
| Isabella | Economic | [INFERRED] |

### Attribute Node unlocks (in-game)

Nodes unlocked via Legends are visible but greyed-out until the prerequisite leader level is reached in a prior campaign. Once unlocked via Legends, the node becomes permanently selectable.

| Attribute | Node bonus |
|---|---|
| Economic | +25% Gold from Trade Routes / Treasure Fleets |
| Militaristic | +5 Combat Strength vs. Districts |
| Diplomatic | +/−25% relationship changes |
| Expansionist | +50% Gold for Town-to-City conversion |
| Cultural | +15% Production for Great Works buildings |
| Scientific | +1 Adjacency to Economic buildings |

### Legacy Card unlocks (in-game)

Legacy Cards at age transitions. Leaders at level 4+ get an additional Exploration-age card; level 8+ get an additional Modern-age card. Bonus cards are leader-exclusive and linked to that leader's attribute.

### Memento mechanics

**Definition.** Equipment items equipped to a leader at pre-game campaign setup. Passive bonuses active throughout entire game. Not per-age.

**Slots.** Up to 2 per leader. Slot 1 at Foundation level 2; Slot 2 at Foundation level 5.

**Cross-leader availability.** Once unlocked — whether via Foundation or any Leader Path — usable by any leader.

**Effect categories.** Attribute grants, gold/economy, military, expansion, influence, production, catch-up, trade routes.

**Changing mid-game.** Community reports suggest swap behavior was patched. Treat as "locked at campaign start" `[INFERRED]`.

### Challenge log and UI

Three icons at top right of main menu. Shows Foundation level, all leader levels, challenge log (completed/in-progress/locked), unlocked cosmetics.

### 2K account requirement

Progress tied to 2K account. Persists across reinstalls, platforms. Cross-platform via 2K cross-progression. Account link required. Not save-file bound. Dev diary: "no FOMO — all persists forever."

---

## Formulas

```
// XP thresholds not published [INFERRED structure]
Foundation_XP_to_level_N = f(N)  // monotonically increasing
Total_Foundation_XP = sum(xp_i for 265 Foundation Challenges) = design-targeted to level 50

Leader_XP_to_level_N = g(N)
Total_Leader_XP_per_leader = sum(xp_j for 57 challenges) = design-targeted to level 10

AttributeNode_1_level = 3
AttributeNode_2_level = 7
LegacyCard_Exploration_level = 4
LegacyCard_Modern_level = 8
MementoSlot_1_level = 2  (Foundation Path)
MementoSlot_2_level = 5  (Foundation Path)

Total_Mementos = 18 (Foundation) + 66 (Leader) = 84
// Firaxis: "nearly 100"; difference likely DLC.
```

---

## Interactions

- `systems/leaders.md` — Leader Path is per-leader; Legends-unlocked Attribute Nodes and Legacy Cards expand leader kit
- `systems/ages.md` — Legacy Cards unlocked via Legends expand age-transition choices
- `systems/legacy-paths.md` — most Leader Challenges are "complete Legacy Path [N times] as [leader]"
- `systems/mementos.md` — primary mechanical reward; Legends gates loadout pool
- `systems/government-policies.md` — Corpus Juris Civilis grants +1 Social Policy slot
- `systems/combat.md` — multiple Mementos affect combat
- `systems/commanders.md` — Equestrian Figure reduces Commander Recovery; The Art of War boosts Commander XP
- `systems/diplomacy-influence.md` — Shisa Necklace grants Suzerain Influence
- `systems/trade-routes.md` — Pochteca Backpack extends Trade Route range
- `systems/victory-paths.md` — Civ Victory challenges require completing Legacy Paths

---

## Content flowing through this system

- [`content/mementos/`](../content/mementos/) — ~84 Memento items
- [`content/leaders/`](../content/leaders/) — per-leader 10-level Path rewards
- [`content/civilizations/`](../content/civilizations/) — Civ Victory challenges cover all civs

---

## VII-specific (how this differs from VI/V)

- **No VI/V analog.** First cross-campaign meta-progression in series history.
- **Account-bound, not save-bound.** Persists across devices and reinstalls.
- **Mechanical unlocks, not just cosmetics.** Attribute Nodes and Legacy Cards are gameplay-impactful.
- **Two-tier structure (Foundation + Leader)** — breadth vs depth.
- **Non-FOMO design.** No time-limited events.
- **Leader attribute tree directly affected** by meta-progression.
- **Memento equip screen.** Pre-game loadout entirely new.

---

## UI requirements

- **Pre-game loadout screen** — Memento slots; picker drawer; slot count reflects Foundation level
- **Legend progress panel (main menu)** — Foundation level + XP bar; all Leader levels
- **Challenges log panel** — tabbed (Foundation/per-leader), by category
- **Level-up notification** — reward-reveal screen
- **Player card customization** — badge, banner, title, border, background
- **Attribute tree locked-node indicator** — tooltip + audio cue on click
- **Age-transition Legacy Card pool** — bonus cards marked
- **New-challenge badge** on main-menu Legends icon

---

## Edge cases

- First-ever campaign: no Mementos, no slots. Loadout screen empty. Intended state.
- All 265 Foundation Challenges complete: should reach exactly level 50. Overflow silently discarded `[INFERRED]`.
- DLC leader without DLC ownership: behavior unspecified.
- Memento swap at age transition: status unclear post-patch.
- Same Memento in multiplayer: not exclusive across players.
- No 2K account link: Legends inaccessible.
- Legacy Card unlocked but Attribute not held: card unusable that campaign.

---

## Open questions

- Exact XP-per-level thresholds for Foundation and Leader Paths (not published anywhere)
- Memento mid-game swap post-patch status
- Full cosmetic-per-level schedule
- DLC Memento roster (the gap between 84 confirmed and Firaxis's "nearly 100")
- Whether Foundation challenges can be patched away
- Locked-node tooltip exact content

---

## Mapping to hex-empires

**Status tally:** 0 MATCH / 0CLOSE / 0 DIVERGED / 4 MISSING / 0 EXTRA
**Audit:** [.claude/gdd/audits/legends.md](../audits/legends.md)
**Highest-severity finding:** F-02 — Foundation Path level + XP tracking absent (MISSING, HIGH)
**Convergence status:** Partial — 4 VII mechanic(s) absent

_(Full details in audit file. 4 total finding(s). Regenerated by `.claude/scripts/aggregate-audits.py`.)_

## Author notes

Fandom Wiki pages for Legend_(Civ7) and Legend_Path_(Civ7) both returned 403. Firaxis Dev Diary was accessible and highest-quality. The significant gap is the XP-per-level curve — not found in any source. "Confidence: medium" reflects that reward schedule is sourced but XP math is unknown.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
