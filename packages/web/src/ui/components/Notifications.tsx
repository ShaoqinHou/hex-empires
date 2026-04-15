import { useEffect, useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { TooltipShell } from '../hud/TooltipShell';
import { useHUDManager } from '../hud/HUDManager';

interface Notification {
  id: string;
  message: string;
  type: 'production' | 'research' | 'civic' | 'info' | 'warning';
  timestamp: number;
  /** City ID for production-complete notifications — enables click-to-open city panel */
  cityId?: string;
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

export function Notifications({ onCityClick }: NotificationsProps) {
  const { state } = useGameState();
  const { register } = useHUDManager();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifiedEventIds, setNotifiedEventIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Check for events that should trigger notifications
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

      let type: Notification['type'] = 'info';
      let cityId: string | undefined;

      // Determine notification type based on message content
      const msg = event.message.toLowerCase();

      // Production complete: "CityName produced unitId" or "CityName built buildingId"
      if (msg.includes(' produced ') || msg.includes(' built ')) {
        type = 'production';
        cityId = extractCityId(event.message, state.cities, state.currentPlayerId) ?? undefined;
      } else if (msg.includes('completed') && msg.includes('ready to place')) {
        // District complete: "CityName completed districtId - ready to place"
        type = 'production';
        cityId = extractCityId(event.message, state.cities, state.currentPlayerId) ?? undefined;
      } else if (msg.includes('finished') || msg.includes('completed')) {
        if (msg.includes('research') || msg.includes('technology')) {
          type = 'research';
        } else if (msg.includes('civic')) {
          type = 'civic';
        } else if (msg.includes('production') || msg.includes('produced')) {
          type = 'production';
          cityId = extractCityId(event.message, state.cities, state.currentPlayerId) ?? undefined;
        }
      } else if (msg.includes('raided') || msg.includes('attacked')) {
        type = 'warning';
      }

      newNotifications.push({
        id: eventId,
        message: event.message,
        type,
        timestamp: now,
        cityId,
      });
    }

    if (newNotifications.length > 0) {
      setNotifications(prev => [...prev, ...newNotifications]);
      setNotifiedEventIds(prev => new Set([...prev, ...newNotifications.map(n => n.id)]));

      // Auto-remove after 8 seconds (production notifications need time to act on)
      const timer = setTimeout(() => {
        setNotifications(prev => prev.filter(n => !newNotifications.some(nn => nn.id === n.id)));
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [state.turn, state.log, state.currentPlayerId, notifiedEventIds]);

  // Register with HUDManager while at least one toast is visible so ESC /
  // coordinated-dismiss logic can target the toast stack. Non-sticky:
  // toasts drive their own lifecycle via the auto-dismiss timer and per-
  // toast close buttons; ESC should not kill the stack wholesale.
  // TODO(HUD cycle f): full toast-queue integration — when HUDManager
  // exposes a push/dequeue API, replace the local state here and route
  // every toast through the manager.
  useEffect(() => {
    if (notifications.length === 0) return;
    const unregister = register('notification', { sticky: false });
    return unregister;
  }, [notifications.length, register]);

  if (notifications.length === 0) return null;

  // TooltipShell with position="fixed-corner" snaps to the bottom-right
  // corner. The audit's original placement was top-right
  // (`fixed top-20 right-4`); quadrant-aware corner selection is
  // TODO(HUD cycle j) — when that lands, this overlay should opt into
  // top-right via a shell prop rather than the current bottom-right default.
  return (
    <TooltipShell
      id="notification"
      anchor={{ kind: 'screen', x: 0, y: 0 }}
      position="fixed-corner"
      tier="detailed"
    >
      <div
        className="space-y-2"
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--hud-padding-sm)' }}
      >
        {notifications.map(notification => {
          const isClickable = notification.type === 'production' && !!notification.cityId && !!onCityClick;
          const accent = getNotificationColor(notification.type);
          return (
            <div
              key={notification.id}
              className={`animate-slide-in${isClickable ? ' cursor-pointer hover:brightness-110' : ''}`}
              style={{
                backgroundColor: 'var(--color-surface)',
                borderLeftColor: accent,
                borderLeftStyle: 'solid',
                borderLeftWidth: '4px',
                borderRadius: 'var(--hud-radius)',
                padding: 'var(--hud-padding-md)',
                boxShadow: 'var(--hud-shadow)',
              }}
              onClick={isClickable ? () => {
                onCityClick!(notification.cityId!);
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
              } : undefined}
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
                    {getNotificationTitle(notification.type)}
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
                    setNotifications(prev => prev.filter(n => n.id !== notification.id));
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

function getNotificationColor(type: Notification['type']): string {
  switch (type) {
    case 'production':
      return 'var(--hud-notification-production)';
    case 'research':
      return 'var(--hud-notification-research)';
    case 'civic':
      return 'var(--hud-notification-civic)';
    case 'warning':
      return 'var(--hud-notification-warning)';
    default:
      return 'var(--hud-notification-info)';
  }
}

function getNotificationTitle(type: Notification['type']): string {
  switch (type) {
    case 'production':
      return 'Production Complete';
    case 'research':
      return 'Research Complete';
    case 'civic':
      return 'Civic Complete';
    case 'warning':
      return 'Alert';
    default:
      return 'Notification';
  }
}
