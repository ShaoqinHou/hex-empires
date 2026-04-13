import { useState, useRef, useMemo } from 'react';
import { GameProvider, useGame } from './providers/GameProvider';
import { GameCanvas } from './canvas/GameCanvas';
import { Camera } from './canvas/Camera';
import { TopBar } from './ui/layout/TopBar';
import { BottomBar } from './ui/layout/BottomBar';
import { CityPanel } from './ui/panels/CityPanel';
import { TechTreePanel } from './ui/panels/TechTreePanel';
import { CivicTreePanel } from './ui/panels/CivicTreePanel';
import { VictoryPanel } from './ui/panels/VictoryPanel';
import { DiplomacyPanel } from './ui/panels/DiplomacyPanel';
import { EventLogPanel } from './ui/panels/EventLogPanel';
import { AgeTransitionPanel } from './ui/panels/AgeTransitionPanel';
import { CrisisPanel } from './ui/panels/CrisisPanel';
import { Minimap } from './ui/components/Minimap';
import { YieldsToggle } from './ui/components/YieldsToggle';
import { TurnTransition } from './ui/components/TurnTransition';
import { Notifications } from './ui/components/Notifications';
import { EnemyActivitySummary } from './ui/components/EnemyActivitySummary';
import { TurnSummaryPanel } from './ui/panels/TurnSummaryPanel';
import { ValidationFeedback } from './ui/components/ValidationFeedback';
import { CombatPreviewPanel } from './ui/components/CombatPreviewPanel';
import { TooltipOverlay } from './canvas/TooltipOverlay';
import { GovernorPanel } from './ui/panels/GovernorPanel';

type Panel = 'none' | 'city' | 'tech' | 'civics' | 'diplomacy' | 'log' | 'age' | 'turnSummary' | 'governors';

function GameUI() {
  const { state, lastValidation, clearValidation, selectedUnit, hoveredHex, isAltPressed } = useGame();
  const [activePanel, setActivePanel] = useState<Panel>('none');
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [showYields, setShowYields] = useState(false);
  const selectedCity = selectedCityId ? state.cities.get(selectedCityId) ?? null : null;
  const cameraRef = useRef<Camera | null>(null);

  const togglePanel = (panel: Panel) => setActivePanel(prev => prev === panel ? 'none' : panel);

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
    <div className="w-full h-full flex flex-col">
      <TopBar
        onOpenTechTree={() => togglePanel('tech')}
        onOpenCivicTree={() => togglePanel('civics')}
        onOpenDiplomacy={() => togglePanel('diplomacy')}
        onOpenLog={() => togglePanel('log')}
        onOpenAge={() => togglePanel('age')}
        onOpenTurnSummary={() => togglePanel('turnSummary')}
        onOpenGovernors={() => togglePanel('governors')}
      />
      <div className="flex-1 relative">
        <GameCanvas
          cameraRef={cameraRef}
          showYields={showYields}
          onToggleYields={() => setShowYields(v => !v)}
          onCityClick={(city) => {
            setSelectedCityId(city.id);
            setActivePanel('city');
          }}
          onToggleTechTree={() => togglePanel('tech')}
        />
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
        <YieldsToggle showYields={showYields} onToggle={() => setShowYields(v => !v)} />
        <Minimap cameraRef={cameraRef} />
        <CrisisPanel />
        <VictoryPanel />

        {/* Turn transition and notifications */}
        <TurnTransition />
        <Notifications />
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

export function App() {
  return (
    <GameProvider>
      <GameUI />
    </GameProvider>
  );
}
