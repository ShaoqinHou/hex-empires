# Religion -- hex-empires Audit

**System slug:** `religion`
**GDD doc:** [systems/religion.md](../systems/religion.md)
**Audit date:** `2026-05-02`
**Auditor:** `codex-gpt-5.5-lead`
**Version target:** Firaxis patch 1.3.0 (per source-target.md; official drift flagged there)

---

## Engine files audited

- `packages/engine/src/systems/religionSystem.ts`
- `packages/engine/src/systems/ageSystem.ts`
- `packages/engine/src/types/GameState.ts`
- `packages/engine/src/types/Religion.ts`
- `packages/engine/src/data/religion/pantheons.ts`
- `packages/engine/src/data/religion/founder-beliefs.ts`
- `packages/engine/src/data/religion/follower-beliefs.ts`
- `packages/engine/src/data/relics.ts`
- `packages/engine/src/data/units/exploration-units.ts`
- `packages/web/src/ui/panels/ReligionPanel.tsx`
- `packages/web/src/ui/panelRegistry.ts`
- `packages/web/src/ui/layout/TopBar.tsx`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 7 |
| CLOSE | 4 |
| DIVERGED | 2 |
| MISSING | 0 |
| EXTRA | 0 |

**Total findings:** 13

---

## Detailed findings

### F-01: Pantheon Mysticism prerequisite -- MATCH

**Location:** `packages/engine/src/systems/religionSystem.ts:66-81,127-134`
**GDD reference:** `systems/religion.md` § Pantheon (Antiquity Age)
**Severity:** HIGH
**Effort:** S
**VII says:** Pantheon adoption is gated on researching Mysticism, then spending 25 Faith.
**Engine does:** `canAdoptPantheon` and `handleAdoptPantheon` both require `researchedCivics` to include `mysticism`, require a valid pantheon, and require enough Faith.
**Gap:** None for the local prerequisite.
**Recommendation:** Keep validator and handler checks in sync if Mysticism is renamed or moved between civic/tech systems.

---

### F-02: Pantheons are Antiquity-only -- MATCH

**Location:** `packages/engine/src/systems/religionSystem.ts:117-120`; `packages/engine/src/systems/ageSystem.ts:106-113,163-164,388`
**GDD reference:** `systems/religion.md` § VII-specific -- Pantheons do NOT persist to Exploration
**Severity:** HIGH
**Effort:** S
**VII says:** Pantheons apply only during Antiquity and are discarded at the age boundary.
**Engine does:** `ADOPT_PANTHEON` is rejected outside Antiquity. `TRANSITION_AGE` clears the transitioning player's `pantheonId` whenever they leave Antiquity and removes `state.religion.pantheonClaims` while preserving founded religions.
**Gap:** None for lifecycle clearing. Pantheon effects still need Altar gating (F-07).
**Recommendation:** Keep the age-transition regression tests with the implementation, especially the sequential-player case where global age may already be Exploration.

---

### F-03: Religion founding has no pantheon prerequisite -- MATCH

**Location:** `packages/engine/src/systems/religionSystem.ts:212-221`
**GDD reference:** `systems/religion.md` § Religion Founding and § VII-specific -- Pantheon and Religion are decoupled
**Severity:** HIGH
**Effort:** S
**VII says:** Religion founding requires Piety and a Temple, not a prior pantheon.
**Engine does:** `FOUND_RELIGION` has no `player.pantheonId` guard and explicitly validates Piety instead.
**Gap:** None for the pantheon decoupling rule.
**Recommendation:** Keep tests that found a religion with `pantheonId` unset.

---

### F-04: Religion founding has no Faith cost -- MATCH

