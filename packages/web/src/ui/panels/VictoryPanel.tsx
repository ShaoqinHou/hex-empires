import { useState } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { PanelShell } from './PanelShell';
import type { PanelId } from './panelRegistry';

// VictoryPanel uses the `victoryProgress` registry id since the registry
// doesn't carry a separate `victory` entry — both views share the same
// modal slot conceptually.
const PANEL_ID: PanelId = 'victoryProgress';

export function VictoryPanel() {
  const { state } = useGameState();
  const [dismissed, setDismissed] = useState(false);

  if (!state.victory.winner || dismissed) return null;

  const winner = state.players.get(state.victory.winner);

  // VictoryPanel has no external `onClose` prop — its dismissal is purely
  // internal state. The shell's close button reuses the same "Continue
  // Playing" affordance: flip `dismissed` so the panel unmounts.
  const handleClose = () => setDismissed(true);

  return (
    <PanelShell id={PANEL_ID} title="Victory!" onClose={handleClose} priority="modal">
      <div className="text-center">
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

        {/* Action buttons */}
        <div className="flex gap-3 mt-6">
          <button
            className="flex-1 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors"
            style={{ backgroundColor: 'var(--color-accent)', color: 'var(--color-bg)' }}
            onClick={() => window.location.reload()}
          >
            New Game
          </button>
          <button
            className="flex-1 px-4 py-2 rounded-lg text-sm font-bold cursor-pointer transition-colors"
            style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
            onClick={() => setDismissed(true)}
          >
            Continue Playing
          </button>
        </div>
      </div>
    </PanelShell>
  );
}
