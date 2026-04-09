import { useGame } from '../../providers/GameProvider';

export function VictoryPanel() {
  const { state } = useGame();

  if (!state.victory.winner) return null;

  const winner = state.players.get(state.victory.winner);

  return (
    <div className="absolute inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}>
      <div className="rounded-xl p-8 text-center max-w-md"
        style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-accent)' }}>
        <h1 className="text-3xl font-bold mb-2" style={{ color: 'var(--color-gold)' }}>
          Victory!
        </h1>
        <h2 className="text-xl mb-4" style={{ color: 'var(--color-text)' }}>
          {winner?.name ?? state.victory.winner}
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-muted)' }}>
          Achieved <span className="font-bold capitalize" style={{ color: 'var(--color-accent)' }}>
            {state.victory.winType}
          </span> victory on turn {state.turn}
        </p>

        {/* Victory progress for all players */}
        <div className="text-left text-xs space-y-2">
          {[...state.victory.progress.entries()].map(([playerId, progress]) => (
            <div key={playerId}>
              <span className="font-bold" style={{ color: 'var(--color-text)' }}>
                {state.players.get(playerId)?.name ?? playerId}
              </span>
              <div className="flex gap-2 mt-1">
                {progress.map(p => (
                  <span key={p.type} className="px-1.5 py-0.5 rounded"
                    style={{
                      backgroundColor: p.achieved ? 'var(--color-accent)' : 'var(--color-bg)',
                      color: p.achieved ? 'var(--color-bg)' : 'var(--color-text-muted)',
                      fontSize: '10px',
                    }}>
                    {p.type}: {Math.round(p.progress * 100)}%
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
