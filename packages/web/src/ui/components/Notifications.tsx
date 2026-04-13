import { useEffect, useState } from 'react';
import { useGameState } from '../../providers/GameProvider';

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

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 space-y-2 pointer-events-none">
      {notifications.map(notification => {
        const isClickable = notification.type === 'production' && !!notification.cityId && !!onCityClick;
        return (
          <div
            key={notification.id}
            className={`bg-surface border rounded-lg px-4 py-3 shadow-lg animate-slide-in pointer-events-auto max-w-sm${isClickable ? ' cursor-pointer hover:brightness-110' : ''}`}
            style={{
              backgroundColor: 'var(--color-surface)',
              borderLeftColor: getNotificationColor(notification.type),
              borderLeftWidth: '4px',
            }}
            onClick={isClickable ? () => {
              onCityClick!(notification.cityId!);
              setNotifications(prev => prev.filter(n => n.id !== notification.id));
            } : undefined}
          >
            <div className="flex items-start gap-3">
              <div
                className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: getNotificationColor(notification.type) }}
              />
              <div className="flex-1">
                <div
                  className="text-sm font-medium"
                  style={{ color: 'var(--color-text)' }}
                >
                  {getNotificationTitle(notification.type)}
                  {isClickable && (
                    <span className="ml-2 text-xs font-normal opacity-70">(click to manage)</span>
                  )}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {notification.message}
                </div>
              </div>
              <button
                className="text-xs hover:text-red-400 transition-colors"
                style={{ color: 'var(--color-text-muted)' }}
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
    </div>
  );
}

function getNotificationColor(type: Notification['type']): string {
  switch (type) {
    case 'production':
      return '#ff8a65'; // orange
    case 'research':
      return '#42a5f5'; // blue
    case 'civic':
      return '#ab47bc'; // purple
    case 'warning':
      return '#f44336'; // red
    default:
      return '#64b5f6'; // default blue
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
