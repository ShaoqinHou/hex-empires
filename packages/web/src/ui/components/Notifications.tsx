import { useEffect, useState } from 'react';
import { useGame } from '../../providers/GameProvider';

interface Notification {
  id: string;
  message: string;
  type: 'production' | 'research' | 'civic' | 'info' | 'warning';
  timestamp: number;
}

export function Notifications() {
  const { state } = useGame();
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

      // Determine notification type based on message content
      const msg = event.message.toLowerCase();
      if (msg.includes('finished') || msg.includes('completed')) {
        if (msg.includes('production') || msg.includes('produced')) {
          type = 'production';
        } else if (msg.includes('research') || msg.includes('technology')) {
          type = 'research';
        } else if (msg.includes('civic')) {
          type = 'civic';
        }
      } else if (msg.includes('raided') || msg.includes('attacked')) {
        type = 'warning';
      }

      newNotifications.push({
        id: eventId,
        message: event.message,
        type,
        timestamp: now,
      });
    }

    if (newNotifications.length > 0) {
      setNotifications(prev => [...prev, ...newNotifications]);
      setNotifiedEventIds(prev => new Set([...prev, ...newNotifications.map(n => n.id)]));

      // Auto-remove after 5 seconds
      const timer = setTimeout(() => {
        setNotifications(prev => prev.filter(n => !newNotifications.some(nn => nn.id === n.id)));
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [state.turn, state.log, state.currentPlayerId, notifiedEventIds]);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 space-y-2 pointer-events-none">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className="bg-surface border rounded-lg px-4 py-3 shadow-lg animate-slide-in pointer-events-auto max-w-sm"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderLeftColor: getNotificationColor(notification.type),
            borderLeftWidth: '4px',
          }}
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
              onClick={() => {
                setNotifications(prev => prev.filter(n => n.id !== notification.id));
              }}
            >
              ×
            </button>
          </div>
        </div>
      ))}
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
