import { useGameState } from '../../providers/GameProvider';
import type { TradeRoute, Age } from '@hex/engine';
import { PanelShell } from './PanelShell';

/** Estimate gold per turn for a trade route based on isSea and current age. */
function estimateGoldPerTurn(
  route: TradeRoute,
  age: Age,
  state: {
    readonly cities: ReadonlyMap<string, { readonly assignedResources?: ReadonlyArray<string>; readonly owner: string }>;
  },
): number {
  const baseRate = age === 'modern' ? 4 : age === 'exploration' ? 3 : 2;
  const seaMult = route.isSea ? 2 : 1;
  const destination = state.cities.get(route.to);
  const slots = destination?.assignedResources?.length ?? 0;
  return baseRate * seaMult * slots;
}

interface TradeRoutesPanelProps {
  readonly onClose: () => void;
}

export function TradeRoutesPanel({ onClose }: TradeRoutesPanelProps) {
  const { state } = useGameState();

  // Only show routes owned by the current player.
  const playerRoutes: ReadonlyArray<TradeRoute> = [...state.tradeRoutes.values()].filter(
    r => r.owner === state.currentPlayerId,
  );
  const currentAge = state.players.get(state.currentPlayerId)?.age ?? 'antiquity';

  return (
    <PanelShell id="tradeRoutes" title="🤝 Trade Routes" onClose={onClose} priority="overlay">
      {playerRoutes.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {/* Header row */}
          <div
            className="grid text-xs font-semibold mb-2 pb-1"
            style={{
              gridTemplateColumns: '1fr 1fr auto auto',
              gap: 'var(--panel-padding-sm)',
              borderBottom: '1px solid var(--panel-border)',
              color: 'var(--panel-muted-color)',
            }}
          >
            <span>Origin</span>
            <span>Destination</span>
            <span style={{ textAlign: 'right' }}>Gold to destination/turn</span>
            <span style={{ textAlign: 'right' }}>Type</span>
          </div>

          {/* Route rows */}
          <div className="flex flex-col" style={{ gap: 'var(--panel-padding-sm)' }}>
            {playerRoutes.map(route => (
              <RouteRow key={route.id} route={route} age={currentAge} state={state} />
            ))}
          </div>

          {/* Summary footer */}
          <div
            className="mt-3 pt-2 flex items-center justify-between text-xs"
            style={{
              borderTop: '1px solid var(--panel-border)',
              color: 'var(--panel-muted-color)',
            }}
          >
            <span>{playerRoutes.length} active {playerRoutes.length === 1 ? 'route' : 'routes'}</span>
            <span style={{ color: 'var(--panel-accent-gold-soft)' }}>
              Gold is paid to destination civs
            </span>
          </div>
        </div>
      )}
    </PanelShell>
  );
}

// ── Sub-components ──────────────────────────────────────────────────────────

interface RouteRowProps {
  readonly route: TradeRoute;
  readonly age: Age;
  readonly state: {
    readonly cities: ReadonlyMap<string, { readonly assignedResources?: ReadonlyArray<string>; readonly name: string; readonly owner: string }>;
    readonly players: ReadonlyMap<string, { readonly name: string }>;
    readonly currentPlayerId: string;
  };
}

function RouteRow({ route, age, state }: RouteRowProps) {
  const fromCity = state.cities.get(route.from);
  const toCity = state.cities.get(route.to);
  const toOwner = toCity ? state.players.get(toCity.owner) : undefined;

  const isForeign = toCity && toCity.owner !== state.currentPlayerId;
  const goldPerTurn = estimateGoldPerTurn(route, age, state);

  return (
    <div
      className="grid text-sm items-center"
      style={{
        gridTemplateColumns: '1fr 1fr auto auto',
        gap: 'var(--panel-padding-sm)',
        padding: 'var(--panel-padding-sm) var(--panel-padding-md)',
        backgroundColor: 'var(--panel-muted-bg-soft)',
        borderRadius: 'var(--panel-radius)',
        border: '1px solid var(--panel-muted-border)',
      }}
    >
      {/* Origin */}
      <span style={{ color: 'var(--panel-text-color)' }}>
        {fromCity?.name ?? route.from}
      </span>

      {/* Destination (with owner hint when foreign) */}
      <span>
        <span>
          <span style={{ color: isForeign ? 'var(--panel-accent-info)' : 'var(--panel-text-color)' }}>
            {toCity?.name ?? route.to}
          </span>
          {isForeign && toOwner && (
            <span
              className="ml-1 text-xs"
              style={{ color: 'var(--panel-muted-color)' }}
            >
              ({toOwner.name})
            </span>
          )}
        </span>
        {route.resources.length > 0 && (
          <span
            className="block text-xs"
            style={{ color: 'var(--panel-muted-color)' }}
          >
            Resources: {route.resources.join(', ')}
          </span>
        )}
      </span>

      {/* Gold per turn */}
      <span
        className="text-right font-mono text-xs"
        style={{ color: 'var(--panel-accent-gold-soft)' }}
      >
        +{goldPerTurn}💰
      </span>

      {/* Route type (sea / land — routes are permanent until war or age transition) */}
      <span
        className="text-right font-mono text-xs"
        style={{ color: 'var(--panel-muted-color)' }}
      >
        {route.isSea ? '⛵' : '🚶'}
      </span>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      className="flex flex-col items-center gap-3 py-8"
      style={{ color: 'var(--panel-muted-color)' }}
    >
      <span style={{ fontSize: '2rem' }}>🤝</span>
      <p className="text-sm text-center">
        No active trade routes.
      </p>
      <p className="text-xs text-center" style={{ maxWidth: '22ch' }}>
        Train a Merchant unit and move it adjacent to a foreign city to establish a route.
      </p>
    </div>
  );
}
