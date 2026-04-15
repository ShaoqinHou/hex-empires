import { useGameState } from '../../providers/GameProvider';
import type { VictoryType } from '@hex/engine';
import { PanelShell } from './PanelShell';

const VICTORY_CONFIG: Record<VictoryType, { name: string; icon: string; description: string; color: string }> = {
  domination: { name: 'Domination', icon: '⚔️', description: 'Conquer all enemy capitals', color: '#ef4444' },
  science: { name: 'Science', icon: '🔬', description: 'Complete all technology trees', color: '#3b82f6' },
  culture: { name: 'Culture', icon: '🎭', description: 'Accumulate culture and build wonders', color: '#a855f7' },
  diplomacy: { name: 'Diplomacy', icon: '🤝', description: 'Form alliances and win world congress', color: '#22c55e' },
  economic: { name: 'Economic', icon: '💰', description: 'Accumulate gold and trade routes', color: '#eab308' },
  military: { name: 'Military', icon: '🛡️', description: 'Have the strongest military', color: '#f97316' },
  score: { name: 'Score', icon: '📊', description: 'Have the highest score when max turns reached', color: '#64748b' },
};

interface VictoryProgressPanelProps {
  onClose: () => void;
}

export function VictoryProgressPanel({ onClose }: VictoryProgressPanelProps) {
  const { state } = useGameState();
  const player = state.players.get(state.currentPlayerId);

  if (!player) return null;

  const victoryProgress = state.victory.progress.get(state.currentPlayerId) || [];

  // Sort by progress (highest first)
  const sortedProgress = [...victoryProgress].sort((a, b) => b.progress - a.progress);

  // Per audit, this panel previously bypassed CSS tokens with raw
  // Tailwind slate/amber utilities. As part of the PanelShell migration,
  // chrome (background, borders, title color) is now driven by
  // --panel-* tokens via PanelShell. Inline content swaps trivial slate
  // text utilities to var(--panel-*) tokens; the per-condition accent
  // colors come from `config.color` and the green "achieved" indicator
  // is intentionally retained as a semantic state color.
  // TODO: extract green semantic to --panel-state-success once the token
  // is added.
  return (
    <PanelShell id="victoryProgress" title="🏆 Victory Progress" onClose={onClose} priority="overlay" width="full">
      <p className="text-sm mb-4" style={{ color: 'var(--panel-muted-color)' }}>
        Track your path to victory
      </p>

      {/* Victory conditions grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedProgress.map((vp) => {
          const config = VICTORY_CONFIG[vp.type];
          const pct = Math.round(vp.progress * 100);

          return (
            <div
              key={vp.type}
              className="p-4 rounded-lg border-2 transition-all"
              style={{
                borderColor: vp.achieved ? '#22c55e' : 'var(--panel-border)',
                backgroundColor: vp.achieved ? 'rgba(34,197,94,0.10)' : 'rgba(255,255,255,0.03)',
                boxShadow: vp.achieved ? '0 0 10px rgba(34,197,94,0.20)' : undefined,
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <div className="font-bold text-base" style={{ color: config.color }}>
                      {config.name}
                    </div>
                    {vp.achieved && (
                      <div className="text-xs font-bold" style={{ color: '#22c55e' }}>🎉 VICTORY ACHIEVED!</div>
                    )}
                  </div>
                </div>
                <div
                  className="text-lg font-bold"
                  style={{ color: vp.achieved ? '#22c55e' : 'var(--panel-muted-color)' }}
                >
                  {pct}%
                </div>
              </div>

              {/* Progress bar */}
              <div
                className="w-full rounded-full h-3 mb-2"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
              >
                <div
                  className="h-3 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: vp.achieved ? '#22c55e' : config.color,
                    boxShadow: vp.achieved ? '0 0 10px rgba(34,197,94,0.5)' : 'none',
                  }}
                />
              </div>

              {/* Description */}
              <div className="text-xs" style={{ color: 'var(--panel-muted-color)' }}>
                {config.description}
              </div>

              {/* Milestones hint (simplified) */}
              <div className="mt-2 text-[10px]" style={{ color: 'var(--panel-muted-color)', opacity: 0.7 }}>
                {vp.type === 'science' && 'Research technologies across all ages'}
                {vp.type === 'culture' && 'Build wonders and accumulate culture'}
                {vp.type === 'domination' && `Conquer ${[...state.cities.values()].filter(c => c.isCapital && c.owner !== state.currentPlayerId).length} remaining capitals`}
                {vp.type === 'economic' && 'Accumulate gold and establish trade routes'}
                {vp.type === 'military' && 'Build and maintain a strong military'}
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall status */}
      <div
        className="mt-6 p-4 rounded-lg"
        style={{
          backgroundColor: 'rgba(255,255,255,0.03)',
          border: '1px solid var(--panel-border)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="text-sm">
            <span style={{ color: 'var(--panel-muted-color)' }}>Current Turn:</span>
            <span className="font-bold ml-2" style={{ color: 'var(--panel-text-color)' }}>{state.turn}</span>
          </div>
          <div className="text-sm">
            <span style={{ color: 'var(--panel-muted-color)' }}>Age:</span>
            <span className="font-bold ml-2 capitalize" style={{ color: 'var(--panel-text-color)' }}>{state.age.currentAge}</span>
          </div>
          <div className="text-sm">
            <span style={{ color: 'var(--panel-muted-color)' }}>Leading Victory:</span>
            {/* TODO: swap '#fbbf24' (amber-400) → --panel-accent-gold once panel token covers this hue */}
            <span className="font-bold ml-2 capitalize" style={{ color: 'var(--panel-accent-gold)' }}>
              {sortedProgress[0] ? VICTORY_CONFIG[sortedProgress[0].type].name : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* Close button */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: 'rgba(255,255,255,0.06)',
            color: 'var(--panel-text-color)',
            border: '1px solid var(--panel-border)',
          }}
        >
          Close
        </button>
      </div>
    </PanelShell>
  );
}
