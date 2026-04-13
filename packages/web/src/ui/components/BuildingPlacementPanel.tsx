import React, { useMemo } from 'react';
import { useGameState } from '../../providers/GameProvider';
import { coordToKey } from '@hex/engine';
import type { HexCoord, UnitState } from '@hex/engine';
import { ALL_BUILDINGS } from '@hex/engine';

interface BuildingPlacementPanelProps {
  cityId: string;
  buildingId: string;
  onClose: () => void;
  onTileSelect: (tile: HexCoord) => void;
}

export function BuildingPlacementPanel({ cityId, buildingId, onClose, onTileSelect }: BuildingPlacementPanelProps) {
  const { state } = useGameState();

  const city = state.cities.get(cityId);
  const building = ALL_BUILDINGS.find(b => b.id === buildingId);

  if (!city || !building) {
    return null;
  }

  // Find tiles in city territory that don't have buildings
  const availableTiles = useMemo(() => {
    const tiles: Array<{ coord: HexCoord; valid: boolean; reason?: string }> = [];

    for (const tileKey of city.territory) {
      const tile = state.map.tiles.get(tileKey);
      if (!tile) continue;

      // Skip city center
      if (tile.coord.q === city.position.q && tile.coord.r === city.position.r) {
        continue;
      }

      // Check if tile already has a building
      if (tile.building) {
        tiles.push({ coord: tile.coord, valid: false, reason: 'Already occupied' });
        continue;
      }

      // Check if tile has a unit (block placement)
      const hasUnit = Array.from(state.units.values()).some(
        (u: UnitState) => u.position.q === tile.coord.q && u.position.r === tile.coord.r
      );

      if (hasUnit) {
        tiles.push({ coord: tile.coord, valid: false, reason: 'Unit present' });
        continue;
      }

      // Tile is valid for placement
      tiles.push({ coord: tile.coord, valid: true });
    }

    return tiles;
  }, [city.territory, state.map.tiles, state.units, city.position]);

  const handleTileClick = (coord: HexCoord) => {
    onTileSelect(coord);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-amber-500/30 rounded-xl p-6 max-w-2xl w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-amber-400">🏗️ Place {building.name}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors px-3 py-1"
          >
            ✕
          </button>
        </div>

        <div className="mb-4 p-4 bg-slate-700/50 rounded-lg">
          <p className="text-slate-300 text-sm">
            Select a tile within {city.name}'s territory to place this building.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-amber-400">Cost:</span>
              <span className="text-white ml-2">{building.cost} production</span>
            </div>
            <div>
              <span className="text-amber-400">Maintenance:</span>
              <span className="text-white ml-2">{building.maintenance} gold/turn</span>
            </div>
            <div>
              <span className="text-amber-400">Category:</span>
              <span className="text-white ml-2 capitalize">{building.category}</span>
            </div>
            <div>
              <span className="text-amber-400">Happiness Cost:</span>
              <span className="text-white ml-2">{building.happinessCost}</span>
            </div>
          </div>
          {Object.keys(building.yields).length > 0 && (
            <div className="mt-2">
              <span className="text-amber-400">Yields:</span>
              <span className="text-white ml-2">
                {Object.entries(building.yields).map(([yieldType, amount]) => (
                  <span key={yieldType} className="mr-3">
                    {amount > 0 ? '+' : ''}{amount} {yieldType}
                  </span>
                ))}
              </span>
            </div>
          )}
          {building.effects.length > 0 && (
            <div className="mt-2">
              <span className="text-amber-400">Effects:</span>
              <div className="text-white mt-1">
                {building.effects.map((effect, idx) => (
                  <div key={idx} className="text-sm">• {effect}</div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mb-4 p-3 bg-blue-900/30 border border-blue-500/30 rounded-lg">
          <p className="text-blue-300 text-sm">
            💡 <strong>Tip:</strong> Click on any highlighted tile in the city's territory to place the building.
            Gray tiles are unavailable for placement.
          </p>
        </div>

        <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto">
          {availableTiles.map((tile, idx) => {
            const key = coordToKey(tile.coord);
            return (
              <button
                key={key}
                onClick={() => tile.valid && handleTileClick(tile.coord)}
                disabled={!tile.valid}
                className={`
                  p-2 rounded border text-xs font-mono transition-all
                  ${tile.valid
                    ? 'bg-emerald-900/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-800/60 hover:scale-105'
                    : 'bg-slate-700/40 border-slate-600/50 text-slate-500 cursor-not-allowed'
                  }
                `}
                title={tile.reason || `Tile (${tile.coord.q}, ${tile.coord.r})`}
              >
                <div>({tile.coord.q}, {tile.coord.r})</div>
                {tile.reason && <div className="text-[10px] mt-1">{tile.reason}</div>}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
