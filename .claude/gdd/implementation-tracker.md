# Implementation Tracker — 250 findings → VII clone

**Purpose:** Master punch list for implementing every audit finding. Survives `/compact`. Updated after every workpack lands.

**Strategy:** Workpack batching — group related findings across systems into themes, fire implementer agents in parallel per wave, commit per wave, run tests after each wave.

**Ordering principle:**
1. Type-layer foundations first (new fields unlock later work)
2. Quick wins (S-effort, data-only) in parallel
3. Retire EXTRA Civ-VI-isms
4. Fix DIVERGED mechanics system-by-system
5. Add MISSING subsystems (cross-cutting)
6. Content expansion (last — blocks on type/system layer)

---

## Workpack plan (33 packs, ~250 findings)

### Wave 1: foundation types + quick wins (10 packs, parallel)

| # | Pack | Systems | Findings | Effort |
|---|---|---|---|---|
| W1-01 | `BuildingDef` + `ImprovementDef` ageless flag | buildings-wonders, tile-improvements | BW F-01, TI F-09 | S |
| W1-02 | `PlayerState` missing fields (narrativeTags, globalHappiness, socialPolicySlots, traditions, ideology, suzerainties, equippedMementos, ideologyPoints, railroadTycoonPoints, artifactsCollected, spaceMilestonesComplete, attributePoints, attributeTree, wildcardAttributePoints) | cross-cutting | celebrations F-07, narrative-events F-02, civic-tree F-06/F-08, government F-06, IP F-04, mementos F-03, victory F-01-F-04, leaders F-02, tech F-04 | S |
| W1-03 | `GameState` missing fields (independentPowers Map, firedNarrativeEvents, pendingNarrativeEvents, ageProgressMeter global) | cross-cutting | IP F-01, narrative F-03/F-05, legacy F-11 | S |
| W1-04 | `CityState` missing fields (infected, civilUnrestTimer, assignedResources, razingCountdown, foundedBy, originalOwner, isUrban) | cross-cutting | celebrations F-05, resources F-11, settlements F-08, legacy F-02, TI F-13 | S |
| W1-05 | `HexTile` missing fields (isDistantLands, hasFreshWater, isNaturalWonder, discoveryId) | map-terrain | MT F-04, F-07, F-11, narrative F-06 | S |
| W1-06 | Age transition reset wipes (researchedCivics, researchedTechs, masteredTechs, currentResearch, governmentId, slottedPolicies, pantheonId) | ages + civic + tech + religion | ages F-05/F-06/F-08, civic F-03, tech F-01 | S |
| W1-07 | Data cleanup: retire BUILDER unit, CHIEFDOM govt, GOLDEN_AGE/TRADE_OPPORTUNITY from crises, diplomacy VictoryType, Democracy→Elective Republic rename, JUNGLE science yield fix, terrain yield corrections | data | TI F-01/F-12, govt F-02/F-04, crises F-09, victory F-07, MT F-06/F-10 | S |
| W1-08 | Effect system additions: WONDER_ADJACENCY_PER_NEIGHBOR, SPECIALIST_AMPLIFIER, CELEBRATION_DURATION map, CELEBRATION_THRESHOLDS table | constants | celebrations F-02/F-11, BW F-05/F-06 | S |
| W1-09 | Age gating fixes: Farm terrain prereqs (remove desert/tundra), ROAD retire from improvements | data | population-specialists cross-cut, TI F-09 | S |
| W1-10 | System import-boundary fixes: `ALL_CRISES`→`state.config.crises`, `ALL_ACHIEVEMENTS`→`state.config.achievements` in panel | engine-patterns | crises F-05, legends F-06 | S |

### Wave 2: DIVERGED mechanics refactors (8 packs)

| # | Pack | Systems | Findings | Effort |
|---|---|---|---|---|
| W2-01 | Tile-improvements flagship: CITY_POPULATION_GROWTH event, PLACE_IMPROVEMENT action, pendingGrowthChoices | tile-improvements, population-specialists | TI F-02/F-03/F-04/F-08, pop F-08 | M |
| W2-02 | Settlements: age-transition city downgrade, town cap 5→7, town-upgrade cost scaling, settlement cap values | settlements | S F-01/F-02/F-03/F-04/F-07 | M |
| W2-03 | Civic tree + government: flatten slot categories to wildcard, ideology branch-lock, government per-age lock | civic-tree, government-policies | CT F-04, GP F-01, CT F-07/F-08 | M |
| W2-04 | Religion: remove pantheon-as-prereq for religion, pantheon-to-religion pipeline severed | religion | R F-02/F-03 | S-M |
| W2-05 | Crises: age_progress trigger, policy slot model on PlayerState, END_TURN gate | crises | C F-02/F-03/F-04 | M |
| W2-06 | Trade routes: asymmetric yields (origin→resources, destination→gold), permanent lifecycle, caravan unit conversion, distance check, diplomatic gate | trade-routes | TR F-01/F-02/F-03/F-04/F-05/F-06 | M |
| W2-07 | Legacy paths: consolidate dual schema, typed legacy points by axis, per-age kill counters, career legacy points accumulator, 1-per-transition golden age cap | legacy-paths | LP F-01/F-02/F-07/F-09/F-10 + F-05 | M |
| W2-08 | Victory paths: remove diplomacy victory, retire invented alliance/culture gates, domination settlement-only check | victory-paths | VP F-01/F-04/F-05/F-07/F-08 | M |

