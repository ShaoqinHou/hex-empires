# Commanders (Army Commanders) — Civ VII

**Slug:** `commanders`
**Bucket:** `combat`
**Status:** `draft`
**Confidence:** `medium`
**Last verified:** `2026-05-03`
**Authoring model:** `claude-sonnet-4-6`

---

## Sources

- https://civilization.2k.com/civ-vii/game-guide/dev-diary/combat/ — Firaxis Dev Diary #5: Combat
- https://civilization.fandom.com/wiki/Combat_(Civ7) — Fandom: Combat, commander respawn/deploy/rout notes, refreshed 2026-05-03
- https://civilization.fandom.com/wiki/List_of_promotions_in_Civ7 — Fandom: List of Commander promotions, refreshed 2026-05-03
- https://www.thegamer.com/civilization-7-army-commanders-guide/ — TheGamer: Guide to Army Commanders
- https://game8.co/games/Civ-7/archives/495204 — Game8: Army Commanders Explained
- https://www.pcgamer.com/games/strategy/civilization-7-guide-to-unexplained-systems-faq/ — PC Gamer: Unexplained systems FAQ
- https://forums.civfanatics.com/threads/civilization-7-army-commanders.691463/ — CivFanatics forum
- https://steamcommunity.com/sharedfiles/filedetails/?id=3645296112 — Steam: Comprehensive Commander Guide
- https://clawsomegamer.com/best-commander-promotions-in-civilization-7-for-every-tree/ — ClawsomeGamer
- https://earlygame.com/guides/gaming/civilization-7-here-are-the-commander-promotion-points-you-should-unlock-first — EarlyGame
- https://game8.co/games/Civ-7/archives/499157 — Game8: Fleet Commander
- https://comradekaine.com/civilization7/commanders-redefine-combat-in-civilization-7/ — ComradeKaine

**Source conflicts noted:** Default stacking capacity: TheGamer says "4 units plus 1 civilian"; other sources say "up to 6 units" without noting Regiments prerequisite. Doc uses 4 base, 6 with Regiments (Logistics tree). Fandom promotion list was accessible during the 2026-05-03 refresh and is preferred for named Commander promotion effects; older notes about Fandom Commander_(Civ7) access may be stale. Fandom lists Army Leadership Onslaught as +4 CS with Coordinated Attack, while Game8 lists +5; local data follows Fandom until the target patch is refreshed.

---

## Purpose

Commanders are Civ VII's solution to two problems: unit-stack micromanagement and loss of veteran armies between eras. A dedicated commander unit bundles multiple units into a single moveable formation, letting players manage armies as cohesive objects. Commanders are the **only unit type explicitly confirmed to persist across age transitions with full XP and promotions intact**, creating a through-line of military investment analogous to a named general's career. No direct predecessor mechanic in VI or V — the closest analog, the Great General, was passive and non-commanding.

---

## Entities

- `CommanderState.id` — (R) — unique identifier
- `CommanderState.type` — (R) — `army | fleet`
- `CommanderState.position` — (RW) — hex tile
- `CommanderState.xp` — (RW) — experience points
- `CommanderState.level` — (RW) — promotion-point level
- `CommanderState.promotionPoints` — (RW) — unspent points; bankable indefinitely
- `CommanderState.promotions` — (RW) — allocated promotions across five trees
- `CommanderState.commendationPoints` — (RW) — earned by completing a promotion tree
- `CommanderState.commendations` — (RW) — activated commendation abilities
- `CommanderState.packedUnits` — (RW) — units currently in the formation
- `CommanderState.packedCivilian` — (RW) — single civilian unit (optional)
- `CommanderState.commandRadius` — (R) — 1 base, 2 with Merit commendation
- `UnitState.commanderId` — (RW) — ID of packed-into commander or null
- `PlayerState.commanders` — (RW) — ReadonlyMap of owned commanders
- `GameState.config.commanders` — (R) — registry of commander type definitions

---

## Triggers

