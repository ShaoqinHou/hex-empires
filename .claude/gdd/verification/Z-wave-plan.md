# Z-wave plan — continue fixing MISSING items after Y-wave lands

**Context:** Y-wave covers 6+3+4+1+2 = 16 MISSING-HIGH items. The verification-summary lists ~53 total MISSING. Post-Y that leaves ~37, of which ~15 are HIGH or blocking. Z-wave targets those.

## Z-packs (all via GLM, parallel Bash)

### Z1 — Government + Victory polish (S-M)
- **gov F-04** — add 3 Modern governments: AUTHORITARIANISM, BUREAUCRATIC_MONARCHY, REVOLUCION (with `civRequired: 'mexico'`)
- **victory F-06** — Score Victory trigger: normalize ageProgress 0–1 on AgeState; trigger when `currentAge === 'modern' && ageProgress >= 1.0 && !winner`
- **civic F-02** — preserve overflow culture on civic completion: `civicProgress: newProgress - civicCost` instead of `0`
- **civic F-05** — CivicTreePanel civ-unique tab (shared/unique split)

### Z2 — Crises + Map (M)
- **crises F-04** — per-age crisis pool + seeded RNG selection at age init (add `age` + `crisisType` fields to CrisisEventDef; seed selection in ageSystem)
- **map F-03** — binary deplete-all movement (change TerrainCost to return `'deplete' | number | null`)
- **map F-08** — standardize defense format: JUNGLE 0.25→2, MARSH -0.15→0; add river-crossing -5 CS

### Z3 — Missionary + Relics (L)
- **religion F-08** — Missionary scaffold: MISSIONARY unit, SPREAD_RELIGION action, per-city religion tracker, spread range
- **religion F-09** — Relic scaffold: RELIC type, RelicId union, Relic collection via specific narrative events or defeat holy unit
- Cross-cut: wire Cultural Legacy Path to count displayed Relics

### Z4 — Civs + Leaders completion (M)
- **civs F-08** — Civ unlock system: `PlayerState.unlockedCivIds`, validate on TRANSITION_AGE, default unlocks per prior civ
- **leaders F-05** — Persona scaffold: add `personas?: PersonaDef[]` to LeaderDef, `personaId: string | null` to PlayerState, 2 personas for 1 leader as example
- **leaders F-11** — One leader ability using GRANT_UNIT (Harriet Tubman Combahee Raid or similar)

### Z5 — Ages global transition + tech registry (L)
- **ages F-01** — simultaneous global transition: `GameState.transitionPhase: 'none' | 'pending' | 'in-progress' | 'complete'`, all players queue transition choices, ancient END_TURN blocked globally until all transition
- **tech F-13** — Future Tech as registry entries: add FUTURE_TECH_ANTIQUITY, FUTURE_TECH_EXPLORATION, FUTURE_TECH_MODERN with explicit prerequisites; remove the `allAgeTechsResearched` magic path

## Execution

Fire all 5 in parallel once Y-wave lands + tests pass + deploy.

Verification: run `bash .claude/scripts/verify-retirements.sh` after each wave (should still be 21 pass), run `npm run test:engine` (should keep passing), add each new retirement/addition to retirement-invariants.test.ts.

## Stop criteria

Target: ~85-90% VERIFIED per verification summary. Remaining ~10-15% are content-dense items (1000+ narrative events, 1690+ legends challenges, 17+ civ-unique improvements) — that's content expansion work, not architectural.
