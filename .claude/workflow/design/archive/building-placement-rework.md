# Building Placement Rework — Tile-First, Civ VII Flow

**Status:** Design-only (Phase 1). No code changes this cycle.
**Target rulebook sections:** §2 (Settlements), §2.3 (Town Specialization), §5 (Production & Purchase), §8 (Buildings)
**Depends on:** Districts Overhaul (`districts-overhaul.md`), M14 `BuildingPlacementValidator`, M22 `UrbanPlacementHintBadge`, M13 `wonderPlacementSystem`.
**Non-dependencies:** Unit production (unchanged), purchase flow for towns (unchanged).

---

## 1. Why this rework — diagnosis of the current flow

### 1.1 Current flow (as implemented today)

Trace a player building a Granary in Rome today:

1. **Pick phase (CityPanel).** Player opens `CityPanel.tsx`. At the bottom, the "Build" section lists every available building as a `BuildingCard`. Clicking the card dispatches:
   ```ts
   dispatch({ type: 'SET_PRODUCTION', cityId: city.id, itemId: b.id, itemType: 'building' })
   ```
   → `productionSystem.handleSetProduction` pushes `{ type: 'building', id: 'granary' }` onto `city.productionQueue`. `productionProgress` is preserved across switches (`Keep existing progress when switching production (no waste)`).
2. **Accumulation phase (productionSystem).** On `END_TURN`, `processProduction` iterates cities, computes per-turn production (with Workshop/Barracks/celebration modifiers), increments `city.productionProgress`. On completion (`newProgress >= cost`), the building is pushed into `city.buildings` — **without a tile assignment**.
3. **Placement phase (BuildingPlacementPanel).** The player reopens the city. CityPanel renders a "NEEDS PLACEMENT" badge next to every produced-but-unplaced building. Clicking that row sets local `placementMode` state, which mounts `BuildingPlacementPanel` — a **modal list** of the city's territory tiles, each a button labelled `(q, r)`. Valid tiles are green, invalid ones are grey. Clicking a green tile dispatches `PLACE_BUILDING`, which runs through `buildingPlacementSystem` and writes `tile.building = buildingId` into the map.

### 1.2 Why this is backwards compared to Civ VII

Civ VII commits tile first, production second. You cannot start a Granary without telling the game *which tile*. The tile is locked as soon as production starts, and the production meter fills while the tile is visually claimed (dashed outline on the map).

Our flow is **the opposite**:

| Step | Civ VII | Hex Empires today |
|------|---------|-------------------|
| 1 | Pick building from build list | Pick building from build list |
| 2 | Enter map placement mode — valid tiles highlighted green | Building enters queue; production starts accumulating |
| 3 | Click a tile → tile locked, production starts on that tile | Production completes; building dropped into flat `city.buildings` list |
| 4 | Production fills on the locked tile | Player reopens city, sees "NEEDS PLACEMENT" prompt |
| 5 | On completion, building auto-appears on the locked tile | Player opens a **menu** of tile buttons, picks one |

Concrete failure modes of our flow:

- **Wasted production on bad tiles.** A player queues `Library`, accumulates 40 production, opens the placement modal, and discovers the only remaining territory tile is a mountain (invalid). They either forfeit the 40 production (cancel + requeue) or place on the city centre and regret it.
- **No spatial planning.** The player cannot see at queue-time how the building's adjacency bonuses would interact with the terrain. `UrbanPlacementHintBadge` (M22) exists but is only rendered *after* production completes, at which point no real choice remains.
- **Two-step mental model mismatch.** Every other spatial action in the game (move unit, build improvement, attack) is *click hex to commit*. Buildings alone break the pattern with a grid-of-buttons modal.
- **Incompatible with Districts Overhaul.** `districts-overhaul.md` Cycle C introduces `PLACE_URBAN_BUILDING` which requires a tile *as part of placement*. The current `SET_PRODUCTION` → wait → `PLACE_BUILDING` split is orthogonal to the urban-tile model; pinning the tile at queue time is the simpler integration.
- **Wonders are even worse.** M13 `wonderPlacementSystem` enforces unique placement constraints (rivers, mountains, coast). Under the current flow, a player can queue a wonder, wait N turns, and *then* be told no valid tile exists.

