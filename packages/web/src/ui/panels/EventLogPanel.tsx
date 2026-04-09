import { useGame } from '../../providers/GameProvider';
import type { GameEvent } from '@hex/engine';

interface EventLogPanelProps {
  onClose: () => void;
}

const EVENT_COLORS: Record<GameEvent['type'], string> = {
  combat: 'var(--color-health-low)',
  city: 'var(--color-food)',
  research: 'var(--color-science)',
  civic: 'var(--color-culture)',
  diplomacy: 'var(--color-culture)',
  move: 'var(--color-text-muted)',
  age: 'var(--color-gold)',
  legacy: 'var(--color-gold)',
  crisis: 'var(--color-production)',
  victory: 'var(--color-accent)',
  production: 'var(--color-production)',
};

const EVENT_LABELS: Record<GameEvent['type'], string> = {
  combat: 'Combat',
  city: 'City',
  research: 'Research',
  civic: 'Civic',
  diplomacy: 'Diplomacy',
  move: 'Move',
  age: 'Age',
  legacy: 'Legacy',
  crisis: 'Crisis',
  victory: 'Victory',
  production: 'Production',
};

export function EventLogPanel({ onClose }: EventLogPanelProps) {
  const { state } = useGame();

  // Reverse chronological order (newest first)
  const events = [...state.log].reverse();

  return (
    <div className="absolute right-0 top-12 bottom-14 w-80 overflow-y-auto"
      style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Event Log</h2>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {events.length} events
          </span>
        </div>
        <button onClick={onClose} className="text-sm px-2 py-1 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}>
          X
        </button>
      </div>

      {/* Event list */}
      {events.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          No events yet.
        </div>
      ) : (
        <div className="flex flex-col">
          {events.map((event, idx) => {
            const player = state.players.get(event.playerId);
            const color = EVENT_COLORS[event.type];

            return (
              <div key={idx} className="px-4 py-2"
                style={{ borderBottom: '1px solid var(--color-border)' }}>
                {/* Top row: turn, type badge, player */}
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[10px] font-mono"
                    style={{ color: 'var(--color-text-muted)' }}>
                    T{event.turn}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: color, color: 'var(--color-bg)' }}>
                    {EVENT_LABELS[event.type]}
                  </span>
                  <span className="text-[10px]"
                    style={{ color: 'var(--color-text-muted)' }}>
                    {player?.name ?? event.playerId}
                  </span>
                </div>
                {/* Message */}
                <div className="text-xs" style={{ color: 'var(--color-text)' }}>
                  {event.message}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
