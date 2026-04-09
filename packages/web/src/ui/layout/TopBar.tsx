import { useGame } from '../../providers/GameProvider';
import { ALL_TECHNOLOGIES, ALL_CIVICS } from '@hex/engine';
import type { TechnologyDef, CivicDef } from '@hex/engine';

interface TopBarProps {
  onOpenTechTree?: () => void;
  onOpenCivicTree?: () => void;
  onOpenDiplomacy?: () => void;
  onOpenLog?: () => void;
  onOpenAge?: () => void;
}

export function TopBar({ onOpenTechTree, onOpenCivicTree, onOpenDiplomacy, onOpenLog, onOpenAge }: TopBarProps) {
  const { state, dispatch, saveGame, loadGame } = useGame();
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

  return (
    <div className="h-12 flex items-center justify-between px-4 select-none"
      style={{ backgroundColor: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)' }}>
      {/* Left: Turn & Age & Notifications */}
      <div className="flex items-center gap-4">
        <span className="text-sm font-bold" style={{ color: 'var(--color-accent)' }}>
          Turn {state.turn}
        </span>
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
          {state.age.currentAge} age
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Units: {[...state.units.values()].filter(u => u.owner === state.currentPlayerId).length}
        </span>
        {recentEvents.length > 0 && (
          <span className="text-xs italic truncate max-w-48" style={{ color: 'var(--color-accent)' }}>
            {recentEvents[recentEvents.length - 1].message}
          </span>
        )}
      </div>

      {/* Center: Resources + Research */}
      <div className="flex items-center gap-4 text-sm">
        <ResourceBadge label="Gold" value={player?.gold ?? 0} color="var(--color-gold)" />
        <ResourceBadge label="Science" value={player?.science ?? 0} color="var(--color-science)" />
        {currentResearchTech && (
          <span className="text-[10px]" style={{ color: 'var(--color-science)' }}>
            {currentResearchTech.name} ({player?.researchProgress ?? 0}/{currentResearchTech.cost})
          </span>
        )}
        <ResourceBadge label="Culture" value={player?.culture ?? 0} color="var(--color-culture)" />
        {currentCivicDef && (
          <span className="text-[10px]" style={{ color: 'var(--color-culture)' }}>
            {currentCivicDef.name} ({player?.civicProgress ?? 0}/{currentCivicDef.cost})
          </span>
        )}
        <ResourceBadge label="Faith" value={player?.faith ?? 0} color="var(--color-faith)" />
        <ResourceBadge label="Influence" value={player?.influence ?? 0} color="rgba(186, 104, 200, 0.9)" />
      </div>

      {/* Right: Tech Tree + End Turn */}
      <div className="flex items-center gap-2">
      <button
        className="px-2 py-1 rounded text-[10px] cursor-pointer"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
        onClick={saveGame}
      >
        Save
      </button>
      <button
        className="px-2 py-1 rounded text-[10px] cursor-pointer"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
        onClick={loadGame}
      >
        Load
      </button>
      <button
        className="px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
        style={{
          backgroundColor: 'var(--color-science)',
          color: 'var(--color-bg)',
        }}
        onClick={onOpenTechTree}
      >
        Tech Tree
      </button>
      <button
        className="px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
        style={{ backgroundColor: 'var(--color-culture)', color: 'var(--color-bg)' }}
        onClick={onOpenCivicTree}
      >
        Civics
      </button>
      <button
        className="px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
        style={{ backgroundColor: 'rgba(186, 104, 200, 0.7)', color: 'var(--color-bg)' }}
        onClick={onOpenDiplomacy}
      >
        Diplo
      </button>
      <button
        className="px-3 py-1.5 rounded text-xs font-bold transition-colors cursor-pointer"
        style={{ backgroundColor: 'var(--color-gold)', color: 'var(--color-bg)' }}
        onClick={onOpenAge}
      >
        Ages
      </button>
      <button
        className="px-2 py-1 rounded text-[10px] cursor-pointer"
        style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}
        onClick={onOpenLog}
      >
        Log
      </button>
      <button
        className="px-4 py-1.5 rounded text-sm font-bold transition-colors cursor-pointer"
        style={{
          backgroundColor: 'var(--color-accent)',
          color: 'var(--color-bg)',
        }}
        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)'}
        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--color-accent)'}
        onClick={() => dispatch({ type: 'END_TURN' })}
      >
        End Turn
      </button>
      </div>
    </div>
  );
}

function ResourceBadge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-1" title={label}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-mono text-xs" style={{ color }}>{value}</span>
    </div>
  );
}