### 1.3 Data shape today

```ts
// packages/engine/src/types/GameState.ts:115
export interface ProductionItem {
  readonly type: 'unit' | 'building' | 'wonder' | 'district';
  readonly id: string;
}

// packages/engine/src/types/GameState.ts:68
export interface CityState {
  // ...
  readonly productionQueue: ReadonlyArray<ProductionItem>;
  readonly productionProgress: number;
  // ...
}
```

No field records "which tile will this go on when it completes". That is the lowest-level gap.

---

## 2. Target flow — Civ VII tile-first placement

### 2.1 Narrative walkthrough

1. Player opens `CityPanel` for Rome (pop 3, pre-existing Granary on the city centre).
2. Under "Build", player clicks `Library` (an urban building that occupies a tile).
3. Instead of dispatching `SET_PRODUCTION` immediately, the UI enters **placement mode**:
   - CityPanel dims its interactive sections (greyed buttons, "Select a tile on the map" banner at top).
   - The canvas overlay activates: every tile in Rome's territory is classified via `BuildingPlacementValidator`. Valid tiles render a translucent green fill with a crisp yellow outline; invalid tiles get a grey `rgba(0,0,0,0.4)` overlay.
   - The already-selected city centre highlights its current Granary; other already-built urban tiles show their building icon.
   - On hover, the `UrbanPlacementHintBadge` surfaces: "`+2 adjacency from Granary`", "`+1 adjacency from river`".
4. Player clicks tile `(1, 0)`. UI dispatches:
   ```ts
   dispatch({
     type: 'SET_PRODUCTION',
     cityId: 'rome',
     itemId: 'library',
     itemType: 'building',
     tile: { q: 1, r: 0 },        // NEW — required for buildings/wonders
   })
   ```
   `productionSystem` writes `{ type: 'building', id: 'library', lockedTile: {q:1,r:0} }` onto the queue. Placement mode exits.
5. Canvas shows a dashed-outline "pending construction" overlay on `(1,0)` with a progress ring fed from `city.productionProgress / cost`.
6. Player plays N turns. Each `END_TURN` ticks `productionProgress` per the existing accumulation logic. **Nothing about production accumulation changes.**
7. On completion (`newProgress >= cost`), `productionSystem` internally invokes the placement path: `city.buildings = [...city.buildings, 'library']`, `map.tiles[(1,0)].building = 'library'`, and in the v2 districts-overhaul world, `UrbanTileV2.buildings` is appended to. No user action needed — no "NEEDS PLACEMENT" prompt.
8. Canvas replaces the dashed outline with the real building icon.

### 2.2 Mid-production cancel (the escape hatch)

If at turn T the player opens Rome and sees the Library pending but regrets the chosen tile:

- If `productionProgress < CANCEL_THRESHOLD`, a **Cancel** button is shown next to the pending-production display. Clicking dispatches:
  ```ts
  dispatch({ type: 'CANCEL_BUILDING_PLACEMENT', cityId: 'rome' })
  ```
  Effect: queue head removed, `productionProgress` refunded (set to 0), the pending-construction overlay clears. Player can immediately re-pick a building (and a new tile).
- If `productionProgress >= CANCEL_THRESHOLD`, the Cancel button is disabled with tooltip "Too much progress accumulated — finish or wait".

**Proposed threshold:** `CANCEL_THRESHOLD = max(10, floor(0.5 * productionPerTurn))` — i.e. less than one full turn's worth of accumulated production. Rationale: a fresh queue (0 progress) is always cancellable; by the end of the first turn of accumulation, the player has committed. This matches Civ VII's "you only get one free reroll" feel.

This bound is deliberately conservative. The rulebook's §5.2 mentions production *overflow* on completion but does not specify a cancel window. The threshold is a playtest knob; see §7 Open questions.

### 2.3 Non-goals (explicitly out of scope)

