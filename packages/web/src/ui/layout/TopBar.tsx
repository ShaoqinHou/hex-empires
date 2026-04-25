import { useGameState } from '../../providers/GameProvider';
// Phase 4.3: gold rule + chrome bar tokens.
import './chrome-bars.css';
import { getYieldIcon } from '@web/assets';
import { calculateResourceChanges, allUnitsHaveActed } from '@hex/engine';
import type { TechnologyDef, CivicDef } from '@hex/engine';
import { ResourceChangeBadge, WarningIndicator } from '../components/ResourceChangeBadge';
import { useState, useRef } from 'react';
import { usePanelManager } from '../panels/PanelManager';
import { PANEL_REGISTRY } from '../panels/panelRegistry';
import type { PanelId } from '../panels/panelRegistry';
import { KeyBadge } from './KeyBadge';
import { useCountUp } from '../hooks/useCountUp';

/**
 * Stagger delays for the yield-counter ripple effect (phase-6-motion-spec §4 open-question #3).
 * gold=0ms, science=120ms, culture=240ms, production=360ms.
 * Duration matches --motion-slow (400ms).
 */
const YIELD_STAGGER: Record<string, number> = {
  gold:       0,
  science:    120,
  culture:    240,
  production: 360,
};

/** Resource chips that always render even when zero — core economy signals. */
const CORE_RESOURCES = new Set(['gold', 'science', 'culture']);

/**
 * Convert a game turn number to an approximate in-world year string.
 *
 * Pacing (mirrors standard Civ pacing):
 *   Antiquity  turns  1-40  →  4000 BCE … 100 BCE  (approx 97 yrs/turn)
 *   Exploration  41-80  →  100 BCE … 1500 CE  (approx 40 yrs/turn)
 *   Modern  81+  →  1500 CE onwards  (approx 25 yrs/turn)
 */
