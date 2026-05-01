import { useGameState } from '../../providers/GameProvider';
import { calculateResourceChanges, getGrowthThreshold, calculateEffectiveSettlementCap } from '@hex/engine';
import { ResourceChangeSummaryDisplay } from '../components/ResourceChangeBadge';
import { DramaModal } from './DramaModal';
import type { DramaChoice } from './DramaModal';

interface TurnSummaryPanelProps {
  onResolve: () => void;
}

export function TurnSummaryPanel({ onResolve }: TurnSummaryPanelProps) {
  const { state } = useGameState();
  const player = state.players.get(state.currentPlayerId);

  if (!player) return null;

  const summary = calculateResourceChanges(state, state.currentPlayerId);

  // Get settlements with detailed info
  const playerCities = [...state.cities.values()]
    .filter(c => c.owner === state.currentPlayerId)
    .map(city => {
      const isStarving = summary.starvingCities.some(s => s.cityId === city.id);
      const hasGoldDeficit = summary.goldDeficitCities.some(s => s.cityId === city.id);
      return { city, isStarving, hasGoldDeficit };
    });

  // Hero — compact era glyph. heroHeight=120px per spec §11 Q1 recommendation.
  const ageGlyph = getAgeGlyph(state.age.currentAge);
  const heroNode = (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '56px', lineHeight: 1.1 }}>{ageGlyph}</div>
    </div>
  );

  // Body — resource-change summary + warnings + city list. Content unchanged.
  const bodyNode = (
    <div>
      {/* Resource Changes */}
      <div className="pb-3 mb-3" style={{ borderBottom: '1px solid var(--panel-border)' }}>
        <h3 className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--panel-muted-color)' }}>
          Income per Turn
        </h3>
        <ResourceChangeSummaryDisplay summary={summary} compact={false} />

        {/* Additional info */}
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--panel-muted-bg)' }}>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span style={{ color: 'var(--panel-muted-color)' }}>Food Surplus:</span>
              <span className="ml-1 font-bold" style={{ color: summary.totalFoodSurplus >= 0 ? 'var(--color-food)' : 'var(--color-health-low)' }}>
                {summary.totalFoodSurplus >= 0 ? '+' : ''}{summary.totalFoodSurplus}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--panel-muted-color)' }}>Production:</span>
              <span className="ml-1 font-bold" style={{ color: 'var(--color-production)' }}>
                +{summary.totalProduction}
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--panel-muted-color)' }}>Maintenance:</span>
              <span className="ml-1 font-bold" style={{ color: 'var(--color-health-low)' }}>
                -{summary.maintenanceCost}g
              </span>
            </div>
            <div>
              <span style={{ color: 'var(--panel-muted-color)' }}>Settlements:</span>
              <span className="ml-1 font-bold">{playerCities.length}</span>
            </div>
            {(() => {
              const cap = calculateEffectiveSettlementCap(state, state.currentPlayerId);
              const overCap = playerCities.length > cap;
              return (
                <div data-testid="turn-summary-settlement-cap">
                  <span style={{ color: 'var(--panel-muted-color)' }}>Settlement cap:</span>
                  <span
                    className="ml-1 font-bold"
                    style={{ color: overCap ? 'var(--color-warning)' : undefined }}
                  >
                    {playerCities.length} / {cap}
                  </span>
                  {overCap && (
                    <span className="ml-1 text-xs" style={{ color: 'var(--color-warning)' }}>⚠</span>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Warnings */}
      {(summary.starvingCities.length > 0 || summary.unhappyCities > 0 || summary.goldPerTurn < -5) && (
        <div className="px-3 py-3 mb-3 -mx-1 rounded" style={{ borderBottom: '1px solid var(--panel-border)', backgroundColor: 'var(--panel-warning-bg)' }}>
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

      {/* Settlement Details */}
      <div className="pb-3">
        <h3 className="text-xs uppercase tracking-wide mb-2" style={{ color: 'var(--panel-muted-color)' }}>
          Settlements
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
                  backgroundColor: 'var(--panel-muted-bg)',
                  border: '1px solid var(--panel-border)',
                  borderColor: (isStarving || hasGoldDeficit) ? 'var(--color-health-low)' : 'var(--panel-border)',
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
                    <span style={{ color: 'var(--panel-muted-color)' }}>
                      {isTown ? 'Town' : 'City'}
                    </span>
                  </div>
                </div>
                <div className="mt-1 flex items-center gap-2" style={{ color: 'var(--panel-muted-color)' }}>
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
    </div>
  );

  const choices: ReadonlyArray<DramaChoice> = [
    {
      id: 'continue',
      label: 'Continue',
      tone: 'primary',
      onSelect: onResolve,
    },
  ];

  const subtitle = `${capitalize(state.age.currentAge)} Age`;

  return (
    <DramaModal
      id="turnSummary"
      title={`Turn ${state.turn}`}
      subtitle={subtitle}
      hero={heroNode}
      heroHeight={120}
      body={bodyNode}
      choices={choices}
      onResolve={onResolve}
      tone="summary"
    />
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getAgeGlyph(age: string): string {
  const glyphs: Record<string, string> = {
    antiquity:   '🏛️',
    exploration: '⛵',
    modern:      '⚙️',
  };
  return glyphs[age] ?? '📊';
}
