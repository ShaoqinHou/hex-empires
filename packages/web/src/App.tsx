import { useState, useRef, useMemo, useEffect, lazy, Suspense } from 'react';
import { GameProvider, useGame } from './providers/GameProvider';
import { SetupScreen } from './ui/panels/SetupScreen';
import { GameCanvas } from './canvas/GameCanvas';
import { Camera } from './canvas/Camera';
import { TopBar } from './ui/layout/TopBar';
import { BottomBar } from './ui/layout/BottomBar';
import { Minimap } from './ui/components/Minimap';
import { YieldsToggle } from './ui/components/YieldsToggle';
import { LabelsToggle } from './ui/components/LabelsToggle';
import { TurnTransition } from './ui/components/TurnTransition';
import { Notifications } from './ui/components/Notifications';
import { EnemyActivitySummary } from './ui/components/EnemyActivitySummary';
import { ValidationFeedback } from './ui/components/ValidationFeedback';
import { CombatPreviewPanel } from './ui/components/CombatPreviewPanel';
import { CombatHoverPreview } from './ui/components/CombatHoverPreview';
import { IdleUnitsToast } from './ui/components/IdleUnitsToast';
import { TooltipOverlay } from './ui/hud/TooltipOverlay';
import { ResourceTooltip } from './ui/hud/ResourceTooltip';
import { UrbanPlacementHintBadge } from './ui/hud/UrbanPlacementHintBadge';
import { hexToPixel } from './utils/hexMath';
import { PanelManagerProvider, usePanelManager } from './ui/panels/PanelManager';
import { PANEL_REGISTRY } from './ui/panels/panelRegistry';
import { HUDManagerProvider } from './ui/hud/HUDManager';
import { VictoryProgressPanel } from './ui/panels/VictoryProgressPanel';

// Lazy-loaded panels — they only mount when the user opens them, so split them out
// of the initial bundle to cut first-paint payload.
const CityPanel = lazy(() => import('./ui/panels/CityPanel').then(m => ({ default: m.CityPanel })));
const TechTreePanel = lazy(() => import('./ui/panels/TechTreePanel').then(m => ({ default: m.TechTreePanel })));
const CivicTreePanel = lazy(() => import('./ui/panels/CivicTreePanel').then(m => ({ default: m.CivicTreePanel })));
const DiplomacyPanel = lazy(() => import('./ui/panels/DiplomacyPanel').then(m => ({ default: m.DiplomacyPanel })));
const EventLogPanel = lazy(() => import('./ui/panels/EventLogPanel').then(m => ({ default: m.EventLogPanel })));
const AgeTransitionPanel = lazy(() => import('./ui/panels/AgeTransitionPanel').then(m => ({ default: m.AgeTransitionPanel })));
const TurnSummaryPanel = lazy(() => import('./ui/panels/TurnSummaryPanel').then(m => ({ default: m.TurnSummaryPanel })));
const GovernorPanel = lazy(() => import('./ui/panels/GovernorPanel').then(m => ({ default: m.GovernorPanel })));
const HelpPanel = lazy(() => import('./ui/panels/HelpPanel').then(m => ({ default: m.HelpPanel })));
const ReligionPanel = lazy(() => import('./ui/panels/ReligionPanel').then(m => ({ default: m.ReligionPanel })));
const GovernmentPanel = lazy(() => import('./ui/panels/GovernmentPanel').then(m => ({ default: m.GovernmentPanel })));
const CommanderPanel = lazy(() => import('./ui/panels/CommanderPanel').then(m => ({ default: m.CommanderPanel })));
const AudioSettingsPanel = lazy(() => import('./ui/panels/AudioSettingsPanel').then(m => ({ default: m.AudioSettingsPanel })));
const VictoryPanel = lazy(() => import('./ui/panels/VictoryPanel').then(m => ({ default: m.VictoryPanel })));
const CrisisPanel = lazy(() => import('./ui/panels/CrisisPanel').then(m => ({ default: m.CrisisPanel })));
const TradeRoutesPanel = lazy(() => import('./ui/panels/TradeRoutesPanel').then(m => ({ default: m.TradeRoutesPanel })));
const AchievementsPanel = lazy(() => import('./ui/panels/AchievementsPanel').then(m => ({ default: m.AchievementsPanel })));
const MementoPanel = lazy(() => import('./ui/panels/MementoPanel').then(m => ({ default: m.MementoPanel })));
const NarrativeEventPanel = lazy(() => import('./ui/panels/NarrativeEventPanel').then(m => ({ default: m.NarrativeEventPanel })));

