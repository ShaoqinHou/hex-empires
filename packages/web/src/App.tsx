import { useState } from 'react';
import { GameProvider, useGame } from './providers/GameProvider';
import { GameCanvas } from './canvas/GameCanvas';
import { TopBar } from './ui/layout/TopBar';
import { BottomBar } from './ui/layout/BottomBar';
import { CityPanel } from './ui/panels/CityPanel';
import { TechTreePanel } from './ui/panels/TechTreePanel';
import { VictoryPanel } from './ui/panels/VictoryPanel';
import { Minimap } from './ui/components/Minimap';

type Panel = 'none' | 'city' | 'tech';

function GameUI() {
  const { state } = useGame();
  const [activePanel, setActivePanel] = useState<Panel>('none');
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const selectedCity = selectedCityId ? state.cities.get(selectedCityId) ?? null : null;

  return (
    <div className="w-full h-full flex flex-col">
      <TopBar onOpenTechTree={() => setActivePanel(activePanel === 'tech' ? 'none' : 'tech')} />
      <div className="flex-1 relative">
        <GameCanvas onCityClick={(city) => {
          setSelectedCityId(city.id);
          setActivePanel('city');
        }} />
        {activePanel === 'city' && selectedCity && (
          <CityPanel city={selectedCity} onClose={() => setActivePanel('none')} />
        )}
        {activePanel === 'tech' && (
          <TechTreePanel onClose={() => setActivePanel('none')} />
        )}
        <Minimap />
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
