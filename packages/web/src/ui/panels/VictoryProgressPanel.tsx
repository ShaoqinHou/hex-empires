import { useGameState } from '../../providers/GameProvider';
import type { VictoryType } from '@hex/engine';
import { PanelShell } from './PanelShell';

const VICTORY_CONFIG: Record<VictoryType, { name: string; icon: string; description: string; color: string }> = {
  domination: { name: 'Domination', icon: '⚔️', description: 'Conquer all enemy capitals', color: 'var(--color-danger)' },
  science: { name: 'Science', icon: '🔬', description: 'Complete all technology trees', color: 'var(--color-science)' },
  culture: { name: 'Culture', icon: '🎭', description: 'Accumulate culture and build wonders', color: 'var(--color-culture)' },
  economic: { name: 'Economic', icon: '💰', description: 'Accumulate gold and trade routes', color: 'var(--color-gold)' },
  military: { name: 'Military', icon: '🛡️', description: 'Have the strongest military', color: 'var(--color-production)' },
  score: { name: 'Score', icon: '📊', description: 'Have the highest score when max turns reached', color: 'var(--panel-muted-color)' },
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

  // Build per-victory-type rankings across all players
  const allRankings = new Map<VictoryType, Array<{
    name: string;
    progress: number;
    achieved: boolean;
    isCurrentPlayer: boolean;
  }>>();

  for (const [playerId, progressArray] of state.victory.progress) {
    const p = state.players.get(playerId);
    if (!p) continue;
    for (const vp of progressArray) {
      if (!allRankings.has(vp.type)) allRankings.set(vp.type, []);
      allRankings.get(vp.type)!.push({
        name: p.name,
        progress: vp.progress,
        achieved: vp.achieved,
        isCurrentPlayer: playerId === state.currentPlayerId,
      });
    }
  }
  for (const entries of allRankings.values()) {
    entries.sort((a, b) => b.progress - a.progress);
  }

  return (
    <PanelShell id="victoryProgress" title="🏆 Victory Progress" onClose={onClose} priority="overlay" width="full">
      <p className="text-sm mb-4" style={{ color: 'var(--panel-muted-color)' }}>
        Track your path to victory
      </p>

      {/* Your Progress cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sortedProgress.map((vp) => {
          const config = VICTORY_CONFIG[vp.type];
          const pct = Math.round(vp.progress * 100);

          return (
            <div
              key={vp.type}
              className="p-4 rounded-lg border-2 transition-all"
              style={{
                borderColor: vp.achieved ? 'var(--tech-state-researched)' : 'var(--panel-border)',
                backgroundColor: vp.achieved
                  ? 'color-mix(in srgb, var(--tech-state-researched) 10%, transparent)'
                  : 'rgba(255,255,255,0.03)',
                boxShadow: vp.achieved
                  ? 'color-mix(in srgb, var(--tech-state-researched) 20%, transparent) 0 0 10px'
                  : undefined,
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
                      <div className="text-xs font-bold" style={{ color: 'var(--tech-state-researched)' }}>🎉 VICTORY ACHIEVED!</div>
                    )}
                  </div>
                </div>
                <div
                  className="text-lg font-bold"
                  style={{ color: vp.achieved ? 'var(--tech-state-researched)' : 'var(--panel-muted-color)' }}
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
                    backgroundColor: vp.achieved ? 'var(--tech-state-researched)' : config.color,
                    boxShadow: vp.achieved
                      ? 'color-mix(in srgb, var(--tech-state-researched) 50%, transparent) 0 0 10px'
                      : 'none',
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

      {/* All Players Ranking */}
      <div className="mt-6">
        <h3 style={{
          color: 'var(--panel-text-color)',
          fontSize: '14px',
          fontWeight: 'bold',
          marginBottom: '12px',
          paddingBottom: '6px',
          borderBottom: '1px solid var(--panel-border)',
        }}>
          All Players Ranking
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {(Object.keys(VICTORY_CONFIG) as VictoryType[]).map(vtype => {
            const entries = allRankings.get(vtype) ?? [];
            const config = VICTORY_CONFIG[vtype];
            return (
              <div
                key={vtype}
                style={{
                  border: '1px solid var(--panel-border)',
                  borderRadius: 'var(--panel-radius)',
                  padding: 'var(--panel-padding-md)',
                }}
              >
                <div style={{ color: config.color, fontWeight: 'bold', fontSize: '13px', marginBottom: 4 }}>
                  {config.icon} {config.name}
                </div>
                {entries.length === 0 ? (
                  <div style={{ color: 'var(--panel-muted-color)', fontSize: '11px' }}>No data</div>
                ) : (
                  entries.map((e, i) => (
                    <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                      <span style={{ color: 'var(--panel-muted-color)', fontSize: '11px', minWidth: 16 }}>#{i + 1}</span>
                      <span style={{
                        flex: 1,
                        fontSize: '12px',
                        color: e.isCurrentPlayer ? 'var(--panel-accent-gold)' : 'var(--panel-text-color)',
                        fontWeight: e.isCurrentPlayer ? 'bold' : 'normal',
                      }}>
                        {e.name}{e.achieved ? ' 🏆' : ''}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--panel-muted-color)', minWidth: 40, textAlign: 'right' }}>
                        {Math.round(e.progress * 100)}%
                      </span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
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
