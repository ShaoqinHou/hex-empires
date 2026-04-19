# Leaders — hex-empires Audit

**System slug:** `leaders`
**GDD doc:** [systems/leaders.md](../systems/leaders.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/data/leaders/types.ts`
- `packages/engine/src/data/leaders/all-leaders.ts`
- `packages/engine/src/state/GameInitializer.ts`
- `packages/engine/src/state/GameConfigFactory.ts`
- `packages/engine/src/types/GameState.ts` (PlayerState)
- `packages/engine/src/systems/ageSystem.ts`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 2 |
| CLOSE | 1 |
| DIVERGED | 2 |
| MISSING | 5 |
| EXTRA | 1 |

**Total findings:** 11

---

## Detailed findings

### F-01: Leader persists across age transition — MATCH

**Location:** `ageSystem.ts:75-84`
**GDD reference:** `systems/leaders.md` § "Triggers" → age transition
**Severity:** LOW
**Effort:** S
**VII says:** `leaderId` persists unchanged on TRANSITION_AGE. Civ changes; leader does not.
**Engine does:** `handleTransition` spreads `...player` and overwrites only civ/age/progress/etc. `leaderId` untouched. Regression test `age-transition-rulebook-parity.test.ts:108` asserts preservation.
**Gap:** None.
**Recommendation:** No action.

---

### F-02: Attribute system (6-tree RPG layer) absent — MISSING

**Location:** `types/GameState.ts` (PlayerState), `data/leaders/types.ts`
**GDD reference:** `systems/leaders.md` § "Attribute System"
**Severity:** HIGH
**Effort:** L
**VII says:** Each player has `attributeTree` (Economic, Militaristic, Diplomatic, Expansionist, Cultural, Scientific) + `attributePoints` pool. Points earned from leader narrative events (1/age), civ events, Wonder construction, victory rewards, civic research. Leader has 2 designated primary attribute trees. All progress persists across ages — the only never-resetting in-game upgrade system.
**Engine does:** `PlayerState` has no `attributePoints` or `attributeTree`. No `EARN_ATTRIBUTE_POINT` or `SPEND_ATTRIBUTE_POINT` actions. `LeaderDef` has no `primaryAttributes`. No `attributeSystem.ts`.
**Gap:** Entire RPG-layer absent. Leader differentiation reduces to unique ability only. Single largest leaders gap.
**Recommendation:** Add `primaryAttributes: ReadonlyArray<AttributeType>` (2-element) to `LeaderDef`. Add `attributePoints: number` + `attributeTree: AttributeTree` to `PlayerState`. Add actions + `attributeSystem.ts`.

---

### F-03: Leader roster is 9 leaders; VII shipped 21 unique (26 w/ personas) — DIVERGED

**Location:** `data/leaders/all-leaders.ts`
**GDD reference:** `systems/leaders.md` § "Persona System"
**Severity:** MED
**Effort:** M
**VII says:** 21 unique leaders at launch, 26 with alternate personas. Includes Augustus, Hatshepsut, Confucius, Ibn Battuta, Harriet Tubman, Napoleon (Emperor+Revolutionary), Tecumseh, others. 5 leaders have dual personas.
**Engine does:** `ALL_LEADERS` has 9 entries: Augustus, Cleopatra, Pericles, Cyrus, Gandhi, Qin Shi Huang, Alexander, Hatshepsut, Genghis Khan. Several are Civ V/VI leaders NOT in VII (Pericles, Cyrus, Gandhi, Genghis Khan). Missing confirmed VII leaders (Confucius, Ibn Battuta, Harriet Tubman, Napoleon, Tecumseh…).
**Gap:** 43% of VII roster size; some entries are Civ-VI holdovers. No persona support.
**Recommendation:** Audit roster against VII confirmed list. Flag non-VII. Add missing VII. Add persona support (see F-05).

---

### F-04: `LeaderDef.agendas` is free-form string array, not typed — DIVERGED

**Location:** `data/leaders/types.ts:8`
**GDD reference:** `systems/leaders.md` § "Agenda System"
**Severity:** MED
**Effort:** M
**VII says:** Each leader has agenda with typed trigger condition, relationship delta, visibility. Drives AI diplomatic behavior, fires on DIPLOMATIC_ACTIONs.
**Engine does:** `agendas: ReadonlyArray<string>` (e.g., `['expansionist', 'builder']`). Plain tags with no mechanical backing. No agenda-trigger system.
**Gap:** Agenda system is a tag array with zero mechanical consequence.
**Recommendation:** Define typed `AgendaDef` with `triggerAction`, `condition`, `relationshipDelta`. Replace string array with `agenda: AgendaDef | null`. Add evaluation to `diplomacySystem`.

---

### F-05: Persona system absent from LeaderDef — MISSING

**Location:** `data/leaders/types.ts`
**GDD reference:** `systems/leaders.md` § "Persona System"
**Severity:** MED
**Effort:** M
**VII says:** 5 base-game leaders have 2 personas each. Each persona has distinct ability, attribute designation, agenda. Selected at game start.
**Engine does:** `LeaderDef` has no `personas`. `GameSetupConfig` has no `personaId`.
**Gap:** 21→26 expansion structurally impossible.
**Recommendation:** Add `personas?: ReadonlyArray<PersonaDef>` to `LeaderDef`. Add `personaId: string | null` to `PlayerState`.

---

### F-06: Memento slots absent from PlayerState and LeaderDef — MISSING

**Location:** `types/GameState.ts`, `data/leaders/types.ts`
**GDD reference:** `systems/leaders.md` § "Mementos and Pre-Game Loadout" (cross-cut `mementos.md`)
**Severity:** MED
**Effort:** M
**VII says:** Each leader has 2 cross-leader memento slots. Mementos equipped pre-game, persist across ages.
**Engine does:** No `mementoSlots` field. No `MementoDef` type. No pre-game loadout step.
**Gap:** Pre-game loadout layer entirely absent.
**Recommendation:** Add `mementoSlots: readonly [string|null, string|null]` to `PlayerState`. Extend `GameSetupConfig`. Apply in `GameInitializer`.

---

### F-07: Relationship five-tier ladder not verified — CLOSE

**Location:** `types/GameState.ts` (diplomacy), `state/GameInitializer.ts:150`
**GDD reference:** `systems/leaders.md` § "Relationship System"
**Severity:** MED
**Effort:** S
**VII says:** 5 tiers: Helpful/Friendly/Neutral/Unfriendly/Hostile. Persist across ages.
**Engine does:** `state.diplomacy.relations` exists as player-to-player Map. Tiers exist in `diplomacySystem`. `ageSystem` does not touch `diplomacy` on transition (persistence works via omission). Exact tier names + modifier values unverified in this audit.
**Gap:** Functional shape correct; exact names + values need cross-check.
**Recommendation:** Verify `diplomacySystem.ts` tier enum matches canonical 5 names. Confirm TRANSITION_AGE does not touch `state.diplomacy`.

---

### F-08: Leader unique ability names diverge from VII — DIVERGED (names only)

**Location:** `data/leaders/all-leaders.ts`
**GDD reference:** `systems/leaders.md` § "Unique Abilities"
**Severity:** LOW
**Effort:** S
**VII says:** Augustus = "Imperium Maius"; Hatshepsut = "God's Wife of Amun".
**Engine does:** Augustus.ability.name = "Pax Romana" (Civ VI). Hatshepsut.ability.name = "Eye of Horus" (not confirmed VII). Cleopatra = "Mediterranean Bride" (Civ VI).
**Gap:** Two confirmed leaders have wrong names. Others unverified.
**Recommendation:** Rename Augustus→"Imperium Maius"; Hatshepsut→"God's Wife of Amun". Add `// [CIV-VI-HOLDOVER]` comments.

---

### F-09: Starting bias and historical civ pairing absent — MISSING

**Location:** `data/leaders/types.ts`
**GDD reference:** `systems/leaders.md` § "AI Leader Pairing and Starting Bias"
**Severity:** LOW
**Effort:** S
**VII says:** Leaders have starting bias (terrain preference for world-gen). AI uses historically-closest civ pairing. Recommended pairing shown at civ selection.
**Engine does:** No `startingBias` or `historicalCivId`. `GameInitializer` picks AI civs from flat pool.
**Gap:** AI civ assignment unhistorical.
**Recommendation:** Add `startingBias?: TerrainType` + `historicalCivId?: CivilizationId` to `LeaderDef`.

---

### F-10: `compatibleAges` on LeaderDef is not a VII concept — EXTRA

**Location:** `data/leaders/types.ts:12`
**GDD reference:** `systems/leaders.md` § "Leader-Civ Separation"
**Severity:** LOW
**Effort:** S
**VII says:** Leaders are age-agnostic. Age restrictions are civ-level, not leader-level.
**Engine does:** `LeaderDef.compatibleAges: ReadonlyArray<'antiquity'|'exploration'|'modern'>`. All 9 set to all three — perpetual no-op. Presence contradicts VII leader-persistence.
**Gap:** Field could mislead future contributors.
**Recommendation:** Remove `compatibleAges`.

---

### F-11: Named commander spawns not modeled — MISSING

**Location:** `data/leaders/types.ts`, `data/leaders/all-leaders.ts`
**GDD reference:** `systems/leaders.md` interactions; `content/leaders/`
**Severity:** LOW
**Effort:** M
**VII says:** Some leader abilities spawn named commander units (e.g., Harriet Tubman's "Combahee Raid").
**Engine does:** No commander-grant mechanism. `GRANT_UNIT` effect exists but unused in all 9 leader definitions.
**Gap:** Leader-specific commander spawns structurally inexpressible.
**Recommendation:** Express via `GRANT_UNIT` EffectDef in `leader.ability.effects`. Define leader-scoped commander units with `leaderId` foreign key.

---

## Extras to retire

- `LeaderDef.compatibleAges` (F-10) — no-op on every entry.
- `LeaderDef.agendas: string[]` (F-04) — replace with typed `AgendaDef`.

---

## Missing items

1. Attribute system: `attributePoints`, `attributeTree`, actions, `primaryAttributes`, `attributeSystem.ts` (F-02) — core VII progression.
2. Persona support (F-05) — required for 5 VII leaders.
3. Memento slots + pre-game loadout (F-06).
4. Missing leader roster entries; Civ-VI holdovers (F-03).
5. Typed agenda system (F-04).
6. Starting bias + historical civ pairing (F-09).
7. Named commander spawns (F-11).

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/leaders.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/data/leaders/types.ts`
- `packages/engine/src/data/leaders/all-leaders.ts`
- `packages/engine/src/types/GameState.ts`
- `packages/engine/src/state/GameInitializer.ts`
- `packages/engine/src/systems/ageSystem.ts` (leaderId correctly preserved)

**Status:** 2 MATCH / 1 CLOSE / 2 DIVERGED / 5 MISSING / 1 EXTRA

**Highest-severity finding:** F-02 — Attribute system entirely absent (core VII leader-progression RPG layer unimplemented).

---

## Open questions

1. Does `diplomacySystem.ts` use exact 5-tier Helpful/Friendly/Neutral/Unfriendly/Hostile ladder?
2. Which of the 9 current leaders are confirmed in VII roster beyond Augustus and Hatshepsut?
3. Ibn Battuta wildcard second attribute — AttributeType must accommodate it.

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-07, F-08, F-09, F-10 | 2d |
| M | F-03, F-04, F-05, F-06, F-11 | ~10d |
| L | F-02 | ~2w |
| **Total** | 11 | **~4w** |

Recommended order: F-02 (attributes) → F-05 (personas share attribute designation) → F-04 + F-06 → F-03 + F-08 (content) → F-07, F-09, F-10 (quick wins).

---

<!-- END OF AUDIT -->
