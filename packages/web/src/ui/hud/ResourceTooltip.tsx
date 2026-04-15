/**
 * ResourceTooltip — hover overlay for map tiles that contain a resource.
 *
 * Appears when the cursor rests over a hex whose `tile.resource` is
 * non-null and visible to the current player. Shows:
 *   - Resource name + type badge (bonus / strategic / luxury)
 *   - Yield contribution (food / production / gold / …)
 *   - Whether the current player has this resource unlocked (has the
 *     tech required by the improvement that harvests it, or always-
 *     available for bonus resources whose improvement needs no tech)
 *
 * Positioning: `TooltipShell position="floating"` with `offset="large"`
 * so it renders away from the tile tooltip (which anchors at the same
 * hex with `offset="auto"`). Pointer-events are disabled so the overlay
 * does not interrupt canvas hover / click on the tile.
 *
 * ESC and lifecycle: non-sticky; disappears when the player moves the
 * cursor off the tile (parent stops rendering it). ESC-dismiss is handled
 * by `HUDManager` — no per-component handler.
 *
 * Styled exclusively from `var(--hud-*)` and `var(--panel-*)` tokens.
 * No raw hex, no Tailwind color utilities.
 */

import { useEffect, useRef } from 'react';
import type { HexCoord, GameState } from '@hex/engine';
import { ALL_RESOURCES, ALL_IMPROVEMENTS, coordToKey } from '@hex/engine';
import { TooltipShell } from './TooltipShell';
import { useHUDManager } from './HUDManager';

// ─── Unlock logic (pure) ──────────────────────────────────────────────────

/**
 * Determine the tech id (if any) required to harvest a given resource by
 * finding the first improvement whose `prerequisites.resource` list
 * includes that resource id, then returning that improvement's
 * `requiredTech`. Returns `null` when no specific tech is needed
 * (e.g. bonus resources harvestable by Farm which has `requiredTech: null`).
 */
function getRequiredTechForResource(resourceId: string): string | null {
  for (const imp of ALL_IMPROVEMENTS) {
    const resourceList = imp.prerequisites.resource;
    if (resourceList && resourceList.includes(resourceId)) {
      return imp.requiredTech;
    }
  }
  // Resource not found in any improvement's prerequisite list — no tech needed.
  return null;
}

/**
 * True when the current player has unlocked the given resource:
 *   - Bonus resources with no harvest-tech requirement are always unlocked.
 *   - All others require the corresponding tech to be in
 *     `player.researchedTechs`.
 */
function isResourceUnlocked(
  resourceId: string,
  state: GameState,
): boolean {
  const player = state.players.get(state.currentPlayerId);
  if (!player) return false;

  const requiredTech = getRequiredTechForResource(resourceId);
  if (requiredTech === null) return true;

  return player.researchedTechs.includes(requiredTech);
}

// ─── Type badge helpers ───────────────────────────────────────────────────

type ResourceType = 'bonus' | 'strategic' | 'luxury';

/** Color token per resource type — from the established hud-tokens palette. */
function typeBadgeStyle(type: ResourceType): { color: string; backgroundColor: string } {
  switch (type) {
    case 'luxury':
      return {
        color: 'var(--hud-tooltip-heading-strong)',
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
      };
    case 'strategic':
      return {
        color: 'var(--hud-tooltip-improvement)',
        backgroundColor: 'rgba(147, 197, 253, 0.12)',
      };
    case 'bonus':
      return {
        color: 'var(--hud-tooltip-own-civilian)',
        backgroundColor: 'rgba(187, 247, 208, 0.10)',
      };
  }
}

// ─── Tooltip body ─────────────────────────────────────────────────────────

interface ResourceTooltipBodyProps {
  readonly resourceId: string;
  readonly state: GameState;
}

