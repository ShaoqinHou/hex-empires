import { useGame } from '../../providers/GameProvider';
import { ALL_TECHNOLOGIES, ALL_CIVICS, calculateResourceChanges } from '@hex/engine';
import type { TechnologyDef, CivicDef } from '@hex/engine';
import { ResourceChangeBadge, WarningIndicator } from '../components/ResourceChangeBadge';
import { useState } from 'react';
import { AudioSettings } from '../components/AudioSettings';
import { VictoryProgressPanel } from '../panels/VictoryProgressPanel';

interface TopBarProps {
  onOpenTechTree?: () => void;
  onOpenCivicTree?: () => void;
  onOpenDiplomacy?: () => void;
  onOpenLog?: () => void;
  onOpenAge?: () => void;
  onOpenTurnSummary?: () => void;
  onOpenGovernors?: () => void;
}

export function TopBar({ onOpenTechTree, onOpenCivicTree, onOpenDiplomacy, onOpenLog, onOpenAge, onOpenTurnSummary, onOpenGovernors }: TopBarProps) {
  const { state, dispatch, saveGame, loadGame } = useGame();
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showVictoryProgress, setShowVictoryProgress] = useState(false);
  const player = state.players.get(state.currentPlayerId);

  // Recent log entries for the current player (from previous turn)
  const recentEvents = state.log
    .filter(e => e.playerId === state.currentPlayerId && e.turn === state.turn - 1)
    .slice(-2);

  // Current research info
  const currentResearchTech: TechnologyDef | undefined = player?.currentResearch
    ? ALL_TECHNOLOGIES.find(t => t.id === player.currentResearch)
    : undefined;

  // Current civic info
  const currentCivicDef: CivicDef | undefined = player?.currentCivic
    ? ALL_CIVICS.find(c => c.id === player.currentCivic)
    : undefined;

  // Calculate per-turn resource changes
  const resourceChanges = calculateResourceChanges(state, state.currentPlayerId);

  // Check if player has any available actions
  const hasActionsAvailable = (() => {
    // Check if any units have movement left
    const unitsWithMovement = [...state.units.values()].filter(
      u => u.owner === state.currentPlayerId && u.movementLeft > 0
    );

    // Check if any cities have production queues that can be set
    const citiesWithActions = [...state.cities.values()].filter(
      c => c.owner === state.currentPlayerId && c.productionQueue.length === 0
    );

    return unitsWithMovement.length > 0 || citiesWithActions.length > 0;
  })();

  return (
    <div className="h-14 flex items-center justify-between px-4 select-none"
      style={{
        background: 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg) 100%)',
        borderBottom: '2px solid var(--color-border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        zIndex: 100
      }}>
      {/* Left: Turn & Age & Notifications */}
      <div className="flex items-center gap-4">
        <div
          className="px-3 py-1 rounded"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
            boxShadow: '0 2px 4px rgba(88, 166, 255, 0.3)',
          }}
        >
          <span className="text-sm font-bold" style={{ color: '#0d1117' }}>
            Turn {state.turn}
          </span>
        </div>
        <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {state.age.currentAge} Age
        </span>
        <span className="text-xs px-2 py-0.5 rounded" style={{
          color: 'var(--color-text-muted)',
          backgroundColor: 'rgba(139, 148, 158, 0.1)'
        }}>
          Units: {[...state.units.values()].filter(u => u.owner === state.currentPlayerId).length}
        </span>
        {recentEvents.length > 0 && (
          <span className="text-xs italic truncate max-w-48 px-2 py-0.5 rounded" style={{
            color: 'var(--color-accent)',
            backgroundColor: 'rgba(88, 166, 255, 0.1)',
            border: '1px solid rgba(88, 166, 255, 0.2)'
          }}>
            {recentEvents[recentEvents.length - 1].message}
          </span>
        )}
      </div>

      {/* Center: Resources + Research */}
      <div className="flex items-center gap-3 text-sm">
        {/* Gold with per-turn indicator */}
        <div className="flex items-center gap-1">
          <ResourceBadge label="Gold" value={player?.gold ?? 0} color="var(--color-gold)" />
          <span className="font-mono text-[10px]" style={{ color: resourceChanges.goldPerTurn >= 0 ? 'var(--color-food)' : 'var(--color-health-low)' }}>
            {resourceChanges.goldPerTurn >= 0 ? '+' : ''}{resourceChanges.goldPerTurn}/turn
          </span>
        </div>

        {/* Science with per-turn indicator */}
        <div className="flex items-center gap-1">
          <ResourceBadge label="Science" value={player?.science ?? 0} color="var(--color-science)" />
          {resourceChanges.sciencePerTurn > 0 && (
            <span className="font-mono text-xs" style={{ color: 'var(--color-science)' }}>
              (+{resourceChanges.sciencePerTurn})
            </span>
          )}
        </div>

        {currentResearchTech && (
          <span className="text-[10px]" style={{ color: 'var(--color-science)' }}>
            {currentResearchTech.name} ({player?.researchProgress ?? 0}/{currentResearchTech.cost})
          </span>
        )}

        {/* Culture with per-turn indicator */}
        <div className="flex items-center gap-1">
          <ResourceBadge label="Culture" value={player?.culture ?? 0} color="var(--color-culture)" />
          {resourceChanges.culturePerTurn > 0 && (
            <span className="font-mono text-xs" style={{ color: 'var(--color-culture)' }}>
              (+{resourceChanges.culturePerTurn})
            </span>
          )}
        </div>

        {currentCivicDef && (
          <span className="text-[10px]" style={{ color: 'var(--color-culture)' }}>
            {currentCivicDef.name} ({player?.civicProgress ?? 0}/{currentCivicDef.cost})
          </span>
        )}

        <ResourceBadge label="Faith" value={player?.faith ?? 0} color="var(--color-faith)" />
        <ResourceBadge label="Influence" value={player?.influence ?? 0} color="rgba(186, 104, 200, 0.9)" />

        {/* Warning indicator for critical shortages */}
        <WarningIndicator summary={resourceChanges} />
      </div>

      {/* Right: Audio Settings + Tech Tree + End Turn */}
      <div className="flex items-center gap-2">
        {/* Audio settings toggle */}
        <button
          className="px-2 py-1 rounded text-[10px] cursor-pointer transition-all hover:scale-105"
          style={{
            background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)',
            color: 'var(--color-text-muted)',
            border: '1px solid var(--color-border)',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
          }}
          onClick={() => setShowAudioSettings(!showAudioSettings)}
          title="Audio Settings"
        >
          🔊
        </button>
      <button
        className="px-2 py-1 rounded text-[10px] cursor-pointer transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
        }}
        onClick={() => {
          saveGame();
        }}
      >
        Save
      </button>
      <button
        className="px-2 py-1 rounded text-[10px] cursor-pointer transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
        }}
        onClick={() => {
          loadGame();
        }}
      >
        Load
      </button>
      <button
        className="px-2 py-1 rounded text-[10px] cursor-pointer transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
          color: '#0d1117',
          border: '1px solid rgba(88, 166, 255, 0.3)',
          boxShadow: '0 1px 3px rgba(88, 166, 255, 0.2)'
        }}
        onClick={() => {
          window.open('/QUICK_START.md', '_blank');
        }}
        title="Quick Start Guide"
      >
        ❓ Help
      </button>
      <button
        className="px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--color-science) 0%, #3b8dbd 100%)',
          color: '#ffffff',
          border: '1px solid #5aa9f7',
          boxShadow: '0 2px 4px rgba(77, 171, 247, 0.3)',
        }}
        onClick={onOpenTechTree}
      >
        📚 Tech
      </button>
      <button
        className="px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--color-culture) 0%, #9b4dcb 100%)',
          color: '#ffffff',
          border: '1px solid #d67de8',
          boxShadow: '0 2px 4px rgba(204, 93, 232, 0.3)',
        }}
        onClick={onOpenCivicTree}
      >
        🎭 Civics
      </button>
      <button
        className="px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, rgba(186, 104, 200, 0.8) 0%, rgba(156, 84, 180, 0.8) 100%)',
          color: '#ffffff',
          border: '1px solid rgba(186, 104, 200, 0.5)',
          boxShadow: '0 2px 4px rgba(186, 104, 200, 0.3)',
        }}
        onClick={onOpenDiplomacy}
      >
        🤝 Diplo
      </button>
      <button
        className="px-3 py-1.5 rounded text-xs font-bold transition-all cursor-pointer hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--color-gold) 0%, #e6c200 100%)',
          color: '#0d1117',
          border: '1px solid #ffe066',
          boxShadow: '0 2px 4px rgba(255, 213, 79, 0.3)',
        }}
        onClick={onOpenAge}
      >
        ⚡ Ages
      </button>
      <button
        className="px-2 py-1 rounded text-[10px] cursor-pointer transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
        }}
        onClick={onOpenLog}
      >
        📜 Log
      </button>
      <button
        className="px-2 py-1 rounded text-[10px] cursor-pointer transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
        }}
        onClick={onOpenTurnSummary}
        title="View turn summary and resource changes"
      >
        📊 Summary
      </button>
      <button
        className="px-2 py-1 rounded text-[10px] cursor-pointer transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, var(--color-bg) 0%, var(--color-surface) 100%)',
          color: 'var(--color-text-muted)',
          border: '1px solid var(--color-border)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
        }}
        onClick={onOpenGovernors}
        title="Manage governors"
      >
        👑 Gov
      </button>
      <button
        className="px-2 py-1 rounded text-[10px] cursor-pointer transition-all hover:scale-105"
        style={{
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          color: '#0d1117',
          border: '1px solid #fde047',
          boxShadow: '0 1px 3px rgba(251, 191, 36, 0.4)'
        }}
        onClick={() => setShowVictoryProgress(true)}
        title="View victory progress"
      >
        🏆 Victory
      </button>
      <button
        className="px-5 py-2 rounded text-base font-bold transition-all"
        style={{
          background: hasActionsAvailable
            ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)'
            : 'linear-gradient(135deg, var(--color-text-muted) 0%, #6e7681 100%)',
          color: '#0d1117',
          cursor: hasActionsAvailable ? 'pointer' : 'not-allowed',
          opacity: hasActionsAvailable ? 1 : 0.5,
          boxShadow: hasActionsAvailable
            ? '0 4px 12px rgba(88, 166, 255, 0.4), 0 0 20px rgba(88, 166, 255, 0.2)'
            : 'none',
          border: hasActionsAvailable ? '2px solid rgba(255, 255, 255, 0.3)' : '2px solid transparent',
        }}
        onMouseEnter={(e) => {
          if (hasActionsAvailable) {
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (hasActionsAvailable) {
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
        onClick={() => {
          if (hasActionsAvailable) dispatch({ type: 'END_TURN' });
        }}
        disabled={!hasActionsAvailable}
      >
        ⚔️ End Turn {hasActionsAvailable && '→'}
        {!hasActionsAvailable && (
          <span className="ml-1 text-xs">(No actions)</span>
        )}
      </button>
      </div>

      {/* Audio Settings Panel */}
      {showAudioSettings && (
        <div
          className="absolute top-14 right-4 w-80 rounded-lg shadow-xl p-4 z-50"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
              Audio Settings
            </h3>
            <button
              onClick={() => setShowAudioSettings(false)}
              className="text-lg"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ✕
            </button>
          </div>
          <AudioSettings />
        </div>
      )}

      {/* Victory Progress Panel */}
      {showVictoryProgress && (
        <VictoryProgressPanel onClose={() => setShowVictoryProgress(false)} />
      )}
    </div>
  );
}

function ResourceBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1" title={label}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="text-xs" style={{ color: 'var(--color-text-muted)', fontSize: '10px' }}>{label.slice(0, 3).toUpperCase()}</span>
      <span className="font-mono text-xs font-bold" style={{ color }}>{value}</span>
    </div>
  );
}
