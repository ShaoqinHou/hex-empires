import React, { useState, useEffect } from 'react';
import type { HexCoord } from '@hex/engine';
import { coordToKey } from '@hex/engine';
import type { Camera } from './Camera';
import { hexToPixel } from './HexRenderer';
import { UnitStateTooltip } from '../ui/components/tooltips';
import type { UnitState, UnitDef, CityState } from '@hex/engine';
import { ALL_UNITS } from '@hex/engine';

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
          content = (
            <div
              className="px-3 py-2 rounded-lg shadow-xl border"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: 'var(--color-border)',
                maxWidth: '200px',
              }}
            >
              <div className="font-bold text-sm mb-1">{city.name}</div>
              <div className="text-xs space-y-0.5" style={{ color: 'var(--color-text-muted)' }}>
                <div>Owner: {city.owner}</div>
                <div>Population: {city.population}</div>
                <div>Type: {city.settlementType === 'city' ? 'City' : 'Town'}</div>
                <div>Defense HP: {city.defenseHP}</div>
                <div>Happiness: {city.happiness >= 0 ? `+${city.happiness}` : city.happiness}</div>
                {city.productionQueue.length > 0 && city.settlementType === 'city' && (
                  <div>Producing: {city.productionQueue[0].id}</div>
                )}
              </div>
            </div>
          );
          break;
        }
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
