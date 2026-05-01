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
| MATCH | 0 |
| CLOSE | 2 |
| DIVERGED | 3 |
| MISSING | 4 |
| EXTRA | 1 |

**Total findings:** 10

---

## Detailed findings

### F-01: Trade route yield is symmetric gold to both parties — DIVERGED

**Location:** `tradeSystem.ts:102-112`
**GDD reference:** `systems/trade-routes.md` § "Yields"
**Severity:** HIGH
**Effort:** M
**VII says:** Asymmetric. Origin gets a **copy of destination's slotted resources**. Destination gets **gold per turn** at 2/3/4 Gold per resource slot per age. Sea routes: 2× gold to destination.
**Engine does:** `handleEndTurn` pays flat `TRADE_GOLD_PER_TURN = 3` to BOTH origin and destination symmetrically. No resource-copy, no slot count, no age scaling, no sea/land distinction.
**Gap:** Three compounding divergences.
**Recommendation:** Add `resources: ResourceId[]` to `TradeRoute` (snapshot of destination slots). In handleEndTurn, copy to origin pool; pay destination `city.resourceSlots * goldRateForAge(age) * (route.isSea ? 2 : 1)`. Add `isSea: boolean` to `TradeRoute`.

---

### F-02: Fixed 20-turn duration replaces permanent route model — DIVERGED

**Location:** `tradeSystem.ts:8-9, 114-117`
**GDD reference:** `systems/trade-routes.md` § "Route Termination"
**Severity:** HIGH
**Effort:** M
**VII says:** Routes permanent until 5 triggers: war declaration, caravan destroyed, age transition, relationship→Hostile, destination captured. No turn-count expiry.
**Engine does:** `TRADE_ROUTE_DURATION = 20` is sole lifecycle. No war cancellation, no age-transition handler, no plunder path.
**Gap:** Wrong lifecycle model; routes die wrong AND survive wrong.
**Recommendation:** Remove `turnsRemaining`. Add DECLARE_WAR handler. Add TRANSITION_AGE handler. Add PLUNDER_TRADE_ROUTE action.

---

### F-03: Merchant consumed on arrival, not converted to Caravan/Trade Ship — DIVERGED

**Location:** `tradeSystem.ts:77-78`
**GDD reference:** `systems/trade-routes.md` § "Establishing a Trade Route"
**Severity:** MED
**Effort:** M
**VII says:** Merchant converts to stationary Caravan/Trade Ship on arrival, remains on map as physical representation (plunder-targetable).
**Engine does:** `updatedUnits.delete(merchantId)` — merchant removed. Route exists only as data record.
**Gap:** PLUNDER has nothing to target; route has no spatial identity.
**Recommendation:** Replace with `caravan` or `trade_ship` unit at arrival. Add stationary unit types with `tradeRouteId` link.

---

### F-04: No distance/range check — MISSING

**Location:** `tradeSystem.ts:37-53`
**GDD reference:** `systems/trade-routes.md` § "Distance Rules and Range"
**Severity:** HIGH
**Effort:** S
**VII says:** Land 10/15/20 tiles per Antiquity/Exploration/Modern. Sea 30/45/60. Mountains block; ocean requires Cartography.
**Engine does:** Only `dist > 1` check between merchant and target. No city-to-city range check.
**Gap:** Age-gated range absent.
**Recommendation:** Compute `distance(homeCity.position, targetCity.position)` and check against `LAND_RANGE = {antiquity:10, exploration:15, modern:20}` table.

---

### F-05: No diplomatic relationship gate — MISSING

**Location:** `tradeSystem.ts:32-93`
**GDD reference:** `systems/trade-routes.md` § "Diplomatic Requirements"
**Severity:** HIGH
**Effort:** S
**VII says:** Minimum Unfriendly or better. Hostile cannot trade. Independent Powers need Suzerain.
**Engine does:** No relationship check. Any foreign city is valid target, including at-war.
**Gap:** Trade-diplomacy coupling absent.
**Recommendation:** Check `getDiplomaticRelationship` before route creation.

---

### F-06: No per-civ-pair route capacity cap — MISSING

**Location:** `tradeSystem.ts:59-64`
**GDD reference:** `systems/trade-routes.md` § "Route Capacity"
**Severity:** MED
**Effort:** S
**VII says:** 1 active route per civ pair (default); raised per-pair by Improve Trade Relations treaty.
**Engine does:** Dedup on `(owner, from-city, to-city)` triple. Effective cap = `origCities × destCities`.
**Gap:** Wrong cap semantics.
**Recommendation:** Count routes per `(owner, destinationCivId)` pair. Add `tradeRouteCapacity` Map.

---

### F-07: Panel displays gold/turn for origin player — CLOSE

**Location:** `TradeRoutesPanel.tsx:56-58, 119-124`
**GDD reference:** `systems/trade-routes.md` § "Yields"
**Severity:** MED
**Effort:** S
**VII says:** Origin gets resources; destination gets gold.
**Engine does:** Panel shows `goldPerTurn` with 💰 icon for owner — implies owner earns gold. Footer counts gold as player income.
**Gap:** UI correctly models engine's (wrong) yield direction.
**Recommendation:** After F-01: display `route.resourcesCopied` icons + secondary "→ X gold/turn (to destination)".

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

- `TRADE_ROUTE_DURATION = 20` + `turnsRemaining` — no turn-expiry in VII (F-02).
- Symmetric gold payment to owner in handleEndTurn — origin earns resources (F-01).
- City-pair dedup guard — replace with civ-pair cap (F-10).

---

## Missing items

1. Asymmetric yield model (F-01) — core loop change.
2. Permanent route lifecycle + cancellation triggers (F-02).
3. Physical Caravan/Trade Ship on establishment (F-03).
4. Age-scaled distance/range check (F-04).
5. Diplomatic relationship gate (F-05).
6. Per-civ-pair route capacity cap (F-06).
7. Modern-age travel-free route (F-08).
8. Merchant road-building (F-09).

---

## Mapping recommendation for GDD system doc

Paste into `.codex/gdd/systems/trade-routes.md` § "Mapping to hex-empires":

**Engine files:**
- `packages/engine/src/systems/tradeSystem.ts`
- `packages/web/src/ui/panels/TradeRoutesPanel.tsx`

**Status:** 0 MATCH / 2 CLOSE / 3 DIVERGED / 4 MISSING / 1 EXTRA

**Highest-severity finding:** F-01 — yield direction reversed (owner gets gold symmetrically; VII: origin gets resources, destination gets slot×age gold).

---

## Effort estimate

| Bucket | Findings | Total |
|---|---|---|
| S | F-04, F-05, F-06, F-08, F-10 | 2.5d |
| M | F-01, F-02, F-03, F-07, F-09 | ~10d |
| **Total** | 10 | **~2.5w** |

Recommended order: F-01 → F-02 → F-03 → F-04 → F-05 → F-06 (VII-parity milestone). F-07 UI after F-01. F-08, F-09, F-10 as polish.

---

<!-- END OF AUDIT -->
