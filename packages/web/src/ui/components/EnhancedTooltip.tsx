// @ts-nocheck
import { useState, useRef, useEffect } from 'react';
import { useGameState } from '../../providers/GameProvider';
import type { HexCoord, UnitState, CityState, TerrainDef } from '@hex/engine';
import { coordToKey } from '@hex/engine';

interface EnhancedTooltipProps {
  hex: HexCoord | null;
}

export function EnhancedTooltip({ hex }: EnhancedTooltipProps) {
  const { state, terrainRegistry, featureRegistry, unitRegistry, resourceRegistry } = useGameState();
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  if (!hex) return null;

  const key = coordToKey(hex);
  const tile = state.map.tiles.get(key);

  if (!tile) return null;

  const terrain = terrainRegistry.get(tile.terrain);
  const feature = tile.feature ? featureRegistry.get(tile.feature) : null;
  const resource = tile.resource ? resourceRegistry.get(tile.resource) : null;

  // Find unit on this hex
  const unit = [...state.units.values()].find(u => coordToKey(u.position) === key);

  // Find city on this hex
  const city = [...state.cities.values()].find(c => coordToKey(c.position) === key);

  // Calculate yield
  const food = terrain?.baseYields.food ?? 0 + (feature?.baseYields.food ?? 0);
  const production = terrain?.baseYields.production ?? 0 + (feature?.baseYields.production ?? 0);
  const gold = terrain?.baseYields.gold ?? 0 + (feature?.baseYields.gold ?? 0);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-50 pointer-events-none"
      style={{
        left: position?.x ?? 0,
        top: position?.y ?? 0,
        transform: 'translate(-100%, -100%)',
      }}
    >
      <div
        className="bg-surface border rounded-lg p-3 shadow-xl min-w-[200px] max-w-[280px]"
        style={{
          backgroundColor: 'var(--color-surface)',
          borderColor: 'var(--color-border)',
        }}
      >
        {/* Coordinates */}
        <div className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>
          ({hex.q}, {hex.r})
        </div>

        {/* Terrain */}
        <div className="mb-2">
          <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
            {terrain?.name ?? 'Unknown'}
            {feature && ` + ${feature.name}`}
          </div>
          <div className="flex gap-3 mt-1 text-xs">
            {food > 0 && (
              <div className="flex items-center gap-1" style={{ color: 'var(--color-food)' }}>
                <span>🌾</span>
                <span>+{food}</span>
              </div>
            )}
            {production > 0 && (
              <div className="flex items-center gap-1" style={{ color: 'var(--color-production)' }}>
                <span>⚙️</span>
                <span>+{production}</span>
              </div>
            )}
            {gold > 0 && (
              <div className="flex items-center gap-1" style={{ color: 'var(--color-gold)' }}>
                <span>💰</span>
                <span>+{gold}</span>
              </div>
            )}
          </div>
        </div>

        {/* Resource */}
        {resource && (
          <div className="mb-2 p-2 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="flex items-center gap-2">
              <div
                className="w-4 h-4 rounded-full"
                style={{
                  backgroundColor: resource.type === 'luxury' ? '#ffd54f'
                    : resource.type === 'strategic' ? '#9e9e9e'
                    : '#66bb6a'
                }}
              />
              <div>
                <div className="text-xs font-bold" style={{ color: 'var(--color-text)' }}>
                  {resource.name}
                </div>
                <div className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
                  {resource.type}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Unit */}
        {unit && (
          <div className="mb-2 p-2 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>
                  {unitRegistry.get(unit.typeId)?.name ?? unit.typeId}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Owner: {state.players.get(unit.owner)?.name ?? 'Unknown'}
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: unit.health > 50 ? 'var(--color-health-high)' : 'var(--color-health-low)' }}>
                  HP: {unit.health}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-accent)' }}>
                  Movement: {unit.movementLeft}
                </div>
              </div>
            </div>
            {unit.experience > 0 && (
              <div className="mt-1 text-xs" style={{ color: 'var(--color-science)' }}>
                XP: {unit.experience}
              </div>
            )}
            {unit.promotions.length > 0 && (
              <div className="mt-1 text-xs" style={{ color: 'var(--color-culture)' }}>
                Promotions: {unit.promotions.length}
              </div>
            )}
          </div>
        )}

        {/* City */}
        {city && (
          <div className="mb-2 p-2 rounded" style={{ backgroundColor: 'var(--color-bg)' }}>
            <div className="text-sm font-bold mb-1" style={{ color: 'var(--color-text)' }}>
              {city.name}
            </div>
            <div className="flex gap-3 text-xs">
              <div style={{ color: 'var(--color-text-muted)' }}>
                Pop: <span style={{ color: 'var(--color-text)' }}>{city.population}</span>
              </div>
              <div style={{ color: 'var(--color-text-muted)' }}>
                Defense: <span style={{ color: city.defenseHP > 50 ? 'var(--color-health-high)' : 'var(--color-health-low)' }}>
                  {city.defenseHP}
                </span>
              </div>
            </div>
            {city.productionQueue.length > 0 && (
              <div className="mt-1 text-xs" style={{ color: 'var(--color-production)' }}>
                Producing: {city.productionQueue[0].id}
                <span className="ml-1" style={{ color: 'var(--color-text-muted)' }}>
                  ({city.productionProgress}/{city.productionQueue[0].cost})
                </span>
              </div>
            )}
            {city.specialization && (
              <div className="mt-1 text-xs" style={{ color: 'var(--color-culture)' }}>
                Specialization: {city.specialization}
              </div>
            )}
          </div>
        )}

        {/* Movement cost */}
        <div className="text-xs pt-2 border-t" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          Movement Cost: {terrain?.movementCost ?? 1}
          {feature?.movementCost && ` + ${feature.movementCost}`}
        </div>
      </div>
    </div>
  );
}