- **On `ASSEMBLE_ARMY` action** — pack adjacent units into commander
- **On `DEPLOY_ARMY` action** — unpack all packed units to adjacent tiles
- **On `REINFORCE` action** — order distant unit to path to commander and join
- **On `COORDINATED_ASSAULT` action** — +2 CS to units in command radius
- **On `BUILD_FORTIFICATION` action** — 2-turn construction (1 with Bulwark `[INFERRED]`)
- **On combat resolution in command radius** — evaluate XP grant
- **On `MOVE` of packed commander** — entire army moves using commander's movement
- **On age transition** — commander persists; packed units subject to age-transition rules
- **On commander defeat** — remove from map; respawn timer begins; re-appears at capital after 20 turns Standard speed

---

## Mechanics

### Acquiring Commanders

Army Commanders unlock via the **Discipline civic** in the Antiquity Civics tree. Researching Discipline grants **one free Army Commander**. Additional can be trained `[INFERRED: production building/cost unconfirmed]`. No stated hard limit on commander count.

**Fleet Commanders** become available at the start of the **Exploration Age**. Unlock condition `[INFERRED: civic or free grant]`. Fleet Commanders only pack naval units; Army Commanders only land units.

### Pack / Unpack (Assemble and Deploy Army)

**Assemble Army:** units on adjacent tiles with remaining movement are packed into `packedUnits`. One civilian unit (Settler, Scout, etc.) can occupy the civilian slot. Packed units are removed from the map as separate entities.

**Capacity:**
- `PACK_CAPACITY_BASE` = 4 military (confirmed)
- `PACK_CAPACITY_LOGISTICS` = 6 military (after Regiments promotion, Logistics tree)
- `PACK_CIVILIAN_SLOTS` = 1 (separate from military capacity)

**Deploy Army:** units placed on tiles adjacent to commander in formation order: melee front, ranged/siege rear. **By default, deployed units have zero remaining movement** — cannot act on turn of deployment. **Initiative** promotion (Assault tree) allows immediate movement after unpack. Naval equivalent: **Weather Gage**.

**Movement while packed:**
- Base commander movement: 2 tiles `[INFERRED-FANDOM]`
- With **Mobility** (Maneuver tree): +1 movement, ignores terrain penalties
- With **Service** commendation: +1 movement for land units in radius

### XP Accrual

Commanders gain XP from combat actions of units **within their Command Radius**. Commanders don't deal damage themselves.

**XP sources (all within command radius):**
- Unit attacks an enemy
- Unit kills an enemy
- **Dispersing an Independent Power** — 3-tile XP radius (larger than standard) `[source-conflict: PC Gamer only]`
- Conquering a settlement

**XP sharing:** always equally shared between all commanders within range.

**Merit quirk:** +1 command radius from Merit commendation does NOT expand XP eligibility — still only adjacent combat.

**XP scaling:** thresholds increase progressively per level. Exact numeric thresholds not published.

### Promotion System

Each promotion point unlocks one node from the 5 promotion trees. Points bank indefinitely with no penalty. Trees are perk-trees: top node first, deeper nodes gated.

**Total: 30 nodes (6 per tree × 5 trees) `[INFERRED from Game8 "6 per tree"]`**

