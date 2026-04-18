import { useGameState } from '../../providers/GameProvider';
import { DramaModal } from './DramaModal';
import type { DramaChoice } from './DramaModal';

interface VictoryPanelProps {
  readonly onResolve: () => void;
}

/**
 * VictoryPanel — the "game won" modal. Registered as its own `'victory'`
 * panel id (distinct from the TopBar-triggered `'victoryProgress'` overview).
 * Visibility is owned by the PanelManager; App.tsx auto-opens this panel
 * when `state.victory.winner` becomes truthy.
 *
 * Phase 4.5: Migrated from PanelShell(modal) to DramaModal(tone="triumph").
 * Civ banner hero (color fill + civ glyph). Per-player progress list in body.
 * Two choices: primary "New Game" (reload), secondary "Continue Playing" (onResolve).
 */
export function VictoryPanel({ onResolve }: VictoryPanelProps) {
  const { state } = useGameState();

  if (!state.victory.winner) return null;

  const winner = state.players.get(state.victory.winner);
  const winType = state.victory.winType ?? 'domination';

  // Hero — civ banner with color fill + civ glyph emoji.
  const civColor = getCivColor(state.victory.winner);
  const heroNode = (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: civColor,
        gap: '8px',
      }}
    >
      <div style={{ fontSize: '64px', lineHeight: 1 }}>🏆</div>
      <div
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: 'var(--panel-title-color)',
          textShadow: '0 1px 4px rgba(0,0,0,0.6)',
        }}
      >
        {winner?.name ?? state.victory.winner}
      </div>
    </div>
  );

  // Body — per-player victory progress list (unchanged content).
  const bodyNode = (
    <div style={{ paddingBottom: 'var(--panel-padding-md)' }}>
      <div
        className="text-left text-xs"
        style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        {[...state.victory.progress.entries()].map(([playerId, progress]) => (
          <div key={playerId}>
            <span className="font-bold" style={{ color: 'var(--panel-text-color)' }}>
              {state.players.get(playerId)?.name ?? playerId}
            </span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
              {progress.map(p => (
                <span
                  key={p.type}
                  style={{
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: p.achieved ? 'var(--panel-accent-gold)' : 'var(--panel-muted-bg)',
                    color: p.achieved ? 'var(--panel-turn-badge-text)' : 'var(--panel-muted-color)',
                    fontSize: '10px',
                  }}
                >
                  {p.type}: {Math.round(p.progress * 100)}%
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const choices: ReadonlyArray<DramaChoice> = [
    {
      id: 'new-game',
      label: 'New Game',
      tone: 'primary',
      onSelect: () => window.location.reload(),
    },
    {
      id: 'continue',
      label: 'Continue Playing',
      tone: 'secondary',
      onSelect: onResolve,
    },
  ];

  return (
    <DramaModal
      id="victory"
      title="Victory!"
      subtitle={`${capitalize(winType)} victory • Turn ${state.turn}`}
      hero={heroNode}
      body={bodyNode}
      choices={choices}
      onResolve={onResolve}
      tone="triumph"
    />
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Returns a warm-palette civ color for the victory banner.
 * Cycles through a palette since civ color strings are arbitrary.
 */
function getCivColor(playerId: string): string {
  // Use a deterministic palette cycle based on player id length.
  const colors = [
    'rgba(120, 53, 15, 0.70)',   // amber-brown
    'rgba(30, 64, 175, 0.70)',   // deep blue
    'rgba(120, 27, 86, 0.70)',   // deep purple
    'rgba(6, 78, 59, 0.70)',     // deep green
    'rgba(120, 53, 15, 0.55)',   // lighter amber
  ];
  return colors[playerId.length % colors.length];
}