1. **Unit production flow — unchanged.** Units spawn at the city centre; no tile lock required. The existing `SET_PRODUCTION` signature for `itemType: 'unit'` still dispatches without a `tile` field.
2. **Purchase flow (towns) — unchanged.** Towns use `PURCHASE_ITEM` with gold, and in the v2 districts world urban buildings will still need a tile for purchased buildings in cities — but that's a follow-up. This rework targets the production-queue path.
3. **Wonder placement rules — not rewritten.** M13 `wonderPlacementSystem` already enforces wonder-specific constraints. Those constraints are *consulted* by `BuildingPlacementValidator` when computing the valid-tile set in placement mode. No new wonder logic.
4. **District placement — out of scope.** Districts (`type: 'district'` in the queue) have their own flow (existing `PLACE_DISTRICT`); this rework does not touch them. If Districts Overhaul Cycle F lands first, districts go away entirely and this becomes moot.
5. **AI placement.** `aiSystem` must still choose a tile at queue time. This rework defines the shape; the AI tuning is a separate track.

---

## 3. Required engine changes

### 3.1 Extend `ProductionItem`

```ts
// packages/engine/src/types/GameState.ts

export interface ProductionItem {
  readonly type: 'unit' | 'building' | 'wonder' | 'district';
  readonly id: string;
  /**
   * Locked tile for tile-addressed production.
   *
   * - For `type: 'building'` and `type: 'wonder'`, REQUIRED when creating
   *   new items via SET_PRODUCTION. Pre-existing queued items from before
   *   the rework may omit this (legacy migration path).
   * - For `type: 'unit'`, always absent. Units spawn at city centre.
   * - For `type: 'district'`, absent. Districts use their own placement.
   */
  readonly lockedTile?: HexCoord;
}
```

The field is optional at the type level so legacy saves (v1) still compile, but the dispatch validator rejects new building/wonder queue items without it (see §3.3).

### 3.2 Extend `SET_PRODUCTION` action

```ts
// current
| { type: 'SET_PRODUCTION'; cityId: CityId; itemId: string; itemType: ProductionItem['type'] }

// proposed
| {
    type: 'SET_PRODUCTION';
    cityId: CityId;
    itemId: string;
    itemType: ProductionItem['type'];
    tile?: HexCoord;   // REQUIRED for 'building'/'wonder', omitted for 'unit'/'district'
  }
```

Validation rules added to `handleSetProduction`:

- If `itemType === 'building'` or `'wonder'`: reject with `'Building production requires a tile'` when `tile` is absent.
- If `tile` is present: reject with existing reasons if the tile is outside city territory, already occupied, or otherwise invalid per `BuildingPlacementValidator`.
- On success, `productionQueue[0] = { type, id, lockedTile: tile }`.

### 3.3 Extend `productionSystem.processProduction`

On completion (`newProgress >= cost`), for `type === 'building'` or `'wonder'`:

```ts
if (currentItem.lockedTile) {
  // Auto-place on the locked tile, same code path as PLACE_BUILDING today
  const tileKey = coordToKey(currentItem.lockedTile);
  const placedTile = {
    ...state.map.tiles.get(tileKey)!,
    building: currentItem.id,
  };
  updatedTiles.set(tileKey, placedTile);
  // In the v2 world, also append to UrbanTileV2.buildings via dual-write
}
// Building is added to city.buildings list as today
```

**No user action fires.** The building is fully placed at production-completion time.

If `lockedTile` is absent (legacy migration — a queue item that predates the rework), fall back to the current behaviour: add to `city.buildings` but leave unplaced. A "NEEDS PLACEMENT" badge surfaces in the UI and the player uses the old modal. This path is temporary.

### 3.4 New action: `CANCEL_BUILDING_PLACEMENT`

Added to the `GameAction` discriminated union:

```ts
| { readonly type: 'CANCEL_BUILDING_PLACEMENT'; readonly cityId: CityId }
```

Handled by `productionSystem` (natural owner — it already owns the queue). Behaviour:

