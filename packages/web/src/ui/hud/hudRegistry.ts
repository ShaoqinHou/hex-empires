/**
 * hudRegistry — single source of truth for HUD / overlay identifiers.
 *
 * Mirrors `panelRegistry.ts` for the HUD / tooltip / overlay layer. Pure
 * data — no React, no DOM. The concept of "HUD element" is a UI concern
 * and this registry lives web-side for the same reasons the panel
 * registry does.
 *
 * Cycle (a) of the HUD UI rethink (see
 * `.claude/workflow/design/hud-ui-audit.md`). Later cycles wire each
 * overlay through `HUDManager` + `TooltipShell`; this file simply
 * enumerates the ids the migration will touch.
 *
 * Adding a new HUD element:
 *   1. Add its id to the `HUDElementId` union.
 *   2. Add an entry to `HUD_REGISTRY` with priority + optional timeout.
 *   3. (Later cycles) wire the component through `TooltipShell` and
 *      `HUDManager.register(id, ...)`.
 */

export type HUDElementId =
  | 'tileTooltip'
  | 'combatPreview'
  | 'notification'
  | 'validationFeedback'
  | 'turnTransition'
  | 'minimap'
  | 'enemyActivitySummary'
  | 'urbanPlacementHint'
  | 'tooltip'
  | 'yieldsToggle';

/**
 * HUD element priority — maps to the z-index tier in `hud-tokens.css`.
 *
 * - `floating` — follows the cursor / anchor; tile tooltip, placement
 *                hint, generic tooltip.
 * - `fixed`    — snaps to a fixed screen position; minimap,
 *                turn-transition overlay, enemy activity summary,
 *                combat preview in detailed tier.
 * - `toast`    — transient, queued messages; notifications, validation
 *                feedback.
 */
export type HUDPriority = 'floating' | 'fixed' | 'toast';

export interface HUDRegistryEntry {
  readonly id: HUDElementId;
  readonly priority: HUDPriority;
  /**
   * Optional auto-dismiss timeout in ms. Toasts and validation feedback
   * use this; floating tooltips drive their visibility off cursor state
   * so they omit it.
   */
  readonly defaultTimeout?: number;
}

export const HUD_REGISTRY: ReadonlyMap<HUDElementId, HUDRegistryEntry> = new Map<HUDElementId, HUDRegistryEntry>([
  ['tileTooltip',          { id: 'tileTooltip',          priority: 'floating' }],
  ['combatPreview',        { id: 'combatPreview',        priority: 'fixed'    }],
  ['notification',         { id: 'notification',         priority: 'toast',    defaultTimeout: 5000 }],
  ['validationFeedback',   { id: 'validationFeedback',   priority: 'toast',    defaultTimeout: 2500 }],
  ['turnTransition',       { id: 'turnTransition',       priority: 'fixed',    defaultTimeout: 1200 }],
  ['minimap',              { id: 'minimap',              priority: 'fixed'    }],
  ['enemyActivitySummary', { id: 'enemyActivitySummary', priority: 'fixed'    }],
  ['urbanPlacementHint',   { id: 'urbanPlacementHint',   priority: 'floating' }],
  ['tooltip',              { id: 'tooltip',              priority: 'floating' }],
  ['yieldsToggle',         { id: 'yieldsToggle',         priority: 'floating' }],
]);

/** Convenience: all ids in registration order. */
export const ALL_HUD_ELEMENT_IDS: ReadonlyArray<HUDElementId> = [...HUD_REGISTRY.keys()];