| Tree | Theme | Notable Promotions |
|---|---|---|
| Bastion | Defense | Steadfast: +2 CS defending for land units; Bulwark: Fortify 1 turn faster; Hold the Line: +2 CS on Districts; Defilade: +3 CS from Fortifications; Garrison: fortified districts +10 HP (wired); Resolute: +5 HP after attacking (wired) |
| Assault | Offense | Initiative: move+act on unpack; Rout: Infantry +2 CS attacking; Storm: Ranged +2 CS attacking; Shock Tactics: Cavalry +3 CS attacking; Enfilade: Siege +3 CS attacking; Advancement: Infantry/Cavalry First Strike |
| Logistics | Sustain + capacity | Quartermaster: +1 Gold per packed unit (wired); Recruitment: +15% Production toward land units while stationed on a District (wired); Regiments: +2 unit slots and faster reinforcement; Field Medic: +5 Healing in enemy/neutral territory (wired); Looting: +50% yield/HP from pillaging; Survival Training: Commando plus terrain/cliff benefits |
| Maneuver | Mobility and flanking | Mobility: +1 movement while on land and ignore terrain restrictions when packed; Harassment: +2 flanking bonus attacking; Redeploy: enemy flanking bonuses -2 attacking units in radius; Amphibious: no embarked attack penalty and 1 movement embark/disembark; Pathfinder: ignore terrain movement restrictions; Area Denial: command radius projects ZoC to enemy land units |
| Leadership | Settlement and command actions | Zeal: stackable +5% settlement yields while stationed on a District (wired); Field Commission: upgrade land units in radius as friendly-territory and heal 10 HP on upgrade (wired); Old Guard: commander +10 CS defending; Resilience: -50% recovery time (wired); Barrage: +5 CS with Focus Fire; Onslaught: +4 CS with Coordinated Attack `[source-conflict: Game8 says +5]` |

**Fleet Commander trees** mirror Army structure: Engagement (Weather Gage), Assault (Naval Artillery: +5 CS vs fortified districts), Logistics (Warships: +15% naval unit production), Maneuver. Fifth tree name not confirmed.

### Commendations

Completing any tree → 1 Commendation Point. Max 5 points (one per tree).

| Commendation | Effect |
|---|---|
| Valor | Second Wind — extra attack/movement to units in radius |
| Duty | Heroic Assault — commander deals 30 flat HP to one enemy in radius |
| Service | +1 movement for land units in command radius |
| Merit | +1 command radius (but NOT XP radius) |
| Order | +5 CS for all land units in command radius |

Order is community-rated highest-value single commendation.

### Command Radius

Base 1 tile; 2 tiles with Merit. Units in radius get passive bonuses from Bastion/Assault, are targets of Coordinated Assault, grant XP, benefit from healing and commendations.

**Coordinated Assault:** +2 CS to radius units. Cooldown `[INFERRED]` 3 turns.

**Fortification construction:** 2 turns (1 with Bulwark `[INFERRED]`). Garrison promotion gives +10 HP to fortified districts in this city when the commander is stationed on the City Center; local implementation applies this as a damageable bonus-HP layer on city-center and urban district HP pools.

**Happiness reduction (non-combat role):** commander on city hall/palace reduces unhappiness by **10% + 10% per promotion point spent**. Creates peacetime role for veterans.

### Reinforcement

Units can be ordered to pathfind toward a commander and auto-join the formation on arrival. Conditions: **>6 tiles from commander** AND **full movement**. Recovery time varies with distance and Logistics promotions.

### Respawn on Defeat

Commanders cannot permanently die. On defeat:
1. Removed from map
2. `RESPAWN_TURNS_STANDARD` = 20 turns
3. Respawn at recruitment location (capital)
4. **All promotions, XP, commendations retained**

Late-age edge case: commander defeated within ~20 turns of age end may not respawn before transition. `[INFERRED]` state persists; respawns in new age.

### Age Transition Persistence

Commanders are the **only unit type explicitly confirmed to survive age transitions**. All state persists (xp, level, promotions, commendations).

**Packed units at transition:** Treated as ordinary non-commander units. In the current engine implementation, non-fleet commanders enter the new age unpacked and rebuild armies around the veteran commander. Broader non-commander unit retirement remains source-conflicting in `systems/ages.md`.

**Fleet Commander special rule (confirmed):** At Exploration → Modern, naval units **only** retained if assigned to Fleet Commander slots. Excess ships lost. Strong incentive to maintain Fleet Commanders with packed units before age end.

Creates "veteran general" arc across all three ages.

### Civ-Unique Commander Variants

Confirmed: **Roman Legatus** — Army Commander variant that gains settlement-founding ability after promotions. `[INFERRED-FANDOM from CivFanatics forum]`. Other civ variants likely exist.

---

## Formulas

