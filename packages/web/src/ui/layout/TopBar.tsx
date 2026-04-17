import { useGameState } from '../../providers/GameProvider';
import { ALL_TECHNOLOGIES, ALL_CIVICS, calculateResourceChanges, allUnitsHaveActed } from '@hex/engine';
import type { TechnologyDef, CivicDef } from '@hex/engine';
import { ResourceChangeBadge, WarningIndicator } from '../components/ResourceChangeBadge';
import { useState } from 'react';
import { usePanelManager } from '../panels/PanelManager';
import { PANEL_REGISTRY } from '../panels/panelRegistry';
import type { PanelId } from '../panels/panelRegistry';
import { KeyBadge } from './KeyBadge';

/** Resource chips that always render even when zero — core economy signals. */
const CORE_RESOURCES = new Set(['gold', 'science', 'culture']);

export function TopBar() {
  const { state, dispatch, saveGame, loadGame } = useGameState();
  const { togglePanel } = usePanelManager();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);

  const handleSave = () => {
    saveGame();
    setSaveToast('Game saved');
    setTimeout(() => setSaveToast(null), 2000);
    setShowMoreMenu(false);
  };
  const player = state.players.get(state.currentPlayerId);

  const currentResearchTech: TechnologyDef | undefined = player?.currentResearch
    ? ALL_TECHNOLOGIES.find(t => t.id === player.currentResearch)
    : undefined;

  const currentCivicDef: CivicDef | undefined = player?.currentCivic
    ? ALL_CIVICS.find(c => c.id === player.currentCivic)
    : undefined;

  const resourceChanges = calculateResourceChanges(state, state.currentPlayerId);

  // True when every unit has acted (moved or fortified) — drives the End Turn pulse.
  const turnReady = allUnitsHaveActed(state);

  // Units still waiting on player orders — shown as a reminder badge on End Turn.
  const unitsWithMovement = [...state.units.values()].filter(
    u => u.owner === state.currentPlayerId && u.movementLeft > 0 && !u.fortified
  ).length;

  // Closes overflow menu and toggles the panel — hoisted so menu items stay slim.
  const openFromMenu = (id: PanelId) => {
    togglePanel(id);
    setShowMoreMenu(false);
  };

  return (
    <div className="h-12 flex items-center justify-between px-3 select-none layout-chrome-bar"
      style={{
        background: 'linear-gradient(180deg, var(--color-surface) 0%, var(--color-bg) 100%)',
        borderBottom: '2px solid var(--color-border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}>

      {/* Left: Turn & Age */}
      <div className="flex items-center gap-3">
        <div className="px-2.5 py-1 rounded"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
            boxShadow: '0 2px 4px rgba(88, 166, 255, 0.3)',
            border: '1px solid var(--panel-turn-badge-border)',
          }}>
          <span className="text-xs font-bold" style={{ color: 'var(--panel-turn-badge-text)' }}>
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
        <ResourcePill icon="⛪" label="Fai" value={player?.faith ?? 0} perTurn={0} color="var(--color-faith)" hideWhenZero />
        <ResourcePill icon="🤝" label="Inf" value={player?.influence ?? 0} perTurn={0} color="rgba(186, 104, 200, 0.9)" hideWhenZero />

        {/* Research progress */}
        {currentResearchTech && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--color-science)', backgroundColor: 'rgba(77, 171, 247, 0.1)' }}>
            🔬 {currentResearchTech.name} ({player?.researchProgress ?? 0}/{currentResearchTech.cost})
          </span>
        )}

        <WarningIndicator summary={resourceChanges} />
      </div>

      {/* Right: Panel buttons + End Turn.
          All panel-button accent colors tokenized via --panel-button-*. */}
      <div className="flex items-center gap-1.5">
        <PanelButton label="Tech" color="var(--panel-button-tech)" panelId="tech" onClick={() => togglePanel('tech')} />
        <PanelButton label="Civics" color="var(--panel-button-civics)" panelId="civics" onClick={() => togglePanel('civics')} />
        <PanelButton label="Diplo" color="var(--panel-button-diplomacy)" panelId="diplomacy" onClick={() => togglePanel('diplomacy')} />
        <PanelButton label="Ages" color="var(--panel-button-age)" dark panelId="age" onClick={() => togglePanel('age')} />

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
            <div className="absolute right-0 top-9 rounded-lg shadow-xl py-1 min-w-36 layout-chrome-overlay"
              style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                boxShadow: 'var(--panel-shadow)',
                borderRadius: 'var(--panel-radius)',
              }}>
              <MenuButton label="🤝 Trade Routes (X)" testId="open-trade-routes" panelId="tradeRoutes" onClick={() => openFromMenu('tradeRoutes')} />
              <MenuButton label="👑 Governors" panelId="governors" onClick={() => openFromMenu('governors')} />
              <MenuButton label="🙏 Religion (R)" testId="open-religion" panelId="religion" onClick={() => openFromMenu('religion')} />
              <MenuButton label="🏛 Government (G)" testId="open-government" panelId="government" onClick={() => openFromMenu('government')} />
              <MenuButton label="🎖 Commanders (K)" testId="open-commanders" panelId="commanders" onClick={() => openFromMenu('commanders')} />
              <MenuButton label="📜 Event Log" panelId="log" onClick={() => openFromMenu('log')} />
              <MenuButton label="📊 Summary" panelId="turnSummary" onClick={() => openFromMenu('turnSummary')} />
              <MenuButton label="🏆 Victory" panelId="victoryProgress" onClick={() => openFromMenu('victoryProgress')} />
              <div className="h-px my-1" style={{ backgroundColor: 'var(--color-border)' }} />
              <MenuButton label="💾 Save" onClick={handleSave} />
              <MenuButton label="📂 Load" onClick={() => { loadGame(); setShowMoreMenu(false); }} />
              <MenuButton label="🔊 Audio" panelId="audioSettings" onClick={() => openFromMenu('audioSettings')} />
              <MenuButton label="❓ Help (H)" panelId="help" onClick={() => openFromMenu('help')} />
            </div>
          )}
        </div>

        {/* End Turn — always clickable. Pulses (end-turn-ready class) when all
            units have acted, signalling the player they can safely advance.
            Animation respects prefers-reduced-motion via CSS. */}
        <button
          data-testid="end-turn-button"
          className={`px-5 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all hover:brightness-110 ml-1${turnReady ? ' end-turn-ready' : ''}`}
          style={{
            background: 'linear-gradient(135deg, var(--color-food) 0%, color-mix(in srgb, var(--color-food) 80%, transparent) 100%)',
            color: '#fff',
            boxShadow: turnReady ? '0 2px 8px color-mix(in srgb, var(--panel-accent-gold) 40%, transparent)' : '0 2px 8px rgba(34, 197, 94, 0.4)',
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

      {/* Save toast — tokenized chrome, no raw hex, no magic z-index.
          C4 of the post-HUD UI cleanup: a follow-up cycle (HUD f) will
          add a push API to the toast manager and route this through
          `Notifications`; for now the local 2s self-dismissing toast
          remains here with token-driven chrome. The status-helpful
          panel token doubles as a "save succeeded" green so the
          existing aesthetic is preserved while raw hex disappears. */}
      {saveToast && (
        <div
          className="absolute top-14 right-4 px-4 py-2 layout-chrome-overlay"
          style={{
            backgroundColor: 'var(--panel-status-helpful)',
            color: 'var(--color-bg)',
            borderRadius: 'var(--panel-radius)',
            boxShadow: 'var(--panel-shadow)',
            animation: 'fadeInOut 2s ease-out',
          }}
        >
          {saveToast}
        </div>
      )}
    </div>
  );
}

