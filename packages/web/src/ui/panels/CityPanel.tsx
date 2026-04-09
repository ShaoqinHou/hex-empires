import type { CityState } from '@hex/engine';
import { calculateCityYields, getGrowthThreshold, ALL_UNITS, ALL_BUILDINGS, Registry } from '@hex/engine';
import type { UnitDef, BuildingDef } from '@hex/engine';
import { useGame } from '../../providers/GameProvider';

interface CityPanelProps {
  city: CityState;
  onClose: () => void;
}

export function CityPanel({ city, onClose }: CityPanelProps) {
  const { state, dispatch } = useGame();
  const yields = calculateCityYields(city, state);
  const growthThreshold = getGrowthThreshold(city.population);
  const foodConsumed = city.population * 2;
  const foodSurplus = yields.food - foodConsumed;

  const currentProduction = city.productionQueue[0];

  // Get the player's current age
  const player = state.players.get(state.currentPlayerId);
  const currentAge = player?.age ?? 'antiquity';

  // Available production items
  const availableUnits = ALL_UNITS.filter(u => u.age === currentAge);
  const availableBuildings = ALL_BUILDINGS.filter(
    b => b.age === currentAge && !city.buildings.includes(b.id)
  );

  return (
    <div className="absolute right-0 top-12 bottom-14 w-80 overflow-y-auto"
      style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h2 className="text-lg font-bold">{city.name}</h2>
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            Population: {city.population}
          </span>
        </div>
        <button onClick={onClose} className="text-sm px-2 py-1 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}>
          X
        </button>
      </div>

      {/* Yields */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Yields</h3>
        <div className="grid grid-cols-3 gap-1 text-xs">
          <YieldDisplay label="Food" value={yields.food} surplus={foodSurplus} color="var(--color-food)" />
          <YieldDisplay label="Production" value={yields.production} color="var(--color-production)" />
          <YieldDisplay label="Gold" value={yields.gold} color="var(--color-gold)" />
          <YieldDisplay label="Science" value={yields.science} color="var(--color-science)" />
          <YieldDisplay label="Culture" value={yields.culture} color="var(--color-culture)" />
          <YieldDisplay label="Faith" value={yields.faith} color="var(--color-faith)" />
        </div>
      </div>

      {/* Growth */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Growth</h3>
        <div className="text-xs">
          <ProgressBar value={city.food} max={growthThreshold} color="var(--color-food)" />
          <span style={{ color: 'var(--color-text-muted)' }}>
            {city.food}/{growthThreshold} ({foodSurplus >= 0 ? '+' : ''}{foodSurplus}/turn)
          </span>
        </div>
        <div className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
          Housing: {city.population}/{city.housing}
        </div>
      </div>

      {/* Current Production */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Production</h3>
        {currentProduction ? (
          <div className="text-xs">
            <span className="font-bold">{getProductionName(currentProduction.id)}</span>
            <ProgressBar value={city.productionProgress} max={getProductionCost(currentProduction.id)} color="var(--color-production)" />
            <span style={{ color: 'var(--color-text-muted)' }}>
              {city.productionProgress}/{getProductionCost(currentProduction.id)} ({yields.production}/turn)
            </span>
            {yields.production > 0 && (
              <span className="ml-2 font-bold" style={{ color: 'var(--color-production)' }}>
                {Math.ceil((getProductionCost(currentProduction.id) - city.productionProgress) / yields.production)} turns remaining
              </span>
            )}
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Nothing — choose below</span>
        )}
      </div>

      {/* Buildings */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Buildings</h3>
        {city.buildings.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {city.buildings.map(b => (
              <span key={b} className="text-xs px-1.5 py-0.5 rounded"
                style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                {b}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>None</span>
        )}
      </div>

      {/* Build queue options */}
      <div className="px-4 py-2">
        <h3 className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
          Build
        </h3>

        <div className="text-xs mb-1 font-bold" style={{ color: 'var(--color-text-muted)' }}>Units</div>
        <div className="flex flex-col gap-1 mb-3">
          {availableUnits.map(u => (
            <button
              key={u.id}
              className="text-left text-xs px-2 py-1.5 rounded cursor-pointer transition-colors"
              style={{
                backgroundColor: currentProduction?.id === u.id ? 'var(--color-accent)' : 'var(--color-bg)',
                color: currentProduction?.id === u.id ? 'var(--color-bg)' : 'var(--color-text)',
              }}
              onClick={() => dispatch({ type: 'SET_PRODUCTION', cityId: city.id, itemId: u.id, itemType: 'unit' })}
            >
              {u.name} — {u.cost} prod | Str: {u.combat}
            </button>
          ))}
        </div>

        <div className="text-xs mb-1 font-bold" style={{ color: 'var(--color-text-muted)' }}>Buildings</div>
        <div className="flex flex-col gap-1">
          {availableBuildings.map(b => (
            <button
              key={b.id}
              className="text-left text-xs px-2 py-1.5 rounded cursor-pointer transition-colors"
              style={{
                backgroundColor: currentProduction?.id === b.id ? 'var(--color-accent)' : 'var(--color-bg)',
                color: currentProduction?.id === b.id ? 'var(--color-bg)' : 'var(--color-text)',
              }}
              onClick={() => dispatch({ type: 'SET_PRODUCTION', cityId: city.id, itemId: b.id, itemType: 'building' })}
            >
              {b.name} — {b.cost} prod
              {Object.entries(b.yields).filter(([, v]) => v > 0).map(([k, v]) => ` +${v} ${k}`).join('')}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function YieldDisplay({ label, value, surplus, color }: { label: string; value: number; surplus?: number; color: string }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span style={{ color }}>{value}</span>
      {surplus !== undefined && (
        <span style={{ color: surplus >= 0 ? 'var(--color-food)' : 'var(--color-health-low)', fontSize: '10px' }}>
          ({surplus >= 0 ? '+' : ''}{surplus})
        </span>
      )}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1.5 rounded-full my-1" style={{ backgroundColor: 'var(--color-bg)' }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function getProductionCost(itemId: string): number {
  const unit = ALL_UNITS.find(u => u.id === itemId);
  if (unit) return unit.cost;
  const building = ALL_BUILDINGS.find(b => b.id === itemId);
  if (building) return building.cost;
  return 100;
}

function getProductionName(itemId: string): string {
  const unit = ALL_UNITS.find(u => u.id === itemId);
  if (unit) return unit.name;
  const building = ALL_BUILDINGS.find(b => b.id === itemId);
  if (building) return building.name;
  return itemId;
}
