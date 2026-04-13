import React from 'react';
import { useGameState } from '../../providers/GameProvider';
import type { VictoryType, VictoryProgress } from '@hex/engine';

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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 rounded-xl p-6 max-w-3xl w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-amber-400">🏆 Victory Progress</h2>
            <p className="text-sm text-slate-400 mt-1">Track your path to victory</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors px-3 py-1 text-xl"
          >
            ✕
          </button>
        </div>

        {/* Victory conditions grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sortedProgress.map((vp) => {
            const config = VICTORY_CONFIG[vp.type];
            const pct = Math.round(vp.progress * 100);

            return (
              <div
                key={vp.type}
                className={`p-4 rounded-lg border-2 transition-all ${
                  vp.achieved
                    ? 'border-green-500 bg-green-900/20 shadow-lg shadow-green-500/20'
                    : 'border-slate-700 bg-slate-800/50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{config.icon}</span>
                    <div>
                      <div className="font-bold text-base" style={{ color: config.color }}>
                        {config.name}
                      </div>
                      {vp.achieved && (
                        <div className="text-xs font-bold text-green-400">🎉 VICTORY ACHIEVED!</div>
                      )}
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${vp.achieved ? 'text-green-400' : 'text-slate-400'}`}>
                    {pct}%
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-700 rounded-full h-3 mb-2">
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
                <div className="text-xs text-slate-400">
                  {config.description}
                </div>

                {/* Milestones hint (simplified) */}
                <div className="mt-2 text-[10px] text-slate-500">
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
        <div className="mt-6 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-slate-400">Current Turn:</span>
              <span className="text-white font-bold ml-2">{state.turn}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">Age:</span>
              <span className="text-white font-bold ml-2 capitalize">{state.age.currentAge}</span>
            </div>
            <div className="text-sm">
              <span className="text-slate-400">Leading Victory:</span>
              <span className="text-amber-400 font-bold ml-2 capitalize">
                {sortedProgress[0] ? VICTORY_CONFIG[sortedProgress[0].type].name : 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Close button */}
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
