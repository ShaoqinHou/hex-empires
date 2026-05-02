# Trade Routes — hex-empires Audit

**System slug:** `trade-routes`
**GDD doc:** [systems/trade-routes.md](../systems/trade-routes.md)
**Audit date:** `2026-04-19`
**Auditor:** `claude-sonnet-4.6`
**Version target:** Firaxis patch 1.3.0

---

## Engine files audited

- `packages/engine/src/systems/tradeSystem.ts` (1-154)
- `packages/web/src/ui/panels/TradeRoutesPanel.tsx` (1-153)

---

## Summary tally

| Status | Count |
|---|---|
| MATCH | 3 |
| CLOSE | 3 |
| DIVERGED | 1 |
| MISSING | 2 |
| EXTRA | 1 |

**Total findings:** 10

---

## Detailed findings

### F-01: Trade route yield is asymmetric resources/gold — MATCH

**Location:** `tradeSystem.ts` `handleEndTurn`
**GDD reference:** `systems/trade-routes.md` § "Yields"
**Severity:** HIGH
**Effort:** M
**VII says:** Asymmetric. Origin gets a **copy of destination's slotted resources**. Destination gets **gold per turn** at 2/3/4 Gold per resource slot per age. Sea routes: 2× gold to destination.
**Engine does:** `handleEndTurn` copies the destination route resources to the origin player's `ownedResources` and pays only the destination owner `assignedResources.length * ageRate * seaMultiplier` gold, with Improve Trade Relations currently modeled as a gold multiplier.
**Gap:** None for baseline yield direction.
**Recommendation:** Keep UI/engine terminology explicit: resources to origin, gold to destination.

---

### F-02: Route lifecycle is permanent with key cancellation hooks — CLOSE

**Location:** `tradeSystem.ts` `handleDeclareWar`, `handleTransitionAge`, `handlePlunderTradeRoute`
**GDD reference:** `systems/trade-routes.md` § "Route Termination"
**Severity:** HIGH
**Effort:** M
**VII says:** Routes permanent until 5 triggers: war declaration, caravan destroyed, age transition, relationship→Hostile, destination captured. No turn-count expiry.
**Engine does:** Routes no longer have turn-count expiry. War declarations, age transition, and plunder remove the route and caravan unit.
**Gap:** Relationship deterioration to Hostile and destination capture cancellation are still not implemented.
**Recommendation:** Add route invalidation when destination ownership/relationship status changes.

---

### F-03: Merchant converts to Caravan/Trade Ship — MATCH

**Location:** `tradeSystem.ts:77-78`
**GDD reference:** `systems/trade-routes.md` § "Establishing a Trade Route"
**Severity:** MED
**Effort:** M
**VII says:** Merchant converts to stationary Caravan/Trade Ship on arrival, remains on map as physical representation (plunder-targetable).
**Engine does:** Route creation deletes the merchant and creates a stationary `caravan` or `trade_ship` unit at the destination, linked by `caravanUnitId`.
**Gap:** None for physical route representation. Unit art/action polish remains UI work.
**Recommendation:** Keep plunder tests tied to the route's caravan unit.

---

### F-04: Age-scaled range check exists, terrain blockers pending — CLOSE

**Location:** `tradeSystem.ts:37-53`
**GDD reference:** `systems/trade-routes.md` § "Distance Rules and Range"
**Severity:** HIGH
**Effort:** S
**VII says:** Land 10/15/20 tiles per Antiquity/Exploration/Modern. Sea 30/45/60. Mountains block; ocean requires Cartography.
**Engine does:** Route creation checks origin-to-destination distance against land/sea age range constants (`10/15/20` and `30/45/60`).
**Gap:** Mountain/river/open-ocean prerequisites and true path validation are not implemented.
**Recommendation:** Add path-aware validation once road/sea-route pathing exists.

---

### F-05: Diplomatic relationship gate exists for civ routes — CLOSE

**Location:** `tradeSystem.ts:32-93`
**GDD reference:** `systems/trade-routes.md` § "Diplomatic Requirements"
**Severity:** HIGH
**Effort:** S
**VII says:** Minimum Unfriendly or better. Hostile cannot trade. Independent Powers need Suzerain.
**Engine does:** Route creation blocks `hostile` and `war` relationships.
**Gap:** Independent Power suzerain gating and active-route cancellation when relations later degrade are still missing.
**Recommendation:** Add IP suzerain validation and relationship-change invalidation.