```
PACK_CAPACITY_BASE = 4
PACK_CAPACITY_LOGISTICS = 6       // with Regiments (Logistics tree)
PACK_CIVILIAN_SLOTS = 1

COMMAND_RADIUS_BASE = 1
COMMAND_RADIUS_MERIT_BONUS = 1    // total = 2 with Merit

COMMANDER_MOVEMENT_BASE = 2       // [INFERRED-FANDOM]
COMMANDER_MOVEMENT_MOBILITY = 3
MANEUVER_FLANKING_BONUS = +2      // Harassment, attacking
MANEUVER_ENEMY_FLANKING_REDUCTION = -2 // Redeploy
MANEUVER_EMBARK_DISEMBARK_COST = 1
FIELD_COMMISSION_UPGRADE_HEAL = +10 // HP
OLD_GUARD_DEFENDING_BONUS = +10   // commander self, compat-combat only locally
BARRAGE_FOCUS_FIRE_BONUS = +5
ONSLAUGHT_COORDINATED_ATTACK_BONUS = +4 // Fandom; Game8 says +5

COORDINATED_ASSAULT_BONUS = +2    // CS for units in radius
ORDER_COMMENDATION_BONUS = +5     // CS, all land units in radius
STEADFAST_PROMOTION_BONUS = +2    // CS for land units in radius when defending
HOLD_THE_LINE_BONUS = +2          // CS for land units stationed on a District
DEFILADE_PROMOTION_BONUS = +3     // CS from Fortifications for land units in radius
RESOLUTE_HEAL_AFTER_ATTACK = +5   // HP after attacking for land units in radius
ROUT_PROMOTION_BONUS = +2         // CS, Infantry in radius
STORM_PROMOTION_BONUS = +2        // CS, Ranged in radius
SHOCK_TACTICS_PROMOTION_BONUS = +3 // CS, Cavalry in radius
ENFILADE_PROMOTION_BONUS = +3     // CS, Siege in radius
NAVAL_ARTILLERY_BONUS = +5        // naval CS vs fortified districts
HEROIC_ASSAULT_DAMAGE = 30        // flat HP from Duty

BUILD_FORTIFICATION_TURNS = 2
FORTIFICATION_GARRISON_HP_BONUS = +10

HAPPINESS_REDUCTION_BASE = 10     // percent per commander on city hall
HAPPINESS_REDUCTION_PER_PROMOTION = 10

REINFORCE_MINIMUM_DISTANCE = 6    // tiles from commander to issue Reinforce
REINFORCE_REQUIRED_MOVEMENT = 1.0 // full movement points

RESPAWN_TURNS_STANDARD = 20
RESPAWN_TURNS_RESILIENCE = 10    // -50% recovery time

COMMENDATION_COOLDOWN_TURNS = 3   // Valor, Duty; Coordinated Assault [INFERRED same]
```

XP thresholds per level: not published.

---

## Interactions

- `systems/combat.md` — commanders are the vehicle for passive combat buffs and coordinated orders
- `systems/ages.md` — commanders the single explicit exception to age-transition unit-loss rules
- `systems/civilizations.md` — civ-unique commander variants (e.g., Roman Legatus)
- `systems/settlements.md` — commanders on city halls reduce unhappiness; Fort Town walls +HP
- `systems/tech-tree.md` / `systems/civic-tree.md` — Discipline civic unlocks Army Commanders
- `systems/victory-paths.md` — Military milestones involve commander feats `[INFERRED]`
- `systems/independent-powers.md` — dispersing IPs grants XP with potential 3-tile radius

---

## Content flowing through this system

- [`content/units/`](../content/units/) — military units (packable), civilians (civilian slot)
- [`content/civilizations/`](../content/civilizations/) — civ-unique commander variants

---

## VII-specific (how this differs from VI/V)

- **No direct predecessor.** VI Great General was passive. VII Commander absorbs units and moves as formation.
- **Unit stacking domain-restricted, capacity-gated.** VI had no army stacking.
- **Only commanders earn XP.** V/VI individual units earned promotions; VII only commanders.
- **Commander persistence across ages is explicit.** No prior Civ carried military with full upgrades across eras.
- **Respawn on death (no permanent loss).** VI Great Generals could be permanently destroyed.
- **Fleet Commander is first-class class.** VI had no naval commander type.
- **Commanders have peacetime utility** (happiness reduction).
- **Formation deployment** — auto-arranges melee front, ranged rear.

