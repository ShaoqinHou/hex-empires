import { useGameState } from '../../providers/GameProvider';
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
  const { state, dispatch, saveGame, loadGame } = useGameState();
  const [showAudioSettings, setShowAudioSettings] = useState(false);
  const [showVictoryProgress, setShowVictoryProgress] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const player = state.players.get(state.currentPlayerId);

  const currentResearchTech: TechnologyDef | undefined = player?.currentResearch
    ? ALL_TECHNOLOGIES.find(t => t.id === player.currentResearch)
    : undefined;

  const currentCivicDef: CivicDef | undefined = player?.currentCivic
    ? ALL_CIVICS.find(c => c.id === player.currentCivic)
    : undefined;

  const resourceChanges = calculateResourceChanges(state, state.currentPlayerId);

  // Units with remaining movement (for indicator, not for blocking End Turn)
  const unitsWithMovement = [...state.units.values()].filter(
    u => u.owner === state.currentPlayerId && u.movementLeft > 0
  ).length;

  return (
    <div className="h-12 flex items-center justify-between px-3 select-none"
      style={{
        background: 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg) 100%)',
        borderBottom: '2px solid var(--color-border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
        zIndex: 100,
      }}>

      {/* Left: Turn & Age */}
      <div className="flex items-center gap-3">
        <div className="px-2.5 py-1 rounded"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
            boxShadow: '0 2px 4px rgba(88, 166, 255, 0.3)',
          }}>
          <span className="text-xs font-bold" style={{ color: '#0d1117' }}>
            Turn {state.turn}
          </span>
        </div>
        <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {state.age.currentAge}
        </span>
      </div>

      {/* Center: Resources */}
      <div className="flex items-center gap-3">
        <ResourcePill icon="💰" label="Gold" value={player?.gold ?? 0} perTurn={resourceChanges.goldPerTurn} color="var(--color-gold)" />
        <ResourcePill icon="🔬" label="Sci" value={player?.science ?? 0} perTurn={resourceChanges.sciencePerTurn} color="var(--color-science)" />
        <ResourcePill icon="🎭" label="Cul" value={player?.culture ?? 0} perTurn={resourceChanges.culturePerTurn} color="var(--color-culture)" />
        <ResourcePill icon="⛪" label="Fai" value={player?.faith ?? 0} perTurn={0} color="var(--color-faith)" />
        <ResourcePill icon="🤝" label="Inf" value={player?.influence ?? 0} perTurn={0} color="rgba(186, 104, 200, 0.9)" />

        {/* Research progress */}
        {currentResearchTech && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--color-science)', backgroundColor: 'rgba(77, 171, 247, 0.1)' }}>
            🔬 {currentResearchTech.name} ({player?.researchProgress ?? 0}/{currentResearchTech.cost})
          </span>
        )}

        <WarningIndicator summary={resourceChanges} />
      </div>

      {/* Right: Panel buttons + End Turn */}
      <div className="flex items-center gap-1.5">
        <PanelButton label="Tech" color="#4dabf7" onClick={onOpenTechTree} />
        <PanelButton label="Civics" color="#cc5de8" onClick={onOpenCivicTree} />
        <PanelButton label="Diplo" color="#ba68c8" onClick={onOpenDiplomacy} />
        <PanelButton label="Ages" color="#ffd54f" dark onClick={onOpenAge} />

        {/* More menu for secondary actions */}
        <div className="relative">
          <button
            className="px-3 py-1.5 rounded text-xs cursor-pointer hover:opacity-80"
            style={{ color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', minHeight: '28px', minWidth: '28px' }}
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          >
            ⋯
          </button>
          {showMoreMenu && (
            <div className="absolute right-0 top-9 rounded-lg shadow-xl py-1 z-50 min-w-36"
              style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
              <MenuButton label="👑 Governors" onClick={() => { onOpenGovernors?.(); setShowMoreMenu(false); }} />
              <MenuButton label="📜 Event Log" onClick={() => { onOpenLog?.(); setShowMoreMenu(false); }} />
              <MenuButton label="📊 Summary" onClick={() => { onOpenTurnSummary?.(); setShowMoreMenu(false); }} />
              <MenuButton label="🏆 Victory" onClick={() => { setShowVictoryProgress(true); setShowMoreMenu(false); }} />
              <div className="h-px my-1" style={{ backgroundColor: 'var(--color-border)' }} />
              <MenuButton label="💾 Save" onClick={() => { saveGame(); setShowMoreMenu(false); }} />
              <MenuButton label="📂 Load" onClick={() => { loadGame(); setShowMoreMenu(false); }} />
              <MenuButton label="🔊 Audio" onClick={() => { setShowAudioSettings(true); setShowMoreMenu(false); }} />
            </div>
          )}
        </div>

        {/* End Turn — always clickable */}
        <button
          className="px-5 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all hover:brightness-110 ml-1"
          style={{
            background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
            color: '#fff',
            boxShadow: '0 2px 8px rgba(34, 197, 94, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            minHeight: '32px',
          }}
          onClick={() => dispatch({ type: 'END_TURN' })}
        >
          End Turn →
          {unitsWithMovement > 0 && (
            <span className="ml-1.5 text-xs opacity-75">({unitsWithMovement} unmoved)</span>
          )}
        </button>
      </div>

      {/* Floating panels */}
      {showAudioSettings && (
        <div className="absolute top-14 right-4 w-80 rounded-lg shadow-xl p-4 z-50"
          style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Audio Settings</h3>
            <button onClick={() => setShowAudioSettings(false)} className="text-lg cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>✕</button>
          </div>
          <AudioSettings />
        </div>
      )}

      {showVictoryProgress && (
        <VictoryProgressPanel onClose={() => setShowVictoryProgress(false)} />
      )}
    </div>
  );
}

function ResourcePill({ icon, label, value, perTurn, color }: { icon: string; label: string; value: number; perTurn: number; color: string }) {
  return (
    <div className="flex items-center gap-1" title={`${label}: ${value} (${perTurn >= 0 ? '+' : ''}${perTurn}/turn)`}>
      <span className="text-xs">{icon}</span>
      <span className="font-mono text-xs font-bold" style={{ color }}>{value}</span>
      {perTurn !== 0 && (
        <span className="text-xs" style={{ color: perTurn >= 0 ? 'var(--color-food)' : 'var(--color-health-low)' }}>
          {perTurn >= 0 ? '+' : ''}{perTurn}
        </span>
      )}
    </div>
  );
}

function PanelButton({ label, color, dark, onClick }: { label: string; color: string; dark?: boolean; onClick?: () => void }) {
  return (
    <button
      className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all hover:brightness-110"
      style={{
        background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
        color: dark ? '#0d1117' : '#fff',
        border: `1px solid ${color}80`,
        minHeight: '28px',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="w-full text-left px-3 py-1.5 text-xs cursor-pointer hover:brightness-125"
      style={{ color: 'var(--color-text)' }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-elevated)'; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}
