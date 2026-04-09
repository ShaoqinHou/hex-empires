import { useState, useRef } from 'react';
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

type Panel = 'none' | 'city' | 'tech' | 'civics' | 'diplomacy' | 'log' | 'age';

function GameUI() {
  const { state } = useGame();
  const [activePanel, setActivePanel] = useState<Panel>('none');
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [showYields, setShowYields] = useState(false);
  const selectedCity = selectedCityId ? state.cities.get(selectedCityId) ?? null : null;
  const cameraRef = useRef<Camera | null>(null);

  const togglePanel = (panel: Panel) => setActivePanel(prev => prev === panel ? 'none' : panel);

  return (
    <div className="w-full h-full flex flex-col">
      <TopBar
        onOpenTechTree={() => togglePanel('tech')}
        onOpenCivicTree={() => togglePanel('civics')}
        onOpenDiplomacy={() => togglePanel('diplomacy')}
        onOpenLog={() => togglePanel('log')}
        onOpenAge={() => togglePanel('age')}
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
        <YieldsToggle showYields={showYields} onToggle={() => setShowYields(v => !v)} />
        <Minimap cameraRef={cameraRef} />
        <CrisisPanel />
        <VictoryPanel />
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
