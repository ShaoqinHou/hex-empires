import type { CityState } from '@hex/engine';
import { calculateCityYields, getGrowthThreshold, ALL_UNITS, ALL_BUILDINGS, calculateCityHappiness, calculateSettlementCapPenalty, applyHappinessPenalty, calculateResourceChanges } from '@hex/engine';
import type { UnitDef, BuildingDef } from '@hex/engine';
import { useGame } from '../../providers/GameProvider';
import { UnitCard } from '../components/UnitCard';
import { BuildingCard } from '../components/BuildingCard';

interface CityPanelProps {
  city: CityState;
  onClose: () => void;
}

export function CityPanel({ city, onClose }: CityPanelProps) {
  const { state, dispatch } = useGame();
  const yields = calculateCityYields(city, state);
  const growthThreshold = getGrowthThreshold(city.population);
  const foodConsumed = city.population * 2;
  const settlementCapPenalty = calculateSettlementCapPenalty(state, state.currentPlayerId);
  const cityHappiness = calculateCityHappiness(city, state) - settlementCapPenalty;
  const effectiveFoodSurplus = applyHappinessPenalty(yields.food, cityHappiness) - foodConsumed;
  const foodSurplus = yields.food - foodConsumed;
  const isTown = city.settlementType === 'town';

  // Calculate city-specific resource changes for warnings
  const resourceChanges = calculateResourceChanges(state, state.currentPlayerId);
  const isStarving = effectiveFoodSurplus < 0 && city.food < growthThreshold * 0.2;
  const hasGoldDeficit = isTown && (applyHappinessPenalty(yields.gold + yields.production, cityHappiness)) < 0;

  const currentProduction = city.productionQueue[0];

  // Get the player's current age
  const player = state.players.get(state.currentPlayerId);
  const currentAge = player?.age ?? 'antiquity';
  const playerGold = player?.gold ?? 0;

  // Available production items — filter by age AND tech prerequisites
  const researchedTechs = new Set(player?.researchedTechs ?? []);
  const availableUnits = ALL_UNITS.filter(u =>
    u.age === currentAge && (!u.requiredTech || researchedTechs.has(u.requiredTech))
  );
  const availableBuildings = ALL_BUILDINGS.filter(b =>
    b.age === currentAge
    && !city.buildings.includes(b.id)
    && (!b.requiredTech || researchedTechs.has(b.requiredTech))
  );

  const settlementLabel = isTown ? 'Town' : (city.isCapital ? 'Capital City' : 'City');
  const happinessColor = city.happiness >= 0 ? 'var(--color-food)' : 'var(--color-health-low)';

  return (
    <div className="absolute right-0 top-12 bottom-14 w-80 overflow-y-auto"
      style={{ backgroundColor: 'var(--color-surface)', borderLeft: '1px solid var(--color-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3"
        style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div>
          <h2 className="text-lg font-bold">{city.name}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: isTown ? 'var(--color-production)' : 'var(--color-science)',
                color: 'var(--color-bg)',
              }}>
              {settlementLabel}
            </span>
            <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              Pop: {city.population}
            </span>
          </div>
        </div>
        <button onClick={onClose} className="text-sm px-2 py-1 cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}>
          X
        </button>
      </div>

      {/* Happiness */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Happiness</h3>
        <div className="flex items-center gap-2 text-sm">
          <span className="font-bold" style={{ color: happinessColor }}>
            {city.happiness >= 0 ? '+' : ''}{city.happiness}
          </span>
          {city.happiness < 0 && (
            <span className="text-xs" style={{ color: 'var(--color-health-low)' }}>
              (-{Math.min(100, Math.abs(city.happiness) * 2)}% yields)
            </span>
          )}
        </div>
      </div>

      {/* Upgrade to City button for towns */}
      {isTown && (
        <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <button
            className="w-full px-3 py-2 text-xs font-bold rounded cursor-pointer"
            style={{
              backgroundColor: playerGold >= 100 ? 'var(--color-gold)' : 'var(--color-bg)',
              color: playerGold >= 100 ? 'var(--color-bg)' : 'var(--color-text-muted)',
              opacity: playerGold >= 100 ? 1 : 0.5,
            }}
            disabled={playerGold < 100}
            onClick={() => dispatch({ type: 'UPGRADE_SETTLEMENT', cityId: city.id })}
          >
            Upgrade to City (100g)
          </button>
        </div>
      )}

      {/* Yields */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Yields</h3>
          {/* Warning icons for critical issues */}
          <div className="flex items-center gap-1">
            {isStarving && (
              <div className="flex items-center gap-0.5" title="Starving! City will lose population">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-health-low)' }}>
                  <path d="M18 8h1a4 4 0 0 1 0 8h-1" />
                  <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" />
                  <line x1="6" y1="1" x2="6" y2="4" />
                  <line x1="10" y1="1" x2="10" y2="4" />
                  <line x1="14" y1="1" x2="14" y2="4" />
                </svg>
                <span className="text-[10px] font-bold" style={{ color: 'var(--color-health-low)' }}>STARVING</span>
              </div>
            )}
            {hasGoldDeficit && (
              <div className="flex items-center gap-0.5" title="Gold deficit - town not profitable">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-gold)' }}>
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span className="text-[10px] font-bold" style={{ color: 'var(--color-gold)' }}>DEFICIT</span>
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-1 text-xs">
          <YieldDisplay label="Food" value={yields.food} surplus={effectiveFoodSurplus} color="var(--color-food)" showWarning={isStarving} />
          <YieldDisplay label="Production" value={isTown ? 0 : yields.production} color="var(--color-production)" />
          <YieldDisplay label="Gold" value={yields.gold + (isTown ? yields.production : 0)} color="var(--color-gold)" showWarning={hasGoldDeficit} />
          <YieldDisplay label="Science" value={yields.science} color="var(--color-science)" />
          <YieldDisplay label="Culture" value={yields.culture} color="var(--color-culture)" />
          <YieldDisplay label="Faith" value={yields.faith} color="var(--color-faith)" />
        </div>
        {isTown && (
          <div className="text-[10px] mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Towns convert production to gold
          </div>
        )}
      </div>

      {/* Growth */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Growth</h3>
        <div className="text-xs">
          <ProgressBar value={city.food} max={growthThreshold} color={isStarving ? 'var(--color-health-low)' : 'var(--color-food)'} />
          <span style={{ color: isStarving ? 'var(--color-health-low)' : 'var(--color-text-muted)' }}>
            {city.food}/{growthThreshold} ({effectiveFoodSurplus >= 0 ? '+' : ''}{effectiveFoodSurplus}/turn)
            {isStarving && (
              <span className="ml-1 font-bold">⚠️ Starving!</span>
            )}
          </span>
        </div>
      </div>

      {/* Current Production — only for cities */}
      {!isTown && (
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
      )}

      {/* Built Buildings */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
        <h3 className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
          Buildings ({city.buildings.length})
        </h3>
        {city.buildings.length > 0 ? (
          <div className="flex flex-col gap-1">
            {city.buildings.map(bId => {
              const bDef = ALL_BUILDINGS.find(b => b.id === bId);
              return bDef ? (
                <BuildingCard key={bId} building={bDef} isBuilt compact />
              ) : (
                <span key={bId} className="text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--color-text-muted)' }}>
                  {bId}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>None</span>
        )}
      </div>

      {/* Build/Purchase section */}
      <div className="px-4 py-2">
        <h3 className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
          {isTown ? 'Purchase' : 'Build'}
        </h3>

        <div className="text-[10px] uppercase tracking-wide mb-1 font-bold" style={{ color: 'var(--color-text-muted)' }}>Units</div>
        <div className="flex flex-col gap-1 mb-3">
          {availableUnits.map(u => {
            const goldCost = u.cost * 2;
            return isTown ? (
              <button
                key={u.id}
                className="flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer"
                style={{
                  backgroundColor: playerGold >= goldCost ? 'var(--color-bg)' : 'var(--color-surface)',
                  color: playerGold >= goldCost ? 'var(--color-text)' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  opacity: playerGold >= goldCost ? 1 : 0.5,
                }}
                disabled={playerGold < goldCost}
                onClick={() => dispatch({ type: 'PURCHASE_ITEM', cityId: city.id, itemId: u.id, itemType: 'unit' })}
              >
                <span>{u.name}</span>
                <span style={{ color: 'var(--color-gold)' }}>{goldCost}g</span>
              </button>
            ) : (
              <UnitCard
                key={u.id}
                unit={u}
                compact
                isActive={currentProduction?.id === u.id}
                onClick={() => dispatch({ type: 'SET_PRODUCTION', cityId: city.id, itemId: u.id, itemType: 'unit' })}
              />
            );
          })}
        </div>

        <div className="text-[10px] uppercase tracking-wide mb-1 font-bold" style={{ color: 'var(--color-text-muted)' }}>Buildings</div>
        <div className="flex flex-col gap-1">
          {availableBuildings.map(b => {
            const goldCost = b.cost * 2;
            return isTown ? (
              <button
                key={b.id}
                className="flex items-center justify-between px-2 py-1 rounded text-xs cursor-pointer"
                style={{
                  backgroundColor: playerGold >= goldCost ? 'var(--color-bg)' : 'var(--color-surface)',
                  color: playerGold >= goldCost ? 'var(--color-text)' : 'var(--color-text-muted)',
                  border: '1px solid var(--color-border)',
                  opacity: playerGold >= goldCost ? 1 : 0.5,
                }}
                disabled={playerGold < goldCost}
                onClick={() => dispatch({ type: 'PURCHASE_ITEM', cityId: city.id, itemId: b.id, itemType: 'building' })}
              >
                <span>{b.name}</span>
                <span style={{ color: 'var(--color-gold)' }}>{goldCost}g</span>
              </button>
            ) : (
              <BuildingCard
                key={b.id}
                building={b}
                compact
                isActive={currentProduction?.id === b.id}
                onClick={() => dispatch({ type: 'SET_PRODUCTION', cityId: city.id, itemId: b.id, itemType: 'building' })}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

function YieldDisplay({ label, value, surplus, color, showWarning }: { label: string; value: number; surplus?: number; color: string; showWarning?: boolean }) {
  return (
    <div className="flex items-center gap-1">
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      <span style={{ color }}>{value}</span>
      {surplus !== undefined && (
        <span style={{ color: surplus >= 0 ? 'var(--color-food)' : 'var(--color-health-low)', fontSize: '10px' }}>
          ({surplus >= 0 ? '+' : ''}{surplus})
        </span>
      )}
      {showWarning && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-health-low)' }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
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