```ts
function handleCancelPlacement(state: GameState, cityId: CityId): GameState {
  const city = state.cities.get(cityId);
  if (!city) return createInvalidResult(state, 'City not found', 'production');
  if (city.owner !== state.currentPlayerId) return createInvalidResult(state, 'Not your city', 'production');
  if (city.productionQueue.length === 0) return createInvalidResult(state, 'Nothing to cancel', 'production');

  const head = city.productionQueue[0];
  if (head.type !== 'building' && head.type !== 'wonder') {
    return createInvalidResult(state, 'Only buildings/wonders can be cancelled this way', 'production');
  }

  const threshold = computeCancelThreshold(state, city);
  if (city.productionProgress >= threshold) {
    return createInvalidResult(state, 'Too much progress accumulated to cancel', 'production');
  }

  const updatedCities = new Map(state.cities);
  updatedCities.set(cityId, {
    ...city,
    productionQueue: city.productionQueue.slice(1),
    productionProgress: 0,   // Refund — progress is lost, but so is the tile lock
  });
  return { ...state, cities: updatedCities, lastValidation: null };
}
```

`computeCancelThreshold` is a pure helper: `max(10, floor(yields.production * 0.5))`. Exposed for tests.

### 3.5 Deprecate `PLACE_BUILDING` (eventually)

In the new flow, `PLACE_BUILDING` is no longer dispatched by the UI for new queued items. It remains in the action union to handle the legacy-queue migration path (Cycle 7 may delete it). `buildingPlacementSystem` keeps its validation logic but is invoked internally by `productionSystem` on completion rather than by a user action.

### 3.6 Migration of in-flight queues

Existing saves have `productionQueue` entries without `lockedTile`. On load:

- `productionSystem` detects `lockedTile === undefined` on a building/wonder queue item.
- Progress ticks as today.
- On completion, building drops into `city.buildings` without a tile mark.
- UI surfaces "NEEDS PLACEMENT" and the old modal.
- Once the player places it, they're back on the v2 flow for the next queued item.

This keeps mid-game saves playable. No forced save migration.

---

## 4. Required UI changes

### 4.1 New provider state: `placementMode`

Added to `GameProvider`:

```ts
interface PlacementMode {
  readonly cityId: CityId;
  readonly itemId: string;
  readonly itemType: 'building' | 'wonder';
  readonly validTiles: ReadonlyArray<HexCoord>;   // pre-computed from BuildingPlacementValidator
}

const [placementMode, setPlacementMode] = useState<PlacementMode | null>(null);
```

The provider exposes `enterPlacementMode(cityId, itemId, itemType)` and `exitPlacementMode()`. `enterPlacementMode` computes `validTiles` once by walking city territory and asking `BuildingPlacementValidator.isValid(state, cityId, itemId, tile)`. The result is cached for the duration of the mode so hover updates are cheap.

Why `GameProvider` and not local `useState` in CityPanel? Because both the canvas overlay and the top-level UI (ESC handler, dimmed banner) need to read it. Keeping it in the provider matches how `activePanel` already lives in `GameUI`.

### 4.2 CityPanel: launch placement mode instead of dispatching `SET_PRODUCTION`

Replace the current building card handler:

```tsx
// current
onClick={() => dispatch({ type: 'SET_PRODUCTION', cityId, itemId: b.id, itemType: 'building' })}

// proposed
onClick={() => {
  if (isBuildingSpatial(b)) {
    enterPlacementMode(cityId, b.id, b.isWonder ? 'wonder' : 'building');
  } else {
    // shouldn't happen post-districts-overhaul; all buildings are spatial
    dispatch({ type: 'SET_PRODUCTION', cityId, itemId: b.id, itemType: 'building' });
  }
}}
```