---

## UI requirements

- **Commanders Panel** — list all owned commanders with name, type, level, XP, location, packed count
- **Promotion tree screen** — 5-tree node graph; locked dimmed; available highlighted; Commendations section
- **Command radius HUD overlay** — hex outline when commander selected; radius units highlighted
- **Pack/Unpack buttons** — Assemble Army / Deploy Army in action panel
- **Army composition indicator** — mini-roster showing packed units
- **Reinforce button** — appears for units >6 tiles + full movement
- **Respawn counter** — toast/progress bar on defeat
- **Age transition screen** — commanders carried-over; Fleet Commander slot vs naval unit count
- **Keyboard shortcut** — likely BottomBar military section `[INFERRED]`

---

## Edge cases

- No commander when war starts: units fight without passive bonuses.
- Regiments unlocked while at 4 packed: capacity expands to 6; next Assemble can absorb 2 more. `[INFERRED]`
- Commander defeated with units packed inside: packed units rout/disperse onto adjacent tiles; units can be vulnerable or lost when space is unavailable. `[secondary-source refreshed 2026-05-03]`
- Commander defeated in last ~20 turns of age: respawns in new age. `[INFERRED]`
- Non-fleet commander with packed units at age transition: commander persists unpacked; packed units are cleared.
- Fleet Commander with packed naval units at Exploration → Modern: assigned naval units retained in the Fleet Commander; unassigned ships lost.
- Zeal (stackable): multiple commanders in same city each provide +5% yield additively. Local implementation treats city centers and V2 urban tiles as district-like stationing targets, matching the Recruitment hook.
- Two commanders in radius of same fight: XP equally shared. May disincentivize clustering.
- Merit XP bug: expanded radius does NOT expand XP eligibility.
- Happiness reduction at high promotion counts: likely capped. `[INFERRED]`
- Civ-unique commanders with modified trees: share base structure, replace 1+ nodes. `[INFERRED]`
- Never spending promotion points: no penalty.
- Commander on city hall during war: passive bonus still applies. `[INFERRED]`

---

## Open questions

- Exact XP thresholds per level (not published)
- Fleet Commander unlock condition (age confirmed, trigger not)
- Exact placement/distribution of Fleet Commander retained naval units after age transition
- Full Fleet Commander, Aerodrome Commander, Squadron Commander, and Aircraft Carrier promotion tree listings
- Service commendation exact beneficiary (commander vs units)
- XP per attack vs per kill
- 3-tile XP radius for Independent Powers (single source)
- Fleet Commander fifth tree name
- Happiness reduction formula scope and cap

---

## Mapping to hex-empires

**Status tally:** 3 MATCH / 5 CLOSE / 0 DIVERGED / 0 MISSING / 2 EXTRA
**Audit:** [.codex/gdd/audits/commanders.md](../audits/commanders.md)
**Highest-severity finding:** F-01 — `pack-unpack-system-present-with-duplicate-paths` (CLOSE, HIGH)
**Convergence status:** Close — 5 numeric/detail adjustment(s) pending

_(Full details in audit file. 10 total finding(s). Regenerated by `.codex/scripts/aggregate-audits.py`.)_

## Author notes

The 2026-05-03 refresh could access Fandom's promotion list, so Army Commander promotion names and prereqs are now stronger than the original draft notes. The local Army promotion data now uses the sourced Assault, Logistics, Bastion, Maneuver, and Leadership node shapes. Most late-tree effects are still represented as typed metadata until their owning runtime systems exist. Fleet Commander, Aerodrome Commander, Squadron Commander, and Aircraft Carrier sections remain thinner and need the same source-refresh pass before they are treated as authoritative.

---

<!-- END OF TEMPLATE — do not add sections after this line. -->
