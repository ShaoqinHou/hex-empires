# HUD / Tooltip / Overlay Layer Audit + Rethink

**Status:** Design / audit only — no code changes in this cycle.
**Target worktree:** `.claude/worktrees/agent-a1f934de`
**Audit scope:** The non-panel UI layer in `packages/web/src/canvas/TooltipOverlay.tsx`
and `packages/web/src/ui/components/` (eleven components + the `tooltips/` sub-folder).
**Sibling reference:** `.claude/workflow/design/panel-manager-audit.md` (M31) — same
pattern, applied to panels. This document re-uses that document's structure and
complements it: where panels own modal dialogs, the HUD owns *ambient* overlays
(hover tooltips, transient toasts, floating badges, the minimap).

Prompted by three concrete user complaints:

1. **"The hover tooltip is right in the way — hard to see the tile."**
   The tile tooltip anchors above the hovered hex and covers the three neighbour
   hexes the player is most likely to want to look at (this is the *point* of
   hovering — to see the tile in its context).
2. **"Info shown needs to be better"** — terrain/feature yields are summarised
   but there is no adjacency preview, no road/river detail, no city-territory
   indicator, no ownership info beyond a color swatch.
3. **"Stacked entities need a cycle mechanism"** — a civilian + military on the
   same tile shows a fixed "top" unit and the second one is only glanceable as
   "×2". The player cannot flip focus to the second unit without moving the
   cursor away.

As with M31, no single PR refactors everything. The plan is a staged migration
that lands a manager + shell first, then ports overlays one at a time.

---

## 1. Inventory

### 1.1 Non-panel UI surfaces

All paths are rooted at `packages/web/src/`.