### Wave 3: MISSING subsystem scaffolds (8 packs)

| # | Pack | Systems | Findings | Effort |
|---|---|---|---|---|
| W3-01 | Quarter detection subsystem (civ-unique pairs, ageless-pair, unique_quarter kind) | buildings-wonders, tile-improvements | BW F-04, TI F-07 | M |
| W3-02 | Specialists spatial refactor: per-urban-tile map, cap, adjacency amplification | population-specialists, yields-adjacency | pop F-03/F-04/F-09, YA F-04/F-05 | L |
| W3-03 | Celebrations: globalHappiness accumulator, threshold table, government-gated bonus menu (modal) | celebrations | cel F-01/F-02/F-03/F-04/F-06 | M |
| W3-04 | Independent Powers: IndependentPowerState type, system file, age-transition reset, hostile unit spawning, INCITE_RAID, data skeleton | independent-powers | IP F-01 through F-08 | L |
| W3-05 | Narrative events: NarrativeEventDef type, system file, RESOLVE action, UI panel, minimal content | narrative-events | NE F-01 through F-07 | L |
| W3-06 | Legends: AccountState persistence layer, Foundation XP/Level, leaderLevels, legendsSystem.ts | legends, mementos | L F-01-F-07, M F-01-F-06 | L |
| W3-07 | Attribute system (leader RPG layer) | leaders | leaders F-02 | L |
| W3-08 | Tech tree: codex system (Phase 1 — codexSlots, ownedCodices, awarding), mastery bonuses per-tech, techProgressMap | tech-tree | tech F-02/F-06/F-08 | L |

### Wave 4: Large architectural refactors (5 packs)

| # | Pack | Systems | Findings | Effort |
|---|---|---|---|---|
| W4-01 | Cycle F: wire urbanBuildingSystem into GameEngine, retire legacy buildingPlacementSystem, swap calculateCityYields→WithAdjacency in growth/production | buildings-wonders | BW F-09/F-10/F-12 + TI F-05 | L |
| W4-02 | Map biome+modifier refactor: new terrain model, Tropical biome, deep ocean attrition, Distant Lands partition | map-terrain | MT F-01/F-02/F-04/F-05 | XL |
| W4-03 | Combat: flanking directional model (unit facing), shared effective-CS utility, multi-district siege HP | combat | combat F-02/F-03/F-09/F-13 | L |
| W4-04 | Commanders: CommanderState in GameState, pack/unpack army system, commander age persistence | commanders | commanders F-01/F-02/F-08 | L |
| W4-05 | Resources: per-age bonus tables, empire-resource combat modifier pipeline, assignment system wiring | resources | res F-01/F-02/F-03/F-05/F-06/F-07 | L |

### Wave 5: Modern victory content + projects (2 packs)

| # | Pack | Systems | Findings | Effort |
|---|---|---|---|---|
| W5-01 | COMPLETE_PROJECT action + project system + Manhattan/Operation Ivy, Railroad Tycoon/World Bank, Space Race sequence | victory-paths | VP F-01/F-02/F-03 | L |
| W5-02 | Content: Artifacts (Explorer excavation), World's Fair wonder, Natural Wonders (12) | victory-paths, map-terrain | VP F-04, MT F-07 | L |

### Total: 33 workpacks

---

## Status log

**Started:** 2026-04-19
**Current wave:** W1 (Wave 1 — foundation types + quick wins)

### Wave 1 progress (10 packs consolidated into 4 implementer agents)

| Pack | Status | Agent | Commit | Notes |
|---|---|---|---|---|
| W1-A (01+02+03+04+05 state fields + ageless flags) | ✅ done | a7fa5043 | 4da7fd8 | state-layer type additions landed |
| W1-B (06 age transition wipes) | ✅ done | a9468695 | e01afa4 | 1556 tests PASS; A7 rewritten |
| W1-C (07+09 data cleanup — BUILDER/CHIEFDOM retire, yields fix) | ✅ done | a48f4250 | 11bded3 | 1551 tests PASS; 2 late-caught chiefdom refs; YieldCalculator has parallel yield table gotcha |
| W1-D (08+10 constants + import-boundary) | ✅ done | a1625155 | 590e5e8 | 1551/1556 tests (5 pre-existing fails from other agents' incomplete refactors) |

Wave-1 progress: 2/4 done (W1-B, W1-D). W1-A (state fields) + W1-C (data cleanup) still running — both are longer-scope packs touching many files.

Memory note: agent flagged `git stash` reverted its edits once — future workpacks should avoid stash during baseline checks. Vitest also discovers tests from `.claude/worktrees/agent-*/`, inflating run counts.

---

## Ground rules for implementer agents

- Read relevant audit file + GDD doc before touching code
- Test after every non-trivial change (`npm test` or `npm run test:engine`)
- Follow engine patterns (immutable state, seeded RNG, state.config.X not ALL_X, etc.)
- One workpack = one commit (ideally)
- `BLOCKED` if Write denied — parent persists if possible
- Minimum one test per new field/system

---

## Post-compact recovery

If `/compact` fires mid-wave: the current wave's running agents are still tracked in the agent-timing log. Re-read:
- This file (current wave + pack status)
- Recent git log (`git log --oneline -20 .claude/gdd/`)
- `.claude/gdd/convergence-tracker.md` for finding detail

Resume from the pending pack in the current wave.
