# Combat — Civ VII

**Slug:** `combat`
**Bucket:** `combat`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-04-19`
**Authoring model:** `claude-sonnet-4-6`

---
## Sources

Every factual claim in the sections below MUST trace to one of these, or be tagged `[INFERRED]` / `[LLM-KNOWLEDGE-ONLY]`.

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/combat/ — Firaxis Dev Diary #5: Combat
- https://civilization.fandom.com/wiki/Strength_(Civ7) — Fandom: Strength (Civ7) [403 on direct fetch; content surfaced via WebSearch]
- https://civilization.fandom.com/wiki/Combat_(Civ7) — Fandom: Combat (Civ7) [403 on direct fetch; content surfaced via WebSearch]
- https://civilization.fandom.com/wiki/Land_unit_(Civ7) — Fandom: Land unit (Civ7) [403 on direct fetch; content surfaced via WebSearch]
- https://game8.co/games/Civ-7/archives/499026 — Game8: Civ 7 Ground Combat Guide
- https://game8.co/games/Civ-7/archives/499033 — Game8: Civ 7 How to Defend and Conquer Cities
- https://game8.co/games/Civ-7/archives/500086 — Game8: Civ 7 Zone of Control
- https://www.well-of-souls.com/civ/civ7_units.html — Well of Souls: Civ VII Unit Analyst
- https://screenrant.com/civ-7-new-combat-system-commanders-siege-warfare-explainer/ — ScreenRant: Civ 7 New Combat System Explained
- https://12gramsofcarbon.com/p/civ-7-war-strategy-and-tactics — 12grams: War Strategy and Tactics (community)
- https://www.gamesradar.com/games/strategy/civilization-7-heal-units/ — GamesRadar: How to Heal Units in Civ 7
- https://www.gamerant.com/civilization-vii-heal-units-guide-healing-unit-boost-heal-amount-increase-healing-civ-7/ — GameRant: Civilization VII Heal Units Guide
- https://www.well-of-souls.com/civ/civ7_terrain.html — Well of Souls: Civ VII Terrain Analyst

**Source conflicts noted:** Two sources disagree on healing rates in enemy territory: one cites 5 HP/turn, another 10 HP/turn. Fandom wiki pages for Combat_(Civ7) and Strength_(Civ7) returned HTTP 403. Conflict flagged in Healing section.

---

## Purpose

Combat in Civ VII is the resolution engine for all military conflict between units. It retains Civ V’s one-unit-per-tile model but adds a directional battlefront system and district-by-district siege. Commanders (covered separately in `systems/commanders.md`) provide the army-aggregation layer — this doc covers the combat resolution engine.

---
## Entities

- `UnitState.hp` — (RW) — current hit points (0–100); reduces on combat hit
- `UnitState.combatStrength` — (R) — base melee CS; modified at resolution time by terrain, flanking, support, health penalty, fortification
- `UnitState.rangedStrength` — (R) — used for ranged attacks against land units; 0 for melee-only units
- `UnitState.bombardStrength` — (R) — used for ranged attacks against naval units, fortified districts, and land units inside fortifications
- `UnitState.movement` — (RW) — remaining movement points this turn; combat typically costs all remaining movement
- `UnitState.unitClass` — (R) — `melee | ranged | cavalry | siege | naval`; determines ZoC, Swift eligibility, attack modes
- `UnitState.facing` — (RW) — set on first melee engagement; determines flank/rear positions
- `UnitState.isFortified` — (RW) — true when Fortify action used and unit has not moved; grants CS bonus on defense
- `Tile.defensiveBonus` — (R) — CS modifier from terrain/feature on the tile being defended
- `Tile.fortifiedDistrictHp` — (RW) — HP of fortification on a fortified district tile; base 100, +100 with walls
- `PlayerState.warSupport` — (RW) — each point of negative war support grants +1 CS advantage to the opposing player
- `GameState.currentAge` — (R) — some unit classes and wall types are age-gated

---

## Triggers

- On action **ATTACK** — combat resolution fires immediately; attacker and defender both receive or deal damage; attacker expends remaining movement points.
- On action **BOMBARD** — attacker uses `rangedStrength` or `bombardStrength` depending on target type; defender does NOT return fire.
- On action **FORTIFY** — unit becomes immobile; gains +5 CS when defending; begins healing on subsequent turns.
- On **END_TURN** — healing ticks for all units that did not move or attack this turn.
- On condition **district HP reaches 0** — district walls are destroyed; tile becomes unfortified; occupying enemy unit may claim the tile.
- On condition **all fortified districts destroyed AND unit moves onto City Center tile** — settlement captured; enters unrest period.

---
## Mechanics

### Unit Classes and Roles

Civ VII uses five land unit classes. There is no rock-paper-scissors bonus triangle between them by default (unlike Civ VI’s anti-cavalry class mechanic). Spearman-line units retain a contextual bonus against cavalry [see Open Questions], but this is not a system-wide counter rule.

**Melee** (`melee`): Standard infantry. Uses `combatStrength` for both attack and defense. Subject to Zone of Control. Forms the battlefront anchor for flanking plays. Examples: Warrior (CS 20), Spearman (CS 25), Man-at-Arms (CS 40), Line Infantry (CS 50).

**Ranged** (`ranged`): Uses `rangedStrength` on offense; cannot perform melee attacks. Does NOT have Zone of Control. Range stat (typically 2). Returns fire only if the attacker is within range. Examples: Archer (ranged CS 10), Crossbowman (CS 25), Field Cannon (CS 35).

**Cavalry** (`cavalry`): High CS and high movement. Possesses **Swift** — immune to Zone of Control from all units. Can move through enemy ZoC tiles without stopping. Excel at flanking and chasing ranged units. Examples: Horseman (CS 35), Knight (CS 45), Tank (CS 65).

**Siege** (`siege`): Functions like ranged but uses `bombardStrength` when attacking fortified districts, naval units, or land units inside fortifications. The **Siege** ability enables attacks on fortified districts to also damage the defending unit inside. Examples: Ballista (bombard CS 10), Catapult (CS 20), Trebuchet (CS 25), Howitzer (CS 45).

**Naval**: Ship units on water tiles and navigable rivers. Can ferry land units. Naval ranged units use `bombardStrength` against land units inside fortifications. Examples: Galley (CS 20), Battleship (CS 60).

### Combat Strength (CS)

Combat Strength governs melee combat output and melee defense. All modifiers are expressed as additive CS adjustments applied at resolution time. The attacker and defender each compute their effective CS before damage is calculated.

Unit hit points are standardized at **100 HP** maximum across all unit types.

**Wounded-unit penalty:** A unit’s effective CS decreases as it takes damage. The penalty is approximately **−1 CS per 10 HP lost**, beginning at 99 HP. Maximum penalty is **−10 CS** when a unit is below 10 HP. This is a continuous linear penalty, not a step function. [Source: Fandom Strength_(Civ7), surfaced via search.]

### Damage Calculation

The exact algebraic formula Firaxis uses has not been published. From community reverse-engineering and search-surfaced Fandom content:

- Damage is determined by the **difference in effective CS** between attacker and defender.
- Community data suggests: one-shot is **possible at approximately +23 CS difference**, **average around +30 CS difference**, and **guaranteed at approximately +39 CS difference**. [Source: Fandom Strength_(Civ7) via search — approximate.]
- Damage has a **random variance of ±30%**. This variance is larger than Civ VI (±25%).
- **Damage is capped at 100** per hit.
- Both melee attacker and defender deal damage simultaneously. Ranged and bombard attacks are one-sided — the target does NOT return fire.
- The formula used in Civ VI was: `Damage = 30 × e^(StrengthDifference / 25) × Random(0.75, 1.25)`. Whether Civ VII uses the same base formula is **[INFERRED]**.

### Terrain Defense Bonuses

Terrain modifies the effective CS of the defending unit.

| Terrain / Feature | Effect |
|---|---|
| Rough terrain (hills, mountains) | +3 CS when defending [Fandom via search] |
| Vegetated terrain (woods, jungle, forest) | +2 CS when defending [Fandom via search] |
| Minor River (unit defending on the tile) | −5 CS penalty [Well of Souls terrain doc] |
| Difficult terrain general | Ends movement of units entering, regardless of remaining move points |

Whether cavalry suffers an additional context-specific CS penalty beyond the standard defender bonus in rough/vegetated terrain is [INFERRED] as strategically disadvantageous but the exact value is unconfirmed.

### Fortification Bonus

The **Fortify** action makes a unit immobile for the current turn and any subsequent turns until it moves. While fortified:

- The unit gains **+5 CS on defense**. [Source: Game8 Ground Combat Guide]
- Fortification stacks with terrain defense bonuses.
- A fortified unit inside a fortified district gains the district wall bonus in addition to the +5 CS personal fortification.
- Fortification is lost when the unit moves.
- Fortifying also triggers end-of-turn healing (see Healing section).

District walls provide an additional **+15 CS to defenders** inside fortified districts. [Source: Game8 How to Defend and Conquer Cities]

### Zone of Control (ZoC)

ZoC is an area-denial mechanic. Melee and siege units project ZoC into all adjacent tiles. An enemy unit entering a ZoC tile must stop immediately and may not move further that turn, even if movement points remain. [Source: Game8 Zone of Control guide]

Key ZoC rules:

- Only **melee** and **siege** units project ZoC. Ranged units do NOT project ZoC.
- **Cavalry** possesses the **Swift** ability, making them immune to ZoC. They may move freely through ZoC tiles.
- Ranged units are subject to ZoC from enemy melee/siege units (they can be locked in place).
- A unit already in a ZoC tile at the start of its turn may attack or retreat, but cannot move further into a different ZoC tile without stopping.
- ZoC does not prevent attacking; it prevents continuation of movement after entering the ZoC tile.

### Flanking and the Battlefront System

When a melee unit first attacks another unit, a **battlefront** is established. The defending unit’s facing direction is set toward the attacker. Subsequent attacks from non-front directions gain a flanking bonus. [Source: Firaxis Dev Diary #5]

Flanking bonus tiers:

| Attack direction | CS bonus to attacker |
|---|---|
| Front (same direction as established battlefront) | +0 CS |
| Flank (90 degrees from battlefront) | +3 CS [INFERRED; exact value unconfirmed] |
| Rear (180 degrees from battlefront) | +6 CS [INFERRED; exact value unconfirmed] |

**Flanking requires the Military Training technology** to unlock the battlefront mechanic. Before researching Military Training, attacks from any direction deal no flanking bonus. [Source: Game8 Ground Combat Guide]

The **Skirmish** promotion grants **+50% to any flanking bonus received**, making cavalry and mobile units significantly more dangerous when attacking from flank or rear positions. [Source: Fandom Combat_(Civ7) via search]

### Support Bonus

Friendly adjacent units provide a **+2 CS per adjacent friendly unit** bonus to the primary combatant. [Source: Game8 Ground Combat Guide]

Support bonus is additive with all other CS bonuses. A unit surrounded by 3 friendly units gains +6 CS in combat. The bonus applies to both attacker and defender independently (each receives support from their own adjacent friendlies only).

Support bonus does NOT require the friendly adjacent unit to take any action. The unit simply needs to be present on an adjacent tile and alive.

### Healing

Units heal at the end of a turn in which they did **not** move or attack. Healing requires surviving the turn with HP > 0. The fortify action triggers the healing rate as if the unit were in friendly territory. [Source: GamesRadar, GameRant]

| Territory type | Healing rate per turn |
|---|---|
| In a city (own or allied) | ~20 HP/turn [GamesRadar] |
| Own or allied territory (outside city) | ~15 HP/turn [GamesRadar] |
| Neutral territory | ~10 HP/turn [GamesRadar] |
| Enemy territory | 5-10 HP/turn [Source conflict: GamesRadar 10 HP; another source 5 HP; see Sources] |

**Source conflict on enemy territory healing:** GamesRadar cites 10 HP/turn in enemy territory; a second source cites 5 HP/turn. The 10 HP value appears more often across community guides but is unconfirmed against a Firaxis primary source. Using 10 HP as working assumption; flag for re-verification.

Promotions and civilization bonuses can increase healing rates. The exact promotion names affecting healing are [INFERRED] to exist but are not fully catalogued here.

### Retreat

When a unit reaches 0 HP from combat, it is **eliminated** (removed from the map). There is no automatic tactical retreat to a safe tile in standard combat resolution. [INFERRED from Civ VI behavior; no explicit Civ VII documentation found]

Units may be **strategically withdrawn** by moving away from the enemy before combat, but this is a player action, not an automatic game mechanic. A unit that would be reduced to 0 HP has no automatic escape.

**Capture vs. kill:** Civilian units (Settlers, Builders, Scouts) are **captured** rather than killed when an enemy military unit enters their tile. They become a unit of the capturing player. Military combat units are always eliminated, never captured. [Source: Game8 Ground Combat Guide]

### Siege Mechanics

Settlements in Civ VII have **district tiles** that may be fortified. Each fortified district acts as an independent defensive structure with its own HP pool. [Source: Firaxis Dev Diary #5; ScreenRant]

**District HP values:**

- Base fortified district: **100 HP**
- District with walls built: **200 HP** (+100 HP from walls) [Source: Game8 How to Defend and Conquer Cities]

**Siege sequence:**

1. Attacker must use siege units (or ranged units with bombard strength) to deplete district HP.
2. Each district must be individually destroyed.
3. Land units inside a fortified district cannot be directly melee-attacked until the district falls.
4. Siege units with the **Siege** ability can damage both the district HP AND the unit inside simultaneously (split damage).
5. Once all defending districts in a settlement are destroyed, the settlement is vulnerable.
6. A military unit must physically move onto the **City Center tile** to capture the settlement.
7. Captured settlement enters an **unrest period** during which output is reduced. [Source: ScreenRant]

**Walls grant +15 CS to defenders** inside the walled district while walls stand. [Source: Game8 How to Defend and Conquer Cities]

Ranged units without the Siege ability cannot bombard fortified districts effectively (they use rangedStrength not bombardStrength). Naval units with bombardStrength CAN bombard coastal districts. [Source: Firaxis Dev Diary #5]

### War Support

War Support is a player-level statistic tracking morale and legitimacy for an ongoing war. Negative War Support (below 0) penalizes the player militarily: each point of negative War Support grants the **opposing** player **+1 CS** in all combat. [Source: 12grams community guide]

War Support reduces when the player attacks settlements with civilian population, conducts surprise wars, or fails to achieve military objectives. It increases with military victories, strategic resources, and diplomacy. [INFERRED from community context; exact trigger values not sourced]

---
## Formulas

### Effective CS Computation

Pseudocode for effective CS at resolution time:

```
function effectiveCS(unit, tile, isFortified, adjacentFriendlyCount, flankingBonus, warSupportPenalty):
    base = unit.combatStrength
    wounded = floor((100 - unit.hp) / 10) * -1   # 0 at full HP, -10 at <= 10 HP
    terrain = tile.defensiveBonus                 # +3 hills, +2 forest, -5 river
    fortify  = +5 if isFortified else 0
    walls    = +15 if insideFortifiedDistrict and districtHasWalls else 0
    support  = adjacentFriendlyCount * 2
    flanking = flankingBonus                      # 0 front, +3 flank, +6 rear [INFERRED]
    warAdv   = -warSupportPenalty if warSupportPenalty > 0 else 0
    return base + wounded + terrain + fortify + walls + support + flanking + warAdv
