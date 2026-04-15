import { useState, useRef, useMemo, useEffect, lazy, Suspense } from 'react';
import { GameProvider, useGame } from './providers/GameProvider';
import { SetupScreen } from './ui/panels/SetupScreen';
import { GameCanvas } from './canvas/GameCanvas';
import { Camera } from './canvas/Camera';
import { TopBar } from './ui/layout/TopBar';
import { BottomBar } from './ui/layout/BottomBar';
import { VictoryPanel } from './ui/panels/VictoryPanel';
import { CrisisPanel } from './ui/panels/CrisisPanel';
import { Minimap } from './ui/components/Minimap';
import { YieldsToggle } from './ui/components/YieldsToggle';
import { TurnTransition } from './ui/components/TurnTransition';
import { Notifications } from './ui/components/Notifications';
import { EnemyActivitySummary } from './ui/components/EnemyActivitySummary';
import { ValidationFeedback } from './ui/components/ValidationFeedback';
import { CombatPreviewPanel } from './ui/components/CombatPreviewPanel';
import { TooltipOverlay } from './canvas/TooltipOverlay';

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

type Panel = 'none' | 'city' | 'tech' | 'civics' | 'diplomacy' | 'log' | 'age' | 'turnSummary' | 'governors' | 'help' | 'religion' | 'government' | 'commanders';

function GameUI() {
  const { state: nullableState, lastValidation, clearValidation, selectedUnit, hoveredHex, isAltPressed, selectedCity, selectCity } = useGame();
  const state = nullableState!; // GameUI only renders when state is non-null
  const [activePanel, setActivePanel] = useState<Panel>(() => {
    // Auto-show help on first ever game start
    if (!localStorage.getItem('helpShown')) {
      localStorage.setItem('helpShown', '1');
      return 'help';
    }
    return 'none';
  });
  const [showYields, setShowYields] = useState(false);
  const cameraRef = useRef<Camera | null>(null);

  const togglePanel = (panel: Panel) => setActivePanel(prev => prev === panel ? 'none' : panel);

  // H key — toggle help panel. ESC — smart close: if a panel is open, close it
  // FIRST (and stop propagation so GameCanvas's ESC handler doesn't also deselect).
  // If no panel is open, GameCanvas's ESC handler runs normally and clears selection.
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
      if (e.key === 'Escape' && activePanel !== 'none') {
        setActivePanel('none');
        e.stopPropagation();
      }
    };
    // Capture phase so we intercept ESC before GameCanvas's bubble-phase handler runs.
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [activePanel]);

  // Determine if we should show combat preview
  const combatPreviewTarget = useMemo(() => {
    if (!selectedUnit || !hoveredHex) return null;

    // Check if hovered hex has an enemy unit or city
    const targetKey = `${hoveredHex.q},${hoveredHex.r}`;
    let hasEnemyTarget = false;

    for (const [id, unit] of state.units) {
      if (`${unit.position.q},${unit.position.r}` === targetKey && unit.owner !== selectedUnit.owner) {
        hasEnemyTarget = true;
        break;
      }
    }

    if (!hasEnemyTarget) {
      for (const [id, city] of state.cities) {
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
      <TopBar
        onOpenTechTree={() => togglePanel('tech')}
        onOpenCivicTree={() => togglePanel('civics')}
        onOpenDiplomacy={() => togglePanel('diplomacy')}
        onOpenLog={() => togglePanel('log')}
        onOpenAge={() => togglePanel('age')}
        onOpenTurnSummary={() => togglePanel('turnSummary')}
        onOpenGovernors={() => togglePanel('governors')}
        onOpenHelp={() => togglePanel('help')}
        onOpenReligion={() => togglePanel('religion')}
        onOpenGovernment={() => togglePanel('government')}
        onOpenCommanders={() => togglePanel('commanders')}
      />
      <div className="flex-1 relative">
        <GameCanvas
          cameraRef={cameraRef}
          showYields={showYields}
          onToggleYields={() => setShowYields(v => !v)}
          onCityClick={(city) => {
            selectCity(city.id);
            setActivePanel('city');
          }}
          onToggleTechTree={() => togglePanel('tech')}
        />
        {/* Suppress browser context menu on the panels layer — panels
            feel like desktop UI, not a webpage. GameCanvas keeps its
            own right-click handler (gameplay action) and is unaffected
            because this wrapper only covers panel DOM. */}
        <Suspense fallback={null}>
         <div onContextMenu={(e) => e.preventDefault()}>
          {activePanel === 'city' && selectedCity && (
            <CityPanel city={selectedCity} onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'tech' && (
            <TechTreePanel onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'civics' && (
            <CivicTreePanel onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'diplomacy' && (
            <DiplomacyPanel onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'log' && (
            <EventLogPanel onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'age' && (
            <AgeTransitionPanel onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'turnSummary' && (
            <TurnSummaryPanel onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'governors' && (
            <GovernorPanel onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'help' && (
            <HelpPanel onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'religion' && (
            <ReligionPanel onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'government' && (
            <GovernmentPanel onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'commanders' && (
            <CommanderPanel onClose={() => setActivePanel('none')} />
          )}
         </div>
        </Suspense>
        <YieldsToggle showYields={showYields} onToggle={() => setShowYields(v => !v)} />
        <Minimap cameraRef={cameraRef} />
        <CrisisPanel />
        <VictoryPanel />

        {/* Turn transition and notifications */}
        <TurnTransition />
        <Notifications onCityClick={(cityId) => {
          selectCity(cityId);
          setActivePanel('city');
        }} />
        <EnemyActivitySummary />
        <ValidationFeedback validation={lastValidation} onAnimationEnd={clearValidation} />

        {/* Combat preview panel */}
        {combatPreviewTarget && selectedUnit && (
          <CombatPreviewPanel attackerUnitId={selectedUnit.id} targetHex={combatPreviewTarget} />
        )}

        {/* Tooltip overlay for canvas elements (Alt + hover) */}
        {cameraRef.current && (
          <TooltipOverlay
            camera={cameraRef.current}
            hoveredHex={hoveredHex}
            isAltPressed={isAltPressed}
            state={state}
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

  return <GameUI />;
}

export function App() {
  return (
    <GameProvider>
      <AppInner />
    </GameProvider>
  );
}
