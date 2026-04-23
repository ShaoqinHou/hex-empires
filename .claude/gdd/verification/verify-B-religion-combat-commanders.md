# Verification B — religion + combat + commanders

**Verifier:** claude-sonnet-4.6 (agent a2233e41)
**Total findings:** 37 | ✅ 24 | ⚠️ 7 | ⏭️ 4 | 6 STALE (audit outdated post-implementation)

## 6 STALE findings (audit written before fixes landed)

- religion F-11: `ReligionPanel` IS wired in `App.tsx:216` + `panelRegistry.ts:80` (shortcut R)
- combat F-02: Directional facing/rear-arc partially implemented at `combatSystem.ts:349-402`; rear bonus is +5 (not +3/+6)
- combat F-03/F-13: `computeEffectiveCS` extracted in `CombatAnalytics.ts:12`; used by both `combatSystem.ts:240` + `CombatPreview.ts:715`
- combat F-09: `handleAttackDistrict` fully implemented at `combatSystem.ts:617-759` with `districtHPs` map
- commanders F-02: `GameState.ts:712` has `readonly commanders?: ReadonlyMap<string, CommanderState>`
- commanders F-09: `CommanderPanel` wired at `App.tsx:40,222`

## Top 5 MISSING HIGH (unresolved)

1. **religion F-08** — Missionary system entirely absent; `SPREAD_RELIGION` is a no-op (HIGH/L)
2. **religion F-09** — Relic system absent; Cultural Legacy Path blocked (HIGH/M)
3. **religion F-01** — Pantheon lacks Mysticism Civic prerequisite gate (HIGH/S)
4. **religion F-04** — `FOUND_RELIGION_FAITH_COST=200` still deducted at `religionSystem.ts:240` (HIGH/S — should be 0 per VII spec)
5. **commanders F-01** — `ASSEMBLE_ARMY`/`DEPLOY_ARMY` types-only in `Commander.ts:220-221`, no system handler (HIGH/L)