**Location:** `packages/engine/src/systems/religionSystem.ts:217,252-253`; `packages/web/src/ui/panels/ReligionPanel.tsx:230-236`
**GDD reference:** `systems/religion.md` § VII-specific -- No Faith purchasing currency for founding religion
**Severity:** HIGH
**Effort:** S
**VII says:** Religion is founded through Piety and Temple construction. Faith is not deducted at founding.
**Engine does:** `FOUND_RELIGION` does not deduct Faith, and the UI empty state now points players to Piety plus Temple instead of a 200-Faith threshold.
**Gap:** The belief data still carries legacy `faithCost` metadata, but the founding handler does not charge it.
**Recommendation:** Remove or rename belief `faithCost` fields during the belief-catalog overhaul so content metadata cannot be mistaken for live founding cost.

---

### F-05: Belief slots are Founder + Follower only -- CLOSE

**Location:** `packages/engine/src/types/Religion.ts:284-296`; `packages/engine/src/systems/religionSystem.ts:238-250`
**GDD reference:** `systems/religion.md` § Belief System
**Severity:** MED
**Effort:** M
**VII says:** Religion uses Reliquary, Founder, and Enhancer belief categories, with Reliquary driving relic acquisition.
**Engine does:** `ReligionRecord` has only `founderBeliefId` and `followerBeliefId`; uniqueness is enforced for those two slots only.
**Gap:** Reliquary and Enhancer slots/catalogs are absent from the live runtime record.
**Recommendation:** Add `reliquaryBeliefId` and optional `enhancerBeliefId`, then migrate founder/follower naming if the GDD removes follower as a VII slot.

---

### F-06: Pantheon content catalog diverges from VII -- CLOSE

**Location:** `packages/engine/src/data/religion/pantheons.ts`
**GDD reference:** `content/pantheons/_overview.md`
**Severity:** MED
**Effort:** M
**VII says:** Pantheon list and effects are VII-specific and mostly Altar-scoped or tile/improvement-scoped.
**Engine does:** The catalog has several custom/combat-oriented effects and still uses available `EffectDef` shapes rather than VII-accurate production, healing, growth, and Altar-gated effects.
**Gap:** Catalog shape exists, but names/effects are not fully VII-accurate.
**Recommendation:** Replace pantheon content against `content/pantheons/_overview.md` after adding the missing effect targets required by F-07.

---

### F-07: Pantheon Altar gating absent -- DIVERGED

**Location:** `packages/engine/src/data/religion/pantheons.ts`; `packages/engine/src/systems/effectSystem.ts`
**GDD reference:** `systems/religion.md` § Pantheon -- effects require an Altar
**Severity:** MED
**Effort:** M
**VII says:** Pantheon effects activate per settlement through the Altar building.
**Engine does:** Pantheon effects are plain `EffectDef` bonuses targeting city, empire, or unit classes. No system checks whether a settlement has an Altar before applying a pantheon effect.
**Gap:** Players can receive pantheon bonuses without building Altars.
**Recommendation:** Add an Altar-scoped effect condition and make pantheon evaluation settlement-aware.

---

### F-08: Missionary spread exists but is simplified -- CLOSE

**Location:** `packages/engine/src/systems/religionSystem.ts:319-394`; `packages/engine/src/types/GameState.ts:91-99,230-248,1497-1505`
**GDD reference:** `systems/religion.md` § Missionary Mechanics
**Severity:** HIGH
**Effort:** L
**VII says:** Missionaries spend charges to convert settlement population through urban district tiles and improved rural tiles, with no passive pressure or theological combat.
**Engine does:** Missionary units have `spreadsRemaining`, `SPREAD_RELIGION` validates range/charges/founded religion, sets `CityState.religionId`, decrements charges, and consumes the unit on the last charge.
**Gap:** The live handler converts a whole city in one action. It does not model urban/rural converted counters, improved rural tile selection, conversion thresholds, or charge bonuses.
**Recommendation:** Expand `SPREAD_RELIGION` into a tile-targeted conversion action that updates urban/rural counters before flipping city majority religion.

---

### F-09: Relic pipeline exists but Reliquary rules are incomplete -- CLOSE

