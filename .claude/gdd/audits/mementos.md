# Mementos — hex-empires Audit

**System slug:** `mementos`
**GDD doc:** [systems/mementos.md](../systems/mementos.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- Grep across `packages/engine/src/` for `memento` → 0 hits (confirming MISSING)
- `packages/engine/src/data/achievements/index.ts` — closest engine analog (intra-game milestones, not cross-session meta-progression)
- `packages/engine/src/data/leaders/types.ts` (LeaderDef has no mementoSlots field)
- `packages/engine/src/types/GameState.ts` (PlayerState has no equippedMementos field)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 0 |
| CLOSE | 0 |
| DIVERGED | 0 |
| MISSING | 6 |
| EXTRA | 0 |

**Total findings:** 6 (entire system absent — meta-progression layer is not yet modeled)

---

## Detailed findings

### F-01: `MementoDef` type and `MementoId` union absent — MISSING

**Location:** no file exists
**GDD reference:** `systems/mementos.md` § "Entities"
**Severity:** HIGH
**Effort:** S
**VII says:** Mementos are first-class content items — each has an id, name, age eligibility, effect, and unlock condition.
**Engine does:** No `MementoDef` type anywhere. `AchievementDef` in `data/achievements/index.ts` is a superficially related intra-game milestone tracker — no cross-session persistence, no equip slots, no game-start effects.
**Gap:** The fundamental content type is absent; all downstream systems depend on it.
**Recommendation:** Define `MementoDef` type in `packages/engine/src/types/Memento.ts` with `id: MementoId; name: string; age?: Age; effect: EffectDef; unlockCondition: AchievementCondition`. Add `data/mementos/` directory with content files.

---

### F-02: `LeaderDef.mementoSlots` or equivalent slot count derivation absent — MISSING

**Location:** `packages/engine/src/data/leaders/types.ts` line 3
**GDD reference:** `systems/mementos.md` § "Slot counts" (cross-cut `legends.md`)
**Severity:** HIGH
**Effort:** S
**VII says:** Memento slot count is derived from the account's Foundation Level: 0 slots at L1, 1 at L2–L4, 2 at L5+.
**Engine does:** `LeaderDef` contains `id`, `name`, `ability`, `agendas`, `compatibleAges` — no memento slot field. No `AccountState` derivation either.
**Gap:** The slot count field is missing at both the `LeaderDef` and `AccountState` levels.
**Recommendation:** GDD clarifies slot count is dynamic — belongs on `AccountState` derivation, not `LeaderDef`. Define the derivation function alongside `AccountState` (F-04).

---

### F-03: `PlayerState.equippedMementos` and `mementoSlotCount` absent — MISSING

**Location:** `packages/engine/src/types/GameState.ts` lines 147–210
**GDD reference:** `systems/mementos.md` § "Entities"
**Severity:** HIGH
**Effort:** S
**VII says:** At game start, the active loadout of equipped Mementos is copied from `AccountState` into the game's player state and applies per-game effects.
**Engine does:** `PlayerState` has 30+ fields but no `equippedMementos` array. The `legacyBonuses: ReadonlyArray<ActiveEffect>` field is a partial structural overlap (carries intra-game bonuses) but is populated mid-game by the age system, not at game start from a loadout.
**Gap:** No way to surface equipped mementos in the running game.
**Recommendation:** Add optional `equippedMementos?: ReadonlyArray<MementoId>` to `PlayerState` following the same pattern as `pantheonId`/`governmentId`.

---

### F-04: Cross-session `AccountState` persistence layer absent — MISSING

**Location:** no file
**GDD reference:** `systems/mementos.md` § "Persistence"
**Severity:** HIGH
**Effort:** L
**VII says:** Mementos are the meta-progression reward loop: challenges → XP → level → unlock → equip for next game. Requires cross-session persistence.
**Engine does:** `GameState` is fully in-memory and session-scoped. `state.unlockedAchievements` resets when `createInitialState()` is called. No `AccountState` type, no persistence adapter, no cross-session store.
**Gap:** The entire meta-progression reward loop has nowhere to live.
**Recommendation:** Define `AccountState` as a value type the host application persists (localStorage in web). Provide `applyMementosToGameState(account, setup): GameState` as an initializer override. This is the largest single piece of memento infrastructure.

---

### F-05: `mementoSystem.ts` startup effect application absent — MISSING

**Location:** no file
**GDD reference:** `systems/mementos.md` § "Triggers" (game-start effect apply)
**Severity:** MED
**Effort:** M
**VII says:** When a player starts a game with equipped mementos, those mementos' effects apply to the starting game state (e.g. +20 starting gold, +1 starting unit).
**Engine does:** `createInitialState()` hardcodes `gold: 100`, fixed starting units — no player-specific loadout phase. Even with `equippedMementos` added, there is no system to apply their effects. The `EffectDef` union covers `MODIFY_YIELD`, `MODIFY_COMBAT`, `GRANT_UNIT` etc. (mid-game dispatch) but no startup pass exists.
**Gap:** No hook to translate the equipped loadout into concrete state modifications at game start.
**Recommendation:** Add `applyEquippedMementos(state: GameState): GameState` pure function called once from `createInitialState`. Iterates `player.equippedMementos` and dispatches each memento's `effect` via `effectSystem` at state-init time.

---

### F-06: Challenge evaluation and XP award (`legendsSystem`) absent — MISSING

**Location:** no file
**GDD reference:** `systems/mementos.md` § "Unlock conditions" (cross-cut `legends.md`)
**Severity:** MED
**Effort:** M
**VII says:** 265 Foundation Challenges + 57 Leader Challenges per leader. Completing a challenge awards XP. XP thresholds unlock Foundation Levels. Leveling unlocks new Mementos.
**Engine does:** `achievementSystem.ts` checks `AchievementCondition` predicates on `END_TURN` — structurally analogous but differs critically: no XP accumulation, no level tracking, no reward unlock dispatch, and in-session only (resets on new game).
**Gap:** The 265 Foundation + 57-per-leader Leader Challenges specified in `legends.md` have no engine representation.
**Recommendation:** Extend `achievementSystem.ts` into a `legendsSystem.ts` adding XP, level thresholds, and `AccountState` mutation. Cross-cut with `legends` audit findings.

---

## Extras to retire

None. The partial `achievementSystem` is repurposable (F-06).

---

## Missing items

1. `MementoDef` type + `data/mementos/` content (F-01).
2. `LeaderDef.mementoSlots` derivation (F-02).
3. `PlayerState.equippedMementos` + `mementoSlotCount` (F-03).
4. `AccountState` cross-session persistence layer (F-04) — largest item.
5. `applyEquippedMementos` startup hook (F-05).
6. `legendsSystem.ts` (challenge + XP + level + unlock) (F-06).

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/mementos.md` § "Mapping to hex-empires":

**Engine files:**
- Currently: no dedicated mementos files.
- Related: `packages/engine/src/systems/achievementSystem.ts` (closest analog, needs repurposing).

**Status:** 0 MATCH / 0 CLOSE / 0 DIVERGED / 6 MISSING / 0 EXTRA — **entire meta-progression layer absent**.

**Highest-severity finding:** F-04 — `AccountState` persistence layer absent (blocks the whole meta-progression loop).

---

## Open questions

1. Is meta-progression a Phase 1 or Phase 2 feature? A full meta-progression layer is LARGE scope; may be deferred to post-single-game-loop.
2. Where does `AccountState` live for the web app — localStorage, IndexedDB, or server-side?
3. Should the engine package declare `AccountState` as a type, leaving persistence to the host app, or bring persistence into the engine?

---

## Effort estimate

| Bucket | Findings | Total effort |
|---|---|---|
| S (half-day) | F-01, F-02, F-03 | 1.5d |
| M (1-3 days) | F-05, F-06 | 4-6d |
| L (week+) | F-04 | 1w+ |
| **Total** | 6 | **~2 weeks** |

Recommended order: F-04 (AccountState scaffold — prereq) → F-01 (MementoDef type) → F-03 (PlayerState fields) → F-02 (slot derivation) → F-05 (startup apply) → F-06 (legendsSystem extension).

---

<!-- END OF AUDIT -->
