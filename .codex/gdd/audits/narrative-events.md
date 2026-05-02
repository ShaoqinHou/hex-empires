# Narrative Events - hex-empires Audit

**System slug:** `narrative-events`
**GDD doc:** [systems/narrative-events.md](../systems/narrative-events.md)
**Audit date:** `2026-05-02`
**Auditor:** `codex`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/types/NarrativeEvent.ts`
- `packages/engine/src/types/GameState.ts`
- `packages/engine/src/data/narrative-events/index.ts`
- `packages/engine/src/data/discoveries/index.ts`
- `packages/engine/src/state/GameConfigFactory.ts`
- `packages/engine/src/state/narrativeEventUtils.ts`
- `packages/engine/src/systems/narrativeEventSystem.ts`
- `packages/engine/src/systems/discoverySystem.ts`
- `packages/engine/src/systems/movementSystem.ts`
- `packages/engine/src/systems/researchSystem.ts`
- `packages/engine/src/GameEngine.ts`
- `packages/web/src/App.tsx`
- `packages/web/src/ui/panels/NarrativeEventPanel.tsx`
- `packages/web/src/ui/panels/panelRegistry.ts`

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 3 |
| CLOSE | 4 |
| DIVERGED | 0 |
| MISSING | 0 |
| EXTRA | 0 |

**Total findings:** 7

---

## Detailed findings

### F-01: `NarrativeEventDef` type and content database exist at starter scale -- CLOSE

**Location:** `packages/engine/src/types/NarrativeEvent.ts:9`; `packages/engine/src/data/narrative-events/index.ts:46`
**GDD reference:** `systems/narrative-events.md` section "Content flowing through this system"
**Severity:** HIGH
**Effort:** L
**VII says:** 1,000+ authored events at launch. Each event has requirements, vignette prose, 2-3 choices, effects, and optional tag output.
**Engine does:** `NarrativeEventDef`, `NarrativeChoice`, `NarrativeRequirements`, and a narrative-event registry exist. The registry currently contains 20 authored events.
**Gap:** Content scale is a small starter set, not Civ VII launch scale. Several effect and trigger variants are represented in types but not fully implemented.
**Recommendation:** Keep the type stable while adding authored batches only after trigger/effect behavior is proven.

---

### F-02: `PlayerState.narrativeTags` exists and persists -- MATCH

**Location:** `packages/engine/src/types/GameState.ts:385`
**GDD reference:** `systems/narrative-events.md` section "The tag system"
**Severity:** HIGH
**Effort:** S
**VII says:** Persistent tags record narrative choices and can be read by later cross-age events.
**Engine does:** `PlayerState.narrativeTags` exists and is not reset by age transition.
**Gap:** None for the local storage primitive.
**Recommendation:** Keep narrative tags separate from visible logs and legacy bonuses.

---

### F-03: `GameState.firedNarrativeEvents` deduplication store exists -- MATCH

**Location:** `packages/engine/src/types/GameState.ts:1116`; `packages/engine/src/state/GameInitializer.ts:198`
**GDD reference:** `systems/narrative-events.md` section "Event pool management"
**Severity:** HIGH
**Effort:** S
**VII says:** Fired event ids are tracked so eligible events do not repeat every turn.
**Engine does:** `GameState.firedNarrativeEvents` exists, is initialized, and is checked by `narrativeEventSystem`.
**Gap:** None for the local dedup store.
**Recommendation:** Keep it internal and separate from the player-visible event log.

---

### F-04: `narrativeEventSystem` exists, but trigger and effect depth is partial -- CLOSE

**Location:** `packages/engine/src/systems/narrativeEventSystem.ts:23`; `packages/engine/src/systems/researchSystem.ts`; `packages/engine/src/state/narrativeEventUtils.ts`; `packages/engine/src/GameEngine.ts:117`
**GDD reference:** `systems/narrative-events.md` sections "Triggers" and "Mechanics"
**Severity:** HIGH
**Effort:** M
**VII says:** Narrative events evaluate on turn end and specific moments such as tech completion, battle wins, Golden Ages, religion choices, weather, war, and age transitions.
**Engine does:** `narrativeEventSystem` is wired after `researchSystem`. It handles `END_TURN` candidate evaluation, queues one event, resolves choices, applies supported effects, writes tag output, and records fired ids. `researchSystem` now calls the shared narrative enqueue helper when normal or Future Tech research completes, so the first eligible `TECH_RESEARCHED` event uses the same pending/fired pipeline. `religionSystem` also queues the first eligible `RELIGION_CHOSEN` event after successful pantheon adoption or religion founding.
**Gap:** Battle, weather, war, and age-transition trigger moments are not yet hooked. Non-yield effect kinds are still limited or no-op, and `NarrativeRequirements` does not yet expose a tech-id-specific filter.
**Recommendation:** Continue adding one-shot trigger hooks from the owning systems; next candidates are battle/war and age-transition triggers. Add specific requirement fields only when content needs them.

---

### F-05: `RESOLVE_NARRATIVE_EVENT` action and pending queue exist -- MATCH

**Location:** `packages/engine/src/types/GameState.ts:1117,1393`; `packages/engine/src/systems/narrativeEventSystem.ts:23`
**GDD reference:** `systems/narrative-events.md` section "Event presentation"
**Severity:** HIGH
**Effort:** S
**VII says:** A player resolves a pending event by choosing one option from the event prompt.
**Engine does:** `pendingNarrativeEvents` and `RESOLVE_NARRATIVE_EVENT` exist. Resolution removes the pending id, applies choice effects where supported, writes tags, and dedups the event.
**Gap:** None for the local queue/action surface.
**Recommendation:** Keep UI and discovery flows routed through this same pending-event path where possible.

---

### F-06: Discovery tile mechanic exists, but reward/consumption paths are split -- CLOSE

**Location:** `packages/engine/src/types/GameState.ts:40,1579`; `packages/engine/src/data/discoveries/index.ts:3`; `packages/engine/src/state/narrativeEventUtils.ts:18`; `packages/engine/src/systems/movementSystem.ts:319`; `packages/engine/src/systems/discoverySystem.ts:19`
**GDD reference:** `systems/narrative-events.md` section "Discoveries subsystem"
**Severity:** MED
**Effort:** M
**VII says:** Discoveries replace goody huts. Entering a discovery tile fires a narrative popup with choices, then consumes the tile.
**Engine does:** `HexTile.discoveryId`, discovery data, movement-triggered narrative enqueue, and direct `EXPLORE_DISCOVERY` rewards exist. Tests cover both narrative discovery enqueue and direct reward clearing.
**Gap:** Movement-triggered discovery events do not yet clear the tile through the same path as direct rewards, and reward-bearing discovery behavior remains split between narrative choices and `discoverySystem`.
**Recommendation:** Consolidate discovery consumption and reward handling around pending narrative event resolution.

---

### F-07: Narrative event UI exists, with presentation polish still partial -- CLOSE

**Location:** `packages/web/src/ui/panels/NarrativeEventPanel.tsx:30`; `packages/web/src/ui/panels/panelRegistry.ts:91`; `packages/web/src/App.tsx:105,275`
**GDD reference:** `systems/narrative-events.md` section "UI requirements"
**Severity:** MED
**Effort:** M
**VII says:** The UI presents vignette prose, 2-3 choice buttons with reward labels, confirmation, discovery markers, and systemic event banners.
**Engine does:** `NarrativeEventPanel` renders the first pending event, shows choices, dispatches `RESOLVE_NARRATIVE_EVENT`, is registered as a modal, and auto-opens when the queue is non-empty.
**Gap:** Choice buttons do not yet present full effect/reward previews, and discovery map marker/systemic banner polish remains incomplete.
**Recommendation:** Add effect-preview copy and marker/banner polish after trigger/effect semantics are stable.

---

## Close follow-ups

- F-01: grow the authored event registry after trigger/effect behavior stabilizes.
- F-04: hook battle, weather, war, and age-transition triggers one at a time; add tech-id-specific filtering only when authored content needs it.
- F-06: unify movement discovery consumption with event resolution.
- F-07: add choice effect previews, discovery map markers, and systemic banners.

---

## Missing items

None as total absences. Remaining work is partial-implementation depth.

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/narrative-events.md` section "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/types/NarrativeEvent.ts`
- `packages/engine/src/types/GameState.ts`
- `packages/engine/src/data/narrative-events/index.ts`
- `packages/engine/src/data/discoveries/index.ts`
- `packages/engine/src/state/narrativeEventUtils.ts`
- `packages/engine/src/systems/narrativeEventSystem.ts`
- `packages/engine/src/systems/discoverySystem.ts`
- `packages/engine/src/systems/movementSystem.ts`
- `packages/web/src/ui/panels/NarrativeEventPanel.tsx`

**Status:** 3 MATCH / 4 CLOSE / 0 DIVERGED / 0 MISSING / 0 EXTRA

**Highest-severity finding:** F-04 - `narrativeEventSystem` exists, but trigger and effect depth is partial.

---

## Open questions

1. Which content batch should justify adding a `techId` requirement field for `TECH_RESEARCHED` events?
2. Should movement-triggered discoveries clear their tile before or after event resolution?
3. Which effect kinds should narrative choices support before large content authoring starts?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-04 next trigger hook | ~1d |
| M | F-06, F-07 | ~4d |
| L | F-01 content scale | 2w+ |
| **Total** | 4 close follow-ups | **~3w** |

Recommended order: F-06 discovery resolution unification -> F-04 next trigger hook -> F-07 effect previews -> F-01 content growth.

---

<!-- END OF AUDIT -->