function ResourcePill({
  icon, label, value, perTurn, color, hideWhenZero = false,
}: {
  icon: string; label: string; value: number; perTurn: number; color: string; hideWhenZero?: boolean;
}) {
  // Hide non-core chips that have zero current value AND zero per-turn income.
  if (hideWhenZero && value === 0 && perTurn === 0) return null;
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

function PanelButton({ label, color, dark, onClick, panelId }: { label: string; color: string; dark?: boolean; onClick?: () => void; panelId?: PanelId }) {
  const shortcut = panelId ? PANEL_REGISTRY.get(panelId)?.keyboardShortcut : undefined;
  return (
    <button
      data-panel-trigger={panelId}
      className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all hover:brightness-110"
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 80%, transparent) 100%)`,
        color: dark ? '#0d1117' : '#fff',
        border: `1px solid color-mix(in srgb, ${color} 50%, transparent)`,
        minHeight: '28px',
      }}
      onClick={onClick}
    >
      {label}
      {shortcut && <KeyBadge letter={shortcut} />}
    </button>
  );
}

function MenuButton({ label, onClick, testId, panelId }: { label: string; onClick: () => void; testId?: string; panelId?: PanelId }) {
  return (
    <button
      data-testid={testId}
      data-panel-trigger={panelId}
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
