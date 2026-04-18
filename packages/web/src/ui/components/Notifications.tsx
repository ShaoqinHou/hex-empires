import { useEffect, useRef, useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { TooltipShell } from '../hud/TooltipShell';
import { useHUDManager } from '../hud/HUDManager';
import { usePanelManager } from '../panels/PanelManager';
import type { PanelId } from '../panels/panelRegistry';
import type { SoundEffect } from '../../audio/AudioManager';
import { getAudioManager } from '../../audio/AudioManager';
import {
  getCategoryEntry,
  isDiplomaticHostile,
  NOTIFICATION_CATEGORY_REGISTRY,
} from './notificationCategoryRegistry';
import type { NotificationCategory } from '@hex/engine';

// ── Local notification shape ─────────────────────────────────────────────────

interface ActiveNotification {
  readonly id: string;
  readonly message: string;
  readonly category: NotificationCategory;
  /** Resolved accent token (may be overridden for hostile-diplomatic). */
  readonly accentToken: string;
  /** When true, outer border switches to amber + pulse; timer is suppressed. */
  readonly requiresAction: boolean;
  /**
   * When true, right-click is blocked (crisis, age).
   * When false but requiresAction=true (hostile-diplomatic), right-click allowed.
   */
  readonly blockRightClick: boolean;
  readonly panelTarget: PanelId | null;
  readonly sound: SoundEffect | null;
  readonly showGoldRule: boolean;
  readonly titleLabel: string;
  /** Original event fields for DISMISS_EVENT dispatch */
  readonly eventTurn: number;
  readonly eventMessage: string;
  readonly dismissMs: number | null;
}

// ── Per-turn sound de-duplication ────────────────────────────────────────────

/**
 * Per-turn de-dupe logic.
 * crisis and age sounds always play (never de-duped within a turn).
 * Other categories: first toast in that category per turn plays; rest suppressed.
 */
function shouldPlaySound(
  category: NotificationCategory,
  sound: SoundEffect,
  playedThisTurn: Set<SoundEffect>,
): boolean {
  if (category === 'crisis' || category === 'age') return true;
  if (playedThisTurn.has(sound)) return false;
  return true;
}

// ── Max visible + overflow ───────────────────────────────────────────────────

const MAX_VISIBLE = 4;

// ── Component ────────────────────────────────────────────────────────────────

interface NotificationsProps {
  /**
   * Legacy callback for production toasts (city panel focus).
   * Kept for backward compat; click behavior now also goes through openPanel.
   */
  onCityClick?: (cityId: string) => void;
}

export function Notifications({ onCityClick }: NotificationsProps) {
  const { state, dispatch } = useGameState();
  const { register } = useHUDManager();
  const { openPanel } = usePanelManager();

  const [notifications, setNotifications] = useState<ActiveNotification[]>([]);
  const [notifiedEventIds, setNotifiedEventIds] = useState<Set<string>>(new Set());

  // Per-turn sound de-dupe: { turn -> Set<SoundEffect> }
  const playedSoundsRef = useRef<Map<number, Set<SoundEffect>>>(new Map());

  // ── Ingest new log events ──────────────────────────────────────────────────

  useEffect(() => {
    const player = state.players.get(state.currentPlayerId);
    if (!player) return;

    const recentEvents = state.log.filter(
      e => e.turn === state.turn && e.playerId === state.currentPlayerId,
    );

    const newNotifications: ActiveNotification[] = [];

    for (const event of recentEvents) {
      const eventId = `${state.turn}-${event.playerId}-${event.message}`;
      if (notifiedEventIds.has(eventId)) continue;
      if (event.message.includes('started for')) continue; // turn-start noise

      // Resolve category (fallback to 'info' if missing)
      const rawCategory = event.category ?? 'info';

      // For diplomatic, check hostile override
      const isHostileDiplomatic = rawCategory === 'diplomatic' && isDiplomaticHostile(event.message);

      const baseEntry = getCategoryEntry(rawCategory);

      const category: NotificationCategory = rawCategory;
      const accentToken = isHostileDiplomatic
        ? 'var(--hud-notification-warning)'
        : baseEntry.accentToken;
      const requiresAction = isHostileDiplomatic ? true : baseEntry.requiresAction;
      // block right-click only for crisis and age (not hostile-diplomatic per spec Q1)
      const blockRightClick = category === 'crisis' || category === 'age';
      const sound = isHostileDiplomatic ? ('error' as SoundEffect) : baseEntry.sound;
      const dismissMs = requiresAction ? null : baseEntry.dismissMs;
      const panelTarget = (event.panelTarget as PanelId | undefined) ?? baseEntry.panelTarget;
      const showGoldRule = baseEntry.showGoldRule;
      const titleLabel = isHostileDiplomatic ? 'War Declared!' : baseEntry.titleLabel;

      newNotifications.push({
        id: eventId,
        message: event.message,
        category,
        accentToken,
        requiresAction,
        blockRightClick,
        panelTarget,
        sound,
        showGoldRule,
        titleLabel,
        eventTurn: event.turn,
        eventMessage: event.message,
        dismissMs,
      });
    }

    if (newNotifications.length === 0) return;

    // Play sounds (per-turn de-dupe)
    const turnsPlayed = playedSoundsRef.current;
    if (!turnsPlayed.has(state.turn)) {
      turnsPlayed.set(state.turn, new Set());
    }
    const playedThisTurn = turnsPlayed.get(state.turn)!;

    for (const n of newNotifications) {
      if (n.sound && shouldPlaySound(n.category, n.sound, playedThisTurn)) {
        try {
          getAudioManager().playSound(n.sound);
        } catch {
          // AudioManager may not be initialized in tests; swallow
        }
        playedThisTurn.add(n.sound);
      }
    }

    setNotifications(prev => [...prev, ...newNotifications]);
    setNotifiedEventIds(prev => new Set([...prev, ...newNotifications.map(n => n.id)]));
  }, [state.turn, state.log, state.currentPlayerId, notifiedEventIds]);

  // ── Per-notification auto-dismiss timers ───────────────────────────────────

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (const n of notifications) {
      if (n.dismissMs === null || n.requiresAction) continue;
      const timer = setTimeout(() => {
        setNotifications(prev => prev.filter(x => x.id !== n.id));
      }, n.dismissMs);
      timers.push(timer);
    }
    return () => timers.forEach(clearTimeout);
  }, [notifications]);

  // ── HUD registration ───────────────────────────────────────────────────────

  useEffect(() => {
    if (notifications.length === 0) return;
    const unregister = register('notification', { sticky: false });
    return unregister;
  }, [notifications.length, register]);

  // ── Dismiss helpers ────────────────────────────────────────────────────────

  function dismissOne(n: ActiveNotification): void {
    if (n.blockRightClick) return;
    setNotifications(prev => prev.filter(x => x.id !== n.id));
    if (n.requiresAction || n.category === 'crisis' || n.category === 'age') {
      dispatch({
        type: 'DISMISS_EVENT',
        eventMessage: n.eventMessage,
        eventTurn: n.eventTurn,
      });
    }
  }

  function dismissAll(): void {
    const dismissible = notifications.filter(n => !n.blockRightClick);
    for (const n of dismissible) {
      if (n.requiresAction || n.category === 'crisis' || n.category === 'age') {
        dispatch({
          type: 'DISMISS_EVENT',
          eventMessage: n.eventMessage,
          eventTurn: n.eventTurn,
        });
      }
    }
    const keepIds = new Set(notifications.filter(n => n.blockRightClick).map(n => n.id));
    setNotifications(prev => prev.filter(n => keepIds.has(n.id)));
  }

  // ── Click-to-panel ─────────────────────────────────────────────────────────

  function handleClick(n: ActiveNotification): void {
    if (!n.panelTarget) return;
    openPanel(n.panelTarget);
    // Legacy path: production click with city callback
    if (n.category === 'production' && onCityClick) {
      const cityMatch = [...state.cities.values()].find(
        c => c.owner === state.currentPlayerId && n.message.startsWith(c.name + ' '),
      );
      if (cityMatch) onCityClick(cityMatch.id);
    }
    // Clicking is the acknowledgement for requiresAction (except crisis/age which
    // already auto-open — but we keep a belt-and-suspenders openPanel call above).
    dismissOne({ ...n, blockRightClick: false });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const visible = notifications.slice(0, MAX_VISIBLE);
  const overflow = Math.max(0, notifications.length - MAX_VISIBLE);

  if (notifications.length === 0) return null;

  return (
    <TooltipShell
      id="notification"
      anchor={{ kind: 'screen', x: 0, y: 0 }}
      position="fixed-corner"
      tier="detailed"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hud-padding-sm)', width: 320 }}>
        {visible.length >= 3 && (
          <button
            type="button"
            aria-label="Dismiss all notifications"
            style={{
              alignSelf: 'flex-end',
              fontSize: 11,
              color: 'var(--hud-text-muted)',
              background: 'transparent',
              border: '1px solid var(--panel-border)',
              borderRadius: 'var(--panel-radius)',
              padding: '2px 8px',
              cursor: 'pointer',
              marginBottom: 'var(--hud-padding-sm)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--hud-notification-close-hover)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--hud-text-muted)'; }}
            onClick={dismissAll}
          >
            Dismiss All
          </button>
        )}

        {visible.map(n => {
          const isClickable = !!n.panelTarget;
          const tooltipHint = n.blockRightClick
            ? 'Resolve in the related panel to clear this'
            : isClickable
              ? 'Click to open panel • right-click to dismiss'
              : 'Right-click to dismiss';

          return (
            <NotificationToast
              key={n.id}
              notification={n}
              isClickable={isClickable}
              tooltipHint={tooltipHint}
              onClick={() => handleClick(n)}
              onDismiss={() => dismissOne(n)}
            />
          );
        })}

        {overflow > 0 && (
          <button
            type="button"
            aria-label={`${overflow} more notifications — open event log`}
            style={{
              background: 'var(--hud-cycle-indicator-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: 'var(--panel-radius)',
              color: 'var(--hud-text-muted)',
              fontSize: 12,
              padding: '4px 12px',
              cursor: 'pointer',
              textAlign: 'center',
            }}
            onClick={() => openPanel('log')}
          >
            +{overflow} more
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0);    opacity: 1; }
          to   { transform: translateX(100%); opacity: 0; }
        }
        @keyframes requiresActionPulse {
          0%   { border-color: var(--hud-notification-requires-action-border); }
          50%  { border-color: rgba(251, 191, 36, 0.85); }
          100% { border-color: var(--hud-notification-requires-action-border); }
        }
        .animate-slide-in  { animation: slideIn 0.3s ease-out; }
        .animate-slide-out { animation: slideOut 0.3s ease-in forwards; }
        .requires-action-pulse {
          animation: requiresActionPulse 2.4s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .requires-action-pulse { animation: none; }
        }
      `}</style>
    </TooltipShell>
  );
}

// ── Toast sub-component ───────────────────────────────────────────────────────

interface NotificationToastProps {
  readonly notification: ActiveNotification;
  readonly isClickable: boolean;
  readonly tooltipHint: string;
  readonly onClick: () => void;
  readonly onDismiss: () => void;
}

function NotificationToast({ notification: n, isClickable, tooltipHint, onClick, onDismiss }: NotificationToastProps) {
  const outerBorderStyle = n.requiresAction
    ? 'var(--hud-notification-requires-action-border)'
    : 'var(--hud-border)';

  return (
    <div
      className={[
        'animate-slide-in',
        n.requiresAction ? 'requires-action-pulse' : '',
        isClickable ? 'cursor-pointer' : '',
      ].filter(Boolean).join(' ')}
      role={isClickable ? 'button' : 'status'}
      tabIndex={isClickable ? 0 : undefined}
      aria-label={isClickable ? `${n.titleLabel}: ${n.message} — click to open panel` : n.message}
      title={tooltipHint}
      style={{
        backgroundColor: 'var(--hud-bg)',
        border: `1px solid ${outerBorderStyle}`,
        borderLeftColor: n.accentToken,
        borderLeftStyle: 'solid',
        borderLeftWidth: '4px',
        borderRadius: 'var(--hud-radius)',
        padding: 'var(--hud-padding-md)',
        boxShadow: 'var(--hud-shadow)',
        cursor: isClickable ? 'pointer' : 'default',
      }}
      onClick={isClickable ? onClick : undefined}
      onKeyDown={isClickable ? (e) => { if (e.key === 'Enter') onClick(); } : undefined}
      onContextMenu={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDismiss();
      }}
    >
      {/* Title row */}
      <div style={{
        paddingBottom: n.showGoldRule ? 'var(--hud-padding-sm)' : 0,
        marginBottom: n.showGoldRule ? 'var(--hud-padding-sm)' : 0,
        borderBottom: n.showGoldRule ? '1px solid var(--hud-tooltip-heading-strong)' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--hud-padding-sm)',
      }}>
        {/* Accent dot */}
        <span style={{
          width: 8,
          height: 8,
          borderRadius: '9999px',
          flexShrink: 0,
          backgroundColor: n.accentToken,
          display: 'inline-block',
        }} />
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--hud-text-color)',
          flex: 1,
        }}>
          {n.titleLabel}
        </span>
        {n.requiresAction && (
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--hud-notification-requires-action-border)',
          }}>
            [requires acknowledgement]
          </span>
        )}
        {isClickable && !n.requiresAction && (
          <span style={{
            fontSize: 11,
            fontWeight: 400,
            color: 'var(--hud-text-muted)',
          }}>
            (click to open)
          </span>
        )}
      </div>

      {/* Message body */}
      <div style={{
        fontSize: 12,
        marginTop: 4,
        color: 'var(--hud-text-muted)',
        lineHeight: 1.4,
      }}>
        {n.message}
      </div>
    </div>
  );
}