function GameUI() {
  const { state: nullableState, lastValidation, clearValidation, selectedUnit, hoveredHex, isAltPressed, selectedCity, selectCity, combatPreview, combatPreviewPosition, isProcessingAI } = useGame();
  const state = nullableState!; // GameUI only renders when state is non-null
  const { activePanel, openPanel, closePanel, togglePanel, isOpen } = usePanelManager();
  const [showYields, setShowYields] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const [idleUnitsTrigger, setIdleUnitsTrigger] = useState(0);
  const cameraRef = useRef<Camera | null>(null);

  // Auto-show help on first ever game start. Runs once on mount; the
  // PanelManager is the single source of truth for activePanel state, so
  // the previous useState-initializer trick has moved to a one-shot effect.
  useEffect(() => {
    if (!localStorage.getItem('helpShown')) {
      localStorage.setItem('helpShown', '1');
      openPanel('help');
    }
    // openPanel is stable from useCallback; we intentionally only run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-open the victory modal when a winner is determined. Visibility is
  // owned by the PanelManager (no local `dismissed` flag); dismissing the
  // panel via ESC / close button / "Continue Playing" calls closePanel() and
  // the panel stays closed for the rest of the session.
  const winnerId = state.victory.winner;
  useEffect(() => {
    if (winnerId) {
      openPanel('victory');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winnerId]);

  // Auto-open the crisis panel when the current player enters an active
  // crisis phase (stage1 / stage2 / stage3). The panel stays open until
  // the player fills all required policy slots and dismisses, at which
  // point the engine advances crisisPhase to 'resolved' after END_TURN.
  const currentPlayer = state.players.get(state.currentPlayerId);
  const crisisPhase = currentPlayer?.crisisPhase ?? 'none';
  const hasActiveCrisisPhase = crisisPhase !== 'none' && crisisPhase !== 'resolved';
  useEffect(() => {
    if (hasActiveCrisisPhase) {
      openPanel('crisis');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveCrisisPhase]);

  // Auto-open the narrative event panel when a pending narrative event
  // is in the queue for the current player. The panel dispatches
  // RESOLVE_NARRATIVE_EVENT on choice and calls onResolve to close itself.
  const pendingNarrativeEvents = state.pendingNarrativeEvents ?? [];
  const hasPendingNarrativeEvent = pendingNarrativeEvents.length > 0;
  useEffect(() => {
    if (hasPendingNarrativeEvent) {
      openPanel('narrativeEvent');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPendingNarrativeEvent]);

  // Keyboard shortcuts for panel toggles. ESC is handled inside
  // PanelManagerProvider (capture phase) so it's not duplicated here.
  // Shortcut letters are sourced from PANEL_REGISTRY — never hardcoded here.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const keyUpper = e.key.toUpperCase();
      // Map-control shortcuts (not panel shortcuts)
      if (keyUpper === 'L') { setShowLabels(v => !v); return; }

      for (const [id, entry] of PANEL_REGISTRY) {
        if (entry.keyboardShortcut && keyUpper === entry.keyboardShortcut.toUpperCase()) {
          // Skip panels gated behind feature flags when the flag is off.
          if (id === 'achievements' && !state.config.experimentalAchievements) return;
          togglePanel(id);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePanel, setShowLabels]);

  // Determine if we should show combat preview
  const combatPreviewTarget = useMemo(() => {
    if (!selectedUnit || !hoveredHex) return null;

    // Check if hovered hex has an enemy unit or city
    const targetKey = `${hoveredHex.q},${hoveredHex.r}`;
    let hasEnemyTarget = false;

    for (const [, unit] of state.units) {
      if (`${unit.position.q},${unit.position.r}` === targetKey && unit.owner !== selectedUnit.owner) {
        hasEnemyTarget = true;
        break;
      }
    }

    if (!hasEnemyTarget) {
      for (const [, city] of state.cities) {
        if (`${city.position.q},${city.position.r}` === targetKey && city.owner !== selectedUnit.owner) {
          hasEnemyTarget = true;
          break;
        }
      }
    }

    return hasEnemyTarget ? hoveredHex : null;
  }, [selectedUnit, hoveredHex, state]);

  return (
    <div className="game-app w-full h-full flex flex-col">
      {/* Skip navigation link — visually hidden, appears on keyboard focus.
          Lets screen reader / keyboard-only users jump past chrome to canvas. */}
      <a
        href="#game-canvas"
        className="sr-only focus:not-sr-only"
        style={{
          color: 'var(--color-text)',
          backgroundColor: 'var(--panel-bg)',
          border: '2px solid var(--color-accent)',
          borderRadius: 'var(--panel-radius)',
          zIndex: 300,
        }}
      >
        Skip to game
      </a>
      <TopBar />
      <div id="game-canvas" className="flex-1 relative">
        <GameCanvas
          cameraRef={cameraRef}
          showYields={showYields}
          showLabels={showLabels}
          onToggleYields={() => setShowYields(v => !v)}
          onCityClick={(city) => {
            selectCity(city.id);
            openPanel('city');
          }}
          onToggleTechTree={() => togglePanel('tech')}
onNoIdleUnits={() => setIdleUnitsTrigger(c => c + 1)}
        />
        {/* CombatHoverPreview — mounted here (not inside GameCanvas) so that
            canvas/ never imports from ui/. The preview data flows through
            GameProvider context (combatPreview, combatPreviewPosition). */}
        {combatPreview && (
          <CombatHoverPreview
            preview={combatPreview}
            position={combatPreviewPosition}
          />
        )}
        {/* Suppress browser context menu on the panels layer — panels
            feel like desktop UI, not a webpage. GameCanvas keeps its
            own right-click handler (gameplay action) and is unaffected
            because this wrapper only covers panel DOM. */}
        <Suspense fallback={null}>
         <div onContextMenu={(e) => e.preventDefault()}>
          {activePanel === 'city' && selectedCity && (
            <CityPanel city={selectedCity} onClose={closePanel} />
          )}
          {activePanel === 'tech' && (
            <TechTreePanel onClose={closePanel} />
          )}
          {activePanel === 'civics' && (
            <CivicTreePanel onClose={closePanel} />
          )}
          {activePanel === 'diplomacy' && (
            <DiplomacyPanel onClose={closePanel} />
          )}
          {activePanel === 'log' && (
            <EventLogPanel onClose={closePanel} />
          )}
          {activePanel === 'age' && (
            <AgeTransitionPanel onResolve={closePanel} />
          )}
          {activePanel === 'turnSummary' && (
            <TurnSummaryPanel onResolve={closePanel} />
          )}
          {activePanel === 'governors' && (
            <GovernorPanel onClose={closePanel} />
          )}
          {activePanel === 'help' && (
            <HelpPanel onClose={closePanel} />
          )}
          {activePanel === 'religion' && (
            <ReligionPanel onClose={closePanel} />
          )}
          {activePanel === 'government' && (
            <GovernmentPanel onClose={closePanel} />
          )}
          {activePanel === 'commanders' && (
            <CommanderPanel onClose={closePanel} />
          )}
          {activePanel === 'victoryProgress' && (
            <VictoryProgressPanel onClose={closePanel} />
          )}
{activePanel === 'audioSettings' && (
            <AudioSettingsPanel onClose={closePanel} />
          )}
          {activePanel === 'victory' && (
            <VictoryPanel onResolve={closePanel} />
          )}
          {activePanel === 'crisis' && (
            <CrisisPanel onClose={closePanel} />
          )}
          {activePanel === 'tradeRoutes' && (
            <TradeRoutesPanel onClose={closePanel} />
          )}
          {/* AchievementsPanel is experimental — only renders when the feature flag is on. */}
          {state.config.experimentalAchievements && activePanel === 'achievements' && (
            <AchievementsPanel onClose={closePanel} />
          )}
          {activePanel === 'mementos' && (
            <MementoPanel onClose={closePanel} />
          )}
          {activePanel === 'narrativeEvent' && (
            <NarrativeEventPanel onResolve={closePanel} />
          )}
         </div>
        </Suspense>
        <YieldsToggle showYields={showYields} onToggle={() => setShowYields(v => !v)} />
        <LabelsToggle showLabels={showLabels} onToggle={() => setShowLabels(v => !v)} />
        <Minimap cameraRef={cameraRef} />

        {/* AI turn loading overlay — shown while processAITurns runs asynchronously */}
        {isProcessingAI && (
          <div
            className="fixed inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 500 }}
            aria-live="polite"
            aria-label="AI players are taking their turns"
          >
            <div
              className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              style={{
                backgroundColor: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                color: 'var(--panel-muted-color)',
                boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <span
                className="inline-block w-3 h-3 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--color-production)' }}
              />
              AI players are thinking\u2026
            </div>
          </div>
        )}

        {/* Turn transition and notifications */}
        <TurnTransition />
        <Notifications onCityClick={(cityId) => {
          selectCity(cityId);
          openPanel('city');
        }} />
        <EnemyActivitySummary />
        <ValidationFeedback validation={lastValidation} onAnimationEnd={clearValidation} />
        <IdleUnitsToast triggerCount={idleUnitsTrigger} />

        {/* Combat preview panel */}
        {combatPreviewTarget && selectedUnit && (
          <CombatPreviewPanel attackerUnitId={selectedUnit.id} targetHex={combatPreviewTarget} />
        )}

        {/* Tooltip overlay for canvas elements (Alt + hover).
            The hex → screen projector is supplied here so the overlay itself
            stays in ui/hud/ without importing the canvas Camera. */}
        {cameraRef.current && (
          <TooltipOverlay
            hexToScreen={(q, r) => {
              const cam = cameraRef.current;
              if (!cam) return null;
              const world = hexToPixel({ q, r });
              return cam.worldToScreen(world.x, world.y);
            }}
            hoveredHex={hoveredHex}
            isAltPressed={isAltPressed}
            state={state}
          />
        )}

        {/* Resource hover tooltip — appears when the cursor rests over a
            tile that contains a resource. Shows name, type, yields, and
            unlock status. Rendered after TooltipOverlay so it occupies
            a distinct quadrant offset (offset="large"). */}
        {cameraRef.current && (
          <ResourceTooltip
            hexToScreen={(q, r) => {
              const cam = cameraRef.current;
              if (!cam) return null;
              const world = hexToPixel({ q, r });
              return cam.worldToScreen(world.x, world.y);
            }}
            hoveredHex={hoveredHex}
            state={state}
          />
        )}

        {/* Per-tile placement hint — only renders when placementMode is
            active and the cursor is over a hex. Canvas-side green/gray
            overlay is untouched; this is the detailed, cursor-following
            companion showing building name, validity, adjacency sources,
            and aggregate score. */}
        {cameraRef.current && (
          <UrbanPlacementHintBadge
            hexToScreen={(q, r) => {
              const cam = cameraRef.current;
              if (!cam) return null;
              const world = hexToPixel({ q, r });
              return cam.worldToScreen(world.x, world.y);
            }}
          />
        )}
      </div>
      <BottomBar />
    </div>
  );
}

function AppInner() {
  const { state, initGame, loadGame } = useGame();

  if (!state) {
    return <SetupScreen onStart={initGame} onLoadGame={loadGame} />;
  }

  return (
    <PanelManagerProvider>
      <HUDManagerProvider>
        <GameUI />
      </HUDManagerProvider>
    </PanelManagerProvider>
  );
}

export function App() {
  return (
    <GameProvider>
      <AppInner />
    </GameProvider>
  );
}
