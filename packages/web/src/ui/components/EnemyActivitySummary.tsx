import { useEffect, useState } from 'react';
import { useGame } from '../../providers/GameProvider';

interface EnemyActivitySummaryProps {
  onClose?: () => void;
}

export function EnemyActivitySummary({ onClose }: EnemyActivitySummaryProps) {
  const { state } = useGame();
  const [show, setShow] = useState(false);
  const [activities, setActivities] = useState<string[]>([]);

  useEffect(() => {
    // Show summary when turn changes to human player
    const currentPlayer = state.players.get(state.currentPlayerId);
    const isHumanTurn = currentPlayer?.isHuman ?? false;

    if (isHumanTurn) {
      // Collect enemy activities from the previous turn
      const enemyActivities = state.log.filter(
        e => e.turn === state.turn && e.playerId !== state.currentPlayerId
      );

      if (enemyActivities.length > 0) {
        const summary = enemyActivities.map(e => {
          const player = state.players.get(e.playerId);
          const playerName = player?.name ?? 'Unknown';
          return `${playerName}: ${e.message}`;
        });

        setActivities(summary);
        setShow(true);

        // Auto-hide after 8 seconds
        const timer = setTimeout(() => {
          setShow(false);
          onClose?.();
        }, 8000);

        return () => clearTimeout(timer);
      }
    }
  }, [state.turn, state.currentPlayerId, state.log, state.players, onClose]);

  if (!show || activities.length === 0) return null;

  return (
    <div className="fixed top-20 left-4 z-40 pointer-events-auto">
      <div
        className="bg-surface border rounded-lg shadow-lg max-w-sm"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Header */}
        <div className="px-4 py-2 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
          <div
            className="text-sm font-bold"
            style={{ color: 'var(--color-accent)' }}
          >
            Enemy Activity
          </div>
          <button
            className="text-xs hover:text-red-400 transition-colors px-1"
            style={{ color: 'var(--color-text-muted)' }}
            onClick={() => {
              setShow(false);
              onClose?.();
            }}
          >
            ×
          </button>
        </div>

        {/* Activities list */}
        <div className="px-4 py-2 space-y-2 max-h-64 overflow-y-auto">
          {activities.map((activity, index) => (
            <div
              key={index}
              className="text-xs p-2 rounded"
              style={{
                backgroundColor: 'var(--color-bg)',
                color: 'var(--color-text)',
                borderLeft: '2px solid var(--color-accent)',
              }}
            >
              {activity}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div
          className="px-4 py-2 text-xs italic text-center border-t"
          style={{
            color: 'var(--color-text-muted)',
            borderColor: 'var(--color-border)',
          }}
        >
          Click outside or wait to dismiss
        </div>
      </div>

      {/* Backdrop to dismiss on click */}
      {show && (
        <div
          className="fixed inset-0 z-[-1]"
          onClick={() => {
            setShow(false);
            onClose?.();
          }}
        />
      )}
    </div>
  );
}
