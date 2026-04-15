import { useState, useRef, useMemo, useEffect, lazy, Suspense } from 'react';
import { GameProvider, useGame } from './providers/GameProvider';
import { SetupScreen } from './ui/panels/SetupScreen';
import { GameCanvas } from './canvas/GameCanvas';
import { Camera } from './canvas/Camera';
import { TopBar } from './ui/layout/TopBar';
import { BottomBar } from './ui/layout/BottomBar';
import { Minimap } from './ui/components/Minimap';
import { YieldsToggle } from './ui/components/YieldsToggle';
import { TurnTransition } from './ui/components/TurnTransition';
import { Notifications } from './ui/components/Notifications';
import { EnemyActivitySummary } from './ui/components/EnemyActivitySummary';
import { ValidationFeedback } from './ui/components/ValidationFeedback';
import { CombatPreviewPanel } from './ui/components/CombatPreviewPanel';
import { CombatHoverPreview } from './ui/components/CombatHoverPreview';
import { TooltipOverlay } from './ui/hud/TooltipOverlay';
import { UrbanPlacementHintBadge } from './ui/hud/UrbanPlacementHintBadge';
import { hexToPixel } from './utils/hexMath';
import { PanelManagerProvider, usePanelManager } from './ui/panels/PanelManager';
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
const ImprovementPanel = lazy(() => import('./ui/panels/ImprovementPanel').then(m => ({ default: m.ImprovementPanel })));
const AudioSettingsPanel = lazy(() => import('./ui/panels/AudioSettingsPanel').then(m => ({ default: m.AudioSettingsPanel })));
const VictoryPanel = lazy(() => import('./ui/panels/VictoryPanel').then(m => ({ default: m.VictoryPanel })));
const CrisisPanel = lazy(() => import('./ui/panels/CrisisPanel').then(m => ({ default: m.CrisisPanel })));

function GameUI() {
  const { state: nullableState, lastValidation, clearValidation, selectedUnit, hoveredHex, isAltPressed, selectedCity, selectCity, combatPreview, combatPreviewPosition } = useGame();
  const state = nullableState!; // GameUI only renders when state is non-null
  const { activePanel, openPanel, closePanel, togglePanel, isOpen } = usePanelManager();
  const [showYields, setShowYields] = useState(false);
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

  // Auto-open the crisis modal when an unresolved crisis appears. The panel
  // is non-dismissible (the player must pick a choice). Once the player
  // dispatches RESOLVE_CRISIS, CrisisPanel calls onClose → closePanel(),
  // and the list will be empty so this effect won't re-open it.
  const hasActiveCrisis = state.crises.some(c => c.active);
  useEffect(() => {
    if (hasActiveCrisis) {
      openPanel('crisis');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasActiveCrisis]);

  // Keyboard shortcuts for panel toggles. ESC is handled inside
  // PanelManagerProvider (capture phase) so it's not duplicated here.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'h' || e.key === 'H') {
        togglePanel('help');
      }
      if (e.key === 'r' || e.key === 'R') {
        togglePanel('religion');
      }
      if (e.key === 'g' || e.key === 'G') {
        togglePanel('government');
      }
      if (e.key === 'k' || e.key === 'K') {
        togglePanel('commanders');
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePanel]);

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
      <TopBar />
      <div className="flex-1 relative">
        <GameCanvas
          cameraRef={cameraRef}
          showYields={showYields}
          onToggleYields={() => setShowYields(v => !v)}
          onCityClick={(city) => {
            selectCity(city.id);
            openPanel('city');
          }}
          onToggleTechTree={() => togglePanel('tech')}
          onBuilderSelected={() => openPanel('improvement')}
          onBuilderDeselected={() => { if (isOpen('improvement')) closePanel(); }}
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
            <AgeTransitionPanel onClose={closePanel} />
          )}
          {activePanel === 'turnSummary' && (
            <TurnSummaryPanel onClose={closePanel} />
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
          {activePanel === 'improvement' && selectedUnit && (
            <ImprovementPanel builderUnitId={selectedUnit.id} onClose={closePanel} />
          )}
          {activePanel === 'audioSettings' && (
            <AudioSettingsPanel onClose={closePanel} />
          )}
          {activePanel === 'victory' && (
            <VictoryPanel onClose={closePanel} />
          )}
          {activePanel === 'crisis' && (
            <CrisisPanel onClose={closePanel} />
          )}
         </div>
        </Suspense>
        <YieldsToggle showYields={showYields} onToggle={() => setShowYields(v => !v)} />
        <Minimap cameraRef={cameraRef} />

        {/* Turn transition and notifications */}
        <TurnTransition />
        <Notifications onCityClick={(cityId) => {
          selectCity(cityId);
          openPanel('city');
        }} />
        <EnemyActivitySummary />
        <ValidationFeedback validation={lastValidation} onAnimationEnd={clearValidation} />

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
