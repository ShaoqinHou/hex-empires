# Narrative Events — hex-empires Audit

**System slug:** `narrative-events`
**GDD doc:** [systems/narrative-events.md](../systems/narrative-events.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- Grep across `packages/engine/src/` for `narrative`, `NarrativeEvent`, `narrativeTags`, `eventHistory`, `Discovery` — **0 hits** (all absent)
- `packages/engine/src/types/GameState.ts` — PlayerState (no narrativeTags, no eventHistory); GameState (no narrativeEvents queue); GameAction (no RESOLVE_NARRATIVE_EVENT, no EXPLORE_DISCOVERY)
- `packages/engine/src/systems/` — 30 system files; no narrativeEventSystem.ts, no discoverySystem.ts
- `packages/engine/src/data/` — 17 content directories; no narrative-events/ or discoveries/
- `packages/web/src/ui/panels/EventLogPanel.tsx` — mechanical audit log; not narrative event UI

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 0 |
| CLOSE | 0 |
| DIVERGED | 0 |
| MISSING | 7 |
| EXTRA | 0 |

**Total findings:** 7 — entire system absent

---

## Detailed findings

### F-01: `NarrativeEventDef` type and content database absent — MISSING

**Location:** no file
**GDD reference:** `systems/narrative-events.md` § "Content flowing through this system"
**Severity:** HIGH
**Effort:** L
**VII says:** 1,000+ authored events at launch. Each: requirements set (leader/civ/tag/age/state), vignette prose, 2-3 labeled choices with `EffectDef[]`, optional tag output.
**Engine does:** No `NarrativeEventDef` type. No `data/narrative-events/` directory. `data/crises/` is closest structural analog but crisis-only.
**Gap:** Fundamental content type absent.
**Recommendation:** Define `NarrativeEventDef` in `types/NarrativeEvent.ts`: `id, title, vignette, choices (label + effects + tagOutput), requirements, ageGate, category`.

---

### F-02: `PlayerState.narrativeTags` absent — MISSING

**Location:** `types/GameState.ts:147-210`
**GDD reference:** `systems/narrative-events.md` § "The tag system"
**Severity:** HIGH
**Effort:** S
**VII says:** Persistent set of string tags written when event choices made, read as requirements by future events. Tags survive age transitions (do NOT reset). Primary cross-age narrative mechanism.
**Engine does:** `PlayerState` (30+ fields) has no `narrativeTags`. `legacyBonuses` is closest cousin but different semantics.
**Gap:** Cross-age narrative callbacks architecturally impossible.
**Recommendation:** Add `readonly narrativeTags?: ReadonlyArray<string>` to `PlayerState`. Age-transition invariants: tags are NO-RESET on TRANSITION_AGE.

---

### F-03: `GameState.firedNarrativeEvents` deduplication store absent — MISSING

**Location:** `types/GameState.ts:355-393`
**GDD reference:** `systems/narrative-events.md` § "Event pool management"
**Severity:** HIGH
**Effort:** S
**VII says:** Per-campaign record of fired event IDs prevents re-triggering. Without it, 40-turn-eligible event fires every turn.
**Engine does:** `GameState.log` is player-visible mechanical audit log. No dedup store.
**Gap:** No per-campaign dedup.
**Recommendation:** Add `readonly firedNarrativeEvents?: ReadonlyArray<string>` to `GameState`. Keep separate from `log` (log is player-visible; dedup is internal).

---

### F-04: `narrativeEventSystem.ts` absent — MISSING

**Location:** no file in `systems/`
**GDD reference:** `systems/narrative-events.md` § "Triggers", "Mechanics"
**Severity:** HIGH
**Effort:** M
**VII says:** On END_TURN + specific trigger moments (battle, tech completion, Golden Age, religion belief, weather, war, age transition), evaluates pool, selects candidates, fires one per turn, enqueues in `pendingNarrativeEvents`. On RESOLVE: applies effect via `effectSystem`, writes `narrativeTags`, records in `firedNarrativeEvents`.
**Engine does:** `crisisSystem.ts` closest analog (player picks from options, effects applied) but crisis-only.
**Gap:** No evaluation loop, selection, dispatch, or tag writing.
**Recommendation:** Add `narrativeEventSystem.ts`. Handle END_TURN (eligibility → enqueue) + RESOLVE_NARRATIVE_EVENT (effect + tag write + dedup record). Wire into `GameEngine` pipeline after `crisisSystem`.

---

### F-05: `RESOLVE_NARRATIVE_EVENT` action + `pendingNarrativeEvents` queue absent — MISSING

**Location:** `types/GameState.ts:404-455` (GameAction union)
**GDD reference:** `systems/narrative-events.md` § "Event presentation"
**Severity:** HIGH
**Effort:** S
**VII says:** Player resolves event by picking one of 2-3 options. Needs pending-event queue + RESOLVE action.
**Engine does:** `GameAction` union (45 variants) — no `RESOLVE_NARRATIVE_EVENT`. No `pendingNarrativeEvents` on `GameState`. `RESOLVE_CRISIS` is closest analog.
**Gap:** Resolution path absent.
**Recommendation:** Add `| { type: 'RESOLVE_NARRATIVE_EVENT'; eventId; choiceIndex }` to `GameAction`. Add `pendingNarrativeEvents?: ReadonlyArray<string>` to `GameState`.

---

### F-06: Discovery tile mechanic absent — MISSING

**Location:** no file; `HexTile` has no `discoveryId`
**GDD reference:** `systems/narrative-events.md` § "Discoveries subsystem"
**Severity:** MED
**Effort:** M
**VII says:** Discoveries replace Goody Huts. Appear as map objects on unexplored tiles. Unit moving onto one fires narrative popup with 2+ choices. Tile consumed on visit. Converts luck → player agency.
**Engine does:** `HexTile` 9 fields — no `discoveryId`. `GameAction` no `EXPLORE_DISCOVERY`. `movementSystem.ts` doesn't check.
**Gap:** No discovery flag, movement hook, trigger, or reward.
**Recommendation:** Add `discoveryId?: string` to `HexTile`. Define `DiscoveryDef`. Add `EXPLORE_DISCOVERY` action. Hook into `movementSystem`.

---

### F-07: Narrative-event UI (vignette popup + choices) absent — MISSING

**Location:** no `NarrativeEventPanel.tsx`
**GDD reference:** `systems/narrative-events.md` § "UI requirements"
**Severity:** MED
**Effort:** M
**VII says:** (1) event popup (vignette + 2-3 choice buttons with reward labels); (2) confirmation; (3) Discovery map marker; (4) systemic-event banner.
**Engine does:** `EventLogPanel` is mechanical log. `CrisisPanel` closest UI analog. No vignette popup, choice cards, or Discovery marker. `PanelId` union no `'narrativeEvent'`.
**Gap:** Zero UI surface.
**Recommendation:** Implement `NarrativeEventPanel` with `PanelShell priority: 'modal'`. Register in `panelRegistry.ts`. Invoke `/add-panel`.

---

## Extras to retire

None.

---

## Missing items

1. `NarrativeEventDef` + `data/narrative-events/` content database (F-01) — largest content item.
2. `PlayerState.narrativeTags` (F-02).
3. `GameState.firedNarrativeEvents` dedup (F-03).
4. `RESOLVE_NARRATIVE_EVENT` + `pendingNarrativeEvents` queue (F-05).
5. `narrativeEventSystem.ts` (F-04).
6. Discoveries (F-06).
7. `NarrativeEventPanel.tsx` (F-07).

---

## Mapping recommendation for GDD system doc

Paste into `.claude/gdd/systems/narrative-events.md` § "Mapping to hex-empires":

**Engine files:**
- Currently: no dedicated narrative-event files.
- Closest analog: `crisisSystem.ts` / `CrisisPanel.tsx` (same structural pattern).
- To add: `types/NarrativeEvent.ts`, `data/narrative-events/`, `systems/narrativeEventSystem.ts`, `web/src/ui/panels/NarrativeEventPanel.tsx`.

**Status:** 0 MATCH / 0 CLOSE / 0 DIVERGED / 7 MISSING / 0 EXTRA — **entire system absent**.

**Highest-severity finding:** F-02 — `PlayerState.narrativeTags` (cross-age callback primitive); F-01 — NarrativeEventDef + content database (blocks everything).

---

## Open questions

1. Is narrative-events Phase 1 or deferred? Large content effort (1,000+ events).
2. Discovery reward types — scale to existing `EffectDef` union, or new discovery-only effects?
3. Weather / war-damage triggers — do these engines exist yet?

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-02, F-03, F-05 | 1.5d |
| M | F-04, F-06, F-07 | 6-9d |
| L | F-01 (content authoring) | 2w+ |
| **Total** | 7 | **~3 weeks** |

Recommended order: F-02 + F-03 + F-05 (state fields, same PR) → F-04 (`narrativeEventSystem.ts`) → F-07 (UI) → F-06 (Discoveries) → F-01 (ongoing content authoring).

---

<!-- END OF AUDIT -->
