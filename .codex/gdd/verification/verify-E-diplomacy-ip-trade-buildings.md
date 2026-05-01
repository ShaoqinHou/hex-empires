# Verification E -- Diplomacy, IP, Trade Routes, Buildings

**Verified:** 2026-04-19  
**Verifier:** VERIFIER subagent (claude-sonnet-4-6)  
**Audits:** diplomacy-influence.md (15), independent-powers.md (8), trade-routes.md (10), buildings-wonders.md (12)  
**Total:** 45 findings

---

## Audit 1 -- Diplomacy and Influence (15)

| F-ID | Audit | Verification | Evidence |
|------|-------|--------------|---------|
| F-01 | MATCH | VERIFIED | Yields.ts:1 influence in YieldType; GameState.ts:231 PlayerState.influence |
| F-02 | DIVERGED | VERIFIED | ResourceChangeCalculator.ts:155-160 totalInfluence=cityCount+2/alliance; no building/wonder contributions |
| F-03 | MISMATCH | VERIFIED | diplomacySystem.ts:224-235 DENOUNCE in PROPOSE_DIPLOMACY; delta -25 not -60; no Influence cost |
| F-04 | MISSING | MISSING | No RESPOND_ENDEAVOR; handleEndeavor fires immediately at diplomacySystem.ts:288 |
| F-05 | MISSING | MISSING | Zero matches for espionage across entire engine src/ |
| F-06 | MISSING | MISSING | No PROPOSE_TREATY, activeTreaties, DiplomaticTreaty anywhere in engine |
| F-07 | MISSING | PARTIAL | Superseded -- independentPowerSystem.ts scaffolded (see IP section) |
| F-08 | CLOSE | VERIFIED | combatSystem.ts:285 Math.min(10,...) confirms -10 cap not -20; no ADD_WAR_SUPPORT |
| F-09 | CLOSE | VERIFIED | diplomacySystem.ts:188-194 hasAlliance; no Open Borders/visibility/Mutual Defense |
| F-10 | EXTRA | VERIFIED | diplomacySystem.ts:199-222 + updateDiplomacyCounters:412 hasFriendship +1/turn drift |
| F-11 | MISSING | MISSING | DiplomacyState (GameState.ts:495-497) only relations Map; no diplomaticHistory |
| F-12 | N/A | VERIFIED | No World Congress; correctly absent |
| F-13 | DIVERGED | VERIFIED | diplomacySystem.ts:143-169 auto-accept on turnsAtWar>=5; no bilateral/settlementTransfers |
| F-14 | CLOSE | VERIFIED | diplomacySystem.ts:103 flat -50; no relationship scaling |
| F-15 | CLOSE | VERIFIED | DiplomacyPanel.tsx:38 priority=info confirmed |

---

## Audit 2 -- Independent Powers (8)

NOTE: All 8 were written as MISSING before system was built. Re-evaluated against actual code.

| F-ID | Audit | Verification | Evidence |
|------|-------|--------------|---------|
| F-01 | MISSING | PARTIAL | GameState.ts:679 independentPowers Map + IndependentPowerState; GameState.ts:312-314 suzerainties + suzerainBonuses on PlayerState |
| F-02 | MISSING | PARTIAL | independentPowerSystem.ts -- 9 actions, hostile NPC spawning HOSTILE_SPAWN_INTERVAL=3, wired into GameEngine (123 engine occurrences) |
| F-03 | MISSING | PARTIAL | ageSystem.ts:144-171 -- removes non-incorporated IPs, re-seeds from config, clears suzerainties |
| F-04 | MISSING | PARTIAL | PlayerState.suzerainties + suzerainBonuses; SUZERAIN_BONUS_SELECTED handler; pool depletion at independentPowerSystem.ts:268-276 |
| F-05 | MISSING | PARTIAL | INCITE_RAID at 30 Influence; hostile unit spawning on END_TURN |
| F-06 | MISSING | PARTIAL | data/independent-powers/ -- 6 named factions + barrel index |
| F-07 | MISSING | MISSING | DiplomacyPanel.tsx still renders state.players only; no IP tab |
| F-08 | DIVERGED | MISSING | Pericles effect remains flat MODIFY_YIELD culture +2; no dynamic suzerain scaling |

---

## Audit 3 -- Trade Routes (10)

