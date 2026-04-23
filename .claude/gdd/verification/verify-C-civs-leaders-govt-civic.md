# Verification C — civilizations + leaders + government-policies + civic-tree

**Verifier:** claude-sonnet-4.6 (agent a9a241a7)
**Total findings:** 43 | ✅ 28 | ❌ 8 | ⚠️ 4 | ⏭️ 3

## Top 5 MISSING HIGH

1. **civilizations F-08** — Civ unlock system absent; no `unlockedCivIds` on PlayerState; `TRANSITION_AGE` accepts any civ
2. **civilizations F-06** — `getCivLegacyBonus()` hardcoded 6-entry table ignores `state.config.civilizations`; 11/17 civs get NO legacy bonus
3. **civilizations F-09 + civic F-06 (cross-cut)** — Traditions: `PlayerState.traditions` is bare `ReadonlyArray<string>` stub; no `TraditionCard` type, no `unlocksTradition` on CivicDef, no cross-age persistence
4. **leaders F-05** — Persona system absent; `LeaderDef` no `personas`, `PlayerState` no `personaId`; 5 VII leaders structurally inexpressible
5. **leaders F-11** — Named commander spawns: `GRANT_UNIT` effect exists but unused in all 9 leader definitions

## Positive surprises (landed correctly)

- civic-tree F-03 (age reset), F-04 (wildcard slots), F-07 (age lock), F-08 (ideology branch-lock) all ✅
- government-policies F-01/F-02/F-03/F-05/F-06/F-07/F-08 ✅ (wildcard slots, Chiefdom retired, celebration bonuses, PICK_CELEBRATION_BONUS, crisis policy slots, swap window)
- leaders F-10 `compatibleAges` retired ✅

## Remaining gaps

- civic-tree F-02 overflow culture wasted (`civicSystem.ts:144`)
- civic-tree F-13 non-VII `+5 ageProgress` per civic still present (`civicSystem.ts:145`)
- government-policies F-04 — `AUTHORITARIANISM`, `BUREAUCRATIC_MONARCHY`, `REVOLUCION` still absent from Modern governments