function turnToYear(turn: number): string {
  if (turn <= 40) {
    const yearBce = 4000 - Math.round((turn - 1) * 97.5);
    if (yearBce > 0) return `${yearBce} BCE`;
    return `${Math.abs(yearBce)} CE`;
  }
  if (turn <= 80) {
    const ce = Math.round((turn - 40) * 40);
    return `${ce} CE`;
  }
  const ce = 1600 + Math.round((turn - 80) * 25);
  return `${ce} CE`;
}

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
    ? (state.config.technologies.get(player.currentResearch) ?? undefined)
    : undefined;

  const currentCivicDef: CivicDef | undefined = player?.currentCivic
    ? (state.config.civics.get(player.currentCivic) ?? undefined)
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
    /* Height is controlled by the CSS grid row in .game-app (layout-tokens.css
       --chrome-topbar-height: 56px/64px/72px per viewport class). */
    <div
      data-chrome-bar="top"
      className="flex items-center justify-between px-3 select-none layout-chrome-bar overflow-hidden"
      style={{
        // Phase 4.3: warm olive gradient replaces surface/bg fallback.
        // --chrome-bar-bg anchors both bars to the same warm-dark surface.
        background: 'var(--chrome-bar-bg)',
        // border-bottom replaced by ::after gold rule in chrome-bars.css.
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
      }}
    >

      {/* Left: Turn, Year & Age */}
      <div className="flex items-center gap-3">
        <div className="px-2.5 py-1 rounded flex flex-col items-center"
          style={{
            background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)',
            boxShadow: '0 2px 4px rgba(88, 166, 255, 0.3)',
            border: '1px solid var(--panel-turn-badge-border)',
            minWidth: '4.5rem',
          }}>
          <span className="text-xs font-bold leading-tight" style={{ color: 'var(--panel-turn-badge-text)' }}>
            Turn {state.turn}
          </span>
          <span className="text-[10px] leading-tight opacity-80" style={{ color: 'var(--panel-turn-badge-text)' }}>
            {turnToYear(state.turn)}
          </span>
        </div>
        <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--color-text-muted)' }}>
          {state.age.currentAge}
        </span>
      </div>

      {/* Center: Resources */}
      <div className="flex items-center gap-3">
        <ResourcePill icon="💰" iconSrc={getYieldIcon('gold')} label="Gold" value={player?.gold ?? 0} perTurn={resourceChanges.goldPerTurn} color="var(--color-gold)" yieldKey="gold" />
        <ResourcePill icon="🔬" label="Sci" value={player?.science ?? 0} perTurn={resourceChanges.sciencePerTurn} color="var(--color-science)" yieldKey="science" />
        <ResourcePill icon="🎭" label="Cul" value={player?.culture ?? 0} perTurn={resourceChanges.culturePerTurn} color="var(--color-culture)" yieldKey="culture" />
        <ResourcePill icon="⛪" label="Fai" value={player?.faith ?? 0} perTurn={0} color="var(--color-faith)" hideWhenZero yieldKey="faith" />
        <ResourcePill icon="🤝" label="Inf" value={player?.influence ?? 0} perTurn={0} color="var(--color-influence)" hideWhenZero yieldKey="influence" />

        {/* Research progress */}
        {currentResearchTech && (
          <span className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--color-science)', backgroundColor: 'rgba(77, 171, 247, 0.1)' }}>
            🔬 {currentResearchTech.name} ({player?.researchProgress ?? 0}/{currentResearchTech.cost})
          </span>
        )}

        <WarningIndicator summary={resourceChanges} />
      </div>

      {/* Right: Panel buttons + End Turn.
          All panel-button accent colors tokenized via --panel-button-*.
          role="toolbar" allows screen readers to navigate with arrow keys. */}
      <div role="toolbar" aria-label="Game controls" className="flex items-center gap-1.5">
        <PanelButton label="Tech" color="var(--panel-button-tech)" panelId="tech" onClick={() => togglePanel('tech')} />
        <PanelButton label="Civics" color="var(--panel-button-civics)" panelId="civics" onClick={() => togglePanel('civics')} />
        <PanelButton label="Diplo" color="var(--panel-button-diplomacy)" panelId="diplomacy" onClick={() => togglePanel('diplomacy')} />
        <PanelButton label="Ages" color="var(--panel-button-age)" dark panelId="age" onClick={() => togglePanel('age')} />

        {/* More menu for secondary actions */}
        <div className="relative">
          <button
            className="px-3 py-1.5 rounded text-xs cursor-pointer hover:opacity-80"
            aria-label="More actions"
            aria-expanded={showMoreMenu}
            aria-haspopup="menu"
            // fixed: var(--chrome-button-sm-size) = 28px, below 32px minimum — justified per
            // S-03 exceptions (panel-close × pattern); keyboard via ⋯ menu items.
            style={{ color: 'var(--color-text-muted)', border: 'var(--border-hairline) solid var(--color-border)', minHeight: 'var(--chrome-button-sm-size)', minWidth: 'var(--chrome-button-sm-size)' }}
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
              <MenuButton label="🗿 Mementos (E)" panelId="mementos" onClick={() => openFromMenu('mementos')} />
              <MenuButton label="❓ Help (H)" panelId="help" onClick={() => openFromMenu('help')} />
            </div>
          )}
        </div>

        {/* End Turn — always clickable. Pulses (end-turn-ready class) when all
            units have acted, signalling the player they can safely advance.
            Animation respects prefers-reduced-motion via CSS. */}
        <button
          data-testid="end-turn-button"
          aria-label={unitsWithMovement > 0 ? `End Turn (${unitsWithMovement} units still have movement)` : 'End Turn'}
          className={`px-5 py-2 rounded-lg text-sm font-bold cursor-pointer transition-all hover:brightness-110 ml-1${turnReady ? ' end-turn-ready' : ''}`}
          style={{
            background: 'linear-gradient(135deg, var(--color-food) 0%, color-mix(in srgb, var(--color-food) 80%, transparent) 100%)',
            color: 'var(--color-text)',
            boxShadow: turnReady ? '0 2px 8px color-mix(in srgb, var(--panel-accent-gold) 40%, transparent)' : '0 2px 8px color-mix(in srgb, var(--color-food) 40%, transparent)',
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
  icon, iconSrc, label, value, perTurn, color, hideWhenZero = false, yieldKey,
}: {
  icon: string; iconSrc?: string; label: string; value: number; perTurn: number; color: string; hideWhenZero?: boolean;
  /** Optional key used to look up the ripple stagger delay (e.g. "gold", "science"). */
  yieldKey?: string;
}) {
  // Hide non-core chips that have zero current value AND zero per-turn income.
  if (hideWhenZero && value === 0 && perTurn === 0) return null;

  // Track the previous value to detect zero-crossing into negative (row 15).
  const prevRef = useRef<number>(value);
  const wasNonNegative = prevRef.current >= 0;
  const isNegative = value < 0;
  const zeroCross = isNegative && wasNonNegative;
  prevRef.current = value;

  const stagger = yieldKey !== undefined ? (YIELD_STAGGER[yieldKey] ?? 0) : 0;
  const displayed = useCountUp(value, {
    duration: 400, // --motion-slow
    direction: zeroCross ? 'both' : 'up-only',
    startDelayMs: stagger,
  });

  return (
    <div className="flex items-center gap-1" title={`${label}: ${value} (${perTurn >= 0 ? '+' : ''}${perTurn}/turn)`}>
      {iconSrc
        ? <img src={iconSrc} alt={label} width={14} height={14} aria-hidden="true" />
        : <span className="text-xs">{icon}</span>}
      {/* font-variant-numeric: tabular-nums mandatory per spec row 13. */}
      <span
        className={`font-mono text-xs font-bold${isNegative ? ' yield-negative' : ''}`}
        style={{
          color: isNegative ? 'var(--color-health-low)' : color,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {displayed}
      </span>
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
  const ariaLabel = shortcut ? `${label} (keyboard shortcut: ${shortcut})` : label;
  return (
    <button
      data-panel-trigger={panelId}
      aria-label={ariaLabel}
      className="px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all hover:brightness-110"
      style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${color} 0%, color-mix(in srgb, ${color} 80%, transparent) 100%)`,
        color: dark ? 'var(--panel-turn-badge-text)' : 'var(--color-text)',
        border: `1px solid color-mix(in srgb, ${color} 50%, transparent)`,
        minHeight: 'var(--chrome-button-sm-size)',
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