function ResourceTooltipBody({ resourceId, state }: ResourceTooltipBodyProps) {
  const resource = ALL_RESOURCES.find(r => r.id === resourceId);
  if (!resource) return null;

  const unlocked = isResourceUnlocked(resourceId, state);
  const requiredTech = getRequiredTechForResource(resourceId);
  const badge = typeBadgeStyle(resource.type);

  // Collect non-zero yield entries.
  const yields = resource.yieldBonus;
  const yieldEntries: { label: string; value: number }[] = [];
  if (yields.food)       yieldEntries.push({ label: '🌾', value: yields.food });
  if (yields.production) yieldEntries.push({ label: '🔨', value: yields.production });
  if (yields.gold)       yieldEntries.push({ label: '💰', value: yields.gold });
  if (yields.science)    yieldEntries.push({ label: '🔬', value: yields.science });
  if (yields.culture)    yieldEntries.push({ label: '🎭', value: yields.culture });
  if (yields.faith)      yieldEntries.push({ label: '⛪', value: yields.faith });

  // Happiness bonus (luxury only).
  const happiness = resource.happinessBonus;

  return (
    <div
      data-testid="resource-tooltip-body"
      className="text-xs"
      style={{ minWidth: '150px', lineHeight: '1.55' }}
    >
      {/* Resource name + type badge on the same row */}
      <div
        className="flex items-center gap-2 mb-1"
      >
        <span
          data-testid="resource-tooltip-name"
          className="font-semibold"
          style={{ color: 'var(--hud-tooltip-resource)' }}
        >
          ★ {resource.name}
        </span>
        <span
          data-testid="resource-tooltip-type"
          className="capitalize font-normal"
          style={{
            fontSize: '10px',
            padding: '1px 5px',
            borderRadius: 'var(--hud-radius)',
            color: badge.color,
            backgroundColor: badge.backgroundColor,
          }}
        >
          {resource.type}
        </span>
      </div>

      {/* Yields */}
      {yieldEntries.length > 0 && (
        <div
          data-testid="resource-tooltip-yields"
          className="flex flex-wrap gap-2 mb-1"
          style={{ color: 'var(--hud-text-muted)' }}
        >
          {yieldEntries.map(({ label, value }) => (
            <span key={label}>
              {label} +{value}
            </span>
          ))}
        </div>
      )}

      {/* Happiness bonus for luxury resources */}
      {happiness > 0 && (
        <div
          data-testid="resource-tooltip-happiness"
          style={{ color: 'var(--hud-tooltip-positive)', marginBottom: '2px' }}
        >
          😊 +{happiness} happiness
        </div>
      )}

      {/* Unlock status */}
      <div
        data-testid="resource-tooltip-unlock"
        style={{
          marginTop: '4px',
          paddingTop: '4px',
          borderTop: '1px solid var(--hud-border)',
          color: unlocked ? 'var(--hud-tooltip-positive)' : 'var(--hud-text-muted)',
          fontSize: '11px',
        }}
      >
        {requiredTech === null ? (
          '✓ Always available'
        ) : unlocked ? (
          '✓ Unlocked'
        ) : (
          <>
            <span style={{ color: 'var(--hud-tooltip-negative)' }}>✗ Locked — </span>
            requires{' '}
            <span style={{ color: 'var(--hud-text-color)' }}>
              {/* Capitalise the tech id for display */}
              {requiredTech.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main export ─────────────────────────────────────────────────────────

interface ResourceTooltipProps {
  /**
   * Hex → absolute viewport coordinate projector. Supplied by the
   * App-level glue that owns the camera; keeps this component out of
   * the canvas/ → ui/ import boundary.
   */
  readonly hexToScreen: (q: number, r: number) => { readonly x: number; readonly y: number } | null;
  /** Currently hovered hex, or null when nothing is hovered. */
  readonly hoveredHex: HexCoord | null;
  /** Full game state — needed to read tile resource and player techs. */
  readonly state: GameState;
}

/**
 * Floating tooltip that appears when the cursor hovers over a map tile
 * containing a resource. Manages its own HUDManager registration and
 * renders through `TooltipShell`. Disappears when the cursor leaves the
 * tile (parent stops rendering it on null hoveredHex).
 */
export function ResourceTooltip({
  hexToScreen,
  hoveredHex,
  state,
}: ResourceTooltipProps) {
  const hud = useHUDManager();

  // Register with HUDManager so ESC and cycle infrastructure are aware of
  // this overlay. We capture the latest register/dismiss in a ref to avoid
  // making them deps of the effect (same pattern as TooltipOverlay).
  const hudRef = useRef(hud);
  hudRef.current = hud;
  const anchorKey = hoveredHex ? coordToKey(hoveredHex) : null;
  useEffect(() => {
    if (anchorKey === null) return;
    const unregister = hudRef.current.register('resourceTooltip', { sticky: false, anchorKey });
    return unregister;
  }, [anchorKey]);

  if (!hoveredHex) return null;

  // Resolve the tile's resource from map state.
  const tileKey = coordToKey(hoveredHex);
  const tile = state.map.tiles.get(tileKey);
  if (!tile || !tile.resource) return null;

  // Verify the hex is projectable (on-camera).
  const projected = hexToScreen(hoveredHex.q, hoveredHex.r);
  if (!projected) return null;

  return (
    <TooltipShell
      id="resourceTooltip"
      anchor={{ kind: 'hex', q: hoveredHex.q, r: hoveredHex.r }}
      position="floating"
      tier="compact"
      offset="large"
      hexToScreen={hexToScreen}
    >
      <ResourceTooltipBody
        resourceId={tile.resource}
        state={state}
      />
    </TooltipShell>
  );
}
