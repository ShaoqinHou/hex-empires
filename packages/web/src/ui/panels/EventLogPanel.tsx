import { useEffect, useRef, useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import type { GameEvent } from '@hex/engine';
import { PanelShell } from './PanelShell';
import type { PanelId } from './panelRegistry';

interface EventLogPanelProps {
  onClose: () => void;
}

const PANEL_ID: PanelId = 'log';

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

// CSS color tokens per type — no raw hex values
const EVENT_COLOR: Record<GameEvent['type'], string> = {
  combat: 'var(--color-health-low)',
  city: 'var(--color-food)',
  research: 'var(--color-science)',
  civic: 'var(--color-culture)',
  diplomacy: 'var(--panel-accent-purple)',
  move: 'var(--color-text-muted)',
  age: 'var(--color-gold)',
  legacy: 'var(--color-gold)',
  crisis: 'var(--color-gold)',
  victory: 'var(--color-accent)',
  production: 'var(--color-production)',
};

const FILTER_TYPES: Array<GameEvent['type'] | null> = [
  null, 'combat', 'city', 'research', 'civic', 'diplomacy', 'age', 'crisis', 'victory', 'production',
];

const FILTER_LABELS: Record<string, string> = {
  null: 'All',
  combat: '⚔️ Combat',
  city: '🏰 City',
  research: '🔬 Research',
  civic: '📜 Civic',
  diplomacy: '🤝 Diplomacy',
  age: '🌅 Age',
  crisis: '⚡ Crisis',
  victory: '🏆 Victory',
  production: '🔨 Build',
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
  const [activeCategory, setActiveCategory] = useState<GameEvent['type'] | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter noise, apply category filter, apply search query
  const filteredEvents = state.log.filter(e =>
    !isNoisy(e.message) &&
    (activeCategory === null || e.type === activeCategory) &&
    (searchQuery === '' || e.message.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
    <PanelShell id={PANEL_ID} title="Event Log" onClose={onClose} priority="info">
      <div className="flex flex-col h-full">
        {/* Search input */}
        <input
          type="text"
          placeholder="Search events…"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full text-xs mb-2 px-2 py-1 rounded"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--panel-bg) 80%, transparent)',
            border: '1px solid var(--panel-border)',
            color: 'var(--panel-text-color)',
            outline: 'none',
          }}
        />

        {/* Category filter pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 mb-2" style={{ scrollbarWidth: 'none' }}>
          {FILTER_TYPES.map(type => {
            const isActive = activeCategory === type;
            const label = FILTER_LABELS[type ?? 'null'];
            return (
              <button
                key={type ?? 'all'}
                type="button"
                onClick={() => setActiveCategory(type)}
                className="flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full transition-colors"
                style={{
                  border: `1px solid ${isActive ? 'var(--panel-accent-gold)' : 'var(--panel-border)'}`,
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--panel-accent-gold) 15%, transparent)'
                    : 'transparent',
                  color: isActive ? 'var(--panel-accent-gold)' : 'var(--panel-muted-color)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Event count with filter context */}
        <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''}
          {(activeCategory !== null || searchQuery !== '') && ' (filtered)'}
        </div>

        {/* Scrollable event list */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto -mx-4">
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
    </PanelShell>
  );
}