**Location:** `packages/engine/src/systems/religionSystem.ts:263-279,397-438`; `packages/engine/src/state/LegacyPaths.ts`; `packages/engine/src/data/relics.ts`
**GDD reference:** `systems/religion.md` § Relics and Cultural Legacy Path
**Severity:** HIGH
**Effort:** M
**VII says:** Reliquary beliefs define relic earning; relic counts feed the Exploration Cultural Legacy Path.
**Engine does:** Relic definitions exist; founding a religion grants a starting relic; `EARN_RELIC` grants unique relics; `scoreLegacyPaths` reads player relic counts for Exploration culture progress.
**Gap:** Relics are not driven by Reliquary belief rules or first-time foreign conversions. Starting relic on founding may be a local simplification rather than VII parity.
**Recommendation:** Implement Reliquary belief data and move relic awards behind the relevant spread/conversion triggers.

---

### F-10: Modern religion freeze is not enforced for spread -- DIVERGED

**Location:** `packages/engine/src/systems/religionSystem.ts:203-204,319-394`; `packages/engine/src/systems/ageSystem.ts`
**GDD reference:** `systems/religion.md` § Modern Age -- Exploration to Modern locks city religion values
**Severity:** MED
**Effort:** S
**VII says:** At the Exploration to Modern transition, city religion affiliations freeze permanently and no further conversion is possible.
**Engine does:** Founding a religion is blocked in Modern, but `SPREAD_RELIGION` has no Modern-age guard and `CityState` has no `religionLocked` field set by age transition.
**Gap:** Missionaries can still convert cities in Modern if dispatched.
**Recommendation:** Add a Modern freeze flag or age guard, plus an age-transition test that rejects post-Exploration spread.

---

### F-11: Religion panel is reachable -- MATCH

**Location:** `packages/web/src/App.tsx`; `packages/web/src/ui/panelRegistry.ts`; `packages/web/src/ui/layout/TopBar.tsx`; `packages/web/src/ui/panels/ReligionPanel.tsx`
**GDD reference:** `systems/religion.md` § UI requirements
**Severity:** LOW
**Effort:** S
**VII says:** Religion UI should be reachable through normal HUD navigation.
**Engine does:** The panel is registered, lazy-loaded in App, available from the TopBar menu, and covered by panel/e2e tests.
**Gap:** None for reachability.
**Recommendation:** Keep UI copy age-aware so it does not advertise Pantheon adoption outside Antiquity or Faith-cost founding.

---

### F-12: Belief uniqueness per game enforced -- MATCH

**Location:** `packages/engine/src/systems/religionSystem.ts:238-250`
**GDD reference:** `systems/religion.md` § Belief System
**Severity:** MED
**Effort:** S
**VII says:** Each belief can be held by only one religion in a game.
**Engine does:** Existing religions are scanned before founding; duplicate founder or follower belief choices are rejected.
**Gap:** None for current two-slot model. This must be extended when Reliquary/Enhancer slots land.
**Recommendation:** Keep uniqueness centralized in the founding/enhancement handlers.

---

### F-13: Immutable state patterns in religionSystem -- MATCH

**Location:** `packages/engine/src/systems/religionSystem.ts:152-181,257-307,365-394,423-438`
**GDD reference:** `engine-patterns.md` § Immutable state updates
**Severity:** LOW
**Effort:** S
**VII says:** N/A -- engine invariant.
**Engine does:** Religion actions allocate new maps/arrays and return new state objects instead of mutating live state.
**Gap:** None.
**Recommendation:** Preserve this style when expanding missionary, relic, and belief handlers.

---

## Active gaps after this pass

- Altar-gated pantheon effects (F-07)
- VII-accurate pantheon catalog and missing effect variants (F-06)
- Reliquary/Enhancer belief slots and relic triggers (F-05/F-09)
- Tile-targeted missionary conversion (F-08)
- Modern spread freeze (F-10)

---

## Recommended next slice

Address F-10 as a small safety fix before the larger missionary expansion: block `SPREAD_RELIGION` in Modern and add an age-transition or direct system test. Then tackle F-08/F-09 together because tile conversion, Reliquary beliefs, and relic awards share the same action surface.

---

<!-- END OF AUDIT TEMPLATE -->