```

### Damage Formula

The formula used in Civ VI (which Civ VII likely inherits [INFERRED]):

```
Damage = 30 * e^(StrengthDiff / 25) * Random(0.75, 1.25)
StrengthDiff = attackerEffectiveCS - defenderEffectiveCS
Result capped at 100. Floored at 0 (no negative damage).
```

Both attacker and defender calculate damage simultaneously in melee. For ranged/bombard, only the attacker deals damage.

### Representative Unit CS Values

| Unit | Class | Base CS |
|---|---|---|
| Warrior | melee | 20 |
| Spearman | melee | 25 |
| Man-at-Arms | melee | 40 |
| Musketman | melee | 45 |
| Line Infantry | melee | 50 |
| Archer | ranged | 10 (ranged CS) |
| Crossbowman | ranged | 25 (ranged CS) |
| Field Cannon | ranged | 35 (ranged CS) |
| Horseman | cavalry | 35 |
| Knight | cavalry | 45 |
| Tank | cavalry | 65 |
| Ballista | siege | 10 (bombard CS) |
| Catapult | siege | 20 (bombard CS) |
| Trebuchet | siege | 25 (bombard CS) |
| Howitzer | siege | 45 (bombard CS) |
| Galley | naval | 20 |
| Battleship | naval | 60 |

[Source: Well of Souls Unit Analyst, cross-checked with Game8]

---
## Interactions

- **Combat + Commanders** — Commanders aggregate units into armies and can provide army-wide CS bonuses. The underlying per-unit CS resolution in this document still governs each individual combat. See `systems/commanders.md` for the Commander layer.
- **Combat + Technologies** — Military Training unlocks the battlefront/flanking mechanic. Other technologies unlock higher-CS unit upgrades (melee, ranged, cavalry progression). Age transitions unlock entirely new unit rosters.
- **Combat + Religion** — Some religious tenets grant combat bonuses in home territory or against non-believers. [INFERRED based on Civ VI precedent; specific tenet effects for Civ VII not fully sourced]
- **Combat + Diplomacy** — War declarations affect War Support. Grievances accumulate from surprise wars and civilian damage, increasing opposing CS through the War Support mechanic.
- **Combat + City Yields** — Capturing a settlement stops its tile yields for the unrest period. Buildings in captured districts may be pillaged or automatically damaged.
- **Combat + Movement** — ZoC restricts movement (non-cavalry stop on entry). Combat expends all remaining movement points. Units that have attacked cannot move further that turn.

---
## Content Flowing Through This System

- All unit definitions: `UnitDef` provides base CS, rangedStrength, bombardStrength, unitClass, Swift flag, range stat, movement.
- Terrain definitions: `TerrainDef.defensiveBonus` provides the per-tile CS modifier.
- Technology definitions: `TechDef` with `id === military-training` gates the flanking mechanic.
- Building definitions: wall types (Ancient Walls, Medieval Walls, Renaissance Walls) define district HP bonus (+100 per wall level) and defender CS bonus.
- Promotion definitions: Skirmish (+50% flanking), and any promotions that modify heal rate, CS, or movement.
- PlayerState.warSupport: produced by the diplomacy/war system; consumed by combat for the War Support CS modifier.

---
## Civ VII-Specific Notes

The following mechanics are new or significantly changed from Civ VI:

1. **One-unit-per-tile retained.** Civ VII keeps the Civ V/VI one-unit-per-tile model. No unit stacking. [Source: Firaxis Dev Diary #5]
2. **Battlefront / facing system.** Entirely new. Civ VI had no directional facing; flanking bonuses in Civ VI came from unit count only. Civ VII establishes a physical front-face and directional attack bonuses. [Source: Firaxis Dev Diary #5]
3. **No anti-cavalry class.** Civ VI had an explicit anti-cavalry unit class with a class-wide combat bonus against cavalry. Civ VII removes this class; spearman-line units may retain some contextual bonus but there is no system-wide counter triangle. [Source: Fandom Land_unit_(Civ7) via search]
4. **District-by-district siege.** Civ VII requires individual district conquest rather than city-wide HP. Civ VI had a single city HP bar. [Source: Firaxis Dev Diary #5; ScreenRant]
5. **War Support mechanic.** New in Civ VII. Negative War Support directly penalizes military effectiveness. Civ VI had War Weariness affecting yields but not CS directly. [Source: 12grams community guide]
6. **Larger damage variance.** Civ VII uses ±30% random variance vs. Civ VI’s ±25%. [Source: Fandom Strength_(Civ7) via search]
7. **Commanders as army layer.** Civ VII introduces Commanders as a separate aggregate layer above individual unit combat. Civ VI had Generals with limited radius effects. [Source: Firaxis Dev Diary #5]

---
## UI Requirements

- **Combat Preview tooltip:** Before confirming an ATTACK action, show attacker CS vs. defender CS (both effective, with modifiers listed), expected damage range to both units, and outcome probability tier (safe / contested / risky). [INFERRED from Civ VI UX; Civ VII UI not explicitly documented here]
- **Fortification indicator:** Units that are fortified should have a visual badge or shield icon on the map. The badge should disappear when the unit moves.
- **ZoC visualization:** When a unit is selected, tiles under enemy ZoC should be highlighted to prevent player confusion about why their unit stopped unexpectedly. Cavalry selected units should show free movement through ZoC tiles.
- **Flanking indicator:** If a unit is positioned for a flank or rear attack, the combat preview should indicate the flanking bonus being applied.
- **Healing indicator:** Units that will heal at end of turn (did not move/attack) should show a small heal-tick indicator, preferably with the HP delta.
- **District HP bar:** Fortified districts should show a HP bar distinct from unit HP bars, so the player can track siege progress.
- **Capture notification:** When a civilian unit is captured, a brief notification should name the captured unit and the capturing player.

---
## Edge Cases

1. **Unit at exactly 10 HP:** Wounded penalty is at maximum (-10 CS). A follow-up melee attack at even CS advantage may one-shot this unit. The penalty must be applied before the damage roll.
2. **Simultaneous elimination in melee:** Both attacker and defender can die in the same melee exchange if the HP loss to both is >= their remaining HP. The tile is left empty; no capture occurs. [INFERRED]
3. **Ranged unit inside ZoC:** A ranged unit inside an enemy melee unit’s ZoC can still perform a ranged attack but cannot move. The ZoC restricts movement, not attack actions.
4. **Cavalry flanking own ZoC:** Cavalry are immune to ZoC but still project ZoC. An enemy that tries to move through a cavalry-occupied adjacent tile must stop. Cavalry do not stop when crossing that same tile.
5. **District destroyed while unit inside:** If district HP reaches 0 while a friendly unit is inside, the unit is not automatically killed. It survives on the now-unfortified tile, no longer gaining wall/district bonuses.
6. **Healing in enemy territory with Fortify:** A unit that uses Fortify in enemy territory heals at the enemy territory rate (5-10 HP/turn), NOT at the friendly territory rate. The Fortify action grants +5 CS but does not change the healing rate.
7. **Support from a wounded unit:** A wounded unit at 1 HP still provides its +2 CS support bonus to adjacent friendly units. The wounded penalty applies only to the unit’s own combat CS, not its support contribution.
8. **Battlefront after unit transport:** If a unit is transported by naval ferry and has an established facing, the facing direction becomes undefined relative to the new position. [INFERRED; likely resets facing]
9. **War Support below cap:** If War Support is very negative (e.g., -50), the +50 CS bonus to the opponent would make most units effectively invincible. It is [INFERRED] that War Support has a floor (likely -10 to -20), but the exact cap is not documented.
10. **Ranged returns fire through walls:** A ranged unit inside a fortified district should be able to bombard enemies outside. Whether the +15 CS wall bonus applies to this ranged return fire is [INFERRED] to apply only to melee defense, not ranged offense.

---
## Open Questions

1. **Exact flanking CS values:** The +3/+6 CS for flank/rear attack is [INFERRED]. No primary source has confirmed exact numeric values.
2. **Spearman anti-cavalry bonus:** Whether spearman-line units retain a specific CS bonus against cavalry is unconfirmed. Fandom Land_unit_(Civ7) suggests anti-cavalry class is gone, but hints at unit-specific spearman promotions.
3. **War Support floor:** The exact minimum value for War Support (and thus the maximum CS penalty it can impose) is not documented in any sourced material.
4. **Enemy territory healing rate:** 5 HP vs. 10 HP conflict between GamesRadar and a second source. Needs direct Fandom wiki verification once 403 is resolved.
5. **District siege split damage ratio:** When a siege unit with the Siege ability attacks a fortified district, how is damage split between the district HP and the unit inside? No primary source found.
6. **Ranged unit melee defense CS:** When a ranged unit is forced into melee, does it use rangedStrength or combatStrength for defense? [INFERRED] to use combatStrength like Civ VI but not confirmed.
7. **Promotion list completeness:** The full list of combat-affecting promotions (beyond Skirmish and the inferred heal-rate promotions) is not sourced.

---
## Mapping to hex-empires

**Status tally:** 8 MATCH / 1 CLOSE / 3 DIVERGED / 1 MISSING / 1 EXTRA
**Audit:** [.codex/gdd/audits/combat.md](../audits/combat.md)
**Highest-severity finding:** F-02 — flanking-directional-vs-unit-count - (DIVERGED, HIGH)
**Convergence status:** Divergent — 3 finding(s) require(s) architectural refactor

_(Full details in audit file. 14 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author Notes

**Research notes:**

- Fandom wiki pages for Combat_(Civ7) and Strength_(Civ7) both returned HTTP 403 during research. Content was surfaced via WebSearch (Google snippet extraction), which provides partial data. This reduces confidence in exact numeric values to medium. Any value tagged [INFERRED] should be re-verified against the Fandom wiki once access is restored.
- The Firaxis Dev Diary #5 (primary source) is the best-quality source but is written at a high level without exact formulas. It confirms: one-unit-per-tile, battlefront/facing, district-based siege, no anti-cavalry class, Commander system separate from unit combat.
- Game8 guides (Ground Combat, Zone of Control, City Defense) are the most detailed secondary sources for exact mechanics. They appear to derive from game testing and are generally consistent with the Dev Diary.
- The ±30% variance figure comes from Fandom Strength_(Civ7) via search snippets. It may be an approximation. Civ VI’s exact formula (30 * e^(diff/25) * random) is well-documented; Civ VII’s is not, but the structure is likely inherited.
- Well of Souls Unit Analyst provides unit CS values at a specific patch version. CS values may shift with balance patches.

**Document health:**

- Overall confidence: medium (primary source high-level; numeric values from secondary/community sources)
- Inferred claim count: 9 major [INFERRED] tags (see list below)
- Source conflict count: 1 (enemy territory healing rate)
- Failed URL fetches: civilization.fandom.com/wiki/Combat_(Civ7) [403], civilization.fandom.com/wiki/Strength_(Civ7) [403]

**[INFERRED] list:**

1. Damage formula inherits Civ VI’s exponential structure.
2. Flanking CS values (+3 flank, +6 rear) are not confirmed by primary source.
3. Religion combat tenet effects exist but are not specifically documented for Civ VII.
4. War Support has a floor (cap on maximum CS penalty).
5. Melee simultaneous elimination is possible.
6. Battlefront facing resets on unit teleport/transport.
7. Ranged units use melee CS for defense when melee-attacked.
8. Wall +15 CS bonus applies to melee defense only, not ranged return fire.
9. Cavalry suffers no additional contextual CS penalty beyond terrain bonus in rough terrain.

