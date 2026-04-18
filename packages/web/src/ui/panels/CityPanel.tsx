import type { CityState } from '@hex/engine';
import { calculateCityYields, getGrowthThreshold, calculateCityHappiness, calculateSettlementCapPenalty, applyHappinessPenalty, calculateResourceChanges } from '@hex/engine';
import { useGameState } from '../../providers/GameProvider';
import { UnitCard } from '../components/UnitCard';
import { BuildingCard } from '../components/BuildingCard';
import { PanelShell } from './PanelShell';
import './city-panel.css';

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
  void calculateResourceChanges(state, state.currentPlayerId);
  const isStarving = effectiveFoodSurplus < 0 && city.food < growthThreshold * 0.2;
  const hasGoldDeficit = isTown && (applyHappinessPenalty(yields.gold + yields.production, cityHappiness)) < 0;

  const currentProduction = city.productionQueue[0];

  // Get the player's current age
  const player = state.players.get(state.currentPlayerId);
  const currentAge = player?.age ?? 'antiquity';
  const playerGold = player?.gold ?? 0;

  // Available production items — filter by age AND tech prerequisites
  const researchedTechs = new Set(player?.researchedTechs ?? []);
  const availableUnits = [...state.config.units.values()].filter(u =>
    u.age === currentAge && (!u.requiredTech || researchedTechs.has(u.requiredTech))
  );
  const availableBuildings = [...state.config.buildings.values()].filter(b =>
    b.age === currentAge
    && !city.buildings.includes(b.id)
    && (!b.requiredTech || researchedTechs.has(b.requiredTech))
  );

  const getProductionCost = (itemId: string): number => {
    const unit = state.config.units.get(itemId);
    if (unit) return unit.cost;
    const building = state.config.buildings.get(itemId);
    if (building) return building.cost;
    return 100;
  };

  const getProductionName = (itemId: string): string => {
    const unit = state.config.units.get(itemId);
    if (unit) return unit.name;
    const building = state.config.buildings.get(itemId);
    if (building) return building.name;
    return itemId;
  };

  const settlementLabel = isTown ? 'Town' : (city.isCapital ? 'Capital City' : 'City');
  const happinessColor = city.happiness >= 0 ? 'var(--color-food)' : 'var(--color-health-low)';
  const shellTitle = `${city.name} — ${settlementLabel} (Pop ${city.population})`;

  // Worked-tiles summary — non-urban (no placed building) territory tiles
  const territoryKeys = Array.from(city.territory as Iterable<string>);
  const totalTiles = territoryKeys.length;
  const workedTiles = territoryKeys.filter(key => {
    const tile = state.map.tiles.get(key);
    return tile && !tile.building;
  });
  const workedCount = workedTiles.length;
  const terrainCounts = new Map<string, number>();
  for (const key of workedTiles) {
    const tile = state.map.tiles.get(key);
    if (!tile) continue;
    const terrainDef = state.config.terrains.get(tile.terrain);
    const name = terrainDef?.name ?? tile.terrain;
    terrainCounts.set(name, (terrainCounts.get(name) ?? 0) + 1);
  }
  const terrainTags = [...terrainCounts.entries()].sort((a, b) => b[1] - a[1]);

  // Yields for compact ledger — towns convert production to gold
  const ledgerFood = yields.food;
  const ledgerProduction = isTown ? 0 : yields.production;
  const ledgerGold = yields.gold + (isTown ? yields.production : 0);
  const ledgerScience = yields.science;
  const ledgerCulture = yields.culture;
  const ledgerFaith = yields.faith;

  return (
    <PanelShell id="city" title={shellTitle} onClose={onClose} priority="overlay" width="narrow">

      {/* ── Hero Production Block (cities only) ─────────────────────── */}
      {!isTown && (
        <div className="city-hero-production">
          <div className="city-hero-production__label">
            {currentProduction ? 'Building' : 'Production'}
          </div>
          {currentProduction ? (
            <>
              <div className="city-hero-production__name">
                {getProductionName(currentProduction.id)}
              </div>
              <div className="city-hero-production__bar-row">
                <HeroProgressBar
                  value={city.productionProgress}
                  max={getProductionCost(currentProduction.id)}
                />
                <span className="city-hero-production__pct">
                  {Math.round((city.productionProgress / getProductionCost(currentProduction.id)) * 100)}%
                </span>
              </div>
              <div className="city-hero-production__meta">
                <span style={{ color: 'var(--panel-muted-color)' }}>
                  {city.productionProgress}/{getProductionCost(currentProduction.id)}
                </span>
                {yields.production > 0 ? (
                  <span style={{ color: 'var(--color-production)' }} className="font-bold">
                    {Math.ceil((getProductionCost(currentProduction.id) - city.productionProgress) / yields.production)} turns
                  </span>
                ) : (
                  <span style={{ color: 'var(--panel-muted-color)' }}>no production</span>
                )}
              </div>
              <button
                className="city-hero-production__change-btn"
                onClick={() => {
                  document.querySelector('[data-city-build-list]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
              >
                change build →
              </button>
            </>
          ) : (
            <div className="city-hero-production__empty">
              <span style={{ color: 'var(--panel-muted-color)' }}>Nothing queued</span>
              <button
                className="city-hero-production__choose-btn"
                onClick={() => {
                  document.querySelector('[data-city-build-list]')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }}
              >
                Choose what to build ↓
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upgrade to City button for towns */}
      {isTown && (
        <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <button
            className="w-full px-3 py-2 text-xs font-bold rounded cursor-pointer"
            style={{
              backgroundColor: playerGold >= 100 ? 'var(--color-gold)' : 'var(--color-bg)',
              color: playerGold >= 100 ? 'var(--color-bg)' : 'var(--panel-muted-color)',
              opacity: playerGold >= 100 ? 1 : 0.5,
            }}
            disabled={playerGold < 100}
            onClick={() => dispatch({ type: 'UPGRADE_SETTLEMENT', cityId: city.id })}
          >
            Upgrade to City (100g)
          </button>
        </div>
      )}

      {/* ── Compact Resource Ledger ──────────────────────────────────── */}
      <div className="city-resource-ledger">
        <div className="city-resource-ledger__label">
          Yields
          {(isStarving || hasGoldDeficit) && (
            <span className="ml-2 font-bold" style={{ color: 'var(--panel-accent-danger)' }}>
              {isStarving ? '⚠ Starving' : '⚠ Deficit'}
            </span>
          )}
        </div>
        <div className="city-resource-ledger__row">
          <LedgerItem value={ledgerFood} delta={effectiveFoodSurplus} color="var(--color-food)" label="Food" />
          {!isTown && <LedgerItem value={ledgerProduction} color="var(--color-production)" label="Prod" />}
          <LedgerItem value={ledgerGold} color="var(--color-gold)" label="Gold" warn={hasGoldDeficit} />
          <LedgerItem value={ledgerScience} color="var(--color-science)" label="Sci" />
          <LedgerItem value={ledgerCulture} color="var(--color-culture)" label="Cul" />
          {ledgerFaith > 0 && <LedgerItem value={ledgerFaith} color="var(--color-faith)" label="Faith" />}
        </div>
        {isTown && (
          <div className="city-resource-ledger__note">Towns convert production to gold</div>
        )}
        {/* Growth bar inline with food */}
        <div style={{ marginTop: 6 }}>
          <div className="flex items-center justify-between text-xs mb-0.5">
            <span style={{ color: 'var(--panel-muted-color)' }}>Growth</span>
            <span style={{ color: isStarving ? 'var(--panel-accent-danger)' : 'var(--panel-muted-color)' }}>
              {city.food}/{growthThreshold}
              {isStarving ? (
                <span className="ml-1 font-bold" style={{ color: 'var(--panel-accent-danger)' }}> ⚠ Starving!</span>
              ) : effectiveFoodSurplus > 0 ? (
                <span className="ml-1 font-bold" style={{ color: 'var(--color-food)' }}>
                  +{effectiveFoodSurplus}/t — {Math.ceil((growthThreshold - city.food) / effectiveFoodSurplus)}t
                </span>
              ) : null}
            </span>
          </div>
          <ProgressBar value={city.food} max={growthThreshold} color={isStarving ? 'var(--panel-accent-danger)' : 'var(--color-food)'} />
        </div>
        {/* Happiness inline */}
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span style={{ color: 'var(--panel-muted-color)' }}>Happiness</span>
          <span className="font-bold" style={{ color: happinessColor }}>
            {city.happiness >= 0 ? '+' : ''}{city.happiness}
          </span>
          {city.happiness < 0 && (
            <span style={{ color: 'var(--panel-accent-danger)' }}>
              ({Math.min(100, Math.abs(city.happiness) * 2)}% yield penalty)
            </span>
          )}
        </div>
      </div>

      {/* ── Worked-Tiles Summary ─────────────────────────────────────── */}
      {totalTiles > 0 && (
        <div className="city-worked-tiles">
          <div className="city-worked-tiles__label">Territory</div>
          <div className="city-worked-tiles__summary">
            <span className="city-worked-tiles__count">{workedCount}/{totalTiles}</span>
            {' '}tiles worked
          </div>
          {terrainTags.length > 0 && (
            <div className="city-worked-tiles__tags">
              {terrainTags.map(([name, count]) => (
                <span key={name} className="city-worked-tiles__tag">
                  {name} ×{count}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Built Buildings */}
      <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--panel-border)' }}>
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-xs uppercase tracking-wide" style={{ color: 'var(--panel-muted-color)' }}>
            Buildings ({city.buildings.length})
          </h3>
          {city.buildings.some(bId => !placedBuildings.has(bId)) && (
            <span className="text-[10px] font-bold animate-pulse" style={{ color: 'var(--panel-accent-gold)' }}>
              NEEDS PLACEMENT
            </span>
          )}
        </div>
        {city.buildings.length > 0 ? (
          <div className="flex flex-col gap-1">
            {city.buildings.map(bId => {
              const bDef = state.config.buildings.get(bId);
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
                      ? 'color-mix(in srgb, var(--panel-accent-gold) 12%, transparent)'
                      : isWonder
                      ? 'transparent'
                      : 'var(--color-bg)',
                    border: !isPlaced
                      ? '1px solid var(--panel-accent-gold)'
                      : isWonder
                      ? '2px solid var(--panel-accent-gold-bright)'
                      : '1px solid var(--panel-border)',
                    background: isWonder && isPlaced
                      ? 'linear-gradient(135deg, color-mix(in srgb, var(--panel-accent-gold) 15%, transparent) 0%, color-mix(in srgb, var(--panel-accent-gold) 15%, transparent) 100%)'
                      : undefined,
                  }}
                  onClick={() => {
                    if (isPlaced) return;
                    enterPlacementMode(city.id, bId);
                    onClose();
                  }}
                  title={isPlaced ? 'Placed on map' : 'Click to place on map'}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className={!isPlaced ? 'animate-pulse' : ''}>{isPlaced ? '✓' : '📍'}</span>
                    <span className="truncate" style={{ color: !isPlaced ? 'var(--panel-accent-gold)' : isWonder ? 'var(--panel-accent-gold-bright)' : 'var(--panel-text-color)' }}>
                      {isWonder && '🏆 '}
                      {bDef.name}
                    </span>
                    {!isPlaced && (
                      <span className="ml-auto text-[9px] font-bold shrink-0 animate-pulse" style={{ color: 'var(--panel-accent-gold)' }}>
                        PLACE!
                      </span>
                    )}
                  </div>
                  {isPlaced && <BuildingCard building={bDef} isBuilt compact />}
                </div>
              ) : (
                <span key={bId} className="text-xs px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: 'var(--color-bg)', color: 'var(--panel-muted-color)' }}>
                  {bId}
                </span>
              );
            })}
          </div>
        ) : (
          <span className="text-xs" style={{ color: 'var(--panel-muted-color)' }}>None</span>
        )}
      </div>

      {/* Specialist section — only for cities with population > 1 */}
      {!isTown && city.population > 1 && (
        <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--panel-border)' }}>
          <h3 className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--panel-muted-color)' }}>Specialists</h3>
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs" style={{ color: 'var(--panel-muted-color)' }}>
              {city.specialists}/{city.population - 1} assigned
            </div>
            <div className="text-[10px]" style={{ color: 'var(--color-science)' }}>
              +2🔬 +2🎭 per specialist
            </div>
          </div>
          <div className="text-[10px] mb-2" style={{ color: 'var(--panel-accent-danger)' }}>
            Each specialist: -1 happiness
          </div>
          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 rounded text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: city.specialists > 0 ? 'var(--color-bg)' : 'var(--color-surface)',
                color: city.specialists > 0 ? 'var(--panel-text-color)' : 'var(--panel-muted-color)',
                border: '1px solid var(--panel-border)',
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
                    backgroundColor: i < city.specialists ? 'var(--color-science)' : 'var(--panel-border)',
                  }}
                />
              ))}
            </div>
            <button
              className="px-2 py-1 rounded text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: city.specialists < city.population - 1 ? 'var(--color-bg)' : 'var(--color-surface)',
                color: city.specialists < city.population - 1 ? 'var(--panel-text-color)' : 'var(--panel-muted-color)',
                border: '1px solid var(--panel-border)',
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
        <h3 className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--panel-muted-color)' }}>
          {isTown ? 'Purchase' : 'Build'}
        </h3>

        <div className="text-[10px] uppercase tracking-wide mb-1 font-bold" style={{ color: 'var(--panel-muted-color)' }}>Units</div>
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
                  color: playerGold >= goldCost ? 'var(--panel-text-color)' : 'var(--panel-muted-color)',
                  border: '1px solid var(--panel-border)',
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

        <div className="text-[10px] uppercase tracking-wide mb-1 font-bold" style={{ color: 'var(--panel-muted-color)' }}>Buildings</div>
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
                  color: playerGold >= goldCost ? 'var(--panel-text-color)' : 'var(--panel-muted-color)',
                  border: '1px solid var(--panel-border)',
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

function LedgerItem({
  value, delta, color, label, warn,
}: {
  value: number;
  delta?: number;
  color: string;
  label: string;
  warn?: boolean;
}) {
  return (
    <div className="city-resource-ledger__item" title={label}>
      <span className="city-resource-ledger__dot" style={{ backgroundColor: color }} />
      <span className="city-resource-ledger__value" style={{ color: warn ? 'var(--panel-accent-danger)' : color }}>
        {value}
      </span>
      {delta !== undefined && (
        <span
          className={`city-resource-ledger__delta ${delta >= 0 ? 'city-resource-ledger__delta--positive' : 'city-resource-ledger__delta--negative'}`}
        >
          {delta >= 0 ? '+' : ''}{delta}
        </span>
      )}
    </div>
  );
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="w-full h-1.5 rounded-full my-1" style={{ backgroundColor: 'var(--panel-muted-bg)' }}>
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

