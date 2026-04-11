import React, { useState, useEffect } from 'react';
import type { HexCoord } from '@hex/engine';
import { coordToKey, calculateCityYields } from '@hex/engine';
import type { Camera } from './Camera';
import { hexToPixel } from './HexRenderer';
import { UnitStateTooltip } from '../ui/components/tooltips';
import type { UnitState, UnitDef, CityState, HexTile } from '@hex/engine';
import { ALL_UNITS, ALL_BUILDINGS, ALL_IMPROVEMENTS, ALL_RESOURCES, ALL_BASE_TERRAINS, ALL_FEATURES } from '@hex/engine';

interface TooltipOverlayProps {
  camera: Camera;
  hoveredHex: HexCoord | null;
  isAltPressed: boolean;
  state: {
    units: ReadonlyMap<string, UnitState>;
    cities: ReadonlyMap<string, CityState>;
    map: {
      tiles: ReadonlyMap<string, import('@hex/engine').HexTile>;
    };
  };
}

/**
 * Canvas overlay that shows tooltips when hovering over game elements.
 * Requires Alt key to be pressed for detailed tooltips.
 */
export function TooltipOverlay({ camera, hoveredHex, isAltPressed, state }: TooltipOverlayProps) {
  const [tooltipContent, setTooltipContent] = useState<React.ReactNode>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!hoveredHex || !isAltPressed) {
      setTooltipContent(null);
      setTooltipPosition(null);
      return;
    }

    const hexKey = coordToKey(hoveredHex);
    let content: React.ReactNode = null;

    // Check for unit at this hex
    for (const [id, unit] of state.units) {
      if (coordToKey(unit.position) === hexKey) {
        const unitDef = ALL_UNITS.find(u => u.id === unit.typeId);
        if (unitDef) {
          content = <UnitStateTooltip unitState={unit} unitDef={unitDef} />;
        }
        break;
      }
    }

    // Check for city at this hex (if no unit found)
    if (!content) {
      for (const [id, city] of state.cities) {
        if (coordToKey(city.position) === hexKey) {
          const yields = calculateCityYields(city, state as any);
          content = (
            <div
              className="px-4 py-3 rounded-lg shadow-xl border"
              style={{
                background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.98) 100%)',
                borderColor: 'rgba(251,191,36,0.3)',
                maxWidth: '280px',
                borderWidth: '2px',
              }}
            >
              <div className="font-bold text-base mb-2 text-amber-400">{city.name}</div>
              <div className="text-xs space-y-1" style={{ color: 'rgb(203,213,225)' }}>
                <div className="flex justify-between">
                  <span className="text-slate-400">Owner:</span>
                  <span className="font-medium">{city.owner}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Population:</span>
                  <span className="font-medium">{city.population}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Type:</span>
                  <span className="font-medium capitalize">{city.settlementType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Defense:</span>
                  <span className="font-medium">{city.defenseHP} HP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Happiness:</span>
                  <span className={`font-medium ${city.happiness >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {city.happiness >= 0 ? `+${city.happiness}` : city.happiness}
                  </span>
                </div>
                {city.specialization && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Specialization:</span>
                    <span className="font-medium text-amber-400 capitalize">{city.specialization.replace('_', ' ')}</span>
                  </div>
                )}
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <div className="text-xs font-semibold text-slate-400 mb-1">City Yields:</div>
                  <div className="grid grid-cols-2 gap-1">
                    <div>🌾 Food: {yields.food.toFixed(1)}</div>
                    <div>🔨 Production: {yields.production.toFixed(1)}</div>
                    <div>💰 Gold: {yields.gold.toFixed(1)}</div>
                    <div>🔬 Science: {yields.science.toFixed(1)}</div>
                    <div>🎭 Culture: {yields.culture.toFixed(1)}</div>
                    <div>⛪ Faith: {yields.faith.toFixed(1)}</div>
                  </div>
                </div>
                {city.productionQueue.length > 0 && city.settlementType === 'city' && (
                  <div className="mt-2 pt-2 border-t border-slate-700">
                    <div className="text-xs text-slate-400">Producing: {city.productionQueue[0].id}</div>
                    <div className="w-full bg-slate-700 rounded-full h-1.5 mt-1">
                      <div
                        className="bg-blue-500 h-1.5 rounded-full"
                        style={{ width: `${(city.productionProgress / 100) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
          break;
        }
      }
    }

    // If no unit or city, show tile information
    if (!content) {
      const tile = state.map.tiles.get(hexKey);
      if (tile) {
        const terrain = ALL_BASE_TERRAINS.find(t => t.id === tile.terrain);
        const feature = tile.feature ? ALL_FEATURES.find(f => f.id === tile.feature) : null;
        const resource = tile.resource ? ALL_RESOURCES.find(r => r.id === tile.resource) : null;
        const improvement = tile.improvement ? ALL_IMPROVEMENTS.find(i => i.id === tile.improvement) : null;
        const building = tile.building ? ALL_BUILDINGS.find(b => b.id === tile.building) : null;

        content = (
          <div
            className="px-4 py-3 rounded-lg shadow-xl border"
            style={{
              background: 'linear-gradient(135deg, rgba(30,41,59,0.95) 0%, rgba(15,23,42,0.98) 100%)',
              borderColor: 'rgba(251,191,36,0.3)',
              maxWidth: '300px',
              borderWidth: '2px',
            }}
          >
            <div className="font-bold text-sm mb-2 text-amber-400">
              Tile ({tile.coord.q}, {tile.coord.r})
            </div>
            <div className="text-xs space-y-1" style={{ color: 'rgb(203,213,225)' }}>
              <div className="flex justify-between">
                <span className="text-slate-400">Terrain:</span>
                <span className="font-medium capitalize">{terrain?.name || tile.terrain}</span>
              </div>
              {feature && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Feature:</span>
                  <span className="font-medium capitalize">{feature.name}</span>
                </div>
              )}
              {resource && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Resource:</span>
                  <span className="font-medium text-green-400">{resource.name}</span>
                </div>
              )}
              {improvement && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Improvement:</span>
                  <span className="font-medium text-blue-400">{improvement.name}</span>
                </div>
              )}
              {building && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Building:</span>
                  <span className="font-medium text-purple-400">{building.name}</span>
                </div>
              )}
              {(terrain?.baseYields || improvement?.yields) && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <div className="text-xs font-semibold text-slate-400 mb-1">Tile Yields:</div>
                  <div className="grid grid-cols-3 gap-1">
                    {terrain?.baseYields.food && <div>🌾 {terrain.baseYields.food}</div>}
                    {terrain?.baseYields.production && <div>🔨 {terrain.baseYields.production}</div>}
                    {terrain?.baseYields.gold && <div>💰 {terrain.baseYields.gold}</div>}
                    {improvement?.yields.food && <div>🌾 +{improvement.yields.food}</div>}
                    {improvement?.yields.production && <div>🔨 +{improvement.yields.production}</div>}
                    {improvement?.yields.gold && <div>💰 +{improvement.yields.gold}</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }
    }

    if (content) {
      const { x, y } = hexToPixel(hoveredHex);
      const screen = camera.worldToScreen(x, y);
      setTooltipPosition({ x: screen.x, y: screen.y });
      setTooltipContent(content);
    } else {
      setTooltipContent(null);
      setTooltipPosition(null);
    }
  }, [hoveredHex, isAltPressed, state]);

  if (!tooltipContent || !tooltipPosition) {
    return null;
  }

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: tooltipPosition.x,
        top: tooltipPosition.y,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
    >
      {tooltipContent}
    </div>
  );
}