| F-ID | Audit | Verification | Evidence |
|------|-------|--------------|---------|
| F-01 | DIVERGED | PARTIAL | tradeSystem.ts:215-221 destination gold correct; origin copy is void no-op (line 211 comment) |
| F-02 | DIVERGED | FIXED | Permanent routes; war/age-transition cancellation at tradeSystem.ts:232-290 |
| F-03 | DIVERGED | FIXED | tradeSystem.ts:134-168 caravan/trade_ship unit created; merchant deleted |
| F-04 | MISSING | FIXED | tradeSystem.ts:103-116 LAND_RANGE + SEA_RANGE age-scaled check |
| F-05 | MISSING | FIXED | tradeSystem.ts:118-121 hostile/war diplomatic gate |
| F-06 | MISSING | FIXED | tradeSystem.ts:30,123-125 CIV_PAIR_ROUTE_CAP=1 + countRoutesBetween |
| F-07 | CLOSE | PARTIAL | Panel shows gold; accurate reflection of incomplete F-01 origin side |
| F-08 | MISSING | MISSING | tradeSystem.ts:93-94 dist>1 check applies all ages; no modern branch |
| F-09 | MISSING | MISSING | No pathTravelled; no road placement on route creation |
| F-10 | EXTRA | VERIFIED | City-pair dedup at tradeSystem.ts:128-132 still present but secondary |

---

## Audit 4 -- Buildings and Wonders (12)

| F-ID | Audit | Verification | Evidence |
|------|-------|--------------|---------|
| F-01 | MISSING | FIXED | Building.ts:26-38 isAgeless?, isCivUnique?, civId?, requiredCivic? all present |
| F-02 | MISSING | MISSING | ageSystem.ts no code touches CityState.buildings on TRANSITION_AGE |
| F-03 | EXTRA | VERIFIED | wonderPlacementSystem.ts:19 pass-through return state; intentionally unwired |
| F-04 | DIVERGED | FIXED | urbanBuildingSystem.ts:93,107 + DistrictOverhaul.ts:94 unique_quarter + ageless_pair tested |
| F-05 | MISSING | FIXED | DistrictAdjacency.ts:8,148-154 SPECIALIST_AMPLIFIER; specialistCount amplification |
| F-06 | MISSING | MISSING | DistrictAdjacency.ts no wonder-neighbor check; no WONDER_ADJACENCY_PER_NEIGHBOR |
| F-07 | DIVERGED | PARTIAL | Building.ts:37-38 requiredCivic? added; BUT productionSystem.ts handleSetProduction does NOT check requiredTech or requiredCivic |
| F-08 | MISSING | MISSING | No rival-wonder cancellation; no race notification in productionSystem |
| F-09 | EXTRA | FIXED | GameEngine.ts:16,51,88 urbanBuildingSystem wired via adaptUrbanBuilding in DEFAULT_SYSTEMS |
| F-10 | DIVERGED | FIXED | productionSystem.ts:5,61,328 + growthSystem.ts:3,74 both use calculateCityYieldsWithAdjacency |
| F-11 | MISSING | MISSING | DemolishBuildingActionV2 in DistrictOverhaul.ts type only; NOT in main GameAction; no handler |
| F-12 | DIVERGED | FIXED | GameEngine.ts:95-96 buildingPlacementSystem removed; urbanBuildingSystem is source of truth |

---

## Summary Tally

| Audit | Findings | VERIFIED/FIXED | PARTIAL | MISSING |
|-------|----------|----------------|---------|---------|
| Diplomacy | 15 | 11 | 1 | 3 |
| Independent Powers | 8 | 0 | 5 | 3 |
| Trade Routes | 10 | 6 | 2 | 2 |
| Buildings/Wonders | 12 | 7 | 1 | 4 |
| **Total** | **45** | **24 (53%)** | **9 (20%)** | **12 (27%)** |

---

## Top-5 Critical MISSING (HIGH severity, recommended order)

1. **Diplomacy F-05** -- Espionage system: zero engine presence
2. **Diplomacy F-04** -- Endeavor 3-way response absent; unilateral only
3. **Buildings F-02** -- ageSystem does not obsolete non-ageless buildings on TRANSITION_AGE
4. **Trade F-01 (partial)** -- Origin resource-copy void no-op; asymmetric yield half-done
5. **Diplomacy F-06** -- Treaty system entirely absent (Open Borders, Trade Relations)

---

## Stale findings (implemented since audits written)

13 findings now FIXED/PARTIAL:
- Trade F-02, F-03, F-04, F-05, F-06 (all FIXED)
- Buildings F-01, F-04, F-05, F-09, F-10, F-12 (all FIXED)
- IP F-01 through F-06 (PARTIAL -- system scaffolded)
- Diplomacy F-07 (PARTIAL -- IP system exists)