Unit cards are unchanged. Town purchase buttons are unchanged (towns purchase warehouse buildings which *may* need tiles post-overhaul, but that's a separate track).

The CityPanel grows a **pending-build summary** in place of today's "NEEDS PLACEMENT" badge:

- If `productionQueue[0].lockedTile` exists: show the building name, a mini-map thumbnail of the tile, progress bar, turns-to-completion, and a Cancel button (disabled if past threshold).
- If `productionQueue[0].lockedTile` is absent (legacy queue item): show the current "NEEDS PLACEMENT" badge and use the legacy modal.

### 4.3 Canvas overlay: `PlacementOverlay`

New `HexRenderer` render pass, active only when `placementMode !== null`. Rendered *after* the base terrain + units but *before* units:

- For each tile in `placementMode.validTiles`: fill with `rgba(120, 220, 120, 0.35)`, outline with `rgba(240, 220, 0, 1.0)`, thickness 3px.
- For every other tile in the same city's territory (invalid tiles): overlay `rgba(0, 0, 0, 0.4)` and skip outline.
- For tiles outside the city's territory: no extra overlay, but they are non-interactive for this click.

On hover of a valid tile: surface `UrbanPlacementHintBadge` at the tile, showing adjacency preview from `BuildingPlacementValidator.scoreAdjacency(state, tile, itemId)`.

### 4.4 Click handling in placement mode

The canvas click handler (`handleCanvasClick` in `GameCanvas.tsx`) branches on `placementMode`:

```ts
if (placementMode) {
  const tile = screenToHex(evt.clientX, evt.clientY);
  if (!tile) { exitPlacementMode(); return; }
  const isValid = placementMode.validTiles.some(t => t.q === tile.q && t.r === tile.r);
  if (isValid) {
    dispatch({
      type: 'SET_PRODUCTION',
      cityId: placementMode.cityId,
      itemId: placementMode.itemId,
      itemType: placementMode.itemType,
      tile,
    });
    exitPlacementMode();
  } else {
    exitPlacementMode();  // click on invalid tile cancels
  }
  return;
}
// ...fall through to normal click handling
```

Escape hatches for cancelling placement without committing:

- ESC key → `exitPlacementMode()`.
- Right-click anywhere → `exitPlacementMode()`.
- Click outside the canvas (e.g. back on CityPanel) → `exitPlacementMode()`.
- Click on an invalid tile → `exitPlacementMode()` (no commit).

### 4.5 Delete or repurpose `BuildingPlacementPanel`

`packages/web/src/ui/components/BuildingPlacementPanel.tsx` becomes dead code in the v2 flow. Two options:

- **Option A — delete.** Clean removal in Cycle 6. Simplest. The legacy-migration path uses the same panel, so defer deletion until the migration path is removed (post-v2 stabilisation).
- **Option B — repurpose as legacy-migration fallback.** Keep it for queue items that predate the rework. Surfaces only when `productionQueue[0].lockedTile === undefined` and the building has completed. Once all old saves are migrated, delete.

**Recommendation:** Option B for Cycle 6; schedule deletion in a follow-up after stabilisation.

---

## 5. Data shape comparison (current vs proposed)

```ts
// CURRENT
city.productionQueue = [
  { type: 'building', id: 'library' },
];
// After completion:
city.buildings = [...city.buildings, 'library'];  // unplaced — needs modal
map.tiles[tileKey].building = 'library';          // only after user clicks in modal
```

```ts
// PROPOSED
city.productionQueue = [
  { type: 'building', id: 'library', lockedTile: { q: 1, r: 0 } },
];
// After completion (same turn boundary):
city.buildings = [...city.buildings, 'library'];
map.tiles[coordToKey({q:1,r:0})].building = 'library';  // atomic with production completion
// No user action between SET_PRODUCTION and final placement.
```

The lifecycle simplifies from three UI moments (queue → NEEDS PLACEMENT → place) to two (enter placement mode → click tile). Everything between is deterministic engine-side.

---

## 6. Migration plan — sub-cycle breakdown

Seven cycles. Each cycle is independently shippable and testable. No "big bang" cutover.

| Cycle | Title | Scope | Layer | Risk |
|-------|-------|-------|-------|------|
| 1 | Engine: `ProductionItem.lockedTile` + auto-place on completion | Extend `ProductionItem`, extend `SET_PRODUCTION`, update `productionSystem.processProduction` to call into `buildingPlacementSystem` on completion. Legacy path preserved when `lockedTile` absent. | Engine L1 + L2 | Low |
| 2 | Engine: `CANCEL_BUILDING_PLACEMENT` action | Add action, add handler to `productionSystem`, add `computeCancelThreshold` helper. | Engine L1 | Low |
| 3 | Web: `placementMode` state in `GameProvider` | Provider state, `enterPlacementMode` / `exitPlacementMode`, cached `validTiles` via `BuildingPlacementValidator`. No canvas changes yet. | Web L3 unit | Low |
| 4 | Web: canvas `PlacementOverlay` render pass | New render pass in `HexRenderer`, green/grey overlays, hover adjacency hint via `UrbanPlacementHintBadge`. Click routing. ESC / right-click / invalid-tile cancel. | Web L3 behavioural | Medium |
| 5 | Web: CityPanel launches placement mode | Replace building-card `onClick` to call `enterPlacementMode`. Add pending-build summary + Cancel button wired to new action. | Web L3 + L2 | Low |
| 6 | Web: deprecate `BuildingPlacementPanel` | Gate on `lockedTile === undefined`. Legacy migration path only. Keep the component file for one cycle, add deletion-follow-up issue. | Web L3 | Low |
| 7 | Tests: E2E coverage + rollback path | Full-flow chrome-devtools smoke: queue → place → complete → verify tile. Regression test for legacy migration. Cancel-window edge cases. Save/load round-trip with `lockedTile`. | Browser L3 + L4 | Medium |

### 6.1 Cycle 1 detail (reference for the first implementer)

**Files touched:**
- `packages/engine/src/types/GameState.ts` — add `lockedTile?: HexCoord` to `ProductionItem`; add `tile?: HexCoord` to `SET_PRODUCTION`.
- `packages/engine/src/systems/productionSystem.ts` — validation in `handleSetProduction`, auto-place in `processProduction`.
- `packages/engine/src/systems/__tests__/productionSystem.test.ts` — add tests.

**New tests (L1):**
- SET_PRODUCTION with valid tile sets `lockedTile`.
- SET_PRODUCTION without tile for `'building'` rejects with `'Building production requires a tile'`.
- SET_PRODUCTION with invalid tile (outside territory) rejects.
- SET_PRODUCTION with tile already containing a building rejects.
- END_TURN at completion with `lockedTile` set writes `tile.building` and adds to `city.buildings`.
- END_TURN at completion without `lockedTile` (legacy) adds to `city.buildings` but leaves tile unset.
- SET_PRODUCTION for `'unit'` still works without `tile` (no regression).

**Exit criteria:** `npm run test:engine` green. No web changes.

### 6.2 Cycle 7 detail

**Behavioural tests:**
- Open city → click building → canvas enters placement mode (green overlay renders).
- Click valid tile → production queue has `lockedTile` set.
- Advance turns → production completes → tile renders with building icon → city.buildings contains it.
- Queue a second building → cancel before turn end → progress refunds to 0, queue empty.
- Queue a building, advance one turn past threshold → Cancel button disabled.
- Legacy save with no `lockedTile` → existing modal appears on completion → places successfully.

**Save/load test:** `SaveLoad.serialize(state)` followed by `deserialize` preserves `productionQueue[0].lockedTile`.

---

## 7. Open questions & needs-research

1. **Cancel threshold — exact formula.** Current proposal `max(10, floor(0.5 * productionPerTurn))`. Rulebook §5.2 mentions overflow on completion but not a cancel window. Civ VII's UI permits cancellation any time, but imposes a full loss of accumulated production as friction. Our current formula is stricter (hard cap at <1 turn) because full-refund-any-time risks degenerate "toggle every turn" play. **Decision-needed:** playtest after Cycle 7 lands. If players complain the cap is too tight, loosen to `floor(1.0 * productionPerTurn)`.

2. **Show other civs' placement plans?** Civ VII treats pending builds as private. We do likewise — `placementMode` is provider-local and `lockedTile` on foreign cities is hidden from fog-of-war visibility calculations. **Confirmed non-feature.**

3. **What if the locked tile becomes invalid mid-construction?** Examples: enemy captures the tile (culture bomb, conquest), terrain changes via a crisis event, the tile is destroyed. Proposed fallback: on completion, re-validate the `lockedTile`. If invalid, surface a `ValidationFeedback` warning and fall back to the legacy "NEEDS PLACEMENT" path. Do **not** silently drop the building — player should get a chance to repick.

4. **Buying a building in a city (not a town).** `PURCHASE_ITEM` with `itemType: 'building'` currently drops the building into `city.buildings` without a tile. Post-rework, this is the same problem. Proposed: extend `PURCHASE_ITEM` to require a `tile` for building purchases in cities, mirroring `SET_PRODUCTION`. Scope-flag — out of this rework; file as a follow-up.

5. **AI placement.** `aiSystem.generateAIActions` currently emits `SET_PRODUCTION` without a tile. Post-rework it must emit with a tile. The simplest policy: rank valid tiles by `BuildingPlacementValidator.scoreAdjacency`, pick the best. Scope-flag — the AI integration is Cycle 2 *of AI overhaul*, not this rework.

6. **Wonders across multiple cities.** Post-overhaul, wonders are Ageless and can land on any urban tile. But `wonderPlacementSystem` (M13) enforces geographic constraints (e.g. Pyramids require desert). Placement mode must show a union of both constraints. `BuildingPlacementValidator` already composes these; no new logic needed — but Cycle 4's overlay must not forget to hand `itemId: wonderId` into the validator so the wonder-specific constraints fire.

7. **Districts Overhaul interaction.** If Districts Overhaul Cycle C lands first, this rework dispatches `PLACE_URBAN_BUILDING` internally on completion (instead of `PLACE_BUILDING`). If this rework lands first, Districts Overhaul Cycle C will swap the internal dispatch. Either order works; the `lockedTile` field is the common pivot.

---

## 8. Out-of-scope / explicit non-features

To head off scope creep:

1. **Multi-tile buildings** (e.g. mega-factories spanning 2 hexes). Civ VII doesn't ship these; neither do we.
2. **Tile preview for *all* queued items** — only the head of the queue is locked/placed. Subsequent queue items don't get tile picks at queue time; they're picked when their turn comes. This deliberately matches Civ VII's "one build at a time" model.
3. **Tile swapping without cancel** — no "move my pending construction to a different tile" action. Use cancel + requeue. Keeps the cancel-threshold mechanic as the single control point.
4. **Production preservation across cancel** — cancel refunds progress to 0. Keeping progress would be a balance change; flag for playtest in a separate cycle if desired.
5. **Placement mode for purchases** — out of scope (see Open Q4). Purchases currently don't go through the queue; they're one-shot.
6. **Visual preview of final adjacency diff** — the hover hint shows the *raw adjacency*, not a delta vs the optimal tile. Deltas are a UX polish for a later cycle.
7. **Replacing/overbuilding** — the Districts Overhaul `DEMOLISH_BUILDING` action handles this. No placement-mode interaction needed here.

---

## 9. Testing strategy summary

| Cycle | L1 (unit) | L2 (integration) | L3 (browser) | L4 (save/load) |
|-------|-----------|------------------|--------------|----------------|
| 1 | SET_PRODUCTION tile validation branches; END_TURN auto-place | `SET_PRODUCTION → END_TURN × N → building on tile` | — | — |
| 2 | Cancel threshold branches; cancel clears queue + refunds | `SET_PRODUCTION → CANCEL → queue empty` | — | — |
| 3 | `enterPlacementMode` computes `validTiles` correctly | — | Provider state transitions | — |
| 4 | — | — | Canvas renders green/grey overlay; hover shows hint; ESC cancels | — |
| 5 | — | CityPanel click → provider state → dispatch | Click flow end-to-end | — |
| 6 | — | Legacy queue item → modal still surfaces | Legacy flow regression | — |
| 7 | — | Full multi-turn flow | Full E2E + cancel edge cases | Save/load preserves `lockedTile` |

---

## 10. Appendix — why the commit threshold matters

The temptation is to make cancel free and always-available. This creates degenerate play: a player queues a wonder, waits to see what their neighbour is doing, cancels, requeues based on intel — the strategic commitment of "I picked this tile now" evaporates.

The proposed `<1 turn of production` threshold keeps commitment meaningful: once you've burned a turn, the tile is yours for the duration of this build. It mirrors Civ VII's "you feel the sting of cancelling a 40-turn wonder" without punishing the player for clicking the wrong building card immediately.

A softer alternative — "cancel always allowed but production is halved on cancel" — introduces a floating-point rounding mess (what about odd numbers? what about overflow?) and a second code path for `processProduction`. The hard threshold is cleaner.

---

**End of design.** Cycle 1 ships with engine-only changes and engine tests. Cycle 7 ships the full E2E coverage. Follow-up tracks (AI integration, purchase-path tile lock) are filed as separate issues.
