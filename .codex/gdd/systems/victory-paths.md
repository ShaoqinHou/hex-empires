# Victory Paths — Civ VII

**Slug:** `victory-paths`
**Bucket:** `victory`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/victories-post-launch/ — Firaxis Dev Diary #8
- https://gamerant.com/civilization-7-all-victory-conditions-explained-civ-7-victories-guide-culture-economic-military-science-legacy-path-modern-age/ — Game Rant
- https://www.pcgamer.com/games/strategy/civilization-7-victory-legacy-paths-win-conditions-guide/ — PC Gamer
- https://comradekaine.com/civilization7/golden-ages-legacy-options-and-rewards-in-civ-7/ — ComradeKaine
- https://screenrant.com/how-to-complete-all-legacy-paths-in-civ-7s-antiquity-age/ — Screen Rant: Antiquity
- https://screenrant.com/civ-7-complete-legacy-paths-exploration-age/ — Screen Rant: Exploration
- https://www.thegamer.com/civilization-7-vii-victory-conditions-explained-guide/ — TheGamer
- https://game8.co/games/Civ-7/archives/495102 — Game8
- https://www.method.gg/civ-7/all-victory-conditions-in-civilization-7-and-how-to-achive-them — Method.gg
- https://www.pcgamesn.com/civilization-vii/victories — PCGamesN

**Source conflicts noted:** Antiquity Economic milestone cap — 20 vs 25 Resources; using 20 (ComradeKaine). Modern Military — Manhattan Project Wonder + Operation Ivy prerequisite chain. Domination scope — IPs excluded (Method.gg).

---

## Purpose

Victory Paths give players long-range goals that accumulate across all three ages. Instead of a terminal condition in one final era, every age contributes: milestones in Antiquity and Exploration build Legacy Points and unlock Golden Age bonuses that accelerate the Modern-age terminal condition. Four distinct paths (Cultural, Economic, Military, Scientific) ensure early-game divergence vs late-game convergence.

---

## Entities

- `PlayerState.legacyPoints[path]` — (RW) — per path; accumulates across all three ages
- `PlayerState.legacyBonuses[]` — (RW) — activated carry-forward bonuses from transitions
- `PlayerState.goldenAgePaths[]` — (RW) — paths with all milestones per age
- `PlayerState.darkAgePaths[]` — (RW) — paths at zero milestones per age
- `PlayerState.ideologyPoints` — (RW) — Modern-age Military counter
- `PlayerState.railroadTycoonPoints` — (RW) — Modern-age Economic counter
- `PlayerState.artifactsDisplayed` — (RW) — Cultural path tracker
- `PlayerState.spaceMilestonesComplete` — (RW) — 0-3 completed space projects
- `GameState.victoryWinner` — (W) — set when any terminal condition fires
- `GameState.ageProgress` — (R) — Modern 100% triggers Score Victory if winner null

---

## Triggers

