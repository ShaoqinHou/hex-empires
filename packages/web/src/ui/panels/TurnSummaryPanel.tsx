import { useGameState } from '../../providers/GameProvider';
import { calculateResourceChanges, getGrowthThreshold } from '@hex/engine';
import type { ResourceChangeSummary } from '@hex/engine';
import { ResourceChangeSummaryDisplay } from '../components/ResourceChangeBadge';

interface TurnSummaryPanelProps {
  onClose: () => void;
}

export function TurnSummaryPanel({ onClose }: TurnSummaryPanelProps) {
  const { state } = useGameState();
  const player = state.players.get(state.currentPlayerId);

  if (!player) return null;

  const summary = calculateResourceChanges(state, state.currentPlayerId);

  // Get cities with detailed info
  const playerCities = [...state.cities.values()]
    .filter(c => c.owner === state.currentPlayerId)
    .map(city => {
      const isStarving = summary.starvingCities.some(s => s.cityId === city.id);
      const hasGoldDeficit = summary.goldDeficitCities.some(s => s.cityId === city.id);
      return { city, isStarving, hasGoldDeficit };
    });

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}>
      <div
        className="w-96 max-h-[80vh] overflow-y-auto rounded-lg shadow-2xl"
        style={{ backgroundColor: 'var(--color-surface)', border: '2px solid var(--color-border)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3"
          style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h2 className="text-lg font-bold" style={{ color: 'var(--color-accent)' }}>
            Turn Summary
          </h2>
          <button onClick={onClose} className="text-sm px-2 py-1 cursor-pointer"
            style={{ color: 'var(--color-text-muted)' }}>
            ✕
          </button>
        </div>

        {/* Current Turn */}
        <div className="px-4 py-2" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <div className="text-sm font-bold">Turn {state.turn}</div>
          <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {state.age.currentAge} Age
          </div>
        </div>

        {/* Resource Changes */}
        <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
          <h3 className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Income per Turn
          </h3>
          <ResourceChangeSummaryDisplay summary={summary} compact={false} />

          {/* Additional info */}
          <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--color-bg)' }}>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Food Surplus:</span>
                <span className="ml-1 font-bold" style={{ color: summary.totalFoodSurplus >= 0 ? 'var(--color-food)' : 'var(--color-health-low)' }}>
                  {summary.totalFoodSurplus >= 0 ? '+' : ''}{summary.totalFoodSurplus}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Production:</span>
                <span className="ml-1 font-bold" style={{ color: 'var(--color-production)' }}>
                  +{summary.totalProduction}
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Maintenance:</span>
                <span className="ml-1 font-bold" style={{ color: 'var(--color-health-low)' }}>
                  -{summary.maintenanceCost}g
                </span>
              </div>
              <div>
                <span style={{ color: 'var(--color-text-muted)' }}>Cities:</span>
                <span className="ml-1 font-bold">{playerCities.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Warnings */}
        {(summary.starvingCities.length > 0 || summary.unhappyCities > 0 || summary.goldPerTurn < -5) && (
          <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)', backgroundColor: 'rgba(255, 100, 100, 0.1)' }}>
            <h3 className="text-xs uppercase tracking-wide mb-2 font-bold" style={{ color: 'var(--color-health-low)' }}>
              ⚠️ Warnings
            </h3>
            <div className="flex flex-col gap-1 text-xs">
              {summary.starvingCities.length > 0 && (
                <div style={{ color: 'var(--color-health-low)' }}>
                  {summary.starvingCities.length} starving {summary.starvingCities.length === 1 ? 'city' : 'cities'}:
                  {summary.starvingCities.map(s => (
                    <span key={s.cityId} className="ml-1">
                      {s.cityName} (-{s.foodDeficit} food)
                    </span>
                  ))}
                </div>
              )}
              {summary.goldPerTurn < -5 && (
                <div style={{ color: 'var(--color-gold)' }}>
                  Gold deficit: {summary.goldPerTurn}g/turn
                </div>
              )}
              {summary.unhappyCities > 0 && (
                <div style={{ color: 'var(--color-gold)' }}>
                  {summary.unhappyCities} unhappy {summary.unhappyCities === 1 ? 'city' : 'cities'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* City Details */}
        <div className="px-4 py-3">
          <h3 className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--color-text-muted)' }}>
            Cities
          </h3>
          <div className="flex flex-col gap-2">
            {playerCities.map(({ city, isStarving, hasGoldDeficit }) => {
              const growthThreshold = getGrowthThreshold(city.population);
              const isTown = city.settlementType === 'town';

              return (
                <div
                  key={city.id}
                  className="px-2 py-1.5 rounded text-xs"
                  style={{
                    backgroundColor: 'var(--color-bg)',
                    border: '1px solid var(--color-border)',
                    borderColor: (isStarving || hasGoldDeficit) ? 'var(--color-health-low)' : 'var(--color-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{city.name}</span>
                    <div className="flex items-center gap-1">
                      {isStarving && (
                        <span title="Starving" style={{ color: 'var(--color-health-low)' }}>⚠️</span>
                      )}
                      {hasGoldDeficit && (
                        <span title="Gold deficit" style={{ color: 'var(--color-gold)' }}>💰</span>
                      )}
                      <span style={{ color: 'var(--color-text-muted)' }}>
                        {isTown ? 'Town' : 'City'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center gap-2" style={{ color: 'var(--color-text-muted)' }}>
                    <span>Pop: {city.population}</span>
                    <span>Food: {city.food}/{growthThreshold}</span>
                    <span style={{ color: city.happiness >= 0 ? 'var(--color-food)' : 'var(--color-health-low)' }}>
                      {city.happiness >= 0 ? '+' : ''}{city.happiness}
                    </span>
                  </div>
                  {city.productionQueue.length > 0 && !isTown && (
                    <div className="mt-1" style={{ color: 'var(--color-production)' }}>
                      Producing: {city.productionQueue[0].id}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Close button */}
        <div className="px-4 py-3" style={{ borderTop: '1px solid var(--color-border)' }}>
          <button
            className="w-full px-3 py-2 text-xs font-bold rounded cursor-pointer"
            style={{
              backgroundColor: 'var(--color-accent)',
              color: 'var(--color-bg)',
            }}
            onClick={onClose}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
