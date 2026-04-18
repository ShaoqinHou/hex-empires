import type { CityState } from '@hex/engine';
import { calculateCityYields, getGrowthThreshold, ALL_UNITS, ALL_BUILDINGS, calculateCityHappiness, calculateSettlementCapPenalty, applyHappinessPenalty, calculateResourceChanges } from '@hex/engine';
import { useGameState } from '../../providers/GameProvider';
import { UnitCard } from '../components/UnitCard';
import { BuildingCard } from '../components/BuildingCard';
import { PanelShell } from './PanelShell';

interface CityPanelProps {
  city: CityState;
  onClose: () => void;
}

export function CityPanel({ city, onClose }: CityPanelProps) {
  const { state, dispatch, enterPlacementMode } = useGameState();

  const yields = calculateCityYields(city, state);
  const growthThreshold = getGrowthThreshold(city.population);
  const foodConsumed = city.population * 2;
  const settlementCapPenalty = calculateSettlementCapPenalty(state, state.currentPlayerId);
  const cityHappiness = calculateCityHappiness(city, state) - settlementCapPenalty;
  const effectiveFoodSurplus = applyHappinessPenalty(yields.food, cityHappiness) - foodConsumed;
  const foodSurplus = yields.food - foodConsumed;
  const isTown = city.settlementType === 'town';

  // Check which buildings are placed on tiles
  const placedBuildings = new Set<string>();
  for (const tileKey of city.territory) {
    const tile = state.map.tiles.get(tileKey);
    if (tile?.building) {
      placedBuildings.add(tile.building);
    }
  }

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
  // PanelShell renders the title in its chrome bar; combine name +
  // settlement type so the shell title matches the legacy header.
  const shellTitle = `${city.name} — ${settlementLabel} (Pop ${city.population})`;

  return (
    <PanelShell id="city" title={shellTitle} onClose={onClose} priority="overlay" width="narrow">
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
            {isStarving ? (
              <span className="ml-1 font-bold">⚠️ Starving!</span>
            ) : effectiveFoodSurplus > 0 ? (
              <span className="ml-2 font-bold" style={{ color: 'var(--color-food)' }}>
                {Math.ceil((growthThreshold - city.food) / effectiveFoodSurplus)} turns to grow
              </span>
            ) : null}
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
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>
            Buildings ({city.buildings.length})
          </h3>
          {city.buildings.some(bId => !placedBuildings.has(bId)) && (
            <span className="text-[10px] font-bold animate-pulse" style={{ color: '#f59e0b' }}>
              NEEDS PLACEMENT
            </span>
          )}
        </div>
        {city.buildings.length > 0 ? (
          <div className="flex flex-col gap-1">
            {city.buildings.map(bId => {
              const bDef = ALL_BUILDINGS.find(b => b.id === bId);
              const isPlaced = placedBuildings.has(bId);
              const isWonder = bDef?.isWonder === true;
              return bDef ? (
                <div
                  key={bId}
                  className={`flex items-center justify-between px-2 py-1.5 rounded text-xs cursor-pointer transition-all ${
                    !isPlaced ? 'hover:opacity-90' : ''
                  } ${isWonder ? 'shadow-lg' : ''}`}
                  style={{
                    backgroundColor: !isPlaced
                      ? 'rgba(245, 158, 11, 0.12)'
                      : isWonder
                      ? 'transparent'
                      : 'var(--color-bg)',
                    border: !isPlaced
                      ? '1px solid #f59e0b'
                      : isWonder
                      ? '2px solid #fbbf24'
                      : '1px solid var(--color-border)',
                    background: isWonder && isPlaced
                      ? 'linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)'
                      : undefined,
                  }}
                  onClick={() => {
                    if (isPlaced) return;
                    // Built-but-unplaced (legacy / pre-cycle-1 production
                    // queue items) — kick off the same placement flow we
                    // use for fresh production picks. The canvas overlay
                    // (cycle 4) handles the tile click + dispatches
                    // PLACE_BUILDING; close so the map is visible.
                    enterPlacementMode(city.id, bId);
                    onClose();
                  }}
                  title={isPlaced ? 'Placed on map' : 'Click to place on map'}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={!isPlaced ? 'animate-pulse' : ''}>{isPlaced ? '✓' : '📍'}</span>
                    <span className="truncate" style={{ color: !isPlaced ? '#f59e0b' : isWonder ? '#fbbf24' : 'var(--color-text)' }}>
                      {isWonder && '🏆 '}
                      {bDef.name}
                    </span>
                    {!isPlaced && (
                      <span className="ml-auto text-[9px] font-bold shrink-0 animate-pulse" style={{ color: '#f59e0b' }}>
                        PLACE!
                      </span>
                    )}
                  </div>
                  {isPlaced && <BuildingCard building={bDef} isBuilt compact />}
                </div>
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

      {/* Specialist section — only for cities with population > 1 */}
      {!isTown && city.population > 1 && (
        <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>Specialists</h3>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {city.specialists}/{city.population - 1} assigned
            </div>
            <div className="text-[10px]" style={{ color: 'var(--color-science)' }}>
              +2🔬 +2🎭 per specialist
            </div>
          </div>
          <div className="text-[10px] mb-2" style={{ color: 'var(--color-health-low)' }}>
            Each specialist: -1 happiness
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: city.specialists > 0 ? 'var(--color-bg)' : 'var(--color-surface)',
                color: city.specialists > 0 ? 'var(--color-text)' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                opacity: city.specialists > 0 ? 1 : 0.4,
              }}
              disabled={city.specialists === 0}
              onClick={() => dispatch({ type: 'UNASSIGN_SPECIALIST', cityId: city.id })}
            >
              − Remove
            </button>
            <div className="flex-1 flex items-center justify-center gap-1">
              {Array.from({ length: city.population - 1 }, (_, i) => (
                <span
                  key={i}
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: i < city.specialists ? 'var(--color-science)' : 'var(--color-border)',
                  }}
                />
              ))}
            </div>
            <button
              className="px-2 py-1 rounded text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: city.specialists < city.population - 1 ? 'var(--color-bg)' : 'var(--color-surface)',
                color: city.specialists < city.population - 1 ? 'var(--color-text)' : 'var(--color-text-muted)',
                border: '1px solid var(--color-border)',
                opacity: city.specialists < city.population - 1 ? 1 : 0.4,
              }}
              disabled={city.specialists >= city.population - 1}
              onClick={() => dispatch({ type: 'ASSIGN_SPECIALIST', cityId: city.id })}
            >
              + Assign
            </button>
          </div>
          {city.specialists > 0 && (
            <div className="mt-1.5 text-[10px] text-center" style={{ color: 'var(--color-science)' }}>
              Bonus: +{city.specialists * 2} science, +{city.specialists * 2} culture, {city.specialists * -1} happiness
            </div>
          )}
        </div>
      )}

      {/* Build/Purchase section */}
      <div className="px-4 py-2" data-city-build-list="">
        <h3 className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
          {isTown ? 'Purchase' : 'Build'}
        </h3>

        <div className="text-[10px] uppercase tracking-wide mb-1 font-bold" style={{ color: 'var(--color-text-muted)' }}>Units</div>
        <div className="flex flex-col gap-1 mb-3">
          {availableUnits.map(u => {
            const goldCost = u.cost * 2;
            const turnsEstimate = yields.production > 0 ? Math.ceil(u.cost / yields.production) : null;
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
              <div key={u.id} className="relative">
                <UnitCard
                  unit={u}
                  compact
                  isActive={currentProduction?.id === u.id}
                  onClick={() => dispatch({ type: 'SET_PRODUCTION', cityId: city.id, itemId: u.id, itemType: 'unit' })}
                />
                {turnsEstimate !== null && currentProduction?.id !== u.id && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none"
                    style={{ color: 'var(--color-production)' }}>
                    ~{turnsEstimate}t
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="text-[10px] uppercase tracking-wide mb-1 font-bold" style={{ color: 'var(--color-text-muted)' }}>Buildings</div>
        <div className="flex flex-col gap-1">
          {availableBuildings.map(b => {
            const goldCost = b.cost * 2;
            const turnsEstimate = yields.production > 0 ? Math.ceil(b.cost / yields.production) : null;
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
              <div key={b.id} className="relative">
                <BuildingCard
                  building={b}
                  compact
                  isActive={currentProduction?.id === b.id}
                  onClick={() => {
                    // Cycle 5: buildings/wonders need a tile — launch placement
                    // mode instead of dispatching SET_PRODUCTION immediately.
                    // Close the panel so the player can see the map and pick
                    // a tile; the canvas overlay (cycle 4) handles the click
                    // and dispatches SET_PRODUCTION with the tile attached.
                    enterPlacementMode(city.id, b.id);
                    onClose();
                  }}
                />
                {turnsEstimate !== null && currentProduction?.id !== b.id && (
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold pointer-events-none"
                    style={{ color: 'var(--color-production)' }}>
                    ~{turnsEstimate}t
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

    </PanelShell>
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

function HeroProgressBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="city-hero-production__bar-track">
      <div
        className="city-hero-production__bar-fill"
        style={{ width: `${pct}%` }}
      />
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