- **END_TURN** — evaluate per-age path counters; award Legacy Points at thresholds; Modern Age: accumulate Railroad Tycoon points
- **FOUND_SETTLEMENT / CONQUER_SETTLEMENT** — increment Pax Imperatoria (Antiquity), Non Sufficit Orbis (Expl), Ideology Points (Modern)
- **BUILD_WONDER** — increment Wonders count; validate Manhattan Project for Military victory
- **COMPLETE_GREAT_WORK** — increment Codex (Ant Sci), Relic (Expl Cul), when displayed
- **COMPLETE_PROJECT** — space sequence; Operation Ivy → victory
- **ESTABLISH_WORLD_BANK_OFFICE** — decrement remaining target capitals; last capital → Economic victory
- **BUILD_WONDER (World's Fair)** — Cultural victory fires
- **age transition** — Golden/Dark Age evaluation per path; package Legacy Bonuses; reset counters
- **Modern Age ≥ 100%** — if no winner, evaluate highest total `legacyPoints` → Score Victory
- **all rivals eliminated** — Domination Victory fires

---

## Mechanics

### Four Victory Paths Overview

Each path spans all three ages. Antiquity and Exploration have a named sub-track with **3 milestones**. Each threshold awards **1 Legacy Point** + unlocks a named Legacy Bonus. Completing all 3 = **Golden Age Legacy** (carry-forward bonus to next age). Zero milestones = **Dark Age Legacy** (penalty or missed bonus).

Modern Age milestones culminate in **terminal victory conditions**. First player to complete ANY terminal condition wins immediately.

Legacy Points accumulate across all three ages. Two roles:
1. Tiebreaker for Score Victory
2. Acceleration resource for Modern terminal projects (Firaxis: "speed up construction")

Max theoretical: 4 paths × 3 ages × 3 milestones = 36 points. In practice, 8-15 is strong.

### Antiquity Age Paths

**Wonders of the Ancient World (Cultural)**
Track: Wonders constructed.
| Milestone | Threshold | Reward |
|---|---|---|
| 1 | 2 Wonders | 1 Legacy Point + Option |
| 2 | 4 Wonders | 1 LP + Option |
| 3 (Golden Age) | 7 Wonders | 1 LP + Amphitheaters retain yields/adjacency into Exploration |

**Silk Roads (Economic)**
Track: Resources assigned to settlements.
| 1 | 7 | 1 LP + Option |
| 2 | 14 | 1 LP + Option |
| 3 (Golden) | 20 | 1 LP + Cities stay as Cities (not revert to Towns) at transition |

**Pax Imperatoria (Military)**
Track: settlement points (conquered = 2, founded = 1).
| 1 | 6 pts | 1 LP + Fealty (+2 Settlement Limit) |
| 2 | 9 pts | 1 LP + Option |
| 3 (Golden) | 12 pts | 1 LP + Free Infantry per settlement conquered at Modern start |

**Great Library (Scientific)**
Track: Codices displayed in Libraries/Academies/Nalanda.
| 1 | 3 Codices | 1 LP + Option |
| 2 | 6 | 1 LP + Option |
| 3 (Golden) | 10 | 1 LP + Academies retain yields into Exploration |

Codices obtained via Tech Masteries, Scientific IP suzerainty, Scout exploration. Must be placed in slots (Libraries: 2; Academies: 3).

### Exploration Age Paths

**Toshakhana (Cultural)** — Relics displayed in Temples. Final 12 (Golden Age). Intermediate 6 and 9. Golden: Founder Beliefs carry to Modern. Dependency: founded Religion with Reliquary Belief.

**Treasure Fleets (Economic)** — Treasure Fleet Points from returning Distant Land treasures via naval fleets. Final 30 pts. Intermediate 10, 20 `[INFERRED]`. Golden: Cities preserved; Distant Settlements +2 Population at Modern start.

**Non Sufficit Orbis (Military)** — Settlement points in Distant Lands. 1 founded/converted, 2 conquered, 4 conquered-and-religious. Final 12 pts. Intermediate 4, 8 `[INFERRED]`. Penultimate: +10 Production to Distant Settlements in Modern. Golden: One Infantry + Ranged per Distant Settlement at Modern start.

**Enlightenment (Scientific)** — Urban Districts at 40+ yield. Final 5 districts. Intermediate 1, 3 `[INFERRED]`. Golden: Universities become Golden Age Universities.

### Modern Age Terminal Victory Conditions

Each Modern path resolves into a game-ending condition. First player to complete any one wins.

**Geographic Society (Cultural) → World's Fair**
Track: Artifacts in Museums (Explorer units excavate). Milestones: 5/10/15.
Terminal: Build **World's Fair Wonder** after 15 Artifacts. Cultural Legacy Points accelerate.
Prerequisite: Natural History Civic.

**Railroad Tycoon (Economic) → World Bank**
Track: Railroad Tycoon Points (factory-resource-rail network).
Milestones: 150/300/500.
Terminal: At 500 points, receive **Great Banker unit**. Visit every rival capital to establish World Bank Office (costs Gold + Influence per visit). Economic Legacy Points reduce costs. Last office → victory.

**Ideology (Military) → Operation Ivy**
Track: Ideology Points from Modern-age settlement conquest.
Scoring: 1 pre-Ideology / 2 post-Ideology / 3 post-Ideology + different-ideology target.
Milestones: 10/15/20.
Terminal: At 20 points, unlock **Manhattan Project Wonder**. Build it → enables Operation Ivy project. Complete Operation Ivy → victory.

**Space Race (Scientific) → First Staffed Space Flight**
Three sequential space projects:
1. Trans-Oceanic Flight — Flight tech + Aerodrome
2. Break the Sound Barrier — Aerodynamics tech
3. Launch Satellite — Rocketry tech + Launch Pad

Terminal: Complete **First Staffed Space Flight** in city with Launch Pad. Science Legacy Points accelerate.

### Domination Victory

Eliminate all rival civilizations by conquering every settlement. Independent Powers excluded `[Method.gg; source conflict]`.
NOT a Legacy Path. No milestones, no Legacy Points. Bypass condition for military-heavy players.

### Score Victory (Fallback)

When Modern Age reaches **100% progress** and `victoryWinner == null`, highest **total Legacy Points** wins. Always active, cannot be disabled.

**Strategic tension:** milestone completions contribute to age-end progress. Aggressively hitting Modern milestones accelerates the 100% clock. A breadth player accumulating modest points across all paths may outscore a deep specialist at the moment of cutoff.

---

## Formulas

```
legacyPointsEarned(player, path, age) = count(milestonesCompleted(player, path, age))
  // max 3, min 0 per path per age (1 point per milestone including Golden Age)

totalLegacyScore(player) = sum over (path, age) of legacyPointsEarned(player, path, age)

scoreVictoryTriggered = (ageProgress_modern >= 1.0) AND (victoryWinner == null)
scoreVictoryWinner = argmax(players, p -> totalLegacyScore(p))

ideologyPoints(player, conquest) =
  1 if NOT player.hasAdoptedIdeology
  2 if sameIdeology(player, target)
  3 if different ideology

MAX_LEGACY_POINTS = 36   // 4 paths × 3 ages × 3 milestones

// Railroad Tycoon rate — AMBIGUOUS
// "5 resources in connected factory = 20 points" — per-turn OR one-time?
// Implementation-critical unknown.
```

---

## Interactions

- `systems/ages.md` — milestones contribute to age-end progress; transitions evaluate Golden/Dark status
- `systems/legacy-paths.md` — per-age milestone tracks + Legacy Bonus menu live there
- `systems/crises.md` — crisis gates transition; completion makes crisis easier `[INFERRED]`
- `systems/religion.md` — Toshakhana requires founded Religion + Reliquary Belief
- `systems/tech-tree.md` — Space Race gated on Flight, Aerodynamics, Rocketry
- `systems/civic-tree.md` — Natural History Civic (Cultural); Ideology civics (Military multiplier)
- `systems/buildings-wonders.md` — Codex → Libraries/Academies; Relic → Temples; Artifact → Museums; World's Fair + Manhattan Project are terminal Wonders
- `systems/combat.md` — conquest drives Antiquity/Expl Military + Modern Ideology points
- `systems/trade-routes.md` — Silk Roads uses resource assignment; Railroad Tycoon needs rail networks
- `systems/diplomacy-influence.md` — World Bank offices cost Influence; Economic LP reduces
- `systems/map-terrain.md` — Distant Lands are the theater for Non Sufficit Orbis + Treasure Fleets

---

## Content flowing through this system

- [`content/wonders/`](../content/wonders/) — World's Fair, Manhattan Project, Antiquity wonders
- [`content/buildings/`](../content/buildings/) — Libraries, Academies, Temples, Museums, Factories, Aerodromes, Launch Pads
- [`content/technologies/modern/`](../content/technologies/modern/) — Flight, Aerodynamics, Rocketry
- [`content/civics/modern/`](../content/civics/modern/) — Natural History, Ideology civics
- [`content/units/`](../content/units/) — Explorer unit (Cultural), Great Banker (Economic)

---

## VII-specific (how this differs from VI/V)

- **Per-age milestone accumulation** — VI had "historic moments" but no cross-era accumulating victory progress
- **Legacy Points from turn 10 reduce Modern project time** — past-era accomplishments directly aid endgame
- **Missing early milestones penalizes late game** — early neglect imposes concrete speed penalty
- **Domination requires eliminating ALL settlements of rivals** — VI required capitals only; VII requires total
- **Score Victory always-on, not configurable**
- **Military requires civic action (Ideology adoption)** — not purely unit-driven
- **Cultural resolves as wonder race** — VI had opaque tourism calculation; VII is "first to build wins"

---

## UI requirements

- **Legacy Progress HUD** — 4-path progress bars, current LP + nearest threshold
- **Victory Progress Panel** — all 4 paths × 3 ages; completed/active milestones; rival visible progress
- **Milestone completion notification** — toast per milestone with path + Legacy Bonus name
- **Score Victory warning** at ~80% Modern progress
- **Age transition modal** — per-path Golden/Dark evaluation
- **Terminal condition tracker** — Space Race projects, Ideology/Railroad Tycoon/Artifacts/World Bank offices

---

## Edge cases

- Simultaneous terminal completion: no documented tiebreak — implementation must decide
- World's Fair built by non-Cultural-path player: likely wins (wonder-sniping valid strategy) `[INFERRED]`
- Great Banker can't reach captured capital: unclear
- 0 Legacy Points + Domination win: allowed
- Distant Lands never reached: NsO + TF produce Dark Age automatically
- No Launch Pad at Space Race completion: must build one
- Factory-connected settlement captured: accumulated points kept, accrual stops
- Score Victory while terminal at 90%: fires regardless
- Operation Ivy with Wonder in foreign city: player must conquer or rebuild
- Ideology Points before adopting: multiplier kicks in at adoption

---

## Open questions

- Railroad Tycoon point rate vs one-time: per-turn or one-time grant? Implementation-critical
- Intermediate Exploration milestone thresholds (except Toshakhana 6/9)
- Exact Legacy Point discount on terminal conditions (formula not published)
- Dark Age penalty specifics per path
- Simultaneous terminal victory tiebreak
- Domination + Independent Powers scope
- Ideology adoption prerequisite (which civic?)
- Score Victory hard turn cap (configurable?)

---

## Mapping to hex-empires

**Status tally:** 0 MATCH / 2 CLOSE / 5 DIVERGED / 3 MISSING / 1 EXTRA
**Audit:** [.codex/gdd/audits/victory-paths.md](../audits/victory-paths.md)
**Highest-severity finding:** F-01 — Modern Military victory is kills+cities, not Ideology Points + Operation Ivy (DIVERGED, HIGH)
**Convergence status:** Divergent — 5 finding(s) require(s) architectural refactor

_(Full details in audit file. 11 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

Fandom wiki pages for Victory_(Civ7) and Legacy_Path_(Civ7) both 403'd. Sourcing from Firaxis Dev Diary #8 (authoritative) + secondary guides. Milestone thresholds from ComradeKaine cross-confirmed with Game8 and Screen Rant. Exploration intermediate thresholds except Toshakhana inferred by structural analogy — verify before implementation. Railroad Tycoon rate ambiguity is the highest-priority open question.

Write/Bash permissions denied to subagent; parent wrote from fenced-block extraction.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
