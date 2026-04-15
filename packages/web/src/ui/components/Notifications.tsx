import { useEffect, useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { TooltipShell } from '../hud/TooltipShell';
import { useHUDManager } from '../hud/HUDManager';

/** Mirror of engine's GameEventSeverity — kept in sync. */
type NotificationSeverity = 'info' | 'warning' | 'critical';

interface Notification {
  id: string;
  message: string;
  type: 'production' | 'research' | 'civic' | 'info' | 'warning' | 'critical';
  severity: NotificationSeverity;
  timestamp: number;
  /** City ID for production-complete notifications — enables click-to-open city panel */
  cityId?: string;
  /** Original event turn + message so we can dispatch DISMISS_EVENT */
  eventTurn: number;
  eventMessage: string;
}

interface NotificationsProps {
  /** Called when the user clicks a production-complete notification to open that city's panel */
  onCityClick?: (cityId: string) => void;
}

/**
 * Extract a city ID from a production log message by matching a city name.
 * Returns null if no city matches.
 */
function extractCityId(message: string, cities: ReadonlyMap<string, { id: string; name: string; owner: string }>, playerId: string): string | null {
  for (const city of cities.values()) {
    if (city.owner !== playerId) continue;
    if (message.startsWith(city.name + ' ')) return city.id;
  }
  return null;
}

/**
 * Filter notifications: always show warning + critical; deduplicate info to at most 1
 * per distinct message text per render cycle.
 */
function filterNotifications(notifications: Notification[]): Notification[] {
  const seen = new Set<string>();
  const result: Notification[] = [];
  let infoCount = 0;

  for (const n of notifications) {
    if (n.severity === 'critical' || n.severity === 'warning') {
      result.push(n);
    } else {
      // info: deduplicate by message text, limit to 1 per unique message
      if (!seen.has(n.message)) {
        seen.add(n.message);
        infoCount++;
        // Show at most 2 info toasts at once to reduce noise
        if (infoCount <= 2) {
          result.push(n);
        }
      }
    }
  }

  return result;
}

export function Notifications({ onCityClick }: NotificationsProps) {
  const { state, dispatch } = useGameState();
  const { register } = useHUDManager();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifiedEventIds, setNotifiedEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const player = state.players.get(state.currentPlayerId);
    if (!player) return;

    const newNotifications: Notification[] = [];
    const now = Date.now();

    // Check log for recent events from this turn
    const recentEvents = state.log.filter(e => e.turn === state.turn && e.playerId === state.currentPlayerId);

    for (const event of recentEvents) {
      // Create a unique ID for this event
      const eventId = `${state.turn}-${event.playerId}-${event.message}`;

      // Skip if already notified or if it's a "Turn started" message (redundant with TurnTransition)
      if (notifiedEventIds.has(eventId) || event.message.includes('started for')) {
        continue;
      }

      // event.severity is the new field added in this batch; cast defensively for
      // the web tsc build which may resolve against an older engine declaration.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const severity: NotificationSeverity = ((event as any).severity as NotificationSeverity | undefined) ?? 'info';

      let type: Notification['type'] = severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'info';
      let cityId: string | undefined;

      // Determine notification type based on message content (refines the type for styling)
      const msg = event.message.toLowerCase();

      // Production complete: "CityName produced unitId" or "CityName built buildingId"
      if (msg.includes(' produced ') || msg.includes(' built ')) {
        if (severity === 'info') type = 'production';
        cityId = extractCityId(event.message, state.cities, state.currentPlayerId) ?? undefined;
      } else if (msg.includes('completed') && msg.includes('ready to place')) {
        // District complete: "CityName completed districtId - ready to place"
        if (severity === 'info') type = 'production';
        cityId = extractCityId(event.message, state.cities, state.currentPlayerId) ?? undefined;
      } else if (msg.includes('finished') || msg.includes('completed')) {
        if (severity === 'info') {
          if (msg.includes('research') || msg.includes('technology') || msg.includes('researched')) {
            type = 'research';
          } else if (msg.includes('civic')) {
            type = 'civic';
          } else if (msg.includes('production') || msg.includes('produced')) {
            type = 'production';
            cityId = extractCityId(event.message, state.cities, state.currentPlayerId) ?? undefined;
          }
        }
      } else if (msg.includes('researched ')) {
        if (severity === 'info') type = 'research';
      } else if (msg.includes('mastered ')) {
        if (severity === 'info') type = 'research';
      }

      newNotifications.push({
        id: eventId,
        message: event.message,
        type,
        severity,
        timestamp: now,
        cityId,
        eventTurn: event.turn,
        eventMessage: event.message,
      });
    }

    if (newNotifications.length > 0) {
      setNotifications(prev => [...prev, ...newNotifications]);
      setNotifiedEventIds(prev => new Set([...prev, ...newNotifications.map(n => n.id)]));

      // Auto-remove non-critical notifications after 8 seconds
      const nonCritical = newNotifications.filter(n => n.severity !== 'critical');
      if (nonCritical.length > 0) {
        const timer = setTimeout(() => {
          setNotifications(prev => prev.filter(n => !nonCritical.some(nn => nn.id === n.id)));
        }, 8000);

        return () => clearTimeout(timer);
      }
    }
  }, [state.turn, state.log, state.currentPlayerId, notifiedEventIds]);

  useEffect(() => {
    if (notifications.length === 0) return;
    const unregister = register('notification', { sticky: false });
    return unregister;
  }, [notifications.length, register]);

  /**
   * Dismiss a single notification. For blocksTurn events, also dispatches
   * DISMISS_EVENT so the turn system clears the blocker.
   */
  function dismissOne(notification: Notification): void {
    setNotifications(prev => prev.filter(n => n.id !== notification.id));
    if (notification.severity === 'critical') {
      // DISMISS_EVENT is a new action added in this batch; cast because the web tsc
      // build may resolve against an older engine declaration that lacks it.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dispatch({ type: 'DISMISS_EVENT', eventMessage: notification.eventMessage, eventTurn: notification.eventTurn } as any);
    }
  }

  function dismissAll(): void {
    for (const n of notifications) {
      if (n.severity === 'critical') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dispatch({ type: 'DISMISS_EVENT', eventMessage: n.eventMessage, eventTurn: n.eventTurn } as any);
      }
    }
    setNotifications([]);
  }

  const visible = filterNotifications(notifications);
  if (visible.length === 0) return null;

  return (
    <TooltipShell
      id="notification"
      anchor={{ kind: 'screen', x: 0, y: 0 }}
      position="fixed-corner"
      tier="detailed"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hud-padding-sm)' }}>
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
        {visible.map(notification => {
          const isClickable = notification.type === 'production' && !!notification.cityId && !!onCityClick;
          const accent = getNotificationColor(notification);
          return (
            <div
              key={notification.id}
              className={`animate-slide-in${isClickable ? ' cursor-pointer hover:brightness-110' : ''}`}
              title="Right-click to dismiss"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderLeftColor: accent,
                borderLeftStyle: 'solid',
                borderLeftWidth: '4px',
                borderRadius: 'var(--hud-radius)',
                padding: 'var(--hud-padding-md)',
                boxShadow: 'var(--hud-shadow)',
                cursor: isClickable ? 'pointer' : 'default',
              }}
              onClick={isClickable ? () => {
                onCityClick!(notification.cityId!);
                dismissOne(notification);
              } : undefined}
              onContextMenu={(e) => {
                e.preventDefault();
                e.stopPropagation();
                dismissOne(notification);
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--hud-padding-md)' }}>
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '9999px',
                    marginTop: 4,
                    flexShrink: 0,
                    backgroundColor: accent,
                  }}
                />
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: 'var(--hud-text-color)',
                    }}
                  >
                    {getNotificationTitle(notification)}
                    {isClickable && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 12,
                          fontWeight: 400,
                          opacity: 0.7,
                        }}
                      >
                        (click to manage)
                      </span>
                    )}
                    {notification.severity === 'critical' && (
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 11,
                          fontWeight: 600,
                          color: 'var(--hud-notification-warning)',
                          opacity: 0.9,
                        }}
                      >
                        [requires acknowledgement]
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      marginTop: 4,
                      color: 'var(--hud-text-muted)',
                    }}
                  >
                    {notification.message}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Dismiss notification"
                  style={{
                    fontSize: 12,
                    color: 'var(--hud-text-muted)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--hud-notification-close-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--hud-text-muted)';
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    dismissOne(notification);
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slideIn 0.3s ease-out;
        }
      `}</style>
    </TooltipShell>
  );
}

function getNotificationColor(notification: Notification): string {
  if (notification.severity === 'critical') return 'var(--hud-notification-warning)';
  if (notification.severity === 'warning') return 'var(--hud-notification-research)';
  switch (notification.type) {
    case 'production':
      return 'var(--hud-notification-production)';
    case 'research':
      return 'var(--hud-notification-research)';
    case 'civic':
      return 'var(--hud-notification-civic)';
    case 'warning':
      return 'var(--hud-notification-warning)';
    case 'critical':
      return 'var(--hud-notification-warning)';
    default:
      return 'var(--hud-notification-info)';
  }
}

function getNotificationTitle(notification: Notification): string {
  if (notification.severity === 'critical') return 'Critical Alert';
  if (notification.severity === 'warning') {
    switch (notification.type) {
      case 'research': return 'Research Complete';
      case 'civic': return 'Civic Complete';
      case 'production': return 'Production Complete';
      default: return 'Notice';
    }
  }
  switch (notification.type) {
    case 'production':
      return 'Production Complete';
    case 'research':
      return 'Research Complete';
    case 'civic':
      return 'Civic Complete';
    case 'warning':
      return 'Alert';
    case 'critical':
      return 'Critical Alert';
    default:
      return 'Notification';
  }
}
