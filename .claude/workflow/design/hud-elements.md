# HUD Elements — Running Registry

This doc is the human-readable index of every HUD / overlay element currently in the tree. It pairs with `packages/web/src/ui/hud/hudRegistry.ts`, whose `HUDElementId` union is the type-level source of truth. When the two disagree, the registry file wins — but reviewers should expect this doc to track it within one cycle. Add a row here whenever you land a new overlay (the `/add-hud-element` skill's checklist enforces it); update or remove rows when an overlay's shell mode, tier behavior, or sticky flag changes.

The "shell mode" column matches `TooltipShell`'s `position` prop where applicable. The "tier" column says whether the overlay supports the Alt-held detailed tier or is compact-only. The "sticky" column says whether the overlay survives pointer-leave and waits for ESC / explicit dismissal.

| id (hudRegistry) | file | shell mode | tier | sticky | notes |
|------------------|------|------------|------|--------|-------|
| tileTooltip | packages/web/src/ui/hud/TooltipOverlay.tsx | TooltipShell floating | compact / detailed (Alt) | no | Stack-cycle via `HUDManager.cycleIndex` for multi-entity hexes; Tab to cycle. M37-B duplicate-content regression test guards single-entity rendering. |
| combatPreview | packages/web/src/ui/components/CombatHoverPreview.tsx | TooltipShell fixed-corner | detailed | yes | Shown while a unit is selected and the cursor hovers an attackable target. Detailed-only; auto-dismisses on selection clear. |
| notification | packages/web/src/ui/components/Notifications.tsx | TooltipShell fixed-corner (toast queue) | detailed | no | Auto-dismiss after `defaultTimeout` (5000 ms). Stacked vertically along the right edge. |
| validationFeedback | packages/web/src/ui/components/ValidationFeedback.tsx | TooltipShell fixed-corner | compact | yes | Shows the last `state.lastValidation` rejection. Auto-dismiss after `defaultTimeout` (2500 ms) or on next valid action. |
| enemyActivitySummary | packages/web/src/ui/components/EnemyActivitySummary.tsx | TooltipShell fixed-corner | detailed | yes | Post-AI-turn summary. Player dismisses explicitly (ESC or button) before resuming. |
| turnTransition | packages/web/src/ui/components/TurnTransition.tsx | TooltipShell fixed-corner + backdrop | detailed | yes | Brief animated interstitial between player turns. Auto-dismiss after `defaultTimeout` (1200 ms). |
| urbanPlacementHint | packages/web/src/ui/hud/UrbanPlacementHintBadge.tsx | TooltipShell floating | detailed | no | Shown only while `BuildingPlacementPanel` is in placement mode. Anchored to candidate tiles; surfaces adjacency / score preview. |
| minimap | packages/web/src/ui/components/Minimap.tsx | (no TooltipShell — uses `panel-tokens` chrome directly with fixed-corner positioning) | — | yes | Always-mounted while a game is in progress. Exposes `data-hud-id="minimap"` for E2E selectors. Game-feel invariants (no text selection, no context menu) come from the global `.game-app` rules, not from the shell. |
| tooltip | (generic, on-demand) | TooltipShell floating | compact | no | Reserved generic id for short hover tooltips not tied to a specific HUD element (e.g. button-help bubbles). Body callers use it directly without a dedicated component file. |
| yieldsToggle | packages/web/src/ui/components/YieldsToggle.tsx | TooltipShell floating | compact | no | Toggle button for the on-map yield-overlay display. Hover reveals keyboard shortcut (Y) and current state. |
| labelsToggle | packages/web/src/ui/components/LabelsToggle.tsx | TooltipShell floating | compact | no | Toggle button for unit-type text label pills on the canvas. Keyboard shortcut: L. When active, each unit icon shows its type name below it for readability. |
| resourceTooltip | packages/web/src/ui/hud/ResourceTooltip.tsx | TooltipShell floating | compact | no | Appears when the cursor hovers a tile that has a resource (iron, wheat, silk, etc.). Shows resource name, type badge (bonus/strategic/luxury), yield contributions, happiness bonus (luxury only), and unlock status (requires tech / always available). offset="large" so it sits in a different quadrant from tileTooltip. |
| idleUnitsToast | packages/web/src/ui/components/IdleUnitsToast.tsx | TooltipShell fixed-corner | detailed | no | Brief "No idle units" message shown when J is pressed but no unit with movement remains. Auto-dismisses after `defaultTimeout` (2500 ms). Triggered by a `triggerCount` prop that increments on each J press so consecutive presses refresh the timer. |
| happinessProgress | packages/web/src/ui/hud/HappinessHUD.tsx | (no TooltipShell — fixed-position HUD element) | — | no | Celebrations progress bar showing empire happiness vs next celebration threshold. Fixed at bottom-left. Glows gold when threshold reached. |

## Cross-checking against `hudRegistry.ts`

`HUDElementId` in `packages/web/src/ui/hud/hudRegistry.ts` defines the canonical id list. Every entry above maps to one id in that union. If you find a row here that isn't in the union, or vice versa, the union wins — fix this doc.

The registry also declares each id's `priority` (`floating` / `fixed` / `toast`), which maps to z-index in `hud-tokens.css`. The "shell mode" column above is more granular (it captures `TooltipShell`'s `position` prop choice) but is consistent with the registry priority:

- `priority: floating` → `TooltipShell position="floating"` (tileTooltip, urbanPlacementHint, tooltip)
- `priority: fixed` → `TooltipShell position="fixed-corner"` or no shell (combatPreview, enemyActivitySummary, turnTransition, minimap)
- `priority: toast` → `TooltipShell position="fixed-corner"` with auto-dismiss timeout (notification, validationFeedback)

## Related references

- Rules: `.claude/rules/ui-overlays.md`
- Skill: `.claude/skills/add-hud-element/SKILL.md`
- Original audit: `.claude/workflow/design/hud-ui-audit.md`
- Foundation: `packages/web/src/ui/hud/`, `packages/web/src/styles/hud-tokens.css`
