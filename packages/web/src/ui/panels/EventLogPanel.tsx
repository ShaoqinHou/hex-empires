import { useEffect, useRef } from 'react';
import { useGameState } from '../../providers/GameProvider';
import type { GameEvent } from '@hex/engine';

interface EventLogPanelProps {
  onClose: () => void;
}

// Messages that contain these substrings are purely mechanical noise
const NOISE_PATTERNS = [
  /^Turn \d+ started/i,
  /^Turn \d+ ended/i,
  /— your turn$/i,
];

function isNoisy(message: string): boolean {
  return NOISE_PATTERNS.some(p => p.test(message));
}

const EVENT_ICONS: Record<GameEvent['type'], string> = {
  combat: '⚔️',
  city: '🏰',
  research: '🔬',
  civic: '📜',
  diplomacy: '🤝',
  move: '👣',
  age: '🌅',
  legacy: '🏅',
  crisis: '⚡',
  victory: '🏆',
  production: '🔨',
};

// CSS color tokens per type
const EVENT_COLOR: Record<GameEvent['type'], string> = {
  combat: 'var(--color-health-low)',
  city: 'var(--color-food)',
  research: 'var(--color-science)',
  civic: 'var(--color-culture)',
  diplomacy: '#a855f7',   // purple
  move: 'var(--color-text-muted)',
  age: 'var(--color-gold)',
  legacy: 'var(--color-gold)',
  crisis: '#eab308',      // yellow
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
  const { state } = useGameState();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter noise, keep chronological order (oldest first → newest at bottom)
  const filteredEvents = state.log.filter(e => !isNoisy(e.message));

  // Auto-scroll to bottom when new events appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filteredEvents.length]);

  // Group events by turn number
  const byTurn = new Map<number, typeof filteredEvents>();
  for (const event of filteredEvents) {
    if (!byTurn.has(event.turn)) byTurn.set(event.turn, []);
    byTurn.get(event.turn)!.push(event);
  }
  const sortedTurns = [...byTurn.keys()].sort((a, b) => a - b);

  return (
    <div className="absolute right-0 top-12 bottom-14 w-80 flex flex-col"
      style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderBottom: '1px solid var(--color-border)',
        }}>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold">Event Log</h2>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {filteredEvents.length} events
          </span>
        </div>
        <button onClick={onClose} className="text-sm px-2 py-1 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}>
          X
        </button>
      </div>

      {/* Scrollable event list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="px-4 py-6 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
            No events yet.
          </div>
        ) : (
          <div className="flex flex-col">
            {sortedTurns.map(turn => {
              const events = byTurn.get(turn)!;
              return (
                <div key={turn}>
                  {/* Turn header */}
                  <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider sticky top-0 z-10"
                    style={{
                      backgroundColor: 'var(--color-bg)',
                      color: 'var(--color-text-muted)',
                      borderBottom: '1px solid var(--color-border)',
                    }}>
                    Turn {turn}
                  </div>

                  {/* Events in this turn */}
                  {events.map((event, idx) => {
                    const player = state.players.get(event.playerId);
                    const color = EVENT_COLOR[event.type];
                    const icon = EVENT_ICONS[event.type];

                    return (
                      <div key={idx} className="px-3 py-2"
                        style={{ borderBottom: '1px solid var(--color-border)' }}>
                        {/* Top row: icon + type badge + player */}
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-xs leading-none">{icon}</span>
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
                        <div className="text-xs leading-snug" style={{ color: 'var(--color-text)' }}>
                          {event.message}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
