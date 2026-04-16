---
purpose: Gap analysis of engine vs civ7-rulebook, documenting intentional simplifications and remaining divergences.
---

# Gap Analysis v3 — Post-Audit Source of Truth (2026-04-10)

Compiled from 4-agent code audit against civ7-rulebook.md.
Every item verified against actual code, not assumptions.

## Legend
- **BUG** = Code contradicts rulebook intent (fix immediately)
- **MISSING-SYSTEM** = System/mechanic not implemented
- **MISSING-CONTENT** = Data files needed (no system changes)
- **SIMPLIFIED** = Intentionally simpler than rulebook (document, don't fix)
- **DONE** = Correctly implemented

---

## CRITICAL BUGS (code is wrong, not just missing)

| # | Bug | Rulebook Says | Code Does | File | Fix |
|---|-----|--------------|-----------|------|-----|
| B1 | River penalty direction | Penalizes **attacker** crossing river | Penalizes **defender** | combatSystem.ts:191 | Swap to check attacker's previous position vs river |
| B2 | Specialist happiness cost | -2 happiness per specialist | -1 happiness per specialist | resourceSystem.ts:66 | Change to `city.specialists * 2` |
| B3 | Specialist food cost | -2 food per specialist | No food cost | YieldCalculator.ts | Subtract `specialists * 2` from food yield |
| B4 | Enemy territory healing | 5 HP/turn | 10 HP/turn (same as neutral) | turnSystem.ts:97 | Add enemy territory check, return 5 |
| B5 | Settlement cap penalty | -5 × overage applied to EACH settlement | -5 × overage applied once total | resourceSystem.ts:80 | Multiply penalty by number of settlements |
| B6 | Fortification bonus | Flat +5 CS | +50% of total defense | combatSystem.ts:197 | Change to flat +5 additive bonus |
| B7 | HP degradation | Discrete: -1 CS per 10 HP lost | Continuous: health/100 multiplier | combatSystem.ts:172 | Change to `Math.floor(unit.health / 10)` scaling |

---

## MISSING SYSTEMS (need new code)

| # | System | Rulebook Section | What's Needed | Complexity |
|---|--------|-----------------|---------------|------------|
| S1 | Settlement cap scaling | 2.2 | Techs/civics/ages increase cap beyond 4 | LOW — add effects to tech/civic data, check in resourceSystem |
| S2 | Research overflow | 9.2 | Excess science carries to next tech | LOW — same pattern as production overflow |
| S3 | Civic mastery | 9.2 | Same as tech mastery but for civics | LOW — mirror researchSystem mastery logic |
| S4 | Endeavor yield effects | Diplomacy | Active endeavors give +2 gold/+2 science per turn | LOW — add to resourceSystem END_TURN |
| S5 | Sanction yield effects | Diplomacy | Active sanctions reduce target's gold by -3/turn | LOW — add to resourceSystem END_TURN |
| S6 | War Support CS penalty | Diplomacy | -1 CS per negative war support point | LOW — add check in combatSystem |
| S7 | Building categories | 8 | Warehouse (no maintenance), Happiness (no happiness maint), Gold (no gold maint) | MEDIUM — add category field to BuildingDef, adjust maintenance calc |
| S8 | Building happiness maintenance | 8 | Most buildings cost 2-4 happiness maintenance | MEDIUM — add happinessCost to BuildingDef, subtract in happiness calc |
| S9 | Settlement cap penalty cap | 2.2 | Max penalty is -35 (7 over cap) | TRIVIAL — add Math.min(7, excess) |
| S10 | Celebration threshold cap | 4.5 | Stop increasing after 7th celebration | TRIVIAL — add Math.min(7, count) |

---

## MISSING CONTENT (data files only, no system changes needed)

| # | Content | What's Missing | Count Needed |
|---|---------|---------------|-------------|
| C1 | Antiquity buildings | Bath, Arena, Altar, Villa, Amphitheatre, Garden, Engineering, Blacksmith | ~8 buildings |
| C2 | Exploration buildings | Gristmill, Sawmill, Stonecutter, Wharf, Inn, Temple, Menagerie, Bazaar, Guildhall, Dungeon | ~10 buildings |
| C3 | Modern buildings | Military Academy, Aerodrome, City Park, Dept Store, Radio Station, Museum, Opera House, Schoolhouse, Rail Station, Tenement | ~10 buildings |
| C4 | Missing units | Ballista, Phalanx, Horseman (antiquity), Quadrireme, Catapult, Trebuchet, Lancer, Cuirassier, more modern naval/air | ~15 units |
| C5 | Unit stat corrections | Warrior cost 40→30, Slinger range 1→2, Archer RS 25→20, Scout mov 3→2, Settler cost 80→50, Infantry CS 70→55, Tank CS 80→65, etc. | ~15 units to adjust |
| C6 | Building stat corrections | Granary cost 65→55, Monument cost 60→90, Market gold 3→5, etc. | ~10 buildings to adjust |
| C7 | Missing specialization types | Religious Site, Hub Town, Urban Center, Factory Town | 4 types to add |

---

## INTENTIONALLY SIMPLIFIED (document, don't fix)

These are conscious scope decisions for a simplified Civ VII-inspired game:

| Rule | Rulebook | Our Simplification | Reason |
|------|----------|-------------------|--------|
| Commander system | Only commanders get XP/promotions | All units get promotions | Commanders are a major Civ VII departure; our simpler system is more intuitive |
| Districts & Quarters | Two buildings form a Quarter | Buildings are flat list | District placement is a spatial mechanic requiring hex-level building positions |
| Per-tile specialist slots | 1 specialist per urban tile | Total specialist count per city | No tile-level citizen assignment UI |
| Specialist adjacency amplification | +50% adjacency from specialists | No adjacency system | Adjacency requires spatial building placement |
| Game speed settings | 5 speeds (0.5x to 3x costs) | Single speed | Multiplayer speed isn't in scope |
| Victory projects | Multi-step project chains | Simple threshold checks | Full victory projects need wonder-like production chains |
| Government system | Government types with celebration bonuses | No governments | Government system is a full subsystem |
| Religion/Pantheons | Pantheon bonuses, missionaries | No religion | Religion is a full subsystem |
| Espionage | Multi-turn steal tech operations | Not implemented | Espionage is a full subsystem |
| Revolt/Unrest | Unhappy settlements may revolt | Unhappiness only reduces yields | Revolt requires independent faction spawning |
| Age length settings | Abbreviated/Standard/Long | Single setting | Config option, not gameplay |

---

## WORK ORDER (priority sequence)

### Phase 1: Critical Bug Fixes (7 bugs)
All are small targeted fixes. Can be done in parallel.

### Phase 2: Missing Systems (S1-S10)
S9, S10 are trivial one-liners. S1-S6 are low complexity. S7-S8 are medium.

### Phase 3: Content Alignment
C5, C6 first (fix existing data). Then C1-C4 (add missing content). C7 last.

---

## COMPLETION TRACKING

After all phases: re-audit to verify 0 BUGs, 0 MISSING-SYSTEMs.
Target: all rules either DONE or SIMPLIFIED (with documented reason).
