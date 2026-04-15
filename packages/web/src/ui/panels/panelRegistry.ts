/**
 * panelRegistry — single source of truth for panel identifiers, titles,
 * keyboard shortcuts, and priority class.
 *
 * Cycle 1 of the panel-manager refactor (see
 * `.claude/workflow/design/panel-manager-audit.md`). This file is pure
 * data — no React, no DOM. It lives web-side because the concept of
 * "panel" is a UI concern; the engine is panel-agnostic.
 *
 * Adding a new panel:
 *   1. Add its id to the `PanelId` union.
 *   2. Add an entry to `PANEL_REGISTRY` with title + priority.
 *   3. (Later cycles) wire the component through `PanelShell`.
 */

export type PanelId =
  | 'help'
  | 'city'
  | 'tech'
  | 'civics'
  | 'diplomacy'
  | 'log'
  | 'age'
  | 'turnSummary'
  | 'governors'
  | 'religion'
  | 'government'
  | 'commanders'
  | 'victoryProgress'
  | 'crisis';

/**
 * Panel priority — controls z-index, backdrop, and input-blocking.
 *
 * - `modal`   — blocks interaction with the map (e.g. AgeTransitionPanel,
 *               VictoryProgressPanel once wired). Rendered with a backdrop.
 * - `overlay` — floats over the map but doesn't block (CityPanel,
 *               TechTreePanel, DiplomacyPanel). Most panels are here.
 * - `info`    — non-blocking side-column panels (EventLogPanel).
 */
export type PanelPriority = 'modal' | 'overlay' | 'info';

export interface PanelRegistryEntry {
  readonly id: PanelId;
  readonly title: string;
  /** Emoji shorthand — displayed in panel title bar / menus. */
  readonly icon?: string;
  /** Single-character keyboard shortcut (case-insensitive). */
  readonly keyboardShortcut?: string;
  readonly priority: PanelPriority;
}

/**
 * Full list. Keep in sync with `PanelId`.
 * Shortcuts preserved from existing App.tsx behavior:
 *   H — help (App.tsx:56–58)
 *   T — tech tree (TopBar keyboard hint)
 *   Y — civics tree (TopBar keyboard hint)
 * Other shortcuts are placeholders; later cycles can wire them up.
 */
export const PANEL_REGISTRY: ReadonlyMap<PanelId, PanelRegistryEntry> = new Map<PanelId, PanelRegistryEntry>([
  ['help',            { id: 'help',            title: 'Help',                icon: '❓',  keyboardShortcut: 'H', priority: 'overlay' }],
  ['city',            { id: 'city',            title: 'City',                icon: '🏛️',  priority: 'overlay' }],
  ['tech',            { id: 'tech',            title: 'Technology',          icon: '🔬', keyboardShortcut: 'T', priority: 'overlay' }],
  ['civics',          { id: 'civics',          title: 'Civics',              icon: '🎭', keyboardShortcut: 'Y', priority: 'overlay' }],
  ['diplomacy',       { id: 'diplomacy',       title: 'Diplomacy',           icon: '🕊️',  priority: 'overlay' }],
  ['log',             { id: 'log',             title: 'Event Log',           icon: '📜', priority: 'info'    }],
  ['age',             { id: 'age',             title: 'Age Transition',      icon: '⏳', priority: 'modal'   }],
  ['turnSummary',     { id: 'turnSummary',     title: 'Turn Summary',        icon: '📊', priority: 'modal'   }],
  ['governors',       { id: 'governors',       title: 'Governors',           icon: '👑', priority: 'overlay' }],
  ['religion',        { id: 'religion',        title: 'Religion',            icon: '⛪', priority: 'overlay' }],
  ['government',      { id: 'government',      title: 'Government',          icon: '🏛️',  priority: 'overlay' }],
  ['commanders',      { id: 'commanders',      title: 'Commanders',          icon: '⚔️',  priority: 'overlay' }],
  ['victoryProgress', { id: 'victoryProgress', title: 'Victory Progress',    icon: '🏆', priority: 'modal'   }],
  ['crisis',          { id: 'crisis',          title: 'Crisis',              icon: '⚠️',  priority: 'modal'   }],
]);

/** Convenience: all ids in registration order. */
export const ALL_PANEL_IDS: ReadonlyArray<PanelId> = [...PANEL_REGISTRY.keys()];
