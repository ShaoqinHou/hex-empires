/**
 * notificationCategoryRegistry.ts — Phase 5.3
 *
 * Pure-data registry mapping each NotificationCategory to its visual treatment,
 * dismiss timing, sound effect, panel target, and requiresAction flag.
 *
 * Mirrors the shape of panelRegistry.ts — no React, no DOM. A single source of
 * truth that Notifications.tsx reads; adding a new category means one entry here.
 *
 * Open-question defaults (per brief parent):
 *   Q1 hostile-diplomacy right-click: allowed (use existing right-click-to-dismiss)
 *   Q2 age accent token: var(--color-accent) — existing bronze
 *   Q3 overflow threshold: 4 visible
 */

import type { NotificationCategory } from '@hex/engine';
import type { PanelId } from '../panels/panelRegistry';
import type { SoundEffect } from '../../audio/AudioManager';

export interface NotificationCategoryEntry {
  /** CSS custom property name for the 4px left-accent border color. */
  readonly accentToken: string;
  /** Sound to play when this category of notification first mounts (per-turn, de-duped). */
  readonly sound: SoundEffect | null;
  /**
   * Auto-dismiss delay in milliseconds.
   * `null` means requiresAction — no timer is ever scheduled.
   */
  readonly dismissMs: number | null;
  /**
   * Panel to open when the toast is clicked.
   * `null` for info/crisis (info is non-clickable; crisis auto-opens via useEffect).
   */
  readonly panelTarget: PanelId | null;
  /**
   * When true, right-click dismissal is blocked (crisis + age) OR allowed
   * (diplomatic hostile). The renderer checks this per-notification using the
   * `isDiplomaticHostile` helper since diplomatic has two modes.
   */
  readonly requiresAction: boolean;
  /**
   * Human-readable title for the toast header (used in getNotificationTitle).
   */
  readonly titleLabel: string;
  /**
   * When true, render the 1px gold title rule under the toast header
   * (high-consequence categories: diplomatic, crisis, age).
   */
  readonly showGoldRule: boolean;
}

/**
 * The canonical category registry.
 *
 * Accent tokens align with the values already in hud-tokens.css:
 *   --hud-notification-production, --hud-notification-research,
 *   --hud-notification-civic, --hud-notification-warning,
 *   --hud-notification-info, --hud-tooltip-heading-strong (gold).
 */
export const NOTIFICATION_CATEGORY_REGISTRY: ReadonlyMap<NotificationCategory, NotificationCategoryEntry> =
  new Map<NotificationCategory, NotificationCategoryEntry>([
    [
      'production',
      {
        accentToken: 'var(--hud-notification-production)',
        sound: 'building_complete',
        dismissMs: 6000,
        panelTarget: 'city',
        requiresAction: false,
        titleLabel: 'Production Complete',
        showGoldRule: false,
      },
    ],
    [
      'research',
      {
        accentToken: 'var(--hud-notification-research)',
        sound: 'tech_complete',
        dismissMs: 6000,
        panelTarget: 'tech',
        requiresAction: false,
        titleLabel: 'Research Complete',
        showGoldRule: false,
      },
    ],
    [
      'civic',
      {
        accentToken: 'var(--hud-notification-civic)',
        sound: 'confirm',
        dismissMs: 6000,
        panelTarget: 'civics',
        requiresAction: false,
        titleLabel: 'Civic Complete',
        showGoldRule: false,
      },
    ],
    [
      'diplomatic',
      {
        // Color is overridden to warning for hostile events in the renderer
        accentToken: 'var(--hud-notification-info)',
        sound: 'confirm',   // overridden to 'error' for hostile events in renderer
        dismissMs: 10000,   // friendly; hostile is requiresAction (handled in renderer)
        panelTarget: 'diplomacy',
        requiresAction: false, // hostile overridden in renderer
        titleLabel: 'Diplomatic Event',
        showGoldRule: true,
      },
    ],
    [
      'crisis',
      {
        accentToken: 'var(--hud-notification-warning)',
        sound: 'error',
        dismissMs: null,   // requiresAction
        panelTarget: null, // auto-opens via useEffect; click-to-open is belt-and-suspenders
        requiresAction: true,
        titleLabel: 'Crisis!',
        showGoldRule: true,
      },
    ],
    [
      'age',
      {
        accentToken: 'var(--hud-tooltip-heading-strong)',
        sound: 'victory',
        dismissMs: null,   // requiresAction
        panelTarget: 'age',
        requiresAction: true,
        titleLabel: 'Age Transition',
        showGoldRule: true,
      },
    ],
    [
      'info',
      {
        accentToken: 'var(--hud-notification-info)',
        sound: null,
        dismissMs: 4000,
        panelTarget: null,
        requiresAction: false,
        titleLabel: 'Notification',
        showGoldRule: false,
      },
    ],
  ]);

/** Convenience lookup — returns the info entry as fallback for unknown categories. */
export function getCategoryEntry(category: NotificationCategory | undefined): NotificationCategoryEntry {
  return NOTIFICATION_CATEGORY_REGISTRY.get(category ?? 'info') ??
    NOTIFICATION_CATEGORY_REGISTRY.get('info')!;
}

/**
 * Returns true when a diplomatic event is hostile (war declaration / surprise war).
 * Used to override accent color, sound, and requiresAction for hostile diplomacy.
 */
export function isDiplomaticHostile(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes('declared') && lower.includes('war');
}
