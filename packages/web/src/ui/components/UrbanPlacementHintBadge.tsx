import type { HexCoord, BuildingId } from '@hex/engine';

/**
 * Structural mirror of `PlacementScore` from
 * `@hex/engine/state/UrbanPlacementHints` (M18 helper).
 *
 * Defined locally (rather than type-imported) because the M18 helper is
 * not yet re-exported through the engine barrel. When adoption happens
 * in a later cycle, swap this to:
 *
 *   import type { PlacementScore } from '@hex/engine';
 *
 * The field shape mirrors the engine definition exactly so that
 * structural typing allows drop-in replacement.
 */
export interface PlacementScore {
  readonly tile: HexCoord;
  readonly buildingId: BuildingId;
  readonly scoreFood: number;
  readonly scoreProduction: number;
  readonly scoreScience: number;
  readonly scoreCulture: number;
  readonly scoreGold: number;
  readonly scoreTotal: number;
  readonly valid: boolean;
}

/**
 * UrbanPlacementHintBadge — small floating overlay showing the per-yield
 * breakdown of a candidate (buildingId, tile) placement.
 *
 * Pure presentational component. Reads the scoring output produced by
 * `scoreBuildingPlacement` (engine/state/UrbanPlacementHints) and renders
 * it above the hex it refers to. Three visual states:
 *
 *   1. `score.valid === false` — red "blocked" badge (rejected by
 *      BuildingPlacementValidator — enemy territory, tile at cap, etc.).
 *   2. Valid but `scoreTotal === 0` — dimmed "no bonuses" label
 *      (placement is legal but wouldn't earn any of the five scored
 *      yields on this tile).
 *   3. Valid and `scoreTotal > 0` — flex-row showing one emoji + value
 *      entry per non-zero yield component (🍞 food, ⚙️ production,
 *      📚 science, 🎭 culture, 💰 gold).
 *
 * Positioned absolutely at (screenX, screenY) with a translate(-50%, -100%)
 * so the badge sits just above the target hex. Pointer events are disabled
 * so the badge never intercepts clicks / hovers on the canvas below.
 *
 * NOT wired into App.tsx or GameCanvas. A later cycle will supply the
 * screen coordinates (from the camera/renderer) and the score (from the
 * UrbanPlacementHints helper) during the building placement flow.
 */
export interface UrbanPlacementHintBadgeProps {
  readonly score: PlacementScore;
  readonly screenX: number;
  readonly screenY: number;
  readonly visible?: boolean;
}

interface YieldEntry {
  readonly emoji: string;
  readonly label: string;
  readonly value: number;
}

/**
 * Project a PlacementScore onto the ordered list of yield entries the
 * badge cares about. Order matches the canonical yield ordering elsewhere
 * in the UI (food → production → science → culture → gold).
 */
function yieldEntries(score: PlacementScore): ReadonlyArray<YieldEntry> {
  return [
    { emoji: '🍞', label: 'food', value: score.scoreFood },
    { emoji: '⚙️', label: 'production', value: score.scoreProduction },
    { emoji: '📚', label: 'science', value: score.scoreScience },
    { emoji: '🎭', label: 'culture', value: score.scoreCulture },
    { emoji: '💰', label: 'gold', value: score.scoreGold },
  ];
}

export function UrbanPlacementHintBadge({
  score,
  screenX,
  screenY,
  visible = true,
}: UrbanPlacementHintBadgeProps) {
  if (!visible) return null;

  // Offset the badge slightly above the hex (translate -100% Y + 8px gap).
  const rootStyle: React.CSSProperties = {
    position: 'absolute',
    left: screenX,
    top: screenY,
    transform: 'translate(-50%, calc(-100% - 8px))',
    pointerEvents: 'none',
    zIndex: 900,
  };

  // --- State 1: blocked ---
  if (!score.valid) {
    return (
      <div
        data-testid="urban-placement-hint-badge"
        data-state="blocked"
        className="rounded-md shadow-lg px-2 py-1 flex items-center gap-1 text-xs font-semibold"
        style={{
          ...rootStyle,
          backgroundColor: 'rgba(127, 29, 29, 0.92)',
          border: '1px solid rgba(239, 68, 68, 0.6)',
          color: 'rgba(254, 202, 202, 1)',
          backdropFilter: 'blur(4px)',
        }}
      >
        <span style={{ color: 'rgba(248, 113, 113, 1)' }}>✕</span>
        <span>blocked</span>
      </div>
    );
  }

  const entries = yieldEntries(score).filter((entry) => entry.value !== 0);

  // --- State 2: valid, but no non-zero yield contributions ---
  if (entries.length === 0 || score.scoreTotal === 0) {
    return (
      <div
        data-testid="urban-placement-hint-badge"
        data-state="empty"
        className="rounded-md shadow-lg px-2 py-1 text-xs italic"
        style={{
          ...rootStyle,
          backgroundColor: 'rgba(17, 24, 39, 0.85)',
          border: '1px solid rgba(75, 85, 99, 0.4)',
          color: 'rgba(156, 163, 175, 0.85)',
          backdropFilter: 'blur(4px)',
        }}
      >
        no bonuses
      </div>
    );
  }

  // --- State 3: valid breakdown ---
  return (
    <div
      data-testid="urban-placement-hint-badge"
      data-state="breakdown"
      className="rounded-md shadow-lg px-2 py-1 flex flex-row items-center gap-2 text-xs font-medium"
      style={{
        ...rootStyle,
        backgroundColor: 'rgba(17, 24, 39, 0.92)',
        border: '1px solid rgba(59, 130, 246, 0.5)',
        color: 'rgba(229, 231, 235, 1)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {entries.map((entry) => (
        <span
          key={entry.label}
          data-testid={`urban-placement-hint-yield-${entry.label}`}
          className="inline-flex items-center gap-0.5"
          style={{
            color:
              entry.value > 0
                ? 'rgba(134, 239, 172, 1)'
                : 'rgba(252, 165, 165, 1)',
          }}
        >
          <span aria-hidden="true">{entry.emoji}</span>
          <span>
            {entry.value > 0 ? '+' : ''}
            {entry.value}
          </span>
        </span>
      ))}
    </div>
  );
}