| Component | File (lines) | What it shows | When it appears | Position strategy | Input source | Dismissible? | Styling |
|---|---|---|---|---|---|---|---|
| **TooltipOverlay** | `canvas/TooltipOverlay.tsx` (462) | Tile info: terrain, feature, resource, improvement, city, top own unit, top enemy unit. Alt-held shows detailed tier (movement cost, defense bonus, per-source yields, full unit stat cards). | Always — gated on `hoveredHex != null`. | `fixed` + `world→screen` via `camera.worldToScreen()`; default renders ABOVE anchor; `ClampedTooltipPositioner` (lines 400–461) measures and flips below / nudges horizontally if the box would overflow. | `hoveredHex` from `useGame()`, `isAltPressed` from `useGame()`. | No — only by moving cursor. | Inline styles + Tailwind; `rgba(15,23,42,0.92)` and `rgba(251,191,36,0.35)` raw hex-in-rgba (lines 73–81, 176–184). |
| **CombatHoverPreview** | `ui/components/CombatHoverPreview.tsx` (223) | Attacker vs defender portraits, strength comparison, damage ranges, victory %, modifiers grid. | When a preview is available (hook-derived from selected unit + hovered enemy). **Currently NOT mounted** — see note below. | `position: fixed` hand-computed near cursor, `zIndex: 1000` (line 49). | `preview`, `position` props from caller. | No. | Raw rgba inline (`rgba(17,24,39,0.95)`, `rgba(34,197,94,0.9)`, etc. — lines 32–42, 55–60). |
| **CombatPreviewPanel** | `ui/components/CombatPreviewPanel.tsx` (222) | Same combat preview as CombatHoverPreview but token-styled. | When `selectedUnit && combatPreviewTarget` in App.tsx:181. | `absolute` + `zIndex: 1000` (line 80). Implicitly anchors at `0,0` of its parent — there is *no* hex-to-screen projection; a caller-side comment says "display near cursor/target unit" but the actual positioning is delegated to the surrounding flex box. | `attackerUnitId`, `targetHex` props from App.tsx. | No. | Tokens (`var(--color-surface)`, `var(--color-text-muted)`, etc.) — cleanest component in the set. |
| **Notifications** | `ui/components/Notifications.tsx` (207) | Toast stack: "Production Complete", "Research Complete", "Civic Complete", "Alert". | Polls `state.log` every state update, filters for this player + this turn, emits toasts with 8 s auto-dismiss. | `fixed top-20 right-4 z-40` (line 107). | `state.log`, local `useState<Notification[]>`. | Yes — per-toast `×` button + 8 s timeout. | Mixed — `var(--color-surface)` + raw hex for left-border color map (`#ff8a65`, `#42a5f5`, `#ab47bc`, `#f44336`, `#64b5f6` — lines 179–191). |
| **TurnTransition** | `ui/components/TurnTransition.tsx` (140) | Giant "Turn N / Antiquity Age" splash, up to 3 notifications. | On `state.turn` change. | `fixed inset-0 z-50` centered (line 49). | `state.turn`, `state.log`. | Yes — 600 ms auto-dismiss + click anywhere. | Tokens for text; raw `rgba(100,181,246,0.8)` textShadow (line 67). |
| **ValidationFeedback** | `ui/components/ValidationFeedback.tsx` (110) | Gradient error toast ("🚶 movement error: not enough moves") + a red flash shake-frame overlay. | `lastValidation != null && !valid`. | Toast: `fixed top-20 left-1/2 -translate-x-1/2 z-50`. Shake overlay: `fixed inset-0 z-40 bg-red-500/5`. | `lastValidation` prop. | Yes — 3 s timeout. | 100% Tailwind utility (`bg-gradient-to-r from-amber-500 to-orange-600`, etc. — line 38). Zero tokens. Violates `.claude/rules/tech-conventions.md`. |
| **EnemyActivitySummary** | `ui/components/EnemyActivitySummary.tsx` (117) | Bulleted list of enemy events from the previous AI turn. | When `currentPlayer.isHuman` becomes true and there are enemy-owned log entries. | `fixed top-20 left-4 z-40`. | `state.log`, `state.players`, `state.turn`. | Yes — 8 s timeout, `×` button, or click backdrop (a `fixed inset-0 z-[-1]` sibling). | Token-based (`var(--color-surface)`, `var(--color-accent)`), but positioning is hand-rolled. |
| **Minimap** | `ui/components/Minimap.tsx` (170) | Top-down world overview with terrain palette, fog overlay, city/unit dots, camera viewport rect. | Always mounted. | `absolute bottom-16 left-2` (line 160). | `state.map`, `state.cities`, `state.units`, `cameraRef`. | Not applicable. | Hard-coded hex palette for minimap tiles (`#5da84e`, `#d4b85a`, `#1e4d7a`, etc. — lines 10–19, 93 line of player colors). This is acceptable for a mini-renderer, but it's worth flagging. |
| **YieldsToggle** | `ui/components/YieldsToggle.tsx` (30) | Single button — toggle per-tile yield icon overlay. | Always mounted. | `absolute left-2 bottom-56 zIndex: 20` (line 8). | Local prop pair. | N/A. | Tokens. |
| **UrbanPlacementHintBadge** | `ui/components/UrbanPlacementHintBadge.tsx` (178) | Three states — "blocked", "no bonuses", or a flex-row of yield deltas (+3 🍞, +2 ⚙️…) for a candidate (buildingId, tile) placement. | **Currently NOT wired** — file header says "NOT wired into App.tsx or GameCanvas. A later cycle will supply the screen coordinates …" (comment lines 49–51). Tested in isolation; no integration. | `absolute` + `zIndex: 900`, hand-computed `translate(-50%, calc(-100% - 8px))`. | Caller-supplied `score`, `screenX`, `screenY`. | No. | Raw rgba throughout — `rgba(127,29,29,0.92)`, `rgba(239,68,68,0.6)`, etc. |
| **Tooltip** (shell) | `ui/components/tooltips/Tooltip.tsx` (99) | Generic `<Tooltip><child/></Tooltip>` wrapper — shows a `TooltipContent` block of sections (label / value rows). | On hover over wrapped child. | `fixed` + `translate(-50%, -100%)` anchored to bounding rect (lines 32–36). | `children`, `content` props. | Yes — mouse leave. | Tokens (`var(--color-surface)`, `var(--color-border)`). |
| **UnitTooltip / UnitStateTooltip** | `ui/components/tooltips/UnitTooltip.tsx` (138) | Combat stats, status, abilities, promotions, upgrade path, resource requirement. | Inside `TooltipContent` whenever a caller renders it. | Renders into whatever container the caller chose. | `unitDef`, `unitState` props. | N/A. | Tokens via `TooltipContent`. |
| **BuildingTooltip / TerrainTooltip / ResourceTooltip / TechnologyTooltip** | `ui/components/tooltips/` | Same pattern as UnitTooltip — typed `TooltipContent` wrappers. | Caller-driven. | Caller-driven. | Def props. | N/A. | Tokens. |
| **ResourceChangeBadge** | `ui/components/ResourceChangeBadge.tsx` | Small floating "+5 gold" style badge, used by animations. | Animation-driven. | `absolute` positioned per-animation. | Animation state. | Auto-fade. | Not audited in depth — adjacent to this HUD layer. |
| **Tooltip.tsx (top-level)** | `ui/components/Tooltip.tsx` | Older/duplicate tooltip primitive (the same thing as `tooltips/Tooltip.tsx`). | Legacy. | — | — | — | A duplicate of `tooltips/Tooltip.tsx`; they should converge. |

### 1.2 Z-index map for the HUD layer

| Value | Where | What |
|---|---|---|
| `zIndex: 20` | `YieldsToggle.tsx:8` | Yields toggle button |
| `z-40` | `Notifications.tsx:107`, `EnemyActivitySummary.tsx:48`, `ValidationFeedback.tsx:79` | Toast stack / shake overlay |
| `z-50` (Tailwind) | `ValidationFeedback.tsx:58`, `TurnTransition.tsx:49`, `TooltipOverlay.tsx:455`, `tooltips/Tooltip.tsx:51` | Toast / transition / tooltip |
| `zIndex: 900` | `UrbanPlacementHintBadge.tsx:96` | Placement hint badge |
| `zIndex: 1000` | `CombatHoverPreview.tsx:49`, `CombatPreviewPanel.tsx:80`, `CombatPreview.tsx:34` | Combat preview |

Three disjoint tiers (toast vs tooltip vs placement hint vs combat preview) — all
of which *should* sit above panels (`--panel-z-overlay: 110`) but *below* modals
(`--panel-z-modal: 210`). Today none of them follow that rule because none of
them know the rule exists.

---

## 2. Current tooltip diagnosis

This is the user's core complaint. A detailed pass follows.

### 2.1 Position problem — "the tooltip covers the surrounding tiles"

The current rendering pipeline for `TooltipOverlay.tsx` is:

```tsx
const { x: worldX, y: worldY } = hexToPixel(hoveredHex);             // line 378
const screen = camera.worldToScreen(worldX, worldY);                  // line 379
return (
  <ClampedTooltipPositioner anchorX={screen.x} anchorY={screen.y}>
    {isAltPressed ? <DetailedTooltip … /> : <LightweightTooltip … />}
  </ClampedTooltipPositioner>
);
```

`ClampedTooltipPositioner` (lines 400–461) does three passes:

1. Default render **above** the anchor (`translate(-50%, -100%)` and a `-12px`
   vertical gap).
2. If the measured top is below the viewport margin → flip below the anchor.
3. Horizontal clamp if left/right would overflow.
4. Absolute vertical clamp for anchors whose hex projects off-screen entirely
   (this is M29's fix — commit 7b75fdb).

The result is structurally correct — the tooltip is always visible, never
clipped — but the user complaint is about *occlusion*, not clipping. Hovering
a hex in the middle of the map renders the tooltip box *over the three hexes
north of the cursor*. Because hex maps are 2-D and players navigate by reading
adjacency (what's next to this tile?), this is the worst possible place for an
info box.

Concretely, on a 220-px-wide tooltip with a 12 px gap, a hex at screen y = 400
produces a tooltip whose top edge is at y = 260 — approximately two hex rows
above the hovered tile. Those two rows become invisible during the hover.

**Proposed alternatives (trade-offs):**

| Option | Pro | Con |
|---|---|---|
| **A. Offset diagonally from cursor** (e.g. cursor + {24, 24}) and flip on edges | Keeps focal tile visible north/east/west | Tooltip still covers ~3 tiles south-east of cursor; cursor-follow is jittery on slow-moving hovers |
| **B. Fixed corner panel** (bottom-right or bottom-left, beside the minimap / BottomBar) | *Never* covers the map. Large, stable, easy to read. Can show much more detail. | Player has to glance away from the cursor to read it. In a turn-based strategy game this is fine — in an RTS it would be bad. |
| **C. Edge-anchored side panel** (right rail, 320 px wide, always visible) | Same benefit as B but always on-screen, no pop-in flicker. Can include a persistent "selected tile" summary. | Steals 320 px of map real-estate permanently. Mitigated by making it collapsible. |
| **D. Two-tier hybrid** | Compact tooltip stays near-cursor (badge-sized: terrain + yield summary + top unit, ~60 px tall). Detailed tooltip (the current Alt-expanded view) renders in the fixed corner panel. | Best UX for a deep game; requires the most code. This is Civ VII's actual approach — small cursor tag + big persistent right panel. |

**Recommendation:** D (two-tier hybrid). The compact cursor tag is small enough
not to occlude (< 60 px tall, offset south-east of cursor), and the detailed
info lives where the user can consistently read it without cursor movement.

### 2.2 Info content gaps

The current tooltip contains:

- **Lightweight tier** (LightweightTooltip, lines 26–134):
  - Terrain name + feature name.
  - Aggregate food / production / gold icons.
  - Resource name (if any).
  - Improvement name (if any).
  - City name + population + ownership color.
  - Top own unit name + hp, with `×N` if stacked.
  - Top enemy unit name + hp, with `×N` if stacked.

- **Detailed tier** (DetailedTooltip, lines 138–358, visible while `Alt` is
  held):
  - Movement cost + defense bonus.
  - Terrain yield breakdown + feature deltas + improvement deltas.
  - Resource name + type pill + type color dot.
  - Improvement name.
  - Tile-placed building name.
  - City header with owner, population, settlement type, defense HP, happiness,
    specialization, and 6-yield totals.
  - Production queue peek.
  - Full `UnitStateTooltip` card per unit on the tile.

**What's MISSING that a Civ-VII-inspired game should show:**

| Missing info | Why it matters |
|---|---|
| **Territory ownership** — which city / player owns this tile | Critical for diplomacy, trespass, culture bombs. Today the tooltip only shows ownership for city-center tiles, not worked tiles. |
| **Adjacency-bonus preview** for districts / buildings if placed here | The M22 `UrbanPlacementHintBadge` exists but is unwired. During placement mode it should live in the tooltip. |
| **Road / river detail** | Line 2 says "grassland + forest" but never "grassland • river • road". Rivers change movement cost and combat modifiers; roads change movement cost. Both are visible on the map but don't reach the tooltip. |
| **Worked-tile indicator** | Is this tile being worked by a city? By which city? Today: no mention. |
| **Visibility / exploration state** | Is this tile currently visible or fogged? It matters because hovering fogged tiles should show "last seen on turn N" info, not current state. |
| **Yield icons' provenance** | The Alt-expanded view shows `🌾 +1` (blue) but doesn't say "+1 from improvement". Labels are implicit by color. |
| **Full per-tile yield total** is computed, but the component aggregates terrain + feature + improvement — it does **not** include: district adjacency, wonder effects, player-wide MODIFY_YIELD effects. The number the player sees does not match the engine's `calculateCityYields` for city-center tiles. |
| **Unit abilities at a glance** (e.g. "has Flank", "fortified", "first strike"). The compact tier shows only hp; full abilities are only in the Alt view. |
| **Turn-of-last-update** for fogged tiles | Civ VII shows a greyed-out snapshot of last-seen state. We have `explored` sets in `PlayerState.visibility` / `PlayerState.explored` — the data is there, the UI doesn't surface it. |

### 2.3 Stacked entity handling

`getTileContents(state, hex, playerId)` returns `ownUnits: ReadonlyArray<UnitState>`
and `enemyUnits: ReadonlyArray<UnitState>`. The tooltip today renders:

```tsx
// LightweightTooltip, lines 64–131 — condensed
const topOwnUnit = contents.ownUnits[0] ?? null;
const topEnemyUnit = contents.enemyUnits[0] ?? null;
// …renders only the first of each, with " ×N" for the count.
```

And the detailed tier iterates *all* units but renders each as a full card,
which makes a civilian + military + guard stack into a ~500-line DOM tree that
overflows the tooltip box.

The broader issue: **there is no way to cycle focus between stacked entities**.
A player with a settler + warrior on the same tile:

- Lightweight view: sees "Warrior (80hp)" and "×2" — doesn't know what the
  second unit is unless they press Alt.
- Alt view: sees two stacked cards, both at once — visually correct but takes
  ~300 vertical px.
- BottomBar: already has a "stack picker" from M1 — but it only appears when
  the stack is *selected*, not *hovered*. A hover tooltip cannot use it.

**Proposed solutions:**

| Option | Pro | Con |
|---|---|---|
| **Portrait strip** at top of tooltip: one square per entity on the tile (city icon, civilian icon, military icon). Highlighted square is the "focused" entity whose stats show below. | Immediate at-a-glance density. Mirrors Civ VI's tile-inspector look. | Needs a cycle affordance (Tab) or click-to-focus (but the tooltip is `pointer-events-none`). |
| **Tab to cycle** hint + a `1/3` index in the tooltip header | Minimal; feels game-y. | Invisible to players who don't read hints. |
| **Arrow-key cycle** (←/→) | Doesn't conflict with camera movement (the camera already uses arrow keys — yes it does; see next row). | Collides with camera pan. |
| **Integrate with BottomBar stack picker** — move hover-focus to whatever the BottomBar has selected | Consistency; one source of truth. | The BottomBar only populates on selection, not on hover — requires a new `hoveredIndex` state. |

**Recommendation:** Portrait strip + Tab cycle. Both are visible (the strip
shows everything without pressing anything) and interactive (Tab cycles through).
No arrow-key collision.

---

## 3. Proposed design

The design mirrors M31 (panel-manager-audit) — a manager context, a shared
shell component, CSS tokens, and a registry where appropriate — but adapted
for the *ambient* nature of HUD elements.

### 3.1 `HUDManager` context

One React context exposing the global "what is the cursor / focus looking at"
state. Sibling to `PanelManagerProvider`, not nested inside it.

```typescript
// packages/web/src/providers/HUDManager.tsx  (new)

/** Identifiers for every HUD surface the manager knows about. */
export type HUDTarget =
  | { readonly kind: 'none' }
  | { readonly kind: 'hex'; readonly coord: HexCoord; readonly cycleIndex: number }
  | { readonly kind: 'combat'; readonly attackerId: UnitId; readonly targetHex: HexCoord }
  | { readonly kind: 'placement'; readonly tile: HexCoord; readonly buildingId: BuildingId };

interface HUDManagerAPI {
  readonly target:        HUDTarget;             // single source of truth
  readonly hoveredHex:    HexCoord | null;       // convenience: target.kind === 'hex' ? coord : null
  readonly cycleIndex:    number;                // stacked-entity index, 0-based

  setHoveredHex:   (hex: HexCoord | null) => void;
  cycleNext:       () => void;                   // Tab — advances cycleIndex modulo stack size
  cyclePrev:       () => void;                   // Shift+Tab
  resetCycle:      () => void;                   // cursor moved to a new hex → reset to 0

  setCombatTarget:    (attackerId: UnitId, target: HexCoord) => void;
  clearCombatTarget:  () => void;

  setPlacementTarget:   (tile: HexCoord, buildingId: BuildingId) => void;
  clearPlacementTarget: () => void;
}

export const useHUDManager: () => HUDManagerAPI;
```

Invariants:

- `hoveredHex` is the low-level cursor-tracker. `target` is the higher-level
  "what's focused right now": a hex, a combat preview, or a placement hint.
  Placement and combat are mutually exclusive with plain-hex hover.
- `cycleIndex` auto-resets to 0 on any `setHoveredHex` change.
- The manager owns **no rendering**. It exposes state; overlays read it.

Today `hoveredHex` is a piece of `useGame()` state (`providers/GameProvider.tsx` —
`setGlobalHoveredHex`) and `selectedUnit` / `selectedCity` are separately
tracked. That works but conflates "input state" (where is the cursor?) with
"game state" (which unit is selected?). Moving cursor-position into `HUDManager`
cleans the separation.

### 3.2 `TooltipShell` component

Sibling to `PanelShell`. Shared chrome for any hover/transient overlay.

```tsx
// packages/web/src/ui/hud/TooltipShell.tsx  (new)

export type TooltipPositioning =
  | { readonly kind: 'anchor-hex'; readonly hex: HexCoord;        readonly offset?: 'top' | 'bottom' | 'diagonal' }
  | { readonly kind: 'anchor-screen'; readonly x: number; readonly y: number; readonly offset?: Offset }
  | { readonly kind: 'fixed-corner'; readonly corner: 'tl' | 'tr' | 'bl' | 'br' }
  | { readonly kind: 'top-center' }                              // notifications, validation toasts
  | { readonly kind: 'side-rail';    readonly side: 'left' | 'right' };

export interface TooltipShellProps {
  readonly id: string;                          // for data-testid + telemetry
  readonly positioning: TooltipPositioning;     // single-prop strategy, not three booleans
  readonly priority?: 'ambient' | 'hover' | 'toast' | 'modal-hint';  // default 'hover'
  readonly allowPointerEvents?: boolean;        // default false — most HUD is hit-through
  readonly contextMenu?: 'suppress' | 'passthrough';  // default 'suppress'
  readonly children: ReactNode;
}
```

- Picks `z-index` from `--hud-z-*` tokens based on `priority`.
- Owns the `ClampedTooltipPositioner` logic currently inlined at the bottom of
  `TooltipOverlay.tsx` — extracted once and re-used by every overlay.
- Disables text selection and context-menu by default (game-feel: HUD should
  never feel "web-documenty").
- Drops a fade-in animation that matches `PanelShell`.
- Applies `pointer-events: none` unless `allowPointerEvents` is set (combat
  preview wants clicks in an expanded mode; plain tooltips don't).

Positioning strategies map to classes:

| `positioning.kind`  | Applied style |
|---|---|
| `anchor-hex`       | `position: fixed; left: screenX; top: screenY; transform: flip-aware` |
| `anchor-screen`    | same, skips the hex→screen projection |
| `fixed-corner`     | `position: fixed; ${corner}: 16px` |
| `top-center`       | `position: fixed; top: 80px; left: 50%; transform: translateX(-50%)` |
| `side-rail`        | `position: fixed; top: 48px; bottom: 56px; ${side}: 0; width: 320px` |

`anchor-hex` with `offset: 'diagonal'` is the recommended mode for the *compact*
cursor tooltip — it puts the box south-east of the cursor without occluding the
focal hex.

### 3.3 Fixed-position info panel for the detailed tier

The plan is:

- **Compact tier** (no Alt): `TooltipShell` with `positioning: anchor-hex, offset:
  diagonal`. Small (width 180, height ~60). Terrain + yield summary + focused
  entity. Follows cursor.
- **Detailed tier** (on Alt *or always-on as a corner panel*): `TooltipShell` with
  `positioning: fixed-corner, corner: 'br'` — the full `DetailedTooltip` body,
  plus the new adjacency preview / territory owner / last-seen-turn rows.

The trade-off of the corner panel vs today's pop-up-on-Alt is the main UX
decision this document is opening for review:

- **Corner panel (recommended):** Always visible. Player's eye learns to
  saccade to the corner without cursor movement. Screen real-estate cost:
  ~320 × 240 px, bottom-right. Gets out of the way during combat previews by
  auto-hiding.
- **On-Alt pop-up (status quo):** Zero idle cost. Forces a key-hold for info.
  Better for experienced players, worse for new players who don't know Alt
  does anything.

A possible compromise: corner panel is collapsible (click its header to
collapse to a 40 px strip). Defaults open; can be closed; persists in
`localStorage` like the old HelpPanel `helpShown` flag.

### 3.4 Tooltip tiers + Alt-smoothing

Currently Alt-hold instantly swaps the entire tooltip. The swap is jarring —
the content block resizes from 180×90 to 300×420 in a single frame. Proposal:

1. Compact tier is always shown (same content as today).
2. Alt-hold expands a "details drawer" **beneath** the compact tier within the
   same shell, smoothly. No DOM swap, no position shift.
3. When the corner panel exists (§3.3) the drawer can also render *there*
   rather than inline.

### 3.5 Cycle mechanism (Tab)

Implementation sketch inside `HUDManager`:

```tsx
// Inside HUDManagerProvider:
useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return;
    if (target.kind !== 'hex') return;
    if (e.target instanceof HTMLInputElement) return;
    e.preventDefault();
    if (e.shiftKey) cyclePrev(); else cycleNext();
  };
  window.addEventListener('keydown', handler, { capture: true });
  return () => window.removeEventListener('keydown', handler, { capture: true });
}, [target, cycleNext, cyclePrev]);
```

In the tooltip body:

```tsx
const entities = [
  ...(contents.city ? [{ kind: 'city', data: contents.city }] : []),
  ...contents.ownUnits.map(u => ({ kind: 'own-unit', data: u })),
  ...contents.enemyUnits.map(u => ({ kind: 'enemy-unit', data: u })),
];
const focused = entities[cycleIndex % entities.length];
```

Plus a portrait strip at the top of the compact tier:

```tsx
<div className="flex gap-1 mb-1">
  {entities.map((e, i) => (
    <EntityPortrait key={i} entity={e} highlighted={i === cycleIndex % entities.length} />
  ))}
  {entities.length > 1 && (
    <span className="text-[10px] opacity-60">Tab</span>
  )}
</div>
```

### 3.6 HUD tokens

New file `packages/web/src/styles/hud-tokens.css` (imported from
`styles/index.css`). Extends the palette from `panel-tokens.css` with ambient-
overlay-specific tokens.

```css
:root {
  /* Z-index layering — ABOVE panel overlays, BELOW panel modals */
  --hud-z-ambient:    95;    /* minimap, yields toggle */
  --hud-z-hover:      120;   /* tooltip, placement hint */
  --hud-z-toast:      180;   /* notifications, validation, enemy activity */
  --hud-z-modal-hint: 200;   /* combat preview (sits above panels but below modals) */

  /* Ambient surfaces */
  --hud-tooltip-bg:          rgba(15, 23, 42, 0.92);
  --hud-tooltip-border:      rgba(148, 163, 184, 0.25);
  --hud-tooltip-border-alt:  rgba(251, 191, 36, 0.35);   /* detailed tier */

  /* Status rings (replaces ad-hoc greens/reds in CombatHoverPreview + Notifications) */
  --hud-status-good:         #22c55e;
  --hud-status-warn:         #eab308;
  --hud-status-bad:          #ef4444;

  /* Category hues (replaces raw-hex map in Notifications) */
  --hud-cat-production:      #ff8a65;
  --hud-cat-research:        #42a5f5;
  --hud-cat-civic:           #ab47bc;
  --hud-cat-warning:         #f44336;
  --hud-cat-info:            #64b5f6;

  /* Yield hues (shared by tooltip, minimap, placement hint, yields-toggle overlay) */
  --hud-yield-food:          #5da84e;
  --hud-yield-production:    #d4b85a;
  --hud-yield-gold:          #ffd54f;
  --hud-yield-science:       #42a5f5;
  --hud-yield-culture:       #ab47bc;
  --hud-yield-faith:         #f59e0b;
}
```

Once defined, every raw-hex and raw-rgba site flagged in §1.1 gets swept into
these tokens (one sweep per migration sub-cycle, not a big-bang rename).

### 3.7 Notifications redesign

Current pattern:

- `Notifications` holds a private `useState<Notification[]>` that re-derives
  from `state.log` on every state change (line 35).
- Timers auto-dismiss after 8 s.
- Category color is a raw hex switch.

Problems:

1. The notification queue is *invisible* to the rest of the app. Nothing else
   can enqueue a message. There's no way for `ValidationFeedback` to say "this
   one should be a toast" — it has to implement its own toast layer.
2. There's no priority. A "production complete" and an "enemy captured your
   city" render identically.
3. Auto-dismiss is hard-coded at 8 s — no override for urgent messages.

Proposal: consolidate under `HUDManager` as a **toast queue** with a real API:

```typescript
// Part of HUDManagerAPI
interface ToastAPI {
  readonly toasts: ReadonlyArray<Toast>;
  push: (toast: Omit<Toast, 'id' | 'createdAt'>) => string;  // returns id
  dismiss: (id: string) => void;
  clearAll: () => void;
}
interface Toast {
  readonly id:        string;
  readonly category:  'production' | 'research' | 'civic' | 'warning' | 'info' | 'combat';
  readonly title:     string;
  readonly message:   string;
  readonly createdAt: number;
  readonly ttlMs:     number;              // 0 = sticky
  readonly action?:   { label: string; onClick: () => void };   // e.g. "Open city"
}
```

- `Notifications` becomes a stateless renderer that reads the queue.
- `ValidationFeedback` calls `push({ category: 'warning', title: …, message: … })`
  instead of rolling its own DOM.
- `EnemyActivitySummary` becomes "enemy activity toasts" (or stays as a
  dedicated panel-ish view — keeps as-is in cycle 1; refactor in cycle 7).

---

## 4. Migration plan (11 sub-cycles)

Ordered lowest-risk first. Each cycle is independently testable, independently
shippable, and named in a 1-sentence goal. Dependencies are called out
explicitly where they exist.

| # | Cycle | Goal | Touched files |
|---|---|---|---|
| **a** | **HUDManager + hud-tokens.css foundation** | Introduce `HUDManagerProvider` + `useHUDManager` hook; migrate the existing `hoveredHex` piece of `useGame()` into it. Add `styles/hud-tokens.css` with the token set from §3.6. No visual change. | `providers/HUDManager.tsx` (new), `styles/hud-tokens.css` (new), `styles/index.css` (import), `providers/GameProvider.tsx` (remove `hoveredHex`) , `App.tsx` (wrap + rewire) |
| **b** | **TooltipShell component + unit tests** | Add `<TooltipShell>` and its positioning strategies. Unit-test each positioning (`anchor-hex`, `fixed-corner`, `top-center`, `side-rail`) in isolation, asserting final `left/top/transform` values. No existing overlay migrates yet. | `ui/hud/TooltipShell.tsx` (new), `ui/hud/__tests__/TooltipShell.test.tsx` (new) |
| **c** | **Migrate TooltipOverlay → TooltipShell, compact tier only** | Port the existing `LightweightTooltip` to `TooltipShell` with `positioning: anchor-hex, offset: 'diagonal'`. Kills the over-the-tile occlusion — the single most-complained-about bug. Alt-held detailed tier keeps its current path for now. | `canvas/TooltipOverlay.tsx` |
| **d** | **Tooltip compact-tier content expansion** | Add to the compact tier: territory-owner row, worked-by-city row, river/road detail line, unit-ability pills for the focused unit. Alt-held detailed tier untouched. | `canvas/TooltipOverlay.tsx`, `engine/state/TileContents.ts` (add `territoryOwner`, `workedBy` fields if not present) |
| **e** | **Tooltip detailed-tier → side-rail / corner panel** | Migrate `DetailedTooltip` to `TooltipShell` with `positioning: fixed-corner, corner: 'br'`. Default visible; collapsible; `localStorage` persistence of collapsed state. Now Alt is no longer needed to see details. | `canvas/TooltipOverlay.tsx`, `ui/hud/TileDetailPanel.tsx` (new) |
| **f** | **Stack cycle mechanism** | Add portrait strip to compact tier. Wire Tab / Shift+Tab inside `HUDManager` to advance `cycleIndex`. Reset cycle on cursor move. Focused entity drives which unit's stats are shown (compact + detailed). | `providers/HUDManager.tsx`, `canvas/TooltipOverlay.tsx`, `ui/hud/EntityPortraitStrip.tsx` (new), `ui/hud/__tests__/EntityPortraitStrip.test.tsx` (new) |
| **g** | **Notifications → HUDManager toast queue** | Extend `HUDManager` with `Toast` queue API (§3.7). Rewrite `Notifications.tsx` as a stateless queue renderer; keep the log-polling logic but route through `pushToast`. Priority ordering + per-toast TTL. | `providers/HUDManager.tsx`, `ui/components/Notifications.tsx` |
| **h** | **Migrate ValidationFeedback → toast queue** | Drop the hand-rolled gradient toast; call `pushToast({ category: 'warning', … })` with the validation payload. Keep the red-flash shake overlay as a separate sub-component. Kills the last all-Tailwind raw-color block in the HUD. | `ui/components/ValidationFeedback.tsx` |
| **i** | **Migrate CombatHoverPreview + CombatPreviewPanel → TooltipShell** | Unify the two combat preview components (today's `CombatHoverPreview` is unused; `CombatPreviewPanel` is the active one). Wrap in `<TooltipShell priority="modal-hint" positioning="anchor-hex | side-rail">`. Swap every raw rgba for `--hud-status-*` / `--color-*` tokens. Delete the dead component. | `ui/components/CombatPreviewPanel.tsx`, `ui/components/CombatHoverPreview.tsx` (delete), `canvas/GameCanvas.tsx` (update combat state), `App.tsx` |
| **j** | **Minimap polish + EnemyActivitySummary migration** | Minimap: move hand-coded palette into `hud-tokens.css` as `--hud-minimap-*`. Add mouse-drag-to-pan. Add fog polish. EnemyActivitySummary: wrap in `<TooltipShell positioning="top-center" priority="toast">` (or fold into the toast queue as a sticky multi-event toast). | `ui/components/Minimap.tsx`, `ui/components/EnemyActivitySummary.tsx`, `styles/hud-tokens.css` |
| **k** | **TurnTransition + UrbanPlacementHintBadge wiring** | TurnTransition: wrap in `<TooltipShell priority="modal-hint" positioning="fixed inset-0">`. UrbanPlacementHintBadge: wire it up for the first time (file currently says "NOT wired") — when `placementMode && hoveredHex`, render badge above the target hex via `<TooltipShell positioning="anchor-hex">`. | `ui/components/TurnTransition.tsx`, `ui/components/UrbanPlacementHintBadge.tsx`, `App.tsx`, `canvas/GameCanvas.tsx` |
| **l** | **Docs + skill: `.claude/rules/hud.md` + `.claude/skills/add-hud-element/SKILL.md`** | Write the ruleset mirroring `.claude/rules/panels.md`. Writes a step-by-step skill for adding a new HUD overlay (choose a positioning strategy, register an id if the manager needs one, wrap in `<TooltipShell>`, test). Final cycle — only docs. | `.claude/rules/hud.md` (new), `.claude/skills/add-hud-element/SKILL.md` (new), `CLAUDE.md` (add HUD section pointer) |

### 4.1 Dependency graph

- **a** → **b** → **c** is a straight chain and must ship first.
- **d** can run in parallel with **e** (disjoint tiers of the same file; OK
  because **c** split them structurally).
- **f** depends on **c** (requires `TooltipShell`) and on **a** (requires
  `cycleIndex` in `HUDManager`).
- **g** depends only on **a**.
- **h** depends on **g** (needs the toast queue).
- **i** depends on **b** (needs the shell).
- **j**, **k** depend on **b** only.
- **l** depends on everything — it writes the rules after they exist.

Roughly the first 60% of risk is in **a** / **b** / **c**. The remaining eight
cycles are mechanical edits once the foundations are in place.

### 4.2 Recommended first sub-cycle

**Cycle (c) — "Migrate TooltipOverlay compact tier to `TooltipShell` with
diagonal offset positioning"** is the highest-signal first landing *if* **a**
and **b** ship together. It directly closes the user's loudest complaint (the
tooltip covering the focal hex), it touches exactly one file, and the
regression risk is bounded to one component.

If we want a smaller, even safer first step: cycle **a** alone (HUDManager
context + tokens) is zero-visual-change, and sets up every subsequent cycle.

---

## 5. Cross-cutting concerns

### 5.1 Interaction with PanelManager

HUD elements stay **below** panel modals but **above** panel overlays. The
z-index contract in tokens:

```
--panel-z-info      = 90        (Event Log)
--hud-z-ambient     = 95        (Minimap, YieldsToggle)
--panel-z-overlay   = 110       (most panels)
--hud-z-hover       = 120       (tile tooltip)
--hud-z-toast       = 180       (toasts)
--hud-z-modal-hint  = 200       (combat preview)
--panel-z-modal     = 210       (Crisis, Victory)
```

Rationale: a panel should hide the minimap (a panel is a focused task, you
don't need map glance). But a panel should *not* hide a tooltip — the player
can still mouse over the map behind the panel if the panel is right-anchored
and non-modal. Combat previews are HUD-priority but sit above panels because
hovering an enemy while a panel is open is a weird edge case and the preview
is the more relevant UI in that moment. Modals beat everything — they block
input by design.

### 5.2 Canvas/UI boundary

Today `TooltipOverlay` lives in `canvas/`. That's a minor violation of
`.claude/rules/import-boundaries.md` — it imports React components from `ui/`
(`UnitStateTooltip`, line 15). The boundary rule says `canvas/` cannot import
from `ui/`. This is a pre-existing issue this audit does not introduce.

**Proposal:** during cycle **c**, move `TooltipOverlay.tsx` to
`ui/hud/TileTooltip.tsx`. The file's only canvas dependency is
`hexToPixel(coord)` and `camera.worldToScreen(...)` — both of which are pure
math and can be exposed via `@hex/engine` / a `utils/` helper instead of an
import from `canvas/`. That restores the boundary and makes the migration
cleanly UI-side.

### 5.3 Testing

Mirrors M31's pattern:

- **Shell tests** (once): `TooltipShell.test.tsx` exercises each positioning
  strategy with a dummy anchor, asserts final DOM rect.
- **Manager tests** (once): `HUDManager.test.tsx` exercises cycle, cursor
  reset, toast queue push/dismiss/clearAll.
- **Per-overlay tests**: body-behavior only — do not re-test shell chrome.
- **E2E** (Playwright): the `tooltip-overlay` test-id already exists
  (`TooltipOverlay.tsx:454`); the new side-rail detail panel gets
  `data-testid="hud-tile-detail-panel"`.

### 5.4 Engine changes needed

Most of the HUD work is UI-only. But §2.2 flags three gaps that require engine
data the UI can't derive:

1. **Territory owner per tile.** `TileContents` today returns `city` only if
   the hex IS the city center. To show "This tile is worked by Rome" the
   engine needs a `workedByCity: CityId | null` field. The data already exists
   in city state (worked tiles are tracked); it just isn't exposed through
   `getTileContents`.
2. **Last-seen turn for fogged tiles.** `PlayerState.explored` is a `Set<string>`
   that loses temporal info. Either upgrade to `Map<string, turn>` or accept
   "explored but unknown-since-when" as a known gap.
3. **Adjacency preview for a hypothetical placement.** The M22
   `scoreBuildingPlacement` helper in `engine/state/UrbanPlacementHints.ts`
   already returns this; cycle **k** just needs to wire it into the HUD
   during placement mode.

These are small scope-adjacent items; each can land in its own sub-cycle or be
folded into the cycle that needs them (1 into **d**, 3 into **k**).

---

## 6. Non-goals

This refactor explicitly does **NOT**:

- Redesign the game canvas / renderer. `HexRenderer`, `AnimationManager`,
  `Camera` are untouched.
- Change the panel layer (that is M31's scope). HUD layer only.
- Add new content (no new units, buildings, resources, terrain features).
- Rewrite the Tooltip primitive in `ui/components/tooltips/` beyond converging
  the two duplicates (`Tooltip.tsx` top-level vs `tooltips/Tooltip.tsx`).
  Those are wrapper tooltips for UI panels — they're already consistent with
  `TooltipContent`; the HUD-layer tooltip is a different beast.
- Introduce a route / URL reflection for HUD state.
- Build animations beyond the simple fade-in `TooltipShell` provides. Bespoke
  animations (combat arrows, damage numbers) stay in `AnimationRenderer`.
- Move `ResourceChangeBadge` — it lives inside the animation system and
  doesn't belong in the hover/focus HUD.

---

## 7. Summary

The HUD layer today is ten components scattered across two folders
(`canvas/`, `ui/components/`) with four disjoint z-index tiers, three
independent positioning strategies, two duplicate Tooltip primitives, one
unwired hint badge, one dead `CombatHoverPreview`, and zero shared chrome.

The tile tooltip in particular:

1. Anchors above the focal hex and *covers* its north-ward neighbours — the
   opposite of what hover should do.
2. Shows terrain + compact yields but misses territory ownership, adjacency
   preview, worked-by-city, road/river detail, and last-seen-turn for fog.
3. Cannot cycle through stacked entities — a civilian under a military stack
   is a "×2" number with no way to focus it.

A single `HUDManager` context, a single `TooltipShell`, a single `hud-tokens.css`
set, and a toast queue on the manager fix every one of those issues without
touching the engine or the panel layer. Migration is 11 sub-cycles, each small,
each shippable on its own, ordered so the user-visible wins (cycles c / d / e /
f) land before the infrastructural cleanups (g / h / i / j / k) and the docs
cycle (l) closes the loop.

The five loudest problems, ranked by user-visibility:

1. **Tooltip occludes the focal hex** — the position is above the cursor, but
   the box extends two hex-rows further up. Diagonal offset fixes this.
2. **No stack cycling** — second unit in a stack is unreachable from the
   tooltip. Portrait strip + Tab fixes this.
3. **Info gaps** — territory owner, adjacency preview, worked-by-city, roads,
   rivers, fog-of-war temporal state are all missing from the tooltip.
4. **Z-index chaos** — four tiers (`20` / `40` / `50` / `900` / `1000`) that
   don't respect the panel manager's layers. Tokens + priority prop fix this.
5. **Hand-rolled everything** — 100% Tailwind in `ValidationFeedback`, raw
   hex maps in `Notifications`, duplicate Tooltip primitives. Tokens + shared
   shell fix this.

**Recommended first sub-cycle:** ship **a** (HUDManager + tokens) and **b**
(TooltipShell) together, then ship **c** (migrate tile-tooltip compact tier to
diagonal offset). That kills complaint #1 directly, sets up complaints #2–#5
for mechanical follow-up, and is a single ~400-line diff.