---

### F-06: Route capacity cap is per origin city, not per civ pair — DIVERGED

**Location:** `tradeSystem.ts:59-64`
**GDD reference:** `systems/trade-routes.md` § "Route Capacity"
**Severity:** MED
**Effort:** S
**VII says:** 1 active route per civ pair (default); raised per-pair by Improve Trade Relations treaty.
**Engine does:** Caps outbound routes per origin city at 2 and retains a same-city-pair duplicate guard. Improve Trade Relations currently increases destination gold yield rather than per-pair capacity.
**Gap:** VII capacity is per civ pair and modified by Improve Trade Relations; current capacity semantics still diverge.
**Recommendation:** Replace origin-city cap with `(owner, destinationCivId)` capacity and move Improve Trade Relations to capacity.

---

### F-07: Panel labels destination gold and copied resources — MATCH

**Location:** `TradeRoutesPanel.tsx:56-58, 119-124`
**GDD reference:** `systems/trade-routes.md` § "Yields"
**Severity:** MED
**Effort:** S
**VII says:** Origin gets resources; destination gets gold.
**Engine does:** `TradeRoutesPanel` labels gold as paid to the destination civ and shows copied resources from the route snapshot.
**Gap:** None for the F-01 UI correction.
**Recommendation:** Keep panel tests asserting destination-gold wording and resource display.

---

### F-08: Modern-age travel-free route establishment absent — MISSING

**Location:** `tradeSystem.ts:37-53`
**GDD reference:** `systems/trade-routes.md` § "Modern Age"
**Severity:** LOW
**Effort:** S
**VII says:** Modern Age removes physical travel — select destination from list, route activates immediately.
**Engine does:** `dist > 1` check applies all ages.
**Gap:** Modern QoL absent.
**Recommendation:** Branch `if (state.currentAge === 'modern') { skip adjacency check }`.

---

### F-09: Merchant road-building side effect absent — MISSING

**Location:** `tradeSystem.ts` (no road logic)
**GDD reference:** `systems/trade-routes.md` § "Merchant Unit — Road-building"
**Severity:** LOW
**Effort:** M
**VII says:** Antiquity/Exploration: Merchant builds roads along its path. Modern: railroads.
**Engine does:** No path tracking; no road placement.
**Gap:** ROAD in improvements/index.ts (tile-improvements F-11 EXTRA) has no organic creation path.
**Recommendation:** Track `pathTravelled: HexCoord[]`. On route creation, place road improvements on untravelled tiles.

---

### F-10: City-pair dedup guard is extra logic partially substituting civ-pair cap — EXTRA

**Location:** `tradeSystem.ts:59-64`
**GDD reference:** `systems/trade-routes.md` § "Route Capacity"
**Severity:** LOW
**Effort:** S
**VII says:** Cap is per civ pair, not city pair.
**Engine does:** Dedup at `(owner, from-city, to-city)` — more granular than VII.
**Gap:** Engine's guard is a workaround.
**Recommendation:** Remove; replace with F-06's civ-pair cap.

---

## Extras to retire

- Origin-city cap and city-pair dedup guard — replace with per-civ-pair capacity (F-06/F-10).

---

## Missing items

1. Per-civ-pair route capacity cap and Improve Trade Relations capacity increase (F-06).
2. Modern-age travel-free route activation (F-08).
3. Merchant road-building / railroad side effect (F-09).
4. Relationship-deterioration and destination-capture cancellation hooks (F-02/F-05).
5. Terrain/path-aware range validation (F-04).

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/trade-routes.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/tradeSystem.ts`
- `packages/web/src/ui/panels/TradeRoutesPanel.tsx`

**Status:** 3 MATCH / 3 CLOSE / 1 DIVERGED / 2 MISSING / 1 EXTRA

**Highest-severity finding:** F-06 — capacity still uses origin-city semantics instead of per-civ-pair Improve Trade Relations capacity.

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-06, F-08, F-10 | 1.5d |
| M | F-02, F-04, F-05, F-09 | ~6d |
| **Total** | 10 | **~2.5w** |

Recommended order: F-06/F-10 capacity cleanup → F-08 Modern activation → F-02/F-05 invalidation hooks → F-04 path-aware range → F-09 road/rail side effect.

---

<!-- END OF AUDIT -->
